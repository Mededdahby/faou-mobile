import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";
import { Card, EmptyState, Screen } from "@/components/ui";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

interface PlaceholderScreenProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  phase: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  edges?: Edge[];
}

export function PlaceholderScreen({
  eyebrow,
  title,
  subtitle,
  phase,
  description,
  icon,
  edges = ["top"],
}: PlaceholderScreenProps) {
  return (
    <Screen scroll edges={edges}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.phase}>
            <Text style={styles.phaseText}>{phase}</Text>
          </View>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <Card style={styles.card}>
        <EmptyState icon={icon} title="Écran prêt à construire" description={description} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.primary,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.ink,
  },
  phase: {
    borderRadius: radius.full,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  phaseText: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    color: "#0369A1",
  },
  subtitle: {
    fontSize: fontSize.body,
    lineHeight: 21,
    color: colors.muted,
  },
  card: {
    marginTop: spacing.lg,
  },
});
