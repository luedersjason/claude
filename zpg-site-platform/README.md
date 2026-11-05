# ZPG public project site (Cloudflare)

A Jaquet-style ZPG project site that runs on Jason's Cloudflare instead of a Claude Artifact, for projects shared with outside firms. The page code is the ZPG template; `public/claude-shim.js` gives it the same `window.claude.use('db' | 'user' | 'downloads' | 'sample')` features the artifact runtime provided, backed by this Worker and a D1 database.

- `src/worker.js`: invite-link sign-in, `/api/c/<collection>[/<id>]` document store (GET list with ETag, PUT set, PATCH merge, DELETE), `/api/me`, `/api/profiles`, `/api/sample` (Claude, `claude-opus-5-5`, server-side refusal fallback on).
- `schema.sql`: `docs`, `people`, `sessions` tables.
- Roles: `admin` (Jason), `editor` (can save), `viewer` (read only).

## First deploy (on the G14, once per project)
1. `npm install`
2. `npx wrangler d1 create nitto-watermain`, paste the `database_id` into `wrangler.toml`.
3. `npx wrangler d1 execute nitto-watermain --remote --file=schema.sql`
4. `npx wrangler d1 execute nitto-watermain --remote --file=seed/seed.sql`
5. (Optional, not used for Nitto) `npx wrangler secret put ANTHROPIC_API_KEY` turns on live Claude revising in validation requests. Without it, comments are saved and Claude revises them when it next processes emails.
6. `npx wrangler deploy`
7. Add people and invite links: `node tools/invite.mjs` (prints the SQL and each person's link).

## Updating
Edit files, `npx wrangler deploy`. Data changes go through the API or `wrangler d1 execute`; no redeploy needed.
