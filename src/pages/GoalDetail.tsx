import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTable, useInsert, useUpdate, useDelete } from '../hooks/useData'
import type { Goal, Milestone, Transaction } from '../lib/types'
import { lkr } from '../lib/format'
import { popNode } from '../lib/motion'
import { Card, EmptyState, PageHeader, ProgressBar } from '../components/ui'

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
  const [filter, setFilter] = useState('')

  const g = goals.find(x => x.id === id)
  if (!id) return <div className="card">Goal not found.</div>
  if (!g) return <div className="card">Goal not found.</div>
  const ms = miles.filter(m => m.goal_id === id)
  const linked = txs.filter(t => t.goal_id === id)
  const linkedIn = linked.filter(t => t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const doneMs = ms.filter(m => m.is_done).length
  const pct = g.target_amount
    ? Math.min(100, (linkedIn / Number(g.target_amount)) * 100)
    : ms.length ? Math.round((doneMs / ms.length) * 100) : 0

  return (
    <div>
      <PageHeader title={g.title} sub={`${g.status} · ${g.type}${g.target_date ? ` · due ${g.target_date}` : ''}`} />
      <Card className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-300">Progress</span>
          <span className="tabular-nums text-slate-300">
            {g.target_amount ? `${lkr(linkedIn)} / ${lkr(g.target_amount)}` : `${doneMs}/${ms.length} milestones`}
          </span>
        </div>
        <ProgressBar pct={pct} />
        <textarea
          className="input mt-3" rows={3} defaultValue={g.notes ?? ''} placeholder="Notes…"
          onBlur={e => { if (e.target.value !== (g.notes ?? '')) updG.mutate({ id: g.id, patch: { notes: e.target.value } }) }}
        />
      </Card>
      <Card className="mb-3">
        <div className="font-semibold mb-2">Milestones</div>
        <form className="flex gap-2 mb-3" onSubmit={async e => {
          e.preventDefault(); if (!title.trim()) return
          try {
            await ins.mutateAsync({ goal_id: id, title: title.trim(), sort: ms.length })
          } catch (err) { return alert(err instanceof Error ? err.message : 'Save failed') }
          setTitle(''); refetch()
        }}>
          <input className="input" placeholder="e.g. Save first Rs. 100k" value={title} onChange={e => setTitle(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
        {ms.map(m => (
          <div key={m.id} data-anim="item" className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0 text-sm">
            <input
              type="checkbox" checked={m.is_done} className="w-4 h-4 accent-emerald-400"
              onChange={e => {
                updM.mutate({ id: m.id, patch: { is_done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null } })
                popNode(e.currentTarget.closest('[data-anim="item"]') as HTMLElement | null)
              }}
            />
            <span className={m.is_done ? 'line-through text-slate-400' : ''}>{m.title}</span>
            <button className="ml-auto text-xs text-slate-600 hover:text-red-300" onClick={() => { if (confirm('Delete?')) delM.mutate(m.id) }}>Del</button>
          </div>
        ))}
        {ms.length === 0 && <EmptyState>No milestones yet.</EmptyState>}
      </Card>
      <Card>
        <div className="font-semibold mb-2">Linked transactions ({linked.length})</div>
        <input className="input mb-2" placeholder="Filter notes…" value={filter} onChange={e => setFilter(e.target.value)} />
        {linked.filter(t => !filter || (t.notes ?? '').toLowerCase().includes(filter.toLowerCase())).slice(0, 50).map(t => (
          <div key={t.id} className="text-sm flex justify-between gap-2 py-1 border-b border-white/5 last:border-0">
            <span className="text-slate-300 truncate">{t.date} · {t.kind} · {t.notes ?? ''}</span>
            <span className="tabular-nums whitespace-nowrap">{lkr(t.amount)}</span>
          </div>
        ))}
        {linked.length === 0 && <EmptyState>Link transactions from the Transactions page via the goal dropdown.</EmptyState>}
      </Card>
    </div>
  )
}
