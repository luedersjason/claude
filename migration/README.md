# Claude Account Migration — Export Kit

Tools and runbooks for migrating Jason's Claude account (work email) to a new
personal account. This repo is **public** — nothing in this folder may contain
webhook URLs, API keys, or personal data. The full versions of these documents
(with IDs and secrets) live in Google Drive: `_MIGRATION` folder
(`1zSbGsVaU7ci3yCgKCMyWPoJ2hWZli6Ol`).

## Contents

| File | Purpose |
|---|---|
| `process_claude_export.py` | Turns the claude.ai privacy-settings export zip into a rebuild-ready archive: per-conversation markdown, project custom instructions, knowledge-file text, inventory CSV, and upload-sized bundles. Stdlib-only, Python 3.8+. |
| `REBUILD_RUNBOOK.md` | The import-side runbook the NEW account follows to rebuild projects, memory, and routines. Redacted copy — the authoritative copy with IDs/secrets is in Drive `_MIGRATION`. |

## The key insight

The extraction runbook running in the old account assumed project **custom
instructions** were unrecoverable (no tool can read them). The account data
export makes that fear obsolete: `projects.json` in the export zip contains
each project's `prompt_template` (the custom instructions, verbatim) plus text
extracts of every knowledge file. Running `process_claude_export.py` recovers
all of it. Only the **original binaries** (PDF/XLSX knowledge files) still need
manual download — and most already live in these GitHub repos.

## Usage

```bash
python3 process_claude_export.py path/to/data-export.zip -o processed/
```

Then follow `REBUILD_RUNBOOK.md` from the new account.
