# L152 building project site

Live at https://nitto-watermain.pages.dev/l152/ (same deployment and sign-in as the watermain site).
Built with `python3 tools/build/build.py l152` into `public/l152/index.html`.
Its data lives in `l152_*` collections (the shim adds the prefix on /l152 pages), so it never mixes with the watermain site.
`seed.l152.json` is the 11/5/26 snapshot the building items came from (migration step 7).
