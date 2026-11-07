// Local-only stand-in for the Pages API so the real tracker page can be exercised
// without Cloudflare, D1, or a signed-in production session. Not a deployment.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { applyMutation, createMemoryDb, listCollection, parseIfMatch } from "../src/docstore.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../public");
const seed = JSON.parse(fs.readFileSync(path.join(root, "seed.json"), "utf8"));
const rows = [];
for (const [col, docs] of Object.entries(seed)) {
  if (!docs || typeof docs !== "object" || Array.isArray(docs)) continue;
  for (const [id, data] of Object.entries(docs)) rows.push({ col, id, data, ver: 1, updated_at: 1 });
}
const db = createMemoryDb(rows);
const log = [];
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf", ".svg": "image/svg+xml" };

function send(res, status, body, headers = {}) {
  const raw = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  const type = typeof body === "string" || Buffer.isBuffer(body) ? (headers["content-type"] || "text/plain; charset=utf-8") : "application/json; charset=utf-8";
  res.writeHead(status, { "cache-control": "no-store", "content-type": type, ...headers });
  res.end(raw);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_test/")) {
    log.push({ t: Date.now(), method: req.method, path: url.pathname });
  }
  if (url.pathname === "/_test/log") return send(res, 200, log);
  if (url.pathname === "/api/me") return send(res, 200, { id: "jason", name: "Jason Lueders", role: "editor", ai: false });
  if (url.pathname === "/api/profiles") return send(res, 200, {});
  const doc = url.pathname.match(/^\/_test\/doc\/([^/]+)\/([^/]+)$/);
  if (doc) {
    const row = await db.get(decodeURIComponent(doc[1]), decodeURIComponent(doc[2]));
    return send(res, row ? 200 : 404, row || { error: "not_found" });
  }
  const api = url.pathname.match(/^\/api\/c\/([^/]+)(?:\/([^/]+))?$/);
  if (api) {
    const col = decodeURIComponent(api[1]);
    const id = api[2] ? decodeURIComponent(api[2]) : "";
    if (req.method === "GET" && !id) {
      const listed = await listCollection(db, col);
      if ((req.headers["if-none-match"] || "").replace(/^W\//, "") === listed.etag) {
        res.writeHead(304, { etag: listed.etag, "cache-control": "no-store" });
        return res.end();
      }
      return send(res, 200, { docs: listed.docs }, { etag: listed.etag });
    }
    if (!id) return send(res, 400, { error: "bad id" });
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    const header = req.headers["if-match"];
    const expect = header === undefined ? undefined : parseIfMatch({ headers: { has: () => true, get: () => header } });
    if (expect === null) return send(res, 400, { error: "bad_if_match" });
    const result = await applyMutation(db, { col, id, method: req.method, body, expect, personId: "jason", now: Date.now() });
    return send(res, result.status, result.body);
  }
  const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
  }
  send(res, 200, fs.readFileSync(file), { "content-type": types[path.extname(file)] || "application/octet-stream" });
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => {
  console.log("tracker dev server http://127.0.0.1:" + port + "/#tracker");
});
