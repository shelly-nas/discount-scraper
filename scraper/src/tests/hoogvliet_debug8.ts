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

  // Capture ALL requests/responses
  const captured: Array<{ url: string; method: string; reqBody: string | null; respBody?: string }> = [];
  page.on("request", req => {
    const url = req.url();
    if (url.includes("hoogvliet.com/INTERSHOP") && !url.includes("static")) {
      captured.push({ url: url.substring(0, 200), method: req.method(), reqBody: req.postData() });
    }
  });
  page.on("response", async resp => {
    const url = resp.url();
    if (url.includes("hoogvliet.com/INTERSHOP") && !url.includes("static")) {
      const entry = captured.find(c => c.url === url.substring(0, 200));
      if (entry) {
        try { entry.respBody = (await resp.text()).substring(0, 500); } catch {}
      }
    }
  });

  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "networkidle", timeout: 45000 });

  console.log("All INTERSHOP calls:");
  captured.forEach(c => {
    console.log(`\n[${c.method}] ${c.url}`);
    if (c.reqBody) console.log("  Req:", c.reqBody.substring(0, 200));
    if (c.respBody) console.log("  Resp:", c.respBody.substring(0, 200));
  });

  // After networkidle — how many tiles?
  const count = await page.evaluate(() => document.querySelectorAll(".product-tile.promotionProductTile").length);
  console.log("\nTotal tiles after networkidle:", count);

  await browser.close();
}
debug().catch(console.error);
