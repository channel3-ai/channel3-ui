import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PriceStatistics } from "@channel3/sdk/resources";

import { PriceRangeGauge } from "@/registry/default/components/price-range-gauge";

const stats = (overrides: Partial<PriceStatistics>): PriceStatistics => ({
  currency: "USD",
  min_price: 100,
  max_price: 200,
  current_price: 150,
  mean: 150,
  std_dev: 25,
  current_status: "typical",
  ...overrides,
});

describe("PriceRangeGauge", () => {
  it("captions the price and its standing for each status", () => {
    const { rerender } = render(
      <PriceRangeGauge statistics={stats({ current_price: 150, current_status: "low" })} />,
    );
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("Lower than usual")).toBeInTheDocument();

    rerender(<PriceRangeGauge statistics={stats({ current_price: 150, current_status: "typical" })} />);
    expect(screen.getByText("Typical price")).toBeInTheDocument();

    rerender(<PriceRangeGauge statistics={stats({ current_price: 150, current_status: "high" })} />);
    expect(screen.getByText("Higher than usual")).toBeInTheDocument();
  });

  it("labels the typical-range boundaries", () => {
    render(<PriceRangeGauge statistics={stats({ mean: 150, std_dev: 25 })} />);
    expect(screen.getByText("$125.00")).toBeInTheDocument();
    expect(screen.getByText("$175.00")).toBeInTheDocument();
  });

  it("positions the marker at the current price within the range", () => {
    const { container } = render(<PriceRangeGauge statistics={stats({ current_price: 150 })} />);
    const marker = container.querySelector('[role="presentation"]') as HTMLElement | null;
    expect(marker).not.toBeNull();
    expect(marker?.style.left).toBe("50%");
  });

  it("renders no zones or marker when there is no range", () => {
    const { container } = render(
      <PriceRangeGauge
        statistics={stats({ min_price: 100, max_price: 100, current_price: 100, std_dev: 0 })}
      />,
    );
    expect(container.querySelector('[role="presentation"]')).toBeNull();
    expect(screen.getAllByText("$100.00").length).toBeGreaterThan(0);
  });
});
