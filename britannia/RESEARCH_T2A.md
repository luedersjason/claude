# T2A Mechanics Research (2026-10-18)

Baseline for simulation rules. **Source quality warning:** the cloud session could not open period primary sources (mocagh.org reference PDFs, archived uo.com notes; proxy/DNS blocked). Facts come from search snippets and from the RunUO emulator's pre-AoS code (a fan reconstruction, not OSI code). `[FS]` = freeshard source. Re-verify from the G14 before locking numbers.

**Rule for the build:** where T2A primary data is missing, use RunUO pre-AoS values as the default and mark them tunable.

## Era and caps
- UO launch 1997-09-24; T2A 1998; Renaissance 2000-05-04 (https://en.wikipedia.org/wiki/Ultima_Online_expansions).
- 49 skills, 100 max each, 700 total; Nov 23 1999 publish references "the skill cap (700)" (https://uo.com/wiki/ultima-online-wiki/technical/previous-publishes/1999-2/1999-publish-01-23rd-november/).
- Stats 225 total, 100 each [FS] (https://www.uosecondage.com/).
- Skill locks (up/down/stop) arrived Nov 23 1999 — inside T2A, so we include them. Skills atrophy only when another rises; stats gain only from "up" skills or GM skills (same source).
- Meditation added Jan 1999; Stealth and Remove Trap Feb 24 1999 (https://www.uoguide.com/Publish_-_February_24,_1999).

## Skill gain
- No gain at 0% or 100% success chance [FS] (https://www.uosecondage.com/faq).
- Default formula (RunUO pre-AoS, `Scripts/Misc/SkillCheck.cs`): gain chance = [((cap−total)/cap + (skillcap−skill)/skillcap)/2 + (1−successChance)×(0.5 success | 0.2 fail)] / 2 × gainFactor; min 0.01; skills <10 always gain.
- NPC training to ~30 for many skills; beyond needs real use (Ultima Codex snippets).

## Magic
- 64 spells, 8 circles, 8 reagents (black pearl, bloodmoss, garlic, ginseng, mandrake root, nightshade, spider's silk, sulfurous ash). Full spell/words/reagent table: RunUO `Scripts/Spells/First..Eighth`.
- Mana by circle: 4, 6, 9, 11, 14, 20, 40, 50 (RunUO `MagerySpell.cs`; matches https://uo.com/?p=3753).
- Flow: words of power → cast delay (0.5 s + 0.25 s/circle) → target cursor → reagents consumed + success roll → mana on success → 0.75 s recovery. Damage interrupts (not 1st circle in RunUO). Scrolls: no reagents, 2 circles easier.
- Success bands conflict (RunUO −20..+20 around 14.29×(circle−1) vs Ultima Codex minimums 0,0,10,24,38,52,67,81). **Open.**
- Eval Int scales damage vs target Resist; Resist gains when hit by spells; Meditation passive (regen tick) and active (trance, halves regen delay, free hands, armor penalty).
- Healing: bandage self 9.4 + 0.6×(120−Dex)/10 s; damage causes "slips" (−35% heal), not cancel (RunUO, marked TODO there).

## Crafting and gathering
- Mining with pickaxe/shovel on cave/mountain tiles; smelt at forge; failed smelt loses ore.
- Colored ores added 1999-02-02 (inside T2A); higher colors need more Mining [FS-hosted OSI notes].
- Tinkering consumes resources on failure (1998-09-16 notes) [FS-hosted].
- Exceptional quality and maker's marks: formula and GM-only mark possibly post-T2A. **Open.**
- Carry capacity ≈ 40 + 3.5×STR stones [FS]; backpack limits likely later values. **Open.**
- Common macro pairs: Lumberjacking+Bowcraft, Alchemy+Poisoning [FS].

## Journal messages scripts react to (RunUO strings; T2A exact text unverified)
"The spell fizzles." · "More reagents are needed for this spell." · "Insufficient mana for this spell." · "Your concentration is disturbed, thus ruining thy spell." · "You enter a meditative trance." · "You cannot focus your concentration." · "You are at peace." · "You begin/finish applying the bandages." · "There's not enough wood here to harvest." · "no metal" (mining, paraphrased).

## How players macroed (the loops our scripting must make easy)
- Magery: cast right-circle spell on self → meditate when low → retry if trance fails → restock from bank.
- Mining: mine until "no metal" → step → repeat → stop at weight threshold → smelt/bank.
- Lumberjacking: chop until "not enough wood" → move/recall.
- Stat see-saw at 700 cap using locks.
