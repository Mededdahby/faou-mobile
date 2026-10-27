import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchBar } from "@/components/ui/SearchBar";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

export interface SelectOption {
  id: string;
  label: string;
  subtitle?: string;
}

interface SelectFieldProps {
  label: string;
  value?: string | null;
  options: SelectOption[];
  onChange: (id: string | null) => void;
  placeholder?: string;
  title?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  allowClear?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Sélectionner…",
  title,
  hint,
  error,
  required = false,
  allowClear = false,
}: SelectFieldProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return options;
    return options.filter((option) =>
      [option.label, option.subtitle].join(" ").toLowerCase().includes(search),
    );
  }, [options, query]);

  function openPicker() {
    Keyboard.dismiss();
    setQuery("");
    setOpen(true);
  }

  function select(id: string | null) {
    onChange(id);
    setOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
          onPress={openPicker}
          style={({ pressed }) => [styles.fieldPress, pressed && styles.pressed]}
        >
          <View style={styles.fieldText}>
            <Text
              style={[styles.value, !selected && styles.placeholder]}
              numberOfLines={1}
            >
              {selected?.label ?? placeholder}
            </Text>
            {selected?.subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {selected.subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-down" size={17} color={colors.mutedSoft} />
        </Pressable>
        {allowClear && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retirer la sélection"
            hitSlop={8}
            onPress={() => onChange(null)}
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <Ionicons name="close-circle" size={18} color={colors.mutedSoft} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
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
              <Text style={styles.sheetTitle}>{title ?? label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setOpen(false)}
                hitSlop={8}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher…"
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                allowClear ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => select(null)}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                  >
                    <View style={styles.optionBody}>
                      <Text style={styles.optionLabel}>Aucune sélection</Text>
                      <Text style={styles.optionSubtitle}>Retirer le lien actuel</Text>
                    </View>
                    {!value ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                ) : undefined
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Aucun résultat.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const active = item.id === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => select(item.id)}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                  >
                    <View style={styles.optionBody}>
                      <Text style={styles.optionLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.optionSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  fieldText: {
    flex: 1,
    gap: 1,
  },
  value: {
    fontSize: fontSize.body,
    fontWeight: "500",
    color: colors.ink,
  },
  placeholder: {
    color: colors.mutedSoft,
    fontWeight: "400",
  },
  subtitle: {
    fontSize: fontSize.caption,
    color: colors.muted,
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
    maxHeight: "82%",
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
  sheetTitle: {
    flex: 1,
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  close: {
    height: 38,
    width: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  list: {
    flexShrink: 1,
    marginTop: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionBody: {
    flex: 1,
    gap: 1,
  },
  optionLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  optionSubtitle: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
});
