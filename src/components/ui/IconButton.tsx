import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  badge?: number;
  dark?: boolean;
}

export function IconButton({ icon, onPress, label, badge = 0, dark = false }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        dark && styles.buttonDark,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={dark ? colors.white : colors.inkSoft}
      />
      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 42,
    width: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  buttonDark: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  pressed: {
    opacity: 0.65,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cta,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeLabel: {
    fontSize: fontSize.micro,
    fontWeight: "700",
    color: colors.white,
  },
});
