import * as React from "react";
import { ExternalLink } from "lucide-react";
import type { ProductOffer } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatCurrency, formatDomain, formatPrice, isOnSale, leadOffer } from "@/registry/default/lib/format";

export interface OffersListProps extends React.ComponentProps<"div"> {
  /** Merchant offers for a product, from `ProductDetail.offers`. */
  offers: ReadonlyArray<ProductOffer>;
  /**
   * Called when a merchant's buy link is clicked. The link still navigates to
   * the affiliate-tracked `offer.url`; use this for analytics.
   */
  onOfferClick?: (offer: ProductOffer) => void;
  /** Label for each buy link. */
  actionLabel?: string;
  /** Locale override for price formatting. */
  locale?: string;
}

const byPrice = (a: ProductOffer, b: ProductOffer) => a.price.price - b.price.price;

/**
 * Compares merchant offers for a product: in-stock merchants first (cheapest
 * leads), then any out-of-stock merchants grouped under a muted header. Every
 * row keeps an affiliate-tracked buy link.
 */
export function OffersList({
  offers,
  onOfferClick,
  actionLabel = "View",
  locale,
  className,
  ...props
}: OffersListProps) {
  const { inStock, outOfStock } = React.useMemo(() => {
    const sorted = [...offers].sort(byPrice);
    return {
      inStock: sorted.filter((offer) => offer.availability === "InStock"),
      outOfStock: sorted.filter((offer) => offer.availability !== "InStock"),
    };
  }, [offers]);
  const lead = leadOffer(offers);

  if (offers.length === 0) {
    return (
      <Empty className={className} {...props}>
        <EmptyHeader>
          <EmptyTitle>No offers</EmptyTitle>
          <EmptyDescription>No merchants are currently listing this product.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const renderRow = (offer: ProductOffer, index: number, dimmed: boolean) => (
    <OfferRow
      key={`${offer.domain}-${index}`}
      offer={offer}
      isLead={offer === lead}
      dimmed={dimmed}
      actionLabel={actionLabel}
      locale={locale}
      onOfferClick={onOfferClick}
    />
  );

  return (
    <div data-slot="offers-list" className={cn("flex flex-col gap-2", className)} {...props}>
      {inStock.map((offer, index) => renderRow(offer, index, false))}
      {outOfStock.length > 0 ? (
        <>
          <span className="pt-2 text-xs font-medium text-muted-foreground">Out of stock</span>
          {outOfStock.map((offer, index) => renderRow(offer, index, true))}
        </>
      ) : null}
    </div>
  );
}

function OfferRow({
  offer,
  isLead,
  dimmed,
  actionLabel,
  locale,
  onOfferClick,
}: {
  offer: ProductOffer;
  isLead: boolean;
  dimmed: boolean;
  actionLabel: string;
  locale: string | undefined;
  onOfferClick: ((offer: ProductOffer) => void) | undefined;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border p-3",
        dimmed && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{formatDomain(offer.domain)}</span>
        {isLead ? <Badge variant="secondary">Best Price</Badge> : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          {isOnSale(offer.price) && offer.price.compare_at_price ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(offer.price.compare_at_price, offer.price.currency, locale)}
            </span>
          ) : null}
          <span className="text-sm font-semibold">{formatPrice(offer.price, locale)}</span>
        </div>
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOfferClick?.(offer)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {actionLabel}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}
