import type {
  Brand,
  Category,
  CategorySummary,
  PriceHistory,
  PriceStatistics,
  ProductDetail,
  ProductImage,
  Website,
} from "@channel3/sdk/resources";

/** Curated Unsplash photos so each fixture shows a relevant, stable product shot. */
const photo = (id: string, w: number, h: number, q: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=${q}`;

const img = (
  id: string,
  opts: {
    cleaned?: boolean;
    main?: boolean;
    alt?: string;
    shot?: ProductImage["shot_type"];
  } = {},
) => ({
  url: photo(id, 640, 640, 80),
  alt_text: opts.alt ?? null,
  is_cleaned_image: opts.cleaned ?? false,
  is_main_image: opts.main ?? false,
  shot_type: opts.shot ?? null,
});

const thumb = (id: string) => photo(id, 160, 160, 70);

/**
 * A fully hydrated detail product: multi-merchant offers (one on sale, one out
 * of stock), color swatches, and a size dimension exercising all four variant
 * tiers. `available` is populated, as it would be on `GET /v1/products/{id}`.
 */
export const detailProduct: ProductDetail = {
  id: "nike/pegasus-41",
  title: "Nike Pegasus 41 Road Running Shoes",
  description:
    "Responsive every-day trainers with a springy ReactX foam midsole and dual Air Zoom units. A breathable engineered mesh upper keeps things cool mile after mile.",
  brands: [
    { id: "nike", name: "Nike" },
    { id: "nike-running", name: "Pegasus Brand" },
  ],
  category: {
    slug: "running-shoes",
    title: "Running Shoes",
    has_children: false,
    path: [
      { slug: "footwear", title: "Footwear" },
      { slug: "athletic-shoes", title: "Athletic Shoes" },
      { slug: "running-shoes", title: "Running Shoes" },
    ],
  },
  images: [
    img("1606107557195-0e29a4b5b4aa", { cleaned: true, alt: "Pegasus 41, studio" }),
    img("1542291026-7eec264c27ff", { main: true, shot: "hero", alt: "Pegasus 41, side profile" }),
    img("1511556820780-d912e42b4980", { shot: "on_model", alt: "Pegasus 41, worn on a run" }),
    img("1491553895911-0055eca6402d", { shot: "detail" }),
    img("1514989940723-e8e51635b782", { shot: "lifestyle" }),
  ],
  key_features: [
    "ReactX foam returns more energy than previous Pegasus models",
    "Dual Air Zoom units at the forefoot and heel",
    "Engineered mesh upper for targeted breathability",
  ],
  materials: ["Mesh", "Rubber"],
  gender: "unisex",
  offers: [
    {
      url: "https://nike.com/t/pegasus-41",
      domain: "nike.com",
      availability: "InStock",
      price: { price: 129.97, currency: "USD", compare_at_price: 139.99 },
      max_commission_rate: 0.08,
    },
    {
      url: "https://www.dickssportinggoods.com/p/pegasus-41",
      domain: "www.dickssportinggoods.com",
      availability: "InStock",
      price: { price: 139.99, currency: "USD" },
      max_commission_rate: 0.04,
    },
    {
      url: "https://roadrunnersports.com/pegasus-41",
      domain: "roadrunnersports.com",
      availability: "OutOfStock",
      price: { price: 124.95, currency: "USD" },
    },
  ],
  structured_attributes: {
    color: ["Blue"],
    material: ["Engineered mesh"],
    activity: ["Road running"],
    closure_type: ["Lace-up"],
    cushioning: ["ReactX foam"],
  },
  variants: {
    options: [
      {
        name: "Color",
        values: [
          {
            label: "Blue",
            exists: true,
            available: "InStock",
            thumbnail_url: thumb("1595950653106-6c9ebd614d3a"),
          },
          {
            label: "Black",
            exists: true,
            available: "InStock",
            thumbnail_url: thumb("1491553895911-0055eca6402d"),
            product_id: "nike/pegasus-41-black",
          },
          {
            label: "Crimson",
            exists: true,
            available: "OutOfStock",
            thumbnail_url: thumb("1542291026-7eec264c27ff"),
            product_id: "nike/pegasus-41-crimson",
          },
          {
            label: "White",
            exists: false,
            thumbnail_url: thumb("1606107557195-0e29a4b5b4aa"),
            product_id: "nike/pegasus-41-white",
          },
        ],
      },
      {
        name: "Size",
        values: [
          { label: "8", exists: true, available: "LimitedAvailability" },
          { label: "9", exists: true, available: "InStock" },
          { label: "10", exists: true, available: "InStock" },
          { label: "11", exists: true, available: "OutOfStock" },
          { label: "12", exists: true, available: "PreOrder" },
          { label: "13", exists: false },
        ],
      },
    ],
    selected: [
      { name: "Color", label: "Blue" },
      { name: "Size", label: "9" },
    ],
  },
};

/**
 * The same family as it appears in search results: `available` is `null` (not
 * hydrated), so every existing value renders as purchasable until a detail
 * fetch resolves real stock.
 */
export const searchVariantProduct: ProductDetail = {
  id: "nike/pegasus-41-search",
  title: "Nike Pegasus 41 (search result)",
  brands: [{ id: "nike", name: "Nike" }],
  images: [img("1606107557195-0e29a4b5b4aa", { cleaned: true, main: true })],
  offers: [
    {
      url: "https://nike.com/t/pegasus-41",
      domain: "nike.com",
      availability: "InStock",
      price: { price: 139.99, currency: "USD" },
    },
  ],
  structured_attributes: {},
  variants: {
    options: [
      {
        name: "Size",
        values: [
          { label: "8", exists: true },
          { label: "9", exists: true },
          { label: "10", exists: true },
          { label: "11", exists: true },
          { label: "12", exists: false },
        ],
      },
    ],
    selected: [{ name: "Size", label: "9" }],
  },
};

/**
 * A search hit (not a detail fetch) that still carries color variants: stock
 * isn't hydrated (`available` is `null`), but each value has a `thumbnail_url`,
 * so the card renders swatches with no extra API call. Seven colors exercise
 * the "+N" overflow.
 */
const swatchSearchProduct: ProductDetail = {
  id: "allbirds/wool-runner",
  title: "Allbirds Wool Runner Everyday Sneakers",
  brands: [{ id: "allbirds", name: "Allbirds" }],
  images: [
    img("1595950653106-6c9ebd614d3a", { cleaned: true, main: true }),
    img("1525966222134-fcfa99b8ae77", { alt: "Wool Runner, top view" }),
  ],
  offers: [
    {
      url: "https://allbirds.com/wool-runner",
      domain: "allbirds.com",
      availability: "InStock",
      price: { price: 110.0, currency: "USD" },
    },
  ],
  structured_attributes: {},
  variants: {
    options: [
      {
        name: "Color",
        values: [
          { label: "Natural Grey", exists: true, thumbnail_url: thumb("1545289414-1c3cb1c06238"), product_id: "allbirds/wool-runner-grey" },
          { label: "Navy", exists: true, thumbnail_url: thumb("1491553895911-0055eca6402d"), product_id: "allbirds/wool-runner-navy" },
          { label: "Rust", exists: true, thumbnail_url: thumb("1542291026-7eec264c27ff"), product_id: "allbirds/wool-runner-rust" },
          { label: "Black", exists: true, thumbnail_url: thumb("1556906781-9a412961c28c"), product_id: "allbirds/wool-runner-black" },
          { label: "Forest", exists: true, thumbnail_url: thumb("1606107557195-0e29a4b5b4aa"), product_id: "allbirds/wool-runner-forest" },
          { label: "Sand", exists: true, thumbnail_url: thumb("1514989940723-e8e51635b782"), product_id: "allbirds/wool-runner-sand" },
          { label: "Blush", exists: true, thumbnail_url: thumb("1595950653106-6c9ebd614d3a"), product_id: "allbirds/wool-runner-blush" },
        ],
      },
    ],
    selected: [{ name: "Color", label: "Natural Grey" }],
  },
};

/** Subset for dense grid/carousel tiles in the component canvas. */
export const cardFixtures: ReadonlyArray<ProductDetail> = [
  detailProduct,
  swatchSearchProduct,
  {
    id: "patagonia/better-sweater",
    title: "Patagonia Better Sweater Fleece Jacket",
    brands: [{ id: "patagonia", name: "Patagonia" }],
    images: [img("1591047139829-d91aecb6caea", { cleaned: true, main: true })],
    offers: [
      {
        url: "https://patagonia.com/better-sweater",
        domain: "patagonia.com",
        availability: "InStock",
        price: { price: 99.0, currency: "USD", compare_at_price: 149.0 },
      },
    ],
    structured_attributes: {},
  },
  {
    id: "acme/cashmere-beanie",
    title: "Acme Studios Cashmere Ribbed Beanie",
    brands: [{ id: "acme", name: "Acme Studios" }],
    images: [img("1607611439230-fcbf50e42f7c", { main: true })],
    offers: [
      {
        url: "https://acme.com/beanie",
        domain: "acme.com",
        availability: "OutOfStock",
        price: { price: 185.0, currency: "USD" },
      },
    ],
    structured_attributes: {},
  },
];

/** Three rows at the grid's lg breakpoint (4 columns × 3 rows). */
const GRID_CANVAS_COUNT = 12;

/** Playground grid tile: repeats {@link cardFixtures} with unique ids for React keys. */
export const gridCanvasProducts: ReadonlyArray<ProductDetail> = Array.from(
  { length: GRID_CANVAS_COUNT },
  (_, index) => {
    const source = cardFixtures[index % cardFixtures.length]!;
    if (index < cardFixtures.length) {
      return source;
    }
    return { ...source, id: `${source.id}/canvas-${index}` };
  },
);

/** Grid/carousel fixtures covering swatches, sale, sold-out, no-offer and broken-image cases. */
export const gridProducts: ReadonlyArray<ProductDetail> = [
  detailProduct,
  swatchSearchProduct,
  {
    id: "patagonia/better-sweater",
    title: "Patagonia Better Sweater Fleece Jacket",
    brands: [{ id: "patagonia", name: "Patagonia" }],
    images: [img("1591047139829-d91aecb6caea", { cleaned: true, main: true })],
    offers: [
      {
        url: "https://patagonia.com/better-sweater",
        domain: "patagonia.com",
        availability: "InStock",
        price: { price: 99.0, currency: "USD", compare_at_price: 149.0 },
      },
    ],
    structured_attributes: {},
  },
  {
    id: "acme/cashmere-beanie",
    title: "Acme Studios Cashmere Ribbed Beanie",
    brands: [{ id: "acme", name: "Acme Studios" }],
    images: [img("1607611439230-fcbf50e42f7c", { main: true })],
    offers: [
      {
        url: "https://acme.com/beanie",
        domain: "acme.com",
        availability: "OutOfStock",
        price: { price: 185.0, currency: "USD" },
      },
    ],
    structured_attributes: {},
  },
  {
    id: "bose/quietcomfort-ultra",
    title: "Bose QuietComfort Ultra Earbuds",
    brands: [{ id: "bose", name: "Bose" }],
    images: [{ url: "https://example.invalid/broken.jpg", is_main_image: true }],
    offers: [
      {
        url: "https://bose.com/qc-ultra",
        domain: "bose.com",
        availability: "InStock",
        price: { price: 299.0, currency: "USD" },
      },
    ],
    structured_attributes: {},
  },
  {
    id: "bellroy/apex-sleeve",
    title: "Bellroy Apex Slim Sleeve Wallet",
    brands: [{ id: "bellroy", name: "Bellroy" }],
    images: [img("1627123424574-724758594e93", { cleaned: true, main: true })],
    offers: [],
    structured_attributes: {},
  },
];

function buildHistory(): PriceHistory {
  const prices = [
    159.99, 159.99, 154.99, 149.99, 149.99, 144.5, 139.99, 139.99, 134.99, 129.99, 129.97, 129.97,
    134.99, 139.99, 139.99, 129.97, 124.95, 124.95, 129.97, 129.97,
  ];
  const start = Date.parse("2026-05-01T00:00:00Z");
  const history = prices.map((price, index) => ({
    price,
    currency: "USD",
    timestamp: new Date(start + index * 24 * 60 * 60 * 1000).toISOString(),
  }));
  return {
    canonical_product_id: detailProduct.id,
    product_title: detailProduct.title,
    history,
    statistics: {
      currency: "USD",
      current_price: 129.97,
      current_status: "low",
      min_price: 124.95,
      max_price: 159.99,
      mean: 138.6,
      std_dev: 11.2,
    },
  };
}

export const priceHistory: PriceHistory = buildHistory();

const baseStats = {
  currency: "USD",
  min_price: 124.95,
  max_price: 159.99,
  mean: 138.6,
  std_dev: 11.2,
} as const;

/** One gauge fixture per `current_status`, sharing a range so the zones line up. */
export const priceStats = {
  low: { ...baseStats, current_price: 124.95, current_status: "low" },
  typical: { ...baseStats, current_price: 138.0, current_status: "typical" },
  high: { ...baseStats, current_price: 158.0, current_status: "high" },
} satisfies Record<string, PriceStatistics>;

/** Brand fixtures for the Brands filter typeahead. */
export const fakeBrands: ReadonlyArray<Brand> = [
  { id: "nike", name: "Nike" },
  { id: "adidas", name: "Adidas" },
  { id: "allbirds", name: "Allbirds" },
  { id: "patagonia", name: "Patagonia" },
  { id: "new-balance", name: "New Balance" },
  { id: "hoka", name: "Hoka" },
  { id: "on", name: "On Running" },
  { id: "brooks", name: "Brooks" },
];

export const fakeWebsites: ReadonlyArray<Website> = [
  { id: "nike.com", url: "https://nike.com" },
  { id: "adidas.com", url: "https://adidas.com" },
  { id: "zappos.com", url: "https://zappos.com" },
  { id: "rei.com", url: "https://rei.com" },
  { id: "nordstrom.com", url: "https://nordstrom.com" },
  { id: "footlocker.com", url: "https://footlocker.com" },
];

/** Category fixtures for the Category filter typeahead. */
export const fakeCategories: ReadonlyArray<CategorySummary> = [
  {
    slug: "running-shoes",
    title: "Running Shoes",
    has_children: false,
    path: [
      { slug: "footwear", title: "Footwear" },
      { slug: "athletic-shoes", title: "Athletic Shoes" },
      { slug: "running-shoes", title: "Running Shoes" },
    ],
  },
  {
    slug: "sneakers",
    title: "Sneakers",
    has_children: false,
    path: [
      { slug: "footwear", title: "Footwear" },
      { slug: "sneakers", title: "Sneakers" },
    ],
  },
  {
    slug: "jackets",
    title: "Jackets & Coats",
    has_children: true,
    path: [
      { slug: "apparel", title: "Apparel" },
      { slug: "jackets", title: "Jackets & Coats" },
    ],
  },
];

/** Per-category attribute definitions returned by `fakeGetCategory`. */
const categoryAttributes: Record<string, Category["attributes"]> = {
  "running-shoes": [
    { name: "Color", slug: "color", values: ["Black", "Blue", "White", "Red", "Grey"] },
    { name: "Cushioning", slug: "cushioning", values: ["Max", "Balanced", "Firm"] },
    { name: "Arch Support", slug: "arch-support", values: ["Neutral", "Stability"] },
    { name: "Terrain", slug: "terrain", values: ["Road", "Trail"] },
  ],
  sneakers: [
    { name: "Color", slug: "color", values: ["Black", "White", "Multicolor"] },
    { name: "Material", slug: "material", values: ["Leather", "Canvas", "Knit"] },
  ],
  jackets: [
    { name: "Fill", slug: "fill", values: ["Down", "Synthetic", "Fleece"] },
    { name: "Waterproof", slug: "waterproof", values: ["Yes", "Water-resistant", "No"] },
  ],
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Simulates `client.brands.search`. */
export async function fakeSearchBrands(query: string): Promise<Brand[]> {
  await wait(250);
  const q = query.toLowerCase();
  return fakeBrands.filter((brand) => brand.name.toLowerCase().includes(q));
}

/** Simulates a website typeahead (resolves free text to {@link Website} rows). */
export async function fakeSearchWebsites(query: string): Promise<Website[]> {
  await wait(250);
  const q = query.toLowerCase();
  return fakeWebsites.filter((website) => website.url.toLowerCase().includes(q));
}

/** Simulates `client.categories.search`. */
export async function fakeSearchCategories(query: string): Promise<CategorySummary[]> {
  await wait(250);
  const q = query.toLowerCase();
  return fakeCategories.filter((category) => category.title.toLowerCase().includes(q));
}

/** Simulates `client.categories.retrieve` (loads attributes for a slug). */
export async function fakeGetCategory(slug: string): Promise<Category> {
  await wait(200);
  const summary = fakeCategories.find((category) => category.slug === slug);
  return {
    slug,
    title: summary?.title ?? slug,
    has_children: summary?.has_children ?? false,
    path: summary?.path,
    attributes: categoryAttributes[slug] ?? [],
  };
}

/** Simulates `client.products.findSimilar`. */
export async function fakeFetchSimilar(): Promise<ProductDetail[]> {
  await wait(600);
  return gridProducts.filter((product) => product.id !== detailProduct.id);
}

const searchPool: ReadonlyArray<ProductDetail> = [...gridProducts, searchVariantProduct];

/** Simulates `client.products.search` with naive query matching and paging. */
export async function fakeSearch({
  query,
  pageToken,
}: {
  query: string;
  pageToken?: string;
}): Promise<{ products: ProductDetail[]; nextPageToken?: string | null }> {
  await wait(500);
  const q = query.trim().toLowerCase();
  const matches = q
    ? searchPool.filter(
        (product) =>
          product.title.toLowerCase().includes(q) ||
          product.brands?.some((brand) => brand.name.toLowerCase().includes(q)),
      )
    : searchPool;
  // Two synthetic pages to exercise infinite scroll.
  const pageSize = 4;
  const page = pageToken ? Number(pageToken) : 0;
  const start = page * pageSize;
  const slice = matches.slice(start, start + pageSize);
  const hasNext = start + pageSize < matches.length;
  return { products: slice, nextPageToken: hasNext ? String(page + 1) : null };
}
