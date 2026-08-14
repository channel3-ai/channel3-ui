import * as React from "react";
import type { Product, SearchFilters } from "@channel3/sdk/resources";

import { useInViewport } from "@/registry/default/hooks/use-in-viewport";
import { useLatestRequest } from "@/registry/default/hooks/use-latest-request";

export interface SimilarFetchInput {
  productId: string;
  limit: number;
  filters?: SearchFilters;
}

/**
 * Fetches products similar to `productId`. Implement on the consumer side so
 * the Channel3 API key stays on your server: call
 * `client.products.findSimilar({ product_id, limit, filters })` and return its
 * `.products`.
 */
export type SimilarFetcher = (input: SimilarFetchInput) => Promise<Product[]>;

export interface UseProductRecommendationsOptions {
  productId: string | undefined;
  fetchSimilar: SimilarFetcher;
  limit?: number;
  filters?: SearchFilters;
  eager?: boolean;
  enabled?: boolean;
}

export interface UseProductRecommendationsResult {
  ref: (node: Element | null) => void;
  products: Product[];
  isLoading: boolean;
  error: unknown;
  hasLoaded: boolean;
}

const EMPTY: Product[] = [];

export function useProductRecommendations({
  productId,
  fetchSimilar,
  limit = 12,
  filters,
  eager = false,
  enabled = true,
}: UseProductRecommendationsOptions): UseProductRecommendationsResult {
  const [products, setProducts] = React.useState<Product[]>(EMPTY);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [inView, setInView] = React.useState(eager);

  const [node, setNode] = React.useState<Element | null>(null);
  const ref = React.useCallback((next: Element | null) => setNode(next), []);

  const { run, cancel } = useLatestRequest();

  React.useEffect(() => {
    cancel();
    setProducts(EMPTY);
    setError(null);
    setHasLoaded(false);
    setInView(eager);
  }, [productId, eager, cancel]);

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
