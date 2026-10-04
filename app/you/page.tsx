"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import {
  addDays,
  relativeLabel,
  todayKey,
  weekdayShort,
} from "@/lib/date";
import type { MealPlanItem, Nutrition } from "@/lib/types";
import { Thumb, StatusBadge } from "@/components/ui";
import { SearchIcon, StarIcon, TrendIcon } from "@/components/icons";

type Tab = "today" | "history" | "recipes" | "stats";
const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "history", label: "History" },
  { key: "recipes", label: "Recipes" },
  { key: "stats", label: "Stats" },
];

export default function YouPage() {
  const { nutritionForDate, today, profile, user } = useApp();
  const [tab, setTab] = useState<Tab>("today");

  const consumed = nutritionForDate(today, "eaten");
  const planned = nutritionForDate(today, "planned");
  const goal = Math.max(1, profile.calorieGoal);
  const pct = Math.min(100, Math.round((consumed.calories / goal) * 100));

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <header className="mb-5">
        <p className="text-sm text-muted">{greeting()}</p>
        <h1 className="text-[30px] font-bold tracking-tight text-ink">
          {profile.displayName || user?.email?.split("@")[0] || "Your dashboard"}
        </h1>
      </header>

      {/* Today's nutrition */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink">Today&apos;s Nutrition</h2>
          <span className="text-sm text-muted">{shortToday()}</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NutritionGroup title="Consumed" nutrition={consumed} />
          <NutritionGroup title="Still planned" nutrition={planned} />
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-ink-soft">
              Consumed toward daily goal: {goal.toLocaleString()} kcal
            </span>
            <span className="font-medium text-ink-soft">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 grid grid-cols-4 gap-1 rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-surface-muted text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "today" && <TodayTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "recipes" && <RecipesTab />}
        {tab === "stats" && <StatsTab />}
      </div>
    </div>
  );
}

/* -------------------------------- Today -------------------------------- */

function TodayTab() {
  const { mealsForDate, getRecipe, mealNutrition, today } = useApp();
  const meals = mealsForDate(today);

  if (meals.length === 0) {
    return <Empty text="No meals planned for today." />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {meals.map((m) => {
        const r = getRecipe(m.recipeId);
        if (!r) return null;
        const n = mealNutrition(m);
        return (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink">{r.title}</div>
              <div className="text-sm capitalize text-muted">
                {m.mealType} · {m.time} · {n.calories} kcal ·{" "}
                <span className="text-protein">{n.protein}g P</span>
              </div>
            </div>
            <StatusBadge status={m.status} />
          </div>
        );
      })}
    </div>
  );
}

function NutritionGroup({
  title,
  nutrition,
}: {
  title: string;
  nutrition: Nutrition;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink-soft">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        <NutriStat value={nutrition.calories.toLocaleString()} label="kcal" />
        <NutriStat value={`${nutrition.protein}g`} label="protein" accent />
        <NutriStat value={`${nutrition.carbs}g`} label="carbs" />
        <NutriStat value={`${nutrition.fat}g`} label="fat" />
      </div>
    </section>
  );
}

/* ------------------------------- History ------------------------------- */

function HistoryTab() {
  const { mealPlan, getRecipe, mealNutrition, reuseMeal, today } = useApp();

  const days = useMemo(() => {
    const t = todayKey();
    const out: { date: string; meals: MealPlanItem[] }[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = addDays(t, -i);
      const meals = mealPlan
        .filter((m) => m.date === d && m.status === "eaten")
        .sort((a, b) => a.time.localeCompare(b.time));
      if (meals.length) out.push({ date: d, meals });
    }
    return out;
  }, [mealPlan]);

  if (days.length === 0) return <Empty text="No meal history yet." />;

  return (
    <div className="flex flex-col gap-6">
      {days.map((group) => {
        const totals = group.meals.reduce(
          (acc, m) => {
            const n = mealNutrition(m);
            return { cal: acc.cal + n.calories, protein: acc.protein + n.protein };
          },
          { cal: 0, protein: 0 }
        );
        return (
          <div key={group.date}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {relativeLabel(group.date)}
              </h3>
              <span className="text-sm text-muted">
                {totals.cal} kcal ·{" "}
                <span className="text-protein">{totals.protein}g P</span>
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {group.meals.map((m) => {
                const r = getRecipe(m.recipeId);
                if (!r) return null;
                const n = mealNutrition(m);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">
                        {r.title}
                      </div>
                      <div className="text-sm capitalize text-muted">
                        {m.mealType} · {m.time} · {n.calories} kcal ·{" "}
                        <span className="text-protein">{n.protein}g P</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status="eaten" />
                      <button
                        onClick={() => reuseMeal(m, today)}
                        className="rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft"
                      >
                        Plan again
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Recipes ------------------------------- */

function RecipesTab() {
  const { recipes, toggleFavorite } = useApp();
  const [query, setQuery] = useState("");

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <label className="mb-4 flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 focus-within:border-brand">
        <SearchIcon className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your recipes..."
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
      </label>

      {filtered.length === 0 ? (
        <Empty text="No recipes match your search." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/recipe/${r.id}`}
              className="group overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-md"
            >
              <div className="relative">
                <div
                  className="flex h-32 items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${r.gradient[0]}, ${r.gradient[1]})`,
                  }}
                >
                  <span className="text-5xl drop-shadow-md">{r.emoji}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(r.id);
                  }}
                  className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors ${
                    r.favorite
                      ? "bg-white text-brand"
                      : "bg-black/25 text-white hover:bg-white hover:text-brand"
                  }`}
                  aria-label="Toggle favorite"
                >
                  <StarIcon filled={r.favorite} />
                </button>
              </div>
              <div className="p-3.5">
                <div className="truncate font-semibold text-ink">{r.title}</div>
                <div className="mt-0.5 text-sm text-muted">
                  {r.nutrition.calories} kcal ·{" "}
                  <span className="text-protein">{r.nutrition.protein}g P</span> ·{" "}
                  {r.prepMin + r.cookMin} min
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Stats -------------------------------- */

function StatsTab() {
  const { mealPlan, recipes, mealNutrition } = useApp();

  const { avgProtein, avgCalories, mealsTracked, adherence, weekly } =
    useMemo(() => {
      const t = todayKey();
      let sumProtein = 0;
      let sumCalories = 0;
      let eaten7 = 0;
      let planned7 = 0;
      const weekly: { day: string; protein: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = addDays(t, -i);
        const dayMeals = mealPlan.filter((m) => m.date === d);
        let dayProtein = 0;
        for (const m of dayMeals) {
          if (m.status === "eaten") {
            const n = mealNutrition(m);
            sumProtein += n.protein;
            sumCalories += n.calories;
            dayProtein += n.protein;
            eaten7++;
          }
          if (m.status !== "skipped" && d <= t) planned7++;
        }
        weekly.push({ day: weekdayShort(d), protein: dayProtein });
      }

      const daysWithData = 7;
      const mealsThisMonth = mealPlan.filter(
        (m) => m.status === "eaten"
      ).length;

      return {
        avgProtein: Math.round(sumProtein / daysWithData),
        avgCalories: Math.round(sumCalories / daysWithData),
        mealsTracked: mealsThisMonth,
        adherence: planned7 === 0 ? 0 : Math.round((eaten7 / planned7) * 100),
        weekly,
      };
    }, [mealPlan, mealNutrition]);

  const mostCooked = useMemo(
    () => [...recipes].sort((a, b) => b.timesCooked - a.timesCooked).slice(0, 4),
    [recipes]
  );
  const maxCooked = Math.max(1, ...mostCooked.map((r) => r.timesCooked));
  const maxProtein = Math.max(1, ...weekly.map((w) => w.protein));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard value={`${avgProtein}g`} label="Avg. daily protein" sub="last 7 days" accent />
        <StatCard value={avgCalories.toLocaleString()} label="Avg. calories" sub="last 7 days" />
        <StatCard value={`${mealsTracked}`} label="Meals tracked" sub="this month" />
        <StatCard value={`${adherence}%`} label="Adherence" sub="eaten vs planned" />
      </div>

      {/* Most cooked */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <TrendIcon className="text-brand" />
          <h3 className="font-bold text-ink">Most Cooked</h3>
        </div>
        <div className="flex flex-col gap-3">
          {mostCooked.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-44 shrink-0 truncate text-sm text-ink">
                {r.title}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(r.timesCooked / maxCooked) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-medium text-muted">
                ×{r.timesCooked}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly protein */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="mb-4 font-bold text-ink">Weekly Protein</h3>
        <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
          {weekly.map((w, i) => {
            const isToday = i === weekly.length - 1;
            const h = Math.max(6, (w.protein / maxProtein) * 110);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                      isToday ? "bg-brand" : "bg-line-strong"
                    }`}
                    style={{ height: h }}
                    title={`${w.protein}g`}
                  />
                </div>
                <span
                  className={`text-xs ${isToday ? "font-semibold text-ink" : "text-muted"}`}
                >
                  {w.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Shared bits --------------------------- */

function NutriStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 text-center ${
        accent ? "border-eaten-border bg-brand-softer" : "border-line bg-surface-muted"
      }`}
    >
      <div className={`text-xl font-bold ${accent ? "text-brand-dark" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function StatCard({
  value,
  label,
  sub,
  accent,
}: {
  value: string;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className={`text-2xl font-bold ${accent ? "text-brand" : "text-ink"}`}>
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-ink">{label}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function shortToday(): string {
  const d = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
