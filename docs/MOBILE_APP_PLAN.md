# FAOU DESIGN — Mobile Admin App

**Stack:** React Native (Expo) + TypeScript + existing Convex database
**Goal:** a clean, fast phone app for running the business: triage leads, move projects, check money.
**Status:** plan / not started
**Last updated:** 2026-10-26

---

## 1. What exists today (the map)

### Web app

- Next.js 16 (App Router) at `/admin`
- French UI, brand colors: `#219EBC` primary, `#023047` ink, `#8ECAE6` soft, `#FFB703` accent, `#FB8500` CTA
- 4 admin screens: **Tableau de bord**, **Projets**, **Clients**, **Devis & factures**
- Login: env-based single admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) → httpOnly cookie `admin_session`
- Every API route validates the cookie, then calls Convex with `CONVEX_ADMIN_SECRET` (server-only)
- Public share page: `/partage/[token]` (+ PDF)

### Convex data model (`convex/schema.ts`)

| Table | What it holds | Key fields |
|---|---|---|
| `contactSubmissions` | Incoming website leads | name, email, phone, city, address, message, projectType, materials, status (`new/contacted/completed`), projectId |
| `projects` | Jobs | name, clientId/clientName, type, status (`lead/design/production/installation/completed/on_hold/cancelled`), priority (`low/normal/high`), startDate, dueDate, budgetCents, notes, address, city |
| `clients` | Customer records | name, email, phone, address, city, notes, status (`active/inactive`) |
| `commercialDocuments` | Quotes + invoices | kind (`quote/invoice`), number, date, client object, items[], notes, conditions, status, amountPaidCents, dueDate, projectId, shareToken |
| `documentCounters` | Quote/invoice numbering | key, value |

`projects` and `commercialDocuments` are linked. `contactSubmissions` becomes a project via `sourceSubmissionId`.

### Existing API surface (already validated and Convex-wired)

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/admin/login` | POST | Set admin cookie |
| `/api/admin/logout` | POST | Clear cookie |
| `/api/admin/submissions` | GET, POST, PATCH, DELETE | List, create project from lead, change status, delete |
| `/api/admin/clients` | GET, POST, PUT, DELETE | Client CRUD |
| `/api/admin/projects` | GET, POST, PUT, DELETE | Project CRUD |
| `/api/admin/documents` | GET, POST, DELETE | Document list/detail, save quote, delete |
| `/api/admin/documents/[id]/pdf` | GET | Branded PDF |
| `/api/admin/documents/finance` | PATCH | Status, payment, due date, project link |
| `/api/admin/documents/share` | POST | Generate share token/link |
| `/api/admin/documents` (PATCH) | PATCH | Convert quote → invoice |

**Reuse all of this.** The mobile app should not talk to Convex directly for its first version (see §3).

---

## 2. Product scope

### V1 — "run the day from your phone"

- Secure login + logout (+ optional biometric unlock)
- Dashboard: lead counts, active projects, money in / outstanding, recent leads, upcoming due dates
- **Demandes**: list, search, filter by status/type, detail, call/email/WhatsApp, change status, create client, create project, delete
- **Projets**: list, filter, detail, edit status/priority/dates/budget/notes, linked client and documents
- **Clients**: list, search, detail, create/edit, archive, linked projects/documents
- **Devis & factures**: list, filter, detail, read-only line items, change status, record payment, set due date, convert quote → invoice, share link, download/share PDF
- Pull-to-refresh, French UI, loading/empty/error states, safe-area and keyboard handling

### Deliberately out of V1

| Deferred | Why |
|---|---|
| Creating/editing quote line items | Dense form, error-prone on phones; keep authoring on web |
| Excel/PDF export of the lead list | Not useful on mobile |
| Push notifications | Needs Expo Push + device tokens + backend trigger; phase 2 |
| Realtime subscriptions / true offline sync | BFF uses request/response; refresh is enough for one admin |
| Multi-user roles / permissions | Current system is single-admin |
| Dark mode | Polish later |
| Public store launch | Internal TestFlight / APK first |

**Rule of thumb:** on mobile you *act on* records (status, payment, call, share); you don't *author* long documents.

---

## 3. Architecture

### Recommended: Expo app → Next.js BFF → Convex

```
┌─────────────────────┐        HTTPS + Bearer token        ┌──────────────────────────┐
│  Expo / React Native │ ─────────────────────────────────> │  Next.js API (BFF)        │
│  app                 │ <───────────────────────────────── │  /api/mobile/v1/*         │
│  • Expo Router       │        JSON                      │  auth + validation        │
│  • TanStack Query    │                                  │  reuses /api/admin logic  │
│  • SecureStore       │                                  └────────────┬─────────────┘
└─────────┬───────────┘                                               │ CONVEX_ADMIN_SECRET
          │ opens /partage/[token] · PDF share                        ▼
          └──────────────────────────────────────────────>  ┌──────────────────┐
                                                           │  Convex database  │
                                                           └──────────────────┘
```

**Why this shape**

- `CONVEX_ADMIN_SECRET` never ships in the app bundle.
- All existing validation, error messages and business rules stay in one place.
- No Convex function refactor needed for V1.
- PDFs and share pages keep working through the existing web app.

**Trade-off:** no live Convex subscriptions. Acceptable for a single-admin admin app; V1 refreshes on focus/pull. Phase 2 can add direct Convex reads with Convex Auth if realtime becomes important.

### Auth flow (new, small backend change)

```
POST /api/mobile/v1/auth/login  { email, password }
  → validates with existing isValidAdminCredentials()
  → returns { token, expiresAt }         (signed JWT, 30 days)

App stores token in expo-secure-store
Every request: Authorization: Bearer <token>
Server: accept cookie OR bearer in one shared helper
POST /api/mobile/v1/auth/logout  → app deletes local token
```

- Token signed with `ADMIN_SESSION_SECRET` (add `jose`).
- Stateless for V1: rotate the secret to revoke all devices.
- If per-device revocation is needed later, add a `mobileSessions` table with hashed tokens.
- Rate-limit login attempts.
- Never store the password on device.

### Backend work required

| # | Change | File |
|---|---|---|
| 1 | One auth helper accepting cookie **or** bearer | `lib/api-auth.ts` (new) |
| 2 | Sign/verify mobile JWT | `lib/mobile-auth.ts` (new) |
| 3 | Login / logout / me endpoints | `app/api/mobile/v1/auth/*` (new) |
| 4 | Replace every route-local `authorized()` with the shared helper | `app/api/admin/**/route.ts` |
| 5 | One-call dashboard summary (avoids 3 heavy lists) | `app/api/mobile/v1/summary/route.ts` + `convex/mobile.ts` |
| 6 | Make sure PDF route works with bearer, or add a mobile PDF endpoint | `app/api/admin/documents/[id]/pdf/route.ts` |
| 7 | Optional pagination for leads/projects/documents | `convex/mobile.ts` |
| 8 | Document new env vars | `.env.example` |

> The PDF route needs special handling: the app fetches the PDF **with the bearer token**, writes it to `expo-file-system`, then opens the native share sheet. It must not open a bare URL in the browser, because that browser session has no admin cookie.

### Repository strategy

Recommended: **separate Expo repo** (`faou-admin-mobile`).

- The website's `tsconfig.json` includes `**/*.ts(x)`, so co-locating RN code inside this repo would make `next build` type-check React Native files.
- Separate repo = independent builds, Expo config, EAS, app store credentials.

If you prefer one repo: add `apps/mobile`, exclude `apps/mobile/**` from root `tsconfig.json` and ESLint, and move shared API types into `packages/api-types`. This is more setup than V1 needs.

---

## 4. Navigation map

**5 bottom tabs** (French labels, native icons). Five is the maximum that still feels clean; each tab maps to one existing web section.

```
Root
├── Auth stack
│   └── Login
│
└── App (tabs)
    ├── 1. Accueil          /
    │     ├── > Demandes/[id]
    │     ├── > Projets/[id]
    │     ├── > Devis/[id]
    │     └── header avatar → Réglages (modal)
    │
    ├── 2. Demandes         /demandes
    │     └── /demandes/[id] ──> Client/[id] · Projets/[id]
    │
    ├── 3. Projets          /projets
    │     └── /projets/[id] ──> Client/[id] · Devis/[id]
    │
    ├── 4. Devis            /devis
    │     └── /devis/[id] ──> Partage (bottom sheet) · PDF (share sheet)
    │
    └── 5. Clients          /clients
          └── /clients/[id] ──> Projets/[id] · Devis/[id]

Modals / sheets
├── Filtres
├── Nouveau client
├── Nouveau projet
├── Changement de statut
├── Paiement (facture)
└── Partage (lien + message)
```

The **Demandes** tab shows a badge with the count of `new` leads. Default tab on launch: **Accueil**.

### Screen contracts

#### 1. Accueil

- Greeting, date, avatar → settings
- KPI cards: **Nouvelles demandes**, **Projets actifs**, **Encaissé**, **Reste à encaisser**
- "À traiter": 5 newest `new` leads → detail
- "Échéances": invoices due in the next 30 days + projects due soon
- Quick actions: *Nouveau client*, *Nouveau projet*, *Voir les devis*
- Pull-to-refresh

#### 2. Demandes

- Segmented tabs: Toutes · Nouvelles · Contactées · Complétées (with counts)
- Search (name, email, phone), filter sheet (project type, sort)
- Lead card: name, project type, city, relative date, status pill, linked-project chip
- Detail:
  - Sticky action row: **Appeler**, **Email**, **WhatsApp**
  - Contact block, project details, materials as chips, message, timeline
  - Actions sheet: mark contacted / completed / new, create client, create project, delete (confirm)
- Optimistic status change with rollback on failure (same behavior as web)

#### 3. Projets

- Money strip: actifs, devis émis, facturé, encaissé
- Search + status filter chips + sort
- Card: name, client, status pill, progress bar, budget, due date, high-priority dot
- Detail:
  - Progress stepper: Prospect → Conception → Fabrication → Installation → Terminé
  - Editable status, priority, start/due dates, budget, city/address, notes
  - Client link, linked documents, amounts (quoted / invoiced / paid)
  - *Créer un devis* → opens web editor (V1) or deferred to V2
- FAB: new project

#### 4. Clients

- Tabs: Tous · Actifs · Inactifs; search; sort
- Card: name, city, phone, status
- Detail: call/email actions, notes, linked projects, linked documents, edit, archive
- FAB: new client; form in a full-screen modal

#### 5. Devis & factures

- Segmented: **Devis** · **Factures**; search by number/client; status filter
- Card: number, client, date, total, status pill, balance for invoices
- Detail:
  - Header: number, kind, status
  - Client block, read-only line items, total
  - Invoice only: paid vs balance progress, due date
  - Notes / conditions (collapsible)
  - Actions:
    - Quote: status (Brouillon / Envoyé / Accepté / Refusé / Expiré), convert to invoice, share, PDF
    - Invoice: status, record payment, due date, share, PDF
  - Share sheet: generate/copy public link + prewritten WhatsApp message
  - PDF: fetch with bearer → native share sheet

#### Réglages

- Signed-in email, app version, API environment
- Biometric unlock toggle (if implemented)
- Logout (clears token + query cache)
- Phase 2: notification preferences

---

## 5. Screen → API → Convex map

| Screen | Call | Convex function |
|---|---|---|
| Login | `POST /api/mobile/v1/auth/login` | — (env credentials) |
| Accueil | `GET /api/mobile/v1/summary` | new `summary` query |
| Demandes list | `GET /api/admin/submissions` | `records.listSubmissions` |
| Lead status | `PATCH /api/admin/submissions` | `records.updateSubmissionStatus` |
| Lead → project | `POST /api/admin/submissions` | `records.createProjectFromSubmission` |
| Lead → client | `POST /api/admin/clients` + status PATCH | `records.createClient` |
| Delete lead | `DELETE /api/admin/submissions` | `records.deleteSubmission` |
| Projets list | `GET /api/admin/projects` | `records.listProjects` |
| Project create/edit/delete | `POST/PUT/DELETE /api/admin/projects` | `records.createProject/updateProject/deleteProject` |
| Clients list | `GET /api/admin/clients` | `records.listClients` |
| Client CRUD | `POST/PUT/DELETE /api/admin/clients` | `records.create/update/deleteClient` |
| Documents list | `GET /api/admin/documents?cursor=` | `records.listDocuments` |
| Document detail | `GET /api/admin/documents?id=` | `records.getDocument` |
| Finance update | `PATCH /api/admin/documents/finance` | `records.updateDocumentFinance` |
| Quote → invoice | `PATCH /api/admin/documents` | `records.convertQuote` |
| Share link | `POST /api/admin/documents/share` | `records.setDocumentShareToken` |
| PDF | `GET /api/admin/documents/[id]/pdf` (bearer) | PDF generator + `getDocument` |
| Public share | web URL `/partage/[token]` | `records.getSharedDocument` |

---

## 6. Visual system

Keep the web brand, but let it feel native.

| Token | Value | Use |
|---|---|---|
| `primary` | `#219EBC` | buttons, active tab, links |
| `ink` | `#023047` | titles, primary text |
| `primarySoft` | `#8ECAE6` | chips, soft backgrounds |
| `accent` | `#FFB703` | warnings, "contacted" |
| `cta` | `#FB8500` | main CTA / completed |
| `background` | `#F6F8FA` | screen background |
| `surface` | `#FFFFFF` | cards, sheets |
| `muted` | `#64748B` | secondary text |
| `success` | `#10B981` | paid, completed |
| `danger` | `#EF4444` | overdue, delete |
| `border` | `#E2E8F0` | 1px card borders |

- **Type:** system font (SF Pro / Roboto) for a native feel. Sizes 28 / 22 / 17 / 15 / 13 / 11. Tabular numbers for money.
- **Shape:** 16 px cards, 12 px inputs, pill badges. 1 px borders + almost no shadow.
- **Spacing:** 4 px base; 16 px screen padding; 12 px card gap.
- **Status colors** (one shared mapping, same as web):
  - Leads: new = blue, contacted = amber, completed = orange
  - Projects: lead = slate, design = blue, production = amber, installation = violet, completed = green, on_hold = orange, cancelled = red
  - Documents: draft = slate, sent = blue, accepted/paid = green, refused/overdue = red, partial = amber
- **Components:** `Screen`, `AppHeader`, `Card`, `StatCard`, `StatusPill`, `MoneyText`, `SearchField`, `SegmentedControl`, `BottomSheet`, `EmptyState`, `ErrorState`, `Skeleton`, `FAB`, `PrimaryButton`, `Field`, `ConfirmDialog`.
- **Feedback:** haptic on status change, optimistic updates, toast/inline banner on error, 150–200 ms transitions.

---

## 7. App project structure

```
faou-admin-mobile/
├── app/
│   ├── _layout.tsx                 # providers: query, auth, safe area
│   ├── (auth)/login.tsx
│   └── (app)/
│       ├── _layout.tsx             # auth guard + tabs
│       └── (tabs)/
│           ├── index.tsx           # Accueil
│           ├── demandes.tsx
│           ├── projets.tsx
│           ├── devis.tsx
│           └── clients.tsx
│       ├── demandes/[id].tsx
│       ├── projets/[id].tsx
│       ├── clients/[id].tsx
│       ├── devis/[id].tsx
│       └── reglages.tsx
├── src/
│   ├── api/
│   │   ├── client.ts               # fetch wrapper, bearer, 401 handling
│   │   ├── endpoints.ts            # typed functions per endpoint
│   │   └── types.ts                # API shapes (shared contract)
│   ├── auth/session.tsx            # SecureStore, login/logout, biometrics
│   ├── components/ui/              # primitives
│   ├── components/domain/          # LeadCard, ProjectCard, DocumentRow, ...
│   ├── hooks/                      # queries, mutations, debounce
│   ├── lib/format.ts               # money (MAD), dates (fr), status maps
│   └── theme/                      # tokens, typography
├── app.json
├── eas.json
└── package.json
```

**Libraries:** Expo (current SDK) + Expo Router, TypeScript, `@tanstack/react-query`, `expo-secure-store`, `expo-haptics`, `expo-file-system`, `expo-sharing`, `expo-local-authentication`, `react-hook-form` + `zod`, `date-fns` (fr locale), `@expo/vector-icons`, `expo-linking`.

**Environment:**
- `EXPO_PUBLIC_API_URL` = deployed web URL in production.
- In development use the machine's LAN IP (e.g. `http://192.168.x.x:3000`), not `localhost` — a phone cannot reach your laptop's localhost. Android emulator: `10.0.2.2`.
- Add the app scheme for deep links: `faoudesign-admin://`.

---

## 8. Delivery plan

| Phase | Scope | Deliverable | Est. |
|---|---|---|---|
| **0. Foundation** | Backend auth helper, mobile login endpoint, Expo scaffold, theme, API client, one authenticated screen | Login works end-to-end against real data | 1.5 d |
| **1. Shell + Accueil** | Tabs, header, summary endpoint, KPI cards, recent leads, due list, loading/empty states | Dashboard usable | 2 d |
| **2. Demandes** | List, search, filters, detail, status actions, call/email/WhatsApp, create project, create client, delete | Full lead triage on phone | 3 d |
| **3. Clients + Projets** | Lists, search, detail, forms, status/priority edit, money summary | Jobs manageable on phone | 4 d |
| **4. Devis & factures** | Lists, detail, status, payment, due date, conversion, share, PDF | Money actions on phone | 3.5 d |
| **5. Hardening + release** | Offline/error states, QA on iOS + Android, EAS build, TestFlight/APK, docs | Installable internal build | 2.5 d |
| **Total** | | | **~16.5 dev days** |

A leaner path (read-only documents, no client/project edit) lands in ~10–11 days. Quote **authoring** stays on web in every V1 path.

### Phase 2 (after real usage)

- Expo push notifications for new leads (device tokens + Convex trigger or cron)
- Direct Convex subscriptions with Convex Auth if realtime matters
- Quote authoring on mobile
- Offline mutation queue
- Search across everything (leads, clients, projects, documents)
- Roles (admin / collaborator)

---

## 9. Acceptance criteria

**Auth**
- Wrong credentials show a clear French error; correct credentials land on Accueil.
- Token persists across app restarts; logout clears it and returns to login.
- Expired/invalid token anywhere → automatic redirect to login (no retry loop).

**Data**
- Every list matches web counts for the same filters.
- Status changes appear immediately and survive a refresh; failure rolls back and shows a message.
- Payment cannot exceed invoice total (server already enforces it; UI must prevent it too).
- Convert quote → invoice creates exactly one invoice (server is idempotent).
- Share link opens the public page in a browser without login.
- PDF opens the native share sheet and has the correct number.

**UX**
- Works on a 375 px-wide phone and a large Android device.
- No content hidden behind the keyboard on forms.
- Safe areas respected (notch, home indicator).
- Long names/emails truncate without breaking layout.
- Pull-to-refresh on every list; skeleton on first load; empty and error states on every screen.

---

## 10. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| API shape drifts from mobile types | Wrong fields, crashes | Keep `src/api/types.ts` as the single contract; version endpoints `/api/mobile/v1/*`; review whenever web API changes |
| `CONVEX_ADMIN_SECRET` leaks into the app | Full DB access | Never import Convex in the app; only call the BFF |
| Static single-admin credentials | Weak security | Short-ish JWT, secure storage, rate limiting, rotate secret; add `mobileSessions` if needed |
| Large list payloads (5000 leads) | Slow screens, memory | Client-side first, then cursor pagination in `convex/mobile.ts` |
| PDF route auth | Broken PDF | Fetch with bearer → file → share sheet |
| Phone can't reach dev server | Confusing setup | LAN IP / tunnel, documented in README |
| Scope creep into quote authoring | Delays MVP | Hard rule: authoring on web for V1 |
| Co-locating mobile in Next repo | Next build tries to type-check RN | Separate repo, or exclude `apps/mobile/**` |

---

## 11. Decisions to confirm before building

1. **Repo:** separate Expo repo (recommended) or `apps/mobile` in this repo?
2. **Auth:** BFF + bearer JWT (recommended) or direct Convex + Convex Auth (realtime, bigger refactor)?
3. **V1 document scope:** view + status/payment/share/PDF only (recommended), or also create/edit quotes on mobile?
4. **Distribution:** TestFlight + Android APK/internal track (recommended) or public App Store / Play Store?
5. **Push notifications:** V1 or phase 2 (recommended)?
