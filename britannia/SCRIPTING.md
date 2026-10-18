# The Script Builder — Design (draft 2026-10-18)

Goal: engineering your own automation is **easy to start, fun to improve, and never required**. Manual "grind it out" play is a full, unpenalized way to play.

## Hard rules
1. Nothing pre-built. No default macros or templates.
2. Scripts can do only what the player can do, through the same action queue, cooldowns, cast delays and interruptions. No superhuman speed, no hidden info.
3. Scripts cannot start combat: `attack` and the War Mode toggle are human-input only. T2A auto-defend still applies.
4. Scripts run only while the game runs.
5. No balance penalty or bonus for manual vs scripted play. The same skill-gain rules apply either way.

## Three layers, one engine
All three compile to the same internal program, and any layer can be opened as the next one down.

| Layer | Feels like | For |
|---|---|---|
| **1. Record** | Press record, play by hand, stop. You get an editable action list. (Autonauts' teach-by-demonstration.) | First macro in 30 seconds |
| **2. Rules** | An ordered list of *when CONDITION → do ACTION* cards, checked top to bottom each tick. (FFXII Gambits / Dragon Age tactics.) | Reactive scripts: "when mana < 20 → meditate", "when journal says 'The spell fizzles.' → recast" |
| **3. Script** | Text language (EasyUO-class): variables, loops, functions, events. | Full engineering |

**Recommendation:** layers 1 and 2 ship in Milestone 1; layer 3 follows.

## Building blocks
- **Sensors:** HP, mana, stamina, stats, skills (value, lock, gain this session), weight vs capacity, item counts (reagents, bandages, ore), journal lines (pattern match), nearby mobiles and items (type, distance, hostile/notoriety), target cursor up, current action/cooldown, timers, location.
- **Actions:** use skill, cast spell, target (self, last, object, tile), use item, equip/unequip, gear set, drag/drop, move/step/path to, speak, wait, open container, run another script.
- **Events:** on journal match, on damage taken, on target cursor, on gain, on overweight, on interrupt.

## What makes it fun
1. **The world is the puzzle.** Fizzles, interruptions, empty ore veins, running out of reagents, overweight, a monster wandering in: a script that handles all of these is an achievement. Real T2A failure modes are the content.
2. **Workbench stats (Zachtronics-style).** Every macro run is measured: skill gain per hour, reagents per gain, uptime %, failures by cause, and how long it ran unattended. You see personal-best histograms of your own runs. Optimizing is the endgame for automation players.
3. **A fast iterate loop.** Edit while the macro runs. Live view: highlights the card or line that's firing, shows the values it's reading, and logs why it stopped. Step tick by tick (Factorio-style). Use a test spot (house or training area) to try a script before leaving it AFK.
4. **Readable failures.** When a macro stops, it says exactly why, e.g. "Stopped: out of black pearl at 02:14, 312 casts, +4.1 Magery."
5. **Sharing (later, online):** export and import scripts with friends.

## Open design questions for Jason
- **Progression gating:** should scripting power be earned in-world, e.g. more rule slots or new sensor types as you go (FFXII/Dragon Age model)? Or should everything be open from the start? Recommendation: everything open from the start. Constraints come from the world, not from locked menus. Gating risks feeling like a paywall on fun.
- **Framing:** a plain UI panel, or diegetic (an in-world "tome of routines" you write in)? Recommendation: a plain panel first; theme it later.
