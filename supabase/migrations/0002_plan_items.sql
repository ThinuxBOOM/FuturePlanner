-- FuturePlanner 0002: interactive roadmap tables (ADDITIVE ONLY — no changes to existing tables)
create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  parent_item_id uuid references public.plan_items(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  infra_item_id uuid references public.infrastructure_items(id) on delete set null,
  title text not null,
  detail text,
  acceptance_criteria text,
  status text not null default 'todo' check (status in ('todo','doing','blocked','done','skipped')),
  priority text not null default 'p2' check (priority in ('p1','p2','p3')),
  progress_pct int not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
  effort text check (effort in ('S','M','L')),
  target_date date,
  start_date date,
  completed_at timestamptz,
  is_custom boolean not null default true,
  source_key text,
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, source_key)
);
create index if not exists plan_items_stage_idx on public.plan_items(stage_id, sort);
create index if not exists plan_items_user_status_idx on public.plan_items(user_id, status);

create table if not exists public.plan_item_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  from_item_id uuid not null references public.plan_items(id) on delete cascade,
  to_item_id uuid not null references public.plan_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_item_id <> to_item_id),
  unique(user_id, from_item_id, to_item_id)
);
create index if not exists plan_links_from_idx on public.plan_item_links(from_item_id);
create index if not exists plan_links_to_idx on public.plan_item_links(to_item_id);

alter table public.plan_items enable row level security;
alter table public.plan_item_links enable row level security;

drop policy if exists "own" on public.plan_items;
create policy "own" on public.plan_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own" on public.plan_item_links;
create policy "own" on public.plan_item_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
