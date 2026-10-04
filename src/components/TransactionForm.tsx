import { useState, type FormEvent } from 'react'
import { useTable, useInsert } from '../hooks/useData'
import type { Account, Category, Goal, Transaction } from '../lib/types'
import { todayISO } from '../lib/format'
import { useToast } from './feedback'
import { SegmentedControl } from './ui'

const MEM_ACCT = 'fp:lastAccount'
const MEM_CAT = 'fp:lastCategory'

export default function TransactionForm({ onSaved, autofocus = false }: { onSaved?: (id: string) => void; autofocus?: boolean }) {
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const { data: goals = [] } = useTable<Goal>('goals', { column: 'title' })
  const ins = useInsert('transactions')
  const { notify } = useToast()

  const [kind, setKind] = useState<'income' | 'expense' | 'transfer'>('expense')
  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(() => localStorage.getItem(MEM_ACCT) ?? '')
  const [toAccountId, setToAccountId] = useState('')
  const [catId, setCatId] = useState(() => localStorage.getItem(MEM_CAT) ?? '')
  const [goalId, setGoalId] = useState('')
  const [notes, setNotes] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0 || !accountId) return notify('Enter a valid amount (>0) + account', 'err')
    if (kind === 'transfer' && (!toAccountId || toAccountId === accountId)) return notify('Pick a different destination account', 'err')
    if (kind !== 'transfer' && !catId) return notify('Pick a category', 'err')
    try {
      const row = await ins.mutateAsync({
        date, kind, amount: Number(amount), account_id: accountId,
        to_account_id: kind === 'transfer' ? toAccountId : null,
        category_id: kind === 'transfer' ? null : catId || null,
        goal_id: goalId || null, notes: notes || null,
      }) as Transaction
      localStorage.setItem(MEM_ACCT, accountId)
      if (catId) localStorage.setItem(MEM_CAT, catId)
      setAmount(''); setNotes(''); setGoalId('')
      notify(`${kind === 'income' ? 'Income' : kind === 'transfer' ? 'Transfer' : 'Expense'} saved`, 'ok')
      onSaved?.(row.id)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'err')
    }
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3">
      <div className="sm:col-span-4">
        <SegmentedControl value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]} />
      </div>
      <div><div className="label">Date</div><input aria-label="Date" className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div><div className="label">Amount (LKR)</div><input aria-label="Amount in LKR" autoFocus={autofocus} className="input tabular-nums" inputMode="numeric" placeholder="2500" value={amount} onChange={e => setAmount(e.target.value)} /></div>
      <div><div className="label">Account</div><select aria-label="Account" className="input" value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">—</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      {kind === 'transfer' ? (
        <div><div className="label">To account</div><select aria-label="Destination account" className="input" value={toAccountId} onChange={e => setToAccountId(e.target.value)}><option value="">—</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      ) : (
        <div><div className="label">Category ({kind})</div><select aria-label="Category" className="input" value={catId} onChange={e => setCatId(e.target.value)}><option value="">—</option>{cats.filter(c => c.kind === kind).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      )}
      <div><div className="label">Goal link (optional)</div><select aria-label="Linked goal" className="input" value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">—</option>{goals.filter(g => g.status === 'active').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
      <div className="sm:col-span-2"><div className="label">Notes</div><input aria-label="Notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. lunch, bus, domain renewal" /></div>
      <div className="flex items-end"><button className="btn w-full" disabled={ins.isPending} type="submit">{ins.isPending ? 'Saving…' : 'Add'}</button></div>
    </form>
  )
}
