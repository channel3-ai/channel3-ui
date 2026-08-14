import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@channel3/sdk/resources";

import {
  type SearchFetcher,
  useProductSearch,
} from "@/registry/default/hooks/use-product-search";
import { createQueryWrapper } from "@/registry/default/hooks/query-test-wrapper";

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const product = (id: string): Product => ({ id, title: id, structured_attributes: {} });

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useProductSearch", () => {
  it("does not search until there are criteria", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [] });
    renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });
    await Promise.resolve();
    expect(fetchSearch).not.toHaveBeenCalled();
  });

  it("auto-searches on query change and exposes the first page", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({
      products: [product("a"), product("b")],
      nextPageToken: "1",
    });
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

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
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => result.current.setQuery("nike"));
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.results).toHaveLength(2));
    expect(result.current.results.map((p) => p.id)).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("only searches on submit when autoSearch is off", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [product("a")] });
    const { result } = renderHook(
      () => useProductSearch({ fetchSearch, debounceMs: 0, autoSearch: false }),
      { wrapper: createQueryWrapper() },
    );

    act(() => result.current.setQuery("nike"));
    await Promise.resolve();
    expect(fetchSearch).not.toHaveBeenCalled();

    act(() => result.current.submit());
    await waitFor(() => expect(fetchSearch).toHaveBeenCalledTimes(1));
  });

  it("searches on mount when searchOnMount is set and there is a query", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [product("a")] });
    const { result } = renderHook(
      () =>
        useProductSearch({
          fetchSearch,
          debounceMs: 0,
          searchOnMount: true,
          initialQuery: "nike",
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(fetchSearch).toHaveBeenCalledWith(expect.objectContaining({ query: "nike" }));
  });

  it("does not search on mount without criteria", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [] });
    renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0, searchOnMount: true }), {
      wrapper: createQueryWrapper(),
    });
    await Promise.resolve();
    expect(fetchSearch).not.toHaveBeenCalled();
  });

  it("searches by image without a text query", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [product("a")] });
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => result.current.searchByImage({ imageUrl: "https://img.example/shoe.jpg" }));
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(fetchSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "", imageUrl: "https://img.example/shoe.jpg" }),
    );
  });

  it("waits for the debounce before searching", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [product("a")] });
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 40 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => result.current.setQuery("nike"));
    await Promise.resolve();
    expect(fetchSearch).not.toHaveBeenCalled();

    await waitFor(() => expect(fetchSearch).toHaveBeenCalledTimes(1));
  });

  it("exposes a search error and keeps results empty", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockRejectedValue(new Error("upstream"));
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => result.current.setQuery("nike"));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("clears query, image, filters, and results on reset", async () => {
    const fetchSearch = vi.fn<SearchFetcher>().mockResolvedValue({ products: [product("a")] });
    const { result } = renderHook(() => useProductSearch({ fetchSearch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.setQuery("nike");
      result.current.searchByImage({ imageUrl: "https://img.example/shoe.jpg" });
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    act(() => result.current.reset());
    expect(result.current.query).toBe("");
    expect(result.current.image).toBeNull();
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
