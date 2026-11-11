# zpg-site-platform

Platform rule (playbook rule 12): any change to how a site looks or works goes into
the template (`template/`, `public/claude-shim.js`) AND every connected site in the
same session, verified by grep before reporting done:
- Nitto Watermain + L152: this folder, `public/` (branch claude/gallant-allen-1vreeq)
- C251 + C251 Utilities: repo luedersjason/c251-caledonia-portal, main, `public/` and `public/utilities/`, built from `projects/c251*` (check it out next to this repo)

`tools/build_site.py --check` now FAILS (exit 1) when the C251 checkout is missing; it used to
print SKIPPED and pass, which is how the 11/11 Download PDF change shipped without C251.
If this session cannot reach luedersjason/c251-caledonia-portal, the change is NOT done: route the
C251 build to a session that has that repo (or the G14), and say so in the report.

C251 AUTO-SYNC (forever fix, 11/11): luedersjason/c251-caledonia-portal runs
`.github/workflows/template-sync.yml` (source: `tools/c251-autosync/template-sync.yml`) hourly and on
demand. It checks out this public branch, builds c251 + c251-utilities, and pushes only if the pages
changed. So a template change pushed here reaches C251 within the hour with no session needing that
repo. Do not edit C251's built pages by hand; change template/ or projects/c251*/project.json here.

Read `project-site-playbook.md` before changing anything.
