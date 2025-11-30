"use client";

import { cn } from "@/lib/utils";

export type PriceStatus = "low" | "typical" | "high";

export type PriceRangeGaugeProps = {
  /** The current price to display on the gauge */
  currentPrice: number;
  /** The minimum price in the range */
  minPrice: number;
  /** The maximum price in the range */
  maxPrice: number;
  /** Price threshold below which is considered "low" (green zone ends here) */
  lowThreshold: number;
  /** Price threshold above which is considered "high" (red zone starts here) */
  highThreshold: number;
  /** Currency code for formatting (default: "USD") */
  currency?: string;
  /** Custom formatter for price values */
  formatValue?: (value: number, currency: string) => string;
  /** Additional CSS classes */
  className?: string;
};

function defaultFormatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export function PriceRangeGauge({
  currentPrice,
  minPrice,
  maxPrice,
  lowThreshold,
  highThreshold,
  currency = "USD",
  formatValue,
  className,
}: PriceRangeGaugeProps) {
  const format = formatValue ?? defaultFormatCurrency;
  
  // Calculate the position of the current price marker (0-100%)
  const range = maxPrice - minPrice;
  const markerPosition = range > 0 
    ? Math.max(0, Math.min(100, ((currentPrice - minPrice) / range) * 100))
    : 50;

  // Calculate the positions for the color zone boundaries
  const lowZoneEnd = range > 0 
    ? ((lowThreshold - minPrice) / range) * 100 
    : 33;
  const highZoneStart = range > 0 
    ? ((highThreshold - minPrice) / range) * 100 
    : 66;

  // Determine the status based on current price
  const status: PriceStatus = currentPrice <= lowThreshold 
    ? "low" 
    : currentPrice >= highThreshold 
      ? "high" 
      : "typical";

  const statusConfig = {
    low: { label: "is low", bgColor: "bg-blue-100", textColor: "text-blue-700" },
    typical: { label: "is typical", bgColor: "bg-blue-100", textColor: "text-blue-700" },
    high: { label: "is high", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  };

  const { label, bgColor, textColor } = statusConfig[status];

  return (
    <div className={cn("w-full", className)}>
      {/* Status badge positioned above the marker */}
      <div className="relative h-8 mx-2 mb-1">
        <span 
          className={cn(
            "absolute text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap",
            bgColor,
            textColor
          )}
          style={{ 
            left: `${markerPosition}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {format(currentPrice, currency)} {label}
        </span>
      </div>

      {/* Gauge bar with extra padding for marker overflow */}
      <div className="relative h-2 mx-2">
        {/* Background gradient with three zones */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(to right, 
              #10b981 0%, 
              #10b981 ${lowZoneEnd}%, 
              #fbbf24 ${lowZoneEnd}%, 
              #fbbf24 ${highZoneStart}%, 
              #ef4444 ${highZoneStart}%, 
              #ef4444 100%
            )`,
          }}
        />

        {/* Current price marker */}
        <div 
          className="absolute top-1/2 w-4 h-4 bg-white rounded-full border-2 border-blue-500 shadow-md transition-all duration-300 z-10"
          style={{ 
            left: `${markerPosition}%`,
            transform: `translate(-50%, -50%)`,
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between mt-2">
        <span className="text-sm text-muted-foreground">
          {format(lowThreshold, currency)}
        </span>
        <span className="text-sm text-muted-foreground">
          {format(highThreshold, currency)}
        </span>
      </div>
    </div>
  );
}

