-- Add persistent profiles and atomic cooking-count support to an existing
-- Nouri database. Safe to run more than once.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  calorie_goal int not null default 2200 check (calorie_goal between 500 and 10000),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

insert into public.profiles (user_id, display_name)
select id, coalesce(split_part(email, '@', 1), '')
from auth.users
on conflict (user_id) do nothing;
