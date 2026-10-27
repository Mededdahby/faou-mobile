import { apiRequest, apiUrl } from "./client";
import type {
  AuthResponse,
  Client,
  ClientInput,
  CommercialDocument,
  DocumentInput,
  DocumentPage,
  DocumentStatus,
  LoginInput,
  Project,
  ProjectInput,
  Submission,
  SubmissionStatus,
  Summary,
} from "./types";

export const api = {
  // Auth (Phase 0 backend)
  login: (input: LoginInput) =>
    apiRequest<AuthResponse>("/api/mobile/v1/auth/login", {
      method: "POST",
      body: input,
      auth: false,
    }),
  logout: () => apiRequest<{ success: boolean }>("/api/mobile/v1/auth/logout", { method: "POST" }),
  me: () => apiRequest<{ email: string }>("/api/mobile/v1/auth/me"),

  // Dashboard (Phase 0 backend)
  summary: () => apiRequest<Summary>("/api/mobile/v1/summary"),

  submissions: {
    list: () =>
      apiRequest<{ data: Submission[] }>("/api/admin/submissions").then((result) => result.data),
    updateStatus: (id: string, status: SubmissionStatus) =>
      apiRequest<{ success: boolean }>("/api/admin/submissions", {
        method: "PATCH",
        body: { id, status },
      }),
    createProject: (id: string) =>
      apiRequest<{ success: boolean; projectId: string }>("/api/admin/submissions", {
        method: "POST",
        body: { id },
      }),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/admin/submissions", {
        method: "DELETE",
        body: { id },
      }),
  },

  clients: {
    list: () => apiRequest<{ data: Client[] }>("/api/admin/clients").then((result) => result.data),
    create: (input: ClientInput) =>
      apiRequest<{ success: boolean }>("/api/admin/clients", { method: "POST", body: input }),
    update: (input: Partial<ClientInput> & { id: string }) =>
      apiRequest<{ success: boolean }>("/api/admin/clients", { method: "PUT", body: input }),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/admin/clients", {
        method: "DELETE",
        body: { id },
      }),
  },

  projects: {
    list: () =>
      apiRequest<{ data: Project[] }>("/api/admin/projects").then((result) => result.data),
    create: (input: ProjectInput) =>
      apiRequest<{ success: boolean; id: string }>("/api/admin/projects", {
        method: "POST",
        body: input,
      }),
    update: (input: Partial<ProjectInput> & { id: string }) =>
      apiRequest<{ success: boolean }>("/api/admin/projects", { method: "PUT", body: input }),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/admin/projects", {
        method: "DELETE",
        body: { id },
      }),
  },

  documents: {
    list: (cursor: string | null = null) =>
      apiRequest<{ data: DocumentPage }>(
        `/api/admin/documents${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      ).then((result) => result.data),
    get: (id: string) =>
      apiRequest<{ data: CommercialDocument | null }>(
        `/api/admin/documents?id=${encodeURIComponent(id)}`,
      ).then((result) => result.data),
    save: (input: DocumentInput) =>
      apiRequest<{ data: CommercialDocument }>("/api/admin/documents", {
        method: "POST",
        body: input,
      }).then((result) => result.data),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/admin/documents", {
        method: "DELETE",
        body: { id },
      }),
    updateFinance: (input: {
      id: string;
      status?: DocumentStatus;
      amountPaidCents?: number;
      dueDate?: string | null;
      projectId?: string | null;
    }) =>
      apiRequest<{ data: CommercialDocument }>("/api/admin/documents/finance", {
        method: "PATCH",
        body: input,
      }).then((result) => result.data),
    convert: (id: string, date: string) =>
      apiRequest<{ data: CommercialDocument }>("/api/admin/documents", {
        method: "PATCH",
        body: { id, date },
      }).then((result) => result.data),
    share: (id: string) =>
      apiRequest<{ token: string }>("/api/admin/documents/share", {
        method: "POST",
        body: { id },
      }),
    // PDF requires the bearer token, so fetch it and share the file natively.
    pdfPath: (id: string) => apiUrl(`/api/admin/documents/${id}/pdf`),
  },
};
