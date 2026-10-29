import Constants from "expo-constants";
import { clearStoredToken, getStoredToken } from "@/auth/storage";

const configuredApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const devHost = Constants.expoConfig?.hostUri?.replace(/:\d+$/, "") ?? "";
const useConfiguredApiInDev = configuredApiUrl.startsWith("https://");
const API_URL =
  __DEV__ && devHost && !useConfiguredApiInDev
    ? `http://${devHost}:3000`
    : configuredApiUrl;

export const apiBaseUrl = API_URL;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, "EXPO_PUBLIC_API_URL n'est pas configurée.");
  }

  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = await getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((error) => {
    if (__DEV__) {
      console.warn(`API request failed: ${method} ${API_URL}${path}`, error);
    }
    throw new ApiError(
      0,
      __DEV__
        ? "Serveur d’administration injoignable. Lancez « pnpm dev » dans kitchen-landing (port 3000)."
        : "Connexion impossible. Vérifiez votre réseau.",
    );
  });

  if (response.status === 401) {
    if (auth) {
      await clearStoredToken();
      onUnauthorized?.();
    }
    throw new ApiError(401, "Session expirée. Reconnectez-vous.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(payload));
  }

  return payload as T;
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return String((payload as { message: unknown }).message);
  }
  return "Une erreur est survenue. Réessayez dans quelques instants.";
}
