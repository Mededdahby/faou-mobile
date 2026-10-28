import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ProjectTask, TaskPriority, TaskStatus } from "@/api/types";
import { api } from "@/api/endpoints";
import { Chip } from "@/components/domain/DetailKit";
import { Avatar, Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import { useLiveProjectTasks, useLiveProjects } from "@/convex/hooks";
import { formatDate } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const statusMeta: Record<TaskStatus, { label: string; tone: "slate" | "blue" | "green" | "red" }> = {
  todo: { label: "À faire", tone: "slate" },
  in_progress: { label: "En cours", tone: "blue" },
  blocked: { label: "Bloquée", tone: "red" },
  done: { label: "Terminé", tone: "green" },
};

const priorityMeta: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Basse", color: colors.mutedSoft },
  normal: { label: "Normale", color: colors.accent },
  high: { label: "Haute", color: colors.danger },
};

const filters = [
  { key: "all", label: "Toutes" },
  { key: "todo", label: "À faire" },
  { key: "in_progress", label: "En cours" },
  { key: "blocked", label: "Bloquée" },
  { key: "done", label: "Terminé" },
  { key: "overdue", label: "En retard" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(task: ProjectTask) {
  return Boolean(task.dueDate && task.dueDate < today() && task.status !== "done");
}

export default function ProjectTasksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const projects = useLiveProjects();
  const tasks = useLiveProjectTasks(id);
  const project = projects?.find((item) => item.id === id);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base = { all: tasks?.length ?? 0, todo: 0, in_progress: 0, blocked: 0, done: 0, overdue: 0 };
    for (const task of tasks ?? []) {
      base[task.status] += 1;
      if (isOverdue(task)) base.overdue += 1;
    }
    return base;
  }, [tasks]);

  const visible = useMemo(() => {
    return (tasks ?? []).filter((task) => {
      if (filter === "all") return true;
      if (filter === "overdue") return isOverdue(task);
      return task.status === filter;
    });
  }, [filter, tasks]);

  const doneCount = counts.done;
  const openCount = (tasks?.length ?? 0) - doneCount;
  const progress = (tasks?.length ?? 0) > 0 ? Math.round((doneCount / (tasks?.length ?? 0)) * 100) : 0;

  async function toggleTask(task: ProjectTask) {
    setBusyId(task.id);
    try {
      await api.tasks.update({
        id: task.id,
        status: task.status === "done" ? "todo" : "done",
      });
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Mise à jour impossible.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(task: ProjectTask) {
    Alert.alert("Supprimer la tâche", `« ${task.title} » sera supprimée.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await api.tasks.remove(task.id);
          } catch (error) {
            Alert.alert(
              "Erreur",
              error instanceof Error ? error.message : "Suppression impossible.",
            );
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tâches du chantier</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {project?.name ?? "Projet"} · {openCount} à faire
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/projets/${id}/tasks/editeur`)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={17} color={colors.white} />
          <Text style={styles.addLabel}>Nouvelle</Text>
        </Pressable>
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.progressValue}>{openCount}</Text>
            <Text style={styles.progressLabel}>tâche{openCount === 1 ? "" : "s"} ouverte{openCount === 1 ? "" : "s"}</Text>
          </View>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressHint}>
          {doneCount} terminée{doneCount === 1 ? "" : "s"} sur {tasks?.length ?? 0}
        </Text>
      </Card>

      <View style={styles.filters}>
        {filters.map((item) => (
          <Chip
            key={item.key}
            label={`${item.label} ${counts[item.key]}`}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>

      {tasks === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="checkbox-outline"
            title="Aucune tâche"
            description={
              filter === "all"
                ? "Ajoutez des tâches pour suivre le chantier et les finitions."
                : "Aucune tâche ne correspond à ce filtre."
            }
            actionLabel="Créer une tâche"
            onAction={() => router.push(`/projets/${id}/tasks/editeur`)}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((task) => {
            const status = statusMeta[task.status];
            const priority = priorityMeta[task.priority];
            const overdue = isOverdue(task);
            const busy = busyId === task.id;
            return (
              <Card key={task.id} style={styles.card}>
                <View style={styles.taskRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: task.status === "done" }}
                    onPress={() => void toggleTask(task)}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.checkbox,
                      task.status === "done" && styles.checkboxDone,
                      pressed && styles.pressed,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : task.status === "done" ? (
                      <Ionicons name="checkmark" size={15} color={colors.white} />
                    ) : null}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push(`/projets/${id}/tasks/editeur?taskId=${task.id}`)
                    }
                    style={styles.taskBody}
                  >
                    <Text
                      style={[styles.taskTitle, task.status === "done" && styles.taskDone]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>
                    {task.description ? (
                      <Text style={styles.taskDescription} numberOfLines={1}>
                        {task.description}
                      </Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <View style={styles.assignee}>
                        <Avatar name={task.assigneeName ?? "?"} size={20} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {task.assigneeName ?? "Non assigné"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
                        <Text style={styles.metaText}>{priority.label}</Text>
                      </View>
                      {task.dueDate ? (
                        <View style={styles.metaItem}>
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={overdue ? colors.danger : colors.mutedSoft}
                          />
                          <Text style={[styles.metaText, overdue && styles.overdue]}>
                            {formatDate(task.dueDate)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>

                  <View style={styles.taskRight}>
                    <StatusPill label={status.label} tone={status.tone} dot={false} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer la tâche"
                      onPress={() => confirmDelete(task)}
                      hitSlop={6}
                      style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
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
    gap: 4,
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
  progressCard: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  progressValue: {
    fontSize: fontSize.display,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
    lineHeight: 34,
  },
  progressLabel: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  progressPercent: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
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
    backgroundColor: colors.success,
  },
  progressHint: {
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  checkbox: {
    height: 26,
    width: 26,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskBody: {
    flex: 1,
    gap: 3,
  },
  taskTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  taskDone: {
    textDecorationLine: "line-through",
    color: colors.mutedSoft,
  },
  taskDescription: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  assignee: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.muted,
  },
  priorityDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  overdue: {
    color: colors.danger,
    fontWeight: "600",
  },
  taskRight: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  delete: {
    height: 26,
    width: 26,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
  },
  pressed: {
    opacity: 0.6,
  },
});
