import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Product } from "@channel3/sdk/resources";

import { ProductDetails } from "@/registry/default/components/product-details";

const product: Product = {
  id: "shoe",
  title: "Runner",
  structured_attributes: {},
  ratings: { value: 4.6, count: 5012, source_count: 3 },
};

describe("ProductDetails", () => {
  it("shows the rating under the title", () => {
    render(<ProductDetails product={product} locale="en-US" />);
    const rating = screen.getByRole("img", { name: "Rated 4.6 out of 5, 5,012 reviews" });
    expect(screen.getByRole("heading", { level: 1 }).nextElementSibling).toBe(rating);
    expect(screen.getByText("(5K reviews)")).toBeInTheDocument();
  });

  it("omits the rating for an unrated product", () => {
    render(<ProductDetails product={{ ...product, ratings: null }} />);
    expect(document.querySelector("[data-slot=product-rating]")).toBeNull();
  });
});
