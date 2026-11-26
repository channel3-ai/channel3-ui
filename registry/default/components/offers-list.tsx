import * as React from "react";
import { ExternalLink } from "lucide-react";
import type { ProductOffer } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatCurrency, formatDomain, formatPrice, isInStock, isOnSale } from "@/registry/default/lib/format";
import {
  deliveryTimeLabel,
  returnsCaveats,
  returnsLabel,
  shippingLabel,
} from "@/registry/default/lib/policies";

export interface OffersListProps extends React.ComponentProps<"div"> {
  offers: ReadonlyArray<ProductOffer>;
  onOfferClick?: (offer: ProductOffer) => void;
  actionLabel?: string;
  locale?: string;
  /** `rel` for each buy link. Use `"sponsored noopener noreferrer"` for affiliate links. */
  buyLinkRel?: string;
  /** Show each merchant's shipping and returns terms under its row. */
  showPolicies?: boolean;
}

const byPrice = (a: ProductOffer, b: ProductOffer) => a.price.price - b.price.price;

export function OffersList({
  offers,
  onOfferClick,
  actionLabel = "View",
  locale,
  buyLinkRel = "noopener noreferrer",
  showPolicies = true,
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
      showPolicies={showPolicies}
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
  showPolicies,
  onOfferClick,
}: {
  offer: ProductOffer;
  isLead: boolean;
  dimmed: boolean;
  actionLabel: string;
  locale: string | undefined;
  buyLinkRel: string;
  showPolicies: boolean;
  onOfferClick: ((offer: ProductOffer) => void) | undefined;
}) {
  const terms = showPolicies ? offerTerms(offer, locale) : [];

  return (
    <div
      data-slot="offer-row"
      className={cn("flex flex-col gap-1.5 rounded-lg border p-3", dimmed && "opacity-60")}
    >
      <div className="flex items-center justify-between gap-3">
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
      {terms.length > 0 ? (
        <p data-slot="offer-terms" className="text-xs text-muted-foreground">
          {terms.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

/** Shipping cost, delivery time, returns, then any returns fine print. */
function offerTerms(offer: ProductOffer, locale: string | undefined): string[] {
  return [
    shippingLabel(offer, locale),
    deliveryTimeLabel(offer.shipping_policy),
    returnsLabel(offer.return_policy),
    ...returnsCaveats(offer.return_policy, locale),
  ].filter((term): term is string => term !== null);
}
