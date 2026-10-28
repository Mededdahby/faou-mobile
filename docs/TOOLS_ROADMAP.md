# FaouDesign Mobile — Feature Roadmap

Status: planning / not started
Last updated: 2026-10-28

This roadmap covers the five highest-value additions:

1. Project photo journal
2. Measurement-to-quote calculator
3. Tasks & punchlist
4. Payments & deposits
5. Quote approval + e-signature

It assumes the current architecture stays in place:

- Mobile reads directly from the production Convex deployment.
- Mobile writes, auth, PDF generation and sharing go through the Next.js BFF in `kitchen-landing`.
- Convex schema and functions live in `C:\Users\HP\dev\WEB\kitchen-landing\convex`.
- Admin routes are in `app/api/admin/*`; mobile-only routes are in `app/api/mobile/v1/*`.
- Public client pages are under `app/partage/[token]`.

---

## 0. Shared foundation (build first)

These pieces are reused by most features. Do not start the feature work before they are stable.

### 0.1 File storage and uploads

- [ ] Decide storage: Convex file storage (`_storage`) for photos, signatures and receipts.
- [ ] Add secret-gated Convex mutation `generateUploadUrl`.
- [ ] Add BFF endpoint `POST /api/mobile/v1/uploads/url` that returns a short-lived upload URL.
- [ ] Mobile upload flow: pick/compress → PUT to upload URL → receive `storageId` → save metadata through the BFF.
- [ ] Validate MIME type and size (images only, e.g. max 10 MB after compression).
- [ ] Compress large photos with `expo-image-manipulator` before upload.
- [ ] Generate thumbnails (400 px max) and store both original + thumbnail.
- [ ] Resolve storage URLs in Convex queries (`ctx.storage.getUrl`) so the mobile app does not need a second request per image.
- [ ] Delete orphaned storage files when a photo/attachment is deleted.

New dependencies: `expo-image-picker`, `expo-image-manipulator` (and `expo-camera` only if in-app capture is required).

### 0.2 Activity / audit log

- [ ] Add `activityEvents` table:
  - `entityType`: `project | document | client | lead`
  - `entityId`: string
  - `projectId?`: `id("projects")`
  - `action`: string (e.g. `photo.added`, `task.completed`, `payment.recorded`, `quote.accepted`)
  - `actor`: `admin | client | system`
  - `actorName?`: string
  - `metadata?`: string (JSON payload, kept small)
  - `visibility`: `internal | client`
  - `createdAt`: number
- [ ] Add Convex helper `logActivity(ctx, event)`.
- [ ] Call it from every new mutation.
- [ ] Add `listProjectActivity` query and a mobile "Activité" timeline.

### 0.3 Team members (for task assignees)

- [ ] Add `teamMembers` table: name, phone, email, role, active, createdAt.
- [ ] Add BFF CRUD (or a minimal settings screen with add/edit/disable).
- [ ] Use `teamMembers` in the task assignee picker.
- [ ] Keep authentication single-admin for now; roles/permissions are a separate project.

### 0.4 Notifications and reminders

- [ ] Decide what is local vs server-driven.
- [ ] Local notifications first (`expo-notifications`) for task due dates, invoice due dates and deliveries.
- [ ] Add a `devicePushTokens` table only when Expo push is approved.
- [ ] WhatsApp/email "reminders" are deep links with prefilled messages until a WhatsApp Business API / email provider is approved.
- [ ] Add a scheduled Convex job or cron only for push/email automation.

### 0.5 Shared mobile UI

- [ ] Add project-detail tabs: `Aperçu`, `Photos`, `Tâches`, `Paiements`, `Activité`.
- [ ] Add reusable components:
  - `PhotoGrid`, `PhotoViewer`, `PhotoCaptureSheet`
  - `TaskRow`, `TaskEditorSheet`, `AssigneePicker`
  - `PaymentTimeline`, `PaymentEditorSheet`
  - `ApprovalCard`, `SignaturePreview`
- [ ] Add a shared `AttachmentsSection` usable by photos, tasks and site reports.
- [ ] Add empty, loading, error and offline states for every new section.
- [ ] Respect the existing premium design tokens and form keyboard handling.

### 0.6 Backend deployment

- [ ] Approve new schema tables and functions before touching production.
- [ ] Implement and test on a Convex dev deployment first.
- [ ] Deploy functions and schema to production.
- [ ] Verify the mobile app still reads the same production data.
- [ ] Add a rollback note for each schema change.

---

## 1. Project photo journal

Goal: document the site visually and turn it into client-ready progress reports.

### Data model

- [ ] `projectPhotos`
  - `projectId`: `id("projects")`
  - `storageId`: `id("_storage")`
  - `thumbnailStorageId?`: `id("_storage")`
  - `caption`: string
  - `room`: string (e.g. Cuisine, Salon, Chambre)
  - `phase`: `before | during | after | issue`
  - `tags`: array of strings
  - `measurements?`: string (free text, e.g. "Mur 320 × 240 cm")
  - `annotationData?`: string (normalized SVG strokes / notes)
  - `takenAt?`: string (`YYYY-MM-DD`)
  - `createdAt`: number
  - `createdBy`: string
  - Indexes: `by_project`, `by_project_phase`, `by_project_room`
- [ ] `projectReports` (site progress reports)
  - `projectId`, `title`, `summary`, `phase`, `photoIds` (array of photo ids), `createdAt`, `createdBy`
  - Index: `by_project`
- [ ] Start with captions/tags/measurements only.
- [ ] Add drawing annotations only after the basic gallery is stable:
  - normalized coordinate space (0–1)
  - strokes stored as JSON
  - rendered with `react-native-svg`

### Backend / API

- [ ] `generateUploadUrl` mutation (secret-gated).
- [ ] `addProjectPhoto`, `updateProjectPhoto`, `deleteProjectPhoto`, `listProjectPhotos`.
- [ ] `createProjectReport`, `getProjectReport`, `listProjectReports`.
- [ ] PDF report generator: project info, date, summary, selected photos with captions/rooms, signature block.
- [ ] BFF routes:
  - `GET/POST/PATCH/DELETE /api/mobile/v1/projects/[id]/photos`
  - `GET/POST /api/mobile/v1/projects/[id]/reports`
  - `GET /api/mobile/v1/projects/[id]/reports/[reportId]/pdf`
- [ ] Add activity events for upload/update/delete/report-share.

### Mobile

- [ ] Project detail `Photos` tab:
  - before/after segmented filter
  - room filter chips
  - grid of thumbnails
  - add button → camera or library
  - metadata sheet: room, phase, caption, tags, measurements
- [ ] Full-screen viewer:
  - swipe between photos
  - edit caption/room/phase
  - delete with confirmation
  - share/export selected photos
- [ ] Before/after comparison:
  - side-by-side view
  - optional slider later
- [ ] Site report:
  - select photos
  - add summary/title
  - generate PDF through the BFF
  - share via WhatsApp/email/share sheet
- [ ] Empty/loading/error states; image upload progress; retry failed uploads.
- [ ] Camera/library permission strings in `app.json`.

### Acceptance criteria

- Photos can be uploaded from camera and library, compressed and persisted.
- Photos display after app restart (Convex storage URLs resolved in queries).
- Captions, rooms, phases and tags can be edited.
- Before/after and room filters work.
- Deleting a photo removes the DB record and storage files.
- A site report PDF can be generated and shared.
- Activity log records uploads and report generation.

Estimate: 5–7 dev days after the foundation.

---

## 2. Measurement-to-quote calculator

Goal: turn room measurements, modules, materials and finishes into quote lines.

### Data model

- [ ] `catalogItems`
  - `name`
  - `category`: `countertop | cabinets | backsplash | flooring | hardware | appliance | labor | other`
  - `unit`: `m2 | ml | unit | forfait`
  - `unitPriceCents`: number
  - `supplier?`: string
  - `leadTimeDays?`: number
  - `active`: boolean
  - `updatedAt`: number
  - Index: `by_category`, `by_active`
- [ ] Optional `cabinetModules`
  - `name`, `kind` (`base | high | island`), `widthCm`, `heightCm`, `depthCm`, `unitPriceCents`, `active`
- [ ] Optional `quoteCalculations`
  - `projectId?`, `inputs` (JSON), `results` (JSON), `createdAt`, `createdBy`
  - Only needed if saved calculations are required; otherwise calculate locally and add lines directly.

### Calculator rules (must be agreed with the business)

- [ ] Unit conventions: cm vs m, linear meters vs m².
- [ ] Waste percentage for worktops, backsplash and flooring.
- [ ] Installation percentage or fixed labor line.
- [ ] Transport/delivery rule.
- [ ] Cabinet module counting rules.
- [ ] VAT rule (included / excluded / rate).
- [ ] Minimum project amount.
- [ ] Whether prices are per material or per finish.

### Mobile

- [ ] Entry points:
  - new "Calculateur" button in the devis builder step 2
  - optional "Calculer un devis" action on a project
- [ ] Inputs:
  - room dimensions (length, width, height)
  - number of base/high modules, island length
  - worktop, backsplash, flooring choices
  - material/finish pickers from `catalogItems`
  - waste %, installation, transport, extras
- [ ] Live breakdown:
  - quantity per line
  - unit price
  - line total
  - grand total
- [ ] "Ajouter au devis": append lines to the 3-step builder with `amountCents`.
- [ ] Editable results before adding.
- [ ] Save calculation to the project (optional).
- [ ] Clearly show "estimation" until the quote is saved.

### Backend / API

- [ ] Catalog CRUD:
  - BFF `/api/mobile/v1/catalog` (GET/POST/PATCH/DELETE)
  - Convex `listCatalogItems`, `createCatalogItem`, `updateCatalogItem`, `deleteCatalogItem`
- [ ] Calculator itself can be client-side for v1 (no API round trip).
- [ ] Save calculation endpoint only if persistence is required.
- [ ] Activity event when a calculation is added to a quote.

### Acceptance criteria

- A room + modules + materials produce the agreed quantities and totals.
- Lines can be added to a quote without retyping.
- Editing a dimension recalculates immediately.
- Catalog prices can be maintained without a code change.
- The quote created from the calculator has the same structure as a manually created quote.

Estimate: 6–8 dev days after pricing rules are approved.

---

## 3. Tasks & punchlist

Goal: track site tasks, snags and finishing work with clear ownership and deadlines.

### Data model

- [ ] `projectTasks`
  - `projectId`: `id("projects")`
  - `title`: string
  - `description`: string
  - `status`: `todo | in_progress | blocked | done`
  - `priority`: `low | normal | high`
  - `assigneeId?`: `id("teamMembers")`
  - `dueDate?`: string (`YYYY-MM-DD`)
  - `completedAt?`: number
  - `order`: number
  - `createdAt`, `updatedAt`, `createdBy`
  - Indexes: `by_project`, `by_project_status`, `by_assignee`, `by_due_date`
- [ ] `taskAttachments` (photo evidence)
  - `taskId`, `storageId`, `caption`, `createdAt`
  - Or reuse `projectPhotos` with an optional `taskId` field.
- [ ] No comments in v1; use the activity log for changes.

### Backend / API

- [ ] `listProjectTasks`, `createTask`, `updateTask`, `deleteTask`, `completeTask`.
- [ ] `listTasksDue` for Planning and dashboard.
- [ ] BFF `/api/mobile/v1/projects/[id]/tasks` (GET/POST/PATCH/DELETE) and `/api/mobile/v1/tasks/upcoming`.
- [ ] Activity events for created/updated/completed/assigned.
- [ ] Reminder scheduling after a task is created/updated (local first).

### Mobile

- [ ] Project detail `Tâches` tab:
  - progress summary (done / total)
  - filters: À faire, En cours, Terminé, En retard
  - add task button
  - task rows with checkbox, title, assignee, due date, priority
- [ ] Task editor sheet:
  - title, description
  - status, priority
  - assignee picker
  - due date picker
  - photo evidence (reuse photo upload)
- [ ] Complete/undo with optimistic update and rollback.
- [ ] Punchlist view: incomplete tasks grouped by room/phase, ideal for site handover.
- [ ] Planning integration: overdue and upcoming tasks.
- [ ] Dashboard "À traiter" count includes overdue tasks.
- [ ] Empty/loading/error states.

### Acceptance criteria

- Tasks can be created, assigned, dated, completed, reopened and deleted.
- Photos attach to tasks and render in the task detail.
- Overdue tasks are visually distinct and appear in Planning.
- Completion updates progress immediately.
- Assignees come from the team list.

Estimate: 3–5 dev days after the foundation.

---

## 4. Payments & deposits

Goal: record real payments, keep balances accurate, issue receipts and chase overdue balances.

### Data model

- [ ] `payments`
  - `documentId`: `id("commercialDocuments")`
  - `projectId?`: `id("projects")`
  - `amountCents`: number
  - `method`: `cash | bank_transfer | check | card | other`
  - `receivedAt`: string (`YYYY-MM-DD`)
  - `reference?`: string
  - `receiptNumber?`: string
  - `notes`: string
  - `createdAt`: number
  - `createdBy`: string
  - Indexes: `by_document`, `by_project`, `by_received_at`
- [ ] Keep `commercialDocuments.amountPaidCents` as the fast aggregate.
- [ ] Add a migration for existing paid amounts:
  - create an "opening balance" payment per document with a non-zero paid amount
  - mark it as `migrated` in notes
- [ ] Receipt numbering: `documentCounters` key `receipt` or a dedicated sequence.

### Business rules

- [ ] Payments only on invoices (not quotes).
- [ ] `sum(payments) <= document total`.
- [ ] Update document status:
  - paid == 0 → previous status (`sent`/`draft`)
  - 0 < paid < total → `partial`
  - paid >= total → `paid`
- [ ] Do not override `cancelled`.
- [ ] Deleting a payment recalculates the aggregate and status.
- [ ] Deposit invoice rule (optional): when a quote is accepted, create a deposit invoice (percentage/amount to confirm).

### Backend / API

- [ ] `listPayments(documentId)`, `addPayment`, `deletePayment`, `recalculateDocumentPaid`.
- [ ] BFF `/api/mobile/v1/documents/[id]/payments` (GET/POST) and `DELETE /api/mobile/v1/payments/[id]`.
- [ ] Receipt PDF route:
  - `GET /api/mobile/v1/payments/[id]/receipt`
  - receipt fields: client, document number, payment amount, method, date, reference, remaining balance, FAOU branding.
- [ ] Activity events: payment recorded/deleted.
- [ ] Overdue detection query for Planning/dashboard.

### Mobile

- [ ] Invoice detail:
  - payment history timeline
  - remaining balance card
  - "Encaisser" button → amount (default balance), method, date, reference, notes
  - receipt share/download
  - delete payment with confirmation (admin)
- [ ] Validation:
  - amount > 0
  - amount <= balance
  - date not in the future (or allow with warning)
- [ ] Planning:
  - unpaid/overdue invoices
- [ ] Reminder actions:
  - WhatsApp/email with prefilled message and public link
  - local notification for due date
- [ ] Dashboard: collected / outstanding already exists; add overdue count.

### Acceptance criteria

- Recording a payment updates paid/balance/status atomically.
- Overpayment is blocked server-side and in the UI.
- Payment history survives refresh and app restart.
- Deleting a payment recalculates correctly.
- Receipt PDF opens the native share sheet.
- Existing paid amounts are represented after migration.

Estimate: 4–6 dev days after the foundation.

---

## 5. Quote approval + e-signature

Goal: let the client accept/refuse and sign a quote from the public share page, with an audit trail.

### Data model

- [ ] `documentApprovals`
  - `documentId`: `id("commercialDocuments")`
  - `shareToken`: string
  - `decision`: `accepted | refused`
  - `signerName`: string
  - `signerEmail?`: string
  - `signatureStorageId?`: `id("_storage")`
  - `reason?`: string (refusal)
  - `documentHash`: string (hash of the quote snapshot signed)
  - `ipAddress?`: string
  - `userAgent?`: string
  - `createdAt`: number
  - Indexes: `by_document`, `by_share_token`
- [ ] One active approval per document; refuse after acceptance or vice versa should be blocked.
- [ ] Link the approval to the activity log.

### Public share page (website)

- [ ] Add a client component to `app/partage/[token]/page.tsx`:
  - "Accepter le devis" primary action
  - "Refuser" secondary action with reason
  - signature modal: name, consent checkbox, signature canvas, "Valider"
- [ ] Add a public POST route:
  - `/api/public/documents/[token]/approval`
  - validate token format and existence
  - rate limit by IP/token
  - validate decision/signature
  - store signature in Convex storage through a server-side mutation
  - update document status (`accepted` / `refused`)
  - write `documentApprovals` + activity event
  - return the updated status
- [ ] Use a simple electronic signature disclaimer; confirm legal wording before launch.
- [ ] Include accepted signature/date in the shared PDF (optional).
- [ ] Optional: auto-create a deposit invoice on acceptance using the agreed percentage.

### Mobile

- [ ] Document detail `Approval` card:
  - status (awaiting / accepted / refused)
  - signer name, date, signature preview
  - refusal reason
  - share/remind action if awaiting
- [ ] When approved, update the status pill and activity timeline automatically (live Convex).
- [ ] When rejected, show the reason and allow editing/revising the quote.
- [ ] No signing in the admin app; the client signs on the public page.
- [ ] Update the share message to mention online approval.

### Security and audit

- [ ] Token is the only credential; never expose the admin secret.
- [ ] Rate-limit approval attempts.
- [ ] Store IP/user agent from the Next route.
- [ ] Hash the document content that was signed.
- [ ] Log approvals in `activityEvents`.
- [ ] Legal review of e-signature validity in Morocco.

### Acceptance criteria

- Client can accept or refuse from the share page on mobile and desktop.
- Acceptance updates the quote status and stores signer name, signature, timestamp and audit data.
- Refusal stores the reason and updates the status.
- Duplicate decisions are blocked.
- Mobile shows the approval state and signature.
- Accepted quotes can trigger a deposit invoice (if enabled).

Estimate: 4–6 dev days after file storage and the public page work.

---

## 6. Recommended delivery order

### Phase 0 — Foundation (3–4 days)

1. File storage/upload pipeline.
2. Activity log.
3. Team members.
4. Project detail tabs and shared components.
5. Schema deploy + rollback plan.

### Phase 1 — Photo journal (5–7 days)

Highest visible value; exercises the upload/storage foundation.

### Phase 2 — Tasks & punchlist (3–5 days)

Reuses photos, activity log and project tabs; fast operational win.

### Phase 3 — Payments & deposits (4–6 days)

Reuses document UI and PDF pipeline; needs the opening-balance migration.

### Phase 4 — Approval + e-signature (4–6 days)

Reuses file storage, public share page and document statuses; needs legal wording.

### Phase 5 — Measurement calculator (6–8 days)

Can start in parallel once pricing rules and catalog data are agreed; otherwise it blocks on business input.

Total estimate: **25–36 dev days**, excluding content entry, legal review and app-store releases.

---

## 7. Decisions required before coding starts

1. **Backend approval:** may we add these Convex tables/functions and deploy them? Dev first, then production?
2. **File storage:** Convex storage or external (S3/R2)? Max photo size? Retention policy?
3. **Team members:** who can be assigned? Do we need permissions/roles now?
4. **Calculator:** exact formulas, units, waste %, labor %, transport, VAT and minimum amounts. Who maintains catalog prices?
5. **Payments:** methods, receipt numbering, deposit percentage, migration of existing `amountPaidCents`.
6. **E-signature:** consent wording and legal validity; is a drawn signature + name + timestamp acceptable?
7. **Notifications:** local only or Expo push? WhatsApp deep links or WhatsApp Business API? Email provider?
8. **Offline:** is offline capture required for the first release of photos/tasks?
9. **Privacy:** where photos/signatures are stored, who can access them, and retention.
10. **Release:** Expo Go/TestFlight/APK first, and who deploys the website/Convex changes.

---

## 8. Global definition of done

- [ ] Mobile typecheck and lint pass.
- [ ] Android bundle builds; iOS behavior checked on a device/simulator.
- [ ] Small-screen layouts verified (375 px and large Android).
- [ ] Loading, empty, error and offline states implemented.
- [ ] Backend validation covers all write paths.
- [ ] Existing projects/clients/quotes/invoices still work.
- [ ] Activity log records every new mutation.
- [ ] Permissions (camera/library/notifications) explained in the app.
- [ ] No secrets added to the mobile bundle beyond the existing Convex read secret.
- [ ] Rollback/migration notes documented for schema changes.
