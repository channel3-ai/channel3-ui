import * as React from "react";
import type { OptionValue, PriceHistoryResponse, Product, ProductOffer } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ImageGallery } from "@/registry/default/components/image-gallery";
import { OffersList } from "@/registry/default/components/offers-list";
import { PriceHistoryChart } from "@/registry/default/components/price-history-chart";
import { PriceRangeGauge } from "@/registry/default/components/price-range-gauge";
import { ProductAttributes } from "@/registry/default/components/product-attributes";
import { ProductRecommendations } from "@/registry/default/components/product-recommendations";
import { VariantSelector } from "@/registry/default/components/variant-selector";
import type { SimilarFetcher } from "@/registry/default/hooks/use-product-recommendations";
import { formatCurrency, formatPrice, isInStock, isOnSale, leadOffer } from "@/registry/default/lib/format";

export interface ProductDetailsRecommendationsConfig {
  limit?: number;
  title?: React.ReactNode;
  eager?: boolean;
  skeletonCount?: number;
  getHref?: (product: Product) => string;
  onSelect?: (product: Product) => void;
  onPreload?: (product: Product) => void;
  onSelectVariant?: (product: Product, value: OptionValue) => void;
  showSwatches?: boolean;
}

interface ProductDetailsContextValue {
  product: Product;
  selection: Record<string, string> | undefined;
  onSelectVariant: ((optionName: string, value: OptionValue) => void) | undefined;
  onOfferClick: ((offer: ProductOffer) => void) | undefined;
  buyLinkRel: string | undefined;
  priceHistory: PriceHistoryResponse | undefined;
  isResolving: boolean;
  locale: string | undefined;
  /** A hovered swatch's value, previewed in the gallery (no fetch). */
  variantPreview: OptionValue | null;
  setVariantPreview: (value: OptionValue | null) => void;
  fetchSimilar: SimilarFetcher | undefined;
  recommendations: ProductDetailsRecommendationsConfig | undefined;
}

const ProductDetailsContext = React.createContext<ProductDetailsContextValue | null>(null);

function useProductDetails(component: string): ProductDetailsContextValue {
  const context = React.useContext(ProductDetailsContext);
  if (!context) {
    throw new Error(`${component} must be used within <ProductDetails> or <ProductDetailsRoot>`);
  }
  return context;
}

export interface ProductDetailsProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  product: Product;
  /** Controlled variant selection (`{ optionName: label }`); defaults to `variants.selected`. */
  selection?: Record<string, string>;
  /** Fired when a variant value is chosen — wire to {@link useVariantSelection}. */
  onSelectVariant?: (optionName: string, value: OptionValue) => void;
  onOfferClick?: (offer: ProductOffer) => void;
  /** `rel` for merchant buy links. Use `"sponsored noopener noreferrer"` for affiliate links. */
  buyLinkRel?: string;
  priceHistory?: PriceHistoryResponse;
  isResolving?: boolean;
  locale?: string;
  /**
   * Server-side fetcher wrapping `client.products.findSimilar`. When provided,
   * the default layout renders a lazy "you might also like" carousel below the
   * grid, and `ProductDetailsRecommendations` becomes available.
   */
  fetchSimilar?: SimilarFetcher;
  recommendations?: ProductDetailsRecommendationsConfig;
}

function Root({
  product,
  selection,
  onSelectVariant,
  onOfferClick,
  buyLinkRel,
  priceHistory,
  isResolving = false,
  locale,
  fetchSimilar,
  recommendations,
  children,
  ...rest
}: ProductDetailsProps) {
  const [variantPreview, setVariantPreview] = React.useState<OptionValue | null>(null);

  const value = React.useMemo<ProductDetailsContextValue>(
    () => ({
      product,
      selection,
      onSelectVariant,
      onOfferClick,
      buyLinkRel,
      priceHistory,
      isResolving,
      locale,
      variantPreview,
      setVariantPreview,
      fetchSimilar,
      recommendations,
    }),
    [
      product,
      selection,
      onSelectVariant,
      onOfferClick,
      buyLinkRel,
      priceHistory,
      isResolving,
      locale,
      variantPreview,
      fetchSimilar,
      recommendations,
    ],
  );

  return (
    <ProductDetailsContext.Provider value={value}>
      <div data-slot="product-details" {...rest}>
        {children}
      </div>
    </ProductDetailsContext.Provider>
  );
}

function Gallery({ className, ...rest }: React.ComponentProps<"div">) {
  const { product, variantPreview } = useProductDetails("ProductDetailsGallery");
  return (
    <ImageGallery
      images={product.images ?? []}
      previewSrc={variantPreview?.thumbnail_url ?? null}
      className={className}
      {...rest}
    />
  );
}

function Header({ className, ...rest }: React.ComponentProps<"div">) {
  const { product, locale } = useProductDetails("ProductDetailsHeader");
  const brands = (product.brands ?? []).map((brand) => brand.name).filter(Boolean);
  const offer = leadOffer(product.offers);

  return (
    <div className={cn("flex flex-col gap-2", className)} {...rest}>
      {brands.length > 0 ? (
        <span className="text-sm text-muted-foreground">{brands.join(" · ")}</span>
      ) : null}
      <h1 className="text-xl leading-tight font-semibold">{product.title}</h1>
      {offer ? (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-2xl font-semibold">{formatPrice(offer.price, locale)}</span>
          {isOnSale(offer.price) && offer.price.compare_at_price ? (
            <span className="text-base text-muted-foreground line-through">
              {formatCurrency(offer.price.compare_at_price, offer.price.currency, locale)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Variants({ className, ...rest }: React.ComponentProps<"div">) {
  const { product, selection, onSelectVariant, isResolving, setVariantPreview } = useProductDetails(
    "ProductDetailsVariants",
  );
  if (!product.variants || product.variants.options.length === 0) {
    return null;
  }
  return (
    <div
      aria-busy={isResolving}
      className={cn(isResolving && "pointer-events-none opacity-60", className)}
      {...rest}
    >
      <VariantSelector
        variants={product.variants}
        value={selection}
        onSelect={onSelectVariant}
        onValuePreview={setVariantPreview}
      />
    </div>
  );
}

function Offers({ className, ...rest }: React.ComponentProps<"div">) {
  const { product, onOfferClick, locale, buyLinkRel } = useProductDetails("ProductDetailsOffers");
  const offers = product.offers ?? [];
  if (offers.length === 0) {
    return null;
  }
  // Drop the heading when every offer is out of stock — OffersList already says so.
  const hasInStock = offers.some((offer) => isInStock(offer.availability));
  return (
    <div className={cn("flex flex-col gap-2", className)} {...rest}>
      {hasInStock ? (
        <h2 className="text-sm font-medium text-muted-foreground">Available at</h2>
      ) : null}
      <OffersList
        offers={offers}
        onOfferClick={onOfferClick}
        locale={locale}
        buyLinkRel={buyLinkRel}
      />
    </div>
  );
}

function PriceHistorySection({ className, ...rest }: React.ComponentProps<"div">) {
  const { priceHistory, locale } = useProductDetails("ProductDetailsPriceHistory");
  const statistics = priceHistory?.statistics ?? undefined;
  const history = priceHistory?.history ?? [];
  if (!statistics && history.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex flex-col gap-4", className)} {...rest}>
      <h2 className="text-sm font-medium text-muted-foreground">Price history</h2>
      {statistics ? <PriceRangeGauge statistics={statistics} locale={locale} /> : null}
      {history.length > 0 ? <PriceHistoryChart history={history} locale={locale} /> : null}
      <p className="text-xs text-muted-foreground">Based on the last 30 days.</p>
    </div>
  );
}

function Description({ className, ...rest }: React.ComponentProps<"div">) {
  const { product } = useProductDetails("ProductDetailsDescription");
  const features = product.key_features ?? [];
  if (!product.description && features.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex flex-col gap-3", className)} {...rest}>
      {product.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
      ) : null}
      {features.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {features.map((feature, index) => (
            <li key={`${feature}-${index}`} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Attributes({ className, ...rest }: React.ComponentProps<"div">) {
  const { product } = useProductDetails("ProductDetailsAttributes");
  if (!hasAttributes(product)) {
    return null;
  }
  return (
    <div className={cn("flex flex-col gap-2", className)} {...rest}>
      <h2 className="text-sm font-medium text-muted-foreground">Details</h2>
      <ProductAttributes product={product} />
    </div>
  );
}

export interface ProductDetailsRecommendationsProps
  extends Omit<React.ComponentProps<typeof ProductRecommendations>, "productId" | "fetchSimilar"> {
  fetchSimilar?: SimilarFetcher;
}

function Recommendations({ fetchSimilar, ...rest }: ProductDetailsRecommendationsProps) {
  const { product, fetchSimilar: contextFetcher, recommendations } = useProductDetails(
    "ProductDetailsRecommendations",
  );
  const fetcher = fetchSimilar ?? contextFetcher;
  if (!fetcher) {
    return null;
  }
  return (
    <ProductRecommendations
      productId={product.id}
      fetchSimilar={fetcher}
      {...recommendations}
      {...rest}
    />
  );
}

function hasAttributes(product: Product): boolean {
  return (
    Boolean(product.category) ||
    Object.keys(product.structured_attributes ?? {}).length > 0 ||
    (product.materials?.length ?? 0) > 0 ||
    Boolean(product.gender) ||
    Boolean(product.age)
  );
}

function DefaultLayout() {
  const { priceHistory, fetchSimilar } = useProductDetails("ProductDetails");

  const showPriceHistory =
    Boolean(priceHistory?.statistics) || (priceHistory?.history?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-8 md:grid-cols-2 md:items-start lg:gap-12">
        <Gallery className="self-start md:sticky md:top-4" />
        <div className="flex flex-col gap-6">
          <Header />
          <Variants />
          <Offers />
          <Description />
          <Attributes />
          {showPriceHistory ? (
            <>
              <Separator />
              <PriceHistorySection />
            </>
          ) : null}
        </div>
      </div>
      {fetchSimilar ? <Recommendations /> : null}
    </div>
  );
}

export function ProductDetails({ className, ...props }: ProductDetailsProps) {
  return (
    <Root className={cn("w-full", className)} {...props}>
      <DefaultLayout />
    </Root>
  );
}

export {
  Root as ProductDetailsRoot,
  Gallery as ProductDetailsGallery,
  Header as ProductDetailsHeader,
  Variants as ProductDetailsVariants,
  Offers as ProductDetailsOffers,
  PriceHistorySection as ProductDetailsPriceHistory,
  Description as ProductDetailsDescription,
  Attributes as ProductDetailsAttributes,
  Recommendations as ProductDetailsRecommendations,
};
