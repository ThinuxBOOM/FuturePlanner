import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTable, useInsert, useUpdate } from '../hooks/useData'
import type { PlanItem, PlanItemLink, Stage, Track } from '../lib/types'
import { popNode, drawRail, revealList } from '../lib/motion'
import { ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, ProgressBar, StatusDot, TrackChip, useReadyEnter } from '../components/ui'

const NEXT: Record<string, PlanItem['status']> = { todo: 'doing', doing: 'done', done: 'todo', blocked: 'doing', skipped: 'todo' }

function ItemRow({ item, tracks, byId, blockers, onChanged }: {
  item: PlanItem
  tracks: Track[]
  byId: Map<string, PlanItem>
  blockers: PlanItem[]
  onChanged: () => void
}) {
  const upd = useUpdate('plan_items')
  const undoDelete = useUndoDelete('plan_items')
  const insGoal = useInsert('goals')
  const [editing, setEditing] = useState(false)
  const [showAccept, setShowAccept] = useState(false)
  const [f, setF] = useState({ title: item.title, detail: item.detail ?? '', accept: item.acceptance_criteria ?? '', priority: item.priority, effort: item.effort ?? '', target: item.target_date ?? '', progress: item.progress_pct })
  const dotRef = useRef<HTMLSpanElement | null>(null)

  async function cycle() {
    const next = NEXT[item.status] ?? 'todo'
    await upd.mutateAsync({
      id: item.id,
      patch: {
        status: next,
        completed_at: next === 'done' ? new Date().toISOString() : null,
        progress_pct: next === 'done' ? 100 : next === 'todo' ? 0 : item.progress_pct,
      },
    })
    if (dotRef.current) popNode(dotRef.current)
    onChanged()
  }

  async function toGoal() {
    if (item.goal_id) return
    const g = await insGoal.mutateAsync({
      title: item.title, notes: item.detail, track_id: item.track_id, stage_id: item.stage_id,
      status: 'active', type: 'project', priority: item.priority, progress_mode: 'manual',
    }) as { id: string }
    await upd.mutateAsync({ id: item.id, patch: { goal_id: g.id } })
    onChanged()
  }

  const track = tracks.find(t => t.id === item.track_id)
  const blocked = blockers.some(b => b.status !== 'done')

  return (
    <div data-anim="item" className={`rounded-xl border p-3 transition-colors ${item.status === 'done' ? 'border-emerald-400/20 bg-emerald-400/5' : blocked ? 'border-red-400/25 bg-red-400/5' : 'border-[#e1e6dc] bg-[#f8faf6]'}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={cycle}
          title={`Status: ${item.status} — click to advance`}
          className="shrink-0 w-6 h-6 rounded-full border border-[#cdd6c9] grid place-items-center hover:border-[#93a48f]"
        >
          <span ref={dotRef} className={`dot ${item.status === 'done' ? '!w-3 !h-3 bg-emerald-400' : item.status === 'doing' ? 'bg-sky-400' : item.status === 'blocked' ? 'bg-red-400' : item.status === 'skipped' ? 'bg-slate-600' : 'bg-transparent border border-[#c2cdbd]'}`} />
        </button>
        <span className={`flex-1 text-sm font-medium ${item.status === 'done' ? 'line-through text-[#7d8b82]' : ''}`}>{item.title}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.priority === 'p1' ? 'bg-red-400/15 text-[#ad5347]' : item.priority === 'p3' ? 'bg-slate-500/15 text-[#7d8b82]' : 'bg-sky-400/10 text-[#2b7a9e]'}`}>{item.priority.toUpperCase()}</span>
        {item.effort && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#eef1eb] text-[#43564a]">{item.effort}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2 ml-8">
        {track && <TrackChip name={track.name} color={track.color} />}
        {item.target_date && <span className="text-xs text-[#7d8b82]">due {item.target_date}</span>}
        {item.status === 'doing' && (
          <span className="flex items-center gap-1 text-xs text-[#7d8b82]">
            <input type="range" min={0} max={100} value={item.progress_pct} className="w-20 accent-sky-400"
              onChange={e => upd.mutate({ id: item.id, patch: { progress_pct: Number(e.target.value) } })} />
            {item.progress_pct}%
          </span>
        )}
        {blockers.length > 0 && (
          <span className="text-xs">
            {blockers.map(b => (
              <span key={b.id} title={b.title} className={`chip mr-1 ${b.status === 'done' ? '!border-emerald-400/30 text-[#2f7a4e]' : '!border-red-400/30 text-[#ad5347]'}`}>
                {b.status === 'done' ? '✓' : '⊘'} {byId.get(b.id)?.title.slice(0, 28) ?? 'dep'}
              </span>
            ))}
          </span>
        )}
        {item.goal_id && <span className="chip !border-violet-400/30 text-[#6d5fd0]">→ goal</span>}
      </div>
      {(item.detail || item.acceptance_criteria) && (
        <button onClick={() => setShowAccept(v => !v)} className="ml-8 mt-1.5 text-xs text-[#7d8b82] hover:text-[#354a40]">
          {showAccept ? '▾ hide brief' : '▸ brief + done-criteria'}
        </button>
      )}
      {showAccept && (
        <div className="ml-8 mt-1 text-xs text-[#43564a] space-y-1">
          {item.detail && <p>{item.detail}</p>}
          {item.acceptance_criteria && <p><span className="text-[#2f7a4e] font-medium">Done when: </span>{item.acceptance_criteria}</p>}
        </div>
      )}
      <div className="ml-8 mt-2 flex flex-wrap gap-2 text-xs">
        <button className="text-[#7d8b82] hover:text-[#293b35]" onClick={() => { setF({ title: item.title, detail: item.detail ?? '', accept: item.acceptance_criteria ?? '', priority: item.priority, effort: item.effort ?? '', target: item.target_date ?? '', progress: item.progress_pct }); setEditing(v => !v) }}>edit</button>
        {!item.goal_id && <button className="text-[#7d8b82] hover:text-[#6d5fd0]" onClick={toGoal}>→ goal</button>}
        <button className="text-[#7d8b82] hover:text-[#293b35]" onClick={() => upd.mutate({ id: item.id, patch: { status: item.status === 'skipped' ? 'todo' : 'skipped' } })}>{item.status === 'skipped' ? 'unskip' : 'skip'}</button>
        <ConfirmButton onConfirm={() => undoDelete(item, 'Roadmap item')} />
      </div>
      {editing && (
        <form className="ml-8 mt-2 grid gap-2" onSubmit={async e => {
          e.preventDefault()
          if (!f.title.trim()) return
          await upd.mutateAsync({
            id: item.id,
            patch: {
              title: f.title.trim(), detail: f.detail || null, acceptance_criteria: f.accept || null,
              priority: f.priority, effort: (f.effort || null) as 'S' | 'M' | 'L' | null,
              target_date: f.target || null,
            },
          })
          setEditing(false); onChanged()
        }}>
          <input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
          <textarea className="input" rows={2} placeholder="Brief…" value={f.detail} onChange={e => setF({ ...f, detail: e.target.value })} />
          <input className="input" placeholder="Done when…" value={f.accept} onChange={e => setF({ ...f, accept: e.target.value })} />
          <div className="flex gap-2">
            <select className="input" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as PlanItem['priority'] })}><option value="p1">p1</option><option value="p2">p2</option><option value="p3">p3</option></select>
            <select className="input" value={f.effort} onChange={e => setF({ ...f, effort: e.target.value })}><option value="">effort…</option><option value="S">S</option><option value="M">M</option><option value="L">L</option></select>
            <input className="input" type="date" value={f.target} onChange={e => setF({ ...f, target: e.target.value })} />
            <button className="btn" type="submit">Save</button>
          </div>
        </form>
      )}
    </div>
  )
}

function StageSection({ s, si, isOpen, isCurrent, onToggle, tracks, byId, blockersOf, onChanged, adding, setAdding, newTitle, setNewTitle, onAdd }: {
  s: Stage
  si: PlanItem[]
  isOpen: boolean
  isCurrent: boolean
  onToggle: () => void
  tracks: Track[]
  byId: Map<string, PlanItem>
  blockersOf: Map<string, PlanItem[]>
  onChanged: () => void
  adding: string | null
  setAdding: (v: string | null) => void
  newTitle: string
  setNewTitle: (v: string) => void
  onAdd: (stageId: string) => void
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const opened = useRef(false)
  useLayoutEffect(() => {
    if (!isOpen) { opened.current = false; return }
    if (!opened.current) {
      opened.current = true
      return revealList(bodyRef.current, '[data-anim="item"]')
    }
  }, [isOpen, si.length])
  const sd = si.filter(i => i.status === 'done').length
  const pct = si.length ? Math.round((sd / si.length) * 100) : 0
  return (
    <div data-anim="card" className="relative pl-8 pb-4">
      <span className={`absolute left-[9px] top-6 bottom-0 w-[3px] rounded-full origin-top ${isCurrent ? 'bg-gradient-to-b from-sky-400 via-violet-400 to-emerald-400 plan-rail-live' : 'bg-[#eef1eb]'}`} />
      <span className={`absolute left-[3px] top-[18px] w-4 h-4 rounded-full border-2 ${pct === 100 ? 'bg-emerald-400 border-emerald-400' : isCurrent ? 'bg-sky-400 border-sky-400' : 'bg-white border-[#c2cdbd]'}`} />
      <button onClick={onToggle} aria-expanded={isOpen} className="card card-hover w-full text-left !p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{s.title}</div>
            <div className="text-xs text-[#7d8b82] truncate">{s.timing_text}{s.objective ? ` · ${s.objective}` : ''}</div>
          </div>
          <span className="text-xs tabular-nums text-[#43564a] whitespace-nowrap">{sd}/{si.length}</span>
          <span className="w-20 hidden sm:block"><ProgressBar pct={pct} label={`${s.title} progress`} /></span>
          <span className="text-[#7d8b82]">{isOpen ? '▾' : '▸'}</span>
        </div>
      </button>
      <div className={`acc mt-0 ${isOpen ? 'open mt-2' : ''}`}>
        <div>
          <div ref={bodyRef} className="space-y-2">
            {si.map(i => (
              <ItemRow key={i.id} item={i} tracks={tracks} byId={byId} blockers={blockersOf.get(i.id) ?? []} onChanged={onChanged} />
            ))}
            {adding === s.id ? (
              <form className="flex gap-2" onSubmit={e => { e.preventDefault(); onAdd(s.id) }}>
                <input autoFocus aria-label="New roadmap item" className="input" placeholder="New roadmap item…" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <button className="btn" type="submit">Add</button>
                <button className="btn-ghost" type="button" aria-label="Cancel" onClick={() => setAdding(null)}>✕</button>
              </form>
            ) : (
              <button className="btn-ghost text-sm w-full" onClick={() => setAdding(s.id)}>+ Add item to this stage</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Plan() {
  const { data: items = [], isLoading, refetch } = useTable<PlanItem>('plan_items', { column: 'sort' })
  const { data: stages = [] } = useTable<Stage>('stages', { column: 'sort' })
  const { data: tracks = [] } = useTable<Track>('tracks', { column: 'sort' })
  const { data: links = [] } = useTable<PlanItemLink>('plan_item_links')
  const ins = useInsert('plan_items')

  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [trackF, setTrackF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const railRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)
  useLayoutEffect(() => {
    const live = railRef.current?.querySelector('.plan-rail-live')
    if (live instanceof HTMLElement) drawRail(live)
  }, [stages.length, items.length])

  const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const blockersOf = useMemo(() => {
    const m = new Map<string, PlanItem[]>()
    for (const l of links) {
      const to = byId.get(l.to_item_id)
      if (to) m.set(l.from_item_id, [...(m.get(l.from_item_id) ?? []), to])
    }
    return m
  }, [links, byId])

  const visible = useMemo(() => items.filter(i =>
    !i.archived &&
    (!trackF || i.track_id === trackF) &&
    (!statusF || i.status === statusF) &&
    (!q || (i.title + (i.detail ?? '')).toLowerCase().includes(q.toLowerCase()))
  ), [items, trackF, statusF, q])

  const active = items.filter(i => !i.archived && i.status !== 'skipped')
  const doneCt = items.filter(i => !i.archived && i.status === 'done').length
  const overall = active.length ? Math.round((doneCt / items.filter(i => !i.archived && i.status !== 'skipped').length) * 100) : 0
  const currentStage = useMemo(() => {
    for (const s of [...stages].sort((a, b) => a.sort - b.sort)) {
      const si = items.filter(i => i.stage_id === s.id && !i.archived && i.status !== 'skipped')
      if (si.length > 0 && si.some(i => i.status !== 'done')) return s
    }
    return stages[stages.length - 1]
  }, [stages, items])

  useLayoutEffect(() => {
    if (!currentStage || Object.keys(open).length > 0) return
    setOpen({ [currentStage.id]: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage?.id])

  async function add(stageId: string) {
    if (!newTitle.trim()) return
    await ins.mutateAsync({
      stage_id: stageId, title: newTitle.trim(), status: 'todo', priority: 'p2',
      progress_pct: 0, is_custom: true, sort: items.filter(i => i.stage_id === stageId).length,
      track_id: trackF || null,
    })
    setNewTitle(''); setAdding(null); refetch()
  }

  return (
    <div ref={rootRef}>
      <PageHeader title="Roadmap" sub="Your 5-year plan as a living checklist — mark done, extend, link to goals" />
      <Card className="mb-4 sticky top-[118px] z-[5] !bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#43564a]">Overall progress</span>
              <span className="tabular-nums text-[#43564a]">{doneCt}/{active.length} · {overall}%</span>
            </div>
            <ProgressBar pct={overall} color="bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400" label="Overall roadmap progress" />
          </div>
          {currentStage && <span className="chip !border-sky-400/40 text-[#2b7a9e]">▶ {currentStage.title}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <button onClick={() => setTrackF('')} className={`chip transition-colors ${!trackF ? '!bg-[#37664d] !text-white !border-[#37664d] font-medium' : 'hover:bg-[#eef2ec]'}`}>All</button>
          {tracks.map(t => (
            <button
              key={t.id}
              onClick={() => setTrackF(trackF === t.id ? '' : t.id)}
              aria-pressed={trackF === t.id}
              className={`chip transition-colors ${trackF === t.id ? '!bg-[#37664d] !text-white !border-[#37664d] font-medium' : 'hover:bg-[#eef2ec]'}`}
            >
              <span className="dot" style={{ background: trackF === t.id ? '#fff' : t.color ?? '#64748b' }} />
              {t.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <select aria-label="Status filter" className="input !w-auto" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All statuses</option>
            {['todo', 'doing', 'blocked', 'done', 'skipped'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input aria-label="Search roadmap" className="input !w-auto flex-1 min-w-[140px]" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </Card>

      {isLoading && <Card><div className="skeleton h-24" /></Card>}
      <div className="relative" ref={railRef}>
        {[...stages].sort((a, b) => a.sort - b.sort).map(s => {
          const si = visible.filter(i => i.stage_id === s.id)
          if (si.length === 0) return null
          return (
            <StageSection
              key={s.id} s={s} si={si}
              isOpen={!!open[s.id]} isCurrent={currentStage?.id === s.id}
              onToggle={() => setOpen(o => ({ ...o, [s.id]: !o[s.id] }))}
              tracks={tracks} byId={byId} blockersOf={blockersOf} onChanged={refetch}
              adding={adding} setAdding={setAdding} newTitle={newTitle} setNewTitle={setNewTitle} onAdd={add}
            />
          )
        })}
      </div>
      {!isLoading && visible.length === 0 && (
        <Card><EmptyState>{items.length === 0 ? 'Roadmap seeds appear on first login — sign out and back in if empty.' : 'No items match these filters.'}</EmptyState></Card>
      )}
      <Card className="mt-2">
        <div className="flex items-center gap-2 text-xs text-[#7d8b82]">
          <StatusDot status="todo" /><StatusDot status="doing" /><StatusDot status="blocked" /><StatusDot status="done" /><StatusDot status="skipped" />
          <span className="ml-auto">Research tools only — never investment advice. CSE work stays private.</span>
        </div>
      </Card>
    </div>
  )
}
