import type { DocumentStatus, ProjectPriority, ProjectStatus, SubmissionStatus } from "@/api/types";

export type Tone = "blue" | "green" | "amber" | "red" | "slate" | "violet" | "orange";

export interface StatusMeta {
  label: string;
  tone: Tone;
}

export interface ProjectStatusMeta extends StatusMeta {
  progress: number;
}

export const submissionStatusMeta: Record<SubmissionStatus, StatusMeta> = {
  new: { label: "Nouveau", tone: "blue" },
  contacted: { label: "Contacté", tone: "amber" },
  completed: { label: "Complété", tone: "orange" },
};

export const projectStatusMeta: Record<ProjectStatus, ProjectStatusMeta> = {
  lead: { label: "Prospect", tone: "slate", progress: 10 },
  design: { label: "Conception", tone: "blue", progress: 30 },
  production: { label: "Fabrication", tone: "amber", progress: 60 },
  installation: { label: "Installation", tone: "violet", progress: 85 },
  completed: { label: "Terminé", tone: "green", progress: 100 },
  on_hold: { label: "En pause", tone: "orange", progress: 50 },
  cancelled: { label: "Annulé", tone: "red", progress: 0 },
};

export const priorityMeta: Record<ProjectPriority, StatusMeta> = {
  low: { label: "Basse", tone: "slate" },
  normal: { label: "Normale", tone: "blue" },
  high: { label: "Haute", tone: "red" },
};

export const documentStatusMeta: Record<DocumentStatus, StatusMeta> = {
  draft: { label: "Brouillon", tone: "slate" },
  sent: { label: "Envoyé", tone: "blue" },
  accepted: { label: "Accepté", tone: "green" },
  refused: { label: "Refusé", tone: "red" },
  expired: { label: "Expiré", tone: "amber" },
  partial: { label: "Partiellement payée", tone: "amber" },
  paid: { label: "Payée", tone: "green" },
  overdue: { label: "En retard", tone: "red" },
  cancelled: { label: "Annulée", tone: "slate" },
};

export function getSubmissionStatus(status: string): StatusMeta {
  return submissionStatusMeta[status as SubmissionStatus] ?? { label: status, tone: "slate" };
}

export function getProjectStatus(status: string): ProjectStatusMeta {
  return projectStatusMeta[status as ProjectStatus] ?? { label: status, tone: "slate", progress: 0 };
}

export function getPriority(priority: string): StatusMeta {
  return priorityMeta[priority as ProjectPriority] ?? { label: priority, tone: "slate" };
}

export function getDocumentStatus(status: string | undefined): StatusMeta {
  return documentStatusMeta[(status ?? "sent") as DocumentStatus] ?? { label: status ?? "—", tone: "slate" };
}
