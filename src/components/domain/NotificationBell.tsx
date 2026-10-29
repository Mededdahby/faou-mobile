import { useRouter } from "expo-router";
import { IconButton } from "@/components/ui";
import { useLiveNotifications } from "@/convex/hooks";

export function NotificationBell() {
  const router = useRouter();
  const notifications = useLiveNotifications(1);

  return (
    <IconButton
      icon="notifications-outline"
      label="Notifications"
      badge={notifications?.unreadCount ?? 0}
      onPress={() => router.push("/notifications")}
    />
  );
}
