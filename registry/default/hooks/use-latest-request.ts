import * as React from "react";

/** Outcome callbacks for a request tracked by {@link useLatestRequest}. */
export interface LatestRequestHandlers<T> {
  /** Called with the result when this request is still the latest. */
  onResolve: (value: T) => void;
  /** Called with the rejection when this request is still the latest. */
  onReject?: (error: unknown) => void;
  /** Called after settle (success or failure) when this request is still the latest. */
  onSettle?: () => void;
}

export interface UseLatestRequestResult {
  /**
   * Track `promise` as the latest request. Earlier in-flight requests are
   * superseded: their handlers no longer fire once a newer `run`/`cancel`
   * happens, so the most recent request always wins.
   */
  run: <T>(promise: Promise<T>, handlers: LatestRequestHandlers<T>) => void;
  /**
   * Invalidate any in-flight request without starting a new one (e.g. when the
   * inputs change or the consumer resets), so a late response is discarded.
   */
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
