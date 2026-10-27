import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { apiBaseUrl } from "@/api/client";
import { useSession } from "@/auth/session";
import { Card, PrimaryButton, Screen } from "@/components/ui";
import { colors, fontSize, spacing } from "@/theme/tokens";

export default function ReglagesScreen() {
  const router = useRouter();
  const { email, isPreview, signOut } = useSession();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <Screen scroll edges={[]}>
      <View style={styles.stack}>
        <Card>
          <Text style={styles.label}>Compte</Text>
          <Text style={styles.value}>{email ?? "—"}</Text>
          {isPreview ? (
            <Text style={styles.hint}>
              Mode aperçu actif. Il est désactivé automatiquement dans les builds de
              production.
            </Text>
          ) : (
            <Text style={styles.hint}>
              Le jeton de session est conservé dans le coffre sécurisé de l’appareil.
            </Text>
          )}
        </Card>

        <Card>
          <Text style={styles.label}>API</Text>
          <Text style={styles.value} selectable>
            {apiBaseUrl || "Non configurée"}
          </Text>
          <Text style={styles.hint}>Détectée depuis le serveur de développement, ou EXPO_PUBLIC_API_URL en production.</Text>
        </Card>

        <Card>
          <Text style={styles.label}>Application</Text>
          <Text style={styles.value}>
            FAOU Admin {Constants.expoConfig?.version ?? "0.1.0"}
          </Text>
          <Text style={styles.hint}>
            {Constants.expoConfig?.name ?? "FAOU Admin"} ·{" "}
            {Constants.expoConfig?.android?.package ?? "com.faoudesign.admin"}
          </Text>
        </Card>

        <View style={styles.logout}>
          <PrimaryButton label="Se déconnecter" onPress={handleSignOut} variant="danger" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
  },
  value: {
    marginTop: spacing.xs,
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: fontSize.small,
    lineHeight: 18,
    color: colors.muted,
  },
  logout: {
    marginTop: spacing.md,
  },
});
