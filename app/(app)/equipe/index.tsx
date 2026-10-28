import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import { useLiveTeamMembers } from "@/convex/hooks";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

export default function TeamScreen() {
  const router = useRouter();
  const members = useLiveTeamMembers(false);
  const active = (members ?? []).filter((member) => member.active);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Équipe</Text>
          <Text style={styles.subtitle}>
            {active.length} actif{active.length === 1 ? "" : "s"} sur {members?.length ?? 0}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/equipe/editeur")}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={17} color={colors.white} />
          <Text style={styles.addLabel}>Membre</Text>
        </Pressable>
      </View>

      {members === undefined ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.loadingText}>Chargement…</Text>
        </Card>
      ) : members.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="people-outline"
            title="Aucun membre"
            description="Ajoutez les personnes qui interviennent sur vos chantiers."
            actionLabel="Ajouter un membre"
            onAction={() => router.push("/equipe/editeur")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {members.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              onPress={() => router.push(`/equipe/editeur?id=${member.id}`)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Avatar name={member.name} size={44} />
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[member.role, member.phone].filter(Boolean).join(" · ") || "—"}
                    </Text>
                    {member.email ? (
                      <Text style={styles.email} numberOfLines={1}>
                        {member.email}
                      </Text>
                    ) : null}
                  </View>
                  <StatusPill
                    label={member.active ? "Actif" : "Inactif"}
                    tone={member.active ? "green" : "slate"}
                  />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  addLabel: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.white,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.ink,
  },
  meta: {
    fontSize: fontSize.caption + 1,
    color: colors.muted,
  },
  email: {
    fontSize: fontSize.caption,
    color: colors.mutedSoft,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  loadingText: {
    paddingVertical: spacing.md,
    fontSize: fontSize.small,
    color: colors.muted,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
