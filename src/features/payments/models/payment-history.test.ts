import type { Payment } from "./payment";
import {
  buildPaymentHistory,
  filterPayments,
  formatPaymentDateTime,
  getPaymentMethodLabel,
  groupPaymentsByMonth,
  parseOrderConcepts,
  summarizePayments,
} from "./payment-history";

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: "p1",
    amount: 70,
    currency: "MXN",
    status: "paid",
    date: new Date(2026, 9, 26, 22, 27),
    orderId: "o1",
    orderNumber: "ORD-2026-000265",
    method: "online_checkout",
    ...overrides,
  };
}

// Shape returned by GET /api/orders/me.
const apiOrders = [
  {
    id: "o1",
    orderNumber: "ORD-2026-000265",
    items: [{ itemType: "membership", itemNameSnapshot: "Visita" }],
  },
  {
    id: "o2",
    items: [
      { itemType: "group_membership", itemNameSnapshot: "", membershipPlan: { name: "Paquete 4 personas" } },
    ],
  },
  {
    id: "o3",
    items: [
      { itemType: "product", itemNameSnapshot: "Creatina" },
      { itemType: "product", itemNameSnapshot: "Guantes" },
      { itemType: "product", itemNameSnapshot: "Shaker" },
    ],
  },
  { id: "o4", items: [] },
  "inválido",
];

describe("historial de pagos", () => {
  it("obtiene el concepto de cada orden", () => {
    const concepts = parseOrderConcepts(apiOrders);

    expect(concepts.get("o1")).toEqual({ title: "Visita", kind: "membership" });
    expect(concepts.get("o2")).toEqual({ title: "Paquete 4 personas", kind: "group" });
    expect(concepts.get("o3")).toEqual({ title: "Creatina y 2 más", kind: "product" });
    expect(concepts.has("o4")).toBe(false);
    expect(parseOrderConcepts(null).size).toBe(0);
  });

  it("une los pagos con su concepto y usa un nombre genérico sin orden", () => {
    const history = buildPaymentHistory(
      [
        payment({}),
        payment({ id: "p2", orderId: null, orderNumber: null, method: "card_terminal" }),
        payment({ id: "p3", orderId: "desconocida" }),
      ],
      parseOrderConcepts(apiOrders),
    );

    expect(history.map((entry) => entry.title)).toEqual(["Visita", "Pago en recepción", "Pago"]);
    expect(history[2].kind).toBe("other");
  });

  it("resume solo los pagos confirmados", () => {
    const history = buildPaymentHistory(
      [
        payment({ amount: 70 }),
        payment({ id: "p2", amount: 1400, orderNumber: null }),
        payment({ id: "p3", status: "pending", amount: 999 }),
        payment({ id: "p4", status: "rejected", amount: 50 }),
      ],
      new Map(),
    );

    expect(summarizePayments(history)).toEqual({
      totalPaid: 1470,
      currency: "MXN",
      paidCount: 2,
      pendingCount: 1,
      receiptCount: 1,
    });
    expect(filterPayments(history, "pending").map((entry) => entry.id)).toEqual(["p3"]);
    expect(filterPayments(history, "all")).toHaveLength(4);
  });

  it("agrupa por mes conservando el orden", () => {
    const history = buildPaymentHistory(
      [
        payment({ id: "a", date: new Date(2026, 9, 26) }),
        payment({ id: "b", date: new Date(2026, 9, 22) }),
        payment({ id: "c", date: new Date(2026, 5, 21) }),
      ],
      new Map(),
    );

    const months = groupPaymentsByMonth(history);
    expect(months.map((month) => month.label)).toEqual(["Octubre 2026", "Junio 2026"]);
    expect(months[0].payments.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("formatea fecha, hora y método", () => {
    expect(formatPaymentDateTime(new Date(2026, 9, 26, 22, 27))).toBe("26 oct 2026 · 10:27 p.m.");
    expect(formatPaymentDateTime(new Date(2026, 9, 22, 0, 5))).toBe("22 oct 2026 · 12:05 a.m.");
    expect(getPaymentMethodLabel("cash")).toBe("Efectivo");
    expect(getPaymentMethodLabel("")).toBe("No especificado");
  });
});
