import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ClientStatus } from "@/api/types";
import {
  Chip,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from "@/components/domain/DetailKit";
import { Card, Field, PrimaryButton, Screen } from "@/components/ui";
import { useLiveClients } from "@/convex/hooks";
import { useCreateClient, useUpdateClient } from "@/hooks/queries";
import { colors, fontSize, spacing } from "@/theme/tokens";

interface FormState {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  status: ClientStatus;
}

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  notes: "",
  status: "active",
};

export default function ClientEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const clients = useLiveClients();

  if (id && clients === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  const client = id ? clients?.find((item) => item.id === id) : undefined;

  if (id && !client) {
    return (
      <Screen>
        <ErrorBlock message="Ce client n'existe plus." />
      </Screen>
    );
  }

  return (
    <ClientForm
      key={id ?? "new"}
      id={id}
      initial={
        client
          ? {
              name: client.name,
              phone: client.phone,
              email: client.email,
              city: client.city,
              address: client.address,
              notes: client.notes,
              status: client.status,
            }
          : emptyForm
      }
    />
  );
}

function ClientForm({ id, initial }: { id?: string; initial: FormState }) {
  const router = useRouter();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setError("");
    if (form.name.trim().length < 2) {
      setError("Le nom est trop court.");
      return;
    }
    if (form.phone.trim().length < 8) {
      setError("Le numéro de téléphone est invalide.");
      return;
    }

    try {
      if (id) {
        await updateClient.mutateAsync({ id, ...form });
      } else {
        await createClient.mutateAsync(form);
      }
      router.back();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Enregistrement impossible.",
      );
    }
  }

  return (
    <Screen scroll>
      <PageHeader
        title={id ? "Modifier le client" : "Nouveau client"}
        subtitle="Les coordonnées servent aux appels et aux itinéraires."
      />

      <Card style={styles.card}>
        <Field
          label="Nom complet"
          value={form.name}
          onChangeText={(value) => update("name", value)}
          placeholder="Nom du client"
          autoCapitalize="words"
        />
        <Field
          label="Téléphone"
          value={form.phone}
          onChangeText={(value) => update("phone", value)}
          placeholder="06 00 00 00 00"
          keyboardType="phone-pad"
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
          label="Ville"
          value={form.city}
          onChangeText={(value) => update("city", value)}
          placeholder="Casablanca"
          autoCapitalize="words"
        />
        <Field
          label="Adresse"
          value={form.address}
          onChangeText={(value) => update("address", value)}
          placeholder="Rue, quartier, numéro"
        />
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>Statut</Text>
          <View style={styles.chips}>
            <Chip
              label="Actif"
              active={form.status === "active"}
              onPress={() => update("status", "active")}
            />
            <Chip
              label="Inactif"
              active={form.status === "inactive"}
              onPress={() => update("status", "inactive")}
            />
          </View>
        </View>
        <Field
          label="Notes"
          value={form.notes}
          onChangeText={(value) => update("notes", value)}
          placeholder="Informations utiles, préférences…"
          multiline
          style={styles.notes}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={id ? "Enregistrer les modifications" : "Créer le client"}
          onPress={() => void handleSave()}
          loading={createClient.isPending || updateClient.isPending}
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
  statusBlock: {
    gap: spacing.xs + 2,
  },
  statusLabel: {
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
