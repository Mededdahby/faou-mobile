import { forwardRef, useState, type ComponentRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

export type FieldInputRef = ComponentRef<typeof TextInput>;

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
}

export const Field = forwardRef<FieldInputRef, FieldProps>(function Field(
  {
    label,
    error,
    hint,
    required = false,
    optional = false,
    style,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {optional ? <Text style={styles.optional}>Optionnel</Text> : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        ref={ref}
        {...props}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        underlineColorAndroid="transparent"
        placeholderTextColor={colors.mutedSoft}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs + 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  required: {
    color: colors.cta,
    fontWeight: "700",
  },
  optional: {
    fontSize: fontSize.micro,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
  hint: {
    fontSize: fontSize.caption,
    lineHeight: 16,
    color: colors.muted,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: fontSize.caption + 1,
    color: colors.danger,
  },
});
