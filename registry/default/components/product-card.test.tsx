import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Product } from "@channel3/sdk/resources";

import { ProductCard } from "@/registry/default/components/product-card";

const product: Product = {
  id: "shoe",
  title: "Runner",
  structured_attributes: {},
  images: [
    {
      url: "https://img/raw.jpg",
      cleaned_url: "https://img/clean.jpg",
      is_main_image: true,
      alt_text: "Runner",
    },
    { url: "https://img/hover.jpg", cleaned_url: "https://img/hover-clean.jpg", shot_type: "on_model" },
  ],
  variants: {
    options: [
      {
        name: "Color",
        values: [
          { label: "Blue", exists: true, thumbnail_url: "https://img/blue.jpg" },
          { label: "Black", exists: true, thumbnail_url: "https://img/black.jpg" },
        ],
      },
    ],
    selected: [{ name: "Color", label: "Blue" }],
  },
};

function mediaImages(): HTMLImageElement[] {
  const media = document.querySelector("[data-slot=product-card] .aspect-square");
  return [...(media?.querySelectorAll("img") ?? [])];
}

describe("ProductCard", () => {
  it("shows cleaned_url when the image has one", () => {
    render(<ProductCard product={product} />);
    expect(mediaImages()[0]).toHaveAttribute("src", "https://img/clean.jpg");
  });

  it("replaces the photo when the image is hovered", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={product} />);

    await user.hover(screen.getByText("Runner"));
    expect(mediaImages()[0]).toHaveAttribute("src", "https://img/clean.jpg");

    await user.hover(document.querySelector("[data-slot=product-card] .aspect-square")!);

    const images = mediaImages();
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "https://img/hover-clean.jpg");
  });

  it("swaps only the card under the pointer", () => {
    const other: Product = {
      ...product,
      id: "other",
      title: "Other",
      images: [
        {
          url: "https://img/other-raw.jpg",
          cleaned_url: "https://img/other-clean.jpg",
          is_main_image: true,
        },
        { url: "https://img/other-hover.jpg", cleaned_url: "https://img/other-hover-clean.jpg" },
      ],
    };
    render(
      <>
        <ProductCard product={product} />
        <ProductCard product={other} />
      </>,
    );

    const images = document.querySelectorAll("[data-slot=product-card] .aspect-square");
    // Enter both without leaving the first, the way a missed mouseleave sticks.
    fireEvent.mouseEnter(images[0]!);
    fireEvent.mouseEnter(images[1]!);

    const srcs = [...document.querySelectorAll("[data-slot=product-card] .aspect-square img")].map(
      (img) => img.getAttribute("src"),
    );
    expect(srcs).toEqual(["https://img/clean.jpg", "https://img/other-hover-clean.jpg"]);
  });

  it("replaces the photo with the swatch image on hover", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={product} />);

    await user.hover(screen.getByRole("button", { name: "Black" }));

    const images = mediaImages();
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "https://img/black.jpg");

    await user.unhover(screen.getByRole("button", { name: "Black" }));
    expect(mediaImages()[0]).toHaveAttribute("src", "https://img/clean.jpg");
  });
});
