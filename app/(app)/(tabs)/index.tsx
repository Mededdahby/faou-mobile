import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSession } from "@/auth/session";
import { Card, PrimaryButton, Screen, SectionHeader, StatCard } from "@/components/ui";
import { QuickAction, QuickActions } from "@/components/domain/DetailKit";
import { useSummary } from "@/hooks/queries";
import { formatDate, formatMoney, timeAgo } from "@/lib/format";
import { getProjectStatus, getSubmissionStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

function documentTotal(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

export default function AccueilScreen() {
  const router = useRouter();
  const { email, isPreview } = useSession();
  const summaryQuery = useSummary();
  const summary = summaryQuery.data;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Administration</Text>
          <Text style={styles.title}>Tableau de bord</Text>
          <Text style={styles.subtitle}>
            Suivez les demandes, les projets et les paiements.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les réglages"
          onPress={() => router.push("/reglages")}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{(email ?? "F").slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>

      {isPreview ? (
        <View style={styles.preview}>
          <Ionicons name="flask-outline" size={15} color="#B45309" />
          <Text style={styles.previewText}>
            Mode aperçu — les données réelles sont masquées.
          </Text>
        </View>
      ) : null}

      {summaryQuery.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : summaryQuery.isError ? (
        <Card style={styles.errorCard}>
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
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <StatCard
                label="Nouvelles demandes"
                value={String(summary.leads.new)}
                icon="mail-unread-outline"
                tone="blue"
              />
            </View>
            <View style={styles.gridItem}>
              <StatCard
                label="Projets actifs"
                value={String(summary.projects.active)}
                icon="briefcase-outline"
                tone="violet"
              />
            </View>
            <View style={styles.gridItem}>
              <StatCard
                label="Encaissé"
                value={formatMoney(summary.money.paidCents)}
                icon="cash-outline"
                tone="green"
              />
            </View>
            <View style={styles.gridItem}>
              <StatCard
                label="Reste à encaisser"
                value={formatMoney(summary.money.outstandingCents)}
                icon="alert-circle-outline"
                tone="amber"
              />
            </View>
          </View>

          <QuickActions>
            <QuickAction
              icon="person-add-outline"
              label="Nouveau client"
              onPress={() => router.push("/clients/editeur")}
            />
            <QuickAction
              icon="briefcase-outline"
              label="Nouveau projet"
              onPress={() => router.push("/projets/editeur")}
            />
            <QuickAction
              icon="document-text-outline"
              label="Nouveau devis"
              onPress={() => router.push("/devis/editeur")}
            />
          </QuickActions>

          <SectionHeader
            title="À traiter"
            actionLabel="Tout voir"
            onAction={() => router.push("/demandes")}
          />
          <Card style={styles.section}>
            {summary.recentLeads.length === 0 ? (
              <Text style={styles.emptyText}>Aucune nouvelle demande.</Text>
            ) : (
              summary.recentLeads.map((lead, index) => {
                const status = getSubmissionStatus(lead.status);
                return (
                  <Pressable
                    key={lead.id}
                    onPress={() => router.push(`/demandes/${lead.id}`)}
                    style={({ pressed }) => [
                      styles.row,
                      index > 0 && styles.rowBorder,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {lead.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {lead.project_type || "Projet"} · {timeAgo(lead.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.rowBadge}>{status.label}</Text>
                  </Pressable>
                );
              })
            )}
          </Card>

          <SectionHeader title="Échéances" />
          <Card style={styles.section}>
            {summary.upcomingInvoices.length === 0 && summary.upcomingProjects.length === 0 ? (
              <Text style={styles.emptyText}>Rien à signaler dans les 30 prochains jours.</Text>
            ) : (
              <>
                {summary.upcomingInvoices.map((document, index) => (
                  <Pressable
                    key={document._id}
                    onPress={() => router.push(`/devis/${document._id}`)}
                    style={({ pressed }) => [
                      styles.row,
                      index > 0 && styles.rowBorder,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        Facture {document.number}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {document.client.name}
                        {document.dueDate ? ` · ${formatDate(document.dueDate)}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.rowAmount}>
                      {formatMoney(
                        documentTotal(document.items) - (document.amountPaidCents ?? 0),
                      )}
                    </Text>
                  </Pressable>
                ))}
                {summary.upcomingProjects.map((project, index) => {
                  const status = getProjectStatus(project.status);
                  return (
                    <Pressable
                      key={project.id}
                      onPress={() => router.push(`/projets/${project.id}`)}
                      style={({ pressed }) => [
                        styles.row,
                        (index > 0 || summary.upcomingInvoices.length > 0) && styles.rowBorder,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {project.name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {project.dueDate ? formatDate(project.dueDate) : "Sans échéance"} ·{" "}
                          {status.label}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
                    </Pressable>
                  );
                })}
              </>
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  headerText: {
    flex: 1,
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
    lineHeight: 19,
    color: colors.muted,
  },
  avatar: {
    height: 42,
    width: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  avatarText: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.accent,
  },
  preview: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#FEF3C7",
    padding: spacing.md,
  },
  previewText: {
    flex: 1,
    fontSize: fontSize.small,
    lineHeight: 18,
    color: "#92400E",
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  errorCard: {
    marginTop: spacing.lg,
    gap: spacing.sm,
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
  },
  grid: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  gridItem: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  section: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  rowMeta: {
    fontSize: fontSize.caption,
    color: colors.muted,
  },
  rowBadge: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    color: colors.primary,
  },
  rowAmount: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  emptyText: {
    paddingVertical: spacing.md,
    fontSize: fontSize.small,
    color: colors.muted,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
