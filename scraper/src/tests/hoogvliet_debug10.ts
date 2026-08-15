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

  // Capture ALL requests
  const allReqs: Array<{url: string; method: string; body: string}> = [];
  page.on("request", req => {
    if (req.url().includes("hoogvliet")) {
      allReqs.push({ url: req.url().substring(0, 200), method: req.method(), body: (req.postData() ?? "").substring(0, 200) });
    }
  });
  let promoResp = "";
  page.on("response", async resp => {
    if (resp.url().includes("Promotion") || resp.url().includes("promotionList") || resp.url().includes("GetPromo")) {
      try { promoResp = await resp.text(); } catch {}
      console.log("Promo response URL:", resp.url(), "len:", promoResp.length);
    }
  });

  await page.goto("https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Inspect the JS variables
  const jsVars = await page.evaluate(() => {
    const win = window as any;
    return {
      currentProductsURL: win.currentProductsURL,
      PromotionLoadScrollType: typeof win.PromotionLoadScroll,
      promotionListAjaxType: typeof win.promotionListAjax,
      promo_detail_page: win.promo_detail_page,
      promotion_reload: win.promotion_reload,
    };
  });
  console.log("JS vars:", JSON.stringify(jsVars, null, 2));

  // Call PromotionLoadScroll if it's a function
  const callResult = await page.evaluate(async () => {
    const win = window as any;
    if (typeof win.PromotionLoadScroll === "function") {
      win.PromotionLoadScroll();
      await new Promise(r => setTimeout(r, 3000));
      return "called PromotionLoadScroll, tiles: " + document.querySelectorAll(".product-tile.promotionProductTile").length;
    }
    if (typeof win.promotionListAjax === "function") {
      win.promotionListAjax();
      await new Promise(r => setTimeout(r, 3000));
      return "called promotionListAjax, tiles: " + document.querySelectorAll(".product-tile.promotionProductTile").length;
    }
    return "no function found";
  });
  console.log("Call result:", callResult);

  // Check all hoogvliet requests made
  console.log("\nAll hoogvliet requests:");
  allReqs.forEach(r => console.log(`[${r.method}] ${r.url}${r.body ? " | body: " + r.body : ""}`));

  await browser.close();
}
debug().catch(console.error);
