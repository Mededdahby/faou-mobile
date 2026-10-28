import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { StyleSheet, Text, View } from "react-native";
import type { DocumentClient, DocumentItem } from "@/api/types";
import { formatMoney } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

interface QuotePreviewProps {
  kind: "quote" | "invoice";
  reference?: string;
  date: string;
  client: DocumentClient;
  items: DocumentItem[];
  notes: string;
  conditions: string;
  projectName?: string;
}

function formatPreviewDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "d MMMM yyyy", { locale: fr });
}

export function QuotePreview({
  kind,
  reference,
  date,
  client,
  items,
  notes,
  conditions,
  projectName,
}: QuotePreviewProps) {
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  const kindLabel = kind === "invoice" ? "FACTURE" : "DEVIS";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Text style={styles.markLetter}>F</Text>
          </View>
          <View style={styles.brandText}>
            <Text style={styles.wordmark}>FAOU DESIGN</Text>
            <Text style={styles.tagline}>Cuisines &amp; Agencements sur mesure</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.kind}>{kindLabel}</Text>
          <Text style={styles.metaText}>
            Réf. {reference || "Attribuée à l’enregistrement"}
          </Text>
          <Text style={styles.metaText}>{formatPreviewDate(date)}</Text>
        </View>
      </View>

      <View style={styles.clientBox}>
        <View style={styles.clientColumn}>
          <Text style={styles.fieldLabel}>Client</Text>
          <Text style={styles.clientName}>{client.name || "—"}</Text>
          {client.phone ? <Text style={styles.clientMeta}>{client.phone}</Text> : null}
          {client.email ? <Text style={styles.clientMeta}>{client.email}</Text> : null}
          {client.projectType ? (
            <Text style={styles.clientMeta}>{client.projectType}</Text>
          ) : null}
        </View>
        <View style={styles.clientColumn}>
          <Text style={styles.fieldLabel}>Adresse</Text>
          <Text style={styles.clientMeta}>{client.city || "—"}</Text>
          <Text style={styles.clientMeta}>{client.address || "—"}</Text>
          <Text style={styles.clientMeta}>Projet : {projectName || "—"}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderLabel}>Description</Text>
          <Text style={styles.tableHeaderAmount}>Montant (MAD)</Text>
        </View>
        {items.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Ajoutez des lignes pour générer le devis.</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.tableRow, index === items.length - 1 && styles.tableRowLast]}
            >
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemAmount}>{formatMoney(item.amountCents)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.totalRow}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>
        </View>
      </View>

      {conditions ? (
        <View style={styles.conditions}>
          <Text style={styles.conditionsTitle}>Conditions</Text>
          <Text style={styles.conditionsText}>{conditions}</Text>
        </View>
      ) : null}

      {notes ? (
        <View style={styles.conditions}>
          <Text style={styles.conditionsTitle}>Notes</Text>
          <Text style={styles.conditionsText}>{notes}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>FAOU DESIGN · Casablanca</Text>
        <Text style={styles.footerText}>Signature &amp; cachet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  mark: {
    height: 34,
    width: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  markLetter: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.accent,
  },
  brandText: {
    flex: 1,
    gap: 1,
  },
  wordmark: {
    fontSize: fontSize.small,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: colors.ink,
  },
  tagline: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: colors.muted,
  },
  meta: {
    alignItems: "flex-end",
    gap: 2,
    maxWidth: "42%",
  },
  kind: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.primary,
  },
  metaText: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.muted,
    textAlign: "right",
  },
  clientBox: {
    flexDirection: "row",
    gap: spacing.md,
    margin: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  clientColumn: {
    flex: 1,
    gap: 3,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.mutedSoft,
    marginBottom: 2,
  },
  clientName: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.ink,
  },
  clientMeta: {
    fontSize: fontSize.caption,
    lineHeight: 15,
    color: colors.muted,
  },
  table: {
    marginHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  tableHeaderLabel: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    color: colors.white,
  },
  tableHeaderAmount: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    color: colors.white,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSize.caption + 1,
    lineHeight: 17,
    color: colors.ink,
  },
  itemAmount: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  emptyRow: {
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  totalBox: {
    minWidth: 150,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.accent,
  },
  totalValue: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },
  conditions: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  conditionsTitle: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    color: colors.ink,
  },
  conditionsText: {
    fontSize: fontSize.caption,
    lineHeight: 17,
    color: colors.muted,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  footerText: {
    fontSize: 9,
    color: colors.mutedSoft,
  },
});
