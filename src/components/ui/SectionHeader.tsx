import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "@/theme/tokens";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  subtitle?: string;
}

export function SectionHeader({ title, actionLabel, onAction, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.title + 1,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  action: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
  },
  pressed: {
    opacity: 0.6,
  },
});
