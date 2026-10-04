import { useLayoutEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useData'
import type { Account, Category, Goal, InfraItem, Transaction } from '../lib/types'
import { lkr, lkrShort, monthKey } from '../lib/format'
import { drawLine } from '../lib/motion'
import { Card, EmptyState, PageHeader, ProgressBar, Stat, TrackChip, useReadyEnter } from '../components/ui'

const TARGET_RUNWAY_MONTHS = 6

function FlowChart({ inc, exp, labels }: { inc: number[]; exp: number[]; labels: string[] }) {
  const incRef = useRef<SVGPolylineElement | null>(null)
  const expRef = useRef<SVGPolylineElement | null>(null)
  const W = 320
  const H = 120
  const PAD = 8
  const max = Math.max(1, ...inc, ...exp)
  const pts = (arr: number[]) =>
    arr.map((v, i) => `${(PAD + (i * (W - PAD * 2)) / Math.max(1, arr.length - 1)).toFixed(1)},${(H - PAD - (v / max) * (H - PAD * 2 - 14)).toFixed(1)}`).join(' ')
  useLayoutEffect(() => {
    const c1 = drawLine(incRef.current)
    const c2 = drawLine(expRef.current)
    return () => { c1(); c2() }
  }, [inc.join(','), exp.join(',')])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Income versus expenses, last 6 months">
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - f * (H - PAD * 2 - 14)} y2={H - PAD - f * (H - PAD * 2 - 14)} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      <polyline ref={expRef} points={pts(exp)} fill="none" stroke="#f87171" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline ref={incRef} points={pts(inc)} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((l, i) => (
        <text key={l} x={PAD + (i * (W - PAD * 2)) / Math.max(1, labels.length - 1)} y={H - 1} textAnchor="middle" fontSize={8} fill="#64748b">{l}</text>
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const { data: txs = [], isLoading } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: goals = [] } = useTable<Goal>('goals', { column: 'title' })
  const { data: infra = [] } = useTable<InfraItem>('infrastructure_items', { column: 'order_n' })
  const { data: cats = [] } = useTable<Category>('categories')
  const { data: tracks = [] } = useTable<{ id: string; name: string; color: string | null }>('tracks')
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)

  const m = useMemo(() => {
    const now = new Date()
    const mk = monthKey().slice(0, 7)
    const inMonth = txs.filter(t => t.date.slice(0, 7) === mk)
    const inc = inMonth.filter(t => t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const exp = inMonth.filter(t => t.kind === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const save = inc - exp
    const rate = inc > 0 ? (save / inc) * 100 : 0
    const byAcct = new Map<string, number>()
    accounts.forEach(a => byAcct.set(a.id, Number(a.opening_balance)))
    txs.forEach(t => {
      if (t.kind === 'income') byAcct.set(t.account_id, (byAcct.get(t.account_id) ?? 0) + Number(t.amount))
      if (t.kind === 'expense') byAcct.set(t.account_id, (byAcct.get(t.account_id) ?? 0) - Number(t.amount))
      if (t.kind === 'transfer') {
        byAcct.set(t.account_id, (byAcct.get(t.account_id) ?? 0) - Number(t.amount))
        if (t.to_account_id) byAcct.set(t.to_account_id, (byAcct.get(t.to_account_id) ?? 0) + Number(t.amount))
      }
    })
    const liquid = accounts.filter(a => !['trading'].includes(a.type)).reduce((s, a) => s + (byAcct.get(a.id) ?? 0), 0)
    const last3 = [0, 1, 2].map(i => {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return txs.filter(t => t.date.slice(0, 7) === k && t.kind === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    })
    const avgBurn = last3.reduce((a, b) => a + b, 0) / 3 || 0
    const runway = avgBurn > 0 ? liquid / avgBurn : 0
    // pace: how far through the month vs expected burn
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const elapsed = Math.min(1, now.getDate() / dim)
    const expected = avgBurn * elapsed
    const pace = expected > 0 ? exp / expected : 0
    const verdict = expected <= 0 ? 'fresh' : pace <= 1 ? 'on-track' : pace <= 1.25 ? 'at-risk' : 'over'

    const months: { key: string; label: string; inc: number; exp: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        key: k,
        label: d.toLocaleString('en', { month: 'short' }),
        inc: txs.filter(t => t.date.slice(0, 7) === k && t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0),
        exp: txs.filter(t => t.date.slice(0, 7) === k && t.kind === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      })
    }
    const infraFund = accounts.find(a => a.type === 'infra_fund')
    const emerg = accounts.find(a => a.type === 'emergency')
    const infraBal = infraFund ? byAcct.get(infraFund.id) ?? 0 : 0
    const emergBal = emerg ? byAcct.get(emerg.id) ?? 0 : 0
    const emergTarget = avgBurn * TARGET_RUNWAY_MONTHS
    return {
      inc, exp, save, rate, liquid, avgBurn, runway, elapsed, expected, pace, verdict,
      months, infraBal, emergBal, emergTarget, byAcct,
      catById: new Map(cats.map(c => [c.id, c])),
      trackById: new Map(tracks.map(t => [t.id, t])),
    }
  }, [txs, accounts, cats, tracks])

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 6)
  const nextInfra = infra.filter(i => i.status !== 'purchased').slice(0, 4)
  const savedByGoal = useMemo(() => {
    const map = new Map<string, number>()
    txs.filter(t => t.goal_id && t.kind === 'income').forEach(t => map.set(t.goal_id!, (map.get(t.goal_id!) ?? 0) + Number(t.amount)))
    return map
  }, [txs])

  const verdictChip =
    m.verdict === 'on-track' ? <span className="chip !border-emerald-400/40 text-emerald-300">● on track</span> :
    m.verdict === 'at-risk' ? <span className="chip !border-amber-300/40 text-amber-300">● at risk</span> :
    m.verdict === 'over' ? <span className="chip !border-red-400/40 text-red-300">● over pace</span> :
    <span className="chip">● fresh month</span>

  return (
    <div ref={rootRef}>
      <PageHeader title="Dashboard" sub="This month at a glance · all figures LKR" />
      {isLoading ? (
        <div className="grid sm:grid-cols-4 gap-3">{[0, 1, 2, 3].map(i => <Card key={i}><div className="skeleton h-16" /></Card>)}</div>
      ) : (
        <>
          <Card className="mb-3 !border-white/15">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="eyebrow">Am I on track this month?</div>
                <div className="text-lg font-bold font-display mt-0.5">
                  {m.expected > 0 ? <>{lkr(m.exp)} <span className="text-sm font-normal text-slate-400">of ~{lkr(m.expected)} expected pace</span></> : 'Log expenses to set your pace'}
                </div>
              </div>
              <div className="ml-auto">{verdictChip}</div>
            </div>
            <div className="mt-2"><ProgressBar pct={m.expected > 0 ? Math.min(100, m.pace * 100) : 0} color={m.verdict === 'over' ? 'bg-neg' : m.verdict === 'at-risk' ? 'bg-amber-300' : 'bg-pos'} label="Month spend pace" /></div>
          </Card>

          <div className="grid sm:grid-cols-4 gap-3">
            <Card><Stat label="Month income" value={m.inc} format={lkr} tone="text-pos" /></Card>
            <Card><Stat label="Month expenses" value={m.exp} format={lkr} tone="text-neg" /></Card>
            <Card>
              <div className="label">Saved</div>
              <div className="stat-num" title={lkr(m.save)}>{lkrShort(m.save)}</div>
              <div className="text-xs text-slate-400 mt-1">{m.rate.toFixed(1)}% rate</div>
            </Card>
            <Card>
              <div className="label">Runway</div>
              <div className="stat-num">{m.avgBurn > 0 ? `${m.runway.toFixed(1)} mo` : '—'}</div>
              <div className="text-xs text-slate-400 mt-1">burn {lkrShort(m.avgBurn)}<span title={lkr(m.avgBurn)}>/mo</span></div>
            </Card>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Card>
              <div className="font-semibold mb-1">Last 6 months</div>
              <div className="flex gap-3 text-xs mb-1"><span className="text-pos">— income</span><span className="text-neg">— expenses</span></div>
              <FlowChart inc={m.months.map(x => x.inc)} exp={m.months.map(x => x.exp)} labels={m.months.map(x => x.label)} />
            </Card>
            <div className="space-y-3">
              <Card>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">Emergency fund</span>
                  <span className="tabular-nums" title={lkr(m.emergBal)}>{lkrShort(m.emergBal)} <span className="text-slate-500">/ {lkrShort(m.emergTarget)} ({TARGET_RUNWAY_MONTHS} mo)</span></span>
                </div>
                <ProgressBar pct={m.emergTarget > 0 ? (m.emergBal / m.emergTarget) * 100 : 0} label="Emergency fund vs target" />
                <div className="flex justify-between text-sm mb-1 mt-3">
                  <span className="text-slate-300">Infrastructure fund</span>
                  <span className="tabular-nums" title={lkr(m.infraBal)}>{lkrShort(m.infraBal)}</span>
                </div>
                {nextInfra.slice(0, 1).map(i => (
                  <div key={i.id}>
                    <ProgressBar pct={i.est_max ? (m.infraBal / Number(i.est_max)) * 100 : 0} color="bg-violet-400" label={`Funded vs ${i.name}`} />
                    <div className="text-xs text-slate-500 mt-1">covers {i.est_max ? Math.min(100, Math.round((m.infraBal / Number(i.est_max)) * 100)) : 0}% of #{i.order_n} {i.name}</div>
                  </div>
                ))}
              </Card>
              <Card>
                <div className="label mb-2">Accounts</div>
                {accounts.slice(0, 6).map(a => {
                  const bal = m.byAcct.get(a.id) ?? 0
                  return (
                    <div key={a.id} className="py-1">
                      <div className="text-sm flex justify-between"><span className="text-slate-300">{a.name}</span><span className="tabular-nums" title={lkr(bal)}>{lkrShort(bal)}</span></div>
                    </div>
                  )
                })}
                {accounts.length === 0 && <EmptyState>Sign out and back in to seed default accounts.</EmptyState>}
              </Card>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Card>
              <div className="font-semibold mb-2">Active goals</div>
              {activeGoals.length === 0 && <EmptyState>No active goals. <Link className="underline" to="/goals">Create one</Link>.</EmptyState>}
              {activeGoals.map(g => {
                const saved = savedByGoal.get(g.id) ?? 0
                const pct = g.target_amount ? Math.min(100, (saved / Number(g.target_amount)) * 100) : 0
                const tr = g.track_id ? m.trackById.get(g.track_id) : undefined
                return (
                  <div key={g.id} className="py-1.5 border-b border-white/5 last:border-0">
                    <div className="text-sm flex justify-between gap-2">
                      <Link to={`/goals/${g.id}`} className="hover:underline truncate">{g.title}</Link>
                      <span className="text-slate-400 tabular-nums whitespace-nowrap" title={g.target_amount ? lkr(Number(g.target_amount)) : undefined}>{g.target_amount ? lkrShort(Number(g.target_amount)) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {tr && <TrackChip name={tr.name} color={tr.color} />}
                      <div className="flex-1"><ProgressBar pct={pct} label={`${g.title} progress`} /></div>
                    </div>
                  </div>
                )
              })}
            </Card>
            <Card>
              <div className="font-semibold mb-2">Next infrastructure</div>
              {nextInfra.map(i => (
                <div key={i.id} className="text-sm flex justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span className="truncate">#{i.order_n} {i.name}</span>
                  <span className="text-slate-400 tabular-nums whitespace-nowrap" title={i.est_min ? `${lkr(Number(i.est_min))} – ${lkr(Number(i.est_max))}` : undefined}>{i.est_min ? `${lkrShort(Number(i.est_min))}–${lkrShort(Number(i.est_max))}` : 'TBD'}</span>
                </div>
              ))}
              {nextInfra.length === 0 && <EmptyState>Everything acquired. 🎉</EmptyState>}
            </Card>
          </div>
          <Card className="mt-3">
            <div className="font-semibold mb-2">Recent transactions</div>
            {txs.slice(0, 8).map(t => (
              <div key={t.id} className="text-sm flex justify-between gap-2 py-1 border-b border-white/5 last:border-0">
                <span className="text-slate-300 truncate">{t.date} · {t.kind} · {m.catById.get(t.category_id ?? '')?.name ?? (t.kind === 'transfer' ? 'Transfer' : '—')}</span>
                <span className="tabular-nums whitespace-nowrap">{lkr(t.amount)}</span>
              </div>
            ))}
            {txs.length === 0 && <EmptyState>No transactions yet. Add your first daily entry in Transactions.</EmptyState>}
          </Card>
        </>
      )}
    </div>
  )
}
