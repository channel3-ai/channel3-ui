import type { PriceStatistics } from "@channel3/sdk/resources";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/registry/default/lib/format";

type PriceStatus = PriceStatistics["current_status"];

const ZONE_FILL: Record<PriceStatus, string> = {
  low: "bg-emerald-500/70",
  typical: "bg-amber-500/70",
  high: "bg-red-500/70",
};

const STATUS_LABEL: Record<PriceStatus, string> = {
  low: "Lower than usual",
  typical: "Typical price",
  high: "Higher than usual",
};

const STATUS_TEXT: Record<PriceStatus, string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  typical: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

// Track spans mean ± WINDOW·σ; band edges derive from the same mapping as the thumb.
const WINDOW = 2;

export interface PriceRangeGaugeProps extends React.ComponentProps<"div"> {
  statistics: PriceStatistics;
  locale?: string;
}

export function PriceRangeGauge({ statistics, locale, className, ...props }: PriceRangeGaugeProps) {
  const { min_price, max_price, current_price, currency, mean, std_dev, current_status } =
    statistics;

  const hasRange = max_price > min_price && std_dev > 0;
  const lowBound = mean - std_dev;
  const highBound = mean + std_dev;

  const pos = (price: number) => {
    const fromCenter = (price - mean) / std_dev / WINDOW;
    return Math.min(100, Math.max(0, (fromCenter + 1) * 50));
  };

  // Stable prices keep the same three-zone layout with a centered marker.
  const greenEnd = hasRange ? pos(lowBound) : 25;
  const yellowEnd = hasRange ? pos(highBound) : 75;
  const marker = hasRange ? pos(current_price) : 50;

  return (
    <div data-slot="price-range-gauge" className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">
          {formatCurrency(current_price, currency, locale)}
        </span>
        <span
          className={cn(
            "text-xs font-medium",
            hasRange ? STATUS_TEXT[current_status] : "text-muted-foreground",
          )}
        >
          {hasRange ? STATUS_LABEL[current_status] : "Stable price"}
        </span>
      </div>

      <div className="relative h-2.5 w-full">
        <div className="absolute inset-0 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("absolute inset-y-0 left-0", ZONE_FILL.low)}
            style={{ width: `${greenEnd}%` }}
          />
          <div
            className={cn("absolute inset-y-0", ZONE_FILL.typical)}
            style={{
              left: `${greenEnd}%`,
              width: `${yellowEnd - greenEnd}%`,
            }}
          />
          <div
            className={cn("absolute inset-y-0 right-0", ZONE_FILL.high)}
            style={{ left: `${yellowEnd}%` }}
          />
        </div>

        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm"
          style={{ left: `${marker}%` }}
          role="presentation"
        />
      </div>

      {hasRange ? (
        <div className="relative h-4 text-xs text-muted-foreground">
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${greenEnd}%` }}
          >
            {formatCurrency(lowBound, currency, locale)}
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${yellowEnd}%` }}
          >
            {formatCurrency(highBound, currency, locale)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
