import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui/Avatar";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface ActivityItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: IconName;
  avatarName?: string;
  right?: ReactNode;
  onPress?: () => void;
}

export function ActivityItem({
  title,
  subtitle,
  meta,
  icon,
  avatarName,
  right,
  onPress,
}: ActivityItemProps) {
  const content = (
    <>
      {avatarName ? (
        <Avatar name={avatarName} size={40} />
      ) : icon ? (
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={17} color={colors.primaryDark} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {right}
      {onPress && !right ? (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  meta: {
    fontSize: fontSize.micro,
    fontWeight: "500",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
  pressed: {
    opacity: 0.6,
  },
});
