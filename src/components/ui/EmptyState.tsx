import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "@/theme/tokens";

interface EmptyStateProps {
  icon?: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  description,
}: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "center",
  },
  description: {
    marginTop: spacing.xs,
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
  },
});
