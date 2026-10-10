import { useMemo, useState } from 'react'
import { useTable, useInsert, useUpdate } from '../hooks/useData'
import type { Account, Category, Schedule, Transaction } from '../lib/types'
import { fmtMinor, occurrences, toMinor } from '../lib/money'
import { todayISO as todayStr } from '../lib/format'
import { useToast, ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, SegmentedControl, useReadyEnter } from '../components/ui'

type Kind = 'income' | 'expense' | 'transfer' | 'refund' | 'payment'

function horizon(): string {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Schedules() {
  const { data: scheds = [], isLoading, refetch } = useTable<Schedule>('schedules', { column: 'name' })
  const { data: txs = [], refetch: refetchTx } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: accounts = [] } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)
  const ins = useInsert('schedules')
  const upd = useUpdate('schedules')
  const undoDelete = useUndoDelete('schedules')
  const insTx = useInsert('transactions')
  const { notify } = useToast()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [catId, setCatId] = useState('')
  const [start, setStart] = useState(todayStr())
  const [freq, setFreq] = useState<'once' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [settleKey, setSettleKey] = useState<string | null>(null)
  const [settleDate, setSettleDate] = useState(todayStr())
  const [settleAmount, setSettleAmount] = useState('')

  const occ = useMemo(() => occurrences(
    scheds.map(s => ({ ...s, amount_minor: Number(s.amount_minor), interest_minor: Number(s.interest_minor ?? 0) })),
    txs,
    horizon(),
  ), [scheds, txs])
  const upcoming = occ.filter(o => !o.paid).slice(0, 30)
  const acctName = (id: string | null) => accounts.find(a => a.id === id)?.name ?? '—'

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return notify('Enter a schedule name', 'err')
    let minor: number
    try { minor = toMinor(amount) } catch (err) { return notify(err instanceof Error ? err.message : 'Invalid amount', 'err') }
    if (!accountId) return notify('Pick an account', 'err')
    if ((kind === 'transfer' || kind === 'payment') && (!toAccountId || toAccountId === accountId)) return notify('Pick a different destination', 'err')
    if ((kind === 'expense' || kind === 'refund' || kind === 'income') && !catId) return notify('Pick a category', 'err')
    try {
      await ins.mutateAsync({
        name: name.trim(), kind, amount_minor: minor, account_id: accountId,
        to_account_id: kind === 'transfer' || kind === 'payment' ? toAccountId : null,
        category_id: kind === 'transfer' ? null : catId || null,
        interest_minor: 0, start_date: start, end_date: null, frequency: freq, active: true,
      })
      notify('Schedule created', 'ok')
    } catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
    setName(''); setAmount(''); setCatId(''); setToAccountId(''); refetch()
  }

  async function settle(o: (typeof occ)[number]) {
    let minor = o.amount_minor
    if (settleAmount.trim() !== '') {
      try { minor = toMinor(settleAmount) } catch (err) { return notify(err instanceof Error ? err.message : 'Invalid amount', 'err') }
    }
    try {
      await insTx.mutateAsync({
        date: settleDate || o.due, kind: o.kind, amount: minor / 100, amount_minor: minor, interest_minor: o.interest_minor ?? 0,
        account_id: o.account_id, to_account_id: o.to_account_id,
        category_id: o.category_id, goal_id: null, notes: null, occurrence: o.key,
      })
      notify(`Recorded for ${o.due}`, 'ok')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      if (/duplicate|unique|occurrence/i.test(msg)) return notify('Already recorded for this date', 'err')
      return notify(msg, 'err')
    }
    setSettleKey(null); setSettleAmount(''); refetchTx()
  }

  return (
    <div ref={rootRef}>
      <PageHeader title="Schedules" sub="Recurring bills and income — nothing happens until you record it" />
      <Card className="mb-4">
        <div className="eyebrow mb-2">New schedule</div>
        <form onSubmit={create} className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-4">
            <SegmentedControl value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }, { value: 'refund', label: 'Refund' }, { value: 'payment', label: 'Repay' }]} />
          </div>
          <div><div className="label">Name</div><input aria-label="Schedule name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rent" /></div>
          <div><div className="label">Amount (LKR)</div><input aria-label="Amount" className="input tabular-nums" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><div className="label">Account</div><select aria-label="Account" className="input" value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">—</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          {(kind === 'transfer' || kind === 'payment') ? (
            <div><div className="label">To account</div><select aria-label="Destination" className="input" value={toAccountId} onChange={e => setToAccountId(e.target.value)}><option value="">—</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          ) : (
            <div><div className="label">Category</div><select aria-label="Category" className="input" value={catId} onChange={e => setCatId(e.target.value)}><option value="">—</option>{cats.filter(c => c.kind === (kind === 'refund' ? 'expense' : kind)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          )}
          <div><div className="label">First due</div><input aria-label="First due date" className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><div className="label">Repeats</div><select aria-label="Frequency" className="input" value={freq} onChange={e => setFreq(e.target.value as 'once' | 'weekly' | 'monthly' | 'yearly')}><option value="once">once</option><option value="weekly">weekly</option><option value="monthly">monthly</option><option value="yearly">yearly</option></select></div>
          <div className="flex items-end"><button className="btn w-full" type="submit">Add schedule</button></div>
        </form>
      </Card>

      <Card className="mb-4">
        <div className="font-semibold mb-2">Upcoming (60 days)</div>
        {isLoading ? <div className="skeleton h-16" /> : upcoming.length === 0 ? <EmptyState>Nothing due. Paid occurrences disappear automatically.</EmptyState> : upcoming.map(o => (
          <div key={o.key} className="py-2 border-b border-[#edf0e7] last:border-0">
            <div className="flex items-center gap-2 text-sm">
              <span className={`text-xs px-1.5 py-0.5 rounded ${o.due < todayStr() ? 'bg-red-400/15 text-[#ad5347]' : 'bg-[#f1f3eb] text-[#5f6f62]'}`}>{o.due}{o.due < todayStr() ? ' · overdue' : ''}</span>
              <span className="font-medium truncate">{o.name}</span>
              <span className="ml-auto tabular-nums whitespace-nowrap">{fmtMinor(o.amount_minor)}</span>
              <button className="btn !py-1 text-xs whitespace-nowrap" onClick={() => { setSettleKey(o.key); setSettleDate(o.due); setSettleAmount('') }}>
                {o.kind === 'income' ? 'Received' : 'Record paid'}
              </button>
            </div>
            <div className="text-xs text-[#7d8b82] mt-0.5">{acctName(o.account_id)}{o.to_account_id ? ` → ${acctName(o.to_account_id)}` : ''} · {o.frequency}</div>
            {settleKey === o.key && (
              <form className="flex flex-wrap gap-2 mt-2" onSubmit={e => { e.preventDefault(); settle(o) }}>
                <input aria-label="Actual date" className="input !w-auto" type="date" value={settleDate} onChange={e => setSettleDate(e.target.value)} />
                <input aria-label="Actual amount" className="input !w-auto" placeholder={`Default ${fmtMinor(o.amount_minor)}`} value={settleAmount} onChange={e => setSettleAmount(e.target.value)} />
                <button className="btn !py-1.5" type="submit">Confirm</button>
                <button className="btn-ghost !py-1.5" type="button" onClick={() => setSettleKey(null)}>✕</button>
              </form>
            )}
          </div>
        ))}
      </Card>

      <Card>
        <div className="font-semibold mb-2">All schedules</div>
        {scheds.map(s => (
          <div key={s.id} className="flex items-center gap-2 py-2 border-b border-[#edf0e7] last:border-0 text-sm">
            <span className="font-medium truncate">{s.name}</span>
            <span className="text-[#7d8b82] text-xs">{s.frequency} · {fmtMinor(Number(s.amount_minor))}</span>
            <span className="ml-auto flex items-center gap-2">
              <button className="btn-ghost !py-1 text-xs" onClick={() => upd.mutate({ id: s.id, patch: { active: !s.active } })}>{s.active ? 'Pause' : 'Resume'}</button>
              <ConfirmButton onConfirm={() => undoDelete(s, 'Schedule')} />
            </span>
          </div>
        ))}
        {scheds.length === 0 && <EmptyState>No schedules yet. Create one above.</EmptyState>}
      </Card>
    </div>
  )
}
