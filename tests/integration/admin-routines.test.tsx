import { act, render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";
import { Alert } from "react-native";

import { decideAdminRoutine, getAdminRoutines } from "../../src/features/admin/api/admin-routines-api";
import { parseAdminRoutines } from "../../src/features/admin/models/admin-routine";
import { AdminRoutineReviewView } from "../../src/features/admin/views/admin-routine-review-view";
import { AdminRoutinesView } from "../../src/features/admin/views/admin-routines-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { restoreSession } from "../../src/services/authService";
import { ApiError } from "../../src/types/auth";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("react-native-webview", () => {
  const { Text } = require("react-native");
  return { WebView: () => <Text>Reproductor de YouTube</Text> };
});

jest.mock("expo-video", () => ({
  useVideoPlayer: () => ({ status: "readyToPlay", play: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() }),
  VideoView: () => null,
}));

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

jest.mock("../../src/features/admin/api/admin-routines-api", () => ({
  getAdminRoutines: jest.fn(),
  decideAdminRoutine: jest.fn(),
}));

const PENDING_ID = "30cdac88-08ac-42e0-9c26-d52b3e295f84";
const PUBLISHED_ID = "7a1d2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d";

const routines = parseAdminRoutines({
  ok: true,
  routines: [
    {
      id: PENDING_ID,
      title: "Fuerza tren inferior",
      status: "pending_review",
      trainerName: "Rogelio Hernández",
      exercises: [{ id: "e1", name: "Sentadilla", dayNumber: 1, sets: 4, reps: "8", restSeconds: 90, hasVideo: true, videoType: "upload", videoUrl: "https://cdn.test/v.mp4" }],
    },
    { id: PUBLISHED_ID, title: "Movilidad", status: "published", trainer: { fullName: "Ana" }, exercises: [] },
  ],
});

async function renderAsAdmin(ui: ReactElement) {
  jest.mocked(restoreSession).mockResolvedValue({
    authenticated: true,
    user: { id: "a1", email: "admin@example.test", rol: "administrador" },
  });
  await render(<AuthProvider>{ui}</AuthProvider>);
}

describe("Integración — revisión de rutinas del administrador", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAdminRoutines).mockResolvedValue(routines);
  });

  it("lista las rutinas por revisar, cambia de filtro y abre la revisión", async () => {
    await renderAsAdmin(<AdminRoutinesView />);

    expect(await screen.findByText("Fuerza tren inferior")).toBeOnTheScreen();
    expect(screen.getByText("1 rutina espera tu revisión")).toBeOnTheScreen();
    expect(screen.getByText("Rogelio Hernández")).toBeOnTheScreen();
    expect(screen.queryByText("Movilidad")).toBeNull();

    const user = userEvent.setup();
    await user.press(screen.getByText("Publicadas · 1"));
    expect(screen.getByText("Movilidad")).toBeOnTheScreen();
    await user.press(screen.getByText("Rechazadas · 0"));
    expect(screen.getByText("SIN RUTINAS")).toBeOnTheScreen();

    await user.press(screen.getByText("Por revisar · 1"));
    await user.press(screen.getByRole("button", { name: "Fuerza tren inferior, En revisión" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/admin/routines/[id]", params: { id: PENDING_ID } });
  });

  it("aprueba una rutina tras confirmar y vuelve a la lista", async () => {
    jest.mocked(decideAdminRoutine).mockResolvedValue(undefined);
    jest.mocked(router.canGoBack).mockReturnValue(true);
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderAsAdmin(<AdminRoutineReviewView routineId={PENDING_ID} />);

    expect(await screen.findByText("Creada por Rogelio Hernández")).toBeOnTheScreen();
    expect(screen.getByText("Pendiente de tu revisión")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Archivar" })).toBeNull();

    await userEvent.setup().press(screen.getByRole("button", { name: "Aprobar y publicar" }));
    expect(alert.mock.calls[0][0]).toBe("¿Aprobar y publicar?");
    await act(async () => alert.mock.calls[0][2]![1].onPress?.());

    expect(decideAdminRoutine).toHaveBeenCalledWith(PENDING_ID, "approve");
    expect(router.back).toHaveBeenCalled();
    alert.mockRestore();
  });

  it("muestra el error del servidor si no se pudo rechazar", async () => {
    jest.mocked(decideAdminRoutine).mockRejectedValue(new ApiError("Error interno", 500));
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderAsAdmin(<AdminRoutineReviewView routineId={PUBLISHED_ID} />);

    await userEvent.setup().press(await screen.findByRole("button", { name: "Rechazar" }));
    await act(async () => alert.mock.calls[0][2]![1].onPress?.());

    expect(decideAdminRoutine).toHaveBeenCalledWith(PUBLISHED_ID, "reject");
    expect(await screen.findByRole("alert")).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("no encuentra rutinas con id inválido o que ya no están en la lista", async () => {
    await renderAsAdmin(<AdminRoutineReviewView routineId="otra" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esta rutina.");
    expect(getAdminRoutines).not.toHaveBeenCalled();
  });
});
