import * as React from "react";
import { ExternalLink } from "lucide-react";
import type { ProductOffer } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatCurrency, formatDomain, formatPrice, isInStock, isOnSale } from "@/registry/default/lib/format";

export interface OffersListProps extends React.ComponentProps<"div"> {
  offers: ReadonlyArray<ProductOffer>;
  onOfferClick?: (offer: ProductOffer) => void;
  actionLabel?: string;
  locale?: string;
  /** `rel` for each buy link. Use `"sponsored noopener noreferrer"` for affiliate links. */
  buyLinkRel?: string;
}

const byPrice = (a: ProductOffer, b: ProductOffer) => a.price.price - b.price.price;

export function OffersList({
  offers,
  onOfferClick,
  actionLabel = "View",
  locale,
  buyLinkRel = "noopener noreferrer",
  className,
  ...props
}: OffersListProps) {
  const { inStock, outOfStock, lead } = React.useMemo(() => {
    const sorted = [...offers].sort(byPrice);
    const purchasable = sorted.filter((offer) => isInStock(offer.availability));
    const unavailable = sorted.filter((offer) => !isInStock(offer.availability));
    return { inStock: purchasable, outOfStock: unavailable, lead: purchasable[0] ?? sorted[0] };
  }, [offers]);

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
      buyLinkRel={buyLinkRel}
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
  buyLinkRel,
  onOfferClick,
}: {
  offer: ProductOffer;
  isLead: boolean;
  dimmed: boolean;
  actionLabel: string;
  locale: string | undefined;
  buyLinkRel: string;
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
          rel={buyLinkRel}
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
