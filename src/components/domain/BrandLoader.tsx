import { useEffect, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "@/theme/tokens";

export function BrandLoader({
  label,
  size = 48,
}: {
  label?: string;
  size?: number;
}) {
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 950,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.wrapper}>
      <View style={{ height: size, width: size }}>
        <Image
          source={require("../../../assets/icon.png")}
          style={[
            styles.icon,
            { height: size * 0.6, width: size * 0.6, borderRadius: size * 0.16 },
          ]}
          resizeMode="cover"
        />
        <Animated.View
          style={[
            styles.spinner,
            {
              height: size,
              width: size,
              borderRadius: size / 2,
              transform: [{ rotate }],
            },
          ]}
        />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    position: "absolute",
    top: "20%",
    left: "20%",
    backgroundColor: colors.ink,
  },
  spinner: {
    position: "absolute",
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    borderTopColor: colors.accent,
    borderRightColor: colors.primary,
  },
  label: {
    fontSize: fontSize.caption + 1,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
});
