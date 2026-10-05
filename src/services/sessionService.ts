import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "titanium_access_token";
let memoryToken: string | null = null;

export async function saveAccessToken(token: string): Promise<void> {
  if (!token || !token.trim()) {
    throw new Error("Access token is required.");
  }

  if (Platform.OS === "web") {
    memoryToken = token;
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return memoryToken;
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeAccessToken(): Promise<void> {
  if (Platform.OS === "web") {
    memoryToken = null;
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function hasStoredSession(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null && token.length > 0;
}
