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
  Payment,
  PaymentMethod,
  PhotoPhase,
  Project,
  ProjectInput,
  ProjectPhoto,
  ProjectTask,
  Submission,
  SubmissionStatus,
  Summary,
  TaskPriority,
  TaskStatus,
  TeamMember,
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

  uploads: {
    url: () =>
      apiRequest<{ uploadUrl: string }>("/api/mobile/v1/uploads/url", { method: "POST" }),
  },

  photos: {
    list: (projectId: string, phase?: PhotoPhase) =>
      apiRequest<{ data: ProjectPhoto[] }>(
        `/api/mobile/v1/photos?projectId=${encodeURIComponent(projectId)}${
          phase ? `&phase=${phase}` : ""
        }`,
      ).then((result) => result.data),
    create: (input: {
      projectId: string;
      storageId: string;
      thumbnailStorageId?: string;
      caption: string;
      room: string;
      phase: PhotoPhase;
      tags: string[];
      measurements?: string;
      takenAt?: string;
    }) =>
      apiRequest<{ data: { id: string } }>("/api/mobile/v1/photos", {
        method: "POST",
        body: input,
      }).then((result) => result.data.id),
    update: (input: {
      id: string;
      caption?: string;
      room?: string;
      phase?: PhotoPhase;
      tags?: string[];
      measurements?: string;
      takenAt?: string;
    }) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/photos", {
        method: "PATCH",
        body: input,
      }),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/photos", {
        method: "DELETE",
        body: { id },
      }),
  },

  team: {
    list: (activeOnly = false) =>
      apiRequest<{ data: TeamMember[] }>(
        `/api/mobile/v1/team${activeOnly ? "?activeOnly=true" : ""}`,
      ).then((result) => result.data),
    create: (input: { name: string; phone: string; email: string; role: string }) =>
      apiRequest<{ data: { id: string } }>("/api/mobile/v1/team", {
        method: "POST",
        body: input,
      }).then((result) => result.data.id),
    update: (input: {
      id: string;
      name?: string;
      phone?: string;
      email?: string;
      role?: string;
      active?: boolean;
    }) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/team", {
        method: "PATCH",
        body: input,
      }),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/team", {
        method: "DELETE",
        body: { id },
      }),
  },

  tasks: {
    list: (projectId: string) =>
      apiRequest<{ data: ProjectTask[] }>(
        `/api/mobile/v1/tasks?projectId=${encodeURIComponent(projectId)}`,
      ).then((result) => result.data),
    upcoming: () =>
      apiRequest<{ data: unknown[] }>("/api/mobile/v1/tasks?upcoming=true").then(
        (result) => result.data,
      ),
    create: (input: {
      projectId: string;
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeId?: string;
      dueDate?: string;
    }) =>
      apiRequest<{ data: { id: string } }>("/api/mobile/v1/tasks", {
        method: "POST",
        body: input,
      }).then((result) => result.data.id),
    update: (input: {
      id: string;
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: string | null;
    }) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/tasks", {
        method: "PATCH",
        body: input,
      }),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/tasks", {
        method: "DELETE",
        body: { id },
      }),
  },

  payments: {
    list: (documentId: string) =>
      apiRequest<{ data: Payment[] }>(
        `/api/mobile/v1/payments?documentId=${encodeURIComponent(documentId)}`,
      ).then((result) => result.data),
    create: (input: {
      documentId: string;
      amountCents: number;
      method: PaymentMethod;
      receivedAt: string;
      reference?: string;
      notes?: string;
    }) =>
      apiRequest<{ data: { id: string; receiptNumber: string } }>(
        "/api/mobile/v1/payments",
        { method: "POST", body: input },
      ).then((result) => result.data),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/payments", {
        method: "DELETE",
        body: { id },
      }),
  },

  reports: {
    create: (input: {
      projectId: string;
      title: string;
      summary: string;
      phase: PhotoPhase;
      photoIds: string[];
    }) =>
      apiRequest<{ data: { id: string } }>("/api/mobile/v1/reports", {
        method: "POST",
        body: input,
      }).then((result) => result.data.id),
    remove: (id: string) =>
      apiRequest<{ success: boolean }>("/api/mobile/v1/reports", {
        method: "DELETE",
        body: { id },
      }),
  },
};
