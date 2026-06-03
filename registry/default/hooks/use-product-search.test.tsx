import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "@channel3/sdk/resources";

import {
  type SearchFetcher,
  useProductSearch,
} from "@/registry/default/hooks/use-product-search";

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const product = (id: string): ProductDetail => ({ id, title: id, structured_attributes: {} });

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useProductSearch", () => {
  it("does not search until there are criteria", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [] });
    renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }));
    await Promise.resolve();
    expect(fetchSearch).not.toHaveBeenCalled();
  });

  it("auto-searches on query change and exposes the first page", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({
      products: [product("a"), product("b")],
      nextPageToken: "1",
    });
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }));

    act(() => result.current.setQuery("nike"));

    await waitFor(() => expect(result.current.results).toHaveLength(2));
    expect(fetchSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "nike", filters: {} }),
    );
    expect(result.current.hasMore).toBe(true);
  });

  it("appends the next page on loadMore", async () => {
    const fetchSearch = vi
      .fn<SearchFetcher>()
      .mockResolvedValueOnce({ products: [product("a")], nextPageToken: "1" })
      .mockResolvedValueOnce({ products: [product("b")], nextPageToken: null });
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }));

    act(() => result.current.setQuery("nike"));
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.results).toHaveLength(2));
    expect(result.current.results.map((p) => p.id)).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("only searches on submit when autoSearch is off", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [product("a")] });
    const { result } = renderHook(() =>
      useProductSearch({ fetchSearch, debounceMs: 0, autoSearch: false }),
    );

    act(() => result.current.setQuery("nike"));
    await Promise.resolve();
    expect(fetchSearch).not.toHaveBeenCalled();

    act(() => result.current.submit());
    await waitFor(() => expect(fetchSearch).toHaveBeenCalledTimes(1));
  });
});
