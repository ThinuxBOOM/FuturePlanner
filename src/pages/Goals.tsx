import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useInsert, useUpdate, useDelete } from '../hooks/useData'
import type { Goal, Track, Transaction } from '../lib/types'
import { lkr } from '../lib/format'
import { Card, EmptyState, PageHeader, ProgressBar, SegmentedControl, TrackChip } from '../components/ui'

export default function Goals() {
  const { data: goals = [], isLoading, refetch } = useTable<Goal>('goals', { column: 'title' })
  const { data: tracks = [] } = useTable<Track>('tracks', { column: 'sort' })
  const { data: txs = [] } = useTable<Transaction>('transactions')
  const ins = useInsert('goals')
  const upd = useUpdate('goals')
  const del = useDelete('goals')
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [trackId, setTrackId] = useState('')
  const [statusF, setStatusF] = useState<'active' | 'done' | 'all'>('active')
  const [q, setQ] = useState('')

  const savedByGoal = useMemo(() => {
    const map = new Map<string, number>()
    txs.filter(t => t.goal_id && t.kind === 'income').forEach(t => map.set(t.goal_id!, (map.get(t.goal_id!) ?? 0) + Number(t.amount)))
    return map
  }, [txs])
  const shown = goals.filter(g =>
    (statusF === 'all' || g.status === statusF) &&
    (!q || g.title.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div>
      <PageHeader title="Goals" sub="Anything you're working toward — savings, projects, purchases" />
      <Card className="mb-4">
        <div className="eyebrow mb-2">New goal</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault()
          if (!title.trim()) return alert('Enter a goal title')
          if (target && (Number.isNaN(Number(target)) || Number(target) <= 0)) return alert('Target must be > 0 or empty')
          try {
            await ins.mutateAsync({ title: title.trim(), target_amount: target ? Number(target) : null, track_id: trackId || null, status: 'active', type: 'savings', priority: 'p2', progress_mode: 'manual' })
          } catch (err) {
            return alert(err instanceof Error ? err.message : 'Save failed')
          }
          setTitle(''); setTarget(''); setTrackId(''); refetch()
        }}>
          <input className="input flex-1 min-w-[200px]" placeholder="e.g. Workstation fund" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input !w-auto" placeholder="Target LKR (optional)" value={target} onChange={e => setTarget(e.target.value)} />
          <select className="input !w-auto" value={trackId} onChange={e => setTrackId(e.target.value)}><option value="">Track…</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <button className="btn" type="submit">Add goal</button>
        </form>
      </Card>
      <div className="flex flex-wrap gap-2 mb-3">
        <SegmentedControl value={statusF} onChange={setStatusF} options={[{ value: 'active', label: 'Active' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All' }]} />
        <input className="input !w-auto flex-1 min-w-[140px]" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">{[0, 1].map(i => <Card key={i}><div className="skeleton h-20" /></Card>)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {shown.map(g => {
            const saved = savedByGoal.get(g.id) ?? 0
            const pct = g.target_amount ? Math.min(100, (saved / Number(g.target_amount)) * 100) : 0
            const tr = tracks.find(t => t.id === g.track_id)
            return (
              <Card key={g.id} hover>
                <div className="flex justify-between gap-2">
                  <Link to={`/goals/${g.id}`} className="font-semibold hover:underline truncate">{g.title}</Link>
                  <select className="input !w-auto !py-1 text-xs" value={g.status} onChange={e => upd.mutate({ id: g.id, patch: { status: e.target.value } })}>
                    <option value="active">active</option><option value="paused">paused</option><option value="done">done</option><option value="archived">archived</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {tr ? <TrackChip name={tr.name} color={tr.color} /> : <span className="text-xs text-slate-500">No track</span>}
                  {g.target_date && <span className="text-xs text-slate-500">due {g.target_date}</span>}
                  <span className="ml-auto text-xs text-slate-400 tabular-nums">{g.target_amount ? `${lkr(saved)} / ${lkr(g.target_amount)}` : `${lkr(saved)} linked`}</span>
                </div>
                {g.target_amount ? <ProgressBar pct={pct} className="mt-2" /> : null}
                <button className="text-xs text-slate-600 hover:text-red-300 mt-2" onClick={() => { if (confirm('Delete goal? Linked transactions will be unlinked (kept).')) del.mutate(g.id) }}>Delete</button>
              </Card>
            )
          })}
        </div>
      )}
      {!isLoading && shown.length === 0 && <Card className="mt-3"><EmptyState>No goals match. Add your first above — e.g. Emergency 6 months, Workstation, Onemarket MVP.</EmptyState></Card>}
    </div>
  )
}
