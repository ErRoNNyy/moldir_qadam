"use client";

import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { Sidebar } from "./sidebar";

/**
 * Chrome switcher: the /login route renders bare (no sidebar); every other
 * route renders the app layout. Auth itself is enforced server-side in proxy.ts.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loadError, retryLoad, hydrated } = useApp();

  if (pathname === "/login" || pathname === "/reset-password") {
    return <>{children}</>;
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
        <section
          role="alert"
          className="w-full max-w-xl rounded-2xl border border-line bg-surface p-7 shadow-sm"
        >
          <h1 className="text-xl font-bold text-ink">Could not load your data</h1>
          <p className="mt-2 break-words text-sm text-danger">{loadError}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Check the Supabase connection and confirm the database schema is installed.
            For an existing database, run the feature migration in the supabase folder.
          </p>
          <button
            type="button"
            onClick={() => void retryLoad()}
            disabled={!hydrated}
            className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Retry loading
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
