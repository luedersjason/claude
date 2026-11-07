// Local tracker drafts. Edits stay in this browser until Send. Nothing here
// polls. A failed or conflicting send leaves the draft in place.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NittoTrackerSync = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const DRAFT_KEY = "nitto-wm-issues-drafts-v1";
  const MSG = {
    saved: "Saved",
    unsaved: "Unsaved changes on this page",
    sending: "Sending…",
    network: "Could not send. Your edits are still on this page.",
    forbidden: "That change did not send. You may have view-only access.",
    conflict: "Someone else changed an item you edited. Your edits are still here and were not saved over theirs.",
  };
  const PRIVATE = new Set(["_id", "_ver", "_dirty", "_conflict", "_pendingCreate"]);

  function same(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }
  function strip(row) {
    const o = {};
    for (const k of Object.keys(row || {})) if (!PRIVATE.has(k)) o[k] = row[k];
    return o;
  }
  function patchApplied(server, patch) {
    return Object.keys(patch || {}).every((k) => same(server[k], patch[k]));
  }
  function rebaseable(server, base, patch) {
    return Object.keys(patch || {}).every((k) => same(server[k], base ? base[k] : undefined) || same(server[k], patch[k]));
  }
  function cleanPatch(base, patch) {
    const out = {};
    for (const k of Object.keys(patch || {})) if (!same(patch[k], base ? base[k] : undefined)) out[k] = patch[k];
    return out;
  }
  function finishPhase(drafts) {
    const ids = Object.keys(drafts);
    if (!ids.length) return { drafts, phase: "saved", message: MSG.saved };
    const conflict = ids.some((id) => drafts[id].conflict);
    return { drafts, phase: conflict ? "error" : "unsaved", message: conflict ? MSG.conflict : MSG.unsaved };
  }

  function create(options) {
    const storage = options && options.storage;
    const key = (options && options.key) || DRAFT_KEY;
    let inflight = null;

    function readDisk() {
      if (!storage) return {};
      try {
        const raw = storage.getItem(key);
        if (!raw) return {};
        const p = JSON.parse(raw);
        return p && p.drafts && typeof p.drafts === "object" ? p.drafts : {};
      } catch (e) { return {}; }
    }
    function persist(removed) {
      const disk = readDisk();
      const merged = { ...disk, ...state.drafts };
      for (const id of removed || []) delete merged[id];
      if (storage) {
        try { storage.setItem(key, JSON.stringify({ drafts: merged })); } catch (e) {}
      }
      state = { ...state, drafts: merged };
    }
    function commit(next, removed) {
      if (next === state) return state;
      state = next;
      persist(removed || []);
      return state;
    }
    let state = finishPhase(readDisk());

    function removedSince(prev, nextDrafts) {
      return Object.keys(prev).filter((id) => !nextDrafts[id]);
    }

    return {
      get state() { return state; },
      isDirty() { return Object.keys(state.drafts).length > 0; },
      status() {
        const dirty = Object.keys(state.drafts).length > 0;
        return {
          phase: state.phase,
          message: state.message,
          dirty,
          canSend: dirty && state.phase !== "sending",
          conflict: Object.values(state.drafts).some((d) => d.conflict),
        };
      },
      reload() {
        if (state.phase === "sending") return state;
        state = finishPhase(readDisk());
        return state;
      },
      noteError(message) {
        if (state.phase === "sending") return state;
        state = { ...state, phase: "error", message: message || MSG.network };
        return state;
      },
      overlay(serverRows) {
        const out = [];
        const seen = new Set();
        for (const r of serverRows || []) {
          seen.add(r._id);
          const d = state.drafts[r._id];
          if (d && d.op === "update") out.push({ ...r, ...d.patch, _dirty: true, _conflict: !!d.conflict, _pendingCreate: false });
          else out.push({ ...r, _dirty: false, _conflict: false, _pendingCreate: false });
        }
        for (const [id, d] of Object.entries(state.drafts)) {
          if (d.op === "create" && !seen.has(id)) {
            out.push({ ...d.patch, _id: id, ref: d.patch.ref || id, _ver: 0, _dirty: true, _conflict: !!d.conflict, _pendingCreate: true });
          }
        }
        return out;
      },
      patchUpdate(serverRow, patch) {
        if (state.phase === "sending" || !serverRow) return state;
        const id = serverRow._id;
        const existing = state.drafts[id];
        const base = existing && existing.op === "update" ? existing.base : strip(serverRow);
        const baseVer = existing && existing.op === "update" ? existing.baseVer : serverRow._ver;
        const merged = cleanPatch(base, { ...(existing && existing.op === "update" ? existing.patch : {}), ...patch });
        const drafts = { ...state.drafts };
        if (!Object.keys(merged).length) delete drafts[id];
        else drafts[id] = { op: "update", baseVer: Number.isInteger(baseVer) ? baseVer : 0, base, patch: merged, conflict: null };
        return commit(finishPhase(drafts), removedSince(state.drafts, drafts));
      },
      create(doc) {
        if (state.phase === "sending") return { state, duplicate: false, blocked: true };
        const id = doc && doc.ref;
        if (!id || state.drafts[id]) return { state, duplicate: !!id && !!state.drafts[id], blocked: !id };
        const drafts = { ...state.drafts, [id]: { op: "create", baseVer: 0, base: null, patch: strip(doc), conflict: null } };
        commit(finishPhase(drafts), []);
        return { state, duplicate: false, blocked: false };
      },
      patchCreate(id, patch) {
        if (state.phase === "sending") return state;
        const d = state.drafts[id];
        if (!d || d.op !== "create") return state;
        const drafts = { ...state.drafts, [id]: { ...d, patch: { ...d.patch, ...patch }, conflict: null } };
        return commit(finishPhase(drafts), []);
      },
      discardAll() {
        const removed = [...new Set([...Object.keys(readDisk()), ...Object.keys(state.drafts)])];
        state = { drafts: {}, phase: "saved", message: MSG.saved };
        persist(removed);
        return state;
      },
      observe(serverRows) {
        if (state.phase === "sending") return state;
        const byId = new Map((serverRows || []).map((r) => [r._id, r]));
        const drafts = { ...state.drafts };
        let changed = false;
        for (const id of Object.keys(drafts)) {
          const d = drafts[id];
          const row = byId.get(id);
          if (d.op === "create") {
            if (row && patchApplied(strip(row), d.patch)) { delete drafts[id]; changed = true; }
            else if (row && (!d.conflict || d.conflict.ver !== row._ver)) { drafts[id] = { ...d, conflict: { ver: row._ver, data: strip(row) } }; changed = true; }
            continue;
          }
          if (!row) {
            if (!d.conflict || !d.conflict.gone) { drafts[id] = { ...d, conflict: { ver: null, data: null, gone: true } }; changed = true; }
            continue;
          }
          const server = strip(row);
          if (patchApplied(server, d.patch)) { delete drafts[id]; changed = true; continue; }
          if (Number.isInteger(row._ver) && row._ver !== d.baseVer) {
            if (rebaseable(server, d.base, d.patch)) {
              const patch = cleanPatch(server, d.patch);
              if (!Object.keys(patch).length) delete drafts[id];
              else drafts[id] = { ...d, baseVer: row._ver, base: server, patch, conflict: null };
              changed = true;
            } else if (!d.conflict || d.conflict.ver !== row._ver) {
              drafts[id] = { ...d, conflict: { ver: row._ver, data: server } };
              changed = true;
            }
          }
        }
        if (!changed) return state;
        return commit(finishPhase(drafts), removedSince(state.drafts, drafts));
      },
      send(request) {
        if (inflight) return inflight;
        inflight = (async () => {
          if (!Object.keys(state.drafts).length) {
            state = { ...state, phase: "saved", message: MSG.saved };
            return { ok: true, requests: 0, done: [], sawConflict: false };
          }
          state = { ...state, phase: "sending", message: MSG.sending };
          persist([]);
          const ids = Object.keys(state.drafts);
          let requests = 0;
          let sawConflict = false;
          let errorMessage = "";
          const done = [];
          for (const id of ids) {
            let guard = 0;
            while (state.drafts[id] && guard < 2) {
              guard += 1;
              const draft = state.drafts[id];
              requests += 1;
              let res;
              try {
                res = await request({ id, method: draft.op === "create" ? "PUT" : "PATCH", ifMatch: draft.baseVer, body: draft.patch });
              } catch (e) {
                errorMessage = MSG.network;
                guard = 99;
                break;
              }
              if (res && res.ok) {
                done.push({ id, op: draft.op, patch: draft.patch, base: draft.base });
                const drafts = { ...state.drafts };
                delete drafts[id];
                state = { ...state, drafts, phase: "sending", message: MSG.sending };
                persist([id]);
                break;
              }
              if (res && res.status === 409) {
                const server = res.data;
                if (draft.op === "create" && server && patchApplied(server, draft.patch)) {
                  done.push({ id, op: draft.op, patch: draft.patch, base: null });
                  const drafts = { ...state.drafts };
                  delete drafts[id];
                  state = { ...state, drafts, phase: "sending", message: MSG.sending };
                  persist([id]);
                  break;
                }
                if (draft.op === "update" && server && patchApplied(server, draft.patch)) {
                  done.push({ id, op: draft.op, patch: draft.patch, base: draft.base });
                  const drafts = { ...state.drafts };
                  delete drafts[id];
                  state = { ...state, drafts, phase: "sending", message: MSG.sending };
                  persist([id]);
                  break;
                }
                if (draft.op === "update" && server && guard === 1 && rebaseable(server, draft.base, draft.patch) && Number.isInteger(res.ver)) {
                  state = { ...state, drafts: { ...state.drafts, [id]: { ...draft, baseVer: res.ver, base: strip(server), conflict: null } }, phase: "sending", message: MSG.sending };
                  persist([]);
                  continue;
                }
                sawConflict = true;
                errorMessage = MSG.conflict;
                state = { ...state, drafts: { ...state.drafts, [id]: { ...draft, conflict: { ver: res.ver ?? null, data: server || null } } }, phase: "sending", message: MSG.sending };
                persist([]);
                break;
              }
              errorMessage = res && res.status === 403 ? MSG.forbidden : MSG.network;
              break;
            }
          }
          const failed = ids.filter((id) => state.drafts[id]);
          const leftover = Object.keys(state.drafts);
          state = {
            ...state,
            phase: failed.length ? "error" : (leftover.length ? "unsaved" : "saved"),
            message: failed.length ? (errorMessage || MSG.network) : (leftover.length ? MSG.unsaved : MSG.saved),
          };
          persist([]);
          return { ok: !failed.length, requests, done, sawConflict };
        })().finally(() => { inflight = null; });
        return inflight;
      },
    };
  }

  async function boot(opts) {
    const DNAME = opts.DNAME;
    const refPrefix = opts.refPrefix || "N-";
    const body = document.getElementById("tkBody");
    const msg = document.getElementById("tkMsg");
    const ownerSel = document.getElementById("tkOwner");
    const showSel = document.getElementById("tkShow");
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const NEXT = { Open: "In progress", Pending: "In progress", "In progress": "Done", Done: "Open" };
    let serverRows = [], rows = [], canWrite = true, tkGrp = "area", tkOnly = null, detailId = null;
    const tkOpen = new Set(), doneOpen = new Set();
    const sync = create({ storage: window.localStorage });
    const syncSw = () => document.querySelectorAll("#tkGrpSw button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.tg === tkGrp)));
    function publish() {
      rows = canWrite ? sync.overlay(serverRows) : serverRows.map((r) => ({ ...r, _dirty: false, _conflict: false, _pendingCreate: false }));
      render();
      paintSync();
    }
    window.jqOpenItem = (id) => { detailId = id; publish(); if (window.jqTab) window.jqTab("tracker", true); };
    window.jqOpenGroup = (kind, key, withDone) => { detailId = null; tkGrp = kind; tkOnly = key; syncSw(); tkOpen.add(kind + ":" + key); if (withDone) doneOpen.add(kind + ":" + key); showSel.value = showSel.value === "Done" ? "active" : showSel.value; publish(); if (window.jqTab) window.jqTab("tracker", true); };
    document.getElementById("tkGrpSw").addEventListener("click", (e) => { const b = e.target.closest("[data-tg]"); if (!b) return; tkGrp = b.dataset.tg; tkOnly = null; document.querySelectorAll("#tkGrpSw button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); publish(); });
    try { if (localStorage.getItem("tkShow")) showSel.value = localStorage.getItem("tkShow"); } catch (e) {}
    const db = window.claude ? await window.claude.use("db") : null;
    if (!db) { body.innerHTML = '<tr><td colspan="5" class="note">' + esc(opts.signIn || "Sign in to see the tracker.") + "</td></tr>"; return; }
    const user = await window.claude.use("user");
    try { const c = user && user.can ? await user.can("data.write") : null; if (c === false) canWrite = false; } catch (e) {}
    if (!canWrite) { const add = document.getElementById("tkAdd"); if (add) add.hidden = true; const ni = document.getElementById("newIss"); if (ni) ni.hidden = true; const send = document.getElementById("tkSend"); if (send) send.hidden = true; }
    const col = db.collection("issues");
    const sweeps = db.collection("sweeps");
    function norm(snap) {
      const list = (snap && (snap.docs || snap)) || [];
      return Array.from(list).map((d) => {
        const v = typeof d.data === "function" ? d.data() : (d.data || d);
        const ver = Number.isInteger(d.ver) ? d.ver : (Number.isInteger(v && v.ver) ? v.ver : null);
        const row = { ...v, _id: d.id || v.id, _ver: ver };
        delete row.ver;
        return row;
      });
    }
    window.jqWait = (r) => (r.blockedBy || []).map((ref) => rows.find((x) => x.ref === ref)).filter((x) => x && x.status !== "Done");
    const eff = (r) => (r.status === "Open" && window.jqWait(r).length) ? "Pending" : (r.status || "Open");
    window.jqEff = eff;
    const stc = (s) => s === "In progress" ? "Progress" : s;
    const pd = (t) => { const m = String(t || "").match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/); if (!m) return null; const now = new Date(); let y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000; let d = new Date(y, +m[1] - 1, +m[2]); if (!m[3] && d - now > 60 * 864e5) d = new Date(y - 1, +m[1] - 1, +m[2]); return d; };
    const age = (t) => { const d = pd(t); return d ? Math.floor((new Date() - d) / 864e5) : null; };
    function flags(r) { if (r.status === "Done") return ""; let h = ""; if (r.ball) h += `<span class="ball">Ball: ${esc(r.ball)}</span>`; const dd = pd(r.due); if (dd && new Date() - dd > 864e5 * 0.99) h += `<span class="flag">Overdue ${esc(r.due)}</span>`; else if (r.due) h += `<span class="wait">Due ${esc(r.due)}</span>`; const a = age(r.confirmed || r.updated); if (a !== null && a >= 7) h += `<span class="flag">Not confirmed in ${a} days</span>`; return h; }
    window.jqCmp = (a, b) => ((a.status === "Done") - (b.status === "Done")) || ((b.pri ? 1 : 0) - (a.pri ? 1 : 0)) || ((parseInt(String(a.ref || "").replace(/\D/g, "")) || 999) - (parseInt(String(b.ref || "").replace(/\D/g, "")) || 999));
    const today = () => new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
    window.jqPri = (id) => {
      if (!canWrite) { msg.textContent = "Could not change priority. You may have view-only access."; return; }
      const r = rows.find((x) => x._id === id); if (!r) return;
      if (r._pendingCreate) sync.patchCreate(id, { pri: !r.pri });
      else { const server = serverRows.find((x) => x._id === id); if (server) sync.patchUpdate(server, { pri: !r.pri }); }
      publish();
    };
    function paintSync() {
      const s = sync.status();
      const btn = document.getElementById("tkSend");
      const st = document.getElementById("tkSyncState");
      const disc = document.getElementById("tkDiscard");
      const bar = document.getElementById("tkSync");
      if (btn && canWrite) { btn.disabled = !s.canSend; btn.textContent = s.phase === "sending" ? "Sending…" : "Send"; btn.setAttribute("aria-busy", s.phase === "sending" ? "true" : "false"); }
      if (disc && canWrite) disc.hidden = !s.dirty || s.phase === "sending";
      if (st) { st.textContent = !canWrite ? "View only" : s.message; st.className = !canWrite ? "saved" : s.phase; }
      if (bar) bar.dataset.phase = !canWrite ? "readonly" : s.phase;
    }
    function detailHtml(r) {
      const lab = DNAME[r.area] || r.area || "";
      const L = (ref) => rows.find((x) => x.ref === ref);
      const link = (x) => `<li><a href="#" class="pre" data-pre="${esc(x.ref)}">${esc(x.ref)}</a> ${esc(x.title)} <span class="mono" style="font-size:11px">· ${esc(x.status)}</span></li>`;
      const pre = (r.blockedBy || []).map(L).filter(Boolean), unb = rows.filter((x) => (x.blockedBy || []).includes(r.ref)), ve = (r.ve || []).map(L).filter(Boolean), feeds = rows.filter((x) => (x.ve || []).includes(r.ref));
      const sec = (h, a) => a.length ? `<h3>${h}</h3><ul>${a.map(link).join("")}</ul>` : "";
      const tag = r._dirty ? `<p class="unsaved-tag">${r._conflict ? "Conflict — not saved" : "Unsaved on this page"}</p>` : "";
      return `<button type="button" class="btn" data-back>← Back to ${esc(tkOnly ? (tkGrp === "area" ? (DNAME[tkOnly] || tkOnly) : tkOnly) : "the tracker")}</button>
      <div class="eyebrow" style="margin-top:12px">${esc(r.ref || "")} · ${esc(lab)}</div><h2 style="margin:4px 0 10px">${esc(r.title)}</h2>${tag}
      <div class="tk-facts"><div><span>Status</span><button class="st ${esc(stc(eff(r)))}" data-id="${esc(r._id)}"${canWrite ? "" : " disabled"}>${esc(eff(r))}</button></div>
      <div><span>Owner</span>${esc(r.owner || "Unassigned")}</div>${r.ball ? `<div><span>Ball is with</span>${esc(r.ball)}</div>` : ""}${r.due ? `<div><span>Due</span>${esc(r.due)}</div>` : ""}${r.confirmed ? `<div><span>Last confirmed</span>${esc(r.confirmed)}${r.source ? " · " + esc(r.source) : ""}</div>` : ""}
      <div><span>Priority</span><button type="button" class="pri-b${r.pri ? " on" : ""}" data-pid="${esc(r._id)}" aria-pressed="${!!r.pri}">★ ${r.pri ? "Priority" : "Mark priority"}</button></div>
      <div><span>Updated</span>${esc(r.updated || "")}</div></div>
      ${sec("Predecessors (must finish first)", pre)}${sec("Unblocks", unb)}${sec("VE ideas for this item", ve)}${sec("Feeds the cost log item", feeds)}
      ${flags(r) ? `<p>${flags(r)}</p>` : ""}${r.now ? `<h3>Now</h3><p style="max-width:80ch;line-height:1.55" class="nowl">${esc(r.now)}</p>` : ""}<h3>${r.now ? "History" : "Next step / notes"}</h3><p style="max-width:80ch;line-height:1.55" class="tk-hist">${esc(r.next || "No notes yet.")}</p>`;
    }
    function render() {
      window.jqIssues = rows; window.dispatchEvent(new Event("jqissues"));
      const detEl = document.getElementById("tkDetail"), barEl = document.getElementById("tkBar"), wrapEl = document.getElementById("tkWrap"), onlyEl = document.getElementById("tkOnly");
      const dr = detailId ? rows.find((x) => x._id === detailId) : null; if (!dr) detailId = null;
      barEl.hidden = !!dr; wrapEl.hidden = !!dr; detEl.hidden = !dr; onlyEl.hidden = !!dr || !tkOnly;
      if (dr) { detEl.innerHTML = detailHtml(dr); return; }
      if (tkOnly) onlyEl.innerHTML = "Showing <b>" + esc(tkGrp === "area" ? (DNAME[tkOnly] || tkOnly) : tkOnly) + '</b> <button type="button" class="btn" data-clearonly>Show all</button>';
      const owners = [...new Set(rows.flatMap((r) => String(r.owner || "Unassigned").split(/\s*[·,]\s*/)))].sort();
      const cur = ownerSel.value;
      ownerSel.innerHTML = '<option value="">Everyone</option>' + owners.map((o) => `<option${o === cur ? " selected" : ""}>${esc(o)}</option>`).join("");
      const c = { Open: 0, Pending: 0, "In progress": 0, Done: 0 }; rows.forEach((r) => { const e = eff(r); c[e] = (c[e] || 0) + 1; });
      document.getElementById("tkCounts").innerHTML = `<span>${c.Open} open</span><span>${c.Pending} pending</span><span>${c["In progress"]} in progress</span><span>${c.Done} done</span>`;
      const show = showSel.value;
      const openish = (r) => r.status !== "Done" || r._dirty;
      const vis = rows.filter((r) => (!cur || String(r.owner || "Unassigned").includes(cur)) && (tkGrp !== "none" || show === "all" || r._dirty || (show === "Done" ? r.status === "Done" : r.status !== "Done"))).sort(window.jqCmp);
      const rowHtml = (r) => `<tr class="${r.status === "Done" ? "done" : ""}${r.pri ? " pri" : ""}${r._dirty ? " dirty" : ""}${r.status !== "Done" && window.jqWait(r).length ? " blocked" : ""}">
        <td class="id"><button type="button" class="pri-b${r.pri ? " on" : ""}" data-pid="${esc(r._id)}" title="Priority: move to top" aria-pressed="${!!r.pri}">★</button> ${esc(r.ref || "")}</td>
        <td class="t"><a href="#" class="itm" data-open="${esc(r._id)}">${esc(r.title)}</a><span class="area">${esc(r.area || "")}</span>${r._dirty ? `<span class="unsaved-tag">${r._conflict ? "Conflict" : "Unsaved"}</span>` : ""}</td>
        <td class="who">${esc(r.owner || "Unassigned")}</td>
        <td><button class="st ${esc(stc(eff(r)))}" data-id="${esc(r._id)}"${canWrite ? "" : " disabled"} title="${canWrite ? "Click to change status on this page. Press Send to save." : "View only"}">${esc(eff(r))}</button></td>
        <td class="nx">${(r.ve && r.ve.length) ? `<span class="wait" style="background:#E8F5EE;border-color:#BFE3CF;color:#1B6B3F">VE ideas: ${r.ve.map((x) => `<a href="#" class="pre" data-pre="${esc(x)}">${esc(x)}</a>`).join(", ")}</span> ` : ""}${r.status !== "Done" && window.jqWait(r).length ? `<span class="wait">Predecessor: ${window.jqWait(r).map((x) => `<a href="#" class="pre" data-pre="${esc(x.ref)}">${esc(x.ref)}</a>`).join(", ")}</span> ` : ""}${flags(r)}${r.now ? `<span class="nowl">${esc(r.now)}</span>` : esc(r.next || "")}${r.updated ? ` <span class="mono" style="font-size:11px">· ${esc(r.updated)}</span>` : ""}</td></tr>`;
      const DN = DNAME;
      if (!vis.length) { body.innerHTML = '<tr><td colspan="5" class="note">Nothing matches this filter.</td></tr>'; return; }
      if (tkGrp === "none") { body.innerHTML = vis.map(rowHtml).join(""); return; }
      const own = (r) => String(r.owner || "Unassigned").split(/\s*[·,]\s*/).filter(Boolean);
      const keys0 = tkGrp === "area" ? Object.keys(DN).concat([...new Set(vis.map((r) => r.area).filter((a) => a && !DN[a]))]) : [...new Set(vis.flatMap(own))].sort((a, b) => a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a === "Jason" ? -1 : b === "Jason" ? 1 : a.localeCompare(b));
      const keys = tkOnly ? keys0.filter((k) => k === tkOnly) : keys0;
      body.innerHTML = keys.map((k) => {
        const items = vis.filter((r) => tkGrp === "area" ? r.area === k : own(r).includes(k)).sort(window.jqCmp); if (!items.length) return "";
        const op = items.filter(openish), dn = items.filter((r) => !openish(r)), open = op.length, key = tkGrp + ":" + k, isOpen = tkOpen.has(key) || tkOnly === k, doneShown = doneOpen.has(key) || show !== "active";
        return `<tr class="grp" data-gk="${esc(key)}" aria-expanded="${isOpen}"><td colspan="5"><span class="car">${isOpen ? "▾" : "▸"}</span> <b>${esc(tkGrp === "area" ? (DN[k] || k) : k)}</b><span class="gc"><b>${open}</b> open / ${items.length}</span></td></tr>` + (isOpen ? ((show === "Done" ? [] : op).map(rowHtml).join("") + (dn.length ? `<tr class="donetoggle" data-dk="${esc(key)}"><td colspan="5">${doneShown ? "▾" : "▸"} ${dn.length} completed</td></tr>` + (doneShown ? dn.map(rowHtml).join("") : "") : "")) : "");
      }).join("");
    }
    function cycle(b) {
      if (!canWrite || !b || b.disabled) return;
      const r = rows.find((x) => x._id === b.dataset.id); if (!r) return;
      const s = NEXT[r.status] || "Open";
      const patch = { status: s, updated: today() };
      if (r._pendingCreate) sync.patchCreate(r._id, patch);
      else { const server = serverRows.find((x) => x._id === r._id); if (server) sync.patchUpdate(server, patch); }
      publish();
    }
    ownerSel.addEventListener("change", publish);
    showSel.addEventListener("change", () => { try { localStorage.setItem("tkShow", showSel.value); } catch (e) {} publish(); });
    document.getElementById("tkDetail").addEventListener("click", (e) => {
      if (e.target.closest("[data-back]")) { detailId = null; publish(); return; }
      const pre = e.target.closest("a.pre"); if (pre) { e.preventDefault(); window.jqGoRef(pre.dataset.pre); return; }
      const pb = e.target.closest(".pri-b"); if (pb) { window.jqPri(pb.dataset.pid); return; }
      cycle(e.target.closest(".st"));
    });
    document.querySelector('.tab[data-tab="tracker"]').addEventListener("click", () => { detailId = null; tkOnly = null; publish(); });
    document.getElementById("tkOnly").addEventListener("click", (e) => { if (e.target.closest("[data-clearonly]")) { tkOnly = null; publish(); } });
    body.addEventListener("click", (e) => {
      const gr = e.target.closest("tr.grp"); if (gr) { const k = gr.dataset.gk; tkOpen.has(k) ? tkOpen.delete(k) : tkOpen.add(k); publish(); return; }
      const pre = e.target.closest("a.pre"); if (pre) { e.preventDefault(); window.jqGoRef(pre.dataset.pre); return; }
      const pb = e.target.closest(".pri-b"); if (pb) { window.jqPri(pb.dataset.pid); return; }
      const it = e.target.closest("a.itm"); if (it) { e.preventDefault(); detailId = it.dataset.open; publish(); window.scrollTo(0, 0); return; }
      const dt = e.target.closest("tr.donetoggle"); if (dt) { const k = dt.dataset.dk; doneOpen.has(k) ? doneOpen.delete(k) : doneOpen.add(k); publish(); return; }
      cycle(e.target.closest(".st"));
    });
    document.getElementById("tkForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!canWrite) return;
      const t = document.getElementById("tkTitle").value.trim(); if (!t) return;
      const n = rows.reduce((m, r) => Math.max(m, parseInt(String(r.ref || "").replace(/\D/g, "")) || 0), 0) + 1;
      const ref = refPrefix + String(n).padStart(2, "0");
      const doc = {
        ref, title: t, owner: document.getElementById("tkWho").value.trim() || "Unassigned", area: document.getElementById("tkArea").value,
        status: "Open", next: document.getElementById("tkNext").value.trim(), order: n, updated: today(),
      };
      const made = sync.create(doc);
      if (made.duplicate || made.blocked) { msg.textContent = ref + " is already waiting to send."; return; }
      e.target.reset();
      document.getElementById("issModal").hidden = true;
      tkOpen.add("area:" + doc.area);
      msg.textContent = ref + " is on this page. Press Send to save it for the team.";
      publish();
    });
    document.getElementById("tkSend").addEventListener("click", async () => {
      const result = await sync.send(async (op) => {
        const ref = col.doc(op.id);
        try {
          const out = op.method === "PUT"
            ? await ref.set(op.body, { ifMatch: op.ifMatch, quiet: true })
            : await ref.update(op.body, { ifMatch: op.ifMatch, quiet: true });
          return { ok: true, status: 200, ver: out && out.ver, data: out && out.data };
        } catch (e) {
          if (e && e.status) return { ok: false, status: e.status, ver: e.body && e.body.ver, data: e.body && e.body.data, message: e.message };
          throw e;
        }
      });
      publish();
      for (const item of result.done || []) {
        if (item.patch && item.patch.status === "Done" && (!item.base || item.base.status !== "Done") && window.jqFeed) {
          const title = item.patch.title || (item.base && item.base.title) || "";
          const ref = (item.base && item.base.ref) || item.patch.ref || item.id;
          window.jqFeed(ref + " done: " + String(title).slice(0, 60));
        }
      }
      if ((result.done && result.done.length) || result.sawConflict) {
        try { if (col.refresh) await col.refresh(); } catch (e) {}
      }
    });
    document.getElementById("tkRefresh").addEventListener("click", async () => {
      const st = document.getElementById("tkSyncState");
      if (st && !sync.isDirty()) { st.textContent = "Refreshing…"; st.className = "sending"; }
      try { await Promise.all([col.refresh ? col.refresh() : Promise.resolve(), sweeps.refresh ? sweeps.refresh() : Promise.resolve()]); }
      catch (e) { sync.noteError("Could not refresh. Your unsaved edits are still on this page."); }
      publish();
    });
    document.getElementById("tkDiscard").addEventListener("click", () => {
      if (!sync.isDirty()) return;
      if (!window.confirm("Discard unsaved tracker edits on this page?")) return;
      sync.discardAll();
      msg.textContent = "";
      publish();
    });
    window.addEventListener("beforeunload", (e) => {
      if (!canWrite || !sync.isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    });
    window.addEventListener("storage", (e) => {
      if (e.key !== DRAFT_KEY) return;
      sync.reload();
      publish();
    });
    try { sweeps.onSnapshot((sn) => { const L = norm(sn).sort((a, b) => (b.at || 0) - (a.at || 0))[0]; const el = document.getElementById("tkSweep"); if (el && L) el.textContent = `Last full check: ${L.date || ""} · ${L.checked || 0} items checked · ${L.changed || 0} changed`; }, () => {}); } catch (e) {}
    paintSync();
    col.onSnapshot((snap) => { serverRows = norm(snap); if (canWrite) sync.observe(serverRows); publish(); }, () => { body.innerHTML = '<tr><td colspan="5" class="note">The tracker could not load. Reload the page to try again.</td></tr>'; });
  }

  return { create, boot, DRAFT_KEY, MSG, patchApplied, rebaseable };
});
