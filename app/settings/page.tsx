"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

const INPUT =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-brand";

export default function SettingsPage() {
  const { resetDemo, updateProfile, profile, user, hydrated } = useApp();
  const [goal, setGoal] = useState(2200);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setName(profile.displayName || user?.email?.split("@")[0] || "");
    setEmail(user?.email ?? "");
    setGoal(profile.calorieGoal);
  }, [hydrated, profile, user]);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Enter a name for your profile.");
      return;
    }
    if (!Number.isInteger(goal) || goal < 500 || goal > 10000) {
      setError("Set a daily calorie goal between 500 and 10,000 kcal.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateProfile({ displayName: normalizedName, calorieGoal: goal });
      setSaved(true);
    } catch (cause) {
      console.error(cause);
      setError("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <header className="mb-6">
        <h1 className="text-[30px] font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Manage your profile and nutrition goal.
        </p>
      </header>

      <form onSubmit={saveSettings}>
        <Section title="Profile">
          <Field label="Name">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              className={INPUT}
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <input
              value={email}
              readOnly
              className={INPUT + " bg-surface-muted text-muted"}
              autoComplete="email"
            />
            <span className="mt-1 block text-xs text-muted">
              Email is managed by your sign-in provider.
            </span>
          </Field>
        </Section>

        <Section title="Nutrition">
          <Field label="Daily calorie goal">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="500"
                max="10000"
                step="1"
                value={goal}
                onChange={(event) => {
                  setGoal(Number(event.target.value));
                  setSaved(false);
                }}
                className={INPUT + " max-w-[160px]"}
              />
              <span className="text-sm text-muted">kcal / day</span>
            </div>
          </Field>
        </Section>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="mb-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
            Settings saved.
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !hydrated}
          className="mb-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      <Section title="Data">
        <p className="mb-3 text-sm text-ink-soft">
          Restore the sample recipes, meal plan and shopping list. This clears any
          changes you&apos;ve made in this account.
        </p>
        <button
          onClick={() => {
            resetDemo();
            setReset(true);
            setTimeout(() => setReset(false), 2000);
          }}
          className="rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
        >
          {reset ? "Demo data restored ✓" : "Reset demo data"}
        </button>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 font-bold text-ink">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

