import type { AppNotification } from "@/api/types";

const allowedPrefixes = ["/demandes/", "/devis/", "/projets/"];
const allowedExact = ["/planning", "/notifications"];

export function safeNotificationRoute(route: string | null | undefined) {
  const value = typeof route === "string" ? route.trim() : "";
  if (!value.startsWith("/")) return "/notifications";
  if (allowedExact.includes(value)) return value;
  if (allowedPrefixes.some((prefix) => value.startsWith(prefix))) return value;
  return "/notifications";
}

export function routeForNotification(notification: Pick<AppNotification, "route">) {
  return safeNotificationRoute(notification.route);
}
