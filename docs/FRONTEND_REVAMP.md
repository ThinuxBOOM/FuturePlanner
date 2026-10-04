# Frontend Revamp — Draft for Review

Locked direction: **refined dark + expressive motion**, anime-js. Existing user data untouched (no changes to the 12 data tables; revamp is presentation + new roadmap tables only).

## 1. Problems with the current look

* Flat single-tone cards (`#131822` everywhere), no depth or hierarchy — every page looks the same.
* One type scale, weak section headers; numbers (the point of a budget app) get no emphasis.
* No transitions: route changes snap, lists pop in, progress bars jump, status toggles blink.
* Nav is a row of static pills; active state is binary with no motion.
* Track colors exist in data (`tracks.color`) but are never used visually.
* Login and empty states are bare.

## 2. Design tokens (elevated dark, `index.css` + `tailwind.config.js`)

* Background: layered `#0b0e13` base with subtle radial glow per page header; cards `#131822` → gradient `#151b28→#11151f` with 1px `white/10` border + soft shadow; hovered cards lift (`translateY(-2px)`, border `white/20`).
* Accent: keep white primary buttons; add per-track accent colors (education blue, content pink, CSE violet, Onemarket green, infra amber — from your seeded `tracks.color`) used as chips, dots, progress fills, and roadmap rail nodes.
* Type: display numbers in tabular, larger stat size (`text-2xl font-bold tracking-tight`); section titles `text-lg font-bold` with small muted eyebrow labels above.
* Radius/spacing: `rounded-2xl` cards, consistent `gap-4` grids, page header block (title + subtitle + key action) on every page.

## 3. Motion system (`src/lib/motion.ts`, animejs npm)

Single wrapper so motion stays consistent and safe:
* `pageEnter(root)` — timeline: header fades/slides first, then cards stagger in (`anime.stagger(60, {from:'first'})`, `easeOutExpo`, ~700ms total).
* `revealList(items)` — staggered fade + `translateY(14px→0)` for goals, transactions, budget rows, roadmap items.
* `countUp(node, value, formatter)` — Dashboard money stats tween from 0 (or previous) with `easeOutExpo`; formats via existing `lkr()`.
* `fillBar(node, pct)` — progress `scaleX`/`width` with `easeOutCubic`; used for goals, budgets, stage progress, fund bars.
* `popNode(node)` — roadmap node / status-dot scale bounce (`easeOutBack`) on status change.
* Global guards: `prefers-reduced-motion` disables everything (instant final state); `anime.remove()` cleanup on unmount/route change; StrictMode-safe ref guards so double-effects never double-animate.
* Constraints: transform/opacity only (no layout thrash), total entrance under ~800ms, daily-entry forms never wait on animation.

## 4. Shared components (`src/components/ui.tsx`)

`PageHeader, Card, Stat (animated number), ProgressBar (animated), StatusDot, TrackChip, EmptyState, SegmentedControl, Skeleton`. Every page rebuilt on these — this is what makes the app look designed instead of assembled.

## 5. Per-page revamp

* **Layout/nav**: sticky glass header, animated active pill (slides between tabs via layout-measured tween), user chip, page container with `pageEnter` on every route.
* **Dashboard (flagship #2)**: count-up stat cards (month income/expense/saved+rate/runway), animated fund bars (infra/emergency with guardrail coloring), account list with mini-bars, goal progress fills, infra next-up with trigger text, recent transactions stagger in.
* **Plan roadmap (flagship #1)**: vertical timeline rail that draws itself (`scaleY` stagger), stage nodes pop per status, per-stage animated progress, item cards with status cycler micro-animation, blocked badges from dependency edges, track filter chips, search; "→ goal" conversion keeps its link visible.
* **Transactions**: quick-add card promoted to hero with segmented income/expense/transfer control; rows reveal with stagger; delete confirmed inline; LKR amounts tabular.
* **Budgets**: planned-vs-actual dual bars animate per row; month switcher re-triggers fills; over-budget rows glow red subtly.
* **Goals/GoalDetail**: card grid stagger, progress fills, milestone checkboxes with pop animation, linked-transaction totals count up.
* **Infrastructure**: order board with status-driven node colors, est-range bars, purchased confetti-free (tasteful check morph).
* **Review/Settings/Login**: same tokens/components; login gets gradient backdrop + animated entrance; settings keeps dense but consistent.

## 6. Data-safety rules (your saved data)

* No migration touches the existing 12 tables — revamp PRs are `src/` + `index.css` + `tailwind.config.js` only (plus the already-planned additive `0002` roadmap tables, created empty, seeded only for empty states).
* No query logic changes to amounts/balances; Dashboard math stays identical, only presentation animates.
* Verification per phase: `tsc -b`, `vite build`, `wrangler deploy --dry-run`, bundle-size check (animejs ≈17KB gzip), anon RLS check still `[]`, and Management-API row counts on all 12 tables identical before/after.

## 7. Build order + acceptance

1. Tokens + `motion.ts` + `ui.tsx` (audit: build + dry-run + reduced-motion check)
2. Layout/nav + Login + Dashboard (audit: same + animation timing review)
3. Roadmap Plan + Goals (audit: same + dependency/edge rendering check)
4. Transactions/Budgets/Infra/Review/Settings (audit: same + full pass)
5. Final: production build, dry-run, data row-count proof, deploy

Acceptance: app looks and feels redesigned on every route, all existing data intact and identical, no new console errors, build green, dry-run clean.

## Open for your review

* Anything in §5 you'd cut or add?
* Dashboard stat set — keep (income/expense/saved+rate/runway) or swap any?
* OK to proceed to implementation in the §7 order?
