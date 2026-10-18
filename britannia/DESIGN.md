# Britannia (working title) — Design Decisions

First-person, single-player-first re-creation of Ultima Online (T2A era).
Status: pre-production. Decisions locked 2026-10-18.

## Core pillar

**Automation is the game.** Not a twitch/reflex game. The appeal is building macros that partially play the character: complex, reliable, unattended. Combat is auto-swing; skill training, gathering and crafting are designed to be scripted. The macro system is a first-class game system, not an add-on.

## Locked decisions

| # | Topic | Decision | Notes |
|---|-------|----------|-------|
| 1 | Players | Solo first, online later | Built as local authoritative server + client from day one so multiplayer is an add-on, not a rewrite. |
| 2 | Map source | Import from official UO client data, convert once to our own format | Client: free "Endless Journey" account, https://uo.com/endless-journey/ . Private use only; EA terms on data use unverified. |
| 3 | Era | The Second Age (T2A): Britannia + Lost Lands, single world, no Trammel/Felucca | Modern client map likely has post-2000 changes — diff against T2A-era maps before locking. Skill/stat caps and gain rules to be sourced from 1998–2000 publish notes, not assumed. |
| 4 | Engine | Godot 4.x | 4.4.1 verified running headless in the cloud dev container 2026-10-18. Confirm latest stable before pinning. |
| 5 | Art | Low-poly placeholder, swappable | Logic references asset IDs only; one manifest maps IDs to art. Lock world scale (meters per UO tile) and character rig early. |
| 6 | Combat | UO-style: target + auto-swing on timer, skill-based hit rolls | |

## Built-in QoL (UOAssist parity)

Jason used UOAssist (paid UO assistant). Its features ship as native game features:
- Skill panel: current skill/stat values, gains since login, raise/lower/lock per skill.
- Resource counters (reagents/supplies), auto-updating; item count on container open.
- Gear sets: dress/undress, arm/disarm, weapon sets on hotkeys.
- Auto-loot rules (gold, reagents, potions, weapons).
- Hotkeys + macro system supporting unattended (AFK) skill training: loops, waits, conditions (mana/HP thresholds), targeting. AFK macroing is allowed by design.

## Machines

- **Build:** cloud sessions + G14 (inside ecosystem boundary). UO client installed on the G14 for map extraction.
- **Play:** Alienware Aurora ACT1250 (RTX 5070 12 GB, Core Ultra 7 265KF, 32 GB, Win 11 Home). Outside the boundary: it only downloads and runs finished builds. No Claude access to it.
- **Delivery:** Windows exports published to GitHub Releases (or Drive); Jason downloads on the Alienware.

## Architecture rules

- **Simulation** (world, skills, combat, NPCs, persistence) has no rendering/input dependencies.
- **Client** sends intents (`move`, `attack target`, `use skill`) and renders state; never mutates state.
- Simulation decides all outcomes (gains, damage, loot).
- Persistence: SQLite-compatible schema.
- Art via asset-ID manifest; terrain data separate from terrain renderer.

## Open items

- [ ] Jason: create Endless Journey account, install Classic Client on the G14 (not the Alienware), copy `map*`, `statics*`, `tiledata*` (exact list TBD) to `G:\My Drive\uo-data\`.
- [ ] Source T2A-era skill list, caps, gain and atrophy rules (primary sources).
- [ ] Decide world scale (meters per tile).
- [ ] Confirm latest Godot stable; pin version.
- [ ] Systems backlog to rank: magic/reagents, crafting/gathering, vendors/bank, monsters/spawns/loot, death/ghost, housing, mounts.

## Milestone 1 (vertical slice)

Britain + surrounding countryside + one dungeon; 7 use-based skills (hally mage: Magery, Evaluating Intelligence, Meditation, Resisting Spells, Wrestling, Swordsmanship, Tactics; 700 total cap pending T2A verification); UO-style combat; one vendor; save/load.
