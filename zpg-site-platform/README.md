# ZPG public project site (Cloudflare)

A Jaquet-style ZPG project site that runs on Jason's Cloudflare instead of a Claude Artifact, for projects shared with outside firms. The page code is the ZPG template; `public/claude-shim.js` gives it the same `window.claude.use('db' | 'user' | 'downloads' | 'sample')` features the artifact runtime provided, backed by this Worker and a D1 database.

- `src/worker.js`: invite-link sign-in, `/api/c/<collection>[/<id>]` document store (GET list with ETag, PUT set, PATCH merge, DELETE), `/api/me`, `/api/profiles`, `/api/sample` (Claude, `claude-opus-5-5`, server-side refusal fallback on).
- `schema.sql`: `docs`, `people`, `sessions` tables.
- Roles: `admin` (Jason), `editor` (can save), `viewer` (read only).

## Hosting: Cloudflare Pages connected to GitHub (same as the c251 portal)
Every push to the connected branch deploys automatically. `functions/_middleware.js` runs the backend (`src/app.js`) on every request; `public/` is the site. On first request the site creates its D1 tables and loads `public/seed.json` into an empty database.

One-time setup in the Cloudflare dashboard:
1. Storage & Databases > D1 > Create database `nitto-watermain`.
2. Workers & Pages > Create > Pages > Connect to Git > `luedersjason/claude`; production branch `claude/gallant-allen-1vreeq`; root directory `zpg-site-platform`; build command `npm install` (Functions need @anthropic-ai/sdk); build output directory `public`. Save and deploy.
3. Project > Settings > Runtime: compatibility date 2026-10-01, flag `nodejs_compat`.
4. Project > Settings > Bindings > Add > D1: variable `DB`, database `nitto-watermain`.
5. Project > Settings > Variables and Secrets > Add secret `SETUP_KEY` = a phrase you pick (keep it private). Then Deployments > Retry deployment so the settings apply.
6. Open `https://<project>.pages.dev/setup?key=<your phrase>`. That makes you the admin and opens `/admin`, where you create invite links for each person. Setup works only once.

Optional: secret `ANTHROPIC_API_KEY` turns on live Claude revising in validation requests. Without it, comments are saved and Claude applies them on the next email sweep.

## Alternative: plain Worker (wrangler deploy)
1. `npm install`
2. `npx wrangler d1 create nitto-watermain`, paste the `database_id` into `wrangler.toml`.
3. `npx wrangler d1 execute nitto-watermain --remote --file=schema.sql`
4. `npx wrangler d1 execute nitto-watermain --remote --file=seed/seed.sql`
5. (Optional, not used for Nitto) `npx wrangler secret put ANTHROPIC_API_KEY` turns on live Claude revising in validation requests. Without it, comments are saved and Claude revises them when it next processes emails.
6. `npx wrangler deploy`
7. Add people and invite links: `node tools/invite.mjs` (prints the SQL and each person's link).

## Updating
Edit files, `npx wrangler deploy`. Data changes go through the API or `wrangler d1 execute`; no redeploy needed.
