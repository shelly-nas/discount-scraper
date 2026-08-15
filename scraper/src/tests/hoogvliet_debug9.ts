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

  // Capture the GetCategoriesForPromotionPage call
  let catUrl = "";
  let catReqBody = "";
  let catRespBody = "";
  page.on("request", req => {
    if (req.url().includes("GetCategories") || req.url().includes("Promotion")) {
      catUrl = req.url();
      catReqBody = req.postData() ?? "";
    }
  });
  page.on("response", async resp => {
    if (resp.url().includes("GetCategories") || resp.url().includes("Promotion")) {
      try { catRespBody = await resp.text(); } catch {}
    }
  });

  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });

  // Try triggering the JS-based loader via scroll
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(3000);

  // Also try directly calling the function seen in the JS
  const triggerResult = await page.evaluate(() => {
    // Check if there's a JS function to load more products
    const win = window as any;
    const keys = Object.keys(win).filter(k => k.toLowerCase().includes("promo") || k.toLowerCase().includes("product") || k.toLowerCase().includes("dynamic"));
    return { keys, jqDefined: typeof (win as any).jQuery !== "undefined" };
  });
  console.log("JS globals:", triggerResult);

  // Try jQuery AJAX call if jQuery is available
  if (triggerResult.jqDefined) {
    const ajaxResult = await page.evaluate(() => {
      return new Promise<string>(resolve => {
        const $ = (window as any).jQuery;
        $.post(
          "/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-GetCategoriesForPromotionPage",
          { CategoryName: "aanbiedingen" },
          (data: any) => resolve(JSON.stringify(data).substring(0, 1000)),
          "json"
        ).fail((err: any) => resolve("error: " + err.status));
      });
    });
    console.log("jQuery AJAX result:", ajaxResult);
  }

  console.log("\ncat URL:", catUrl);
  console.log("cat req body:", catReqBody);
  console.log("cat resp (first 2000):", catRespBody.substring(0, 2000));

  const tileCount = await page.evaluate(() => document.querySelectorAll(".product-tile.promotionProductTile").length);
  console.log("\nFinal tile count:", tileCount);

  await browser.close();
}
debug().catch(console.error);
