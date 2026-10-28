import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CommercialDocument } from "@/api/types";
import { api } from "@/api/endpoints";
import { openUrl } from "@/lib/links";
import { shareDocumentPdf } from "@/lib/pdf";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const PUBLIC_SITE_URL = (
  process.env.EXPO_PUBLIC_PUBLIC_SITE_URL ?? "https://www.faoudesign.com"
).replace(/\/+$/, "");
const CONTACT_EMAIL = "contact@faoudesign.com";
const PHONE_DISPLAY = "0664 848 889";

type CopyTarget = "link" | "message" | null;

function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  if (digits.length === 9) return `212${digits}`;
  return digits;
}

interface ShareDocumentSheetProps {
  document: CommercialDocument | null;
  onClose: () => void;
}

export function ShareDocumentSheet({ document, onClose }: ShareDocumentSheetProps) {
  if (!document) return null;
  return <ShareSheet key={document._id} document={document} onClose={onClose} />;
}

function ShareSheet({
  document,
  onClose,
}: {
  document: CommercialDocument;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState(document.shareToken ?? "");
  const [loading, setLoading] = useState(!document.shareToken);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState<CopyTarget>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (token) return;
    let active = true;

    async function createLink() {
      try {
        const result = await api.documents.share(document._id);
        if (!active) return;
        setToken(result.token);
        setLoading(false);
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de créer le lien de partage.",
        );
        setLoading(false);
      }
    }

    void createLink();
    return () => {
      active = false;
    };
  }, [attempt, document._id, token]);

  const link = token ? `${PUBLIC_SITE_URL}/partage/${token}` : "";

  const message = useMemo(() => {
    if (!link) return "";
    const label = document.kind === "invoice" ? "facture" : "devis";
    return [
      `Bonjour ${document.client.name},`,
      "",
      `Votre ${label} ${document.number} est prêt.`,
      `Consultez-le en ligne : ${link}`,
      `Téléchargez le PDF : ${link}/pdf`,
      "",
      "FAOU DESIGN — Cuisines & agencements sur mesure",
      `Site : ${PUBLIC_SITE_URL}`,
      `Email : ${CONTACT_EMAIL}`,
      `Téléphone : ${PHONE_DISPLAY}`,
    ].join("\n");
  }, [document, link]);

  const kindTitle = document.kind === "invoice" ? "la facture" : "le devis";
  const kindLabel = document.kind === "invoice" ? "Facture" : "Devis";
  const whatsappNumber = toWhatsAppNumber(document.client.phone);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  const mailUrl = `mailto:${document.client.email}?subject=${encodeURIComponent(
    `${kindLabel} ${document.number} — FAOU DESIGN`,
  )}&body=${encodeURIComponent(message)}`;

  async function copy(value: string, target: Exclude<CopyTarget, null>) {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      setCopied(target);
      setActionError("");
      setTimeout(() => {
        setCopied((current) => (current === target ? null : current));
      }, 2000);
    } catch {
      setActionError("Copie impossible. Sélectionnez le texte pour le copier.");
    }
  }

  async function handlePdf() {
    setPdfLoading(true);
    setActionError("");
    try {
      await shareDocumentPdf(document._id, document.number);
    } catch {
      const publicPdf = link ? `${link}/pdf` : "";
      if (publicPdf) {
        await openUrl(publicPdf);
      } else {
        setActionError("PDF indisponible pour le moment.");
      }
    } finally {
      setPdfLoading(false);
    }
  }

  function retry() {
    setError("");
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.overlay} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Partager {kindTitle} {document.number}
              </Text>
              <Text style={styles.description}>
                Envoyez ce lien à {document.client.name || "votre client"}. Il ouvre une page
                professionnelle avec le document et le PDF à télécharger.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.centerText}>Création du lien sécurisé…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={retry}
                style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={styles.retryLabel}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.section}>
                <Text style={styles.label}>Lien de partage</Text>
                <View style={styles.linkRow}>
                  <Text style={styles.link} selectable numberOfLines={2}>
                    {link}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void copy(link, "link")}
                    style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name={copied === "link" ? "checkmark" : "copy-outline"}
                      size={15}
                      color={colors.white}
                    />
                    <Text style={styles.copyLabel}>
                      {copied === "link" ? "Copié" : "Copier"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <Text style={styles.label}>Message prêt à envoyer</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void copy(message, "message")}
                    style={({ pressed }) => [styles.messageCopy, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name={copied === "message" ? "checkmark" : "copy-outline"}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.messageCopyLabel}>
                      {copied === "message" ? "Copié" : "Copier"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.message} selectable>
                  {message}
                </Text>
              </View>

              <View style={styles.actions}>
                <Action
                  icon="logo-whatsapp"
                  label="WhatsApp"
                  onPress={() => void openUrl(whatsappUrl)}
                />
                <Action
                  icon="mail-outline"
                  label="Email"
                  onPress={() => void openUrl(mailUrl)}
                />
                <Action
                  icon="eye-outline"
                  label="Aperçu"
                  onPress={() => void openUrl(link)}
                />
                <Action
                  icon="download-outline"
                  label={pdfLoading ? "PDF…" : "PDF"}
                  onPress={() => void handlePdf()}
                  disabled={pdfLoading}
                />
              </View>

              {actionError ? (
                <Text style={styles.actionError}>{actionError}</Text>
              ) : null}

              <Text style={styles.note}>
                Toute personne disposant de ce lien peut consulter le document et télécharger
                le PDF. Le lien reste actif tant que le document existe.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.primaryDark} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
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
    maxHeight: "92%",
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  description: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
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
  body: {
    flexShrink: 1,
    marginTop: spacing.lg,
  },
  bodyContent: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.micro,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  link: {
    flex: 1,
    fontSize: fontSize.caption + 1,
    lineHeight: 17,
    color: colors.primaryDark,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copyLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "700",
    color: colors.white,
  },
  messageCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  messageCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  messageCopyLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.primary,
  },
  message: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    fontSize: fontSize.caption + 1,
    lineHeight: 19,
    color: colors.ink,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  action: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
  },
  note: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.muted,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  centerText: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  errorBox: {
    marginTop: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
  },
  errorText: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.danger,
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  retryLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
  },
  actionError: {
    fontSize: fontSize.small,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.6,
  },
});
