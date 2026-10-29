import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import type {
  ClientInput,
  DocumentInput,
  DocumentStatus,
  NotificationPreferences,
  ProjectInput,
  SubmissionStatus,
} from "@/api/types";

export const queryKeys = {
  summary: ["summary"] as const,
  submissions: ["submissions"] as const,
  projects: ["projects"] as const,
  clients: ["clients"] as const,
  documents: ["documents"] as const,
  notificationPreferences: ["notification-preferences"] as const,
};

export function useSummary() {
  return useQuery({ queryKey: queryKeys.summary, queryFn: api.summary });
}

export function useSubmissions() {
  return useQuery({ queryKey: queryKeys.submissions, queryFn: api.submissions.list });
}

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: api.projects.list });
}

export function useClients() {
  return useQuery({ queryKey: queryKeys.clients, queryFn: api.clients.list });
}

export function useDocuments() {
  return useQuery({ queryKey: queryKeys.documents, queryFn: () => api.documents.list() });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubmissionStatus }) =>
      api.submissions.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useCreateProjectFromSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.submissions.createProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.submissions.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientInput) => api.clients.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<ClientInput> & { id: string }) => api.clients.update(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.clients.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProjectInput) => api.projects.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<ProjectInput> & { id: string }) => api.projects.update(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.projects.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useUpdateDocumentFinance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      status?: DocumentStatus;
      amountPaidCents?: number;
      dueDate?: string | null;
      projectId?: string | null;
    }) => api.documents.updateFinance(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useConvertQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => api.documents.convert(id, date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useSaveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DocumentInput) => api.documents.save(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.documents.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: api.notifications.preferences,
  });
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<NotificationPreferences>) =>
      api.notifications.savePreferences(input),
    onSuccess: (_result, input) => {
      queryClient.setQueryData<NotificationPreferences | undefined>(
        queryKeys.notificationPreferences,
        (current) => (current ? { ...current, ...input } : current),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences,
      });
    },
  });
}
