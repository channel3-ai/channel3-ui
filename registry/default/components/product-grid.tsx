import * as React from "react";
import type { OptionValue, Product } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ProductCard, ProductCardSkeleton } from "@/registry/default/components/product-card";

export interface ProductGridProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  products: ReadonlyArray<Product>;
  getHref?: (product: Product) => string;
  onSelect?: (product: Product) => void;
  onPreload?: (product: Product) => void;
  onSelectVariant?: (product: Product, value: OptionValue) => void;
  showSwatches?: boolean;
  loading?: boolean;
  skeletonCount?: number;
  emptyState?: React.ReactNode;
  locale?: string;
}

const PRIORITY_COUNT = 4;

export function ProductGrid({
  products,
  getHref,
  onSelect,
  onPreload,
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
          href={getHref?.(product)}
          onSelect={onSelect}
          onPreload={onPreload}
          onSelectVariant={onSelectVariant ? (value) => onSelectVariant(product, value) : undefined}
          showSwatches={showSwatches}
          priority={index < PRIORITY_COUNT}
          locale={locale}
        />
      ))}
    </div>
  );
}
