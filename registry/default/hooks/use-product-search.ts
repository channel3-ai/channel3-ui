import * as React from "react";
import type { Product, SearchFilters } from "@channel3/sdk/resources";

import {
  EMPTY_FILTERS,
  type SearchFiltersState,
  toSearchFilters,
} from "@/registry/default/lib/search";
import {
  type PageFetcher,
  useInfiniteScroll,
} from "@/registry/default/hooks/use-infinite-scroll";
import { useLatestRequest } from "@/registry/default/hooks/use-latest-request";

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

  const [isLoading, setIsLoading] = React.useState(false);
  const [firstPageError, setFirstPageError] = React.useState<unknown>(null);

  const { run: runFirstPageRequest, cancel: cancelFirstPage } = useLatestRequest();
  const [submitNonce, setSubmitNonce] = React.useState(0);

  const queryRef = React.useRef(query);
  const filtersRef = React.useRef(filters);
  const imageRef = React.useRef(image);
  queryRef.current = query;
  filtersRef.current = filters;
  imageRef.current = image;

  const fetchPage = React.useCallback<PageFetcher<Product>>(
    (pageToken) =>
      Promise.resolve(
        fetchSearch({
          query: queryRef.current,
          imageUrl: imageRef.current?.imageUrl,
          base64Image: imageRef.current?.base64Image,
          filters: toSearchFilters(filtersRef.current),
          pageToken,
        }),
      ).then((page) => ({
        items: page.products,
        nextPageToken: page.nextPageToken,
      })),
    [fetchSearch],
  );

  const { reset: resetPages, ...infinite } = useInfiniteScroll<Product>({
    initialItems: EMPTY,
    initialPageToken: null,
    fetchPage,
  });

  const runFirstPage = React.useCallback(() => {
    const q = queryRef.current;
    const img = imageRef.current;
    if (!hasCriteria(q, img)) {
      cancelFirstPage();
      resetPages();
      setIsLoading(false);
      setFirstPageError(null);
      return;
    }
    setIsLoading(true);
    setFirstPageError(null);
    runFirstPageRequest(
      Promise.resolve(
        fetchSearch({
          query: q,
          imageUrl: img?.imageUrl,
          base64Image: img?.base64Image,
          filters: toSearchFilters(filtersRef.current),
        }),
      ),
      {
        onResolve: (page) =>
          resetPages({ items: page.products, nextPageToken: page.nextPageToken }),
        onReject: (caught) => {
          setFirstPageError(caught);
          resetPages();
        },
        onSettle: () => setIsLoading(false),
      },
    );
  }, [fetchSearch, resetPages, runFirstPageRequest, cancelFirstPage]);

  const setQuery = React.useCallback((next: string) => setQueryState(next), []);
  const setFilters = React.useCallback((next: SearchFiltersState) => setFiltersState(next), []);
  const searchByImage = React.useCallback((next: ImageQuery | null) => setImage(next), []);
  const submit = React.useCallback(() => setSubmitNonce((value) => value + 1), []);

  const mounted = React.useRef(false);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (!searchOnMount && submitNonce === 0) {
        return;
      }
    }
    if (!autoSearch && submitNonce === 0) {
      return;
    }
    const timer = setTimeout(runFirstPage, debounceMs);
    return () => clearTimeout(timer);
  }, [query, filters, image, submitNonce, autoSearch, debounceMs, runFirstPage, searchOnMount]);

  const reset = React.useCallback(() => {
    cancelFirstPage();
    setQueryState("");
    setFiltersState(EMPTY_FILTERS);
    setImage(null);
    resetPages();
    setFirstPageError(null);
    setIsLoading(false);
  }, [resetPages, cancelFirstPage]);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    searchByImage,
    image,
    results: infinite.items,
    isLoading,
    isLoadingMore: infinite.isLoadingMore,
    error: firstPageError ?? infinite.error,
    hasMore: infinite.hasMore,
    loadMore: infinite.loadMore,
    sentinelRef: infinite.sentinelRef,
    submit,
    reset,
  };
}
