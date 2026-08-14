import * as React from "react";

import { useLatestRequest } from "@/registry/default/hooks/use-latest-request";

export type OptionFetcher<T> = (query: string) => Promise<T[]>;

export interface UseAsyncOptionsOptions<T> {
  fetch: OptionFetcher<T>;
  debounceMs?: number;
  minLength?: number;
}

export interface UseAsyncOptionsResult<T> {
  query: string;
  setQuery: (query: string) => void;
  options: T[];
  isLoading: boolean;
  error: unknown;
}

export function useAsyncOptions<T>({
  fetch,
  debounceMs = 250,
  minLength = 1,
}: UseAsyncOptionsOptions<T>): UseAsyncOptionsResult<T> {
  const [query, setQueryState] = React.useState("");
  const [options, setOptions] = React.useState<T[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const { run, cancel } = useLatestRequest();

  const setQuery = React.useCallback((next: string) => setQueryState(next), []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      setOptions([]);
      setIsLoading(false);
      cancel();
      return;
    }

    setIsLoading(true);
    // Discard any in-flight fetch from a previous query immediately, so a slow
    // response can't land after the query has already moved on.
    cancel();
    const timer = setTimeout(() => {
      run(Promise.resolve(fetch(trimmed)), {
        onResolve: (result) => {
          setOptions(result);
          setError(null);
        },
        onReject: (caught) => {
          setError(caught);
          setOptions([]);
        },
        onSettle: () => setIsLoading(false),
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, fetch, debounceMs, minLength, run, cancel]);

  return { query, setQuery, options, isLoading, error };
}
