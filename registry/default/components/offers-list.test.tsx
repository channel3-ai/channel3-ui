import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ProductOffer } from "@channel3/sdk/resources";

import { OffersList } from "@/registry/default/components/offers-list";

const offer = (
  domain: string,
  price: number,
  availability: ProductOffer["availability"],
): ProductOffer => ({
  url: `https://${domain}/p`,
  domain,
  availability,
  price: { price, currency: "USD" },
});

const offers: ReadonlyArray<ProductOffer> = [
  offer("b.com", 90, "OutOfStock"),
  offer("a.com", 120, "InStock"),
  offer("c.com", 100, "InStock"),
];

describe("OffersList", () => {
  it("renders in-stock offers first (cheapest leads), then out-of-stock", () => {
    render(<OffersList offers={offers} />);
    const domains = screen.getAllByText(/\.com$/).map((node) => node.textContent);
    expect(domains).toEqual(["c.com", "a.com", "b.com"]);
  });

  it("marks the cheapest in-stock offer as the lowest price", () => {
    render(<OffersList offers={offers} />);
    expect(screen.getAllByText("Best Price")).toHaveLength(1);
  });

  it("groups out-of-stock offers under a header but keeps their price", () => {
    render(<OffersList offers={offers} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByText("$90.00")).toBeInTheDocument();
  });

  it("shows an empty state with no offers", () => {
    render(<OffersList offers={[]} />);
    expect(screen.getByText("No offers")).toBeInTheDocument();
  });
});
