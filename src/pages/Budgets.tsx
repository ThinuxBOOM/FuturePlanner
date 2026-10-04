import { useMemo, useState } from 'react'
import { useTable, useInsert } from '../hooks/useData'
import type { Budget, Category, Transaction } from '../lib/types'
import { lkr, lkrShort, monthKey } from '../lib/format'
import { useToast, ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, ProgressBar, useReadyEnter } from '../components/ui'

export default function Budgets() {
  const [month, setMonth] = useState(monthKey())
  const { data: budgets = [], isLoading, refetch } = useTable<Budget>('budgets', { column: 'month' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const { data: txs = [] } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)
  const ins = useInsert('budgets')
  const undoDelete = useUndoDelete('budgets')
  const { notify } = useToast()
  const [catId, setCatId] = useState('')
  const [planned, setPlanned] = useState('')

  const mk = month.slice(0, 7)
  const { elapsed, daysLeft, dim } = useMemo(() => {
    const [y, m] = mk.split('-').map(Number)
    const dim = new Date(y, m, 0).getDate()
    const now = new Date()
    const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m
    const elapsed = isCurrent ? now.getDate() / dim : (new Date(y, m - 1, 1) < now ? 1 : 0)
    return { elapsed, daysLeft: isCurrent ? Math.max(0, dim - now.getDate()) : 0, dim }
  }, [mk])

  const rows = useMemo(() => {
    const b = budgets.filter(x => x.month.slice(0, 7) === mk)
    const actual = new Map<string, number>()
    txs.filter(t => t.date.slice(0, 7) === mk && t.kind === 'expense' && t.category_id).forEach(t => {
      actual.set(t.category_id!, (actual.get(t.category_id!) ?? 0) + Number(t.amount))
    })
    return b.map(x => ({ ...x, actual: actual.get(x.category_id) ?? 0, cat: cats.find(c => c.id === x.category_id)?.name ?? '—' }))
  }, [budgets, txs, cats, mk])

  const totalP = rows.reduce((s, r) => s + Number(r.planned_amount), 0)
  const totalA = rows.reduce((s, r) => s + r.actual, 0)

  return (
    <div ref={rootRef}>
      <PageHeader title="Budgets" sub="Monthly plan vs actual · LKR" />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div><div className="label">Month</div><input aria-label="Month" className="input !w-auto" type="month" value={month.slice(0, 7)} onChange={e => setMonth(e.target.value + '-01')} /></div>
          <div className="text-sm flex gap-4">
            <span className="text-slate-400">Planned <b className="text-slate-100 tabular-nums">{lkr(totalP)}</b></span>
            <span className="text-slate-400">Actual <b className="text-slate-100 tabular-nums">{lkr(totalA)}</b></span>
            <span className={totalP - totalA < 0 ? 'text-neg' : 'text-pos'}>Left <b className="tabular-nums">{lkr(totalP - totalA)}</b></span>
          </div>
        </div>
        <div className="relative mt-2">
          <ProgressBar pct={totalP > 0 ? Math.min(100, (totalA / totalP) * 100) : 0} color={totalA > totalP ? 'bg-neg' : 'bg-sky-400'} label="Total budget used" />
          <span title={`${Math.round(elapsed * 100)}% of month elapsed`} className="absolute top-[-3px] h-[14px] w-[2px] bg-white/70 rounded" style={{ left: `${elapsed * 100}%` }} />
        </div>
        <div className="text-xs text-slate-500 mt-1">pace marker = month elapsed ({Math.round(elapsed * 100)}% of {dim} days)</div>
      </Card>
      <Card className="mb-4">
        <div className="eyebrow mb-2">Add budget line</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault()
          if (!catId || !planned || Number.isNaN(Number(planned)) || Number(planned) < 0) return notify('Pick a category + valid planned amount (>=0)', 'err')
          try {
            await ins.mutateAsync({ month, category_id: catId, planned_amount: Number(planned), rollover: false })
            notify('Budget line added', 'ok')
          } catch (err) {
            return notify(err instanceof Error ? err.message : 'Save failed (line may already exist)', 'err')
          }
          setCatId(''); setPlanned(''); refetch()
        }}>
          <select aria-label="Category" className="input !w-auto flex-1 min-w-[180px]" value={catId} onChange={e => setCatId(e.target.value)}><option value="">Category…</option>{cats.filter(c => c.kind === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input aria-label="Planned amount" className="input !w-auto" placeholder="Planned LKR" value={planned} onChange={e => setPlanned(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </Card>
      <Card>
        {isLoading ? <div className="skeleton h-24" /> : rows.map(r => {
          const pct = Number(r.planned_amount) > 0 ? Math.min(100, (r.actual / Number(r.planned_amount)) * 100) : 0
          const over = r.actual > Number(r.planned_amount)
          const left = Number(r.planned_amount) - r.actual
          return (
            <div key={r.id} className={`py-2.5 border-b border-white/5 last:border-0 rounded-lg ${over ? 'bg-red-400/5 px-2 -mx-2 shadow-[0_0_18px_rgba(248,113,113,0.15)]' : ''}`}>
              <div className="flex justify-between text-sm gap-2">
                <span>{r.cat}</span>
                <span className="tabular-nums text-slate-300">{lkr(r.actual)} <span className="text-slate-500">/ {lkr(r.planned_amount)}</span></span>
                <ConfirmButton onConfirm={() => undoDelete(r, 'Budget line')} />
              </div>
              <ProgressBar pct={pct} color={over ? 'bg-neg' : 'bg-sky-400'} className="mt-1.5" label={`${r.cat} budget used`} />
              <div className="text-xs text-slate-500 mt-1">
                {over ? <span className="text-neg">over by {lkrShort(-left)}</span>
                  : daysLeft > 0 ? <span>{lkrShort(left)} left · ~{lkrShort(left / Math.max(1, daysLeft))}/day for {daysLeft}d</span>
                  : <span>{lkrShort(left)} left</span>}
              </div>
            </div>
          )
        })}
        {!isLoading && rows.length === 0 && <EmptyState>No budget for this month yet. Add lines above.</EmptyState>}
      </Card>
    </div>
  )
}
