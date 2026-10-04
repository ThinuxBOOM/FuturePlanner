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

function scoped(root: HTMLElement | null, sel: string): Element[] {
  if (!root) return []
  return Array.from(root.querySelectorAll(`:scope ${sel}`))
}

/**
 * Page entrance timeline, scoped to root: [data-anim="header"] first, then
 * [data-anim="card"] staggered. Call once data is ready (see useReadyEnter),
 * otherwise it plays on skeletons and real cards mount un-animated.
 */
export function pageEnter(root: HTMLElement | null): Cleanup {
  if (!root || !motionOK()) return () => {}
  const header = scoped(root, '[data-anim="header"]')
  const cards = scoped(root, '[data-anim="card"]')
  if (header.length === 0 && cards.length === 0) return () => {}
  const tl = createTimeline({ defaults: { ease: 'outExpo' } })
  if (header.length > 0) tl.add(header, { y: [14, 0], opacity: [0, 1], duration: 450 })
  if (cards.length > 0) tl.add(cards, { y: [18, 0], opacity: [0, 1], duration: 600, delay: stagger(60) }, header.length > 0 ? '-=300' : '+=0')
  return safeRevert(tl)
}

/**
 * Staggered reveal for list rows/cards matching selector inside container.
 * Call when the list data is ready or when a section expands.
 */
export function revealList(container: HTMLElement | null, selector = '[data-anim="item"]'): Cleanup {
  if (!container || !motionOK()) return () => {}
  const items = Array.from(container.querySelectorAll(selector))
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

/** Draw an SVG line/path by animating stroke-dashoffset. */
export function drawLine(node: SVGGeometryElement | null, duration = 1100): Cleanup {
  if (!node) return () => {}
  try {
    const len = node.getTotalLength()
    if (!motionOK()) {
      node.style.strokeDasharray = 'none'
      return () => {}
    }
    node.style.strokeDasharray = `${len}`
    node.style.strokeDashoffset = `${len}`
    const a = animate(node, { strokeDashoffset: [len, 0], duration, ease: 'outExpo' })
    return safeRevert(a)
  } catch {
    return () => {}
  }
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
