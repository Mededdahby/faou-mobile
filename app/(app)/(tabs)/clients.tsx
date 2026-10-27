import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card, EmptyState, Screen, StatusPill } from "@/components/ui";
import { useLiveClients } from "@/convex/hooks";
import { colors, fontSize, radius, spacing } from "@/theme/tokens";

const filters = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "inactive", label: "Inactifs" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

export default function ClientsScreen() {
  const router = useRouter();
  const clients = useLiveClients();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (clients ?? []).filter((client) => {
      if (filter !== "all" && client.status !== filter) return false;
      if (!query) return true;
      return [client.name, client.email, client.phone, client.city]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [clients, filter, search]);

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Administration</Text>
          <Text style={styles.title}>Clients</Text>
          <Text style={styles.subtitle}>
            {(clients ?? []).length} client{(clients ?? []).length === 1 ? "" : "s"} au total
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/clients/editeur")}
          style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
        >
          <Text style={styles.newLabel}>+ Nouveau</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher un client…"
        placeholderTextColor={colors.mutedSoft}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      <View style={styles.filters}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {clients === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="people-outline"
            title="Aucun client"
            description="Les clients de ce filtre apparaîtront ici."
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((client) => (
            <Pressable
              key={client.id}
              onPress={() => router.push(`/clients/${client.id}`)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(client.name || "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[client.city, client.phone].filter(Boolean).join(" · ") || "—"}
                  </Text>
                </View>
                <StatusPill
                  label={client.status === "inactive" ? "Inactif" : "Actif"}
                  tone={client.status === "inactive" ? "slate" : "green"}
                />
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  header: {
    flex: 1,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  newButton: {
    marginTop: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newLabel: {
    fontSize: fontSize.small,
    fontWeight: "700",
    color: colors.white,
  },
  eyebrow: {
    fontSize: fontSize.caption,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  search: {
    marginTop: spacing.lg,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  filters: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filter: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  filterActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterLabel: {
    fontSize: fontSize.caption + 1,
    fontWeight: "600",
    color: colors.muted,
  },
  filterLabelActive: {
    color: colors.white,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  avatarText: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.primary,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.ink,
  },
  meta: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.7,
  },
});
