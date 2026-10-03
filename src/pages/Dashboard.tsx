import { useMemo } from 'react'
import { useTable } from '../hooks/useData'
import type { Account, Category, Goal, InfraItem, Transaction } from '../lib/types'
import { lkr, monthKey } from '../lib/format'

export default function Dashboard() {
  const { data: txs = [] } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: goals = [] } = useTable<Goal>('goals', { column: 'title' })
  const { data: infra = [] } = useTable<InfraItem>('infrastructure_items', { column: 'order_n' })
  const { data: cats = [] } = useTable<Category>('categories')

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
    return { inc, exp, save, rate, liquid, avgBurn, runway, infraBal: infraFund ? byAcct.get(infraFund.id) ?? 0 : 0, emergBal: emerg ? byAcct.get(emerg.id) ?? 0 : 0, byAcct, catById: new Map(cats.map(c => [c.id, c])) }
  }, [txs, accounts, cats])

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 6)
  const nextInfra = infra.filter(i => i.status !== 'purchased').slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card"><div className="label">This month income</div><div className="text-xl font-bold text-emerald-300">{lkr(m.inc)}</div></div>
        <div className="card"><div className="label">This month expenses</div><div className="text-xl font-bold text-red-300">{lkr(m.exp)}</div></div>
        <div className="card"><div className="label">Saved + rate</div><div className="text-xl font-bold">{lkr(m.save)}</div><div className="text-xs text-slate-400">{m.rate.toFixed(1)}%</div></div>
        <div className="card"><div className="label">Runway</div><div className="text-xl font-bold">{m.avgBurn > 0 ? `${m.runway.toFixed(1)} mo` : '—'}</div><div className="text-xs text-slate-400">total incl. earmarked {lkr(m.liquid)} / burn {lkr(m.avgBurn)}</div></div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="card"><div className="label">Infrastructure fund</div><div className="text-lg font-bold">{lkr(m.infraBal)}</div></div>
        <div className="card"><div className="label">Emergency fund</div><div className="text-lg font-bold">{lkr(m.emergBal)}</div></div>
        <div className="card"><div className="label">Accounts</div>{accounts.slice(0, 6).map(a => <div key={a.id} className="text-sm flex justify-between"><span>{a.name}</span><span>{lkr(m.byAcct.get(a.id) ?? 0)}</span></div>)}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card">
          <div className="font-semibold mb-2">Active goals ({activeGoals.length})</div>
          {activeGoals.length === 0 && <p className="text-sm text-slate-400">No active goals. Create one in Goals.</p>}
          {activeGoals.map(g => <div key={g.id} className="text-sm flex justify-between py-1 border-b border-white/5"><span>{g.title}</span><span className="text-slate-400">{g.target_amount ? lkr(g.target_amount) : '—'}</span></div>)}
        </div>
        <div className="card">
          <div className="font-semibold mb-2">Next infrastructure</div>
          {nextInfra.map(i => <div key={i.id} className="text-sm flex justify-between py-1 border-b border-white/5"><span>#{i.order_n} {i.name}</span><span className="text-slate-400">{i.est_min ? `${lkr(i.est_min)}–${lkr(i.est_max)}` : 'TBD'}</span></div>)}
        </div>
      </div>
      <div className="card">
        <div className="font-semibold mb-2">Recent transactions</div>
        {txs.slice(0, 8).map(t => <div key={t.id} className="text-sm flex justify-between py-1 border-b border-white/5"><span>{t.date} · {t.kind} · {m.catById.get(t.category_id ?? '')?.name ?? (t.kind === 'transfer' ? 'Transfer' : '—')}</span><span>{lkr(t.amount)}</span></div>)}
        {txs.length === 0 && <p className="text-sm text-slate-400">No transactions yet. Add your first daily entry in Transactions.</p>}
      </div>
    </div>
  )
}
