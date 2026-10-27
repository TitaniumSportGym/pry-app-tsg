import { parseProduct, parseProducts } from "@/features/store/models/product";
import { apiRequest } from "@/services/apiClient";
import { ApiError } from "@/types/auth";

// Public endpoints: the session token is not sent (auth: false).
export async function getProducts() {
  const response = await apiRequest<unknown>("/api/products", { auth: false });
  return parseProducts(response);
}

export async function getProduct(productId: number) {
  const response = await apiRequest<unknown>(`/api/products/${productId}`, { auth: false });
  const product = parseProduct(response);

  // Inactive or malformed products are treated as missing.
  if (!product) {
    throw new ApiError("Producto no encontrado", 404);
  }

  return product;
}
