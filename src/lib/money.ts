/**
 * Exact money math in integer minor units (cents), ported from Pocket Plan's
 * core semantics: every amount is a safe integer, transfers are atomic and
 * excluded from income/spending, refunds reverse spending, and only the
 * interest part of a repayment counts as new spending.
 */

export function toMinor(rupees: string | number): number {
  const s = String(rupees).trim()
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw Error('Enter an amount with at most two decimal places.')
  const n = Math.round(Number(s) * 100)
  if (!Number.isSafeInteger(n) || Math.abs(n) > 1e13) throw Error('Amount is outside the supported range.')
  if (n <= 0) throw Error('Amount must be greater than zero.')
  return n
}

export function fromMinor(minor: number | null | undefined): number {
  return Number(minor ?? 0) / 100
}

/** Minor units → display string. */
export function fmtMinor(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return 'Rs. —'
  return 'Rs. ' + (Number(minor) / 100).toLocaleString('en-LK', { maximumFractionDigits: 2 })
}

export function fmtMinorShort(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return 'Rs. —'
  const v = Number(minor) / 100
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `Rs. ${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `Rs. ${(v / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`
  return fmtMinor(minor)
}

export type TxKind = 'income' | 'expense' | 'transfer' | 'refund' | 'payment'

interface MinorTx {
  kind: string
  amount_minor?: number | null
  amount?: number | string | null
  interest_minor?: number | null
  account_id: string
  to_account_id?: string | null
  category_id?: string | null
  date: string
}

/** Exact minor units for a row (prefers amount_minor, falls back to amount). */
export function tm(t: MinorTx): number {
  if (t.amount_minor !== null && t.amount_minor !== undefined) return Number(t.amount_minor)
  return Math.round(Number(t.amount ?? 0) * 100)
}

export function im(t: MinorTx): number {
  return Number(t.interest_minor ?? 0)
}

/** Spending contribution of one row: expense +, refund −, payment interest only. */
export function spendingMinor(t: MinorTx): number {
  if (t.kind === 'expense') return tm(t)
  if (t.kind === 'refund') return -tm(t)
  if (t.kind === 'payment') return im(t)
  return 0
}

export function sumMinor(rows: MinorTx[], pick: (t: MinorTx) => boolean = () => true): number {
  let s = 0
  for (const t of rows) if (pick(t)) s += tm(t)
  return s
}

export function sumSpending(rows: MinorTx[], pick: (t: MinorTx) => boolean = () => true): number {
  let s = 0
  for (const t of rows) if (pick(t)) s += spendingMinor(t)
  return s
}

export interface MinorAccount { id: string; opening_balance: number | string; type: string }

/** Exact per-account balances at or before `at` (YYYY-MM-DD). */
export function balancesMinor(
  accounts: MinorAccount[],
  txs: (MinorTx & { date: string })[],
  at: string,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const a of accounts) out.set(a.id, Math.round(Number(a.opening_balance) * 100))
  for (const t of txs) {
    if (t.date > at) continue
    if (t.kind === 'income' || t.kind === 'refund') out.set(t.account_id, (out.get(t.account_id) ?? 0) + tm(t))
    else out.set(t.account_id, (out.get(t.account_id) ?? 0) - tm(t))
    if (t.kind === 'transfer' && t.to_account_id) out.set(t.to_account_id, (out.get(t.to_account_id) ?? 0) + tm(t))
    if (t.kind === 'payment' && t.to_account_id) out.set(t.to_account_id, (out.get(t.to_account_id) ?? 0) + (tm(t) - im(t)))
  }
  return out
}
