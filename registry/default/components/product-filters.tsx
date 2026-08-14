import * as React from "react";
import type { Brand, Category, CategoryAttribute, CategorySummary, Website } from "@channel3/sdk/resources";
import { Check, ChevronDown, Pipette, Plus, X } from "lucide-react";
import { HexColorPicker } from "react-colorful";

import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AGE_OPTIONS,
  AVAILABILITY_OPTIONS,
  categoryAttributeGroups,
  CONDITION_OPTIONS,
  countActiveFilters,
  countCategoryAttributes,
  deriveAttributes,
  type DimensionRange,
  EMPTY_FILTERS,
  facetCounts,
  GENDER_OPTIONS,
  LENGTH_UNIT_OPTIONS,
  type LengthUnit,
  normalizeHex,
  type SearchFiltersState,
  setAttributeValues,
  setColorPercentage,
  WEIGHT_UNIT_OPTIONS,
  type WeightUnit,
} from "@/registry/default/lib/search";
import { useAsyncOptions } from "@/registry/default/hooks/use-async-options";

/** Searches brands by free text (wraps `client.brands.search`). */
export type BrandSearcher = (query: string) => Promise<Brand[]>;
export type WebsiteSearcher = (query: string) => Promise<Website[]>;
/** Searches categories by free text (wraps `client.categories.search`). */
export type CategorySearcher = (query: string) => Promise<CategorySummary[]>;
/** Loads a full category (with attributes) by slug (wraps `client.categories.retrieve`). */
export type CategoryLoader = (slug: string) => Promise<Category>;

type FiltersUpdater = Partial<SearchFiltersState> | ((current: SearchFiltersState) => Partial<SearchFiltersState>);

interface ProductFiltersContextValue {
  filters: SearchFiltersState;
  update: (updater: FiltersUpdater) => void;
  searchBrands?: BrandSearcher;
  searchWebsites?: WebsiteSearcher;
  searchCategories?: CategorySearcher;
  getCategory?: CategoryLoader;
  /** Reveal a per-color target-share slider on each selected color. */
  colorPercentages: boolean;
}

const ProductFiltersContext = React.createContext<ProductFiltersContextValue | null>(null);

function useProductFilters(component: string): ProductFiltersContextValue {
  const context = React.useContext(ProductFiltersContext);
  if (!context) {
    throw new Error(`${component} must be used within <ProductFilters> or <ProductFiltersRoot>`);
  }
  return context;
}

export interface ProductFiltersProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  value: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
  searchBrands?: BrandSearcher;
  searchWebsites?: WebsiteSearcher;
  searchCategories?: CategorySearcher;
  getCategory?: CategoryLoader;
  /** Reveal a per-color target-share slider on each selected color. Defaults to off. */
  colorPercentages?: boolean;
}

function Root({
  value,
  onChange,
  searchBrands,
  searchWebsites,
  searchCategories,
  getCategory,
  colorPercentages = false,
  children,
  ...rest
}: ProductFiltersProps & { children: React.ReactNode }) {
  const ref = React.useRef(value);
  ref.current = value;

  const update = React.useCallback(
    (updater: FiltersUpdater) => {
      const base = ref.current;
      const patch = typeof updater === "function" ? updater(base) : updater;
      const next = { ...base, ...patch };
      ref.current = next;
      onChange(next);
    },
    [onChange],
  );

  const context = React.useMemo<ProductFiltersContextValue>(
    () => ({ filters: value, update, searchBrands, searchWebsites, searchCategories, getCategory, colorPercentages }),
    [value, update, searchBrands, searchWebsites, searchCategories, getCategory, colorPercentages],
  );

  return (
    <ProductFiltersContext.Provider value={context}>
      <div data-slot="product-filters" {...rest}>
        {children}
      </div>
    </ProductFiltersContext.Provider>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className={cn(filterPillClass(true), "max-w-full min-w-0 pr-1")}>
      <span
        className="inline-flex min-w-0 items-center gap-1 overflow-hidden"
        title={typeof children === "string" ? children : undefined}
      >
        {typeof children === "string" ? (
          <span className="truncate">{children}</span>
        ) : (
          children
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

const TOGGLE_FACET_CLASS = "flex flex-wrap gap-1.5";

const FILTER_PILL_BASE =
  "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50";

function filterPillClass(selected: boolean) {
  return cn(
    FILTER_PILL_BASE,
    selected
      ? "border-foreground/40 bg-accent text-accent-foreground"
      : "border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function parseNumberInput(raw: string): number | null {
  if (raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

const THIN_SCROLLBAR_CLASS =
  "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border";

function sliderThumb(value: number | readonly number[], index: number): number | undefined {
  if (Array.isArray(value)) {
    return value[index];
  }
  return index === 0 ? (value as number) : undefined;
}

function priceFromSliderRange(
  range: number | readonly number[],
  max: number,
): { minPrice: number | null; maxPrice: number | null } {
  const low = sliderThumb(range, 0) ?? 0;
  const high = sliderThumb(range, 1) ?? max;
  return {
    minPrice: low <= 0 ? null : low,
    maxPrice: high >= max ? null : high,
  };
}

function PriceControl({ max = 1000, step = 10 }: { max?: number; step?: number }) {
  const { filters, update } = useProductFilters("ProductFiltersPrice");
  const { minPrice, maxPrice } = filters.price;

  const setPrice = (next: { minPrice?: number | null; maxPrice?: number | null }) =>
    update((current) => ({ price: { ...current.price, ...next } }));

  const sliderDefault: [number, number] = [minPrice ?? 0, maxPrice ?? max];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            aria-label="Minimum price"
            placeholder="Min"
            value={minPrice ?? ""}
            onChange={(event) => setPrice({ minPrice: parseNumberInput(event.target.value) })}
            className={cn("pl-6", NO_SPINNER_CLASS)}
          />
        </div>
        <span className="text-muted-foreground">–</span>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            aria-label="Maximum price"
            placeholder="Max"
            value={maxPrice ?? ""}
            onChange={(event) => setPrice({ maxPrice: parseNumberInput(event.target.value) })}
            className={cn("pl-6", NO_SPINNER_CLASS)}
          />
        </div>
      </div>
      <Slider
        key={`${sliderDefault[0]}-${sliderDefault[1]}`}
        min={0}
        max={max}
        step={step}
        defaultValue={sliderDefault}
        onValueCommit={(range) => setPrice(priceFromSliderRange(range, max))}
        aria-label="Price range"
        className="mt-1"
      />
    </div>
  );
}

function Price(props: { max?: number; step?: number }) {
  return (
    <Field label="Price">
      <PriceControl {...props} />
    </Field>
  );
}

type ToggleFacetProps<V extends string> =
  | {
      type: "single";
      options: ReadonlyArray<{ value: V; label: string }>;
      value: V | null;
      onChange: (value: V | null) => void;
    }
  | {
      type: "multiple";
      options: ReadonlyArray<{ value: V; label: string }>;
      value: V[];
      onChange: (value: V[]) => void;
    };

function ToggleFacet<V extends string>(props: ToggleFacetProps<V>) {
  const isSelected = (value: V) =>
    props.type === "single" ? props.value === value : props.value.includes(value);

  const toggle = (value: V) => {
    if (props.type === "single") {
      props.onChange(props.value === value ? null : value);
      return;
    }
    props.onChange(
      props.value.includes(value)
        ? props.value.filter((entry) => entry !== value)
        : [...props.value, value],
    );
  };

  return (
    <div className={TOGGLE_FACET_CLASS}>
      {props.options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option.value)}
            className={filterPillClass(selected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function GenderControl() {
  const { filters, update } = useProductFilters("ProductFiltersGender");
  return (
    <ToggleFacet
      type="single"
      options={GENDER_OPTIONS}
      value={filters.gender}
      onChange={(gender) => update({ gender })}
    />
  );
}

function Gender() {
  return (
    <Field label="Gender">
      <GenderControl />
    </Field>
  );
}

function AgeControl() {
  const { filters, update } = useProductFilters("ProductFiltersAge");
  return (
    <ToggleFacet
      type="multiple"
      options={AGE_OPTIONS}
      value={filters.age}
      onChange={(age) => update({ age })}
    />
  );
}

function Age() {
  return (
    <Field label="Age">
      <AgeControl />
    </Field>
  );
}

function ConditionControl() {
  const { filters, update } = useProductFilters("ProductFiltersCondition");
  return (
    <ToggleFacet
      type="single"
      options={CONDITION_OPTIONS}
      value={filters.condition}
      onChange={(condition) => update({ condition })}
    />
  );
}

function Condition() {
  return (
    <Field label="Condition">
      <ConditionControl />
    </Field>
  );
}

function AvailabilityControl() {
  const { filters, update } = useProductFilters("ProductFiltersAvailability");
  return (
    <ToggleFacet
      type="multiple"
      options={AVAILABILITY_OPTIONS}
      value={filters.availability}
      onChange={(availability) => update({ availability })}
    />
  );
}

function Availability() {
  return (
    <Field label="Availability">
      <AvailabilityControl />
    </Field>
  );
}

function UnitDropdown<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: V; label: string }>;
  value: V;
  onChange: (value: V) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={label}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 gap-1 px-2 text-xs")}
      >
        {value}
        <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-[4.5rem] p-1">
        <ul>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                {option.label}
                {option.value === value ? <Check className="size-3.5" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function DimensionRow({
  label,
  range,
  onChange,
}: {
  label: string;
  range: DimensionRange;
  onChange: (next: Partial<DimensionRange>) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-sm text-muted-foreground">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        aria-label={`Minimum ${label.toLowerCase()}`}
        placeholder="Min"
        value={range.min ?? ""}
        onChange={(event) => onChange({ min: parseNumberInput(event.target.value) })}
        className={cn("h-8 flex-1", NO_SPINNER_CLASS)}
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        aria-label={`Maximum ${label.toLowerCase()}`}
        placeholder="Max"
        value={range.max ?? ""}
        onChange={(event) => onChange({ max: parseNumberInput(event.target.value) })}
        className={cn("h-8 flex-1", NO_SPINNER_CLASS)}
      />
    </div>
  );
}

function DimensionsControl() {
  const { filters, update } = useProductFilters("ProductFiltersDimensions");
  const { dimensions } = filters;

  const setRange = (
    field: "length" | "width" | "height" | "weight",
    next: Partial<DimensionRange>,
  ) =>
    update((current) => ({
      dimensions: {
        ...current.dimensions,
        [field]: { ...current.dimensions[field], ...next },
      },
    }));

  const setLengthUnit = (lengthUnit: LengthUnit) =>
    update((current) => ({ dimensions: { ...current.dimensions, lengthUnit } }));
  const setWeightUnit = (weightUnit: WeightUnit) =>
    update((current) => ({ dimensions: { ...current.dimensions, weightUnit } }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Length</span>
          <UnitDropdown
            label="Length unit"
            options={LENGTH_UNIT_OPTIONS}
            value={dimensions.lengthUnit}
            onChange={setLengthUnit}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Weight</span>
          <UnitDropdown
            label="Weight unit"
            options={WEIGHT_UNIT_OPTIONS}
            value={dimensions.weightUnit}
            onChange={setWeightUnit}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <DimensionRow
          label="Length"
          range={dimensions.length}
          onChange={(next) => setRange("length", next)}
        />
        <DimensionRow
          label="Width"
          range={dimensions.width}
          onChange={(next) => setRange("width", next)}
        />
        <DimensionRow
          label="Height"
          range={dimensions.height}
          onChange={(next) => setRange("height", next)}
        />
        <DimensionRow
          label="Weight"
          range={dimensions.weight}
          onChange={(next) => setRange("weight", next)}
        />
      </div>
    </div>
  );
}

function DimensionsField() {
  return (
    <Field label="Dimensions">
      <DimensionsControl />
    </Field>
  );
}

function ColorsControl() {
  const { filters, update, colorPercentages } = useProductFilters("ProductFiltersColors");
  const [draft, setDraft] = React.useState("#3b82f6");

  const addColor = (raw: string) => {
    const hex = normalizeHex(raw);
    if (!hex || filters.colors.some((color) => color.hex === hex)) {
      return;
    }
    update((current) => ({ colors: [...current.colors, { hex }] }));
    setDraft(hex);
  };

  const removeColor = (hex: string) =>
    update((current) => ({ colors: current.colors.filter((color) => color.hex !== hex) }));

  const setPercentage = (hex: string, percentage: number | null) =>
    update((current) => ({ colors: setColorPercentage(current.colors, hex, percentage) }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger
            type="button"
            aria-label="Open color picker"
            className="group relative size-8 shrink-0 overflow-hidden rounded-md border ring-offset-background transition-all hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="absolute inset-0" style={{ backgroundColor: draft }} />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
              <Pipette className="size-4 drop-shadow" />
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3">
            <div className="flex flex-col gap-3">
              <HexColorPicker color={draft} onChange={setDraft} />
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addColor(draft);
                  }
                }}
                spellCheck={false}
                aria-label="Hex color"
                className="h-8 font-mono"
              />
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addColor(draft);
            }
          }}
          spellCheck={false}
          aria-label="Hex color"
          className="h-8 w-28 font-mono"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => addColor(draft)}>
          Add
        </Button>
      </div>

      {filters.colors.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filters.colors.map((color) => (
            <div key={color.hex} className="flex items-center gap-2">
              <span
                className="size-5 shrink-0 rounded-full border"
                style={{ backgroundColor: color.hex }}
              />
              <span className="font-mono text-xs">{color.hex}</span>
              {colorPercentages ? (
                <div className="flex flex-1 items-center gap-2">
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[Math.round((color.percentage ?? 0) * 100)]}
                    onValueChange={(value) => {
                      const next = sliderThumb(value, 0) ?? 0;
                      setPercentage(color.hex, next <= 0 ? null : next / 100);
                    }}
                    aria-label={`Target share for ${color.hex}`}
                    className="flex-1"
                  />
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                    {color.percentage != null ? `${Math.round(color.percentage * 100)}%` : "—"}
                  </span>
                </div>
              ) : (
                <span className="flex-1" />
              )}
              <button
                type="button"
                onClick={() => removeColor(color.hex)}
                aria-label={`Remove ${color.hex}`}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Colors() {
  return (
    <Field label="Color">
      <ColorsControl />
    </Field>
  );
}

interface TypeaheadOptionProps<T> {
  placeholder: string;
  fetcher: (query: string) => Promise<T[]>;
  getKey: (option: T) => string;
  renderOption: (option: T) => React.ReactNode;
  onPick: (option: T) => void;
}

function OptionList<T>({
  query,
  options,
  isLoading,
  getKey,
  renderOption,
  onPick,
}: {
  query: string;
  options: T[];
  isLoading: boolean;
  getKey: (option: T) => string;
  renderOption: (option: T) => React.ReactNode;
  onPick: (option: T) => void;
}) {
  return (
    <ul className={cn("max-h-60 overflow-auto p-1", THIN_SCROLLBAR_CLASS)}>
      {isLoading ? (
        <li className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</li>
      ) : null}
      {!isLoading && options.length === 0 && query.trim() ? (
        <li className="px-2 py-1.5 text-sm text-muted-foreground">No matches</li>
      ) : null}
      {options.map((option) => (
        <li key={getKey(option)}>
          <button
            type="button"
            onClick={() => onPick(option)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
          >
            {renderOption(option)}
          </button>
        </li>
      ))}
    </ul>
  );
}

function InlineTypeahead<T>({
  placeholder,
  fetcher,
  getKey,
  renderOption,
  onPick,
  autoFocus = false,
}: TypeaheadOptionProps<T> & { autoFocus?: boolean }) {
  const { query, setQuery, options, isLoading } = useAsyncOptions<T>({ fetch: fetcher });
  return (
    <div className="flex flex-col">
      <Input
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="h-8"
      />
      {query.trim() ? (
        <OptionList
          query={query}
          options={options}
          isLoading={isLoading}
          getKey={getKey}
          renderOption={renderOption}
          onPick={(option) => {
            onPick(option);
            setQuery("");
          }}
        />
      ) : null}
    </div>
  );
}

function Typeahead<T>({
  triggerLabel,
  ...rest
}: TypeaheadOptionProps<T> & { triggerLabel: string }) {
  const [open, setOpen] = React.useState(false);
  const { query, setQuery, options, isLoading } = useAsyncOptions<T>({ fetch: rest.fetcher });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit gap-1.5")}
      >
        <Plus className="size-4" />
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={rest.placeholder}
            className="h-8"
          />
        </div>
        <OptionList
          query={query}
          options={options}
          isLoading={isLoading}
          getKey={rest.getKey}
          renderOption={rest.renderOption}
          onPick={(option) => {
            rest.onPick(option);
            setOpen(false);
            setQuery("");
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function BrandsControl({ inline = false, autoFocus = false }: { inline?: boolean; autoFocus?: boolean }) {
  const { filters, update, searchBrands } = useProductFilters("ProductFiltersBrands");
  if (!searchBrands) {
    return null;
  }

  const add = (brand: Brand) =>
    update((current) =>
      current.brands.some((existing) => existing.id === brand.id)
        ? {}
        : { brands: [...current.brands, brand] },
    );
  const remove = (id: string) =>
    update((current) => ({ brands: current.brands.filter((brand) => brand.id !== id) }));

  const renderOption = (brand: Brand) => (
    <>
      {brand.logo_url ? (
        <img src={brand.logo_url} alt="" className="size-5 rounded object-contain" />
      ) : null}
      <span>{brand.name}</span>
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      {inline ? (
        <InlineTypeahead<Brand>
          placeholder="Search brands"
          fetcher={searchBrands}
          getKey={(brand) => brand.id}
          onPick={add}
          renderOption={renderOption}
          autoFocus={autoFocus}
        />
      ) : (
        <Typeahead<Brand>
          triggerLabel="Add brand"
          placeholder="Search brands"
          fetcher={searchBrands}
          getKey={(brand) => brand.id}
          onPick={add}
          renderOption={renderOption}
        />
      )}
      {filters.brands.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.brands.map((brand) => (
            <Chip key={brand.id} onRemove={() => remove(brand.id)}>
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt=""
                  className="size-4 shrink-0 rounded object-contain"
                />
              ) : null}
              <span className="truncate">{brand.name}</span>
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Brands() {
  const { searchBrands } = useProductFilters("ProductFiltersBrands");
  if (!searchBrands) {
    return null;
  }
  return (
    <Field label="Brands">
      <BrandsControl />
    </Field>
  );
}

function websiteLabel(website: Website): string {
  return website.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function WebsitesControl({ inline = false, autoFocus = false }: { inline?: boolean; autoFocus?: boolean }) {
  const { filters, update, searchWebsites } = useProductFilters("ProductFiltersWebsites");
  if (!searchWebsites) {
    return null;
  }

  const add = (website: Website) =>
    update((current) =>
      current.websites.some((existing) => existing.id === website.id)
        ? {}
        : { websites: [...current.websites, website] },
    );
  const remove = (id: string) =>
    update((current) => ({ websites: current.websites.filter((website) => website.id !== id) }));

  const renderOption = (website: Website) => <span>{websiteLabel(website)}</span>;

  return (
    <div className="flex flex-col gap-2">
      {inline ? (
        <InlineTypeahead<Website>
          placeholder="Search websites"
          fetcher={searchWebsites}
          getKey={(website) => website.id}
          onPick={add}
          renderOption={renderOption}
          autoFocus={autoFocus}
        />
      ) : (
        <Typeahead<Website>
          triggerLabel="Add website"
          placeholder="Search websites"
          fetcher={searchWebsites}
          getKey={(website) => website.id}
          onPick={add}
          renderOption={renderOption}
        />
      )}
      {filters.websites.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.websites.map((website) => (
            <Chip key={website.id} onRemove={() => remove(website.id)}>
              {websiteLabel(website)}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Websites() {
  const { searchWebsites } = useProductFilters("ProductFiltersWebsites");
  if (!searchWebsites) {
    return null;
  }
  return (
    <Field label="Websites">
      <WebsitesControl />
    </Field>
  );
}

function CategoryControl({ inline = false, autoFocus = false }: { inline?: boolean; autoFocus?: boolean }) {
  const { filters, update, searchCategories, getCategory } = useProductFilters(
    "ProductFiltersCategory",
  );

  if (!searchCategories) {
    return null;
  }

  const add = async (category: CategorySummary) => {
    if (filters.categories.some((existing) => existing.slug === category.slug)) {
      return;
    }
    update((current) => {
      const categories = [...current.categories, category];
      return {
        categories,
        ...deriveAttributes(categories, current.attributesByCategory, current.attributes),
      };
    });

    if (getCategory && !(category.slug in filters.attributesByCategory)) {
      let attributes: CategoryAttribute[] = [];
      try {
        const full = await getCategory(category.slug);
        attributes = full.attributes ?? [];
      } catch {
        attributes = [];
      }
      update((current) => {
        const byCategory = { ...current.attributesByCategory, [category.slug]: attributes };
        return deriveAttributes(current.categories, byCategory, current.attributes);
      });
    }
  };

  const remove = (slug: string) =>
    update((current) => {
      const categories = current.categories.filter((category) => category.slug !== slug);
      const byCategory = { ...current.attributesByCategory };
      delete byCategory[slug];
      return { categories, ...deriveAttributes(categories, byCategory, current.attributes) };
    });

  const renderOption = (category: CategorySummary) => (
    <div className="flex flex-col">
      <span>{category.title}</span>
      {category.path && category.path.length > 1 ? (
        <span className="text-xs text-muted-foreground">
          {category.path.map((ref) => ref.title).join(" › ")}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {inline ? (
        <InlineTypeahead<CategorySummary>
          placeholder="Search categories"
          fetcher={searchCategories}
          getKey={(category) => category.slug}
          onPick={add}
          renderOption={renderOption}
          autoFocus={autoFocus}
        />
      ) : (
        <Typeahead<CategorySummary>
          triggerLabel="Add category"
          placeholder="Search categories"
          fetcher={searchCategories}
          getKey={(category) => category.slug}
          onPick={add}
          renderOption={renderOption}
        />
      )}
      {filters.categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.categories.map((category) => (
            <Chip key={category.slug} onRemove={() => remove(category.slug)}>
              {category.title}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryField() {
  const { searchCategories } = useProductFilters("ProductFiltersCategory");
  if (!searchCategories) {
    return null;
  }
  return (
    <Field label="Category">
      <CategoryControl />
    </Field>
  );
}

function AttributeField({
  attribute,
  showLabel = true,
}: {
  attribute: CategoryAttribute;
  showLabel?: boolean;
}) {
  const { filters, update } = useProductFilters("ProductFiltersAttributes");
  const control = (
    <ToggleFacet
      type="multiple"
      options={(attribute.values ?? []).map((option) => ({ value: option, label: option }))}
      value={filters.attributes[attribute.slug] ?? []}
      onChange={(value) =>
        update((current) => ({
          attributes: setAttributeValues(current.attributes, attribute.slug, value),
        }))
      }
    />
  );

  if (!showLabel) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{attribute.name}</span>
        {control}
      </div>
    );
  }

  return <Field label={attribute.name}>{control}</Field>;
}

function CategoryAttributeFields({ attributes }: { attributes: CategoryAttribute[] }) {
  return (
    <div className="flex flex-col gap-4">
      {attributes.map((attribute) => (
        <AttributeField key={attribute.slug} attribute={attribute} />
      ))}
    </div>
  );
}

function Attributes() {
  const { filters } = useProductFilters("ProductFiltersAttributes");
  const groups = categoryAttributeGroups(filters);
  if (groups.length === 0) {
    return null;
  }

  return (
    <>
      {groups.map(({ category, attributes }) => (
        <Field key={category.slug} label={category.title}>
          <CategoryAttributeFields attributes={attributes} />
        </Field>
      ))}
    </>
  );
}

function ActiveSummary({ className, ...rest }: React.ComponentProps<"div">) {
  const { filters, update } = useProductFilters("ProductFiltersActiveSummary");
  const count = countActiveFilters(filters);
  return (
    <div
      className={cn("flex h-8 items-center justify-between", className)}
      {...rest}
    >
      <span className="text-sm font-medium">
        Filters
        {count > 0 ? <span className="ml-1.5 text-muted-foreground">({count})</span> : null}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => update(() => EMPTY_FILTERS)}
        className={cn(!count && "pointer-events-none invisible")}
        aria-hidden={count === 0}
        tabIndex={count === 0 ? -1 : undefined}
      >
        Clear all
      </Button>
    </div>
  );
}

function FacetPopover({
  label,
  count,
  contentClassName,
  children,
}: {
  label: string;
  count: number;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          count > 0 && "border-foreground/40",
        )}
      >
        {label}
        {count > 0 ? (
          <Badge variant="secondary" className="size-5 justify-center rounded-full px-0 tabular-nums">
            {count}
          </Badge>
        ) : null}
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-auto max-w-sm p-3", contentClassName)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export interface ProductFiltersBarProps extends React.ComponentProps<"div"> {
  priceMax?: number;
  priceStep?: number;
}

function Bar({ priceMax, priceStep, className, ...rest }: ProductFiltersBarProps) {
  const { filters, update, searchBrands, searchWebsites, searchCategories } = useProductFilters("ProductFiltersBar");
  const counts = facetCounts(filters);
  const total = countActiveFilters(filters);
  const attributeGroups = categoryAttributeGroups(filters);

  return (
    <div
      data-slot="product-filters-bar"
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
      {...rest}
    >
      <FacetPopover label="Price" count={counts.price} contentClassName="w-64">
        <PriceControl max={priceMax} step={priceStep} />
      </FacetPopover>
      <FacetPopover label="Gender" count={counts.gender}>
        <GenderControl />
      </FacetPopover>
      <FacetPopover label="Age" count={counts.age}>
        <AgeControl />
      </FacetPopover>
      <FacetPopover label="Condition" count={counts.condition}>
        <ConditionControl />
      </FacetPopover>
      <FacetPopover label="Availability" count={counts.availability}>
        <AvailabilityControl />
      </FacetPopover>
      <FacetPopover label="Dimensions" count={counts.dimensions} contentClassName="w-72">
        <DimensionsControl />
      </FacetPopover>
      <FacetPopover label="Color" count={counts.colors} contentClassName="min-w-[14rem]">
        <ColorsControl />
      </FacetPopover>
      {searchBrands ? (
        <FacetPopover label="Brands" count={counts.brands} contentClassName="min-w-[14rem]">
          <BrandsControl inline autoFocus />
        </FacetPopover>
      ) : null}
      {searchWebsites ? (
        <FacetPopover label="Websites" count={counts.websites} contentClassName="min-w-[14rem]">
          <WebsitesControl inline autoFocus />
        </FacetPopover>
      ) : null}
      {searchCategories ? (
        <FacetPopover label="Category" count={counts.categories} contentClassName="min-w-[14rem]">
          <CategoryControl inline autoFocus />
        </FacetPopover>
      ) : null}
      {attributeGroups.map(({ category, attributes }) => (
        <FacetPopover
          key={category.slug}
          label={category.title}
          count={countCategoryAttributes(filters, attributes)}
        >
          <div className="flex flex-col gap-3">
            {attributes.map((attribute) => (
              <AttributeField key={attribute.slug} attribute={attribute} showLabel={false} />
            ))}
          </div>
        </FacetPopover>
      ))}
      {total > 0 ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => update(() => EMPTY_FILTERS)}>
          Clear all
        </Button>
      ) : null}
    </div>
  );
}

function FacetSection({
  value,
  label,
  count,
  children,
}: {
  value: string;
  label: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <span className="flex items-center gap-1.5">
          {label}
          {count > 0 ? (
            <Badge
              variant="secondary"
              className="size-5 justify-center rounded-full px-0 tabular-nums"
            >
              {count}
            </Badge>
          ) : null}
        </span>
      </AccordionTrigger>
      {/* Slight inset so focus rings/shadows aren't clipped by the content's
          overflow-hidden (needed for the open/close height animation). */}
      <AccordionContent className="px-1 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

function DefaultLayout() {
  const { filters, searchBrands, searchWebsites, searchCategories } = useProductFilters("ProductFilters");
  const counts = facetCounts(filters);
  const attributeGroups = categoryAttributeGroups(filters);

  // Seed from the initial filters only — later edits must not reopen sections.
  const [defaultOpen] = React.useState<string[]>(() => {
    const initial = facetCounts(filters);
    const entries: Array<[string, number]> = [
      ["price", initial.price],
      ["gender", initial.gender],
      ["age", initial.age],
      ["condition", initial.condition],
      ["availability", initial.availability],
      ["dimensions", initial.dimensions],
      ["colors", initial.colors],
      ["brands", initial.brands],
      ["websites", initial.websites],
      ["categories", initial.categories],
    ];
    const open = entries.filter(([, count]) => count > 0).map(([key]) => key);
    for (const { category } of categoryAttributeGroups(filters)) {
      open.push(`attr-${category.slug}`);
    }
    return open;
  });

  return (
    <div className="flex flex-col gap-2">
      <ActiveSummary />
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        <FacetSection value="price" label="Price" count={counts.price}>
          <PriceControl />
        </FacetSection>
        <FacetSection value="gender" label="Gender" count={counts.gender}>
          <GenderControl />
        </FacetSection>
        <FacetSection value="age" label="Age" count={counts.age}>
          <AgeControl />
        </FacetSection>
        <FacetSection value="condition" label="Condition" count={counts.condition}>
          <ConditionControl />
        </FacetSection>
        <FacetSection value="availability" label="Availability" count={counts.availability}>
          <AvailabilityControl />
        </FacetSection>
        <FacetSection value="dimensions" label="Dimensions" count={counts.dimensions}>
          <DimensionsControl />
        </FacetSection>
        <FacetSection value="colors" label="Color" count={counts.colors}>
          <ColorsControl />
        </FacetSection>
        {searchBrands ? (
          <FacetSection value="brands" label="Brands" count={counts.brands}>
            <BrandsControl inline />
          </FacetSection>
        ) : null}
        {searchWebsites ? (
          <FacetSection value="websites" label="Websites" count={counts.websites}>
            <WebsitesControl inline />
          </FacetSection>
        ) : null}
        {searchCategories ? (
          <FacetSection value="categories" label="Category" count={counts.categories}>
            <CategoryControl inline />
          </FacetSection>
        ) : null}
        {attributeGroups.map(({ category, attributes }) => (
          <FacetSection
            key={category.slug}
            value={`attr-${category.slug}`}
            label={category.title}
            count={countCategoryAttributes(filters, attributes)}
          >
            <div className="flex flex-col gap-3">
              {attributes.map((attribute) => (
                <AttributeField key={attribute.slug} attribute={attribute} showLabel={false} />
              ))}
            </div>
          </FacetSection>
        ))}
      </Accordion>
    </div>
  );
}

export function ProductFilters({ className, ...props }: ProductFiltersProps) {
  return (
    <Root className={cn("w-full", className)} {...props}>
      <DefaultLayout />
    </Root>
  );
}

export {
  Root as ProductFiltersRoot,
  Bar as ProductFiltersBar,
  ActiveSummary as ProductFiltersActiveSummary,
  Price as ProductFiltersPrice,
  Gender as ProductFiltersGender,
  Age as ProductFiltersAge,
  Condition as ProductFiltersCondition,
  Availability as ProductFiltersAvailability,
  DimensionsField as ProductFiltersDimensions,
  Colors as ProductFiltersColors,
  Brands as ProductFiltersBrands,
  Websites as ProductFiltersWebsites,
  CategoryField as ProductFiltersCategory,
  Attributes as ProductFiltersAttributes,
};
