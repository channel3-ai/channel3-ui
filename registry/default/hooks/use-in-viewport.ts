import * as React from "react";

export interface UseInViewportOptions {
  /** Skip observing while `false` (e.g. nothing left to load, or pre-resolved). Defaults to `true`. */
  enabled?: boolean;
  /** IntersectionObserver root margin (e.g. `"200px"` to fire ahead of the edge). */
  rootMargin?: string;
  /** Stop observing after the first intersection. Defaults to `false` (fires on each entry). */
  once?: boolean;
}

/**
 * Fires `onIntersect` whenever `node` enters the viewport. The callback is held
 * in a ref so changing it never re-subscribes the observer. Use `once` for a
 * one-shot trigger (lazy sections) and leave it off to fire repeatedly (an
 * infinite-scroll sentinel). No-ops where `IntersectionObserver` is unavailable.
 */
export function useInViewport(
  node: Element | null,
  onIntersect: () => void,
  { enabled = true, rootMargin, once = false }: UseInViewportOptions = {},
): void {
  const onIntersectRef = React.useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  React.useEffect(() => {
    if (!enabled || !node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersectRef.current();
          if (once) {
            observer.disconnect();
          }
        }
      },
      rootMargin ? { rootMargin } : undefined,
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, enabled, rootMargin, once]);
}
