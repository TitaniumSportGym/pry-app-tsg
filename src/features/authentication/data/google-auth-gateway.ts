import Constants, { ExecutionEnvironment } from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/config/env";
import {
  getTokenFromGoogleCallback,
  GoogleAuthError,
} from "@/features/authentication/models/google-auth-callback";

const GOOGLE_CALLBACK_URL = "pryapptsg://oauth-callback";

export async function openGoogleAuthSession() {
  if (Platform.OS === "web") {
    throw new GoogleAuthError(
      "El inicio con Google está disponible en la aplicación móvil.",
    );
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new GoogleAuthError(
      "Google requiere una compilación de desarrollo para regresar de forma segura a la app.",
    );
  }

  const authUrl = `${getApiBaseUrl()}/api/auth/google?client=mobile`;
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    GOOGLE_CALLBACK_URL,
  );

  if (result.type !== "success") {
    return null;
  }

  return getTokenFromGoogleCallback(result.url);
}
