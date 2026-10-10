import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTable, useInsert, useUpdate } from '../hooks/useData'
import type { Goal, GoalEntry, Milestone, Transaction } from '../lib/types'
import { lkr, todayISO } from '../lib/format'
import { fmtMinor, tm, toMinor } from '../lib/money'
import { popNode } from '../lib/motion'
import { useToast, ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, ProgressBar, SegmentedControl, useReadyEnter } from '../components/ui'

export default function GoalDetail() {
  const { id } = useParams()
  const { data: goals = [], isLoading: gLoading } = useTable<Goal>('goals')
  const { data: miles = [], refetch } = useTable<Milestone>('milestones', { column: 'sort' })
  const { data: txs = [] } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: entries = [], refetch: refetchEntries } = useTable<GoalEntry>('goal_entries', { column: 'date', ascending: false })
  const rootRef = useReadyEnter<HTMLDivElement>(!gLoading)
  const ins = useInsert('milestones')
  const insEntry = useInsert('goal_entries')
  const updG = useUpdate('goals')
  const updM = useUpdate('milestones')
  const undoDelete = useUndoDelete('milestones')
  const undoDeleteEntry = useUndoDelete('goal_entries')
  const { notify } = useToast()
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState('')
  const [direction, setDirection] = useState<'add' | 'release'>('add')
  const [earnAmount, setEarnAmount] = useState('')
  const [earnDate, setEarnDate] = useState(todayISO())
  const [earnNotes, setEarnNotes] = useState('')

  const g = goals.find(x => x.id === id)
  if (gLoading) return <div ref={rootRef}><Card><div className="skeleton h-32" /></Card></div>
  if (!id || !g) return <div className="card">Goal not found.</div>
  const ms = miles.filter(m => m.goal_id === id)
  const linked = txs.filter(t => t.goal_id === id)
  const linkedIn = linked.filter(t => t.kind === 'income').reduce((s, t) => s + tm(t), 0)
  const doneMs = ms.filter(m => m.is_done).length
  const myEntries = entries.filter(e => e.goal_id === id)
  const earmarked = myEntries.reduce((s, e) => s + Number(e.amount_minor), 0)
  const effective = myEntries.length > 0 ? earmarked : linkedIn
  const pct = g.target_amount
    ? Math.min(100, (effective / (Number(g.target_amount) * 100)) * 100)
    : ms.length ? Math.round((doneMs / ms.length) * 100) : 0

  async function allocate(e: React.FormEvent) {
    e.preventDefault()
    let minor: number
    try { minor = toMinor(earnAmount) } catch (err) { return notify(err instanceof Error ? err.message : 'Invalid amount', 'err') }
    const signed = direction === 'add' ? minor : -minor
    if (earmarked + signed < 0) return notify('Cannot release more than this goal has allocated', 'err')
    if (!earnDate) return notify('Pick a date', 'err')
    try {
      await insEntry.mutateAsync({ goal_id: id, amount_minor: signed, date: earnDate, notes: earnNotes || null })
      notify(direction === 'add' ? 'Allocated to goal' : 'Released from goal', 'ok')
    } catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
    setEarnAmount(''); setEarnNotes(''); refetchEntries()
  }

  return (
    <div ref={rootRef}>
      <PageHeader title={g.title} sub={`${g.status} · ${g.type}${g.target_date ? ` · due ${g.target_date}` : ''}`} />
      <Card className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[#43564a]">Progress</span>
          <span className="tabular-nums text-[#43564a] text-right">
            {g.target_amount ? `${fmtMinor(effective)} / ${lkr(g.target_amount)}` : `${doneMs}/${ms.length} milestones`}
            {myEntries.length > 0 && <span className="block text-xs text-[#7d8b82]">earmarked · linked income {fmtMinor(linkedIn)}</span>}
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
                  className={`absolute w-[3px] h-[12px] -top-[9px] rounded ${m.is_done ? 'bg-emerald-300' : 'bg-[#b9c4b4]'}`}
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
        <div className="font-semibold mb-1">Earmarks <span className="font-normal text-xs text-[#7d8b82]">set aside existing funds — moves no money, counts no spending</span></div>
        <div className="text-sm mb-2">Earmarked <b className="tabular-nums">{fmtMinor(earmarked)}</b>{g.target_amount && <span className="text-[#7d8b82]"> of {lkr(g.target_amount)}</span>}</div>
        <form onSubmit={allocate} className="flex flex-wrap gap-2 mb-2">
          <SegmentedControl value={direction} onChange={setDirection} options={[{ value: 'add', label: 'Allocate' }, { value: 'release', label: 'Release' }]} />
          <input aria-label="Earmark amount" className="input !w-auto" inputMode="decimal" placeholder="Amount LKR" value={earnAmount} onChange={e => setEarnAmount(e.target.value)} />
          <input aria-label="Earmark date" className="input !w-auto" type="date" value={earnDate} onChange={e => setEarnDate(e.target.value)} />
          <input aria-label="Earmark note" className="input flex-1 min-w-[140px]" placeholder="Note (optional)" value={earnNotes} onChange={e => setEarnNotes(e.target.value)} />
          <button className="btn" type="submit">{direction === 'add' ? 'Allocate' : 'Release'}</button>
        </form>
        {myEntries.slice(0, 20).map(en => (
          <div key={en.id} className="text-sm flex justify-between gap-2 py-1 border-b border-[#edf0e7] last:border-0">
            <span className="text-[#43564a]">{en.date} · {en.notes || (Number(en.amount_minor) > 0 ? 'allocation' : 'release')}</span>
            <span className={`tabular-nums whitespace-nowrap ${Number(en.amount_minor) > 0 ? 'text-pos' : 'text-neg'}`}>{Number(en.amount_minor) > 0 ? '+' : '−'}{fmtMinor(Math.abs(Number(en.amount_minor)))}</span>
            <ConfirmButton onConfirm={() => undoDeleteEntry(en, 'Earmark')} />
          </div>
        ))}
        {myEntries.length === 0 && <EmptyState>No earmarks yet. Allocate money already sitting in your accounts.</EmptyState>}
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
          <div key={m.id} data-anim="item" className="flex items-center gap-2 py-1.5 border-b border-[#edf0e7] last:border-0 text-sm">
            <input
              type="checkbox" aria-label={`Mark ${m.title} ${m.is_done ? 'not done' : 'done'}`} checked={m.is_done} className="w-4 h-4 accent-emerald-400"
              onChange={e => {
                updM.mutate({ id: m.id, patch: { is_done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null } })
                popNode(e.currentTarget.closest('[data-anim="item"]') as HTMLElement | null)
              }}
            />
            <span className={m.is_done ? 'line-through text-[#7d8b82]' : ''}>{m.title}</span>
            <span className="ml-auto"><ConfirmButton onConfirm={() => undoDelete(m, 'Milestone')} /></span>
          </div>
        ))}
        {ms.length === 0 && <EmptyState>No milestones yet.</EmptyState>}
      </Card>
      <Card>
        <div className="font-semibold mb-2">Linked transactions ({linked.length})</div>
        <input aria-label="Filter linked transactions" className="input mb-2" placeholder="Filter notes…" value={filter} onChange={e => setFilter(e.target.value)} />
        {linked.filter(t => !filter || (t.notes ?? '').toLowerCase().includes(filter.toLowerCase())).slice(0, 50).map(t => (
          <div key={t.id} className="text-sm flex justify-between gap-2 py-1 border-b border-[#edf0e7] last:border-0">
            <span className="text-[#43564a] truncate">{t.date} · {t.kind} · {t.notes ?? ''}</span>
            <span className="tabular-nums whitespace-nowrap">{fmtMinor(tm(t))}</span>
          </div>
        ))}
        {linked.length === 0 && <EmptyState>Link transactions from the Transactions page via the goal dropdown.</EmptyState>}
      </Card>
    </div>
  )
}
