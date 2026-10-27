import { formatProductPrice, isSoldOut, type Product } from '@/features/store/models/product';

/** What a product card shows; built here so every list renders products the same way. */
export interface ProductCardItem {
  id: number;
  name: string;
  price: string;
  imageUrl: string | null;
  soldOut: boolean;
}

export function toProductCardItem(product: Product): ProductCardItem {
  return {
    id: product.id,
    name: product.name,
    price: formatProductPrice(product.price),
    imageUrl: product.imageUrls[0] ?? null,
    soldOut: isSoldOut(product),
  };
}
