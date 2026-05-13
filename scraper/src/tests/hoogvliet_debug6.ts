import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(StealthPlugin());

async function debug() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "nl-NL", timezoneId: "Europe/Amsterdam",
    extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" },
  });

  const page = await context.newPage();
  let catResponseBody = "";

  page.on("response", async resp => {
    const url = resp.url();
    if (url.includes("GetCategoriesForPromotionPage")) {
      const body = await resp.text();
      catResponseBody = body;
      console.log("=== GetCategoriesForPromotionPage response ===");
      console.log("URL:", url.substring(0, 200));
      console.log("Status:", resp.status());
      // Also capture the request body
      const reqBody = resp.request().postData();
      console.log("Request body:", reqBody);
      console.log("Response (first 2000 chars):", body.substring(0, 2000));
    }
  });

  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  // Also check the tiles loaded after this fires
  const tiles = await page.evaluate(() => {
    const tiles = document.querySelectorAll<HTMLElement>(".product-tile.promotionProductTile");
    return Array.from(tiles).slice(0, 3).map(t => ({
      name: t.querySelector("img")?.alt?.replace(" product foto", ""),
      promo: t.querySelector(".promotion-short-title")?.textContent?.trim(),
      priceHtml: t.querySelector(".price-container")?.textContent?.replace(/\s+/g, " ").trim().substring(0, 80),
    }));
  });
  console.log("\nSample tiles:", JSON.stringify(tiles, null, 2));
  console.log("\nTotal response length:", catResponseBody.length);

  await browser.close();
}
debug().catch(console.error);
