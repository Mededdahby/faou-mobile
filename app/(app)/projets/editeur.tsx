import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Project, ProjectPriority, ProjectStatus } from "@/api/types";
import {
  Chip,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from "@/components/domain/DetailKit";
import { Card, Field, PrimaryButton, Screen } from "@/components/ui";
import { useLiveClients, useLiveProjects } from "@/convex/hooks";
import { useCreateProject, useUpdateProject } from "@/hooks/queries";
import { colors, fontSize, spacing } from "@/theme/tokens";

const projectTypes = [
  { value: "cuisine", label: "Cuisine" },
  { value: "dressing", label: "Dressing" },
  { value: "placard", label: "Placard" },
  { value: "other", label: "Autre" },
];

const projectStatuses: { value: ProjectStatus; label: string }[] = [
  { value: "lead", label: "Prospect" },
  { value: "design", label: "Conception" },
  { value: "production", label: "Fabrication" },
  { value: "installation", label: "Installation" },
  { value: "completed", label: "Terminé" },
  { value: "on_hold", label: "En pause" },
  { value: "cancelled", label: "Annulé" },
];

const priorities: { value: ProjectPriority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
];

interface FormState {
  name: string;
  clientId: string;
  clientName: string;
  type: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  dueDate: string;
  budget: string;
  notes: string;
  address: string;
  city: string;
}

const emptyForm: FormState = {
  name: "",
  clientId: "",
  clientName: "",
  type: "cuisine",
  status: "lead",
  priority: "normal",
  startDate: "",
  dueDate: "",
  budget: "",
  notes: "",
  address: "",
  city: "",
};

function budgetToCents(value: string) {
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

function centsToInput(cents: number) {
  return cents > 0 ? String(cents / 100) : "";
}

function isDate(value: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function initialFromProject(project: Project): FormState {
  return {
    name: project.name,
    clientId: project.clientId ?? "",
    clientName: project.clientName,
    type: project.type || "cuisine",
    status: project.status,
    priority: project.priority,
    startDate: project.startDate ?? "",
    dueDate: project.dueDate ?? "",
    budget: centsToInput(project.budgetCents),
    notes: project.notes,
    address: project.address,
    city: project.city,
  };
}

export default function ProjectEditorScreen() {
  const { id, clientId } = useLocalSearchParams<{ id?: string; clientId?: string }>();
  const projects = useLiveProjects();
  const clients = useLiveClients();

  if (id && projects === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  const project = id ? projects?.find((item) => item.id === id) : undefined;

  if (id && !project) {
    return (
      <Screen>
        <ErrorBlock message="Ce projet n'existe plus." />
      </Screen>
    );
  }

  if (!id && clientId && clients === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  const client = !id && clientId ? clients?.find((item) => item.id === clientId) : undefined;

  const initial: FormState = project
    ? initialFromProject(project)
    : client
      ? {
          ...emptyForm,
          clientId: client.id,
          clientName: client.name,
          city: client.city,
          address: client.address,
        }
      : emptyForm;

  return <ProjectForm key={id ?? clientId ?? "new"} id={id} initial={initial} />;
}

function ProjectForm({ id, initial }: { id?: string; initial: FormState }) {
  const router = useRouter();
  const clients = useLiveClients();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setError("");
    if (form.name.trim().length < 2) {
      setError("Le nom du projet est requis.");
      return;
    }
    if (!isDate(form.startDate) || !isDate(form.dueDate)) {
      setError("Les dates doivent respecter le format AAAA-MM-JJ.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      clientId: form.clientId || undefined,
      clientName: form.clientName.trim() || form.name.trim(),
      type: form.type,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate || undefined,
      dueDate: form.dueDate || undefined,
      budgetCents: budgetToCents(form.budget),
      notes: form.notes,
      address: form.address,
      city: form.city,
    };

    try {
      if (id) {
        await updateProject.mutateAsync({ id, ...payload });
        router.back();
      } else {
        const result = await createProject.mutateAsync(payload);
        if (result.id) {
          router.replace(`/projets/${result.id}`);
        } else {
          router.back();
        }
      }
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Enregistrement impossible.",
      );
    }
  }

  return (
    <Screen scroll>
      <PageHeader
        title={id ? "Modifier le projet" : "Nouveau projet"}
        subtitle="Suivez le chantier du prospect à l'installation."
      />

      <Card style={styles.card}>
        <Field
          label="Nom du projet"
          value={form.name}
          onChangeText={(value) => update("name", value)}
          placeholder="Cuisine — Nom du client"
        />

        <View style={styles.block}>
          <Text style={styles.label}>Client</Text>
          <View style={styles.chips}>
            <Chip
              label="Sans client"
              active={!form.clientId}
              onPress={() =>
                setForm((current) => ({ ...current, clientId: "", clientName: "" }))
              }
            />
            {(clients ?? []).map((client) => (
              <Chip
                key={client.id}
                label={client.name}
                active={form.clientId === client.id}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    clientId: client.id,
                    clientName: client.name,
                    city: current.city || client.city,
                    address: current.address || client.address,
                  }))
                }
              />
            ))}
          </View>
          <Field
            label="Nom affiché du client"
            value={form.clientName}
            onChangeText={(value) => update("clientName", value)}
            placeholder="Nom du client"
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chips}>
            {projectTypes.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                active={form.type === item.value}
                onPress={() => update("type", item.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Statut</Text>
          <View style={styles.chips}>
            {projectStatuses.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                active={form.status === item.value}
                onPress={() => update("status", item.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Priorité</Text>
          <View style={styles.chips}>
            {priorities.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                active={form.priority === item.value}
                onPress={() => update("priority", item.value)}
              />
            ))}
          </View>
        </View>

        <Field
          label="Budget (MAD)"
          value={form.budget}
          onChangeText={(value) => update("budget", value)}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Field
          label="Date de début"
          value={form.startDate}
          onChangeText={(value) => update("startDate", value)}
          placeholder="AAAA-MM-JJ"
        />
        <Field
          label="Date d'échéance"
          value={form.dueDate}
          onChangeText={(value) => update("dueDate", value)}
          placeholder="AAAA-MM-JJ"
        />
        <Field
          label="Ville"
          value={form.city}
          onChangeText={(value) => update("city", value)}
          placeholder="Casablanca"
        />
        <Field
          label="Adresse du chantier"
          value={form.address}
          onChangeText={(value) => update("address", value)}
          placeholder="Rue, quartier, numéro"
        />
        <Field
          label="Notes"
          value={form.notes}
          onChangeText={(value) => update("notes", value)}
          placeholder="Détails, matériaux, contraintes…"
          multiline
          style={styles.notes}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={id ? "Enregistrer les modifications" : "Créer le projet"}
          onPress={() => void handleSave()}
          loading={createProject.isPending || updateProject.isPending}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  block: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  notes: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  error: {
    fontSize: fontSize.small,
    color: colors.danger,
  },
});
