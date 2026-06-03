import type {
  AvailabilityStatus,
  Brand,
  CategoryAttribute,
  CategorySummary,
  SearchFilters,
} from "@channel3/sdk/resources";

/** Gender values accepted by the search filter (`unisex` products are matched implicitly). */
export type GenderFilter = NonNullable<SearchFilters["gender"]>;
/** Age-group values accepted by the search filter. */
export type AgeFilter = NonNullable<SearchFilters["age"]>[number];
/** Condition values accepted by the search filter. */
export type ConditionFilter = NonNullable<SearchFilters["condition"]>;
/** Availability values accepted by the search filter. */
export type AvailabilityFilterValue = AvailabilityStatus;

/** A single color requirement: an sRGB hex with an optional target share (0–1). */
export interface ColorFilter {
  hex: string;
  percentage?: number | null;
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
  categories: CategorySummary[];
  /**
   * Attribute definitions keyed by the category slug that owns them, preserving
   * category order, so the UI can group attribute filters per selected category.
   */
  attributesByCategory: Record<string, CategoryAttribute[]>;
  /** Selected attribute values keyed by attribute slug (OR within, AND across keys). */
  attributes: Record<string, string[]>;
}

/** A pristine filter state with everything cleared. */
export const EMPTY_FILTERS: SearchFiltersState = {
  price: { minPrice: null, maxPrice: null },
  gender: null,
  age: [],
  condition: null,
  availability: [],
  colors: [],
  brands: [],
  categories: [],
  attributesByCategory: {},
  attributes: {},
};

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

/** Count the number of distinct active filter facets, for a summary badge. */
export function countActiveFilters(state: SearchFiltersState): number {
  let count = 0;
  if (state.price.minPrice != null || state.price.maxPrice != null) {
    count += 1;
  }
  if (state.gender) {
    count += 1;
  }
  count += state.age.length;
  if (state.condition) {
    count += 1;
  }
  count += state.availability.length;
  count += state.colors.length;
  count += state.brands.length;
  count += state.categories.length;
  for (const values of Object.values(state.attributes)) {
    count += values.length;
  }
  return count;
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
  if (state.categories.length > 0) {
    filters.category_ids = state.categories.map((category) => category.slug);
  }
  const attributeKeys = Object.keys(state.attributes);
  if (attributeKeys.length > 0) {
    filters.attributes = state.attributes;
  }

  return filters;
}
