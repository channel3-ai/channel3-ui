import type {
  AvailabilityStatus,
  Brand,
  CategoryAttribute,
  CategorySummary,
  SearchFilters,
  Website,
} from "@channel3/sdk/resources";

/** Gender values accepted by the search filter (`unisex` products are matched implicitly). */
export type GenderFilter = NonNullable<SearchFilters["gender"]>;
/** Age-group values accepted by the search filter. */
export type AgeFilter = NonNullable<SearchFilters["age"]>[number];
/** Condition values accepted by the search filter. */
export type ConditionFilter = NonNullable<SearchFilters["condition"]>;
/** Availability values accepted by the search filter. */
export type AvailabilityFilterValue = AvailabilityStatus;
/** Units for the length/width/height dimension filters. */
export type LengthUnit = NonNullable<NonNullable<SearchFilters["dimensions"]>["length"]>["unit"];
/** Units for the weight dimension filter. */
export type WeightUnit = NonNullable<NonNullable<SearchFilters["dimensions"]>["weight"]>["unit"];

/** A single color requirement: an sRGB hex with an optional target share (0–1). */
export interface ColorFilter {
  hex: string;
  percentage?: number | null;
}

/** A single physical-dimension range; both bounds optional (inclusive). */
export interface DimensionRange {
  min: number | null;
  max: number | null;
}

/**
 * Physical size/weight filter state. `length`/`width`/`height` share
 * `lengthUnit`; `weight` uses `weightUnit`. A range with neither bound set is
 * dropped from the request.
 */
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
  availability: AvailabilityStatus[];
  colors: ColorFilter[];
  brands: Brand[];
  websites: Website[];
  categories: CategorySummary[];
  /**
   * Attribute definitions keyed by the category slug that owns them, preserving
   * category order, so the UI can group attribute filters per selected category.
   */
  attributesByCategory: Record<string, CategoryAttribute[]>;
  /** Selected attribute values keyed by attribute slug (OR within, AND across keys). */
  attributes: Record<string, string[]>;
  /** Physical size/weight ranges, in the units chosen alongside them. */
  dimensions: DimensionsFilter;
}

/** Fallback unit for the length/width/height filters when no default is given. */
export const DEFAULT_LENGTH_UNIT: LengthUnit = "in";
/** Fallback unit for the weight filter when no default is given. */
export const DEFAULT_WEIGHT_UNIT: WeightUnit = "lb";

/** The units a fresh {@link SearchFiltersState} starts the dimension filters in. */
export interface DefaultDimensionUnits {
  /** Starting unit for length/width/height. Defaults to {@link DEFAULT_LENGTH_UNIT}. */
  lengthUnit?: LengthUnit;
  /** Starting unit for weight. Defaults to {@link DEFAULT_WEIGHT_UNIT}. */
  weightUnit?: WeightUnit;
}

/**
 * Build a pristine filter state with everything cleared. Pass `units` to choose
 * the dimension units the panel starts in (e.g. metric); they default to
 * {@link DEFAULT_LENGTH_UNIT}/{@link DEFAULT_WEIGHT_UNIT}. Use the result as the
 * controlled `value` you seed `<ProductFilters>` with.
 */
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

/** A pristine filter state with everything cleared, in the default dimension units. */
export const EMPTY_FILTERS: SearchFiltersState = createEmptyFilters();

/** Selectable option lists, with human labels, for the corresponding fields. */
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
  { value: "refurbished", label: "Refurbished" },
  { value: "used", label: "Used" },
];

export const AVAILABILITY_OPTIONS: ReadonlyArray<{ value: AvailabilityStatus; label: string }> = [
  { value: "InStock", label: "In stock" },
  { value: "LimitedAvailability", label: "Limited" },
  { value: "PreOrder", label: "Pre-order" },
  { value: "BackOrder", label: "Back-order" },
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

/** True when `value` is a 3- or 6-digit hex color, with or without a leading `#`. */
export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

/**
 * Normalize a hex color to a lowercase `#rrggbb` string, expanding shorthand.
 * Returns `null` when the input isn't a valid hex.
 */
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

/** Whether a dimension range has at least one bound set. */
function hasDimensionBound(range: DimensionRange): boolean {
  return range.min != null || range.max != null;
}

/** Number of dimension sub-fields (length/width/height/weight) with a bound set. */
function countDimensions(dimensions: DimensionsFilter): number {
  return [dimensions.length, dimensions.width, dimensions.height, dimensions.weight].filter(
    hasDimensionBound,
  ).length;
}

/** Active-filter count per facet, for the facet triggers and section badges. */
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

/** Total active filter values across every facet, for a summary badge. */
export function countActiveFilters(state: SearchFiltersState): number {
  return Object.values(facetCounts(state)).reduce((sum, count) => sum + count, 0);
}

/** Whether a category attribute exposes any selectable values. */
export function attributeHasValues(attribute: CategoryAttribute): boolean {
  return (attribute.values?.length ?? 0) > 0;
}

/**
 * Recompute the derived attribute fields from the selected categories and their
 * (state-cached) attribute definitions: the per-category map (in category
 * order) and a pruning of any selected values whose attribute no longer applies.
 */
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

/**
 * Selected categories paired with the attribute filters they expose, skipping
 * categories with none and de-duplicating an attribute shared across categories
 * so it renders only once (under the first category that owns it).
 */
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

/** Number of selected values across the given category attributes. */
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

/** Set (or clear) the selected values for one attribute handle immutably. */
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

/**
 * Serialize one dimension range to the SDK shape, or `null` when it has no
 * bounds (the SDK requires `unit`, so it's only included alongside a bound).
 */
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

/** Serialize the dimensions filter, dropping unbounded fields and the whole facet when empty. */
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
    filters.condition = state.condition;
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
