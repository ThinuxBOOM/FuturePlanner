import { supabase } from './supabase'

export interface SeedItem {
  key: string
  stage: string // stages.key
  track: string | null // tracks.name
  title: string
  detail: string
  accept: string
  priority: 'p1' | 'p2' | 'p3'
  effort: 'S' | 'M' | 'L'
  infraOrder?: number // link to infrastructure_items.order_n
  blockedBy?: string[] // source keys
}

// ~46 items distilled from docs/MASTER_PLAN.md. Fully editable once seeded.
export const PLAN_SEEDS: SeedItem[] = [
  // ---- Stage 0 ----
  { key: 's0-ial', stage: 'stage-0', track: 'Education', title: 'IAL finals first — secure the university pathway', detail: 'Final-year performance is the top priority; everything else fits around study.', accept: 'Exams complete with grades supporting PPE/Econ/Stats shortlist', priority: 'p1', effort: 'L' },
  { key: 's0-unilist', stage: 'stage-0', track: 'Education', title: 'University shortlist + cost comparison', detail: 'Compare tuition, scholarships, living costs, course structure, internships, societies, study/work balance.', accept: 'Shortlist doc with costs and decision filed', priority: 'p1', effort: 'M' },
  { key: 's0-portfolio', stage: 'stage-0', track: 'Education', title: 'Portfolio site (LinkedIn, GitHub, debating, Onemarket work)', detail: 'Single site linking profiles, projects, speaking experience.', accept: 'Live URL linked from all profiles', priority: 'p2', effort: 'M' },
  { key: 's0-om-local', stage: 'stage-0', track: 'Onemarket', title: 'Onemarket minimal local build', detail: 'Dashboard, watchlists, basic screeners, historical viz, rule-based flags, backtesting with disclosed costs. Clean git + docs from day one.', accept: 'Runs locally with versioned releases', priority: 'p1', effort: 'L' },
  { key: 's0-cse-journal', stage: 'stage-0', track: 'Personal CSE research', title: 'Private trade journal system', detail: 'Thesis+data, model version, entry/SL/exit/size, max risk, outcome + lesson per trade. Living/emergency/trading buckets + per-trade, daily, monthly caps and pause rule.', accept: 'Journal template in use; caps written down', priority: 'p1', effort: 'M' },
  { key: 's0-content-id', stage: 'stage-0', track: 'Content', title: 'Content identity + 30–50 topic bank', detail: 'Stable name, visual identity, voice across YouTube/Kick/Rumble/Twitch/Discord/socials. Bank topics: commentary, economics, tech, global affairs, uni life.', accept: 'Identity live everywhere; bank has 30+ topics', priority: 'p2', effort: 'M' },
  { key: 's0-stream-template', stage: 'stage-0', track: 'Content', title: 'Repeatable stream template + long-form pipeline', detail: 'Opening/agenda, 3 topics (context/evidence/counter/view), discussion. Each stream → VOD + 8–20min video per topic with chapters, titles, thumbnails, citations.', accept: 'Template doc + first full cycle published', priority: 'p2', effort: 'M', blockedBy: ['s0-content-id'] },
  { key: 's0-budget', stage: 'stage-0', track: 'Company infrastructure', title: 'Monthly budget + infrastructure fund (this app)', detail: 'Track income, expenses, savings rate, CSE capital, emergency and infra funds. No debt/emergency/education money for hardware.', accept: 'First full month tracked here', priority: 'p1', effort: 'S' },
  { key: 's0-emergency', stage: 'stage-0', track: null, title: 'Emergency fund to 1 month, then grow', detail: 'Separate bucket, never touched for hardware or trading. Grow toward 3–6 months across stages.', accept: '1 month of essentials parked', priority: 'p1', effort: 'S' },
  // ---- Stage 1 ----
  { key: 's1-grades', stage: 'stage-1', track: 'Education', title: 'Nail core modules + one leadership role', detail: 'Econ, politics, philosophy, stats, research methods, programming, data literacy. Societies: debating, MUN, finance, computing, entrepreneurship, media.', accept: 'Strong Year-1 results + 1 leadership role', priority: 'p1', effort: 'L' },
  { key: 's1-streams', stage: 'stage-1', track: 'Content', title: '1–3 streams/week with 3+ planned topics', detail: 'Sustainable cadence over volume; every stream yields topic videos.', accept: '8+ consecutive weeks at cadence', priority: 'p1', effort: 'L', blockedBy: ['s0-stream-template'] },
  { key: 's1-discord', stage: 'stage-1', track: 'Content', title: 'Discord with rules + paid-trial hires', detail: 'Mod rules, channels, escalation from day one. Editors/mods/tech via test tasks.', accept: 'Server live with 1 editor or mod hired', priority: 'p2', effort: 'M' },
  { key: 's1-om-alpha', stage: 'stage-1', track: 'Onemarket', title: 'Onemarket private alpha (10–30 users)', detail: 'Watchlists, dashboards, screening, backtesting, sourced reports, saved workspaces. Research-only wording, no recommendations/returns language.', accept: '10+ testers active with feedback log', priority: 'p1', effort: 'L', blockedBy: ['s0-om-local'] },
  { key: 's1-legal', stage: 'stage-1', track: 'Onemarket', title: 'Legal + tax advice before charging', detail: 'Consult professionals on cross-jurisdiction marketing and charging; disclaimers communicate limits only.', accept: 'Written advice filed before first paid user', priority: 'p1', effort: 'S' },
  { key: 's1-infra1', stage: 'stage-1', track: 'Company infrastructure', title: 'Phase 1 essentials (only if needed)', detail: 'SSD, encrypted backup, domain/VPS/GitHub/email/password manager/MFA, stream gear. No T150/NAS/AI laptop.', accept: 'Backup + domain + MFA live', priority: 'p2', effort: 'S', infraOrder: 1 },
  { key: 's1-method', stage: 'stage-1', track: 'Onemarket', title: 'Backtesting methodology notes', detail: 'Write down data sources, update frequency, cost/slippage assumptions, known limits before anyone trusts a backtest.', accept: 'Methodology note versioned in repo', priority: 'p2', effort: 'S', blockedBy: ['s0-om-local'] },
  // ---- Stage 2 ----
  { key: 's2-beta', stage: 'stage-2', track: 'Onemarket', title: 'Controlled public beta + metrics', detail: 'Signups, activation, WAU/MAU, adoption, support, free→paid, churn, MRR. Free/Researcher/Pro tiers. Methodology pages (sources, frequency, costs, limits).', accept: 'Public beta live with metrics dashboard', priority: 'p1', effort: 'L', blockedBy: ['s1-om-alpha', 's1-legal'] },
  { key: 's2-workstation', stage: 'stage-2', track: 'Company infrastructure', title: 'Main workstation (Rs. 550k–780k)', detail: 'Ryzen 7, 32GB (64 pref), 5060-class, 1–2TB NVMe, quality PSU+UPS, 27in. Trigger: laptop bottlenecks workflow.', accept: 'Machine live as daily operator console', priority: 'p1', effort: 'M', infraOrder: 2 },
  { key: 's2-ainode', stage: 'stage-2', track: 'Company infrastructure', title: 'First AI node + managed switch (Rs. 450k–600k)', detail: 'LOQ RTX 5050, 16-port smart switch with VLANs, Cat6, UPS. Ollama/LM Studio quantized for internal work only.', accept: 'Local model serving internal tasks', priority: 'p2', effort: 'M', infraOrder: 3, blockedBy: ['s2-workstation'] },
  { key: 's2-contentmetrics', stage: 'stage-2', track: 'Content', title: 'Reliable output engine', detail: 'Track streams, uploads, watch time, retention, returning viewers, subs, Discord, collaborators monthly.', accept: '3 months of metrics logged in Review', priority: 'p2', effort: 'S', blockedBy: ['s1-streams'] },
  { key: 's2-pricing', stage: 'stage-2', track: 'Onemarket', title: 'Pricing + methodology pages live', detail: 'Free/Researcher/Pro tiers with limits spelled out; methodology pages for sources, frequency, costs, AI limits.', accept: 'Pricing + methodology published', priority: 'p2', effort: 'S', blockedBy: ['s1-om-alpha'] },
  // ---- Stage 3 ----
  { key: 's3-shows', stage: 'stage-3', track: 'Content', title: 'Recurring shows, product promo kept separate', detail: 'Weekly briefing, policy/tech, debate/interview, methodology content, community sessions. Owned channels: site, email, Discord.', accept: '2+ recurring shows running 8 weeks', priority: 'p1', effort: 'L', blockedBy: ['s2-contentmetrics'] },
  { key: 's3-team', stage: 'stage-3', track: 'Content', title: 'Core team on written agreements', detail: 'Editor, mod/community lead, tech, research/ops. Roles, pay, IP, confidentiality, access, termination in writing before sharing anything.', accept: 'Agreements signed with 2+ collaborators', priority: 'p1', effort: 'M' },
  { key: 's3-runway', stage: 'stage-3', track: 'Company infrastructure', title: 'Cash runway before graduation', detail: 'Several months of personal + startup ops covered. Trading/company/tax/emergency/personal strictly separated.', accept: 'Runway target hit in Dashboard', priority: 'p1', effort: 'M' },
  { key: 's3-ct150', stage: 'stage-3', track: 'Company infrastructure', title: 'Content T150 (Rs. 1.05M–1.35M)', detail: '32GB ECC, 2x1TB SSD RAID1, 2x8TB RAID1, UPS, SMB/NFS, Docker automation. Only when VOD/editor workflow justifies it.', accept: 'Central content storage live + backing up', priority: 'p2', effort: 'M', infraOrder: 4 },
  { key: 's3-email', stage: 'stage-3', track: 'Content', title: 'Owned audience: email list', detail: 'Website + email capture so the audience survives any platform ban or algorithm change.', accept: 'List live with 500+ subscribers', priority: 'p2', effort: 'M' },
  { key: 's3-tax', stage: 'stage-3', track: null, title: 'Monthly tax reserve habit', detail: 'Skim a fixed cut of every income into Tax Reserve the day it lands.', accept: '3 consecutive months reserved on time', priority: 'p2', effort: 'S' },
  // ---- Stage 4 ----
  { key: 's4-homebase', stage: 'stage-4', track: 'Company infrastructure', title: 'Home-base economics separated', detail: 'Budget power/water/net/food/maint/insurance/tax/repairs. Rent as documented stream (legal/tax/insurance first). Solar reduces own use first.', accept: 'Household vs company books separated', priority: 'p1', effort: 'M' },
  { key: 's4-income', stage: 'stage-4', track: 'Onemarket', title: 'Income stack live', detail: 'Part-time baseline + subs + content + rent; trading stays personal high-risk, never core ops.', accept: '3 income streams documented 3 months', priority: 'p1', effort: 'M' },
  { key: 's4-bt150', stage: 'stage-4', track: 'Company infrastructure', title: 'Business T150 (Rs. 980k–1.25M)', detail: '32–64GB ECC, SSD RAID1 for PG/Docker, HDD RAID1 datasets, UPS. Prod stays on VPS until home uptime/security proven.', accept: 'Company systems off the workstation', priority: 'p1', effort: 'M', infraOrder: 5, blockedBy: ['s2-beta'] },
  { key: 's4-security', stage: 'stage-4', track: 'Company infrastructure', title: 'Security baseline before user data/payments', detail: 'Password manager+MFA everywhere, separate accounts, Tailscale/WireGuard admin, nothing private exposed, patching/backup alerts/restore tests/logs/least-privilege.', accept: 'Checklist complete + restore test passed', priority: 'p1', effort: 'M', blockedBy: ['s4-bt150'] },
  { key: 's4-runbooks', stage: 'stage-4', track: 'Company infrastructure', title: 'Ops runbooks documented', detail: 'Backups, monitoring, payments, support, publishing, and outage/power/failure playbooks written and tested.', accept: 'Runbooks exist and one drill passed', priority: 'p2', effort: 'M', blockedBy: ['s4-security'] },
  // ---- Stage 5 ----
  { key: 's5-nas', stage: 'stage-5', track: 'Company infrastructure', title: 'DS923+ backup core (Rs. 480k–715k)', detail: '4x8TB SHR ~24TB, snapshots, nightly T150 + DB dumps, offsite replication. Backup appliance, not app server.', accept: 'Nightly backups + snapshot recovery tested', priority: 'p1', effort: 'M', infraOrder: 6, blockedBy: ['s4-bt150', 's3-ct150'] },
  { key: 's5-loq2', stage: 'stage-5', track: 'Company infrastructure', title: 'Second LOQ (Rs. 340k–405k)', detail: 'Company vs content split, NV PAIR concurrency. Only when node-1 queues prove it.', accept: 'Sustained parallel inference in use', priority: 'p3', effort: 'M', infraOrder: 7, blockedBy: ['s2-ainode'] },
  // ---- Stage 6 ----
  { key: 's6-steady', stage: 'stage-6', track: 'Company infrastructure', title: 'Full operating state + transition rule', detail: 'All systems revenue-supported. Leave part-time only after 3 months of: income covers all costs, reserves held, diversified revenue, documented ops, monthly profit, outage/loss playbooks.', accept: 'Transition checklist all green 3 months', priority: 'p1', effort: 'L', blockedBy: ['s5-nas', 's4-income'] },
]

export async function ensurePlanSeeds() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const uid = user.id

  const { count } = await supabase.from('plan_items').select('id', { count: 'exact', head: true }).eq('user_id', uid)
  if ((count ?? 0) > 0) return // seeds already present — never touch user data

  const { data: stages } = await supabase.from('stages').select('id,key').eq('user_id', uid)
  const { data: tracks } = await supabase.from('tracks').select('id,name').eq('user_id', uid)
  const { data: infra } = await supabase.from('infrastructure_items').select('id,order_n').eq('user_id', uid)
  const stageByKey = new Map((stages ?? []).map(s => [s.key, s.id]))
  const trackByName = new Map((tracks ?? []).map(t => [t.name, t.id]))
  const infraByOrder = new Map((infra ?? []).map(i => [i.order_n, i.id]))

  const rows = PLAN_SEEDS.filter(s => stageByKey.has(s.stage)).map((s, i) => ({
    user_id: uid,
    stage_id: stageByKey.get(s.stage),
    track_id: s.track ? trackByName.get(s.track) ?? null : null,
    infra_item_id: s.infraOrder ? infraByOrder.get(s.infraOrder) ?? null : null,
    title: s.title,
    detail: s.detail,
    acceptance_criteria: s.accept,
    priority: s.priority,
    effort: s.effort,
    is_custom: false,
    source_key: s.key,
    sort: i,
  }))
  if (rows.length === 0) return
  const { data: inserted, error } = await supabase.from('plan_items').insert(rows).select('id,source_key')
  if (error || !inserted) return
  const idByKey = new Map(inserted.map(r => [r.source_key as string, r.id as string]))

  const links: { user_id: string; from_item_id: string; to_item_id: string }[] = []
  for (const s of PLAN_SEEDS) {
    const from = idByKey.get(s.key)
    for (const dep of s.blockedBy ?? []) {
      const to = idByKey.get(dep)
      if (from && to) links.push({ user_id: uid, from_item_id: from, to_item_id: to })
    }
  }
  if (links.length > 0) await supabase.from('plan_item_links').insert(links)
}
