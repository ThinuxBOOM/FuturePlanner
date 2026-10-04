import { useLayoutEffect, useMemo, useRef } from 'react'
import { useTable, useUpdate } from '../hooks/useData'
import type { Account, InfraItem, Transaction } from '../lib/types'
import { lkr, lkrShort } from '../lib/format'
import { drawRail } from '../lib/motion'
import { Card, EmptyState, PageHeader, ProgressBar, StatusDot, useReadyEnter } from '../components/ui'

const NODE: Record<string, string> = {
  purchased: 'bg-emerald-400 border-emerald-400',
  ready: 'bg-violet-400 border-violet-400',
  saving: 'bg-sky-400 border-sky-400',
  planned: 'bg-[#131822] border-white/30',
  deferred: 'bg-[#131822] border-white/15',
}

export default function Infrastructure() {
  const { data: items = [], isLoading } = useTable<InfraItem>('infrastructure_items', { column: 'order_n' })
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: txs = [] } = useTable<Transaction>('transactions')
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)
  const railBox = useRef<HTMLDivElement | null>(null)
  const upd = useUpdate('infrastructure_items')

  const infraBal = useMemo(() => {
    const fund = accounts.find(a => a.type === 'infra_fund')
    if (!fund) return 0
    let bal = Number(fund.opening_balance)
    for (const t of txs) {
      if (t.account_id === fund.id) bal += t.kind === 'income' ? Number(t.amount) : -Number(t.amount)
      if (t.kind === 'transfer' && t.to_account_id === fund.id) bal += Number(t.amount)
    }
    return bal
  }, [accounts, txs])

  useLayoutEffect(() => {
    if (isLoading || !railBox.current) return
    railBox.current.querySelectorAll('.infra-rail').forEach(el => {
      if (el instanceof HTMLElement) drawRail(el, 600)
    })
  }, [isLoading, items.length])
  const remaining = items.filter(i => i.status !== 'purchased')
  const totalMin = remaining.reduce((s, i) => s + (Number(i.est_min) || 0), 0)
  const totalMax = remaining.reduce((s, i) => s + (Number(i.est_max) || 0), 0)

  return (
    <div ref={rootRef}>
      <PageHeader title="Infrastructure" sub="Acquisition order — buy only on trigger + cash available" />
      <Card className="mb-4">
        <div className="text-sm">Fund balance: <b className="tabular-nums" title={lkr(infraBal)}>{lkrShort(infraBal)}</b> · Remaining estimate: <b className="tabular-nums">{lkr(totalMin)} – {lkr(totalMax)}</b></div>
        <p className="text-xs text-slate-500 mt-1">Guardrail: never fund from emergency, education, or debt money.</p>
      </Card>
      {isLoading && <Card><div className="skeleton h-24" /></Card>}
      <div className="relative" ref={railBox}>
        {items.map(i => {
          const funded = i.status === 'purchased' ? 100 : i.est_max ? Math.min(100, Math.round((infraBal / Number(i.est_max)) * 100)) : 0
          return (
          <div key={i.id} className="relative pl-8 pb-3">
            {i.order_n < items.length && <span className="infra-rail absolute left-[9px] top-8 bottom-0 w-[3px] rounded-full bg-white/10 origin-top" />}
            <span className={`absolute left-[3px] top-[20px] w-4 h-4 rounded-full border-2 ${NODE[i.status] ?? NODE.planned}`} />
            <Card hover className="!p-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-slate-400 tabular-nums">#{i.order_n}</span>
                <span className="font-semibold">{i.name}</span>
                <span className="ml-auto text-sm text-slate-300 tabular-nums">{i.est_min ? `${lkr(i.est_min)}–${lkr(i.est_max)}` : 'TBD'}</span>
              </div>
              {i.spec_notes && <p className="text-sm text-slate-300 mt-1">{i.spec_notes}</p>}
              {i.trigger_text && <p className="text-xs text-sky-300/80 mt-1">Trigger: {i.trigger_text}</p>}
              {i.status !== 'purchased' && i.est_max ? (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Funded vs est. max</span>
                    <span className="tabular-nums">{funded}%</span>
                  </div>
                  <ProgressBar pct={funded} color="bg-violet-400" label={`Funded vs ${i.name}`} />
                </div>
              ) : i.status === 'purchased' ? (
                <p className="text-xs text-pos mt-2">✓ acquired{i.purchased_amount ? ` · ${lkr(Number(i.purchased_amount))}` : ''}</p>
              ) : null}
              <div className="flex items-center gap-2 mt-3">
                <StatusDot status={i.status} />
                <select aria-label={`Status for ${i.name}`} className="input !w-auto !py-1.5 text-sm ml-auto" value={i.status} onChange={e => upd.mutate({ id: i.id, patch: { status: e.target.value } })}>
                  <option value="planned">planned</option><option value="saving">saving</option><option value="ready">ready</option><option value="purchased">purchased</option><option value="deferred">deferred</option>
                </select>
              </div>
            </Card>
          </div>
          )
        })}
      </div>
      {!isLoading && items.length === 0 && <Card><EmptyState>No infra items. Seeds run on first login — sign out and back in if empty.</EmptyState></Card>}
    </div>
  )
}
