import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, type ColorValue } from "react-native";
import { colors } from "@/theme/tokens";

export { RouteErrorBoundary as ErrorBoundary } from "@/components/domain/RouteErrorBoundary";

type IconName = keyof typeof Ionicons.glyphMap;
type IconColor = ComponentProps<typeof Ionicons>["color"];

function tabIcon(outline: IconName, filled: IconName) {
  return function TabBarIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return (
      <Ionicons
        name={focused ? filled : outline}
        size={size}
        color={color as IconColor}
      />
    );
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedSoft,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Accueil", tabBarIcon: tabIcon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="demandes"
        options={{
          title: "Demandes",
          tabBarIcon: tabIcon("mail-unread-outline", "mail-unread"),
        }}
      />
      <Tabs.Screen
        name="projets"
        options={{
          title: "Projets",
          tabBarIcon: tabIcon("briefcase-outline", "briefcase"),
        }}
      />
      <Tabs.Screen
        name="devis"
        options={{
          title: "Devis",
          tabBarIcon: tabIcon("document-text-outline", "document-text"),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: tabIcon("people-outline", "people"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
