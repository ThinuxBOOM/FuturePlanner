-- FuturePlanner init schema (single-user, LKR)
create extension if not exists "pgcrypto";

-- profiles
create table if not exists public.profiles (
  id uuid primary key,
  display_name text,
  base_currency text not null default 'LKR',
  created_at timestamptz not null default now()
);

-- tracks
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  purpose text,
  color text,
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- stages
create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  key text not null,
  title text not null,
  timing_text text,
  objective text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  track_id uuid references public.tracks(id) on delete set null,
  stage_id uuid references public.stages(id) on delete set null,
  title text not null,
  notes text,
  type text not null default 'savings' check (type in ('savings','purchase','project','habit','metric','other')),
  target_amount numeric,
  target_date date,
  start_date date,
  status text not null default 'active' check (status in ('active','paused','done','archived')),
  priority text not null default 'p2',
  progress_mode text not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists goals_user_status_idx on public.goals(user_id, status);

-- milestones
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  due_date date,
  amount numeric,
  is_done boolean not null default false,
  done_at timestamptz,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists milestones_goal_idx on public.milestones(goal_id, sort);

-- accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  type text not null default 'bank' check (type in ('cash','bank','emergency','infra_fund','tax','trading','company','household','other')),
  opening_balance numeric not null default 0,
  currency text not null default 'LKR',
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('income','expense')),
  name text not null,
  icon text,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null,
  kind text not null check (kind in ('income','expense','transfer')),
  amount numeric not null check (amount > 0),
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id)
    or (kind <> 'transfer' and category_id is not null)
  )
);
create index if not exists tx_user_date_idx on public.transactions(user_id, date desc);
create index if not exists tx_user_acct_idx on public.transactions(user_id, account_id);
create index if not exists tx_user_goal_idx on public.transactions(user_id, goal_id);

-- recurring_rules (v1.1, table only)
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('income','expense','transfer')),
  amount numeric not null check (amount > 0),
  account_id uuid references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  notes text,
  freq text not null default 'monthly' check (freq in ('daily','weekly','monthly','yearly')),
  interval_n int not null default 1,
  next_run date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  month date not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  planned_amount numeric not null default 0,
  rollover boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, month, category_id)
);
create index if not exists budgets_user_month_idx on public.budgets(user_id, month);

-- infrastructure_items
create table if not exists public.infrastructure_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  order_n int not null,
  name text not null,
  spec_notes text,
  trigger_text text,
  est_min numeric,
  est_max numeric,
  status text not null default 'planned' check (status in ('planned','saving','ready','purchased','deferred')),
  purchased_amount numeric,
  purchased_at date,
  goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now()
);

-- metric_entries
create table if not exists public.metric_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  month date not null,
  category text not null,
  key text not null,
  value_num numeric,
  value_text text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists metrics_user_month_idx on public.metric_entries(user_id, month);

-- RLS
alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.stages enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.budgets enable row level security;
alter table public.infrastructure_items enable row level security;
alter table public.metric_entries enable row level security;

drop policy if exists "own" on public.profiles;
create policy "own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own" on public.tracks;
create policy "own" on public.tracks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.stages;
create policy "own" on public.stages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.goals;
create policy "own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.milestones;
create policy "own" on public.milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.accounts;
create policy "own" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.categories;
create policy "own" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.transactions;
create policy "own" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.recurring_rules;
create policy "own" on public.recurring_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.budgets;
create policy "own" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.infrastructure_items;
create policy "own" on public.infrastructure_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.metric_entries;
create policy "own" on public.metric_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
