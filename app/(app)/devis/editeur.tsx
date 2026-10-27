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
import { formatMoney } from "@/lib/format";
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

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function lineTotal(item: ItemRow) {
  const qty = parseNumber(item.qty);
  const price = parseNumber(item.price);
  if (Number.isNaN(qty) || Number.isNaN(price)) return 0;
  return Math.round(qty * price * 100);
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
    items: [newItem()],
    notes: "",
    conditions: "",
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
  expectedUpdatedAt,
  initial,
}: {
  id?: string;
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

  const { markDirty: markFormDirty, allowLeave } = useUnsavedChangesGuard();

  const nameRef = useRef<FieldInputRef>(null);
  const emailRef = useRef<FieldInputRef>(null);
  const phoneRef = useRef<FieldInputRef>(null);
  const cityRef = useRef<FieldInputRef>(null);
  const addressRef = useRef<FieldInputRef>(null);
  const projectTypeRef = useRef<FieldInputRef>(null);
  const dateRef = useRef<FieldInputRef>(null);
  const notesRef = useRef<FieldInputRef>(null);
  const conditionsRef = useRef<FieldInputRef>(null);
  const itemHandles = useRef<Record<string, LineItemHandle | null>>({});

  function markDirty() {
    markFormDirty();
    setServerError("");
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    markDirty();
    setForm((current) => ({ ...current, [key]: value }));
    const errorKey: "name" | "date" | null =
      key === "name" || key === "date" ? (key as "name" | "date") : null;
    if (!errorKey) return;
    setErrors((current) =>
      current[errorKey] ? { ...current, [errorKey]: undefined } : current,
    );
  }

  function updateItem(itemId: string, patch: Partial<ItemRow>, fields: string[]) {
    markDirty();
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
    markDirty();
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
    markDirty();
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

  function focusFirstLine() {
    const first = form.items[0];
    if (first) itemHandles.current[first.id]?.focusField("label");
    else dateRef.current?.focus();
  }

  function addItem() {
    const item = newItem();
    markDirty();
    setForm((current) => ({ ...current, items: [...current.items, item] }));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => itemHandles.current[item.id]?.focusField("label"));
    });
  }

  function removeItem(itemId: string) {
    markDirty();
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((item) => item.id !== itemId),
    }));
  }

  const totalCents = form.items.reduce((sum, item) => sum + lineTotal(item), 0);

  async function handleSave() {
    setServerError("");

    const nextErrors: Record<string, string> = {};
    if (!isDate(form.date)) {
      nextErrors.date = "Utilisez une date valide au format AAAA-MM-JJ.";
    }
    if (!form.name.trim()) {
      nextErrors.name = "Indiquez le nom du client.";
    }
    for (const item of form.items) {
      if (!item.label.trim()) {
        nextErrors[`${item.id}::label`] = "Indiquez une désignation.";
      }
      const qty = parseNumber(item.qty);
      if (Number.isNaN(qty) || qty <= 0) {
        nextErrors[`${item.id}::qty`] = "Quantité invalide.";
      }
      if (!item.price.trim()) {
        nextErrors[`${item.id}::price`] = "Indiquez un prix.";
      } else if (Number.isNaN(parseNumber(item.price)) || parseNumber(item.price) < 0) {
        nextErrors[`${item.id}::price`] = "Prix invalide.";
      }
    }

    setErrors(nextErrors);
    const order = [
      "name",
      "email",
      "phone",
      "city",
      "address",
      "projectType",
      ...form.items.flatMap((item) => [
        `${item.id}::label`,
        `${item.id}::qty`,
        `${item.id}::price`,
      ]),
      "date",
    ];
    const firstError = order.find((key) => nextErrors[key]);
    if (firstError) {
      const [itemId, field] = firstError.split("::");
      if (field === "label" || field === "qty" || field === "price") {
        itemHandles.current[itemId]?.focusField(field);
      } else if (firstError === "name") {
        nameRef.current?.focus();
      } else if (firstError === "date") {
        dateRef.current?.focus();
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

  return (
    <>
      <Stack.Screen options={{ title: id ? "Modifier le devis" : "Nouveau devis" }} />
      <KeyboardForm
        footer={
          <FormFooter
            submitLabel={id ? "Enregistrer le devis" : "Créer le devis"}
            onSubmit={() => void handleSave()}
            loading={saveDocument.isPending}
            error={serverError}
            summary={{ label: "Total du devis", value: formatMoney(totalCents) }}
          />
        }
      >
        <FormSection
          title="Client & projet"
          description="Sélectionnez un client ou un projet pour préremplir les coordonnées."
        >
          <SelectField
            label="Client existant"
            value={form.clientId || null}
            options={clientOptions}
            onChange={selectClient}
            placeholder="Choisir un client"
            title="Choisir un client"
            hint="La recherche filtre par nom, ville ou téléphone."
            allowClear
          />
          <SelectField
            label="Projet lié"
            value={form.projectId || null}
            options={projectOptions}
            onChange={selectProject}
            placeholder="Choisir un projet"
            title="Choisir un projet"
            hint="Rattache le devis au chantier et complète le contexte."
            allowClear
          />
        </FormSection>

        <FormSection
          title="Coordonnées"
          description="Le nom du client est requis. Les autres champs sont optionnels."
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
            onSubmitEditing={focusFirstLine}
          />
        </FormSection>

        <FormSection
          title="Lignes du devis"
          description="Quantité × prix unitaire. Le total de chaque ligne est calculé automatiquement."
        >
          {form.items.map((item, index) => (
            <LineItemEditor
              key={item.id}
              ref={(handle) => {
                if (handle) itemHandles.current[item.id] = handle;
                else delete itemHandles.current[item.id];
              }}
              item={item}
              index={index}
              canRemove={form.items.length > 1}
              errors={errors}
              onChange={updateItem}
              onRemove={removeItem}
              onPriceSubmit={() => {
                const next = form.items[index + 1];
                if (next) itemHandles.current[next.id]?.focusField("label");
                else dateRef.current?.focus();
              }}
            />
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={addItem}
            style={({ pressed }) => [styles.addLine, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={17} color={colors.primary} />
            <Text style={styles.addLineLabel}>Ajouter une ligne</Text>
          </Pressable>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total du devis</Text>
            <Text style={styles.totalValue}>{formatMoney(totalCents)}</Text>
          </View>
        </FormSection>

        <FormSection title="Détails" description="Date, notes et conditions du devis.">
          <FormField
            label="Date du devis"
            required
            inputRef={dateRef}
            value={form.date}
            onChangeText={(value) => update("date", value)}
            placeholder="AAAA-MM-JJ"
            maxLength={10}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => notesRef.current?.focus()}
            error={errors.date}
            hint="Format AAAA-MM-JJ."
          />
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
  addLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
  },
  addLineLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  totalValue: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  multiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top",
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.6,
  },
});
