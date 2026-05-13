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

  // Intercept network to find API calls
  const page = await context.newPage();
  const apiCalls: Array<{ method: string; url: string; status?: number }> = [];
  page.on("response", async resp => {
    const url = resp.url();
    const ct = resp.headers()["content-type"] ?? "";
    if (ct.includes("json") || url.includes("api") || url.includes("product") || url.includes("aanbieding") || url.includes("offer")) {
      apiCalls.push({ method: resp.request().method(), url: url.substring(0, 120), status: resp.status() });
    }
  });

  console.log("Navigating...");
  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log("URL:", page.url());
  await page.waitForTimeout(3000);

  console.log("\n--- JSON/API calls ---");
  apiCalls.forEach(c => console.log(`[${c.status}] ${c.method} ${c.url}`));

  const domInfo = await page.evaluate(() => ({
    title: document.title,
    productCount: document.querySelectorAll("[class*='product']").length,
    articleCount: document.querySelectorAll("article").length,
    sampleProductHtml: document.querySelector("[class*='product-tile'], [class*='ProductTile'], [class*='product-item'], article")?.outerHTML?.substring(0, 600) ?? "none",
    scriptCount: document.querySelectorAll("script[type='application/json'], script[id*='data']").length,
    sampleScriptContent: document.querySelector("script[type='application/json']")?.textContent?.substring(0, 300) ?? "none",
    bodySnippet: document.body.innerHTML.substring(0, 2000),
  }));
  console.log("\n--- DOM info ---");
  console.log("title:", domInfo.title);
  console.log("products:", domInfo.productCount, "articles:", domInfo.articleCount);
  console.log("sample product:", domInfo.sampleProductHtml);
  console.log("script data:", domInfo.sampleScriptContent);
  console.log("\n--- body snippet ---\n", domInfo.bodySnippet);
  await browser.close();
}
debug().catch(console.error);
