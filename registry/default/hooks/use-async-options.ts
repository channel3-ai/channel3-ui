import * as React from "react";

/** Loads option suggestions for a free-text query (e.g. brand/category search). */
export type OptionFetcher<T> = (query: string) => Promise<T[]>;

export interface UseAsyncOptionsOptions<T> {
  /** Server-side fetcher returning options for a query. */
  fetch: OptionFetcher<T>;
  /** Debounce before firing a fetch, in ms. Defaults to 250. */
  debounceMs?: number;
  /** Minimum query length before fetching. Defaults to 1. */
  minLength?: number;
}

export interface UseAsyncOptionsResult<T> {
  /** Current query text. */
  query: string;
  /** Update the query; schedules a debounced fetch. */
  setQuery: (query: string) => void;
  /** Latest options for the query (empty before the first resolve). */
  options: T[];
  /** True while a fetch is in flight. */
  isLoading: boolean;
  /** The last fetch error, or `null`. */
  error: unknown;
}

/**
 * Debounced typeahead loader. Keeps the API key on your server by delegating to
 * an injected `fetch` (e.g. `client.brands.search` / `client.categories.search`
 * behind a route). Ignores stale responses so the latest query always wins.
 */
export function useAsyncOptions<T>({
  fetch,
  debounceMs = 250,
  minLength = 1,
}: UseAsyncOptionsOptions<T>): UseAsyncOptionsResult<T> {
  const [query, setQueryState] = React.useState("");
  const [options, setOptions] = React.useState<T[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const requestId = React.useRef(0);

  const setQuery = React.useCallback((next: string) => setQueryState(next), []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      setOptions([]);
      setIsLoading(false);
      requestId.current++;
      return;
    }

    setIsLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void Promise.resolve(fetch(trimmed))
        .then((result) => {
          if (id !== requestId.current) {
            return;
          }
          setOptions(result);
          setError(null);
        })
        .catch((caught: unknown) => {
          if (id !== requestId.current) {
            return;
          }
          setError(caught);
          setOptions([]);
        })
        .finally(() => {
          if (id === requestId.current) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, fetch, debounceMs, minLength]);

  return { query, setQuery, options, isLoading, error };
}
