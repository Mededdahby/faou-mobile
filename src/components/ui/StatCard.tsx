import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Tone } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const tonePalette: Record<Tone, { background: string; foreground: string }> = {
  blue: { background: "#E0F2FE", foreground: "#0369A1" },
  green: { background: "#DCFCE7", foreground: "#15803D" },
  amber: { background: "#FEF3C7", foreground: "#B45309" },
  red: { background: "#FEE2E2", foreground: "#B91C1C" },
  slate: { background: "#F1F5F9", foreground: "#475569" },
  violet: { background: "#EDE9FE", foreground: "#6D28D9" },
  orange: { background: "#FFEDD5", foreground: "#C2410C" },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  tone?: Tone;
}

export function StatCard({ label, value, icon, tone = "blue" }: StatCardProps) {
  const palette = tonePalette[tone];

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={16} color={palette.foreground} />
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  iconCircle: {
    height: 30,
    width: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: fontSize.caption,
    lineHeight: 14,
    color: colors.muted,
  },
});
