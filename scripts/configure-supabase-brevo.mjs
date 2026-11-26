/**
 * Configure a hosted Supabase project to send Auth emails through Brevo SMTP.
 *
 * Usage:
 *   npm run configure:brevo
 *
 * This reads secrets from the environment (or `.env.local` via the npm script).
 * It never prints the SMTP key or access token.
 */

const REQUIRED_VARS = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "BREVO_SMTP_USER",
  "BREVO_SMTP_KEY",
  "BREVO_SENDER_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function main() {
  for (const name of REQUIRED_VARS) requireEnv(name);

  const accessToken = requireEnv("SUPABASE_ACCESS_TOKEN");
  const projectRef = requireEnv("SUPABASE_PROJECT_REF");
  const siteUrl = withoutTrailingSlash(requireEnv("NEXT_PUBLIC_SITE_URL"));
  if (/localhost|127\.0\.0\.1/i.test(siteUrl)) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be the production origin, not localhost.",
    );
  }
  const smtpHost = process.env.BREVO_SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const smtpPort = process.env.BREVO_SMTP_PORT?.trim() || "587";
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Creator Marketplace";

  const body = {
    site_url: siteUrl,
    uri_allow_list: [
      siteUrl,
      `${siteUrl}/auth/confirm`,
      `${siteUrl}/auth/confirm?next=/reset-password`,
    ].join(","),
    external_email_enabled: true,
    // false means users must confirm their email before signing in.
    mailer_autoconfirm: false,
    mailer_secure_email_change_enabled: true,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: requireEnv("BREVO_SMTP_USER"),
    smtp_pass: requireEnv("BREVO_SMTP_KEY"),
    smtp_admin_email: requireEnv("BREVO_SENDER_EMAIL"),
    smtp_sender_name: senderName,
  };

  return { accessToken, projectRef, body };
}

async function patchAuthConfig({ accessToken, projectRef, body }) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Supabase Management API returned ${response.status}: ${text || response.statusText}`,
    );
  }

  console.log("Brevo SMTP configured for Supabase Auth.");
  console.log(`Project:      ${projectRef}`);
  console.log(`SMTP host:    ${body.smtp_host}:${body.smtp_port}`);
  console.log(`Sender:       ${body.smtp_admin_email} (${body.smtp_sender_name})`);
  console.log(`Site URL:     ${body.site_url}`);
  console.log("Email confirmations are enabled; test with a new signup.");
}

try {
  await patchAuthConfig(main());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
