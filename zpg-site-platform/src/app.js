// ZPG public project site backend, shared by Cloudflare Pages (functions/_middleware.js)
// and a plain Worker (src/worker.js). Gives the page the same database / people /
// Claude features the Claude artifact runtime provided.
import Anthropic from "@anthropic-ai/sdk";

const COOKIE = "zpg_s";
const SESSION_DAYS = 60;
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...extra } });

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken() {
  const a = new Uint8Array(24); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]));
}
function cookieValue(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

async function currentPerson(req, env) {
  const tok = cookieValue(req, COOKIE);
  if (!tok) return null;
  const row = await env.DB.prepare(
    "SELECT p.id, p.name, p.email, p.company, p.role FROM sessions s JOIN people p ON p.id = s.person_id WHERE s.hash = ? AND s.expires_at > ?"
  ).bind(await sha256(tok), Date.now()).first();
  return row || null;
}
const canWrite = (p) => p && (p.role === "admin" || p.role === "editor");

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, ver INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, updated_by TEXT, PRIMARY KEY (col, id))",
  "CREATE INDEX IF NOT EXISTS docs_col_updated ON docs (col, updated_at)",
  "CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, company TEXT, role TEXT NOT NULL DEFAULT 'viewer', invite_hash TEXT UNIQUE, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, person_id TEXT NOT NULL, expires_at INTEGER NOT NULL)",
];
let ready = null;
// Creates the tables on first use and loads public/seed.json into an empty database.
function ensureReady(env) {
  if (!ready) ready = (async () => {
    await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)));
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM docs").first();
    if (n.n === 0) {
      const r = await env.ASSETS.fetch(new Request("https://assets.local/seed.json"));
      if (r.ok) {
        const seed = await r.json(), now = Date.now(), stmts = [];
        for (const [col, docs] of Object.entries(seed))
          for (const [id, data] of Object.entries(docs))
            stmts.push(env.DB.prepare("INSERT OR IGNORE INTO docs (col, id, data, ver, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, 'seed')").bind(col, id, JSON.stringify(data), now));
        for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
      }
    }
    await migrate(env);
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

// Applies public/migrate.json once per version to a live database: "delete" removes docs, "put" writes docs whole,
// "insert" adds docs that are not there yet, "merge" patches fields on existing docs. Touches only the docs it names.
async function migrate(env) {
  const r = await env.ASSETS.fetch(new Request("https://assets.local/migrate.json"));
  if (!r.ok) return;
  const m = await r.json();
  const row = await env.DB.prepare("SELECT data FROM docs WHERE col = '_meta' AND id = 'migrate'").first();
  const done = row ? (JSON.parse(row.data).v || 0) : 0;
  // Each step runs once, in order. Later steps must not re-put docs the team may have changed since.
  for (const s of (m.steps || []).filter((x) => x.v > done).sort((x, y) => x.v - y.v)) {
    const now = Date.now(), stmts = [];
    for (const [col, ids] of Object.entries(s.delete || {}))
      for (const id of ids) stmts.push(env.DB.prepare("DELETE FROM docs WHERE col = ? AND id = ?").bind(col, id));
    for (const [col, docs] of Object.entries(s.put || {}))
      for (const [id, data] of Object.entries(docs))
        stmts.push(env.DB.prepare("INSERT OR REPLACE INTO docs (col, id, data, ver, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, 'migrate')").bind(col, id, JSON.stringify(data), now));
    for (const [col, docs] of Object.entries(s.insert || {}))
      for (const [id, data] of Object.entries(docs))
        stmts.push(env.DB.prepare("INSERT OR IGNORE INTO docs (col, id, data, ver, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, 'migrate')").bind(col, id, JSON.stringify(data), now));
    for (const [col, docs] of Object.entries(s.merge || {}))
      for (const [id, patch] of Object.entries(docs)) {
        const d = await env.DB.prepare("SELECT data FROM docs WHERE col = ? AND id = ?").bind(col, id).first();
        if (!d) continue;
        stmts.push(env.DB.prepare("UPDATE docs SET data = ?, ver = ver + 1, updated_at = ?, updated_by = 'migrate' WHERE col = ? AND id = ?")
          .bind(JSON.stringify(Object.assign(JSON.parse(d.data), patch)), now, col, id));
      }
    stmts.push(env.DB.prepare("INSERT OR REPLACE INTO docs (col, id, data, ver, updated_at, updated_by) VALUES ('_meta', 'migrate', ?, 1, ?, 'migrate')").bind(JSON.stringify({ v: s.v }), now));
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  }
}

async function startSession(env, personId, location = "/") {
  const session = randomToken();
  await env.DB.prepare("INSERT INTO sessions (hash, person_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(session), personId, Date.now() + SESSION_DAYS * 864e5).run();
  // A personal login keeps at most 2 devices; signing in on a third signs out the oldest.
  if (personId !== "team") await env.DB.prepare("DELETE FROM sessions WHERE person_id = ? AND hash NOT IN (SELECT hash FROM sessions WHERE person_id = ? ORDER BY expires_at DESC LIMIT 2)").bind(personId, personId).run();
  return new Response(null, { status: 302, headers: { location,
    "set-cookie": `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}` } });
}

// One-time owner setup: /setup?key=<SETUP_KEY variable>. Works only while no admin exists.
async function setup(env, url) {
  if (!env.SETUP_KEY || url.searchParams.get("key") !== env.SETUP_KEY) return new Response("Setup key missing or wrong.", { status: 403 });
  const admin = await env.DB.prepare("SELECT id FROM people WHERE role = 'admin' LIMIT 1").first();
  if (admin) return new Response("Setup is already done. Use your invite link.", { status: 403 });
  await env.DB.prepare("INSERT OR REPLACE INTO people (id, name, email, company, role, created_at) VALUES ('jason', 'Jason Lueders', 'jason.lueders@zilber.com', 'Zilber Property Group', 'admin', ?)").bind(Date.now()).run();
  return startSession(env, "jason", "/admin");
}

// Admin: list people, and create or renew someone's personal invite link.
async function admin(req, env, person, url) {
  if (!person || person.role !== "admin") return json({ error: "not_admin" }, 403);
  if (req.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT p.id, p.name, p.email, p.company, p.role, p.created_at, (p.invite_hash IS NOT NULL) AS link_open, " +
      "(SELECT COUNT(*) FROM sessions s WHERE s.person_id = p.id AND s.expires_at > ?) AS devices, " +
      "(SELECT MAX(s.expires_at) FROM sessions s WHERE s.person_id = p.id) AS last_exp FROM people p ORDER BY p.created_at").bind(Date.now()).all();
    return json({ people: results.map((r) => ({ ...r, signed_in_at: r.last_exp ? r.last_exp - SESSION_DAYS * 864e5 : null })) });
  }
  if (req.method === "PATCH") {  // change someone's role without issuing a new link
    const b = await req.json().catch(() => ({}));
    if (!["admin", "editor", "viewer"].includes(b.role)) return json({ error: "bad role" }, 400);
    if (b.id === person.id) return json({ error: "You cannot change your own role." }, 400);
    await env.DB.prepare("UPDATE people SET role = ? WHERE id = ?").bind(b.role, String(b.id || "")).run();
    return json({ ok: true });
  }
  if (req.method === "DELETE") {  // remove someone: their link stops working and their sessions end
    const rid = url.searchParams.get("id") || "";
    if (rid === person.id) return json({ error: "You cannot remove yourself." }, 400);
    await env.DB.batch([env.DB.prepare("DELETE FROM sessions WHERE person_id = ?").bind(rid), env.DB.prepare("DELETE FROM people WHERE id = ?").bind(rid)]);
    return json({ ok: true });
  }
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  const role = ["admin", "editor", "viewer"].includes(b.role) ? b.role : "viewer";
  if (!id || !b.name) return json({ error: "id and name are required" }, 400);
  const token = randomToken();
  await env.DB.prepare("INSERT INTO people (id, name, email, company, role, invite_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, company = excluded.company, role = excluded.role, invite_hash = excluded.invite_hash")
    .bind(id, String(b.name).slice(0, 80), b.email || null, b.company || null, role, await sha256(token), Date.now()).run();
  return json({ link: `${url.origin}/join?t=${token}` });
}

// Invite link: /join?t=<token>. Exchanges the one-person invite token for a session cookie.
async function join(req, env, url) {
  const t = url.searchParams.get("t");
  if (!t) return new Response("Missing invite token.", { status: 400 });
  const person = await env.DB.prepare("SELECT id, created_at FROM people WHERE invite_hash = ?").bind(await sha256(t)).first();
  const gone = "This invite link was already used or is not valid. Ask Jason for a new one.";
  // Personal links work once (no expiry). Only the shared team link can be used again.
  if (!person) return new Response(gone, { status: 403 });
  // GET only shows a button: mail scanners and link previews fetch links with GET and must not use the link up.
  if (req.method !== "POST") return new Response(`<!doctype html><meta charset=utf-8><meta name=robots content="noindex"><title>${env.SITE_TITLE || "Nitto Watermain"}</title><body style="font:16px system-ui;padding:40px;max-width:520px"><h1 style="font-size:20px">${env.SITE_TITLE || "Nitto Watermain"}</h1><p>This is your personal link. It works once, on one device, so do not forward it.</p><form method=post><button style="font:600 16px system-ui;padding:10px 18px;border:0;border-radius:6px;background:#00A94F;color:#fff;cursor:pointer">Open the project site</button></form>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  if (person.id !== "team") await env.DB.prepare("UPDATE people SET invite_hash = NULL WHERE id = ?").bind(person.id).run();
  return startSession(env, person.id);
}

// Collections: GET list (with a change marker for cheap polling), PUT set, PATCH update (shallow merge), DELETE.
async function collection(req, env, person, col, id) {
  if (!/^[a-z][a-z0-9_-]{0,40}$/i.test(col)) return json({ error: "bad collection" }, 400);
  if (req.method === "GET") {
    const mark = await env.DB.prepare("SELECT COUNT(*) n, COALESCE(MAX(updated_at),0) m, COALESCE(SUM(ver),0) v FROM docs WHERE col = ?").bind(col).first();
    const etag = `"${mark.n}-${mark.m}-${mark.v}"`;
    if ((req.headers.get("if-none-match") || "").replace(/^W\//, "") === etag) return new Response(null, { status: 304, headers: { etag } });
    const { results } = await env.DB.prepare("SELECT id, data FROM docs WHERE col = ?").bind(col).all();
    return json({ docs: results.map((r) => ({ id: r.id, data: JSON.parse(r.data) })) }, 200, { etag, "cache-control": "no-store" });
  }
  if (!canWrite(person)) return json({ error: "not_writer" }, 403);
  if (!id || id.length > 120) return json({ error: "bad id" }, 400);
  const now = Date.now();
  if (req.method === "DELETE") {
    await env.DB.prepare("DELETE FROM docs WHERE col = ? AND id = ?").bind(col, id).run();
    return json({ ok: true });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "body must be an object" }, 400);
  const text = JSON.stringify(body);
  if (text.length > 900_000) return json({ error: "document too large" }, 413);
  if (req.method === "PUT") {
    await env.DB.prepare(
      "INSERT INTO docs (col, id, data, ver, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?) " +
      "ON CONFLICT(col, id) DO UPDATE SET data = excluded.data, ver = docs.ver + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by"
    ).bind(col, id, text, now, person.id).run();
    return json({ ok: true });
  }
  if (req.method === "PATCH") {
    const cur = await env.DB.prepare("SELECT data FROM docs WHERE col = ? AND id = ?").bind(col, id).first();
    if (!cur) return json({ error: "not_found" }, 404);
    const merged = { ...JSON.parse(cur.data), ...body };
    await env.DB.prepare("UPDATE docs SET data = ?, ver = ver + 1, updated_at = ?, updated_by = ? WHERE col = ? AND id = ?")
      .bind(JSON.stringify(merged), now, person.id, col, id).run();
    return json({ ok: true });
  }
  return json({ error: "method" }, 405);
}

// Claude for the page's "revise this proposal" comment box. Editors only.
async function sample(req, env, person) {
  if (!canWrite(person)) return json({ code: "not_granted", message: "View-only access." }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ code: "unavailable", message: "Claude is not configured on this site." }, 503);
  const { input, json: wantJson } = await req.json();
  const messages = typeof input === "string" ? [{ role: "user", content: input }] : input;
  if (!Array.isArray(messages) || !messages.length) return json({ code: "bad_request", message: "No input." }, 400);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: wantJson ? "Reply with one JSON value only. No prose, no code fences." : undefined,
      messages,
    });
    if (res.stop_reason === "refusal") return json({ code: "refused", message: "Claude declined this request." }, 422);
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return json({ text, truncated: res.stop_reason === "max_tokens" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ code: "rate_limited", message: "Too many requests; try again shortly." }, 429);
    if (err instanceof Anthropic.APIError) return json({ code: "upstream", message: "Claude request failed (" + err.status + ")." }, 502);
    throw err;
  }
}

export async function handle(req, env) {
  const res = await route(req, env);
  // Private site: never indexed, never cached by shared caches.
  const out = new Response(res.body, res);
  out.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  out.headers.set("referrer-policy", "no-referrer");
  if (!out.headers.has("cache-control")) out.headers.set("cache-control", "private, no-store");
  return out;
}

// One-time owner sign-in link (emailed to Jason 11/5/26). Only the hash is stored here; it works once and expires 11/12/26.
const CLAIM_HASH = "fdf67a8fcbc8e2deacabc9284844f8888839a5998ef962a9b0094407f5847bf8";
const CLAIM_UNTIL = Date.UTC(2026, 10, 12, 23, 59);
async function claim(req, env, url) {
  const t = url.searchParams.get("t") || "";
  const used = await env.DB.prepare("SELECT data FROM docs WHERE col = '_meta' AND id = 'claim'").first();
  if (used || Date.now() > CLAIM_UNTIL || (await sha256(t)) !== CLAIM_HASH) return new Response("This sign-in link was already used or has expired.", { status: 403 });
  if (req.method !== "POST") return new Response(`<!doctype html><meta charset=utf-8><meta name=robots content="noindex"><meta name=viewport content="width=device-width,initial-scale=1"><title>Nitto Watermain</title><body style="font:16px system-ui;padding:40px;max-width:520px"><h1 style="font-size:20px">Nitto Watermain</h1><p>Sign in as the site owner (Jason Lueders).</p><form method=post><button style="font:600 16px system-ui;padding:12px 20px;border:0;border-radius:6px;background:#00A94F;color:#fff;cursor:pointer">Sign in</button></form>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  await env.DB.batch([
    env.DB.prepare("INSERT INTO people (id, name, email, company, role, created_at) VALUES ('jason', 'Jason Lueders', 'jason.lueders@zilber.com', 'Zilber Property Group', 'admin', ?) ON CONFLICT(id) DO UPDATE SET role = 'admin'").bind(Date.now()),
    env.DB.prepare("INSERT INTO docs (col, id, data, ver, updated_at, updated_by) VALUES ('_meta', 'claim', ?, 1, ?, 'claim')").bind(JSON.stringify({ at: Date.now() }), Date.now()),
  ]);
  return startSession(env, "jason", "/");
}

// Claude's own access, so it can read comments on validation requests and write revised proposals.
// Only the hash of its token is stored here. It acts as an editor named "Claude".
const BOT_HASH = "99f2a037440bb170308207731bc9faf9c6ebfe952935a828afea795d02e0b13d";
async function bot(req, env, p) {
  if ((await sha256(req.headers.get("x-bot-token") || "")) !== BOT_HASH) return json({ error: "forbidden" }, 403);
  await ensureReady(env);
  const [, , , col, id] = p.split("/").map(decodeURIComponent);
  return collection(req, env, { id: "claude", name: "Claude", role: "editor" }, col, id);
}

async function route(req, env) {
  {
    if (new URL(req.url).pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain" } });
    await ensureReady(env);
    const url = new URL(req.url);
    const p = url.pathname;
    if (p === "/join") return join(req, env, url);
    if (p === "/setup") return setup(env, url);
    if (p === "/claim") return claim(req, env, url);
    if (p.startsWith("/api/bot/")) return bot(req, env, p);
    const person = await currentPerson(req, env);
    if (p === "/api/admin/people") return admin(req, env, person, url);
    if (p.startsWith("/api/")) {
      if (!person) return json({ error: "signed_out" }, 401);
      if (p === "/api/me") return json({ id: person.id, name: person.name, company: person.company, role: person.role, ai: !!env.ANTHROPIC_API_KEY });
      if (p === "/api/profiles") {
        const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 200);
        if (!ids.length) return json({});
        const { results } = await env.DB.prepare(`SELECT id, name FROM people WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all();
        return json(Object.fromEntries(results.map((r) => [r.id, { name: r.name }])));
      }
      if (p === "/api/sample" && req.method === "POST") return sample(req, env, person);
      const m = p.match(/^\/api\/c\/([^/]+)(?:\/([^/]+))?$/);
      if (m) return collection(req, env, person, decodeURIComponent(m[1]), m[2] && decodeURIComponent(m[2]));
      return json({ error: "not_found" }, 404);
    }
    if (!person) {
      return new Response(`<!doctype html><meta charset=utf-8><title>${env.SITE_TITLE || "Nitto Watermain"}</title><body style="font:16px system-ui;padding:40px;max-width:560px"><h1 style="font-size:20px">${env.SITE_TITLE || "Nitto Watermain"}</h1><p>This project site is private. Open it from your personal invite link, or ask Jason Lueders (Zilber Property Group) for one.</p>`,
        { status: 401, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    return env.ASSETS.fetch(req);
  }
}
