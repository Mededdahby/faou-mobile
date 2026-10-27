import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/theme/tokens";

const palettes = [
  { background: colors.primarySoft, foreground: colors.primaryDark },
  { background: colors.accentSoft, foreground: colors.cta },
  { background: colors.successSoft, foreground: colors.success },
  { background: colors.violetSoft, foreground: colors.violet },
];

function hash(value: string) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total += value.charCodeAt(index);
  }
  return total;
}

interface AvatarProps {
  name: string;
  size?: number;
  dark?: boolean;
}

export function Avatar({ name, size = 40, dark = false }: AvatarProps) {
  const trimmed = name.trim();
  const initials = trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("") || "?";
  const palette = dark
    ? { background: colors.ink, foreground: colors.accent }
    : palettes[hash(trimmed) % palettes.length];

  return (
    <View
      style={[
        styles.avatar,
        {
          height: size,
          width: size,
          borderRadius: size / 2,
          backgroundColor: palette.background,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: palette.foreground, fontSize: Math.max(11, Math.round(size * 0.34)) },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
