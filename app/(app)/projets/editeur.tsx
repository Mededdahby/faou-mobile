import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Keyboard, StyleSheet } from "react-native";
import type { Project, ProjectPriority, ProjectStatus } from "@/api/types";
import { ErrorBlock, LoadingBlock } from "@/components/domain/DetailKit";
import {
  FormChoice,
  FormField,
  FormFooter,
  FormSection,
  KeyboardForm,
} from "@/components/form/KeyboardForm";
import { DateField } from "@/components/form/DateField";
import { SelectField } from "@/components/form/SelectField";
import { Screen } from "@/components/ui";
import type { FieldInputRef } from "@/components/ui/Field";
import { useLiveClients, useLiveProjects } from "@/convex/hooks";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useCreateProject, useUpdateProject } from "@/hooks/queries";
import { spacing } from "@/theme/tokens";

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

interface FormErrors {
  name?: string;
  budget?: string;
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
  if (!Number.isFinite(amount) || amount < 0) return Number.NaN;
  return Math.round(amount * 100);
}

function centsToInput(cents: number) {
  return cents > 0 ? String(cents / 100) : "";
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const { markDirty: markFormDirty, allowLeave } = useUnsavedChangesGuard();

  const nameRef = useRef<FieldInputRef>(null);
  const clientNameRef = useRef<FieldInputRef>(null);
  const budgetRef = useRef<FieldInputRef>(null);
  const cityRef = useRef<FieldInputRef>(null);
  const addressRef = useRef<FieldInputRef>(null);
  const notesRef = useRef<FieldInputRef>(null);

  const clientOptions = (clients ?? []).map((client) => ({
    id: client.id,
    label: client.name,
    subtitle: [client.city, client.phone].filter(Boolean).join(" · "),
  }));

  function markDirty() {
    markFormDirty();
    setServerError("");
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    markDirty();
    setForm((current) => ({ ...current, [key]: value }));
    const errorKey: keyof FormErrors | null =
      key === "name" || key === "budget" ? (key as keyof FormErrors) : null;
    if (!errorKey) return;
    setErrors((current) =>
      current[errorKey] ? { ...current, [errorKey]: undefined } : current,
    );
  }

  function selectClient(id: string | null) {
    markDirty();
    if (!id) {
      setForm((current) => ({ ...current, clientId: "" }));
      return;
    }
    const client = clients?.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      clientId: id,
      clientName: client?.name ?? current.clientName,
      city: current.city || client?.city || "",
      address: current.address || client?.address || "",
    }));
  }

  async function handleSave() {
    setServerError("");

    const nextErrors: FormErrors = {};
    if (form.name.trim().length < 2) {
      nextErrors.name = "Indiquez le nom du projet.";
    }
    const budgetCents = form.budget.trim() ? budgetToCents(form.budget) : 0;
    if (Number.isNaN(budgetCents)) {
      nextErrors.budget = "Indiquez un budget valide.";
    }

    setErrors(nextErrors);
    if (nextErrors.name) {
      nameRef.current?.focus();
      return;
    }
    if (nextErrors.budget) {
      budgetRef.current?.focus();
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
      budgetCents,
      notes: form.notes,
      address: form.address,
      city: form.city,
    };

    Keyboard.dismiss();
    try {
      if (id) {
        await updateProject.mutateAsync({ id, ...payload });
        allowLeave();
        router.back();
      } else {
        const result = await createProject.mutateAsync(payload);
        allowLeave();
        if (result.id) {
          router.replace(`/projets/${result.id}`);
        } else {
          router.back();
        }
      }
    } catch (mutationError) {
      setServerError(
        mutationError instanceof Error ? mutationError.message : "Enregistrement impossible.",
      );
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? "Modifier le projet" : "Nouveau projet" }} />
      <KeyboardForm
        footer={
          <FormFooter
            submitLabel={id ? "Enregistrer les modifications" : "Créer le projet"}
            onSubmit={() => void handleSave()}
            loading={createProject.isPending || updateProject.isPending}
            error={serverError}
          />
        }
      >
        <FormSection
          title="Informations"
          description="Le nom et la nature du chantier. Les champs marqués * sont requis."
        >
          <FormField
            label="Nom du projet"
            required
            inputRef={nameRef}
            value={form.name}
            onChangeText={(value) => update("name", value)}
            placeholder="Cuisine — Nom du client"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => clientNameRef.current?.focus()}
            error={errors.name}
          />
          <FormChoice
            label="Type de projet"
            value={form.type}
            options={projectTypes}
            onChange={(value) => update("type", value)}
          />
          <FormChoice
            label="Priorité"
            value={form.priority}
            options={priorities}
            onChange={(value) => update("priority", value as ProjectPriority)}
          />
        </FormSection>

        <FormSection
          title="Client"
          description="Associez le chantier à un client existant, ou saisissez simplement son nom."
        >
          <SelectField
            label="Client associé"
            value={form.clientId || null}
            options={clientOptions}
            onChange={selectClient}
            placeholder="Choisir un client"
            title="Choisir un client"
            hint="La recherche filtre par nom, ville ou téléphone."
            allowClear
          />
          <FormField
            label="Nom affiché du client"
            optional
            inputRef={clientNameRef}
            value={form.clientName}
            onChangeText={(value) => update("clientName", value)}
            placeholder="Nom du client"
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => budgetRef.current?.focus()}
            hint="Utilisé dans les listes et sur les documents."
          />
        </FormSection>

        <FormSection title="Avancement" description="Où en est le chantier aujourd’hui ?">
          <FormChoice
            label="Statut"
            value={form.status}
            options={projectStatuses}
            onChange={(value) => update("status", value as ProjectStatus)}
          />
        </FormSection>

        <FormSection title="Planning" description="Les dates restent modifiables à tout moment.">
          <DateField
            label="Date de début"
            optional
            allowClear
            value={form.startDate}
            onChange={(value) => update("startDate", value ?? "")}
            placeholder="Choisir une date"
            hint="Date de démarrage prévue du chantier."
          />
          <DateField
            label="Date d’échéance"
            optional
            allowClear
            value={form.dueDate}
            onChange={(value) => update("dueDate", value ?? "")}
            placeholder="Choisir une date"
            hint="Date de livraison ou de fin prévue."
          />
        </FormSection>

        <FormSection
          title="Budget & détails"
          description="Le budget est estimatif. Tous les champs de cette section sont optionnels."
        >
          <FormField
            label="Budget (MAD)"
            optional
            inputRef={budgetRef}
            value={form.budget}
            onChangeText={(value) => update("budget", value)}
            placeholder="0"
            keyboardType="decimal-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => cityRef.current?.focus()}
            error={errors.budget}
          />
          <FormField
            label="Ville"
            optional
            inputRef={cityRef}
            value={form.city}
            onChangeText={(value) => update("city", value)}
            placeholder="Casablanca"
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => addressRef.current?.focus()}
          />
          <FormField
            label="Adresse du chantier"
            optional
            inputRef={addressRef}
            value={form.address}
            onChangeText={(value) => update("address", value)}
            placeholder="Rue, quartier, numéro"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => notesRef.current?.focus()}
            hint="Sert au bouton Itinéraire."
          />
          <FormField
            label="Notes"
            optional
            inputRef={notesRef}
            value={form.notes}
            onChangeText={(value) => update("notes", value)}
            placeholder="Détails techniques, matériaux, contraintes…"
            multiline
            style={styles.notes}
          />
        </FormSection>
      </KeyboardForm>
    </>
  );
}

const styles = StyleSheet.create({
  notes: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: "top",
    lineHeight: 21,
  },
});
