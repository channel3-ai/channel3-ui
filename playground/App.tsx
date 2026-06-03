import * as React from "react";

import {
  ImageGalleryTile,
  OffersListTile,
  PdpBlock,
  PriceComponentsTile,
  PriceHistoryTile,
  ProductAttributesTile,
  ProductCardTile,
  ProductCarouselTile,
  ProductFiltersTile,
  ProductGridTile,
  ProductSearchBlock,
  SearchBarTile,
  VariantSelectorTile,
} from "./demos";
import { BlockSection, ComponentCanvas, PlaygroundChrome, ZoneHeading } from "./layout";

export default function App() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <PlaygroundChrome dark={dark} onToggleDark={() => setDark((value) => !value)}>
      <ZoneHeading
        id="components"
        title="Components"
        description="Atomic registry items in a canvas layout. Each tile is self-contained with its own controls."
      />
      <ComponentCanvas>
        <SearchBarTile />
        <ProductCardTile />
        <VariantSelectorTile />
        <ImageGalleryTile />
        <OffersListTile />
        <ProductAttributesTile />
        <PriceComponentsTile />
        <PriceHistoryTile />
        <ProductFiltersTile />
        <ProductGridTile />
        <ProductCarouselTile />
      </ComponentCanvas>

      <ZoneHeading
        id="blocks"
        title="Blocks"
        description="Compound layouts that wire multiple components and hooks together."
      />
      <div className="mt-4 flex flex-col gap-12">
        <BlockSection
          id="product-details"
          title="Product details"
          description="PDP: gallery, variants with server re-resolve, offers, price history, attributes, and recommendations."
        >
          <PdpBlock />
        </BlockSection>

        <BlockSection
          id="product-search"
          title="Product search"
          description="Search bar, filters, and infinite-scroll results. In sidebar mode, use the sliders button beside the search bar to show or hide the filter panel. Try nike, shoe, or an image upload."
        >
          <ProductSearchBlock />
        </BlockSection>
      </div>
    </PlaygroundChrome>
  );
}
