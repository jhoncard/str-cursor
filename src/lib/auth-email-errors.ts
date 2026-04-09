/** Message shown when sign-up targets an email that already has an account. */
export const EMAIL_ALREADY_REGISTERED_MESSAGE =
  "An account with this email already exists. Sign in instead, or use “Forgot password” on the login page if you need to reset your password.";

type SignUpResult = {
  session: unknown;
  user: { identities?: unknown[] } | null;
};

/** Supabase may return an error, or (for privacy) a user with no identities and no session. */
export function isEmailAlreadyRegisteredOnSignUp(
  error: { message?: string; code?: string } | null,
  data: SignUpResult | null,
): boolean {
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const code = (error.code ?? "").toLowerCase();
    if (code === "email_exists" || code === "user_already_exists") return true;
    if (
      msg.includes("already registered") ||
      msg.includes("already exists") ||
      msg.includes("user already") ||
      msg.includes("email address is already") ||
      msg.includes("duplicate")
    ) {
      return true;
    }
  }
  const user = data?.user;
  if (
    user &&
    !data?.session &&
    Array.isArray(user.identities) &&
    user.identities.length === 0
  ) {
    return true;
  }
  return false;
}
