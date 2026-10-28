import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type Ref,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Chip } from "@/components/domain/DetailKit";
import { Card } from "@/components/ui/Card";
import { Field, type FieldInputRef, type FieldProps } from "@/components/ui/Field";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

interface FormKeyboardValue {
  scrollToField: (node: ComponentRef<typeof View> | null) => void;
}

const FormKeyboardContext = createContext<FormKeyboardValue | null>(null);

export function KeyboardForm({
  children,
  footer,
  scrollKey,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scrollKey?: string | number;
}) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<ComponentRef<typeof View>>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);

  const scrollToField = useCallback((node: ComponentRef<typeof View> | null) => {
    const content = contentRef.current;
    if (!node || !content) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.measureLayout(
          content,
          (_x, y) => {
            scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
          },
          () => undefined,
        );
      });
    });
  }, []);

  const value = useMemo(() => ({ scrollToField }), [scrollToField]);

  const headerOffset = Platform.OS === "ios" ? headerHeight : 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerOffset}
    >
      <FormKeyboardContext.Provider value={value}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets={false}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          <View ref={contentRef} collapsable={false} style={styles.content}>
            {children}
          </View>
        </ScrollView>
      </FormKeyboardContext.Provider>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: keyboardVisible
                ? spacing.md
                : Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

export function FormField({
  inputRef,
  onFocus,
  ...props
}: FieldProps & {
  inputRef?: Ref<FieldInputRef>;
}) {
  const keyboard = useContext(FormKeyboardContext);
  const fieldRef = useRef<ComponentRef<typeof View>>(null);

  return (
    <View ref={fieldRef} collapsable={false}>
      <Field
        ref={inputRef}
        {...props}
        onFocus={(event) => {
          keyboard?.scrollToField(fieldRef.current);
          onFocus?.(event);
        }}
      />
    </View>
  );
}

export function FormChoice({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <View style={styles.choice}>
      <Text style={styles.choiceLabel}>{label}</Text>
      {hint ? <Text style={styles.choiceHint}>{hint}</Text> : null}
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function FormFooter({
  submitLabel,
  onSubmit,
  loading = false,
  disabled = false,
  error,
  summary,
  secondaryLabel,
  onSecondary,
}: {
  submitLabel: string;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  summary?: { label: string; value: string };
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View style={styles.footerContent}>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {summary ? (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>{summary.label}</Text>
          <Text style={styles.summaryValue}>{summary.value}</Text>
        </View>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <View style={styles.footerActions}>
          <PrimaryButton
            label={secondaryLabel}
            variant="outline"
            onPress={onSecondary}
            style={styles.footerSecondary}
          />
          <PrimaryButton
            label={submitLabel}
            onPress={onSubmit}
            loading={loading}
            disabled={disabled}
            style={styles.footerPrimary}
          />
        </View>
      ) : (
        <PrimaryButton
          label={submitLabel}
          onPress={onSubmit}
          loading={loading}
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: colors.ink,
  },
  sectionDescription: {
    fontSize: fontSize.caption + 1,
    lineHeight: 18,
    color: colors.muted,
  },
  sectionBody: {
    gap: spacing.md,
  },
  choice: {
    gap: spacing.xs + 2,
  },
  choiceLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  choiceHint: {
    fontSize: fontSize.caption,
    color: colors.muted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerContent: {
    gap: spacing.sm,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.caption + 1,
    lineHeight: 18,
    color: colors.danger,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.muted,
  },
  summaryValue: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  footerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerSecondary: {
    flex: 1,
  },
  footerPrimary: {
    flex: 1.5,
  },
});
