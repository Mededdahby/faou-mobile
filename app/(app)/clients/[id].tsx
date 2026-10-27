import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import {
  ErrorBlock,
  InfoRow,
  LoadingBlock,
  PageHeader,
  QuickAction,
  QuickActions,
} from "@/components/domain/DetailKit";
import { useLiveClients, useLiveDocuments, useLiveProjects } from "@/convex/hooks";
import { useDeleteClient } from "@/hooks/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { callPhone, openDirections, openWhatsApp, sendEmail } from "@/lib/links";
import { getDocumentStatus, getProjectStatus } from "@/lib/status";
import { colors, fontSize, spacing } from "@/theme/tokens";

function documentTotal(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const clients = useLiveClients();
  const projects = useLiveProjects();
  const documents = useLiveDocuments();
  const client = clients?.find((item) => item.id === id);
  const deleteClient = useDeleteClient();

  if (clients === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  if (!client) {
    return (
      <Screen>
        <ErrorBlock message="Ce client n'existe plus." />
      </Screen>
    );
  }

  const linkedProjects = (projects ?? []).filter(
    (project) =>
      project.clientId === client.id ||
      (!project.clientId &&
        project.clientName.trim().toLowerCase() === client.name.trim().toLowerCase()),
  );
  const linkedDocuments = (documents?.page ?? []).filter(
    (document) =>
      document.client.email.trim().toLowerCase() === client.email.trim().toLowerCase() &&
      Boolean(client.email),
  );
  const hasLocation = Boolean(client.address || client.city);

  function handleDelete() {
    if (!client) return;
    Alert.alert(
      "Supprimer le client",
      "Les projets et documents liés seront conservés. Cette action est définitive.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClient.mutateAsync(client.id);
              router.back();
            } catch (error) {
              Alert.alert(
                "Erreur",
                error instanceof Error ? error.message : "Suppression impossible.",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <PageHeader
        title={client.name}
        subtitle={[client.city, client.phone].filter(Boolean).join(" · ") || "Client"}
        right={
          <StatusPill
            label={client.status === "inactive" ? "Inactif" : "Actif"}
            tone={client.status === "inactive" ? "slate" : "green"}
          />
        }
      />

      <QuickActions>
        <QuickAction
          icon="call-outline"
          label="Appeler"
          onPress={() => void callPhone(client.phone)}
          disabled={!client.phone}
        />
        <QuickAction
          icon="mail-outline"
          label="Email"
          onPress={() => void sendEmail(client.email)}
          disabled={!client.email}
        />
        <QuickAction
          icon="logo-whatsapp"
          label="WhatsApp"
          onPress={() => void openWhatsApp(client.phone)}
          disabled={!client.phone}
        />
        <QuickAction
          icon="navigate-outline"
          label="Itinéraire"
          onPress={() => void openDirections(client.address, client.city)}
          disabled={!hasLocation}
        />
      </QuickActions>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Coordonnées</Text>
        <InfoRow
          label="Téléphone"
          value={client.phone}
          icon="call-outline"
          onPress={client.phone ? () => void callPhone(client.phone) : undefined}
        />
        <InfoRow
          label="Email"
          value={client.email}
          icon="mail-outline"
          onPress={client.email ? () => void sendEmail(client.email) : undefined}
        />
        <InfoRow label="Ville" value={client.city} icon="location-outline" />
        <InfoRow
          label="Adresse"
          value={client.address}
          icon="home-outline"
          onPress={hasLocation ? () => void openDirections(client.address, client.city) : undefined}
        />
        <InfoRow label="Client depuis" value={formatDate(client.created_at)} icon="time-outline" />
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{client.notes || "Aucune note."}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Projets</Text>
          <Pressable
            onPress={() => router.push(`/projets/editeur?clientId=${client.id}`)}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Nouveau</Text>
          </Pressable>
        </View>
        {linkedProjects.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="Aucun projet"
            description="Créez un projet pour ce client."
          />
        ) : (
          linkedProjects.map((project) => {
            const status = getProjectStatus(project.status);
            return (
              <Pressable
                key={project.id}
                onPress={() => router.push(`/projets/${project.id}`)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatMoney(project.budgetCents)}
                    {project.dueDate ? ` · ${formatDate(project.dueDate)}` : ""}
                  </Text>
                </View>
                <StatusPill label={status.label} tone={status.tone} />
              </Pressable>
            );
          })
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Documents</Text>
        {linkedDocuments.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Aucun document"
            description="Les devis et factures de ce client apparaîtront ici."
          />
        ) : (
          linkedDocuments.map((document) => {
            const status = getDocumentStatus(document.status);
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
                <StatusPill label={status.label} tone={status.tone} />
              </Pressable>
            );
          })
        )}
      </Card>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/clients/editeur?id=${client.id}`)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryLabel}>Modifier le client</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleDelete}
          style={[styles.secondaryButton, styles.dangerButton]}
        >
          <Text style={[styles.secondaryLabel, styles.dangerLabel]}>Supprimer le client</Text>
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
