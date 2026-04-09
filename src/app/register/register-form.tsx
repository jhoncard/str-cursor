"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isAppleAuthEnabled } from "@/lib/auth-providers";
import { oauthSignInAndRedirect } from "@/lib/supabase/oauth-sign-in";
import { createClient } from "@/lib/supabase/client";
import { sanitizeRedirectPath } from "@/lib/sanitize-redirect-path";
import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  isEmailAlreadyRegisteredOnSignUp,
} from "@/lib/auth-email-errors";
import { Sparkles, Mail } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="#000000"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain || !user) return email;
  const prefix = user.slice(0, Math.min(2, user.length));
  return `${prefix}•••@${domain}`;
}

type Panel = "oauth" | "email" | "verify";

export default function RegisterForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const nextPath = sanitizeRedirectPath(redirect, "/dashboard");
  const error = searchParams.get("error");

  const [panel, setPanel] = useState<Panel>("oauth");
  const [loading, setLoading] = useState<"google" | "apple" | "email" | "resend" | null>(
    null,
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleOAuth(provider: "google" | "apple") {
    setAuthError(null);
    setLoading(provider);
    const next = encodeURIComponent(nextPath);
    const callbackUrl = `${window.location.origin}/auth/callback?next=${next}`;
    const result = await oauthSignInAndRedirect(provider, callbackUrl);
    setLoading(null);
    if (!result.ok) {
      setAuthError(result.message);
    }
  }

  function buildEmailCallbackUrl() {
    const next = encodeURIComponent(nextPath);
    return `${window.location.origin}/auth/callback?next=${next}`;
  }

  async function handleEmailSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError(null);
    setResendMessage(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();

    if (!fn || !ln) {
      setAuthError("Please enter your first and last name.");
      return;
    }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setLoading("email");
    const supabase = createClient();
    const { data, error: signErr } = await supabase.auth.signUp({
      email: em,
      password,
      options: {
        emailRedirectTo: buildEmailCallbackUrl(),
        data: {
          full_name: `${fn} ${ln}`.trim(),
          first_name: fn,
          last_name: ln,
        },
      },
    });
    setLoading(null);

    if (isEmailAlreadyRegisteredOnSignUp(signErr, data)) {
      setAuthError(EMAIL_ALREADY_REGISTERED_MESSAGE);
      return;
    }

    if (signErr) {
      setAuthError(signErr.message);
      return;
    }

    if (data.session) {
      window.location.href = nextPath;
      return;
    }

    setPendingEmail(em);
    setPanel("verify");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleResendVerification() {
    if (!pendingEmail) return;
    setAuthError(null);
    setResendMessage(null);
    setLoading("resend");
    const supabase = createClient();
    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: buildEmailCallbackUrl() },
    });
    setLoading(null);
    if (resendErr) {
      setAuthError(resendErr.message);
      return;
    }
    setResendMessage("We sent another message. Check your inbox and spam folder.");
  }

  return (
    <main className="flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center">
            {panel === "verify" ? (
              <Mail className="w-6 h-6 text-white" aria-hidden />
            ) : (
              <Sparkles className="w-6 h-6 text-white" aria-hidden />
            )}
          </div>
        </div>

        {panel === "verify" ? (
          <>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#2b2b36] text-center">
              Verify your email
            </h1>
            <p className="mt-3 text-gray-600 text-sm text-center leading-relaxed">
              We sent a link to <strong>{maskEmail(pendingEmail)}</strong>. Open it
              to confirm your address and finish creating your account. The link
              expires after a while; you can request a new one below.
            </p>
            {resendMessage ? (
              <p className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                {resendMessage}
              </p>
            ) : null}
            {(authError || error) && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {authError ??
                  (error === "access_denied"
                    ? "Sign-in was cancelled."
                    : "Something went wrong.")}
              </div>
            )}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading !== null}
              className="mt-6 w-full rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-medium text-[#2b2b36] hover:bg-gray-50 disabled:opacity-60"
            >
              {loading === "resend" ? "Sending…" : "Resend verification email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel("email");
                setAuthError(null);
                setResendMessage(null);
              }}
              className="mt-3 w-full text-sm text-gray-600 hover:text-[#2b2b36] underline underline-offset-2"
            >
              Use a different email
            </button>
            <p className="mt-8 text-center text-sm text-[#2b2b36]/70">
              Already verified?{" "}
              <Link href="/login" className="font-semibold text-[#2b2b36] underline">
                Sign in
              </Link>
            </p>
          </>
        ) : panel === "email" ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] text-center">
              Sign up with email
            </h1>
            <p className="mt-2 text-gray-500 text-sm text-center">
              Create a password. We&apos;ll email you a link to confirm your address
              before you can sign in (if confirmation is enabled in your project).
            </p>
            <form onSubmit={handleEmailSignUp} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-first" className="block text-xs font-medium text-gray-600 mb-1">
                    First name
                  </label>
                  <input
                    id="reg-first"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
                  />
                </div>
                <div>
                  <label htmlFor="reg-last" className="block text-xs font-medium text-gray-600 mb-1">
                    Last name
                  </label>
                  <input
                    id="reg-last"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-xs font-medium text-gray-600 mb-1">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
                />
              </div>
              <div>
                <label htmlFor="reg-pass" className="block text-xs font-medium text-gray-600 mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  id="reg-pass"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
                />
              </div>
              <div>
                <label htmlFor="reg-pass2" className="block text-xs font-medium text-gray-600 mb-1">
                  Confirm password
                </label>
                <input
                  id="reg-pass2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
                />
              </div>
              {authError ? (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {authError}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={loading !== null}
                className="w-full rounded-xl bg-[#2b2b36] py-3.5 text-sm font-medium text-white hover:bg-[#363645] disabled:opacity-60"
              >
                {loading === "email" ? "Creating account…" : "Create account"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setPanel("oauth");
                setAuthError(null);
              }}
              className="mt-4 w-full text-sm text-gray-600 hover:text-[#2b2b36]"
            >
              ← Back to Google {isAppleAuthEnabled ? "/ Apple" : ""}
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36]">
                Create a guest account
              </h1>
              <p className="mt-2 text-gray-500 text-sm">
                Book direct, save on fees, and manage your trips in one place. Sign
                up with Google in one tap, or use your own email and password.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={loading !== null}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#2b2b36] py-3.5 font-medium text-white transition-colors hover:bg-[#363645] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              {loading === "google"
                ? "Redirecting..."
                : "Sign up with Google"}
            </button>

            {isAppleAuthEnabled ? (
              <>
                <div className="flex items-center gap-4 py-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400 select-none">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={() => handleOAuth("apple")}
                  disabled={loading !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 font-medium text-[#2b2b36] transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <AppleIcon />
                  {loading === "apple" ? "Redirecting..." : "Sign up with Apple"}
                </button>
              </>
            ) : null}

            <div className="flex items-center gap-4 py-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400 select-none">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => {
                setPanel("email");
                setAuthError(null);
              }}
              disabled={loading !== null}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-medium text-[#2b2b36] hover:bg-gray-50 disabled:opacity-60"
            >
              <Mail className="w-4 h-4" aria-hidden />
              Sign up with email
            </button>

            {(authError || error) && (
              <div className="mt-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-2">
                {authError ? (
                  <p className="font-medium">{authError}</p>
                ) : error === "access_denied" ? (
                  "Sign-in was cancelled. Please try again."
                ) : (
                  "Something went wrong. Please try again."
                )}
                {authError &&
                (authError.toLowerCase().includes("provider") ||
                  authError.toLowerCase().includes("not enabled")) ? (
                  <p className="text-xs text-red-600/90 leading-relaxed">
                    Enable Google under Supabase → Authentication → Providers, add
                    Client ID and Secret, save. Add this redirect URL:{" "}
                    <code className="rounded bg-red-100/80 px-1 break-all">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/auth/callback`
                        : ""}
                    </code>
                  </p>
                ) : null}
              </div>
            )}

            <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-[#2b2b36]">
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                className="underline hover:text-[#2b2b36]"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <p className="mt-6 text-center text-sm text-[#2b2b36]/70">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#2b2b36] underline underline-offset-2 hover:text-[#363645]"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-4 text-center text-xs text-gray-400">
              Property manager or staff?{" "}
              <Link
                href="/admin/login"
                className="text-[#2b2b36] font-medium underline underline-offset-2"
              >
                Admin sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
