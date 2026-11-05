import { screen, userEvent } from "@testing-library/react-native";
import { measureRenders } from "reassure";

import { AppButton } from "../../src/components/ui/app-button";
import { AppInput } from "../../src/components/ui/app-input";
import { PasswordRequirementsView } from "../../src/features/authentication/views/password-requirements-view";

const lockIcon = { ios: "lock", android: "lock", web: "lock" } as const;

describe("Rendimiento — componentes de autenticación", () => {
  it("AppButton: renderizado inicial", async () => {
    await measureRenders(<AppButton title="Iniciar sesión" onPress={jest.fn()} />, {
      scenario: async () => {
        expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
      },
    });
  });

  it("AppInput: escribir una contraseña", async () => {
    const onChangeText = jest.fn();
    const scenario = async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText("••••••••"), "Password123!");
      expect(screen.getByDisplayValue("Password123!")).toHaveProp("secureTextEntry", true);
      expect(onChangeText).toHaveBeenLastCalledWith("Password123!");
    };

    await measureRenders(
      <AppInput
        secureTextEntry
        label="Contraseña"
        leftIcon={lockIcon}
        placeholder="••••••••"
        onChangeText={onChangeText}
      />,
      { scenario },
    );
  });

  it("PasswordRequirementsView: renderizado con contraseña válida", async () => {
    await measureRenders(<PasswordRequirementsView password="Password123!" />, {
      scenario: async () => {
        expect(screen.getAllByLabelText(/: cumplido$/)).toHaveLength(5);
        expect(screen.queryAllByLabelText(/: pendiente$/)).toHaveLength(0);
      },
    });
  });
});
