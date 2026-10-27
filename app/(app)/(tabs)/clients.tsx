import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Card,
  EmptyState,
  IconButton,
  Screen,
  SearchBar,
  Skeleton,
  StatusPill,
} from "@/components/ui";
import { Chip, PageHeader } from "@/components/domain/DetailKit";
import { useLiveClients } from "@/convex/hooks";
import { callPhone } from "@/lib/links";
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
      <PageHeader
        title="Clients"
        subtitle={`${(clients ?? []).length} client${
          (clients ?? []).length === 1 ? "" : "s"
        } dans votre répertoire`}
        right={
          <IconButton
            icon="add"
            label="Nouveau client"
            dark
            onPress={() => router.push("/clients/editeur")}
          />
        }
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Nom, email, téléphone ou ville…"
      />

      <View style={styles.filters}>
        {filters.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>

      {clients === undefined ? (
        <View style={styles.list}>
          {[0, 1, 2].map((index) => (
            <Card key={index} style={styles.card}>
              <View style={styles.row}>
                <Skeleton width={46} height={46} radius={23} />
                <View style={styles.skeletonBody}>
                  <Skeleton width="50%" height={14} />
                  <Skeleton width="35%" height={10} />
                </View>
                <Skeleton width={54} height={22} radius={11} />
              </View>
            </Card>
          ))}
        </View>
      ) : visible.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="people-outline"
            title="Aucun client"
            description={
              search
                ? "Aucun client ne correspond à cette recherche."
                : "Ajoutez votre premier client pour relier projets et documents."
            }
            actionLabel={search ? "Effacer la recherche" : "Créer un client"}
            onAction={
              search ? () => setSearch("") : () => router.push("/clients/editeur")
            }
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((client) => (
            <Pressable
              key={client.id}
              accessibilityRole="button"
              onPress={() => router.push(`/clients/${client.id}`)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Avatar name={client.name} size={46} />
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
                </View>
                <View style={styles.footer}>
                  <Text style={styles.email} numberOfLines={1}>
                    {client.email || "Aucun email"}
                  </Text>
                  <View style={styles.footerActions}>
                    {client.phone ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Appeler ${client.name}`}
                        onPress={() => void callPhone(client.phone)}
                        hitSlop={6}
                        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                      >
                        <Ionicons name="call-outline" size={15} color={colors.primaryDark} />
                      </Pressable>
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} />
                  </View>
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
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  email: {
    flex: 1,
    fontSize: fontSize.caption + 1,
    color: colors.mutedSoft,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  action: {
    height: 30,
    width: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  skeletonBody: {
    flex: 1,
    gap: spacing.sm,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
