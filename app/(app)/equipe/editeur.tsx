import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Keyboard, Pressable, StyleSheet, Text } from "react-native";
import { api } from "@/api/endpoints";
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
import { useLiveTeamMembers } from "@/convex/hooks";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const activeOptions = [
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
];

export default function TeamEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const members = useLiveTeamMembers(false);

  if (id && members === undefined) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  const member = id ? members?.find((item) => item.id === id) : undefined;

  if (id && !member) {
    return (
      <Screen>
        <ErrorBlock message="Ce membre n'existe plus." />
      </Screen>
    );
  }

  return (
    <TeamMemberForm
      key={id ?? "new"}
      id={id}
      initial={{
        name: member?.name ?? "",
        phone: member?.phone ?? "",
        email: member?.email ?? "",
        role: member?.role ?? "",
        active: member?.active ?? true,
      }}
    />
  );
}

function TeamMemberForm({
  id,
  initial,
}: {
  id?: string;
  initial: {
    name: string;
    phone: string;
    email: string;
    role: string;
    active: boolean;
  };
}) {
  const router = useRouter();
  const { markDirty, allowLeave } = useUnsavedChangesGuard();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [role, setRole] = useState(initial.role);
  const [active, setActive] = useState(initial.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nameRef = useRef<FieldInputRef>(null);
  const phoneRef = useRef<FieldInputRef>(null);
  const emailRef = useRef<FieldInputRef>(null);
  const roleRef = useRef<FieldInputRef>(null);

  function touch() {
    markDirty();
    setError("");
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      setError("Indiquez le nom du membre.");
      nameRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      if (id) {
        await api.team.update({ id, name: name.trim(), phone, email, role, active });
      } else {
        await api.team.create({ name: name.trim(), phone, email, role });
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

  function handleDelete() {
    if (!id) return;
    Alert.alert("Supprimer ce membre", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await api.team.remove(id);
            allowLeave();
            router.back();
          } catch (deleteError) {
            Alert.alert(
              "Erreur",
              deleteError instanceof Error
                ? deleteError.message
                : "Suppression impossible.",
            );
          }
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? "Modifier le membre" : "Nouveau membre" }} />
      <KeyboardForm
        footer={
          <FormFooter
            submitLabel={id ? "Enregistrer" : "Ajouter le membre"}
            onSubmit={() => void handleSave()}
            loading={busy}
            error={error}
          />
        }
      >
        <FormSection title="Membre" description="La personne qui intervient sur les chantiers.">
          <FormField
            label="Nom"
            required
            inputRef={nameRef}
            value={name}
            onChangeText={(value) => {
              setName(value);
              touch();
            }}
            placeholder="Nom complet"
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <FormField
            label="Téléphone"
            optional
            inputRef={phoneRef}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              touch();
            }}
            placeholder="06 00 00 00 00"
            keyboardType="phone-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <FormField
            label="Email"
            optional
            inputRef={emailRef}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              touch();
            }}
            placeholder="membre@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => roleRef.current?.focus()}
          />
          <FormField
            label="Rôle"
            optional
            inputRef={roleRef}
            value={role}
            onChangeText={(value) => {
              setRole(value);
              touch();
            }}
            placeholder="Installateur, menuisier, chef de chantier…"
          />
          <FormChoice
            label="Statut"
            value={active ? "active" : "inactive"}
            options={activeOptions}
            onChange={(value) => {
              setActive(value === "active");
              touch();
            }}
          />
        </FormSection>

        {id ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleDelete}
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          >
            <Text style={styles.deleteLabel}>Supprimer ce membre</Text>
          </Pressable>
        ) : null}
      </KeyboardForm>
    </>
  );
}

const styles = StyleSheet.create({
  delete: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FECACA",
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  deleteLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.danger,
  },
  pressed: {
    opacity: 0.6,
  },
});
