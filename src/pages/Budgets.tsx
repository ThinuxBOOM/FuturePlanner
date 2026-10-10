import { useMemo, useState } from 'react'
import { useTable, useInsert, useUpdate } from '../hooks/useData'
import type { Budget, Category, IncomePlan, Transaction } from '../lib/types'
import { fmtMinor, budgetRollover, shiftMonthKey } from '../lib/money'
import { monthKey } from '../lib/format'
import { useToast, ConfirmButton, useUndoDelete } from '../components/feedback'
import { Card, EmptyState, PageHeader, ProgressBar, useReadyEnter } from '../components/ui'

export default function Budgets() {
  const [month, setMonth] = useState(monthKey())
  const { data: budgets = [], isLoading, refetch } = useTable<Budget>('budgets', { column: 'month' })
  const { data: cats = [] } = useTable<Category>('categories', { column: 'name' })
  const { data: txs = [] } = useTable<Transaction>('transactions', { column: 'date', ascending: false })
  const { data: plans = [], refetch: refetchPlans } = useTable<IncomePlan>('income_plans')
  const rootRef = useReadyEnter<HTMLDivElement>(!isLoading)
  const ins = useInsert('budgets')
  const upd = useUpdate('budgets')
  const undoDelete = useUndoDelete('budgets')
  const insPlan = useInsert('income_plans')
  const updPlan = useUpdate('income_plans')
  const { notify } = useToast()
  const [catId, setCatId] = useState('')
  const [planned, setPlanned] = useState('')
  const [editingOv, setEditingOv] = useState<string | null>(null)
  const [ovVal, setOvVal] = useState('')

  const mk = month.slice(0, 7)
  const rows = useMemo(
    () => budgetRollover(budgets, txs, cats.filter(c => c.kind === 'expense'), mk),
    [budgets, txs, cats, mk],
  )
  const plan = plans.find(p => p.month.slice(0, 7) === mk)
  const [planEdit, setPlanEdit] = useState(false)
  const [planVal, setPlanVal] = useState('')

  const totalP = rows.reduce((s, r) => s + r.planned, 0)
  const totalA = rows.reduce((s, r) => s + r.spent, 0)
  const plannedIncome = plan ? Math.round(Number(plan.amount) * 100) : null
  const overIncome = plannedIncome !== null && totalP > plannedIncome

  async function savePlan() {
    if (planVal.trim() === '' || Number.isNaN(Number(planVal)) || Number(planVal) < 0) return notify('Enter a valid planned income (>=0)', 'err')
    try {
      if (plan) await updPlan.mutateAsync({ id: plan.id, patch: { amount: Number(planVal) } })
      else await insPlan.mutateAsync({ month, amount: Number(planVal) })
      notify('Planned income saved', 'ok')
    } catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
    setPlanVal(''); setPlanEdit(false); refetchPlans()
  }

  async function copyMonth() {
    const prevLines = budgets.filter(b => b.month.slice(0, 7) === shiftMonthKey(mk, -1))
    if (prevLines.length === 0) return notify('Previous month has no budget to copy', 'info')
    try {
      for (const b of prevLines) {
        const cur = budgets.find(x => x.month.slice(0, 7) === mk && x.category_id === b.category_id)
        if (cur) {
          await upd.mutateAsync({ id: cur.id, patch: { planned_amount: b.planned_amount } })
        } else {
          await ins.mutateAsync({ month, category_id: b.category_id, planned_amount: b.planned_amount, rollover: false })
        }
      }
      const prevPlan = plans.find(p => p.month.slice(0, 7) === shiftMonthKey(mk, -1))
      if (prevPlan) {
        if (plan) await updPlan.mutateAsync({ id: plan.id, patch: { amount: prevPlan.amount } })
        else await insPlan.mutateAsync({ month, amount: prevPlan.amount })
      }
      notify(`Copied ${prevLines.length} lines from last month`, 'ok')
    } catch (err) { return notify(err instanceof Error ? err.message : 'Copy failed', 'err') }
    refetch(); refetchPlans()
  }

  async function saveOverride(categoryId: string) {
    const line = budgets.find(b => b.month.slice(0, 7) === mk && b.category_id === categoryId)
    try {
      const ov = ovVal.trim() === '' ? null : Number(ovVal)
      if (ov !== null && (Number.isNaN(ov))) return notify('Override must be a number or empty', 'err')
      if (line) await upd.mutateAsync({ id: line.id, patch: { carry_override: ov } })
      else await ins.mutateAsync({ month, category_id: categoryId, planned_amount: 0, rollover: false, carry_override: ov })
      notify('Rollover override saved — later months recalculated', 'ok')
    } catch (err) { return notify(err instanceof Error ? err.message : 'Save failed', 'err') }
    setEditingOv(null); setOvVal(''); refetch()
  }

  return (
    <div ref={rootRef}>
      <PageHeader
        title="Budgets"
        sub="Monthly plan vs actual with rollover · LKR"
        action={<button className="btn-ghost text-sm" onClick={copyMonth}>Copy last month</button>}
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div><div className="label">Month</div><input aria-label="Month" className="input !w-auto" type="month" value={month.slice(0, 7)} onChange={e => setMonth(e.target.value + '-01')} /></div>
          <div className="text-sm flex gap-4">
            <span className="text-[#7d8b82]">Planned <b className="text-[#293b35] tabular-nums">{fmtMinor(totalP)}</b></span>
            <span className="text-[#7d8b82]">Actual <b className="text-[#293b35] tabular-nums">{fmtMinor(totalA)}</b></span>
            <span className={totalP - totalA < 0 ? 'text-neg' : 'text-pos'}>Left <b className="tabular-nums">{fmtMinor(totalP - totalA)}</b></span>
          </div>
          <div className="text-sm ml-auto">
            {planEdit ? (
              <span className="flex gap-2">
                <input aria-label="Planned income" className="input !w-auto" placeholder="Planned income" value={planVal} onChange={e => setPlanVal(e.target.value)} />
                <button className="btn !py-1.5" onClick={savePlan}>Save</button>
                <button className="btn-ghost !py-1.5" onClick={() => setPlanEdit(false)}>✕</button>
              </span>
            ) : (
              <button className="btn-ghost !py-1.5 text-sm" onClick={() => { setPlanVal(plan ? String(plan.amount) : ''); setPlanEdit(true) }}>
                Income plan: {plan ? fmtMinor(Math.round(Number(plan.amount) * 100)) : '— set —'}
              </button>
            )}
          </div>
        </div>
        {overIncome && <p className="text-sm text-neg mt-2">⚠ Allocations exceed planned income by {fmtMinor(totalP - (plannedIncome ?? 0))}.</p>}
        <div className="mt-2"><ProgressBar pct={totalP > 0 ? Math.min(100, (totalA / totalP) * 100) : 0} color={totalA > totalP ? 'bg-neg' : 'bg-sky-400'} label="Total budget used" /></div>
      </Card>
      <Card className="mb-4">
        <div className="eyebrow mb-2">Add budget line</div>
        <form className="flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault()
          if (!catId || !planned || Number.isNaN(Number(planned)) || Number(planned) < 0) return notify('Pick a category + valid planned amount (>=0)', 'err')
          try {
            await ins.mutateAsync({ month, category_id: catId, planned_amount: Number(planned), rollover: false })
            notify('Budget line added', 'ok')
          } catch (err) {
            return notify(err instanceof Error ? err.message : 'Save failed (line may already exist)', 'err')
          }
          setCatId(''); setPlanned(''); refetch()
        }}>
          <select aria-label="Category" className="input !w-auto flex-1 min-w-[180px]" value={catId} onChange={e => setCatId(e.target.value)}><option value="">Category…</option>{cats.filter(c => c.kind === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input aria-label="Planned amount" className="input !w-auto" placeholder="Planned LKR" value={planned} onChange={e => setPlanned(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </Card>
      <Card>
        {isLoading ? <div className="skeleton h-24" /> : rows.filter(r => r.planned !== 0 || r.spent !== 0 || r.carry !== 0).map(r => {
          const pct = r.available > 0 ? Math.min(100, (r.spent / r.available) * 100) : 0
          const over = r.spent > r.available
          const line = budgets.find(b => b.month.slice(0, 7) === mk && b.category_id === r.categoryId)
          return (
            <div key={r.categoryId} className={`py-2.5 border-b border-[#edf0e7] last:border-0 rounded-lg ${over ? 'bg-red-400/5 px-2 -mx-2 shadow-[0_0_18px_rgba(248,113,113,0.15)]' : ''}`}>
              <div className="flex justify-between text-sm gap-2">
                <span>{r.name}{r.carry !== 0 && <span className="text-[#7d8b82]"> · carry {r.carry > 0 ? '+' : ''}{fmtMinor(r.carry)}</span>}</span>
                <span className="tabular-nums text-[#43564a]">{fmtMinor(r.spent)} <span className="text-[#7d8b82]">/ {fmtMinor(r.available)}</span></span>
                {line ? <ConfirmButton onConfirm={() => undoDelete(line, 'Budget line')} /> : <span />}
              </div>
              <ProgressBar pct={pct} color={over ? 'bg-neg' : 'bg-sky-400'} className="mt-1.5" label={`${r.name} budget used`} />
              <div className="text-xs text-[#7d8b82] mt-1 flex flex-wrap gap-2 items-center">
                <span>planned {fmtMinor(r.planned)} · left {fmtMinor(r.available - r.spent)}</span>
                {editingOv === r.categoryId ? (
                  <span className="flex gap-1 items-center">
                    <input aria-label="Rollover override" className="input !w-auto !py-1" placeholder="0 to reset, blank = auto" value={ovVal} onChange={e => setOvVal(e.target.value)} />
                    <button className="btn !py-1" onClick={() => saveOverride(r.categoryId)}>Save</button>
                    <button className="btn-ghost !py-1" onClick={() => setEditingOv(null)}>✕</button>
                  </span>
                ) : (
                  <button className="underline" title="Reset or reallocate this month's starting rollover. History recalculates." onClick={() => { setEditingOv(r.categoryId); setOvVal(r.override !== null ? String(r.override / 100) : '') }}>
                    {r.override !== null ? `override ${fmtMinor(r.override)}` : 'override rollover'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {!isLoading && rows.length === 0 && <EmptyState>No budget for this month yet. Add lines above.</EmptyState>}
      </Card>
    </div>
  )
}
