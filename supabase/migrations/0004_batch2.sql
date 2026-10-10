-- FuturePlanner 0004: Pocket-Plan batch 2 (ADDITIVE ONLY)
-- Rollover budgets, monthly income plans, settle-once schedules, goal earmarks.
-- Run in Supabase Dashboard → SQL Editor, or via management API.

begin;

-- budgets: explicit rollover override per month+category
alter table public.budgets
  add column if not exists carry_override numeric;

-- monthly planned income (one row per month)
create table if not exists public.income_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  month date not null,
  amount numeric not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, month)
);

-- recurring schedules
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  kind text not null check (kind in ('income','expense','transfer','refund','payment')),
  amount_minor bigint not null check (amount_minor > 0),
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  interest_minor bigint not null default 0 check (interest_minor >= 0),
  start_date date not null,
  end_date date,
  frequency text not null default 'monthly' check (frequency in ('once','weekly','monthly','yearly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists schedules_user_idx on public.schedules(user_id, active);

-- occurrence key on transactions: settle-once enforcement (NULLs never collide)
alter table public.transactions
  add column if not exists occurrence text;
drop index if exists transactions_occurrence_uidx;
create unique index transactions_occurrence_uidx
  on public.transactions(user_id, occurrence) where occurrence is not null;

-- goal earmarks: allocate (+) / release (−); app enforces non-negative running total
create table if not exists public.goal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount_minor bigint not null check (amount_minor <> 0),
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists goal_entries_goal_idx on public.goal_entries(goal_id, date);

alter table public.income_plans enable row level security;
alter table public.schedules enable row level security;
alter table public.goal_entries enable row level security;

drop policy if exists "own" on public.income_plans;
create policy "own" on public.income_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.schedules;
create policy "own" on public.schedules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.goal_entries;
create policy "own" on public.goal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
