import * as React from "react";
import { Star } from "lucide-react";
import type { ProductRatings } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";

const MAX_RATING = 5;
const STARS = Array.from({ length: MAX_RATING }, (_, index) => index);

export interface ProductRatingProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The product's `ratings` rollup. Renders nothing when null or without reviews. */
  ratings: ProductRatings | null | undefined;
  /** `sm` suits cards — "4.6 ★ (5K)"; `default` spells the count out — "(5K reviews)". */
  size?: "sm" | "default";
  locale?: string;
}

export function ProductRating({
  ratings,
  size = "default",
  locale,
  className,
  ...props
}: ProductRatingProps) {
  if (!ratings || ratings.count <= 0) {
    return null;
  }

  const value = Math.min(Math.max(ratings.value, 0), MAX_RATING);
  const valueLabel = formatNumber(value, locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const compactCount = formatNumber(ratings.count, locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const noun = ratings.count === 1 ? "review" : "reviews";
  const starClass = cn("shrink-0", size === "sm" ? "size-3" : "size-4");

  return (
    <div
      data-slot="product-rating"
      role="img"
      aria-label={`Rated ${valueLabel} out of ${MAX_RATING}, ${formatNumber(ratings.count, locale)} ${noun}`}
      className={cn(
        "flex items-center gap-1 text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
      {...props}
    >
      <span aria-hidden>{valueLabel}</span>
      {/* Gold stars clipped over muted ones, so the fill tracks the exact value. */}
      <span aria-hidden className="relative inline-flex">
        <span className="inline-flex text-muted-foreground/30">
          {STARS.map((star) => (
            <Star key={star} className={starClass} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <span
          data-slot="product-rating-fill"
          className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-amber-400"
          style={{ width: `${(value / MAX_RATING) * 100}%` }}
        >
          {STARS.map((star) => (
            <Star key={star} className={starClass} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
      </span>
      <span aria-hidden>{size === "sm" ? `(${compactCount})` : `(${compactCount} ${noun})`}</span>
    </div>
  );
}

function formatNumber(value: number, locale?: string, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}
