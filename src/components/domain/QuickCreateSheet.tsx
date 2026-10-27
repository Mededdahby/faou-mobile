import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSize, radius, shadows, spacing } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

const options: {
  label: string;
  description: string;
  icon: IconName;
  href: string;
  background: string;
  foreground: string;
}[] = [
  {
    label: "Nouveau projet",
    description: "Créer un chantier et suivre son avancement",
    icon: "briefcase-outline",
    href: "/projets/editeur",
    background: colors.primarySoft,
    foreground: colors.primaryDark,
  },
  {
    label: "Nouveau client",
    description: "Ajouter un contact et ses coordonnées",
    icon: "person-add-outline",
    href: "/clients/editeur",
    background: colors.successSoft,
    foreground: colors.success,
  },
  {
    label: "Nouveau devis",
    description: "Préparer un devis et ses lignes",
    icon: "document-text-outline",
    href: "/devis/editeur",
    background: colors.accentSoft,
    foreground: colors.cta,
  },
];

export function QuickCreateSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function go(href: string) {
    onClose();
    router.push(href as never);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Fermer"
          onPress={onClose}
          style={styles.overlay}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Créer</Text>
            <Text style={styles.subtitle}>Que souhaitez-vous ajouter ?</Text>
          </View>
          <View style={styles.list}>
            {options.map((option) => (
              <Pressable
                key={option.href}
                accessibilityRole="button"
                onPress={() => go(option.href)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={[styles.iconCircle, { backgroundColor: option.background }]}>
                  <Ionicons name={option.icon} size={20} color={option.foreground} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{option.label}</Text>
                  <Text style={styles.rowDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text style={styles.cancelLabel}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
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
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadows.floating,
  },
  handle: {
    alignSelf: "center",
    height: 4,
    width: 44,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  header: {
    gap: 2,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    height: 44,
    width: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  rowDescription: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  cancel: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cancelLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.muted,
  },
  pressed: {
    opacity: 0.6,
  },
});
