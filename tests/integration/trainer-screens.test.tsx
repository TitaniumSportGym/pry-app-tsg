import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";

import {
  getTrainerClients,
  getTrainerRoutine,
  getTrainerRoutines,
} from "../../src/features/trainer/api/trainer-api";
import type { TrainerRoutine } from "../../src/features/trainer/models/trainer";
import { TrainerClientsView } from "../../src/features/trainer/views/trainer-clients-view";
import { TrainerRoutineDetailView } from "../../src/features/trainer/views/trainer-routine-detail-view";
import { TrainerRoutinesView } from "../../src/features/trainer/views/trainer-routines-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { logout, restoreSession } from "../../src/services/authService";
import { ApiError } from "../../src/types/auth";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("../../src/services/authService", () => ({
  getCurrentUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  restoreSession: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock("../../src/features/authentication/data/google-auth-gateway", () => ({
  openGoogleAuthSession: jest.fn(),
}));

jest.mock("../../src/services/sessionService", () => ({
  removeAccessToken: jest.fn(),
  saveAccessToken: jest.fn(),
}));

jest.mock("../../src/features/trainer/api/trainer-api", () => ({
  getTrainerClients: jest.fn(),
  getTrainerProfile: jest.fn(),
  getTrainerRoutine: jest.fn(),
  getTrainerRoutines: jest.fn(),
}));

const ROUTINE_ID = "30cdac88-08ac-42e0-9c26-d52b3e295f84";

const routine: TrainerRoutine = {
  id: ROUTINE_ID,
  title: "Hipertrofia",
  objective: "Ganancia de estamina",
  description: null,
  level: "principiante",
  category: "general",
  durationWeeks: 4,
  daysPerWeek: 3,
  estimatedMinutes: 45,
  imageUrl: null,
  status: "draft",
  exercises: [
    {
      id: "e1",
      name: "Escaladoras",
      description: null,
      dayNumber: 1,
      sets: 4,
      reps: "10",
      restSeconds: 60,
      notes: null,
      order: 0,
      videoUrl: "https://www.youtube.com/watch?v=U9OPHAlIicw",
      hasVideo: true,
    },
  ],
};

async function renderAsTrainer(ui: ReactElement) {
  jest.mocked(restoreSession).mockResolvedValue({
    authenticated: true,
    user: { id: "t1", email: "entrenador@correo.com", rol: "entrenador" },
  });

  await render(<AuthProvider>{ui}</AuthProvider>);
}

describe("Integración — pantallas del entrenador", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("lista las rutinas y abre el detalle de la seleccionada", async () => {
    jest.mocked(getTrainerRoutines).mockResolvedValue([routine]);
    await renderAsTrainer(<TrainerRoutinesView />);

    expect(await screen.findByText("Hipertrofia")).toBeOnTheScreen();
    expect(screen.getByText("Borrador")).toBeOnTheScreen();
    expect(screen.getByText("4 semanas · 3 días/semana · 45 min")).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole("button", { name: "Ver rutina Hipertrofia" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/trainer/routines/[id]",
      params: { id: ROUTINE_ID },
    });
  });

  it("muestra los ejercicios de la rutina agrupados por día", async () => {
    jest.mocked(getTrainerRoutine).mockResolvedValue(routine);
    await renderAsTrainer(<TrainerRoutineDetailView routineId={ROUTINE_ID} />);

    expect(await screen.findByText("DÍA 1")).toBeOnTheScreen();
    expect(screen.getByText("Escaladoras")).toBeOnTheScreen();
    expect(screen.getByText("4 series × 10 reps · descanso 1 min")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ver video" })).toBeOnTheScreen();
  });

  it("no consulta la API cuando el id de la rutina no es válido", async () => {
    await renderAsTrainer(<TrainerRoutineDetailView routineId="semana" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esta rutina.");
    expect(getTrainerRoutine).not.toHaveBeenCalled();
  });

  it("muestra un aviso sin cerrar la sesión cuando falta permiso (403)", async () => {
    jest
      .mocked(getTrainerClients)
      .mockRejectedValue(
        new ApiError("No tienes permisos para acceder a este recurso", 403),
      );
    await renderAsTrainer(<TrainerClientsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tienes permisos para consultar esta información.",
    );
    expect(logout).not.toHaveBeenCalled();
  });

  it("cierra la sesión cuando el servidor la rechaza (401)", async () => {
    jest.mocked(getTrainerClients).mockRejectedValue(new ApiError("jwt expired", 401));
    await renderAsTrainer(<TrainerClientsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu sesión expiró. Inicia sesión de nuevo.",
    );
    expect(logout).toHaveBeenCalled();
  });

  it("indica cuando el entrenador aún no tiene clientes", async () => {
    jest.mocked(getTrainerClients).mockResolvedValue([]);
    await renderAsTrainer(<TrainerClientsView />);

    expect(await screen.findByText("Aún no tienes clientes asignados")).toBeOnTheScreen();
  });
});
