import * as React from "react";
import type { OptionValue, Product } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ProductCard, ProductCardSkeleton } from "@/registry/default/components/product-card";

export interface ProductCarouselProps extends Omit<React.ComponentProps<"div">, "onSelect" | "title"> {
  products: ReadonlyArray<Product>;
  getHref?: (product: Product) => string;
  onSelect?: (product: Product) => void;
  onPreload?: (product: Product) => void;
  onSelectVariant?: (product: Product, value: OptionValue) => void;
  showSwatches?: boolean;
  title?: React.ReactNode;
  loading?: boolean;
  skeletonCount?: number;
  locale?: string;
  itemClassName?: string;
  priorityCount?: number;
}

const ITEM_BASIS = "basis-1/2 sm:basis-1/2 md:basis-1/3 lg:basis-1/4";
const NAV_CLASS = "static size-8 translate-x-0 translate-y-0";

export function ProductCarousel({
  products,
  getHref,
  onSelect,
  onPreload,
  onSelectVariant,
  showSwatches = true,
  title,
  loading = false,
  skeletonCount = 8,
  locale,
  itemClassName = ITEM_BASIS,
  priorityCount = 4,
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
              <CarouselItem key={index} className={itemClassName}>
                <ProductCardSkeleton />
              </CarouselItem>
            ))
          : products.map((product, index) => (
              <CarouselItem key={product.id} className={itemClassName}>
                <ProductCard
                  product={product}
                  href={getHref?.(product)}
                  onSelect={onSelect}
                  onPreload={onPreload}
                  onSelectVariant={
                    onSelectVariant ? (value) => onSelectVariant(product, value) : undefined
                  }
                  showSwatches={showSwatches}
                  priority={index < priorityCount}
                  locale={locale}
                />
              </CarouselItem>
            ))}
      </CarouselContent>
    </Carousel>
  );
}
