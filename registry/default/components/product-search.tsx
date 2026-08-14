import * as React from "react";
import type { OptionValue, Product } from "@channel3/sdk/resources";
import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/registry/default/components/product-grid";
import { SearchBar } from "@/registry/default/components/search-bar";
import {
  type BrandSearcher,
  type CategoryLoader,
  type CategorySearcher,
  type WebsiteSearcher,
  ProductFilters,
  ProductFiltersBar,
  ProductFiltersRoot,
} from "@/registry/default/components/product-filters";
import {
  type SearchFetcher,
  useProductSearch,
} from "@/registry/default/hooks/use-product-search";

const filterTransition = "duration-200 ease-out";

function filterCollapseClass(open: boolean) {
  return cn(
    "grid transition-[grid-template-rows,opacity]",
    filterTransition,
    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
  );
}

/** Reads an image file as base64 (without the `data:` URI prefix). */
function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface ProductSearchProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  /** Server-side search fetcher (wraps `client.products.search` / `searchByImage`). */
  fetchSearch: SearchFetcher;
  searchBrands?: BrandSearcher;
  searchWebsites?: WebsiteSearcher;
  searchCategories?: CategorySearcher;
  getCategory?: CategoryLoader;
  filtersLayout?: "sidebar" | "bar";
  colorPercentages?: boolean;
  imageSearch?: boolean;
  searchOnMount?: boolean;
  paginate?: boolean;
  initialQuery?: string;
  placeholder?: string;
  onSelect?: (product: Product) => void;
  onSelectVariant?: (product: Product, value: OptionValue) => void;
  showSwatches?: boolean;
  locale?: string;
}

export function ProductSearch({
  fetchSearch,
  searchBrands,
  searchWebsites,
  searchCategories,
  getCategory,
  filtersLayout = "sidebar",
  colorPercentages = false,
  imageSearch = false,
  searchOnMount = false,
  paginate = true,
  initialQuery = "",
  placeholder,
  onSelect,
  onSelectVariant,
  showSwatches,
  locale,
  className,
  ...props
}: ProductSearchProps) {
  const {
    query,
    setQuery,
    filters,
    setFilters,
    searchByImage,
    image,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    sentinelRef,
    submit,
  } = useProductSearch({ fetchSearch, initialQuery, searchOnMount });

  const bar = filtersLayout === "bar";
  const [showFilters, setShowFilters] = React.useState(!bar);

  const handleImage = async (file: File) => {
    const base64Image = await readBase64(file);
    searchByImage({ base64Image, label: file.name });
  };

  const imageNotice = image ? (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Searching by image{image.label ? `: ${image.label}` : ""}</span>
      <button
        type="button"
        onClick={() => searchByImage(null)}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        Clear
      </button>
    </div>
  ) : null;

  const resultsBody =
    query.trim().length === 0 && image == null && results.length === 0 && !isLoading ? (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Search for products to get started.
      </p>
    ) : (
      <ProductGrid
        products={results}
        loading={isLoading}
        onSelect={onSelect}
        onSelectVariant={onSelectVariant}
        showSwatches={showSwatches}
        locale={locale}
      />
    );

  const resultsColumn = (
    <div className="flex flex-col gap-6">
      {resultsBody}
      {isLoadingMore ? (
        <p className="text-center text-sm text-muted-foreground">Loading more…</p>
      ) : null}
      {paginate && hasMore ? (
        <div ref={sentinelRef} aria-hidden className="h-px" />
      ) : null}
    </div>
  );

  const searchInput = (
    <SearchBar
      value={query}
      onValueChange={setQuery}
      onSubmit={submit}
      placeholder={placeholder}
      loading={isLoading}
      onImageSelected={imageSearch ? handleImage : undefined}
      className="w-full max-w-xl"
    />
  );

  const filterToggle = (visibility: string) => (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("size-10 shrink-0", visibility)}
      aria-label="Toggle filters"
      aria-expanded={showFilters}
      onClick={() => setShowFilters((value) => !value)}
    >
      <SlidersHorizontal className="size-4" />
    </Button>
  );

  if (bar) {
    return (
      <div data-slot="product-search" className={cn("flex flex-col gap-4", className)} {...props}>
        <div className="flex items-center justify-center gap-2">
          {searchInput}
          {filterToggle("")}
        </div>
        {imageNotice}
        <ProductFiltersRoot
          value={filters}
          onChange={setFilters}
          searchBrands={searchBrands}
          searchWebsites={searchWebsites}
          searchCategories={searchCategories}
          getCategory={getCategory}
          colorPercentages={colorPercentages}
        >
          <div className={filterCollapseClass(showFilters)}>
            <div className="overflow-hidden">
              <ProductFiltersBar />
            </div>
          </div>
        </ProductFiltersRoot>
        {resultsColumn}
      </div>
    );
  }

  return (
    <div data-slot="product-search" className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex items-center gap-2">
        {searchInput}
        {filterToggle("")}
      </div>

      {imageNotice}

      <div
        className={cn(
          "grid grid-cols-1 gap-6 md:transition-[grid-template-columns]",
          filterTransition,
          showFilters ? "md:grid-cols-[13rem_minmax(0,1fr)]" : "md:grid-cols-[0fr_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "min-w-0 overflow-hidden max-md:grid",
            filterCollapseClass(showFilters),
            !showFilters && "max-md:pointer-events-none",
          )}
          aria-hidden={!showFilters}
        >
          <div
            className={cn(
              "max-md:overflow-hidden md:w-[13rem] md:sticky md:top-4 md:transition-opacity",
              filterTransition,
              showFilters ? "md:opacity-100" : "md:pointer-events-none md:opacity-0",
            )}
          >
            <ProductFilters
              value={filters}
              onChange={setFilters}
              searchBrands={searchBrands}
              searchWebsites={searchWebsites}
              searchCategories={searchCategories}
              getCategory={getCategory}
              colorPercentages={colorPercentages}
            />
          </div>
        </aside>

        {resultsColumn}
      </div>
    </div>
  );
}
