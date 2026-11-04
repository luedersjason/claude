// Gives a page written for Claude artifacts the same window.claude.use() features,
// backed by this site's Cloudflare Worker (/api). Load before the page's own script.
(function () {
  const api = (path, opts) => fetch("/api" + path, Object.assign({ credentials: "same-origin" }, opts));
  const fail = async (r) => { const b = await r.json().catch(() => ({})); const e = new Error(b.message || b.error || "Request failed"); e.code = b.code || b.error || "error"; throw e; };

  function snapshot(docs) {
    const list = docs.map((d) => ({ id: d.id, data: () => d.data, exists: true }));
    return { docs: list, size: list.length, empty: !list.length, forEach: (fn) => list.forEach(fn) };
  }
  // Listeners per collection name, so a write on this page refreshes them at once instead of at the next poll.
  const subs = {};
  const kick = (name) => (subs[name] || new Set()).forEach((fn) => fn());
  function collection(name) {
    const base = "/c/" + encodeURIComponent(name);
    const docRef = (id) => ({
      id,
      set: async (data) => { const r = await api(base + "/" + encodeURIComponent(id), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); if (!r.ok) await fail(r); kick(name); },
      update: async (data) => { const r = await api(base + "/" + encodeURIComponent(id), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); if (!r.ok) await fail(r); kick(name); },
      delete: async () => { const r = await api(base + "/" + encodeURIComponent(id), { method: "DELETE" }); if (!r.ok) await fail(r); kick(name); },
      get: async () => { const s = await getAll(); const d = s.docs.find((x) => x.id === id); return d || { id, exists: false, data: () => undefined }; },
    });
    let etag = null, last = null;
    async function getAll(force) {
      const r = await api(base, { headers: force || !etag ? {} : { "if-none-match": etag }, cache: "no-store" });
      if (r.status === 304 && last) return last;
      if (!r.ok) await fail(r);
      etag = r.headers.get("etag"); last = snapshot((await r.json()).docs); return last;
    }
    return {
      doc: docRef,
      add: async (data) => { const id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await docRef(id).set(data); return docRef(id); },
      get: () => getAll(true),
      onSnapshot(next, error) {
        let stopped = false, prev = null, timer = null, busy = false, again = false;
        const tick = async () => {
          if (stopped) return;
          if (busy) { again = true; return; }
          busy = true; clearTimeout(timer);
          try { const s = await getAll(); if (s !== prev) { prev = s; next(s); } }
          catch (e) { if (error) error(e); }
          busy = false;
          if (again) { again = false; return tick(); }
          if (!stopped) timer = setTimeout(tick, document.hidden ? 15000 : 4000);
        };
        (subs[name] = subs[name] || new Set()).add(tick);
        tick();
        return () => { stopped = true; clearTimeout(timer); subs[name].delete(tick); };
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
  window.claude = { use: async (name) => (name in caps ? caps[name] : null) };
})();
