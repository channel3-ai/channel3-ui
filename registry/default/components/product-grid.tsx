import * as React from "react";
import type { ProductDetail } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ProductCard, ProductCardSkeleton } from "@/registry/default/components/product-card";

type OptionValue = ProductDetail.Variants.Option.Value;

export interface ProductGridProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  /** Products to render, typically a page of search results. */
  products: ReadonlyArray<ProductDetail>;
  /** Forwarded to each {@link ProductCard}. */
  onSelect?: (product: ProductDetail) => void;
  /** Forwarded to each {@link ProductCard} for color-swatch navigation. */
  onSelectVariant?: (product: ProductDetail, value: OptionValue) => void;
  /** Forwarded to each {@link ProductCard}; show color swatches below the price. */
  showSwatches?: boolean;
  /** Show skeleton placeholders instead of products. */
  loading?: boolean;
  /** Number of skeletons to render while loading. */
  skeletonCount?: number;
  /** Custom node rendered when there are no products and not loading. */
  emptyState?: React.ReactNode;
  /** Locale override for price formatting. */
  locale?: string;
}

/** First row of cards (widest layout) loaded eagerly as likely-LCP imagery. */
const PRIORITY_COUNT = 4;

/** Responsive grid of {@link ProductCard}s with loading and empty states. */
export function ProductGrid({
  products,
  onSelect,
  onSelectVariant,
  showSwatches = true,
  loading = false,
  skeletonCount = 8,
  emptyState,
  locale,
  className,
  ...props
}: ProductGridProps) {
  const gridClass = cn(
    "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
    className,
  );

  if (loading) {
    return (
      <div data-slot="product-grid" className={gridClass} {...props}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div data-slot="product-grid" {...props}>
        {emptyState ?? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No products found</EmptyTitle>
              <EmptyDescription>Try a different search or adjust your filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    );
  }

  return (
    <div data-slot="product-grid" className={gridClass} {...props}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelect}
          onSelectVariant={onSelectVariant ? (value) => onSelectVariant(product, value) : undefined}
          showSwatches={showSwatches}
          priority={index < PRIORITY_COUNT}
          locale={locale}
        />
      ))}
    </div>
  );
}
