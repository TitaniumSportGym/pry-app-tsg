import { act, render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";
import { Alert } from "react-native";

import {
  archiveTrainerRoutine,
  createTrainerRoutine,
  deleteTrainerRoutine,
  getTrainerClients,
  getTrainerProfile,
  getTrainerRoutine,
  getTrainerRoutines,
  setExerciseVideoUrl,
  submitTrainerRoutine,
  updateTrainerProfile,
  updateTrainerRoutine,
  uploadExerciseVideo,
} from "../../src/features/trainer/api/trainer-api";
import type { TrainerProfile, TrainerRoutine } from "../../src/features/trainer/models/trainer";
import { RoutineEditorView } from "../../src/features/trainer/views/routine-editor-view";
import { TrainerClientsView } from "../../src/features/trainer/views/trainer-clients-view";
import { TrainerHomeView } from "../../src/features/trainer/views/trainer-home-view";
import { TrainerProfileView } from "../../src/features/trainer/views/trainer-profile-view";
import { TrainerRoutineDetailView } from "../../src/features/trainer/views/trainer-routine-detail-view";
import { TrainerRoutinesView } from "../../src/features/trainer/views/trainer-routines-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { logout, restoreSession } from "../../src/services/authService";
import { pickImage, pickVideo } from "../../src/services/media-picker";
import { ApiError } from "../../src/types/auth";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: jest.fn() },
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

jest.mock("../../src/services/media-picker", () => ({
  ...jest.requireActual("../../src/services/media-picker"),
  pickImage: jest.fn(),
  pickVideo: jest.fn(),
}));

jest.mock("../../src/features/trainer/api/trainer-api", () => ({
  getTrainerClients: jest.fn(),
  getTrainerProfile: jest.fn(),
  getTrainerRoutine: jest.fn(),
  getTrainerRoutines: jest.fn(),
  createTrainerRoutine: jest.fn(),
  updateTrainerRoutine: jest.fn(),
  deleteTrainerRoutine: jest.fn(),
  submitTrainerRoutine: jest.fn(),
  archiveTrainerRoutine: jest.fn(),
  uploadExerciseVideo: jest.fn(),
  setExerciseVideoUrl: jest.fn(),
  removeExerciseVideo: jest.fn(),
  updateTrainerProfile: jest.fn(),
}));

const ROUTINE_ID = "30cdac88-08ac-42e0-9c26-d52b3e295f84";
const EXERCISE_ID = "7a1d2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d";

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
  updatedAt: null,
  exercises: [
    {
      id: EXERCISE_ID,
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
      videoType: "youtube",
    },
  ],
};

const profile: TrainerProfile = {
  email: "entrenador@correo.com",
  fullName: "",
  phone: "",
  specialty: "",
  certifications: "",
  experienceYears: 0,
  bio: "",
  focus: "",
  photoUrl: "",
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
    jest.clearAllMocks();
    jest.mocked(getTrainerClients).mockResolvedValue([]);
    jest.mocked(getTrainerProfile).mockResolvedValue(profile);
  });

  it("el inicio resume rutinas por estado y pide completar el perfil", async () => {
    jest.mocked(getTrainerRoutines).mockResolvedValue([
      routine,
      { ...routine, id: EXERCISE_ID, title: "Pierna", status: "rejected" },
    ]);
    await renderAsTrainer(<TrainerHomeView />);

    expect(await screen.findByText("Hola, entrenador")).toBeOnTheScreen();
    expect(screen.getByText("Completa tu perfil")).toBeOnTheScreen();
    expect(screen.getByText("1 rutina rechazada")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Borradores: 1" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Clientes: 0" })).toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "CREAR RUTINA" }));
    expect(router.push).toHaveBeenCalledWith("/trainer/routines/editor");
    await user.press(screen.getByText("Completa tu perfil"));
    expect(router.push).toHaveBeenCalledWith("/trainer/account/profile");
    await user.press(screen.getByText("Pierna"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/trainer/routines/[id]", params: { id: EXERCISE_ID } });
  });

  it("lista las rutinas, filtra por estado y abre el detalle", async () => {
    jest.mocked(getTrainerRoutines).mockResolvedValue([routine]);
    await renderAsTrainer(<TrainerRoutinesView />);

    expect(await screen.findByText("Hipertrofia")).toBeOnTheScreen();
    expect(screen.getByText("1 rutina")).toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByText("Publicadas"));
    expect(screen.getByText("No hay rutinas con este filtro.")).toBeOnTheScreen();
    await user.press(screen.getByText("Todas"));
    await user.press(screen.getByRole("button", { name: "Hipertrofia, Borrador" }));

    expect(router.push).toHaveBeenCalledWith({ pathname: "/trainer/routines/[id]", params: { id: ROUTINE_ID } });
  });

  it("muestra el estado vacío con la acción de crear", async () => {
    jest.mocked(getTrainerRoutines).mockResolvedValue([]);
    await renderAsTrainer(<TrainerRoutinesView />);

    expect(await screen.findByText("AÚN NO TIENES RUTINAS")).toBeOnTheScreen();
  });

  it("muestra el detalle por día y envía el borrador a revisión tras confirmar", async () => {
    jest.mocked(getTrainerRoutine).mockResolvedValue(routine);
    jest.mocked(submitTrainerRoutine).mockResolvedValue({ ...routine, status: "pending_review" });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderAsTrainer(<TrainerRoutineDetailView routineId={ROUTINE_ID} />);

    expect(await screen.findByText("Escaladoras")).toBeOnTheScreen();
    expect(screen.getByText("DÍA 1 · 1 EJERCICIO")).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole("button", { name: "Enviar a revisión" }));
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => buttons[1].onPress?.());

    expect(submitTrainerRoutine).toHaveBeenCalledWith(ROUTINE_ID);
    alert.mockRestore();
  });

  it("una rutina publicada se puede editar y archivar", async () => {
    jest.mocked(getTrainerRoutine).mockResolvedValue({ ...routine, status: "published" });
    jest.mocked(archiveTrainerRoutine).mockResolvedValue({ ...routine, status: "archived" });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderAsTrainer(<TrainerRoutineDetailView routineId={ROUTINE_ID} />);
    const user = userEvent.setup();

    expect(await screen.findByText("Los socios con membresía activa ya pueden ver esta rutina.")).toBeOnTheScreen();
    expect(screen.queryByText("Eliminar rutina")).toBeNull();
    await user.press(screen.getByRole("button", { name: "Editar rutina" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/trainer/routines/editor", params: { id: ROUTINE_ID } });

    await user.press(screen.getByRole("button", { name: "Archivar rutina" }));
    await act(async () => alert.mock.calls[0][2]![1].onPress?.());
    expect(archiveTrainerRoutine).toHaveBeenCalledWith(ROUTINE_ID);
    alert.mockRestore();
  });

  it("elimina un borrador tras confirmar y vuelve a la lista", async () => {
    jest.mocked(getTrainerRoutine).mockResolvedValue(routine);
    jest.mocked(deleteTrainerRoutine).mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderAsTrainer(<TrainerRoutineDetailView routineId={ROUTINE_ID} />);

    await userEvent.setup().press(await screen.findByText("Eliminar rutina"));
    expect(alert.mock.calls[0][0]).toBe("¿Eliminar rutina?");
    await act(async () => alert.mock.calls[0][2]![1].onPress?.());

    expect(deleteTrainerRoutine).toHaveBeenCalledWith(ROUTINE_ID);
    expect(router.replace).toHaveBeenCalledWith("/trainer/routines");
    alert.mockRestore();
  });

  it("no consulta la API cuando el id de la rutina no es válido", async () => {
    await renderAsTrainer(<TrainerRoutineDetailView routineId="semana" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esta rutina.");
    expect(getTrainerRoutine).not.toHaveBeenCalled();
  });

  it("crea una rutina: valida, guarda el borrador, sube un video con progreso y la envía", async () => {
    const saved = { ...routine, exercises: [{ ...routine.exercises[0], hasVideo: false, videoUrl: null, videoType: "none" }] };
    jest.mocked(createTrainerRoutine).mockResolvedValue(saved);
    jest.mocked(updateTrainerRoutine).mockResolvedValue(saved);
    jest.mocked(submitTrainerRoutine).mockResolvedValue({ ...saved, status: "pending_review" });
    jest.mocked(pickVideo).mockResolvedValue({
      status: "picked",
      file: { uri: "file:///v.mp4", name: "v.mp4", type: "video/mp4", size: 1024, durationMs: 1000 },
    });
    jest.mocked(uploadExerciseVideo).mockImplementation(async (_r, _e, _f, callbacks) => {
      callbacks?.onProgress?.(0.5);
      return { ...saved, exercises: [{ ...saved.exercises[0], hasVideo: true, videoType: "upload", videoUrl: "https://cdn.test/v.mp4" }] };
    });
    await renderAsTrainer(<RoutineEditorView />);
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Siguiente: ejercicios" }));
    expect(screen.getByText("Escribe el nombre de la rutina.")).toBeOnTheScreen();

    await user.type(screen.getByLabelText("Nombre de la rutina"), "Hipertrofia");
    await user.press(screen.getByRole("button", { name: "Siguiente: ejercicios" }));
    await user.press(screen.getByRole("button", { name: "Guardar y seguir" }));
    expect(screen.getByText("Agrega al menos un ejercicio.")).toBeOnTheScreen();

    await user.press(screen.getByText("AGREGAR EJERCICIO AL DÍA 1"));
    await user.type(screen.getByLabelText("Nombre del ejercicio"), "Escaladoras");
    await user.press(screen.getByRole("button", { name: "Guardar ejercicio" }));
    await user.press(screen.getByRole("button", { name: "Guardar y seguir" }));

    expect(await screen.findByText("Videos de los ejercicios")).toBeOnTheScreen();
    expect(createTrainerRoutine).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ signal: expect.anything() }));

    await user.press(screen.getByText("Subir video"));
    expect(await screen.findByText("Día 1 · Video subido")).toBeOnTheScreen();
    expect(uploadExerciseVideo).toHaveBeenCalledWith(ROUTINE_ID, EXERCISE_ID, expect.objectContaining({ name: "v.mp4" }), expect.anything());

    await user.press(screen.getByRole("button", { name: "Enviar a revisión" }));
    expect(updateTrainerRoutine).toHaveBeenCalledWith(ROUTINE_ID, expect.any(FormData), expect.anything());
    expect(submitTrainerRoutine).toHaveBeenCalledWith(ROUTINE_ID);
    expect(router.replace).toHaveBeenCalledWith({ pathname: "/trainer/routines/[id]", params: { id: ROUTINE_ID } });
  });

  it("en el paso 3 rechaza enlaces inseguros y guarda los de https", async () => {
    const saved = { ...routine, exercises: [{ ...routine.exercises[0], hasVideo: false, videoUrl: null, videoType: "none" }] };
    jest.mocked(getTrainerRoutine).mockResolvedValue(saved);
    jest.mocked(updateTrainerRoutine).mockResolvedValue(saved);
    jest.mocked(setExerciseVideoUrl).mockResolvedValue(routine);
    await renderAsTrainer(<RoutineEditorView routineId={ROUTINE_ID} />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Siguiente: ejercicios" }));
    await user.press(screen.getByRole("button", { name: "Guardar y seguir" }));
    await screen.findByText("Videos de los ejercicios");

    await user.type(screen.getByLabelText("Enlace de YouTube"), "http://inseguro.test");
    await user.press(screen.getByText("Guardar enlace"));
    expect(screen.getByText("Pega un enlace que empiece con https://")).toBeOnTheScreen();
    expect(setExerciseVideoUrl).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Enlace de YouTube"));
    await user.type(screen.getByLabelText("Enlace de YouTube"), "https://youtu.be/abc");
    await user.press(screen.getByText("Guardar enlace"));
    expect(setExerciseVideoUrl).toHaveBeenCalledWith(ROUTINE_ID, EXERCISE_ID, "https://youtu.be/abc");
  });

  it("muestra el error de tamaño del video sin subir nada", async () => {
    const saved = { ...routine, exercises: [{ ...routine.exercises[0], hasVideo: false, videoUrl: null, videoType: "none" }] };
    jest.mocked(getTrainerRoutine).mockResolvedValue(saved);
    jest.mocked(updateTrainerRoutine).mockResolvedValue(saved);
    jest.mocked(pickVideo).mockResolvedValue({ status: "invalid", message: "El video pesa 150 MB. El máximo es 100 MB." });
    await renderAsTrainer(<RoutineEditorView routineId={ROUTINE_ID} />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Siguiente: ejercicios" }));
    await user.press(screen.getByRole("button", { name: "Guardar y seguir" }));
    await user.press(await screen.findByText("Subir video"));

    expect(screen.getByText("El video pesa 150 MB. El máximo es 100 MB.")).toBeOnTheScreen();
    expect(uploadExerciseVideo).not.toHaveBeenCalled();
  });

  it("edita el perfil con foto y valida los campos obligatorios", async () => {
    jest.mocked(pickImage).mockResolvedValue({
      status: "picked",
      file: { uri: "file:///foto.jpg", name: "foto.jpg", type: "image/jpeg", size: 2048, durationMs: null },
    });
    jest.mocked(updateTrainerProfile).mockResolvedValue({ ...profile, fullName: "Rogelio" });
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await renderAsTrainer(<TrainerProfileView />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByText("Escribe tu nombre completo.")).toBeOnTheScreen();
    expect(updateTrainerProfile).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Nombre completo"), "Rogelio");
    await user.type(screen.getByLabelText("Especialidad"), "Fuerza");
    await user.press(screen.getByRole("button", { name: "Cambiar foto" }));
    await user.press(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateTrainerProfile).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ onProgress: expect.any(Function) }));
    expect(router.back).toHaveBeenCalled();
  });

  it("muestra un aviso sin cerrar la sesión cuando falta permiso (403)", async () => {
    jest
      .mocked(getTrainerRoutines)
      .mockRejectedValue(new ApiError("No tienes permisos para acceder a este recurso", 403));
    await renderAsTrainer(<TrainerRoutinesView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes permisos para consultar esta información.");
    expect(logout).not.toHaveBeenCalled();
  });

  it("cierra la sesión cuando el servidor la rechaza (401)", async () => {
    jest.mocked(getTrainerRoutines).mockRejectedValue(new ApiError("jwt expired", 401));
    await renderAsTrainer(<TrainerRoutinesView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Tu sesión expiró. Inicia sesión de nuevo.");
    expect(logout).toHaveBeenCalled();
  });

  it("la pestaña de clientes indica que llegará próximamente sin consultar la API", async () => {
    await renderAsTrainer(<TrainerClientsView />);

    expect(await screen.findByText("PRÓXIMAMENTE")).toBeOnTheScreen();
    expect(screen.getByText("CLIENTES")).toBeOnTheScreen();
    expect(getTrainerClients).not.toHaveBeenCalled();
  });
});
