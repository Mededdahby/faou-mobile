import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CommercialDocument, DocumentStatus } from "@/api/types";
import { apiBaseUrl } from "@/api/client";
import { Card, Field, PrimaryButton, Screen, StatusPill } from "@/components/ui";
import {
  Chip,
  ErrorBlock,
  InfoRow,
  LoadingBlock,
  PageHeader,
  QuickAction,
  QuickActions,
} from "@/components/domain/DetailKit";
import { useLiveDocument, useLiveProjects } from "@/convex/hooks";
import {
  useConvertQuote,
  useDeleteDocument,
  useUpdateDocumentFinance,
} from "@/hooks/queries";
import { api } from "@/api/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { callPhone, openDirections, openUrl, sendEmail } from "@/lib/links";
import { shareDocumentPdf } from "@/lib/pdf";
import { getDocumentStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const quoteStatuses: { value: DocumentStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyé" },
  { value: "accepted", label: "Accepté" },
  { value: "refused", label: "Refusé" },
  { value: "expired", label: "Expiré" },
];

const invoiceStatuses: { value: DocumentStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyée" },
  { value: "partial", label: "Partielle" },
  { value: "paid", label: "Payée" },
  { value: "overdue", label: "En retard" },
  { value: "cancelled", label: "Annulée" },
];

function documentTotal(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
}

export default function DevisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = useLiveDocument(id);
  const projects = useLiveProjects();

  if (document === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  if (!document) {
    return (
      <Screen>
        <ErrorBlock message="Ce document n'existe plus." />
      </Screen>
    );
  }

  return (
    <DocumentDetail
      key={document._id}
      document={document}
      linkedProject={projects?.find((project) => project.id === document.projectId)}
    />
  );
}

function DocumentDetail({
  document,
  linkedProject,
}: {
  document: CommercialDocument;
  linkedProject?: { id: string; name: string };
}) {
  const router = useRouter();
  const updateFinance = useUpdateDocumentFinance();
  const convertQuote = useConvertQuote();
  const deleteDocument = useDeleteDocument();

  const [payment, setPayment] = useState(
    document.amountPaidCents ? String(document.amountPaidCents / 100) : "",
  );
  const [dueDate, setDueDate] = useState(document.dueDate ?? "");
  const [generatedLink, setGeneratedLink] = useState("");
  const [busyAction, setBusyAction] = useState<"pdf" | "share" | null>(null);

  const shareLink =
    generatedLink ||
    (document.shareToken ? `${apiBaseUrl}/partage/${document.shareToken}` : "");
  const isInvoice = document.kind === "invoice";
  const status = getDocumentStatus(document.status);
  const total = documentTotal(document.items);
  const paid = Math.min(Math.max(document.amountPaidCents ?? 0, 0), total);
  const balance = Math.max(total - paid, 0);
  const statusOptions = isInvoice ? invoiceStatuses : quoteStatuses;

  async function changeStatus(next: DocumentStatus) {
    if (next === document.status) return;
    try {
      await updateFinance.mutateAsync({ id: document._id, status: next });
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Mise à jour impossible.");
    }
  }

  async function handlePayment(amountCents: number) {
    if (Number.isNaN(amountCents) || amountCents < 0) {
      Alert.alert("Montant invalide", "Saisissez un montant valide.");
      return;
    }
    if (amountCents > total) {
      Alert.alert("Montant invalide", "Le paiement ne peut pas dépasser le total.");
      return;
    }
    try {
      await updateFinance.mutateAsync({ id: document._id, amountPaidCents: amountCents });
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Paiement impossible.");
    }
  }

  async function handleDueDate() {
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert("Date invalide", "Utilisez le format AAAA-MM-JJ.");
      return;
    }
    try {
      await updateFinance.mutateAsync({ id: document._id, dueDate: dueDate || null });
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Mise à jour impossible.");
    }
  }

  async function handleShare() {
    setBusyAction("share");
    try {
      const result = await api.documents.share(document._id);
      const link = `${apiBaseUrl}/partage/${result.token}`;
      setGeneratedLink(link);
      await Share.share({
        message: `${isInvoice ? "Facture" : "Devis"} ${document.number} — FAOU DESIGN\n${link}`,
        url: link,
      });
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Partage impossible.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePdf() {
    setBusyAction("pdf");
    try {
      await shareDocumentPdf(document._id, document.number);
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "PDF indisponible.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleConvert() {
    Alert.alert("Convertir en facture", "Une facture sera créée à partir de ce devis.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Convertir",
        onPress: async () => {
          try {
            const invoice = await convertQuote.mutateAsync({
              id: document._id,
              date: new Date().toISOString().slice(0, 10),
            });
            router.push(`/devis/${invoice._id}`);
          } catch (error) {
            Alert.alert(
              "Erreur",
              error instanceof Error ? error.message : "Conversion impossible.",
            );
          }
        },
      },
    ]);
  }

  function handleDelete() {
    Alert.alert("Supprimer le document", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDocument.mutateAsync(document._id);
            router.back();
          } catch (error) {
            Alert.alert("Erreur", error instanceof Error ? error.message : "Suppression impossible.");
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <PageHeader
        title={document.number}
        subtitle={`${isInvoice ? "Facture" : "Devis"} · ${formatDate(document.date)}`}
        right={<StatusPill label={status.label} tone={status.tone} />}
      />

      <QuickActions>
        <QuickAction
          icon="call-outline"
          label="Appeler"
          onPress={() => void callPhone(document.client.phone)}
          disabled={!document.client.phone}
        />
        <QuickAction
          icon="mail-outline"
          label="Email"
          onPress={() => void sendEmail(document.client.email)}
          disabled={!document.client.email}
        />
        <QuickAction
          icon="share-social-outline"
          label={busyAction === "share" ? "Partage…" : "Partager"}
          onPress={() => void handleShare()}
          disabled={busyAction !== null}
        />
        <QuickAction
          icon="download-outline"
          label={busyAction === "pdf" ? "PDF…" : "PDF"}
          onPress={() => void handlePdf()}
          disabled={busyAction !== null}
        />
      </QuickActions>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Client</Text>
        <InfoRow label="Nom" value={document.client.name} icon="person-outline" />
        <InfoRow
          label="Téléphone"
          value={document.client.phone}
          icon="call-outline"
          onPress={() => void callPhone(document.client.phone)}
        />
        <InfoRow
          label="Email"
          value={document.client.email}
          icon="mail-outline"
          onPress={() => void sendEmail(document.client.email)}
        />
        <InfoRow label="Ville" value={document.client.city} icon="location-outline" />
        <InfoRow
          label="Adresse"
          value={document.client.address}
          icon="home-outline"
          onPress={() => void openDirections(document.client.address, document.client.city)}
        />
        <InfoRow label="Type de projet" value={document.client.projectType} />
        {document.sourceQuoteNumber ? (
          <InfoRow label="Devis d'origine" value={document.sourceQuoteNumber} />
        ) : null}
        {linkedProject ? (
          <InfoRow
            label="Projet lié"
            value={linkedProject.name}
            icon="briefcase-outline"
            onPress={() => router.push(`/projets/${linkedProject.id}`)}
          />
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Lignes</Text>
        {document.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemAmount}>{formatMoney(item.amountCents)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>
        </View>
        {document.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{document.notes}</Text>
          </View>
        ) : null}
        {document.conditions ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Conditions</Text>
            <Text style={styles.notesText}>{document.conditions}</Text>
          </View>
        ) : null}
      </Card>

      {isInvoice ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Paiement</Text>
          <View style={styles.moneyGrid}>
            <View style={styles.moneyItem}>
              <Text style={styles.moneyLabel}>Total</Text>
              <Text style={styles.moneyValue}>{formatMoney(total)}</Text>
            </View>
            <View style={styles.moneyItem}>
              <Text style={styles.moneyLabel}>Payé</Text>
              <Text style={[styles.moneyValue, styles.moneyPaid]}>{formatMoney(paid)}</Text>
            </View>
            <View style={styles.moneyItem}>
              <Text style={styles.moneyLabel}>Reste</Text>
              <Text style={styles.moneyValue}>{formatMoney(balance)}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${total > 0 ? Math.round((paid / total) * 100) : 0}%` },
              ]}
            />
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldGrow}>
              <Field
                label="Montant payé (MAD)"
                value={payment}
                onChangeText={setPayment}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.fieldButton}>
              <PrimaryButton
                label="Valider"
                onPress={() => void handlePayment(parseAmount(payment))}
                loading={updateFinance.isPending}
              />
            </View>
          </View>
          {balance > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handlePayment(total)}
              style={styles.settleButton}
            >
              <Text style={styles.settleLabel}>Encaisser le solde ({formatMoney(balance)})</Text>
            </Pressable>
          ) : null}
          <View style={styles.fieldRow}>
            <View style={styles.fieldGrow}>
              <Field
                label="Échéance"
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="AAAA-MM-JJ"
              />
            </View>
            <View style={styles.fieldButton}>
              <PrimaryButton
                label="Mettre à jour"
                variant="outline"
                onPress={() => void handleDueDate()}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Conversion</Text>
          <Text style={styles.help}>
            Convertissez ce devis en facture pour suivre le paiement.
          </Text>
          <PrimaryButton label="Convertir en facture" onPress={handleConvert} />
        </Card>
      )}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Statut</Text>
        <View style={styles.chips}>
          {statusOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={document.status === option.value}
              onPress={() => void changeStatus(option.value)}
            />
          ))}
        </View>
      </Card>

      {shareLink ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Lien de partage</Text>
          <Text style={styles.link} selectable onPress={() => void openUrl(shareLink)}>
            {shareLink}
          </Text>
          <PrimaryButton
            label="Ouvrir dans le navigateur"
            variant="outline"
            onPress={() => void openUrl(shareLink)}
          />
        </Card>
      ) : null}

      <View style={styles.actions}>
        {!isInvoice ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/devis/editeur?id=${document._id}`)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryLabel}>Modifier le devis</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={handleDelete}
          style={[styles.secondaryButton, styles.dangerButton]}
        >
          <Text style={[styles.secondaryLabel, styles.dangerLabel]}>Supprimer le document</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    paddingBottom: 0,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSize.small,
    lineHeight: 20,
    color: colors.ink,
  },
  itemAmount: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.muted,
  },
  totalValue: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  notes: {
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  notesLabel: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
  notesText: {
    fontSize: fontSize.small,
    lineHeight: 20,
    color: colors.ink,
  },
  moneyGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  moneyItem: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: 2,
  },
  moneyLabel: {
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  moneyValue: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  moneyPaid: {
    color: colors.success,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginVertical: spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  fieldGrow: {
    flex: 1,
  },
  fieldButton: {
    paddingBottom: 1,
  },
  settleButton: {
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
    alignItems: "center",
  },
  settleLabel: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.success,
  },
  help: {
    fontSize: fontSize.small,
    lineHeight: 20,
    color: colors.muted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  link: {
    fontSize: fontSize.small,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButton: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  secondaryLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  dangerLabel: {
    color: colors.danger,
  },
});
