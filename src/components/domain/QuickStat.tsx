import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Tone } from "@/lib/status";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

const palettes: Record<Tone, { background: string; foreground: string }> = {
  blue: { background: colors.primarySoft, foreground: colors.primaryDark },
  green: { background: colors.successSoft, foreground: colors.success },
  amber: { background: colors.warningSoft, foreground: colors.warning },
  red: { background: colors.dangerSoft, foreground: colors.danger },
  slate: { background: colors.surfaceMuted, foreground: colors.muted },
  violet: { background: colors.violetSoft, foreground: colors.violet },
  orange: { background: colors.accentSoft, foreground: colors.cta },
};

interface QuickStatProps {
  icon: IconName;
  label: string;
  count?: number;
  tone?: Tone;
  onPress: () => void;
}

export function QuickStat({ icon, label, count, tone = "blue", onPress }: QuickStatProps) {
  const palette = palettes[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={[styles.circle, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={23} color={palette.foreground} />
        {count !== undefined ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{count > 99 ? "99+" : count}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs + 2,
    minWidth: 0,
  },
  circle: {
    height: 58,
    width: 58,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  badgeLabel: {
    fontSize: fontSize.micro,
    fontWeight: "700",
    color: colors.ink,
  },
  label: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.inkSoft,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.65,
  },
});
