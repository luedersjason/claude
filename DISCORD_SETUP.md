# Fifth Column server setup

## Run this

```bash
python3 setup_discord.py
```

It asks for a bot token, prints a link, waits for you to click it, then builds
and hardens the entire server. Nothing else to configure — the guild ID and
layout are already in `discord_server.json`.

Only one thing has to happen first, because no API can do it:
**https://discord.com/developers/applications → New Application → Bot →
Reset Token → copy.** That's the token it asks for.

Add `--dry-run` to see exactly what it would do without touching anything.

## What it does

Creates the 6 roles (Command, GM, Doctrine Certified, US Forces, Soviet Forces,
Operative), the 5 categories and their channels, posts the welcome and rules
copy, and locks the read-only channels. Then:

| Hardening | Effect |
|---|---|
| Verification HIGH | Account must exist 5+ min and be in-server 10+ min to talk |
| Explicit content filter | Scans all members' attachments |
| `@everyone` baseline | Can talk, react, use voice — **cannot** post links or files, mass-mention, or create invites |
| AutoMod: scam bait | Blocks Nitro/gift/wallet phishing + 10-min timeout |
| AutoMod: mention guard | Blocks 5+ mentions, raid protection on |
| AutoMod: spam + slurs | Blocks both |
| Community mode | Rules screening, onboarding, raid alerts |

The `@everyone` restriction is the anti-raid core: a fresh raid account can't
post a link, drop a file, ping everyone, or mint invites. Faction roles grant
all of that back, so it costs a real member one role assignment. To loosen it,
add permissions to `EVERYONE_BASELINE` in the script.

Command deliberately does **not** get ADMINISTRATOR — it gets every specific
power instead. A compromised Command account can't delete the server, and you
keep full control as owner regardless.

## Afterward (60 seconds, none of it automatable)

1. Give yourself and Inkslinger the **Command** role
2. Server Settings → Safety Setup → require 2FA for moderators
3. Server Settings → Overview → upload the server icon
4. Kick the setup bot, then **Reset Token** in the dev portal

Step 4 matters: it permanently invalidates the token you pasted. After that,
nothing you typed is worth anything to anyone.

## Re-running

Safe, always. Existing roles, channels, and AutoMod rules are reused; nothing is
deleted; the welcome/rules copy is only posted into an empty channel, so it
never double-posts. Edit `discord_server.json`, run it again, only the new
entries get created.

Renaming an entry creates a *new* one — the old is left for you to delete.

## If something fails

`403` almost always means the bot's role sits below the role it's editing.
Server Settings → Roles, drag the bot to the top, re-run.

Hardening steps are independent: one failure prints `SKIP` with the reason and
the rest still apply.
