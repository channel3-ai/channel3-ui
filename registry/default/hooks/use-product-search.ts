import * as React from "react";
import type { ProductDetail, SearchFilters } from "@channel3/sdk/resources";

import {
  EMPTY_FILTERS,
  type SearchFiltersState,
  toSearchFilters,
} from "@/registry/default/lib/search";

/** Arguments handed to a {@link SearchFetcher}. */
export interface SearchFetchInput {
  /** Free-text query (may be empty when searching by image). */
  query: string;
  /** Image URL to search by, if any. */
  imageUrl?: string;
  /** Base64-encoded image bytes (no data-URI prefix) to search by, if any. */
  base64Image?: string;
  /** Filters built from the UI state via {@link toSearchFilters}. */
  filters: SearchFilters;
  /** Pagination cursor from a previous page, or `undefined` for the first page. */
  pageToken?: string;
}

/** A single page of search results. */
export interface SearchPage {
  products: ProductDetail[];
  /** Cursor for the next page, or `null`/`undefined` when exhausted. */
  nextPageToken?: string | null;
}

/**
 * Runs a product search. Implement on the consumer side so the API key stays on
 * your server: call `client.products.search(...)` (or `searchByImage`) and
 * return this page's products plus its `next_page_token`.
 */
export type SearchFetcher = (input: SearchFetchInput) => Promise<SearchPage>;

/** An image search input, set via {@link UseProductSearchResult.searchByImage}. */
export interface ImageQuery {
  imageUrl?: string;
  base64Image?: string;
  /** Optional label shown in the UI (e.g. file name or "Image"). */
  label?: string;
}

export interface UseProductSearchOptions {
  /** Server-side fetcher; see {@link SearchFetcher}. */
  fetchSearch: SearchFetcher;
  /** Initial query text. */
  initialQuery?: string;
  /** Initial filter state. Defaults to an empty filter set. */
  initialFilters?: SearchFiltersState;
  /** Debounce before auto-searching on query/filter changes, in ms. Defaults to 350. */
  debounceMs?: number;
  /**
   * Search automatically as the query or filters change. When `false`, results
   * only update when {@link UseProductSearchResult.submit} is called. Defaults to `true`.
   */
  autoSearch?: boolean;
  /** Run a search on mount (e.g. to show an initial page). Defaults to `false`. */
  searchOnMount?: boolean;
}

export interface UseProductSearchResult {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFiltersState;
  setFilters: (filters: SearchFiltersState) => void;
  /** Replace the image query (or clear it with `null`). */
  searchByImage: (image: ImageQuery | null) => void;
  /** The active image query, if any. */
  image: ImageQuery | null;
  /** Products for the current query/filters across all loaded pages. */
  results: ProductDetail[];
  /** True while the first page is loading (results are being replaced). */
  isLoading: boolean;
  /** True while a subsequent page is loading (results are being appended). */
  isLoadingMore: boolean;
  /** The last search error, or `null`. */
  error: unknown;
  /** Whether another page is available. */
  hasMore: boolean;
  /** Load the next page (no-op when already loading or exhausted). */
  loadMore: () => void;
  /** Attach to a sentinel element at the end of the list for infinite scroll. */
  sentinelRef: (node: Element | null) => void;
  /** Force a search now with the current query/filters (used when `autoSearch` is off). */
  submit: () => void;
  /** Clear the query, image, filters, and results. */
  reset: () => void;
}

const EMPTY: ProductDetail[] = [];

function hasCriteria(query: string, image: ImageQuery | null): boolean {
  return query.trim().length > 0 || image != null;
}

/**
 * Orchestrates product search: query + filter state, debounced auto-search,
 * infinite-scroll pagination via an injected fetcher, and a sentinel ref. Keeps
 * the API key server-side and ignores stale responses so the latest search wins.
 */
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

  const [results, setResults] = React.useState<ProductDetail[]>(EMPTY);
  const [pageToken, setPageToken] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  // A monotonically increasing token identifying the current search criteria.
  // Page loads carry the token they belong to so stale pages are discarded.
  const searchId = React.useRef(0);
  // Bumped to (re)trigger a search; lets `submit` re-run identical criteria.
  const [submitNonce, setSubmitNonce] = React.useState(0);

  // Latest values for the imperative loadMore closure.
  const queryRef = React.useRef(query);
  const filtersRef = React.useRef(filters);
  const imageRef = React.useRef(image);
  queryRef.current = query;
  filtersRef.current = filters;
  imageRef.current = image;

  const runFirstPage = React.useCallback(() => {
    const q = queryRef.current;
    const img = imageRef.current;
    if (!hasCriteria(q, img)) {
      searchId.current++;
      setResults(EMPTY);
      setPageToken(null);
      setHasMore(false);
      setIsLoading(false);
      setError(null);
      return;
    }
    const id = ++searchId.current;
    setIsLoading(true);
    setError(null);
    void Promise.resolve(
      fetchSearch({
        query: q,
        imageUrl: img?.imageUrl,
        base64Image: img?.base64Image,
        filters: toSearchFilters(filtersRef.current),
      }),
    )
      .then((page) => {
        if (id !== searchId.current) {
          return;
        }
        setResults(page.products);
        setPageToken(page.nextPageToken ?? null);
        setHasMore(Boolean(page.nextPageToken));
      })
      .catch((caught: unknown) => {
        if (id !== searchId.current) {
          return;
        }
        setError(caught);
        setResults(EMPTY);
        setHasMore(false);
      })
      .finally(() => {
        if (id === searchId.current) {
          setIsLoading(false);
        }
      });
  }, [fetchSearch]);

  const setQuery = React.useCallback((next: string) => setQueryState(next), []);
  const setFilters = React.useCallback((next: SearchFiltersState) => setFiltersState(next), []);
  const searchByImage = React.useCallback((next: ImageQuery | null) => setImage(next), []);
  const submit = React.useCallback(() => setSubmitNonce((value) => value + 1), []);

  const mounted = React.useRef(false);

  // Auto-search (debounced) when criteria change, and on explicit submit.
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

  const loadMore = React.useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || !pageToken) {
      return;
    }
    const id = searchId.current;
    setIsLoadingMore(true);
    void Promise.resolve(
      fetchSearch({
        query: queryRef.current,
        imageUrl: imageRef.current?.imageUrl,
        base64Image: imageRef.current?.base64Image,
        filters: toSearchFilters(filtersRef.current),
        pageToken,
      }),
    )
      .then((page) => {
        if (id !== searchId.current) {
          return;
        }
        setResults((prev) => [...prev, ...page.products]);
        setPageToken(page.nextPageToken ?? null);
        setHasMore(Boolean(page.nextPageToken));
      })
      .catch((caught: unknown) => {
        if (id !== searchId.current) {
          return;
        }
        setError(caught);
      })
      .finally(() => {
        if (id === searchId.current) {
          setIsLoadingMore(false);
        }
      });
  }, [fetchSearch, hasMore, isLoading, isLoadingMore, pageToken]);

  const [sentinel, setSentinel] = React.useState<Element | null>(null);
  const sentinelRef = React.useCallback((node: Element | null) => setSentinel(node), []);

  React.useEffect(() => {
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasMore, loadMore]);

  const reset = React.useCallback(() => {
    searchId.current++;
    setQueryState("");
    setFiltersState(EMPTY_FILTERS);
    setImage(null);
    setResults(EMPTY);
    setPageToken(null);
    setHasMore(false);
    setError(null);
    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    searchByImage,
    image,
    results,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    sentinelRef,
    submit,
    reset,
  };
}
