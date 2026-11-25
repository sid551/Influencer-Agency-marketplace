# Creator–Business Collaboration Marketplace

A two-sided marketplace connecting social media creators with businesses for
paid collaborations. This repository currently implements the **creator-facing
platform**; the business side exists as folder structure only and will be
built in a later phase.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui (Radix primitives) + Lucide icons |
| Backend | Next.js Server Components / Server Actions / Route Handlers |
| Database | Supabase PostgreSQL (with Row Level Security) |
| Auth | Supabase Auth (`@supabase/ssr` cookie sessions) |
| Storage | Supabase Storage |
| Forms | React Hook Form + Zod |
| Deployment | Vercel |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Purpose | Required for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) | everything |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key (public) | everything |
| `SUPABASE_SECRET_KEY` | Supabase secret key (**server-only**) | privileged server operations |
| `NEXT_PUBLIC_SITE_URL` | App base URL for auth redirects/emails | auth flows |
| `DATABASE_URL` | Direct DB connection (migrations tooling only) | running migrations |

> Never prefix `SUPABASE_SECRET_KEY` or `DATABASE_URL` with `NEXT_PUBLIC_`.

### 3. Configure Supabase Auth

In the Supabase Dashboard → **Authentication → URL Configuration**, set:

- Site URL: `http://localhost:3000` (or your production URL — must match
  `NEXT_PUBLIC_SITE_URL`)
- Additional redirect URLs (add the production equivalents when deploying):

  ```text
  http://localhost:3000/auth/confirm
  http://localhost:3000/auth/confirm?next=/reset-password
  ```

GoTrue rejects redirect URLs that are not allow-listed and silently falls back
to the Site URL, which breaks email confirmation and password-reset links.
The local allow-list is kept in `supabase/config.jsonc`.

### 4. Set up the database

Migrations live in `supabase/migrations/` and are applied in filename order.

**Option A — Supabase CLI (recommended):**

```bash
supabase login                 # once, with your Supabase access token
supabase link --project-ref jpebrwagpsvutixdyrhi
supabase db push               # apply migrations to the hosted project
```

**Local development stack** (requires Docker):

```bash
supabase start                 # local Postgres + Auth + Storage + Studio
supabase db reset              # re-apply all migrations + seed data
```

**Option B — SQL Editor:** open each file in `supabase/migrations/` in order
in the Supabase Dashboard SQL Editor and run them top to bottom.

### 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

#### Seed data

`supabase/seed.sql` creates demo accounts (password `password123`):

| Email | Role | Notes |
| --- | --- | --- |
| `mia@example.com` | creator | Fully onboarded, active collaboration, unread messages |
| `rahul@example.com` | creator | Partial onboarding (step 4), pending invitation |
| `acme@example.com` | business | Owns the demo campaigns (UI not built yet) |

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting files |

## Implemented in Phase 3

- **Auth:** role-aware signup (`creator` / `business`), login, logout,
  email confirmation (PKCE and OTP links), resend confirmation, forgot-password
  and reset-password flows. All inputs are re-validated with Zod in Server
  Actions; `next` redirect targets are restricted to same-origin paths.
- **Route gating:** `src/proxy.ts` refreshes Supabase cookies and redirects
  logged-out visitors away from `/creator/*`; signed-in users are redirected
  away from `/login` and `/signup`.
- **Creator onboarding:** 12 validated steps with save/resume, review/edit,
  social-account add/remove, save & exit, and a server-side completion check
  before the dashboard unlocks. Partial progress is stored in
  `creator_profiles.onboarding_step` (completed-step count, never decreases).
- **Dashboard:** read-only creator dashboard with real profile, focus areas and
  social-account data. Campaign discovery, applications and messaging are
  intentionally deferred to later phases.

## Implemented in Phase 7

- **Collaborations:** creator list and detail pages show invitations, agreed
  terms, price, deadlines, deliverables and status. Creators can accept or
  decline invitations, negotiate terms while an agreement is open, submit
  deliverables, and request only the status transitions allowed by the
  database trigger (never self-approving).
- **Messaging:** one conversation per collaboration, an inbox sorted by recent
  activity, unread counts (also shown in the creator nav), and a live thread
  backed by Supabase Realtime. Opening a thread marks the other party's
  messages as read; the sender never sets `read_at`.
- **Database support:** `20261125000006_phase7_collaborations.sql` opens a
  collaboration and its conversation when an invitation is accepted, and
  bumps `conversations.updated_at` on new messages. Both use `SECURITY
  DEFINER` functions with a fixed `search_path` so they work within the
  existing RLS model.

## Implemented in Phase 8

- **Notification centre:** `/creator/notifications` lists application decisions,
  invitations, new messages, collaboration decisions, deadlines and verification
  updates. Creators can filter unread items, mark one or all as read, dismiss
  notifications, and receive new rows live through Supabase Realtime. An unread
  count sits next to the nav link and revalidates with the creator layout.
- **Event-driven delivery:** `20261125000007_phase8_notifications.sql` adds
  `SECURITY DEFINER` triggers that emit notifications when invitations are sent,
  application/collaboration statuses change, messages arrive, or verification
  claims are reviewed. Actor checks suppress self-notifications and seed/system
  writes; all helpers use a fixed `search_path`.
- **Verification requests:** `/creator/verification` lets creators open manual
  review claims for identity documents, Instagram/YouTube account ownership and
  audience quality. Evidence uploads go to the private `verification-docs`
  bucket under the caller's folder, and pending/expired claims can be cancelled.
  Claim status, reviewer notes and expiry are visible to the owner; only admins
  can set a claim to `verified`.

## Architecture

```text
src/
├── app/            # Routes (App Router). Route groups: (marketing), (auth);
│                   # feature areas: creator/ (implemented), business/ (placeholder)
├── components/     # UI only — no data fetching or business logic
│   ├── ui/         # shadcn/ui primitives
│   ├── shared/     # components reused across feature areas
│   ├── creator/    # creator feature components
│   └── business/   # placeholder for the future business side
├── lib/
│   ├── supabase/   # browser client, server client, proxy session helper
│   ├── auth/       # role helpers, guards
│   ├── validations/# Zod schemas (server-side validation)
│   └── utils/      # general utilities
├── services/       # database/business logic (repositories), used by pages/actions
├── types/          # shared TypeScript types incl. generated DB types
└── proxy.ts        # Next.js 16 proxy — refreshes auth session cookies
```

### Key decisions

- **`proxy.ts` instead of `middleware.ts`** — Next.js 16 deprecated the
  middleware file convention; `proxy.ts` runs the same role (session refresh)
  on the Node.js runtime.
- **Server components by default** — client components are used only where
  interactivity is required (forms, dialogs, live updates).
- **Services own all DB access** — pages and actions call service modules,
  never issue ad-hoc queries, so authorization logic stays in one layer.
- **RLS is the security boundary** — every user-facing query runs with the
  end user's session; the secret key never leaves the server.
- **Role-based access** — `profiles.role` (creator | business | admin) drives
  route guards; creator and business areas are isolated from each other.

## Development phases

- [x] **Phase 1** — Project setup, dependencies, folder structure, Supabase configuration
- [x] **Phase 2** — Database schema, migrations, RLS policies
- [x] **Phase 3** — Authentication and creator onboarding
- [x] **Phase 4** — Creator dashboard and profile
- [x] **Phase 5** — Social accounts and portfolio
- [x] **Phase 6** — Campaign discovery and applications
- [x] **Phase 7** — Collaborations and messaging
- [x] **Phase 8** — Notifications and verification
- [x] **Phase 9** — Testing, security review, deployment preparation

## Testing

Run the automated quality checks from `creator-marketplace/`:

```bash
npm run lint
npm run typecheck
npm test          # Vitest: schemas, redirects, IDs and client filtering
npm run test:watch
npm run build
```

The same checks run in GitHub Actions on pushes to `main` and on every pull
request (`.github/workflows/ci.yml`). CI uses placeholder Supabase values; no
real credentials are needed for lint, test or build.

Async Server Components and RLS behavior are verified against Supabase rather
than mocked in unit tests:

```bash
supabase start
supabase db reset                        # applies migrations + seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/tests/rls_assertions.sql
```

`supabase/tests/rls_assertions.sql` exercises the policies as creator, business
and admin roles, including the Phase 9 hardening assertions (trigger-only
notifications, scoped verification evidence and workflow-owned timestamps).

## Security review

Phase 9 added `supabase/migrations/20261125000008_phase9_security.sql`. It is a
new migration rather than an edit to earlier history, so existing projects get
the fixes with `supabase db push`:

- `create_notification()` is trigger-only; the anon/authenticated roles can no
  longer forge notifications through PostgREST RPC.
- Direct notification inserts are limited to admins.
- Verification claims must reference the caller's own social account and an
  evidence path inside their own storage folder.
- Storage UPDATE/DELETE policies keep objects in the owner's folder.
- Collaboration timestamps are set by a database trigger and are no longer
  client-writable.
- Server Actions validate bound row IDs, decisions and OTP types at runtime.
- User-supplied URLs are restricted to HTTP(S) before rendering.

`npm audit` currently reports zero vulnerabilities. Production error responses
use generic messages; `error.digest` can be correlated with server logs.

## Deployment (Vercel)

1. Push the repository to GitHub and import it in Vercel.
2. Set the project root directory to `creator-marketplace`. Vercel detects
   Next.js; use `npm ci` and `npm run build` if you override the defaults, with
   Node.js 22.
3. Add the environment variables from `.env.example` in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (the production origin, no trailing slash)
   - `SUPABASE_SECRET_KEY` only if an admin script needs it; the app runtime
     never uses a secret key.
4. Apply every migration in `supabase/migrations/` to the production database
   (`supabase db push` or the Supabase SQL editor). Do not rely on `seed.sql`
   in production.
5. In Supabase Dashboard → Authentication → URL Configuration:
   - set Site URL to the production origin;
   - add `https://<your-domain>/auth/confirm` to redirect URLs.
6. After deployment, smoke-test signup/login, a creator page, a protected
   action, and a 404 URL. Confirm the automated CI run is green before release.
