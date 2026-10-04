import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useData'
import type { Account, Category, Goal, InfraItem, Transaction } from '../lib/types'
import { lkr, monthKey } from '../lib/format'
import { Card, EmptyState, PageHeader, ProgressBar, Stat, TrackChip } from '../components/ui'

export default function Dashboard() {
  const { data: txs = [], isLoading } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: goals = [] } = useTable<Goal>('goals', { column: 'title' })
  const { data: infra = [] } = useTable<InfraItem>('infrastructure_items', { column: 'order_n' })
  const { data: cats = [] } = useTable<Category>('categories')
  const { data: tracks = [] } = useTable<{ id: string; name: string; color: string | null }>('tracks')

  const m = useMemo(() => {
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
    const infraFund = accounts.find(a => a.type === 'infra_fund')
    const emerg = accounts.find(a => a.type === 'emergency')
    const trackById = new Map(tracks.map(t => [t.id, t]))
    const catById = new Map(cats.map(c => [c.id, c]))
    return { inc, exp, save, rate, liquid, avgBurn, runway, infraBal: infraFund ? byAcct.get(infraFund.id) ?? 0 : 0, emergBal: emerg ? byAcct.get(emerg.id) ?? 0 : 0, byAcct, catById, trackById }
  }, [txs, accounts, cats, tracks])

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 6)
  const nextInfra = infra.filter(i => i.status !== 'purchased').slice(0, 4)
  const savedByGoal = useMemo(() => {
    const map = new Map<string, number>()
    txs.filter(t => t.goal_id && t.kind === 'income').forEach(t => map.set(t.goal_id!, (map.get(t.goal_id!) ?? 0) + Number(t.amount)))
    return map
  }, [txs])

  return (
    <div>
      <PageHeader title="Dashboard" sub="This month at a glance · all figures LKR" />
      {isLoading ? (
        <div className="grid sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <Card key={i}><div className="skeleton h-12" /></Card>)}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-3">
            <Card><Stat label="Month income" value={m.inc} format={lkr} tone="text-emerald-300" /></Card>
            <Card><Stat label="Month expenses" value={m.exp} format={lkr} tone="text-red-300" /></Card>
            <Card>
              <Stat label="Saved" value={m.save} format={lkr} />
              <div className="text-xs text-slate-400 mt-1">{m.rate.toFixed(1)}% savings rate</div>
              <ProgressBar pct={Math.max(0, Math.min(100, m.rate))} className="mt-2" />
            </Card>
            <Card>
              <Stat label="Runway" value={m.runway} format={v => (m.avgBurn > 0 ? `${v.toFixed(1)} mo` : '—')} />
              <div className="text-xs text-slate-400 mt-1">total incl. earmarked {lkr(m.liquid)} / burn {lkr(m.avgBurn)}</div>
            </Card>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <Card>
              <div className="label">Infrastructure fund</div>
              <div className="stat-num">{lkr(m.infraBal)}</div>
            </Card>
            <Card>
              <div className="label">Emergency fund</div>
              <div className="stat-num">{lkr(m.emergBal)}</div>
            </Card>
            <Card>
              <div className="label mb-2">Accounts</div>
              {accounts.slice(0, 6).map(a => (
                <div key={a.id} className="text-sm flex justify-between py-0.5"><span className="text-slate-300">{a.name}</span><span className="tabular-nums">{lkr(m.byAcct.get(a.id) ?? 0)}</span></div>
              ))}
              {accounts.length === 0 && <EmptyState>Sign out and back in to seed default accounts.</EmptyState>}
            </Card>
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
                      <span className="text-slate-400 tabular-nums whitespace-nowrap">{g.target_amount ? lkr(g.target_amount) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {tr && <TrackChip name={tr.name} color={tr.color} />}
                      <div className="flex-1"><ProgressBar pct={pct} /></div>
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
                  <span className="text-slate-400 tabular-nums whitespace-nowrap">{i.est_min ? `${lkr(i.est_min)}–${lkr(i.est_max)}` : 'TBD'}</span>
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
