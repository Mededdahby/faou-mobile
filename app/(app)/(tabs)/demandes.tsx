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
import type { SubmissionStatus } from "@/api/types";
import { Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import { useLiveSubmissions } from "@/convex/hooks";
import { timeAgo } from "@/lib/format";
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
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Administration</Text>
        <Text style={styles.title}>Demandes</Text>
        <Text style={styles.subtitle}>Les demandes envoyées depuis le site.</Text>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher un nom, un email, une ville…"
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
                {item.label} {counts[item.key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {submissions === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="mail-open-outline"
            title="Aucune demande"
            description="Les demandes correspondant à ce filtre apparaîtront ici."
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((submission) => {
            const status = getSubmissionStatus(submission.status);
            return (
              <Pressable
                key={submission.id}
                onPress={() => router.push(`/demandes/${submission.id}`)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name} numberOfLines={1}>
                      {submission.name}
                    </Text>
                    <StatusPill label={status.label} tone={status.tone} />
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {submission.project_type || "Projet"} · {submission.city || "Ville inconnue"}
                  </Text>
                  <View style={styles.cardBottom}>
                    <Text style={styles.time}>{timeAgo(submission.created_at)}</Text>
                    {submission.projectId ? (
                      <Text style={styles.linked}>Projet lié</Text>
                    ) : null}
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
  header: {
    paddingTop: spacing.md,
    gap: spacing.xs,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
  },
  meta: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  cardBottom: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: {
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  linked: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
