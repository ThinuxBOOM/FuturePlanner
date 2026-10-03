import { useEffect, useState } from 'react'

export default function Plan() {
  const [md, setMd] = useState('Loading plan…')
  useEffect(() => {
    fetch('/plan.md').then(r => r.text()).then(setMd).catch(() => setMd('Plan file missing. See docs/MASTER_PLAN.md in repo.'))
  }, [])
  return (
    <div className="card">
      <h2 className="text-lg font-bold mb-2">Master Plan — reference (Stages 0–6)</h2>
      <p className="text-xs text-slate-400 mb-4">Static reference. Edit goals/budgets elsewhere — this page does not change data. Research tools only, not investment advice. CSE analyzer stays private.</p>
      <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans">{md}</pre>
    </div>
  )
}
