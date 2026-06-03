import * as React from "react";
import type { ProductDetail } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import {
  type ValueState,
  isSwatchOption,
  selectionFromVariants,
  valueState,
} from "@/registry/default/lib/variants";

type Option = ProductDetail.Variants.Option;
type OptionValue = ProductDetail.Variants.Option.Value;

const PILL_STATE: Record<ValueState, string> = {
  selected: "border-primary bg-primary text-primary-foreground",
  available: "border-input hover:bg-accent hover:text-accent-foreground",
  outOfStock: "border-input text-muted-foreground line-through",
  notOffered: "border-dashed text-muted-foreground/70 hover:text-foreground",
};

const SWATCH_STATE: Record<ValueState, string> = {
  selected: "ring-2 ring-ring ring-offset-2 ring-offset-background",
  available: "ring-1 ring-border hover:ring-ring",
  outOfStock: "opacity-60 ring-1 ring-border",
  notOffered: "opacity-40 ring-1 ring-border",
};

export interface VariantSelectorProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  /** Variant state from a `ProductDetail`. */
  variants: ProductDetail.Variants;
  /**
   * Controlled selection as `{ optionName: label }`. Defaults to the resolved
   * `variants.selected`. Pass a pending selection to reflect an in-flight
   * re-resolve.
   */
  value?: Record<string, string>;
  /**
   * Fired when a value is chosen. Re-resolve the product server-side with
   * `option_<name>=<label>` (or navigate to `value.product_id` when set).
   * Values are never disabled — selecting an unavailable value lets the server
   * relax the rest of the configuration.
   */
  onSelect?: (optionName: string, value: OptionValue) => void;
  /**
   * Fired as a swatch is hovered/focused (the value) and left/blurred (`null`).
   * Wire to a gallery preview to show that color's `thumbnail_url` without a
   * fetch. Only swatch options emit this; text pills don't.
   */
  onValuePreview?: (value: OptionValue | null) => void;
}

/**
 * Renders every variant dimension of a product as pills (or image swatches),
 * with three tiers of emphasis driven by `exists` and `available`.
 */
export function VariantSelector({
  variants,
  value,
  onSelect,
  onValuePreview,
  className,
  ...props
}: VariantSelectorProps) {
  const selection = value ?? selectionFromVariants(variants);

  return (
    <div data-slot="variant-selector" className={cn("flex flex-col gap-5", className)} {...props}>
      {variants.options.map((option) => (
        <OptionGroup
          key={option.name}
          option={option}
          selectedLabel={selection[option.name]}
          onSelect={onSelect}
          onValuePreview={onValuePreview}
        />
      ))}
    </div>
  );
}

function OptionGroup({
  option,
  selectedLabel,
  onSelect,
  onValuePreview,
}: {
  option: Option;
  selectedLabel: string | undefined;
  onSelect: VariantSelectorProps["onSelect"];
  onValuePreview: VariantSelectorProps["onValuePreview"];
}) {
  const swatches = isSwatchOption(option);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{option.name}</span>
        {selectedLabel ? <span className="text-muted-foreground">{selectedLabel}</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {option.values.map((optionValue) => {
          const state = valueState(optionValue, optionValue.label === selectedLabel);
          return swatches && optionValue.thumbnail_url ? (
            <Swatch
              key={optionValue.label}
              value={optionValue}
              state={state}
              onClick={() => onSelect?.(option.name, optionValue)}
              onPreview={onValuePreview}
            />
          ) : (
            <Pill
              key={optionValue.label}
              value={optionValue}
              state={state}
              onClick={() => onSelect?.(option.name, optionValue)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Pill({
  value,
  state,
  onClick,
}: {
  value: OptionValue;
  state: ValueState;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={state === "selected"}
      className={cn(
        "inline-flex min-w-9 cursor-pointer items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        PILL_STATE[state],
      )}
    >
      {value.label}
    </button>
  );
}

function Swatch({
  value,
  state,
  onClick,
  onPreview,
}: {
  value: OptionValue;
  state: ValueState;
  onClick: () => void;
  onPreview: VariantSelectorProps["onValuePreview"];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onPreview?.(value)}
      onMouseLeave={() => onPreview?.(null)}
      onFocus={() => onPreview?.(value)}
      onBlur={() => onPreview?.(null)}
      title={value.label}
      aria-label={value.label}
      aria-pressed={state === "selected"}
      className={cn(
        "relative size-10 cursor-pointer overflow-hidden rounded-full bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        SWATCH_STATE[state],
      )}
    >
      {value.thumbnail_url ? (
        <img src={value.thumbnail_url} alt="" className="size-full object-cover" />
      ) : null}
    </button>
  );
}
