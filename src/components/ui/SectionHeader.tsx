import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "@/theme/tokens";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
  },
  action: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
  },
});
