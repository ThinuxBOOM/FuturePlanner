import { useTable, useUpdate } from '../hooks/useData'
import type { InfraItem } from '../lib/types'
import { lkr } from '../lib/format'
import { Card, EmptyState, PageHeader, StatusDot } from '../components/ui'

const NODE: Record<string, string> = {
  purchased: 'bg-emerald-400 border-emerald-400',
  ready: 'bg-violet-400 border-violet-400',
  saving: 'bg-sky-400 border-sky-400',
  planned: 'bg-[#131822] border-white/30',
  deferred: 'bg-[#131822] border-white/15',
}

export default function Infrastructure() {
  const { data: items = [], isLoading } = useTable<InfraItem>('infrastructure_items', { column: 'order_n' })
  const upd = useUpdate('infrastructure_items')
  const remaining = items.filter(i => i.status !== 'purchased')
  const totalMin = remaining.reduce((s, i) => s + (Number(i.est_min) || 0), 0)
  const totalMax = remaining.reduce((s, i) => s + (Number(i.est_max) || 0), 0)

  return (
    <div>
      <PageHeader title="Infrastructure" sub="Acquisition order — buy only on trigger + cash available" />
      <Card className="mb-4">
        <div className="text-sm">Remaining estimate: <b className="tabular-nums">{lkr(totalMin)} – {lkr(totalMax)}</b></div>
        <p className="text-xs text-slate-500 mt-1">Guardrail: never fund from emergency, education, or debt money.</p>
      </Card>
      {isLoading && <Card><div className="skeleton h-24" /></Card>}
      <div className="relative">
        {items.map(i => (
          <div key={i.id} className="relative pl-8 pb-3">
            {i.order_n < items.length && <span className="absolute left-[9px] top-8 bottom-0 w-[3px] rounded-full bg-white/10" />}
            <span className={`absolute left-[3px] top-[20px] w-4 h-4 rounded-full border-2 ${NODE[i.status] ?? NODE.planned}`} />
            <Card hover className="!p-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-slate-400 tabular-nums">#{i.order_n}</span>
                <span className="font-semibold">{i.name}</span>
                <span className="ml-auto text-sm text-slate-300 tabular-nums">{i.est_min ? `${lkr(i.est_min)}–${lkr(i.est_max)}` : 'TBD'}</span>
              </div>
              {i.spec_notes && <p className="text-sm text-slate-300 mt-1">{i.spec_notes}</p>}
              {i.trigger_text && <p className="text-xs text-sky-300/80 mt-1">Trigger: {i.trigger_text}</p>}
              <div className="flex items-center gap-2 mt-3">
                <StatusDot status={i.status} />
                <select className="input !w-auto !py-1.5 text-sm ml-auto" value={i.status} onChange={e => upd.mutate({ id: i.id, patch: { status: e.target.value } })}>
                  <option value="planned">planned</option><option value="saving">saving</option><option value="ready">ready</option><option value="purchased">purchased</option><option value="deferred">deferred</option>
                </select>
              </div>
            </Card>
          </div>
        ))}
      </div>
      {!isLoading && items.length === 0 && <Card><EmptyState>No infra items. Seeds run on first login — sign out and back in if empty.</EmptyState></Card>}
    </div>
  )
}
