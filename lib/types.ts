export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MealStatus = "planned" | "eaten" | "skipped";

export type IngredientCategory =
  | "Meat & Fish"
  | "Carbs"
  | "Vegetables"
  | "Dairy"
  | "Fruit"
  | "Pantry"
  | "Other";

export interface Nutrition {
  /** per serving */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  /** Emoji used for the generated thumbnail. */
  emoji: string;
  /** Two-stop gradient [from, to] for the generated thumbnail. */
  gradient: [string, string];
  servings: number;
  prepMin: number;
  cookMin: number;
  favorite: boolean;
  nutrition: Nutrition;
  ingredients: Ingredient[];
  steps: string[];
  timesCooked: number;
  createdAt: string; // ISO
}

export interface MealPlanItem {
  id: string;
  recipeId: string;
  /** yyyy-mm-dd */
  date: string;
  mealType: MealType;
  /** HH:MM 24h start time */
  time: string;
  servings: number;
  status: MealStatus;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  checked: boolean;
  /** true when the user added it by hand rather than from the plan */
  manual: boolean;
}

export interface UserProfile {
  displayName: string;
  calorieGoal: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: "",
  calorieGoal: 2200,
};
