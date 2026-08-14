import type {
  OfferAvailabilityStatus,
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

export function formatPrice(price: Price, locale?: string): string {
  return formatCurrency(price.price, price.currency, locale);
}

export function isOnSale(price: Price): boolean {
  return typeof price.compare_at_price === "number" && price.compare_at_price > price.price;
}

export function discountPercent(price: Price): number | null {
  if (!isOnSale(price) || !price.compare_at_price) {
    return null;
  }
  return Math.round(((price.compare_at_price - price.price) / price.compare_at_price) * 100);
}

export function formatDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

export function isInStock(status: OfferAvailabilityStatus): boolean {
  return status === "InStock";
}

const AVAILABILITY_LABELS: Record<OfferAvailabilityStatus, string> = {
  InStock: "In stock",
  OutOfStock: "Out of stock",
};

export function availabilityLabel(status: OfferAvailabilityStatus): string {
  return AVAILABILITY_LABELS[status];
}

/**
 * Display URL for an image. `preferCleaned` picks the background-removed square
 * variant when the API has one — right for grids and cards, wrong for detail
 * galleries, which should show the regular shot.
 */
export function productImageUrl(
  image: ProductImage,
  { preferCleaned = false }: { preferCleaned?: boolean } = {},
): string {
  if (preferCleaned) {
    const cleaned = image.cleaned_url;
    if (cleaned) {
      return cleaned;
    }
  }
  return image.url;
}

export function pickImage(
  images: ReadonlyArray<ProductImage> | undefined,
): ProductImage | undefined {
  if (!images || images.length === 0) {
    return undefined;
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

export function leadOffer(offers: ReadonlyArray<ProductOffer> | undefined): ProductOffer | undefined {
  if (!offers || offers.length === 0) {
    return undefined;
  }
  const byPrice = [...offers].sort((a, b) => a.price.price - b.price.price);
  return byPrice.find((offer) => isInStock(offer.availability)) ?? byPrice[0];
}

export function isSoldOut(offers: ReadonlyArray<ProductOffer> | undefined): boolean {
  return Boolean(offers && offers.length > 0 && !offers.some((o) => isInStock(o.availability)));
}
