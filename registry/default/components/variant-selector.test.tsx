import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Variants } from "@channel3/sdk/resources";

import { VariantSelector } from "@/registry/default/components/variant-selector";

const variants: Variants = {
  options: [
    {
      name: "Color",
      values: [
        { label: "Blue", exists: true, available: "InStock", thumbnail_url: "https://img/blue.png" },
        { label: "Black", exists: true, available: "InStock", thumbnail_url: "https://img/black.png" },
      ],
    },
    {
      name: "Size",
      values: [
        { label: "9", exists: true, available: "InStock" },
        { label: "10", exists: true, available: "OutOfStock" },
        { label: "12", exists: false },
      ],
    },
  ],
  selected: [
    { name: "Color", label: "Blue" },
    { name: "Size", label: "9" },
  ],
};

describe("VariantSelector", () => {
  it("marks the resolved selection as pressed", () => {
    render(<VariantSelector variants={variants} />);
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "9" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Black" })).toHaveAttribute("aria-pressed", "false");
  });

  it("emits the option name and chosen value on click", () => {
    const onSelect = vi.fn();
    render(<VariantSelector variants={variants} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Black" }));
    expect(onSelect).toHaveBeenCalledWith("Color", expect.objectContaining({ label: "Black" }));

    fireEvent.click(screen.getByRole("button", { name: "10" }));
    expect(onSelect).toHaveBeenCalledWith("Size", expect.objectContaining({ label: "10" }));
  });

  it("keeps not-offered values clickable for server-side relaxation", () => {
    const onSelect = vi.fn();
    render(<VariantSelector variants={variants} onSelect={onSelect} />);

    const notOffered = screen.getByRole("button", { name: "12" });
    expect(notOffered).not.toBeDisabled();
    fireEvent.click(notOffered);
    expect(onSelect).toHaveBeenCalledWith("Size", expect.objectContaining({ label: "12" }));
  });
});
