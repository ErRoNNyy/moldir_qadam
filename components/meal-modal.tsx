"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { longDayLabel, offsetKey, todayKey } from "@/lib/date";
import type { MealType } from "@/lib/types";
import { Thumb } from "./ui";
import { SearchIcon } from "./icons";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export function MealModal({
  open,
  onClose,
  fixedRecipeId,
  defaultDate,
  title = "Add to calendar",
}: {
  open: boolean;
  onClose: () => void;
  fixedRecipeId?: string;
  defaultDate?: string;
  title?: string;
}) {
  const { recipes, addMeal } = useApp();
  const [recipeId, setRecipeId] = useState(fixedRecipeId ?? "");
  const [date, setDate] = useState(defaultDate ?? todayKey());
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setRecipeId(fixedRecipeId ?? "");
      setDate(defaultDate ?? todayKey());
      setMealType("dinner");
      setQuery("");
    }
  }, [open, fixedRecipeId, defaultDate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  const canSave = Boolean(recipeId);

  function save() {
    if (!canSave) return;
    addMeal({ recipeId, date, mealType });
    onClose();
  }

  const quickDates = [
    { label: "Today", key: todayKey() },
    { label: "Tomorrow", key: offsetKey(1) },
    { label: "In 2 days", key: offsetKey(2) },
    { label: "In a week", key: offsetKey(7) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">{title}</h2>

        {!fixedRecipeId && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Recipe
            </p>
            <label className="flex items-center gap-2 rounded-xl border border-line-strong px-3 py-2.5 focus-within:border-brand">
              <SearchIcon className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your recipes..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </label>
            <div className="mt-2 flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-1">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRecipeId(r.id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                    recipeId === r.id
                      ? "border-brand bg-brand-soft"
                      : "border-line hover:bg-surface-muted"
                  }`}
                >
                  <Thumb emoji={r.emoji} gradient={r.gradient} size={36} radius={9} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r.title}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {r.nutrition.calories} kcal ·{" "}
                      <span className="text-protein">{r.nutrition.protein}g P</span>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-1 py-3 text-sm text-muted">No recipes found.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Meal
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                  mealType === m.value
                    ? "border-brand bg-brand-soft text-brand-dark"
                    : "border-line text-ink-soft hover:bg-surface-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Date
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickDates.map((q) => (
              <button
                key={q.key}
                onClick={() => setDate(q.key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  date === q.key
                    ? "border-brand bg-brand-soft text-brand-dark"
                    : "border-line text-ink-soft hover:bg-surface-muted"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line-strong px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
          <p className="mt-1.5 text-xs text-muted">{longDayLabel(date)}</p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
          >
            Add to calendar
          </button>
        </div>
      </div>
    </div>
  );
}
