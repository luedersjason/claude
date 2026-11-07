import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import { createMemoryDb, applyMutation, listCollection, parseIfMatch } from "../src/docstore.js";
import "../public/tracker-sync.js";

const { create } = globalThis.NittoTrackerSync;

function mem() {
  const data = new Map();
  return {
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { data.set(k, String(v)); },
  };
}
function row(over = {}) {
  return { _id: "N-16", _ver: 1, ref: "N-16", title: "Fix the project manual", status: "Open", owner: "Pinnacle", area: "Design", updated: "11/4", ...over };
}
async function issue(db, id = "N-16") {
  return db.get("issues", id);
}

test("an edit stays local until Send, and Send writes that record once", async () => {
  const db = createMemoryDb([{ col: "issues", id: "N-16", data: { ref: "N-16", title: "Fix the project manual", status: "Open", updated: "11/4" }, ver: 1 }]);
  const sync = create({ storage: mem() });
  let calls = 0;
  sync.patchUpdate(row(), { status: "In progress", updated: "11/7" });
  assert.equal((await issue(db)).data.status, "Open");
  assert.equal(sync.status().phase, "unsaved");
  assert.equal(sync.overlay([row()])[0].status, "In progress");
  assert.equal(sync.overlay([row()])[0]._dirty, true);
  assert.equal(row().status, "Open");
  const result = await sync.send(async (op) => {
    calls += 1;
    assert.equal(op.method, "PATCH");
    assert.equal(op.ifMatch, 1);
    assert.deepEqual(op.body, { status: "In progress", updated: "11/7" });
    const res = await applyMutation(db, { col: "issues", id: op.id, method: op.method, body: op.body, expect: op.ifMatch, personId: "jason", now: 10 });
    return { ok: res.status === 200, status: res.status, ver: res.body.ver, data: res.body.data };
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, true);
  assert.equal((await issue(db)).data.status, "In progress");
  assert.equal((await issue(db)).ver, 2);
  assert.equal(sync.status().phase, "saved");
  const again = await sync.send(async () => { calls += 1; return { ok: true, status: 200 }; });
  assert.equal(again.requests, 0);
  assert.equal(calls, 1);
});

test("repeated Send clicks share one request", async () => {
  const sync = create({ storage: mem() });
  sync.patchUpdate(row(), { pri: true });
  let calls = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const request = async (op) => {
    calls += 1;
    await gate;
    return { ok: true, status: 200, ver: op.ifMatch + 1, data: { ...row(), ...op.body } };
  };
  const first = sync.send(request);
  const second = sync.send(request);
  assert.equal(first, second);
  release();
  const result = await first;
  assert.equal(calls, 1);
  assert.equal(result.requests, 1);
  assert.equal(sync.isDirty(), false);
});

test("a failed send keeps the draft for a later retry and a reload", async () => {
  const storage = mem();
  const sync = create({ storage });
  sync.patchUpdate(row(), { status: "Done", updated: "11/7" });
  const failed = await sync.send(async () => { throw new Error("offline"); });
  assert.equal(failed.ok, false);
  assert.equal(sync.isDirty(), true);
  assert.equal(sync.status().phase, "error");
  assert.match(sync.status().message, /still on this page/);
  const reloaded = create({ storage });
  assert.equal(reloaded.isDirty(), true);
  assert.equal(reloaded.overlay([row()])[0].status, "Done");
  let calls = 0;
  const ok = await reloaded.send(async (op) => {
    calls += 1;
    assert.equal(op.id, "N-16");
    assert.equal(op.body.status, "Done");
    return { ok: true, status: 200, ver: 2, data: { status: "Done", updated: "11/7" } };
  });
  assert.equal(calls, 1);
  assert.equal(ok.ok, true);
  assert.equal(create({ storage }).isDirty(), false);
});

test("a stale conflict does not overwrite the server copy and keeps the draft", async () => {
  const db = createMemoryDb([{ col: "issues", id: "N-16", data: { ref: "N-16", title: "Fix the project manual", status: "Open", updated: "11/4" }, ver: 1 }]);
  await applyMutation(db, { col: "issues", id: "N-16", method: "PATCH", body: { status: "In progress" }, expect: 1, personId: "other", now: 2 });
  const sync = create({ storage: mem() });
  sync.patchUpdate(row(), { status: "Done", updated: "11/7" });
  let calls = 0;
  const result = await sync.send(async (op) => {
    calls += 1;
    const res = await applyMutation(db, { col: "issues", id: op.id, method: op.method, body: op.body, expect: op.ifMatch, personId: "jason", now: 3 });
    return { ok: res.status === 200, status: res.status, ver: res.body.ver, data: res.body.data, message: res.body.message };
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.sawConflict, true);
  const saved = await issue(db);
  assert.equal(saved.data.status, "In progress");
  assert.equal(saved.data.updated, "11/4");
  assert.equal(sync.overlay([{ ...row(), _ver: saved.ver, status: saved.data.status }])[0].status, "Done");
  assert.equal(sync.status().phase, "error");
});

test("a lost response that already saved is not written again", async () => {
  const sync = create({ storage: mem() });
  sync.patchUpdate(row(), { status: "In progress", updated: "11/7" });
  let calls = 0;
  const result = await sync.send(async () => {
    calls += 1;
    return { ok: false, status: 409, ver: 2, data: { ref: "N-16", title: "Fix the project manual", status: "In progress", updated: "11/7" } };
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, true);
  assert.equal(sync.isDirty(), false);
});

test("an unrelated server edit is retried once against the new version", async () => {
  const db = createMemoryDb([{ col: "issues", id: "N-16", data: { ref: "N-16", title: "Fix the project manual", status: "Open", next: "old", updated: "11/4" }, ver: 1 }]);
  const sync = create({ storage: mem() });
  sync.patchUpdate(row({ next: "old" }), { status: "In progress", updated: "11/7" });
  const seen = [];
  const result = await sync.send(async (op) => {
    seen.push(op.ifMatch);
    if (op.ifMatch === 1) {
      await applyMutation(db, { col: "issues", id: "N-16", method: "PATCH", body: { next: "from someone else" }, expect: 1, personId: "other", now: 2 });
      const cur = await issue(db);
      return { ok: false, status: 409, ver: cur.ver, data: cur.data };
    }
    const res = await applyMutation(db, { col: "issues", id: op.id, method: op.method, body: op.body, expect: op.ifMatch, personId: "jason", now: 3 });
    return { ok: res.status === 200, status: res.status, ver: res.body.ver, data: res.body.data };
  });
  assert.deepEqual(seen, [1, 2]);
  assert.equal(result.ok, true);
  const saved = await issue(db);
  assert.equal(saved.data.status, "In progress");
  assert.equal(saved.data.next, "from someone else");
});

test("a new item is not created until Send, and a retry uses the same id", async () => {
  const db = createMemoryDb([]);
  const storage = mem();
  const sync = create({ storage });
  const made = sync.create({ ref: "N-41", title: "CAD file", status: "Open", owner: "Pinnacle", area: "Design" });
  assert.equal(made.duplicate, false);
  assert.equal(sync.create({ ref: "N-41", title: "CAD file again", status: "Open" }).duplicate, true);
  assert.equal((await listCollection(db, "issues")).docs.length, 0);
  let calls = 0;
  const fail = await sync.send(async (op) => {
    calls += 1;
    assert.equal(op.method, "PUT");
    assert.equal(op.ifMatch, 0);
    assert.equal(op.id, "N-41");
    throw new Error("offline");
  });
  assert.equal(fail.ok, false);
  assert.equal(calls, 1);
  const retry = await sync.send(async (op) => {
    calls += 1;
    assert.equal(op.id, "N-41");
    const res = await applyMutation(db, { col: "issues", id: op.id, method: "PUT", body: op.body, expect: 0, personId: "jason", now: 4 });
    return { ok: res.status === 200, status: res.status, ver: res.body.ver, data: res.body.data };
  });
  assert.equal(retry.ok, true);
  assert.equal((await listCollection(db, "issues")).docs.length, 1);
  assert.equal((await issue(db, "N-41")).data.title, "CAD file");
  const second = await sync.send(async () => { calls += 1; return { ok: true }; });
  assert.equal(second.requests, 0);
});

test("creating an id that already exists does not replace that record", async () => {
  const db = createMemoryDb([{ col: "issues", id: "N-41", data: { ref: "N-41", title: "Already there", status: "Open" }, ver: 4 }]);
  const sync = create({ storage: mem() });
  sync.create({ ref: "N-41", title: "Mine", status: "Open" });
  const result = await sync.send(async (op) => {
    const res = await applyMutation(db, { col: "issues", id: op.id, method: "PUT", body: op.body, expect: op.ifMatch, personId: "jason", now: 5 });
    return { ok: res.status === 200, status: res.status, ver: res.body.ver, data: res.body.data };
  });
  assert.equal(result.ok, false);
  assert.equal((await issue(db, "N-41")).data.title, "Already there");
  assert.equal(sync.isDirty(), true);
});

test("two tabs keep each other's unsent edits", () => {
  const storage = mem();
  const a = create({ storage });
  const b = create({ storage });
  a.patchUpdate(row(), { status: "In progress", updated: "11/7" });
  b.patchUpdate(row({ _id: "N-19", ref: "N-19", title: "Issue for bid" }), { pri: true });
  a.reload();
  const view = a.overlay([row(), row({ _id: "N-19", ref: "N-19", title: "Issue for bid" })]);
  assert.equal(view.find((r) => r._id === "N-16").status, "In progress");
  assert.equal(view.find((r) => r._id === "N-19").pri, true);
});

test("toggling priority back to the saved value clears the draft", () => {
  const sync = create({ storage: mem() });
  const base = row({ pri: false });
  sync.patchUpdate(base, { pri: true });
  assert.equal(sync.isDirty(), true);
  sync.patchUpdate(base, { pri: false });
  assert.equal(sync.isDirty(), false);
  assert.equal(sync.status().message, "Saved");
});

test("discard removes a stored draft", () => {
  const storage = mem();
  const sync = create({ storage });
  sync.patchUpdate(row(), { status: "Done", updated: "11/7" });
  sync.discardAll();
  assert.equal(create({ storage }).isDirty(), false);
});

test("If-Match parsing and list versions", async () => {
  const headers = (value, has = true) => ({ has: () => has, get: () => value });
  assert.equal(parseIfMatch({ headers: headers("", false) }), undefined);
  assert.equal(parseIfMatch({ headers: headers("3") }), 3);
  assert.equal(parseIfMatch({ headers: headers('"3"') }), 3);
  assert.equal(parseIfMatch({ headers: headers("nope") }), null);
  const db = createMemoryDb([{ col: "issues", id: "N-01", data: { ref: "N-01", status: "Done" }, ver: 2 }]);
  const listed = await listCollection(db, "issues");
  assert.equal(listed.docs[0].ver, 2);
  assert.match(listed.etag, /^"1-/);
});

test("listeners load once and do not schedule another data fetch while hidden or idle", async () => {
  const src = fs.readFileSync(new URL("../public/claude-shim.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /document\.hidden \? 15000 : 4000/);
  const fetches = [];
  const timers = [];
  const context = {
    console,
    URL,
    document: { hidden: true, body: { appendChild() {}, removeChild() {} } },
    location: { pathname: "/" },
    fetch: async (url) => {
      fetches.push(String(url));
      return {
        ok: true,
        status: 200,
        headers: { get: () => '"1-1-1"' },
        text: async () => JSON.stringify({ docs: [{ id: "N-16", ver: 1, data: { ref: "N-16", status: "Open" } }] }),
        json: async () => ({ ok: true }),
      };
    },
    setTimeout: (fn, ms) => { timers.push(ms); return 0; },
    clearTimeout() {},
    setInterval: () => { throw new Error("setInterval"); },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(src, context);
  const db = await context.window.claude.use("db");
  const names = ["reviewItems", "reviews", "asks", "validations", "sweeps", "issues", "feed", "posts", "markups", "doclog", "meetings", "validations"];
  let ready = 0;
  await new Promise((resolve, reject) => {
    for (const name of names) {
      db.collection(name).onSnapshot(() => { ready += 1; if (ready === names.length) resolve(); }, reject);
    }
  });
  assert.equal(fetches.length, names.length);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(fetches.length, names.length);
  assert.deepEqual(timers, []);
  const issues = db.collection("issues");
  await issues.refresh();
  assert.equal(fetches.length, names.length + 1);
  assert.ok(fetches.every((u) => u.startsWith("/api/c/")));
});

test("the watermain page exposes Send and does not write the tracker from a click handler", () => {
  const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="tkSend"/);
  assert.match(html, /src="tracker-sync.js"/);
  assert.match(html, /Nothing is saved for the team until you press Send/);
  const tracker = html.slice(html.indexOf("(async function tracker(){"), html.indexOf("(function directory(){"));
  assert.doesNotMatch(tracker, /\.update\(|\.set\(/);
  assert.match(tracker, /NittoTrackerSync\.boot/);
});
