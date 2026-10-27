import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Field({ label, error, style, ...props }: FieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.mutedSoft}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs + 2,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: fontSize.caption + 1,
    color: colors.danger,
  },
});
