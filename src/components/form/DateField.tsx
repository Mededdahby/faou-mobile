import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

interface DateFieldProps {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  allowClear?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
}

function parseDate(value?: string) {
  if (!value) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidISODate(value?: string) {
  if (!value) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
}

function displayDate(value?: string) {
  if (!value) return "";
  if (!isValidISODate(value)) return value;
  return format(parseDate(value), "d MMMM yyyy", { locale: fr });
}

export function DateField({
  label,
  value,
  onChange,
  required = false,
  optional = false,
  hint,
  error,
  placeholder = "Choisir une date",
  allowClear = false,
  minimumDate,
  maximumDate,
  title,
}: DateFieldProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseDate(value));

  function openPicker() {
    Keyboard.dismiss();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: parseDate(value),
        mode: "date",
        display: "calendar",
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === "set" && date) onChange(toISODate(date));
        },
      });
      return;
    }

    setDraft(parseDate(value));
    setOpen(true);
  }

  function confirm() {
    onChange(toISODate(draft));
    setOpen(false);
  }

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

      <View style={[styles.field, error ? styles.fieldError : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? displayDate(value) : placeholder}`}
          accessibilityState={{ expanded: open }}
          onPress={openPicker}
          style={({ pressed }) => [styles.fieldPress, pressed && styles.pressed]}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={value ? colors.primary : colors.mutedSoft}
          />
          <Text
            style={[styles.value, !value && styles.placeholder]}
            numberOfLines={1}
          >
            {value ? displayDate(value) : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={17} color={colors.mutedSoft} />
        </Pressable>
        {allowClear && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Effacer la date"
            hitSlop={8}
            onPress={() => onChange(undefined)}
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <Ionicons name="close-circle" size={18} color={colors.mutedSoft} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
          statusBarTranslucent
        >
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityLabel="Fermer"
              onPress={() => setOpen(false)}
              style={styles.overlay}
            />
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
              ]}
            >
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpen(false)}
                  hitSlop={8}
                >
                  <Text style={styles.cancel}>Annuler</Text>
                </Pressable>
                <Text style={styles.title}>{title ?? label}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirm}
                  hitSlop={8}
                >
                  <Text style={styles.done}>Terminé</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                onChange={(_event, date) => {
                  if (date) setDraft(date);
                }}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale="fr-FR"
                themeVariant="light"
                accentColor={colors.primary}
              />
              {allowClear ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(undefined);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.clearAction, pressed && styles.pressed]}
                >
                  <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                  <Text style={styles.clearActionLabel}>Effacer la date</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

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
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  fieldPress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  value: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: "500",
    color: colors.ink,
  },
  placeholder: {
    color: colors.mutedSoft,
    fontWeight: "400",
  },
  clear: {
    padding: spacing.xs,
  },
  error: {
    fontSize: fontSize.caption + 1,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.6,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    height: 4,
    width: 44,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  cancel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.muted,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
  },
  done: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.primary,
  },
  clearAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    minHeight: 46,
    marginTop: spacing.xs,
  },
  clearActionLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.danger,
  },
});
