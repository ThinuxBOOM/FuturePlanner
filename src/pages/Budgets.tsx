import { useMemo, useState } from 'react'
import { useTable, useInsert, useDelete } from '../hooks/useData'
import type { Budget, Category, Transaction } from '../lib/types'
import { lkr, monthKey } from '../lib/format'

export default function Budgets() {
  const [month, setMonth] = useState(monthKey())
  const { data: budgets = [], refetch } = useTable<Budget>('budgets', { column: 'month' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const { data: txs = [] } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const ins = useInsert('budgets')
  const del = useDelete('budgets')
  const [catId, setCatId] = useState('')
  const [planned, setPlanned] = useState('')

  const mk = month.slice(0, 7)
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
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 items-end">
        <div><div className="label">Month</div><input className="input" type="month" value={month.slice(0, 7)} onChange={e => setMonth(e.target.value + '-01')} /></div>
        <div className="text-sm text-slate-300">Planned <b>{lkr(totalP)}</b> · Actual <b>{lkr(totalA)}</b> · Diff <b>{lkr(totalP - totalA)}</b></div>
      </div>
      <div className="card">
        <div className="font-semibold mb-2">Add budget line</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault()
          if (!catId || !planned || Number.isNaN(Number(planned)) || Number(planned) < 0) return alert('Pick a category + valid planned amount (>=0)')
          try {
            await ins.mutateAsync({ month, category_id: catId, planned_amount: Number(planned), rollover: false })
          } catch (err) {
            return alert(err instanceof Error ? err.message : 'Save failed (line may already exist)')
          }
          setCatId(''); setPlanned(''); refetch()
        }}>
          <select className="input max-w-[240px]" value={catId} onChange={e => setCatId(e.target.value)}><option value="">Category…</option>{cats.filter(c => c.kind === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input className="input max-w-[160px]" placeholder="Planned LKR" value={planned} onChange={e => setPlanned(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <table className="grid"><thead><tr><th>Category</th><th className="text-right">Planned</th><th className="text-right">Actual</th><th className="text-right">Left</th><th></th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id}><td>{r.cat}</td><td className="text-right">{lkr(r.planned_amount)}</td><td className="text-right">{lkr(r.actual)}</td><td className={`text-right ${Number(r.planned_amount) - r.actual < 0 ? 'text-red-300' : 'text-emerald-300'}`}>{lkr(Number(r.planned_amount) - r.actual)}</td><td className="text-right"><button className="btn-ghost text-xs" onClick={() => { if (confirm('Delete?')) del.mutate(r.id) }}>Del</button></td></tr>
          ))}</tbody></table>
        {rows.length === 0 && <p className="text-sm text-slate-400 mt-2">No budget for this month yet. Add lines above, or copy from last month manually.</p>}
      </div>
    </div>
  )
}
