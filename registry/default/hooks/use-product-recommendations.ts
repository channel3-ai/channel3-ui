import * as React from "react";
import type { ProductDetail, SearchFilters } from "@channel3/sdk/resources";

/** Arguments handed to a {@link SimilarFetcher}. */
export interface SimilarFetchInput {
  /** Canonical id of the product to find neighbors for (the PDP's `product.id`). */
  productId: string;
  /** Maximum number of recommendations to return. */
  limit: number;
  /** Optional filters to narrow the neighborhood (e.g. same gender/brand). */
  filters?: SearchFilters;
}

/**
 * Fetches products similar to `productId`. Implement on the consumer side so
 * the Channel3 API key stays on your server: call
 * `client.products.findSimilar({ product_id, limit, filters })` and return its
 * `.products`.
 */
export type SimilarFetcher = (input: SimilarFetchInput) => Promise<ProductDetail[]>;

export interface UseProductRecommendationsOptions {
  /** Canonical id of the product on the page. A PDP always has one. */
  productId: string | undefined;
  /** Server-side fetcher; see {@link SimilarFetcher}. */
  fetchSimilar: SimilarFetcher;
  /** Max recommendations to request. Defaults to 12. */
  limit?: number;
  /** Optional filters forwarded to the fetcher. */
  filters?: SearchFilters;
  /** Fetch immediately on mount instead of when the section scrolls into view. */
  eager?: boolean;
  /** Set `false` to suspend fetching entirely (e.g. feature flag off). Defaults to `true`. */
  enabled?: boolean;
}

export interface UseProductRecommendationsResult {
  /** Attach to the section wrapper; fetching starts when it enters the viewport. */
  ref: (node: Element | null) => void;
  /** Resolved recommendations (empty until loaded). */
  products: ProductDetail[];
  /** True while the fetch is in flight. */
  isLoading: boolean;
  /** The last fetch error, or `null`. */
  error: unknown;
  /** True once a fetch has resolved (success or empty) for the current product. */
  hasLoaded: boolean;
}

const EMPTY: ProductDetail[] = [];

/**
 * Lazily loads "you might also like" recommendations for a product. The fetch
 * is deferred until the returned `ref`'d element scrolls into view (unless
 * `eager`), so it never blocks the rest of the PDP. Re-runs when `productId`
 * changes and ignores stale responses.
 */
export function useProductRecommendations({
  productId,
  fetchSimilar,
  limit = 12,
  filters,
  eager = false,
  enabled = true,
}: UseProductRecommendationsOptions): UseProductRecommendationsResult {
  const [products, setProducts] = React.useState<ProductDetail[]>(EMPTY);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [inView, setInView] = React.useState(eager);

  const [node, setNode] = React.useState<Element | null>(null);
  const ref = React.useCallback((next: Element | null) => setNode(next), []);

  // Reset when the product changes so a new PDP shows fresh recommendations.
  React.useEffect(() => {
    setProducts(EMPTY);
    setError(null);
    setHasLoaded(false);
    setInView(eager);
  }, [productId, eager]);

  // Observe the section; flip `inView` the first time it's visible.
  React.useEffect(() => {
    if (eager || inView || !node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, eager, inView]);

  const requestId = React.useRef(0);

  React.useEffect(() => {
    if (!enabled || !inView || !productId) {
      return;
    }
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    void Promise.resolve(fetchSimilar({ productId, limit, filters }))
      .then((result) => {
        if (id !== requestId.current) {
          return;
        }
        setProducts(result);
        setHasLoaded(true);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) {
          return;
        }
        setError(caught);
      })
      .finally(() => {
        if (id === requestId.current) {
          setIsLoading(false);
        }
      });
  }, [enabled, inView, productId, limit, filters, fetchSimilar]);

  return { ref, products, isLoading, error, hasLoaded };
}
