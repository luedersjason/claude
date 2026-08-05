# Paste this into any Claude that needs to help with the Discord server

Everything below is self-contained. It assumes no prior conversation.

---

**Project:** Insurgency Protocol: The Fifth Column — an Arma Reforger community.
Asymmetric PvPvE: US Forces hold a fixed FOB with top-tier gear; Soviet Forces
spawn among civilians (unarmed = invisible, armed = fair game). Two modes: THE
INSURGENCY (persistent, 24/7) and THE OPERATIONS (scheduled, GM-run milsim,
rank unlocks gear). Tagline: "One side has the firepower. The other has the
disguise."

**Discord server:** Insurgency Protocol: The Fifth Column
- Guild ID `1534369454807318599`
- Invite `discord.gg/Qr4JZJmaVq`
- Owner: Jason (mojo). Co-admin: **Inkslinger**. Both get the Command role.
- Brand colors: tan `#C9A86A`, red `#D0402E`, blue `#3A7EBF`, grey `#95A5A6`

**Structure** (built by `setup_discord.py` in github.com/luedersjason/claude,
branch `claude/discord-bot-setup-code-i1mxbw`):
- Roles: Command, GM, Doctrine Certified, US Forces, Soviet Forces, Operative
- 📋 COMMAND POST — welcome, rules, announcements, op-schedule (all read-only)
- ⚔ THE INSURGENCY — general, lfg-squad-up, intel-and-tactics,
  clips-and-highlights, suggestions
- 🎖 THE OPERATIONS — op-signups, op-briefings (read-only), op-debriefs
- 🔒 STAFF — admin-chat, reports, mod-log (Command + GM only)
- 🔊 VOICE — Lobby, us-forces, russian-forces, underground-radio, Gaming, Ops Net

**Security posture already applied by the script:** verification HIGH, explicit
content filter on, `@everyone` can talk/react/use voice but **cannot** post
links or files, mass-mention, or create invites (faction roles grant those
back). AutoMod blocks scam bait, mention raids, spam, and slurs. Community mode
on. Command has explicit powers, deliberately **not** ADMINISTRATOR.

**The four things left, which no bot is permitted to do:**
1. Give Jason and Inkslinger the **Command** role
2. Server Settings → Safety Setup → require 2FA for moderators
3. Server Settings → Overview → upload the server icon
4. Kick the setup bot, then Reset Token in the dev portal

**How Jason wants to be worked with:**
- Don't hand him a numbered click-path through an app. Do the work, or say
  plainly that you can't and why — immediately, not three steps in.
- Decide technical details yourself and state the assumption.
- Secrets never go in chat or git. A real key leak happened in May 2026.

---

If you can drive this browser and Discord is open and logged in, do the four
items above. If you can't drive the browser, say so in your first sentence.
