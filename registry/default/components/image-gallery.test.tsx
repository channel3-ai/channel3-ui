import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { ProductImage } from "@channel3/sdk/resources";

import { ImageGallery } from "@/registry/default/components/image-gallery";

const images: ProductImage[] = [
  { url: "https://img/raw.jpg", cleaned_url: "https://img/clean.jpg", alt_text: "Studio" },
];

describe("ImageGallery", () => {
  it("shows cleaned_url when the image has one", () => {
    render(<ImageGallery images={images} />);
    const img = document.querySelector("[data-slot=image-gallery] img");
    expect(img).toHaveAttribute("src", "https://img/clean.jpg");
  });

  it("replaces the active slide while a variant preview is set", () => {
    render(<ImageGallery images={images} previewSrc="https://img/black.jpg" />);
    const imgs = [...document.querySelectorAll("[data-slot=image-gallery] img")];
    const slide = imgs.find((img) => img.getAttribute("src") === "https://img/clean.jpg");
    const preview = imgs.find((img) => img.getAttribute("src") === "https://img/black.jpg");
    expect(slide?.className).toContain("invisible");
    expect(preview).toBeTruthy();
    expect(preview?.className).not.toContain("invisible");
  });
});
