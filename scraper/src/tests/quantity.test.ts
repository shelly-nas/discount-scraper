import { describe, it, expect } from "vitest";
import { parseQuantity, pricePerUnit } from "../utils/Quantity";

describe("parseQuantity", () => {
  it.each([
    ["500 g", { value: 0.5, unit: "kg" }],
    ["500 Gram", { value: 0.5, unit: "kg" }],
    ["ca. 1 kg", { value: 1, unit: "kg" }],
    ["1,5 liter", { value: 1.5, unit: "l" }],
    ["750 Milliliter", { value: 0.75, unit: "l" }],
    ["33 cl", { value: 0.33, unit: "l" }],
    ["6 x 330 ml", { value: 1.98, unit: "l" }],
    ["6 x 0,33 l", { value: 1.98, unit: "l" }],
    ["4 stuks", { value: 4, unit: "stuk" }],
    ["16 Rol", { value: 16, unit: "stuk" }],
    ["per stuk", { value: 1, unit: "stuk" }],
  ])("reads %s", (text, expected) => {
    expect(parseQuantity(text)).toEqual(expected);
  });

  it("returns null when there is no quantity", () => {
    expect(parseQuantity("1 bos")).toBeNull();
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity(null)).toBeNull();
    expect(parseQuantity("0 g")).toBeNull();
  });
});

describe("pricePerUnit", () => {
  it("divides the price by the quantity, rounded to cents", () => {
    expect(pricePerUnit(2.59, { value: 0.5, unit: "kg" })).toEqual({ value: 5.18, unit: "kg" });
    expect(pricePerUnit(1.29, { value: 0.064, unit: "kg" })).toEqual({ value: 20.16, unit: "kg" });
  });

  it("is null without a price or quantity", () => {
    expect(pricePerUnit(null, { value: 1, unit: "l" })).toBeNull();
    expect(pricePerUnit(1, null)).toBeNull();
  });
});
