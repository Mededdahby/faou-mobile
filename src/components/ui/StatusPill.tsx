import { StyleSheet, Text, View } from "react-native";
import type { Tone } from "@/lib/status";
import { fontSize, radius, spacing } from "@/theme/tokens";

const tones: Record<Tone, { background: string; foreground: string }> = {
  blue: { background: "#E0F2FE", foreground: "#0369A1" },
  green: { background: "#DCFCE7", foreground: "#15803D" },
  amber: { background: "#FEF3C7", foreground: "#B45309" },
  red: { background: "#FEE2E2", foreground: "#B91C1C" },
  slate: { background: "#F1F5F9", foreground: "#475569" },
  violet: { background: "#EDE9FE", foreground: "#6D28D9" },
  orange: { background: "#FFEDD5", foreground: "#C2410C" },
};

export function StatusPill({ label, tone = "slate" }: { label: string; tone?: Tone }) {
  const palette = tones[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: "600",
  },
});
