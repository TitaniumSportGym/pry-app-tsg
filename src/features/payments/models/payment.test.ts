import {
  formatPaymentAmount,
  formatPaymentDate,
  getPaymentStatusLabel,
  parsePayment,
  parsePayments,
} from "./payment";

const paid = {
  id: "ef1e47c1-c805-4562-b56b-7b87f7567dbe",
  amount: "1400.00",
  currency: "MXN",
  method: "cash",
  status: "paid",
  paidAt: "2026-06-21T22:02:09.283Z",
  order: { orderNumber: "ORD-2026-000002" },
  createdAt: "2026-06-21T22:02:09.283Z",
};

const pending = {
  id: "af28e327-6f48-4300-b631-84a12c6c0ab4",
  amount: "2.00",
  status: "pending",
  paidAt: null,
  order: null,
  createdAt: "2026-10-09T05:55:42.780Z",
};

describe("parsePayment", () => {
  it("convierte el importe y usa la fecha de pago", () => {
    expect(parsePayment(paid)).toMatchObject({
      amount: 1400,
      status: "paid",
      orderNumber: "ORD-2026-000002",
    });
    expect(parsePayment(paid)?.date.toISOString()).toBe("2026-06-21T22:02:09.283Z");
  });

  it("usa la fecha de creación si aún no está pagado", () => {
    expect(parsePayment(pending)?.date.toISOString()).toBe("2026-10-09T05:55:42.780Z");
    expect(parsePayment(pending)?.orderNumber).toBeNull();
  });

  it("descarta pagos con datos inválidos", () => {
    expect(parsePayment({ ...paid, id: "" })).toBeNull();
    expect(parsePayment({ ...paid, amount: "abc" })).toBeNull();
    expect(parsePayment({ ...paid, paidAt: "no-es-fecha", createdAt: null })).toBeNull();
    expect(parsePayment(null)).toBeNull();
  });

  it("marca como desconocido un estado que no reconoce", () => {
    expect(parsePayment({ ...paid, status: "en_espera" })?.status).toBe("unknown");
  });
});

describe("parsePayments", () => {
  it("ordena del más reciente al más antiguo", () => {
    expect(parsePayments([paid, pending]).map((payment) => payment.id)).toEqual([
      pending.id,
      paid.id,
    ]);
  });

  it("devuelve una lista vacía si la respuesta no es una lista", () => {
    expect(parsePayments(undefined)).toEqual([]);
  });
});

describe("formatos", () => {
  it("formatea importe, fecha y estado", () => {
    expect(formatPaymentAmount(1400)).toBe("$1,400.00");
    expect(formatPaymentDate(new Date(2026, 9, 12))).toBe("12 oct 2026");
    expect(getPaymentStatusLabel("paid")).toBe("Pagado");
    expect(getPaymentStatusLabel("pending")).toBe("Pendiente");
  });
});
