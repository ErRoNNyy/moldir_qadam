"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { makeExtractedRecipe, useApp } from "@/lib/store";
import { timeAgo } from "@/lib/date";
import {
  GlobeIcon,
  PencilIcon,
  StarIcon,
  UploadIcon,
  YoutubeIcon,
} from "@/components/icons";
import { Thumb } from "@/components/ui";

export default function VideoPage() {
  const { recipes, addRecipe, hydrated } = useApp();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const recent = useMemo(
    () =>
      [...recipes]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 6),
    [recipes]
  );

  function analyze() {
    if (analyzing) return;
    setAnalyzing(true);
    const draft = makeExtractedRecipe(url || "https://youtube.com/watch?v=example");
    // Simulate the AI extraction pipeline latency, then persist to Supabase.
    setTimeout(async () => {
      try {
        const created = await addRecipe(draft);
        router.push(`/recipe/${created.id}?new=1`);
      } catch (e) {
        console.error(e);
        setAnalyzing(false);
      }
    }, 1400);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <header className="mb-8">
        <h1 className="text-[30px] font-bold tracking-tight text-ink">
          Import a Recipe
        </h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Turn a cooking video into a structured recipe.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <label className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
          <YoutubeIcon />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="Paste a YouTube link..."
            className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
            inputMode="url"
          />
        </label>

        <button
          onClick={analyze}
          disabled={analyzing}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-progress disabled:opacity-90"
        >
          {analyzing ? (
            <>
              <Spinner />
              Analyzing video…
            </>
          ) : (
            "Analyze Recipe"
          )}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Also from:</span>
        <Chip icon={<GlobeIcon />} label="Website" />
        <Chip icon={<UploadIcon />} label="Upload video" />
        <Chip icon={<PencilIcon />} label="Manual entry" />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Recent recipes
        </h2>
        <div className="flex flex-col gap-3">
          {!hydrated
            ? Array.from({ length: 3 }).map((_, i) => <RecipeRowSkeleton key={i} />)
            : recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/recipe/${r.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-surface-muted"
                >
                  <Thumb emoji={r.emoji} gradient={r.gradient} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-ink">
                        {r.title}
                      </span>
                      {r.favorite && (
                        <StarIcon filled className="shrink-0 text-brand" />
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-soft">
                      {r.nutrition.calories} kcal ·{" "}
                      <span className="text-protein">
                        {r.nutrition.protein}g protein
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm text-muted">
                    {timeAgo(r.createdAt)}
                  </span>
                </Link>
              ))}
        </div>
      </section>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand-dark">
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" width={18} height={18}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RecipeRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5">
      <div className="h-12 w-12 animate-pulse-soft rounded-xl bg-line" />
      <div className="flex-1">
        <div className="h-4 w-40 animate-pulse-soft rounded bg-line" />
        <div className="mt-2 h-3 w-28 animate-pulse-soft rounded bg-line" />
      </div>
    </div>
  );
}
