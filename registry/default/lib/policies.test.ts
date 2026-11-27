import { describe, expect, it } from "vitest";
import type { OfferReturnPolicy, OfferShippingPolicy, ProductOffer } from "@channel3/sdk/resources";

import {
  deliveryTimeLabel,
  returnsCaveats,
  returnsLabel,
  shippingLabel,
} from "@/registry/default/lib/policies";

const usd = (amount: number) => ({ amount, currency: "USD" });

const offer = (price: number, shipping_policy: OfferShippingPolicy | null): ProductOffer => ({
  url: "https://shop.com/p",
  domain: "shop.com",
  availability: "InStock",
  price: { price, currency: "USD" },
  shipping_policy,
});

describe("shippingLabel", () => {
  it("says free when shipping is always free", () => {
    expect(shippingLabel(offer(20, { free_shipping_minimum: usd(0) }), "en-US")).toBe(
      "Free delivery",
    );
  });

  it("states the threshold when the item alone doesn't clear it", () => {
    expect(shippingLabel(offer(65.23, { free_shipping_minimum: usd(75) }), "en-US")).toBe(
      "Free delivery on $75+",
    );
  });

  it("says free when the item's price clears the threshold", () => {
    expect(shippingLabel(offer(80, { free_shipping_minimum: usd(75) }), "en-US")).toBe(
      "Free delivery",
    );
  });

  it("falls back to the paid rate, keeping cents when there are any", () => {
    expect(shippingLabel(offer(20, { shipping_cost: usd(8) }), "en-US")).toBe("$8 delivery");
    expect(shippingLabel(offer(20, { shipping_cost: usd(5.95) }), "en-US")).toBe(
      "$5.95 delivery",
    );
  });

  it("returns null without terms", () => {
    expect(shippingLabel(offer(20, null))).toBeNull();
    expect(shippingLabel(offer(20, {}))).toBeNull();
  });
});

describe("deliveryTimeLabel", () => {
  it("uses the first listed service's range", () => {
    expect(
      deliveryTimeLabel({
        delivery_days_max: 7,
        options: [
          { name: "Standard", delivery_days_min: 3, delivery_days_max: 5 },
          { name: "Freight", delivery_days_max: 7 },
        ],
      }),
    ).toBe("3–5 day delivery");
  });

  it("states an upper bound when there's no range", () => {
    expect(deliveryTimeLabel({ options: [{ name: "Standard", delivery_days_max: 7 }] })).toBe(
      "Up to 7 day delivery",
    );
    expect(deliveryTimeLabel({ options: [{ delivery_days_max: 1 }] })).toBe("1 day delivery");
  });

  it("returns null when the first service states no transit time", () => {
    expect(
      deliveryTimeLabel({
        delivery_days_max: 2,
        options: [{ name: "Standard" }, { name: "Expedited", delivery_days_max: 2 }],
      }),
    ).toBeNull();
    expect(deliveryTimeLabel({ delivery_days_max: 7 })).toBeNull();
    expect(deliveryTimeLabel(null)).toBeNull();
  });
});

describe("returnsLabel", () => {
  const policy = (overrides: Partial<OfferReturnPolicy>): OfferReturnPolicy => ({
    accepted: true,
    ...overrides,
  });

  it("combines free and the window", () => {
    expect(returnsLabel(policy({ free: true, window_days: 60 }))).toBe("Free 60-day returns");
    expect(returnsLabel(policy({ free: false, window_days: 30 }))).toBe("30-day returns");
    expect(returnsLabel(policy({ free: true }))).toBe("Free returns");
  });

  it("covers unlimited windows and no returns", () => {
    expect(returnsLabel(policy({ free: true, window_unlimited: true }))).toBe(
      "Free returns, no time limit",
    );
    expect(returnsLabel(policy({ accepted: false }))).toBe("No returns");
  });

  it("returns null when acceptance is all that's known", () => {
    expect(returnsLabel(policy({}))).toBeNull();
    expect(returnsLabel(undefined)).toBeNull();
  });
});

describe("returnsCaveats", () => {
  it("lists fees and non-cash refunds", () => {
    expect(
      returnsCaveats(
        {
          accepted: true,
          free: false,
          return_fee: usd(7.95),
          restocking_fee: true,
          refund_types: ["store_credit"],
        },
        "en-US",
      ),
    ).toEqual(["$7.95 return shipping", "Restocking fee", "Store credit only"]);
  });

  it("stays quiet for free, full-refund returns", () => {
    expect(
      returnsCaveats({ accepted: true, free: true, refund_types: ["full_refund", "exchange"] }),
    ).toEqual([]);
  });
});
