// Drives the real watermain page against test/dev-server.mjs.
const puppeteer = await import(process.env.PUPPETEER || "puppeteer-core");

const base = process.env.BASE || "http://127.0.0.1:4173";
const shotDir = process.env.SHOT_DIR || "/tmp/tracker-shots";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function state() {
  return page.$eval("#tkSync", (el) => ({ phase: el.dataset.phase, text: document.getElementById("tkSyncState").textContent, send: document.getElementById("tkSend").textContent, disabled: document.getElementById("tkSend").disabled }));
}
async function serverDoc(id) {
  const r = await fetch(base + "/_test/doc/issues/" + id);
  if (r.status === 404) return null;
  return r.json();
}
async function apiCountSince(t) {
  const log = await (await fetch(base + "/_test/log")).json();
  return log.filter((e) => e.t >= t && e.path.startsWith("/api/c/")).length;
}

await page.setViewport({ width: 1440, height: 900 });
await page.goto(base + "/#tracker", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => /open/.test((document.getElementById("tkCounts") || {}).textContent || ""), { timeout: 20000 });
await page.click('#tkGrpSw [data-tg="none"]');
await page.waitForSelector("button.st");
const label = await page.$eval("button.st", (b) => ({ id: b.dataset.id, text: b.textContent.trim() }));
const before = await serverDoc(label.id);
if (!before) throw new Error("missing seed issue " + label.id);
const beforeStatus = before.data.status;

const quietAt = Date.now();
await sleep(5000);
const idle = await apiCountSince(quietAt);
if (idle !== 0) throw new Error("idle page made " + idle + " collection requests");

await page.click("button.st");
const unsaved = await state();
if (unsaved.phase !== "unsaved") throw new Error("expected unsaved, got " + JSON.stringify(unsaved));
if ((await serverDoc(label.id)).data.status !== beforeStatus) throw new Error("status was saved before Send");
await page.screenshot({ path: shotDir + "/unsaved.png" });

await page.evaluate(() => { const b = document.getElementById("tkSend"); b.click(); b.click(); });
await page.waitForFunction(() => document.getElementById("tkSync").dataset.phase === "saved", { timeout: 10000 });
const writes = await (await fetch(base + "/_test/log")).json();
const patches = writes.filter((e) => e.method === "PATCH" && e.path === "/api/c/issues/" + label.id);
if (patches.length !== 1) throw new Error("expected 1 PATCH, got " + patches.length);
const after = await serverDoc(label.id);
if (after.data.status === beforeStatus) throw new Error("Send did not change status");

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => /open/.test((document.getElementById("tkCounts") || {}).textContent || ""), { timeout: 20000 });
await page.click('#tkGrpSw [data-tg="none"]');
await page.waitForFunction((id, status) => {
  const b = document.querySelector(`button.st[data-id="${id}"]`);
  return b && b.textContent.trim() === status;
}, { timeout: 10000 }, label.id, after.data.status === "In progress" ? "In progress" : after.data.status);
const reloaded = await state();
if (reloaded.phase !== "saved") throw new Error("reload lost the saved state: " + JSON.stringify(reloaded));

await page.setOfflineMode(true);
await page.click(`button.st[data-id="${label.id}"]`);
await page.click("#tkSend");
await page.waitForFunction(() => document.getElementById("tkSync").dataset.phase === "error", { timeout: 10000 });
const during = await serverDoc(label.id);
if (during.data.status !== after.data.status || during.ver !== after.ver) throw new Error("failed send changed the server");
const kept = await page.$eval(`button.st[data-id="${label.id}"]`, (b) => b.textContent.trim());
await page.setOfflineMode(false);
await page.click("#tkSend");
await page.waitForFunction(() => document.getElementById("tkSync").dataset.phase === "saved", { timeout: 10000 });
const finalDoc = await serverDoc(label.id);
if (finalDoc.ver !== after.ver + 1) throw new Error("retry did not write exactly once: " + after.ver + " -> " + finalDoc.ver);

await page.screenshot({ path: shotDir + "/saved-after-retry.png" });
console.log(JSON.stringify({
  ok: true,
  id: label.id,
  from: beforeStatus,
  saved: after.data.status,
  offlineKept: kept,
  retried: finalDoc.data.status,
  idleRequests: idle,
  patches: patches.length,
  errors,
}, null, 2));
await browser.close();
