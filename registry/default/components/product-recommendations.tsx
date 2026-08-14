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
  productId: string | undefined;
  /** Server-side fetcher wrapping `client.products.findSimilar`. */
  fetchSimilar: SimilarFetcher;
  title?: React.ReactNode;
  limit?: number;
  filters?: SearchFilters;
  eager?: boolean;
  enabled?: boolean;
  skeletonCount?: number;
  getHref?: (product: Product) => string;
  onSelect?: (product: Product) => void;
  onPreload?: (product: Product) => void;
  onSelectVariant?: (product: Product, value: OptionValue) => void;
  showSwatches?: boolean;
  locale?: string;
}

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
