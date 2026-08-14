import type {
  Brand,
  CategoryAttribute,
  CategorySummary,
  OfferAvailabilityStatus,
  SearchFilters,
  Website,
} from "@channel3/sdk/resources";

/** Gender values accepted by the search filter (`unisex` products are matched implicitly). */
export type GenderFilter = NonNullable<SearchFilters["gender"]>;
export type AgeFilter = NonNullable<SearchFilters["age"]>[number];
export type ConditionFilter = NonNullable<SearchFilters["conditions"]>[number];
export type AvailabilityFilterValue = OfferAvailabilityStatus;
export type LengthUnit = NonNullable<NonNullable<SearchFilters["dimensions"]>["length"]>["unit"];
export type WeightUnit = NonNullable<NonNullable<SearchFilters["dimensions"]>["weight"]>["unit"];

export interface ColorFilter {
  hex: string;
  percentage?: number | null;
}

export interface DimensionRange {
  min: number | null;
  max: number | null;
}

/** `length`/`width`/`height` share `lengthUnit`; `weight` uses `weightUnit`. */
export interface DimensionsFilter {
  length: DimensionRange;
  width: DimensionRange;
  height: DimensionRange;
  weight: DimensionRange;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
}

/**
 * UI-friendly mirror of the SDK {@link SearchFilters}. Components read and write
 * this shape; {@link toSearchFilters} converts it to the API payload on the
 * consumer's server. Brand and category objects are kept whole (not just ids)
 * so chips can show names/logos without an extra lookup, and
 * `attributesByCategory` caches the attribute definitions of the selected
 * categories so the attribute field can render without re-fetching.
 */
export interface SearchFiltersState {
  price: { minPrice: number | null; maxPrice: number | null };
  gender: GenderFilter | null;
  age: AgeFilter[];
  condition: ConditionFilter | null;
  availability: OfferAvailabilityStatus[];
  colors: ColorFilter[];
  brands: Brand[];
  websites: Website[];
  categories: CategorySummary[];
  attributesByCategory: Record<string, CategoryAttribute[]>;
  /** Selected attribute values keyed by attribute slug (OR within, AND across keys). */
  attributes: Record<string, string[]>;
  dimensions: DimensionsFilter;
}

export const DEFAULT_LENGTH_UNIT: LengthUnit = "in";
export const DEFAULT_WEIGHT_UNIT: WeightUnit = "lb";

export interface DefaultDimensionUnits {
  lengthUnit?: LengthUnit;
  weightUnit?: WeightUnit;
}

export function createEmptyFilters(units?: DefaultDimensionUnits): SearchFiltersState {
  return {
    price: { minPrice: null, maxPrice: null },
    gender: null,
    age: [],
    condition: null,
    availability: [],
    colors: [],
    brands: [],
    websites: [],
    categories: [],
    attributesByCategory: {},
    attributes: {},
    dimensions: {
      length: { min: null, max: null },
      width: { min: null, max: null },
      height: { min: null, max: null },
      weight: { min: null, max: null },
      lengthUnit: units?.lengthUnit ?? DEFAULT_LENGTH_UNIT,
      weightUnit: units?.weightUnit ?? DEFAULT_WEIGHT_UNIT,
    },
  };
}

export const EMPTY_FILTERS: SearchFiltersState = createEmptyFilters();

export const GENDER_OPTIONS: ReadonlyArray<{ value: GenderFilter; label: string }> = [
  { value: "female", label: "Women" },
  { value: "male", label: "Men" },
];

export const AGE_OPTIONS: ReadonlyArray<{ value: AgeFilter; label: string }> = [
  { value: "adult", label: "Adult" },
  { value: "kids", label: "Kids" },
  { value: "toddler", label: "Toddler" },
  { value: "infant", label: "Infant" },
  { value: "newborn", label: "Newborn" },
];

export const CONDITION_OPTIONS: ReadonlyArray<{ value: ConditionFilter; label: string }> = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

export const AVAILABILITY_OPTIONS: ReadonlyArray<{ value: OfferAvailabilityStatus; label: string }> = [
  { value: "InStock", label: "In stock" },
  { value: "OutOfStock", label: "Out of stock" },
];

export const LENGTH_UNIT_OPTIONS: ReadonlyArray<{ value: LengthUnit; label: string }> = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
  { value: "in", label: "in" },
  { value: "ft", label: "ft" },
];

export const WEIGHT_UNIT_OPTIONS: ReadonlyArray<{ value: WeightUnit; label: string }> = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
];

const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidHex(trimmed)) {
    return null;
  }
  let hex = trimmed.replace(/^#/, "").toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${hex}`;
}

function hasDimensionBound(range: DimensionRange): boolean {
  return range.min != null || range.max != null;
}

function countDimensions(dimensions: DimensionsFilter): number {
  return [dimensions.length, dimensions.width, dimensions.height, dimensions.weight].filter(
    hasDimensionBound,
  ).length;
}

export function facetCounts(state: SearchFiltersState) {
  const attributes = Object.values(state.attributes).reduce(
    (sum, values) => sum + values.length,
    0,
  );
  return {
    price: state.price.minPrice != null || state.price.maxPrice != null ? 1 : 0,
    gender: state.gender ? 1 : 0,
    age: state.age.length,
    condition: state.condition ? 1 : 0,
    availability: state.availability.length,
    colors: state.colors.length,
    brands: state.brands.length,
    websites: state.websites.length,
    categories: state.categories.length,
    attributes,
    dimensions: countDimensions(state.dimensions),
  };
}

export function countActiveFilters(state: SearchFiltersState): number {
  return Object.values(facetCounts(state)).reduce((sum, count) => sum + count, 0);
}

export function attributeHasValues(attribute: CategoryAttribute): boolean {
  return (attribute.values?.length ?? 0) > 0;
}

export function deriveAttributes(
  categories: CategorySummary[],
  byCategory: Record<string, CategoryAttribute[]>,
  attributes: Record<string, string[]>,
): Pick<SearchFiltersState, "attributesByCategory" | "attributes"> {
  const ordered: Record<string, CategoryAttribute[]> = {};
  const valid = new Set<string>();
  for (const category of categories) {
    const defs = byCategory[category.slug] ?? [];
    ordered[category.slug] = defs;
    for (const attribute of defs) {
      valid.add(attribute.slug);
    }
  }
  const prunedAttributes = Object.fromEntries(
    Object.entries(attributes).filter(([key]) => valid.has(key)),
  );
  return { attributesByCategory: ordered, attributes: prunedAttributes };
}

export function categoryAttributeGroups(
  filters: SearchFiltersState,
): Array<{ category: CategorySummary; attributes: CategoryAttribute[] }> {
  const rendered = new Set<string>();
  return filters.categories
    .map((category) => {
      const attributes = (filters.attributesByCategory[category.slug] ?? []).filter(
        (attribute) => attributeHasValues(attribute) && !rendered.has(attribute.slug),
      );
      attributes.forEach((attribute) => rendered.add(attribute.slug));
      return { category, attributes };
    })
    .filter((group) => group.attributes.length > 0);
}

export function countCategoryAttributes(
  filters: SearchFiltersState,
  attributes: CategoryAttribute[],
): number {
  return attributes.reduce(
    (sum, attribute) => sum + (filters.attributes[attribute.slug]?.length ?? 0),
    0,
  );
}

/**
 * Set one color's target share, auto-balancing so the palette never sums past
 * 100%. Raising a color above the remaining budget scales the *other* targeted
 * colors down proportionally; untargeted colors (`percentage == null`) are left
 * alone. Pass `null` to clear a color's target without touching the others.
 */
export function setColorPercentage(
  colors: ColorFilter[],
  hex: string,
  percentage: number | null,
): ColorFilter[] {
  if (percentage == null) {
    return colors.map((color) => (color.hex === hex ? { ...color, percentage: null } : color));
  }

  const target = Math.max(0, Math.min(1, percentage));
  const budget = 1 - target;
  const otherTotal = colors.reduce(
    (sum, color) => (color.hex === hex ? sum : sum + (color.percentage ?? 0)),
    0,
  );
  const scale = otherTotal > budget && otherTotal > 0 ? budget / otherTotal : 1;

  return colors.map((color) => {
    if (color.hex === hex) {
      return { ...color, percentage: target };
    }
    if (color.percentage == null || scale === 1) {
      return color;
    }
    // Floor to a whole percent so the rounded chips can't visibly exceed 100%.
    const scaled = Math.floor(color.percentage * scale * 100) / 100;
    return { ...color, percentage: scaled <= 0 ? null : scaled };
  });
}

export function setAttributeValues(
  attributes: Record<string, string[]>,
  slug: string,
  values: string[],
): Record<string, string[]> {
  const next = { ...attributes };
  if (values.length === 0) {
    delete next[slug];
  } else {
    next[slug] = values;
  }
  return next;
}

function toDimensionRange<U extends LengthUnit | WeightUnit>(
  range: DimensionRange,
  unit: U,
): { unit: U; min?: number; max?: number } | null {
  if (!hasDimensionBound(range)) {
    return null;
  }
  return {
    unit,
    ...(range.min != null ? { min: range.min } : {}),
    ...(range.max != null ? { max: range.max } : {}),
  };
}

function toDimensionsFilter(dimensions: DimensionsFilter): NonNullable<SearchFilters["dimensions"]> | null {
  const { lengthUnit, weightUnit } = dimensions;
  const length = toDimensionRange(dimensions.length, lengthUnit);
  const width = toDimensionRange(dimensions.width, lengthUnit);
  const height = toDimensionRange(dimensions.height, lengthUnit);
  const weight = toDimensionRange(dimensions.weight, weightUnit);
  if (!length && !width && !height && !weight) {
    return null;
  }
  return {
    ...(length ? { length } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(weight ? { weight } : {}),
  };
}

/**
 * Convert the UI filter state into the SDK {@link SearchFilters} payload,
 * dropping empty facets so the request stays minimal. Call this on your server
 * before handing the result to `client.products.search`.
 */
export function toSearchFilters(state: SearchFiltersState): SearchFilters {
  const filters: SearchFilters = {};

  const { minPrice, maxPrice } = state.price;
  if (minPrice != null || maxPrice != null) {
    filters.price = {
      ...(minPrice != null ? { min_price: minPrice } : {}),
      ...(maxPrice != null ? { max_price: maxPrice } : {}),
    };
  }
  if (state.gender) {
    filters.gender = state.gender;
  }
  if (state.age.length > 0) {
    filters.age = state.age;
  }
  if (state.condition) {
    filters.conditions = [state.condition];
  }
  if (state.availability.length > 0) {
    filters.availability = state.availability;
  }
  if (state.colors.length > 0) {
    filters.colors = {
      palette: state.colors.map((color) => ({
        hex: color.hex,
        ...(color.percentage != null ? { percentage: color.percentage } : {}),
      })),
    };
  }
  if (state.brands.length > 0) {
    filters.brand_ids = state.brands.map((brand) => brand.id);
  }
  if (state.websites.length > 0) {
    filters.website_ids = state.websites.map((website) => website.id);
  }
  if (state.categories.length > 0) {
    filters.category_ids = state.categories.map((category) => category.slug);
  }
  const attributeKeys = Object.keys(state.attributes);
  if (attributeKeys.length > 0) {
    filters.attributes = state.attributes;
  }
  const dimensions = toDimensionsFilter(state.dimensions);
  if (dimensions) {
    filters.dimensions = dimensions;
  }

  return filters;
}
