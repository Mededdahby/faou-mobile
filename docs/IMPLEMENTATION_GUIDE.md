# FaouDesign Mobile — Implementation & Verification Guide

Companion to `docs/TOOLS_ROADMAP.md`.
Scope: the shared foundation and the five tools — photo journal, tasks/punchlist, payments/deposits, quote approval/e-signature, measurement calculator.

This is a build guide, not a commitment to implement everything at once. Work top to bottom. Do not start the next phase until the current phase’s verification gate passes.

---

## 0. Operating rules

### 0.1 Repositories and responsibilities

| Area | Path | Responsibility |
|---|---|---|
| Mobile | `C:\Users\HP\dev\Mobile\faou-mobile` | Expo app, screens, forms, direct Convex reads, BFF calls |
| Website / BFF | `C:\Users\HP\dev\WEB\kitchen-landing` | Next.js BFF, public share page, PDFs, Convex functions |
| Convex | `kitchen-landing/convex` | Schema, queries, mutations, storage |

- Mobile reads use direct Convex subscriptions (`src/convex/hooks.ts`).
- Mobile writes, auth, PDF generation and sharing use the BFF.
- **Never run `convex dev` from the mobile repo.** Convex CLI work belongs in `kitchen-landing` and must target the intended deployment.
- The mobile app must never receive the Convex admin secret in new code beyond the existing read setup. New file uploads use short-lived upload URLs.

### 0.2 Engineering standards

- TypeScript strict, no `any`, explicit return types on exported functions where useful.
- New Convex functions use the existing `requireAdmin(secret)` pattern and validated `args`/`returns`.
- New BFF routes use `isAuthorizedRequest` (cookie or bearer), `zod` validation and structured `{ data }` / `{ message }` responses.
- Shared API shapes live in `src/api/types.ts`; do not duplicate field definitions across screens.
- UI uses existing tokens (`src/theme/tokens.ts`) and primitives (`Card`, `Field`, `FormSection`, `KeyboardForm`, `StatusPill`, `ShareDocumentSheet`). Do not introduce a second design system.
- Every new screen has loading, empty, error and keyboard-safe states.
- No new dependency unless it is Expo-compatible and justified. Check `node_modules/expo/bundledNativeModules.json` before installing native modules.
- Every schema or API change has a rollback note.

### 0.3 Definition of “verified”

A step is verified only when:

1. TypeScript and lint pass for the affected repos.
2. The Android bundle builds (and iOS is checked manually when native modules are involved).
3. The relevant API/function is exercised against a real deployment.
4. The manual scenario succeeds on at least one iPhone and one Android device, including a small screen.
5. No existing screen or workflow regressed.
6. No new secret or destructive behavior was introduced.

---

## 1. Phase 0 — Baseline, environments and guardrails

### Step 0.1 Freeze a known-good baseline

- [ ] Start the BFF in `kitchen-landing` (`pnpm dev`).
- [ ] Start Metro in `faou-mobile` (`pnpm start`).
- [ ] Verify login, dashboard, projects, clients, quotes, share link and PDF.
- [ ] Run mobile checks:
  ```powershell
  cd C:\Users\HP\dev\Mobile\faou-mobile
  pnpm install --frozen-lockfile
  pnpm typecheck
  pnpm lint
  ```
- [ ] Run web checks:
  ```powershell
  cd C:\Users\HP\dev\WEB\kitchen-landing
  pnpm exec tsc --noEmit
  pnpm exec eslint <changed-paths>
  ```
  Full `pnpm lint` currently has pre-existing failures; use targeted lint for changed files and record the baseline.
- [ ] Build the Android bundle:
  ```powershell
  Invoke-WebRequest "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false" | Select-Object StatusCode
  ```
- [ ] Capture screenshots of the current dashboard, project detail, quote builder, share sheet and invoice detail.
- [ ] Record the current Convex deployment URL, function list and data counts.

**Verification gate 0.1**

- [ ] Login → dashboard loads real data.
- [ ] Create and delete a test client and project.
- [ ] Quote list and detail open; share page and PDF return `200`.
- [ ] All four commands above pass.
- [ ] Baseline screenshots and data counts are stored with this plan.

### Step 0.2 Separate dev and production Convex targets

The app currently pins the production Convex URL. Directly developing new functions against production is risky.

- [ ] Create or select a Convex **dev** deployment for this project.
- [ ] Add a controlled override for development only:
  - `EXPO_PUBLIC_CONVEX_DEV_URL` and an explicit `EXPO_PUBLIC_USE_DEV_CONVEX=true` flag.
  - In `src/convex/client.ts`, use the dev URL only when `__DEV__` and the flag are true.
  - Production builds must ignore the flag.
- [ ] Make the BFF and the mobile app point to the same deployment during testing:
  - Web: one `CONVEX_URL` and one `CONVEX_ADMIN_SECRET` per environment; remove duplicate entries.
  - Mobile: matching `EXPO_PUBLIC_CONVEX_DEV_URL` / admin secret for reads.
- [ ] Never commit local environment secrets.
- [ ] Document the switch-back procedure to production.

**Verification gate 0.2**

- [ ] A dev build reads and writes only the dev deployment.
- [ ] A production-mode build still targets production and ignores the dev flag.
- [ ] Test records created in dev do not appear in production.
- [ ] Switching back restores the production dashboard data.

### Step 0.3 Add a minimal automated test harness

No test runner exists yet.

- [ ] Add Vitest to `kitchen-landing` for pure logic:
  - payment balance/status rules
  - approval decision rules
  - calculator formulas
  - share-message generation
- [ ] Add `convex-test` for Convex mutations/queries:
  - payment overpayment and deletion recalculation
  - duplicate approval prevention
  - task status transitions
  - activity logging
- [ ] Add `"test": "vitest run"` to the web `package.json`.
- [ ] Extract pure mobile helpers (money parsing, date validation, quote totals) so they can be tested without a simulator.
- [ ] Add `pnpm test` to the release checklist.

**Verification gate 0.3**

- [ ] `pnpm test` runs and at least one test covers a real rule.
- [ ] A deliberately broken rule fails the test.
- [ ] CI/local instructions are documented.

### Step 0.4 Prepare shared UI and navigation

- [ ] Add project-detail tabs: `Aperçu`, `Photos`, `Tâches`, `Paiements`, `Activité`.
- [ ] Confirm tab state survives refresh and deep links.
- [ ] Add shared attachment/photo placeholders and empty states.
- [ ] Confirm the new tabs do not break the existing keyboard-safe forms.

**Verification gate 0.4**

- [ ] Tabs render on a 375 px screen without horizontal scroll.
- [ ] Back/forward navigation and unsaved-change guard still work.
- [ ] VoiceOver/TalkBack can reach every tab and action.

### Phase 0 exit gate

- [ ] Baseline commands pass.
- [ ] Dev/prod separation is verified.
- [ ] Test harness exists.
- [ ] Project tabs and shared UI are ready.
- [ ] Rollback notes exist for any schema change made in Phase 0.

---

## 2. Phase 1 — Shared foundation

### Step 1.1 File storage and upload pipeline

**Deliverables**

- Convex storage enabled.
- Secret-gated `generateUploadUrl` mutation.
- BFF upload-URL endpoint.
- Mobile `uploadImage` helper with compression and retry.
- Storage URL resolution in Convex queries.

**Implementation**

- [ ] Add `generateUploadUrl` to a new `convex/mobileTools.ts` (or `records.ts` if it stays cohesive), using the existing admin-secret guard.
- [ ] Add `POST /api/mobile/v1/uploads/url` in the BFF:
  - bearer auth
  - validates intent (`photo`, `task`, `signature`, `receipt`)
  - returns `{ uploadUrl, expiresAt }`
- [ ] Mobile helper:
  - pick image (`expo-image-picker`)
  - compress to max 1600 px / JPEG quality ~0.75
  - PUT to the upload URL
  - receive `storageId`
  - retry at most twice
- [ ] Add thumbnails at 400 px and store both storage IDs.
- [ ] Add `resolveStorageUrls` in read queries so UI receives `url` + `thumbnailUrl`.
- [ ] Validate MIME type and size server-side after upload; reject non-images.
- [ ] Define maximum upload size (e.g. 10 MB) and storage retention.

**Edge cases**

- [ ] Camera permission denied.
- [ ] Library permission denied.
- [ ] Upload cancelled.
- [ ] Network drops mid-upload.
- [ ] Duplicate upload of the same asset.
- [ ] Deleted storage object referenced by a record.

**Verification gate 1.1**

- [ ] Upload a photo from camera and from the library on iOS and Android.
- [ ] Verify the record contains `storageId`, thumbnail and URLs.
- [ ] Force-close and reopen the app; the photo still loads.
- [ ] Reject a PDF or oversized file through the API.
- [ ] Delete a record and confirm its storage objects are deleted.
- [ ] Unauthenticated upload-URL request returns `401`.
- [ ] `pnpm typecheck` and targeted lint pass.

### Step 1.2 Activity log

**Deliverables**

- `activityEvents` table.
- `logActivity` helper.
- `listProjectActivity` query.
- Project “Activité” timeline.

**Implementation**

- [ ] Add the schema fields and indexes from the roadmap.
- [ ] Add `logActivity(ctx, event)` and call it from new mutations.
- [ ] Return `actor`, `action`, `createdAt` and a human-readable label.
- [ ] Add the mobile timeline component with a loading/empty state.
- [ ] Ensure client-visible events never include internal admin notes.

**Verification gate 1.2**

- [ ] Creating a test record writes exactly one event.
- [ ] Editing/deleting writes the expected events.
- [ ] Timeline renders in correct chronological order.
- [ ] Internal events are hidden from `visibility: client`.
- [ ] No event contains secrets or raw storage IDs.

### Step 1.3 Team members and assignee picker

**Deliverables**

- `teamMembers` table.
- CRUD screen/API.
- Reusable assignee picker.

**Implementation**

- [ ] Add the schema and indexes.
- [ ] Add BFF CRUD with validation (name required, active flag).
- [ ] Add a small settings/team screen to add, edit and deactivate members.
- [ ] Add `AssigneePicker` with search and “Non assigné”.

**Verification gate 1.3**

- [ ] Create/edit/deactivate a member; deactivated members disappear from the picker but remain on old tasks.
- [ ] Duplicate names are allowed but visually distinguishable by phone/role.
- [ ] Picker is keyboard-safe and searchable with 30+ members.
- [ ] Unauthorized CRUD returns `401`.

### Step 1.4 Local notifications

**Deliverables**

- Permission flow.
- Scheduling/cancelling local reminders.
- Deep-link handling to the relevant task/invoice.

**Implementation**

- [ ] Install `expo-notifications` (Expo-compatible version).
- [ ] Request permission contextually, not on first launch.
- [ ] Add reminder scheduling for task and invoice due dates.
- [ ] Cancel/reschedule when a date changes or a record is completed.
- [ ] Add notification tap handling to open the related screen.

**Verification gate 1.4**

- [ ] Permission prompt appears; denial does not break the app.
- [ ] A reminder fires at the scheduled time in a development build.
- [ ] Editing the date reschedules; completing the record cancels it.
- [ ] Tapping the notification opens the correct record.
- [ ] Notifications do not duplicate after app restart.

### Step 1.5 Shared attachments/components

- [ ] Add `PhotoGrid`, `PhotoViewer`, `AttachmentsSection`, `PaymentTimeline`, `ApprovalCard`, `TaskRow`.
- [ ] Use `FlatList` or paginated queries for photo-heavy screens.
- [ ] Add accessible labels and 44 px touch targets.
- [ ] Add skeleton, empty, error and offline states.

**Verification gate 1.5**

- [ ] Components render with 0, 1 and 100 items.
- [ ] No list jumps or blank cells on fast scroll (development device).
- [ ] All actions reachable with a screen reader.
- [ ] Forms remain keyboard-safe.

### Phase 1 exit gate

- [ ] Upload roundtrip verified on both platforms.
- [ ] Activity events verified.
- [ ] Team member picker verified.
- [ ] Local notification verified.
- [ ] Shared components stable.
- [ ] No production data touched during development.
- [ ] Mobile typecheck/lint/bundle pass; web typecheck/targeted lint pass.

---

## 3. Phase 2 — Photo journal

### Step 2.1 Schema and queries

- [ ] Add `projectPhotos` and `projectReports` per `TOOLS_ROADMAP.md`.
- [ ] Add indexes: `by_project`, `by_project_phase`, `by_project_room`.
- [ ] Add `listProjectPhotos` (paginated, max 30/page) and `listProjectReports`.
- [ ] Return `originalUrl`, `thumbnailUrl`, metadata and `takenAt`.
- [ ] Add `addProjectPhoto`, `updateProjectPhoto`, `deleteProjectPhoto`, `createProjectReport`.
- [ ] Log activity for each mutation.
- [ ] Delete storage files on photo deletion.

**Verification gate 2.1**

- [ ] Create a project; add 3 photos; list returns URLs and metadata.
- [ ] Filter by phase/room returns the correct subset.
- [ ] Delete removes DB row and storage objects.
- [ ] Pagination returns stable pages with no duplicates.
- [ ] Unauthorized functions fail.

### Step 2.2 Mobile gallery and capture

- [ ] Add the `Photos` tab with grid, phase filter, room filter and add button.
- [ ] Add `PhotoCaptureSheet`:
  - camera / library
  - room
  - phase (`before`, `during`, `after`, `issue`)
  - caption
  - tags
  - measurements
- [ ] Show upload progress and retry per item.
- [ ] Full-screen viewer with swipe, edit and delete.
- [ ] Before/after comparison view.
- [ ] Empty/loading/error states.

**Verification gate 2.2**

- [ ] Add photos from camera and library on iPhone and Android.
- [ ] Metadata persists after restart.
- [ ] Filters and comparison show the correct photos.
- [ ] Delete confirmation prevents accidental deletion.
- [ ] Upload with no network shows a retry path, not a crash.
- [ ] Large image does not freeze the UI.
- [ ] Small-screen layout remains usable.

### Step 2.3 Site report PDF

- [ ] Add report creation: title, summary, phase, selected photos.
- [ ] Generate a branded PDF through the BFF.
- [ ] Include project/client/date and captions.
- [ ] Share via native share sheet.
- [ ] Save report metadata and activity event.

**Verification gate 2.3**

- [ ] Report PDF opens and matches the selected photos.
- [ ] Missing/invalid report returns a clear error.
- [ ] Shared PDF contains no internal-only notes.
- [ ] Report generation does not block the app.

### Step 2.4 Annotations (optional v1.1)

- [ ] Add an annotation editor with `react-native-svg`.
- [ ] Store normalized strokes (0–1), not screen pixels.
- [ ] Render annotations in the viewer and PDF.
- [ ] Provide undo/clear and “measurement note” text.

**Verification gate 2.4**

- [ ] Annotations align at different screen sizes.
- [ ] Editing and deleting photos preserves annotation integrity.
- [ ] PDF renders annotations at print quality.
- [ ] App still passes typecheck/lint/bundle.

### Phase 2 exit gate

- [ ] Gallery, filters, viewer and report verified.
- [ ] Upload, delete and storage cleanup verified.
- [ ] Activity timeline shows photo events.
- [ ] No regression in project detail or dashboard.
- [ ] Performance acceptable with 100+ photos.

---

## 4. Phase 3 — Tasks & punchlist

### Step 3.1 Schema and functions

- [ ] Add `projectTasks` and `taskAttachments` per the roadmap.
- [ ] Add indexes: `by_project`, `by_project_status`, `by_assignee`, `by_due_date`.
- [ ] Add `listProjectTasks`, `listTasksDue`, `createTask`, `updateTask`, `deleteTask`, `completeTask`.
- [ ] Validate assignee exists and is active.
- [ ] Log activity for create/update/assign/complete/delete.
- [ ] Return task progress counts from a query or compute client-side.

**Verification gate 3.1**

- [ ] CRUD works for a project.
- [ ] Completing a task sets `completedAt` and status.
- [ ] Deleting a task removes its attachments and logs activity.
- [ ] Due-date queries return only active projects.
- [ ] Unauthorized access fails.

### Step 3.2 Mobile task UI

- [ ] Add the `Tâches` tab with progress and filters.
- [ ] Task editor sheet: title, description, priority, assignee, due date, photos.
- [ ] Complete/reopen with optimistic update and rollback.
- [ ] Overdue styling and grouping.
- [ ] Punchlist mode grouped by room.
- [ ] Empty/loading/error states.

**Verification gate 3.2**

- [ ] Create a task with assignee/date and see it immediately.
- [ ] Complete and reopen; progress updates.
- [ ] Disable network, complete a task, and verify rollback/error behavior.
- [ ] Task photos upload and render.
- [ ] Small-screen editor is keyboard-safe and does not cover the save button.
- [ ] Overdue tasks are visually distinct.

### Step 3.3 Planning and dashboard integration

- [ ] Include task due dates in Planning.
- [ ] Include overdue tasks in the dashboard “À traiter” count.
- [ ] Add task notification scheduling.
- [ ] Keep invoice/project deadlines unchanged.

**Verification gate 3.3**

- [ ] Planning shows tasks and projects without duplicates.
- [ ] Dashboard counts match the tasks list.
- [ ] Completing/deleting a task updates Planning and dashboard.
- [ ] Date changes reschedule notifications.

### Phase 3 exit gate

- [ ] Task CRUD, assignments, photos and completion verified.
- [ ] Planning/dashboard integration verified.
- [ ] Notifications verified.
- [ ] No regressions in projects/quotes.

---

## 5. Phase 4 — Payments & deposits

### Step 4.1 Schema, migration and functions

- [ ] Add `payments` per the roadmap.
- [ ] Add `listPayments`, `addPayment`, `deletePayment`, `recalculateDocumentPaid`.
- [ ] Enforce `sum(payments) <= total` and status transitions in one transaction/mutation.
- [ ] Add an opening-balance migration for existing `amountPaidCents`.
- [ ] Add receipt numbering.
- [ ] Log activity events.
- [ ] Export production data before the migration; verify on dev first.

**Verification gate 4.1**

- [ ] Migration dry-run counts match documents with paid amounts.
- [ ] Re-running the migration is idempotent or safely blocked.
- [ ] Adding a normal payment updates paid/balance/status.
- [ ] Overpayment is rejected.
- [ ] Deleting a payment recalculates.
- [ ] Cancelled documents are not modified.
- [ ] Tests for all transitions pass.

### Step 4.2 Mobile payments UI

- [ ] Invoice detail payment timeline and balance card.
- [ ] “Encaisser” sheet: amount (default balance), method, date, reference, notes.
- [ ] Receipt share/download.
- [ ] Delete payment with confirmation.
- [ ] Validation and inline errors.
- [ ] Keyboard-safe sheet with sticky save.

**Verification gate 4.2**

- [ ] Pay full balance → status `paid`.
- [ ] Partial payment → `partial`; balance correct.
- [ ] Zero/negative/over-total payments are blocked in UI and API.
- [ ] Receipt PDF has the correct amount, client, date and balance.
- [ ] Delete restores the previous status.
- [ ] Two rapid submissions create only one payment (loading/disabled).

### Step 4.3 Reminders

- [ ] Add overdue/due-soon invoice lists.
- [ ] Add local notification at the due date.
- [ ] Add WhatsApp/email prefilled reminder actions.
- [ ] Ensure the public link and receipt are included where appropriate.

**Verification gate 4.3**

- [ ] Due/overdue lists match the data.
- [ ] Notification fires once.
- [ ] WhatsApp/email open with the correct message and link.
- [ ] Paying or cancelling removes the reminder.

### Phase 4 exit gate

- [ ] Payment math, migration, receipts and reminders verified.
- [ ] Existing invoice status and share/PDF flows unchanged.
- [ ] Production data backed up and migration verified on dev.

---

## 6. Phase 5 — Quote approval + e-signature

### Step 6.1 Schema and backend rules

- [ ] Add `documentApprovals` per the roadmap.
- [ ] Add unique/guard logic: one active decision per document.
- [ ] Add `submitApproval` with token validation, decision, signer, signature storage ID, hash, IP, user agent.
- [ ] Update document status atomically.
- [ ] Log activity.
- [ ] Add optional deposit-invoice creation.

**Verification gate 5.1**

- [ ] Accept writes one approval and sets `accepted`.
- [ ] Refuse writes reason and sets `refused`.
- [ ] Duplicate decisions are blocked.
- [ ] Invalid/expired token fails.
- [ ] Document hash matches the signed snapshot.
- [ ] Deposit invoice is created exactly once when enabled.

### Step 6.2 Public share page

- [ ] Add the accept/refuse/signature client component.
- [ ] Add the public POST route with rate limiting.
- [ ] Validate signature size/type and signer name/consent.
- [ ] Show success/error states and the signed status.
- [ ] Test on mobile Safari and Chrome, and desktop.

**Verification gate 6.2**

- [ ] Client can accept/refuse on iPhone and Android browsers.
- [ ] Signature canvas works with touch and mouse.
- [ ] Consent checkbox is required.
- [ ] Duplicate clicking does not create two approvals.
- [ ] Rate limiting blocks rapid abuse.
- [ ] Page remains readable with JavaScript partially blocked (at least a fallback message).

### Step 6.3 Mobile approval display

- [ ] Show approval status, signer, date and signature preview.
- [ ] Show refusal reason.
- [ ] Show a “Remind client” action when awaiting.
- [ ] Update live when the client signs.
- [ ] Include approval in the PDF where applicable.

**Verification gate 6.3**

- [ ] Mobile updates without a manual refresh after web approval.
- [ ] Signature preview is not distorted/cropped.
- [ ] Refusal reason is visible.
- [ ] Admin can still edit a refused quote.
- [ ] PDF shows the approval block correctly.

### Phase 5 exit gate

- [ ] End-to-end accept/refuse/sign verified on both platforms.
- [ ] Audit data stored and visible.
- [ ] Status, activity and PDF updated.
- [ ] Legal wording reviewed and approved.

---

## 7. Phase 6 — Measurement calculator

### Step 7.1 Catalog and pricing rules

- [ ] Add `catalogItems` (and optional `cabinetModules`).
- [ ] Add catalog CRUD and a simple admin maintenance screen.
- [ ] Agree and document formulas:
  - units
  - waste %
  - labor/installation %
  - transport
  - VAT
  - minimums
- [ ] Add unit tests for the formula engine before UI work.

**Verification gate 7.1**

- [ ] A known room produces the expected quantities and totals in tests.
- [ ] Changing waste/VAT changes results correctly.
- [ ] Catalog updates flow into the calculator.
- [ ] Invalid dimensions are rejected.

### Step 7.2 Calculator UI

- [ ] Add entry points from the devis builder step 2 and project detail.
- [ ] Add dimension inputs, module steppers, material/finish pickers.
- [ ] Show live breakdown and total.
- [ ] “Ajouter au devis” appends lines to the 3-step builder.
- [ ] Preserve entered values when going back/forward.
- [ ] Keep the summary/footer accessible above the keyboard.

**Verification gate 7.2**

- [ ] Dimensions update totals immediately.
- [ ] Added lines have the correct labels, quantities and `amountCents`.
- [ ] The quote can be saved and shared.
- [ ] Small-screen keyboard does not hide inputs or the add action.
- [ ] No duplicate lines when tapping add twice quickly.

### Step 7.3 Optional saved calculations

- [ ] Save calculation inputs/results to a project.
- [ ] Reload a calculation and edit it.
- [ ] Show a “calculation” activity event.
- [ ] Do not overwrite saved quotes.

**Verification gate 7.3**

- [ ] Save/reload round-trip preserves values.
- [ ] Editing a saved calculation does not mutate the saved quote.
- [ ] Activity log records the action.

### Phase 6 exit gate

- [ ] Formula tests pass.
- [ ] Calculator → quote workflow verified.
- [ ] Catalog maintenance verified.
- [ ] No regression in the existing 3-step quote builder.

---

## 8. Cross-cutting verification matrix

Run this before each release, not only at the end.

### Devices and sizes

- [ ] iPhone SE-class (375 px wide)
- [ ] Large iPhone
- [ ] Small Android
- [ ] Large Android
- [ ] Tablet (if supported; currently `supportsTablet: false`)

### Failure modes

- [ ] BFF offline
- [ ] Convex offline
- [ ] Slow network
- [ ] Expired/invalid session
- [ ] Invalid or expired share token
- [ ] Upload interrupted
- [ ] Duplicate submission (double tap)
- [ ] Empty lists and 100+ item lists
- [ ] Missing permissions (camera, photos, notifications)

### Performance

- [ ] Photo grid scrolls smoothly with 100+ items.
- [ ] Opening a full-size photo does not crash memory.
- [ ] Task/payment lists remain responsive.
- [ ] Upload queue limits concurrency.
- [ ] Dashboard does not slow down with new queries.
- [ ] No N+1 queries (storage URLs resolved in one read).

### Accessibility

- [ ] Screen reader labels on all icon-only actions.
- [ ] 44 px minimum touch targets.
- [ ] Contrast on status pills and muted text.
- [ ] Dynamic type does not break layouts.
- [ ] Focus order is logical; keyboard does not trap.
- [ ] Error messages are announced/visible.

### Security and privacy

- [ ] New BFF routes require auth except the token-gated public approval route.
- [ ] Public approval route is rate-limited and validates token format.
- [ ] Upload URLs are short-lived and validated.
- [ ] File size/type limits enforced.
- [ ] No admin secret added to the mobile bundle.
- [ ] Photos/signatures are not publicly listable.
- [ ] Activity events do not leak internal notes.
- [ ] Deletion removes storage objects.

### Regression

- [ ] Login/logout
- [ ] Dashboard KPIs
- [ ] Leads → project
- [ ] Client/project create/edit/delete
- [ ] 3-step quote creation
- [ ] Quote → invoice
- [ ] Payments/status/due date
- [ ] Share sheet (copy, WhatsApp, email, preview, PDF)
- [ ] Public share page and PDF
- [ ] Settings and logout

---

## 9. Release, migration and rollback

### 9.1 Release order

1. Deploy Convex schema/functions to dev.
2. Deploy BFF changes to a preview/staging URL.
3. Build a development mobile client pointed at dev.
4. Run the phase gate + cross-cutting matrix.
5. Deploy BFF and Convex to production.
6. Build the production mobile client.
7. Smoke test production read/write and public share pages.
8. Release to TestFlight/APK/internal track.

### 9.2 Migrations

- [ ] Export production Convex data before schema changes.
- [ ] Run scripts on dev; verify counts and spot-check records.
- [ ] Make migrations idempotent or guarded.
- [ ] Keep old fields during a transition period.
- [ ] Do not delete old data until the new UI is stable for at least one release.

### 9.3 Rollback

- [ ] Feature flags or hidden tabs can disable each feature.
- [ ] The BFF can stop writing new tables without breaking old screens.
- [ ] Storage objects are not deleted until the feature is confirmed stable.
- [ ] Document the exact rollback command/config for Convex and the BFF.

---

## 10. Final acceptance checklist

- [ ] Photo journal: upload, filter, compare, report, delete verified.
- [ ] Tasks: create, assign, date, complete, photo evidence, planning verified.
- [ ] Payments: record, partial/full, receipt, delete, migration, reminders verified.
- [ ] Approval: accept/refuse/sign, audit, mobile status, PDF verified.
- [ ] Calculator: formulas, catalog, quote generation verified.
- [ ] All new screens pass the design-token and accessibility review.
- [ ] All new APIs are authenticated and validated.
- [ ] No production data corrupted by tests.
- [ ] Backups and rollback notes exist.
- [ ] Mobile and web typecheck/lint/build pass (targeted lint for known pre-existing web issues).
- [ ] On-device QA completed on iOS and Android.
- [ ] The final release notes describe the new tools and any limitations.

---

## 11. Command reference

### Mobile

```powershell
cd C:\Users\HP\dev\Mobile\faou-mobile
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm start -- -c
```

Android bundle check:

```powershell
Invoke-WebRequest "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false" |
  Select-Object StatusCode, RawContentLength
```

### Website / BFF

```powershell
cd C:\Users\HP\dev\WEB\kitchen-landing
pnpm dev
pnpm exec tsc --noEmit
pnpm exec eslint app/api lib convex <changed-paths>
pnpm build
```

### Convex (website repo only)

```powershell
cd C:\Users\HP\dev\WEB\kitchen-landing
npx convex dev        # development deployment; keep running
npx convex deploy     # production, only after review and backup
```

Never run these in `faou-mobile`.

### API smoke examples

Use a token from `/api/mobile/v1/auth/login` and send it as a bearer token. Test both authorized and unauthorized requests, and delete any test records afterward.

### Verification evidence

For each gate, record:

- command output / status codes
- screenshots of the new screens
- device and OS version
- test data IDs
- known limitations

---

## 12. Working agreement

- Implement one phase at a time.
- Each feature gets its own branch/commit series.
- Do not merge a phase until its gate passes.
- Do not modify production data during development.
- Any schema change is reviewed before deployment.
- UI work follows the existing premium design system.
- When a requirement is ambiguous (pricing formulas, legal signature wording, deposit rules), stop and resolve it before coding that step.
