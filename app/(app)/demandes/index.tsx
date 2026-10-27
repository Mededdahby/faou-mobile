import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SubmissionStatus } from "@/api/types";
import { Avatar, Card, EmptyState, Screen, SearchBar, Skeleton, StatusPill } from "@/components/ui";
import { Chip } from "@/components/domain/DetailKit";
import { useLiveSubmissions } from "@/convex/hooks";
import { timeAgo } from "@/lib/format";
import { callPhone, openWhatsApp } from "@/lib/links";
import { getSubmissionStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const filters: { key: SubmissionStatus | "all"; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "new", label: "Nouvelles" },
  { key: "contacted", label: "Contactées" },
  { key: "completed", label: "Complétées" },
];

export default function DemandesScreen() {
  const router = useRouter();
  const submissions = useLiveSubmissions();
  const [filter, setFilter] = useState<SubmissionStatus | "all">("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const base = { all: submissions?.length ?? 0, new: 0, contacted: 0, completed: 0 };
    for (const submission of submissions ?? []) base[submission.status] += 1;
    return base;
  }, [submissions]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (submissions ?? []).filter((submission) => {
      if (filter !== "all" && submission.status !== filter) return false;
      if (!query) return true;
      return [submission.name, submission.email, submission.phone, submission.city]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [submissions, filter, search]);

  return (
    <Screen scroll edges={[]}>
      <View style={styles.summary}>
        <View style={styles.summaryText}>
          <Text style={styles.summaryValue}>{counts.new}</Text>
          <Text style={styles.summaryLabel}>
            nouvelle{counts.new === 1 ? "" : "s"} demande{counts.new === 1 ? "" : "s"}
          </Text>
          <Text style={styles.summaryHint}>{counts.all} au total</Text>
        </View>
        <View style={styles.summaryIcon}>
          <Ionicons name="mail-unread-outline" size={24} color={colors.primaryDark} />
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Nom, email, téléphone ou ville…"
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

      {submissions === undefined ? (
        <View style={styles.list}>
          {[0, 1, 2].map((index) => (
            <Card key={index} style={styles.card}>
              <View style={styles.cardRow}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={styles.skeletonBody}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={10} />
                </View>
                <Skeleton width={64} height={22} radius={11} />
              </View>
              <Skeleton width="30%" height={10} />
            </Card>
          ))}
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="mail-open-outline"
            title="Aucune demande"
            description="Les demandes correspondant à ce filtre apparaîtront ici."
            actionLabel={search ? "Effacer la recherche" : undefined}
            onAction={search ? () => setSearch("") : undefined}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((submission) => {
            const status = getSubmissionStatus(submission.status);
            return (
              <Pressable
                key={submission.id}
                accessibilityRole="button"
                onPress={() => router.push(`/demandes/${submission.id}`)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card style={styles.card}>
                  <View style={styles.cardRow}>
                    <Avatar name={submission.name} size={44} />
                    <View style={styles.cardBody}>
                      <Text style={styles.name} numberOfLines={1}>
                        {submission.name}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {submission.project_type || "Projet"} ·{" "}
                        {submission.city || "Ville inconnue"}
                      </Text>
                    </View>
                    <StatusPill label={status.label} tone={status.tone} />
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.time}>{timeAgo(submission.created_at)}</Text>
                    <View style={styles.footerActions}>
                      {submission.projectId ? (
                        <View style={styles.linked}>
                          <Ionicons
                            name="link-outline"
                            size={12}
                            color={colors.primaryDark}
                          />
                          <Text style={styles.linkedLabel}>Projet lié</Text>
                        </View>
                      ) : null}
                      {submission.phone ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Appeler ${submission.name}`}
                          onPress={() => void callPhone(submission.phone)}
                          hitSlop={6}
                          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                        >
                          <Ionicons name="call-outline" size={15} color={colors.primaryDark} />
                        </Pressable>
                      ) : null}
                      {submission.phone ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`WhatsApp ${submission.name}`}
                          onPress={() => void openWhatsApp(submission.phone)}
                          hitSlop={6}
                          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                        >
                          <Ionicons name="logo-whatsapp" size={15} color={colors.success} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
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
    gap: 1,
  },
  summaryValue: {
    fontSize: fontSize.hero,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  summaryHint: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  summaryIcon: {
    height: 54,
    width: 54,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
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
  cardBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  meta: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  time: {
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  linked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  linkedLabel: {
    fontSize: fontSize.micro,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  action: {
    height: 30,
    width: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  skeletonBody: {
    flex: 1,
    gap: spacing.sm,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
