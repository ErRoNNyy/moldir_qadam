"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

async function authCallbackUrl(next?: string): Promise<string> {
  const requestHeaders = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    requestHeaders.get("origin") ??
    "http://localhost:3000";
  const callback = new URL("/auth/callback", origin);
  if (next) callback.searchParams.set("next", next);
  return callback.toString();
}

export async function authenticate(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const mode = String(formData.get("mode") ?? "signin");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || (mode !== "reset" && !password)) {
    return { error: "Please enter your email and password." };
  }
  if (mode === "signup" && password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  if (mode === "reset") {
    const redirectTo = await authCallbackUrl("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) return { error: error.message };
    return {
      message: "If an account exists for that email, a reset link is on its way.",
    };
  }

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: await authCallbackUrl() },
    });
    if (error) return { error: error.message };
    // If email confirmation is disabled, a session is returned immediately.
    if (data.session) redirect("/");
    return {
      message:
        "Account created. If email confirmation is enabled, confirm via email, then sign in.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}
