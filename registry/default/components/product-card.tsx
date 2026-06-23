import * as React from "react";
import { ImageOff } from "lucide-react";
import type { ProductDetail } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatPrice,
  isOnSale,
  isSoldOut,
  leadOffer,
  pickHoverImage,
  pickImage,
} from "@/registry/default/lib/format";
import { swatchOption } from "@/registry/default/lib/variants";

type OptionValue = ProductDetail.Variants.Option.Value;

/** How many swatches to show inline before collapsing the rest into a "+N". */
const MAX_SWATCHES = 10;

export interface ProductCardProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  /** The product to display. Works with both search hits and detail responses. */
  product: ProductDetail;
  /**
   * Destination URL for the card. When set, the image and title render as a real
   * `<a href>` (crawlable, middle/cmd-clickable); a plain left-click still calls
   * {@link ProductCardProps.onSelect} for SPA navigation.
   */
  href?: string;
  /** Called when the card is activated (e.g. to open a product detail view). */
  onSelect?: (product: ProductDetail) => void;
  /**
   * Called when the card is hovered, focused, or touched — before activation.
   * Router-agnostic prefetch hook: wire it to your framework's route preloader
   * (e.g. TanStack Router `preloadRoute`, Next.js `router.prefetch`) so the
   * destination is warm by the time the user clicks. Fires at most once per
   * pointer entry/focus.
   */
  onPreload?: (product: ProductDetail) => void;
  /**
   * Called when a color swatch is clicked. Navigate to `value.product_id` (the
   * variant's own product) when set. Falls back to {@link ProductCardProps.onSelect}.
   */
  onSelectVariant?: (value: OptionValue) => void;
  /**
   * Show the colorway thumbnail strip between the image and the title. Renders
   * the swatch variant option's values (falling back to a single circle of the
   * product's own image when there are no variant thumbnails).
   */
  showSwatches?: boolean;
  /**
   * Eagerly load this card's imagery at high fetch priority. Set on the first
   * (above-the-fold) cards in a grid/carousel so they aren't deferred by lazy
   * loading; leave off for the rest.
   */
  priority?: boolean;
  /** Locale override for price formatting. */
  locale?: string;
}

/**
 * Compact, image-forward product tile for grids and carousels. Presentational
 * only — borderless so imagery forms the grid. Hovering crossfades to a second
 * image (or zooms), and hovering a color swatch previews that color's
 * thumbnail. A colorway thumbnail strip sits between the image and the title.
 * Equal-height: the title and price rows are reserved so cards line up
 * regardless of content.
 */
export function ProductCard({
  product,
  href,
  onSelect,
  onPreload,
  onSelectVariant,
  showSwatches = true,
  priority = false,
  locale,
  className,
  ...props
}: ProductCardProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  // A server-rendered image can finish decoding before hydration, so `onLoad`
  // never fires on the client — reveal it on mount if it's already complete.
  const revealIfComplete = React.useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) {
      setImageLoaded(true);
    }
  }, []);

  const image = pickImage(product.images, { preferCleaned: true });
  const secondImage = pickHoverImage(product.images, { excludeUrl: image?.url });
  const brand = product.brands?.[0]?.name;
  const offer = leadOffer(product.offers);
  const soldOut = isSoldOut(product.offers);
  const interactive = typeof onSelect === "function" || typeof onSelectVariant === "function";

  const option = showSwatches && product.variants ? swatchOption(product.variants) : undefined;
  const swatchValues = (option?.values ?? []).filter((value) => value.thumbnail_url);
  const visibleSwatches = swatchValues.slice(0, MAX_SWATCHES);
  const overflowSwatches = swatchValues.length - visibleSwatches.length;

  const onSwatch = (value: OptionValue) => {
    if (onSelectVariant) {
      onSelectVariant(value);
    } else {
      onSelect?.(product);
    }
  };

  const media = (
    <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
      {image && !imageFailed ? (
        <img
          src={image.url}
          alt={image.alt_text ?? ""}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className={cn(
            "size-full object-cover transition duration-300",
            // Fade up from the muted placeholder once decoded so images resolve
            // smoothly instead of popping in.
            imageLoaded ? "opacity-100" : "opacity-0",
            // The hover image (when present) covers this one, so only the
            // single-image case needs a hover affordance.
            secondImage ? null : "group-hover:scale-105",
          )}
          ref={revealIfComplete}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-8" aria-hidden />
        </div>
      )}
      {secondImage && !imageFailed ? (
        <img
          src={secondImage.url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          aria-hidden
          className="absolute inset-0 size-full bg-muted object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      ) : null}
      {preview ? (
        <img
          src={preview}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full bg-muted object-cover"
        />
      ) : null}
      {soldOut ? (
        <Badge variant="secondary" className="absolute right-2 top-2">
          Sold out
        </Badge>
      ) : null}
    </div>
  );

  const fallbackThumb = image && !imageFailed ? image.url : null;
  // The strip always renders one row (the product's own thumbnail when there
  // are no swatches, an empty circle when there's no image) so the title/price
  // below stay at a consistent height across cards.
  const thumbnails = showSwatches ? (
    <div className="flex flex-wrap items-center gap-1 pt-2.5">
      {visibleSwatches.length > 0 ? (
        <>
          {visibleSwatches.map((value) => (
            <button
              key={value.label}
              type="button"
              title={value.label}
              aria-label={value.label}
              onClick={() => onSwatch(value)}
              onMouseEnter={() => setPreview(value.thumbnail_url ?? null)}
              onMouseLeave={() => setPreview(null)}
              onFocus={() => setPreview(value.thumbnail_url ?? null)}
              onBlur={() => setPreview(null)}
              className="size-5 cursor-pointer overflow-hidden rounded-full ring-1 ring-border transition hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img src={value.thumbnail_url ?? undefined} alt="" className="size-full object-cover" />
            </button>
          ))}
          {overflowSwatches > 0 ? (
            <span className="text-xs text-muted-foreground">{`+${overflowSwatches}`}</span>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          aria-label={product.title}
          onClick={() => onSelect?.(product)}
          className="flex size-5 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground ring-1 ring-border transition hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {fallbackThumb ? (
            <img src={fallbackThumb} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-2.5" aria-hidden />
          )}
        </button>
      )}
    </div>
  ) : null;

  const meta = (
    <div className="flex flex-col gap-1 pt-2.5">
      {brand ? <span className="truncate text-xs text-muted-foreground">{brand}</span> : null}
      <span className="truncate text-sm leading-snug font-medium">{product.title}</span>
      <div className="flex min-h-[1.5rem] items-baseline gap-2 pt-1">
        {offer ? (
          <>
            <span className="text-sm font-semibold">{formatPrice(offer.price, locale)}</span>
            {isOnSale(offer.price) && offer.price.compare_at_price ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(offer.price.compare_at_price, offer.price.currency, locale)}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );

  const tapClass =
    "block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  // Prefetch the destination as soon as the user signals intent (hover/focus/
  // touch), so it's warm before the click. Harmless to fire more than once.
  const preload = onPreload ? () => onPreload(product) : undefined;

  // Crawlable link with progressive enhancement: a plain left-click is handled
  // by onSelect (SPA nav), but the real href keeps the page indexable and lets
  // modifier/middle clicks open it normally.
  const tap = (children: React.ReactNode) => {
    if (href) {
      return (
        <a
          href={href}
          className={tapClass}
          onMouseEnter={preload}
          onFocus={preload}
          onTouchStart={preload}
          onClick={(event) => {
            if (
              onSelect &&
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onSelect(product);
            }
          }}
        >
          {children}
        </a>
      );
    }
    if (interactive) {
      return (
        <button
          type="button"
          onClick={() => onSelect?.(product)}
          onMouseEnter={preload}
          onFocus={preload}
          onTouchStart={preload}
          className={tapClass}
        >
          {children}
        </button>
      );
    }
    return children;
  };

  return (
    <div data-slot="product-card" className={cn("group flex h-full flex-col", className)} {...props}>
      {tap(media)}
      {thumbnails}
      {tap(meta)}
    </div>
  );
}

/** Matching loading placeholder for {@link ProductCard}. */
export function ProductCardSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="product-card-skeleton" className={cn("flex h-full flex-col", className)} {...props}>
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="flex flex-col gap-2 pt-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-1 h-4 w-1/4" />
      </div>
    </div>
  );
}
