import { apiRequest } from "@/services/apiClient";

import { getProduct, getProducts } from "./products-api";

jest.mock("@/services/apiClient", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

const rawProduct = {
  id: 223,
  id_producto: 138,
  name: "Creatina 300 g",
  categoryId: 2,
  price: "549.00",
  stock: 26,
  status: "Activo",
  Category: { name: "Suplementos", productKind: "supplement" },
};

describe("products-api", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("consulta el catálogo público sin enviar el token de sesión", async () => {
    apiRequestMock.mockResolvedValue([rawProduct]);

    const products = await getProducts();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/products", { auth: false });
    expect(products.map((product) => product.id)).toEqual([138]);
  });

  it("consulta el detalle por id_producto", async () => {
    apiRequestMock.mockResolvedValue(rawProduct);

    await expect(getProduct(138)).resolves.toMatchObject({ id: 138, price: 549 });
    expect(apiRequestMock).toHaveBeenCalledWith("/api/products/138", { auth: false });
  });

  it("trata un producto inactivo como inexistente", async () => {
    apiRequestMock.mockResolvedValue({ ...rawProduct, status: "Inactivo" });

    await expect(getProduct(138)).rejects.toMatchObject({ status: 404 });
  });
});
