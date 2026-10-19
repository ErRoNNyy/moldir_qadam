"use client";

import { useActionState, useState } from "react";
import { Logo } from "@/components/ui";
import { authenticate, type AuthState } from "./actions";

const INITIAL: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [state, formAction, pending] = useActionState(authenticate, INITIAL);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your account"
                : "Reset your password"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {mode === "signin"
              ? "Sign in to plan, cook and track."
              : mode === "signup"
                ? "Start turning videos into meals you actually eat."
                : "We’ll email you a secure link to choose a new password."}
          </p>

          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="mode" value={mode} />

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
            </label>

            {mode !== "reset" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  placeholder="••••••••"
                  className="h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
                />
              </label>
            )}

            {state.error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}
            {state.message && (
              <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
                {state.message}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 h-11 rounded-xl bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
            >
              {pending
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="mt-3 w-full text-center text-sm font-medium text-brand hover:underline"
            >
              Forgot password?
            </button>
          )}

          <div className="mt-5 text-center text-sm text-ink-soft">
            {mode === "signin" ? (
              <>
                New to MQM?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-brand hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-brand hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-semibold text-brand hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
