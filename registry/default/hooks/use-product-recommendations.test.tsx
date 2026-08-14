import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@channel3/sdk/resources";

import { useProductRecommendations } from "@/registry/default/hooks/use-product-recommendations";
import { createQueryWrapper } from "@/registry/default/hooks/query-test-wrapper";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  elements = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe(element: Element) {
    this.elements.add(element);
  }
  unobserve(element: Element) {
    this.elements.delete(element);
  }
  disconnect() {
    this.elements.clear();
  }
  trigger() {
    const entries = [...this.elements].map(
      (target) => ({ isIntersecting: true, target }) as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

const products: Product[] = [
  { id: "a", title: "A", structured_attributes: {} },
  { id: "b", title: "B", structured_attributes: {} },
];

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useProductRecommendations", () => {
  it("defers fetching until the section is in view", async () => {
    const fetchSimilar = vi.fn().mockResolvedValue(products);
    const { result } = renderHook(
      () => useProductRecommendations({ productId: "source", fetchSimilar }),
      { wrapper: createQueryWrapper() },
    );

    act(() => result.current.ref(document.createElement("div")));
    expect(fetchSimilar).not.toHaveBeenCalled();

    act(() => {
      MockIntersectionObserver.instances.at(-1)?.trigger();
    });

    await waitFor(() => expect(result.current.products).toHaveLength(2));
    expect(fetchSimilar).toHaveBeenCalledWith({
      productId: "source",
      limit: 12,
      filters: undefined,
    });
    expect(result.current.hasLoaded).toBe(true);
  });

  it("fetches immediately when eager", async () => {
    const fetchSimilar = vi.fn().mockResolvedValue(products);
    const { result } = renderHook(
      () => useProductRecommendations({ productId: "source", fetchSimilar, eager: true }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(fetchSimilar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.products).toHaveLength(2));
  });

  it("does not fetch without a productId", () => {
    const fetchSimilar = vi.fn().mockResolvedValue(products);
    renderHook(
      () => useProductRecommendations({ productId: undefined, fetchSimilar, eager: true }),
      { wrapper: createQueryWrapper() },
    );
    expect(fetchSimilar).not.toHaveBeenCalled();
  });
});
