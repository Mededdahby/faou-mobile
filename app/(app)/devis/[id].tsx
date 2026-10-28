import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  CommercialDocument,
  DocumentStatus,
  Payment,
  PaymentMethod,
} from "@/api/types";
import { api } from "@/api/endpoints";
import { Card, Field, PrimaryButton, Screen, StatusPill } from "@/components/ui";
import { DateField } from "@/components/form/DateField";
import {
  Chip,
  ErrorBlock,
  InfoRow,
  LoadingBlock,
  PageHeader,
  QuickAction,
  QuickActions,
} from "@/components/domain/DetailKit";
import {
  useLiveDocument,
  useLiveDocumentApproval,
  useLivePayments,
  useLiveProjects,
} from "@/convex/hooks";
import {
  useConvertQuote,
  useDeleteDocument,
  useUpdateDocumentFinance,
} from "@/hooks/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { callPhone, openDirections, sendEmail } from "@/lib/links";
import { shareDocumentPdf, sharePaymentReceiptPdf } from "@/lib/pdf";
import { ShareDocumentSheet } from "@/components/domain/ShareDocumentSheet";
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

const paymentMethods: Record<string, string> = {
  cash: "Espèces",
  bank_transfer: "Virement",
  check: "Chèque",
  card: "Carte",
  other: "Autre",
};

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Espèces" },
  { value: "bank_transfer", label: "Virement" },
  { value: "check", label: "Chèque" },
  { value: "card", label: "Carte" },
  { value: "other", label: "Autre" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseMoney(value: string) {
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : Number.NaN;
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

  const payments = useLivePayments(document._id);
  const approval = useLiveDocumentApproval(
    document.kind === "quote" ? document._id : undefined,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [dueDate, setDueDate] = useState(document.dueDate ?? "");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);

  const isInvoice = document.kind === "invoice";
  const status = getDocumentStatus(document.status);
  const total = documentTotal(document.items);
  const paid = Math.min(Math.max(document.amountPaidCents ?? 0, 0), total);
  const balance = Math.max(total - paid, 0);
  const paymentSum = (payments ?? []).reduce((sum, payment) => sum + payment.amountCents, 0);
  const statusOptions = isInvoice ? invoiceStatuses : quoteStatuses;

  async function changeStatus(next: DocumentStatus) {
    if (next === document.status) return;
    try {
      await updateFinance.mutateAsync({ id: document._id, status: next });
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Mise à jour impossible.");
    }
  }

  async function handleReceipt(payment: Payment) {
    setReceiptLoadingId(payment.id);
    try {
      await sharePaymentReceiptPdf(payment.id, payment.receiptNumber);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Reçu indisponible.",
      );
    } finally {
      setReceiptLoadingId(null);
    }
  }

  function confirmDeletePayment(payment: Payment) {
    Alert.alert(
      "Supprimer le paiement",
      `${formatMoney(payment.amountCents)} seront retirés du total payé.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setDeletingPaymentId(payment.id);
            try {
              await api.payments.remove(payment.id);
            } catch (error) {
              Alert.alert(
                "Erreur",
                error instanceof Error ? error.message : "Suppression impossible.",
              );
            } finally {
              setDeletingPaymentId(null);
            }
          },
        },
      ],
    );
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

  async function handlePdf() {
    setPdfLoading(true);
    try {
      await shareDocumentPdf(document._id, document.number);
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "PDF indisponible.");
    } finally {
      setPdfLoading(false);
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
    <>
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
          label="Partager"
          onPress={() => setShareOpen(true)}
        />
        <QuickAction
          icon="download-outline"
          label={pdfLoading ? "PDF…" : "PDF"}
          onPress={() => void handlePdf()}
          disabled={pdfLoading}
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
          {balance > 0 ? (
            <PrimaryButton
              label="Encaisser un paiement"
              onPress={() => setPaymentOpen(true)}
            />
          ) : (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle-outline" size={17} color={colors.success} />
              <Text style={styles.paidBadgeText}>Facture entièrement payée</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <View style={styles.fieldGrow}>
              <DateField
                label="Échéance"
                optional
                value={dueDate}
                onChange={(value) => setDueDate(value ?? "")}
                placeholder="Choisir une date"
                hint="Date limite de paiement."
                allowClear
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

      {isInvoice ? (
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Paiements</Text>
            <Text style={styles.paymentCount}>{payments?.length ?? 0}</Text>
          </View>
          {payments === undefined ? (
            <Text style={styles.paymentEmpty}>Chargement…</Text>
          ) : payments.length === 0 ? (
            <Text style={styles.paymentEmpty}>Aucun paiement enregistré.</Text>
          ) : (
            payments.map((payment, index) => {
              const methodLabel = paymentMethods[payment.method] ?? payment.method;
              return (
                <View
                  key={payment.id}
                  style={[styles.paymentRow, index > 0 && styles.paymentDivider]}
                >
                  <View style={styles.paymentIcon}>
                    <Ionicons name="cash-outline" size={17} color={colors.success} />
                  </View>
                  <View style={styles.paymentBody}>
                    <Text style={styles.paymentReceipt}>
                      {payment.receiptNumber || "Paiement"}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {methodLabel} · {formatDate(payment.receivedAt)}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatMoney(payment.amountCents)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Partager le reçu"
                    onPress={() => void handleReceipt(payment)}
                    disabled={receiptLoadingId === payment.id}
                    hitSlop={6}
                    style={({ pressed }) => [styles.paymentDelete, pressed && styles.pressed]}
                  >
                    {receiptLoadingId === payment.id ? (
                      <Text style={styles.paymentDeleteLabel}>…</Text>
                    ) : (
                      <Ionicons name="receipt-outline" size={15} color={colors.primaryDark} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Supprimer le paiement"
                    onPress={() => confirmDeletePayment(payment)}
                    disabled={deletingPaymentId === payment.id}
                    hitSlop={6}
                    style={({ pressed }) => [styles.paymentDelete, pressed && styles.pressed]}
                  >
                    {deletingPaymentId === payment.id ? (
                      <Text style={styles.paymentDeleteLabel}>…</Text>
                    ) : (
                      <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
          {paid > paymentSum + 1 ? (
            <Text style={styles.paymentLegacyNote}>
              Un encaissement antérieur de {formatMoney(paid - paymentSum)} est inclus dans
              le total payé.
            </Text>
          ) : null}
        </Card>
      ) : null}

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

      {!isInvoice ? (
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Approbation</Text>
            <StatusPill
              label={
                approval?.decision === "accepted"
                  ? "Accepté"
                  : approval?.decision === "refused"
                    ? "Refusé"
                    : "En attente"
              }
              tone={
                approval?.decision === "accepted"
                  ? "green"
                  : approval?.decision === "refused"
                    ? "red"
                    : "slate"
              }
            />
          </View>
          {approval === undefined ? (
            <Text style={styles.help}>Chargement…</Text>
          ) : approval ? (
            <>
              <InfoRow label="Signataire" value={approval.signerName} icon="person-outline" />
              <InfoRow
                label="Date de validation"
                value={formatDate(new Date(approval.createdAt).toISOString())}
                icon="time-outline"
              />
              {approval.reason ? (
                <InfoRow label="Motif" value={approval.reason} icon="chatbox-outline" />
              ) : null}
              {approval.signatureUrl ? (
                <Image
                  source={{ uri: approval.signatureUrl }}
                  style={styles.signature}
                  contentFit="contain"
                />
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.help}>
                Le client n’a pas encore accepté ou refusé ce devis. Partagez le lien
                sécurisé pour recueillir sa signature.
              </Text>
              <PrimaryButton
                label="Partager pour validation"
                variant="outline"
                onPress={() => setShareOpen(true)}
              />
            </>
          )}
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
      <ShareDocumentSheet
        document={shareOpen ? document : null}
        onClose={() => setShareOpen(false)}
      />
      {paymentOpen ? (
        <PaymentSheet
          documentId={document._id}
          balanceCents={balance}
          onClose={() => setPaymentOpen(false)}
        />
      ) : null}
    </>
  );
}

function PaymentSheet({
  documentId,
  balanceCents,
  onClose,
}: {
  documentId: string;
  balanceCents: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(
    balanceCents > 0 ? String(balanceCents / 100) : "",
  );
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [receivedAt, setReceivedAt] = useState(today());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const amountCents = parseMoney(amount);
    if (Number.isNaN(amountCents)) {
      setError("Saisissez un montant valide.");
      return;
    }
    if (amountCents > balanceCents) {
      setError("Le paiement ne peut pas dépasser le solde restant.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedAt)) {
      setError("Sélectionnez une date valide.");
      return;
    }

    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      await api.payments.create({
        documentId,
        amountCents,
        method,
        receivedAt,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Paiement impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.overlay} />
        <View
          style={[
            styles.paymentSheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.paymentHeader}>
            <View style={styles.paymentHeaderText}>
              <Text style={styles.paymentTitle}>Encaisser un paiement</Text>
              <Text style={styles.paymentSubtitle}>
                Solde restant : {formatMoney(balanceCents)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.paymentClose, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.paymentForm}
            contentContainerStyle={styles.paymentFormContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field
              label="Montant (MAD)"
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                setError("");
              }}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <View style={styles.paymentMethods}>
              {paymentOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  active={method === option.value}
                  onPress={() => {
                    setMethod(option.value);
                    setError("");
                  }}
                />
              ))}
            </View>
            <DateField
              label="Date du paiement"
              required
              value={receivedAt}
              onChange={(value) => {
                setReceivedAt(value ?? today());
                setError("");
              }}
              placeholder="Choisir une date"
              title="Date du paiement"
            />
            <Field
              label="Référence"
              optional
              value={reference}
              onChangeText={setReference}
              placeholder="Numéro de virement, chèque…"
            />
            <Field
              label="Notes"
              optional
              value={notes}
              onChangeText={setNotes}
              placeholder="Remarque interne"
              multiline
              style={styles.paymentNotes}
            />
            {error ? <Text style={styles.paymentError}>{error}</Text> : null}
          </ScrollView>

          <PrimaryButton
            label="Enregistrer le paiement"
            onPress={() => void handleSave()}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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

  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  paidBadgeText: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.success,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  paymentCount: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    color: colors.mutedSoft,
  },
  paymentEmpty: {
    paddingVertical: spacing.md,
    fontSize: fontSize.small,
    color: colors.muted,
    textAlign: "center",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  paymentDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  paymentIcon: {
    height: 34,
    width: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successSoft,
  },
  paymentBody: {
    flex: 1,
    gap: 1,
  },
  paymentReceipt: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
  },
  paymentMeta: {
    fontSize: fontSize.caption,
    color: colors.muted,
  },
  paymentAmount: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  paymentDelete: {
    height: 28,
    width: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
  },
  paymentDeleteLabel: {
    fontSize: fontSize.small,
    color: colors.danger,
  },
  paymentLegacyNote: {
    fontSize: fontSize.caption,
    lineHeight: 17,
    color: colors.mutedSoft,
    paddingTop: spacing.sm,
  },
  sheetRoot: {
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
  paymentSheet: {
    maxHeight: "90%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handle: {
    alignSelf: "center",
    height: 4,
    width: 44,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  paymentHeaderText: {
    flex: 1,
    gap: 2,
  },
  paymentTitle: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  paymentSubtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  paymentClose: {
    height: 38,
    width: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  paymentForm: {
    flexShrink: 1,
  },
  paymentFormContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentNotes: {
    minHeight: 80,
    paddingTop: spacing.md,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  paymentError: {
    fontSize: fontSize.caption + 1,
    color: colors.danger,
  },
  signature: {
    width: "100%",
    height: 120,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
