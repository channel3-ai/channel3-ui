import type { PriceStatistics } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/registry/default/lib/format";

type PriceStatus = PriceStatistics["current_status"];

/**
 * Price-quality has no semantic shadcn token (a "good price" isn't
 * `foreground` or `destructive`), so these literal palette colors are
 * intentional and shared by both light and dark themes.
 */
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

/** Keep the boundary labels from spilling past the track's edges. */
const clamp = (value: number) => Math.min(94, Math.max(6, value));

export interface PriceRangeGaugeProps extends React.ComponentProps<"div"> {
  /** Price statistics from `GET /v0/price-tracking/history`. */
  statistics: PriceStatistics;
  /** Override the locale used to format prices. */
  locale?: string;
}

/**
 * Plots the current price against its historical range as three zones — a
 * "lower than usual" green band (below `mean - std_dev`), a "typical" amber
 * band, and a "higher than usual" red band — with a slider-style thumb at the
 * current price and a caption stating its standing. Falls back to a neutral bar
 * when there is no meaningful range.
 */
export function PriceRangeGauge({ statistics, locale, className, ...props }: PriceRangeGaugeProps) {
  const { min_price, max_price, current_price, currency, mean, std_dev, current_status } =
    statistics;

  const hasRange = max_price > min_price;
  const span = Math.max(max_price - min_price, 0.01);
  const pos = (price: number) => Math.min(100, Math.max(0, ((price - min_price) / span) * 100));

  const lowEnd = pos(mean - std_dev);
  const highStart = Math.max(lowEnd, pos(mean + std_dev));
  const marker = pos(current_price);

  return (
    <div data-slot="price-range-gauge" className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">
          {formatCurrency(current_price, currency, locale)}
        </span>
        {hasRange ? (
          <span className={cn("text-xs font-medium", STATUS_TEXT[current_status])}>
            {STATUS_LABEL[current_status]}
          </span>
        ) : null}
      </div>

      <div className="relative h-2.5 w-full">
        <div className="absolute inset-0 overflow-hidden rounded-full bg-muted">
          {hasRange ? (
            <>
              <div
                className={cn("absolute inset-y-0 left-0", ZONE_FILL.low)}
                style={{ width: `${lowEnd}%` }}
              />
              <div
                className={cn("absolute inset-y-0", ZONE_FILL.typical)}
                style={{ left: `${lowEnd}%`, width: `${Math.max(highStart - lowEnd, 0)}%` }}
              />
              <div
                className={cn("absolute inset-y-0 right-0", ZONE_FILL.high)}
                style={{ left: `${highStart}%` }}
              />
            </>
          ) : null}
        </div>

        {hasRange ? (
          <div
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm"
            style={{ left: `${marker}%` }}
            role="presentation"
          />
        ) : null}
      </div>

      {hasRange ? (
        <div className="relative h-4 text-xs text-muted-foreground">
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${clamp(lowEnd)}%` }}
          >
            {formatCurrency(mean - std_dev, currency, locale)}
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${clamp(highStart)}%` }}
          >
            {formatCurrency(mean + std_dev, currency, locale)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
