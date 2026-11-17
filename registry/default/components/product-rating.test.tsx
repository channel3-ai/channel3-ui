import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProductRating } from "@/registry/default/components/product-rating";

const ratings = { value: 4.6, count: 5012, source_count: 3 };

function fillWidth(): string {
  return (document.querySelector("[data-slot=product-rating-fill]") as HTMLElement).style.width;
}

describe("ProductRating", () => {
  it("shows the value, a spelled-out compact count, and an accessible label", () => {
    render(<ProductRating ratings={ratings} locale="en-US" />);
    expect(screen.getByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("(5K reviews)")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName("Rated 4.6 out of 5, 5,012 reviews");
  });

  it("drops the noun at the sm size", () => {
    render(<ProductRating ratings={ratings} size="sm" locale="en-US" />);
    expect(screen.getByText("(5K)")).toBeInTheDocument();
  });

  it("fills the stars to the exact fraction", () => {
    render(<ProductRating ratings={{ ...ratings, value: 4 }} />);
    expect(fillWidth()).toBe("80%");
  });

  it("clamps out-of-range values", () => {
    render(<ProductRating ratings={{ ...ratings, value: 7 }} locale="en-US" />);
    expect(fillWidth()).toBe("100%");
    expect(screen.getByText("5.0")).toBeInTheDocument();
  });

  it("uses the singular for one review", () => {
    render(<ProductRating ratings={{ value: 5, count: 1, source_count: 1 }} locale="en-US" />);
    expect(screen.getByText("(1 review)")).toBeInTheDocument();
  });

  it("renders nothing without ratings or reviews", () => {
    const { container, rerender } = render(<ProductRating ratings={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProductRating ratings={undefined} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProductRating ratings={{ value: 0, count: 0, source_count: 0 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
