import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CommercialDocument } from "@/api/types";
import { useSession } from "@/auth/session";
import { ActivityItem } from "@/components/domain/ActivityItem";
import { BrandMark } from "@/components/domain/BrandMark";
import { NotificationBell } from "@/components/domain/NotificationBell";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { QuickCreateSheet } from "@/components/domain/QuickCreateSheet";
import { QuickStat } from "@/components/domain/QuickStat";
import {
  Avatar,
  Card,
  EmptyState,
  IconButton,
  PrimaryButton,
  Screen,
  SectionHeader,
  Skeleton,
  StatusPill,
} from "@/components/ui";
import {
  useLiveClients,
  useLiveDocuments,
  useLiveProjects,
  useLiveSubmissions,
} from "@/convex/hooks";
import { useSummary } from "@/hooks/queries";
import { formatDateShort, formatMoneyShort, timeAgo } from "@/lib/format";
import { getDocumentStatus, getProjectStatus, getSubmissionStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const pipelineStages = [
  { key: "lead", label: "Prospect", color: colors.mutedSoft },
  { key: "design", label: "Conception", color: colors.primary },
  { key: "production", label: "Fabrication", color: colors.accent },
  { key: "installation", label: "Installation", color: colors.cta },
  { key: "completed", label: "Terminé", color: colors.success },
] as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function documentTotal(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

function dateBadge(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: format(date, "dd"),
    month: format(date, "MMM", { locale: fr }).replace(".", "").toUpperCase(),
    overdue: value < new Date().toISOString().slice(0, 10),
  };
}

export default function AccueilScreen() {
  const router = useRouter();
  const { email } = useSession();
  const summaryQuery = useSummary();
  const summary = summaryQuery.data;
  const projects = useLiveProjects();
  const documents = useLiveDocuments();
  const clients = useLiveClients();
  const submissions = useLiveSubmissions();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeProjects = (projects ?? []).filter(
    (project) => project.status !== "completed" && project.status !== "cancelled",
  );
  const priorityRank = { high: 0, normal: 1, low: 2 } as const;
  const featured = [...activeProjects].sort((a, b) => {
    const priority = priorityRank[a.priority] - priorityRank[b.priority];
    if (priority !== 0) return priority;
    return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
  })[0];

  const recentLeads = [...(submissions ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  const profileDocuments = documents?.page ?? [];
  const pendingQuotes = profileDocuments
    .filter(
      (document) =>
        document.kind === "quote" &&
        (!document.status || document.status === "draft" || document.status === "sent"),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const newLeads = summary?.leads.new ?? 0;
  const activeCount = summary?.projects.active ?? activeProjects.length;
  const paidCents = summary?.money.paidCents ?? 0;
  const invoicedCents = summary?.money.invoicedCents ?? 0;
  const outstandingCents = summary?.money.outstandingCents ?? 0;
  const planningCount =
    (summary?.upcomingInvoices.length ?? 0) + (summary?.upcomingProjects.length ?? 0);
  const paidRatio = invoicedCents > 0 ? Math.min(paidCents / invoicedCents, 1) : 0;

  const pipelineCounts = pipelineStages.map((stage) => ({
    ...stage,
    count: (projects ?? []).filter((project) => project.status === stage.key).length,
  }));
  const pipelineTotal = pipelineCounts.reduce((sum, stage) => sum + stage.count, 0);

  const deadlines = [
    ...(summary?.upcomingInvoices ?? []).map((document: CommercialDocument) => ({
      key: `invoice-${document._id}`,
      date: document.dueDate ?? "",
      title: `Facture ${document.number}`,
      subtitle: `${document.client.name} · ${formatMoneyShort(
        documentTotal(document.items) - (document.amountPaidCents ?? 0),
      )}`,
      onPress: () => router.push(`/devis/${document._id}`),
    })),
    ...(summary?.upcomingProjects ?? []).map((project) => ({
      key: `project-${project.id}`,
      date: project.dueDate ?? "",
      title: project.name,
      subtitle: `${getProjectStatus(project.status).label} · ${project.clientName}`,
      onPress: () => router.push(`/projets/${project.id}`),
    })),
  ]
    .filter((item) => Boolean(item.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const todayLabel = capitalize(format(new Date(), "EEEE d MMMM", { locale: fr }));

  return (
    <View style={styles.root}>
      <Screen
        scroll
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching}
            onRefresh={() => void summaryQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <BrandMark />
          <View style={styles.headerActions}>
            <NotificationBell />
            <IconButton
              icon="mail-unread-outline"
              label="Demandes"
              badge={newLeads}
              onPress={() => router.push("/demandes")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir les réglages"
              onPress={() => router.push("/reglages")}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Avatar name={email ?? "Admin"} size={42} dark />
            </Pressable>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.date}>{todayLabel}</Text>
          <Text style={styles.hello}>Bonjour</Text>
          <Text style={styles.tagline}>
            Voici l’activité de votre atelier aujourd’hui.
          </Text>
        </View>

        {summaryQuery.isPending ? (
          <DashboardSkeleton />
        ) : summaryQuery.isError ? (
          <Card style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
            </View>
            <Text style={styles.errorTitle}>Impossible de charger le tableau de bord</Text>
            <Text style={styles.errorText}>
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : "Vérifiez votre connexion et réessayez."}
            </Text>
            <PrimaryButton
              label="Réessayer"
              variant="outline"
              onPress={() => void summaryQuery.refetch()}
            />
          </Card>
        ) : summary ? (
          <>
            <View style={styles.quickRow}>
              <QuickStat
                icon="mail-unread-outline"
                label="Demandes"
                count={newLeads}
                tone="blue"
                onPress={() => router.push("/demandes")}
              />
              <QuickStat
                icon="document-text-outline"
                label="Devis"
                count={pendingQuotes.length}
                tone="amber"
                onPress={() => router.push("/devis")}
              />
              <QuickStat
                icon="calendar-outline"
                label="Planning"
                count={planningCount}
                tone="violet"
                onPress={() => router.push("/planning")}
              />
              <QuickStat
                icon="people-outline"
                label="Clients"
                count={clients?.length ?? 0}
                tone="green"
                onPress={() => router.push("/clients")}
              />
            </View>

            <SectionHeader
              title="Projet phare"
              actionLabel="Tous les projets"
              onAction={() => router.push("/projets")}
            />
            {projects === undefined ? (
              <Skeleton height={300} radius={radius.lg} />
            ) : featured ? (
              <ProjectCard
                project={featured}
                featured
                onPress={() => router.push(`/projets/${featured.id}`)}
              />
            ) : (
              <Card>
                <EmptyState
                  icon="briefcase-outline"
                  title="Aucun projet actif"
                  description="Créez votre premier projet pour suivre son avancement."
                  actionLabel="Créer un projet"
                  onAction={() => router.push("/projets/editeur")}
                />
              </Card>
            )}

            <SectionHeader title="Pipeline" subtitle="Répartition de vos projets" />
            <Card style={styles.pipelineCard}>
              {projects === undefined ? (
                <Skeleton height={12} radius={6} />
              ) : pipelineTotal === 0 ? (
                <Text style={styles.mutedText}>Aucun projet dans le pipeline.</Text>
              ) : (
                <>
                  <View style={styles.pipelineBar}>
                    {pipelineCounts
                      .filter((stage) => stage.count > 0)
                      .map((stage) => (
                        <View
                          key={stage.key}
                          style={[
                            styles.pipelineSegment,
                            { flex: stage.count, backgroundColor: stage.color },
                          ]}
                        />
                      ))}
                  </View>
                  <View style={styles.legend}>
                    {pipelineCounts.map((stage) => (
                      <View key={stage.key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: stage.color }]} />
                        <Text style={styles.legendLabel}>
                          {stage.label} <Text style={styles.legendCount}>{stage.count}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>

            <SectionHeader title="Aperçu" subtitle="Votre activité en un coup d’œil" />
            <Card style={styles.metricsCard}>
              <View style={styles.metricsRow}>
                <Metric label="Demandes à traiter" value={String(newLeads)} />
                <Metric label="Projets actifs" value={String(activeCount)} divider />
              </View>
              <View style={[styles.metricsRow, styles.metricsRowBorder]}>
                <Metric label="Encaissé" value={formatMoneyShort(paidCents)} />
                <Metric
                  label="Reste à encaisser"
                  value={formatMoneyShort(outstandingCents)}
                  divider
                />
              </View>
            </Card>

            <View style={styles.paidCard}>
              <View style={styles.paidHeader}>
                <View style={styles.paidIcon}>
                  <Ionicons name="trending-up-outline" size={17} color={colors.cta} />
                </View>
                <Text style={styles.paidLabel}>Encaissé</Text>
              </View>
              <Text style={styles.paidValue}>{formatMoneyShort(paidCents)}</Text>
              <Text style={styles.paidHint}>
                sur {formatMoneyShort(invoicedCents)} facturé
              </Text>
              <View style={styles.paidTrack}>
                <View style={[styles.paidFill, { width: `${Math.round(paidRatio * 100)}%` }]} />
              </View>
            </View>

            <SectionHeader
              title="Demandes récentes"
              actionLabel="Tout voir"
              onAction={() => router.push("/demandes")}
            />
            <Card style={styles.listCard}>
              {submissions === undefined ? (
                <Skeleton height={56} radius={radius.md} />
              ) : recentLeads.length === 0 ? (
                <Text style={styles.mutedText}>Aucune demande pour le moment.</Text>
              ) : (
                recentLeads.map((lead, index) => {
                  const status = getSubmissionStatus(lead.status);
                  return (
                    <View key={lead.id} style={index > 0 && styles.divider}>
                      <ActivityItem
                        avatarName={lead.name}
                        title={lead.name}
                        subtitle={`${lead.project_type || "Projet"} · ${lead.city || "—"}`}
                        meta={timeAgo(lead.created_at)}
                        right={<StatusPill label={status.label} tone={status.tone} />}
                        onPress={() => router.push(`/demandes/${lead.id}`)}
                      />
                    </View>
                  );
                })
              )}
            </Card>

            <SectionHeader
              title="Devis en attente"
              actionLabel="Tout voir"
              onAction={() => router.push("/devis")}
            />
            <Card style={styles.listCard}>
              {documents === undefined ? (
                <Skeleton height={56} radius={radius.md} />
              ) : pendingQuotes.length === 0 ? (
                <Text style={styles.mutedText}>Aucun devis en attente.</Text>
              ) : (
                pendingQuotes.slice(0, 3).map((document, index) => {
                  const status = getDocumentStatus(document.status);
                  return (
                    <View key={document._id} style={index > 0 && styles.divider}>
                      <ActivityItem
                        icon="document-text-outline"
                        title={document.number}
                        subtitle={document.client.name}
                        meta={formatDateShort(document.date)}
                        right={
                          <View style={styles.docRight}>
                            <Text style={styles.docAmount}>
                              {formatMoneyShort(documentTotal(document.items))}
                            </Text>
                            <StatusPill label={status.label} tone={status.tone} dot={false} />
                          </View>
                        }
                        onPress={() => router.push(`/devis/${document._id}`)}
                      />
                    </View>
                  );
                })
              )}
            </Card>

            <SectionHeader
              title="Échéances"
              actionLabel="Planning"
              onAction={() => router.push("/planning")}
            />
            <Card style={styles.listCard}>
              {deadlines.length === 0 ? (
                <Text style={styles.mutedText}>Rien à signaler dans les prochains jours.</Text>
              ) : (
                deadlines.map((item, index) => {
                  const badge = dateBadge(item.date);
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      onPress={item.onPress}
                      style={({ pressed }) => [
                        styles.deadline,
                        index > 0 && styles.divider,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.dateBadge,
                          badge?.overdue && styles.dateBadgeOverdue,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateDay,
                            badge?.overdue && styles.dateTextOverdue,
                          ]}
                        >
                          {badge?.day ?? "--"}
                        </Text>
                        <Text
                          style={[
                            styles.dateMonth,
                            badge?.overdue && styles.dateTextOverdue,
                          ]}
                        >
                          {badge?.month ?? "—"}
                        </Text>
                      </View>
                      <View style={styles.deadlineBody}>
                        <Text style={styles.deadlineTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.deadlineSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
                    </Pressable>
                  );
                })
              )}
            </Card>

            <View style={styles.bottomSpace} />
          </>
        ) : null}
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Créer un élément"
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>

      <QuickCreateSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

function Metric({
  label,
  value,
  divider = false,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.metric, divider && styles.metricDivider]}>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <View style={styles.quickRow}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={styles.skeletonStat}>
            <Skeleton width={58} height={58} radius={29} />
            <Skeleton width={44} height={10} />
          </View>
        ))}
      </View>
      <Skeleton height={306} radius={radius.lg} style={styles.skeletonBlock} />
      <Skeleton height={128} radius={radius.lg} style={styles.skeletonBlock} />
      <Skeleton height={188} radius={radius.lg} style={styles.skeletonBlock} />
      <Skeleton height={160} radius={radius.lg} style={styles.skeletonBlock} />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  greeting: {
    marginTop: spacing.xl,
    gap: 2,
  },
  date: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
  },
  hello: {
    fontSize: fontSize.hero,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.ink,
  },
  tagline: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
    marginTop: 2,
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  skeletonStat: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  skeletonBlock: {
    marginTop: spacing.lg,
  },
  errorCard: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  errorIcon: {
    height: 44,
    width: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
  },
  errorTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  errorText: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  pipelineCard: {
    gap: spacing.md,
  },
  pipelineBar: {
    flexDirection: "row",
    height: 12,
    gap: 4,
  },
  pipelineSegment: {
    borderRadius: radius.full,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  legendCount: {
    fontWeight: "700",
    color: colors.ink,
  },
  metricsCard: {
    padding: 0,
    overflow: "hidden",
  },
  metricsRow: {
    flexDirection: "row",
  },
  metricsRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metric: {
    flex: 1,
    padding: spacing.lg,
    gap: 3,
  },
  metricDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  metricValue: {
    fontSize: fontSize.heading + 6,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "500",
    color: colors.muted,
  },
  paidCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  paidHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paidIcon: {
    height: 32,
    width: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },
  paidLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.cta,
  },
  paidValue: {
    fontSize: fontSize.display,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
    marginTop: spacing.xs,
  },
  paidHint: {
    fontSize: fontSize.caption + 1,
    color: colors.warning,
  },
  paidTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  paidFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.cta,
  },
  listCard: {
    paddingVertical: spacing.xs,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  mutedText: {
    paddingVertical: spacing.md,
    fontSize: fontSize.small,
    color: colors.muted,
    textAlign: "center",
  },
  docRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  docAmount: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  deadline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
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
  dateTextOverdue: {
    color: colors.danger,
  },
  deadlineBody: {
    flex: 1,
    gap: 1,
  },
  deadlineTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  deadlineSubtitle: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  bottomSpace: {
    height: spacing.xxl,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg + 4,
    height: 58,
    width: 58,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    shadowColor: "#0B2239",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
