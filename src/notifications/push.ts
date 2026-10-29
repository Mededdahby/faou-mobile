import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "@/api/endpoints";
import { readNotificationPermission } from "./permissions";

const PUSH_TOKEN_KEY = "faou_expo_push_token";

function expoProjectId() {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? null;
}

export async function getStoredPushToken() {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export async function registerPushToken() {
  if (Platform.OS === "web") return null;
  const permission = await readNotificationPermission();
  if (permission !== "granted") return null;

  const projectId = expoProjectId();
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.notifications.registerDevice({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      deviceName: Constants.deviceName ?? Platform.OS,
      appVersion: Constants.expoConfig?.version ?? "0.1.0",
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    if (__DEV__) {
      console.warn("Push token registration failed", error);
    }
    return null;
  }
}

export async function unregisterPushToken() {
  if (Platform.OS === "web") return;
  const token = await getStoredPushToken().catch(() => null);
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => undefined);
  if (!token) return;

  try {
    await api.notifications.unregisterDevice(token);
  } catch {
    // Best effort: the token is already removed from the device.
  }
}
