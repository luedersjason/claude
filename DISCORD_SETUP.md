# Fifth Column server setup

Builds **Insurgency Protocol: The Fifth Column** from a JSON spec: roles,
categories, channels, and webhooks. Idempotent — re-running only fills in
what's missing, and it never deletes anything.

- `setup_discord.py` — the script. Standard library only, no `pip install`.
- `discord_server.json` — the layout. Edit this, not the script.

## 1. Create the bot (~3 min, one time)

1. https://discord.com/developers/applications → **New Application** → name it
   (e.g. "Fifth Column Ops").
2. **Bot** tab → **Reset Token** → copy it. This is the only time it's shown.
   It goes in a file or an env var — never in a Discord message, never in git.
3. **OAuth2 → URL Generator** → scope **bot** → permissions **Manage Roles**,
   **Manage Channels**, **Manage Webhooks**.
4. Open the generated URL, pick the Fifth Column server, authorize.

## 2. Raise the bot's role

Server Settings → Roles → drag the bot's role **above** Command, Handler,
Operative, and Recruit.

Discord refuses to let a bot create or edit a role positioned above its own.
This is the `ManageRoles` wall from the RC2/1RS work — same cause, same fix.

## 3. Run it

```bash
export DISCORD_BOT_TOKEN='paste-token-here'   # or let the script prompt you

python3 setup_discord.py --dry-run            # preview, changes nothing
python3 setup_discord.py                      # build it
python3 setup_discord.py --out webhooks.json  # build + save webhook URLs
```

No token on the command line? The script prompts with hidden input. That keeps
it out of your shell history.

Useful flags:

| Flag | Effect |
|------|--------|
| `--dry-run` | Print the plan, touch nothing |
| `--list-guilds` | List the bot's servers (to find a guild id) |
| `--guild-id ID` | Target a specific server; inferred if the bot is in only one |
| `--token-file F` | Read the token from a file |
| `--spec F` | Use a different layout file |
| `--out F` | Write webhook URLs to JSON, mode 600 |

Guild id is only needed if the bot is in more than one server.

## 4. Afterward

- **Community mode** — Server Settings → Enable Community. Do this *after* the
  build. It unlocks announcement channels, discovery, and membership screening.
  To convert `#announcements` to a real announcement channel, do it in the
  Discord UI (creating type-5 channels requires Community to already be on).
- **Server icon** — upload the 512px circular PNG in Server Settings.
- **Invite link** — right-click a channel → Invite → Edit invite link → expiry
  **Never**, max uses **No limit**. That's the URL for the one-pager footer.
- **Nickname** — set a per-server nickname if you want an admin identity
  distinct from your gamer profile.

## Editing the layout

```json
{
  "name": "OPERATIONS",
  "private_to": ["Command", "Handler"],
  "channels": [
    { "name": "ops-planning", "topic": "...", "slowmode": 30 },
    { "name": "bot-feed", "webhook": "Fifth Column Feed" },
    { "name": "Squad One", "type": "voice" }
  ]
}
```

- `private_to` — hides the category from `@everyone`, grants view to the listed
  roles. Omit it for a public category.
- `webhook` — ensures an incoming webhook by that name; the URL is printed at
  the end. Everything else in a channel entry is optional.
- `type` — `text` (default), `voice`, `announcement`, `forum`, `stage`.
- Permission names in `roles` are Discord's own (`VIEW_CHANNEL`,
  `MANAGE_MESSAGES`, …); an unknown one fails fast with the valid list.

Add entries and re-run. Renaming an entry creates a *new* role or channel — the
old one is left alone for you to delete by hand.

## Webhook URLs are secrets

Anyone holding one can post to that channel as the bot. `--out` writes mode
`0600`, and `webhooks.json` / `*.webhooks.json` / `.env` are gitignored. If one
leaks, delete the webhook in channel settings and re-run to mint a new one.
