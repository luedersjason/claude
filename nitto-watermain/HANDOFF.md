# Nitto Public Watermain portal

Static site (plain HTML + PDFs, no build server). Same look as the c251 portal, separate project.

- Edit `_data.json` (steps, issues, obligations, timeline, contacts), run `python3 _build.py`, bump `VERSION` in `_build.py`, commit `vNN - description`.
- Hosting target: own private GitHub repo + Cloudflare Pages, git-connected, auto-deploy on push to main (same pattern as c251).
- Sources: Village DA approval packet 8/25/26, Pinnacle project manual + plans 11/3/26, KWU approval 11/4/26, email threads through 11/4/26.
