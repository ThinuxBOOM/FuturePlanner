import { useTable, useInsert, useDelete, useUpdate } from '../hooks/useData'
import type { Account, Category } from '../lib/types'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { data: accounts = [], refetch: ra } = useTable<Account>('accounts', { column: 'name' })
  const { data: cats = [], refetch: rc } = useTable<Category>('categories', { column: 'name' })
  const insA = useInsert('accounts')
  const insC = useInsert('categories')
  const delA = useDelete('accounts')
  const delC = useDelete('categories')
  const updA = useUpdate('accounts')
  const [aName, setAName] = useState('')
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
    <div className="space-y-4">
      <div className="card">
        <div className="font-semibold mb-2">Accounts (LKR)</div>
        {accounts.map(a => (
          <div key={a.id} className="flex gap-2 py-1 text-sm items-center"><span className="flex-1">{a.name} · {a.type} · open {a.opening_balance}</span>
            <button className="btn-ghost text-xs" onClick={() => updA.mutate({ id: a.id, patch: { is_archived: !a.is_archived } })}>{a.is_archived ? 'Unarchive' : 'Archive'}</button>
            <button className="btn-ghost text-xs" onClick={() => { if (confirm('Delete account? Only if no transactions reference it.')) delA.mutate(a.id) }}>Del</button></div>
        ))}
        <form className="flex gap-2 mt-2" onSubmit={async e => { e.preventDefault(); if (!aName) return; await insA.mutateAsync({ name: aName, type: 'bank', opening_balance: 0, currency: 'LKR' }); setAName(''); ra() }}>
          <input className="input" placeholder="New account name" value={aName} onChange={e => setAName(e.target.value)} /><button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <div className="font-semibold mb-2">Categories</div>
        {cats.map(c => (
          <div key={c.id} className="flex gap-2 py-1 text-sm items-center"><span className="flex-1">{c.kind} · {c.name}</span>
            <button className="btn-ghost text-xs" onClick={() => { if (confirm('Delete?')) delC.mutate(c.id) }}>Del</button></div>
        ))}
        <form className="flex gap-2 mt-2" onSubmit={async e => { e.preventDefault(); if (!cName) return; await insC.mutateAsync({ kind: cKind, name: cName }); setCName(''); rc() }}>
          <select className="input max-w-[140px]" value={cKind} onChange={e => setCKind(e.target.value as 'income' | 'expense')}><option value="expense">expense</option><option value="income">income</option></select>
          <input className="input" placeholder="New category" value={cName} onChange={e => setCName(e.target.value)} /><button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <div className="font-semibold mb-2">Data</div>
        <button className="btn-ghost" onClick={exportCSV}>Export transactions CSV (5k)</button>
        <p className="text-xs text-slate-400 mt-2">Base currency LKR fixed for MVP. Research tools only, not investment advice. CSE analyzer stays private and is not part of this app.</p>
      </div>
    </div>
  )
}
