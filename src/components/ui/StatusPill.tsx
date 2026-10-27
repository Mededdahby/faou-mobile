import { StyleSheet, Text, View } from "react-native";
import type { Tone } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const tones: Record<Tone, { background: string; foreground: string }> = {
  blue: { background: colors.primarySoft, foreground: colors.primaryDark },
  green: { background: colors.successSoft, foreground: colors.success },
  amber: { background: colors.warningSoft, foreground: colors.warning },
  red: { background: colors.dangerSoft, foreground: colors.danger },
  slate: { background: colors.surfaceMuted, foreground: colors.muted },
  violet: { background: colors.violetSoft, foreground: colors.violet },
  orange: { background: colors.accentSoft, foreground: colors.cta },
};

export function StatusPill({
  label,
  tone = "slate",
  dot = true,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
}) {
  const palette = tones[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.background }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: palette.foreground }]} /> : null}
      <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  dot: {
    height: 5,
    width: 5,
    borderRadius: 3,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
