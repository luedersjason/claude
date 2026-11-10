# zpg-site-platform

Platform rule (playbook rule 12): any change to how a site looks or works goes into
the template (`template/`, `public/claude-shim.js`) AND every connected site in the
same session, verified by grep before reporting done:
- Nitto Watermain + L152: this folder, `public/` (branch claude/gallant-allen-1vreeq)
- C251 + C251 Utilities: repo luedersjason/c251-caledonia-portal, main, `public/` and `public/utilities/`, built from `projects/c251*` (check it out next to this repo)

Read `project-site-playbook.md` before changing anything.
