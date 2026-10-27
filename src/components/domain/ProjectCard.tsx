import { Ionicons } from "@expo/vector-icons";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import type { Project } from "@/api/types";
import { PressableScale } from "@/components/ui/PressableScale";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateShort, formatMoneyShort } from "@/lib/format";
import { projectImage, projectTypeLabel } from "@/lib/projectImages";
import { getProjectStatus } from "@/lib/status";
import { colors, fontSize, radius, shadows, spacing } from "@/theme/tokens";

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
  onPress: () => void;
}

export function ProjectCard({ project, featured = false, onPress }: ProjectCardProps) {
  const status = getProjectStatus(project.status);

  return (
    <PressableScale onPress={onPress} accessibilityLabel={`Ouvrir le projet ${project.name}`}>
      <View style={styles.card}>
        <ImageBackground
          source={{ uri: projectImage(project.type) }}
          style={[styles.cover, featured && styles.coverFeatured]}
          imageStyle={styles.image}
        >
          <View style={styles.scrim} />
          <View style={styles.coverTop}>
            <StatusPill label={status.label} tone={status.tone} />
            <View style={styles.category}>
              <Text style={styles.categoryLabel}>{projectTypeLabel(project.type)}</Text>
            </View>
          </View>
          <View style={styles.coverBottom}>
            <Text
              style={[styles.name, featured && styles.nameFeatured]}
              numberOfLines={2}
            >
              {project.name}
            </Text>
            <Text style={styles.client} numberOfLines={1}>
              {project.clientName || "Sans client"}
              {project.city ? ` · ${project.city}` : ""}
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Avancement</Text>
            <Text style={styles.progressValue}>{status.progress}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${status.progress}%` }]} />
          </View>
          <View style={styles.metaRow}>
            <View style={styles.meta}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedSoft} />
              <Text style={styles.metaText}>
                {project.dueDate ? formatDateShort(project.dueDate) : "Sans échéance"}
              </Text>
            </View>
            <View style={styles.meta}>
              <Ionicons name="wallet-outline" size={14} color={colors.mutedSoft} />
              <Text style={styles.metaText}>{formatMoneyShort(project.budgetCents)}</Text>
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  cover: {
    height: 158,
    justifyContent: "space-between",
    backgroundColor: colors.inkSoft,
  },
  coverFeatured: {
    height: 208,
  },
  image: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(11, 34, 57, 0.32)",
  },
  coverTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.md,
    gap: spacing.sm,
  },
  category: {
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  categoryLabel: {
    fontSize: fontSize.micro,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.ink,
  },
  coverBottom: {
    padding: spacing.lg,
    gap: 2,
  },
  name: {
    fontSize: fontSize.title + 1,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.white,
  },
  nameFeatured: {
    fontSize: fontSize.heading + 2,
    letterSpacing: -0.6,
  },
  client: {
    fontSize: fontSize.small,
    color: "rgba(255, 255, 255, 0.86)",
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "500",
    color: colors.muted,
  },
  progressValue: {
    fontSize: fontSize.caption + 1,
    fontWeight: "700",
    color: colors.ink,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: fontSize.caption + 1,
    fontWeight: "500",
    color: colors.muted,
  },
});
