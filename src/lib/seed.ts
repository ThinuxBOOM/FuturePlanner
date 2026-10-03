import { supabase } from './supabase'

const TRACKS = [
  { name: 'Education', purpose: 'Degree priority, economics/politics/stats credibility', color: '#60a5fa', sort: 1 },
  { name: 'Content', purpose: 'Audience/distribution', color: '#f472b6', sort: 2 },
  { name: 'Personal CSE research', purpose: 'Private only — no public signals', color: '#a78bfa', sort: 3 },
  { name: 'Onemarket', purpose: 'Research SaaS, research tools only', color: '#34d399', sort: 4 },
  { name: 'Company infrastructure', purpose: 'Internal AI/product/content/storage', color: '#fbbf24', sort: 5 },
]

const STAGES = [
  { key: 'stage-0', title: 'Stage 0 — A/L completion', timing_text: 'Now until IAL finals', objective: 'Secure university pathway + low-cost foundations', sort: 0 },
  { key: 'stage-1', title: 'Stage 1 — University Year 1', timing_text: 'Year 1', objective: 'Academics + content engine + Onemarket prototype', sort: 1 },
  { key: 'stage-2', title: 'Stage 2 — University Year 2', timing_text: 'Year 2', objective: 'Public beta + first local AI', sort: 2 },
  { key: 'stage-3', title: 'Stage 3 — Uni Years 3–4', timing_text: 'Years 3-4', objective: 'Post-grad company model with evidence', sort: 3 },
  { key: 'stage-4', title: 'Stage 4 — Year 1 post-uni', timing_text: '+1y', objective: 'Home base + company + separation', sort: 4 },
  { key: 'stage-5', title: 'Stage 5 — Year 2 post-uni', timing_text: '+2y', objective: 'Backup/archival/AI capacity', sort: 5 },
  { key: 'stage-6', title: 'Stage 6 — Full operating state', timing_text: 'Steady state', objective: 'Stable revenue-supported home company', sort: 6 },
]

const ACCOUNTS = [
  { name: 'Cash', type: 'cash' },
  { name: 'Bank Main', type: 'bank' },
  { name: 'Emergency Fund', type: 'emergency' },
  { name: 'Infrastructure Fund', type: 'infra_fund' },
  { name: 'Tax Reserve', type: 'tax' },
  { name: 'Trading Capital', type: 'trading' },
  { name: 'Company Ops', type: 'company' },
  { name: 'Household', type: 'household' },
]

const CATS: { kind: 'income' | 'expense'; name: string }[] = [
  { kind: 'income', name: 'Part-time Job' },
  { kind: 'income', name: 'Onemarket' },
  { kind: 'income', name: 'Content' },
  { kind: 'income', name: 'Rent' },
  { kind: 'income', name: 'Trading Profit' },
  { kind: 'income', name: 'Other Income' },
  { kind: 'expense', name: 'Food' },
  { kind: 'expense', name: 'Transport' },
  { kind: 'expense', name: 'Housing' },
  { kind: 'expense', name: 'Utilities' },
  { kind: 'expense', name: 'Internet' },
  { kind: 'expense', name: 'Education' },
  { kind: 'expense', name: 'Health' },
  { kind: 'expense', name: 'Software / VPS / Domain' },
  { kind: 'expense', name: 'Content Gear' },
  { kind: 'expense', name: 'Infra Hardware' },
  { kind: 'expense', name: 'Trading Loss / Fees' },
  { kind: 'expense', name: 'Tax' },
  { kind: 'expense', name: 'Other' },
]

const INFRA = [
  { order_n: 1, name: 'Low-cost tools, backup, domain/VPS, content gear', spec_notes: 'External SSD, encrypted backup, domain/VPS/GitHub/email/password manager/MFA, basic stream gear', trigger_text: 'Begin building', est_min: 0, est_max: 250000 },
  { order_n: 2, name: 'Main workstation', spec_notes: 'Ryzen 7, 32GB (64 pref), RTX 5060-class, 1–2TB NVMe, quality PSU+UPS, 27in', trigger_text: 'Laptop becomes bottleneck', est_min: 550000, est_max: 780000 },
  { order_n: 3, name: 'Switch + cabling + UPS + first LOQ', spec_notes: 'LOQ 15AHP10 RTX 5050 8GB, 16-port managed switch VLANs, 10–12 Cat6, UPS', trigger_text: 'Regular local AI use', est_min: 450000, est_max: 600000 },
  { order_n: 4, name: 'Content T150', spec_notes: '32GB ECC (64 on proof), 2x1TB SSD RAID1, 2x8TB RAID1, 1.5–2kVA UPS, SMB/NFS, Docker', trigger_text: 'Content storage/automation need', est_min: 1050000, est_max: 1350000 },
  { order_n: 5, name: 'Business T150', spec_notes: '32–64GB ECC, 2x1TB SSD RAID1, 2x4TB RAID1, UPS, Docker PG/Redis/workers', trigger_text: 'Product traction + separation', est_min: 980000, est_max: 1250000 },
  { order_n: 6, name: 'Synology DS923+ + drives + NAS UPS', spec_notes: 'DS923+, 16GB ECC, 4x8TB SHR ~24TB, snapshots, offsite', trigger_text: 'Valuable data needs backup', est_min: 480000, est_max: 715000 },
  { order_n: 7, name: 'Second LOQ', spec_notes: 'Company vs content split, NV PAIR concurrency', trigger_text: 'Sustained AI concurrency', est_min: 340000, est_max: 405000 },
  { order_n: 8, name: '2.5/10GbE, RAM, storage, GPU', spec_notes: 'Measured bottleneck only', trigger_text: 'Monitoring shows bottleneck', est_min: null, est_max: null },
]

export async function ensureSeeds() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const uid = user.id

  const { count: tCount } = await supabase.from('tracks').select('id', { count: 'exact', head: true }).eq('user_id', uid)
  if ((tCount ?? 0) === 0) {
    await supabase.from('tracks').insert(TRACKS.map(t => ({ user_id: uid, ...t })))
  }
  const { count: sCount } = await supabase.from('stages').select('id', { count: 'exact', head: true }).eq('user_id', uid)
  if ((sCount ?? 0) === 0) {
    await supabase.from('stages').insert(STAGES.map(s => ({ user_id: uid, ...s })))
  }
  const { count: aCount } = await supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', uid)
  if ((aCount ?? 0) === 0) {
    await supabase.from('accounts').insert(ACCOUNTS.map(a => ({ user_id: uid, ...a, opening_balance: 0, currency: 'LKR' })))
  }
  const { count: cCount } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('user_id', uid)
  if ((cCount ?? 0) === 0) {
    await supabase.from('categories').insert(CATS.map(c => ({ user_id: uid, ...c })))
  }
  const { count: iCount } = await supabase.from('infrastructure_items').select('id', { count: 'exact', head: true }).eq('user_id', uid)
  if ((iCount ?? 0) === 0) {
    await supabase.from('infrastructure_items').insert(INFRA.map(i => ({ user_id: uid, ...i, status: 'planned' })))
  }
  await supabase.from('profiles').upsert({ id: uid, base_currency: 'LKR' }, { onConflict: 'id' })
}
