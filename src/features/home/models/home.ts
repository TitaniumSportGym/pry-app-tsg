import type { Product } from "@/features/store/models/product";

const RECOMMENDED_LIMIT = 6;

/**
 * The profile only has the email, so the member id is its local part
 * (for student accounts it is the enrollment number).
 */
export function getMemberId(email: string | null | undefined) {
  const localPart = email?.split("@")[0]?.trim() ?? "";
  return localPart || null;
}

/** Two letters for the avatar, or null when the id has no letters (the view shows an icon). */
export function getInitials(memberId: string | null) {
  const letters = memberId?.replace(/[^a-zA-ZÀ-ÿ]/g, "") ?? "";
  return letters ? letters.slice(0, 2).toUpperCase() : null;
}

/** Products shown in "Recomendado para ti": only ones that can be bought right now. */
export function pickRecommendedProducts(products: readonly Product[]) {
  return products
    .filter((product) => product.stock > 0 && product.imageUrls.length > 0)
    .slice(0, RECOMMENDED_LIMIT);
}
