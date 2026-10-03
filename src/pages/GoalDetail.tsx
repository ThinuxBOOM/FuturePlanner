import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTable, useInsert, useUpdate, useDelete } from '../hooks/useData'
import type { Goal, Milestone, Transaction } from '../lib/types'
import { lkr } from '../lib/format'

export default function GoalDetail() {
  const { id } = useParams()
  const { data: goals = [] } = useTable<Goal>('goals')
  const { data: miles = [], refetch } = useTable<Milestone>('milestones', { column: 'sort' })
  const { data: txs = [] } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const ins = useInsert('milestones')
  const updG = useUpdate('goals')
  const updM = useUpdate('milestones')
  const delM = useDelete('milestones')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  const g = goals.find(x => x.id === id)
  if (!id) return <div className="card">Goal not found.</div>
  if (!g) return <div className="card">Goal not found.</div>
  const ms = miles.filter(m => m.goal_id === id)
  const linked = txs.filter(t => t.goal_id === id)

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-bold">{g.title}</h2>
        <div className="text-sm text-slate-400">{g.status} · {g.type} · {g.target_amount ? lkr(g.target_amount) : 'no target'}{g.target_date ? ` · due ${g.target_date}` : ''}</div>
        <textarea className="input mt-3" rows={3} defaultValue={g.notes ?? ''} placeholder="Notes…" onBlur={e => { if (e.target.value !== (g.notes ?? '')) updG.mutate({ id: g.id, patch: { notes: e.target.value } }) }} />
      </div>
      <div className="card">
        <div className="font-semibold mb-2">Milestones</div>
        <form className="flex gap-2 mb-3" onSubmit={async e => { e.preventDefault(); if (!title) return; await ins.mutateAsync({ goal_id: id, title, sort: ms.length }); setTitle(''); refetch() }}>
          <input className="input" placeholder="e.g. Save first Rs. 100k" value={title} onChange={e => setTitle(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
        {ms.map(m => (
          <div key={m.id} className="flex items-center gap-2 py-1 border-b border-white/5 text-sm">
            <input type="checkbox" checked={m.is_done} onChange={e => updM.mutate({ id: m.id, patch: { is_done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null } })} />
            <span className={m.is_done ? 'line-through text-slate-400' : ''}>{m.title}</span>
            <button className="ml-auto btn-ghost text-xs" onClick={() => { if (confirm('Delete?')) delM.mutate(m.id) }}>Del</button>
          </div>
        ))}
        {ms.length === 0 && <p className="text-sm text-slate-400">No milestones.</p>}
      </div>
      <div className="card">
        <div className="font-semibold mb-2">Linked transactions ({linked.length})</div>
        <div className="text-sm text-slate-400 mb-2">Link from Transactions page via goal dropdown. Add note: {notes}</div>
        <input className="input mb-2" placeholder="Quick note filter…" value={notes} onChange={e => setNotes(e.target.value)} />
        {linked.filter(t => !notes || (t.notes ?? '').includes(notes)).slice(0, 50).map(t => (
          <div key={t.id} className="text-sm flex justify-between py-1 border-b border-white/5"><span>{t.date} · {t.kind} · {t.notes ?? ''}</span><span>{lkr(t.amount)}</span></div>
        ))}
      </div>
    </div>
  )
}
