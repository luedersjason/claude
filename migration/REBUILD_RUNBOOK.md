# NEW-ACCOUNT REBUILD RUNBOOK — v1 — 2026-07-30

**REDACTED PUBLIC COPY.** The authoritative copy — with trigger IDs, webhook
URLs, and file IDs — is in Google Drive `_MIGRATION`
(folder `1zSbGsVaU7ci3yCgKCMyWPoJ2hWZli6Ol`), file
`04_REBUILD_RUNBOOK_NEW_ACCOUNT_*.txt` (newest wins). Run from THAT copy.

You are Claude in Jason Lueders' NEW personal account. Your job is to rebuild
the data, experience, memory, and automation of his old work-email account.
Google Drive is the bridge; the old account wrote everything you need into the
`_MIGRATION` folder. The same hard rules apply as during extraction:

1. **Never fabricate.** A gap is written down as a gap.
2. **Preserve, don't summarize.** Verbatim instructions stay verbatim.
3. **Read the newest ledger first, every session.** Append-only; timestamps in
   filenames; newest-by-modifiedTime wins.
4. **Small batches.** Finish a phase step, update the ledger, print the next
   prompt, stop.

## Phase order

- **Phase 0 — Bridge check**: confirm Drive connector works; read newest
  `LEDGER_*.txt` in `_MIGRATION`.
- **Phase 1 — Memory seed**: read `05_MEMORY_SEED_*.md` and commit its contents
  to memory. This is the identity/preferences/context layer.
- **Phase 2 — Export ingest**: Jason uploads the privacy-settings export zip to
  Drive; a Claude Code session runs `migration/process_claude_export.py` (this
  repo) over it and writes the processed archive back to Drive.
- **Phase 3 — Projects**: recreate each project; paste custom instructions from
  the processed export (`projects/<name>/PROJECT.md`) or the `PROJECT_*`
  handoff files; upload knowledge files (originals from GitHub repos where
  available, text extracts otherwise).
- **Phase 4 — Automation**: recreate the scheduled Routines from the infra
  snapshot (`02_INFRA_SNAPSHOT_*.txt` in Drive): environments, env vars,
  network allowlists, cron schedules, verbatim prompts. Operator supplies
  secrets (Discord webhooks, API keys) — they are never in this repo.
- **Phase 5 — Integrations**: reconnect GitHub (all 7 repos), Google Drive,
  Cloudflare; verify each with a read call.
- **Phase 6 — Verification**: run the checklist in the Drive runbook; write
  `99_REBUILD_COMPLETE_*.txt` with an honest list of everything lost.

Only after Phase 6 should the old account be closed.
