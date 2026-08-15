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

  // Set up listener BEFORE navigation
  const catResponsePromise = page.waitForResponse(
    resp => resp.url().includes("GetCategoriesForPromotionPage"),
    { timeout: 20000 }
  );

  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });

  try {
    const catResp = await catResponsePromise;
    const reqBody = catResp.request().postData();
    const body = await catResp.text();
    console.log("URL:", catResp.url().substring(0, 200));
    console.log("Request body:", reqBody);
    console.log("Response (first 3000):\n", body.substring(0, 3000));
  } catch(e) {
    console.log("Timed out waiting for GetCategoriesForPromotionPage");
  }

  await browser.close();
}
debug().catch(console.error);
