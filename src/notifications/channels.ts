import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

export const NOTIFICATION_CHANNELS = {
  default: "default",
  leads: "leads",
  approvals: "approvals",
  tasks: "tasks",
  invoices: "invoices",
} as const;

export async function ensureNotificationChannels() {
  if (Platform.OS !== "android") return;

  await Promise.all([
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.default, {
      name: "Général",
      description: "Notifications générales de FAOU Admin",
      importance: AndroidImportance.DEFAULT,
      sound: "default",
      showBadge: true,
    }),
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.leads, {
      name: "Demandes",
      description: "Nouvelles demandes de devis",
      importance: AndroidImportance.HIGH,
      sound: "default",
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0F6B84",
    }),
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.approvals, {
      name: "Devis",
      description: "Devis acceptés ou refusés",
      importance: AndroidImportance.HIGH,
      sound: "default",
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0F6B84",
    }),
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.tasks, {
      name: "Tâches",
      description: "Rappels des tâches à échéance",
      importance: AndroidImportance.DEFAULT,
      sound: "default",
      showBadge: true,
    }),
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.invoices, {
      name: "Factures",
      description: "Rappels des factures à échéance",
      importance: AndroidImportance.DEFAULT,
      sound: "default",
      showBadge: true,
    }),
  ]);
}
