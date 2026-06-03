import * as React from "react";
import type { ProductDetail, ProductOffer, PriceStatistics } from "@channel3/sdk/resources";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/registry/default/components/product-card";
import { ProductGrid } from "@/registry/default/components/product-grid";
import { ProductCarousel } from "@/registry/default/components/product-carousel";
import { OffersList } from "@/registry/default/components/offers-list";
import { ImageGallery } from "@/registry/default/components/image-gallery";
import { VariantSelector } from "@/registry/default/components/variant-selector";
import { PriceRangeGauge } from "@/registry/default/components/price-range-gauge";
import { PriceHistoryChart } from "@/registry/default/components/price-history-chart";
import { ProductAttributes } from "@/registry/default/components/product-attributes";
import { ProductDetails } from "@/registry/default/components/product-details";
import { SearchBar } from "@/registry/default/components/search-bar";
import { ProductFilters } from "@/registry/default/components/product-filters";
import { ProductSearch } from "@/registry/default/components/product-search";
import {
  type VariantResolver,
  useVariantSelection,
} from "@/registry/default/hooks/use-variant-selection";
import { EMPTY_FILTERS, type SearchFiltersState, toSearchFilters } from "@/registry/default/lib/search";
import {
  cardFixtures,
  detailProduct,
  gridCanvasProducts,
  fakeFetchSimilar,
  fakeGetCategory,
  fakeSearch,
  fakeSearchBrands,
  fakeSearchCategories,
  gridProducts,
  priceHistory,
  priceStats,
  searchVariantProduct,
} from "./data";
import { DemoTile } from "./layout";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fakeResolve: VariantResolver = async ({ product, selection }) => {
  await delay(450);
  if (!product.variants) {
    return product;
  }
  return {
    ...product,
    variants: {
      ...product.variants,
      selected: product.variants.options.map((option) => ({
        name: option.name,
        label: selection[option.name] ?? option.values.find((value) => value.exists)?.label ?? "",
      })),
    },
  };
};

export function usePlaygroundHandlers() {
  const onSelect = React.useCallback(
    (product: ProductDetail) => console.info("card select", product.id),
    [],
  );
  const onSelectVariant = React.useCallback(
    (product: ProductDetail, value: ProductDetail.Variants.Option.Value) =>
      console.info("swatch navigate", product.id, value.label, value.product_id),
    [],
  );
  return { onSelect, onSelectVariant };
}

function VariantPanel({ product, title }: { product: ProductDetail; title: string }) {
  const [showJson, setShowJson] = React.useState(false);
  const { selection, isResolving, select } = useVariantSelection({ product, resolve: fakeResolve });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="flex items-center gap-2">
          {isResolving ? <Badge variant="secondary">Resolving…</Badge> : null}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowJson((v) => !v)}>
            {showJson ? "Hide JSON" : "JSON"}
          </Button>
        </div>
      </div>
      {product.variants ? (
        <VariantSelector
          variants={product.variants}
          value={selection}
          onSelect={(name, value) => select(name, value)}
        />
      ) : null}
      {showJson ? (
        <pre className="max-h-24 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
          {JSON.stringify(selection, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function SearchBarTile() {
  const [value, setValue] = React.useState("");
  return (
    <DemoTile
      id="search-bar"
      title="Search bar"
      description="Submit on Enter, clear, optional image search."
      span={6}
    >
      <SearchBar
        value={value}
        onValueChange={setValue}
        onSubmit={(query) => console.info("search submit", query)}
        onImageSelected={(file) => console.info("image search", file.name)}
      />
    </DemoTile>
  );
}

export function ProductCardTile() {
  const [skeleton, setSkeleton] = React.useState(false);
  const [showSwatches, setShowSwatches] = React.useState(true);
  const { onSelect, onSelectVariant } = usePlaygroundHandlers();
  const sale = cardFixtures[2]!;
  const swatches = cardFixtures[1]!;

  return (
    <DemoTile
      id="product-card"
      title="Product card"
      description="Tile with hover image swap. showSwatches controls the colorway thumbnail strip."
      span={6}
      controls={
        <>
          <Button size="sm" variant="outline" onClick={() => setShowSwatches((v) => !v)} disabled={skeleton}>
            {showSwatches ? "Hide swatches" : "Show swatches"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSkeleton((v) => !v)}>
            {skeleton ? "Live card" : "Skeleton"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {skeleton ? (
          <>
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </>
        ) : (
          <>
            <ProductCard
              product={sale}
              showSwatches={showSwatches}
              onSelect={onSelect}
              onSelectVariant={(v) => onSelectVariant(sale, v)}
            />
            <ProductCard
              product={swatches}
              showSwatches={showSwatches}
              onSelect={onSelect}
              onSelectVariant={(v) => onSelectVariant(swatches, v)}
            />
          </>
        )}
      </div>
    </DemoTile>
  );
}

export function VariantSelectorTile() {
  return (
    <DemoTile
      id="variant-selector"
      title="Variant selector"
      description="Detail hydrates stock tiers; search hits treat existing values as purchasable until re-fetched."
      span={12}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <VariantPanel product={detailProduct} title="Detail (availability hydrated)" />
        <VariantPanel product={searchVariantProduct} title="Search hit (availability null)" />
      </div>
    </DemoTile>
  );
}

export function ImageGalleryTile() {
  return (
    <DemoTile
      id="image-gallery"
      title="Image gallery"
      description="Carousel with synced thumbnail strip."
      span={5}
    >
      <ImageGallery images={detailProduct.images ?? []} alt={detailProduct.title} />
    </DemoTile>
  );
}

export function OffersListTile() {
  return (
    <DemoTile
      id="offers-list"
      title="Offers list"
      description="Merchant comparison, in-stock first."
      span={7}
    >
      <OffersList offers={detailProduct.offers ?? []} onOfferClick={(o) => console.info(o.domain)} />
    </DemoTile>
  );
}

export function ProductAttributesTile() {
  return (
    <DemoTile
      id="product-attributes"
      title="Product attributes"
      description="structured_attributes, materials, gender, age."
      span={4}
    >
      <ProductAttributes product={detailProduct} />
    </DemoTile>
  );
}

const GAUGE_LABELS: Record<string, string> = {
  low: "Lower than usual",
  typical: "Typical",
  high: "Higher than usual",
};

export function PriceComponentsTile() {
  const [status, setStatus] = React.useState<keyof typeof priceStats>("typical");
  const stats: PriceStatistics = priceStats[status];

  return (
    <DemoTile
      id="price-components"
      title="Price range gauge"
      description="Current price against historical min/max."
      span={8}
      controls={
        <>
          {(Object.keys(priceStats) as Array<keyof typeof priceStats>).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={status === key ? "default" : "outline"}
              onClick={() => setStatus(key)}
            >
              {GAUGE_LABELS[key]}
            </Button>
          ))}
        </>
      }
    >
      <PriceRangeGauge statistics={stats} />
    </DemoTile>
  );
}

export function PriceHistoryTile() {
  return (
    <DemoTile
      id="price-history-chart"
      title="Price history chart"
      description="Area chart of price over time."
      span={12}
    >
      <PriceHistoryChart history={priceHistory.history ?? []} />
    </DemoTile>
  );
}

export function ProductFiltersTile() {
  const [filters, setFilters] = React.useState<SearchFiltersState>(EMPTY_FILTERS);
  const [showPayload, setShowPayload] = React.useState(false);

  return (
    <DemoTile
      id="product-filters"
      title="Product filters"
      description="Sidebar panel with brand/category typeaheads and per-category attributes."
      span={12}
      controls={
        <Button size="sm" variant="outline" onClick={() => setShowPayload((v) => !v)}>
          {showPayload ? "Hide payload" : "API payload"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr] lg:items-start">
        <ProductFilters
          value={filters}
          onChange={setFilters}
          searchBrands={fakeSearchBrands}
          searchCategories={fakeSearchCategories}
          getCategory={fakeGetCategory}
          colorPercentages
        />
        {showPayload ? (
          <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
            {JSON.stringify(toSearchFilters(filters), null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground lg:pt-2">
            Toggle API payload to see the SearchFilters object from toSearchFilters().
          </p>
        )}
      </div>
    </DemoTile>
  );
}

export function ProductGridTile() {
  const [loading, setLoading] = React.useState(false);
  const [showEmpty, setShowEmpty] = React.useState(false);
  const [showSwatches, setShowSwatches] = React.useState(true);
  const { onSelect, onSelectVariant } = usePlaygroundHandlers();
  const gridDisabled = loading || showEmpty;

  return (
    <DemoTile
      id="product-grid"
      title="Product grid"
      description="Three rows of cards (fixtures repeated to fill the lg 4-column layout). showSwatches controls the colorway strip on each card."
      span={12}
      controls={
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSwatches((v) => !v)}
            disabled={gridDisabled}
          >
            {showSwatches ? "Hide swatches" : "Show swatches"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLoading((v) => !v)}>
            {loading ? "Products" : "Loading"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowEmpty((v) => !v)}>
            {showEmpty ? "Products" : "Empty"}
          </Button>
        </>
      }
    >
      <ProductGrid
        products={showEmpty ? [] : gridCanvasProducts}
        loading={loading}
        showSwatches={showSwatches}
        onSelect={onSelect}
        onSelectVariant={onSelectVariant}
      />
    </DemoTile>
  );
}

export function ProductCarouselTile() {
  const [loading, setLoading] = React.useState(false);
  const [swatches, setSwatches] = React.useState(true);
  const { onSelect, onSelectVariant } = usePlaygroundHandlers();
  const noImage: ProductDetail = {
    id: "x/no-image",
    title: "No image, no offers",
    structured_attributes: {},
  };

  return (
    <DemoTile
      id="product-carousel"
      title="Product carousel"
      description="Horizontal row; hover swatches to preview color on the card image."
      span={12}
      controls={
        <>
          <Button size="sm" variant="outline" onClick={() => setLoading((v) => !v)}>
            {loading ? "Products" : "Loading"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSwatches((v) => !v)}>
            {swatches ? "Hide swatches" : "Swatches"}
          </Button>
        </>
      }
    >
      <ProductCarousel
        title="More like this"
        products={[...gridProducts.slice(0, 5), noImage]}
        loading={loading}
        showSwatches={swatches}
        onSelect={onSelect}
        onSelectVariant={onSelectVariant}
      />
    </DemoTile>
  );
}

export function PdpBlock() {
  const { product, selection, isResolving, select } = useVariantSelection({
    product: detailProduct,
    resolve: fakeResolve,
  });
  const onOfferClick = (offer: ProductOffer) => console.info("offer click", offer.domain);

  return (
    <ProductDetails
      product={product}
      selection={selection}
      isResolving={isResolving}
      onSelectVariant={select}
      onOfferClick={onOfferClick}
      priceHistory={priceHistory}
      fetchSimilar={fakeFetchSimilar}
      recommendations={{
        eager: true,
        onSelect: (recommended) => console.info("rec select", recommended.id),
        onSelectVariant: (recommended, value) =>
          console.info("rec swatch", recommended.id, value.label),
      }}
    />
  );
}

export function ProductSearchBlock() {
  const [layout, setLayout] = React.useState<"sidebar" | "bar">("sidebar");
  const { onSelect, onSelectVariant } = usePlaygroundHandlers();

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setLayout("sidebar")} disabled={layout === "sidebar"}>
          Sidebar filters
        </Button>
        <Button size="sm" variant="outline" onClick={() => setLayout("bar")} disabled={layout === "bar"}>
          Bar filters
        </Button>
      </div>
      <ProductSearch
        key={layout}
        fetchSearch={fakeSearch}
        searchBrands={fakeSearchBrands}
        searchCategories={fakeSearchCategories}
        getCategory={fakeGetCategory}
        filtersLayout={layout}
        colorPercentages
        imageSearch
        onSelect={onSelect}
        onSelectVariant={onSelectVariant}
      />
    </>
  );
}
