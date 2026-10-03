import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const links = [
  ['/', 'Dashboard'],
  ['/transactions', 'Transactions'],
  ['/budgets', 'Budgets'],
  ['/goals', 'Goals'],
  ['/infrastructure', 'Infra'],
  ['/plan', 'Plan'],
  ['/review', 'Review'],
  ['/settings', 'Settings'],
]

export default function Layout() {
  const { user } = useAuth()
  const nav = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 bg-[#0b0e13]/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="font-bold">FuturePlanner</span>
          <span className="text-xs text-slate-400 hidden sm:inline">5-year goal + budget · LKR · private</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-slate-400 truncate max-w-[180px]">{user?.email}</span>
            <button className="btn-ghost" onClick={async () => { await supabase.auth.signOut(); nav('/login') }}>Sign out</button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 flex-wrap">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm border ${isActive ? 'bg-white text-black border-white' : 'border-white/15 text-slate-300 hover:bg-white/10'}`}>{label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6"><Outlet /></main>
    </div>
  )
}
