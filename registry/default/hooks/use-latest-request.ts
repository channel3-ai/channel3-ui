import * as React from "react";

export interface LatestRequestHandlers<T> {
  onResolve: (value: T) => void;
  onReject?: (error: unknown) => void;
  onSettle?: () => void;
}

export interface UseLatestRequestResult {
  run: <T>(promise: Promise<T>, handlers: LatestRequestHandlers<T>) => void;
  cancel: () => void;
}

/**
 * Latest-wins guard for overlapping async work. Each {@link UseLatestRequestResult.run}
 * claims a monotonically increasing ticket; a request's handlers only fire while
 * its ticket is still current, so a stale response from a superseded request is
 * dropped. Centralizes the cancellation bookkeeping that search, pagination,
 * typeahead, recommendations, and variant resolution all depend on.
 */
export function useLatestRequest(): UseLatestRequestResult {
  const ticket = React.useRef(0);

  const run = React.useCallback(
    <T,>(promise: Promise<T>, handlers: LatestRequestHandlers<T>) => {
      const current = ++ticket.current;
      void promise
        .then((value) => {
          if (current === ticket.current) {
            handlers.onResolve(value);
          }
        })
        .catch((error: unknown) => {
          if (current === ticket.current) {
            handlers.onReject?.(error);
          }
        })
        .finally(() => {
          if (current === ticket.current) {
            handlers.onSettle?.();
          }
        });
    },
    [],
  );

  const cancel = React.useCallback(() => {
    ticket.current++;
  }, []);

  return { run, cancel };
}
