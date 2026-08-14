import * as React from "react";
import { useQuery } from "@tanstack/react-query";

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

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function useAsyncOptions<T>({
  fetch,
  debounceMs = 250,
  minLength = 1,
}: UseAsyncOptionsOptions<T>): UseAsyncOptionsResult<T> {
  const [query, setQueryState] = React.useState("");
  const scope = React.useId();
  const debounced = useDebouncedValue(query.trim(), debounceMs);
  const enabled = debounced.length >= minLength;

  const result = useQuery({
    queryKey: ["channel3-async-options", scope, debounced],
    queryFn: () => fetch(debounced),
    enabled,
  });

  const setQuery = React.useCallback((next: string) => setQueryState(next), []);

  return {
    query,
    setQuery,
    options: enabled ? (result.data ?? []) : [],
    isLoading: result.isFetching,
    error: result.error,
  };
}
