import { useTable, useUpdate } from '../hooks/useData'
import type { InfraItem } from '../lib/types'
import { lkr } from '../lib/format'

export default function Infrastructure() {
  const { data: items = [] } = useTable<InfraItem>('infrastructure_items', { column: 'order_n' })
  const upd = useUpdate('infrastructure_items')
  const totalMin = items.filter(i => i.status !== 'purchased').reduce((s, i) => s + (Number(i.est_min) || 0), 0)
  const totalMax = items.filter(i => i.status !== 'purchased').reduce((s, i) => s + (Number(i.est_max) || 0), 0)
  return (
    <div className="space-y-4">
      <div className="card text-sm">Acquisition order — buy only on trigger + cash available. Remaining est: <b>{lkr(totalMin)} – {lkr(totalMax)}</b>. Guardrail: never fund from emergency/education/debt.</div>
      {items.map(i => (
        <div key={i.id} className="card">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs bg-white/10 rounded px-2 py-1">#{i.order_n}</span>
            <span className="font-semibold">{i.name}</span>
            <span className="ml-auto text-sm text-slate-300">{i.est_min ? `${lkr(i.est_min)}–${lkr(i.est_max)}` : 'TBD'}</span>
          </div>
          {i.spec_notes && <p className="text-sm text-slate-300 mt-1">{i.spec_notes}</p>}
          {i.trigger_text && <p className="text-xs text-slate-400 mt-1">Trigger: {i.trigger_text}</p>}
          <div className="flex gap-2 mt-3">
            <select className="input max-w-[160px]" value={i.status} onChange={e => upd.mutate({ id: i.id, patch: { status: e.target.value } })}>
              <option value="planned">planned</option><option value="saving">saving</option><option value="ready">ready</option><option value="purchased">purchased</option><option value="deferred">deferred</option>
            </select>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="card text-sm text-slate-400">No infra items. Seeds run on first login — if empty, check Supabase.</div>}
    </div>
  )
}
