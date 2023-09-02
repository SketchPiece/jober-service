import puppeteer from "puppeteer-core";
import createServiceError from "./createServiceError.js";
import { ENV } from "../../env.js";

const NODE_ENV = ENV.NODE_ENV || "development";
const BLESS_TOKEN = ENV.BLESS_TOKEN || "";

export default async function createBrowserInstance() {
  try {
    if (NODE_ENV === "test" || NODE_ENV === "development") {
      return await puppeteer.launch({
        executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      });
    } else {
      return await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${BLESS_TOKEN}`,
      });
    }
  } catch (error) {
    throw createServiceError("BrowserInstance", error as Error);
  }
}
