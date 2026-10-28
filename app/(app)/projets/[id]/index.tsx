import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import {
  Chip,
  ErrorBlock,
  InfoRow,
  LoadingBlock,
  PageHeader,
  QuickAction,
  QuickActions,
} from "@/components/domain/DetailKit";
import { useLiveClients, useLiveDocuments, useLiveProjects } from "@/convex/hooks";
import { useDeleteProject, useUpdateProject } from "@/hooks/queries";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { callPhone, openDirections } from "@/lib/links";
import { getDocumentStatus, getProjectStatus, priorityMeta } from "@/lib/status";
import type { ProjectStatus } from "@/api/types";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const steps: { value: ProjectStatus; label: string }[] = [
  { value: "lead", label: "Prospect" },
  { value: "design", label: "Conception" },
  { value: "production", label: "Fabrication" },
  { value: "installation", label: "Installation" },
  { value: "completed", label: "Terminé" },
];

const statusOptions: { value: ProjectStatus; label: string }[] = [
  ...steps,
  { value: "on_hold", label: "En pause" },
  { value: "cancelled", label: "Annulé" },
];

function documentTotal(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

export default function ProjetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const projects = useLiveProjects();
  const clients = useLiveClients();
  const documents = useLiveDocuments();
  const project = projects?.find((item) => item.id === id);
  const client = project?.clientId
    ? clients?.find((item) => item.id === project.clientId)
    : clients?.find(
        (item) =>
          project &&
          item.name.trim().toLowerCase() === project.clientName.trim().toLowerCase(),
      );

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  if (projects === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  if (!project) {
    return (
      <Screen>
        <ErrorBlock message="Ce projet n'existe plus." />
      </Screen>
    );
  }

  const status = getProjectStatus(project.status);
  const priority = priorityMeta[project.priority] ?? { label: project.priority, tone: "slate" as const };
  const linkedDocuments = (documents?.page ?? []).filter(
    (document) => document.projectId === project.id,
  );
  const address = project.address || client?.address || "";
  const city = project.city || client?.city || "";
  const phone = client?.phone ?? "";
  const currentStep = steps.findIndex((step) => step.value === project.status);

  async function changeStatus(next: ProjectStatus) {
    if (!project || next === project.status) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        name: project.name,
        clientId: project.clientId,
        clientName: project.clientName,
        type: project.type,
        status: next,
        priority: project.priority,
        startDate: project.startDate,
        dueDate: project.dueDate,
        budgetCents: project.budgetCents,
        notes: project.notes,
        address: project.address,
        city: project.city,
      });
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Mise à jour impossible.");
    }
  }

  function handleDelete() {
    if (!project) return;
    Alert.alert("Supprimer le projet", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProject.mutateAsync(project.id);
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
        title={project.name}
        subtitle={[project.clientName, city].filter(Boolean).join(" · ")}
        right={<StatusPill label={status.label} tone={status.tone} />}
      />

      <QuickActions>
        <QuickAction
          icon="call-outline"
          label="Appeler"
          onPress={() => void callPhone(phone)}
          disabled={!phone}
        />
        <QuickAction
          icon="navigate-outline"
          label="Itinéraire"
          onPress={() => void openDirections(address, city)}
          disabled={!address && !city}
        />
        <QuickAction
          icon="images-outline"
          label="Photos"
          onPress={() => router.push(`/projets/${project.id}/photos`)}
        />
        <QuickAction
          icon="checkbox-outline"
          label="Tâches"
          onPress={() => router.push(`/projets/${project.id}/tasks`)}
        />
        <QuickAction
          icon="document-text-outline"
          label="Nouveau devis"
          onPress={() =>
            router.push(
              `/devis/editeur?projectId=${project.id}${client ? `&clientId=${client.id}` : ""}`,
            )
          }
        />
      </QuickActions>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Avancement</Text>
        <View style={styles.steps}>
          {steps.map((step, index) => {
            const done = currentStep >= 0 && index <= currentStep;
            return (
              <View key={step.value} style={styles.step}>
                <View style={[styles.stepDot, done && styles.stepDotDone]}>
                  {done ? <Text style={styles.stepCheck}>✓</Text> : null}
                </View>
                <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${status.progress}%` }]} />
        </View>
        <View style={styles.chips}>
          {statusOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={project.status === option.value}
              onPress={() => void changeStatus(option.value)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Chantier</Text>
        <InfoRow label="Client" value={project.clientName} icon="person-outline" />
        {client ? (
          <InfoRow
            label="Téléphone client"
            value={client.phone}
            icon="call-outline"
            onPress={() => void callPhone(client.phone)}
          />
        ) : null}
        <InfoRow label="Type" value={project.type} icon="albums-outline" />
        <InfoRow label="Priorité" value={priority.label} icon="flag-outline" />
        <InfoRow label="Budget" value={formatMoney(project.budgetCents)} icon="wallet-outline" />
        <InfoRow
          label="Début"
          value={project.startDate ? formatDate(project.startDate) : "—"}
          icon="calendar-outline"
        />
        <InfoRow
          label="Échéance"
          value={project.dueDate ? formatDate(project.dueDate) : "—"}
          icon="calendar-outline"
        />
        <InfoRow label="Ville" value={city} icon="location-outline" />
        <InfoRow
          label="Adresse"
          value={address}
          icon="home-outline"
          onPress={() => void openDirections(address, city)}
        />
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{project.notes || "Aucune note."}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Montants</Text>
        <View style={styles.moneyGrid}>
          <View style={styles.moneyItem}>
            <Text style={styles.moneyLabel}>Devis</Text>
            <Text style={styles.moneyValue}>{formatMoney(project.quotedCents)}</Text>
          </View>
          <View style={styles.moneyItem}>
            <Text style={styles.moneyLabel}>Facturé</Text>
            <Text style={styles.moneyValue}>{formatMoney(project.invoicedCents)}</Text>
          </View>
          <View style={styles.moneyItem}>
            <Text style={styles.moneyLabel}>Encaissé</Text>
            <Text style={[styles.moneyValue, styles.moneyPaid]}>
              {formatMoney(project.paidCents)}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Historique</Text>
        <InfoRow
          label="Créé le"
          value={formatDateTime(project.created_at)}
          icon="time-outline"
        />
        <InfoRow
          label="Dernière mise à jour"
          value={formatDateTime(project.updated_at)}
          icon="refresh-outline"
        />
        <InfoRow
          label="Démarrage prévu"
          value={project.startDate ? formatDate(project.startDate) : "—"}
          icon="calendar-outline"
        />
        <InfoRow
          label="Échéance"
          value={project.dueDate ? formatDate(project.dueDate) : "—"}
          icon="flag-outline"
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Documents</Text>
          <Pressable
            onPress={() =>
              router.push(
                `/devis/editeur?projectId=${project.id}${client ? `&clientId=${client.id}` : ""}`,
              )
            }
            accessibilityRole="button"
          >
            <Text style={styles.link}>Créer</Text>
          </Pressable>
        </View>
        {linkedDocuments.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Aucun document"
            description="Créez un devis pour ce projet."
          />
        ) : (
          linkedDocuments.map((document) => {
            const documentStatus = getDocumentStatus(document.status);
            return (
              <Pressable
                key={document._id}
                onPress={() => router.push(`/devis/${document._id}`)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {document.number}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {document.kind === "invoice" ? "Facture" : "Devis"} ·{" "}
                    {formatMoney(documentTotal(document.items))}
                  </Text>
                </View>
                <StatusPill label={documentStatus.label} tone={documentStatus.tone} />
              </Pressable>
            );
          })
        )}
      </Card>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/projets/editeur?id=${project.id}`)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryLabel}>Modifier le projet</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleDelete}
          style={[styles.secondaryButton, styles.dangerButton]}
        >
          <Text style={[styles.secondaryLabel, styles.dangerLabel]}>Supprimer le projet</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    paddingBottom: 0,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  link: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
    paddingBottom: spacing.xs,
  },
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
    paddingTop: spacing.sm,
  },
  step: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  stepDot: {
    height: 22,
    width: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  stepCheck: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.mutedSoft,
    textAlign: "center",
  },
  stepLabelDone: {
    color: colors.ink,
  },
  progressTrack: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  notes: {
    paddingVertical: spacing.md,
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
    paddingVertical: spacing.md,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
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
  pressed: {
    opacity: 0.6,
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
