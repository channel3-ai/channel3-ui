import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "@channel3/sdk/resources";

import { useVariantSelection } from "@/registry/default/hooks/use-variant-selection";

type OptionValue = ProductDetail.Variants.Option.Value;

const product = (id: string, selectedColor = "Blue"): ProductDetail => ({
  id,
  title: id,
  structured_attributes: {},
  variants: {
    options: [
      {
        name: "Color",
        values: [
          { label: "Blue", exists: true },
          { label: "Black", exists: true },
        ],
      },
    ],
    selected: [{ name: "Color", label: selectedColor }],
  },
});

const black: OptionValue = { label: "Black", exists: true };

describe("useVariantSelection", () => {
  it("optimistically reflects the pending selection while resolve is in flight", async () => {
    let settle: ((resolved: ProductDetail) => void) | null = null;
    const resolve = vi.fn(
      () => new Promise<ProductDetail>((res) => { settle = res; }),
    );
    const { result } = renderHook(() => useVariantSelection({ product: product("a"), resolve }));

    act(() => result.current.select("Color", black));
    expect(result.current.selection.Color).toBe("Black");
    expect(result.current.isResolving).toBe(true);

    act(() => settle?.(product("a", "Black")));
    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.selection.Color).toBe("Black");
  });

  it("discards a resolve that lands after the input product is swapped", async () => {
    let settle: ((resolved: ProductDetail) => void) | null = null;
    const resolve = vi.fn(
      () => new Promise<ProductDetail>((res) => { settle = res; }),
    );
    const onResolved = vi.fn();
    const { result, rerender } = renderHook(
      ({ product: p }) => useVariantSelection({ product: p, resolve, onResolved }),
      { initialProps: { product: product("a") } },
    );

    act(() => result.current.select("Color", black));
    expect(result.current.isResolving).toBe(true);

    // Consumer swaps to a different product (e.g. a new search hit) mid-resolve.
    act(() => rerender({ product: product("b") }));
    expect(result.current.product.id).toBe("b");
    expect(result.current.isResolving).toBe(false);

    // The stale resolve from product "a" must not clobber "b".
    act(() => settle?.(product("a-resolved")));
    await Promise.resolve();

    expect(result.current.product.id).toBe("b");
    expect(onResolved).not.toHaveBeenCalled();
  });

  it("tracks selection locally without a resolver", () => {
    const { result } = renderHook(() => useVariantSelection({ product: product("a") }));
    act(() => result.current.select("Color", black));
    expect(result.current.selection.Color).toBe("Black");
    expect(result.current.isResolving).toBe(false);
  });
});
