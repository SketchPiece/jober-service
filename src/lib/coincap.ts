import fetch from "node-fetch";
import createServiceError from "./helpers/createServiceError.js";

const CMC_BALANCE_URI =
  "https://api.coinmarketcap.com/asset/v4/portfolio/group/queryAll";

export class CoinCapClient {
  constructor(private authToken: string) {}

  async getPortfolioBalance(portfolioName: string) {
    try {
      const responce: any = await fetch(CMC_BALANCE_URI, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          cookie: `Authorization=Bearer${this.authToken}`,
        },
        body: "{}",
        method: "POST",
      }).then((res) => res.json());
      const portfolioData = responce.data.find(
        (portfolio: { portfolioName: string }) =>
          portfolio.portfolioName === portfolioName
      );
      return parseFloat(portfolioData.totalAmount.toFixed(2));
    } catch (error) {
      throw createServiceError("CoinCap::getPortfolioBalance", error as Error);
    }
  }
}
