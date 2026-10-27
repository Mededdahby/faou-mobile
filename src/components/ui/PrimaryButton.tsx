import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

type Variant = "primary" | "danger" | "outline";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isOutline = variant === "outline";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "danger" && styles.danger,
        isOutline && styles.outline,
        (pressed || isDisabled) && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.ink : colors.white} />
      ) : (
        <Text style={[styles.label, isOutline && styles.outlineLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inactive: {
    opacity: 0.55,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.white,
  },
  outlineLabel: {
    color: colors.ink,
  },
});
