import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product, SearchFilters } from "@channel3/sdk/resources";

import { useInViewport } from "@/registry/default/hooks/use-in-viewport";

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
  const [inView, setInView] = React.useState(eager);
  const [node, setNode] = React.useState<Element | null>(null);
  const ref = React.useCallback((next: Element | null) => setNode(next), []);

  React.useEffect(() => {
    setInView(eager);
  }, [productId, eager]);

  useInViewport(node, () => setInView(true), { enabled: !eager && !inView, once: true });

  const query = useQuery({
    queryKey: ["channel3-similar", productId, limit, filters],
    queryFn: () => fetchSimilar({ productId: productId!, limit, filters }),
    enabled: Boolean(enabled && inView && productId),
  });

  return {
    ref,
    products: query.data ?? EMPTY,
    isLoading: query.isFetching,
    error: query.error,
    hasLoaded: query.isSuccess,
  };
}
