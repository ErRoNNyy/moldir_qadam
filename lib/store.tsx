"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { todayKey, weekDays } from "./date";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import * as api from "./supabase/data";
import type {
  IngredientCategory,
  MealPlanItem,
  MealStatus,
  MealType,
  Nutrition,
  Recipe,
  ShoppingItem,
  UserProfile,
} from "./types";
import { DEFAULT_PROFILE } from "./types";

const EMPTY_NUTRITION: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function describeLoadError(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message;
  if (cause && typeof cause === "object") {
    const error = cause as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [error.message, error.details, error.hint]
      .filter((part): part is string => typeof part === "string" && part.length > 0);
    if (typeof error.code === "string" && error.code) parts.push("Code " + error.code);
    if (parts.length) return [...new Set(parts)].join(" — ");
  }
  return "Supabase did not return a readable error. Check the project URL, API key, and database schema.";
}

export const CATEGORY_ORDER: IngredientCategory[] = [
  "Meat & Fish",
  "Carbs",
  "Vegetables",
  "Dairy",
  "Fruit",
  "Pantry",
  "Other",
];

function autoKey(name: string, unit: string, category: string) {
  return `${category}|${name.toLowerCase()}|${unit.toLowerCase()}`;
}

interface StoreData {
  recipes: Recipe[];
  mealPlan: MealPlanItem[];
  manualShopping: ShoppingItem[];
  checkedAuto: Record<string, boolean>;
  profile: UserProfile;
}

interface AppContextValue {
  hydrated: boolean;
  loadError: string | null;
  retryLoad: () => Promise<void>;
  user: { id: string; email: string } | null;
  profile: UserProfile;
  recipes: Recipe[];
  mealPlan: MealPlanItem[];
  today: string;

  getRecipe: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => Promise<Recipe>;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  saveRecipe: (recipe: Recipe) => Promise<Recipe>;
  setIngredientQuantity: (recipeId: string, ingredientId: string, quantity: number) => void;
  toggleFavorite: (recipeId: string) => void;

  mealsForDate: (dateKey: string) => MealPlanItem[];
  addMeal: (input: {
    recipeId: string;
    date: string;
    mealType: MealType;
    time?: string;
    servings?: number;
  }) => void;
  updateMeal: (id: string, patch: Partial<MealPlanItem>) => void;
  removeMeal: (id: string) => void;
  duplicateMeal: (id: string) => void;
  setMealStatus: (id: string, status: MealStatus) => void;
  reuseMeal: (item: MealPlanItem, date: string) => void;

  nutritionForDate: (dateKey: string, scope?: NutritionScope) => Nutrition;
  mealNutrition: (item: MealPlanItem) => Nutrition;
  weekSummary: (anchor: string) => WeekSummary;

  shoppingForRange: (startKey: string, endKey: string) => Record<IngredientCategory, ShoppingItem[]>;
  toggleShoppingItem: (item: ShoppingItem) => void;
  addManualShoppingItem: (input: {
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
  }) => void;
  removeManualShoppingItem: (id: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;

  resetDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

export type NutritionScope = "eaten" | "planned" | "scheduled";

export interface WeekSummary {
  plannedCalories: number;
  plannedProtein: number;
  consumedCalories: number;
  consumedProtein: number;
  mealsPlanned: number;
  mealsEaten: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_DATA: StoreData = {
  recipes: [],
  mealPlan: [],
  manualShopping: [],
  checkedAuto: {},
  profile: { ...DEFAULT_PROFILE },
};

function defaultTimeForMeal(mealType: MealType): string {
  switch (mealType) {
    case "breakfast":
      return "08:30";
    case "lunch":
      return "13:00";
    case "dinner":
      return "19:30";
    default:
      return "16:00";
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoreData>(EMPTY_DATA);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const today = todayKey();

  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (supabaseRef.current === null && isSupabaseConfigured) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const load = useCallback(
    async (authUser: User) => {
      if (!supabase) return;
      let loaded = await api.fetchAll(supabase, authUser.id);

      const seedFlag = `nouri-seeded-${authUser.id}`;
      const alreadySeeded =
        typeof window !== "undefined" && localStorage.getItem(seedFlag);

      if (loaded.recipes.length === 0 && !alreadySeeded) {
        try {
          await api.seedForUser(supabase, authUser.id);
          if (typeof window !== "undefined") localStorage.setItem(seedFlag, "1");
          loaded = await api.fetchAll(supabase, authUser.id);
        } catch (e) {
          console.error("Seeding failed", e);
        }
      }
      setData(loaded);
      setLoadError(null);
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setHydrated(true);
      return;
    }
    let active = true;

    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!active) return;
      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email ?? "" });
        try {
          await load(authUser);
        } catch (e) {
          const message = describeLoadError(e);
          setLoadError(message);
          console.error("Load failed: " + message);
        }
      }
      setHydrated(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser ? { id: authUser.id, email: authUser.email ?? "" } : null);
      if (!authUser) {
        setData(EMPTY_DATA);
        setLoadError(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, load]);

  const retryLoad = useCallback(async () => {
    if (!supabase) return;
    setLoadError(null);
    setHydrated(false);
    try {
      const { data: authData, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!authData.user) {
        setUser(null);
        setData(EMPTY_DATA);
        return;
      }
      setUser({ id: authData.user.id, email: authData.user.email ?? "" });
      await load(authData.user);
    } catch (cause) {
      const message = describeLoadError(cause);
      setLoadError(message);
      console.error("Load failed: " + message);
    } finally {
      setHydrated(true);
    }
  }, [supabase, load]);

  const recipeMap = useMemo(() => {
    const m = new Map<string, Recipe>();
    for (const r of data.recipes) m.set(r.id, r);
    return m;
  }, [data.recipes]);

  const getRecipe = useCallback((id: string) => recipeMap.get(id), [recipeMap]);

  /* ------------------------------ recipes ----------------------------- */

  const addRecipe = useCallback(
    async (recipe: Recipe): Promise<Recipe> => {
      if (!supabase || !user) {
        setData((s) => ({ ...s, recipes: [recipe, ...s.recipes] }));
        return recipe;
      }
      const created = await api.insertRecipe(supabase, user.id, recipe);
      setData((s) => ({ ...s, recipes: [created, ...s.recipes] }));
      return created;
    },
    [supabase, user]
  );

  const updateRecipe = useCallback(
    (id: string, patch: Partial<Recipe>) => {
      setData((s) => ({
        ...s,
        recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
      if (supabase) api.updateRecipeRow(supabase, id, patch).catch(console.error);
    },
    [supabase]
  );

  const saveRecipe = useCallback(
    async (recipe: Recipe): Promise<Recipe> => {
      if (!supabase || !user) {
        setData((s) => ({
          ...s,
          recipes: s.recipes.map((item) =>
            item.id === recipe.id ? recipe : item
          ),
        }));
        return recipe;
      }

      const saved = await api.saveFullRecipe(supabase, recipe);
      setData((s) => ({
        ...s,
        recipes: s.recipes.map((item) =>
          item.id === saved.id ? saved : item
        ),
      }));
      return saved;
    },
    [supabase, user]
  );

  const setIngredientQuantity = useCallback(
    (recipeId: string, ingredientId: string, quantity: number) => {
      setData((s) => ({
        ...s,
        recipes: s.recipes.map((r) =>
          r.id !== recipeId
            ? r
            : {
                ...r,
                ingredients: r.ingredients.map((ing) =>
                  ing.id === ingredientId ? { ...ing, quantity } : ing
                ),
              }
        ),
      }));
      if (supabase)
        api.updateIngredientQuantity(supabase, ingredientId, quantity).catch(console.error);
    },
    [supabase]
  );

  const toggleFavorite = useCallback(
    (recipeId: string) => {
      let next = false;
      setData((s) => ({
        ...s,
        recipes: s.recipes.map((r) => {
          if (r.id !== recipeId) return r;
          next = !r.favorite;
          return { ...r, favorite: next };
        }),
      }));
      if (supabase)
        api.updateRecipeRow(supabase, recipeId, { favorite: next }).catch(console.error);
    },
    [supabase]
  );

  /* ---------------------------- meal plan ----------------------------- */

  const mealsForDate = useCallback(
    (dateKey: string) =>
      data.mealPlan
        .filter((m) => m.date === dateKey)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [data.mealPlan]
  );

  const addMeal = useCallback<AppContextValue["addMeal"]>(
    (input) => {
      const draft: Omit<MealPlanItem, "id"> = {
        recipeId: input.recipeId,
        date: input.date,
        mealType: input.mealType,
        time: input.time ?? defaultTimeForMeal(input.mealType),
        servings: input.servings ?? 1,
        status: "planned",
      };
      if (!supabase || !user) {
        setData((s) => ({
          ...s,
          mealPlan: [...s.mealPlan, { ...draft, id: `tmp-${Date.now()}` }],
        }));
        return;
      }
      api
        .insertMeal(supabase, user.id, draft)
        .then((created) =>
          setData((s) => ({ ...s, mealPlan: [...s.mealPlan, created] }))
        )
        .catch(console.error);
    },
    [supabase, user]
  );

  const updateMeal = useCallback(
    (id: string, patch: Partial<MealPlanItem>) => {
      setData((s) => ({
        ...s,
        mealPlan: s.mealPlan.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
      if (supabase) api.updateMealRow(supabase, id, patch).catch(console.error);
    },
    [supabase]
  );

  const removeMeal = useCallback(
    (id: string) => {
      setData((s) => ({ ...s, mealPlan: s.mealPlan.filter((m) => m.id !== id) }));
      if (supabase) api.deleteMeal(supabase, id).catch(console.error);
    },
    [supabase]
  );

  const duplicateMeal = useCallback(
    (id: string) => {
      const src = data.mealPlan.find((m) => m.id === id);
      if (!src) return;
      const { id: _omit, ...rest } = src;
      void _omit;
      const draft = { ...rest, status: "planned" as MealStatus };
      if (!supabase || !user) {
        setData((s) => ({
          ...s,
          mealPlan: [...s.mealPlan, { ...draft, id: `tmp-${Date.now()}` }],
        }));
        return;
      }
      api
        .insertMeal(supabase, user.id, draft)
        .then((created) =>
          setData((s) => ({ ...s, mealPlan: [...s.mealPlan, created] }))
        )
        .catch(console.error);
    },
    [supabase, user, data.mealPlan]
  );

  const setMealStatus = useCallback(
    (id: string, status: MealStatus) => {
      const current = data.mealPlan.find((item) => item.id === id);
      if (!current || current.status === status) return;

      updateMeal(id, { status });
      // Cooking is an event count, so correcting an eaten meal back to planned
      // must not erase the history of having marked it eaten.
      const delta = status === "eaten" && current.status !== "eaten" ? 1 : 0;
      if (!delta) return;

      setData((s) => ({
        ...s,
        recipes: s.recipes.map((recipe) =>
          recipe.id === current.recipeId
            ? { ...recipe, timesCooked: Math.max(0, recipe.timesCooked + delta) }
            : recipe
        ),
      }));

      if (supabase) {
        api
          .bumpTimesCooked(supabase, current.recipeId, delta)
          .then((timesCooked) =>
            setData((s) => ({
              ...s,
              recipes: s.recipes.map((recipe) =>
                recipe.id === current.recipeId ? { ...recipe, timesCooked } : recipe
              ),
            }))
          )
          .catch(console.error);
      }
    },
    [data.mealPlan, updateMeal, supabase]
  );

  const reuseMeal = useCallback(
    (item: MealPlanItem, date: string) => {
      const { id: oldId, ...previous } = item;
      void oldId;
      const draft = { ...previous, date, status: "planned" as const };

      if (!supabase || !user) {
        setData((s) => ({
          ...s,
          mealPlan: [...s.mealPlan, { ...draft, id: `tmp-${Date.now()}` }],
        }));
        return;
      }

      api
        .insertMeal(supabase, user.id, draft)
        .then((created) =>
          setData((s) => ({ ...s, mealPlan: [...s.mealPlan, created] }))
        )
        .catch(console.error);
    },
    [supabase, user]
  );

  /* ---------------------------- nutrition ----------------------------- */

  const mealNutrition = useCallback(
    (item: MealPlanItem): Nutrition => {
      const r = recipeMap.get(item.recipeId);
      if (!r) return EMPTY_NUTRITION;
      const f = item.servings;
      return {
        calories: Math.round(r.nutrition.calories * f),
        protein: Math.round(r.nutrition.protein * f),
        carbs: Math.round(r.nutrition.carbs * f),
        fat: Math.round(r.nutrition.fat * f),
      };
    },
    [recipeMap]
  );

  const nutritionForDate = useCallback(
    (dateKey: string, scope: NutritionScope = "eaten"): Nutrition => {
      const items = data.mealPlan.filter(
        (m) =>
          m.date === dateKey &&
          (scope === "scheduled" ? m.status !== "skipped" : m.status === scope)
      );
      return items.reduce<Nutrition>(
        (acc, item) => {
          const n = mealNutrition(item);
          return {
            calories: acc.calories + n.calories,
            protein: acc.protein + n.protein,
            carbs: acc.carbs + n.carbs,
            fat: acc.fat + n.fat,
          };
        },
        { ...EMPTY_NUTRITION }
      );
    },
    [data.mealPlan, mealNutrition]
  );

  const weekSummary = useCallback(
    (anchor: string): WeekSummary => {
      const days = new Set(weekDays(anchor));
      return data.mealPlan.reduce<WeekSummary>(
        (summary, item) => {
          if (!days.has(item.date) || item.status === "skipped") return summary;
          const nutrition = mealNutrition(item);
          if (item.status === "eaten") {
            summary.consumedCalories += nutrition.calories;
            summary.consumedProtein += nutrition.protein;
            summary.mealsEaten += 1;
          } else {
            summary.plannedCalories += nutrition.calories;
            summary.plannedProtein += nutrition.protein;
            summary.mealsPlanned += 1;
          }
          return summary;
        },
        {
          plannedCalories: 0,
          plannedProtein: 0,
          consumedCalories: 0,
          consumedProtein: 0,
          mealsPlanned: 0,
          mealsEaten: 0,
        }
      );
    },
    [data.mealPlan, mealNutrition]
  );

  /* ----------------------------- shopping ----------------------------- */

  const shoppingForRange = useCallback(
    (startKey: string, endKey: string) => {
      const combined = new Map<string, ShoppingItem>();

      for (const item of data.mealPlan) {
        if (item.date < startKey || item.date > endKey) continue;
        if (item.status === "eaten" || item.status === "skipped") continue;
        const recipe = recipeMap.get(item.recipeId);
        if (!recipe) continue;
        for (const ing of recipe.ingredients) {
          const key = autoKey(ing.name, ing.unit, ing.category);
          const existing = combined.get(key);
          const recipeServings = Math.max(1, recipe.servings);
          const qty = (ing.quantity * item.servings) / recipeServings;
          if (existing) existing.quantity += qty;
          else
            combined.set(key, {
              id: key,
              name: ing.name,
              quantity: qty,
              unit: ing.unit,
              category: ing.category,
              checked: data.checkedAuto[key] ?? false,
              manual: false,
            });
        }
      }

      for (const m of data.manualShopping) combined.set(m.id, { ...m });

      const grouped = {} as Record<IngredientCategory, ShoppingItem[]>;
      for (const cat of CATEGORY_ORDER) grouped[cat] = [];
      for (const item of combined.values()) {
        item.quantity = Math.round(item.quantity * 100) / 100;
        grouped[item.category].push(item);
      }
      for (const cat of CATEGORY_ORDER)
        grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
      return grouped;
    },
    [data.mealPlan, data.manualShopping, data.checkedAuto, recipeMap]
  );

  const toggleShoppingItem = useCallback(
    (item: ShoppingItem) => {
      if (item.manual) {
        const next = !item.checked;
        setData((s) => ({
          ...s,
          manualShopping: s.manualShopping.map((m) =>
            m.id === item.id ? { ...m, checked: next } : m
          ),
        }));
        if (supabase) api.setManualChecked(supabase, item.id, next).catch(console.error);
        return;
      }
      const next = !(data.checkedAuto[item.id] ?? false);
      setData((s) => ({
        ...s,
        checkedAuto: { ...s.checkedAuto, [item.id]: next },
      }));
      if (supabase && user)
        api.setAutoChecked(supabase, user.id, item.id, next).catch(console.error);
    },
    [supabase, user, data.checkedAuto]
  );

  const addManualShoppingItem = useCallback<
    AppContextValue["addManualShoppingItem"]
  >(
    (input) => {
      const draft = { ...input, checked: false };
      if (!supabase || !user) {
        setData((s) => ({
          ...s,
          manualShopping: [
            ...s.manualShopping,
            { ...draft, id: `tmp-${Date.now()}`, manual: true },
          ],
        }));
        return;
      }
      api
        .insertManualShopping(supabase, user.id, draft)
        .then((created) =>
          setData((s) => ({ ...s, manualShopping: [...s.manualShopping, created] }))
        )
        .catch(console.error);
    },
    [supabase, user]
  );

  const removeManualShoppingItem = useCallback(
    (id: string) => {
      setData((s) => ({
        ...s,
        manualShopping: s.manualShopping.filter((m) => m.id !== id),
      }));
      if (supabase) api.deleteManualShopping(supabase, id).catch(console.error);
    },
    [supabase]
  );

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const next = { ...data.profile, ...patch };
      if (!supabase || !user) {
        setData((s) => ({ ...s, profile: next }));
        return;
      }

      const saved = await api.upsertProfile(supabase, user.id, next);
      setData((s) => ({ ...s, profile: saved }));
    },
    [data.profile, supabase, user]
  );

  /* ------------------------------ account ----------------------------- */

  const resetDemo = useCallback(async () => {
    if (!supabase || !user) return;
    await Promise.all([
      supabase.from("recipes").delete().eq("user_id", user.id),
      supabase.from("meal_plan_items").delete().eq("user_id", user.id),
      supabase.from("shopping_list_items").delete().eq("user_id", user.id),
      supabase.from("shopping_checked_items").delete().eq("user_id", user.id),
    ]);
    await api.seedForUser(supabase, user.id);
    const reloaded = await api.fetchAll(supabase, user.id);
    setData(reloaded);
  }, [supabase, user]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setData(EMPTY_DATA);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, [supabase]);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      loadError,
      retryLoad,
      user,
      profile: data.profile,
      recipes: data.recipes,
      mealPlan: data.mealPlan,
      today,
      getRecipe,
      addRecipe,
      updateRecipe,
      saveRecipe,
      setIngredientQuantity,
      toggleFavorite,
      mealsForDate,
      addMeal,
      updateMeal,
      removeMeal,
      duplicateMeal,
      setMealStatus,
      reuseMeal,
      nutritionForDate,
      mealNutrition,
      weekSummary,
      shoppingForRange,
      toggleShoppingItem,
      addManualShoppingItem,
      removeManualShoppingItem,
      updateProfile,
      resetDemo,
      signOut,
    }),
    [
      hydrated,
      loadError,
      retryLoad,
      user,
      data.profile,
      data.recipes,
      data.mealPlan,
      today,
      getRecipe,
      addRecipe,
      updateRecipe,
      saveRecipe,
      setIngredientQuantity,
      toggleFavorite,
      mealsForDate,
      addMeal,
      updateMeal,
      removeMeal,
      duplicateMeal,
      setMealStatus,
      reuseMeal,
      nutritionForDate,
      mealNutrition,
      weekSummary,
      shoppingForRange,
      toggleShoppingItem,
      addManualShoppingItem,
      removeManualShoppingItem,
      updateProfile,
      resetDemo,
      signOut,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

let uidSeq = 0;
function uid(prefix: string) {
  uidSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidSeq}`;
}

/** Build a fresh Recipe draft from an "extracted" video. Persisted by addRecipe. */
export function makeExtractedRecipe(sourceUrl: string): Recipe {
  return {
    id: uid("r"),
    title: "Garlic Chicken Pasta",
    sourceUrl,
    sourcePlatform: "YouTube",
    emoji: "🍝",
    gradient: ["#f6d365", "#c96f3a"],
    servings: 2,
    prepMin: 15,
    cookMin: 25,
    favorite: false,
    nutrition: { calories: 620, protein: 52, carbs: 65, fat: 15 },
    timesCooked: 0,
    createdAt: new Date().toISOString(),
    ingredients: [
      { id: uid("i"), name: "Chicken Breast", quantity: 200, unit: "g", category: "Meat & Fish" },
      { id: uid("i"), name: "Penne Pasta", quantity: 100, unit: "g", category: "Carbs" },
      { id: uid("i"), name: "Olive Oil", quantity: 15, unit: "ml", category: "Pantry" },
      { id: uid("i"), name: "Garlic", quantity: 3, unit: "cloves", category: "Vegetables" },
      { id: uid("i"), name: "Cherry Tomatoes", quantity: 150, unit: "g", category: "Vegetables" },
      { id: uid("i"), name: "Parmesan", quantity: 30, unit: "g", category: "Dairy" },
    ],
    steps: [
      "Bring a large pot of salted water to boil. Cook penne until al dente, about 10 minutes.",
      "Season chicken with salt, pepper and paprika. Pan-fry in olive oil for 6–7 minutes per side until cooked through.",
      "Remove chicken and rest. In the same pan, sauté minced garlic for 1 minute until fragrant.",
      "Add cherry tomatoes. Cook until they begin to burst, about 3 minutes.",
      "Slice the rested chicken. Combine with drained pasta and tomatoes. Toss with grated parmesan and serve.",
    ],
  };
}
