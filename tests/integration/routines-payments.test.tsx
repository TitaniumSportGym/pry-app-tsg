import { act, render, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";

import { getMyPaymentHistory } from "../../src/features/payments/api/payments-api";
import type { PaymentHistoryEntry } from "../../src/features/payments/models/payment-history";
import { paymentsRepository } from "../../src/features/payments/repositories/payments-repository";
import { PaymentsView } from "../../src/features/payments/views/payments-view";
import { getClientRoutine, getClientRoutines } from "../../src/features/training/api/training-api";
import type { ClientRoutine } from "../../src/features/training/models/client-routine";
import { RoutineDetailView } from "../../src/features/training/views/routine-detail-view";
import { RoutinesView } from "../../src/features/training/views/routines-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { restoreSession } from "../../src/services/authService";
import { ApiError } from "../../src/types/auth";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () => ({
  ...require("react-native-safe-area-context/jest/mock").default,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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

jest.mock("../../src/features/training/api/training-api", () => ({
  getClientRoutine: jest.fn(),
  getClientRoutines: jest.fn(),
}));

jest.mock("../../src/features/payments/api/payments-api", () => ({
  getMyPaymentHistory: jest.fn(),
  getMyPayments: jest.fn(),
}));

const CHEST_ID = "f09a7a9b-8cb4-4119-ab5e-8c93afddf35a";

function exercise(id: string, name: string, dayNumber: number, order: number) {
  return {
    id,
    name,
    description: "Sube lentamente",
    dayNumber,
    sets: 12,
    reps: "10",
    restSeconds: 240,
    notes: dayNumber === 1 ? "No juntar codos" : null,
    order,
    videoUrl: null,
    hasVideo: false,
  };
}

const chestRoutine: ClientRoutine = {
  id: CHEST_ID,
  title: "Día de pecho",
  objective: "Ganancia muscular",
  description: "Ponerse fuerte",
  level: "intermedio",
  category: "hipertrofia",
  durationWeeks: 4,
  daysPerWeek: 2,
  estimatedMinutes: 90,
  imageUrl: null,
  trainerEmail: "entrenador@titanium.com",
  exercises: [
    exercise("e1", "Press banca", 1, 0),
    exercise("e2", "Aperturas", 1, 1),
    exercise("e3", "Fondos", 2, 0),
  ],
};

const weightLossRoutine: ClientRoutine = {
  ...chestRoutine,
  id: "c434469d-d753-47be-8136-ac75a1458f18",
  title: "Pérdida de peso inicial",
  objective: "Mejorar resistencia",
  category: "perdida_peso",
  level: "principiante",
  exercises: [],
};

function historyEntry(overrides: Partial<PaymentHistoryEntry>): PaymentHistoryEntry {
  return {
    id: "p1",
    amount: 70,
    currency: "MXN",
    status: "paid",
    date: new Date(2026, 9, 26, 22, 27),
    orderId: "o1",
    orderNumber: "ORD-2026-000265",
    method: "online_checkout",
    title: "Visita",
    kind: "membership",
    ...overrides,
  };
}

async function renderAsClient(ui: ReactElement) {
  jest.mocked(restoreSession).mockResolvedValue({
    authenticated: true,
    user: { id: "c1", email: "20230008@uthh.edu.mx", rol: "cliente" },
  });

  await render(<AuthProvider>{ui}</AuthProvider>);
}

describe("Integración — rutinas del cliente", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("lista las rutinas, filtra por categoría y abre el detalle", async () => {
    jest.mocked(getClientRoutines).mockResolvedValue([chestRoutine, weightLossRoutine]);
    await renderAsClient(<RoutinesView />);
    const user = userEvent.setup();

    expect(await screen.findByText("Día de pecho")).toBeOnTheScreen();
    expect(screen.getByText("2 rutinas del equipo Titanium")).toBeOnTheScreen();
    expect(screen.getByText("Pérdida de peso inicial")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Pérdida de peso" }));
    expect(screen.queryByText("Día de pecho")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Ver rutina Pérdida de peso inicial" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/account/routines/[id]",
      params: { id: weightLossRoutine.id },
    });
  });

  it("pagina las rutinas de cuatro en cuatro", async () => {
    const routines = Array.from({ length: 6 }, (_, index) => ({
      ...chestRoutine,
      id: `30cdac88-08ac-42e0-9c26-d52b3e295f8${index}`,
      title: `Rutina ${index + 1}`,
    }));
    jest.mocked(getClientRoutines).mockResolvedValue(routines);
    await renderAsClient(<RoutinesView />);

    expect(await screen.findByText("Rutina 4")).toBeOnTheScreen();
    expect(screen.queryByText("Rutina 5")).toBeNull();
    expect(screen.getByText("Mostrando 1–4 de 6 rutinas")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();

    await userEvent.setup().press(screen.getByRole("button", { name: "Página 2" }));
    expect(screen.getByText("Rutina 5")).toBeOnTheScreen();
    expect(screen.queryByText("Rutina 1")).toBeNull();
    expect(screen.getByText("Mostrando 5–6 de 6 rutinas")).toBeOnTheScreen();
  });

  it("invita a contratar una membresía cuando el backend la exige", async () => {
    jest
      .mocked(getClientRoutines)
      .mockRejectedValue(new ApiError("Membresía requerida", 403, {}, "MEMBERSHIP_REQUIRED"));
    await renderAsClient(<RoutinesView />);

    expect(await screen.findByText("AÚN NO HAY RUTINAS PARA TI")).toBeOnTheScreen();
    expect(screen.getByText("0 rutinas disponibles")).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole("button", { name: "Ver membresías" }));
    expect(router.push).toHaveBeenCalledWith("/memberships");
  });

  it("muestra los ejercicios por día en el detalle", async () => {
    jest.mocked(getClientRoutine).mockResolvedValue(chestRoutine);
    await renderAsClient(<RoutineDetailView routineId={CHEST_ID} />);

    expect(await screen.findByText("DÍA DE PECHO")).toBeOnTheScreen();
    expect(screen.getByText("4 semanas")).toBeOnTheScreen();
    expect(screen.getByText("2 días por semana")).toBeOnTheScreen();
    expect(screen.getByText("Press banca")).toBeOnTheScreen();
    expect(screen.getAllByText("No juntar codos")).toHaveLength(2);
    expect(screen.getAllByText("4 min")).toHaveLength(2);
    expect(screen.queryByText("Fondos")).toBeNull();

    await userEvent.setup().press(screen.getByRole("button", { name: "Día 2 · 1 ejercicio" }));
    expect(screen.getByText("Fondos")).toBeOnTheScreen();
    expect(screen.queryByText("Press banca")).toBeNull();
  });

  it("reproduce el video de YouTube del ejercicio dentro de la app", async () => {
    jest.mocked(getClientRoutine).mockResolvedValue({
      ...chestRoutine,
      exercises: [
        {
          ...exercise("e1", "Press banca", 1, 0),
          videoUrl: "https://www.youtube.com/watch?v=U9OPHAlIicw",
          hasVideo: true,
        },
        exercise("e2", "Aperturas", 1, 1),
      ],
    });
    await renderAsClient(<RoutineDetailView routineId={CHEST_ID} />);
    const user = userEvent.setup();

    expect(await screen.findByText("Video del ejercicio pendiente de actualización")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Ver video de Press banca" }));

    expect(await screen.findByText("Reproductor de YouTube")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Cerrar video" }));
    expect(screen.queryByText("Reproductor de YouTube")).toBeNull();
  });

  it("no consulta la API con un id inválido", async () => {
    await renderAsClient(<RoutineDetailView routineId="no-es-un-uuid" />);

    expect(await screen.findByText("No encontramos esta rutina.")).toBeOnTheScreen();
    expect(getClientRoutine).not.toHaveBeenCalled();
  });
});

describe("Integración — mis pagos", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("muestra el total confirmado, agrupa por mes y filtra por estado", async () => {
    jest.mocked(getMyPaymentHistory).mockResolvedValue([
      historyEntry({}),
      historyEntry({
        id: "p2",
        status: "pending",
        date: new Date(2026, 9, 22, 14, 29),
        orderNumber: "ORD-2026-000264",
      }),
      historyEntry({
        id: "p3",
        amount: 1400,
        date: new Date(2026, 5, 21, 16, 2),
        method: "cash",
        title: "Paquete 4 personas",
        kind: "group",
        orderNumber: "ORD-2026-000002",
      }),
    ]);
    await renderAsClient(<PaymentsView />);

    expect(await screen.findByText("$1,470.00")).toBeOnTheScreen();
    expect(screen.getByLabelText("Pendientes: 1")).toBeOnTheScreen();
    expect(screen.getByText("Octubre 2026")).toBeOnTheScreen();
    expect(screen.getByText("Junio 2026")).toBeOnTheScreen();
    expect(screen.getByText("ORD-2026-000265")).toBeOnTheScreen();
    expect(screen.getByText("Efectivo")).toBeOnTheScreen();
    // A pending payment has no receipt yet.
    expect(screen.getByText("Sin comprobante")).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole("button", { name: "Pendientes · 1" }));
    const pending = screen.getByLabelText(/^Visita, \$70\.00, Pendiente/);
    expect(within(pending).getByText("22 oct 2026 · 2:29 p.m.")).toBeOnTheScreen();
    expect(screen.queryByText("Paquete 4 personas")).toBeNull();
  });

  it("se actualiza solo cuando otra parte de la app invalida los pagos (Observer)", async () => {
    jest.mocked(getMyPaymentHistory).mockResolvedValueOnce([
      historyEntry({ status: "pending", orderNumber: null }),
    ]);
    await renderAsClient(<PaymentsView />);
    expect(await screen.findByText("Sin comprobante")).toBeOnTheScreen();

    // E.g. the client closed Mercado Pago after paying: the purchase flow only
    // invalidates the repository; this screen is notified and reloads.
    jest.mocked(getMyPaymentHistory).mockResolvedValueOnce([historyEntry({})]);
    await act(() => paymentsRepository.invalidate());

    expect(await screen.findByText("ORD-2026-000265")).toBeOnTheScreen();
    expect(getMyPaymentHistory).toHaveBeenCalledTimes(2);
  });

  it("muestra el estado vacío cuando no hay pagos", async () => {
    jest.mocked(getMyPaymentHistory).mockResolvedValue([]);
    await renderAsClient(<PaymentsView />);

    expect(await screen.findByText("AÚN NO TIENES PAGOS")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Ver membresías" }));
    expect(router.push).toHaveBeenCalledWith("/memberships");
  });
});
