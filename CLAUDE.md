# Context for whoever picks this up

Jason (luedersjason@gmail.com). Read this before asking him anything — he has
re-explained this project across several sessions already and it is reasonable
of him to expect you to arrive informed.

## Standing preferences

- **Do not hand him a numbered click-path through an app.** It reads fine and
  fails in practice: menus don't match, and he arrives somewhere with no
  context. Deliver something that runs, or do the work. If a manual step is
  genuinely unavoidable (Discord dev portal, 2FA, icon upload), say so plainly
  and keep it to the shortest possible list at the end.
- **Say what you cannot do, immediately.** Don't discover the blocker three
  steps in.
- He does not want to be asked questions he isn't positioned to answer —
  decide technical things yourself and state the assumption.
- **Secrets discipline** (from a real May 2026 incident where API keys leaked
  into git history and Discord backups): tokens go in `.env` or a prompt, never
  in chat, never in git. `SECURITY-REDLINES.md` came out of that.

## Environment facts that have bitten before

- **Claude Code on the web runs in a remote container, not on his machine.**
  Files in his Downloads are not reachable. Say this before proposing anything
  that assumes local files.
- **discord.com is blocked by the egress proxy** (`connect_rejected`, 403 to
  CONNECT). Verified 2026-08-05. No Discord API call can be made from a web
  session — a script is the only deliverable, he runs it locally.
- Outbound HTTPS is proxied with a custom CA at `/root/.ccr/ca-bundle.crt`.
  This is what broke the TQQQ routine repeatedly (see `DIAGNOSIS.md`).
- The `cryptography` module is broken in this image; `pypdf` needs its import
  blocked to work.

## The two projects in this repo

### 1. TQQQ JHA engine (`tqqq_jha_engine.py`, `DIAGNOSIS.md`)
Scheduled routine, ~3x/day, evaluates a Jha-style TQQQ timing model, writes
state to Google Drive, posts to a Discord webhook. Advisory only — but note he
manually mirrors a related strategy (StratC) in a **real** account, so accuracy
matters. The recurring `DATA_ERROR` was the proxy/TLS issue above, now baked in.

### 2. Insurgency Protocol: The Fifth Column (`setup_discord.py`)
Arma Reforger community + Discord server. Asymmetric PvPvE: US Forces hold a
fixed FOB with top-tier gear; Soviet Forces spawn among civilians — unarmed is
invisible, armed is fair game. Two modes: THE INSURGENCY (persistent, 24/7,
dynamic missions) and THE OPERATIONS (scheduled, GM-run milsim, rank unlocks
gear).

- Guild ID `1534369454807318599`, invite `discord.gg/Qr4JZJmaVq`
- Co-admin: **Inkslinger**. Both get the Command role.
- Roles: Command, GM, Doctrine Certified, US Forces, Soviet Forces, Operative
- Brand: tan `#C9A86A`, red `#D0402E`, blue `#3A7EBF`, grey `#95A5A6`
- Tagline: "One side has the firepower. The other has the disguise."
- A one-pager PDF and circular logo exist; they were produced in a claude.ai
  chat and are not in this repo.

`setup_discord.py` builds and hardens the server from `discord_server.json`.
Standard library only, idempotent, run locally. See `DISCORD_SETUP.md`.

## History worth not relearning

- **OpenClaw / LC1** was his self-hosted Claude Discord bot on a Linux VM. It
  died 2026-06-25 and is not coming back. Do not propose handing work to it.
- **The ManageRoles wall**: a bot cannot create or edit a role positioned above
  its own. Hit on 1RS and RC2. Always mention role hierarchy up front.
- **The "Elsie" incident** (2026-04-17): a member renamed the bot server-wide
  because permissions weren't scoped per-user. Led to trust tiers.
- Drive folder `discord_notes/` holds 12 channel-by-channel summaries of the
  old LC1 server, plus `_SERVER_SUMMARY.md`.
