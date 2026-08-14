import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Product, SearchFilters } from "@channel3/sdk/resources";

import {
  EMPTY_FILTERS,
  type SearchFiltersState,
  toSearchFilters,
} from "@/registry/default/lib/search";
import { useInViewport } from "@/registry/default/hooks/use-in-viewport";

export interface SearchFetchInput {
  query: string;
  imageUrl?: string;
  /** Base64-encoded image bytes (no data-URI prefix) to search by, if any. */
  base64Image?: string;
  filters: SearchFilters;
  pageToken?: string;
}

export interface SearchPage {
  products: Product[];
  nextPageToken?: string | null;
}

/**
 * Runs a product search. Implement on the consumer side so the API key stays on
 * your server: call `client.products.search(...)` (or `searchByImage`) and
 * return this page's products plus its `next_page_token`.
 */
export type SearchFetcher = (input: SearchFetchInput) => Promise<SearchPage>;

export interface ImageQuery {
  imageUrl?: string;
  base64Image?: string;
  label?: string;
}

export interface UseProductSearchOptions {
  fetchSearch: SearchFetcher;
  initialQuery?: string;
  initialFilters?: SearchFiltersState;
  debounceMs?: number;
  /**
   * Search automatically as the query or filters change. When `false`, results
   * only update when {@link UseProductSearchResult.submit} is called. Defaults to `true`.
   */
  autoSearch?: boolean;
  searchOnMount?: boolean;
}

export interface UseProductSearchResult {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFiltersState;
  setFilters: (filters: SearchFiltersState) => void;
  searchByImage: (image: ImageQuery | null) => void;
  image: ImageQuery | null;
  results: Product[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: unknown;
  hasMore: boolean;
  loadMore: () => void;
  sentinelRef: (node: Element | null) => void;
  submit: () => void;
  reset: () => void;
}

const EMPTY: Product[] = [];

interface SearchCriteria {
  query: string;
  filters: SearchFiltersState;
  image: ImageQuery | null;
}

function hasCriteria(query: string, image: ImageQuery | null): boolean {
  return query.trim().length > 0 || image != null;
}

export function useProductSearch({
  fetchSearch,
  initialQuery = "",
  initialFilters = EMPTY_FILTERS,
  debounceMs = 350,
  autoSearch = true,
  searchOnMount = false,
}: UseProductSearchOptions): UseProductSearchResult {
  const [query, setQueryState] = React.useState(initialQuery);
  const [filters, setFiltersState] = React.useState<SearchFiltersState>(initialFilters);
  const [image, setImage] = React.useState<ImageQuery | null>(null);
  const [submitNonce, setSubmitNonce] = React.useState(0);
  const [active, setActive] = React.useState<SearchCriteria | null>(null);

  const skipFirst = React.useRef(!searchOnMount);

  React.useEffect(() => {
    if (skipFirst.current && submitNonce === 0) {
      skipFirst.current = false;
      return;
    }
    if (!autoSearch && submitNonce === 0) {
      return;
    }
    const timer = setTimeout(() => {
      setActive({ query, filters, image });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, filters, image, submitNonce, autoSearch, debounceMs]);

  const enabled = active != null && hasCriteria(active.query, active.image);

  const infinite = useInfiniteQuery({
    queryKey: [
      "channel3-product-search",
      active?.query ?? "",
      active ? toSearchFilters(active.filters) : {},
      active?.image?.imageUrl ?? null,
      active?.image?.base64Image ?? null,
    ],
    queryFn: ({ pageParam }) =>
      fetchSearch({
        query: active!.query,
        imageUrl: active!.image?.imageUrl,
        base64Image: active!.image?.base64Image,
        filters: toSearchFilters(active!.filters),
        pageToken: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    enabled,
  });

  const setQuery = React.useCallback((next: string) => setQueryState(next), []);
  const setFilters = React.useCallback((next: SearchFiltersState) => setFiltersState(next), []);
  const searchByImage = React.useCallback((next: ImageQuery | null) => setImage(next), []);
  const submit = React.useCallback(() => setSubmitNonce((value) => value + 1), []);

  const reset = React.useCallback(() => {
    setQueryState("");
    setFiltersState(EMPTY_FILTERS);
    setImage(null);
    setSubmitNonce(0);
    setActive(null);
  }, []);

  const loadMore = () => {
    if (!infinite.hasNextPage || infinite.isFetchingNextPage) {
      return;
    }
    void infinite.fetchNextPage();
  };

  const [sentinel, setSentinel] = React.useState<Element | null>(null);
  const sentinelRef = React.useCallback((node: Element | null) => setSentinel(node), []);
  useInViewport(sentinel, loadMore, { enabled: Boolean(infinite.hasNextPage), rootMargin: "200px" });

  return {
    query,
    setQuery,
    filters,
    setFilters,
    searchByImage,
    image,
    results: enabled ? (infinite.data?.pages.flatMap((page) => page.products) ?? EMPTY) : EMPTY,
    isLoading: infinite.isFetching && !infinite.isFetchingNextPage,
    isLoadingMore: infinite.isFetchingNextPage,
    error: infinite.error,
    hasMore: Boolean(infinite.hasNextPage),
    loadMore,
    sentinelRef,
    submit,
    reset,
  };
}
