import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { PriceHistoryPoint } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatCurrency } from "@/registry/default/lib/format";

const chartConfig = {
  price: { label: "Price", color: "var(--chart-1)" },
} satisfies ChartConfig;

export interface PriceHistoryChartProps extends React.ComponentProps<"div"> {
  /** Time-ordered price points from `GET /v0/price-tracking/history`. */
  history: ReadonlyArray<PriceHistoryPoint>;
  /** Currency override; defaults to the currency on the first point. */
  currency?: string;
  /** Locale override for axis and tooltip formatting. */
  locale?: string;
}

/** Area chart of a product's price over time. */
export function PriceHistoryChart({
  history,
  currency,
  locale,
  className,
  ...props
}: PriceHistoryChartProps) {
  const points = React.useMemo(
    () => [...history].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
    [history],
  );

  if (points.length === 0) {
    return (
      <Empty className={className} {...props}>
        <EmptyHeader>
          <EmptyTitle>No price history</EmptyTitle>
          <EmptyDescription>Price tracking hasn't recorded any data points yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const code = currency ?? points[0]?.currency ?? "USD";
  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = (hi - lo || hi || 1) * 0.15; // flat or all-zero series
  const yDomain: [number, number] = [Math.max(0, lo - pad), hi + pad];
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, { month: "short", day: "numeric" });
  const formatAxis = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  return (
    <ChartContainer config={chartConfig} className={cn("aspect-16/7 w-full", className)} {...props}>
      <AreaChart data={points} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="channel3-price-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatDate}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          domain={yDomain}
          tickFormatter={formatAxis}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const raw = payload?.[0]?.payload as PriceHistoryPoint | undefined;
                return raw ? new Date(raw.timestamp).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }) : "";
              }}
              formatter={(value) => formatCurrency(Number(value), code, locale)}
            />
          }
        />
        <Area
          dataKey="price"
          type="monotone"
          stroke="var(--color-price)"
          strokeWidth={2}
          fill="url(#channel3-price-fill)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
