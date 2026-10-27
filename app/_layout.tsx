import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/auth/session";
import { convex } from "@/convex/client";
import { queryClient } from "@/lib/queryClient";
import { colors } from "@/theme/tokens";

function AppProviders({ children }: { children: ReactNode }) {
  const tree = (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );

  return convex ? <ConvexProvider client={convex}>{tree}</ConvexProvider> : tree;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
