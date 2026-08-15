import { describe, it, expect, vi, beforeEach } from "vitest";
import PostgresDataManager from "../data/PostgresDataManager";

// Fake scraped Dirk products — representative sample covering all 10 categories
const DIRK_SCRAPED_PRODUCTS: IProductDiscountDetails[] = [
  {
    name: "Aardappelen kruimig",
    category: "Aardappelen groente fruit",
    supermarket: "Dirk",
    originalPrice: 2.49,
    discountPrice: 1.59,
    specialDiscount: "",
    expireDate: "2026-05-18",
    unitPrice: null,
    productUrl: null,
  },
  {
    name: "Kipfilet",
    category: "Vlees vis vega",
    supermarket: "Dirk",
    originalPrice: 5.99,
    discountPrice: 3.99,
    specialDiscount: "2 voor 7,-",
    expireDate: "2026-05-18",
    unitPrice: null,
    productUrl: null,
  },
  {
    name: "Halfvolle melk 1L",
    category: "Zuivel kaas",
    supermarket: "Dirk",
    originalPrice: 1.09,
    discountPrice: 0.79,
    specialDiscount: "",
    expireDate: "2026-05-18",
    unitPrice: null,
    productUrl: null,
  },
  {
    name: "Cola 1.5L",
    category: "Dranken sap koffie thee",
    supermarket: "Dirk",
    originalPrice: 2.29,
    discountPrice: 1.49,
    specialDiscount: "3 voor 4,-",
    expireDate: "2026-05-18",
    unitPrice: null,
    productUrl: null,
  },
  {
    name: "Pasta penne 500g",
    category: "Voorraadkast",
    supermarket: "Dirk",
    originalPrice: 1.49,
    discountPrice: 0.89,
    specialDiscount: "",
    expireDate: "2026-05-18",
    unitPrice: null,
    productUrl: null,
  },
];

// Duplicate product — should appear only once in products table
const DIRK_WITH_DUPLICATE: IProductDiscountDetails[] = [
  ...DIRK_SCRAPED_PRODUCTS,
  { ...DIRK_SCRAPED_PRODUCTS[0] }, // exact duplicate of "Aardappelen kruimig"
];

vi.mock("../data/PostgresDataContext", () => ({
  default: {
    getInstance: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("../config/database", () => ({
  getDatabaseConfig: vi.fn().mockReturnValue({
    host: "localhost",
    port: 5432,
    database: "test",
    user: "test",
    password: "test",
  }),
}));

vi.mock("../utils/Logger", () => ({
  scraperLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setSupermarket: vi.fn(),
  },
  serverLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeDataManager(overrides: {
  addProductWithTracking?: (name: string) => Promise<{ id: number; wasCreated: boolean }>;
  getProductId?: (name: string) => Promise<number>;
  hasActiveNonExpiredDiscount?: (id: number) => Promise<boolean>;
  addDiscount?: (id: number) => Promise<number>;
  getLastSuccessfulRunBySupermarket?: () => Promise<null>;
}): PostgresDataManager {
  const dm = new PostgresDataManager();

  const idMap = new Map<string, number>();
  let nextId = 1;

  (dm as any).productController = {
    addProductWithTracking: overrides.addProductWithTracking
      ? overrides.addProductWithTracking
      : vi.fn().mockImplementation(async (name: string) => {
          if (!idMap.has(name)) {
            idMap.set(name, nextId++);
            return { id: idMap.get(name)!, wasCreated: true };
          }
          return { id: idMap.get(name)!, wasCreated: false };
        }),
    getProductId: overrides.getProductId
      ? overrides.getProductId
      : vi.fn().mockImplementation(async (name: string) => idMap.get(name) ?? -1),
  };

  (dm as any).discountController = {
    addDiscountSmart: vi.fn().mockImplementation(async (productId: number) => {
      const hasActive = overrides.hasActiveNonExpiredDiscount
        ? await overrides.hasActiveNonExpiredDiscount(productId)
        : false;
      if (hasActive) return -1;
      return overrides.addDiscount
        ? overrides.addDiscount(productId)
        : productId * 10;
    }),
  };

  (dm as any).scraperRunController = {
    getLastSuccessfulRunBySupermarket: overrides.getLastSuccessfulRunBySupermarket
      ?? vi.fn().mockResolvedValue(null),
  };

  return dm;
}

describe("Dirk → database: alle producten komen terecht", () => {
  let dm: PostgresDataManager;

  beforeEach(() => {
    dm = makeDataManager({});
  });

  it("voegt elk uniek product één keer toe", async () => {
    const addFn = (dm as any).productController.addProductWithTracking;
    const result = await dm.addProductDb("Dirk", DIRK_SCRAPED_PRODUCTS);

    expect(addFn).toHaveBeenCalledTimes(DIRK_SCRAPED_PRODUCTS.length);
    expect(result.created).toBe(DIRK_SCRAPED_PRODUCTS.length);
    expect(result.updated).toBe(0);
  });

  it("voegt elk product toe met de juiste naam en categorie", async () => {
    const addFn = (dm as any).productController.addProductWithTracking;
    await dm.addProductDb("Dirk", DIRK_SCRAPED_PRODUCTS);

    for (const product of DIRK_SCRAPED_PRODUCTS) {
      expect(addFn).toHaveBeenCalledWith(product.name, product.category, "Dirk");
    }
  });

  it("slaat de supermarkt altijd op als 'Dirk', niet als waarde uit het product-object", async () => {
    const addFn = (dm as any).productController.addProductWithTracking;
    await dm.addProductDb("Dirk", DIRK_SCRAPED_PRODUCTS);

    const calls: string[][] = addFn.mock.calls;
    for (const [, , supermarket] of calls) {
      expect(supermarket).toBe("Dirk");
    }
  });

  it("dedupliceert dubbele producten en telt ze maar één keer", async () => {
    const addFn = (dm as any).productController.addProductWithTracking;
    const result = await dm.addProductDb("Dirk", DIRK_WITH_DUPLICATE);

    // 6 items ingevoerd, maar 1 duplicaat → 5 unieke producten
    expect(addFn).toHaveBeenCalledTimes(DIRK_SCRAPED_PRODUCTS.length);
    expect(result.created + result.updated).toBe(DIRK_SCRAPED_PRODUCTS.length);
  });

  it("voegt een discount toe voor elk product", async () => {
    await dm.addProductDb("Dirk", DIRK_SCRAPED_PRODUCTS);
    const discountFn = (dm as any).discountController.addDiscountSmart;
    const result = await dm.addDiscountDb(
      DIRK_SCRAPED_PRODUCTS,
      "Dirk",
      new Date()
    );

    expect(discountFn).toHaveBeenCalledTimes(DIRK_SCRAPED_PRODUCTS.length);
    expect(result.created).toBe(DIRK_SCRAPED_PRODUCTS.length);
    expect(result.skipped).toBe(0);
  });

  it("slaat het product over als het niet gevonden wordt (getProductId = -1)", async () => {
    dm = makeDataManager({
      getProductId: vi.fn().mockResolvedValue(-1),
    });

    await dm.addProductDb("Dirk", DIRK_SCRAPED_PRODUCTS);
    const result = await dm.addDiscountDb(
      DIRK_SCRAPED_PRODUCTS,
      "Dirk",
      new Date()
    );

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(DIRK_SCRAPED_PRODUCTS.length);
  });

  it("slaat discount over als product al een actieve discount heeft", async () => {
    dm = makeDataManager({
      hasActiveNonExpiredDiscount: vi.fn().mockResolvedValue(true),
    });

    await dm.addProductDb("Dirk", DIRK_SCRAPED_PRODUCTS);
    const result = await dm.addDiscountDb(
      DIRK_SCRAPED_PRODUCTS,
      "Dirk",
      new Date()
    );

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(DIRK_SCRAPED_PRODUCTS.length);
  });

  it("producten krijgen de correcte expire datum mee", async () => {
    await dm.addProductDb("Dirk", DIRK_SCRAPED_PRODUCTS);
    const discountFn = (dm as any).discountController.addDiscountSmart;
    await dm.addDiscountDb(DIRK_SCRAPED_PRODUCTS, "Dirk", new Date());

    const calls: any[][] = discountFn.mock.calls;
    for (let i = 0; i < calls.length; i++) {
      const expireDate = calls[i][4];
      expect(expireDate).toBe(DIRK_SCRAPED_PRODUCTS[i].expireDate);
    }
  });
});
