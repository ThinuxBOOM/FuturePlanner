import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useInsert, useUpdate, useDelete } from '../hooks/useData'
import type { Goal, Track, Transaction } from '../lib/types'
import { lkr } from '../lib/format'

export default function Goals() {
  const { data: goals = [], refetch } = useTable<Goal>('goals', { column: 'title' })
  const { data: tracks = [] } = useTable<Track>('tracks', { column: 'sort' })
  const { data: txs = [] } = useTable<Transaction>('transactions')
  const ins = useInsert('goals')
  const upd = useUpdate('goals')
  const del = useDelete('goals')
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [trackId, setTrackId] = useState('')

  const savedByGoal = new Map<string, number>()
  txs.filter(t => t.goal_id && t.kind === 'income').forEach(t => savedByGoal.set(t.goal_id!, (savedByGoal.get(t.goal_id!) ?? 0) + Number(t.amount)))

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="font-semibold mb-2">New goal (versatile — anything)</div>
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
          <input className="input max-w-[240px]" placeholder="e.g. Workstation fund" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input max-w-[160px]" placeholder="Target LKR (optional)" value={target} onChange={e => setTarget(e.target.value)} />
          <select className="input max-w-[200px]" value={trackId} onChange={e => setTrackId(e.target.value)}><option value="">Track…</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <button className="btn" type="submit">Add goal</button>
        </form>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {goals.map(g => {
          const saved = savedByGoal.get(g.id) ?? 0
          const pct = g.target_amount ? Math.min(100, (saved / Number(g.target_amount)) * 100) : 0
          return (
            <div key={g.id} className="card">
              <div className="flex justify-between gap-2"><Link to={`/goals/${g.id}`} className="font-semibold hover:underline">{g.title}</Link><span className="text-xs text-slate-400">{g.status}</span></div>
              <div className="text-xs text-slate-400">{tracks.find(t => t.id === g.track_id)?.name ?? 'No track'}{g.target_date ? ` · due ${g.target_date}` : ''}</div>
              <div className="text-sm mt-1">Linked saved {lkr(saved)}{g.target_amount ? ` / ${lkr(g.target_amount)} (${pct.toFixed(0)}%)` : ''}</div>
              {g.target_amount ? <div className="h-2 bg-white/10 rounded mt-2"><div className="h-2 bg-emerald-400 rounded" style={{ width: `${pct}%` }} /></div> : null}
              <div className="flex gap-2 mt-3">
                <select className="input max-w-[140px]" value={g.status} onChange={e => upd.mutate({ id: g.id, patch: { status: e.target.value } })}>
                  <option value="active">active</option><option value="paused">paused</option><option value="done">done</option><option value="archived">archived</option>
                </select>
                <button className="btn-ghost text-xs" onClick={() => { if (confirm('Delete goal? Linked transactions will be unlinked (kept).')) del.mutate(g.id) }}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>
      {goals.length === 0 && <div className="card text-sm text-slate-400">No goals yet. Add your first above — e.g. Emergency 6 months, Workstation, Onemarket MVP.</div>}
    </div>
  )
}
