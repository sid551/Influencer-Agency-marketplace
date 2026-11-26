# Brevo email verification

This project uses **Supabase Auth** for sign-up, confirmation, resend, and
password-reset links. To send those emails through Brevo, configure Supabase
Auth to use **Brevo SMTP**. The app code already calls `signUp`, `resend`, and
`resetPasswordForEmail`, so no client-side changes are needed.

> Use SMTP, not the Brevo API key. Supabase builds the email and Brevo relays
> it. A Brevo API key will not work in the SMTP password field.

## What you need to give me

Do **not** paste secrets into chat or commit them. Put them in `.env.local` and
run the script, or enter them directly in the Supabase Dashboard.

| Value | Where to get it | Example |
| --- | --- | --- |
| `BREVO_SMTP_USER` | Brevo → **SMTP & API → SMTP** → SMTP login | `123456@smtp-brevo.com` |
| `BREVO_SMTP_KEY` | Brevo → **SMTP & API → SMTP** → generate an **SMTP key** | `sk_...` |
| `BREVO_SENDER_EMAIL` | A verified Brevo sender / authenticated domain | `no-reply@yourdomain.com` |
| `BREVO_SENDER_NAME` | Any display name | `Creator Marketplace` |
| `SUPABASE_PROJECT_REF` | Supabase project URL / settings | `abcdefghijklmnop` |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account → Access Tokens | `sbp_...` |
| `NEXT_PUBLIC_SITE_URL` | Production origin, no trailing slash | `https://example.com` |

The Supabase access token must belong to an **Admin** of the project and have
`auth:write` / `auth_config_write` permissions.

If you prefer not to share a Management API token, I can give you the exact
Dashboard fields to fill in instead.

## One-command setup for the hosted project

1. Copy the Brevo values into `.env.local` (gitignored).
2. Run:

   ```bash
   npm run configure:brevo
   ```

The script sets:

- custom SMTP via `smtp-relay.brevo.com:587`
- `mailer_autoconfirm: false`, so email confirmation is required
- Site URL and redirect allow-list for `/auth/confirm`
- sender name/email

It does not print the SMTP key or access token.

## Manual Dashboard setup

If you do not want to use the script:

1. **Brevo**
   - Authenticate your sending domain (DKIM/SPF/DMARC).
   - Create and verify a transactional sender.
   - Open **SMTP & API → SMTP** and copy the SMTP login.
   - Generate an **SMTP key** (not an API key).

2. **Supabase Dashboard → Authentication → Providers → Email**
   - Keep Email enabled.
   - Turn **Confirm email** on.
   - Turn **Secure email change** on.

3. **Supabase Dashboard → Authentication → SMTP**
   - Enable custom SMTP.
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: the Brevo SMTP login
   - Password: the Brevo SMTP key
   - Sender email: your verified Brevo sender
   - Sender name: e.g. `Creator Marketplace`

4. **Supabase Dashboard → Authentication → URL Configuration**
   - Site URL: `https://your-domain.com`
   - Add redirect URLs:

     ```text
     https://your-domain.com/auth/confirm
     https://your-domain.com/auth/confirm?next=/reset-password
     ```

5. **Rate limits**
   - Supabase starts custom SMTP at 30 emails/hour. Raise it in
     **Authentication → Rate Limits** if you expect signup spikes.

## Local development

Local Supabase still uses Inbucket by default. Confirmation emails are viewable
at `http://localhost:54324` after `supabase start`. This keeps real Brevo
credentials out of local development.

To send local emails through Brevo instead:

1. Export the `BREVO_*` values in your shell (or put them in a gitignored `.env`
   file that the Supabase CLI reads for `env(...)` substitution).
2. In `supabase/config.jsonc`, set `local_smtp.enabled` to `false` and uncomment
   the `auth.email.smtp` block.
3. Restart Supabase: `supabase stop && supabase start`.

## Verify it works

1. Sign up with a new email address.
2. Confirm the Brevo-branded email arrives (check Brevo → Transactional → Logs).
3. Click the confirmation link.
4. You should land on the role-based dashboard.
5. Try **Resend confirmation email** from `/verify-email`.
6. Try **Forgot password** and confirm the reset email also arrives via Brevo.

If the email says “Email address not authorized”, custom SMTP is not enabled on
the hosted Supabase project. If the link falls back to localhost, the Site URL
or redirect allow-list is wrong.
