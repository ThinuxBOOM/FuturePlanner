import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { animate } from 'animejs'
import { motionOK } from '../lib/motion'
import { useDelete, useInsert } from '../hooks/useData'

export interface ToastAction { label: string; onClick: () => void }
interface Toast { id: number; kind: 'ok' | 'err' | 'info'; text: string; action?: ToastAction }

const Ctx = createContext<{ notify: (text: string, kind?: Toast['kind'], action?: ToastAction) => void }>({
  notify: () => {},
})

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    setToasts(ts => ts.filter(x => x.id !== id))
  }, [])

  const notify = useCallback((text: string, kind: Toast['kind'] = 'info', action?: ToastAction) => {
    const id = nextId++
    setToasts(ts => [...ts.slice(-3), { id, kind, text, action }])
    timers.current.set(id, setTimeout(() => dismiss(id), action ? 7000 : 4500))
  }, [dismiss])

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(92vw,380px)]">
        {toasts.map(t => <ToastRow key={t.id} toast={t} onDone={() => dismiss(t.id)} />)}
      </div>
    </Ctx.Provider>
  )
}

function ToastRow({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (ref.current && motionOK()) {
      animate(ref.current, { y: [16, 0], opacity: [0, 1], duration: 350, ease: 'outExpo' })
    }
  }, [])
  return (
    <div
      ref={ref}
      role="status"
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-xl backdrop-blur ${
        toast.kind === 'err' ? 'border-red-400/40 bg-red-950/90 text-red-100' : toast.kind === 'ok' ? 'border-emerald-400/30 bg-[#101a16]/95 text-emerald-100' : 'border-white/15 bg-[#141a26]/95 text-slate-100'
      }`}
    >
      <span className="flex-1">{toast.text}</span>
      {toast.action && (
        <button className="underline font-medium whitespace-nowrap" onClick={() => { toast.action!.onClick(); onDone() }}>
          {toast.action.label}
        </button>
      )}
      <button aria-label="Dismiss notification" className="text-slate-400 hover:text-white" onClick={onDone}>✕</button>
    </div>
  )
}

export function useToast() {
  return useContext(Ctx)
}

/** Two-tap inline delete: first tap arms ("Sure?"), second confirms. No native dialogs. */
export function ConfirmButton({ onConfirm, label = 'Delete', className = '' }: { onConfirm: () => void; label?: string; className?: string }) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function click() {
    if (!armed) {
      setArmed(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setArmed(false), 4000)
      return
    }
    if (timer.current) clearTimeout(timer.current)
    setArmed(false)
    onConfirm()
  }
  return (
    <button
      aria-label={armed ? `Confirm ${label.toLowerCase()}` : label}
      onClick={click}
      className={`${armed ? '!border-red-400/60 !text-red-300' : 'text-slate-600 hover:text-red-300'} btn-ghost !py-1 text-xs transition-colors ${className}`}
    >
      {armed ? 'Sure?' : label}
    </button>
  )
}

/**
 * Delete with undo toast. Snapshot the full row first; undo re-inserts it with
 * the same id so links (goal links, milestones) survive.
 */
export function useUndoDelete(table: string) {
  const del = useDelete(table)
  const ins = useInsert(table)
  const { notify } = useToast()
  return useCallback((row: { id: string }, label: string) => {
    // Deep clone so the undo snapshot survives cache invalidation.
    const snapshot = JSON.parse(JSON.stringify(row)) as Record<string, unknown>
    del.mutate(row.id, {
      onSuccess: () => {
        notify(`${label} deleted`, 'info', {
          label: 'Undo',
          onClick: () => {
            ins.mutate(snapshot as Record<string, unknown>, {
              onSuccess: () => notify(`${label} restored`, 'ok'),
              onError: e => notify(e instanceof Error ? e.message : 'Restore failed', 'err'),
            })
          },
        })
      },
      onError: e => notify(e instanceof Error ? e.message : 'Delete failed', 'err'),
    })
  }, [del, ins, notify])
}
