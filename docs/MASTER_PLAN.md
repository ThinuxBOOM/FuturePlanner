# Master Plan — 5-Year Reference (Stages 0–6)

> Source for in-app `/plan` page. Private reference, editable in app via goals — this file is the canonical text.

## North-star tracks
- Education — degree priority, economics/politics/stats credibility
- Content — audience/distribution, commentary/podcasts/gameplay/long-form
- Personal CSE research — private only, no public signals/advice/managing money
- Onemarket — global research-and-analysis SaaS, research tools only, not advice
- Company infrastructure — internal AI/product/content/storage, acquired gradually

Operating principles: CSE analyzer private; Onemarket = analytics/screening/backtesting/decision-support (never signals/guaranteed returns/buy-sell); content is distribution; one role per system; buy after proof; never fund essentials from trading profits.

## Stage 0 — A/L completion
University pathway first. Portfolio site. Onemarket minimal local (dashboard, watchlists, screeners, viz, rule flags, backtesting with costs). Private CSE analyzer + trade journal (thesis, model version, entry/SL/exit/size, risk, outcome). Living/emergency/trading buckets + loss caps. Content identity + 30–50 topic bank + repeatable stream template (opening, 3 topics with context/evidence/counter/view, discussion) => VOD + 8–20min videos each with chapters/thumbnail/citations. Finance: monthly budget + infrastructure fund, no debt/emergency/education money for hardware. Track savings rate, income, expenses, CSE capital, emergency, infra fund.

## Stage 1 — Uni Year 1
Academics + societies + 1 leadership. Content 1–3 streams/week (3+ topics), long-form uploads, Discord with rules from day 1, hire editors/mods/tech via paid trials. Metrics: streams, uploads, watch time/retention, returning, subs, Discord, collaborators. Onemarket private alpha 10–30 users: watchlists/dashboards, screening, backtesting, reports with sources, saved workspaces. Disclaimer: educational/informational only, no advice/recommendations/guarantees. Legal/tax before charging. Infra phase 1 only if needed: SSD, encrypted backup, domain/VPS/GitHub/email/password-manager/MFA, stream gear. No T150/NAS/AI laptop. Fund toward workstation.

## Stage 2 — Uni Year 2
Onemarket public beta: signups, activation, WAU/MAU, adoption, support, free→paid, churn, MRR. Tiers Free/Researcher/Pro. Methodology pages (sources, frequency, backtest method, slippage, limits, AI limits). Infra phase 2 workstation: Ryzen 7, 32GB (64 pref), 5060-class, 1–2TB NVMe, quality PSU+UPS, 27" (2nd later). Rs. 550k–780k. Roles: dashboards, dev/test, staging, editing, research/admin, operator console. Phase 3 first AI node + net (only on real need): LOQ 15AHP10 RTX 5050 8GB, 16-port managed switch with VLANs (mgmt/business/content/personal/guest), 10–12 Cat6, UPS for net+node. Ollama/LM Studio quantized for internal research/coding/transcripts/briefs — not customer advice.

## Stage 3 — Uni Years 3–4
Core team from output (you/product, editor, mod/community, tech, research/ops) with written agreements (roles/pay/IP/confidentiality/access/termination). Recurring shows (geo-econ briefing, policy-tech, debate/interview, methodology, community gaming). Keep product promo separate from politics. Owned channels: site/email/Discord. Finance: trading private, separate trading/company/tax/emergency/personal, build runway. Infra phase 4 Content T150 when justified: 32GB ECC (64 on proof), 2x1TB SSD RAID1 OS/scratch, 2x8TB NAS RAID1 archive, 1.5–2kVA UPS, SMB/NFS, Docker FFmpeg/transcripts/assets/cron. Rs. 1.05M–1.35M.

## Stage 4 — Year 1 post-uni
Home base budgeting (power/water/net/food/maint/insurance/tax/repairs). Lower-floor rent as separate documented stream (legal/tax/insurance first). Solar reduces own use first, export second with written quote. Household ≠ company. Income stack: part-time baseline, Onemarket subs (scalable), content (supplemental), trading (high-risk personal, not core), rent (fixed costs), solar savings later. Infra phase 5 Business T150 on traction: 32GB ECC min (64 pref), 2x1TB SSD RAID1 (OS/Docker/PG/data), 2x4TB RAID1 datasets/staging, UPS, Docker (proxy, frontend, API, PG, Redis, workers, monitoring, backups, docs). Rs. 980k–1.25M. Keep prod on VPS until power/net/security/recovery proven. Security baseline before user data/payments: password manager+MFA, separate accounts, Tailscale/WireGuard, no public PG/Docker/NAS/AI/dashboards, patching/backup alerts/restore tests/logs/least-priv, secrets vault.

## Stage 5 — Year 2 post-uni
Phase 6 DS923+ backup/archive (not app server): DS923+, 16GB ECC if heavy, 4x8TB SHR ~24TB, NAS UPS, encrypted offsite. Nightly T150 backups, DB dumps, code/docs versioned, content archive, workstation backups, snapshots vs ransomware. Rs. 480k–715k. Phase 7 second LOQ only on sustained queue: Company LOQ (code/research/classify/analytics) vs Content LOQ (briefs/transcripts/metadata). NV PAIR for concurrency, not shared VRAM. Rs. 340k–405k.

## Stage 6 — Full operating state
Workstation (dash/dev/edit/monitor) + Business T150 (staging/services/DB/workers) + Content T150 (ingest/edit/automation) + DS923+ (backup/archive/snapshots/offsite) + LOQ1 (company AI) + LOQ2 (content AI) + 16-port VLAN switch.

## Acquisition order + budgets
1. Low-cost/backup/domain/VPS/gear — begin — Rs. 0–250k
2. Workstation — bottleneck — Rs. 550k–780k
3. Switch/cabling/UPS/LOQ1 — regular local AI — Rs. 450k–600k
4. Content T150 — storage need — Rs. 1.05M–1.35M
5. Business T150 — traction/separation — Rs. 980k–1.25M
6. DS923+/drives/UPS — valuable data — Rs. 480k–715k
7. Second LOQ — concurrency — Rs. 340k–405k
8. 2.5/10GbE/RAM/GPU — measured bottleneck — revenue-funded
Total ~Rs. 4.3M, ceiling Rs. 4.8–5.0M.

## Transition rule (full-time)
3 consecutive months: product+content covers essentials+ops+tax+debt; several months reserves personal+business; diversified recurring (no single customer/video/platform/streak); backups/monitoring/payments/support/publishing documented; monthly profit after reinvestment; outage/power/failure/compromise/demonetisation/loss playbooks defined.

## Monthly dashboard
Education (grades/progress/skills), Content (streams/videos/watch/retention/returning/email/Discord), Onemarket (active/conv/churn/MRR/support/uptime), CSE private (adherence/drawdown/risk/journal — no public claims), Finance (runway/emergency/infra/tax/margin), Infra (uptime/disk/backup/restore/capacity/temp/power), Team (output/turnaround/quality/access/retention/issues).

## Guardrails
Competence over alignment in hiring; no public recommendations via content/product/private system; buy on validated cash, not projections; never combine business/content/personal/trading; no single copy; no exposed private services; measure before scaling hardware.
