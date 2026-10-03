# FuturePlanner — 5-Year Goal + Budget Tracker

Single-user, LKR-only, manual-entry, web-only MVP. Vite React TS + Tailwind on Cloudflare Pages, Supabase Postgres + Auth + RLS.

## Locked decisions
- Single user only, Supabase Auth magic-link (+ Google if needed)
- Currency LKR fixed, no multi-currency in MVP
- Web-only, no PWA/offline, no receipt images/Storage
- Start fresh, CSV export only (no import in MVP)
- Master plan as in-app `/plan` static page (yes)
- Manual transactions only (recurring auto-gen deferred to v1.1)

## MVP scope
- Auth + app shell
- Accounts (living/emergency/infra_fund/tax/trading/company/household), Categories, Transactions (income/expense/transfer + goal link)
- Monthly budgets planned vs actual + yearly rollup
- Goals + milestones, Infrastructure board 1–8 seeded, Dashboard, Monthly review metrics
- `/plan` static reference (Stage 0–6, guardrails, transition rule, infra table)

## Phases
- 0: scaffold + Pages config
- 1: Supabase schema + RLS + seeds
- 2: auth/shell/dashboard/transactions
- 3: budgets/goals/infra/plan/review
- 4: audit + bugfix loop + prod build + deploy docs

See `docs/APP_PLAN.md` for data model + API, `docs/MASTER_PLAN.md` for 5-year strategy source.
