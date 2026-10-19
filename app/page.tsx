"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlobeIcon, PencilIcon, PlusIcon, StarIcon, TrashIcon, YoutubeIcon } from "@/components/icons";
import { Thumb } from "@/components/ui";
import { useApp } from "@/lib/store";
import { timeAgo } from "@/lib/date";
import type { IngredientCategory, Recipe } from "@/lib/types";

type ImportMode = "manual" | "website" | "video";

interface DraftIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: IngredientCategory;
  note: string;
}

interface RecipeDraft {
  title: string;
  sourceUrl: string;
  servings: string;
  prepMin: string;
  cookMin: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  ingredients: DraftIngredient[];
  steps: string[];
}

interface ExtractedRecipeData {
  title: string;
  servings: number;
  prepMin: number;
  cookMin: number;
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
    note: string;
  }>;
  steps: string[];
}

interface ExtractedRecipeResponse {
  recipe: ExtractedRecipeData;
}

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
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft";
const SMALL_INPUT =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";

function newIngredient(): DraftIngredient {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: "1",
    unit: "",
    category: "Other",
    note: "",
  };
}

function emptyDraft(): RecipeDraft {
  return {
    title: "",
    sourceUrl: "",
    servings: "2",
    prepMin: "",
    cookMin: "",
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
    ingredients: [newIngredient()],
    steps: [""],
  };
}

function draftFromExtraction(recipe: ExtractedRecipeData, sourceUrl: string): RecipeDraft {
  return {
    title: recipe.title,
    sourceUrl,
    servings: String(recipe.servings),
    prepMin: String(recipe.prepMin),
    cookMin: String(recipe.cookMin),
    calories: String(recipe.nutrition.calories),
    protein: String(recipe.nutrition.protein),
    carbs: String(recipe.nutrition.carbs),
    fat: String(recipe.nutrition.fat),
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: crypto.randomUUID(),
      name: ingredient.name,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
      category: CATEGORIES.includes(ingredient.category) ? ingredient.category : "Other",
      note: ingredient.note,
    })),
    steps: [...recipe.steps],
  };
}

function getHttpUrl(value: string): URL | null {
  if (!value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function platformForVideo(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    return "YouTube";
  }
  if (host === "tiktok.com" || host === "vm.tiktok.com") return "TikTok";
  if (host === "instagram.com") return "Instagram";
  return "Video";
}

function youtubeEmbedUrl(url: URL | null): string | null {
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId = "";
  if (host === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
  else if (host === "youtube.com" || host === "m.youtube.com") {
    videoId =
      url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ??
      "";
  }
  return /^[\w-]{11}$/.test(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null;
}

function numberFromDraft(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }
  return parsed;
}

export default function VideoPage() {
  const { recipes, addRecipe, hydrated } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>("manual");
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const recent = useMemo(
    () =>
      [...recipes]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 6),
    [recipes]
  );

  const sourceUrl = getHttpUrl(draft.sourceUrl);
  const videoEmbed = mode === "video" ? youtubeEmbedUrl(sourceUrl) : null;

  function setIngredient(id: string, patch: Partial<DraftIngredient>) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, ...patch } : ingredient
      ),
    }));
  }

  async function extractRecipe() {
    if (saving || extracting) return;
    setError("");

    const parsedSource = getHttpUrl(draft.sourceUrl);
    if (!parsedSource || !youtubeEmbedUrl(parsedSource)) {
      setError("AI extraction currently supports public YouTube video links.");
      return;
    }

    setExtracting(true);
    try {
      const response = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: parsedSource.toString() }),
      });
      let payload: ExtractedRecipeResponse | { error?: string };
      try {
        payload = (await response.json()) as ExtractedRecipeResponse | { error?: string };
      } catch {
        throw new Error("Could not read the extraction response. Try again.");
      }
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Could not analyze this video. Try again.");
      }
      if (!("recipe" in payload) || !payload.recipe) {
        throw new Error("No usable recipe was found in this video.");
      }

      setDraft(draftFromExtraction(payload.recipe, parsedSource.toString()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not analyze this video. Try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function createRecipe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || extracting) return;
    setError("");

    const cleanTitle = draft.title.trim();
    if (!cleanTitle) {
      setError("Add a recipe name before saving.");
      return;
    }

    let parsedSource: URL | null = null;
    if (draft.sourceUrl.trim()) {
      parsedSource = getHttpUrl(draft.sourceUrl);
      if (!parsedSource) {
        setError("Enter a valid link beginning with http:// or https://.");
        return;
      }
    }
    if (mode !== "manual" && !parsedSource) {
      setError(mode === "website" ? "Add the recipe page link." : "Add the video link.");
      return;
    }

    const enteredIngredients = draft.ingredients.filter((ingredient) => ingredient.name.trim());
    const invalidAmount = enteredIngredients.find((ingredient) => {
      const amount = Number(ingredient.quantity);
      return !ingredient.quantity.trim() || !Number.isFinite(amount) || amount < 0;
    });
    if (invalidAmount) {
      setError(`Enter a valid amount for ${invalidAmount.name.trim()}.`);
      return;
    }
    const ingredients = enteredIngredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name.trim(),
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit.trim(),
      category: ingredient.category,
      note: ingredient.note.trim() || undefined,
    }));

    if (!ingredients.length) {
      setError("Add at least one ingredient.");
      return;
    }

    try {
      const servings = Math.round(numberFromDraft(draft.servings, "Servings"));
      if (servings < 1) throw new Error("Servings must be at least 1.");
      const steps = draft.steps.map((step) => step.trim()).filter(Boolean);
      if (!steps.length) throw new Error("Add at least one cooking step.");

      const recipe: Recipe = {
        id: crypto.randomUUID(),
        title: cleanTitle,
        sourceUrl: parsedSource?.toString(),
        sourcePlatform:
          mode === "website"
            ? "Website"
            : mode === "video" && parsedSource
              ? platformForVideo(parsedSource)
              : mode === "manual"
                ? "Manual"
                : undefined,
        emoji: "🍽️",
        gradient: ["#f6d365", "#c96f3a"],
        servings,
        prepMin: Math.round(numberFromDraft(draft.prepMin || "0", "Prep time")),
        cookMin: Math.round(numberFromDraft(draft.cookMin || "0", "Cook time")),
        favorite: false,
        nutrition: {
          calories: Math.round(numberFromDraft(draft.calories, "Calories")),
          protein: Math.round(numberFromDraft(draft.protein, "Protein")),
          carbs: Math.round(numberFromDraft(draft.carbs, "Carbohydrates")),
          fat: Math.round(numberFromDraft(draft.fat, "Fat")),
        },
        ingredients,
        steps,
        timesCooked: 0,
        createdAt: new Date().toISOString(),
      };

      setSaving(true);
      const created = await addRecipe(recipe);
      router.push(`/recipe/${created.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the recipe. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <header className="mb-6">
        <h1 className="text-[30px] font-bold tracking-tight text-ink">
          Import a Recipe
        </h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Paste a public YouTube link.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ModeButton
          active={mode === "manual"}
          title="Manual entry"
          description="Create the full recipe yourself"
          onClick={() => setMode("manual")}
        >
          <PencilIcon />
        </ModeButton>
        <ModeButton
          active={mode === "website"}
          title="Website recipe"
          description="Keep the page link with your recipe"
          onClick={() => setMode("website")}
        >
          <GlobeIcon />
        </ModeButton>
        <ModeButton
          active={mode === "video"}
          title="Video recipe"
          description="Extract a draft from YouTube"
          onClick={() => setMode("video")}
        >
          <YoutubeIcon />
        </ModeButton>
      </div>

      <form
        onSubmit={createRecipe}
        className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6"
      >
        {mode !== "manual" ? (
          <section className="mb-6 rounded-xl bg-surface-muted p-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                {mode === "website" ? "Recipe page URL" : "YouTube video URL"}
              </span>
              <input
                type="url"
                inputMode="url"
                value={draft.sourceUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sourceUrl: event.target.value }))
                }
                placeholder={mode === "website" ? "https://example.com/recipe" : "https://youtube.com/watch?v=…"}
                className={INPUT}
                required
              />
            </label>
            {sourceUrl && (
              <a
                href={sourceUrl.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-brand hover:underline"
              >
                {mode === "website" ? "Open recipe page" : "Open video"} ↗
              </a>
            )}
            {mode === "video" && videoEmbed && (
              <div className="mt-4 overflow-hidden rounded-xl bg-black">
                <iframe
                  src={videoEmbed}
                  title="Recipe video preview"
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            )}
            {mode === "video" && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={extractRecipe}
                  disabled={!videoEmbed || saving || extracting}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {extracting ? "Analyzing video…" : "Analyze video"}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Works with public YouTube videos. Ingredients, timing, and nutrition are AI estimates; review them before saving.
                </p>
              </div>
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {mode === "website"
                ? "Open the page while you fill in the recipe below. The link will be saved with it."
                : "You can also fill in or edit every recipe field before saving."}
            </p>
          </section>
        ) : (
          <section className="mb-6 rounded-xl bg-brand-softer px-4 py-3.5">
            <p className="text-sm font-semibold text-ink">Build a recipe from scratch</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Add ingredients, cooking steps and nutrition. You can edit everything again after saving.
            </p>
          </section>
        )}

        {mode === "manual" && (
          <label className="mb-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Source link <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              type="url"
              inputMode="url"
              value={draft.sourceUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, sourceUrl: event.target.value }))
              }
              placeholder="https://…"
              className={INPUT}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Recipe name</span>
          <input
            autoFocus={mode === "manual"}
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="e.g. Lemon chicken with rice"
            className={INPUT}
            required
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField
            label="Servings"
            min="1"
            step="1"
            value={draft.servings}
            onChange={(value) => setDraft((current) => ({ ...current, servings: value }))}
          />
          <NumberField
            label="Prep minutes"
            min="0"
            value={draft.prepMin}
            onChange={(value) => setDraft((current) => ({ ...current, prepMin: value }))}
          />
          <NumberField
            label="Cook minutes"
            min="0"
            value={draft.cookMin}
            onChange={(value) => setDraft((current) => ({ ...current, cookMin: value }))}
          />
        </div>

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink">Ingredients</h2>
              <p className="text-xs text-muted">Amounts are for the full recipe.</p>
            </div>
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, ingredients: [...current.ingredients, newIngredient()] }))}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
            >
              <PlusIcon width={16} height={16} /> Add ingredient
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {draft.ingredients.map((ingredient, index) => (
              <div key={ingredient.id} className="rounded-xl border border-line p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_72px_minmax(0,90px)_36px] gap-2 sm:grid-cols-[minmax(0,1.5fr)_100px_minmax(0,100px)_minmax(0,1fr)_36px]">
                  <input
                    aria-label={`Ingredient ${index + 1} name`}
                    value={ingredient.name}
                    onChange={(event) => setIngredient(ingredient.id, { name: event.target.value })}
                    placeholder="Ingredient"
                    className={SMALL_INPUT}
                  />
                  <input
                    aria-label={`Ingredient ${index + 1} amount`}
                    type="number"
                    min="0"
                    step="any"
                    value={ingredient.quantity}
                    onChange={(event) => setIngredient(ingredient.id, { quantity: event.target.value })}
                    placeholder="Qty"
                    className={SMALL_INPUT + " text-right"}
                  />
                  <input
                    aria-label={`Ingredient ${index + 1} unit`}
                    value={ingredient.unit}
                    onChange={(event) => setIngredient(ingredient.id, { unit: event.target.value })}
                    placeholder="Unit"
                    className={SMALL_INPUT}
                  />
                  <select
                    aria-label={`Ingredient ${index + 1} category`}
                    value={ingredient.category}
                    onChange={(event) => setIngredient(ingredient.id, { category: event.target.value as IngredientCategory })}
                    className={SMALL_INPUT + " col-span-3 sm:col-span-1"}
                  >
                    {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, ingredients: current.ingredients.filter((item) => item.id !== ingredient.id) }))}
                    aria-label={`Remove ingredient ${index + 1}`}
                    className="flex h-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <input
                  aria-label={`Ingredient ${index + 1} note`}
                  value={ingredient.note}
                  onChange={(event) => setIngredient(ingredient.id, { note: event.target.value })}
                  placeholder="Preparation note (optional)"
                  className={SMALL_INPUT + " mt-2"}
                />
              </div>
            ))}
            {draft.ingredients.length === 0 && (
              <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
                No ingredients yet. Add one to get started.
              </p>
            )}
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink">Cooking steps</h2>
              <p className="text-xs text-muted">Add instructions in the order you cook them.</p>
            </div>
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, steps: [...current.steps, ""] }))}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
            >
              <PlusIcon width={16} height={16} /> Add step
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {draft.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                  {index + 1}
                </span>
                <textarea
                  aria-label={`Cooking step ${index + 1}`}
                  value={step}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    steps: current.steps.map((item, itemIndex) => itemIndex === index ? event.target.value : item),
                  }))}
                  rows={2}
                  placeholder="Describe this step…"
                  className={SMALL_INPUT + " min-h-16 flex-1 resize-y leading-relaxed"}
                />
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, steps: current.steps.filter((_item, itemIndex) => itemIndex !== index) }))}
                  aria-label={`Remove step ${index + 1}`}
                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-xl border border-line p-4">
          <div className="mb-3">
            <h2 className="font-bold text-ink">Nutrition per serving</h2>
            <p className="text-xs text-muted">Estimates are fine; you can update them later.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField label="Calories" unit="kcal" min="0" value={draft.calories} onChange={(value) => setDraft((current) => ({ ...current, calories: value }))} />
            <NumberField label="Protein" unit="g" min="0" value={draft.protein} onChange={(value) => setDraft((current) => ({ ...current, protein: value }))} />
            <NumberField label="Carbs" unit="g" min="0" value={draft.carbs} onChange={(value) => setDraft((current) => ({ ...current, carbs: value }))} />
            <NumberField label="Fat" unit="g" min="0" value={draft.fat} onChange={(value) => setDraft((current) => ({ ...current, fat: value }))} />
          </div>
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || extracting}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Saving recipe…" : extracting ? "Analyzing video…" : "Save recipe"}
        </button>
      </form>

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Recent recipes
        </h2>
        <div className="flex flex-col gap-3">
          {!hydrated ? (
            Array.from({ length: 3 }).map((_, index) => <RecipeRowSkeleton key={index} />)
          ) : recent.length ? (
            recent.map((recipe) => <RecipeRow key={recipe.id} recipe={recipe} />)
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
              Your saved recipes will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
        active
          ? "border-brand bg-brand-soft"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-muted"
      }`}
    >
      <span className={active ? "mt-0.5 text-brand" : "mt-0.5 text-muted"}>{children}</span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
  unit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: string;
  step?: string;
  unit?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={min}
          step={step ?? "1"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT + (unit ? " pr-12" : "")}
        />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>}
      </div>
    </label>
  );
}

function RecipeRow({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-surface-muted"
    >
      <Thumb emoji={recipe.emoji} gradient={recipe.gradient} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-ink">{recipe.title}</span>
          {recipe.favorite && <StarIcon filled className="shrink-0 text-brand" />}
        </div>
        <div className="mt-0.5 text-sm text-ink-soft">
          {recipe.nutrition.calories} kcal · <span className="text-protein">{recipe.nutrition.protein}g protein</span>
        </div>
      </div>
      <span className="shrink-0 text-sm text-muted">{timeAgo(recipe.createdAt)}</span>
    </Link>
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
