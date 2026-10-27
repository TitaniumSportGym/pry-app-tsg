/** Products from the public endpoints /api/products and /api/products/:id_producto. */

import type { CartProductSnapshot } from "@/features/cart/models/cart";
import { formatMxnAmount } from "@/utils/money";

export type ProductKind = "supplement" | "apparel" | "accessory" | "other";

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  /** `id_producto`: the id the detail endpoint expects. */
  id: number;
  name: string;
  brand: string;
  categoryId: number;
  categoryName: string;
  kind: ProductKind;
  price: number;
  stock: number;
  imageUrls: string[];
  description: string;
  features: string[];
  specs: ProductSpec[];
  createdAt: Date | null;
}

export interface ProductCategory {
  id: number;
  name: string;
}

export const MAX_SEARCH_LENGTH = 60;
const LOW_STOCK_LIMIT = 5;
const KNOWN_KINDS: readonly ProductKind[] = ["supplement", "apparel", "accessory"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function toDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/** Only secure (https) image links are loaded. */
export function getSafeImageUrl(url: unknown) {
  if (typeof url !== "string") return null;

  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** The API answers 400 for ids that are not positive integers, so they are rejected first. */
export function parseProductId(id: unknown) {
  if (typeof id !== "string" || !/^[1-9]\d{0,9}$/.test(id)) return null;
  return Number(id);
}

function getImageUrls(raw: Record<string, unknown>) {
  const gallery = Array.isArray(raw.images)
    ? [...raw.images]
        .filter(isRecord)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .map((image) => getSafeImageUrl(image.url))
    : [];

  const urls = [...gallery, getSafeImageUrl(raw.imageUrl)].filter(
    (url): url is string => url !== null,
  );

  return [...new Set(urls)];
}

function getSpecs(kind: ProductKind, raw: Record<string, unknown>): ProductSpec[] {
  const candidates: [string, unknown][] =
    kind === "supplement"
      ? [
          ["Sabor", raw.supplementFlavor],
          ["Presentación", raw.supplementPresentation],
          ["Porciones", raw.supplementServings],
        ]
      : kind === "apparel"
        ? [
            ["Talla", raw.apparelSize],
            ["Color", raw.apparelColor],
            ["Material", raw.apparelMaterial],
          ]
        : [];

  return candidates
    .map(([label, value]) => ({ label, value: text(value) }))
    .filter((spec) => spec.value !== "");
}

/**
 * Validates one product from the API. Returns null when it is not active or
 * cannot be shown safely (missing id, name or price).
 */
export function parseProduct(raw: unknown): Product | null {
  if (!isRecord(raw) || text(raw.status).toLowerCase() !== "activo") {
    return null;
  }

  const id = toPositiveInteger(raw.id_producto);
  const name = text(raw.name);
  const price = toAmount(raw.price);

  if (id === null || !name || price === null) {
    return null;
  }

  const category = isRecord(raw.Category) ? raw.Category : {};
  const rawKind = text(category.productKind);
  const kind = KNOWN_KINDS.find((known) => known === rawKind) ?? "other";
  const brand = isRecord(raw.Brand) ? text(raw.Brand.name) : "";

  return {
    id,
    name,
    brand: brand || text(raw.brandName),
    categoryId: toPositiveInteger(raw.categoryId) ?? 0,
    categoryName: text(raw.categoryName) || text(category.name) || "Productos",
    kind,
    price,
    stock: typeof raw.stock === "number" && raw.stock > 0 ? Math.floor(raw.stock) : 0,
    imageUrls: getImageUrls(raw),
    description: text(raw.description),
    features: Array.isArray(raw.features) ? raw.features.map(text).filter(Boolean) : [],
    specs: getSpecs(kind, raw),
    createdAt: toDate(raw.createdAt),
  };
}

export function parseProducts(raw: unknown): Product[] {
  if (!Array.isArray(raw)) return [];

  return raw.map(parseProduct).filter((product): product is Product => product !== null);
}

export function getCategories(products: readonly Product[]): ProductCategory[] {
  const categories = new Map<number, string>();

  for (const product of products) {
    if (product.categoryId > 0 && !categories.has(product.categoryId)) {
      categories.set(product.categoryId, product.categoryName);
    }
  }

  return [...categories.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Search text stays on the device: it is trimmed and capped, and never sent to the API. */
export function sanitizeSearch(query: string) {
  return query.slice(0, MAX_SEARCH_LENGTH);
}

export function filterProducts(
  products: readonly Product[],
  { categoryId, query }: { categoryId: number | null; query: string },
) {
  const terms = normalize(sanitizeSearch(query)).split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    if (categoryId !== null && product.categoryId !== categoryId) return false;

    const haystack = normalize(`${product.name} ${product.brand} ${product.categoryName}`);
    return terms.every((term) => haystack.includes(term));
  });
}

export function formatProductPrice(amount: number) {
  return formatMxnAmount(amount);
}

export function isSoldOut(product: Pick<Product, "stock">) {
  return product.stock <= 0;
}

export function getStockLabel(product: Pick<Product, "stock">) {
  if (isSoldOut(product)) return "Agotado";
  if (product.stock <= LOW_STOCK_LIMIT) {
    return product.stock === 1 ? "Última pieza" : `Últimas ${product.stock} piezas`;
  }
  return "Disponible";
}

export interface CategorySummary extends ProductCategory {
  count: number;
  /** Up to four product photos for the category card. */
  imageUrls: string[];
}

export function getCategorySummaries(products: readonly Product[]): CategorySummary[] {
  return getCategories(products).map((category) => {
    const inCategory = products.filter((product) => product.categoryId === category.id);

    return {
      ...category,
      count: inCategory.length,
      imageUrls: inCategory
        .map((product) => product.imageUrls[0])
        .filter((url): url is string => Boolean(url))
        .slice(0, 4),
    };
  });
}

/** Most recently added products that can be bought. */
export function getNewestProducts(products: readonly Product[], limit = 8) {
  return products
    .filter((product) => product.stock > 0)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    .slice(0, limit);
}

/** Variant line shown in the cart, built from the product's own specs. */
export function getVariantLabel(product: Pick<Product, "specs">) {
  return product.specs.map((spec) => spec.value).join(" · ");
}

export function toCartProduct(product: Product): CartProductSnapshot {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrls[0] ?? null,
    detail: getVariantLabel(product),
    stock: product.stock,
  };
}

/** A category id from a route param; only positive integers are accepted. */
export function parseCategoryParam(value: unknown) {
  return parseProductId(value);
}
