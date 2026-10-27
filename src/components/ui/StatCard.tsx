import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Tone } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const tonePalette: Record<Tone, { background: string; foreground: string }> = {
  blue: { background: colors.primarySoft, foreground: colors.primaryDark },
  green: { background: colors.successSoft, foreground: colors.success },
  amber: { background: colors.warningSoft, foreground: colors.warning },
  red: { background: colors.dangerSoft, foreground: colors.danger },
  slate: { background: colors.surfaceMuted, foreground: colors.muted },
  violet: { background: colors.violetSoft, foreground: colors.violet },
  orange: { background: colors.accentSoft, foreground: colors.cta },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  tone?: Tone;
  hint?: string;
}

export function StatCard({ label, value, icon, tone = "blue", hint }: StatCardProps) {
  const palette = tonePalette[tone];

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={17} color={palette.foreground} />
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
    height: 32,
    width: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.title + 1,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: fontSize.caption + 1,
    fontWeight: "500",
    color: colors.muted,
  },
  hint: {
    fontSize: fontSize.micro,
    color: colors.mutedSoft,
  },
});
