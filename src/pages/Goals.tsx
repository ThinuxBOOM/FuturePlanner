import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useInsert, useUpdate } from '../hooks/useData'
import type { Goal, Track, Transaction } from '../lib/types'
import { lkr } from '../lib/format'
import { fmtMinor, tm } from '../lib/money'
import { useToast, ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, ProgressBar, SegmentedControl, TrackChip, useReadyEnter } from '../components/ui'

export default function Goals() {
  const { data: goals = [], isLoading, refetch } = useTable<Goal>('goals', { column: 'title' })
  const { data: tracks = [] } = useTable<Track>('tracks', { column: 'sort' })
  const { data: txs = [] } = useTable<Transaction>('transactions')
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)
  const ins = useInsert('goals')
  const upd = useUpdate('goals')
  const undoDelete = useUndoDelete('goals')
  const { notify } = useToast()
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [trackId, setTrackId] = useState('')
  const [statusF, setStatusF] = useState<'active' | 'done' | 'all'>('active')
  const [q, setQ] = useState('')

  const savedByGoal = useMemo(() => {
    const map = new Map<string, number>()
    txs.filter(t => t.goal_id && t.kind === 'income').forEach(t => map.set(t.goal_id!, (map.get(t.goal_id!) ?? 0) + tm(t)))
    return map
  }, [txs])
  // Projected monthly linked-income rate per goal → ETA text
  const etaByGoal = useMemo(() => {
    const map = new Map<string, string>()
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    for (const g of goals) {
      if (!g.target_amount) { map.set(g.id, ''); continue }
      const perMonth = months.map(k => txs.filter(t => t.goal_id === g.id && t.kind === 'income' && t.date.slice(0, 7) === k).reduce((s, t) => s + tm(t), 0))
      const avg = perMonth.reduce((a, b) => a + b, 0) / months.length
      const saved = savedByGoal.get(g.id) ?? 0
      const left = Math.round(Number(g.target_amount) * 100) - saved
      if (left <= 0) { map.set(g.id, 'funded'); continue }
      if (avg <= 0) { map.set(g.id, 'no pace yet'); continue }
      const eta = new Date(now.getFullYear(), now.getMonth() + Math.ceil(left / avg), 1)
      map.set(g.id, `~${eta.toLocaleString('en', { month: 'short', year: 'numeric' })} at current pace`)
    }
    return map
  }, [goals, txs, savedByGoal])

  const shown = goals.filter(g =>
    (statusF === 'all' || g.status === statusF) &&
    (!q || g.title.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div ref={rootRef}>
      <PageHeader title="Goals" sub="Anything you're working toward — savings, projects, purchases" />
      <Card className="mb-4">
        <div className="eyebrow mb-2">New goal</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault()
          if (!title.trim()) return notify('Enter a goal title', 'err')
          if (target && (Number.isNaN(Number(target)) || Number(target) <= 0)) return notify('Target must be > 0 or empty', 'err')
          try {
            await ins.mutateAsync({ title: title.trim(), target_amount: target ? Number(target) : null, track_id: trackId || null, status: 'active', type: 'savings', priority: 'p2', progress_mode: 'manual' })
            notify('Goal added', 'ok')
          } catch (err) {
            return notify(err instanceof Error ? err.message : 'Save failed', 'err')
          }
          setTitle(''); setTarget(''); setTrackId(''); refetch()
        }}>
          <input aria-label="Goal title" className="input flex-1 min-w-[200px]" placeholder="e.g. Workstation fund" value={title} onChange={e => setTitle(e.target.value)} />
          <input aria-label="Target amount" className="input !w-auto" placeholder="Target LKR (optional)" value={target} onChange={e => setTarget(e.target.value)} />
          <select aria-label="Track" className="input !w-auto" value={trackId} onChange={e => setTrackId(e.target.value)}><option value="">Track…</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <button className="btn" type="submit">Add goal</button>
        </form>
      </Card>
      <div className="flex flex-wrap gap-2 mb-3">
        <SegmentedControl value={statusF} onChange={setStatusF} options={[{ value: 'active', label: 'Active' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All' }]} />
        <input aria-label="Search goals" className="input !w-auto flex-1 min-w-[140px]" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">{[0, 1].map(i => <Card key={i}><div className="skeleton h-20" /></Card>)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {shown.map(g => {
            const saved = savedByGoal.get(g.id) ?? 0
            const pct = g.target_amount ? Math.min(100, (saved / (Number(g.target_amount) * 100)) * 100) : 0
            const tr = tracks.find(t => t.id === g.track_id)
            const eta = etaByGoal.get(g.id)
            const r = 15.5
            const circ = 2 * Math.PI * r
            return (
              <Card key={g.id} hover>
                <div className="flex gap-3">
                  <svg width={44} height={44} viewBox="0 0 36 36" role="img" aria-label={`Goal progress ${Math.round(pct)} percent`} className="-rotate-90 shrink-0">
                    <circle cx={18} cy={18} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={3.5} />
                    <circle cx={18} cy={18} r={r} fill="none" stroke={pct >= 100 ? '#34d399' : '#60a5fa'} strokeWidth={3.5} strokeLinecap="round"
                      strokeDasharray={`${(pct / 100) * circ} ${circ}`} style={{ transition: 'stroke-dasharray 0.7s ease' }} />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <Link to={`/goals/${g.id}`} className="font-semibold hover:underline truncate">{g.title}</Link>
                      <select aria-label="Goal status" className="input !w-auto !py-1 text-xs" value={g.status} onChange={e => upd.mutate({ id: g.id, patch: { status: e.target.value } })}>
                        <option value="active">active</option><option value="paused">paused</option><option value="done">done</option><option value="archived">archived</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {tr ? <TrackChip name={tr.name} color={tr.color} /> : <span className="text-xs text-[#7d8b82]">No track</span>}
                      {eta && <span className="text-xs text-[#7d8b82] truncate">{eta}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1"><ProgressBar pct={pct} label={`${g.title} progress`} /></div>
                  <span className="text-xs text-[#7d8b82] tabular-nums whitespace-nowrap">{g.target_amount ? `${fmtMinor(saved)} / ${lkr(g.target_amount)}` : `${fmtMinor(saved)} linked`}</span>
                </div>
                <div className="mt-2"><ConfirmButton onConfirm={() => undoDelete(g, 'Goal')} /></div>
              </Card>
            )
          })}
        </div>
      )}
      {!isLoading && shown.length === 0 && <Card className="mt-3"><EmptyState>No goals match. Add your first above — e.g. Emergency 6 months, Workstation, Onemarket MVP.</EmptyState></Card>}
    </div>
  )
}
