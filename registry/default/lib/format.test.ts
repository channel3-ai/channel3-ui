import { describe, expect, it } from "vitest";
import type { Price, ProductImage, ProductOffer } from "@channel3/sdk/resources";

import {
  availabilityLabel,
  discountPercent,
  formatCurrency,
  formatDomain,
  isOnSale,
  isPurchasable,
  isSoldOut,
  leadOffer,
  pickImage,
} from "@/registry/default/lib/format";

const price = (value: number, compareAt?: number): Price => ({
  price: value,
  currency: "USD",
  compare_at_price: compareAt ?? null,
});

const offer = (value: number, availability: ProductOffer["availability"], domain = "shop.com"): ProductOffer => ({
  url: `https://${domain}`,
  domain,
  availability,
  price: price(value),
});

describe("formatCurrency", () => {
  it("formats known currencies", () => {
    expect(formatCurrency(12.5, "USD", "en-US")).toBe("$12.50");
  });

  it("falls back to a code-prefixed string for malformed currency codes", () => {
    expect(formatCurrency(12.5, "DOLLARS")).toBe("DOLLARS 12.50");
  });
});

describe("discounts", () => {
  it("detects a sale and computes whole-percent discount", () => {
    expect(isOnSale(price(80, 100))).toBe(true);
    expect(discountPercent(price(80, 100))).toBe(20);
  });

  it("returns null when not discounted", () => {
    expect(isOnSale(price(100))).toBe(false);
    expect(discountPercent(price(100))).toBeNull();
    expect(discountPercent(price(100, 90))).toBeNull();
  });
});

describe("formatDomain", () => {
  it("strips protocol and www", () => {
    expect(formatDomain("https://www.nordstrom.com")).toBe("nordstrom.com");
    expect(formatDomain("nike.com")).toBe("nike.com");
  });
});

describe("availability", () => {
  it("treats sellable statuses as purchasable", () => {
    expect(isPurchasable("InStock")).toBe(true);
    expect(isPurchasable("PreOrder")).toBe(true);
    expect(isPurchasable("OutOfStock")).toBe(false);
    expect(isPurchasable("Discontinued")).toBe(false);
  });

  it("labels statuses", () => {
    expect(availabilityLabel("InStock")).toBe("In stock");
    expect(availabilityLabel("OutOfStock")).toBe("Out of stock");
  });
});

describe("leadOffer", () => {
  it("prefers the cheapest in-stock offer", () => {
    const offers = [offer(120, "OutOfStock", "a.com"), offer(130, "InStock", "b.com"), offer(140, "InStock", "c.com")];
    expect(leadOffer(offers)?.domain).toBe("b.com");
  });

  it("falls back to cheapest when nothing is in stock", () => {
    const offers = [offer(140, "OutOfStock", "a.com"), offer(120, "OutOfStock", "b.com")];
    expect(leadOffer(offers)?.domain).toBe("b.com");
  });

  it("returns undefined with no offers", () => {
    expect(leadOffer([])).toBeUndefined();
    expect(leadOffer(undefined)).toBeUndefined();
  });
});

describe("isSoldOut", () => {
  it("is true only when offers exist and none are in stock", () => {
    expect(isSoldOut([offer(10, "OutOfStock")])).toBe(true);
    expect(isSoldOut([offer(10, "InStock")])).toBe(false);
    expect(isSoldOut([])).toBe(false);
  });
});

describe("pickImage", () => {
  const images: ProductImage[] = [
    { url: "a", is_main_image: true },
    { url: "b", is_cleaned_image: true },
  ];

  it("prefers cleaned images when asked", () => {
    expect(pickImage(images, { preferCleaned: true })?.url).toBe("b");
  });

  it("prefers the main image otherwise", () => {
    expect(pickImage(images)?.url).toBe("a");
  });

  it("returns undefined for empty input", () => {
    expect(pickImage([])).toBeUndefined();
    expect(pickImage(undefined)).toBeUndefined();
  });
});
