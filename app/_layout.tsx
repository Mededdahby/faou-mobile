import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider } from "convex/react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/auth/session";
import { LaunchOverlay } from "@/components/domain/LaunchOverlay";
import { convex } from "@/convex/client";
import { queryClient } from "@/lib/queryClient";
import { NotificationProvider } from "@/notifications/NotificationProvider";
import { colors } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppProviders({ children }: { children: ReactNode }) {
  const tree = (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </SessionProvider>
    </QueryClientProvider>
  );

  return convex ? <ConvexProvider client={convex}>{tree}</ConvexProvider> : tree;
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <StatusBar style="dark" />
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <LaunchOverlay />
          </View>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
