import { useState, type FormEvent } from 'react'
import { useTable, useInsert } from '../hooks/useData'
import type { Account, Category, Goal, Transaction } from '../lib/types'
import { toMinor } from '../lib/money'
import { todayISO } from '../lib/format'
import { useToast } from './feedback'
import { SegmentedControl } from './ui'

const MEM_ACCT = 'fp:lastAccount'
const MEM_CAT = 'fp:lastCategory'

type Kind = 'income' | 'expense' | 'transfer' | 'refund' | 'payment'

const DEBT_TYPES = ['card', 'loan']

export default function TransactionForm({ onSaved, autofocus = false }: { onSaved?: (id: string) => void; autofocus?: boolean }) {
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const { data: goals = [] } = useTable<Goal>('goals', { column: 'title' })
  const ins = useInsert('transactions')
  const { notify } = useToast()

  const [kind, setKind] = useState<Kind>('expense')
  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(() => localStorage.getItem(MEM_ACCT) ?? '')
  const [toAccountId, setToAccountId] = useState('')
  const [catId, setCatId] = useState(() => localStorage.getItem(MEM_CAT) ?? '')
  const [goalId, setGoalId] = useState('')
  const [notes, setNotes] = useState('')
  const [interest, setInterest] = useState('')

  const debtAccounts = accounts.filter(a => DEBT_TYPES.includes(a.type))
  const needCategory = kind === 'income' || kind === 'expense' || kind === 'refund' || (kind === 'payment' && interest.trim() !== '' && Number(interest) > 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    let minor: number
    try {
      minor = toMinor(amount)
    } catch (err) {
      return notify(err instanceof Error ? err.message : 'Invalid amount', 'err')
    }
    if (!accountId) return notify('Pick an account', 'err')
    if ((kind === 'transfer' || kind === 'payment') && (!toAccountId || toAccountId === accountId)) {
      return notify('Pick a different destination account', 'err')
    }
    if (kind === 'payment') {
      const dest = accounts.find(a => a.id === toAccountId)
      if (!dest || !DEBT_TYPES.includes(dest.type)) return notify('Repayments must go to a card or loan account', 'err')
      const src = accounts.find(a => a.id === accountId)
      if (src && DEBT_TYPES.includes(src.type)) return notify('Pay from a cash, bank or savings account', 'err')
    }
    let interestMinor = 0
    if (kind === 'payment' && interest.trim() !== '') {
      try {
        interestMinor = toMinor(interest)
      } catch (err) {
        return notify(err instanceof Error ? err.message : 'Invalid interest', 'err')
      }
      if (interestMinor >= minor) return notify('Interest must be less than the total payment', 'err')
    }
    if (needCategory && !catId) {
      return notify(kind === 'payment' ? 'Pick a category for the interest/fees' : 'Pick a category', 'err')
    }
    try {
      const row = await ins.mutateAsync({
        date, kind, amount: minor / 100, amount_minor: minor, interest_minor: interestMinor,
        account_id: accountId,
        to_account_id: kind === 'transfer' || kind === 'payment' ? toAccountId : null,
        category_id: kind === 'transfer' ? null : catId || null,
        goal_id: goalId || null, notes: notes || null,
      }) as Transaction
      localStorage.setItem(MEM_ACCT, accountId)
      if (catId) localStorage.setItem(MEM_CAT, catId)
      setAmount(''); setNotes(''); setGoalId(''); setInterest('')
      notify(kind === 'income' ? 'Income saved' : kind === 'transfer' ? 'Transfer saved' : kind === 'refund' ? 'Refund saved' : kind === 'payment' ? 'Repayment saved' : 'Expense saved', 'ok')
      onSaved?.(row.id)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'err')
    }
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3">
      <div className="sm:col-span-4">
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
            { value: 'refund', label: 'Refund' },
            { value: 'transfer', label: 'Transfer' },
            { value: 'payment', label: 'Repay' },
          ]}
        />
      </div>
      <div><div className="label">Date</div><input aria-label="Date" className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div><div className="label">Amount (LKR)</div><input aria-label="Amount in LKR" autoFocus={autofocus} className="input tabular-nums" inputMode="decimal" placeholder="2500" value={amount} onChange={e => setAmount(e.target.value)} /></div>
      <div><div className="label">Account</div><select aria-label="Account" className="input" value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">—</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      {(kind === 'transfer' || kind === 'payment') ? (
        <div>
          <div className="label">{kind === 'payment' ? 'To card / loan' : 'To account'}</div>
          <select aria-label="Destination account" className="input" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            <option value="">—</option>
            {(kind === 'payment' ? (debtAccounts.length > 0 ? debtAccounts : accounts) : accounts).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      ) : (
        <div><div className="label">Category ({kind})</div><select aria-label="Category" className="input" value={catId} onChange={e => setCatId(e.target.value)}><option value="">—</option>{cats.filter(c => c.kind === (kind === 'refund' ? 'expense' : kind)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      )}
      {kind === 'payment' && (
        <>
          <div><div className="label">Interest in payment (LKR)</div><input aria-label="Interest portion" className="input tabular-nums" inputMode="decimal" placeholder="0" value={interest} onChange={e => setInterest(e.target.value)} /></div>
          <div><div className="label">Interest category</div><select aria-label="Interest category" className="input" value={catId} onChange={e => setCatId(e.target.value)}><option value="">—</option>{cats.filter(c => c.kind === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        </>
      )}
      <div><div className="label">Goal link (optional)</div><select aria-label="Linked goal" className="input" value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">—</option>{goals.filter(g => g.status === 'active').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
      <div className="sm:col-span-2"><div className="label">Notes</div><input aria-label="Notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. lunch, bus, loan payment" /></div>
      <div className="flex items-end"><button className="btn w-full" disabled={ins.isPending} type="submit">{ins.isPending ? 'Saving…' : 'Add'}</button></div>
    </form>
  )
}
