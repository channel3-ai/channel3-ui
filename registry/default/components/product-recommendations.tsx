import * as React from "react";
import type { OptionValue, Product, SearchFilters } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { ProductCarousel } from "@/registry/default/components/product-carousel";
import {
  type SimilarFetcher,
  useProductRecommendations,
} from "@/registry/default/hooks/use-product-recommendations";

export interface ProductRecommendationsProps
  extends Omit<React.ComponentProps<"section">, "onSelect" | "title"> {
  /** Canonical id of the product on the page (the PDP's `product.id`). */
  productId: string | undefined;
  /** Server-side fetcher wrapping `client.products.findSimilar`. */
  fetchSimilar: SimilarFetcher;
  /** Heading above the row. Defaults to "You might also like". */
  title?: React.ReactNode;
  /** Max recommendations to request. Defaults to 12. */
  limit?: number;
  /** Optional filters forwarded to the fetcher (e.g. same gender/brand). */
  filters?: SearchFilters;
  /** Fetch on mount instead of when the section scrolls into view. */
  eager?: boolean;
  /** Suspend fetching entirely (e.g. a feature flag). Defaults to `true`. */
  enabled?: boolean;
  /** Number of skeleton cards shown while loading. Defaults to 6. */
  skeletonCount?: number;
  /** Per-product destination URL; makes each card a crawlable `<a href>`. */
  getHref?: (product: Product) => string;
  /** Forwarded to each card. */
  onSelect?: (product: Product) => void;
  /** Forwarded to each card; prefetch hook on hover/focus/touch. */
  onPreload?: (product: Product) => void;
  /** Forwarded to each card for color-swatch navigation. */
  onSelectVariant?: (product: Product, value: OptionValue) => void;
  /** Show color swatches below the price on each card. */
  showSwatches?: boolean;
  /** Locale override for price formatting. */
  locale?: string;
}

/**
 * Lazy "you might also like" carousel for a PDP. Defers the `findSimilar` fetch
 * until the section scrolls into view (so it never blocks the page), shows a
 * skeleton row while loading, and renders nothing once it's known there are no
 * recommendations. Reuses {@link ProductCarousel} for the row itself.
 */
export function ProductRecommendations({
  productId,
  fetchSimilar,
  title = "You might also like",
  limit = 12,
  filters,
  eager = false,
  enabled = true,
  skeletonCount = 6,
  getHref,
  onSelect,
  onPreload,
  onSelectVariant,
  showSwatches,
  locale,
  className,
  ...props
}: ProductRecommendationsProps) {
  const { ref, products, isLoading, hasLoaded } = useProductRecommendations({
    productId,
    fetchSimilar,
    limit,
    filters,
    eager,
    enabled,
  });

  // Once loaded with nothing to show, collapse entirely.
  if (hasLoaded && products.length === 0) {
    return null;
  }

  return (
    <section ref={ref} data-slot="product-recommendations" className={cn("w-full", className)} {...props}>
      <ProductCarousel
        title={title}
        products={products}
        loading={isLoading && products.length === 0}
        skeletonCount={skeletonCount}
        getHref={getHref}
        onSelect={onSelect}
        onPreload={onPreload}
        onSelectVariant={onSelectVariant}
        showSwatches={showSwatches}
        locale={locale}
      />
    </section>
  );
}
