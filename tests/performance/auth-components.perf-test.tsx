import { screen, userEvent } from "@testing-library/react-native";
import { measureRenders } from "reassure";

import { AppButton } from "../../src/components/ui/app-button";
import { AppInput } from "../../src/components/ui/app-input";
import { PasswordRequirementsView } from "../../src/features/authentication/views/password-requirements-view";

const lockIcon = { ios: "lock", android: "lock", web: "lock" } as const;

describe("Rendimiento — componentes de autenticación", () => {
  it("AppButton: renderizado inicial", async () => {
    await measureRenders(<AppButton title="Iniciar sesión" onPress={jest.fn()} />);
  });

  it("AppInput: escribir una contraseña", async () => {
    const scenario = async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText("••••••••"), "Password123!");
    };

    await measureRenders(
      <AppInput secureTextEntry label="Contraseña" leftIcon={lockIcon} placeholder="••••••••" />,
      { scenario },
    );
  });

  it("PasswordRequirementsView: renderizado con contraseña válida", async () => {
    await measureRenders(<PasswordRequirementsView password="Password123!" />);
  });
});
