import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { sessionEvents } from '../core/observer/session-events';

const TOKEN_KEY = "titanium_access_token";
let memoryToken: string | null = null;
let mutations: Promise<unknown> = Promise.resolve();
let rejectedToken: string | null | undefined;

function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutations.then(operation);
  // A storage failure must not poison later login/cleanup operations.
  mutations = result.catch(() => undefined);
  return result;
}

async function readToken() {
  return Platform.OS === 'web' ? memoryToken : SecureStore.getItemAsync(TOKEN_KEY);
}

async function deleteToken() {
  if (Platform.OS === 'web') memoryToken = null;
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveAccessToken(token: string): Promise<void> {
  if (!token || !token.trim()) {
    throw new Error("Access token is required.");
  }

  await mutate(async () => {
    if (Platform.OS === 'web') memoryToken = token;
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
    rejectedToken = undefined;
  });
}

export async function getAccessToken(): Promise<string | null> {
  await mutations;
  const token = await readToken();
  return token === rejectedToken ? null : token;
}

export async function removeAccessToken(): Promise<void> {
  await mutate(deleteToken);
}

/** Atomically compare and remove only the credential rejected by this request. */
export function invalidateAccessToken(expected: string | null): Promise<boolean> {
  return mutate(async () => {
    if (rejectedToken === expected) return false;
    let current: string | null;
    try { current = await readToken(); } catch (error) {
      rejectedToken = expected;
      sessionEvents.notify({ type: 'invalidated' });
      throw error;
    }
    if (current !== expected) return false;
    rejectedToken = expected;
    try {
      await deleteToken();
    } finally {
      // Close UI/cache even if storage is unavailable; never publish the JWT.
      sessionEvents.notify({ type: 'invalidated' });
    }
    return true;
  });
}

export async function hasStoredSession(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null && token.length > 0;
}
