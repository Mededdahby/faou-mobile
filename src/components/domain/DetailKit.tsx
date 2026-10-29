import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";
import { BrandLoader } from "./BrandLoader";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderText}>
        <Text style={styles.eyebrow}>FAOU DESIGN</Text>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function QuickActions({ children }: { children: ReactNode }) {
  return <View style={styles.quickActions}>{children}</View>;
}

export function QuickAction({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        (pressed || disabled) && styles.quickActionInactive,
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

export function InfoRow({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: IconName;
}) {
  const content = (
    <>
      <View style={styles.infoLabelRow}>
        {icon ? <Ionicons name={icon} size={14} color={colors.mutedSoft} /> : null}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoValueRow}>
        <Text style={[styles.infoValue, !value && styles.infoValueMuted]} numberOfLines={3}>
          {value || "—"}
        </Text>
        {onPress ? (
          <Ionicons name="chevron-forward" size={15} color={colors.mutedSoft} />
        ) : null}
      </View>
    </>
  );

  if (!onPress) return <View style={styles.infoRow}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.infoRow, pressed && styles.infoRowPressed]}
    >
      {content}
    </Pressable>
  );
}

export function Chip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function LoadingBlock() {
  return (
    <View style={styles.loading}>
      <BrandLoader label="Chargement…" />
    </View>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Impossible de charger les données</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={styles.errorAction}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  pageHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.primary,
  },
  pageTitle: {
    fontSize: fontSize.display,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
  },
  pageSubtitle: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickActionInactive: {
    opacity: 0.45,
  },
  quickActionLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
  },
  infoRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 3,
  },
  infoRowPressed: {
    opacity: 0.6,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoLabel: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoValue: {
    flex: 1,
    fontSize: fontSize.body,
    lineHeight: 21,
    color: colors.ink,
  },
  infoValueMuted: {
    color: colors.mutedSoft,
  },
  chip: {
    minHeight: 34,
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.muted,
  },
  chipLabelActive: {
    color: colors.white,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  error: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  errorTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  errorText: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
  },
  errorAction: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
  },
});
