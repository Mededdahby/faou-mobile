import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { api } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import {
  useLiveDocuments,
  useLiveNotifications,
  useLiveUpcomingTasks,
} from "@/convex/hooks";
import { ensureNotificationChannels } from "./channels";
import { clearLocalReminders, syncLocalReminders } from "./local";
import {
  openNotificationSettings,
  readNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from "./permissions";
import { registerPushToken, unregisterPushToken } from "./push";
import { safeNotificationRoute } from "./routes";

const LOCAL_ENABLED_KEY = "faou_local_notifications_enabled";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

interface NotificationContextValue {
  permission: NotificationPermission;
  localEnabled: boolean;
  pushToken: string | null;
  busy: boolean;
  enable: () => Promise<void>;
  setLocalEnabled: (enabled: boolean) => Promise<void>;
  sendTest: () => Promise<void>;
  refresh: () => Promise<void>;
  openSettings: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  const notifications = useLiveNotifications(50);
  const upcomingTasks = useLiveUpcomingTasks(45);
  const documentsPage = useLiveDocuments();

  const [permission, setPermission] = useState<NotificationPermission>("undetermined");
  const [localEnabled, setLocalEnabledState] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pendingDataRef = useRef<Record<string, unknown> | null>(null);
  const handledResponseRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef(false);

  const refresh = useCallback(async () => {
    setPermission(await readNotificationPermission());
  }, []);

  const navigate = useCallback(
    (data: Record<string, unknown>) => {
      const route = safeNotificationRoute(
        typeof data.route === "string" ? data.route : null,
      );
      const notificationId =
        typeof data.notificationId === "string" ? data.notificationId : null;
      if (notificationId) {
        void api.notifications.markRead(notificationId).catch(() => undefined);
      }
      router.push(route as never);
    },
    [router],
  );

  const handleData = useCallback(
    (data: Record<string, unknown>) => {
      if (status === "authenticated") {
        navigate(data);
      } else {
        pendingDataRef.current = data;
      }
    },
    [navigate, status],
  );

  useEffect(() => {
    let active = true;
    void ensureNotificationChannels();
    void readNotificationPermission().then((next) => {
      if (active) setPermission(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void SecureStore.getItemAsync(LOCAL_ENABLED_KEY)
      .then((value) => {
        if (value === "false") setLocalEnabledState(false);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
      return;
    }

    if (status === "anonymous" && wasAuthenticatedRef.current) {
      wasAuthenticatedRef.current = false;
      setPushToken(null);
      void unregisterPushToken();
      void clearLocalReminders();
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || permission !== "granted") return;

    let active = true;
    void registerPushToken().then((token) => {
      if (active) setPushToken(token);
    });
    return () => {
      active = false;
    };
  }, [permission, status]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const identifier = response.notification.request.identifier;
        if (handledResponseRef.current === identifier) return;
        handledResponseRef.current = identifier;
        handleData(response.notification.request.content.data ?? {});
      },
    );
    return () => subscription.remove();
  }, [handleData]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (status === "authenticated" && pendingDataRef.current) {
      const data = pendingDataRef.current;
      pendingDataRef.current = null;
      navigate(data);
    }
  }, [navigate, status]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      const identifier = response.notification.request.identifier;
      if (handledResponseRef.current === identifier) return;
      handledResponseRef.current = identifier;
      handleData(response.notification.request.content.data ?? {});
    });

    return () => {
      active = false;
    };
  }, [handleData]);

  useEffect(() => {
    if (status !== "authenticated" || permission !== "granted") {
      if (status === "authenticated") void clearLocalReminders();
      return;
    }

    if (!localEnabled) {
      void clearLocalReminders();
      return;
    }

    const timer = setTimeout(() => {
      void syncLocalReminders(upcomingTasks ?? [], documentsPage?.page ?? []).catch(
        (error) => {
          if (__DEV__) console.warn("Local reminder sync failed", error);
        },
      );
    }, 700);

    return () => clearTimeout(timer);
  }, [documentsPage, localEnabled, permission, status, upcomingTasks]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void Notifications.setBadgeCountAsync(notifications?.unreadCount ?? 0).catch(
      () => undefined,
    );
  }, [notifications?.unreadCount]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      await ensureNotificationChannels();
      const next = await requestNotificationPermission();
      setPermission(next);
      if (next === "granted") {
        setPushToken(await registerPushToken());
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const setLocalEnabled = useCallback(async (enabled: boolean) => {
    setLocalEnabledState(enabled);
    await SecureStore.setItemAsync(LOCAL_ENABLED_KEY, enabled ? "true" : "false").catch(
      () => undefined,
    );

    if (enabled) {
      const next = await requestNotificationPermission();
      setPermission(next);
      if (next === "granted") {
        setPushToken(await registerPushToken());
      }
    } else {
      await clearLocalReminders();
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    try {
      await api.notifications.test();
    } catch (error) {
      if (__DEV__) console.warn("Test notification failed", error);
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      permission,
      localEnabled,
      pushToken,
      busy,
      enable,
      setLocalEnabled,
      sendTest,
      refresh,
      openSettings: openNotificationSettings,
    }),
    [busy, enable, localEnabled, permission, pushToken, refresh, sendTest, setLocalEnabled],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationProvider");
  return value;
}
