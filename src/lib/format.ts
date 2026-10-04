export function lkr(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'Rs. —'
  const v = Number(n)
  return 'Rs. ' + v.toLocaleString('en-LK', { maximumFractionDigits: 0 })
}

/** Compact for small tiles: Rs. 1.2M / Rs. 345K. Full value goes in title attr. */
export function lkrShort(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'Rs. —'
  const v = Number(n)
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `Rs. ${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `Rs. ${(v / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`
  return lkr(v)
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return d.slice(0, 10)
}

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
