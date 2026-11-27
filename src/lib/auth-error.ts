/** Supabase/Auth error message → user-friendly copy. */
export function authErrorMessage(raw: string): string {
  const message = raw
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\+/g, " ");
  if (message.includes("otp expired") || message.includes("token expired")) {
    return "That link has expired. Request a new one to continue.";
  }
  if (message.includes("access denied") || message.includes("no code")) {
    return "That link couldn't be used. Request a new one to continue.";
  }
  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the link.";
  }
  if (
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    return "An account with that email already exists.";
  }
  if (
    message.includes("email rate limit") ||
    message.includes("email send rate limit")
  ) {
    return "We've hit this project's hourly email sending limit. Please wait a little while, then try again — and check Spam/Promotions for the earlier email.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (message.includes("you can only request this after")) {
    return "Wait a minute before requesting another email.";
  }
  if (message.includes("email provider") && message.includes("not")) {
    return "Email sending isn't set up on this project yet.";
  }
  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  return "We couldn't complete that request. Please try again.";
}
