import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, Screen, StatusPill } from "@/components/ui";
import {
  Chip,
  ErrorBlock,
  InfoRow,
  LoadingBlock,
  PageHeader,
  QuickAction,
  QuickActions,
} from "@/components/domain/DetailKit";
import { useLiveSubmissions } from "@/convex/hooks";
import {
  useCreateClient,
  useCreateProjectFromSubmission,
  useDeleteSubmission,
  useUpdateSubmissionStatus,
} from "@/hooks/queries";
import { formatDate } from "@/lib/format";
import {
  callPhone,
  openDirections,
  openWhatsApp,
  sendEmail,
} from "@/lib/links";
import { getSubmissionStatus } from "@/lib/status";
import type { SubmissionStatus } from "@/api/types";
import { colors, fontSize, spacing } from "@/theme/tokens";

const materialLabels: Record<string, string> = {
  countertop: "Plan de travail",
  cabinets: "Meubles",
  backsplash: "Crédence",
  flooring: "Sol",
  wall: "Mur",
  color: "Couleur",
};

const statusOptions: { value: SubmissionStatus; label: string }[] = [
  { value: "new", label: "Nouveau" },
  { value: "contacted", label: "Contacté" },
  { value: "completed", label: "Complété" },
];

export default function DemandeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const submissions = useLiveSubmissions();
  const submission = submissions?.find((item) => item.id === id);

  const updateStatus = useUpdateSubmissionStatus();
  const createProject = useCreateProjectFromSubmission();
  const createClient = useCreateClient();
  const deleteSubmission = useDeleteSubmission();
  const [busy, setBusy] = useState(false);

  if (submissions === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  if (!submission) {
    return (
      <Screen>
        <ErrorBlock message="Cette demande n'existe plus ou a été supprimée." />
      </Screen>
    );
  }

  const status = getSubmissionStatus(submission.status);
  const materials = Object.entries(submission.materials ?? {}).filter(([, value]) => value);
  const hasLocation = Boolean(submission.address || submission.city);

  async function changeStatus(next: SubmissionStatus) {
    if (!submission || next === submission.status) return;
    try {
      await updateStatus.mutateAsync({ id: submission.id, status: next });
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Mise à jour impossible.");
    }
  }

  async function handleCreateProject() {
    if (!submission) return;
    setBusy(true);
    try {
      const result = await createProject.mutateAsync(submission.id);
      await updateStatus.mutateAsync({ id: submission.id, status: "contacted" });
      if (result.projectId) router.push(`/projets/${result.projectId}`);
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateClient() {
    if (!submission) return;
    setBusy(true);
    try {
      await createClient.mutateAsync({
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        address: submission.address,
        city: submission.city,
        notes: `Créé depuis la demande du ${formatDate(submission.created_at)}.`,
        status: "active",
      });
      if (submission.status === "new") {
        await updateStatus.mutateAsync({ id: submission.id, status: "contacted" });
      }
      Alert.alert("Client créé", `${submission.name} a été ajouté à la liste des clients.`);
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!submission) return;
    Alert.alert(
      "Supprimer la demande",
      "Cette action est définitive. Le projet lié sera conservé.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubmission.mutateAsync(submission.id);
              router.back();
            } catch (error) {
              Alert.alert("Erreur", error instanceof Error ? error.message : "Suppression impossible.");
            }
          },
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <PageHeader
        title={submission.name}
        subtitle={submission.project_type || "Demande de contact"}
        right={<StatusPill label={status.label} tone={status.tone} />}
      />

      <QuickActions>
        <QuickAction
          icon="call-outline"
          label="Appeler"
          onPress={() => void callPhone(submission.phone)}
          disabled={!submission.phone}
        />
        <QuickAction
          icon="mail-outline"
          label="Email"
          onPress={() => void sendEmail(submission.email)}
          disabled={!submission.email}
        />
        <QuickAction
          icon="logo-whatsapp"
          label="WhatsApp"
          onPress={() => void openWhatsApp(submission.phone)}
          disabled={!submission.phone}
        />
        <QuickAction
          icon="navigate-outline"
          label="Itinéraire"
          onPress={() => void openDirections(submission.address, submission.city)}
          disabled={!hasLocation}
        />
      </QuickActions>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Contact</Text>
        <InfoRow
          label="Téléphone"
          value={submission.phone}
          icon="call-outline"
          onPress={submission.phone ? () => void callPhone(submission.phone) : undefined}
        />
        <InfoRow
          label="Email"
          value={submission.email}
          icon="mail-outline"
          onPress={submission.email ? () => void sendEmail(submission.email) : undefined}
        />
        <InfoRow label="Ville" value={submission.city} icon="location-outline" />
        <InfoRow label="Adresse" value={submission.address} icon="home-outline" />
        <InfoRow label="Reçue le" value={formatDate(submission.created_at)} icon="time-outline" />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Projet</Text>
        <InfoRow label="Type de projet" value={submission.project_type} />
        {materials.length > 0 ? (
          <View style={styles.materials}>
            <Text style={styles.materialsTitle}>Matériaux</Text>
            <View style={styles.materialsRow}>
              {materials.map(([key, value]) => (
                <View key={key} style={styles.materialChip}>
                  <Text style={styles.materialLabel}>{materialLabels[key] ?? key}</Text>
                  <Text style={styles.materialValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.messageBlock}>
          <Text style={styles.materialsTitle}>Message</Text>
          <Text style={styles.message}>{submission.message || "Aucun message."}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Statut</Text>
        <View style={styles.chips}>
          {statusOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={submission.status === option.value}
              onPress={() => void changeStatus(option.value)}
            />
          ))}
        </View>
      </Card>

      <View style={styles.actions}>
        {submission.projectId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/projets/${submission.projectId}`)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryLabel}>Voir le projet lié</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleCreateProject()}
            style={[styles.secondaryButton, busy && styles.disabled]}
          >
            <Text style={styles.secondaryLabel}>Créer le projet</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void handleCreateClient()}
          style={[styles.secondaryButton, busy && styles.disabled]}
        >
          <Text style={styles.secondaryLabel}>Créer le client</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleDelete}
          style={[styles.secondaryButton, styles.dangerButton]}
        >
          <Text style={[styles.secondaryLabel, styles.dangerLabel]}>Supprimer la demande</Text>
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
  cardTitle: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  materials: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  materialsTitle: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
  materialsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  materialChip: {
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 1,
  },
  materialLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
  materialValue: {
    fontSize: fontSize.small,
    color: colors.ink,
  },
  messageBlock: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  message: {
    fontSize: fontSize.small,
    lineHeight: 20,
    color: colors.ink,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingVertical: spacing.md,
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
  disabled: {
    opacity: 0.5,
  },
});
