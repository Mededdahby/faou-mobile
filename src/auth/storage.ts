import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "faou_admin_token";
const EMAIL_KEY = "faou_admin_email";

function webStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export async function getStoredToken() {
  if (Platform.OS === "web") return webStorage()?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredEmail() {
  if (Platform.OS === "web") return webStorage()?.getItem(EMAIL_KEY) ?? null;
  return SecureStore.getItemAsync(EMAIL_KEY);
}

export async function storeSession(token: string, email: string) {
  if (Platform.OS === "web") {
    webStorage()?.setItem(TOKEN_KEY, token);
    webStorage()?.setItem(EMAIL_KEY, email);
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(EMAIL_KEY, email),
  ]);
}

export async function clearStoredToken() {
  if (Platform.OS === "web") {
    webStorage()?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function clearSession() {
  if (Platform.OS === "web") {
    webStorage()?.removeItem(TOKEN_KEY);
    webStorage()?.removeItem(EMAIL_KEY);
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(EMAIL_KEY),
  ]);
}
