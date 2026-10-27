import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, IconButton, Screen, SearchBar, Skeleton } from "@/components/ui";
import { Chip, PageHeader } from "@/components/domain/DetailKit";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { useLiveProjects } from "@/convex/hooks";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const filters = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "completed", label: "Terminés" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

export default function ProjetsScreen() {
  const router = useRouter();
  const projects = useLiveProjects();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const activeCount = (projects ?? []).filter(
    (project) => project.status !== "completed" && project.status !== "cancelled",
  ).length;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (projects ?? []).filter((project) => {
      if (filter === "active" && (project.status === "completed" || project.status === "cancelled")) {
        return false;
      }
      if (filter === "completed" && project.status !== "completed") return false;
      if (!query) return true;
      return [project.name, project.clientName, project.city]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [projects, filter, search]);

  return (
    <Screen scroll>
      <PageHeader
        title="Projets"
        subtitle={`${activeCount} chantier${activeCount === 1 ? "" : "s"} en cours sur ${
          (projects ?? []).length
        } au total`}
        right={
          <IconButton
            icon="add"
            label="Nouveau projet"
            dark
            onPress={() => router.push("/projets/editeur")}
          />
        }
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Projet, client ou ville…"
      />

      <View style={styles.filters}>
        {filters.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>

      {projects === undefined ? (
        <View style={styles.list}>
          {[0, 1].map((index) => (
            <Card key={index} style={styles.skeletonCard}>
              <Skeleton height={158} radius={radius.md} />
              <View style={styles.skeletonBody}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="80%" height={8} />
                <Skeleton width="40%" height={10} />
              </View>
            </Card>
          ))}
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="briefcase-outline"
            title="Aucun projet"
            description={
              search
                ? "Aucun projet ne correspond à cette recherche."
                : "Créez un projet pour suivre son avancement et ses échéances."
            }
            actionLabel={search ? "Effacer la recherche" : "Créer un projet"}
            onAction={
              search ? () => setSearch("") : () => router.push("/projets/editeur")
            }
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onPress={() => router.push(`/projets/${project.id}`)}
            />
          ))}
        </View>
      )}

      {projects && projects.length > 0 ? (
        <Text style={styles.footerHint}>
          {visible.length} projet{visible.length === 1 ? "" : "s"} affiché
          {visible.length === 1 ? "" : "s"}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  skeletonCard: {
    padding: 0,
    overflow: "hidden",
    gap: 0,
  },
  skeletonBody: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  footerHint: {
    marginTop: spacing.lg,
    textAlign: "center",
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
});
