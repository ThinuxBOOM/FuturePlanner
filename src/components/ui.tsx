import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { countUp, fillBar, pageEnter, clearMotion } from '../lib/motion'

/** Wrap a page root to run the entrance timeline once on mount. */
export function usePageEnter<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useLayoutEffect(() => pageEnter(ref.current), [])
  return ref
}

/**
 * Run the entrance timeline when data is ready, not on mount — otherwise the
 * stagger plays on skeletons and real cards mount un-animated.
 */
export function useReadyEnter<T extends HTMLElement>(ready: boolean) {
  const ref = useRef<T | null>(null)
  const fired = useRef(false)
  useLayoutEffect(() => {
    if (!ready || fired.current) return
    fired.current = true
    const cleanup = pageEnter(ref.current)
    return () => {
      cleanup()
      clearMotion(ref.current)
    }
  }, [ready])
  return ref
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div data-anim="header" className="flex flex-wrap items-end gap-3 mb-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div data-anim="card" className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>
}

/** Animated number stat. */
export function Stat({ label, value, format, tone }: { label: string; value: number; format: (n: number) => string; tone?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => countUp(ref.current, value, format), [value])
  return (
    <div>
      <div className="label">{label}</div>
      <div ref={ref} className={`stat-num ${tone ?? ''}`}>{format(value)}</div>
    </div>
  )
}

/** Animated fill bar (0–100). */
export function ProgressBar({ pct, color = 'bg-emerald-400', className = '', label }: { pct: number; color?: string; className?: string; label?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const v = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))
  useLayoutEffect(() => fillBar(ref.current, pct), [pct])
  return (
    <div className={`bar ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label ?? 'progress'}>
      <div ref={ref} className={color} />
    </div>
  )
}

export function StatusDot({ status, color }: { status: string; color?: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-400', doing: 'bg-sky-400', done: 'bg-emerald-400', purchased: 'bg-emerald-400',
    paused: 'bg-amber-300', blocked: 'bg-red-400', todo: 'bg-slate-500', skipped: 'bg-slate-600',
    saving: 'bg-sky-400', ready: 'bg-violet-400', planned: 'bg-slate-500', deferred: 'bg-slate-600',
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
      <span className={`dot ${color ?? map[status] ?? 'bg-slate-500'}`} />
      {status}
    </span>
  )
}

export function TrackChip({ name, color }: { name: string; color?: string | null }) {
  return (
    <span className="chip">
      <span className="dot" style={{ background: color ?? '#64748b' }} />
      {name}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-white/15 p-0.5 bg-black/30">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${value === o.value ? 'bg-white text-black font-medium' : 'text-slate-300 hover:bg-white/10'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}
