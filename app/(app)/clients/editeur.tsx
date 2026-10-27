import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Keyboard, StyleSheet } from "react-native";
import type { ClientStatus } from "@/api/types";
import { ErrorBlock, LoadingBlock } from "@/components/domain/DetailKit";
import {
  FormChoice,
  FormField,
  FormFooter,
  FormSection,
  KeyboardForm,
} from "@/components/form/KeyboardForm";
import { Screen } from "@/components/ui";
import type { FieldInputRef } from "@/components/ui/Field";
import { useLiveClients } from "@/convex/hooks";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useCreateClient, useUpdateClient } from "@/hooks/queries";
import { spacing } from "@/theme/tokens";

interface FormState {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  status: ClientStatus;
}

interface FormErrors {
  name?: string;
  phone?: string;
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

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
];

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
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const { markDirty, allowLeave } = useUnsavedChangesGuard();

  const nameRef = useRef<FieldInputRef>(null);
  const phoneRef = useRef<FieldInputRef>(null);
  const emailRef = useRef<FieldInputRef>(null);
  const cityRef = useRef<FieldInputRef>(null);
  const addressRef = useRef<FieldInputRef>(null);
  const notesRef = useRef<FieldInputRef>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    markDirty();
    setServerError("");
    setForm((current) => ({ ...current, [key]: value }));
    const errorKey: keyof FormErrors | null =
      key === "name" || key === "phone" ? (key as keyof FormErrors) : null;
    if (!errorKey) return;
    setErrors((current) =>
      current[errorKey] ? { ...current, [errorKey]: undefined } : current,
    );
  }

  async function handleSave() {
    setServerError("");

    const nextErrors: FormErrors = {};
    if (form.name.trim().length < 2) {
      nextErrors.name = "Indiquez le nom du client.";
    }
    if (form.phone.trim().length < 8) {
      nextErrors.phone = "Indiquez un numéro de téléphone valide.";
    }

    setErrors(nextErrors);
    if (nextErrors.name) {
      nameRef.current?.focus();
      return;
    }
    if (nextErrors.phone) {
      phoneRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    try {
      if (id) {
        await updateClient.mutateAsync({ id, ...form });
      } else {
        await createClient.mutateAsync(form);
      }
      allowLeave();
      router.back();
    } catch (mutationError) {
      setServerError(
        mutationError instanceof Error ? mutationError.message : "Enregistrement impossible.",
      );
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? "Modifier le client" : "Nouveau client" }} />
      <KeyboardForm
        footer={
          <FormFooter
            submitLabel={id ? "Enregistrer les modifications" : "Créer le client"}
            onSubmit={() => void handleSave()}
            loading={createClient.isPending || updateClient.isPending}
            error={serverError}
          />
        }
      >
        <FormSection
          title="Essentiel"
          description="Les informations nécessaires pour joindre le client. Les champs marqués * sont requis."
        >
          <FormField
            label="Nom complet"
            required
            inputRef={nameRef}
            value={form.name}
            onChangeText={(value) => update("name", value)}
            placeholder="Nom et prénom du client"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={errors.name}
          />
          <FormField
            label="Téléphone"
            required
            inputRef={phoneRef}
            value={form.phone}
            onChangeText={(value) => update("phone", value)}
            placeholder="06 00 00 00 00"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
            error={errors.phone}
            hint="Utilisé pour les appels et WhatsApp."
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
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => cityRef.current?.focus()}
          />
        </FormSection>

        <FormSection
          title="Localisation"
          description="Pour les itinéraires et les visites de chantier."
        >
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
            onSubmitEditing={() => notesRef.current?.focus()}
            hint="Sert au bouton Itinéraire dans fiche client."
          />
        </FormSection>

        <FormSection title="Suivi" description="Statut du client et notes internes.">
          <FormChoice
            label="Statut"
            value={form.status}
            options={statusOptions}
            onChange={(value) => update("status", value as ClientStatus)}
          />
          <FormField
            label="Notes"
            optional
            inputRef={notesRef}
            value={form.notes}
            onChangeText={(value) => update("notes", value)}
            placeholder="Préférences, informations utiles, historique…"
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
