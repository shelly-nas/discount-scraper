import { chromium, ChromiumBrowser, Page } from 'playwright';

interface Product {
  name: string;
  oldPrice: string;
  newPrice: string;
}

class WebScraper {
  private browser: ChromiumBrowser | null;
  
  constructor() {
    this.browser = null;
  }                    

  async initBrowser(): Promise<void> {
    this.browser = await chromium.launch();
  }

  async closeBrowser(): Promise<void> {
    await this.browser!.close();
  }

  async scrapeGroceriesSite(url: string): Promise<Product[]> {
    if (!this.browser) await this.initBrowser();
    const page = await this.browser!.newPage();
    await page.goto(url);
    
    // Example of scraping logic, adjust selectors based on actual website structure
    const products = await page.$$eval('.product-selector', (products) =>
      products.map((product) => {
        const name = product.querySelector('.product-name-selector')?.textContent || '';
        const oldPrice = product.querySelector('.old-price-selector')?.textContent || '';
        const newPrice = product.querySelector('.new-price-selector')?.textContent || '';
        return { name, oldPrice, newPrice };
      })
    );

    await this.closeBrowser();
    return products;
  }
}

export default WebScraper;
