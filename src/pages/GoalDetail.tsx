import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTable, useInsert, useUpdate } from '../hooks/useData'
import type { Goal, Milestone, Transaction } from '../lib/types'
import { lkr } from '../lib/format'
import { popNode } from '../lib/motion'
import { useToast, ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, ProgressBar, useReadyEnter } from '../components/ui'

export default function GoalDetail() {
  const { id } = useParams()
  const { data: goals = [], isLoading: gLoading } = useTable<Goal>('goals')
  const { data: miles = [], refetch } = useTable<Milestone>('milestones', { column: 'sort' })
  const { data: txs = [] } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const rootRef = useReadyEnter<HTMLDivElement>(!gLoading)
  const ins = useInsert('milestones')
  const updG = useUpdate('goals')
  const updM = useUpdate('milestones')
  const undoDelete = useUndoDelete('milestones')
  const { notify } = useToast()
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState('')

  const g = goals.find(x => x.id === id)
  if (gLoading) return <div ref={rootRef}><Card><div className="skeleton h-32" /></Card></div>
  if (!id || !g) return <div className="card">Goal not found.</div>
  const ms = miles.filter(m => m.goal_id === id)
  const linked = txs.filter(t => t.goal_id === id)
  const linkedIn = linked.filter(t => t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const doneMs = ms.filter(m => m.is_done).length
  const pct = g.target_amount
    ? Math.min(100, (linkedIn / Number(g.target_amount)) * 100)
    : ms.length ? Math.round((doneMs / ms.length) * 100) : 0

  return (
    <div ref={rootRef}>
      <PageHeader title={g.title} sub={`${g.status} · ${g.type}${g.target_date ? ` · due ${g.target_date}` : ''}`} />
      <Card className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-300">Progress</span>
          <span className="tabular-nums text-slate-300">
            {g.target_amount ? `${lkr(linkedIn)} / ${lkr(g.target_amount)}` : `${doneMs}/${ms.length} milestones`}
          </span>
        </div>
        <div className="relative">
          <ProgressBar pct={pct} label="Goal progress" />
          {ms.length > 1 && (
            <div className="relative h-0" aria-hidden="true">
              {ms.map((m, i) => (
                <span
                  key={m.id}
                  title={m.title}
                  className={`absolute w-[3px] h-[12px] -top-[9px] rounded ${m.is_done ? 'bg-emerald-300' : 'bg-white/40'}`}
                  style={{ left: `${((i + 1) / (ms.length + 1)) * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>
        <textarea
          aria-label="Goal notes"
          className="input mt-3" rows={3} defaultValue={g.notes ?? ''} placeholder="Notes…"
          onBlur={e => { if (e.target.value !== (g.notes ?? '')) updG.mutate({ id: g.id, patch: { notes: e.target.value } }) }}
        />
      </Card>
      <Card className="mb-3">
        <div className="font-semibold mb-2">Milestones</div>
        <form className="flex gap-2 mb-3" onSubmit={async e => {
          e.preventDefault(); if (!title.trim()) return notify('Enter a milestone title', 'err')
          try {
            await ins.mutateAsync({ goal_id: id, title: title.trim(), sort: ms.length })
            notify('Milestone added', 'ok')
          } catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
          setTitle(''); refetch()
        }}>
          <input aria-label="Milestone title" className="input" placeholder="e.g. Save first Rs. 100k" value={title} onChange={e => setTitle(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
        {ms.map(m => (
          <div key={m.id} data-anim="item" className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0 text-sm">
            <input
              type="checkbox" aria-label={`Mark ${m.title} ${m.is_done ? 'not done' : 'done'}`} checked={m.is_done} className="w-4 h-4 accent-emerald-400"
              onChange={e => {
                updM.mutate({ id: m.id, patch: { is_done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null } })
                popNode(e.currentTarget.closest('[data-anim="item"]') as HTMLElement | null)
              }}
            />
            <span className={m.is_done ? 'line-through text-slate-400' : ''}>{m.title}</span>
            <span className="ml-auto"><ConfirmButton onConfirm={() => undoDelete(m, 'Milestone')} /></span>
          </div>
        ))}
        {ms.length === 0 && <EmptyState>No milestones yet.</EmptyState>}
      </Card>
      <Card>
        <div className="font-semibold mb-2">Linked transactions ({linked.length})</div>
        <input aria-label="Filter linked transactions" className="input mb-2" placeholder="Filter notes…" value={filter} onChange={e => setFilter(e.target.value)} />
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
