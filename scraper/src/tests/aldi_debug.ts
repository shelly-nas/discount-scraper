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

  // Intercept all network requests to find API calls
  const page = await context.newPage();
  const apiCalls: string[] = [];
  page.on("request", req => {
    const url = req.url();
    if (req.resourceType() === "fetch" || req.resourceType() === "xhr" || url.includes("api") || url.includes("json") || url.includes("product") || url.includes("offer") || url.includes("aanbieding")) {
      apiCalls.push(`[${req.method()}] ${url}`);
    }
  });

  console.log("Navigating to Aldi...");
  await page.goto("https://www.aldi.nl/aanbiedingen.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log("URL:", page.url());
  await page.waitForTimeout(3000);

  // Cookie popup
  try {
    await page.click('#onetrust-accept-btn-handler', { timeout: 5000 });
    console.log("Accepted cookies");
    await page.waitForTimeout(1000);
  } catch { console.log("No cookie popup"); }

  // Scroll a bit to trigger lazy loading
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
  }

  console.log("\n--- API calls intercepted ---");
  apiCalls.forEach(c => console.log(c));

  // Check DOM structure
  const domInfo = await page.evaluate(() => ({
    productCount: document.querySelectorAll("[class*='product']").length,
    offerCount: document.querySelectorAll("[class*='offer']").length,
    articleCount: document.querySelectorAll("article").length,
    // Look for any data attributes
    dataAttrs: (() => {
      const el = document.querySelector("article") ?? document.querySelector("[class*='product']");
      if (!el) return {};
      const attrs: Record<string, string> = {};
      for (const a of Array.from(el.attributes)) attrs[a.name] = a.value.substring(0, 200);
      return attrs;
    })(),
    // Sample class names to understand structure
    sampleClasses: Array.from(document.querySelectorAll("[class*='offer'], [class*='product'], article")).slice(0, 5).map(e => e.className.substring(0, 80)),
    // Page title
    title: document.title,
    // Any JSON-LD structured data
    jsonLd: document.querySelector('script[type="application/ld+json"]')?.textContent?.substring(0, 500) ?? "none",
  }));
  console.log("\n--- DOM info ---");
  console.log(JSON.stringify(domInfo, null, 2));

  // Dump HTML snippet
  const html = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));
  console.log("\n--- HTML snippet ---\n", html);

  await browser.close();
}

debug().catch(console.error);
