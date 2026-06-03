import * as React from "react";
import type { ProductDetail } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ProductCard, ProductCardSkeleton } from "@/registry/default/components/product-card";

type OptionValue = ProductDetail.Variants.Option.Value;

export interface ProductCarouselProps extends Omit<React.ComponentProps<"div">, "onSelect" | "title"> {
  /** Products to render as horizontally scrollable cards. */
  products: ReadonlyArray<ProductDetail>;
  /** Forwarded to each {@link ProductCard}. */
  onSelect?: (product: ProductDetail) => void;
  /** Forwarded to each {@link ProductCard} for color-swatch navigation. */
  onSelectVariant?: (product: ProductDetail, value: OptionValue) => void;
  /** Forwarded to each {@link ProductCard}; show color swatches below the price. */
  showSwatches?: boolean;
  /** Optional heading shown above the row, next to the nav controls. */
  title?: React.ReactNode;
  /** Show skeleton placeholders instead of products. */
  loading?: boolean;
  /** Number of skeletons to render while loading. */
  skeletonCount?: number;
  /** Locale override for price formatting. */
  locale?: string;
}

const ITEM_BASIS = "basis-1/2 sm:basis-1/2 md:basis-1/3 lg:basis-1/4";
const NAV_CLASS = "static size-8 translate-x-0 translate-y-0";
/** Cards visible before scrolling (widest layout), loaded eagerly. */
const PRIORITY_COUNT = 4;

/** Horizontally scrollable row of {@link ProductCard}s (e.g. "More like this"). */
export function ProductCarousel({
  products,
  onSelect,
  onSelectVariant,
  showSwatches = true,
  title,
  loading = false,
  skeletonCount = 8,
  locale,
  className,
  ...props
}: ProductCarouselProps) {
  const isEmpty = !loading && products.length === 0;
  if (isEmpty) {
    return null;
  }

  return (
    <Carousel opts={{ align: "start" }} className={cn("w-full", className)} {...props}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-base font-medium">{title}</div>
        <div className="flex gap-2">
          <CarouselPrevious className={NAV_CLASS} />
          <CarouselNext className={NAV_CLASS} />
        </div>
      </div>
      <CarouselContent>
        {loading
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <CarouselItem key={index} className={ITEM_BASIS}>
                <ProductCardSkeleton />
              </CarouselItem>
            ))
          : products.map((product, index) => (
              <CarouselItem key={product.id} className={ITEM_BASIS}>
                <ProductCard
                  product={product}
                  onSelect={onSelect}
                  onSelectVariant={
                    onSelectVariant ? (value) => onSelectVariant(product, value) : undefined
                  }
                  showSwatches={showSwatches}
                  priority={index < PRIORITY_COUNT}
                  locale={locale}
                />
              </CarouselItem>
            ))}
      </CarouselContent>
    </Carousel>
  );
}
