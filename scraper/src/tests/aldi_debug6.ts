import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(StealthPlugin());

async function debug() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"] });
  const context = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", locale: "nl-NL", timezoneId: "Europe/Amsterdam", extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" } });
  const page = await context.newPage();
  await page.goto("https://www.aldi.nl/aanbiedingen.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  const result = await page.evaluate(() => {
    const raw = document.getElementById("__NEXT_DATA__")?.textContent ?? "{}";
    const data = JSON.parse(raw);
    const apiData = data?.props?.pageProps?.apiData;
    const apiDataType = typeof apiData;
    const apiDataKeys = apiData ? Object.keys(apiData).slice(0, 10) : [];
    // Try treating it as an object
    const firstKey = apiDataKeys[0];
    const firstVal = firstKey ? JSON.stringify(apiData[firstKey]).substring(0, 400) : "none";
    // Also stringify first 500 chars raw
    const rawApiData = JSON.stringify(apiData).substring(0, 600);
    return { apiDataType, apiDataKeys, firstVal, rawApiData };
  });

  console.log("apiData type:", result.apiDataType);
  console.log("apiData keys:", result.apiDataKeys);
  console.log("first val:", result.firstVal);
  console.log("raw apiData:", result.rawApiData);
  await browser.close();
}
debug().catch(console.error);
