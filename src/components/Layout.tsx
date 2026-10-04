import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLayoutEffect, useRef } from 'react'
import { animate } from 'animejs'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { motionOK } from '../lib/motion'
import { QuickAddFab } from './QuickAdd'

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

const MOBILE_TABS = ['/', '/transactions', '/goals', '/plan']

function ActivePill({ pathname }: { pathname: string }) {
  const wrapRef = useRef<HTMLElement | null>(null)
  const barRef = useRef<HTMLSpanElement | null>(null)
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const bar = barRef.current
    if (!wrap || !bar) return
    const place = () => {
      const active = wrap.querySelector('[data-active="true"]') as HTMLElement | null
      if (!active) {
        bar.style.opacity = '0'
        return
      }
      bar.style.opacity = '1'
      const left = active.offsetLeft
      const width = active.offsetWidth
      if (motionOK()) {
        animate(bar, { left, width, duration: 380, ease: 'outExpo' })
      } else {
        bar.style.left = `${left}px`
        bar.style.width = `${width}px`
      }
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [pathname])
  return (
    <nav ref={wrapRef} aria-label="Primary" className="max-w-6xl mx-auto px-4 pb-3 hidden md:flex gap-1 flex-wrap relative">
      <span
        ref={barRef}
        aria-hidden="true"
        className="absolute top-0 h-[34px] rounded-lg bg-white transition-none"
        style={{ left: 0, width: 0, opacity: 0 }}
      />
      {links.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          data-active={pathname === to || (to !== '/' && pathname.startsWith(to)) ? 'true' : 'false'}
          className={({ isActive }) =>
            `relative z-10 px-3 py-1.5 rounded-lg text-sm transition-colors ${isActive ? 'text-black font-medium' : 'text-slate-300 hover:text-white'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function MobileTabs({ pathname }: { pathname: string }) {
  const tabs = links.filter(([to]) => MOBILE_TABS.includes(to))
  return (
    <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0b0e13]/95 backdrop-blur">
      <div className="grid grid-cols-4">
        {tabs.map(([to, label]) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? 'text-white font-semibold' : 'text-slate-500'}`}
            >
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-white/20'}`} />
              {label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="border-b border-white/10 sticky top-0 bg-[#0b0e13]/85 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="font-display font-bold tracking-tight text-[15px]">
            <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">FuturePlanner</span>
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">5-year goal + budget · LKR · private</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-slate-400 truncate max-w-[180px] hidden sm:inline">{user?.email}</span>
            <button className="btn-ghost !py-1.5 text-sm" onClick={async () => { await supabase.auth.signOut(); nav('/login') }}>Sign out</button>
          </div>
        </div>
        <ActivePill pathname={loc.pathname} />
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <MobileTabs pathname={loc.pathname} />
      <QuickAddFab />
    </div>
  )
}
