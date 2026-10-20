import {
  formatDuration,
  formatPeople,
  formatPrice,
  getPlanBadge,
  getPlanTypeLabel,
  isValidPlanId,
  parseMembershipPlan,
  parseMembershipPlans,
} from "./membership";

const rawPlan = {
  id: "42614bdf-4774-4848-9dff-50fe031f7076",
  name: "Semana",
  slug: "semana",
  description: "Membresía semanal.",
  type: "individual",
  durationDays: 7,
  price: "225.00",
  pricePerPerson: "225.00",
  minPeople: 1,
  maxPeople: 1,
  requiresStudentProof: false,
  accessLevel: "basic",
  benefits: ["Acceso al gimnasio por 7 días", "Acceso a rutinas básicas"],
  isActive: true,
  sortOrder: 2,
};

describe("parseMembershipPlan", () => {
  it("convierte el precio de texto a número y conserva los beneficios", () => {
    const plan = parseMembershipPlan(rawPlan);

    expect(plan).toMatchObject({
      id: rawPlan.id,
      name: "Semana",
      durationDays: 7,
      price: 225,
      pricePerPerson: 225,
      benefits: ["Acceso al gimnasio por 7 días", "Acceso a rutinas básicas"],
    });
  });

  it("descarta los planes inactivos o con datos que no se pueden mostrar", () => {
    expect(parseMembershipPlan({ ...rawPlan, isActive: false })).toBeNull();
    expect(parseMembershipPlan({ ...rawPlan, id: "semana" })).toBeNull();
    expect(parseMembershipPlan({ ...rawPlan, name: "  " })).toBeNull();
    expect(parseMembershipPlan({ ...rawPlan, price: "gratis" })).toBeNull();
    expect(parseMembershipPlan({ ...rawPlan, price: "-10" })).toBeNull();
    expect(parseMembershipPlan({ ...rawPlan, durationDays: 0 })).toBeNull();
    expect(parseMembershipPlan(null)).toBeNull();
  });

  it("ignora beneficios que no son texto", () => {
    const plan = parseMembershipPlan({ ...rawPlan, benefits: ["Pesas", 3, null, " ", "Cardio"] });

    expect(plan?.benefits).toEqual(["Pesas", "Cardio"]);
  });
});

describe("parseMembershipPlans", () => {
  it("ordena por sortOrder y omite los planes inválidos", () => {
    const plans = parseMembershipPlans([
      { ...rawPlan, id: "fa8d38f9-3dd5-4a7b-b123-0402ce5b642e", name: "Quincena", sortOrder: 3 },
      { ...rawPlan, isActive: false },
      { ...rawPlan, id: "55da7961-b111-45c4-8b30-3033eb09620a", name: "Visita", sortOrder: 1 },
    ]);

    expect(plans.map((plan) => plan.name)).toEqual(["Visita", "Quincena"]);
  });

  it("devuelve una lista vacía si la respuesta no es una lista", () => {
    expect(parseMembershipPlans({ plans: [] })).toEqual([]);
  });
});

describe("formatos", () => {
  it("formatea el precio con separador de miles", () => {
    expect(formatPrice(70)).toBe("$70");
    expect(formatPrice(4230)).toBe("$4,230");
    expect(formatPrice(99.5)).toBe("$99.50");
  });

  it("expresa la duración en la unidad más natural", () => {
    expect(formatDuration(1)).toBe("1 día");
    expect(formatDuration(7)).toBe("1 semana");
    expect(formatDuration(15)).toBe("15 días");
    expect(formatDuration(30)).toBe("1 mes");
    expect(formatDuration(180)).toBe("6 meses");
    expect(formatDuration(365)).toBe("1 año");
  });

  it("traduce el tipo de plan", () => {
    expect(getPlanTypeLabel("student")).toBe("Estudiante");
    expect(getPlanTypeLabel("desconocido")).toBe("Membresía");
  });

  it("describe cuántas personas cubre el plan", () => {
    expect(formatPeople({ minPeople: 1, maxPeople: 1 })).toBe("1 persona");
    expect(formatPeople({ minPeople: 3, maxPeople: 3 })).toBe("3 personas");
    expect(formatPeople({ minPeople: 2, maxPeople: 4 })).toBe("2 a 4 personas");
  });

  it("destaca los planes de estudiante, grupales y por visita", () => {
    const plan = parseMembershipPlan(rawPlan)!;

    expect(getPlanBadge(plan)).toBeNull();
    expect(getPlanBadge({ ...plan, type: "student", requiresStudentProof: true })).toBe("ESTUDIANTE");
    expect(getPlanBadge({ ...plan, type: "group", minPeople: 2, maxPeople: 2 })).toBe("2 PERSONAS");
    expect(getPlanBadge({ ...plan, type: "visit" })).toBe("POR VISITA");
  });
});

describe("isValidPlanId", () => {
  it("solo acepta UUID", () => {
    expect(isValidPlanId(rawPlan.id)).toBe(true);
    expect(isValidPlanId("semana")).toBe(false);
    expect(isValidPlanId(undefined)).toBe(false);
  });
});
