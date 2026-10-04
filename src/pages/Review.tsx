import { useMemo, useState } from 'react'
import { useTable, useInsert } from '../hooks/useData'
import type { MetricEntry } from '../lib/types'
import { monthKey } from '../lib/format'
import { useToast } from '../components/feedback'
import { Card, EmptyState, PageHeader, useReadyEnter } from '../components/ui'

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

const CAT_COLORS: Record<string, string> = {
  education: '#60a5fa', content: '#f472b6', onemarket: '#34d399', cse_private: '#a78bfa',
  finance: '#fbbf24', infra: '#22d3ee', team: '#fb923c', other: '#94a3b8',
}

function Spark({ vals, color }: { vals: number[]; color: string }) {
  const W = 96
  const H = 28
  if (vals.length < 2) return null
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const span = max - min || 1
  const pts = vals.map((v, i) => `${(i * (W - 4)) / (vals.length - 1) + 2},${H - 3 - ((v - min) / span) * (H - 6)}`).join(' ')
  const up = vals[vals.length - 1] >= vals[vals.length - 2]
  return (
    <svg width={W} height={H} role="img" aria-label={`Trend ${up ? 'up' : 'down'}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={W - 2} cy={H - 3 - ((vals[vals.length - 1] - min) / span) * (H - 6)} r={2.4} fill={color} />
    </svg>
  )
}

export default function Review() {
  const [month, setMonth] = useState(monthKey())
  const { data: entries = [], isLoading, refetch } = useTable<MetricEntry>('metric_entries', { column: 'month' })
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)
  const ins = useInsert('metric_entries')
  const { notify } = useToast()
  const [cat, setCat] = useState('finance')
  const [key, setKey] = useState('')
  const [val, setVal] = useState('')

  const mk = month.slice(0, 7)
  const rows = entries.filter(e => e.month.slice(0, 7) === mk)

  // per (category,key): last 6 numeric months + delta vs previous
  const series = useMemo(() => {
    const months: string[] = []
    const [y, m] = mk.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const keys = new Map<string, { category: string; key: string }>()
    for (const e of entries) {
      if (e.value_num === null || e.value_num === undefined) continue
      const k = `${e.category}||${e.key}`
      if (!keys.has(k)) keys.set(k, { category: e.category, key: e.key })
    }
    return [...keys.values()].map(({ category, key }) => {
      const vals = months.map(mm => {
        const hit = entries.find(e => e.category === category && e.key === key && e.month.slice(0, 7) === mm)
        return hit && hit.value_num !== null ? Number(hit.value_num) : NaN
      }).filter(v => !Number.isNaN(v))
      const delta = vals.length >= 2 ? vals[vals.length - 1] - vals[vals.length - 2] : null
      const cur = entries.find(e => e.category === category && e.key === key && e.month.slice(0, 7) === mk)
      return { category, key, vals, delta, cur }
    }).filter(s => s.cur)
  }, [entries, mk])

  const byCat = CATS.map(c => ({ cat: c, rows: rows.filter(r => r.category === c) })).filter(g => g.rows.length > 0)
  const sparkByKey = new Map(series.map(s => [`${s.category}||${s.key}`, s]))

  return (
    <div ref={rootRef}>
      <PageHeader title="Monthly review" sub="Performance dashboard — one checklist a month" />
      <Card className="mb-4">
        <div className="label">Month</div>
        <input aria-label="Month" className="input !w-auto" type="month" value={month.slice(0, 7)} onChange={e => setMonth(e.target.value + '-01')} />
      </Card>
      <Card className="mb-4">
        <div className="eyebrow mb-2">Add metric</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault(); if (!key.trim()) return notify('Enter a key', 'err')
          const raw = val.trim()
          const payload = raw === '' || Number.isNaN(Number(raw))
            ? { month, category: cat, key: key.trim(), value_text: raw || null, value_num: null }
            : { month, category: cat, key: key.trim(), value_text: null, value_num: Number(raw) }
          try {
            await ins.mutateAsync(payload)
            notify('Metric added', 'ok')
          } catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
          setKey(''); setVal(''); refetch()
        }}>
          <select aria-label="Category" className="input !w-auto" value={cat} onChange={e => setCat(e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <input aria-label="Metric key" className="input !w-auto flex-1 min-w-[180px]" placeholder="key e.g. savings_rate" value={key} onChange={e => setKey(e.target.value)} />
          <input aria-label="Metric value" className="input !w-auto" placeholder="value" value={val} onChange={e => setVal(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
        <p className="text-xs text-slate-500 mt-2">{CAT_HINTS[cat]}</p>
      </Card>
      {isLoading ? <Card><div className="skeleton h-24" /></Card> : byCat.map(g => (
        <Card key={g.cat} className="mb-3 !border-t-2" >
          <div className="eyebrow mb-2 flex items-center gap-2">
            <span className="dot" style={{ background: CAT_COLORS[g.cat] ?? '#94a3b8' }} />
            {g.cat}
          </div>
          {g.rows.map(r => {
            const s = sparkByKey.get(`${r.category}||${r.key}`)
            return (
              <div key={r.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{r.key}{r.notes ? <span className="text-slate-500"> · {r.notes}</span> : ''}</div>
                </div>
                {s && s.vals.length >= 2 && <Spark vals={s.vals} color={CAT_COLORS[g.cat] ?? '#94a3b8'} />}
                <div className="text-right">
                  <div className="text-sm tabular-nums">{r.value_text ?? r.value_num ?? '—'}</div>
                  {s?.delta !== null && s?.delta !== undefined && (
                    <div className={`text-[11px] tabular-nums ${s.delta > 0 ? 'text-pos' : s.delta < 0 ? 'text-neg' : 'text-slate-500'}`}>
                      {s.delta > 0 ? '▲' : s.delta < 0 ? '▼' : '●'} {Math.abs(s.delta)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      ))}
      {!isLoading && rows.length === 0 && <Card><EmptyState>No entries this month yet.</EmptyState></Card>}
    </div>
  )
}
