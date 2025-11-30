"use client";

import { useId } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

function defaultFormatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export type PriceHistoryDataPoint = {
  /** Timestamp of the price point */
  timestamp: Date | string;
  /** Price value */
  price: number;
};

export type PriceHistoryChartProps = {
  /** Array of price history data points */
  data: PriceHistoryDataPoint[];
  /** Currency code for formatting (default: "USD") */
  currency?: string;
  /** Custom formatter for price values */
  formatPrice?: (value: number, currency: string) => string;
  /** Custom formatter for date labels */
  formatDate?: (date: Date) => string;
  /** Show Y-axis (default: true) */
  showYAxis?: boolean;
  /** Show X-axis (default: true) */
  showXAxis?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Line/fill color (default: "#3b82f6" - blue) */
  color?: string;
  /** Y-axis domain: "auto" to fit data, or [min, max] for custom range. Default starts at 0. */
  yAxisDomain?: "auto" | [number, number];
};

/**
 * Default date formatter showing relative time (e.g., "47 days ago")
 */
function defaultDateFormatter(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

/**
 * Compact date formatter for X-axis labels
 */
function compactDateFormatter(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${diffDays} days ago`;
}

export function PriceHistoryChart({
  data,
  currency = "USD",
  formatPrice,
  formatDate,
  showYAxis = true,
  showXAxis = true,
  className,
  color = "#3b82f6",
  yAxisDomain,
}: PriceHistoryChartProps) {
  const gradientId = useId();
  const priceFormatter = formatPrice ?? defaultFormatCurrency;
  const dateFormatter = formatDate ?? defaultDateFormatter;

  // Transform data for recharts
  const chartData = data.map((point) => {
    const date = typeof point.timestamp === "string" 
      ? new Date(point.timestamp) 
      : point.timestamp;
    return {
      date: date.toISOString(),
      dateLabel: compactDateFormatter(date),
      price: point.price,
      formattedDate: dateFormatter(date),
    };
  });

  // Calculate Y-axis domain
  let calculatedDomain: [number, number] | undefined;
  if (yAxisDomain === "auto" && data.length > 0) {
    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.1;
    calculatedDomain = [
      Math.max(0, Math.floor((minPrice - padding) / 10) * 10),
      Math.ceil((maxPrice + padding) / 10) * 10,
    ];
  } else if (Array.isArray(yAxisDomain)) {
    calculatedDomain = yAxisDomain;
  }

  // Chart configuration
  const chartConfig: ChartConfig = {
    price: {
      label: "Price",
      color: color,
    },
  };

  // Handle empty state
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-[200px] text-muted-foreground", className)}>
        No price history available
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: showYAxis ? 0 : -20,
            right: 12,
            top: 12,
            bottom: 0,
          }}
        >
          {showXAxis && (
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={50}
              tick={{ fontSize: 12 }}
            />
          )}
          {showYAxis && (
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={5}
              tickFormatter={(value) => `$${value}`}
              tick={{ fontSize: 12 }}
              width={60}
              domain={calculatedDomain}
            />
          )}
          <ChartTooltip
            cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelClassName="bg-transparent"
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.formattedDate;
                  }
                  return "";
                }}
                formatter={(value) => (
                  <span className="font-medium">{priceFormatter(Number(value), currency)}</span>
                )}
              />
            }
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            dataKey="price"
            type="monotone"
            fill={`url(#${gradientId})`}
            stroke={color}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

