import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "@/theme/tokens";

export function LaunchOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.96));
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1050,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setFading(true);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, 1350);

    return () => clearTimeout(timer);
  }, [opacity, progress, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents={fading ? "none" : "auto"}
      style={[styles.overlay, { opacity }]}
    >
      <Animated.Image
        source={require("../../../assets/splash-icon.png")}
        style={[styles.logo, { transform: [{ scale }] }]}
        resizeMode="contain"
      />
      <View style={styles.track}>
        <Animated.View style={[styles.bar, { transform: [{ scaleX: progress }] }]} />
      </View>
      <Text style={styles.caption}>Chargement de l’administration</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    backgroundColor: colors.background,
  },
  logo: {
    width: 260,
    height: 130,
  },
  track: {
    width: 132,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  bar: {
    height: "100%",
    width: "100%",
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  caption: {
    fontSize: fontSize.caption + 1,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
});
