export interface Product {
  id: number;
  name: string;
  category: string;
  supermarket: string;
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: number;
  product_id: number;
  original_price: number;
  discount_price: number;
  special_discount: string | null;
  expire_date: string;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDiscount extends Product {
  discount: Discount;
}

export interface ColumnFilter {
  column: keyof ProductWithDiscount | "all";
  value: string;
}

// Configurations types
export interface ConfigurationsStats {
  totalRuns: number;
  successRate: number;
  scrapedProducts: number;
  uniqueProducts: number;
  nextScheduledRun?: string;
}

export interface SupermarketStatus {
  key: string;
  name: string;
  status: "success" | "failed" | "running" | "pending";
  lastRun?: string;
  productsScraped?: number;
}
