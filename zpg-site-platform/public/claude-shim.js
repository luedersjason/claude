// Gives a page written for Claude artifacts the same window.claude.use() features,
// backed by this site's Cloudflare Worker (/api). Load before the page's own script.
(function () {
  const api = (path, opts) => fetch("/api" + path, Object.assign({ credentials: "same-origin" }, opts));
  const fail = async (r) => { const b = await r.json().catch(() => ({})); const e = new Error(b.message || b.error || "Request failed"); e.code = b.code || b.error || "error"; throw e; };

  function snapshot(docs) {
    const list = docs.map((d) => ({ id: d.id, data: () => d.data, exists: true }));
    return { docs: list, size: list.length, empty: !list.length, forEach: (fn) => list.forEach(fn) };
  }
  // Data loads once when the page opens and your own saves refresh at once. The Refresh button asks /api/marks
  // (one call) which collections changed and refetches only those.
  const NS0 = location.pathname.startsWith("/l152") ? "l152_" : "";
  const watchers = new Set();
  let pollTimer = null;
  // Active parts (validation requests and the tracker change box) check once a minute while the tab is on screen.
  const LIVE = ["validations", "asks"].map((c) => NS0 + c);
  async function poll(only) {
    clearTimeout(pollTimer); pollTimer = null;
    if (!watchers.size) return;
    try {
      const cols = [...new Set([...watchers].map((w) => w.col))].filter((c) => !only || only.includes(c));
      if (!cols.length) throw 0;
      const r = await api("/marks?cols=" + cols.map(encodeURIComponent).join(","), { cache: "no-store" });
      if (r.ok) { const marks = await r.json(); for (const w of [...watchers]) if (marks[w.col] && marks[w.col] !== String(w.etag() || "").replace(/^W\//, "")) w.run(); }
    } catch (e) {}
    if (!document.hidden) pollTimer = setTimeout(() => poll(LIVE), 60000);   // keep the minute check going after a Refresh too
  }
  window.claudeRefresh = () => poll();   // Refresh button: every collection on the page, one call
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(LIVE); });
  pollTimer = setTimeout(() => poll(LIVE), 60000);
  // Listeners per collection name, so a write on this page refreshes them at once instead of at the next poll.
  const subs = {};
  const kick = (name) => (subs[name] || new Set()).forEach((fn) => fn());
  function collection(name) {
    const NS = location.pathname.startsWith("/l152") ? "l152_" : "";   // L152 site data is separate from the watermain site
    const base = "/c/" + encodeURIComponent(NS + name);
    const docRef = (id) => ({
      id,
      set: async (data) => { const r = await api(base + "/" + encodeURIComponent(id), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); if (!r.ok) await fail(r); kick(name); return r.json().catch(() => ({})); },
      update: async (data) => { const r = await api(base + "/" + encodeURIComponent(id), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); if (!r.ok) await fail(r); kick(name); return r.json().catch(() => ({})); },
      delete: async () => { const r = await api(base + "/" + encodeURIComponent(id), { method: "DELETE" }); if (!r.ok) await fail(r); kick(name); },
      get: async () => { const s = await getAll(); const d = s.docs.find((x) => x.id === id); return d || { id, exists: false, data: () => undefined }; },
    });
    let etag = null, last = null, lastTxt = null;
    async function getAll(force) {
      const r = await api(base, { headers: force || !etag ? {} : { "if-none-match": etag }, cache: "no-store" });
      if (r.status === 304 && last) return last;
      if (!r.ok) await fail(r);
      etag = r.headers.get("etag");
      const txt = await r.text();
      if (last && txt === lastTxt) return last;   // same data: keep the old snapshot so pages do not redraw
      lastTxt = txt; last = snapshot(JSON.parse(txt).docs); return last;
    }
    return {
      doc: docRef,
      add: async (data) => { const id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await docRef(id).set(data); return docRef(id); },
      get: () => getAll(true),
      onSnapshot(next, error) {
        let stopped = false, prev = null, busy = false, again = false;
        const run = async (force) => {
          if (stopped) return;
          if (busy) { again = true; return; }
          busy = true;
          try { const s = await getAll(force); if (s !== prev) { prev = s; next(s); } }
          catch (e) { if (error) error(e); }
          busy = false;
          if (again) { again = false; return run(); }
        };
        const entry = { col: NS + name, etag: () => etag, run };
        (subs[name] = subs[name] || new Set()).add(run);
        watchers.add(entry);
        run();
        return () => { stopped = true; subs[name].delete(run); watchers.delete(entry); };
      },
    };
  }

  let mePromise = null;
  const me = () => (mePromise = mePromise || api("/me").then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const profileCache = {};
  const user = {
    id: async () => (await me())?.id || null,
    me: async () => { const m = await me(); return m ? { id: m.id, name: m.name } : { id: null, name: "" }; },
    profiles: async (ids) => {
      const need = ids.filter((i) => !(i in profileCache));
      if (need.length) { const r = await api("/profiles?ids=" + need.map(encodeURIComponent).join(",")); if (r.ok) Object.assign(profileCache, await r.json()); }
      return Object.fromEntries(ids.map((i) => [i, profileCache[i] || { name: "" }]));
    },
    isOwner: async () => (await me())?.role === "admin",
    canEdit: async () => (await me())?.role === "admin",
    can: async (what) => { const m = await me(); if (!m) return false; return what === "data.write" ? m.role !== "viewer" : null; },
  };

  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "download";
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    },
  };

  async function callSample(input, wantJson) {
    const r = await api("/sample", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input, json: wantJson }) });
    if (!r.ok) await fail(r);
    return r.json();
  }
  const sample = async (input, opts) => { const out = await callSample(input, false); if (opts && opts.onText) opts.onText({ text: out.text, delta: out.text }); return out; };
  sample.json = async (input) => {
    const { text } = await callSample(input, true);
    const t = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    try { return JSON.parse(t); } catch (e) { const m = t.match(/[\[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]); const err = new Error("Claude did not return JSON"); err.code = "bad_json"; err.text = text; throw err; }
  };
  sample.limits = async () => ({ images: false });

  const caps = { db: { collection }, user, downloads, sample, permissions: { state: async () => ({}), request: async () => ({}), manage: async () => {} } };
  window.claude = { use: async (name) => { if (name === 'sample') { const m = await me(); if (!m || !m.ai) return null; } return name in caps ? caps[name] : null; } };
})();
