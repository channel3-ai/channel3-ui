import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type PageFetcher,
  useInfiniteScroll,
} from "@/registry/default/hooks/use-infinite-scroll";

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

interface Item {
  id: string;
}

const item = (id: string): Item => ({ id });

// The hook auto-resets when the `initialItems` reference changes, so tests must
// pass a stable seed (as real consumers do via state) to avoid a render loop.
const SEED: Item[] = [item("a")];

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useInfiniteScroll", () => {
  it("exposes the seed and whether more pages exist", () => {
    const fetchPage = vi.fn<PageFetcher<Item>>();
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({
        initialItems: SEED,
        initialPageToken: "1",
        fetchPage,
      }),
    );

    expect(result.current.items.map((i) => i.id)).toEqual(["a"]);
    expect(result.current.hasMore).toBe(true);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("has no more pages when the initial token is null", () => {
    const fetchPage = vi.fn<PageFetcher<Item>>();
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({
        initialItems: SEED,
        initialPageToken: null,
        fetchPage,
      }),
    );

    expect(result.current.hasMore).toBe(false);
  });

  it("appends the next page and advances the token on loadMore", async () => {
    const fetchPage = vi
      .fn<PageFetcher<Item>>()
      .mockResolvedValueOnce({ items: [item("b")], nextPageToken: "2" })
      .mockResolvedValueOnce({ items: [item("c")], nextPageToken: null });
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({
        initialItems: SEED,
        initialPageToken: "1",
        fetchPage,
      }),
    );

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("is a no-op when exhausted", async () => {
    const fetchPage = vi.fn<PageFetcher<Item>>();
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({
        initialItems: SEED,
        initialPageToken: null,
        fetchPage,
      }),
    );

    act(() => result.current.loadMore());
    await Promise.resolve();
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("skips already-seen items across pages when getItemKey is provided", async () => {
    const fetchPage = vi
      .fn<PageFetcher<Item>>()
      .mockResolvedValueOnce({
        items: [item("a"), item("b")],
        nextPageToken: null,
      });
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({
        initialItems: SEED,
        initialPageToken: "1",
        fetchPage,
        getItemKey: (i) => i.id,
      }),
    );

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("replaces the list and token on reset(seed)", async () => {
    const fetchPage = vi
      .fn<PageFetcher<Item>>()
      .mockResolvedValue({ items: [item("z")], nextPageToken: null });
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({
        initialItems: SEED,
        initialPageToken: "1",
        fetchPage,
      }),
    );

    act(() => result.current.reset({ items: [item("x")], nextPageToken: "9" }));
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(["x"]));
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((i) => i.id)).toEqual(["x", "z"]);
  });

  it("discards an in-flight page after reset so the latest seed wins", async () => {
    let resolveFirst:
      | ((page: { items: Item[]; nextPageToken: string | null }) => void)
      | null = null;
    const fetchPage = vi.fn<PageFetcher<Item>>().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({
        initialItems: SEED,
        initialPageToken: "1",
        fetchPage,
      }),
    );

    act(() => result.current.loadMore());
    act(() => result.current.reset({ items: [item("x")], nextPageToken: null }));
    act(() => resolveFirst?.({ items: [item("stale")], nextPageToken: "2" }));

    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual(["x"]);
    expect(result.current.hasMore).toBe(false);
  });
});
