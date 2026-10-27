import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DocumentKind } from "@/api/types";
import { Card, EmptyState, Screen, SearchBar, Skeleton, StatusPill } from "@/components/ui";
import { Chip } from "@/components/domain/DetailKit";
import { useLiveDocuments } from "@/convex/hooks";
import { formatDateShort, formatMoney, formatMoneyShort } from "@/lib/format";
import { getDocumentStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const filters: { key: DocumentKind | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "quote", label: "Devis" },
  { key: "invoice", label: "Factures" },
];

function documentTotal(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

export default function DevisScreen() {
  const router = useRouter();
  const page = useLiveDocuments();
  const [filter, setFilter] = useState<DocumentKind | "all">("all");
  const [search, setSearch] = useState("");

  const documents = useMemo(() => page?.page ?? [], [page]);

  const counts = useMemo(() => {
    const base = { all: documents.length, quote: 0, invoice: 0 };
    for (const document of documents) base[document.kind] += 1;
    return base;
  }, [documents]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (filter !== "all" && document.kind !== filter) return false;
      if (!query) return true;
      return [document.number, document.client.name]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [documents, filter, search]);

  const totalValue = documents.reduce(
    (sum, document) => sum + documentTotal(document.items),
    0,
  );

  return (
    <Screen scroll edges={[]}>
      <View style={styles.summary}>
        <View style={styles.summaryText}>
          <Text style={styles.summaryValue}>{formatMoneyShort(totalValue)}</Text>
          <Text style={styles.summaryLabel}>valeur des documents récents</Text>
          <Text style={styles.summaryHint}>
            {counts.quote} devis · {counts.invoice} factures
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/devis/editeur")}
          style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={17} color={colors.white} />
          <Text style={styles.createLabel}>Nouveau</Text>
        </Pressable>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Numéro de document ou client…"
      />

      <View style={styles.filters}>
        {filters.map((item) => (
          <Chip
            key={item.key}
            label={`${item.label} ${counts[item.key]}`}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>

      {page === undefined ? (
        <View style={styles.list}>
          {[0, 1, 2].map((index) => (
            <Card key={index} style={styles.card}>
              <View style={styles.cardRow}>
                <Skeleton width={44} height={44} radius={12} />
                <View style={styles.skeletonBody}>
                  <Skeleton width="55%" height={14} />
                  <Skeleton width="35%" height={10} />
                </View>
                <Skeleton width={70} height={22} radius={11} />
              </View>
            </Card>
          ))}
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="document-text-outline"
            title="Aucun document"
            description="Créez un devis pour le partager avec votre client."
            actionLabel="Nouveau devis"
            onAction={() => router.push("/devis/editeur")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((document) => {
            const status = getDocumentStatus(document.status);
            const isQuote = document.kind === "quote";
            return (
              <Pressable
                key={document._id}
                accessibilityRole="button"
                onPress={() => router.push(`/devis/${document._id}`)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card style={styles.card}>
                  <View style={styles.cardRow}>
                    <View
                      style={[
                        styles.iconTile,
                        {
                          backgroundColor: isQuote
                            ? colors.accentSoft
                            : colors.primarySoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isQuote ? "document-text-outline" : "receipt-outline"}
                        size={20}
                        color={isQuote ? colors.cta : colors.primaryDark}
                      />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.number} numberOfLines={1}>
                        {document.number}
                      </Text>
                      <Text style={styles.client} numberOfLines={1}>
                        {document.client.name || "Client"}
                      </Text>
                    </View>
                    <StatusPill label={status.label} tone={status.tone} />
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.date}>{formatDateShort(document.date)}</Text>
                    <Text style={styles.amount}>{formatMoney(documentTotal(document.items))}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
          {page && !page.isDone ? (
            <Text style={styles.note}>30 documents les plus récents affichés.</Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryText: {
    flex: 1,
    gap: 1,
  },
  summaryValue: {
    fontSize: fontSize.heading + 6,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: {
    fontSize: fontSize.small,
    fontWeight: "500",
    color: colors.muted,
  },
  summaryHint: {
    fontSize: fontSize.caption + 1,
    color: colors.mutedSoft,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  createLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.white,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconTile: {
    height: 44,
    width: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  number: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  client: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  date: {
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  amount: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  skeletonBody: {
    flex: 1,
    gap: spacing.sm,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  note: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  pressed: {
    opacity: 0.6,
  },
});
