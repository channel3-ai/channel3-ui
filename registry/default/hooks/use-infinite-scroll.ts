import * as React from "react";

import { useInViewport } from "@/registry/default/hooks/use-in-viewport";
import { useLatestRequest } from "@/registry/default/hooks/use-latest-request";

export interface InfiniteScrollPage<TItem> {
  items: TItem[];
  nextPageToken?: string | null;
}

export type PageFetcher<TItem> = (
  pageToken: string,
) => Promise<InfiniteScrollPage<TItem>>;

export interface UseInfiniteScrollOptions<TItem> {
  initialItems: TItem[];
  initialPageToken?: string | null;
  fetchPage: PageFetcher<TItem>;
  enabled?: boolean;
  /** Stable key for an item; when provided, items already seen are skipped across pages. */
  getItemKey?: (item: TItem) => string;
  rootMargin?: string;
}

export interface UseInfiniteScrollResult<TItem> {
  items: TItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  error: unknown;
  loadMore: () => void;
  sentinelRef: (node: Element | null) => void;
  reset: (seed?: { items: TItem[]; nextPageToken?: string | null }) => void;
}

const EMPTY: unknown[] = [];

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

  const { run, cancel } = useLatestRequest();

  const pageTokenRef = React.useRef(pageToken);
  pageTokenRef.current = pageToken;

  // Keep loadMore stable: re-observing a visible sentinel would skip pages.
  const isLoadingMoreRef = React.useRef(false);
  const seedItemsRef = React.useRef(seedItems);
  seedItemsRef.current = seedItems;

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
