import { animate, stagger, createTimeline, remove } from 'animejs'

/** False when the user prefers reduced motion — all helpers become instant no-ops. */
export function motionOK(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Cleanup = () => void
function safeRevert(a: { revert?: () => void; cancel?: () => void }): Cleanup {
  return () => {
    try {
      if (typeof a.revert === 'function') a.revert()
      else if (typeof a.cancel === 'function') a.cancel()
    } catch {
      /* already torn down */
    }
  }
}

/**
 * Page entrance timeline: [data-anim="header"] first, then [data-anim="card"] staggered.
 * Call inside useLayoutEffect (runs before paint, so no flash).
 */
export function pageEnter(root: HTMLElement | null): Cleanup {
  if (!root || !motionOK()) return () => {}
  const tl = createTimeline({ defaults: { ease: 'outExpo' } })
  tl.add('[data-anim="header"]', { y: [14, 0], opacity: [0, 1], duration: 450 })
  tl.add('[data-anim="card"]', { y: [18, 0], opacity: [0, 1], duration: 600, delay: stagger(60) }, '-=300')
  return safeRevert(tl)
}

/**
 * Staggered reveal for list rows/cards matching selector inside container.
 */
export function revealList(container: HTMLElement | null, selector = '[data-anim="item"]'): Cleanup {
  if (!container || !motionOK()) return () => {}
  const items = container.querySelectorAll(selector)
  if (items.length === 0) return () => {}
  const a = animate(items, { y: [16, 0], opacity: [0, 1], duration: 520, delay: stagger(45), ease: 'outExpo' })
  return safeRevert(a)
}

/**
 * Tween a number into a DOM node with a formatter (e.g. lkr). Starts from the
 * node's last value so updates glide instead of restarting from zero.
 */
export function countUp(node: HTMLElement | null, to: number, format: (n: number) => string, duration = 900): Cleanup {
  if (!node) return () => {}
  const prev = Number((node as HTMLElement & { _v?: number })._v ?? 0)
  if (!motionOK() || !Number.isFinite(to)) {
    node.textContent = format(to)
    ;(node as HTMLElement & { _v?: number })._v = to
    return () => {}
  }
  const obj = { v: prev }
  const a = animate(obj, {
    v: to,
    duration,
    ease: 'outExpo',
    onUpdate: () => {
      node.textContent = format(obj.v)
    },
  })
  ;(node as HTMLElement & { _v?: number })._v = to
  return () => {
    try {
      a.cancel()
    } catch {
      /* noop */
    }
  }
}

/** Animate a bar (transform-origin left) to a 0–100 fill. */
export function fillBar(node: HTMLElement | null, pct: number, duration = 700): Cleanup {
  if (!node) return () => {}
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)) / 100
  if (!motionOK()) {
    node.style.transform = `scaleX(${p})`
    return () => {}
  }
  const a = animate(node, { scaleX: [Number((node as HTMLElement & { _p?: number })._p ?? 0), p], duration, ease: 'outCubic' })
  ;(node as HTMLElement & { _p?: number })._p = p
  return () => {
    try {
      a.cancel()
    } catch {
      /* noop */
    }
  }
}

/** Small celebratory pop for status dots / timeline nodes. */
export function popNode(node: HTMLElement | null, duration = 380): Cleanup {
  if (!node || !motionOK()) return () => {}
  const a = animate(node, { scale: [0.55, 1], opacity: [0.4, 1], duration, ease: 'outBack' })
  return safeRevert(a)
}

/** Draw a vertical timeline rail top→bottom. */
export function drawRail(node: HTMLElement | null, duration = 800): Cleanup {
  if (!node || !motionOK()) return () => {}
  const a = animate(node, { scaleY: [0, 1], opacity: [0.3, 1], duration, ease: 'inOutQuad' })
  return safeRevert(a)
}

/** Stop all animations under a root (route teardown safety net). */
export function clearMotion(root: HTMLElement | null) {
  if (!root) return
  try {
    remove(root.querySelectorAll('[data-anim]'))
  } catch {
    /* noop */
  }
}
