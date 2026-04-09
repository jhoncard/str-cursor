"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setMessage(null);
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const next = encodeURIComponent("/auth/update-password");
    const redirectTo = `${window.location.origin}/auth/callback?next=${next}`;
    const supabase = createClient();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(em, {
      redirectTo,
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    form.reset();
    setEmail("");
    setMessage(
      "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder. The link expires after a short time.",
    );
  }

  return (
    <main className="flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-[#2b2b36] text-center">
          Forgot password
        </h1>
        <p className="mt-2 text-gray-500 text-sm text-center">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>

        {message ? (
          <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#2b2b36] py-3.5 text-sm font-medium text-white hover:bg-[#363645] disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="font-medium text-[#2b2b36] underline underline-offset-2"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
