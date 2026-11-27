import type {
  Money,
  OfferRefundType,
  OfferReturnPolicy,
  OfferShippingPolicy,
  ProductOffer,
} from "@channel3/sdk/resources";

import { formatCurrency } from "@/registry/default/lib/format";

/**
 * Short shipping-cost line for an offer, e.g. "Free delivery", "Free delivery
 * on $75+", or "$8 delivery". When the offer's own price clears the
 * free-shipping minimum, it ships free. Null when the terms don't say.
 */
export function shippingLabel(offer: ProductOffer, locale?: string): string | null {
  const policy = offer.shipping_policy;
  if (!policy) {
    return null;
  }
  const minimum = policy.free_shipping_minimum;
  if (minimum) {
    if (minimum.amount <= 0 || isSameCurrencyAtLeast(offer, minimum)) {
      return "Free delivery";
    }
    return `Free delivery on ${formatMoney(minimum, locale)}+`;
  }
  if (policy.shipping_cost) {
    return `${formatMoney(policy.shipping_cost, locale)} delivery`;
  }
  return null;
}

/**
 * Transit time of the first listed service, e.g. "3–5 day delivery". Merchants
 * state days without saying business or calendar and exclude handling, so this
 * stays a day count rather than a promised date. Null when that service states
 * no transit time.
 */
export function deliveryTimeLabel(policy: OfferShippingPolicy | null | undefined): string | null {
  const first = policy?.options?.[0];
  const max = first?.delivery_days_max;
  if (max == null || max <= 0) {
    return null;
  }
  const min = first?.delivery_days_min;
  if (min != null && min > 0 && min < max) {
    return `${min}–${max} day delivery`;
  }
  return max === 1 ? "1 day delivery" : `Up to ${max} day delivery`;
}

/**
 * Short returns line, e.g. "Free 60-day returns", "30-day returns", "Free
 * returns", or "No returns". Null when the terms don't say anything useful.
 */
export function returnsLabel(policy: OfferReturnPolicy | null | undefined): string | null {
  if (!policy) {
    return null;
  }
  if (!policy.accepted) {
    return "No returns";
  }
  const free = policy.free === true ? "Free " : "";
  if (policy.window_unlimited) {
    return free ? "Free returns, no time limit" : "Returns, no time limit";
  }
  if (policy.window_days != null && policy.window_days > 0) {
    return `${free}${policy.window_days}-day returns`;
  }
  return free ? "Free returns" : null;
}

/**
 * Fine print worth surfacing beside the returns line in an offer row: a return
 * shipping fee, a restocking fee, or a refund that isn't money back.
 */
export function returnsCaveats(
  policy: OfferReturnPolicy | null | undefined,
  locale?: string,
): string[] {
  if (!policy?.accepted) {
    return [];
  }
  const caveats: string[] = [];
  if (policy.free !== true && policy.return_fee && policy.return_fee.amount > 0) {
    caveats.push(`${formatMoney(policy.return_fee, locale)} return shipping`);
  }
  if (policy.restocking_fee) {
    caveats.push("Restocking fee");
  }
  const refund = refundCaveat(policy.refund_types);
  if (refund) {
    caveats.push(refund);
  }
  return caveats;
}

function refundCaveat(types: ReadonlyArray<OfferRefundType> | undefined): string | null {
  if (!types || types.length === 0 || types.includes("full_refund")) {
    return null;
  }
  if (types.includes("store_credit") && types.includes("exchange")) {
    return "Store credit or exchange only";
  }
  if (types.includes("store_credit")) {
    return "Store credit only";
  }
  return "Exchange only";
}

function isSameCurrencyAtLeast(offer: ProductOffer, minimum: Money): boolean {
  return offer.price.currency === minimum.currency && offer.price.price >= minimum.amount;
}

function formatMoney(money: Money, locale?: string): string {
  const formatted = formatCurrency(money.amount, money.currency, locale);
  // "$75.00" reads heavier than Google's "$75" on whole amounts.
  return Number.isInteger(money.amount) ? formatted.replace(/[.,]00(?=\D*$)/, "") : formatted;
}
