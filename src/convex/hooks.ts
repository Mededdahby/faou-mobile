import { anyApi } from "convex/server";
import { useQuery } from "convex/react";
import type { Client, CommercialDocument, Project, Submission } from "@/api/types";
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
