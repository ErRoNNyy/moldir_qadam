import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IngredientCategory,
  MealPlanItem,
  MealStatus,
  MealType,
  Recipe,
  ShoppingItem,
  UserProfile,
} from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";
import {
  SEED_MANUAL_SHOPPING,
  SEED_MEAL_PLAN,
  SEED_RECIPES,
} from "@/lib/mock-data";

export interface LoadedData {
  recipes: Recipe[];
  mealPlan: MealPlanItem[];
  manualShopping: ShoppingItem[];
  checkedAuto: Record<string, boolean>;
  profile: UserProfile;
}

type DB = SupabaseClient;

/* ------------------------------- mapping ------------------------------- */

interface RecipeRow {
  id: string;
  title: string;
  source_url: string | null;
  source_platform: string | null;
  emoji: string;
  gradient: string[];
  servings: number;
  prep_min: number;
  cook_min: number;
  favorite: boolean;
  times_cooked: number;
  created_at: string;
  nutrition: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  } | null;
  recipe_ingredients: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
    notes: string | null;
    position: number;
  }[];
  recipe_steps: { step_number: number; instruction: string }[];
}

function mapRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url ?? undefined,
    sourcePlatform: row.source_platform ?? undefined,
    emoji: row.emoji,
    gradient: [row.gradient?.[0] ?? "#9be15d", row.gradient?.[1] ?? "#00875f"],
    servings: row.servings,
    prepMin: row.prep_min,
    cookMin: row.cook_min,
    favorite: row.favorite,
    timesCooked: row.times_cooked,
    createdAt: row.created_at,
    nutrition: {
      calories: row.nutrition?.calories ?? 0,
      protein: row.nutrition?.protein ?? 0,
      carbs: row.nutrition?.carbohydrates ?? 0,
      fat: row.nutrition?.fat ?? 0,
    },
    ingredients: [...(row.recipe_ingredients ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        name: i.name,
        quantity: Number(i.quantity),
        unit: i.unit,
        category: i.category as IngredientCategory,
        note: i.notes ?? undefined,
      })),
    steps: [...(row.recipe_steps ?? [])]
      .sort((a, b) => a.step_number - b.step_number)
      .map((s) => s.instruction),
  };
}

const RECIPE_SELECT =
  "*, nutrition(*), recipe_ingredients(*), recipe_steps(*)";

/* --------------------------------- load -------------------------------- */

export async function fetchAll(db: DB, userId: string): Promise<LoadedData> {
  const [recipesRes, mealsRes, manualRes, checkedRes, profileRes] = await Promise.all([
    db.from("recipes").select(RECIPE_SELECT).order("created_at", { ascending: false }),
    db.from("meal_plan_items").select("*"),
    db.from("shopping_list_items").select("*"),
    db.from("shopping_checked_items").select("*"),
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (recipesRes.error) throw recipesRes.error;
  if (mealsRes.error) throw mealsRes.error;
  if (manualRes.error) throw manualRes.error;
  if (checkedRes.error) throw checkedRes.error;
  if (profileRes.error) throw profileRes.error;

  const recipes = (recipesRes.data as unknown as RecipeRow[]).map(mapRecipe);

  const mealPlan: MealPlanItem[] = (mealsRes.data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    recipeId: m.recipe_id as string,
    date: m.date as string,
    mealType: m.meal_type as MealType,
    time: m.time as string,
    servings: m.servings as number,
    status: m.status as MealStatus,
  }));

  const manualShopping: ShoppingItem[] = (manualRes.data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: s.ingredient as string,
    quantity: Number(s.quantity),
    unit: (s.unit as string) ?? "",
    category: s.category as IngredientCategory,
    checked: Boolean(s.checked),
    manual: true,
  }));

  const checkedAuto: Record<string, boolean> = {};
  for (const row of checkedRes.data ?? []) {
    checkedAuto[(row as Record<string, unknown>).item_key as string] = Boolean(
      (row as Record<string, unknown>).checked
    );
  }

  let profile: UserProfile = { ...DEFAULT_PROFILE };
  if (profileRes.data) {
    profile = {
      displayName: profileRes.data.display_name ?? "",
      calorieGoal: Number(profileRes.data.calorie_goal) || DEFAULT_PROFILE.calorieGoal,
    };
  } else {
    profile = await upsertProfile(db, userId, profile);
  }

  return { recipes, mealPlan, manualShopping, checkedAuto, profile };
}

/* -------------------------------- recipes ------------------------------ */

export async function insertRecipe(
  db: DB,
  userId: string,
  recipe: Recipe
): Promise<Recipe> {
  const { data: inserted, error } = await db
    .from("recipes")
    .insert({
      user_id: userId,
      title: recipe.title,
      source_url: recipe.sourceUrl ?? null,
      source_platform: recipe.sourcePlatform ?? null,
      emoji: recipe.emoji,
      gradient: recipe.gradient,
      servings: recipe.servings,
      prep_min: recipe.prepMin,
      cook_min: recipe.cookMin,
      favorite: recipe.favorite,
      times_cooked: recipe.timesCooked,
      created_at: recipe.createdAt,
    })
    .select("id")
    .single();
  if (error) throw error;

  const recipeId = inserted.id as string;

  await Promise.all([
    db.from("nutrition").insert({
      recipe_id: recipeId,
      calories: recipe.nutrition.calories,
      protein: recipe.nutrition.protein,
      carbohydrates: recipe.nutrition.carbs,
      fat: recipe.nutrition.fat,
    }),
    db.from("recipe_ingredients").insert(
      recipe.ingredients.map((ing, i) => ({
        recipe_id: recipeId,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        notes: ing.note ?? null,
        position: i,
      }))
    ),
    db.from("recipe_steps").insert(
      recipe.steps.map((instruction, i) => ({
        recipe_id: recipeId,
        step_number: i + 1,
        instruction,
      }))
    ),
  ]);

  // Re-read with the DB-generated ingredient ids so the client stays in sync.
  const { data, error: readErr } = await db
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", recipeId)
    .single();
  if (readErr) throw readErr;
  return mapRecipe(data as unknown as RecipeRow);
}

export async function updateRecipeRow(
  db: DB,
  id: string,
  patch: Partial<Recipe>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.favorite !== undefined) row.favorite = patch.favorite;
  if (patch.servings !== undefined) row.servings = patch.servings;
  if (patch.prepMin !== undefined) row.prep_min = patch.prepMin;
  if (patch.cookMin !== undefined) row.cook_min = patch.cookMin;
  if (Object.keys(row).length === 0) return;
  const { error } = await db.from("recipes").update(row).eq("id", id);
  if (error) throw error;
}

export async function updateIngredientQuantity(
  db: DB,
  ingredientId: string,
  quantity: number
): Promise<void> {
  const { error } = await db
    .from("recipe_ingredients")
    .update({ quantity })
    .eq("id", ingredientId);
  if (error) throw error;
}

/** Persist all editable recipe fields and return the database-normalized recipe. */
export async function saveFullRecipe(db: DB, recipe: Recipe): Promise<Recipe> {
  await updateRecipeRow(db, recipe.id, {
    title: recipe.title,
    servings: recipe.servings,
    prepMin: recipe.prepMin,
    cookMin: recipe.cookMin,
    favorite: recipe.favorite,
  });

  const { error: nutritionError } = await db.from("nutrition").upsert({
    recipe_id: recipe.id,
    calories: recipe.nutrition.calories,
    protein: recipe.nutrition.protein,
    carbohydrates: recipe.nutrition.carbs,
    fat: recipe.nutrition.fat,
  });
  if (nutritionError) throw nutritionError;

  const { error: removeIngredientsError } = await db
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipe.id);
  if (removeIngredientsError) throw removeIngredientsError;
  if (recipe.ingredients.length) {
    const { error } = await db.from("recipe_ingredients").insert(
      recipe.ingredients.map((ingredient, index) => ({
        recipe_id: recipe.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category,
        notes: ingredient.note ?? null,
        position: index,
      }))
    );
    if (error) throw error;
  }

  const { error: removeStepsError } = await db
    .from("recipe_steps")
    .delete()
    .eq("recipe_id", recipe.id);
  if (removeStepsError) throw removeStepsError;
  if (recipe.steps.length) {
    const { error } = await db.from("recipe_steps").insert(
      recipe.steps.map((instruction, index) => ({
        recipe_id: recipe.id,
        step_number: index + 1,
        instruction,
      }))
    );
    if (error) throw error;
  }

  const { data, error } = await db
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", recipe.id)
    .single();
  if (error) throw error;
  return mapRecipe(data as unknown as RecipeRow);
}

/** Adjust the stored cooking count atomically in Postgres. */
export async function bumpTimesCooked(
  db: DB,
  recipeId: string,
  delta: number
): Promise<number> {
  const { data, error } = await db.rpc("adjust_recipe_times_cooked", {
    p_recipe_id: recipeId,
    p_delta: delta,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function upsertProfile(
  db: DB,
  userId: string,
  profile: UserProfile
): Promise<UserProfile> {
  const { data, error } = await db
    .from("profiles")
    .upsert({
      user_id: userId,
      display_name: profile.displayName,
      calorie_goal: profile.calorieGoal,
      updated_at: new Date().toISOString(),
    })
    .select("display_name, calorie_goal")
    .single();
  if (error) throw error;
  return {
    displayName: data.display_name ?? "",
    calorieGoal: Number(data.calorie_goal) || DEFAULT_PROFILE.calorieGoal,
  };
}

/* ------------------------------ meal plan ------------------------------ */

export async function insertMeal(
  db: DB,
  userId: string,
  item: Omit<MealPlanItem, "id">
): Promise<MealPlanItem> {
  const { data, error } = await db
    .from("meal_plan_items")
    .insert({
      user_id: userId,
      recipe_id: item.recipeId,
      date: item.date,
      meal_type: item.mealType,
      time: item.time,
      servings: item.servings,
      status: item.status,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ...item, id: data.id as string };
}

export async function updateMealRow(
  db: DB,
  id: string,
  patch: Partial<MealPlanItem>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.mealType !== undefined) row.meal_type = patch.mealType;
  if (patch.time !== undefined) row.time = patch.time;
  if (patch.servings !== undefined) row.servings = patch.servings;
  if (patch.status !== undefined) row.status = patch.status;
  if (Object.keys(row).length === 0) return;
  const { error } = await db.from("meal_plan_items").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteMeal(db: DB, id: string): Promise<void> {
  const { error } = await db.from("meal_plan_items").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------- shopping ------------------------------ */

export async function insertManualShopping(
  db: DB,
  userId: string,
  item: Omit<ShoppingItem, "id" | "manual">
): Promise<ShoppingItem> {
  const { data, error } = await db
    .from("shopping_list_items")
    .insert({
      user_id: userId,
      ingredient: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      checked: item.checked,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ...item, id: data.id as string, manual: true };
}

export async function deleteManualShopping(db: DB, id: string): Promise<void> {
  const { error } = await db.from("shopping_list_items").delete().eq("id", id);
  if (error) throw error;
}

export async function setManualChecked(
  db: DB,
  id: string,
  checked: boolean
): Promise<void> {
  const { error } = await db
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", id);
  if (error) throw error;
}

export async function setAutoChecked(
  db: DB,
  userId: string,
  itemKey: string,
  checked: boolean
): Promise<void> {
  const { error } = await db
    .from("shopping_checked_items")
    .upsert({ user_id: userId, item_key: itemKey, checked });
  if (error) throw error;
}

/* -------------------------- first-login seeding ------------------------ */

/**
 * Populates a brand-new account with the demo recipes, meal plan and shopping
 * list so the app looks like the design out of the box.
 */
export async function seedForUser(db: DB, userId: string): Promise<void> {
  const idMap = new Map<string, string>();

  for (const seed of SEED_RECIPES) {
    const created = await insertRecipe(db, userId, seed);
    idMap.set(seed.id, created.id);
  }

  const meals = SEED_MEAL_PLAN.map((m) => ({
    user_id: userId,
    recipe_id: idMap.get(m.recipeId),
    date: m.date,
    meal_type: m.mealType,
    time: m.time,
    servings: m.servings,
    status: m.status,
  })).filter((m) => m.recipe_id);

  if (meals.length) {
    const { error } = await db.from("meal_plan_items").insert(meals);
    if (error) throw error;
  }

  const manual = SEED_MANUAL_SHOPPING.map((s) => ({
    user_id: userId,
    ingredient: s.name,
    quantity: s.quantity,
    unit: s.unit,
    category: s.category,
    checked: s.checked,
  }));
  if (manual.length) {
    const { error } = await db.from("shopping_list_items").insert(manual);
    if (error) throw error;
  }
}
