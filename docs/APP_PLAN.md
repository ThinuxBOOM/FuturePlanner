# FuturePlanner App Plan (Locked)

Single-user, LKR, manual entry, web-only MVP, start fresh, no receipts, `/plan` static page yes.
Stack: Vite React TS + Tailwind, TanStack Router (or React Router) + Query, RHF + Zod, date-fns, Supabase.

## Data model

All tables: `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid()`, `created_at timestamptz default now()`.
RLS: enable RLS, policy `own` FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id).

### profiles(id=user_id pk, display_name text, base_currency text default 'LKR')
Single row per user, created on signup via trigger or upsert.

### tracks(id, user_id, name, purpose text, color text, sort int, archived bool default false)
Seed: Education, Content, Personal CSE research (private), Onemarket, Company infrastructure.

### stages(id, user_id, key text, title, timing_text, objective text, sort)
Seed stage-0..stage-6 from master plan.

### goals(id, user_id, track_id uuid null refs tracks, stage_id uuid null refs stages,
title text, notes text, type text check in (savings,purchase,project,habit,metric,other),
target_amount numeric null, target_date date null, start_date date null,
status text default 'active' check in (active,paused,done,archived), priority text default 'p2',
progress_mode text default 'manual')
Index (user_id, status).

### milestones(id, user_id, goal_id refs goals on delete cascade, title, due_date date null, amount numeric null, is_done bool default false, done_at timestamptz null, sort int)
Index (goal_id, sort).

### accounts(id, user_id, name, type text check in (cash,bank,emergency,infra_fund,tax,trading,company,household,other),
opening_balance numeric default 0, currency text default 'LKR', is_archived bool default false)
Seed: Cash, Bank Main, Emergency Fund, Infrastructure Fund, Tax Reserve, Trading Capital, Company Ops, Household.

### categories(id, user_id, kind text check in (income,expense), name, icon text, color text, is_archived bool default false)
Seed income: Salary/Part-time, Onemarket, Content, Rent, Solar/Other, Trading Profit.
Seed expense: Food, Transport, Housing, Utilities, Internet, Education, Health, Content Gear, Software/Domain/VPS, Infra Hardware, Trading Loss/Fee, Tax, Other.
`transfer` kind handled in transactions (no category needed, optional).

### transactions(id, user_id, date date not null, kind text check in (income,expense,transfer),
amount numeric not null check (amount>0), account_id refs accounts, to_account_id null refs accounts,
category_id null refs categories, goal_id null refs goals, notes text, created_at)
Check: transfer requires to_account_id and account_id!=to_account_id; non-transfer requires category_id.
Indexes: (user_id, date desc), (user_id, account_id), (user_id, goal_id).

Balances computed: opening + sum(income to acct) - sum(expense from acct) + transfers net.

### recurring_rules — deferred to v1.1 (table created but UI manual). Same shape as transactions + freq, next_run, is_active.
MVP: create table, no auto-gen worker. Provide “duplicate” button.

### budgets(id, user_id, month date not null (YYYY-MM-01), category_id refs categories, planned_amount numeric, rollover bool default false, notes, unique(user_id,month,category_id))
Index (user_id, month).

### infrastructure_items(id, user_id, order_n int, name, spec_notes text, trigger_text text,
est_min numeric, est_max numeric, status text default 'planned' check in (planned,saving,ready,purchased,deferred),
purchased_amount numeric null, purchased_at date null, goal_id null refs goals)
Seed 1..8 from master plan (see MASTER_PLAN.md table).

### metric_entries(id, user_id, month date, category text, key text, value_num numeric null, value_text text null, notes text)
Generic monthly review store. Index (user_id, month).

## Pages
- `/` Dashboard: month P&L, savings rate, runway (liquid/avg burn excl trading), fund bars, active goals, infra next-up, recent tx.
/transactions /budgets /goals (+detail) /infrastructure /plan /review /settings
All pages: mobile-first, fast entry, LKR formatting `Rs. 1,250,000`, dates `YYYY-MM-DD`, empty states with seed CTA.

## Supabase
- Auth magic-link. No service_role in frontend. Anon key only + RLS.
- Migrations in `supabase/migrations/*.sql`, `seed.sql` uses `auth.uid()`? Seeds run per-user on first login via app (upsert), not global seed, because RLS user-scoped. Provide `src/lib/seed.ts` that inserts defaults if tables empty.
- Storage: none in MVP.

## Cloudflare Pages
- Build: `pnpm build`, output `dist`, SPA fallback via `_routes.json` / `functions`? Use `public/_redirects` `/* /index.html 200` for SPA.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Headers: cache static, no-cache html.

## Guardrails in UI copy
- “Research tools only, not investment advice” where relevant. Private CSE labeled private.
- Infra purchase modal warns if amount > infra fund.
- Separate buckets enforced via account types.

## MVP acceptance
- Signup/login, create account/category/tx in <30s, dashboard updates, goals CRUD + milestones, budgets plan vs actual, infra status changes persist, `/plan` renders, prod build passes, no TS errors, RLS blocks anon without login (verified via API).
