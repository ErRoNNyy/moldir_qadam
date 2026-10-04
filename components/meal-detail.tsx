"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { longDayLabel } from "@/lib/date";
import type { MealPlanItem } from "@/lib/types";
import { CheckIcon, CopyIcon, TrashIcon } from "./icons";

export function MealDetailModal({
  item,
  onClose,
}: {
  item: MealPlanItem | null;
  onClose: () => void;
}) {
  const { getRecipe, mealNutrition, setMealStatus, duplicateMeal, removeMeal, updateMeal } =
    useApp();

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;
  const recipe = getRecipe(item.recipeId);
  if (!recipe) return null;
  const n = mealNutrition(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex h-28 items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${recipe.gradient[0]}, ${recipe.gradient[1]})`,
          }}
        >
          <span className="text-6xl drop-shadow-lg">{recipe.emoji}</span>
        </div>

        <div className="p-5">
          <h2 className="text-lg font-bold text-ink">{recipe.title}</h2>
          <p className="mt-0.5 text-sm capitalize text-muted">
            {item.mealType} · {item.time} · {longDayLabel(item.date)}
          </p>

          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-surface-muted p-3 text-center">
            <Stat value={`${n.calories}`} label="kcal" />
            <Stat value={`${n.protein}g`} label="protein" accent />
            <Stat value={`${n.carbs}g`} label="carbs" />
            <Stat value={`${n.fat}g`} label="fat" />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              Move to
            </p>
            <input
              type="date"
              value={item.date}
              onChange={(e) => updateMeal(item.id, { date: e.target.value })}
              className="w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <button
            onClick={() =>
              setMealStatus(item.id, item.status === "eaten" ? "planned" : "eaten")
            }
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              item.status === "eaten"
                ? "border border-line-strong text-ink-soft hover:bg-surface-muted"
                : "bg-brand text-white hover:bg-brand-dark"
            }`}
          >
            <CheckIcon />
            {item.status === "eaten" ? "Mark as planned" : "Mark as eaten"}
          </button>

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                duplicateMeal(item.id);
                onClose();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line-strong px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted"
            >
              <CopyIcon /> Duplicate
            </button>
            <button
              onClick={() => {
                removeMeal(item.id);
                onClose();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line-strong px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <TrashIcon /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className={`text-base font-bold ${accent ? "text-protein" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
