import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PhotoPhase, ProjectPhoto } from "@/api/types";
import { api } from "@/api/endpoints";
import { EmptyState, Screen } from "@/components/ui";
import { LoadingBlock } from "@/components/domain/DetailKit";
import {
  FormChoice,
  FormField,
  FormFooter,
  FormSection,
  KeyboardForm,
} from "@/components/form/KeyboardForm";
import { useLiveProjectPhotos, useLiveProjects } from "@/convex/hooks";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { shareProjectReportPdf } from "@/lib/pdf";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const phaseOptions: { value: PhotoPhase; label: string }[] = [
  { value: "before", label: "Avant" },
  { value: "during", label: "Pendant" },
  { value: "after", label: "Après" },
  { value: "issue", label: "Problème" },
];

export default function ProjectReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const projects = useLiveProjects();
  const photos = useLiveProjectPhotos(id);

  if (projects === undefined || photos === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  if (photos.length === 0) {
    return (
      <Screen scroll>
        <EmptyState
          icon="images-outline"
          title="Aucune photo"
          description="Ajoutez des photos au journal avant de créer un rapport."
          actionLabel="Retour au journal"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const project = projects.find((item) => item.id === id);

  return (
    <ReportForm
      key={id}
      projectId={id}
      projectName={project?.name ?? "Projet"}
      photos={photos}
    />
  );
}

function ReportForm({
  projectId,
  projectName,
  photos,
}: {
  projectId: string;
  projectName: string;
  photos: ProjectPhoto[];
}) {
  const router = useRouter();
  const { markDirty, allowLeave } = useUnsavedChangesGuard();
  const [title, setTitle] = useState(`Rapport de chantier — ${projectName}`);
  const [summary, setSummary] = useState("");
  const [phase, setPhase] = useState<PhotoPhase>("during");
  const [selected, setSelected] = useState(() => new Set(photos.map((photo) => photo.id)));
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  function touch() {
    markDirty();
    setError("");
  }

  function toggle(photoId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
    touch();
  }

  function selectAll() {
    setSelected(new Set(photos.map((photo) => photo.id)));
    touch();
  }

  function clearAll() {
    setSelected(new Set());
    touch();
  }

  async function handleGenerate() {
    if (title.trim().length < 2) {
      setError("Indiquez un titre pour le rapport.");
      return;
    }
    if (selected.size === 0) {
      setError("Sélectionnez au moins une photo.");
      return;
    }

    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      setStage("Création du rapport…");
      const reportId = await api.reports.create({
        projectId,
        title: title.trim(),
        summary,
        phase,
        photoIds: [...selected],
      });
      setStage("Génération du PDF…");
      await shareProjectReportPdf(reportId, title.trim());
      allowLeave();
      router.back();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Impossible de générer le rapport.",
      );
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Rapport de chantier" }} />
      <KeyboardForm
        footer={
          <FormFooter
            submitLabel="Générer et partager le PDF"
            onSubmit={() => void handleGenerate()}
            loading={busy}
            error={error}
          />
        }
      >
        <FormSection
          title="Rapport"
          description="Un PDF professionnel avec les photos sélectionnées."
        >
          <FormField
            label="Titre"
            required
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              touch();
            }}
            placeholder="Rapport de chantier"
          />
          <FormField
            label="Résumé"
            optional
            value={summary}
            onChangeText={(value) => {
              setSummary(value);
              touch();
            }}
            placeholder="Avancement, points à valider, prochaine étape…"
            multiline
            style={styles.multiline}
          />
          <FormChoice
            label="Moment"
            value={phase}
            options={phaseOptions}
            onChange={(value) => {
              setPhase(value as PhotoPhase);
              touch();
            }}
          />
          {busy ? (
            <View style={styles.stage}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stageText}>{stage}</Text>
            </View>
          ) : null}
        </FormSection>

        <FormSection
          title="Photos"
          description={`${selected.size} photo${selected.size === 1 ? "" : "s"} sélectionnée${
            selected.size === 1 ? "" : "s"
          } sur ${photos.length}.`}
        >
          <View style={styles.selectionActions}>
            <Pressable onPress={selectAll} accessibilityRole="button">
              <Text style={styles.selectionAction}>Tout sélectionner</Text>
            </Pressable>
            <Pressable onPress={clearAll} accessibilityRole="button">
              <Text style={styles.selectionAction}>Tout désélectionner</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {photos.map((photo) => {
              const active = selected.has(photo.id);
              return (
                <Pressable
                  key={photo.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() => toggle(photo.id)}
                  style={({ pressed }) => [styles.photo, pressed && styles.pressed]}
                >
                  <View style={styles.imageWrap}>
                    {photo.thumbnailUrl || photo.url ? (
                      <Image
                        source={{ uri: photo.thumbnailUrl ?? photo.url ?? "" }}
                        style={styles.image}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.imageFallback}>
                        <Ionicons name="image-outline" size={20} color={colors.mutedSoft} />
                      </View>
                    )}
                    <View style={[styles.check, active && styles.checkActive]}>
                      {active ? (
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.caption} numberOfLines={1}>
                    {photo.caption || photo.room}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormSection>
      </KeyboardForm>
    </>
  );
}

const styles = StyleSheet.create({
  multiline: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: "top",
    lineHeight: 21,
  },
  stage: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stageText: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  selectionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  selectionAction: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.primary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  photo: {
    flexBasis: "31%",
    flexGrow: 1,
    gap: spacing.xs,
  },
  imageWrap: {
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    height: "100%",
    width: "100%",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    position: "absolute",
    top: 6,
    right: 6,
    height: 22,
    width: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: "rgba(11, 34, 57, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  caption: {
    fontSize: fontSize.caption,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.65,
  },
});
