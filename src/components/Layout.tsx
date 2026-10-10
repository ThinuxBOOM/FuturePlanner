import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, Server, Map,
  ClipboardList, Settings as SettingsIcon, LogOut, Sprout, CalendarClock, MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { QuickAddFab } from './QuickAdd'

const links = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/transactions', 'Transactions', ArrowLeftRight],
  ['/schedules', 'Schedules', CalendarClock],
  ['/budgets', 'Budgets', Wallet],
  ['/goals', 'Goals', Target],
  ['/infrastructure', 'Infra', Server],
  ['/plan', 'Plan', Map],
  ['/review', 'Review', ClipboardList],
  ['/settings', 'Settings', SettingsIcon],
] as const

const MOBILE_TABS = ['/', '/transactions', '/goals', '/plan'] as const

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/goals': 'Goals',
  '/infrastructure': 'Infrastructure',
  '/plan': 'Roadmap',
  '/review': 'Monthly review',
  '/settings': 'Settings',
}

function titleFor(pathname: string): string {
  if (pathname.startsWith('/goals/')) return 'Goal detail'
  return TITLES[pathname] ?? 'FuturePlanner'
}

function Sidebar({ pathname, email, onSignOut }: { pathname: string; email?: string; onSignOut: () => void }) {
  return (
    <aside className="hidden md:flex fixed top-0 bottom-0 left-0 w-[230px] flex-col bg-white border-r border-[#e3e7df] px-[18px] pt-[33px] pb-5 z-10">
      <div className="flex items-center gap-[10px] px-2 pb-[28px]">
        <span className="w-[39px] h-[43px] rounded-xl bg-[#37664d] text-white grid place-items-center -rotate-[5deg]">
          <Sprout size={22} />
        </span>
        <span>
          <span className="block text-[17px] font-semibold tracking-tight text-[#293b35]">FuturePlanner</span>
          <span className="block text-[8px] tracking-[0.18em] font-semibold text-[#a0aaa1] mt-[3px]">5-YEAR TRACKER · LKR</span>
        </span>
      </div>
      <div className="text-[9px] font-semibold tracking-[0.14em] text-[#a0aaa1] pl-[13px] mb-[14px]">MENU</div>
      <nav aria-label="Primary" className="grid gap-[7px]">
        {links.map(([to, label, Icon]) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-current={active ? 'page' : undefined}
              className={`side-link flex items-center gap-[13px] rounded-lg text-[13px] px-[15px] py-[12px] relative ${
                active ? 'bg-[#eaf1e8] text-[#356549] font-semibold' : 'text-[#7e8b82] hover:bg-[#f5f7f2]'
              }`}
            >
              {active && <span aria-hidden="true" className="absolute left-[-18px] top-[9px] bottom-[9px] w-[3px] rounded bg-[#528368]" />}
              <Icon size={17} />
              {label}
            </NavLink>
          )
        })}
      </nav>
      <div className="mt-auto pt-6">
        <div className="flex items-center gap-[10px] rounded-lg bg-[#f7f8f4] p-3 text-[12px] text-[#354a40]">
          <ShieldDot />
          <span>Private · single user<small className="block text-[9px] text-[#7d8b82] mt-[2px]">Supabase-backed</small></span>
        </div>
        <div className="flex items-center gap-[10px] mt-[16px] px-[5px] text-[11px] text-[#354a40]">
          <span aria-hidden="true" className="grid place-items-center w-[33px] h-[33px] rounded-full bg-[#e8dfcd] text-[#7e735d] font-display text-[17px]">
            {(email ?? 'F').charAt(0).toUpperCase()}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block truncate">{email}</span>
          </span>
          <button aria-label="Sign out" title="Sign out" className="text-[#7e8b82] hover:text-[#293b35]" onClick={onSignOut}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function ShieldDot() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#37664d" strokeWidth={2} aria-hidden="true">
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z" />
    </svg>
  )
}

function MobileTabs({ pathname }: { pathname: string }) {
  const [more, setMore] = useState(false)
  const tabs = links.filter(([to]) => (MOBILE_TABS as readonly string[]).includes(to))
  const rest = links.filter(([to]) => !(MOBILE_TABS as readonly string[]).includes(to))
  return (
    <>
      <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#e3e7df] bg-white/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {tabs.map(([to, label, Icon]) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to))
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? 'text-[#356549] font-semibold' : 'text-[#7e8b82]'}`}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            )
          })}
          <button
            aria-label="More sections"
            onClick={() => setMore(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${rest.some(([to]) => pathname === to || pathname.startsWith(to + '/')) ? 'text-[#356549] font-semibold' : 'text-[#7e8b82]'}`}
          >
            <MoreHorizontal size={19} />
            More
          </button>
        </div>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More sections">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMore(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-white p-4 pb-10">
            <div className="w-10 h-1 rounded-full bg-[#e2e7dd] mx-auto mb-3" />
            {rest.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMore(false)}
                className="flex items-center gap-3 px-2 py-3 text-[15px] text-[#293b35] border-b border-[#edf0e7] last:border-0"
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const signOut = async () => { await supabase.auth.signOut(); nav('/login') }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Sidebar pathname={loc.pathname} email={user?.email} onSignOut={signOut} />
      <div className="md:ml-[230px]">
        <header className="h-[64px] md:h-[75px] bg-[#fcfdf9] border-b border-[#e6eae2] flex items-center justify-between px-4 md:px-9 sticky top-0 z-10">
          <div className="flex items-center gap-2 md:hidden">
            <span className="w-7 h-8 rounded-lg bg-[#37664d] text-white grid place-items-center -rotate-[5deg]">
              <Sprout size={16} />
            </span>
            <span className="font-semibold text-[#293b35]">FuturePlanner</span>
          </div>
          <div className="hidden md:block text-[11px] text-[#7d8b82]">
            FuturePlanner <span className="mx-2 text-[#bcc4ba]">/</span> {titleFor(loc.pathname)}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-[6px] text-[10px] text-[#7c8b80]">
              <i className="w-[5px] h-[5px] rounded-full bg-[#6d9b77]" /> LKR · Private
            </span>
            <button className="btn-ghost !py-1.5 text-sm md:hidden" onClick={signOut}>Sign out</button>
          </div>
        </header>
        <main className="px-4 md:px-9 py-6 md:py-8 max-w-[1200px]">
          <Outlet />
        </main>
      </div>
      <MobileTabs pathname={loc.pathname} />
      <QuickAddFab />
    </div>
  )
}
