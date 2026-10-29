import { anyApi } from "convex/server";
import { useQuery } from "convex/react";
import type {
  Client,
  CommercialDocument,
  DocumentApproval,
  NotificationPage,
  Project,
  Payment,
  ProjectActivity,
  ProjectPhoto,
  ProjectTask,
  Submission,
  TeamMember,
  UpcomingTask,
} from "@/api/types";
import { convexAdminSecret, isConvexConfigured } from "./client";

const convexApi = anyApi;
const skip = "skip" as const;
const secretArgs = { secret: convexAdminSecret };

export interface LiveDocumentPage {
  page: CommercialDocument[];
  isDone: boolean;
  continueCursor: string;
}

export function useLiveSubmissions() {
  return useQuery(
    convexApi.records.listSubmissions,
    isConvexConfigured ? secretArgs : skip,
  ) as Submission[] | undefined;
}

export function useLiveProjects() {
  return useQuery(
    convexApi.records.listProjects,
    isConvexConfigured ? secretArgs : skip,
  ) as Project[] | undefined;
}

export function useLiveClients() {
  return useQuery(
    convexApi.records.listClients,
    isConvexConfigured ? secretArgs : skip,
  ) as Client[] | undefined;
}

export function useLiveDocuments() {
  return useQuery(
    convexApi.records.listDocuments,
    isConvexConfigured ? { ...secretArgs, cursor: null } : skip,
  ) as LiveDocumentPage | undefined;
}

export function useLiveDocument(id: string | undefined) {
  return useQuery(
    convexApi.records.getDocument,
    isConvexConfigured && id ? { ...secretArgs, id } : skip,
  ) as CommercialDocument | null | undefined;
}

export function useLiveProjectPhotos(projectId: string | undefined) {
  return useQuery(
    convexApi.mobileTools.listProjectPhotos,
    isConvexConfigured && projectId
      ? { ...secretArgs, projectId }
      : skip,
  ) as ProjectPhoto[] | undefined;
}

export function useLiveProjectActivity(projectId: string | undefined, limit = 8) {
  return useQuery(
    convexApi.mobileTools.listProjectActivity,
    isConvexConfigured && projectId
      ? { ...secretArgs, projectId, limit }
      : skip,
  ) as ProjectActivity[] | undefined;
}

export function useLiveTeamMembers(activeOnly = true) {
  return useQuery(
    convexApi.mobileTools.listTeamMembers,
    isConvexConfigured ? { secret: convexAdminSecret, activeOnly } : skip,
  ) as TeamMember[] | undefined;
}

export function useLiveProjectTasks(projectId: string | undefined) {
  return useQuery(
    convexApi.mobileTools.listProjectTasks,
    isConvexConfigured && projectId ? { ...secretArgs, projectId } : skip,
  ) as ProjectTask[] | undefined;
}

export function useLivePayments(documentId: string | undefined) {
  return useQuery(
    convexApi.mobileTools.listPayments,
    isConvexConfigured && documentId
      ? { ...secretArgs, documentId }
      : skip,
  ) as Payment[] | undefined;
}

export function useLiveDocumentApproval(documentId: string | undefined) {
  return useQuery(
    convexApi.mobileTools.getDocumentApproval,
    isConvexConfigured && documentId
      ? { ...secretArgs, documentId }
      : skip,
  ) as DocumentApproval | null | undefined;
}

export function useLiveNotifications(limit = 50) {
  return useQuery(
    convexApi.notifications.listNotifications,
    isConvexConfigured ? { ...secretArgs, limit } : skip,
  ) as NotificationPage | undefined;
}

export function useLiveUpcomingTasks(days = 45) {
  return useQuery(
    convexApi.mobileTools.listUpcomingTasks,
    isConvexConfigured ? { secret: convexAdminSecret, days } : skip,
  ) as UpcomingTask[] | undefined;
}
