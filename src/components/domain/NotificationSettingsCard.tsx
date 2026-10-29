import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import type { NotificationPreferences } from "@/api/types";
import { Card, PrimaryButton } from "@/components/ui";
import { useNotificationPreferences, useSaveNotificationPreferences } from "@/hooks/queries";
import { useNotifications } from "@/notifications/NotificationProvider";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const categories: {
  key: keyof Pick<NotificationPreferences, "leads" | "approvals" | "tasks" | "invoices" | "projects">;
  label: string;
  description: string;
}[] = [
  { key: "leads", label: "Nouvelles demandes", description: "Demandes reçues depuis le site" },
  { key: "approvals", label: "Devis", description: "Devis acceptés ou refusés" },
  { key: "tasks", label: "Tâches", description: "Échéances et retards" },
  { key: "invoices", label: "Factures", description: "Échéances et retards" },
  { key: "projects", label: "Projets", description: "Dates de livraison" },
];

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

export function NotificationSettingsCard() {
  const {
    permission,
    localEnabled,
    busy,
    enable,
    setLocalEnabled,
    sendTest,
    openSettings,
  } = useNotifications();
  const preferences = useNotificationPreferences();
  const savePreferences = useSaveNotificationPreferences();
  const prefs = preferences.data;

  const granted = permission === "granted";

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {granted
              ? "Alertes actives sur cet appareil."
              : permission === "denied"
                ? "Bloquées dans les réglages du téléphone."
                : "Configurez les alertes et les rappels."}
          </Text>
        </View>
      </View>

      {!granted ? (
        <PrimaryButton
          label={permission === "denied" ? "Ouvrir les réglages" : "Activer les notifications"}
          onPress={permission === "denied" ? openSettings : enable}
          loading={busy}
          style={styles.action}
        />
      ) : null}

      <View style={styles.section}>
        <ToggleRow
          label="Rappels de tâches et factures"
          description="Notification locale à 09:00 le jour de l’échéance."
          value={localEnabled}
          onValueChange={(value) => void setLocalEnabled(value)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertes push</Text>
        {!prefs ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          categories.map((category) => (
            <ToggleRow
              key={category.key}
              label={category.label}
              description={category.description}
              value={prefs[category.key] !== false}
              disabled={savePreferences.isPending || !granted}
              onValueChange={(value) =>
                savePreferences.mutate({ [category.key]: value })
              }
            />
          ))
        )}
      </View>

      {granted ? (
        <PrimaryButton
          label="Envoyer une notification de test"
          variant="outline"
          onPress={() => void sendTest()}
          loading={busy}
          style={styles.action}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  headerIcon: {
    height: 42,
    width: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.small,
    lineHeight: 18,
    color: colors.muted,
  },
  action: {
    marginTop: spacing.xs,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.mutedSoft,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
  },
  rowDescription: {
    fontSize: fontSize.caption,
    lineHeight: 16,
    color: colors.muted,
  },
  loading: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
});
