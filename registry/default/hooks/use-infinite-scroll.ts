import * as React from "react";

import { useInViewport } from "@/registry/default/hooks/use-in-viewport";
import { useLatestRequest } from "@/registry/default/hooks/use-latest-request";

/** A single page produced by a {@link PageFetcher}. */
export interface InfiniteScrollPage<TItem> {
  items: TItem[];
  /** Cursor for the next page, or `null`/`undefined` when exhausted. */
  nextPageToken?: string | null;
}

/**
 * Fetches the page identified by `pageToken`. Implement on the consumer side
 * (e.g. wrap a server-side search/list call) and return the page's items plus
 * its next cursor.
 */
export type PageFetcher<TItem> = (
  pageToken: string,
) => Promise<InfiniteScrollPage<TItem>>;

export interface UseInfiniteScrollOptions<TItem> {
  /** The first page of items (e.g. seeded from an initial search/SSR load). */
  initialItems: TItem[];
  /** Cursor for the page after {@link initialItems}, or `null` when exhausted. */
  initialPageToken?: string | null;
  /** Server-side fetcher for subsequent pages; see {@link PageFetcher}. */
  fetchPage: PageFetcher<TItem>;
  /** Set `false` to suspend pagination (e.g. while a parent view is hidden). Defaults to `true`. */
  enabled?: boolean;
  /** Stable key for an item; when provided, items already seen are skipped across pages. */
  getItemKey?: (item: TItem) => string;
  /** IntersectionObserver root margin for the sentinel. Defaults to `"200px"`. */
  rootMargin?: string;
}

export interface UseInfiniteScrollResult<TItem> {
  /** The seed plus every appended page, in order. */
  items: TItem[];
  /** Whether another page is available. */
  hasMore: boolean;
  /** True while a subsequent page is loading. */
  isLoadingMore: boolean;
  /** The last pagination error, or `null`. */
  error: unknown;
  /** Load the next page (no-op when already loading or exhausted). */
  loadMore: () => void;
  /** Attach to a sentinel element at the end of the list for infinite scroll. */
  sentinelRef: (node: Element | null) => void;
  /** Replace the seed and clear appended pages (e.g. when a new search runs). */
  reset: (seed?: { items: TItem[]; nextPageToken?: string | null }) => void;
}

const EMPTY: unknown[] = [];

/**
 * Headless infinite-scroll pagination over a token-paged list. Seeded with an
 * initial page, it appends subsequent pages via an injected {@link PageFetcher}
 * and exposes a sentinel ref for IntersectionObserver-driven loading. Decoupled
 * from any query/filter concerns so it can paginate search results, a chat
 * agent's first page, recommendations, or any cursor-paged source. Ignores
 * stale in-flight pages after a reset so the latest seed wins.
 */
export function useInfiniteScroll<TItem>({
  initialItems,
  initialPageToken = null,
  fetchPage,
  enabled = true,
  getItemKey,
  rootMargin = "200px",
}: UseInfiniteScrollOptions<TItem>): UseInfiniteScrollResult<TItem> {
  const [seedItems, setSeedItems] = React.useState<TItem[]>(initialItems);
  const [extraItems, setExtraItems] = React.useState<TItem[]>(
    EMPTY as TItem[],
  );
  const [pageToken, setPageToken] = React.useState<string | null>(
    initialPageToken,
  );
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  // Discards a page that's in flight when the seed is swapped, so a late
  // response from a previous seed never lands.
  const { run, cancel } = useLatestRequest();

  // Track the latest token for the imperative loadMore closure.
  const pageTokenRef = React.useRef(pageToken);
  pageTokenRef.current = pageToken;

  // Refs keep `loadMore` stable so the observer isn't recreated each load —
  // re-observing a still-visible sentinel would re-fire and skip pages.
  const isLoadingMoreRef = React.useRef(false);
  const seedItemsRef = React.useRef(seedItems);
  seedItemsRef.current = seedItems;

  // Reset accumulated state when the caller swaps in a new seed.
  React.useEffect(() => {
    cancel();
    isLoadingMoreRef.current = false;
    setSeedItems(initialItems);
    setExtraItems(EMPTY as TItem[]);
    setPageToken(initialPageToken);
    setIsLoadingMore(false);
    setError(null);
  }, [initialItems, initialPageToken, cancel]);

  const reset = React.useCallback(
    (seed?: { items: TItem[]; nextPageToken?: string | null }) => {
      cancel();
      isLoadingMoreRef.current = false;
      setSeedItems(seed?.items ?? (EMPTY as TItem[]));
      setExtraItems(EMPTY as TItem[]);
      setPageToken(seed?.nextPageToken ?? null);
      setIsLoadingMore(false);
      setError(null);
    },
    [cancel],
  );

  const hasMore = enabled && pageToken != null;

  const loadMore = React.useCallback(() => {
    const token = pageTokenRef.current;
    if (!enabled || isLoadingMoreRef.current || token == null) {
      return;
    }
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    run(Promise.resolve(fetchPage(token)), {
      onResolve: (page) => {
        setExtraItems((prev) => {
          if (!getItemKey) {
            return [...prev, ...page.items];
          }
          const seen = new Set<string>();
          for (const item of seedItemsRef.current) {
            seen.add(getItemKey(item));
          }
          for (const item of prev) {
            seen.add(getItemKey(item));
          }
          const next = prev.slice();
          for (const item of page.items) {
            const key = getItemKey(item);
            if (seen.has(key)) {
              continue;
            }
            seen.add(key);
            next.push(item);
          }
          return next;
        });
        setPageToken(page.nextPageToken ?? null);
      },
      onReject: (caught) => setError(caught),
      onSettle: () => {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      },
    });
  }, [enabled, fetchPage, getItemKey, run]);

  const [sentinel, setSentinel] = React.useState<Element | null>(null);
  const sentinelRef = React.useCallback(
    (node: Element | null) => setSentinel(node),
    [],
  );

  useInViewport(sentinel, loadMore, { enabled: hasMore, rootMargin });

  const items = React.useMemo(
    () => (extraItems.length > 0 ? [...seedItems, ...extraItems] : seedItems),
    [seedItems, extraItems],
  );

  return {
    items,
    hasMore,
    isLoadingMore,
    error,
    loadMore,
    sentinelRef,
    reset,
  };
}
