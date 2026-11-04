# Nitto project portal (Zilber Industrial 3 at LakeView, Pleasant Prairie)

Future full project portal like c251. For now it holds ONE page: `watermain.html` (public watermain / DA financial security). `index.html` just redirects to it until the main portal page exists; then watermain.html becomes a linked sub-page (like c251's utilities.html).

- Watermain page: edit `_data.json`, run `python3 _build.py`, bump `VERSION` in `_build.py`, commit `vNN - description`.
- Docs: `NW-*.pdf` in this folder (NW = Nitto watermain). Future building docs: `Z3-NITTO-*.pdf`.
- Hosting target: private repo luedersjason/nitto-portal + Cloudflare Pages, git-connected, auto-deploy on push to main. Not created yet.
