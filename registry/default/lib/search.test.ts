import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  EMPTY_FILTERS,
  facetCounts,
  isValidHex,
  normalizeHex,
  type SearchFiltersState,
  setAttributeValues,
  setColorPercentage,
  toSearchFilters,
} from "@/registry/default/lib/search";

const state = (overrides: Partial<SearchFiltersState> = {}): SearchFiltersState => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

describe("toSearchFilters", () => {
  it("drops empty facets", () => {
    expect(toSearchFilters(EMPTY_FILTERS)).toEqual({});
  });

  it("maps populated facets to the SDK shape", () => {
    const result = toSearchFilters(
      state({
        price: { minPrice: 50, maxPrice: 200 },
        gender: "female",
        age: ["kids", "toddler"],
        condition: "new",
        availability: ["InStock"],
        colors: [{ hex: "#000000" }, { hex: "#ff0000", percentage: 0.5 }],
        brands: [{ id: "nike", name: "Nike" }],
        categories: [{ slug: "running-shoes", title: "Running Shoes", has_children: false }],
        attributes: { color: ["Black"] },
      }),
    );

    expect(result).toEqual({
      price: { min_price: 50, max_price: 200 },
      gender: "female",
      age: ["kids", "toddler"],
      condition: "new",
      availability: ["InStock"],
      colors: { palette: [{ hex: "#000000" }, { hex: "#ff0000", percentage: 0.5 }] },
      brand_ids: ["nike"],
      category_ids: ["running-shoes"],
      attributes: { color: ["Black"] },
    });
  });

  it("includes a one-sided price bound", () => {
    expect(toSearchFilters(state({ price: { minPrice: null, maxPrice: 100 } })).price).toEqual({
      max_price: 100,
    });
  });
});

describe("facetCounts", () => {
  it("counts active values per facet", () => {
    expect(facetCounts(EMPTY_FILTERS)).toMatchObject({ price: 0, age: 0, attributes: 0 });
    expect(
      facetCounts(
        state({
          price: { minPrice: 10, maxPrice: null },
          age: ["kids", "adult"],
          colors: [{ hex: "#000000" }],
          attributes: { color: ["Black", "Blue"], material: ["Leather"] },
        }),
      ),
    ).toMatchObject({ price: 1, age: 2, colors: 1, attributes: 3 });
  });
});

describe("countActiveFilters", () => {
  it("sums every active facet and value", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(
      countActiveFilters(
        state({
          price: { minPrice: 10, maxPrice: null },
          age: ["kids", "adult"],
          colors: [{ hex: "#000000" }],
          attributes: { color: ["Black", "Blue"], material: ["Leather"] },
        }),
      ),
    ).toBe(1 + 2 + 1 + 3);
  });
});

describe("color helpers", () => {
  it("validates hex strings", () => {
    expect(isValidHex("#abc")).toBe(true);
    expect(isValidHex("a1b2c3")).toBe(true);
    expect(isValidHex("#a1b2c3")).toBe(true);
    expect(isValidHex("nope")).toBe(false);
    expect(isValidHex("#12")).toBe(false);
  });

  it("normalizes to lowercase #rrggbb", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("FF0000")).toBe("#ff0000");
    expect(normalizeHex("nope")).toBeNull();
  });
});

describe("setColorPercentage", () => {
  const palette = [
    { hex: "#000000", percentage: 0.5 },
    { hex: "#ffffff", percentage: 0.5 },
  ];

  it("leaves others untouched when within budget", () => {
    expect(setColorPercentage(palette, "#000000", 0.4)).toEqual([
      { hex: "#000000", percentage: 0.4 },
      { hex: "#ffffff", percentage: 0.5 },
    ]);
  });

  it("scales other targets down so the total never exceeds 100%", () => {
    const next = setColorPercentage(palette, "#000000", 0.8);
    expect(next[0]).toEqual({ hex: "#000000", percentage: 0.8 });
    // The other color scales into the remaining 0.2 budget (floored to a whole
    // percent so the rounded chips can never visibly exceed 100%).
    expect(next[1]?.percentage).toBeLessThanOrEqual(0.2);
    expect(next[1]?.percentage).toBeGreaterThan(0.18);
    const total = next.reduce((sum, color) => sum + (color.percentage ?? 0), 0);
    expect(total).toBeLessThanOrEqual(1);
  });

  it("ignores untargeted colors when balancing", () => {
    const mixed = [
      { hex: "#000000", percentage: 0.5 },
      { hex: "#ffffff" },
    ];
    expect(setColorPercentage(mixed, "#000000", 0.9)).toEqual([
      { hex: "#000000", percentage: 0.9 },
      { hex: "#ffffff" },
    ]);
  });

  it("clears a target without disturbing the rest", () => {
    expect(setColorPercentage(palette, "#000000", null)).toEqual([
      { hex: "#000000", percentage: null },
      { hex: "#ffffff", percentage: 0.5 },
    ]);
  });
});

describe("attribute helpers", () => {
  it("sets and clears attribute values", () => {
    const withColor = setAttributeValues({}, "color", ["Black"]);
    expect(withColor).toEqual({ color: ["Black"] });
    expect(setAttributeValues(withColor, "color", [])).toEqual({});
  });
});
