# PriceRangeGauge

A gauge component showing a current price within a min/max range with color-coded zones (green for low, yellow for typical, red for high).

![Preview](./preview.png)

## Installation

No additional dependencies required beyond the base shadcn setup (uses `cn` utility).

Copy `price-range-gauge.tsx` to your components folder.

## Usage

```tsx
import { PriceRangeGauge } from "@/components/price-range-gauge";

<PriceRangeGauge
  currentPrice={150}
  minPrice={100}
  maxPrice={200}
  lowThreshold={120}
  highThreshold={180}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPrice` | `number` | required | Current price to display on the gauge |
| `minPrice` | `number` | required | Minimum price in the range |
| `maxPrice` | `number` | required | Maximum price in the range |
| `lowThreshold` | `number` | required | Price below which is considered "low" (green zone ends) |
| `highThreshold` | `number` | required | Price above which is considered "high" (red zone starts) |
| `currency` | `string` | `"USD"` | Currency code for formatting |
| `formatValue` | `(value: number, currency: string) => string` | - | Custom value formatter |
| `className` | `string` | - | Additional CSS classes |

## Color Zones

The gauge displays three color zones:

- **Green** (left): Prices ≤ `lowThreshold` — good/low price
- **Yellow** (middle): Prices between thresholds — typical price
- **Red** (right): Prices ≥ `highThreshold` — high price

## Examples

### Basic usage

```tsx
<PriceRangeGauge
  currentPrice={155}
  minPrice={100}
  maxPrice={300}
  lowThreshold={170}
  highThreshold={250}
/>
```

### Different currency

```tsx
<PriceRangeGauge
  currentPrice={85}
  minPrice={50}
  maxPrice={150}
  lowThreshold={75}
  highThreshold={120}
  currency="EUR"
/>
```

### Custom formatter

```tsx
<PriceRangeGauge
  currentPrice={1500}
  minPrice={1000}
  maxPrice={2000}
  lowThreshold={1200}
  highThreshold={1800}
  formatValue={(value) => `${value} pts`}
/>
```

## Types

```tsx
type PriceStatus = "low" | "typical" | "high";
```

