import type { OptionValue, VariantOption, Variants } from "@channel3/sdk/resources";
import { isInStock } from "@/registry/default/lib/format";

/**
 * Display tier for a variant option value. The selector renders the same
 * vocabulary regardless of dimension (size pills, color swatches, etc.).
 *
 * - `selected`   — the currently resolved value for its option.
 * - `available`  — offered on this configuration and purchasable.
 * - `outOfStock` — offered on this configuration but not currently purchasable.
 * - `notOffered` — only present on a sibling variant (`exists: false`).
 */
export type ValueState = "selected" | "available" | "outOfStock" | "notOffered";

/**
 * Classify a variant option value for display emphasis.
 *
 * On search results `available` is `null` (stock isn't hydrated), so any value
 * that `exists` is treated as `available` until a product-detail fetch resolves
 * real stock. Values are never disabled: clicking a `notOffered` or
 * `outOfStock` value re-resolves the configuration server-side.
 */
export function valueState(value: OptionValue, isSelected: boolean): ValueState {
  if (isSelected) {
    return "selected";
  }
  if (!value.exists) {
    return "notOffered";
  }
  if (value.available && !isInStock(value.available)) {
    return "outOfStock";
  }
  return "available";
}

export function selectionFromVariants(variants: Variants): Record<string, string> {
  return Object.fromEntries(variants.selected.map((selected) => [selected.name, selected.label]));
}

export function isSwatchOption(option: VariantOption): boolean {
  return option.values.some((value) => Boolean(value.thumbnail_url));
}

export function swatchOption(variants: Variants): VariantOption | undefined {
  return variants.options.find(isSwatchOption);
}

export function mergeSelection(
  variants: Variants,
  pending: Record<string, string>,
): Record<string, string> {
  return { ...selectionFromVariants(variants), ...pending };
}
