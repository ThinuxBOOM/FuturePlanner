import { useState } from 'react'
import { useTable, useInsert } from '../hooks/useData'
import type { MetricEntry } from '../lib/types'
import { monthKey } from '../lib/format'
import { Card, EmptyState, PageHeader } from '../components/ui'

const CATS = ['education', 'content', 'onemarket', 'cse_private', 'finance', 'infra', 'team', 'other']

const CAT_HINTS: Record<string, string> = {
  education: 'grades · progress · skills',
  content: 'streams · videos · watch · retention · subs · Discord',
  onemarket: 'active · conversion · churn · MRR · uptime',
  cse_private: 'adherence · drawdown · journal (private, no public claims)',
  finance: 'runway · emergency · infra fund · tax',
  infra: 'uptime · disk · backup · restore tests',
  team: 'output · turnaround · access',
  other: 'anything else',
}

export default function Review() {
  const [month, setMonth] = useState(monthKey())
  const { data: entries = [], isLoading, refetch } = useTable<MetricEntry>('metric_entries', { column: 'month' })
  const ins = useInsert('metric_entries')
  const [cat, setCat] = useState('finance')
  const [key, setKey] = useState('')
  const [val, setVal] = useState('')

  const rows = entries.filter(e => e.month.slice(0, 7) === month.slice(0, 7))
  const byCat = CATS.map(c => ({ cat: c, rows: rows.filter(r => r.category === c) })).filter(g => g.rows.length > 0)

  return (
    <div>
      <PageHeader title="Monthly review" sub="Performance dashboard — one checklist a month" />
      <Card className="mb-4">
        <div className="label">Month</div>
        <input className="input !w-auto" type="month" value={month.slice(0, 7)} onChange={e => setMonth(e.target.value + '-01')} />
      </Card>
      <Card className="mb-4">
        <div className="eyebrow mb-2">Add metric</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault(); if (!key.trim()) return alert('Enter a key')
          const num = val.trim() === '' ? null : Number(val)
          if (val.trim() !== '' && (num === null || Number.isNaN(num))) {
            try {
              await ins.mutateAsync({ month, category: cat, key: key.trim(), value_text: val.trim(), value_num: null })
            } catch (err) { return alert(err instanceof Error ? err.message : 'Save failed') }
          } else {
            try {
              await ins.mutateAsync({ month, category: cat, key: key.trim(), value_text: null, value_num: num })
            } catch (err) { return alert(err instanceof Error ? err.message : 'Save failed') }
          }
          setKey(''); setVal(''); refetch()
        }}>
          <select className="input !w-auto" value={cat} onChange={e => setCat(e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <input className="input !w-auto flex-1 min-w-[180px]" placeholder="key e.g. savings_rate" value={key} onChange={e => setKey(e.target.value)} />
          <input className="input !w-auto" placeholder="value" value={val} onChange={e => setVal(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
        <p className="text-xs text-slate-500 mt-2">{CAT_HINTS[cat]}</p>
      </Card>
      {isLoading ? <Card><div className="skeleton h-24" /></Card> : byCat.map(g => (
        <Card key={g.cat} className="mb-3">
          <div className="eyebrow mb-2">{g.cat}</div>
          {g.rows.map(r => (
            <div key={r.id} className="text-sm flex justify-between gap-2 py-1 border-b border-white/5 last:border-0">
              <span className="text-slate-300">{r.key}{r.notes ? ` · ${r.notes}` : ''}</span>
              <span className="tabular-nums">{r.value_text ?? r.value_num ?? '—'}</span>
            </div>
          ))}
        </Card>
      ))}
      {!isLoading && rows.length === 0 && <Card><EmptyState>No entries this month yet.</EmptyState></Card>}
    </div>
  )
}
