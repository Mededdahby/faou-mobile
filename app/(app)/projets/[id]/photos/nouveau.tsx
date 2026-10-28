import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from "react-native";
import type { PhotoPhase } from "@/api/types";
import { Chip } from "@/components/domain/DetailKit";
import { DateField } from "@/components/form/DateField";
import {
  FormChoice,
  FormField,
  FormFooter,
  FormSection,
  KeyboardForm,
} from "@/components/form/KeyboardForm";
import { PrimaryButton } from "@/components/ui";
import type { FieldInputRef } from "@/components/ui/Field";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { uploadProjectPhoto } from "@/lib/photoUpload";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const roomSuggestions = ["Cuisine", "Salon", "Chambre", "Salle de bain", "Entrée", "Terrasse"];

const phaseOptions: { value: PhotoPhase; label: string }[] = [
  { value: "before", label: "Avant" },
  { value: "during", label: "Pendant" },
  { value: "after", label: "Après" },
  { value: "issue", label: "Problème" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewProjectPhotoScreen() {
  const { id, uri, width } = useLocalSearchParams<{
    id?: string;
    uri?: string;
    width?: string;
    height?: string;
    mimeType?: string;
  }>();
  const router = useRouter();
  const { markDirty, allowLeave } = useUnsavedChangesGuard();

  const [caption, setCaption] = useState("");
  const [room, setRoom] = useState("");
  const [phase, setPhase] = useState<PhotoPhase>("during");
  const [tags, setTags] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [takenAt, setTakenAt] = useState(today());
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  const captionRef = useRef<FieldInputRef>(null);
  const roomRef = useRef<FieldInputRef>(null);
  const tagsRef = useRef<FieldInputRef>(null);
  const measurementsRef = useRef<FieldInputRef>(null);

  function touch() {
    markDirty();
    setError("");
  }

  async function handleSave() {
    if (!id || !uri) {
      setError("La photo sélectionnée est introuvable.");
      return;
    }
    if (!room.trim()) {
      setError("Indiquez la pièce concernée.");
      roomRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      await uploadProjectPhoto({
        projectId: id,
        sourceUri: uri,
        width: Number(width) || 0,
        caption,
        room: room.trim(),
        phase,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        measurements: measurements.trim() || undefined,
        takenAt: takenAt || undefined,
        onStage: setStage,
      });
      allowLeave();
      router.back();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Impossible d’ajouter la photo.",
      );
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  if (!id || !uri) {
    return (
      <View style={styles.missing}>
        <Ionicons name="image-outline" size={28} color={colors.mutedSoft} />
        <Text style={styles.missingTitle}>Photo introuvable</Text>
        <Text style={styles.missingText}>
          Revenez au journal photo et sélectionnez une nouvelle image.
        </Text>
        <PrimaryButton label="Retour" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nouvelle photo" }} />
      <KeyboardForm
        footer={
          <FormFooter
            submitLabel="Ajouter la photo"
            onSubmit={() => void handleSave()}
            loading={busy}
            error={error}
          />
        }
      >
        <FormSection
          title="Photo"
          description="Vérifiez l’image, puis ajoutez la pièce et le moment du chantier."
        >
          <View style={styles.preview}>
            <Image source={{ uri }} style={styles.previewImage} contentFit="cover" />
          </View>
          {busy ? (
            <View style={styles.stage}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stageText}>{stage || "Envoi en cours…"}</Text>
            </View>
          ) : null}
        </FormSection>

        <FormSection
          title="Détails"
          description="La pièce est requise. Les autres informations sont optionnelles."
        >
          <FormField
            label="Légende"
            optional
            inputRef={captionRef}
            value={caption}
            onChangeText={(value) => {
              setCaption(value);
              touch();
            }}
            placeholder="Vue de la cuisine après pose"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => roomRef.current?.focus()}
          />
          <View style={styles.roomField}>
            <FormField
              label="Pièce"
              required
              inputRef={roomRef}
              value={room}
              onChangeText={(value) => {
                setRoom(value);
                touch();
              }}
              placeholder="Cuisine, salon, chambre…"
              autoCapitalize="words"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => tagsRef.current?.focus()}
            />
            <View style={styles.roomChips}>
              {roomSuggestions.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  active={room === suggestion}
                  onPress={() => {
                    setRoom(suggestion);
                    touch();
                  }}
                />
              ))}
            </View>
          </View>
          <FormChoice
            label="Moment"
            value={phase}
            options={phaseOptions}
            onChange={(value) => {
              setPhase(value as PhotoPhase);
              touch();
            }}
          />
          <FormField
            label="Tags"
            optional
            inputRef={tagsRef}
            value={tags}
            onChangeText={(value) => {
              setTags(value);
              touch();
            }}
            placeholder="plan de travail, façades, éclairage…"
            hint="Séparez les tags par des virgules."
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => measurementsRef.current?.focus()}
          />
          <FormField
            label="Mesures / remarques"
            optional
            inputRef={measurementsRef}
            value={measurements}
            onChangeText={(value) => {
              setMeasurements(value);
              touch();
            }}
            placeholder="Mur 320 × 240 cm, rayure sur le plan…"
            multiline
            style={styles.multiline}
          />
          <DateField
            label="Date de la photo"
            optional
            allowClear
            value={takenAt}
            onChange={(value) => {
              setTakenAt(value ?? "");
              touch();
            }}
            placeholder="Choisir une date"
            title="Date de la photo"
          />
        </FormSection>
      </KeyboardForm>
    </>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  missingTitle: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.ink,
  },
  missingText: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  preview: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 4 / 3,
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
  roomField: {
    gap: spacing.sm,
  },
  roomChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  multiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top",
    lineHeight: 21,
  },
});
