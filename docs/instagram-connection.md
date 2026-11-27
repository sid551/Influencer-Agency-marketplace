# Instagram connection (creator onboarding)

The creator onboarding social step offers **Connect Instagram**, modelled on
Hypee's creator flow: a prominent card, a "skip for now" path via **Save &
continue**, and a self-reported manual fallback. Connecting verifies ownership
through Instagram Business Login and shows real follower counts instead of
"Not verified".

## What was implemented

- `GET /api/auth/instagram` — requires a creator session, stores a short-lived
  HttpOnly CSRF `state` cookie, and redirects to Instagram with a
  server-built authorization URL. Accepts `?return=/creator/onboarding` or
  `?return=/creator/settings` (same-origin paths only).
- `GET /api/auth/instagram/callback` — validates `state`, exchanges the code
  for a 60-day token, reads the professional account profile, and persists
  through a privileged RPC. Redirects back with `?instagram=connected` or a
  fixed `?instagram_error=<code>`; no token or Meta error text reaches the URL.
- `public.connect_instagram_account` / `public.disconnect_instagram_account` —
  `SECURITY DEFINER` functions. Owner grants deliberately forbid writing
  `social_accounts.verification_*`, so only these functions can mark an
  account `verified` / `oauth`.
- `public.instagram_connections` — encrypted token storage (AES-256-GCM),
  no table grants and no RLS policies. Only the RPCs can access it.
- Settings shows connection status and a **Disconnect** button, which deletes
  the encrypted token and the verified account rows.

## Meta app setup

1. Create a Meta app at <https://developers.facebook.com/apps/> and add the
   **Instagram** product. Use **Business Login for Instagram** (Instagram
   Login), not the retired Basic Display API.
2. Add this exact OAuth redirect URI under Instagram → Business Login →
   Settings (trailing slashes matter):

   ```text
   http://localhost:3000/api/auth/instagram/callback
   https://your-domain.com/api/auth/instagram/callback
   ```

3. Request these permissions. The defaults are the first two; add the others
   only if you need comment/message tooling and have App Review approval:

   ```text
   instagram_business_basic
   instagram_business_manage_insights
   instagram_business_manage_comments
   instagram_business_manage_messages
   ```

4. Creators need an Instagram **Business** or **Creator** account. To serve
   accounts you don't own/administer, submit the app for Advanced Access and
   Business Verification — until then Meta limits testing to app roles.
5. Meta recommends **Instagram API with Unified Login** for brand-new apps.
   This implementation intentionally matches Hypee's Instagram-Login flow
   (`instagram_business_*`, `graph.instagram.com`). See
   <https://developers.facebook.com/documentation/instagram-platform/overview>
   before changing flows.

## Environment and database

Add to `.env.local`:

```bash
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
INSTAGRAM_TOKEN_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
```

Apply the migration with `supabase db push` (or the SQL Editor), then
regenerate typed Supabase types:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

Until all three variables are set, onboarding shows the card with a disabled
button and explains that connecting is not configured yet.

## Operational notes

- Long-lived tokens are valid for 60 days. Refreshing them (or handling
  revoked/expired tokens) is not implemented yet; when Meta returns an error
  the creator can disconnect and reconnect. A scheduled refresh job can call
  `https://graph.instagram.com/refresh_access_token` and update the encrypted
  columns via a new privileged RPC.
- Disconnect mirrors Hypee's stated data policy: token deleted immediately,
  verified account removed, self-reported accounts left untouched.
- `followers_count` may be unavailable if the insights permission is not
  granted; the account is still verified from the basic profile.
