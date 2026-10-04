import { useLayoutEffect, useRef, useState } from 'react'
import TransactionForm from './TransactionForm'
import { motionOK } from '../lib/motion'
import { animate } from 'animejs'

/** Floating quick-add: FAB (mobile) opening a bottom sheet with the entry form. */
export function QuickAddFab() {
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!open || !sheetRef.current || !motionOK()) return
    animate(sheetRef.current, { y: ['100%', '0%'], duration: 380, ease: 'outExpo' })
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open ])

  function close() {
    const el = sheetRef.current
    if (el && motionOK()) {
      animate(el, { y: ['0%', '100%'], duration: 280, ease: 'inQuad', onComplete: () => setOpen(false) })
    } else {
      setOpen(false)
    }
  }

  return (
    <>
      <button
        aria-label="Quick add transaction"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-white text-black text-2xl font-bold shadow-2xl active:scale-95 transition-transform"
      >
        +
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Quick add transaction">
          <div className="absolute inset-0 bg-black/70" onClick={close} />
          <div ref={sheetRef} className="absolute bottom-0 inset-x-0 rounded-t-3xl border-t border-white/15 bg-[#131822] p-4 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
            <div className="flex items-center mb-3">
              <h2 className="font-bold">Quick add</h2>
              <button aria-label="Close" className="ml-auto btn-ghost !py-1" onClick={close}>✕</button>
            </div>
            <TransactionForm autofocus onSaved={() => close()} />
          </div>
        </div>
      )}
    </>
  )
}
