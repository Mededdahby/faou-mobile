import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Keyboard, StyleSheet } from "react-native";
import type { TaskPriority, TaskStatus } from "@/api/types";
import { api } from "@/api/endpoints";
import { ErrorBlock, LoadingBlock } from "@/components/domain/DetailKit";
import { DateField } from "@/components/form/DateField";
import {
  FormChoice,
  FormField,
  FormFooter,
  FormSection,
  KeyboardForm,
} from "@/components/form/KeyboardForm";
import { SelectField } from "@/components/form/SelectField";
import { Screen } from "@/components/ui";
import type { FieldInputRef } from "@/components/ui/Field";
import {
  useLiveProjectTasks,
  useLiveProjects,
  useLiveTeamMembers,
} from "@/convex/hooks";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { spacing } from "@/theme/tokens";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "blocked", label: "Bloquée" },
  { value: "done", label: "Terminé" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
];

export default function TaskEditorScreen() {
  const { id, taskId } = useLocalSearchParams<{ id: string; taskId?: string }>();
  const projects = useLiveProjects();
  const tasks = useLiveProjectTasks(id);
  const teams = useLiveTeamMembers(true);

  if (taskId && tasks === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  const task = taskId ? tasks?.find((item) => item.id === taskId) : undefined;

  if (taskId && !task) {
    return (
      <Screen>
        <ErrorBlock message="Cette tâche n'existe plus." />
      </Screen>
    );
  }

  return (
    <TaskForm
      key={taskId ?? "new"}
      projectId={id}
      taskId={taskId}
      projectName={projects?.find((item) => item.id === id)?.name}
      initial={{
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? "todo",
        priority: task?.priority ?? "normal",
        assigneeId: task?.assigneeId ?? "",
        dueDate: task?.dueDate ?? "",
      }}
      teamOptions={(teams ?? []).map((member) => ({
        id: member.id,
        label: member.name,
        subtitle: [member.role, member.phone].filter(Boolean).join(" · "),
      }))}
    />
  );
}

function TaskForm({
  projectId,
  taskId,
  projectName,
  initial,
  teamOptions,
}: {
  projectId: string;
  taskId?: string;
  projectName?: string;
  initial: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  };
  teamOptions: { id: string; label: string; subtitle?: string }[];
}) {
  const router = useRouter();
  const { markDirty, allowLeave } = useUnsavedChangesGuard();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState<TaskStatus>(initial.status);
  const [priority, setPriority] = useState<TaskPriority>(initial.priority);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const titleRef = useRef<FieldInputRef>(null);
  const descriptionRef = useRef<FieldInputRef>(null);

  function touch() {
    markDirty();
    setError("");
  }

  async function handleSave() {
    if (title.trim().length < 2) {
      setError("Indiquez un titre pour la tâche.");
      titleRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      if (taskId) {
        await api.tasks.update({
          id: taskId,
          title: title.trim(),
          description,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
        });
      } else {
        await api.tasks.create({
          projectId,
          title: title.trim(),
          description,
          status,
          priority,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
        });
      }
      allowLeave();
      router.back();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Enregistrement impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: taskId ? "Modifier la tâche" : "Nouvelle tâche" }} />
      <KeyboardForm
        footer={
          <FormFooter
            submitLabel={taskId ? "Enregistrer la tâche" : "Créer la tâche"}
            onSubmit={() => void handleSave()}
            loading={busy}
            error={error}
          />
        }
      >
        <FormSection
          title="Tâche"
          description={projectName ? `Chantier : ${projectName}` : undefined}
        >
          <FormField
            label="Titre"
            required
            inputRef={titleRef}
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              touch();
            }}
            placeholder="Poser les poignées, reprendre la crédence…"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
          <FormField
            label="Description"
            optional
            inputRef={descriptionRef}
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              touch();
            }}
            placeholder="Détails, matériaux, points à vérifier…"
            multiline
            style={styles.multiline}
          />
        </FormSection>

        <FormSection title="Organisation" description="Statut, priorité, responsable et échéance.">
          <FormChoice
            label="Statut"
            value={status}
            options={statusOptions}
            onChange={(value) => {
              setStatus(value as TaskStatus);
              touch();
            }}
          />
          <FormChoice
            label="Priorité"
            value={priority}
            options={priorityOptions}
            onChange={(value) => {
              setPriority(value as TaskPriority);
              touch();
            }}
          />
          <SelectField
            label="Responsable"
            value={assigneeId || null}
            options={teamOptions}
            onChange={(value) => {
              setAssigneeId(value ?? "");
              touch();
            }}
            placeholder="Non assigné"
            title="Choisir un responsable"
            hint={
              teamOptions.length > 0
                ? "La recherche filtre par nom, rôle ou téléphone."
                : "Ajoutez des membres dans Plus → Équipe pour assigner les tâches."
            }
            allowClear
          />
          <DateField
            label="Échéance"
            optional
            allowClear
            value={dueDate}
            onChange={(value) => {
              setDueDate(value ?? "");
              touch();
            }}
            placeholder="Choisir une date"
            title="Échéance de la tâche"
          />
        </FormSection>
      </KeyboardForm>
    </>
  );
}

const styles = StyleSheet.create({
  multiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top",
    lineHeight: 21,
  },
});
