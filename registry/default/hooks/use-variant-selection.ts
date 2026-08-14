import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import type { OptionValue, Product } from "@channel3/sdk/resources";

import { mergeSelection, selectionFromVariants } from "@/registry/default/lib/variants";

export interface VariantResolveInput {
  product: Product;
  optionName: string;
  value: OptionValue;
  selection: Record<string, string>;
}

/**
 * Server-side resolver. When `value.product_id` is set, fetch that product;
 * otherwise retrieve the current id with `selected_options: selection`.
 *
 * ```ts
 * client.products.retrieve({
 *   product_id: value.product_id ?? product.id,
 *   selected_options: value.product_id ? undefined : selection,
 * })
 * ```
 */
export type VariantResolver = (input: VariantResolveInput) => Promise<Product>;

export interface UseVariantSelectionOptions {
  product: Product;
  /**
   * Re-resolves the product when a value is selected. Omit for a read-only
   * selector that only tracks selection locally.
   */
  resolve?: VariantResolver;
  onResolved?: (product: Product) => void;
  onError?: (error: unknown) => void;
}

export interface UseVariantSelectionResult {
  product: Product;
  selection: Record<string, string>;
  isResolving: boolean;
  error: unknown;
  select: (optionName: string, value: OptionValue) => void;
  reset: () => void;
}

const EMPTY_SELECTION: Record<string, string> = {};

/**
 * Selection is optimistic while `resolve` runs; the resolved product's
 * `variants.selected` is then the source of truth (including server-side
 * relaxation).
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
  const generation = React.useRef(0);

  const { mutate, reset: resetMutation } = useMutation({
    mutationFn: (input: VariantResolveInput) => Promise.resolve(resolve!(input)),
  });

  const lastInputId = React.useRef(initialProduct.id);
  React.useEffect(() => {
    if (initialProduct.id !== lastInputId.current) {
      lastInputId.current = initialProduct.id;
      generation.current += 1;
      resetMutation();
      setProduct(initialProduct);
      setPending(EMPTY_SELECTION);
      setError(null);
      setIsResolving(false);
    }
  }, [initialProduct, resetMutation]);

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

      const ticket = ++generation.current;
      setIsResolving(true);
      mutate(
        { product, optionName, value, selection: nextSelection },
        {
          onSuccess: (resolved) => {
            if (generation.current !== ticket) {
              return;
            }
            setProduct(resolved);
            setPending(EMPTY_SELECTION);
            onResolved?.(resolved);
          },
          onError: (caught) => {
            if (generation.current !== ticket) {
              return;
            }
            setError(caught);
            onError?.(caught);
          },
          onSettled: () => {
            if (generation.current !== ticket) {
              return;
            }
            setIsResolving(false);
          },
        },
      );
    },
    [product, pending, resolve, onResolved, onError, mutate],
  );

  const reset = React.useCallback(() => {
    generation.current += 1;
    resetMutation();
    setPending(EMPTY_SELECTION);
    setError(null);
    setIsResolving(false);
  }, [resetMutation]);

  return {
    product,
    selection,
    isResolving,
    error,
    select,
    reset,
  };
}
