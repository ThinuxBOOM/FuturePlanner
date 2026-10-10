import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTable } from '../hooks/useData'
import type { Account, Category, Transaction } from '../lib/types'
import { fmtMinor, spendingMinor, sumMinor, sumSpending, tm } from '../lib/money'
import { revealList } from '../lib/motion'
import TransactionForm from '../components/TransactionForm'
import { ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, useReadyEnter } from '../components/ui'

const PALETTE = ['#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#fb923c', '#4ade80', '#e879f9', '#facc15', '#94a3b8']

export function catColor(cat: Category, idx: number): string {
  return cat.color ?? PALETTE[idx % PALETTE.length]
}

export default function Transactions() {
  const rootRef = useReadyEnter<HTMLDivElement>(true)
  const { data: txs = [], isLoading } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const undoDelete = useUndoDelete('transactions')

  const [q, setQ] = useState('')
  const [freshId, setFreshId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const catById = useMemo(() => new Map(cats.map(c => [c.id, c])), [cats])
  const colorByCat = useMemo(() => {
    const m = new Map<string, string>()
    ;[...cats].sort((a, b) => a.name.localeCompare(b.name)).forEach((c, i) => m.set(c.id, catColor(c, i)))
    return m
  }, [cats])
  const acctById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts])

  const groups = useMemo(() => {
    const s = q.toLowerCase()
    const list = txs.filter(t => !s || (t.notes ?? '').toLowerCase().includes(s) || String(t.amount).includes(s)).slice(0, 300)
    const g = new Map<string, Transaction[]>()
    for (const t of list) {
      const arr = g.get(t.date) ?? []
      arr.push(t)
      g.set(t.date, arr)
    }
    return [...g.entries()].map(([date, rows]) => ({
      date,
      rows,
      inc: sumMinor(rows, r => r.kind === 'income'),
      exp: sumSpending(rows, r => r.kind === 'expense' || r.kind === 'refund' || r.kind === 'payment'),
    }))
  }, [txs, q])

  useLayoutEffect(() => {
    if (!isLoading && groups.length > 0) return revealList(listRef.current, '[data-tx]')
  }, [isLoading, q])

  function detail(t: Transaction): string {
    const acct = acctById.get(t.account_id)?.name ?? '—'
    if (t.kind === 'transfer' || t.kind === 'payment') return `${acct} → ${acctById.get(t.to_account_id ?? '')?.name ?? '—'}`
    return `${acct} · ${catById.get(t.category_id ?? '')?.name ?? '—'}`
  }

  return (
    <div ref={rootRef}>
      <PageHeader title="Transactions" sub="Daily income, expenses and transfers · LKR" />
      <Card className="mb-4 !border-sky-400/20">
        <div className="eyebrow mb-3">Quick add</div>
        <TransactionForm onSaved={id => setFreshId(id)} />
      </Card>
      <Card>
        <div className="flex gap-2 mb-1">
          <input aria-label="Search transactions" className="input" placeholder="Search notes/amount…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {isLoading ? <div className="skeleton h-24 mt-2" /> : (
          <div ref={listRef}>
            {groups.map(g => (
              <div key={g.date} className="mt-3 first:mt-1">
                <div className="flex justify-between items-baseline py-1.5 border-b border-[#e1e6dc]">
                  <span className="text-sm font-semibold">{g.date}</span>
                  <span className="text-xs tabular-nums">
                    {g.inc > 0 && <span className="text-pos mr-2">+{fmtMinor(g.inc)}</span>}
                    {g.exp !== 0 && <span className="text-neg">{g.exp > 0 ? '−' : '+'}{fmtMinor(Math.abs(g.exp))}</span>}
                    {g.inc === 0 && g.exp === 0 && <span className="text-[#7d8b82]">transfers only</span>}
                  </span>
                </div>
                {/* desktop table */}
                <table className="grid hidden md:table">
                  <tbody>
                    {g.rows.map(t => (
                      <tr key={t.id} data-tx className={t.id === freshId ? 'bg-sky-400/10' : ''}>
                        <td className="!border-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${t.kind === 'income' ? 'bg-emerald-400/15 text-[#2f7a4e]' : t.kind === 'transfer' ? 'bg-violet-400/15 text-[#6d5fd0]' : t.kind === 'refund' ? 'bg-sky-400/15 text-[#2b7a9e]' : t.kind === 'payment' ? 'bg-amber-300/15 text-[#8a5f14]' : 'bg-[#eef1eb] text-[#43564a]'}`}>{t.kind === 'payment' ? 'repay' : t.kind}</span>
                          {t.kind !== 'transfer' && t.category_id && <span className="dot mr-2" style={{ background: colorByCat.get(t.category_id) }} />}
                          <span className="text-[#43564a]">{detail(t)}{t.notes ? ` · ${t.notes}` : ''}</span>
                        </td>
                        <td className="!border-0 !text-right tabular-nums whitespace-nowrap">{fmtMinor(tm(t))}</td>
                        <td className="!border-0 !text-right"><ConfirmButton onConfirm={() => undoDelete(t, 'Transaction')} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* mobile cards */}
                <div className="md:hidden">
                  {g.rows.map(t => (
                    <div key={t.id} data-tx className={`flex items-center gap-2 py-2 border-b border-[#edf0e7] ${t.id === freshId ? 'bg-sky-400/10 rounded-lg px-2' : ''}`}>
                      {t.kind !== 'transfer' && t.category_id
                        ? <span className="dot !w-2.5 !h-2.5 shrink-0" style={{ background: colorByCat.get(t.category_id) }} />
                        : <span className={`text-[10px] px-1 rounded shrink-0 ${t.kind === 'transfer' ? 'bg-violet-400/15 text-[#6d5fd0]' : 'bg-emerald-400/15 text-[#2f7a4e]'}`}>{t.kind === 'transfer' ? '⇄' : '+'}</span>}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{detail(t)}</div>
                        {t.notes && <div className="text-xs text-[#7d8b82] truncate">{t.notes}</div>}
                      </div>
                      <span className="text-sm tabular-nums whitespace-nowrap">{fmtMinor(tm(t))}</span>
                      <ConfirmButton onConfirm={() => undoDelete(t, 'Transaction')} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 && <EmptyState>No transactions match.</EmptyState>}
          </div>
        )}
      </Card>
    </div>
  )
}
