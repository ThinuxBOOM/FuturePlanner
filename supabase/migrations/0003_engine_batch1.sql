-- FuturePlanner 0003: Pocket-Plan engine batch 1
-- RUN THIS in Supabase Dashboard → SQL Editor BEFORE deploying the new app code.
-- (Old app code keeps working after this runs; new app code requires this.)
--
-- What it does:
--  1. Adds exact-money columns (bigint minor units). No existing column is altered.
--  2. Backfills amount_minor from amount for existing rows (derived only).
--  3. Widens kind/type CHECKs (additive — all existing rows still pass).
--  4. Adds optional debt/reference columns to accounts.
-- RLS, policies and all existing rows are otherwise untouched.
--
-- Verify afterwards with:
--   select kind, amount, amount_minor, interest_minor from public.transactions;
--   select name, type from public.accounts;

begin;

-- ---------- accounts: new optional columns ----------
alter table public.accounts
  add column if not exists opening_date date,
  add column if not exists limit_minor bigint,
  add column if not exists rate numeric,
  add column if not exists statement_minor bigint,
  add column if not exists minimum_minor bigint;

-- widen account types to include card/loan (drop-all + re-add: name-independent)
do $$declare r record; begin
  for r in select conname from pg_constraint
           where conrelid = 'public.accounts'::regclass and contype = 'c' loop
    execute format('alter table public.accounts drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.accounts
  add constraint accounts_type_check
  check (type in ('cash','bank','emergency','infra_fund','tax','trading','company','household','other','card','loan')),
  add constraint accounts_minors_check
  check ((limit_minor is null or limit_minor >= 0)
     and (statement_minor is null or statement_minor >= 0)
     and (minimum_minor is null or minimum_minor >= 0)
     and (rate is null or (rate >= 0 and rate <= 1000)));

-- ---------- transactions: exact-money columns ----------
alter table public.transactions
  add column if not exists amount_minor bigint,
  add column if not exists interest_minor bigint not null default 0;

-- derived backfill only (existing rows: amount_minor = round(amount*100))
update public.transactions set amount_minor = round(amount * 100) where amount_minor is null;

alter table public.transactions alter column amount_minor set not null;

-- replace kind + cross-field checks (drop-all + re-add: name-independent).
-- every pre-existing row (income/expense/transfer under the old rules) still passes.
do $$declare r record; begin
  for r in select conname from pg_constraint
           where conrelid = 'public.transactions'::regclass and contype = 'c' loop
    execute format('alter table public.transactions drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_kind_check
  check (kind in ('income','expense','transfer','refund','payment')),
  add constraint transactions_amount_check
  check (amount > 0),
  add constraint transactions_minor_check
  check (amount_minor > 0 and interest_minor >= 0),
  add constraint transactions_payment_interest_check
  check (kind <> 'payment' or interest_minor < amount_minor),
  add constraint transactions_shape_check
  check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id and category_id is null)
    or (kind = 'payment' and to_account_id is not null and to_account_id <> account_id)
    or (kind in ('income','expense','refund') and category_id is not null and to_account_id is null)
  );

commit;
