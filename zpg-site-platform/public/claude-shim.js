// Gives a page written for Claude artifacts the same window.claude.use() features,
// backed by this site's Cloudflare Worker (/api). Load before the page's own script.
(function () {
  const api = (path, opts) => fetch("/api" + path, Object.assign({ credentials: "same-origin" }, opts));
  const fail = async (r) => { const b = await r.json().catch(() => ({})); const e = new Error(b.message || b.error || "Request failed"); e.code = b.code || b.error || "error"; e.status = r.status; e.body = b; throw e; };

  function snapshot(docs) {
    const list = docs.map((d) => ({ id: d.id, data: () => d.data, ver: d.ver, exists: true }));
    return { docs: list, size: list.length, empty: !list.length, forEach: (fn) => list.forEach(fn) };
  }
  // Listeners per collection. They load once. A later fetch happens only when this
  // page writes or when the page calls refresh(). There is no timer.
  const subs = {};
  const kick = (name) => { (subs[name] || new Set()).forEach((fn) => { fn(true); }); };
  function collection(name) {
    const NS = location.pathname.startsWith("/l152") ? "l152_" : "";   // L152 site data is separate from the watermain site
    const base = "/c/" + encodeURIComponent(NS + name);
    async function write(method, id, data, opts) {
      const headers = { "content-type": "application/json" };
      if (opts && opts.ifMatch != null) headers["if-match"] = String(opts.ifMatch);
      const r = await api(base + "/" + encodeURIComponent(id), { method, headers, body: JSON.stringify(data), cache: "no-store" });
      if (!r.ok) await fail(r);
      if (!opts || !opts.quiet) kick(name);
      return r.json().catch(() => ({ ok: true }));
    }
    const docRef = (id) => ({
      id,
      set: (data, opts) => write("PUT", id, data, opts),
      update: (data, opts) => write("PATCH", id, data, opts),
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
      refresh() { const ticks = [...(subs[name] || [])]; return Promise.all(ticks.map((fn) => fn(true))); },
      onSnapshot(next, error) {
        let stopped = false, prev = null, busy = false, again = false;
        const tick = async (force) => {
          if (stopped) return;
          if (busy) { again = force ? true : (again || "soft"); return; }
          busy = true;
          try { const s = await getAll(force === true); if (s !== prev) { prev = s; next(s); } }
          catch (e) { if (error) error(e); }
          busy = false;
          if (stopped || !again) return;
          const f = again === true;
          again = false;
          return tick(f);
        };
        (subs[name] = subs[name] || new Set()).add(tick);
        tick(false);
        return () => { stopped = true; subs[name].delete(tick); };
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
