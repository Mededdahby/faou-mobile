import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

type Variant = "primary" | "danger" | "outline" | "accent";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

const variants: Record<Variant, { background: string; border?: string; foreground: string }> = {
  primary: { background: colors.primary, foreground: colors.white },
  danger: { background: colors.danger, foreground: colors.white },
  accent: { background: colors.ink, foreground: colors.white },
  outline: {
    background: colors.surface,
    border: colors.border,
    foreground: colors.ink,
  },
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border ?? palette.background,
          borderWidth: palette.border ? 1 : 0,
        },
        (pressed || isDisabled) && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  inactive: {
    opacity: 0.55,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
