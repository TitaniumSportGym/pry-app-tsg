import {
  filterProducts,
  formatProductPrice,
  getCategories,
  getSafeImageUrl,
  getStockLabel,
  MAX_SEARCH_LENGTH,
  parseProduct,
  parseProductId,
  parseProducts,
  sanitizeSearch,
  type Product,
} from "./product";

const rawSupplement = {
  id: 223,
  id_producto: 138,
  name: "Optimum Nutrition Micronized Creatine 300 g",
  brandId: 4,
  categoryId: 2,
  price: "549.00",
  stock: 26,
  status: "Activo",
  imageUrl: "https://res.cloudinary.com/demo/creatine.jpg",
  description: "Creatina monohidratada micronizada",
  features: [],
  supplementFlavor: "Sin sabor",
  supplementPresentation: "300 g",
  supplementServings: "60 servicios",
  apparelSize: null,
  Brand: { id_marca: 4, name: "Optimum Nutrition" },
  Category: { id_categoria: 2, name: "Suplementos", productKind: "supplement" },
  images: [{ id: 150, url: "https://res.cloudinary.com/demo/creatine.jpg", order: 0 }],
  brandName: "Optimum Nutrition",
  categoryName: "Suplementos",
};

const rawShirt = {
  ...rawSupplement,
  id: 186,
  id_producto: 101,
  name: "YoungLA Block Party Tee Negro",
  categoryId: 1,
  price: "599.00",
  stock: 0,
  supplementFlavor: null,
  supplementPresentation: null,
  supplementServings: null,
  apparelSize: "M",
  apparelColor: "Negro",
  apparelMaterial: "Algodon",
  features: ["Corte ajustado", 3, " "],
  Brand: { id_marca: 2, name: "YoungLA" },
  Category: { id_categoria: 1, name: "Ropa deportiva", productKind: "apparel" },
  images: [
    { id: 2, url: "https://res.cloudinary.com/demo/back.jpg", order: 1 },
    { id: 1, url: "https://res.cloudinary.com/demo/front.jpg", order: 0 },
  ],
  imageUrl: "https://res.cloudinary.com/demo/front.jpg",
  brandName: "YoungLA",
  categoryName: "Ropa deportiva",
};

describe("parseProduct", () => {
  it("usa id_producto como id y convierte el precio a número", () => {
    expect(parseProduct(rawSupplement)).toMatchObject({
      id: 138,
      name: "Optimum Nutrition Micronized Creatine 300 g",
      brand: "Optimum Nutrition",
      categoryName: "Suplementos",
      kind: "supplement",
      price: 549,
      stock: 26,
    });
  });

  it("arma las especificaciones según el tipo de producto", () => {
    expect(parseProduct(rawSupplement)?.specs).toEqual([
      { label: "Sabor", value: "Sin sabor" },
      { label: "Presentación", value: "300 g" },
      { label: "Porciones", value: "60 servicios" },
    ]);
    expect(parseProduct(rawShirt)?.specs).toEqual([
      { label: "Talla", value: "M" },
      { label: "Color", value: "Negro" },
      { label: "Material", value: "Algodon" },
    ]);
  });

  it("ordena las imágenes, quita duplicados y descarta características inválidas", () => {
    const shirt = parseProduct(rawShirt);

    expect(shirt?.imageUrls).toEqual([
      "https://res.cloudinary.com/demo/front.jpg",
      "https://res.cloudinary.com/demo/back.jpg",
    ]);
    expect(shirt?.features).toEqual(["Corte ajustado"]);
  });

  it("descarta imágenes que no usan https", () => {
    const product = parseProduct({
      ...rawSupplement,
      imageUrl: "http://inseguro.com/a.jpg",
      images: [{ url: "javascript:alert(1)", order: 0 }],
    });

    expect(product?.imageUrls).toEqual([]);
  });

  it("descarta productos inactivos o con datos que no se pueden mostrar", () => {
    expect(parseProduct({ ...rawSupplement, status: "Inactivo" })).toBeNull();
    expect(parseProduct({ ...rawSupplement, id_producto: "138" })).toBeNull();
    expect(parseProduct({ ...rawSupplement, name: "" })).toBeNull();
    expect(parseProduct({ ...rawSupplement, price: "abc" })).toBeNull();
    expect(parseProduct(null)).toBeNull();
  });

  it("trata el stock negativo o ausente como agotado", () => {
    expect(parseProduct({ ...rawSupplement, stock: -3 })?.stock).toBe(0);
    expect(parseProduct({ ...rawSupplement, stock: undefined })?.stock).toBe(0);
  });
});

describe("catálogo", () => {
  const products = parseProducts([rawSupplement, rawShirt, { status: "Inactivo" }]) as Product[];

  it("obtiene las categorías sin repetir y ordenadas", () => {
    expect(getCategories(products)).toEqual([
      { id: 1, name: "Ropa deportiva" },
      { id: 2, name: "Suplementos" },
    ]);
  });

  it("filtra por categoría", () => {
    expect(filterProducts(products, { categoryId: 1, query: "" }).map((p) => p.id)).toEqual([101]);
  });

  it("busca por nombre, marca o categoría sin importar acentos ni mayúsculas", () => {
    expect(filterProducts(products, { categoryId: null, query: "CREATINE" })).toHaveLength(1);
    expect(filterProducts(products, { categoryId: null, query: "younGLA negro" })).toHaveLength(1);
    expect(filterProducts(products, { categoryId: null, query: "suplementos" })).toHaveLength(1);
    expect(filterProducts(products, { categoryId: null, query: "proteína" })).toHaveLength(0);
  });

  it("limita la longitud de la búsqueda", () => {
    expect(sanitizeSearch("a".repeat(200))).toHaveLength(MAX_SEARCH_LENGTH);
  });
});

describe("formatos y validaciones", () => {
  it("formatea el precio con dos decimales", () => {
    expect(formatProductPrice(650)).toBe("$650.00");
    expect(formatProductPrice(1299.5)).toBe("$1,299.50");
  });

  it("describe la disponibilidad", () => {
    expect(getStockLabel({ stock: 0 })).toBe("Agotado");
    expect(getStockLabel({ stock: 1 })).toBe("Última pieza");
    expect(getStockLabel({ stock: 4 })).toBe("Últimas 4 piezas");
    expect(getStockLabel({ stock: 26 })).toBe("Disponible");
  });

  it("solo acepta ids enteros positivos", () => {
    expect(parseProductId("138")).toBe(138);
    expect(parseProductId("0")).toBeNull();
    expect(parseProductId("-1")).toBeNull();
    expect(parseProductId("1.5")).toBeNull();
    expect(parseProductId("abc")).toBeNull();
    expect(parseProductId(undefined)).toBeNull();
  });

  it("solo permite imágenes https", () => {
    expect(getSafeImageUrl("https://res.cloudinary.com/a.jpg")).toBe("https://res.cloudinary.com/a.jpg");
    expect(getSafeImageUrl("http://res.cloudinary.com/a.jpg")).toBeNull();
    expect(getSafeImageUrl(42)).toBeNull();
  });
});
