import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Client, CommercialDocument, Project } from "@/api/types";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/domain/DetailKit";
import { QuotePreview } from "@/components/domain/QuotePreview";
import { DateField } from "@/components/form/DateField";
import {
  FormField,
  FormFooter,
  FormSection,
  KeyboardForm,
} from "@/components/form/KeyboardForm";
import { SelectField } from "@/components/form/SelectField";
import { Card, PrimaryButton, Screen } from "@/components/ui";
import type { FieldInputRef } from "@/components/ui/Field";
import {
  useLiveClients,
  useLiveDocument,
  useLiveProjects,
} from "@/convex/hooks";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useSaveDocument } from "@/hooks/queries";
import { formatMoney, formatMoneyShort } from "@/lib/format";
import { getProjectStatus } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

interface ItemRow {
  id: string;
  label: string;
  qty: string;
  price: string;
}

interface FormState {
  clientId: string;
  projectId: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  projectType: string;
  items: ItemRow[];
  notes: string;
  conditions: string;
}

type ItemField = "label" | "qty" | "price";

interface LineItemHandle {
  focusField: (field: ItemField) => void;
}

interface LineItemEditorProps {
  item: ItemRow;
  index: number;
  canRemove: boolean;
  errors: Record<string, string | undefined>;
  onChange: (itemId: string, patch: Partial<ItemRow>, fields: string[]) => void;
  onRemove: (itemId: string) => void;
  onPriceSubmit: () => void;
}

const DEFAULT_CONDITIONS =
  "Validité du devis : 30 jours.\nDélais de réalisation à confirmer après validation.\nTVA non incluse si applicable.";

const QUICK_ITEMS = [
  { label: "Conception & plan 3D", price: "3500" },
  { label: "Meubles bas sur mesure", price: "18000" },
  { label: "Meubles hauts sur mesure", price: "12000" },
  { label: "Plan de travail quartz", price: "14000" },
  { label: "Crédence", price: "3500" },
  { label: "Électroménager", price: "22000" },
  { label: "Pose & installation", price: "8000" },
];

const BUILDER_STEPS = [
  { label: "Client", title: "Client & informations" },
  { label: "Prestations", title: "Prestations & prix" },
  { label: "Aperçu", title: "Aperçu & validation" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newItem(): ItemRow {
  return {
    id: `item-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    label: "",
    qty: "1",
    price: "",
  };
}

function parseNumber(value: string) {
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function lineTotal(item: ItemRow) {
  const qty = parseNumber(item.qty);
  const price = parseNumber(item.price);
  if (Number.isNaN(qty) || Number.isNaN(price)) return 0;
  return Math.round(qty * price * 100);
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function initialFromDocument(document: CommercialDocument): FormState {
  return {
    clientId: "",
    projectId: document.projectId ?? "",
    date: document.date,
    name: document.client.name,
    email: document.client.email,
    phone: document.client.phone,
    city: document.client.city,
    address: document.client.address,
    projectType: document.client.projectType,
    items: document.items.map((item) => ({
      id: item.id,
      label: item.label,
      qty: "1",
      price: String(item.amountCents / 100),
    })),
    notes: document.notes,
    conditions: document.conditions,
  };
}

function initialFromContext(
  project?: Project,
  client?: Client,
  projectId?: string,
): FormState {
  return {
    clientId: client?.id ?? project?.clientId ?? "",
    projectId: project?.id ?? projectId ?? "",
    date: today(),
    name: client?.name ?? project?.clientName ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    city: client?.city ?? project?.city ?? "",
    address: client?.address ?? project?.address ?? "",
    projectType: project?.type ?? "",
    items: [],
    notes: "",
    conditions: DEFAULT_CONDITIONS,
  };
}

export default function DevisEditorScreen() {
  const { id, projectId, clientId } = useLocalSearchParams<{
    id?: string;
    projectId?: string;
    clientId?: string;
  }>();
  const document = useLiveDocument(id);
  const clients = useLiveClients();
  const projects = useLiveProjects();

  if (id) {
    if (document === undefined) {
      return (
        <Screen>
          <LoadingBlock />
        </Screen>
      );
    }
    if (!document) {
      return (
        <Screen>
          <ErrorBlock message="Ce document n'existe plus." />
        </Screen>
      );
    }
    if (document.kind !== "quote") {
      return <InvoiceNotice id={document._id} />;
    }
    return (
      <DevisForm
        key={document._id}
        id={document._id}
        reference={document.number}
        expectedUpdatedAt={document.updatedAt}
        initial={initialFromDocument(document)}
      />
    );
  }

  if ((projectId && projects === undefined) || (clientId && clients === undefined)) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  const project = projectId ? projects?.find((item) => item.id === projectId) : undefined;
  const client = clientId ? clients?.find((item) => item.id === clientId) : undefined;

  return (
    <DevisForm
      key={`new-${projectId ?? ""}-${clientId ?? ""}`}
      initial={initialFromContext(project, client, projectId)}
    />
  );
}

function InvoiceNotice({ id }: { id: string }) {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Facture" }} />
      <Screen scroll>
        <PageHeader title="Facture" subtitle="Les factures ne peuvent pas être modifiées." />
        <Card style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Modifiez le statut, le paiement ou l’échéance depuis la fiche de la facture.
          </Text>
          <PrimaryButton label="Ouvrir la facture" onPress={() => router.replace(`/devis/${id}`)} />
        </Card>
      </Screen>
    </>
  );
}

function StepIndicator({
  step,
  onSelect,
}: {
  step: number;
  onSelect: (step: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      {BUILDER_STEPS.map((item, index) => {
        const active = step === index;
        const done = index < step;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(index)}
            style={({ pressed }) => [
              styles.step,
              active && styles.stepActive,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.stepDot,
                done && styles.stepDotDone,
                active && styles.stepDotActive,
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={12} color={colors.white} />
              ) : (
                <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[styles.stepLabel, active && styles.stepLabelActive]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const LineItemEditor = forwardRef<LineItemHandle, LineItemEditorProps>(
  function LineItemEditor(
    { item, index, canRemove, errors, onChange, onRemove, onPriceSubmit },
    ref,
  ) {
    const labelRef = useRef<FieldInputRef>(null);
    const qtyRef = useRef<FieldInputRef>(null);
    const priceRef = useRef<FieldInputRef>(null);

    useImperativeHandle(ref, () => ({
      focusField(field) {
        if (field === "label") labelRef.current?.focus();
        else if (field === "qty") qtyRef.current?.focus();
        else priceRef.current?.focus();
      },
    }));

    const amount = lineTotal(item);

    return (
      <View style={styles.lineCard}>
        <View style={styles.lineHeader}>
          <Text style={styles.lineTitle}>Ligne {index + 1}</Text>
          {canRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Supprimer la ligne ${index + 1}`}
              onPress={() => onRemove(item.id)}
              hitSlop={8}
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
        <FormField
          label="Désignation"
          required
          inputRef={labelRef}
          value={item.label}
          onChangeText={(value) => onChange(item.id, { label: value }, ["label"])}
          placeholder="Meuble bas, plan de travail…"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => qtyRef.current?.focus()}
          error={errors[`${item.id}::label`]}
        />
        <View style={styles.lineRow}>
          <View style={styles.lineColumn}>
            <FormField
              label="Quantité"
              required
              inputRef={qtyRef}
              value={item.qty}
              onChangeText={(value) => onChange(item.id, { qty: value }, ["qty"])}
              placeholder="1"
              keyboardType="decimal-pad"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => priceRef.current?.focus()}
              error={errors[`${item.id}::qty`]}
            />
          </View>
          <View style={styles.lineColumn}>
            <FormField
              label="Prix unitaire (MAD)"
              required
              inputRef={priceRef}
              value={item.price}
              onChangeText={(value) => onChange(item.id, { price: value }, ["price"])}
              placeholder="0"
              keyboardType="decimal-pad"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={onPriceSubmit}
              error={errors[`${item.id}::price`]}
            />
          </View>
        </View>
        <View style={styles.lineTotalRow}>
          <Text style={styles.lineTotalLabel}>Total de la ligne</Text>
          <Text style={styles.lineTotalValue}>{formatMoney(amount)}</Text>
        </View>
      </View>
    );
  },
);

function DevisForm({
  id,
  reference,
  expectedUpdatedAt,
  initial,
}: {
  id?: string;
  reference?: string;
  expectedUpdatedAt?: number;
  initial: FormState;
}) {
  const router = useRouter();
  const clients = useLiveClients();
  const projects = useLiveProjects();
  const saveDocument = useSaveDocument();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [serverError, setServerError] = useState("");
  const [step, setStep] = useState(0);
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customError, setCustomError] = useState("");

  const { markDirty, allowLeave } = useUnsavedChangesGuard();

  const nameRef = useRef<FieldInputRef>(null);
  const emailRef = useRef<FieldInputRef>(null);
  const phoneRef = useRef<FieldInputRef>(null);
  const cityRef = useRef<FieldInputRef>(null);
  const addressRef = useRef<FieldInputRef>(null);
  const projectTypeRef = useRef<FieldInputRef>(null);
  const notesRef = useRef<FieldInputRef>(null);
  const conditionsRef = useRef<FieldInputRef>(null);
  const customLabelRef = useRef<FieldInputRef>(null);
  const customPriceRef = useRef<FieldInputRef>(null);
  const itemHandles = useRef<Record<string, LineItemHandle | null>>({});

  function markFormDirty() {
    markDirty();
    setServerError("");
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    markFormDirty();
    setForm((current) => ({ ...current, [key]: value }));
    const errorKey: "name" | "date" | null =
      key === "name" || key === "date" ? (key as "name" | "date") : null;
    if (!errorKey) return;
    setErrors((current) =>
      current[errorKey] ? { ...current, [errorKey]: undefined } : current,
    );
  }

  function updateItem(itemId: string, patch: Partial<ItemRow>, fields: string[]) {
    markFormDirty();
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
    setErrors((current) => {
      let next = current;
      for (const field of fields) {
        const key = `${itemId}::${field}`;
        if (next[key]) {
          if (next === current) next = { ...current };
          delete next[key];
        }
      }
      return next;
    });
  }

  function selectClient(clientIdValue: string | null) {
    markFormDirty();
    if (!clientIdValue) {
      setForm((current) => ({ ...current, clientId: "" }));
      return;
    }
    const client = clients?.find((item) => item.id === clientIdValue);
    setForm((current) => ({
      ...current,
      clientId: clientIdValue,
      name: client?.name ?? current.name,
      email: client?.email ?? current.email,
      phone: client?.phone ?? current.phone,
      city: client?.city ?? current.city,
      address: client?.address ?? current.address,
    }));
    setErrors((current) =>
      current.name ? { ...current, name: undefined } : current,
    );
  }

  function selectProject(projectIdValue: string | null) {
    markFormDirty();
    if (!projectIdValue) {
      setForm((current) => ({ ...current, projectId: "" }));
      return;
    }
    const project = projects?.find((item) => item.id === projectIdValue);
    const linkedClient = project?.clientId
      ? clients?.find((item) => item.id === project.clientId)
      : undefined;

    setForm((current) => ({
      ...current,
      projectId: projectIdValue,
      projectType: project?.type ?? current.projectType,
      clientId: linkedClient?.id ?? current.clientId,
      name: linkedClient?.name ?? project?.clientName ?? current.name,
      email: linkedClient?.email ?? current.email,
      phone: linkedClient?.phone ?? current.phone,
      city: linkedClient?.city ?? project?.city ?? current.city,
      address: linkedClient?.address ?? project?.address ?? current.address,
    }));
    setErrors((current) =>
      current.name ? { ...current, name: undefined } : current,
    );
  }

  function appendItem(label: string, price: string) {
    const item = { ...newItem(), label, price };
    markFormDirty();
    setForm((current) => ({ ...current, items: [...current.items, item] }));
    setServerError("");
  }

  function addPreset(label: string, price: string) {
    appendItem(label, price);
  }

  function addCustomItem() {
    setCustomError("");
    if (!customLabel.trim()) {
      setCustomError("Indiquez une description.");
      customLabelRef.current?.focus();
      return;
    }
    const price = parseNumber(customPrice);
    if (!customPrice.trim() || Number.isNaN(price) || price < 0) {
      setCustomError("Indiquez un montant valide.");
      customPriceRef.current?.focus();
      return;
    }
    appendItem(customLabel.trim(), customPrice.trim());
    setCustomLabel("");
    setCustomPrice("");
    customLabelRef.current?.focus();
  }

  function removeItem(itemId: string) {
    markFormDirty();
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  const totalCents = form.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const selectedProject = projects?.find((project) => project.id === form.projectId);

  const clientOptions = (clients ?? []).map((client) => ({
    id: client.id,
    label: client.name,
    subtitle: [client.city, client.phone].filter(Boolean).join(" · "),
  }));

  const projectOptions = (projects ?? []).map((project) => ({
    id: project.id,
    label: project.name,
    subtitle: [project.clientName, getProjectStatus(project.status).label]
      .filter(Boolean)
      .join(" · "),
  }));

  function validateClient() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Indiquez le nom du client.";
    if (!isDate(form.date)) next.date = "Sélectionnez une date valide.";
    return next;
  }

  function validateItems(requireAtLeastOne: boolean) {
    const next: Record<string, string> = {};
    for (const item of form.items) {
      if (!item.label.trim()) {
        next[`${item.id}::label`] = "Indiquez une désignation.";
      }
      const qty = parseNumber(item.qty);
      if (Number.isNaN(qty) || qty <= 0) {
        next[`${item.id}::qty`] = "Quantité invalide.";
      }
      if (!item.price.trim()) {
        next[`${item.id}::price`] = "Indiquez un prix.";
      } else {
        const price = parseNumber(item.price);
        if (Number.isNaN(price) || price < 0) {
          next[`${item.id}::price`] = "Prix invalide.";
        }
      }
    }
    if (requireAtLeastOne && form.items.length === 0) {
      next.items = "Ajoutez au moins une prestation.";
    }
    return next;
  }

  function goNext() {
    setServerError("");
    if (step === 0) {
      const next = validateClient();
      setErrors(next);
      if (next.name) {
        nameRef.current?.focus();
        return;
      }
      if (next.date) return;
      Keyboard.dismiss();
      setStep(1);
      return;
    }

    if (step === 1) {
      if (customLabel.trim() || customPrice.trim()) {
        setCustomError("Ajoutez la ligne personnalisée ou videz les champs.");
        (customLabel.trim() ? customPriceRef : customLabelRef).current?.focus();
        return;
      }
      const next = validateItems(false);
      setErrors((current) => ({ ...current, ...next }));
      if (Object.keys(next).length > 0) {
        setServerError("Corrigez les prestations signalées.");
        return;
      }
      Keyboard.dismiss();
      setStep(2);
    }
  }

  function goBack() {
    Keyboard.dismiss();
    setServerError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSave() {
    setServerError("");

    const clientErrors = validateClient();
    const itemErrors = validateItems(true);
    const nextErrors = { ...clientErrors, ...itemErrors };
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      if (clientErrors.name || clientErrors.date) {
        setStep(0);
        setServerError("Vérifiez les informations du client.");
      } else {
        setStep(1);
        setServerError(
          itemErrors.items ?? "Corrigez les prestations signalées.",
        );
      }
      return;
    }

    const items = form.items.map((item) => ({
      id: item.id,
      label: item.label.trim(),
      amountCents: lineTotal(item),
    }));

    Keyboard.dismiss();
    try {
      const saved = await saveDocument.mutateAsync({
        id,
        expectedUpdatedAt,
        date: form.date,
        client: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          projectType: form.projectType.trim(),
        },
        items,
        notes: form.notes,
        conditions: form.conditions,
        projectId: form.projectId || null,
      });
      allowLeave();
      router.replace(`/devis/${saved._id}`);
    } catch (mutationError) {
      setServerError(
        mutationError instanceof Error ? mutationError.message : "Enregistrement impossible.",
      );
    }
  }

  const previewItems = form.items.map((item) => ({
    id: item.id,
    label: item.label.trim() || "Sans désignation",
    amountCents: lineTotal(item),
  }));

  return (
    <>
      <Stack.Screen options={{ title: id ? "Modifier le devis" : "Nouveau devis" }} />
      <KeyboardForm
        scrollKey={step}
        footer={
          <FormFooter
            submitLabel={
              step === 0
                ? "Continuer"
                : step === 1
                  ? "Voir l’aperçu"
                  : id
                    ? "Enregistrer"
                    : "Enregistrer le devis"
            }
            onSubmit={step === 2 ? () => void handleSave() : goNext}
            loading={step === 2 && saveDocument.isPending}
            error={serverError}
            summary={
              step > 0
                ? {
                    label: `${form.items.length} prestation${
                      form.items.length === 1 ? "" : "s"
                    } · Total`,
                    value: formatMoney(totalCents),
                  }
                : undefined
            }
            secondaryLabel={step > 0 ? "Retour" : undefined}
            onSecondary={step > 0 ? goBack : undefined}
          />
        }
      >
        <StepIndicator
          step={step}
          onSelect={(next) => {
            if (
              step === 1 &&
              next > 1 &&
              (customLabel.trim() || customPrice.trim())
            ) {
              setCustomError("Ajoutez la ligne personnalisée ou videz les champs.");
              (customLabel.trim() ? customPriceRef : customLabelRef).current?.focus();
              return;
            }
            Keyboard.dismiss();
            setServerError("");
            setStep(next);
          }}
        />

        {step === 0 ? (
          <>
            <FormSection
              title="Client"
              description="Sélectionnez un client existant pour préremplir ses coordonnées."
            >
              <SelectField
                label="Client existant"
                value={form.clientId || null}
                options={clientOptions}
                onChange={selectClient}
                placeholder="Rechercher un client"
                title="Choisir un client"
                hint="La recherche filtre par nom, ville ou téléphone."
                allowClear
              />
            </FormSection>

            <FormSection
              title="Coordonnées"
              description="Le nom est requis. Les autres champs sont optionnels."
            >
              <FormField
                label="Nom du client"
                required
                inputRef={nameRef}
                value={form.name}
                onChangeText={(value) => update("name", value)}
                placeholder="Nom complet"
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
                error={errors.name}
              />
              <FormField
                label="Email"
                optional
                inputRef={emailRef}
                value={form.email}
                onChangeText={(value) => update("email", value)}
                placeholder="client@email.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
              <FormField
                label="Téléphone"
                optional
                inputRef={phoneRef}
                value={form.phone}
                onChangeText={(value) => update("phone", value)}
                placeholder="06 00 00 00 00"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => cityRef.current?.focus()}
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
                label="Adresse"
                optional
                inputRef={addressRef}
                value={form.address}
                onChangeText={(value) => update("address", value)}
                placeholder="Rue, quartier, numéro"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => projectTypeRef.current?.focus()}
              />
              <FormField
                label="Type de projet"
                optional
                inputRef={projectTypeRef}
                value={form.projectType}
                onChangeText={(value) => update("projectType", value)}
                placeholder="Cuisine, dressing, placard…"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => notesRef.current?.focus()}
              />
            </FormSection>

            <FormSection
              title="Document"
              description="La référence est attribuée automatiquement à l’enregistrement."
            >
              <View style={styles.referenceField}>
                <Text style={styles.referenceLabel}>Référence</Text>
                <View style={styles.referenceBox}>
                  <Text style={styles.referenceValue}>
                    {reference || "Attribuée à l’enregistrement"}
                  </Text>
                </View>
              </View>
              <DateField
                label="Date"
                required
                value={form.date}
                onChange={(value) => update("date", value ?? today())}
                placeholder="Choisir une date"
                error={errors.date}
                hint="Date d’émission du devis."
                title="Date du devis"
              />
              <SelectField
                label="Projet associé"
                value={form.projectId || null}
                options={projectOptions}
                onChange={selectProject}
                placeholder="Aucun projet"
                title="Choisir un projet"
                hint="Rattache le devis à un chantier existant."
                allowClear
              />
            </FormSection>

            <FormSection
              title="Notes & conditions"
              description="Optionnel. Ces textes apparaîtront sur le document."
            >
              <FormField
                label="Notes"
                optional
                inputRef={notesRef}
                value={form.notes}
                onChangeText={(value) => update("notes", value)}
                placeholder="Notes visibles sur le document"
                multiline
                style={styles.multiline}
              />
              <FormField
                label="Conditions"
                optional
                inputRef={conditionsRef}
                value={form.conditions}
                onChangeText={(value) => update("conditions", value)}
                placeholder="Délais, acompte, validité…"
                multiline
                style={styles.multiline}
              />
            </FormSection>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <FormSection
              title="Ajout rapide"
              description="Touchez une prestation pour l’ajouter au devis."
            >
              <View style={styles.presets}>
                {QUICK_ITEMS.map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Ajouter ${item.label}`}
                    onPress={() => addPreset(item.label, item.price)}
                    style={({ pressed }) => [styles.preset, pressed && styles.pressed]}
                  >
                    <View style={styles.presetPlus}>
                      <Ionicons name="add" size={14} color={colors.primary} />
                    </View>
                    <View style={styles.presetText}>
                      <Text style={styles.presetLabel} numberOfLines={2}>
                        {item.label}
                      </Text>
                      <Text style={styles.presetPrice}>
                        {formatMoneyShort(Number(item.price) * 100)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </FormSection>

            <FormSection
              title="Ligne personnalisée"
              description="Ajoutez une prestation libre avec son montant."
            >
              <FormField
                label="Description"
                inputRef={customLabelRef}
                value={customLabel}
                onChangeText={(value) => {
                  setCustomLabel(value);
                  setCustomError("");
                }}
                placeholder="Description (ex. îlot central)"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => customPriceRef.current?.focus()}
              />
              <View style={styles.customRow}>
                <View style={styles.customAmount}>
                  <FormField
                    label="Montant (MAD)"
                    inputRef={customPriceRef}
                    value={customPrice}
                    onChangeText={(value) => {
                      setCustomPrice(value);
                      setCustomError("");
                    }}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={addCustomItem}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={addCustomItem}
                  style={({ pressed }) => [styles.addCustom, pressed && styles.pressed]}
                >
                  <Ionicons name="add" size={16} color={colors.white} />
                  <Text style={styles.addCustomLabel}>Ajouter</Text>
                </Pressable>
              </View>
              {customError ? <Text style={styles.errorText}>{customError}</Text> : null}
            </FormSection>

            <FormSection
              title="Prestations ajoutées"
              description="Modifiez la quantité ou le prix, puis vérifiez le total."
            >
              {form.items.length === 0 ? (
                <View style={styles.emptyLines}>
                  <Ionicons
                    name="document-text-outline"
                    size={22}
                    color={colors.mutedSoft}
                  />
                  <Text style={styles.emptyLinesTitle}>Aucune prestation ajoutée</Text>
                  <Text style={styles.emptyLinesText}>
                    Touchez une prestation ci-dessus pour commencer votre devis.
                  </Text>
                </View>
              ) : (
                form.items.map((item, index) => (
                  <LineItemEditor
                    key={item.id}
                    ref={(handle) => {
                      if (handle) itemHandles.current[item.id] = handle;
                      else delete itemHandles.current[item.id];
                    }}
                    item={item}
                    index={index}
                    canRemove
                    errors={errors}
                    onChange={updateItem}
                    onRemove={removeItem}
                    onPriceSubmit={() => {
                      const next = form.items[index + 1];
                      if (next) itemHandles.current[next.id]?.focusField("label");
                      else Keyboard.dismiss();
                    }}
                  />
                ))
              )}
              <View style={styles.totalBar}>
                <Text style={styles.totalBarLabel}>
                  {form.items.length} prestation{form.items.length === 1 ? "" : "s"} · Total
                  du devis
                </Text>
                <Text style={styles.totalBarValue}>{formatMoney(totalCents)}</Text>
              </View>
            </FormSection>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Aperçu du devis</Text>
              <Text style={styles.previewSubtitle}>
                Vérifiez les informations avant d’enregistrer.
              </Text>
            </View>
            <QuotePreview
              kind="quote"
              reference={reference}
              date={form.date}
              client={{
                name: form.name,
                email: form.email,
                phone: form.phone,
                city: form.city,
                address: form.address,
                projectType: form.projectType,
              }}
              items={previewItems}
              notes={form.notes}
              conditions={form.conditions}
              projectName={selectedProject?.name}
            />
            <View style={styles.previewNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.previewNoteText}>
                Après l’enregistrement, vous pourrez partager le devis et télécharger le
                PDF depuis sa fiche.
              </Text>
            </View>
          </>
        ) : null}
      </KeyboardForm>
    </>
  );
}

const styles = StyleSheet.create({
  noticeCard: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  noticeText: {
    fontSize: fontSize.small,
    lineHeight: 20,
    color: colors.muted,
  },
  stepper: {
    flexDirection: "row",
    gap: 4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 4,
  },
  step: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepDot: {
    height: 22,
    width: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  stepDotDone: {
    backgroundColor: colors.success,
  },
  stepDotActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  stepNumber: {
    fontSize: fontSize.micro,
    fontWeight: "700",
    color: colors.muted,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: fontSize.micro,
    fontWeight: "600",
    color: colors.muted,
  },
  stepLabelActive: {
    color: colors.white,
  },
  referenceField: {
    gap: spacing.xs + 2,
  },
  referenceLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  referenceBox: {
    minHeight: 50,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
  },
  referenceValue: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  multiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top",
    lineHeight: 21,
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  preset: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  presetPlus: {
    height: 26,
    width: 26,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  presetText: {
    flex: 1,
    gap: 1,
  },
  presetLabel: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    lineHeight: 15,
    color: colors.ink,
  },
  presetPrice: {
    fontSize: fontSize.micro,
    fontWeight: "600",
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  customRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  customAmount: {
    flex: 1,
  },
  addCustom: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  addCustomLabel: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.white,
  },
  errorText: {
    fontSize: fontSize.caption + 1,
    color: colors.danger,
  },
  emptyLines: {
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyLinesTitle: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.ink,
    marginTop: spacing.xs,
  },
  emptyLinesText: {
    fontSize: fontSize.caption + 1,
    lineHeight: 18,
    color: colors.muted,
    textAlign: "center",
  },
  totalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  totalBarLabel: {
    flex: 1,
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.78)",
  },
  totalBarValue: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },
  previewHeader: {
    gap: 2,
  },
  previewTitle: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  previewSubtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  previewNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  previewNoteText: {
    flex: 1,
    fontSize: fontSize.caption + 1,
    lineHeight: 18,
    color: colors.primaryDark,
  },
  lineCard: {
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  lineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lineTitle: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
  },
  delete: {
    height: 30,
    width: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  lineRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  lineColumn: {
    flex: 1,
  },
  lineTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  lineTotalLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "500",
    color: colors.muted,
  },
  lineTotalValue: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  pressed: {
    opacity: 0.6,
  },
});
