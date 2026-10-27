import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

export function BrandMark() {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <Text style={styles.markLetter}>F</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.wordmark}>
          FAOU <Text style={styles.wordmarkLight}>DESIGN</Text>
        </Text>
        <Text style={styles.tagline}>Agencement d&apos;intérieur</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  mark: {
    height: 38,
    width: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  markLetter: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.accent,
  },
  text: {
    gap: 1,
  },
  wordmark: {
    fontSize: fontSize.body,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: colors.ink,
  },
  wordmarkLight: {
    fontWeight: "400",
    color: colors.inkSoft,
  },
  tagline: {
    fontSize: fontSize.micro,
    fontWeight: "600",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.mutedSoft,
  },
});
