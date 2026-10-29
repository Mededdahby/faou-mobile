import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setUnauthorizedHandler } from "@/api/client";
import { api } from "@/api/endpoints";
import { unregisterPushToken } from "@/notifications/push";
import { clearSession, getStoredEmail, getStoredToken, storeSession } from "./storage";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionValue {
  status: SessionStatus;
  email: string | null;
  isPreview: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEV_BYPASS = __DEV__ && process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === "true";

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>(
    DEV_BYPASS ? "authenticated" : "loading",
  );
  const [email, setEmail] = useState<string | null>(DEV_BYPASS ? "mode aperçu" : null);

  const signOut = useCallback(async () => {
    await unregisterPushToken();
    await clearSession();
    queryClient.clear();
    setEmail(null);
    setStatus("anonymous");
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    if (DEV_BYPASS) return;

    let active = true;

    async function hydrate() {
      const [token, storedEmail] = await Promise.all([getStoredToken(), getStoredEmail()]);
      if (!active) return;

      if (token) {
        setEmail(storedEmail);
        setStatus("authenticated");
      } else {
        setStatus("anonymous");
      }
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    const result = await api.login({ email: emailInput.trim(), password });
    const nextEmail = result.email || emailInput.trim();

    await storeSession(result.token, nextEmail);
    setEmail(nextEmail);
    setStatus("authenticated");
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ status, email, isPreview: DEV_BYPASS, signIn, signOut }),
    [status, email, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
