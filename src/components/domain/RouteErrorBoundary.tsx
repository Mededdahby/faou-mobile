import { Ionicons } from "@expo/vector-icons";
import type { ErrorBoundaryProps } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/ui";
import { colors, fontSize, spacing } from "@/theme/tokens";

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.primary} />
      <Text style={styles.title}>Impossible de charger les données</Text>
      <Text style={styles.message}>{error.message}</Text>
      <PrimaryButton label="Réessayer" variant="outline" onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "center",
  },
  message: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
  },
});
