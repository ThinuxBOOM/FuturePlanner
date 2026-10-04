import { useMemo, useState, type FormEvent } from 'react'
import { useTable, useInsert, useDelete } from '../hooks/useData'
import type { Account, Category, Goal, Transaction } from '../lib/types'
import { lkr, todayISO } from '../lib/format'
import { Card, EmptyState, PageHeader, SegmentedControl } from '../components/ui'

export default function Transactions() {
  const { data: txs = [], isLoading, refetch } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const { data: goals = [] } = useTable<Goal>('goals', { column: 'title' })
  const ins = useInsert('transactions')
  const del = useDelete('transactions')

  const [kind, setKind] = useState<'income' | 'expense' | 'transfer'>('expense')
  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [catId, setCatId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [notes, setNotes] = useState('')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return txs.filter(t => !s || (t.notes ?? '').toLowerCase().includes(s) || String(t.amount).includes(s)).slice(0, 200)
  }, [txs, q])

  const catById = new Map(cats.map(c => [c.id, c]))
  const acctById = new Map(accounts.map(a => [a.id, a]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0 || !accountId) return alert('Enter a valid amount (>0) + account')
    if (kind === 'transfer' && (!toAccountId || toAccountId === accountId)) return alert('Pick a different destination account')
    if (kind !== 'transfer' && !catId) return alert('Pick a category')
    try {
      await ins.mutateAsync({
        date, kind, amount: Number(amount), account_id: accountId,
        to_account_id: kind === 'transfer' ? toAccountId : null,
        category_id: kind === 'transfer' ? null : catId || null,
        goal_id: goalId || null, notes: notes || null
      })
    } catch (err) {
      return alert(err instanceof Error ? err.message : 'Save failed')
    }
    setAmount(''); setNotes(''); setGoalId('')
    refetch()
  }

  return (
    <div>
      <PageHeader title="Transactions" sub="Daily income, expenses and transfers · LKR" />
      <Card className="mb-4 !border-sky-400/20">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="eyebrow">Quick add</span>
          <SegmentedControl value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]} />
        </div>
        <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3">
          <div><div className="label">Date</div><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><div className="label">Amount (LKR)</div><input className="input tabular-nums" inputMode="numeric" placeholder="2500" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><div className="label">Account</div><select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">—</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          {kind === 'transfer' ? (
            <div><div className="label">To account</div><select className="input" value={toAccountId} onChange={e => setToAccountId(e.target.value)}><option value="">—</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          ) : (
            <div><div className="label">Category ({kind})</div><select className="input" value={catId} onChange={e => setCatId(e.target.value)}><option value="">—</option>{cats.filter(c => c.kind === kind).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          )}
          <div><div className="label">Goal link (optional)</div><select className="input" value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">—</option>{goals.filter(g => g.status === 'active').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
          <div className="sm:col-span-2"><div className="label">Notes</div><input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. lunch, bus, domain renewal" /></div>
          <div className="flex items-end"><button className="btn w-full" disabled={ins.isPending} type="submit">{ins.isPending ? 'Saving…' : 'Add'}</button></div>
        </form>
      </Card>
      <Card>
        <div className="flex gap-2 mb-3">
          <input className="input" placeholder="Search notes/amount…" value={q} onChange={e => setQ(e.target.value)} />
          <span className="text-xs text-slate-400 self-center whitespace-nowrap tabular-nums">{filtered.length} shown</span>
        </div>
        {isLoading ? <div className="skeleton h-24" /> : (
          <table className="grid">
            <thead><tr><th>Date</th><th>Type</th><th>Detail</th><th className="!text-right">Amount</th><th /></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="tabular-nums whitespace-nowrap">{t.date}</td>
                  <td><span className={`text-xs px-1.5 py-0.5 rounded ${t.kind === 'income' ? 'bg-emerald-400/15 text-emerald-300' : t.kind === 'transfer' ? 'bg-violet-400/15 text-violet-300' : 'bg-white/10 text-slate-300'}`}>{t.kind}</span></td>
                  <td className="text-slate-300">{acctById.get(t.account_id)?.name}{t.kind === 'transfer' ? ` → ${acctById.get(t.to_account_id ?? '')?.name}` : ` · ${catById.get(t.category_id ?? '')?.name ?? '—'}`}{t.notes ? ` · ${t.notes}` : ''}</td>
                  <td className="!text-right tabular-nums">{lkr(t.amount)}</td>
                  <td className="!text-right"><button className="btn-ghost !py-1 text-xs" onClick={() => { if (confirm('Delete?')) del.mutate(t.id) }}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && filtered.length === 0 && <EmptyState>No transactions match.</EmptyState>}
      </Card>
    </div>
  )
}
