import type { Product } from "@/features/store/models/product";

import { getInitials, getMemberId, pickRecommendedProducts } from "./home";

function product(overrides: Partial<Product>): Product {
  return {
    id: 1,
    name: "Producto",
    brand: "",
    categoryId: 1,
    categoryName: "Accesorios",
    kind: "accessory",
    price: 100,
    stock: 5,
    imageUrls: ["https://res.cloudinary.com/a.jpg"],
    description: "",
    features: [],
    createdAt: null,
    specs: [],
    ...overrides,
  };
}

describe("datos del socio", () => {
  it("usa la parte local del correo como número de socio", () => {
    expect(getMemberId("20230008@uthh.edu.mx")).toBe("20230008");
    expect(getMemberId("")).toBeNull();
    expect(getMemberId(undefined)).toBeNull();
  });

  it("obtiene iniciales solo cuando hay letras", () => {
    expect(getInitials("juan.manuel")).toBe("JU");
    expect(getInitials("20230008")).toBeNull();
    expect(getInitials(null)).toBeNull();
  });
});

describe("pickRecommendedProducts", () => {
  it("recomienda solo productos con existencias e imagen, hasta 6", () => {
    const products = [
      product({ id: 1, stock: 0 }),
      product({ id: 2, imageUrls: [] }),
      ...Array.from({ length: 8 }, (_, index) => product({ id: 10 + index })),
    ];

    const recommended = pickRecommendedProducts(products);

    expect(recommended).toHaveLength(6);
    expect(recommended.map((item) => item.id)).not.toContain(1);
    expect(recommended.map((item) => item.id)).not.toContain(2);
  });
});
