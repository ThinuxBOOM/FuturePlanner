import { useState } from 'react'
import { useTable, useInsert } from '../hooks/useData'
import type { MetricEntry } from '../lib/types'
import { monthKey } from '../lib/format'

const CATS = ['education', 'content', 'onemarket', 'cse_private', 'finance', 'infra', 'team', 'other']

export default function Review() {
  const [month, setMonth] = useState(monthKey())
  const { data: entries = [], refetch } = useTable<MetricEntry>('metric_entries', { column: 'month' })
  const ins = useInsert('metric_entries')
  const [cat, setCat] = useState('finance')
  const [key, setKey] = useState('')
  const [val, setVal] = useState('')

  const rows = entries.filter(e => e.month.slice(0, 7) === month.slice(0, 7))

  return (
    <div className="space-y-4">
      <div className="card"><div className="label">Month</div><input className="input max-w-[200px]" type="month" value={month.slice(0, 7)} onChange={e => setMonth(e.target.value + '-01')} />
        <p className="text-xs text-slate-400 mt-2">Monthly review: grades/progress, streams/videos/watch/retention, active/conv/churn/MRR, adherence/drawdown (private, no public claims), runway/emergency/infra/tax, uptime/backup, team output.</p></div>
      <div className="card">
        <div className="font-semibold mb-2">Add metric</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault(); if (!key) return
          await ins.mutateAsync({ month, category: cat, key, value_text: val || null, value_num: Number(val) || null })
          setKey(''); setVal(''); refetch()
        }}>
          <select className="input max-w-[160px]" value={cat} onChange={e => setCat(e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <input className="input max-w-[220px]" placeholder="key e.g. savings_rate" value={key} onChange={e => setKey(e.target.value)} />
          <input className="input max-w-[220px]" placeholder="value" value={val} onChange={e => setVal(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <table className="grid"><thead><tr><th>Category</th><th>Key</th><th>Value</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}><td>{r.category}</td><td>{r.key}</td><td>{r.value_text ?? r.value_num ?? '—'}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="text-sm text-slate-400 mt-2">No entries this month.</p>}
      </div>
    </div>
  )
}
