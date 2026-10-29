import { Redirect, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSession } from "@/auth/session";
import { BrandLoader } from "@/components/domain/BrandLoader";
import { colors } from "@/theme/tokens";

export { RouteErrorBoundary as ErrorBoundary } from "@/components/domain/RouteErrorBoundary";

export default function AppLayout() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <View style={styles.centered}>
        <BrandLoader label="Chargement…" />
      </View>
    );
  }

  if (status !== "authenticated") {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontSize: 17, fontWeight: "600" },
        headerShadowVisible: false,
        headerBackTitle: "Retour",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="demandes/index" options={{ title: "Demandes" }} />
      <Stack.Screen name="demandes/[id]" options={{ title: "Demande" }} />
      <Stack.Screen name="projets/[id]/index" options={{ title: "Projet" }} />
      <Stack.Screen name="projets/[id]/photos/index" options={{ title: "Photos" }} />
      <Stack.Screen name="projets/[id]/photos/nouveau" options={{ title: "Nouvelle photo" }} />
      <Stack.Screen name="projets/[id]/photos/rapport" options={{ title: "Rapport" }} />
      <Stack.Screen name="projets/[id]/tasks/index" options={{ title: "Tâches" }} />
      <Stack.Screen name="projets/[id]/tasks/editeur" options={{ title: "Tâche" }} />
      <Stack.Screen name="equipe/index" options={{ title: "Équipe" }} />
      <Stack.Screen name="equipe/editeur" options={{ title: "Membre" }} />
      <Stack.Screen name="projets/editeur" options={{ title: "Projet" }} />
      <Stack.Screen name="clients/[id]" options={{ title: "Client" }} />
      <Stack.Screen name="clients/editeur" options={{ title: "Client" }} />
      <Stack.Screen name="devis/index" options={{ title: "Devis & factures" }} />
      <Stack.Screen name="devis/[id]" options={{ title: "Document" }} />
      <Stack.Screen name="devis/editeur" options={{ title: "Devis" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="reglages" options={{ title: "Réglages", presentation: "modal" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
