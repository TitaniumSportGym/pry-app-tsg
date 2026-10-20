import { apiRequest } from "@/services/apiClient";

import { getMembershipPlan, getMembershipPlans } from "./memberships-api";

jest.mock("@/services/apiClient", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);
const PLAN_ID = "42614bdf-4774-4848-9dff-50fe031f7076";

const rawPlan = {
  id: PLAN_ID,
  name: "Semana",
  type: "individual",
  durationDays: 7,
  price: "225.00",
  benefits: ["Acceso al gimnasio por 7 días"],
  isActive: true,
  sortOrder: 2,
};

describe("memberships-api", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("consulta el endpoint público sin enviar el token de sesión", async () => {
    apiRequestMock.mockResolvedValue({ ok: true, plans: [rawPlan] });

    const plans = await getMembershipPlans();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/memberships/plans", { auth: false });
    expect(plans).toHaveLength(1);
    expect(plans[0].price).toBe(225);
  });

  it("codifica el id del plan en la URL", async () => {
    apiRequestMock.mockResolvedValue({ ok: true, plan: rawPlan });

    await getMembershipPlan(PLAN_ID);

    expect(apiRequestMock).toHaveBeenCalledWith(`/api/memberships/plans/${PLAN_ID}`, {
      auth: false,
    });
  });

  it("trata un plan inactivo como inexistente", async () => {
    apiRequestMock.mockResolvedValue({ ok: true, plan: { ...rawPlan, isActive: false } });

    await expect(getMembershipPlan(PLAN_ID)).rejects.toMatchObject({ status: 404 });
  });
});
