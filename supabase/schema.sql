-- =============================================================================
-- Nouri — Supabase schema
-- Run this in the Supabase SQL Editor (or `supabase db push`).
-- Implements the data model from the product spec (§12–13) with row-level
-- security so every user only ever sees their own data.
--
-- Notes / pragmatic deviations from the spec, kept intentionally simple for MVP:
--   * meal_plan_items reference the user directly (the single implicit meal plan)
--     instead of going through a meal_plans parent row, and carry a `time` column.
--   * "Consumed" is modeled as meal_plan_items.status = 'eaten' (the food_logs
--     table is provided for future use but the app reads status directly).
--   * Manual shopping entries live in shopping_list_items; the checked state of
--     auto-generated (meal-plan-derived) items lives in shopping_checked_items.
--   * recipes carries presentation fields (emoji, gradient) and denormalized
--     nutrition columns in the `nutrition` table per the spec.
-- =============================================================================

-- Enum types -----------------------------------------------------------------
do $$ begin
  create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meal_status as enum ('planned', 'eaten', 'skipped');
exception when duplicate_object then null; end $$;

-- RECIPES --------------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_url text,
  source_platform text,
  emoji text not null default '🍽️',
  gradient text[] not null default array['#9be15d', '#00875f'],
  servings int not null default 1,
  prep_min int not null default 0,
  cook_min int not null default 0,
  favorite boolean not null default false,
  times_cooked int not null default 0,
  created_at timestamptz not null default now()
);

-- NUTRITION (per recipe, per serving) ---------------------------------------
create table if not exists public.nutrition (
  recipe_id uuid primary key references public.recipes (id) on delete cascade,
  calories int not null default 0,
  protein int not null default 0,
  carbohydrates int not null default 0,
  fat int not null default 0
);

-- RECIPE_INGREDIENTS ---------------------------------------------------------
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text not null,
  quantity numeric not null default 0,
  unit text not null default '',
  category text not null default 'Other',
  notes text,
  position int not null default 0
);

-- RECIPE_STEPS ---------------------------------------------------------------
create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step_number int not null,
  instruction text not null
);

-- MEAL_PLAN_ITEMS ------------------------------------------------------------
create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  date date not null,
  meal_type meal_type not null,
  time text not null default '19:30',
  servings int not null default 1,
  status meal_status not null default 'planned',
  created_at timestamptz not null default now()
);

-- FOOD_LOGS (reserved for future explicit consumption logging) --------------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_plan_item_id uuid references public.meal_plan_items (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  eaten_at timestamptz not null default now()
);

-- SHOPPING_LIST_ITEMS (manual additions) ------------------------------------
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ingredient text not null,
  quantity numeric not null default 1,
  unit text not null default '',
  category text not null default 'Other',
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

-- SHOPPING_CHECKED_ITEMS (checked state for auto-generated items) ------------
create table if not exists public.shopping_checked_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  checked boolean not null default true,
  primary key (user_id, item_key)
);

-- PROFILES (display name + daily calorie goal) -------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  calorie_goal int not null default 2200 check (calorie_goal between 500 and 10000),
  updated_at timestamptz not null default now()
);

-- Helpful indexes ------------------------------------------------------------
create index if not exists idx_recipes_user on public.recipes (user_id);
create index if not exists idx_ingredients_recipe on public.recipe_ingredients (recipe_id);
create index if not exists idx_steps_recipe on public.recipe_steps (recipe_id);
create index if not exists idx_meal_items_user_date on public.meal_plan_items (user_id, date);

-- Atomic counter update used when a meal is marked as eaten.
create or replace function public.adjust_recipe_times_cooked(
  p_recipe_id uuid,
  p_delta integer
)
returns integer
language sql
security invoker
set search_path = public
as $$
  update public.recipes
  set times_cooked = greatest(0, times_cooked + p_delta)
  where id = p_recipe_id
  returning times_cooked;
$$;

revoke all on function public.adjust_recipe_times_cooked(uuid, integer) from public;
grant execute on function public.adjust_recipe_times_cooked(uuid, integer) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.recipes enable row level security;
alter table public.nutrition enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.shopping_checked_items enable row level security;
alter table public.profiles enable row level security;

-- recipes: owner-only
drop policy if exists "recipes_owner" on public.recipes;
create policy "recipes_owner" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- child tables: access allowed when the parent recipe belongs to the user
drop policy if exists "nutrition_owner" on public.nutrition;
create policy "nutrition_owner" on public.nutrition
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

drop policy if exists "ingredients_owner" on public.recipe_ingredients;
create policy "ingredients_owner" on public.recipe_ingredients
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

drop policy if exists "steps_owner" on public.recipe_steps;
create policy "steps_owner" on public.recipe_steps
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

drop policy if exists "meal_items_owner" on public.meal_plan_items;
create policy "meal_items_owner" on public.meal_plan_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "food_logs_owner" on public.food_logs;
create policy "food_logs_owner" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "shopping_items_owner" on public.shopping_list_items;
create policy "shopping_items_owner" on public.shopping_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "shopping_checked_owner" on public.shopping_checked_items;
create policy "shopping_checked_owner" on public.shopping_checked_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
