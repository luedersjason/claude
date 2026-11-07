// Document writes for the tracker API. Versions are optimistic: a client that
// sends If-Match writes only when that version is still current, so a stale
// edit cannot replace someone else's newer record. Callers that omit If-Match
// keep the previous unconditional upsert / merge.

export function parseIfMatch(req) {
  if (!req.headers || !req.headers.has("if-match")) return undefined;
  const raw = String(req.headers.get("if-match") || "").trim().replace(/^W\//, "").replace(/^"/, "").replace(/"$/, "");
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function conflict(cur) {
  return {
    status: 409,
    body: {
      error: "conflict",
      message: "This item changed since you loaded it. Your edit was not saved over it.",
      ver: cur ? cur.ver : null,
      data: cur ? cur.data : null,
    },
  };
}

export async function listCollection(db, col) {
  return { etag: await db.etag(col), docs: await db.list(col) };
}

export async function applyMutation(db, { col, id, method, body, expect, personId, now }) {
  if (method === "PUT" && expect === 0) {
    const cur = await db.get(col, id);
    if (cur) return conflict(cur);
    try {
      await db.insert(col, id, body, 1, now, personId);
    } catch (e) {
      const again = await db.get(col, id);
      if (again) return conflict(again);
      throw e;
    }
    return { status: 200, body: { ok: true, ver: 1, data: body } };
  }

  if (method === "PUT" && expect !== undefined) {
    const cur = await db.get(col, id);
    if (!cur || cur.ver !== expect) return conflict(cur);
    const wrote = await db.updateIf(col, id, body, now, personId, expect);
    if (!wrote) return conflict(await db.get(col, id));
    return { status: 200, body: { ok: true, ver: expect + 1, data: body } };
  }

  if (method === "PATCH") {
    const cur = await db.get(col, id);
    if (!cur) return { status: 404, body: { error: "not_found" } };
    if (expect !== undefined && cur.ver !== expect) return conflict(cur);
    const merged = { ...cur.data, ...body };
    if (expect === undefined) {
      const wrote = await db.updateIf(col, id, merged, now, personId, cur.ver);
      if (!wrote) return conflict(await db.get(col, id));
      return { status: 200, body: { ok: true, ver: cur.ver + 1, data: merged } };
    }
    const wrote = await db.updateIf(col, id, merged, now, personId, expect);
    if (!wrote) return conflict(await db.get(col, id));
    return { status: 200, body: { ok: true, ver: expect + 1, data: merged } };
  }

  if (method === "PUT") {
    await db.upsert(col, id, body, now, personId);
    return { status: 200, body: { ok: true } };
  }

  return { status: 405, body: { error: "method" } };
}

export function d1Docs(DB) {
  return {
    async etag(col) {
      const mark = await DB.prepare("SELECT COUNT(*) n, COALESCE(MAX(updated_at),0) m, COALESCE(SUM(ver),0) v FROM docs WHERE col = ?").bind(col).first();
      return `"${mark.n}-${mark.m}-${mark.v}"`;
    },
    async list(col) {
      const { results } = await DB.prepare("SELECT id, data, ver FROM docs WHERE col = ?").bind(col).all();
      return results.map((r) => ({ id: r.id, data: JSON.parse(r.data), ver: r.ver }));
    },
    async get(col, id) {
      const r = await DB.prepare("SELECT data, ver FROM docs WHERE col = ? AND id = ?").bind(col, id).first();
      return r ? { data: JSON.parse(r.data), ver: r.ver } : null;
    },
    async insert(col, id, data, ver, now, by) {
      await DB.prepare("INSERT INTO docs (col, id, data, ver, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)").bind(col, id, JSON.stringify(data), ver, now, by).run();
    },
    async updateIf(col, id, data, now, by, expect) {
      const res = await DB.prepare("UPDATE docs SET data = ?, ver = ver + 1, updated_at = ?, updated_by = ? WHERE col = ? AND id = ? AND ver = ?")
        .bind(JSON.stringify(data), now, by, col, id, expect).run();
      return !!(res && res.meta && res.meta.changes === 1);
    },
    async upsert(col, id, data, now, by) {
      await DB.prepare(
        "INSERT INTO docs (col, id, data, ver, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?) " +
        "ON CONFLICT(col, id) DO UPDATE SET data = excluded.data, ver = docs.ver + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by"
      ).bind(col, id, JSON.stringify(data), now, by).run();
    },
    async remove(col, id) {
      await DB.prepare("DELETE FROM docs WHERE col = ? AND id = ?").bind(col, id).run();
    },
  };
}

export function createMemoryDb(rows = []) {
  const docs = rows.map((r) => ({ col: r.col, id: r.id, data: structuredClone(r.data), ver: r.ver || 1, updated_at: r.updated_at || 1, updated_by: r.by || "seed" }));
  const key = (col, id) => docs.findIndex((r) => r.col === col && r.id === id);
  return {
    docs,
    async etag(col) {
      const mine = docs.filter((r) => r.col === col);
      const n = mine.length;
      const m = mine.reduce((a, r) => Math.max(a, r.updated_at), 0);
      const v = mine.reduce((a, r) => a + r.ver, 0);
      return `"${n}-${m}-${v}"`;
    },
    async list(col) {
      return docs.filter((r) => r.col === col).map((r) => ({ id: r.id, data: structuredClone(r.data), ver: r.ver }));
    },
    async get(col, id) {
      const i = key(col, id);
      if (i < 0) return null;
      return { data: structuredClone(docs[i].data), ver: docs[i].ver };
    },
    async insert(col, id, data, ver, now, by) {
      if (key(col, id) >= 0) { const e = new Error("constraint"); e.code = "constraint"; throw e; }
      docs.push({ col, id, data: structuredClone(data), ver, updated_at: now, updated_by: by });
    },
    async updateIf(col, id, data, now, by, expect) {
      const i = key(col, id);
      if (i < 0 || docs[i].ver !== expect) return false;
      docs[i] = { ...docs[i], data: structuredClone(data), ver: docs[i].ver + 1, updated_at: now, updated_by: by };
      return true;
    },
    async upsert(col, id, data, now, by) {
      const i = key(col, id);
      if (i < 0) docs.push({ col, id, data: structuredClone(data), ver: 1, updated_at: now, updated_by: by });
      else docs[i] = { ...docs[i], data: structuredClone(data), ver: docs[i].ver + 1, updated_at: now, updated_by: by };
    },
    async remove(col, id) {
      const i = key(col, id);
      if (i >= 0) docs.splice(i, 1);
    },
  };
}
