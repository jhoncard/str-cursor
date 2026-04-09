"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isAppleAuthEnabled } from "@/lib/auth-providers";
import { oauthSignInAndRedirect } from "@/lib/supabase/oauth-sign-in";
import { createClient } from "@/lib/supabase/client";
import { sanitizeRedirectPath } from "@/lib/sanitize-redirect-path";
import { Mail } from "lucide-react";

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

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const nextPath = sanitizeRedirectPath(redirect, "/dashboard");
  const error = searchParams.get("error");
  const [loading, setLoading] = useState<"google" | "apple" | "email" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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

  async function handleEmailSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError(null);
    const em = loginEmail.trim();
    if (!em || !loginPassword) {
      setAuthError("Enter your email and password.");
      return;
    }
    setLoading("email");
    const supabase = createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: em,
      password: loginPassword,
    });
    setLoading(null);
    if (signErr) {
      setAuthError(signErr.message);
      return;
    }
    window.location.href = nextPath;
  }

  return (
    <main className="flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36]">
            Welcome back
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Sign in to manage your bookings
          </p>
        </div>

        <Link
          href="/register"
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2b2b36] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#363645]"
        >
          New guest? Create a free account
        </Link>

        {(error || authError) && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-2">
            {authError ? (
              <>
                <p className="font-medium">{authError}</p>
                {authError.toLowerCase().includes("provider") ||
                authError.toLowerCase().includes("not enabled") ? (
                  <p className="text-red-600/90 text-xs leading-relaxed">
                    In Supabase: Authentication → Providers → Google → enable,
                    paste Web client ID and Secret from Google Cloud, Save. Under
                    URL Configuration add redirect{" "}
                    <code className="rounded bg-red-100/80 px-1 py-0.5">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/auth/callback`
                        : "/auth/callback"}
                    </code>
                    . In Google Cloud, Authorized redirect URIs must include your
                    Supabase callback:{" "}
                    <code className="rounded bg-red-100/80 px-1 py-0.5 break-all">
                      {process.env.NEXT_PUBLIC_SUPABASE_URL
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`
                        : "(set NEXT_PUBLIC_SUPABASE_URL)"}
                    </code>
                    . Restart dev after changing env.
                  </p>
                ) : null}
              </>
            ) : error === "access_denied" ? (
              "Sign-in was cancelled. Please try again."
            ) : (
              "Something went wrong. Please try again."
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 font-medium text-[#2b2b36] transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {loading === "google" ? "Redirecting..." : "Continue with Google"}
          </button>

          {isAppleAuthEnabled ? (
            <>
              <div className="flex items-center gap-4 py-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 select-none">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                onClick={() => handleOAuth("apple")}
                disabled={loading !== null}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 font-medium text-[#2b2b36] transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <AppleIcon />
                {loading === "apple" ? "Redirecting..." : "Continue with Apple"}
              </button>
            </>
          ) : null}

          <div className="flex items-center gap-4 py-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400 select-none">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-3 rounded-xl border border-gray-100 bg-[#fafafa] p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Mail className="w-3.5 h-3.5" aria-hidden />
              Sign in with email
            </p>
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={loading !== null}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 disabled:opacity-60"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              disabled={loading !== null}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 disabled:opacity-60"
            />
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-[#2b2b36] underline underline-offset-2 hover:text-[#363645]"
              >
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading !== null}
              className="w-full rounded-lg bg-[#2b2b36] py-2.5 text-sm font-medium text-white hover:bg-[#363645] disabled:opacity-60"
            >
              {loading === "email" ? "Signing in…" : "Sign in with email"}
            </button>
            <p className="text-xs text-gray-500 text-center">
              <Link href="/register" className="text-[#2b2b36] font-medium underline underline-offset-2">
                Need an account? Sign up
              </Link>
            </p>
          </form>
        </div>

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
        </p>

        <p className="mt-4 text-center text-xs text-gray-400">
          Staff or property manager?{" "}
          <Link
            href="/admin/login"
            className="font-medium text-[#2b2b36] underline underline-offset-2 hover:text-[#363645]"
          >
            Admin sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
