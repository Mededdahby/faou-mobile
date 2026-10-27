import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import { useLiveDocuments } from "@/convex/hooks";
import { formatDate, formatMoney } from "@/lib/format";
import { getDocumentStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const filters = [
  { key: "all", label: "Tous" },
  { key: "quote", label: "Devis" },
  { key: "invoice", label: "Factures" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

function totalCents(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

export default function DevisScreen() {
  const router = useRouter();
  const page = useLiveDocuments();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const documents = page?.page ?? [];
    const query = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (filter !== "all" && document.kind !== filter) return false;
      if (!query) return true;
      return [document.number, document.client.name]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [page, filter, search]);

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Administration</Text>
          <Text style={styles.title}>Devis &amp; factures</Text>
          <Text style={styles.subtitle}>Les documents partagés avec vos clients.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/devis/editeur")}
          style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
        >
          <Text style={styles.newLabel}>+ Nouveau</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher un numéro ou un client…"
        placeholderTextColor={colors.mutedSoft}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      <View style={styles.filters}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {page === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="document-text-outline"
            title="Aucun document"
            description="Les devis et factures de ce filtre apparaîtront ici."
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((document) => {
            const status = getDocumentStatus(document.status);
            return (
              <Pressable
                key={document._id}
                onPress={() => router.push(`/devis/${document._id}`)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.titleGroup}>
                      <Text style={styles.number} numberOfLines={1}>
                        {document.number}
                      </Text>
                      <Text style={styles.kind}>
                        {document.kind === "invoice" ? "Facture" : "Devis"}
                      </Text>
                    </View>
                    <StatusPill label={status.label} tone={status.tone} />
                  </View>
                  <Text style={styles.client} numberOfLines={1}>
                    {document.client.name || "Client"}
                  </Text>
                  <View style={styles.cardBottom}>
                    <Text style={styles.date}>{formatDate(document.date)}</Text>
                    <Text style={styles.amount}>{formatMoney(totalCents(document.items))}</Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  header: {
    flex: 1,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  newButton: {
    marginTop: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newLabel: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.white,
  },
  eyebrow: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  search: {
    marginTop: spacing.lg,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  filters: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filter: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  filterActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.muted,
  },
  filterLabelActive: {
    color: colors.white,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  number: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  kind: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  client: {
    marginTop: spacing.xs,
    fontSize: fontSize.small,
    color: colors.muted,
  },
  cardBottom: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  date: {
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  amount: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  note: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
