import { describe, it, expect } from "vitest";
import {
  isSameProduct,
  matchFields,
  MatchCandidate,
  namingHabits,
  normalizeEan,
  normalizeWords,
} from "../utils/ProductMatch";
import { formatQuantity, parseQuantity, Quantity, stripQuantity } from "../utils/Quantity";

const liter: Quantity = { value: 1, unit: "l" };

function candidate(
  supermarket: string,
  name: string,
  brand: string | null,
  quantity: Quantity | null = liter
): MatchCandidate {
  const fields = matchFields(name, brand);
  return { supermarket, ean: null, matchBrand: fields.matchBrand, matchTokens: fields.matchTokens, quantity };
}

describe("stripQuantity", () => {
  it.each([
    ["Chocomel Vol 1 L", "Chocomel Vol"],
    ["Chocomel Vol Voordeel 8 x 1,5 L", "Chocomel Vol Voordeel"],
    ["Hertog Jan Pils 24 x 300ML", "Hertog Jan Pils"],
    ["Bananen per kilo", "Bananen"],
  ])("%s -> %s", (input, expected) => {
    expect(stripQuantity(input)).toBe(expected);
  });
});

describe("formatQuantity", () => {
  it.each([
    [{ value: 0.5, unit: "kg" }, "500 g"],
    [{ value: 1.5, unit: "l" }, "1,5 liter"],
    [{ value: 0.75, unit: "l" }, "750 ml"],
    [{ value: 6, unit: "stuk" }, "6 stuks"],
    [{ value: 1, unit: "stuk" }, "1 stuk"],
  ] as [Quantity, string][])("%o -> %s", (quantity, expected) => {
    expect(formatQuantity(quantity)).toBe(expected);
  });

  it("is null without a quantity", () => {
    expect(formatQuantity(null)).toBeNull();
  });
});

describe("normalizeWords", () => {
  it("drops accents and case, keeps percentages", () => {
    expect(normalizeWords("Café Crème 0% Suiker")).toEqual(["cafe", "crem", "0%", "suiker"]);
  });

  it("treats inflected adjectives as the same word", () => {
    expect(normalizeWords("Halfvolle Melk")).toEqual(normalizeWords("halfvoll melk"));
    expect(normalizeWords("jonge kaas")).toEqual(["jong", "kaas"]);
  });
});

describe("matchFields", () => {
  it("uses the brand and leaves it and the pack size out of the words", () => {
    expect(matchFields("Chocomel Vol 1 L", "Chocomel")).toEqual({ matchBrand: "chocomel", matchTokens: "vol" });
  });

  it("takes the first word as brand when none is known", () => {
    expect(matchFields("Chocomel Chocolademelk vol", null)).toEqual({
      matchBrand: "chocomel",
      matchTokens: "chocolademelk vol",
    });
  });

  it("leaves packaging words out", () => {
    expect(matchFields("Chocomel Vol voordeelpak", "Chocomel").matchTokens).toBe("vol");
    expect(matchFields("Hertog Jan Pils Krat", "Hertog Jan").matchTokens).toBe("pils");
  });

  it("works for a brand that is not in the name", () => {
    expect(matchFields("Vol", "Chocomel")).toEqual({ matchBrand: "chocomel", matchTokens: "vol" });
  });
});

describe("normalizeEan", () => {
  it("accepts valid barcodes", () => {
    expect(normalizeEan("8711715881847")).toBe("8711715881847");
    expect(normalizeEan("08718452968855")).toBe("8718452968855");
  });

  it("rejects wrong check digits and other numbers", () => {
    expect(normalizeEan("8711715881848")).toBeNull();
    expect(normalizeEan("159293")).toBeNull();
    expect(normalizeEan(null)).toBeNull();
    expect(normalizeEan("0000000000000")).toBeNull();
  });
});

describe("isSameProduct", () => {
  // The Chocomel Vol 1 liter that supermarktscanner.nl lists at 7 supermarkets.
  const ah = candidate("Albert Heijn", "Chocomel Vol", "Chocomel");
  const jumbo = candidate("Jumbo", "Chocomel Vol 1 L", "Chocomel");
  const dirk = candidate("Dirk", "Chocomel Chocolademelk vol", null);
  const dirkNames = [
    dirk,
    candidate("Dirk", "Chocomel Chocolademelk halfvol", null),
    candidate("Dirk", "Chocomel Chocolademelk 0%", null),
    candidate("Dirk", "Chocomel Chocolademelk vol", null, { value: 1.5, unit: "l" }),
  ];
  const habits = namingHabits([...dirkNames, ah, jumbo]);

  it("matches the same product with different names", () => {
    expect(isSameProduct(ah, jumbo, habits)).toBe(true);
    expect(isSameProduct(ah, dirk, habits)).toBe(true);
    expect(isSameProduct(dirk, jumbo, habits)).toBe(true);
  });

  it("keeps other variants apart", () => {
    expect(isSameProduct(ah, candidate("Jumbo", "Chocomel Halfvol 1 L", "Chocomel"), habits)).toBe(false);
    expect(
      isSameProduct(ah, candidate("Albert Heijn", "Chocomel Vol 0% suiker toegevoegd", "Chocomel"), habits)
    ).toBe(false);
    expect(isSameProduct(dirk, dirkNames[1], habits)).toBe(false);
  });

  it("keeps other pack sizes apart", () => {
    const big = candidate("Jumbo", "Chocomel Vol 1,5 L", "Chocomel", parseQuantity("1,5 L"));
    expect(isSameProduct(ah, big, habits)).toBe(false);
  });

  it("does not match without a known quantity", () => {
    expect(isSameProduct(ah, { ...jumbo, quantity: null }, habits)).toBe(false);
  });

  it("does not match other brands", () => {
    expect(isSameProduct(ah, candidate("Jumbo", "Jumbo Chocolademelk Vol", "Jumbo"), habits)).toBe(false);
  });

  it("decides on the barcode when both have one", () => {
    const withEan = { ...ah, ean: "8718452968855" };
    expect(isSameProduct(withEan, { ...candidate("Jumbo", "Something else", "Other"), ean: "8718452968855" })).toBe(true);
    expect(isSameProduct(withEan, { ...jumbo, ean: "8711715881847" })).toBe(false);
  });

  it("only ignores a naming habit when the other name lacks the word", () => {
    // Dirk uses "vol" in all these names; vol and halfvol must stay apart.
    const many = [
      candidate("Dirk", "Chocomel vol", null),
      candidate("Dirk", "Chocomel vol", null, { value: 1.5, unit: "l" }),
      candidate("Dirk", "Chocomel vol", null, { value: 0.2, unit: "l" }),
    ];
    const dirkHabits = namingHabits(many);
    expect(dirkHabits.get("Dirk")?.has("vol")).toBe(true);
    expect(isSameProduct(many[0], ah, dirkHabits)).toBe(true);
    expect(isSameProduct(many[0], candidate("Jumbo", "Chocomel Halfvol", "Chocomel"), dirkHabits)).toBe(false);
  });
});
