import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { Field, PrimaryButton } from "@/components/ui";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const { status, signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === "authenticated") {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    setError(null);

    if (!email.trim() || !password) {
      setError("Renseignez votre email et votre mot de passe.");
      return;
    }

    setSubmitting(true);

    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Connexion impossible. Vérifiez votre réseau et réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>F</Text>
            </View>
            <Text style={styles.brandName}>
              FAOU <Text style={styles.brandAccent}>DESIGN</Text>
            </Text>
            <Text style={styles.brandHint}>Administration</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Accédez à vos demandes, projets et documents.
            </Text>

            <View style={styles.form}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />

              <View style={styles.passwordWrapper}>
                <Field
                  label="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Votre mot de passe"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={() => void handleSubmit()}
                  style={styles.passwordInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                  }
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={8}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <PrimaryButton
                label="Se connecter"
                onPress={() => void handleSubmit()}
                loading={submitting}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
            <Text style={styles.footerText}>Accès sécurisé réservé à l’administration</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  brand: {
    alignItems: "center",
    gap: spacing.xs,
  },
  logoMark: {
    height: 56,
    width: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    marginBottom: spacing.sm,
  },
  logoLetter: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.accent,
  },
  brandName: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.ink,
  },
  brandAccent: {
    color: colors.primary,
  },
  brandHint: {
    fontSize: fontSize.small,
    fontWeight: "500",
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.small,
    lineHeight: 19,
    color: colors.muted,
  },
  form: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: "absolute",
    right: spacing.md,
    bottom: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.small,
    lineHeight: 18,
    color: colors.danger,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
});
