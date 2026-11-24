import { ApiError } from "@/types/auth";

import {
  filterRoutines,
  formatDaysPerWeek,
  getCategoryLabel,
  getRoutineCategories,
  getRoutineLevels,
  isMembershipRequiredError,
  MAX_ROUTINE_SEARCH_LENGTH,
  parseClientRoutine,
  parseClientRoutines,
  sanitizeRoutineSearch,
  type ClientRoutine,
} from "./client-routine";

// Shape returned by GET /api/client/routines.
const apiRoutine = {
  id: "f09a7a9b-8cb4-4119-ab5e-8c93afddf35a",
  trainerId: "ef71c219-0144-4c1f-903e-16cf0f2d4c88",
  title: "Dia de pecho",
  objective: "Ganancia muscular",
  description: "Ponerse fuerte",
  level: "intermedio",
  category: "hipertrofia",
  durationWeeks: 4,
  daysPerWeek: 1,
  estimatedMinutes: 90,
  imageUrl: "https://res.cloudinary.com/demo/routine.jpg",
  status: "published",
  trainer: { id: "ef71c219", email: "entrenador@titanium.com", role: "entrenador" },
  exercises: [
    {
      id: "e1",
      name: "Press banca",
      description: "Sube lentamente",
      dayNumber: 1,
      sets: 12,
      reps: "10",
      restSeconds: 240,
      notes: "No juntar codos",
      order: 0,
      videoUrl: null,
      videoType: "none",
      hasVideo: false,
    },
  ],
  trainerEmail: "entrenador@titanium.com",
};

function routine(overrides: Partial<ClientRoutine>): ClientRoutine {
  return { ...parseClientRoutine(apiRoutine)!, ...overrides };
}

describe("rutinas del cliente", () => {
  it("convierte la respuesta de la API", () => {
    const parsed = parseClientRoutine(apiRoutine);

    expect(parsed).toMatchObject({
      id: apiRoutine.id,
      title: "Dia de pecho",
      level: "intermedio",
      category: "hipertrofia",
      estimatedMinutes: 90,
      trainerEmail: "entrenador@titanium.com",
      imageUrl: "https://res.cloudinary.com/demo/routine.jpg",
    });
    expect(parsed?.exercises[0]).toMatchObject({ name: "Press banca", sets: 12, restSeconds: 240 });
  });

  it("descarta rutinas inválidas y enlaces que no son https", () => {
    const parsed = parseClientRoutines([
      apiRoutine,
      { id: 3, title: "Sin id válido" },
      { ...apiRoutine, id: "r2", imageUrl: "http://inseguro.com/foto.jpg" },
      null,
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[1].imageUrl).toBeNull();
    expect(parseClientRoutines({ routines: [] })).toEqual([]);
  });

  it("usa el correo del entrenador cuando no viene trainerEmail", () => {
    const { trainerEmail: _ignored, ...withoutEmail } = apiRoutine;
    expect(parseClientRoutine(withoutEmail)?.trainerEmail).toBe("entrenador@titanium.com");
  });

  it("reconoce el error de membresía requerida", () => {
    expect(isMembershipRequiredError(new ApiError("Sin membresía", 403, {}, "MEMBERSHIP_REQUIRED"))).toBe(true);
    expect(isMembershipRequiredError(new ApiError("Sin permisos", 403))).toBe(false);
    expect(isMembershipRequiredError(new Error("red"))).toBe(false);
  });

  it("filtra por categoría, nivel y búsqueda sin importar acentos", () => {
    const routines = [
      routine({ id: "1", title: "Día de pecho", category: "hipertrofia", level: "intermedio" }),
      routine({
        id: "2",
        title: "Pérdida de peso inicial",
        objective: "Mejorar resistencia",
        description: "",
        category: "perdida_peso",
        level: "principiante",
      }),
    ];

    expect(filterRoutines(routines, { category: "perdida_peso", level: null, query: "" })).toHaveLength(1);
    expect(filterRoutines(routines, { category: null, level: "intermedio", query: "" })[0].id).toBe("1");
    expect(filterRoutines(routines, { category: null, level: null, query: "perdida RESISTENCIA" })[0].id).toBe("2");
    expect(filterRoutines(routines, { category: null, level: null, query: "yoga" })).toEqual([]);
  });

  it("ordena niveles y etiqueta categorías", () => {
    const routines = [
      routine({ level: "avanzado", category: "fuerza" }),
      routine({ level: "principiante", category: "perdida_peso" }),
      routine({ level: "intermedio", category: "fuerza" }),
    ];

    expect(getRoutineLevels(routines)).toEqual(["principiante", "intermedio", "avanzado"]);
    expect(getRoutineCategories(routines)).toEqual(["fuerza", "perdida_peso"]);
    expect(getCategoryLabel("perdida_peso")).toBe("Pérdida de peso");
    expect(getCategoryLabel("cross_training")).toBe("Cross training");
  });

  it("limita la búsqueda y usa singular y plural", () => {
    expect(sanitizeRoutineSearch("a".repeat(100))).toHaveLength(MAX_ROUTINE_SEARCH_LENGTH);
    expect(formatDaysPerWeek(1)).toBe("1 día");
    expect(formatDaysPerWeek(5)).toBe("5 días");
  });
});
