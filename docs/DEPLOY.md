# Deploy — Cloudflare Pages + Supabase

## Supabase (already provisioned)
- Project URL: `https://cyhclddeuwwzlthhansm.supabase.co`
- Auth: enable Email (magic link) in Dashboard → Authentication → Providers → Email → Enable + Confirm email OFF for personal use (or ON if you prefer).
- Auth redirect URLs: add your Pages domains, e.g.
  - `http://localhost:5173`
  - `https://futureplanner.pages.dev`
  - `https://your-custom-domain/*`
- DB: schema already applied (`supabase/migrations/0001_init.sql`, 12 tables + RLS). Seeds are per-user via app `ensureSeeds()` on first login — no global seed needed.
- Verify RLS: unauthenticated `GET /rest/v1/transactions?select=id&limit=1` with anon key returns `[]`.

## Cloudflare Worker with static assets (current setup)
1. Push this repo to GitHub (initial commit — repo currently has no commits).
2. Cloudflare Dashboard → Workers → Create → Connect to Git → select repo (Worker name `futureplanner`).
3. Build settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Node version: `20` (env `NODE_VERSION=20`)
4. Environment variables (both Preview + Production):
   - `VITE_SUPABASE_URL=https://cyhclddeuwwzlthhansm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Project Settings → API>`
   - Never set `service_role` or `sbp_*` tokens.
5. Deploy. SPA fallback is via `wrangler.toml` → `[assets] not_found_handling = "single-page-application"` (serves `index.html` for all app routes). Caching via `public/_headers`. No `public/_redirects` — Workers rejects rewrite rules here, SPA mode covers it.
6. Add the `*.workers.dev` domain back into Supabase Auth redirect URLs (step above).

## Local dev
- `cp .env.example .env` → fill `VITE_SUPABASE_ANON_KEY` → `npm install` → `npm run dev`.
- Prod check: `npm run build` (runs `tsc -b && vite build`).

## Revoking access
- The `sbp_*` management token you shared was used only from this machine to apply the SQL migration via `api.supabase.com`. It is not stored in the repo (only in local temp scripts). Revoke it in Supabase Dashboard → Account → Access Tokens right after you confirm the app works.
