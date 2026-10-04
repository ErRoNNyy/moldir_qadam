"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    setUpdated(true);
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {updated ? (
            <>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                Password updated
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Your new password is ready to use.
              </p>
              <Link
                href="/"
                className="mt-5 flex h-11 items-center justify-center rounded-xl bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-dark"
              >
                Continue to Nouri
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                Choose a new password
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                Enter your new password below.
              </p>
              <form onSubmit={updatePassword} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">New password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Confirm password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
                  />
                </label>
                {error && (
                  <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? "Updating…" : "Update password"}
                </button>
              </form>
              <Link href="/login" className="mt-4 block text-center text-sm font-medium text-brand hover:underline">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
