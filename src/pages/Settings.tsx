import { useState } from 'react'
import { useTable, useInsert, useUpdate } from '../hooks/useData'
import type { Account, Category } from '../lib/types'
import { lkr } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useToast, ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, useReadyEnter } from '../components/ui'

const ACCT_TYPES = ['cash', 'bank', 'emergency', 'infra_fund', 'tax', 'trading', 'company', 'household', 'other']

export default function Settings() {
  const { data: accounts = [], isLoading: aLoading, refetch: ra } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [], refetch: rc } = useTable<Category>('categories', { column: 'name' })
  const rootRef = useReadyEnter<HTMLDivElement>(!aLoading)
  const insA = useInsert('accounts')
  const insC = useInsert('categories')
  const undoDeleteA = useUndoDelete('accounts')
  const undoDeleteC = useUndoDelete('categories')
  const updA = useUpdate('accounts')
  const { notify } = useToast()
  const [aName, setAName] = useState('')
  const [aType, setAType] = useState('bank')
  const [aOpen, setAOpen] = useState('')
  const [aOpenDate, setAOpenDate] = useState('')
  const [aLimit, setALimit] = useState('')
  const [aRate, setARate] = useState('')
  const [cName, setCName] = useState('')
  const [cKind, setCKind] = useState<'income' | 'expense'>('expense')

  async function exportCSV() {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false }).limit(5000)
    if (error) return notify(error.message, 'err')
    const rows = (data ?? []) as Record<string, unknown>[]
    if (rows.length === 0) return notify('No transactions', 'info')
    const cols = Object.keys(rows[0])
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'transactions.csv'; a.click()
  }

  return (
    <div ref={rootRef}>
      <PageHeader title="Settings" sub="Accounts, categories, data export" />
      <Card className="mb-4">
        <div className="font-semibold mb-2">Accounts (LKR)</div>
        {accounts.map(a => (
          <div key={a.id} className="flex gap-2 py-1.5 text-sm items-center border-b border-[#edf0e7] last:border-0">
            <span className="flex-1">{a.name} <span className="text-[#7d8b82]">· {a.type} · open {lkr(Number(a.opening_balance))}</span>{a.is_archived && <span className="text-[#7d8b82]"> · archived</span>}</span>
            <button className="btn-ghost !py-1 text-xs" onClick={() => updA.mutate({ id: a.id, patch: { is_archived: !a.is_archived } })}>{a.is_archived ? 'Unarchive' : 'Archive'}</button>
            <ConfirmButton onConfirm={() => undoDeleteA(a, 'Account')} />
          </div>
        ))}
        {aLoading && <div className="skeleton h-16" />}
        {accounts.length === 0 && <EmptyState>No accounts.</EmptyState>}
        <form className="flex flex-wrap gap-2 mt-3" onSubmit={async e => {
          e.preventDefault(); if (!aName.trim()) return notify('Enter an account name', 'err')
          const open = aOpen === '' ? 0 : Number(aOpen)
          if (Number.isNaN(open)) return notify('Opening balance must be a number', 'err')
          const isDebt = aType === 'card' || aType === 'loan'
          const toMinorOpt = (v: string) => v.trim() === '' ? null : Math.round(Number(v) * 100)
          const limit = toMinorOpt(aLimit)
          if (aLimit.trim() !== '' && (limit === null || Number.isNaN(Number(aLimit)) || limit! < 0)) return notify('Limit must be >= 0', 'err')
          const rate = aRate.trim() === '' ? null : Number(aRate)
          if (aRate.trim() !== '' && (rate === null || Number.isNaN(rate) || rate! < 0)) return notify('Rate must be >= 0', 'err')
          try {
            await insA.mutateAsync({
              name: aName.trim(), type: aType, opening_balance: open, currency: 'LKR',
              opening_date: aOpenDate || null, limit_minor: isDebt ? limit : null,
              rate: isDebt ? rate : null, statement_minor: null, minimum_minor: null,
            })
            notify('Account added', 'ok')
          } catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
          setAName(''); setAOpen(''); setAOpenDate(''); setALimit(''); setARate(''); ra()
        }}>
          <input aria-label="Account name" className="input flex-1 min-w-[160px]" placeholder="New account name" value={aName} onChange={e => setAName(e.target.value)} />
          <select aria-label="Account type" className="input !w-auto" value={aType} onChange={e => setAType(e.target.value)}>{ACCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <input aria-label="Opening balance" className="input !w-auto" placeholder="Opening Rs." value={aOpen} onChange={e => setAOpen(e.target.value)} />
          <input aria-label="Opening date" className="input !w-auto" type="date" value={aOpenDate} onChange={e => setAOpenDate(e.target.value)} />
          {(aType === 'card' || aType === 'loan') && (
            <>
              <input aria-label="Credit limit" className="input !w-auto" placeholder="Limit Rs. (owed as +)" value={aLimit} onChange={e => setALimit(e.target.value)} />
              <input aria-label="Reference rate %" className="input !w-auto" placeholder="Rate % (ref only)" value={aRate} onChange={e => setARate(e.target.value)} />
            </>
          )}
          <button className="btn" type="submit">Add</button>
        </form>
      </Card>
      <Card className="mb-4">
        <div className="font-semibold mb-2">Categories</div>
        {cats.map(c => (
          <div key={c.id} className="flex gap-2 py-1.5 text-sm items-center border-b border-[#edf0e7] last:border-0">
            <span className="flex-1"><span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${c.kind === 'income' ? 'bg-emerald-400/15 text-[#2f7a4e]' : 'bg-[#eef1eb] text-[#43564a]'}`}>{c.kind}</span>{c.name}</span>
            <ConfirmButton onConfirm={() => undoDeleteC(c, 'Category')} />
          </div>
        ))}
        <form className="flex flex-wrap gap-2 mt-3" onSubmit={async e => {
          e.preventDefault(); if (!cName.trim()) return notify('Enter a category name', 'err')
          try { await insC.mutateAsync({ kind: cKind, name: cName.trim() }); notify('Category added', 'ok') }
          catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
          setCName(''); rc()
        }}>
          <select className="input !w-auto" value={cKind} onChange={e => setCKind(e.target.value as 'income' | 'expense')}><option value="expense">expense</option><option value="income">income</option></select>
          <input className="input flex-1 min-w-[160px]" placeholder="New category" value={cName} onChange={e => setCName(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </Card>
      <Card>
        <div className="font-semibold mb-2">Data</div>
        <button className="btn-ghost" onClick={exportCSV}>Export transactions CSV (5k)</button>
        <p className="text-xs text-[#7d8b82] mt-2">Base currency LKR fixed. Research tools only, not investment advice. CSE work stays private and is not part of this app.</p>
      </Card>
    </div>
  )
}
