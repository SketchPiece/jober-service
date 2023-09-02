import type { Account } from "./types.js";
import type { Browser, Page, Protocol } from "puppeteer-core";
import createServiceError from "../helpers/createServiceError.js";
import kv from "../kv.js";

const WALLET_APP_URL = "https://web.budgetbakers.com/accounts";

const EMAIL_INPUT_SELECTOR =
  "#root > div > div > section > div > form > div:nth-child(1) > div > input[type=email]";
const PASSWORD_INPUT_SELECTOR =
  "#root > div > div > section > div > form > div:nth-child(2) > div > input[type=password]";
const SUBMIT_BUTTON_SELECTOR =
  "#root > div > div > section > div > form > button";

const ACCOUNTS_SELECTOR =
  "#root > div > div > main > div > div._5NFnhpp7joa9CQoFA2Fw- > div._1mGh4KCr_zK-cTWl1AVZse > div";

const ADD_RECORD_BUTTON_SELECTOR =
  "#root > div > div > div._1V4hZqsf6Tn_Uoxjno3LXT > div > div > button";
const RECORD_TYPE_SELECTOR =
  "body > div.ui.page.modals.dimmer.transition.visible.active > div > div.add-record-content.content > div > div.ten.wide.computer.sixteen.wide.mobile.ten.wide.tablet.column.form-main > form > div.main-color-panel > div > div:nth-child(1) > div > div > a:nth-child(2)";
const ACCOUNT_DROPDOWN_SELECTOR =
  "body > div.ui.page.modals.dimmer.transition.visible.active > div > div.add-record-content.content > div > div.ten.wide.computer.sixteen.wide.mobile.ten.wide.tablet.column.form-main > form > div.main-color-panel > div > div:nth-child(2) > div > div:nth-child(1) > div > div > div.menu.transition";
const EXPENSE_AMOUNT_INPUT_SELECTOR =
  "body > div.ui.page.modals.dimmer.transition.visible.active > div > div.add-record-content.content > div > div.ten.wide.computer.sixteen.wide.mobile.ten.wide.tablet.column.form-main > form > div.main-color-panel > div > div:nth-child(2) > div > div:nth-child(2) > div > div.ten.wide.field.field-amount.expense > div > input[type=text]";
const INCOME_AMOUNT_INPUT_SELECTOR =
  "body > div.ui.page.modals.dimmer.transition.visible.active > div > div.add-record-content.content > div > div.ten.wide.computer.sixteen.wide.mobile.ten.wide.tablet.column.form-main > form > div.main-color-panel > div > div:nth-child(2) > div > div:nth-child(2) > div > div.ten.wide.field.field-amount.income > div > input[type=text]";
const CATEGORY_DROPDOWN_SELECTOR =
  "body > div.ui.page.modals.dimmer.transition.visible.active > div > div.add-record-content.content > div > div.ten.wide.computer.sixteen.wide.mobile.ten.wide.tablet.column.form-main > form > div.main-white-panel > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div > div.field.select-category > div";
const SUBMIT_RECORD_SELECTOR =
  "body > div.ui.page.modals.dimmer.transition.visible.active > div > div.add-record-content.content > div > div.ten.wide.computer.sixteen.wide.mobile.ten.wide.tablet.column.form-main > form > div.main-white-panel > div > div.ten.wide.computer.fifteen.wide.mobile.ten.wide.tablet.column > button";

export class WalletClient {
  private page?: Page;

  constructor(private credentials: string, private browserInstance: Browser) {}

  private async getPage(): Promise<Page> {
    const [username, password] = this.credentials.split(":");
    const sessionKey = `session:${username}`;
    if (this.page) return this.page;

    const page = await this.browserInstance.newPage();
    page.setViewport({ width: 1280, height: 920 });
    const cookies = await kv.get<Protocol.Network.CookieParam[]>(sessionKey);
    if (cookies) await page.setCookie(...cookies);
    await page.goto(WALLET_APP_URL);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const isLoginPage = page.url().includes("login");

    if (isLoginPage) {
      await page.type(EMAIL_INPUT_SELECTOR, username);
      await page.type(PASSWORD_INPUT_SELECTOR, password);
      await page.click(SUBMIT_BUTTON_SELECTOR);
      await page.waitForNavigation({ waitUntil: "networkidle0" });
      const client = await page.target().createCDPSession();
      const cookies = (await client.send("Network.getAllCookies")).cookies;
      await kv.set(sessionKey, cookies);
    }
    this.page = page;
    await page.waitForSelector(ACCOUNTS_SELECTOR);
    return page;
  }

  async getAccounts(): Promise<Account[]> {
    try {
      const page = await this.getPage();
      const accounts = await page.evaluate((ACCOUNTS_SELECTOR) => {
        const accountItems = document.querySelector(ACCOUNTS_SELECTOR);
        if (!accountItems) return null;
        const accounts: Account[] = [];
        for (let i = 0; i < accountItems.children.length; i++) {
          const item = accountItems.children[i];
          if (item.tagName !== "A") continue;
          const accountName = item.querySelector(
            "._2N3zjkUa9I6_GTkadL9ZDa"
          )?.textContent;
          const accountType = item.querySelector(
            "._2KYPmp9YZ-gBS_2ynKzzcE"
          )?.textContent;
          const rawAccountBalance =
            item.querySelector("._1_RYaZbAcU6dw5pzNHpN56")?.textContent || "0";
          const accountBalance = parseFloat(
            rawAccountBalance.replace(/[^0-9.-]+/g, "")
          );
          accounts.push({
            name: accountName || "",
            type: accountType || "",
            balance: accountBalance,
          });
        }
        return accounts;
      }, ACCOUNTS_SELECTOR);

      return accounts || [];
    } catch (error) {
      throw createServiceError("Wallet::getAccounts", error as Error);
    }
  }

  async addRecord(
    accountName: string,
    amount: number,
    type: "expense" | "income"
  ): Promise<void> {
    try {
      const page = await this.getPage();
      await page.click(ADD_RECORD_BUTTON_SELECTOR);
      if (type === "income") await page.click(RECORD_TYPE_SELECTOR);
      await page.waitForSelector(ACCOUNT_DROPDOWN_SELECTOR);
      await page.evaluate(
        (ACCOUNT_DROPDOWN_SELECTOR, accountName) => {
          const dropdown = document.querySelector(ACCOUNT_DROPDOWN_SELECTOR);
          if (!dropdown) return;
          const accountOption = Array.from(dropdown.children).find((option) => {
            return option.textContent === accountName;
          }) as HTMLDivElement;
          if (!accountOption) return false;
          accountOption.click();
          return true;
        },
        ACCOUNT_DROPDOWN_SELECTOR,
        accountName
      );

      await page.type(
        type === "expense"
          ? EXPENSE_AMOUNT_INPUT_SELECTOR
          : INCOME_AMOUNT_INPUT_SELECTOR,
        amount.toString()
      );

      await page.evaluate(async (CATEGORY_DROPDOWN_SELECTOR) => {
        const dropdown = document.querySelector(
          CATEGORY_DROPDOWN_SELECTOR
        ) as HTMLDivElement;
        if (!dropdown) return;
        dropdown.click();
        const categoriesSections = Array.from(
          dropdown.querySelector("ul")?.children || []
        ) as HTMLLIElement[];
        categoriesSections.forEach((section) => {
          if (section.textContent === "Investments") section.click();
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        const categories = Array.from(
          dropdown.querySelector("ul")?.children || []
        ) as HTMLLIElement[];

        categories.forEach((category) => {
          if (category.textContent === "Investments") category.click();
        });
      }, CATEGORY_DROPDOWN_SELECTOR);
      await page.click(SUBMIT_RECORD_SELECTOR);
      await page.waitForNetworkIdle();
    } catch (error) {
      throw createServiceError("Wallet::addRecord", error as Error);
    }
  }
}
