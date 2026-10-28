import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PhotoPhase, ProjectPhoto } from "@/api/types";
import { api } from "@/api/endpoints";
import { Chip } from "@/components/domain/DetailKit";
import { EmptyState, Skeleton } from "@/components/ui";
import { useLiveProjectPhotos, useLiveProjects } from "@/convex/hooks";
import { pickImage } from "@/lib/photoUpload";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const phases: { value: PhotoPhase; label: string; tone: string }[] = [
  { value: "before", label: "Avant", tone: "#64748B" },
  { value: "during", label: "Pendant", tone: "#0F6B84" },
  { value: "after", label: "Après", tone: "#2F7D5D" },
  { value: "issue", label: "Problème", tone: "#B23A3A" },
];

const phaseLabels = Object.fromEntries(
  phases.map((phase) => [phase.value, phase]),
) as Record<PhotoPhase, (typeof phases)[number]>;

export default function ProjectPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const projects = useLiveProjects();
  const photos = useLiveProjectPhotos(id);
  const project = projects?.find((item) => item.id === id);

  const [phase, setPhase] = useState<PhotoPhase | "all">("all");
  const [room, setRoom] = useState<string>("all");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<ProjectPhoto | null>(null);

  const rooms = useMemo(() => {
    const values = new Set((photos ?? []).map((photo) => photo.room).filter(Boolean));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [photos]);

  const visible = useMemo(() => {
    return (photos ?? []).filter(
      (photo) =>
        (phase === "all" || photo.phase === phase) &&
        (room === "all" || photo.room === room),
    );
  }, [phase, photos, room]);

  const counts = useMemo(() => {
    const base = { all: photos?.length ?? 0, before: 0, during: 0, after: 0, issue: 0 };
    for (const photo of photos ?? []) base[photo.phase] += 1;
    return base;
  }, [photos]);

  const cardWidth = (width - spacing.lg * 2 - spacing.md) / 2;

  async function chooseSource(source: "camera" | "library") {
    setSourceOpen(false);
    setPicking(true);
    try {
      const image = await pickImage(source);
      if (!image) return;
      router.push({
        pathname: "/projets/[id]/photos/nouveau",
        params: {
          id,
          uri: image.uri,
          width: String(image.width),
          height: String(image.height),
          mimeType: image.mimeType,
        },
      });
    } catch (error) {
      Alert.alert(
        "Ajouter une photo",
        error instanceof Error ? error.message : "Impossible d’ouvrir la caméra.",
      );
    } finally {
      setPicking(false);
    }
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + 88 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Journal photo</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {project?.name ?? "Projet"} · {counts.all} photo
                  {counts.all === 1 ? "" : "s"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSourceOpen(true)}
                disabled={picking}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <Ionicons name="camera-outline" size={16} color={colors.white} />
                <Text style={styles.addLabel}>Ajouter</Text>
              </Pressable>
            </View>

            <View style={styles.filters}>
              <Chip
                label={`Toutes ${counts.all}`}
                active={phase === "all"}
                onPress={() => setPhase("all")}
              />
              {phases.map((item) => (
                <Chip
                  key={item.value}
                  label={`${item.label} ${counts[item.value]}`}
                  active={phase === item.value}
                  onPress={() => setPhase(item.value)}
                />
              ))}
            </View>

            {rooms.length > 1 ? (
              <View style={styles.rooms}>
                <Chip
                  label="Toutes les pièces"
                  active={room === "all"}
                  onPress={() => setRoom("all")}
                />
                {rooms.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    active={room === item}
                    onPress={() => setRoom(item)}
                  />
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={!photos || photos.length === 0}
              onPress={() => router.push(`/projets/${id}/photos/rapport`)}
              style={({ pressed }) => [
                styles.reportButton,
                (!photos || photos.length === 0) && styles.reportDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="document-text-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.reportLabel}>Créer un rapport de chantier</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.primaryDark} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          photos === undefined ? (
            <View style={styles.skeletonGrid}>
              {[0, 1, 2, 3].map((index) => (
                <Skeleton
                  key={index}
                  width={cardWidth}
                  height={cardWidth + 52}
                  radius={radius.lg}
                />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <EmptyState
                icon="images-outline"
                title="Aucune photo"
                description={
                  phase === "all" && room === "all"
                    ? "Ajoutez des photos avant, pendant et après le chantier."
                    : "Aucune photo ne correspond à ce filtre."
                }
                actionLabel="Ajouter une photo"
                onAction={() => setSourceOpen(true)}
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir la photo ${item.caption || item.room}`}
            onPress={() => setSelected(item)}
            style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
          >
            <View style={styles.imageWrap}>
              {item.thumbnailUrl || item.url ? (
                <Image
                  source={{ uri: item.thumbnailUrl ?? item.url ?? "" }}
                  style={styles.image}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={styles.imageFallback}>
                  <Ionicons name="image-outline" size={24} color={colors.mutedSoft} />
                </View>
              )}
              <View
                style={[
                  styles.phaseBadge,
                  { backgroundColor: phaseLabels[item.phase]?.tone ?? colors.ink },
                ]}
              >
                <Text style={styles.phaseLabel}>
                  {phaseLabels[item.phase]?.label ?? item.phase}
                </Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.caption} numberOfLines={1}>
                {item.caption || "Sans légende"}
              </Text>
              <Text style={styles.room} numberOfLines={1}>
                {item.room}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter une photo"
        onPress={() => setSourceOpen(true)}
        style={[
          styles.fab,
          { bottom: Math.max(insets.bottom, spacing.lg) + 16 },
          picking && styles.fabDisabled,
        ]}
        disabled={picking}
      >
        {picking ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Ionicons name="add" size={26} color={colors.white} />
        )}
      </Pressable>

      <PhotoSourceSheet
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onSelect={chooseSource}
      />

      <PhotoViewer
        photo={selected}
        onClose={() => setSelected(null)}
        onDeleted={() => setSelected(null)}
      />
    </View>
  );
}

function PhotoSourceSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: "camera" | "library") => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.overlay} />
        <View style={styles.sourceSheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Ajouter une photo</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSelect("camera")}
            style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}
          >
            <View style={styles.sourceIcon}>
              <Ionicons name="camera-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.sourceText}>
              <Text style={styles.sourceTitle}>Prendre une photo</Text>
              <Text style={styles.sourceSubtitle}>Ouvrir l’appareil photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSelect("library")}
            style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}
          >
            <View style={styles.sourceIcon}>
              <Ionicons name="images-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.sourceText}>
              <Text style={styles.sourceTitle}>Choisir dans la galerie</Text>
              <Text style={styles.sourceSubtitle}>Sélectionner une photo existante</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text style={styles.cancelLabel}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PhotoViewer({
  photo,
  onClose,
  onDeleted,
}: {
  photo: ProjectPhoto | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [deleting, setDeleting] = useState(false);

  if (!photo) return null;
  const target = photo;

  function confirmDelete() {
    Alert.alert("Supprimer la photo", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await api.photos.remove(target.id);
            onDeleted();
          } catch (error) {
            Alert.alert(
              "Erreur",
              error instanceof Error ? error.message : "Suppression impossible.",
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        <View style={[styles.viewerTop, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={onClose}
            style={styles.viewerButton}
          >
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
          <View
            style={[
              styles.phaseBadge,
              { backgroundColor: phaseLabels[photo.phase]?.tone ?? colors.ink },
            ]}
          >
            <Text style={styles.phaseLabel}>
              {phaseLabels[photo.phase]?.label ?? photo.phase}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Supprimer la photo"
            onPress={confirmDelete}
            disabled={deleting}
            style={styles.viewerButton}
          >
            {deleting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.white} />
            )}
          </Pressable>
        </View>

        {photo.url ? (
          <Image source={{ uri: photo.url }} style={styles.viewerImage} contentFit="contain" />
        ) : (
          <View style={styles.viewerImage} />
        )}

        <View style={[styles.viewerInfo, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Text style={styles.viewerCaption}>{photo.caption || "Sans légende"}</Text>
          <Text style={styles.viewerMeta}>
            {[photo.room, photo.takenAt].filter(Boolean).join(" · ")}
          </Text>
          {photo.tags.length > 0 ? (
            <Text style={styles.viewerTags}>{photo.tags.join(" · ")}</Text>
          ) : null}
          {photo.measurements ? (
            <Text style={styles.viewerMeasurements}>{photo.measurements}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  addLabel: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.white,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rooms: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  reportDisabled: {
    opacity: 0.45,
  },
  reportLabel: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  gridRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  imageWrap: {
    aspectRatio: 1,
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
  phaseBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  phaseLabel: {
    fontSize: fontSize.micro,
    fontWeight: "700",
    color: colors.white,
  },
  cardBody: {
    padding: spacing.sm + 2,
    gap: 1,
  },
  caption: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
  },
  room: {
    fontSize: fontSize.micro,
    color: colors.muted,
  },
  empty: {
    paddingVertical: spacing.xl,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    height: 56,
    width: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    shadowColor: "#0B2239",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  fabDisabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.6,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
  },
  sourceSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    height: 4,
    width: 44,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sourceIcon: {
    height: 42,
    width: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  sourceText: {
    flex: 1,
    gap: 1,
  },
  sourceTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  sourceSubtitle: {
    fontSize: fontSize.caption,
    color: colors.muted,
  },
  cancel: {
    marginTop: spacing.sm,
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cancelLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.muted,
  },
  viewer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  viewerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  viewerButton: {
    height: 40,
    width: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  viewerImage: {
    flex: 1,
    width: "100%",
  },
  viewerInfo: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  viewerCaption: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.white,
  },
  viewerMeta: {
    fontSize: fontSize.small,
    color: "rgba(255, 255, 255, 0.7)",
  },
  viewerTags: {
    fontSize: fontSize.caption,
    color: "rgba(255, 255, 255, 0.55)",
  },
  viewerMeasurements: {
    marginTop: spacing.xs,
    fontSize: fontSize.small,
    lineHeight: 19,
    color: "rgba(255, 255, 255, 0.9)",
  },
});
