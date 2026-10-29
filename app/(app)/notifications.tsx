import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/api/endpoints";
import type { AppNotification, NotificationType } from "@/api/types";
import { PageHeader } from "@/components/domain/DetailKit";
import {
  Card,
  EmptyState,
  PrimaryButton,
  Screen,
  Skeleton,
} from "@/components/ui";
import { useLiveNotifications } from "@/convex/hooks";
import { timeAgo } from "@/lib/format";
import { useNotifications } from "@/notifications/NotificationProvider";
import { safeNotificationRoute } from "@/notifications/routes";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const notificationMeta: Record<
  NotificationType,
  { icon: ComponentProps<typeof Ionicons>["name"]; color: string; soft: string }
> = {
  "lead.new": { icon: "mail-unread-outline", color: colors.primary, soft: colors.primarySoft },
  "quote.accepted": {
    icon: "checkmark-circle-outline",
    color: colors.success,
    soft: colors.successSoft,
  },
  "quote.refused": {
    icon: "close-circle-outline",
    color: colors.danger,
    soft: colors.dangerSoft,
  },
  "task.due": { icon: "checkbox-outline", color: colors.accent, soft: colors.accentSoft },
  "task.overdue": {
    icon: "alert-circle-outline",
    color: colors.danger,
    soft: colors.dangerSoft,
  },
  "invoice.due": {
    icon: "document-text-outline",
    color: colors.warning,
    soft: colors.warningSoft,
  },
  "invoice.overdue": {
    icon: "alert-circle-outline",
    color: colors.danger,
    soft: colors.dangerSoft,
  },
  "project.due": { icon: "calendar-outline", color: colors.violet, soft: colors.violetSoft },
  "payment.recorded": { icon: "cash-outline", color: colors.success, soft: colors.successSoft },
  digest: { icon: "sunny-outline", color: colors.accent, soft: colors.accentSoft },
  system: { icon: "notifications-outline", color: colors.primary, soft: colors.primarySoft },
};

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const meta = notificationMeta[notification.type] ?? notificationMeta.system;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !notification.read && styles.rowUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: meta.soft }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.rowTime}>{timeAgo(notification.createdAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.mutedSoft} />
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { permission, busy, enable, openSettings, sendTest } = useNotifications();
  const notifications = useLiveNotifications(50);
  const [marking, setMarking] = useState(false);
  const [testing, setTesting] = useState(false);

  const items = notifications?.items ?? [];
  const unreadCount = notifications?.unreadCount ?? 0;

  async function markAllRead() {
    setMarking(true);
    try {
      await api.notifications.markAllRead();
    } catch {
      // The live query will keep the unread state if the request fails.
    } finally {
      setMarking(false);
    }
  }

  async function sendTestNotification() {
    setTesting(true);
    try {
      await sendTest();
    } catch {
      // A missing server or permission is surfaced by the settings card.
    } finally {
      setTesting(false);
    }
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.read) {
      void api.notifications.markRead(notification.id).catch(() => undefined);
    }
    router.push(safeNotificationRoute(notification.route) as never);
  }

  return (
    <Screen scroll>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} notification${unreadCount === 1 ? "" : "s"} non lue${
                unreadCount === 1 ? "" : "s"
              }`
            : "Demandes, devis et rappels de votre activité"
        }
      />

      {permission !== "granted" ? (
        <Card style={styles.permissionCard}>
          <View style={styles.permissionHeader}>
            <View style={styles.permissionIcon}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>Activez les notifications</Text>
              <Text style={styles.permissionBody}>
                Recevez les nouvelles demandes, les devis signés et les rappels de tâches
                et de factures.
              </Text>
            </View>
          </View>
          <PrimaryButton
            label={permission === "denied" ? "Ouvrir les réglages" : "Activer les notifications"}
            onPress={permission === "denied" ? openSettings : enable}
            loading={busy}
            style={styles.permissionButton}
          />
        </Card>
      ) : null}

      {unreadCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void markAllRead()}
          disabled={marking}
          style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
        >
          <Text style={styles.markAllLabel}>
            {marking ? "Mise à jour…" : "Tout marquer comme lu"}
          </Text>
        </Pressable>
      ) : null}

      {notifications === undefined ? (
        <View style={styles.list}>
          {[0, 1, 2].map((index) => (
            <Card key={index} style={styles.skeletonCard}>
              <Skeleton width="70%" height={15} />
              <Skeleton width="92%" height={12} style={styles.skeletonLine} />
              <Skeleton width="35%" height={10} style={styles.skeletonLine} />
            </Card>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Aucune notification"
          description="Les nouvelles demandes, validations de devis et rappels apparaîtront ici."
        />
      ) : (
        <Card style={styles.listCard}>
          {items.map((notification, index) => (
            <View
              key={notification.id}
              style={index > 0 ? styles.rowDivider : undefined}
            >
              <NotificationRow
                notification={notification}
                onPress={() => void openNotification(notification)}
              />
            </View>
          ))}
        </Card>
      )}

      {permission === "granted" ? (
        <View style={styles.test}>
          <PrimaryButton
            label="Envoyer une notification de test"
            variant="outline"
            onPress={() => void sendTestNotification()}
            loading={testing}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  permissionCard: {
    marginTop: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  permissionHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  permissionIcon: {
    height: 42,
    width: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  permissionText: {
    flex: 1,
    gap: spacing.xs,
  },
  permissionTitle: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
  },
  permissionBody: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  permissionButton: {
    backgroundColor: colors.ink,
  },
  markAll: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  markAllLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  skeletonLine: {
    marginTop: 2,
  },
  listCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowUnread: {
    backgroundColor: colors.surface,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
  },
  unreadDot: {
    height: 7,
    width: 7,
    borderRadius: radius.full,
    backgroundColor: colors.cta,
  },
  rowBody: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
  },
  rowTime: {
    marginTop: 1,
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  test: {
    marginTop: spacing.xl,
  },
  pressed: {
    opacity: 0.6,
  },
});
