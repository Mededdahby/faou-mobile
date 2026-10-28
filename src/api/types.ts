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

export type PhotoPhase = "before" | "during" | "after" | "issue";

export interface ProjectPhoto {
  id: string;
  projectId: string;
  caption: string;
  room: string;
  phase: PhotoPhase;
  tags: string[];
  measurements: string | null;
  annotationData: string | null;
  takenAt: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  url: string | null;
  thumbnailUrl: string | null;
}

export interface ProjectActivity {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: "admin" | "client" | "system";
  actorName: string | null;
  metadata: string | null;
  visibility: "internal" | "client";
  createdAt: number;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "normal" | "high";

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  completedAt: number | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type PaymentMethod = "cash" | "bank_transfer" | "check" | "card" | "other";

export interface Payment {
  id: string;
  documentId: string;
  projectId: string | null;
  amountCents: number;
  method: PaymentMethod;
  receivedAt: string;
  reference: string;
  receiptNumber: string;
  notes: string;
  createdAt: number;
}

export interface DocumentApproval {
  id: string;
  decision: "accepted" | "refused";
  signerName: string;
  signerEmail: string;
  signatureUrl: string | null;
  reason: string;
  documentHash: string;
  createdAt: number;
}
