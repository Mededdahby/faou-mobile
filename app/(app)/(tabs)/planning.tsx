import { Ionicons } from "@expo/vector-icons";
import { differenceInCalendarDays, format, isValid, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Tone } from "@/lib/status";
import { Chip, PageHeader } from "@/components/domain/DetailKit";
import { Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import { useLiveDocuments, useLiveProjects } from "@/convex/hooks";
import { formatMoneyShort } from "@/lib/format";
import { getDocumentStatus, getProjectStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

type Category = "chantier" | "facture";
type GroupKey = "overdue" | "today" | "week" | "month" | "later";

interface PlanningEvent {
  key: string;
  date: string;
  title: string;
  subtitle: string;
  category: Category;
  label: string;
  tone: Tone;
  href: string;
}

const groupOrder: GroupKey[] = ["overdue", "today", "week", "month", "later"];

const groupLabels: Record<GroupKey, string> = {
  overdue: "En retard",
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois-ci",
  later: "Plus tard",
};

function groupFor(date: string): GroupKey {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return "later";
  const days = differenceInCalendarDays(parsed, startOfDay(new Date()));
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "later";
}

function dateBadge(value: string) {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return { day: "--", month: "—" };
  return {
    day: format(parsed, "dd"),
    month: format(parsed, "MMM", { locale: fr }).replace(".", "").toUpperCase(),
  };
}

export default function PlanningScreen() {
  const router = useRouter();
  const projects = useLiveProjects();
  const documents = useLiveDocuments();
  const [filter, setFilter] = useState<"all" | Category>("all");

  const events = useMemo<PlanningEvent[]>(() => {
    const items: PlanningEvent[] = [];

    for (const project of projects ?? []) {
      if (project.status === "completed" || project.status === "cancelled") continue;
      const status = getProjectStatus(project.status);
      if (project.startDate) {
        items.push({
          key: `start-${project.id}`,
          date: project.startDate,
          title: project.name,
          subtitle: `Démarrage chantier · ${project.clientName}`,
          category: "chantier",
          label: "Démarrage",
          tone: "amber",
          href: `/projets/${project.id}`,
        });
      }
      if (project.dueDate) {
        items.push({
          key: `due-${project.id}`,
          date: project.dueDate,
          title: project.name,
          subtitle: `Échéance chantier · ${project.clientName}`,
          category: "chantier",
          label: status.label,
          tone: status.tone,
          href: `/projets/${project.id}`,
        });
      }
    }

    for (const document of documents?.page ?? []) {
      if (document.kind !== "invoice" || !document.dueDate) continue;
      if (document.status === "paid" || document.status === "cancelled") continue;
      const total = document.items.reduce((sum, item) => sum + item.amountCents, 0);
      const balance = total - (document.amountPaidCents ?? 0);
      if (balance <= 0) continue;
      const status = getDocumentStatus(document.status);
      items.push({
        key: `invoice-${document._id}`,
        date: document.dueDate,
        title: `Facture ${document.number}`,
        subtitle: `${document.client.name} · ${formatMoneyShort(balance)}`,
        category: "facture",
        label: status.label,
        tone: status.tone,
        href: `/devis/${document._id}`,
      });
    }

    return items
      .filter((item) => filter === "all" || item.category === filter)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [documents, filter, projects]);

  const groups = useMemo(() => {
    const map = new Map<GroupKey, PlanningEvent[]>();
    for (const key of groupOrder) map.set(key, []);
    for (const event of events) map.get(groupFor(event.date))?.push(event);
    return groupOrder.map((key) => ({ key, label: groupLabels[key], items: map.get(key) ?? [] }));
  }, [events]);

  return (
    <Screen scroll>
      <PageHeader
        title="Planning"
        subtitle="Vos démarrages, échéances de chantier et factures à encaisser."
      />

      <View style={styles.filters}>
        <Chip
          label={`Tout ${events.length}`}
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <Chip
          label="Chantiers"
          active={filter === "chantier"}
          onPress={() => setFilter("chantier")}
        />
        <Chip
          label="Factures"
          active={filter === "facture"}
          onPress={() => setFilter("facture")}
        />
      </View>

      {projects === undefined || documents === undefined ? (
        <Card style={styles.loadingCard}>
          <Text style={styles.mutedText}>Chargement du planning…</Text>
        </Card>
      ) : events.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="calendar-clear-outline"
            title="Aucune échéance"
            description="Ajoutez des dates de démarrage ou d’échéance à vos projets pour les voir ici."
            actionLabel="Ouvrir les projets"
            onAction={() => router.push("/projets")}
          />
        </Card>
      ) : (
        groups.map((group) =>
          group.items.length === 0 ? null : (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text
                  style={[
                    styles.groupTitle,
                    group.key === "overdue" && styles.groupTitleOverdue,
                  ]}
                >
                  {group.label}
                </Text>
                <Text style={styles.groupCount}>{group.items.length}</Text>
              </View>
              <Card style={styles.groupCard}>
                {group.items.map((event, index) => {
                  const badge = dateBadge(event.date);
                  return (
                    <Pressable
                      key={event.key}
                      accessibilityRole="button"
                      onPress={() => router.push(event.href as never)}
                      style={({ pressed }) => [
                        styles.row,
                        index > 0 && styles.divider,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.dateBadge,
                          group.key === "overdue" && styles.dateBadgeOverdue,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateDay,
                            group.key === "overdue" && styles.dateOverdueText,
                          ]}
                        >
                          {badge.day}
                        </Text>
                        <Text
                          style={[
                            styles.dateMonth,
                            group.key === "overdue" && styles.dateOverdueText,
                          ]}
                        >
                          {badge.month}
                        </Text>
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {event.title}
                        </Text>
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          {event.subtitle}
                        </Text>
                      </View>
                      <StatusPill label={event.label} tone={event.tone} dot={false} />
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          ),
        )
      )}

      <View style={styles.note}>
        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
        <Text style={styles.noteText}>
          Les visites de chantier et rendez-vous clients seront synchronisés prochainement.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  loadingCard: {
    marginTop: spacing.lg,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  mutedText: {
    fontSize: fontSize.small,
    color: colors.muted,
    textAlign: "center",
  },
  group: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  groupTitle: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  groupTitleOverdue: {
    color: colors.danger,
  },
  groupCount: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    color: colors.mutedSoft,
  },
  groupCard: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dateBadge: {
    height: 46,
    width: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  dateBadgeOverdue: {
    backgroundColor: colors.dangerSoft,
  },
  dateDay: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 18,
  },
  dateMonth: {
    fontSize: fontSize.micro,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: colors.muted,
  },
  dateOverdueText: {
    color: colors.danger,
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  rowSubtitle: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.6,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.caption + 1,
    lineHeight: 18,
    color: colors.primaryDark,
  },
});
