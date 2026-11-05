// ZPG public project site backend: serves the page and gives it the same
// database / people / Claude features the Claude artifact runtime provided.
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

// Invite link: /join?t=<token>. Exchanges the one-person invite token for a session cookie.
async function join(req, env, url) {
  const t = url.searchParams.get("t");
  if (!t) return new Response("Missing invite token.", { status: 400 });
  const person = await env.DB.prepare("SELECT id FROM people WHERE invite_hash = ?").bind(await sha256(t)).first();
  if (!person) return new Response("This invite link is not valid. Ask Jason for a new one.", { status: 403 });
  const session = randomToken();
  await env.DB.prepare("INSERT INTO sessions (hash, person_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(session), person.id, Date.now() + SESSION_DAYS * 864e5).run();
  return new Response(null, {
    status: 302,
    headers: {
      location: "/",
      "set-cookie": `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`,
    },
  });
}

// Collections: GET list (with a change marker for cheap polling), PUT set, PATCH update (shallow merge), DELETE.
async function collection(req, env, person, col, id) {
  if (!/^[a-z][a-z0-9_-]{0,40}$/i.test(col)) return json({ error: "bad collection" }, 400);
  if (req.method === "GET") {
    const mark = await env.DB.prepare("SELECT COUNT(*) n, COALESCE(MAX(updated_at),0) m, COALESCE(SUM(ver),0) v FROM docs WHERE col = ?").bind(col).first();
    const etag = `"${mark.n}-${mark.m}-${mark.v}"`;
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (p === "/join") return join(req, env, url);
    const person = await currentPerson(req, env);
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
      return new Response(`<!doctype html><meta charset=utf-8><title>${env.SITE_TITLE}</title><body style="font:16px system-ui;padding:40px;max-width:560px"><h1 style="font-size:20px">${env.SITE_TITLE}</h1><p>This project site is private. Open it from your personal invite link, or ask Jason Lueders (Zilber Property Group) for one.</p>`,
        { status: 401, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    return env.ASSETS.fetch(req);
  },
};
