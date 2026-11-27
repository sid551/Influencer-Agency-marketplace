# Creator–Business Collaboration Marketplace

A two-sided marketplace connecting social media creators with businesses for
paid collaborations. The creator-facing platform is complete, and the business
side now covers onboarding, campaign discovery, campaign management, application
reviews, campaign-wise messaging, collaboration management and notifications.

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

### Email delivery with Brevo

Production auth emails are sent through Brevo SMTP. Local development keeps
using the built-in Inbucket testing inbox, so no Brevo credentials are needed
for `npm run dev`. See [docs/brevo-email.md](docs/brevo-email.md) for the exact
Brevo/Supabase settings, required secrets, and the `npm run configure:brevo`
script.

### 4. Set up the database

Migrations live in `supabase/migrations/` and are applied in filename order.

**Option A — Supabase CLI (recommended):**

```bash
supabase login                 # once, with your Supabase access token
supabase link --project-ref <your-project-ref>
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
| `rahul@example.com` | creator | Partial onboarding (step 4) |
| `acme@example.com` | business | Demo campaigns, collaborations, unread messages and notifications |

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run configure:brevo` | Configure hosted Supabase Auth SMTP using Brevo |
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
  before discovery unlocks. Partial progress is stored in
  `creator_profiles.onboarding_step` (completed-step count, never decreases).

## Implemented in Phase 4

- **Profile hub:** the creator profile is the single source of truth for
  profile, focus area, social-account and verification data; the profile page
  and edit form are backed by services and revalidated after each change.

## Implemented in Phase 5

- **Social accounts and portfolio:** creators can add/remove social accounts
  and manage portfolio items with validated URLs; both appear on the profile.

## Implemented in Phase 6

- **Campaign discovery and applications:** creators can browse published and
  active campaigns, open campaign details, submit one validated application per
  campaign, and track application status.

## Implemented in Phase 7

- **Collaborations:** creator list and detail pages show agreed terms, price,
  deadlines, deliverables and status. Collaborations start when a business
  accepts a creator application; creators can negotiate terms while an
  agreement is open, submit
  deliverables, and request only the status transitions allowed by the
  database trigger (never self-approving).
- **Messaging:** one conversation per collaboration, an inbox sorted by recent
  activity, unread counts (also shown in the creator nav), and a live thread
  backed by Supabase Realtime. Opening a thread marks the other party's
  messages as read; the sender never sets `read_at`.
- **Database support:** `20261125000006_phase7_collaborations.sql` bumps
  `conversations.updated_at` on new messages; newer migrations open a
  collaboration and its conversation when an application is accepted. Both use `SECURITY
  DEFINER` functions with a fixed `search_path` so they work within the
  existing RLS model.

## Implemented in Phase 8

- **Notification centre:** `/creator/notifications` lists application decisions,
  new messages, collaboration decisions, deadlines and verification
  updates. Creators can filter unread items, mark one or all as read, dismiss
  notifications, and receive new rows live through Supabase Realtime. An unread
  count sits next to the nav link and revalidates with the creator layout.
- **Event-driven delivery:** `20261125000007_phase8_notifications.sql` adds
  `SECURITY DEFINER` triggers that emit notifications when
  application/collaboration statuses change, messages arrive, or verification
  claims are reviewed. Actor checks suppress self-notifications and seed/system
  writes; all helpers use a fixed `search_path`.
- **Verification requests:** the verification section on `/creator/profile`
  lets creators open manual review claims for identity documents,
  Instagram/YouTube account ownership and audience quality. Evidence uploads go
  to the private `verification-docs`
  bucket under the caller's folder, and pending/expired claims can be cancelled.
  Claim status, reviewer notes and expiry are visible to the owner; only admins
  can set a claim to `verified`.

## Currency

All monetary amounts are stored and displayed in Indian Rupees (INR, ₹) with
Indian digit grouping. Existing USD amounts were relabeled as INR without
changing their numeric values; no exchange-rate conversion was applied.

## Architecture

```text
src/
├── app/            # Routes (App Router). Route groups: (marketing), (auth);
│                   # feature areas: creator/ and business/ (both implemented)
├── components/     # UI only — no data fetching or business logic
│   ├── ui/         # shadcn/ui primitives
│   ├── shared/     # components reused across feature areas
│   ├── creator/    # creator feature components
│   └── business/   # business feature components
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
- [x] **Phase 4** — Creator profile hub
- [x] **Phase 5** — Social accounts and portfolio
- [x] **Phase 6** — Campaign discovery and applications
- [x] **Phase 7** — Collaborations and messaging
- [x] **Phase 8** — Notifications and verification
- [x] **Phase 9** — Testing, security review, deployment preparation
- [x] **Phase 10** — Business onboarding, dashboard and campaign management
- [x] **Phase 11** — Business application reviews and campaign collaborations
- [x] **Phase 12** — Business collaboration management
- [x] **Phase 13** — Business messaging and notifications

## Implemented in Phase 10

- **Business access:** `business` accounts land on `/business`; creator accounts
  land on `/creator/discover`; `/creator` and `/business` redirect role
  mismatches to the correct home, and `/home` resolves the role after
  authentication.
- **Company onboarding and profile:** business signup creates only a `profiles`
  row, so onboarding inserts and then maintains `business_profiles` with
  validated company details.
- **Dashboard:** campaign-wise application counts only, plus company details,
  all scoped to the signed-in business by RLS. Applicant names stay on the
  campaign's own applications page and in Messages.
- **Campaign management:** businesses can create draft or published campaigns,
  edit them, and change their status; IDs and all form fields are validated on
  the server before reaching a service.

## Implemented in Phase 11

- **Application reviews:** applications live inside their own campaign page
  (`/business/campaigns/[id]/applications`), where businesses filter by status,
  open the full proposal, and accept or decline it. There is no
  global Applications list or sidebar link. A business can accept more than one
  applicant per campaign.
  Allowed transitions mirror the database trigger; terminal states have no
  actions.
- **Accepted applications:** every accepted application opens its own
  collaboration and message thread through a database trigger; there is no
  separate invitation flow. Price and scope stay open for negotiation — an
  application's asking price is never fixed as the agreed price.
- **Final selection:** after talking with the accepted creators, a business
  agrees a price and finalizes one. The chosen collaboration becomes active;
  the other accepted applications are declined and their open negotiations
  are cancelled. Creators can counter-offer in chat or decline the work, which
  rejects their application and closes the negotiation.

## Implemented in Phase 12

- **Collaboration overview:** the business collaborations tab lists only
  finalized collaborations (where both parties agreed), filterable by status,
  with a scoped detail page. Negotiations stay in campaign-wise Messages.
- **Negotiation:** both parties can edit price, currency, deadline and terms
  while the agreement is open; businesses also own the agreed deliverable list,
  with each item's status and creator-supplied asset link preserved.
- **Review and approval:** after the creator submits work, businesses approve
  individual deliverables, then approve the collaboration only when every item
  is approved. Revision requests, disputes and completion use the same
  business-side transition map as the database trigger.
- **Workflow safety:** Server Actions validate UUIDs and form payloads with
  Zod, re-check ownership with `requireBusiness()`, and rely on RLS plus the
  transition/milestone triggers as the final authority. Workflow timestamps and
  revision notes remain database-owned, so there is no client write path for
  them.

## Implemented in Phase 13

- **Business messaging:** `/business/messages` lists campaigns with per-campaign
  application and accepted-creator counts and unread totals.
  `/business/messages/campaigns/[campaignId]` shows that campaign's creators
  (accepted by default, with a finalized filter), and
  `/business/messages/[id]` renders a live thread. Both sides can negotiate
  price and terms directly from the thread; the business can decline or
  finalize there, and the creator can decline the work. Businesses can open a
  thread from an accepted applicant or a collaboration detail page (creating
  it on first use), send validated messages, and mark creator messages read.
  Ownership is checked with `business_profile_id` and enforced by RLS;
  Realtime delivers new messages and read receipts.
- **Business notifications:** `/business/notifications` shows new applications,
  collaboration updates and messages. Businesses can filter
  unread items, mark one or all as read, dismiss notifications, and receive new
  rows live through Realtime. Unread badges stream in the business nav.
- **Database support:** `20261126000009_phase13_business_notifications.sql`
  adds `SECURITY DEFINER` triggers (fixed `search_path`) for creator actions that
  previously produced no business notification: new applications and
  creator-side collaboration transitions, including `submitted`.
  All generated links point at implemented `/business` routes, and actor checks
  prevent self-notifications and seed/system writes.

## Testing

Run the automated quality checks from the project root:

```bash
npm run lint
npm run typecheck
npm test          # Vitest: schemas, redirects, IDs and client filtering
npm run test:watch
npm run build
```

The same checks (plus a production build and dependency audit) run in GitHub
Actions on pushes to `master` and on every pull request
(`.github/workflows/ci.yml`). CI uses placeholder Supabase values; no real
credentials are needed for lint, test or build.

Async Server Components and RLS behavior are verified against Supabase rather
than mocked in unit tests:

```bash
supabase start
supabase db reset                        # applies migrations + seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/tests/rls_assertions.sql
```

`supabase/tests/rls_assertions.sql` exercises the policies as creator and
business roles (by switching the JWT subject), and confirms that admin-only
writes are rejected for non-admins. It includes the Phase 9 hardening assertions
(trigger-only notifications, scoped verification evidence and workflow-owned
timestamps).

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
2. Keep the repository root as the project root (there is no nested
   `creator-marketplace/` directory). Vercel detects Next.js; use `npm ci` and
   `npm run build` if you override the defaults, with Node.js 22.
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
6. Configure Brevo SMTP and email confirmations as described in
   [docs/brevo-email.md](docs/brevo-email.md).
7. After deployment, smoke-test signup → confirmation email → login, a creator
   page, a protected action, and a 404 URL. Confirm the automated CI run is
   green before release.
