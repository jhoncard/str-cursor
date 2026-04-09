"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound } from "lucide-react";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setHasSession(Boolean(data.user));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="flex items-center justify-center px-4 py-24">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100 text-center">
          <h1 className="text-xl font-semibold text-[#2b2b36]">Link invalid or expired</h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            Open the reset link from your email again, or request a new one from
            the forgot password page.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-6 inline-block text-sm font-medium text-[#2b2b36] underline underline-offset-2"
          >
            Forgot password
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-white" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-[#2b2b36] text-center">
          Choose a new password
        </h1>
        <p className="mt-2 text-gray-500 text-sm text-center">
          Enter a new password for your account (at least 8 characters).
        </p>

        {error ? (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 disabled:opacity-60"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#2b2b36] py-3.5 text-sm font-medium text-white hover:bg-[#363645] disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-[#2b2b36] underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
