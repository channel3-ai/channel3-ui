import * as React from "react";
import type { ProductDetail, SearchFilters } from "@channel3/sdk/resources";

import { useInViewport } from "@/registry/default/hooks/use-in-viewport";
import { useLatestRequest } from "@/registry/default/hooks/use-latest-request";

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

  const { run, cancel } = useLatestRequest();

  // Reset when the product changes so a new PDP shows fresh recommendations,
  // discarding any in-flight fetch for the previous product.
  React.useEffect(() => {
    cancel();
    setProducts(EMPTY);
    setError(null);
    setHasLoaded(false);
    setInView(eager);
  }, [productId, eager, cancel]);

  // Observe the section; flip `inView` the first time it's visible.
  useInViewport(node, () => setInView(true), { enabled: !eager && !inView, once: true });

  React.useEffect(() => {
    if (!enabled || !inView || !productId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    run(Promise.resolve(fetchSimilar({ productId, limit, filters })), {
      onResolve: (result) => {
        setProducts(result);
        setHasLoaded(true);
      },
      onReject: (caught) => setError(caught),
      onSettle: () => setIsLoading(false),
    });
  }, [enabled, inView, productId, limit, filters, fetchSimilar, run]);

  return { ref, products, isLoading, error, hasLoaded };
}
