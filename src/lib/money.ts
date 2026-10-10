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

/** Shift a YYYY-MM month key by n months. */
export function shiftMonthKey(m: string, n: number): string {
  const [y, k] = m.split('-').map(Number)
  const d = new Date(Date.UTC(y, k - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

export interface BudgetLine { category_id: string; month: string; planned_amount: number | string; carry_override?: number | string | null }
export interface CategoryRef { id: string; name: string }
export interface RolloverRow {
  categoryId: string; name: string; planned: number; spent: number;
  carry: number; available: number; remaining: number; override: number | null;
}

/**
 * Pocket-Plan rollover, in minor units: unused amounts and overspending carry
 * forward month to month; an explicit carryOverride resets the starting carry.
 * Editing history recalculates everything downstream.
 */
export function budgetRollover(
  lines: BudgetLine[],
  txs: MinorTx[],
  cats: CategoryRef[],
  targetMonth: string, // YYYY-MM
): RolloverRow[] {
  const spendByMonth = new Map<string, number>()
  for (const t of txs) {
    if (!t.category_id) continue
    const key = `${t.category_id}@${t.date.slice(0, 7)}`
    spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + spendingMinor(t))
  }
  const plans = new Map(lines.map(b => [`${b.category_id}@${b.month.slice(0, 7)}`, b]))
  return [...cats].map(c => {
    const months = [
      ...lines.filter(b => b.category_id === c.id).map(b => b.month.slice(0, 7)),
      ...txs.filter(t => t.category_id === c.id).map(t => t.date.slice(0, 7)),
      targetMonth,
    ].filter(mm => mm <= targetMonth).sort()
    let carry = 0
    let row: RolloverRow = { categoryId: c.id, name: c.name, planned: 0, spent: 0, carry: 0, available: 0, remaining: 0, override: null }
    for (let m = months[0]; m <= targetMonth; m = shiftMonthKey(m, 1)) {
      const b = plans.get(`${c.id}@${m}`)
      const rawOv = b?.carry_override
      const ov = rawOv === null || rawOv === undefined || rawOv === '' ? null : Math.round(Number(rawOv) * 100)
      if (ov !== null) carry = ov
      const spent = spendByMonth.get(`${c.id}@${m}`) ?? 0
      const planned = b ? Math.round(Number(b.planned_amount) * 100) : 0
      row = { categoryId: c.id, name: c.name, planned, spent, carry, available: carry + planned, remaining: carry + planned - spent, override: ov }
      carry = row.remaining
    }
    return row
  })
}

export interface SchedRow {
  id: string; name: string; kind: TxKind; amount_minor: number;
  account_id: string; to_account_id: string | null; category_id: string | null;
  interest_minor: number; start_date: string; end_date: string | null;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly'; active: boolean;
}

export interface Occurrence extends SchedRow { due: string; key: string; paid: boolean }

/** nth due date for a schedule (monthly clamps to short months, then resumes). */
export function dueDateFor(r: SchedRow, n: number): string | null {
  if (r.frequency === 'once') return n === 0 ? r.start_date : null
  if (r.frequency === 'weekly') {
    const d = new Date(Date.parse(r.start_date) + n * 7 * 86400000)
    return d.toISOString().slice(0, 10)
  }
  const m = shiftMonthKey(r.start_date.slice(0, 7), n * (r.frequency === 'yearly' ? 12 : 1))
  const [y, k] = m.split('-').map(Number)
  const day = Math.min(Number(r.start_date.slice(8, 10)), new Date(Date.UTC(y, k, 0)).getUTCDate())
  return `${m}-${String(day).padStart(2, '0')}`
}

/** Upcoming occurrences through a date; paid flags come from tx occurrence keys. */
export function occurrences(
  scheds: SchedRow[],
  txs: { occurrence?: string | null }[],
  through: string,
): Occurrence[] {
  const paid = new Set(txs.map(t => t.occurrence).filter(Boolean) as string[])
  const out: Occurrence[] = []
  for (const r of scheds.filter(s => s.active)) {
    for (let n = 0; n < 600; n++) {
      const due = dueDateFor(r, n)
      if (!due || due > through || (r.end_date && due > r.end_date)) break
      const key = `${r.id}@${due}`
      out.push({ ...r, due, key, paid: paid.has(key) })
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due))
}
