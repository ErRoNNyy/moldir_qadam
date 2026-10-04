"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { MealModal } from "@/components/meal-modal";
import {
  ChevronLeft,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "@/components/icons";
import type { Ingredient, IngredientCategory, Recipe } from "@/lib/types";

const CATEGORIES: IngredientCategory[] = [
  "Meat & Fish",
  "Carbs",
  "Vegetables",
  "Dairy",
  "Fruit",
  "Pantry",
  "Other",
];

const INPUT =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const NUMBER_INPUT =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";

function copyRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    nutrition: { ...recipe.nutrition },
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
    steps: [...recipe.steps],
  };
}

function numericValue(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export default function RecipePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const { getRecipe, saveRecipe, toggleFavorite, hydrated } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const recipe = getRecipe(params.id);
  const editing = draft !== null;
  const current = draft ?? recipe;

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-20 text-center">
        <p className="text-lg font-semibold text-ink">
          {hydrated ? "Recipe not found" : "Loading…"}
        </p>
        {hydrated && (
          <Link href="/" className="mt-3 inline-block text-brand hover:underline">
            Back to import
          </Link>
        )}
      </div>
    );
  }

  function beginEditing() {
    if (!recipe) return;
    setDraft(copyRecipe(recipe));
    setSaveError("");
  }

  function changeServings(value: string) {
    const servings = Math.max(1, Math.round(numericValue(value)));
    setDraft((previous) => {
      if (!previous) return previous;
      const oldServings = Math.max(1, previous.servings);
      const ratio = servings / oldServings;
      return {
        ...previous,
        servings,
        ingredients: previous.ingredients.map((ingredient) => ({
          ...ingredient,
          quantity: Math.round(ingredient.quantity * ratio * 100) / 100,
        })),
      };
    });
  }

  function changeIngredient(id: string, patch: Partial<Ingredient>) {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            ingredients: previous.ingredients.map((ingredient) =>
              ingredient.id === id ? { ...ingredient, ...patch } : ingredient
            ),
          }
        : previous
    );
  }

  function addIngredient() {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            ingredients: [
              ...previous.ingredients,
              {
                id: crypto.randomUUID(),
                name: "",
                quantity: 1,
                unit: "",
                category: "Other",
              },
            ],
          }
        : previous
    );
  }

  function changeStep(index: number, instruction: string) {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            steps: previous.steps.map((step, stepIndex) =>
              stepIndex === index ? instruction : step
            ),
          }
        : previous
    );
  }

  function addStep() {
    setDraft((previous) =>
      previous ? { ...previous, steps: [...previous.steps, ""] } : previous
    );
  }

  async function saveChanges() {
    if (!draft || saving) return;
    if (!draft.title.trim()) {
      setSaveError("Add a recipe title before saving.");
      return;
    }
    if (draft.ingredients.some((ingredient) => !ingredient.name.trim())) {
      setSaveError("Give each ingredient a name or remove the empty row.");
      return;
    }
    if (draft.steps.some((step) => !step.trim())) {
      setSaveError("Complete or remove each empty instruction step.");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await saveRecipe({
        ...draft,
        title: draft.title.trim(),
        ingredients: draft.ingredients.map((ingredient) => ({
          ...ingredient,
          name: ingredient.name.trim(),
          unit: ingredient.unit.trim(),
          note: ingredient.note?.trim() || undefined,
        })),
        steps: draft.steps.map((step) => step.trim()),
      });
      setDraft(null);
    } catch (error) {
      console.error(error);
      setSaveError("Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-canvas/80 px-8 py-3.5 text-sm backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-1 font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeft width={18} height={18} />
          Back
        </Link>
        <span className="text-muted">·</span>
        <span className="text-muted">{isNew ? "New recipe" : "Recipe"}</span>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[1fr_280px]">
        <div className="animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  aria-label="Recipe title"
                  value={current.title}
                  onChange={(event) =>
                    setDraft((previous) =>
                      previous ? { ...previous, title: event.target.value } : previous
                    )
                  }
                  className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-3xl font-bold tracking-tight text-ink outline-none focus:border-brand"
                />
              ) : (
                <h1 className="text-3xl font-bold tracking-tight text-ink">
                  {current.title}
                </h1>
              )}
              {editing ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Field label="Servings">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={current.servings}
                      onChange={(event) => changeServings(event.target.value)}
                      className={NUMBER_INPUT}
                    />
                  </Field>
                  <Field label="Prep min">
                    <input
                      type="number"
                      min="0"
                      value={current.prepMin}
                      onChange={(event) =>
                        setDraft((previous) =>
                          previous
                            ? { ...previous, prepMin: Math.round(numericValue(event.target.value)) }
                            : previous
                        )
                      }
                      className={NUMBER_INPUT}
                    />
                  </Field>
                  <Field label="Cook min">
                    <input
                      type="number"
                      min="0"
                      value={current.cookMin}
                      onChange={(event) =>
                        setDraft((previous) =>
                          previous
                            ? { ...previous, cookMin: Math.round(numericValue(event.target.value)) }
                            : previous
                        )
                      }
                      className={NUMBER_INPUT}
                    />
                  </Field>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-muted">
                  Serves {current.servings} · Prep {current.prepMin} min · Cook{" "}
                  {current.cookMin} min
                </p>
              )}
            </div>
            <button
              onClick={() => {
                if (editing) {
                  setDraft((previous) =>
                    previous ? { ...previous, favorite: !previous.favorite } : previous
                  );
                } else {
                  toggleFavorite(current.id);
                }
              }}
              className={
                "shrink-0 rounded-full border p-2 transition-colors " +
                (current.favorite
                  ? "border-brand-soft bg-brand-soft text-brand"
                  : "border-line text-muted hover:text-brand")
              }
              aria-label="Toggle favorite"
            >
              <StarIcon filled={current.favorite} width={18} height={18} />
            </button>
          </div>

          {current.sourceUrl && (
            <a
              href={current.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-brand"
            >
              <ExternalLinkIcon />
              Source · {current.sourcePlatform}
            </a>
          )}

          <div className="relative mt-4 overflow-hidden rounded-2xl">
            <div
              className="flex h-64 w-full items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, " +
                  current.gradient[0] +
                  ", " +
                  current.gradient[1] +
                  ")",
              }}
            >
              <span className="text-[96px] drop-shadow-lg">{current.emoji}</span>
            </div>
            {isNew && (
              <span className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                AI extracted · review below
              </span>
            )}
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Ingredients</h2>
              {editing && (
                <button
                  type="button"
                  onClick={addIngredient}
                  className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft"
                >
                  <PlusIcon width={16} height={16} /> Add ingredient
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {current.ingredients.length === 0 && (
                <p className="px-4 py-5 text-sm text-muted">No ingredients yet.</p>
              )}
              {current.ingredients.map((ingredient, index) => (
                <div
                  key={ingredient.id}
                  className={
                    "px-4 py-3 " +
                    (index < current.ingredients.length - 1
                      ? "border-b border-line"
                      : "")
                  }
                >
                  {editing ? (
                    <div className="grid grid-cols-[minmax(0,1fr)_88px_92px_36px] gap-2">
                      <input
                        aria-label="Ingredient name"
                        value={ingredient.name}
                        onChange={(event) =>
                          changeIngredient(ingredient.id, { name: event.target.value })
                        }
                        placeholder="Ingredient"
                        className={INPUT}
                      />
                      <input
                        aria-label="Ingredient quantity"
                        type="number"
                        min="0"
                        step="any"
                        value={ingredient.quantity}
                        onChange={(event) =>
                          changeIngredient(ingredient.id, {
                            quantity: numericValue(event.target.value),
                          })
                        }
                        className={INPUT + " text-right"}
                      />
                      <input
                        aria-label="Ingredient unit"
                        value={ingredient.unit}
                        onChange={(event) =>
                          changeIngredient(ingredient.id, { unit: event.target.value })
                        }
                        placeholder="Unit"
                        className={INPUT}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((previous) =>
                            previous
                              ? {
                                  ...previous,
                                  ingredients: previous.ingredients.filter(
                                    (item) => item.id !== ingredient.id
                                  ),
                                }
                              : previous
                          )
                        }
                        className="flex h-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                        aria-label={"Remove " + ingredient.name}
                      >
                        <TrashIcon />
                      </button>
                      <select
                        aria-label="Ingredient category"
                        value={ingredient.category}
                        onChange={(event) =>
                          changeIngredient(ingredient.id, {
                            category: event.target.value as IngredientCategory,
                          })
                        }
                        className={INPUT + " col-span-2"}
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Ingredient note"
                        value={ingredient.note ?? ""}
                        onChange={(event) =>
                          changeIngredient(ingredient.id, { note: event.target.value })
                        }
                        placeholder="Optional note"
                        className={INPUT + " col-span-2"}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[15px] text-ink">{ingredient.name}</span>
                        {ingredient.note && (
                          <span className="ml-2 text-sm text-muted">
                            {ingredient.note}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-sm text-muted">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {editing
                ? "Changing servings scales every ingredient. Adjust amounts and units as needed."
                : "Edit the recipe to change quantities, units or ingredients."}
            </p>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Instructions</h2>
              {editing && (
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft"
                >
                  <PlusIcon width={16} height={16} /> Add step
                </button>
              )}
            </div>
            <ol className="flex flex-col gap-3">
              {current.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3.5">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                    {index + 1}
                  </span>
                  {editing ? (
                    <>
                      <textarea
                        aria-label={"Step " + (index + 1)}
                        value={step}
                        onChange={(event) => changeStep(index, event.target.value)}
                        rows={2}
                        className={INPUT + " min-h-16 flex-1 resize-y leading-relaxed"}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((previous) =>
                            previous
                              ? {
                                  ...previous,
                                  steps: previous.steps.filter(
                                    (_item, stepIndex) => stepIndex !== index
                                  ),
                                }
                              : previous
                          )
                        }
                        className="mt-1 rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger"
                        aria-label={"Remove step " + (index + 1)}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  ) : (
                    <p className="pt-1 text-[15px] leading-relaxed text-ink-soft">
                      {step}
                    </p>
                  )}
                </li>
              ))}
              {!editing && current.steps.length === 0 && (
                <li className="text-sm text-muted">No instructions yet.</li>
              )}
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">Nutrition</h3>
              <span className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-medium text-muted">
                Estimated · per serving
              </span>
            </div>
            {editing ? (
              <div className="mt-4 flex flex-col gap-3">
                <Field label="Calories (kcal)">
                  <input
                    type="number"
                    min="0"
                    value={current.nutrition.calories}
                    onChange={(event) =>
                      setDraft((previous) =>
                        previous
                          ? {
                              ...previous,
                              nutrition: {
                                ...previous.nutrition,
                                calories: Math.round(numericValue(event.target.value)),
                              },
                            }
                          : previous
                      )
                    }
                    className={NUMBER_INPUT}
                  />
                </Field>
                <Field label="Protein (g)">
                  <input
                    type="number"
                    min="0"
                    value={current.nutrition.protein}
                    onChange={(event) =>
                      setDraft((previous) =>
                        previous
                          ? {
                              ...previous,
                              nutrition: {
                                ...previous.nutrition,
                                protein: Math.round(numericValue(event.target.value)),
                              },
                            }
                          : previous
                      )
                    }
                    className={NUMBER_INPUT}
                  />
                </Field>
                <Field label="Carbohydrates (g)">
                  <input
                    type="number"
                    min="0"
                    value={current.nutrition.carbs}
                    onChange={(event) =>
                      setDraft((previous) =>
                        previous
                          ? {
                              ...previous,
                              nutrition: {
                                ...previous.nutrition,
                                carbs: Math.round(numericValue(event.target.value)),
                              },
                            }
                          : previous
                      )
                    }
                    className={NUMBER_INPUT}
                  />
                </Field>
                <Field label="Fat (g)">
                  <input
                    type="number"
                    min="0"
                    value={current.nutrition.fat}
                    onChange={(event) =>
                      setDraft((previous) =>
                        previous
                          ? {
                              ...previous,
                              nutrition: {
                                ...previous.nutrition,
                                fat: Math.round(numericValue(event.target.value)),
                              },
                            }
                          : previous
                      )
                    }
                    className={NUMBER_INPUT}
                  />
                </Field>
              </div>
            ) : (
              <>
                <div className="mt-3">
                  <div className="text-4xl font-bold tracking-tight text-ink">
                    {current.nutrition.calories}
                  </div>
                  <div className="text-sm text-muted">kcal per serving</div>
                </div>
                <div className="mt-4 flex flex-col gap-3 text-sm">
                  <MacroRow label="Protein" value={current.nutrition.protein + "g"} accent />
                  <MacroRow label="Carbohydrates" value={current.nutrition.carbs + "g"} />
                  <MacroRow label="Fat" value={current.nutrition.fat + "g"} />
                </div>
              </>
            )}
          </div>

          {editing ? (
            <>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setSaveError("");
                }}
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-line-strong px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-surface-muted"
              >
                Cancel
              </button>
              {saveError && (
                <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {saveError}
                </p>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Add to Calendar
              </button>
              <button
                onClick={beginEditing}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 py-1.5 text-[15px] font-medium text-muted transition-colors hover:text-ink"
              >
                <PencilIcon />
                Edit Recipe
              </button>
            </>
          )}
        </aside>
      </div>

      <MealModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fixedRecipeId={current.id}
        title={'Add "' + current.title + '"'}
      />
    </div>
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
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function MacroRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-line pt-3 first:border-0 first:pt-0">
      <span className="text-ink-soft">{label}</span>
      <span className={accent ? "font-semibold text-protein" : "font-semibold text-ink"}>
        {value}
      </span>
    </div>
  );
}

