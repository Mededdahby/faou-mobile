import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

export type NotificationPermission = "granted" | "denied" | "undetermined";

function stateFromSettings(settings: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (settings.granted) return "granted";
  return settings.canAskAgain ? "undetermined" : "denied";
}

export async function readNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === "web") return "denied";
  try {
    return stateFromSettings(await Notifications.getPermissionsAsync());
  } catch {
    return "denied";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === "web") return "denied";
  try {
    const settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return stateFromSettings(settings);
  } catch {
    return "denied";
  }
}

export function openNotificationSettings() {
  void Linking.openSettings();
}
