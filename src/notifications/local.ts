import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { CommercialDocument, UpcomingTask } from "@/api/types";
import { formatMoney } from "@/lib/format";
import { readNotificationPermission } from "./permissions";

const HORIZON_DAYS = 45;

function reminderDate(dueDate: string) {
  const date = new Date(`${dueDate}T09:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function schedule(
  title: string,
  body: string,
  dueDate: string,
  route: string,
  type: string,
  channelId: string,
) {
  const date = reminderDate(dueDate);
  if (!date) return;

  const now = Date.now();
  const horizon = now + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  if (date.getTime() <= now || date.getTime() > horizon) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { route, type },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId,
    },
  });
}

export async function syncLocalReminders(
  tasks: UpcomingTask[],
  documents: CommercialDocument[],
) {
  if (Platform.OS === "web") return;
  if ((await readNotificationPermission()) !== "granted") return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const task of tasks) {
    if (!task.dueDate || task.status === "done") continue;
    await schedule(
      "Tâche aujourd’hui",
      `${task.title} · ${task.projectName}`,
      task.dueDate,
      `/projets/${task.projectId}/tasks`,
      "task.due",
      "tasks",
    );
  }

  for (const document of documents) {
    if (document.kind !== "invoice") continue;
    if (document.status === "paid" || document.status === "cancelled") continue;
    if (!document.dueDate) continue;

    const total = document.items.reduce((sum, item) => sum + item.amountCents, 0);
    const balance = Math.max(total - (document.amountPaidCents ?? 0), 0);
    if (balance <= 0) continue;

    await schedule(
      "Facture à échéance",
      `${document.number} · ${formatMoney(balance)} à encaisser`,
      document.dueDate,
      `/devis/${document._id}`,
      "invoice.due",
      "invoices",
    );
  }
}

export async function clearLocalReminders() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
