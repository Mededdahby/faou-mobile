import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CommercialDocument, DocumentItem, Project, Client } from "@/api/types";
import {
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from "@/components/domain/DetailKit";
import { Card, Field, PrimaryButton, Screen } from "@/components/ui";
import { useLiveClients, useLiveDocument, useLiveProjects } from "@/convex/hooks";
import { useSaveDocument } from "@/hooks/queries";
import { formatMoney } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newItem(): DocumentItem {
  return { id: `item-${Date.now()}-${Math.round(Math.random() * 1000)}`, label: "", amountCents: 0 };
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
}

function amountInput(cents: number) {
  return cents > 0 ? String(cents / 100) : "";
}

interface ItemRow {
  id: string;
  label: string;
  amount: string;
}

interface FormState {
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
  projectId: string;
}

const emptyForm: FormState = {
  date: today(),
  name: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  projectType: "",
  items: [{ ...newItem(), amount: "" }],
  notes: "",
  conditions: "",
  projectId: "",
};

function initialFromDocument(document: CommercialDocument): FormState {
  return {
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
      amount: amountInput(item.amountCents),
    })),
    notes: document.notes,
    conditions: document.conditions,
    projectId: document.projectId ?? "",
  };
}

function initialFromContext(
  project?: Project,
  client?: Client,
  projectId?: string,
): FormState {
  return {
    ...emptyForm,
    projectId: project?.id ?? projectId ?? "",
    name: client?.name ?? project?.clientName ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    city: client?.city ?? project?.city ?? "",
    address: client?.address ?? project?.address ?? "",
    projectType: project?.type ?? "",
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
    <Screen scroll>
      <PageHeader title="Facture" subtitle="Les factures ne peuvent pas être modifiées." />
      <Card style={styles.card}>
        <Text style={styles.invoiceText}>
          Modifiez le statut, le paiement ou l’échéance depuis la fiche de la facture.
        </Text>
        <PrimaryButton label="Ouvrir la facture" onPress={() => router.replace(`/devis/${id}`)} />
      </Card>
    </Screen>
  );
}

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
  const saveDocument = useSaveDocument();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem(itemId: string, patch: Partial<ItemRow>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...newItem(), amount: "" }],
    }));
  }

  function removeItem(itemId: string) {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((item) => item.id !== itemId),
    }));
  }

  const totalCents = form.items.reduce((sum, item) => {
    const cents = parseAmount(item.amount);
    return sum + (Number.isNaN(cents) ? 0 : cents);
  }, 0);

  async function handleSave() {
    setError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError("La date doit respecter le format AAAA-MM-JJ.");
      return;
    }
    if (form.name.trim().length < 1) {
      setError("Le nom du client est requis.");
      return;
    }
    if (form.items.length === 0 || form.items.some((item) => !item.label.trim())) {
      setError("Chaque ligne doit avoir un libellé.");
      return;
    }
    const items = form.items.map((item) => ({
      id: item.id,
      label: item.label.trim(),
      amountCents: parseAmount(item.amount),
    }));
    if (items.some((item) => Number.isNaN(item.amountCents))) {
      setError("Les montants doivent être des nombres positifs.");
      return;
    }

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
      router.replace(`/devis/${saved._id}`);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Enregistrement impossible.",
      );
    }
  }

  return (
    <Screen scroll>
      <PageHeader
        title={id ? "Modifier le devis" : "Nouveau devis"}
        subtitle="Ajoutez les lignes, le client et les conditions."
      />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Client</Text>
        <Field
          label="Nom du client"
          value={form.name}
          onChangeText={(value) => update("name", value)}
          placeholder="Nom complet"
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={(value) => update("email", value)}
          placeholder="client@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Téléphone"
          value={form.phone}
          onChangeText={(value) => update("phone", value)}
          placeholder="06 00 00 00 00"
          keyboardType="phone-pad"
        />
        <Field
          label="Ville"
          value={form.city}
          onChangeText={(value) => update("city", value)}
          placeholder="Casablanca"
        />
        <Field
          label="Adresse"
          value={form.address}
          onChangeText={(value) => update("address", value)}
          placeholder="Adresse du client"
        />
        <Field
          label="Type de projet"
          value={form.projectType}
          onChangeText={(value) => update("projectType", value)}
          placeholder="Cuisine, dressing, placard…"
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Lignes</Text>
          <Pressable onPress={addItem} accessibilityRole="button" style={styles.addRow}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addLabel}>Ajouter</Text>
          </Pressable>
        </View>
        {form.items.map((item, index) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemFields}>
              <Field
                label={`Désignation ${index + 1}`}
                value={item.label}
                onChangeText={(value) => updateItem(item.id, { label: value })}
                placeholder="Meuble bas, plan de travail…"
              />
              <Field
                label="Montant (MAD)"
                value={item.amount}
                onChangeText={(value) => updateItem(item.id, { amount: value })}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
            {form.items.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Supprimer la ligne"
                onPress={() => removeItem(item.id)}
                style={styles.remove}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(totalCents)}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Field
          label="Date du devis"
          value={form.date}
          onChangeText={(value) => update("date", value)}
          placeholder="AAAA-MM-JJ"
        />
        <Field
          label="Notes"
          value={form.notes}
          onChangeText={(value) => update("notes", value)}
          placeholder="Notes visibles sur le document"
          multiline
          style={styles.multiline}
        />
        <Field
          label="Conditions"
          value={form.conditions}
          onChangeText={(value) => update("conditions", value)}
          placeholder="Délais, acompte, validité…"
          multiline
          style={styles.multiline}
        />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={id ? "Enregistrer le devis" : "Créer le devis"}
        onPress={() => void handleSave()}
        loading={saveDocument.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  addLabel: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: colors.primary,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  itemFields: {
    flex: 1,
    gap: spacing.sm,
  },
  remove: {
    height: 48,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: "#FEF2F2",
    marginBottom: 2,
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
    color: colors.muted,
  },
  totalValue: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  multiline: {
    minHeight: 90,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  invoiceText: {
    fontSize: fontSize.small,
    lineHeight: 20,
    color: colors.muted,
  },
  error: {
    marginTop: spacing.md,
    fontSize: fontSize.small,
    color: colors.danger,
  },
});
