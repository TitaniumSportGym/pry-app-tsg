import type { RoutineExercise, TrainerProfile } from "./trainer";
import {
  formatRest,
  formatRoutineSchedule,
  getClientDisplayName,
  getRoutineStatusLabel,
  getSafeVideoUrl,
  groupExercisesByDay,
  isProfileIncomplete,
  isValidResourceId,
} from "./trainer-presentation";

function exercise(overrides: Partial<RoutineExercise>): RoutineExercise {
  return {
    id: "e",
    name: "Ejercicio",
    description: null,
    dayNumber: 1,
    sets: 4,
    reps: "10",
    restSeconds: 60,
    notes: null,
    order: 0,
    videoUrl: null,
    hasVideo: false,
    ...overrides,
  };
}

describe("isValidResourceId", () => {
  it("acepta un UUID y rechaza cualquier otro valor", () => {
    expect(isValidResourceId("30cdac88-08ac-42e0-9c26-d52b3e295f84")).toBe(true);
    expect(isValidResourceId("semana")).toBe(false);
    expect(isValidResourceId(["30cdac88-08ac-42e0-9c26-d52b3e295f84"])).toBe(false);
    expect(isValidResourceId(undefined)).toBe(false);
  });
});

describe("textos de la rutina", () => {
  it("traduce el estado de la rutina", () => {
    expect(getRoutineStatusLabel("draft")).toBe("Borrador");
    expect(getRoutineStatusLabel("published")).toBe("Publicada");
    expect(getRoutineStatusLabel("pausada")).toBe("Pausada");
  });

  it("resume la duración de la rutina", () => {
    expect(
      formatRoutineSchedule({ durationWeeks: 1, daysPerWeek: 3, estimatedMinutes: 45 }),
    ).toBe("1 semana · 3 días/semana · 45 min");
  });

  it("formatea el descanso en segundos y minutos", () => {
    expect(formatRest(28)).toBe("28 s");
    expect(formatRest(60)).toBe("1 min");
    expect(formatRest(90)).toBe("1 min 30 s");
  });
});

describe("groupExercisesByDay", () => {
  it("agrupa por día y respeta el orden de cada ejercicio", () => {
    const days = groupExercisesByDay([
      exercise({ id: "c", dayNumber: 2, order: 0 }),
      exercise({ id: "b", dayNumber: 1, order: 1 }),
      exercise({ id: "a", dayNumber: 1, order: 0 }),
    ]);

    expect(days.map((day) => day.dayNumber)).toEqual([1, 2]);
    expect(days[0].exercises.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("getSafeVideoUrl", () => {
  it("solo permite enlaces https", () => {
    expect(getSafeVideoUrl("https://www.youtube.com/watch?v=U9OPHAlIicw")).toBe(
      "https://www.youtube.com/watch?v=U9OPHAlIicw",
    );
    expect(getSafeVideoUrl("http://example.com/video")).toBeNull();
    expect(getSafeVideoUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeVideoUrl("no es una url")).toBeNull();
    expect(getSafeVideoUrl(null)).toBeNull();
  });
});

describe("datos del entrenador", () => {
  it("muestra el nombre del cliente o, si falta, su correo", () => {
    expect(getClientDisplayName({ id: "1", email: "a@b.com", fullName: "Ana López" })).toBe(
      "Ana López",
    );
    expect(getClientDisplayName({ id: "1", email: "a@b.com", fullName: "  " })).toBe("a@b.com");
  });

  it("detecta un perfil sin nombre o sin especialidad", () => {
    const profile: TrainerProfile = {
      email: "a@b.com",
      fullName: "",
      phone: "",
      specialty: "",
      certifications: "",
      experienceYears: 0,
      bio: "",
    };

    expect(isProfileIncomplete(profile)).toBe(true);
    expect(isProfileIncomplete({ ...profile, fullName: "Rogelio", specialty: "Fuerza" })).toBe(
      false,
    );
  });
});
