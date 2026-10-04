import { useState } from 'react'
import { useTable, useInsert, useDelete, useUpdate } from '../hooks/useData'
import type { Account, Category } from '../lib/types'
import { lkr } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Card, EmptyState, PageHeader } from '../components/ui'

const ACCT_TYPES = ['cash', 'bank', 'emergency', 'infra_fund', 'tax', 'trading', 'company', 'household', 'other']

export default function Settings() {
  const { data: accounts = [], refetch: ra } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [], refetch: rc } = useTable<Category>('categories', { column: 'name' })
  const insA = useInsert('accounts')
  const insC = useInsert('categories')
  const delA = useDelete('accounts')
  const delC = useDelete('categories')
  const updA = useUpdate('accounts')
  const [aName, setAName] = useState('')
  const [aType, setAType] = useState('bank')
  const [aOpen, setAOpen] = useState('')
  const [cName, setCName] = useState('')
  const [cKind, setCKind] = useState<'income' | 'expense'>('expense')

  async function exportCSV() {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false }).limit(5000)
    if (error) return alert(error.message)
    const rows = (data ?? []) as Record<string, unknown>[]
    if (rows.length === 0) return alert('No transactions')
    const cols = Object.keys(rows[0])
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'transactions.csv'; a.click()
  }

  return (
    <div>
      <PageHeader title="Settings" sub="Accounts, categories, data export" />
      <Card className="mb-4">
        <div className="font-semibold mb-2">Accounts (LKR)</div>
        {accounts.map(a => (
          <div key={a.id} className="flex gap-2 py-1.5 text-sm items-center border-b border-white/5 last:border-0">
            <span className="flex-1">{a.name} <span className="text-slate-500">· {a.type} · open {lkr(Number(a.opening_balance))}</span>{a.is_archived && <span className="text-slate-500"> · archived</span>}</span>
            <button className="btn-ghost !py-1 text-xs" onClick={() => updA.mutate({ id: a.id, patch: { is_archived: !a.is_archived } })}>{a.is_archived ? 'Unarchive' : 'Archive'}</button>
            <button className="btn-ghost !py-1 text-xs" onClick={() => { if (confirm('Delete account? Only if no transactions reference it.')) delA.mutate(a.id) }}>Del</button>
          </div>
        ))}
        {accounts.length === 0 && <EmptyState>No accounts.</EmptyState>}
        <form className="flex flex-wrap gap-2 mt-3" onSubmit={async e => {
          e.preventDefault(); if (!aName.trim()) return
          const open = aOpen === '' ? 0 : Number(aOpen)
          if (Number.isNaN(open)) return alert('Opening balance must be a number')
          try {
            await insA.mutateAsync({ name: aName.trim(), type: aType, opening_balance: open, currency: 'LKR' })
          } catch (err) { return alert(err instanceof Error ? err.message : 'Save failed') }
          setAName(''); setAOpen(''); ra()
        }}>
          <input className="input flex-1 min-w-[160px]" placeholder="New account name" value={aName} onChange={e => setAName(e.target.value)} />
          <select className="input !w-auto" value={aType} onChange={e => setAType(e.target.value)}>{ACCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <input className="input !w-auto" placeholder="Opening Rs." value={aOpen} onChange={e => setAOpen(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </Card>
      <Card className="mb-4">
        <div className="font-semibold mb-2">Categories</div>
        {cats.map(c => (
          <div key={c.id} className="flex gap-2 py-1.5 text-sm items-center border-b border-white/5 last:border-0">
            <span className="flex-1"><span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${c.kind === 'income' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-slate-300'}`}>{c.kind}</span>{c.name}</span>
            <button className="btn-ghost !py-1 text-xs" onClick={() => { if (confirm('Delete?')) delC.mutate(c.id) }}>Del</button>
          </div>
        ))}
        <form className="flex flex-wrap gap-2 mt-3" onSubmit={async e => {
          e.preventDefault(); if (!cName.trim()) return
          try { await insC.mutateAsync({ kind: cKind, name: cName.trim() }) }
          catch (err) { return alert(err instanceof Error ? err.message : 'Save failed') }
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
        <p className="text-xs text-slate-500 mt-2">Base currency LKR fixed. Research tools only, not investment advice. CSE work stays private and is not part of this app.</p>
      </Card>
    </div>
  )
}
