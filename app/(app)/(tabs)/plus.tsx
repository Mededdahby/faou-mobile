import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/auth/session";
import { PageHeader } from "@/components/domain/DetailKit";
import { Avatar, Card, Screen } from "@/components/ui";
import { useLiveClients, useLiveDocuments } from "@/convex/hooks";
import { useSummary } from "@/hooks/queries";
import { openUrl } from "@/lib/links";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface MenuRowProps {
  icon: IconName;
  label: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}

function MenuRow({
  icon,
  label,
  subtitle,
  badge,
  onPress,
  danger = false,
  last = false,
}: MenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}
    >
      <View style={[styles.iconCircle, danger && styles.iconCircleDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? colors.danger : colors.primaryDark}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.sectionCard}>{children}</Card>
    </View>
  );
}

export default function PlusScreen() {
  const router = useRouter();
  const { email, signOut } = useSession();
  const summary = useSummary();
  const documents = useLiveDocuments();
  const clients = useLiveClients();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const documentCount = documents?.page.length ?? 0;
  const clientCount = clients?.length ?? 0;

  function handleLogout() {
    Alert.alert("Se déconnecter", "Vous devrez vous reconnecter pour accéder à l’application.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  }

  return (
    <Screen scroll>
      <PageHeader title="Plus" subtitle="Gestion, documents et paramètres de l’application." />

      <View style={styles.profile}>
        <Avatar name={email ?? "Admin"} size={52} />
        <View style={styles.profileText}>
          <Text style={styles.profileName}>Administrateur</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {email ?? "—"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les réglages"
          onPress={() => router.push("/reglages")}
          style={({ pressed }) => [styles.profileAction, pressed && styles.pressed]}
        >
          <Ionicons name="settings-outline" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <Section title="Gestion">
        <MenuRow
          icon="mail-unread-outline"
          label="Demandes"
          subtitle="Leads et demandes de contact"
          badge={summary.data ? String(summary.data.leads.new) : undefined}
          onPress={() => router.push("/demandes")}
        />
        <MenuRow
          icon="document-text-outline"
          label="Devis & factures"
          subtitle="Documents, paiements et partage"
          badge={documentCount > 0 ? String(documentCount) : undefined}
          onPress={() => router.push("/devis")}
        />
        <MenuRow
          icon="calendar-outline"
          label="Planning"
          subtitle="Démarrages et échéances"
          onPress={() => router.push("/planning")}
        />
        <MenuRow
          icon="people-outline"
          label="Clients"
          subtitle="Coordonnées et projets liés"
          badge={clientCount > 0 ? String(clientCount) : undefined}
          onPress={() => router.push("/clients")}
        />
        <MenuRow
          icon="people-circle-outline"
          label="Équipe"
          subtitle="Membres et assignations"
          onPress={() => router.push("/equipe")}
          last
        />
      </Section>

      <Section title="Application">
        <MenuRow
          icon="settings-outline"
          label="Réglages"
          subtitle="Session, sécurité et environnement"
          onPress={() => router.push("/reglages")}
        />
        <MenuRow
          icon="globe-outline"
          label="Voir le site"
          subtitle="faoudesign.com"
          onPress={() => void openUrl("https://www.faoudesign.com")}
          last
        />
      </Section>

      <Section title="Session">
        <MenuRow
          icon="log-out-outline"
          label="Se déconnecter"
          onPress={handleLogout}
          danger
          last
        />
      </Section>

      <Text style={styles.version}>FAOU DESIGN Admin · version {version}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    padding: spacing.lg,
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.white,
  },
  profileEmail: {
    fontSize: fontSize.caption + 1,
    color: "rgba(255, 255, 255, 0.66)",
  },
  profileAction: {
    height: 38,
    width: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.muted,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  iconCircleDanger: {
    backgroundColor: colors.dangerSoft,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  rowSubtitle: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  dangerText: {
    color: colors.danger,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  badgeLabel: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    color: colors.inkSoft,
  },
  pressed: {
    opacity: 0.6,
  },
  version: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    textAlign: "center",
    fontSize: fontSize.caption,
    letterSpacing: 0.4,
    color: colors.mutedSoft,
  },
});
