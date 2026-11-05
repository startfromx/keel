# M0 Spec — Repo, Supabase, Auth, CLAUDE.md, Deploy pipeline

**Done when:** navigate to the live Cloudflare URL, sign in (or create account), land on `/dashboard`, refresh, session persists.

---

## 1. What M0 delivers

| Deliverable | Description |
|---|---|
| `CLAUDE.md` | Repo-level instructions for every future Claude Code session |
| Next.js scaffold | App Router, TypeScript, Tailwind, Supabase SSR wired |
| Supabase auth | Email + password; Singapore region; RLS skeleton |
| Auth UI | `/auth/sign-in` and `/auth/sign-up` pages; protected `/dashboard` |
| Cloudflare deploy | OpenNext build; `wrangler.toml`; GitHub Actions CI on push to `main` |

No business logic, no data schema (that is M1), no canvas.

---

## 2. External setup (manual, before code)

### 2a. Supabase project
- Create project: region **ap-southeast-1 (Singapore)**, name `keel`.
- Authentication → Providers → Email: enable **Confirm email = off** for dev speed (turn on before pilot).
- Note: `Project URL`, `anon key`, `service_role key`.
- Do **not** create any tables yet (M1 owns the schema migration).

### 2b. Cloudflare account
- Confirm a Workers-compatible Cloudflare account exists.
- Create an API token with **Edit Cloudflare Workers** permission.
- Note: `Account ID`, `API token`.

### 2c. GitHub secrets (add to repo Settings → Secrets → Actions)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

---

## 3. File tree

```
/
├── CLAUDE.md
├── PLAN.md                        (already exists)
├── brief-recipe-v1.yaml           (already exists)
├── package.json
├── tsconfig.json
├── next.config.ts
├── open-next.config.ts
├── wrangler.toml
├── .env.local                     (gitignored; dev secrets)
├── .env.example                   (committed; template)
├── tailwind.config.ts
├── postcss.config.mjs
├── src/
│   ├── middleware.ts              (Supabase session refresh on every request)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts         (browser client, singleton)
│   │       └── server.ts         (server-side client using cookies)
│   └── app/
│       ├── layout.tsx            (root layout; Tailwind base styles)
│       ├── page.tsx              (redirects: authed → /dashboard, else → /auth/sign-in)
│       ├── auth/
│       │   ├── sign-in/
│       │   │   └── page.tsx
│       │   ├── sign-up/
│       │   │   └── page.tsx
│       │   └── callback/
│       │       └── route.ts      (Supabase auth callback handler)
│       └── dashboard/
│           └── page.tsx          (protected; shows user email and sign-out button)
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 4. File descriptions

### `CLAUDE.md`
Exact text from PLAN.md §12, plus one added line pointing to `tasks/` for milestone specs:

```
- Read PLAN.md and brief-recipe-v1.yaml before any work.
- Engine code must never contain brief-specific logic; everything comes from the recipe.
- Rules engine is pure TypeScript with unit tests; AI never decides statuses alone.
- Never auto-apply AI changes to nodes; always via a proposal the user applies.
- Private notes must never be included in shareable outputs (enforce in code).
- Supabase RLS on every table. No secrets in client code.
- Small, surgical changes. Explain the plan before editing files.
- Work one milestone at a time; stop and show me when its "done when" is met.
- Each milestone has a spec in tasks/M<n>-spec.md; read it before starting.
```

### `package.json`
App name `keel`. Key dependencies:

| Package | Purpose |
|---|---|
| `next` (latest stable) | App framework |
| `react`, `react-dom` | |
| `@supabase/supabase-js` | Supabase client |
| `@supabase/ssr` | Cookie-based server auth helpers |
| `@opennextjs/cloudflare` | Cloudflare Workers adapter for Next.js |
| `wrangler` (dev) | Cloudflare deploy CLI |
| `typescript`, `@types/node`, `@types/react`, `@types/react-dom` | (dev) |
| `tailwindcss`, `postcss`, `autoprefixer` | (dev) |

Scripts:
- `dev` → `next dev`
- `build` → `next build` (OpenNext intercepts this)
- `preview` → `wrangler dev` (local preview of the Worker)
- `deploy` → `opennextjs-cloudflare build && wrangler deploy`

### `next.config.ts`
- No special options needed for M0 beyond the OpenNext adapter hook.
- `output` must **not** be set to `export` (OpenNext does not support static export).

### `open-next.config.ts`
- Use `@opennextjs/cloudflare` adapter.
- Default config is sufficient for M0.

### `wrangler.toml`
- `name = "keel"`
- `main = ".open-next/worker.js"` (output of OpenNext build)
- `compatibility_date` = current date at build time.
- `compatibility_flags = ["nodejs_compat"]`
- Do **not** commit `NEXT_PUBLIC_SUPABASE_URL` or keys here; they go in GitHub secrets and in `.dev.vars` locally.

### `.env.example`
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### `src/lib/supabase/client.ts`
Browser-side singleton using `createBrowserClient` from `@supabase/ssr`. Reads `NEXT_PUBLIC_*` env vars.

### `src/lib/supabase/server.ts`
Server-side factory function using `createServerClient` from `@supabase/ssr`. Reads cookies from the Next.js `cookies()` store. Returns a fresh client per call (do not cache across requests).

### `src/middleware.ts`
- Matches all routes except `/_next/**`, `/favicon.ico`, and static assets.
- Calls `supabase.auth.getUser()` to refresh the session token on every request.
- Rewrites the response with updated `Set-Cookie` headers so tokens stay fresh.
- **Does not redirect** unauthenticated users — that is handled per-page in Server Components.

The middleware must write cookies via `request` and `response` objects; this is the standard `@supabase/ssr` pattern and must be followed exactly, otherwise sessions break on refresh.

### `src/app/layout.tsx`
- Sets `<html lang="en">`.
- Imports Tailwind globals.
- No auth logic here.

### `src/app/page.tsx`
Server Component. Calls server Supabase client, checks `getUser()`:
- Authenticated → `redirect('/dashboard')`
- Not authenticated → `redirect('/auth/sign-in')`

### `src/app/auth/sign-in/page.tsx`
Client Component. Email + password form. On submit calls `supabase.auth.signInWithPassword`. On success, router pushes to `/dashboard`. Shows inline error on failure.

No third-party UI library for M0; plain Tailwind form is fine. Minimal style: centered card, 400px max-width.

### `src/app/auth/sign-up/page.tsx`
Same structure as sign-in but calls `supabase.auth.signUp`. Link to sign-in below the form.

### `src/app/auth/callback/route.ts`
GET handler. Exchanges `?code=` query param for a session using `supabase.auth.exchangeCodeForSession`. Redirects to `/dashboard` on success, `/auth/sign-in?error=1` on failure. Required for OAuth and magic link flows even though M0 uses only email+password — keeps the door open.

### `src/app/dashboard/page.tsx`
Server Component. Calls `getUser()`. If no user, redirects to `/auth/sign-in`. Renders:
- User email
- "Sign out" button (a form action that calls `supabase.auth.signOut` and redirects to `/auth/sign-in`).

No dashboard content in M0; just proof the guard works.

### `.github/workflows/deploy.yml`
Trigger: `push` to `main`.

Steps:
1. Checkout.
2. Node 20 setup.
3. `npm ci`.
4. `npm run build` (OpenNext build).
5. `wrangler deploy` with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from secrets.

Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must also be injected as secrets so they are baked into the Next.js build. `SUPABASE_SERVICE_ROLE_KEY` is server-only; it must be set as a Cloudflare Worker secret via `wrangler secret put` (once, before first deploy) — not injected at build time.

---

## 5. Environment variable routing

| Var | Build-time (Next.js bakes it) | Runtime (Worker reads) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | — |
| `SUPABASE_SERVICE_ROLE_KEY` | no | yes (Cloudflare secret) |

For local dev: all three go in `.env.local`. For CI: the `NEXT_PUBLIC_*` go in GitHub Secrets (passed as `env:` in the workflow step); `SERVICE_ROLE_KEY` is set once with `wrangler secret put`.

---

## 6. Verification checklist

Execute in order after deploy:

1. `curl -I https://<worker>.workers.dev/` → 302 to `/auth/sign-in` (or the final domain).
2. Open the URL in a browser → sign-up form renders without console errors.
3. Create a new account with a real email → lands on `/dashboard`, shows the email.
4. Hard-refresh `/dashboard` → still logged in (session persisted via cookies).
5. Click Sign out → redirected to `/auth/sign-in`.
6. Navigate manually to `/dashboard` while logged out → redirected to `/auth/sign-in`.
7. Sign in with the account created in step 3 → lands on `/dashboard`.
8. In Supabase dashboard → Authentication → Users → account appears.

All 8 pass = M0 done.

---

## 7. Decisions carried forward from PLAN.md

| Decision | Value |
|---|---|
| Supabase region | Singapore (ap-southeast-1) |
| Auth method | Email + password (no OAuth in M0) |
| Email confirmation | Off for dev; on before pilot |
| Individuals only | No workspace/team tables in M0 |
| Client data | Supabase-hosted; RLS enforced from M1 onwards |

---

## 8. What M0 explicitly does NOT do

- No database tables or RLS policies (M1).
- No canvas, nodes, or recipes loaded at runtime.
- No middleware redirect logic (the middleware only refreshes tokens; redirects are per-page).
- No error boundary or toast system (not needed for 8-step verification).
- No staging environment (single Cloudflare Worker; rename with suffix later if needed).
