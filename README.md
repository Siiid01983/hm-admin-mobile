# Hello Moving — Admin Mobile

A mobile admin application for **[hello-moving.com](https://hello-moving.com)** — a licensed
moving company serving the Tokyo / Kanto market. The app gives staff an on-the-go
console for the same backend that powers the website's admin panel: reviewing and
updating bookings, managing calendar availability, and monitoring the API — all in a
bilingual (Japanese-first) UI that follows the Hello Moving brand.

It talks to the existing self-hosted PHP + MySQL API at `https://hello-moving.com/hm-api`
(the very same endpoints the web admin uses), so there is **no separate backend** to run.

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **🔐 Authentication** | Email + password login against `admin-login.php`. The server mints the same HMAC admin token the web panel uses; it's stored in the device Keychain/Keystore via `expo-secure-store` (token + expiry + user). Sessions auto-expire client-side, and a global `401 → auto-logout` interceptor handles server-side token invalidation. |
| **📋 Booking Management** | Bookings list rendered as a mobile card feed (from `rest.php`). Tap through to a detail screen and change a booking's status (`確認中 / 確定 / 完了 / キャンセル`) via a React Query mutation that refreshes both the detail and the list. |
| **📅 Calendar View** | Dependency-free month grid. Pick a day to see per-band availability (午前 / 午後 / 夕方 / 夜間) from `availability.php`, and block/unblock bands via `block-slot.php`. Correctly distinguishes a real customer booking (read-only) from an admin block (removable). |
| **⚙️ Settings** | Signed-in admin identity + session expiry, a **live API health indicator** (`index.php`), build info, pull-to-refresh, clear-cache, and a confirm-gated logout that also clears cached data. |
| **🛡️ Resilience** | Root error boundary (branded recovery screen), sane React Query retry/reconnect defaults, and a shared error/retry state across screens. |

---

## 🧰 Tech Stack

- **[Expo](https://expo.dev) SDK 57** — React Native 0.86, React 19, TypeScript
- **[Expo Router](https://docs.expo.dev/router/introduction/)** — file-based navigation with typed routes (tab layout + dynamic booking route)
- **[NativeWind](https://www.nativewind.dev/) v4 + [Tailwind CSS](https://tailwindcss.com) v3** — utility-first styling with the Hello Moving brand palette
- **[TanStack React Query](https://tanstack.com/query) v5** — server-state, caching, and mutations
- **[Axios](https://axios-http.com)** — HTTP client with request/response interceptors (auth headers, auto-logout)
- **[expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)** — encrypted on-device session storage

---

## 🚀 Getting Started

### Requirements

- **Node.js 20+** and **npm**
- The **[Expo Go](https://expo.dev/go)** app on a physical device, **or** an iOS Simulator / Android Emulator
- (iOS Simulator requires macOS + Xcode; Android Emulator requires Android Studio)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the API

Runtime configuration lives in **`src/api/config.ts`**:

```ts
// Base URL of the self-hosted PHP API (same backend as the website).
export const API_BASE = 'https://hello-moving.com/hm-api';

// PUBLIC client API key (bot/abuse deterrent, NOT user auth) — mirrors the
// website's window.API_KEY. Real authorization is the admin session token.
export const API_KEY = '…';
```

- `API_BASE` — point this at your API host if you run against staging/local.
- `API_KEY` — the public client key sent as `X-API-KEY`. It is not user authentication
  (that's the admin session token obtained at login), so it ships with the app exactly as
  it does with the website.

> **Optional — environment variables:** to avoid editing source, you can migrate these to
> Expo's public env convention. Add `EXPO_PUBLIC_API_BASE` / `EXPO_PUBLIC_API_KEY` to a
> `.env` file and read them in `config.ts`:
> ```ts
> export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://hello-moving.com/hm-api';
> export const API_KEY  = process.env.EXPO_PUBLIC_API_KEY  ?? '';
> ```
> Only variables prefixed `EXPO_PUBLIC_` are exposed to the app bundle.

### 3. Run

```bash
npm start          # Expo dev server (scan the QR with Expo Go)
npm run ios        # open in the iOS Simulator
npm run android    # open in the Android Emulator
npm run web        # run in the browser (react-native-web)
```

Log in with an admin account provisioned in the backend's `admin_users` table.

---

## 📁 Project Structure

```
src/
├── app/                      # Expo Router routes (file-based)
│   ├── _layout.tsx           # Root stack · QueryClient · ErrorBoundary
│   ├── login.tsx             # Login screen
│   ├── (tabs)/               # Authenticated area (auth guard in _layout)
│   │   ├── _layout.tsx       # Tab navigator
│   │   ├── index.tsx         # 予約 — bookings list
│   │   ├── calendar.tsx      # カレンダー — availability + blocking
│   │   └── settings.tsx      # 設定 — profile, health, logout
│   └── booking/[id].tsx      # Booking detail + status actions
├── api/                      # Typed API layer (one module per concern)
│   ├── client.ts             # Axios instance + auth / auto-logout interceptors
│   ├── config.ts             # API_BASE / API_KEY
│   ├── types.ts              # Shared response/domain types
│   ├── auth.ts               # login / logout
│   ├── bookings.ts           # list / get / updateStatus
│   ├── calendar.ts           # availability / block / unblock
│   └── health.ts             # API health check
├── hooks/                    # React Query hooks (useBookings, useCalendar, …)
├── lib/                      # session.ts — SecureStore session helpers
└── components/               # Reusable UI (Screen, AdminCard, BookingTable,
                              #   StatusBadge, MonthCalendar, ErrorState, …)
```

---

## 🔌 Backend Endpoints Consumed

All requests carry the public `X-API-KEY`; authenticated requests also carry the
`X-ADMIN-TOKEN` session token (injected by the Axios request interceptor).

| Endpoint | Method | Used for |
|----------|--------|----------|
| `admin-login.php` / `admin-logout.php` | POST | Authentication |
| `rest.php` (table `bookings`) | POST | List / read / update bookings |
| `availability.php` | GET | Per-band availability for a date |
| `block-slot.php` | GET / POST | List / block / unblock calendar bands |
| `index.php` | GET | API health check (+ admin diagnostics) |

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the Expo dev server |
| `npm run ios` / `android` / `web` | Launch on a specific platform |
| `npm run lint` | Run Expo's ESLint config |
| `npm run reset-project` | Expo helper to reset to a blank app (not used in normal dev) |

---

## 📝 Notes

- **Type safety:** the project is strict-TypeScript; `npx tsc --noEmit` should stay green.
- **Calendar enforcement:** admin blocks always *display* as reserved, but are only
  *enforced* at customer-booking time when the backend's `slot_lock_enabled` flag is on.
- **Styling:** all UI uses NativeWind classes with the brand palette
  (`brand` `#2C3626`, `brand-sage` `#9AB57A`, `brand-cream` `#F9F9F6`) defined in
  `tailwind.config.js`.

---

_Internal tooling for Hello Moving. Not for public distribution._
