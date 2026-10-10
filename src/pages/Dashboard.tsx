import { useLayoutEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useData'
import type { Account, Category, Goal, InfraItem, Transaction } from '../lib/types'
import { fmtMinor, fmtMinorShort, balancesMinor, sumMinor, sumSpending, tm } from '../lib/money'
import { monthKey } from '../lib/format'
import { drawLine } from '../lib/motion'
import { Leaf } from 'lucide-react'
import { Card, EmptyState, PageHeader, ProgressBar, Stat, TrackChip, useReadyEnter } from '../components/ui'
import { fillBar } from '../lib/motion'

function HeroPace({ pct, over }: { pct: number; over: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => fillBar(ref.current, pct), [pct])
  return <div ref={ref} className={`h-full rounded-full origin-left ${over ? 'bg-[#f0a49a]' : 'bg-[#9fd0ab]'}`} style={{ transform: 'scaleX(0)' }} />
}

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
        <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - f * (H - PAD * 2 - 14)} y2={H - PAD - f * (H - PAD * 2 - 14)} stroke="rgba(41,59,53,0.10)" strokeWidth={1} />
      ))}
      <polyline ref={expRef} points={pts(exp)} fill="none" stroke="#c05a4b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline ref={incRef} points={pts(inc)} fill="none" stroke="#3f8a5c" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((l, i) => (
        <text key={l} x={PAD + (i * (W - PAD * 2)) / Math.max(1, labels.length - 1)} y={H - 1} textAnchor="middle" fontSize={8} fill="#7d8b82">{l}</text>
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
    // all sums below are integer minor units — exact, no float drift
    const inc = sumMinor(inMonth, t => t.kind === 'income')
    const exp = sumSpending(inMonth, t => t.kind === 'expense' || t.kind === 'refund' || t.kind === 'payment')
    const save = inc - exp
    const rate = inc > 0 ? (save / inc) * 100 : 0
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const byAcct = balancesMinor(accounts, txs, today)
    const liquid = accounts.filter(a => !['trading'].includes(a.type)).reduce((s, a) => s + (byAcct.get(a.id) ?? 0), 0)
    const last3 = [0, 1, 2].map(i => {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return sumSpending(txs, t => t.date.slice(0, 7) === k && (t.kind === 'expense' || t.kind === 'refund' || t.kind === 'payment'))
    })
    const avgBurn = Math.round(last3.reduce((a, b) => a + b, 0) / 3) || 0
    const runway = avgBurn > 0 ? liquid / avgBurn : 0
    // pace: how far through the month vs expected burn
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const elapsed = Math.min(1, now.getDate() / dim)
    const expected = Math.round(avgBurn * elapsed)
    const pace = expected > 0 ? exp / expected : 0
    const verdict = expected <= 0 ? 'fresh' : pace <= 1 ? 'on-track' : pace <= 1.25 ? 'at-risk' : 'over'

    const months: { key: string; label: string; inc: number; exp: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        key: k,
        label: d.toLocaleString('en', { month: 'short' }),
        inc: sumMinor(txs, t => t.date.slice(0, 7) === k && t.kind === 'income'),
        exp: sumSpending(txs, t => t.date.slice(0, 7) === k && (t.kind === 'expense' || t.kind === 'refund' || t.kind === 'payment')),
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
    txs.filter(t => t.goal_id && t.kind === 'income').forEach(t => map.set(t.goal_id!, (map.get(t.goal_id!) ?? 0) + tm(t)))
    return map
  }, [txs])

  const verdictChip =
    m.verdict === 'on-track' ? <span className="chip !border-white/30 !bg-white/10 !text-white">● on track</span> :
    m.verdict === 'at-risk' ? <span className="chip !border-white/30 !bg-white/10 !text-white">● at risk</span> :
    m.verdict === 'over' ? <span className="chip !border-white/30 !bg-white/10 !text-white">● over pace</span> :
    <span className="chip !border-white/30 !bg-white/10 !text-white">● fresh month</span>

  return (
    <div ref={rootRef}>
      <PageHeader title="Dashboard" sub="This month at a glance · all figures LKR" />
      {isLoading ? (
        <div className="grid sm:grid-cols-4 gap-3">{[0, 1, 2, 3].map(i => <Card key={i}><div className="skeleton h-16" /></Card>)}</div>
      ) : (
        <>
          <div data-anim="card" className="mb-3 rounded-[13px] bg-[#365a46] text-white p-6 sm:p-7 relative overflow-hidden">
            <div className="eyebrow !text-[#c3d2bd]">Am I on track this month?</div>
            <div className="font-display text-[34px] leading-tight mt-3">
              {m.expected > 0 ? <>{fmtMinor(m.exp)} <span className="text-sm font-sans font-normal text-[#b9cdbb]">of ~{fmtMinor(m.expected)} expected pace</span></> : 'Log expenses to set your pace'}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-[6px] rounded-full bg-white/20 overflow-hidden">
                <HeroPace pct={m.expected > 0 ? Math.min(100, m.pace * 100) : 0} over={m.verdict === 'over'} />
              </div>
              {verdictChip}
            </div>
            <Leaf size={120} className="absolute -bottom-4 right-3 opacity-[0.12] rotate-[30deg] text-white" aria-hidden="true" />
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <Card><Stat label="Month income" value={m.inc} format={fmtMinor} tone="text-pos" /></Card>
            <Card><Stat label="Month expenses" value={m.exp} format={fmtMinor} tone="text-neg" /></Card>
            <Card>
              <div className="label">Saved</div>
              <div className="stat-num" title={fmtMinor(m.save)}>{fmtMinorShort(m.save)}</div>
              <div className="text-xs text-[#7d8b82] mt-1">{m.rate.toFixed(1)}% rate</div>
            </Card>
            <Card>
              <div className="label">Runway</div>
              <div className="stat-num">{m.avgBurn > 0 ? `${m.runway.toFixed(1)} mo` : '—'}</div>
              <div className="text-xs text-[#7d8b82] mt-1">burn {fmtMinorShort(m.avgBurn)}<span title={fmtMinor(m.avgBurn)}>/mo</span></div>
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
                  <span className="text-[#43564a]">Emergency fund</span>
                  <span className="tabular-nums" title={fmtMinor(m.emergBal)}>{fmtMinorShort(m.emergBal)} <span className="text-[#7d8b82]">/ {fmtMinorShort(m.emergTarget)} ({TARGET_RUNWAY_MONTHS} mo)</span></span>
                </div>
                <ProgressBar pct={m.emergTarget > 0 ? (m.emergBal / m.emergTarget) * 100 : 0} label="Emergency fund vs target" />
                <div className="flex justify-between text-sm mb-1 mt-3">
                  <span className="text-[#43564a]">Infrastructure fund</span>
                  <span className="tabular-nums" title={fmtMinor(m.infraBal)}>{fmtMinorShort(m.infraBal)}</span>
                </div>
                {nextInfra.slice(0, 1).map(i => (
                  <div key={i.id}>
                    <ProgressBar pct={i.est_max ? (m.infraBal / Number(i.est_max)) * 100 : 0} color="bg-violet-400" label={`Funded vs ${i.name}`} />
                    <div className="text-xs text-[#7d8b82] mt-1">covers {i.est_max ? Math.min(100, Math.round((m.infraBal / Number(i.est_max)) * 100)) : 0}% of #{i.order_n} {i.name}</div>
                  </div>
                ))}
              </Card>
              <Card>
                <div className="label mb-2">Accounts</div>
                {accounts.slice(0, 6).map(a => {
                  const bal = m.byAcct.get(a.id) ?? 0
                  return (
                    <div key={a.id} className="py-1">
                      <div className="text-sm flex justify-between"><span className="text-[#43564a]">{a.name}</span><span className="tabular-nums" title={fmtMinor(bal)}>{fmtMinorShort(bal)}</span></div>
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
                const pct = g.target_amount ? Math.min(100, (saved / (Number(g.target_amount) * 100)) * 100) : 0
                const tr = g.track_id ? m.trackById.get(g.track_id) : undefined
                return (
                  <div key={g.id} className="py-1.5 border-b border-[#edf0e7] last:border-0">
                    <div className="text-sm flex justify-between gap-2">
                      <Link to={`/goals/${g.id}`} className="hover:underline truncate">{g.title}</Link>
                      <span className="text-[#7d8b82] tabular-nums whitespace-nowrap" title={g.target_amount ? fmtMinor(Number(g.target_amount) * 100) : undefined}>{g.target_amount ? fmtMinorShort(Number(g.target_amount) * 100) : '—'}</span>
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
                <div key={i.id} className="text-sm flex justify-between gap-2 py-1.5 border-b border-[#edf0e7] last:border-0">
                  <span className="truncate">#{i.order_n} {i.name}</span>
                  <span className="text-[#7d8b82] tabular-nums whitespace-nowrap" title={i.est_min ? `${fmtMinor(Number(i.est_min) * 100)} – ${fmtMinor(Number(i.est_max) * 100)}` : undefined}>{i.est_min ? `${fmtMinorShort(Number(i.est_min) * 100)}–${fmtMinorShort(Number(i.est_max) * 100)}` : 'TBD'}</span>
                </div>
              ))}
              {nextInfra.length === 0 && <EmptyState>Everything acquired. 🎉</EmptyState>}
            </Card>
          </div>
          <Card className="mt-3">
            <div className="font-semibold mb-2">Recent transactions</div>
            {txs.slice(0, 8).map(t => (
              <div key={t.id} className="text-sm flex justify-between gap-2 py-1 border-b border-[#edf0e7] last:border-0">
                <span className="text-[#43564a] truncate">{t.date} · {t.kind} · {m.catById.get(t.category_id ?? '')?.name ?? (t.kind === 'transfer' || t.kind === 'payment' ? (t.kind === 'payment' ? 'Repayment' : 'Transfer') : '—')}</span>
                <span className="tabular-nums whitespace-nowrap">{fmtMinor(tm(t))}</span>
              </div>
            ))}
            {txs.length === 0 && <EmptyState>No transactions yet. Add your first daily entry in Transactions.</EmptyState>}
          </Card>
        </>
      )}
    </div>
  )
}
