import * as React from "react";
import type { OptionValue, Product } from "@channel3/sdk/resources";

import { useLatestRequest } from "@/registry/default/hooks/use-latest-request";
import { mergeSelection, selectionFromVariants } from "@/registry/default/lib/variants";

/** Arguments handed to a {@link VariantResolver} when a value is chosen. */
export interface VariantResolveInput {
  /** The product currently displayed. */
  product: Product;
  /** Name of the option that changed (e.g. "Color"). */
  optionName: string;
  /**
   * The chosen value. Carries `product_id`/`thumbnail_url` for color-as-product
   * setups — resolve those by fetching that product instead of re-querying.
   */
  value: OptionValue;
  /**
   * The full desired configuration as `{ optionName: label }`, with the new
   * choice merged over the current selection. Send as repeated
   * `option_<name>=<label>` query params to `GET /v1/products/{id}`.
   */
  selection: Record<string, string>;
}

/**
 * Resolves a new product configuration. Implement this on the consumer side so
 * the Channel3 API key stays on your server: call
 * `client.get(`/v1/products/${id}`, { query: { option_Color: "Blue", ... } })`
 * (or fetch `value.product_id`) and return the resolved `Product`.
 */
export type VariantResolver = (input: VariantResolveInput) => Promise<Product>;

export interface UseVariantSelectionOptions {
  /** Initial product, from search results or a detail fetch. */
  product: Product;
  /**
   * Re-resolves the product when a value is selected. Omit for a read-only
   * selector that only tracks selection locally.
   */
  resolve?: VariantResolver;
  /** Called after a resolved product replaces the current one. */
  onResolved?: (product: Product) => void;
  /** Called when `resolve` rejects. */
  onError?: (error: unknown) => void;
}

export interface UseVariantSelectionResult {
  /** The product to render — the initial one, or the latest resolved one. */
  product: Product;
  /** Effective selection as `{ optionName: label }`, reflecting server relaxation. */
  selection: Record<string, string>;
  /** True while a `resolve` call is in flight. */
  isResolving: boolean;
  /** The last `resolve` error, or `null`. */
  error: unknown;
  /** Select a value for an option. Wire to `VariantSelector.onSelect`. */
  select: (optionName: string, value: OptionValue) => void;
  /** Clear any pending (optimistic) selection and error. */
  reset: () => void;
}

const EMPTY_SELECTION: Record<string, string> = {};

/**
 * Manages variant selection and server-side re-resolution for a product.
 *
 * Selection is optimistic: the chosen value highlights immediately while
 * `resolve` runs, then the resolved product's own `selected` becomes the source
 * of truth (so server-side relaxation is reflected automatically).
 */
export function useVariantSelection({
  product: initialProduct,
  resolve,
  onResolved,
  onError,
}: UseVariantSelectionOptions): UseVariantSelectionResult {
  const [product, setProduct] = React.useState(initialProduct);
  const [pending, setPending] = React.useState<Record<string, string>>(EMPTY_SELECTION);
  const [isResolving, setIsResolving] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  // Ignore stale resolves when selections fire in quick succession or the input
  // product is swapped mid-resolve.
  const { run, cancel } = useLatestRequest();

  // Adopt a new product when the consumer swaps the input (e.g. new search hit),
  // discarding any in-flight resolve for the previous product so it can't
  // clobber the freshly-swapped one.
  const lastInputId = React.useRef(initialProduct.id);
  React.useEffect(() => {
    if (initialProduct.id !== lastInputId.current) {
      lastInputId.current = initialProduct.id;
      cancel();
      setProduct(initialProduct);
      setPending(EMPTY_SELECTION);
      setError(null);
      setIsResolving(false);
    }
  }, [initialProduct, cancel]);

  const selection = React.useMemo(() => {
    const base = product.variants ? selectionFromVariants(product.variants) : EMPTY_SELECTION;
    return { ...base, ...pending };
  }, [product, pending]);

  const select = React.useCallback(
    (optionName: string, value: OptionValue) => {
      const nextSelection = product.variants
        ? mergeSelection(product.variants, { ...pending, [optionName]: value.label })
        : { [optionName]: value.label };

      setPending((prev) => ({ ...prev, [optionName]: value.label }));
      setError(null);

      if (!resolve) {
        return;
      }

      setIsResolving(true);
      run(Promise.resolve(resolve({ product, optionName, value, selection: nextSelection })), {
        onResolve: (resolved) => {
          setProduct(resolved);
          setPending(EMPTY_SELECTION);
          onResolved?.(resolved);
        },
        onReject: (caught) => {
          setError(caught);
          onError?.(caught);
        },
        onSettle: () => setIsResolving(false),
      });
    },
    [product, pending, resolve, onResolved, onError, run],
  );

  const reset = React.useCallback(() => {
    cancel();
    setPending(EMPTY_SELECTION);
    setError(null);
    setIsResolving(false);
  }, [cancel]);

  return { product, selection, isResolving, error, select, reset };
}
