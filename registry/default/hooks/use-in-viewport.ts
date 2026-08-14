import * as React from "react";

export interface UseInViewportOptions {
  enabled?: boolean;
  rootMargin?: string;
  once?: boolean;
}

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
