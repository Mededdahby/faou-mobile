# FAOU Admin — Mobile

React Native (Expo) admin app for the FAOU DESIGN website dashboard.

> **Status:** project scaffold. Navigation, theme, API client, session handling and
> shared UI primitives are in place. Screens are placeholders until the backend
> endpoints and the feature phases are implemented.
>
> The full product map and delivery plan is in [`docs/MOBILE_APP_PLAN.md`](docs/MOBILE_APP_PLAN.md).

---

## 1. Requirements

| Tool | Why | Notes |
|---|---|---|
| **Node.js 20+** | Expo CLI and Metro bundler | You already have Node 24 |
| **pnpm 11+** | Install dependencies | You already have pnpm 11.18 |
| **Expo Go** (phone) | Run the app without native builds | App Store / Google Play |
| **Git** | Version control | Optional but recommended |
| **Android Studio / Xcode** | Emulators | Optional; a real phone is enough |
| **EAS CLI** | TestFlight / APK builds | Optional, later |

Everything in this scaffold runs in **Expo Go** — no native project folders yet.

---

## 2. Install dependencies

The Expo SDK 58 versions are already pinned in `package.json`, and `.npmrc`
keeps a flat `node_modules` so Metro resolves native packages reliably.

```powershell
cd C:\Users\HP\dev\Mobile\faou-mobile
pnpm install
```

If pnpm warns that build scripts were ignored, approve the three packages used
by the toolchain:

```powershell
pnpm approve-builds
# select: esbuild, sharp, unrs-resolver
```

If peer-dependency warnings appear, align the Expo packages:

```powershell
pnpm expo install --fix
```

### Optional tools for later

```powershell
pnpm add -g eas-cli
eas login
```

---

## 3. Configure the API URL

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

- Use your computer's **LAN IPv4** (`ipconfig`), not `localhost` — a phone cannot
  reach your laptop's localhost.
- The Next.js dashboard must be running (`pnpm dev` in the website repo) and the
  phone must be on the same Wi-Fi network.
- Android emulator: use `http://10.0.2.2:3000`.
- Production: the deployed website URL, e.g. `https://faoudesign.com`.

Restart Metro after changing env values:

```powershell
pnpm start -c
```

---

## 4. Run the app

```powershell
pnpm start
```

Then scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

Other commands:

```powershell
pnpm android         # open on an Android emulator/device
pnpm ios             # open on an iOS simulator (macOS only)
pnpm web             # browser preview
pnpm typecheck       # TypeScript check
pnpm lint            # ESLint
```

---

## 5. Preview the UI before the backend exists

The login endpoint is part of Phase 0 of the backend work. Until it is deployed,
you can preview navigation and screens in development:

```env
EXPO_PUBLIC_DEV_AUTH_BYPASS=true
```

Then restart with `pnpm start -c`.

This bypass only works when `__DEV__` is true and is disabled in production
builds. Remove it once `/api/mobile/v1/auth/login` is live.

---

## 6. Backend endpoints expected by the app

The app reuses the existing admin API and adds three mobile-only endpoints.
The website must accept **either** the admin cookie **or** a bearer token.

| Endpoint | Purpose | Status |
|---|---|---|
| `POST /api/mobile/v1/auth/login` | Returns `{ token, expiresAt, email }` | **To build** |
| `POST /api/mobile/v1/auth/logout` | Optional token invalidation | **To build** |
| `GET /api/mobile/v1/auth/me` | Current admin email | **To build** |
| `GET /api/mobile/v1/summary` | Dashboard counts, money, recent leads | **To build** |
| `/api/admin/submissions` | Leads: list, status, create project, delete | Exists |
| `/api/admin/clients` | Clients CRUD | Exists |
| `/api/admin/projects` | Projects CRUD | Exists |
| `/api/admin/documents` | Documents list/detail/convert | Exists |
| `/api/admin/documents/finance` | Status, payment, due date | Exists |
| `/api/admin/documents/share` | Public share token | Exists |
| `/api/admin/documents/[id]/pdf` | PDF (fetch with bearer) | Exists |

See `docs/MOBILE_APP_PLAN.md` §3 for the auth flow and §5 for the full
screen → API → Convex mapping.

---

## 7. Project structure

```
faou-mobile/
├── app/                              # Expo Router routes
│   ├── _layout.tsx                   # providers + root stack
│   ├── (auth)/
│   │   └── login.tsx
│   └── (app)/
│       ├── _layout.tsx               # auth guard + stack
│       ├── (tabs)/
│       │   ├── _layout.tsx           # 5 bottom tabs
│       │   ├── index.tsx             # Accueil / dashboard
│       │   ├── demandes.tsx
│       │   ├── projets.tsx
│       │   ├── devis.tsx
│       │   └── clients.tsx
│       ├── demandes/[id].tsx
│       ├── projets/[id].tsx
│       ├── clients/[id].tsx
│       ├── devis/[id].tsx
│       └── reglages.tsx
├── src/
│   ├── api/
│   │   ├── client.ts                 # fetch wrapper, bearer token, 401 handling
│   │   ├── endpoints.ts              # typed API functions
│   │   └── types.ts                  # mobile API contract
│   ├── auth/
│   │   ├── session.tsx               # session context + auth guard support
│   │   └── storage.ts                # SecureStore / localStorage
│   ├── components/
│   │   ├── domain/PlaceholderScreen.tsx
│   │   └── ui/                       # Screen, Card, StatCard, Field, ...
│   ├── hooks/queries.ts              # TanStack Query hooks
│   ├── lib/
│   │   ├── format.ts                 # MAD money, French dates
│   │   ├── queryClient.ts
│   │   └── status.ts                 # labels + tones for every status
│   └── theme/tokens.ts               # brand colors, spacing, type scale
├── docs/MOBILE_APP_PLAN.md
├── app.json
├── eas.json
├── eslint.config.js
└── package.json
```

---

## 8. Next steps

1. **Phase 0 — backend** (website repo):
   - `lib/api-auth.ts` accepting cookie or bearer
   - `lib/mobile-auth.ts` + JWT login endpoint
   - `/api/mobile/v1/summary`
2. **Phase 0 — mobile**: wire the login screen to the real endpoint.
3. **Phase 1**: replace dashboard placeholders with `useSummary()` data.
4. **Phase 2**: demandes list + detail + status actions.
5. Continue with the phases in `docs/MOBILE_APP_PLAN.md`.

---

## 9. Notes

- No `android/` or `ios/` folders are committed. The project uses the Expo
  managed workflow; run `npx expo prebuild` only if a native module requires it.
- The session token is stored with `expo-secure-store` on device and
  `localStorage` on web.
- Never put `CONVEX_ADMIN_SECRET`, `ADMIN_PASSWORD` or any server secret in this
  project. The app only talks to the Next.js API.
- Brand colors: `#219EBC`, `#023047`, `#8ECAE6`, `#FFB703`, `#FB8500`.

---

## 10. Troubleshooting

### "Project is incompatible with this version of Expo Go"

This project uses **Expo SDK 58**. It requires a matching Expo Go client:

| Platform | Minimum Expo Go |
|---|---|
| Android | **58.0.5** |
| iOS | **58.0.7** |

1. Update Expo Go from the Play Store / App Store.
2. **Android, if no update is offered:** download the official SDK 58 client
   directly and install it on the phone:
   <https://github.com/expo/expo-go-releases/releases/download/Expo-Go-58.0.5/Expo-Go-58.0.5.apk>
3. Uninstall the old Expo Go first if Android refuses the install.
4. **Android emulator:** uninstall the old client, then run `pnpm android` — the
   Expo CLI installs the matching Expo Go automatically.
5. **iOS, if the App Store has no update yet:** use a development build
   (`eas build --profile development --platform ios`) or wait for the store
   rollout. iOS cannot sideload Expo Go.

### "TypeScript: The tsconfig.json#include property has been updated"

This is normal. The Expo CLI rewrites `tsconfig.json` to its current defaults on
first start. No action needed.

### pnpm warns about build scripts

pnpm 11 reads project settings from `pnpm-workspace.yaml`. This repository
already allows the required build scripts there:

```yaml
nodeLinker: hoisted
onlyBuiltDependencies:
  - esbuild
  - sharp
  - unrs-resolver
```

If you still see the warning, run `pnpm approve-builds` and select those three
packages.

### Phone cannot reach the API

- Confirm the phone and computer are on the same Wi-Fi.
- Use the computer's LAN IPv4 address from `ipconfig`, not `localhost`.
- Allow Node.js through Windows Firewall (private networks).
- Confirm the Next.js server is running on port `3000`.
- Restart Expo after changing `.env.local`: `pnpm start -c`.
