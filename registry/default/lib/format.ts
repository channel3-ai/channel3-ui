import type {
  AvailabilityStatus,
  Price,
  ProductImage,
  ProductOffer,
} from "@channel3/sdk/resources";

/**
 * Format a numeric amount as a localized currency string. Falls back to a
 * plain `CODE 12.34` string when the runtime doesn't recognize the currency.
 */
export function formatCurrency(amount: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Format a Channel3 `Price` using its embedded currency code. */
export function formatPrice(price: Price, locale?: string): string {
  return formatCurrency(price.price, price.currency, locale);
}

/** True when the price carries a higher pre-discount `compare_at_price`. */
export function isOnSale(price: Price): boolean {
  return typeof price.compare_at_price === "number" && price.compare_at_price > price.price;
}

/**
 * Whole-number discount percentage derived from `compare_at_price`, or `null`
 * when the item isn't discounted.
 */
export function discountPercent(price: Price): number | null {
  if (!isOnSale(price) || !price.compare_at_price) {
    return null;
  }
  return Math.round(((price.compare_at_price - price.price) / price.compare_at_price) * 100);
}

/** Strip protocol and a leading `www.` from a retailer domain for display. */
export function formatDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

const PURCHASABLE: ReadonlySet<AvailabilityStatus> = new Set<AvailabilityStatus>([
  "InStock",
  "LimitedAvailability",
  "PreOrder",
  "BackOrder",
]);

/** Whether a status represents something a shopper can still buy. */
export function isPurchasable(status: AvailabilityStatus): boolean {
  return PURCHASABLE.has(status);
}

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  InStock: "In stock",
  LimitedAvailability: "Limited availability",
  PreOrder: "Pre-order",
  BackOrder: "Back-order",
  SoldOut: "Sold out",
  OutOfStock: "Out of stock",
  Discontinued: "Discontinued",
  Unknown: "Unavailable",
};

/** Human-readable label for an availability status. */
export function availabilityLabel(status: AvailabilityStatus): string {
  return AVAILABILITY_LABELS[status];
}

/**
 * Pick the best image to show for a product.
 *
 * `preferCleaned` favors `is_cleaned_image` shots (square, uniform background)
 * for grid/card contexts; otherwise the main image (or first image) wins.
 */
export function pickImage(
  images: ReadonlyArray<ProductImage> | undefined,
  { preferCleaned = false }: { preferCleaned?: boolean } = {},
): ProductImage | undefined {
  if (!images || images.length === 0) {
    return undefined;
  }
  if (preferCleaned) {
    const cleaned = images.find((image) => image.is_cleaned_image);
    if (cleaned) {
      return cleaned;
    }
  }
  return images.find((image) => image.is_main_image) ?? images[0];
}

/**
 * Hover/secondary image priority: a contextual shot (product worn or in use)
 * makes a far more compelling crossfade than another clean studio angle. Shot
 * types are tried in this order, then any remaining image, with reference shots
 * (size charts, packaging, etc.) excluded entirely.
 */
const HOVER_SHOT_PRIORITY: ReadonlyArray<NonNullable<ProductImage["shot_type"]>> = [
  "on_model",
  "lifestyle",
  "in_use",
  "flat_lay",
  "angle_view",
];

const HOVER_SHOT_EXCLUDE: ReadonlySet<NonNullable<ProductImage["shot_type"]>> = new Set([
  "size_chart",
  "packaging",
  "product_information",
  "merchant_information",
  "scale_reference",
]);

/**
 * Pick the best image to crossfade to on hover, preferring contextual shots
 * (see {@link HOVER_SHOT_PRIORITY}). Returns `undefined` when there's no
 * suitable second image.
 */
export function pickHoverImage(
  images: ReadonlyArray<ProductImage> | undefined,
  { excludeUrl }: { excludeUrl?: string } = {},
): ProductImage | undefined {
  if (!images || images.length === 0) {
    return undefined;
  }
  const candidates = images.filter(
    (image) =>
      image.url !== excludeUrl &&
      !(image.shot_type != null && HOVER_SHOT_EXCLUDE.has(image.shot_type)),
  );
  if (candidates.length === 0) {
    return undefined;
  }
  for (const shot of HOVER_SHOT_PRIORITY) {
    const match = candidates.find((image) => image.shot_type === shot);
    if (match) {
      return match;
    }
  }
  return candidates[0];
}

/** Lowest-priced offer, preferring in-stock merchants. */
export function leadOffer(offers: ReadonlyArray<ProductOffer> | undefined): ProductOffer | undefined {
  if (!offers || offers.length === 0) {
    return undefined;
  }
  const byPrice = [...offers].sort((a, b) => a.price.price - b.price.price);
  return byPrice.find((offer) => offer.availability === "InStock") ?? byPrice[0];
}

/** True when offers exist but none are in stock. */
export function isSoldOut(offers: ReadonlyArray<ProductOffer> | undefined): boolean {
  return Boolean(offers && offers.length > 0 && !offers.some((o) => o.availability === "InStock"));
}
