// Shapes returned by the FAOU DESIGN admin API.
// Keep this file as the single mobile contract; update it whenever an API
// response changes on the web side.

export type SubmissionStatus = "new" | "contacted" | "completed";

export interface Submission {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  message: string;
  project_type: string;
  materials: Record<string, string>;
  status: SubmissionStatus;
  projectId?: string;
}

export type ClientStatus = "active" | "inactive";

export interface Client {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  status: ClientStatus;
}

export type ClientInput = Omit<Client, "id" | "created_at" | "updated_at">;

export type ProjectStatus =
  | "lead"
  | "design"
  | "production"
  | "installation"
  | "completed"
  | "on_hold"
  | "cancelled";

export type ProjectPriority = "low" | "normal" | "high";

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  clientId?: string;
  clientName: string;
  type: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: string;
  dueDate?: string;
  budgetCents: number;
  notes: string;
  address: string;
  city: string;
  quotedCents: number;
  invoicedCents: number;
  paidCents: number;
}

export interface ProjectInput {
  name: string;
  clientId?: string | null;
  clientName: string;
  type: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: string;
  dueDate?: string;
  budgetCents: number;
  notes: string;
  address: string;
  city: string;
}

export type DocumentKind = "quote" | "invoice";

export type DocumentStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "refused"
  | "expired"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

export interface DocumentClient {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  projectType: string;
}

export interface DocumentItem {
  id: string;
  label: string;
  amountCents: number;
}

export interface CommercialDocument {
  _id: string;
  _creationTime: number;
  kind: DocumentKind;
  number: string;
  date: string;
  client: DocumentClient;
  items: DocumentItem[];
  notes: string;
  conditions: string;
  updatedAt: number;
  status?: DocumentStatus;
  amountPaidCents?: number;
  dueDate?: string;
  projectId?: string;
  sourceQuoteId?: string;
  sourceQuoteNumber?: string;
  shareToken?: string;
}

export interface Summary {
  leads: {
    all: number;
    new: number;
    contacted: number;
    completed: number;
  };
  projects: {
    active: number;
    total: number;
    byStatus: Record<string, number>;
  };
  money: {
    quotedCents: number;
    invoicedCents: number;
    paidCents: number;
    outstandingCents: number;
  };
  recentLeads: Submission[];
  upcomingInvoices: CommercialDocument[];
  upcomingProjects: Project[];
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface DocumentPage {
  page: CommercialDocument[];
  isDone: boolean;
  continueCursor: string;
}

export interface DocumentInput {
  id?: string;
  expectedUpdatedAt?: number;
  date: string;
  client: DocumentClient;
  items: DocumentItem[];
  notes: string;
  conditions: string;
  projectId?: string | null;
}
