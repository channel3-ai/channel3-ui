import { describe, expect, it } from "vitest";
import type { ProductDetail } from "@channel3/sdk/resources";

import {
  isSwatchOption,
  mergeSelection,
  selectionFromVariants,
  valueState,
} from "@/registry/default/lib/variants";

type OptionValue = ProductDetail.Variants.Option.Value;

const value = (overrides: Partial<OptionValue> & { label: string; exists: boolean }): OptionValue => ({
  ...overrides,
});

describe("valueState", () => {
  it("marks the selected value", () => {
    expect(valueState(value({ label: "Blue", exists: true }), true)).toBe("selected");
  });

  it("marks values absent from this configuration as notOffered", () => {
    expect(valueState(value({ label: "White", exists: false }), false)).toBe("notOffered");
  });

  it("marks existing-but-unavailable values as outOfStock", () => {
    expect(valueState(value({ label: "XL", exists: true, available: "OutOfStock" }), false)).toBe(
      "outOfStock",
    );
  });

  it("treats hydrated, purchasable values as available", () => {
    expect(valueState(value({ label: "M", exists: true, available: "InStock" }), false)).toBe(
      "available",
    );
  });

  it("treats search results (no availability) as available when they exist", () => {
    expect(valueState(value({ label: "M", exists: true }), false)).toBe("available");
  });
});

const variants: ProductDetail.Variants = {
  options: [
    {
      name: "Color",
      values: [
        { label: "Blue", exists: true, thumbnail_url: "https://img/blue.png" },
        { label: "Black", exists: true, thumbnail_url: "https://img/black.png" },
      ],
    },
    {
      name: "Size",
      values: [
        { label: "9", exists: true },
        { label: "10", exists: true },
      ],
    },
  ],
  selected: [
    { name: "Color", label: "Blue" },
    { name: "Size", label: "9" },
  ],
};

describe("selection helpers", () => {
  it("builds a name→label map from selected", () => {
    expect(selectionFromVariants(variants)).toEqual({ Color: "Blue", Size: "9" });
  });

  it("detects swatch options by thumbnail presence", () => {
    expect(isSwatchOption(variants.options[0] as ProductDetail.Variants.Option)).toBe(true);
    expect(isSwatchOption(variants.options[1] as ProductDetail.Variants.Option)).toBe(false);
  });

  it("merges a pending selection over the resolved one", () => {
    expect(mergeSelection(variants, { Size: "10" })).toEqual({ Color: "Blue", Size: "10" });
  });
});
