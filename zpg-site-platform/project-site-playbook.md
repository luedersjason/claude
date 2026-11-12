# ZPG Project Site Playbook

The standard for building and running a ZPG project website with an AI assistant: what the site is, how it looks, how it is written, how the tracker and review requests work, and how new information is processed. First built for Jaquet USA (LakeView Corporate Park, Lot 22, Pleasant Prairie, WI). Sections 0 to 13 apply to every project; Appendix A holds Jaquet facts; Appendix B is the sweep-agent brief.

This file is the single source of truth. If anything else (a skill, a handoff note, the site code) disagrees with it, this file wins and the other thing gets fixed.

---

## 0. Start here (read this page first)

**Purpose.** One private web page per project that shows the team where things stand, what is next and who has the ball, and that turns every email, drawing and meeting into checked tracker updates. Jason Lueders (ZPG, Director of Construction) decides; the AI proposes, records and checks.

**Where things are**
| What | Where |
|---|---|
| This playbook (master copy) | `AI Repo\project-site-playbook.md` |
| Handoff kit (README, reference HTML, render_sheets.py, ifc2mesh.py, copy of this file) | `AI Repo\Project Site Handoff\` |
| Live Jaquet site | Claude Artifact https://claude.ai/artifact/9dRVn7hPKNxbgE1hkZpv9k |
| Site source and supporting files | the session outputs folder: `jaquet-usa-bts.html`, `drawings\`, `sheets\`, `img\` |
| Project shared folder (current files only) | OneDrive `0. SALES\BTS_Jaquet USA\jaquet - precon shared folder\` (superseded files in `z - archive`) |
| Site data | the artifact database (collections in section 4) |

**First five things to do as a new assistant**
1. Read sections 0 to 7 of this file, then Appendix A for the project.
2. Read the resolved validation requests and their comments (they are Jason's reasons and corrections).
3. Read the latest `sweeps` record and every not-Done tracker item.
4. Before changing anything, run the sweep in section 7 on whatever is new.
5. Report in one short list and wait for Jason on anything not certain.

**The rules that matter most**
1. Owner = the person who does the action. Ball = who must move next now.
2. Every not-Done item gets checked item-first on every new input: status, ball, a rewritten Now line, title, owner, evidence date.
3. Done needs evidence. Anything uncertain goes to a validation request on the site, not a chat question.
4. Read everything, including attachments inside attached emails, and list what a thread refers to that you do not have.
5. Do not invent steps. Not every remark is a task.
6. Recaps and drafts are reviewed by Jason before they are posted.
7. One step and one question at a time, short answers, no walls of text.
8. When something goes wrong, fix the process and record it here, not just the instance.
9. Every change to the Jaquet site is written into this playbook in the same session (section 14).
10. The desktop chat reads `repoqueue` and `asks` at the start of every session and does what is waiting.
11. Keep dollar values out of tracker notes; they stay in the cost control log and the emails, because the owner may see the site.
12. **One platform, every site.** A change to how a site looks or works goes into the template (`zpg-site-platform/template/`, `public/claude-shim.js`) AND every connected site in the same session: Nitto Watermain + L152 (`luedersjason/claude` branch `claude/gallant-allen-1vreeq`, `zpg-site-platform/public/`) and C251 + C251 Utilities (`luedersjason/c251-caledonia-portal` main, `public/` and `public/utilities/`). All four are built from `projects/<name>/project.json` with `python3 tools/build_site.py --all`; C251 builds need that repo checked out next to this one (`publicDir`). Before reporting done, grep all three for the changed element. Jason should never have to ask for the other sites.
13. **Simple beats clever (Jason, 11/11).** Simple methods are more reliable, so more consistent and efficient. Prefer the design with the fewest moving parts: one repo, one template, one build, one deploy, one copy of each document. Before adding a sync job, relay, second copy or cross-repo step, first ask whether the thing can just live in one place. Target: every site in this repo and this branch, so one push updates all of them.

---

## 1. Site anatomy: every part, how it looks and how it works

A published Claude Artifact (one HTML page plus supporting files) shared with a named project team. To make a new site look and work like Jaquet, rebuild each part below from the reference HTML in the handoff folder. Capabilities: db, user (scopes ["profile"]), downloads, sample; restating capabilities replaces them, so always resend `user: {"scopes":["profile"]}`. Libraries (cdnjs, exact versions): three.js r128, qrcodejs, pdf-lib.

### 1.1 Shell and navigation
- **Ribbon:** steel bar with a 3px green underline. Left: ZPG logo (embedded image), then the project title in Archivo 800 with a small mono uppercase subtitle ("LakeView Corporate Park · Build-to-suit"). Right: the tabs Home, Tracker, Documents, Schedule, Team, Meetings, Photos; the current tab has a green underline.
- **Panels:** one panel per tab; only one shows. The last tab is remembered per browser session and `#tracker`-style links open a tab directly. The Schedule tab hides both side bars to use the full width.
- **Three columns:** left bar, main panel, right bar (sticky, scroll on their own); one column on phones.
- **Toast:** short black message at the bottom for confirmations and errors ("That change did not save. You may have view-only access.").

### 1.2 Left bar
- **Search:** searches tracker rows, list items, people cards, schedule rows, week items, approval steps and section headings across all tabs; results show the tab name; clicking jumps there and highlights the hit for about 2 seconds.
- **+ New issue:** green full-width button opening a form (title, owner, discipline, next step); creates the next ref (J-nn) with status Open.
- **Issue tracker box:** By discipline / By owner switch; collapsible groups with "N open / total"; open items only, each with star, ref and title; a "N completed" link opens the group in the main panel; clicking an item opens its detail page; Predecessor links are clickable.

### 1.3 Right bar
- **Needs your check:** a button "Validation requests" with an amber count badge (grey when zero) and a one-line note; opens the request popup (section 8).
- **Change something on the tracker:** a box below Needs your check. Jason types a change request and presses Send. The page asks Claude (`sample` capability) to read it against the tracker and creates a check request (`kind:"check"`, with `askId`) under Needs your check. Jason approves with Apply changes and the comment then shows Done. The box lists the last 5 comments with a status: Waiting, Claude is reading it, Ready under Needs your check, Done. The first use asks the viewer's permission for the sample call.
- **Forum:** free-text posts (`posts`), author names from profiles, newest first, 20 shown.
- **Project feed:** short dated event lines (`feed`), newest first, 30 shown; a one-line add box; the site also adds lines automatically (item done, layer saved).

### 1.4 Home tab
- **Cover:** full-width hero photo or rendering with a dark steel gradient from the left; green mono eyebrow with the location; one big number (building SF) with a two-line descriptor; one sentence on who does what; a row of status chips; a "View rendering" button that opens the image full screen (lightbox).
- **Drawings strip:** "DRAWINGS" tag, set name and date and whether it has been shared with the owner, "Open PDF"; sheet tabs; clicking the sheet opens the drawing viewer.
- **3D model:** three.js viewer of the architect's model (IFC converted to `model/<project>-model.json` with `ifc2mesh.py` in the handoff folder); buttons Full width, 3D, Top, Front, and layer checkboxes Walls, Doors, Storefront, Slabs/roof; drag to orbit, scroll to zoom, right-drag to pan. Say which model revision and date it is, and whether it predates the current plans.
- **Status rail:** four steps on a line: Now (raised white card, green dot), Next, Gate, Target (steel diamond). Each has a mono eyebrow with the date, a bold title and a one-line note.

### 1.5 Tracker tab
See sections 5 and 6. Header with counts (open / pending / done) and "Last full check"; grouping switch (By discipline, By owner, Flat list); Owner and Show filters; table columns #, Item, Owner, Status, Now / next step; item detail page with status, owner, ball, due, last confirmed, predecessors, what it unblocks, VE links, Now and History.

### 1.6 Documents tab
See section 9. One card per group (for utilities: one card per service, each holding its own application, cost letter, sketch, ready-for-service card and payment). Inside a card: every file has an "Include in download" checkbox (checked by default), plus Check all, Check none and Download checked, which merges the checked files into one PDF in card order (images become one page each) named `<filePrefix>_<card title>.pdf`.

### 1.7 Schedule tab (Gantt, approval path, week-by-week)
- **Gantt data:** three row lists (master, preconstruction, construction). Each row is `{n: name, s: start (YYYY-MM-DD), e: end, p:1 phase heading, m:1 milestone, k:1 key milestone, pend:1 carried from an older schedule and not yet re-sequenced}`. Views: `{master, precon, constr}` each with its row list, date range, title and one-line lede.
- **Drawing rules:** true scale (positions are percentages of the date range); quarter and month headers in mono; light month gridlines; phase rows are solid steel bars with white Archivo text; task bars are white with a steel outline; Done = grey (end before today), In progress = green inner outline (today inside the bar), Planned = white, Carried-over = hatched with a dashed outline; milestones are diamonds (key = green, done = grey, carried-over = dashed outline); start and finish dates (m/d, mono bold) sit outside each end; a bar name that does not fit shrinks once, then moves after the finish date; a dashed green "Today" line with label.
- **Header:** mono eyebrow naming the schedule version it comes from and what hatching means (e.g. "Draft v9c · from Schedule v9b + Oct 21 decisions · hatched = v9b dates, to revise"); the view switch is a pill group (Master, Preconstruction, Construction); a legend below.
- **Approval path:** row of step cards (mono date eyebrow, bold title, one-line note); the next step has a green top border; an intro paragraph states the municipal rules that drive the dates.
- **Week-by-week:** collapsible weeks (`[week, title, [[who, task, type]]]`), type tags Decision (amber), Deliverable (green), Meeting and WIP (grey); the first week opens by default.
- **Updating:** dates come from the owner's schedule file and meeting decisions. When a date changes, change every place it appears (section 1.11) in the same publish, and update the eyebrow's version note.

### 1.8 Team tab (directory)
- **Data:** a firms map `{key: {n name, g role group, web, ph main line, addr}}`, a people list `{id, f firm key, fn, ln, t title, r project role, em, cell, bio, src bio source URL}`, and an order list for the groups (owner first, then developer, contractor, architect, engineers, trades, "Firm to confirm"). Photos come from `team-photos.js`, which sets `window.JQ_PHOTOS = {personId: imageURL}`.
- **Layout:** one group per firm with heading "Role · Firm" plus address, main phone and website link; person cards in a grid: QR icon top left, round avatar with a green ring (photo or grey silhouette), name (Archivo), company, title, project role, phone, cell and email lines with small green icons, and two icon buttons: Add to Outlook (vCard download) and Chat in Teams (deep link to a Teams chat with that email).
- **Profile popup:** photo, group, name, title · company, details (project role, email, office, cell, address, company link), bio with a "Source" link, buttons, and a QR code of the vCard (qrcodejs, 240px) for phones. A "Download everyone's vCard" button at the top saves one .vcf for the whole team.
- **Rules:** titles and bios come only from the person's firm website, with the source link; office number = the firm's main line; anything unknown shows "to confirm" (never guess an email); photos only from the person or the firm. A new person goes into the people list with a firm key; a new firm also goes into the firms map and the order list. The vCard note names the project.

### 1.9 Meetings tab
Cadence header (recurring meeting, day, time, platform, date range), then meeting cards newest first from `meetings`, each opening a detail page; see section 10.

### 1.10 Photos tab
Empty state until site photos exist ("Photos will appear here"); can hold renderings and site-visit pictures.

### 1.12 Paths to service (extra tab type `paths`)
A project or sub-site can show one row per service (or any path to a goal): numbered stage columns left to right, a short card per tracker item (status icon, date when Done, owner's firm, doc count), and a goal tile on the right (red dashed until every step is Done, then green). Config `paths: [{t, wr, goal, gs, icon, stages:[{n, cards:[[ref, short label, [sheet ids]]]}]}]` in project.json; status, date and owner always come from the tracker, so the cards never go stale. Clicking a card opens its item; clicking the doc count opens the documents. Built for C251 Utilities (Jason, 11/10: the old stage cards were easier to read than one long row of wide cards). `defaultTab` opens a site on that tab; `wideTabs` hides the side bars on it.

### 1.11 Consistency map (one fact, every place it appears)
| Fact | Appears in |
|---|---|
| Building size (SF) | Home cover big number, Appendix A, meeting recaps, cost log notes |
| Key dates and gates | Gantt rows, approval path cards, Home status rail, tracker items and due dates, week-by-week |
| Current plan set | Home drawings strip (name, date, PDF), Documents cards, viewer sheets A1-A5, doclog |
| People and roles | Team directory, tracker owners and ball, meeting attendees, Appendix A |
| Decisions | meeting recap, tracker notes, Appendix A |
When one of these changes, update every place in the same session and say so in the report.

## 2. Architecture and publishing

- Page code is generic; project data lives in the artifact database. Data edits need no republish (ArtifactData; pin every write with `if_version`; bulk or large edits via `file_path` JSON; Windows absolute paths for `file_path` and `out_dir`).
- **Publish:** edit the HTML, extract the inline script and run `node --check`, publish with the same file path (same URL). New supporting files go in `files` with `root` set to the outputs folder. Replacing files you have not read needs `overwrite_unread`; removing needs `{"path": null}`.
- **If a newer live version exists** (someone else published or the page saved itself), read it, diff against the local file, merge your edits onto the live version, then publish.
- Say plainly "syntax-checked only" unless it was tested in a browser.
- **One template, one config per project (Cloudflare sites, 11/9/26).** `template/` holds the page every site shares: `page.html` (layout), `site.css` (look), `app.js` (behavior), `panel-*.html` (optional tabs). `projects/<name>/project.json` holds everything that differs: name, title, tabs, cover, drawings strip, status rail, schedule rows, approval path, document cards, team directory, disciplines, ref prefix, data namespace, links to sister sites. `python3 tools/build_site.py --all` rebuilds every site. The build fails if a config value is missing.
- **The loop.** A change to how sites look or work is made in `template/`, written into this playbook in the same commit, and rolled to every site with `--all`. A change to one project's content is made in that project's `project.json` only. Never patch a built page or add per-site code. Project data (tracker, requests, feed, decisions) lives in each site's database and is not touched by a rebuild.
- **Feeding changes back (Jason, 11/9).** Work done on any one site, or on a new site made from the template, is not finished until it is in the template and every connected site is rebuilt: (1) put the change in `template/` (or in `project.json` if it is that project's content only); (2) write it into this playbook; (3) run `python3 tools/build_site.py --all`; (4) run `python3 tools/build_site.py --check` and push only when every site says OK. `--check` fails when a built page was edited by hand or one site was rebuilt without the others.
- **Still to move onto the template:** the Jaquet site (a Claude Artifact) and the master copy of this playbook in `AI Repo`.

## 3. Visual standard (cohesive appearance)

**Look:** white page that prints to PDF, steel-blue ribbon with a green underline, green accents, matching the ZPG AI Hub. Calm, technical, no decoration for its own sake.

**Color tokens (CSS variables)**
| Token | Value | Use |
|---|---|---|
| `--bg` | #FFFFFF | page background |
| `--sunk` | #F2F4F7 | table headers, subtle panels |
| `--line` | #DDE3E9 | borders, dividers |
| `--fg` | #16212C | body text |
| `--muted` | #5B6877 | secondary text, dates, labels |
| `--steel` | #1E3448 | ribbon, primary dark, selected tabs |
| `--accent` | #00A94F | ZPG green: primary buttons, focus, "now" markers |
| `--accent-ink` | #007A39 | green text and links |
| `--accent-soft` | #E2F4EA | Done chip, soft green fills |
| `--warn` | #A15C00 | Open chip text, amber notes |
| `--warn-soft` | #FCEBD3 | Open chip fill |
| amber badge | #9A5B00 on #FFF3DC | Predecessor, Due, equipment gaps |
| red flag | #9B1C1C on #FDECEC | Overdue, Not confirmed in N days |
| blue badge | #1E3448 on #E6EEF6 | Ball |
| pending chip | #4A5B6B on #EEF1F5 | Pending |

**Type:** display Archivo (700-800) for titles and big numbers; body IBM Plex Sans 15px/1.55; IBM Plex Mono for refs, dates, file paths, counts and eyebrows (11-12px, uppercase eyebrows with letter spacing). Google Fonts only.

**Layout:** three columns on wide screens (left bar 392px, main, right bar 392px), collapsing to one column on phones with a 16px gutter. Radius 6px for cards and inputs, 10px for hero panels. Popups are white cards on a dimmed backdrop; document popups up to 1400px wide.

**Components**
- **Status chips:** Open (amber), Pending (grey-blue), Done (green). Mono, uppercase, 11px.
- **Badges** in the Now column, in this order: VE ideas (green), Predecessor (amber, clickable), Ball (blue), Due (amber) or Overdue (red), Not confirmed in N days (red), then the Now sentence, then the updated date in mono.
- **Priority:** a star before the ref; amber when on.
- **Cards:** image on top (4:3, contain), title in bold, a mono meta line (date or version, sheet count). Folder-only files are not shown as cards.
- **Validation popup:** two columns (what happened and sources on the left; "What I think happens next" in a green-bar panel on the right), a chat-style comment bar, buttons at the bottom right.
- **Drawing viewer:** full screen, steel top bar, sheet tabs named per sheet; markup colors green #00A94F, black #111111, blue #1D4ED8, red #E11D2E, amber #F59E0B; line sizes Thin, Medium, Thick.
- **Images:** category hero images in `img/docs/`, sheet images 3000px wide JPEG (quality 68 to 72). Never draw brand logos; use assets the owner supplies (the Copilot icon came from the AI Hub assets).
- **Print:** bars, buttons and popups hide; panels print in sequence.

## 4. Writing and data formats

**Voice:** plain, short sentences, no jargon or filler, no emojis. Say what happened and what happens next. Full sentences in validation `detail`; one sentence for `now`.

**Formats**
| Thing | Standard | Example |
|---|---|---|
| Item ref | project letter + two digits | J-07 |
| Dates in notes, badges, `updated`, `confirmed`, `due` | m/d | 11/4 |
| Dates in the document log | m/d/yy | 11/4/26 |
| Dates in meetings, sweeps ids, changelog | ISO | 2026-11-04 |
| Owner and ball | Name (Company); several joined with " · " | Jeremy (PIDA) · Werner (PIDA) |
| Title | the outcome, imperative, under about 120 characters | Label the outdoor racks 10 ft perimeter and 13 ft interior |
| Now | one present-tense sentence, rewritten each time | Jaquet has not approved the footprint; Jason answered their questions 11/2. |
| History (`next`) | dated notes, oldest first, "11/3: ..." | |
| Dimensions | feet-inches with dashes; areas in SF | 359'-6"; 146,720 SF |
| Money | rounded with a range or "about" | about $50-70K |
| Feed line | date, then one plain sentence about the project (not the website) | 11/4 Water jet MR2113 cut sheet added. |
| Doclog row | date, document, what changed, from whom | 11/2/26 · Water jet MR2113 · added to Equipment cut sheets · Dan Chatterton, Jaquet |
| Sheet ids | source prefix + page | A1-A5 (current plan set), V12-8 (plans and specs v12 p.8), EQ-WJ, RM15-1, RK1-2, CV9 |
| Shared-folder names | keep the sender's file name; owner files under "<Owner> provided docs"; superseded under "z - archive" | |

## 5. Data model (artifact database)

- **issues:** ref, title, owner, area (discipline key), status, now, ball, confirmed, source, due, next (history), order, updated, pri, blockedBy (predecessor refs), ve (VE idea refs feeding a cost-log item).
- **Status definitions:** Open = the owner can act now. Pending = waits on a predecessor or an outside response (shown automatically when an Open item has an unfinished predecessor; set by hand for outside waits). There is no separate In progress status (merged into Open 2026-11-09). Done = finished, with evidence.
- **Completeness (template, 11/9):** a not-Done item without a ball, a Now line or a confirmed date shows a red "Missing: ..." flag, the tracker header counts them as "N incomplete", the + New issue form asks for owner and ball, and a site with no `sweeps` record shows "No full check recorded yet."
- **Flags on every not-Done item:** Ball; Due or Overdue; "Not confirmed in N days" when `confirmed` (or `updated`) is 7+ days old. Counter: open / pending / done.
- **validations:** state (pending / resolved), kind ("check" for tracker corrections), ref, doc, detail, evidence, refs[] (`{label, kind:'text', title, body}` or `{label, kind:'sheet', ids:[...]}`), proposal {invalid, summary, items[], itemUpdates[]}, nextTitle, nextOwner, nextArea, answer (done / adv / apply), comment, lastComment, rev, applied, nextDone. `itemUpdates` may carry next, now, status, ball, title, owner, due, blockedBy; only fields present are written.
- **sweeps:** date, at, checked, changed, statusChanges[], requests[], missing[], stale[], sources. The tracker shows "Last full check".
- **meetings:** title, date, dateLabel, sortAt, kind, summary, attendees, note, exec, progress[], progressLabel, objectives[], objectivesLabel, disciplines[{n, items}], assignments[{who, items}], transcript.
- **asks:** text, at, by, state (new / working / proposed / done), reply. `validations` may carry `askId` linking a check request to the comment that created it.
- **repoqueue:** state (new / done / info), at, from, target, job, result. The web chat cannot reach OneDrive, so it leaves repo jobs here; the desktop chat reads the queue at the start of every session, does each `new` job, and sets it `done` with a short result.
- **feed:** text, at, by. **doclog:** date, doc, change, from, at. **docfiles:** name, file, ver, order. **posts:** text, at, by. **markups:** sheet, name, by, at, marks (JSON string). People are stored as user ids; names come from profiles.

## 6. Tracker rules

1. **Owner = who does the action.** Never put ZPG's action under the owner's bucket. The owner discipline (for Jaquet: "Jaquet") holds only what the owner itself must do.
2. **Sequence matters.** If a step cannot start until another finishes, set `blockedBy`. Nobody gets an item they cannot act on yet.
3. **One item per hand-off.** No duplicates. Star the steps leading to a goal, not the goal and every step.
4. **Discipline buckets by who does the work:** Drawings and Design (key Design), Approvals (only what the municipality or state itself decides), Steel, Fire, MEP, General Contractor (cost, budget, pricing), Owner. Preparing something for the Village sits with the discipline doing the work.
5. **Done needs evidence.** Close directly only on unambiguous evidence and record it. Otherwise raise a validation request.
6. **Validation comments are data.** Read resolved requests before raising new ones; never re-ask what a comment answered.
7. **Display:** starred first, then lowest ref; Done last and grey; Predecessor links clickable; left bar shows open items only.
8. **Item-first state check (the sweep).** For every not-Done item ask "what is true now?": status, ball, a rewritten Now, whether the title and owner still describe the work, the latest evidence (confirmed + source), due dates. Start from the item and look for evidence, not from the document. Save one record per sweep in `sweeps` and report "N checked, N changed". No record means no sweep.
9. **Do not invent steps.** Jason decides what is required.
10. **Keep candid asides out** of tracker and notes.
11. **Equipment completeness.** Every piece of equipment needs a cut sheet, a schedule line and a diagram tag, one to one to one. Every schedule line is filled in or marked "not needed". Gaps are tracked per piece (shown on the Equipment cut sheets card).
12. **Answer from the record.** Before saying "I haven't seen X", search the tracker, notes and transcripts for the fact. Missing a document is not missing the fact; say which.

## 7. Processing new information (trace and sweep)

Run every time Jason supplies an email, drawing, CAD file, notes, transcript or decision.
1. **Learn first:** read resolved validation comments.
2. **Read everything:** open attachments, including attachments inside attached emails (walk every attachment storage). Never log a document you have not read. Email security may turn attachments into download links; Jason downloads those.
3. **Thread check:** for each email, record what it replies to, who has the ball after it, and every message or attachment it refers to that you do not have. List those missing links to Jason. A reply proves a question was asked even when the question is missing.
4. **Log and file:** doclog row; copy current files into the shared folder; move superseded ones to `z - archive` (never delete).
5. **Sweep every not-Done item** (rule 8). For several documents, and before every weekly meeting, use the independent sweep agent (Appendix B): give it the raw tracker, past comments and raw sources, never your conclusions.
6. **Apply and ask:** apply high-confidence state directly (status, now, ball, confirmed, source, due). Titles, owners, predecessors, reopenings and anything medium or low confidence go to check requests. New commitments with a clear owner go into one request with proposal items.
7. **Everything else:** feed lines; schedule dates and gates; drawings (new set procedure in section 9); directory.
8. **Report** in one short list: changes, "N checked, N changed", what waits on Jason, missing links.

## 8. Validation requests ("Needs your check")

- **Use them for** anything you would otherwise ask in chat or decide alone: closing items, new steps, owners, schedule or cost-log entries, corrections.
- **Regular request** (about one item): buttons Keep open and advance / Close and advance; both apply the proposal. Requests with no item show Skip / Add to tracker.
- **Check request** (`kind:"check"`): Skip / Apply changes; applies itemUpdates without otherwise changing the item's status. Use for sweep corrections.
- **Popup:** one request at a time with prev/next arrows; what happened (`detail`, full sentences); source thumbnails from `refs` (a tracker-item card is added automatically; sheet refs open the viewer and return to the request); "What I think happens next" (`proposal.summary`, items, updates); a comment bar where Enter revises the proposal through the `sample` capability until Jason agrees, or marks it invalid so only Dismiss remains.
- **Always seed** `detail`, a proposal and 2-3 refs. Keep it to one decision per request where possible.
- **Refs are highlighted excerpts, not snippets** (Jason, 11/9): for every document ref, make a page image cropped to a wide window of context (the whole clause or paragraph, with its heading) with the exact words highlighted in yellow, saved in `public/excerpts/` and attached as `{label, kind:'img', img:'excerpts/<file>.png', title, body, src, href}`. `href` is the source PDF on the site with `#page=N`, so clicking the excerpt opens the whole document at that page (Jason, 11/9); leave it off only when the document isn't posted to the site. Short text quotes are only for emails with no page to show. Tool: `excerpt.py PDF PAGE OUT.png "phrase" ... [--box x0,y0,x1,y1] [--ctx pt]` (scanned pages use `--box` in PDF points).
- **Comments go to Claude's seat** (no API on the Cloudflare sites): Enter saves `lastComment` with `commentPending:true`; the site tells the Claude relay (`relay/`, a Durable Object holding open websockets, ids only), which wakes the Claude session listening on `/api/relay/listen`. The card shows "Sent to Claude", then "Claude is revising" (Claude posts `working` to `/api/relay/status`), then "Revised" when Claude posts `done` after writing the new proposal with `commentPending:false` and a `reply`. Jason can move to other requests meanwhile. No Claude session listening: the card says "Queued". No polling; about two calls per comment. The listening session runs `Monitor` on `wss://nitto-watermain.pages.dev/api/relay/listen` (30-minute timeout, re-arm), and on load processes anything already `commentPending`.
- A Copilot placeholder (draft an email / find a file) sits under the comment bar for a future connector.

## 9. Documents and drawings

- **Cards are views over files.** One file may appear on several cards; there are no copies. Folder-only files (docx, xlsx, dwg, large manuals) do not get file cards. Show only the latest version; superseded files live in `z - archive` only.
- **Card config:** `{t, img, d, it:[[title, path, ver, sheetIds|null, statusLines?]]}`. Thumbnails: `drawings/<id>.jpg` for the base set A1-A5, `sheets/<id>.jpg` otherwise. The optional fifth element shows short status lines (used for schedule-line and diagram-tag status on equipment).
- **Equipment cut sheets card:** one card per piece of equipment, each showing whether it has a schedule line and a diagram tag.
- **Sheets:** `{id, t, img, W:2016, H:round(2016*ph/pw), pw, ph, x:1, lab}`; marks are stored as 0-1 fractions so they stay aligned. Render with `render_sheets.py` (3000px, JPEG q68). Very large documents stay folder-only.
- **New plan set:** read every sheet; compare site data to the prior set; copy to the shared folder; move the old set to `z - archive`; replace viewer sheets only if no markups exist on them (check `markups` first).
- **Viewer:** per-document sheet tabs with names; markups saved as named layers; unsaved marks prompt "Close without saving?"; PDF export keeps vector for the base set.
- **Shared-folder banner** links to the OneDrive share (set `ODURL`), placed below the cards.

## 10. Meetings

- **Teams AI notes are a starting point only.** They mislabel speakers and miss decisions; verify against the transcript and record decisions, not attributions. Where unclear, ask Jason one item at a time.
- **Recap format:** card with a bold title and a one or two sentence summary; detail page with executive summary, decisions (progress), objectives, details by discipline, assignments by person, transcript link.
- **Recaps are drafts** until Jason reviews them; then post to `meetings`. Ask before attaching a transcript; check privacy before anything goes where the owner can see it.
- Owner replies to a recap are source documents: log them and fold corrections into the recap and tracker.
- "Copy for email" copies formatted HTML for Outlook. Apply Jason's wording edits exactly.

## 11. Working with Jason

- Short answers. One step and one question at a time; he tracks everything. He does not read walls of text.
- He dictates by voice; read typos by meaning.
- Show proposals one at a time with the thing itself (preview image or exact text) and a recommendation, or put them in validation requests and point him there.
- Do not guess dates or owners. Do not re-save skills unless he asks; edit this file.
- When he reports a mistake, name the flaw in the process, fix it, and add a changelog line. Then check the rest of the site for the same mistake.

## 12. Starting a new project site

Collect: project name and address, ZPG lead, team directory (name, company, role, contact), disciplines, folder paths, schedule milestones, permits and meeting cadence, drawing set, logo or hero image. Then: copy the reference HTML, replace the Jaquet content (title, facts, team, schedule rows, document cards, sheet list, folder link), seed empty collections, load drawings, publish, share with the named team, run section 7 on the first documents. On the Cloudflare platform this is: copy `projects/l152/project.json` to `projects/<new>/project.json`, fill it in, give it its own `path` and `ns` (data namespace), render its sheets, run `python3 tools/build_site.py <new>`, push. The page code is not copied or edited.

## 13. Lessons and borrowed practices

- Ownership and sequence mistakes were the first errors. Ask "can this person do it now?" before assigning.
- Fix a reported bug, then check the other views for the same bug.
- Re-read generated content for stale facts before reusing it.
- **J-31 (11/4, critical):** the tracker said "waiting on approval" while Jaquet had questioned the crane spacing and Jason had answered. The facts were in the transcript and the reply, and even in the note, but the status, title and first line were never recomputed. Causes: the sweep asked only "is it Done?", no proof a sweep ran, document-first reading, append-only notes, threads read as complete. Fixes: rules 8 and 12, section 7, the Now/Ball/Pending model, the sweep agent. The first independent sweep changed 10 of 22 statuses.
- **From Procore:** ball in court on every open item; overdue reminders go to the ball holder. **From Microsoft Planner's agent:** status reports drafted from plan data (status, progress, risks, next steps); our weekly sweep plays this role. **From Asana:** a person sets the status, the AI drafts and flags risks. **Where we go further:** our sources are emails, transcripts and drawings, so thread checks and missing links matter more than in a closed tool.

## 13a. Where each Claude can work

| | Web chat (claude.ai, in the project) | Desktop chat (Cowork on Jason's PC) |
|---|---|---|
| Site and database | read, edit, publish | read, edit, publish |
| OneDrive / AI Repo / shared folder | no access (no connector found) | yes, through the synced folder |
| Skills | cannot edit | can edit when Jason asks |
| Chat history | stored with the account | stored on that PC only; export or "wrap up" to keep it |

The web chat leaves repo jobs in `repoqueue`. If a Microsoft 365 / SharePoint connector is enabled for the account, the web chat can do them itself. Chats on two PCs do not sync; the site, its database and the AI Repo are the shared memory. Do not publish the site from two chats at once: read the live version and merge first.

## 14. Maintenance

- **Propagate platform changes (rule 12).** Template first, then every connected site listed in rule 12, in the same session, verified by grep. Data-only changes (one project's tracker) stay with that project.
- **This playbook follows the Jaquet site.** Every adjustment or upgrade to the Jaquet site (look, layout, a tab, a field, a button, a rule) is written into the matching section here in the same session, before the work is reported as done. A change is not finished until the playbook describes it well enough for another AI to rebuild it.
- After every publish, ask: did this change how the site looks or works? If yes, update the section, add a changelog line, copy the file to the handoff folder, and refresh `REFERENCE - jaquet-usa-bts.html` there.
- Update this file in one batched edit whenever a rule, format, field or preference changes, with a dated changelog line. Read it first; Jason may have edited it.
- After editing, copy it to `AI Repo\Project Site Handoff\`. Skills (`project-site-playbook`, `jaquet-site-update-trace`) point here and should not restate rules in detail.

---

## Appendix A: Jaquet USA (replace per project)

- **Project:** build-to-suit at LakeView Corporate Park, Lot 22, Pleasant Prairie, WI. 10/28 plans: 352'-8" wide, 146,720 SF production plus 6,972 SF office (about 153,692 SF; the original concept was 143,040 SF). ZPG develops; Jacquet Metals SA owns the operator; Riley Construction is design-build GC; PIDA architect; raSmith structural; Pinnacle civil; MPC mechanical and process piping; NEXT electrical; Ahern fire protection.
- **People:** Jason Lueders (ZPG, project lead); Emily Van Allen, Lisa Kleinke, Chad Navis (ZPG); Dan Chatterton (CEO/Manager, JACQUET Midwest) and John Rich (Jaquet); Philippe (Jaquet France, early layout sketch); Jeremy Hall and Werner Brisske (PIDA); Erik Dillon and John Delavan (Riley); Doug Reed (raSmith); Justin Johnson and Andrew Shoaf (Pinnacle); Tyler Trotter (MPC); Scott Kowalkowski (NEXT); Matthew Berth (Ahern); Simon (Cardinal, steel pricing); Peggy (Village); Chief Rebke (fire chief).
- **Terms:** Corto wing = the side of the demising wall with the narrower 56 to 60 ft bays; Jaquet portion = the wider crane bays. Bay = the north-south run. Fall zone = clearance around the precast walls kept out of the east and west drive aisles; a fall-zone variance needs the fire chief's buy-in.
- **Village rules:** outdoor storage needs a conditional use permit; fence max 10 ft with material screened to its height; racks run 12 to 13 ft. Full architectural, structural, civil and DSPS-stamped package required; no two-step process. PlanCom submittal expected after the new year once the footprint is approved.
- **Decisions:** ask for 13 ft racks with 10 ft fallback (10 ft perimeter, 13 ft interior); storage pad about 34,000 SF; 73 parking stalls now, front row future; office about 7,000 SF; one crane per bay; maintenance mezzanine near the electrical room; 30 ft clear confirmed against a 24 ft hook height (panels 36'-2" Corto wing, 38'-0" Jaquet portion).
- **Width options (Jeremy, 11/2):** A 359'-6" (77'-2" rail to rail, no variance, +2,733 SF); B 360'-5" (80'-0" bays, 1 ft fall-zone variance, +3,100 SF); C 367'-11" (80'-0" rail to rail as at Limerick, 5 ft fall-zone variance each side, +6,100 SF).
- **Holds (11/3-11/4):** no variance or redesign work, and no Village or fire-chief ask, until Jaquet says whether the 10/28 plans work (J-31). Then ask once.
- **Gate chain:** footprint approval, then Jeremy issues the locked AutoCAD footprint (civil starts) and steel spacing (structural starts).

## Appendix C: Nitto Watermain and L152 (Cloudflare sites)

- **Two sites, one deployment.** https://nitto-watermain.pages.dev/ is the Nitto Watermain site (public 16-inch water main only). https://nitto-watermain.pages.dev/l152/ is the L152 building project site (152,334 SF, Zilber Industrial 3). Each ribbon links to the other. Never put building items on the watermain site; move them to L152.
- **Hosting.** Cloudflare Pages + D1 instead of a Claude Artifact (repo luedersjason/claude, folder zpg-site-platform; push deploys). `claude-shim.js` provides `window.claude.use()` (db, user, downloads); the L152 page's data lives in `l152_*` collections. Data changes outside a signed-in session go through `public/migrate.json` (once-only steps) or Claude's token-protected bot API (`/api/bot/<collection>`, hash only in code).
- **No `sample`.** No Anthropic API key on the site (Jason's call). Validation comments and the tracker change box (`asks`) are picked up by Claude on its checks (about every 1 to 10 minutes while the session runs) and turned into revised or new check requests that Jason approves.
- **Access.** Private and not indexed. Jason is the only admin; the Admin pill in the ribbon is shown only to him. Admin page: team pick-list, single-use personal links (no expiry; a forwarded link fails), Email it (.eml for Outlook), Access dropdown, status per person, Remove. Viewers can read and post in the Forum only.
- **Disciplines:** Design, Approvals (only what an agency decides), General Contractor, ZPG. Refs N-nn. The watermain site keeps a Review tab for the bid package review list (Jason's request).
- **Job queue.** `repoqueue` jobs are done by the G14 Claude session, which reads the queue at session start.
- **The G14 is Claude's tool.** It is inside Jason's ecosystem and pre-approved: relay Jason's answers and jobs to it directly. Never ask Jason to type something into the G14 or run commands himself when the G14 can do it.
- **Pre-approve before sending.** If a G14 job could hit one of Jason's confirm-first items (Gmail send, account recovery or passwords, public posts under his name, TQQQ) or anything else that needs his permission, ask him first in this chat with a notification, then send the job with his approval quoted, so the G14 never stalls waiting for him.
- **Claude keeps itself connected.** When a connector (Drive, Gmail, Jason Memory) is signed out, Claude has the G14 reconnect it through Jason's Chrome with Continue with Google (luedersjason@gmail.com). Never ask Jason to re-set something up.
- **Money is forbidden.** No Claude moves money or touches banking, ever, approved or not.

## Appendix B: Independent sweep agent brief (copy, fill the brackets)

> You are auditing a construction project tracker ([project], [location]; [developer], [lead and role]). Today is [date]. Work item-first: for EVERY tracker item that is not Done, determine its true current state from the source material. Do not trust the existing notes; they may be stale. Read-only except your output file.
>
> Inputs under [folder]: `db\issues\*.json` (tracker), `db\validations\*.json` (past review requests; `comment` and `lastComment` are the lead's own reasons, treat as authoritative), `db\meetings\*.json`, `db\doclog\*.json`, `sources\` (emails as text with forwarded and attached emails inlined, meeting transcripts; the newest are the most important; transcripts are speech-to-text, read for meaning).
>
> Definitions: Open = owner can act now; Pending = waits on a predecessor or an outside response; Done = finished with evidence. Ball = who must move next now. Now = one sentence of current state.
>
> For each not-Done item decide: status, ball, now, whether the title is still accurate (propose one if not), whether the owner is right, latest evidence (date, source file, short quote), confidence (high, medium, low). Also flag: passed due dates; items with no movement in 7+ days; Done items the sources do not support; commitments or decisions no item covers; missing links (emails or attachments referred to but absent, for example a reply whose question is missing). Do not invent tasks; a remark is not a commitment unless someone agreed. Quote evidence under 25 words. Where evidence is ambiguous say so and set confidence low.
>
> Write JSON to [path]\sweep-result.json with keys: items, done_reopened, uncovered_commitments, missing_links, stale. Reply with counts of status changes, the five most important findings, and the file path.

---

### Changelog

- 2026-11-12: Documents cards: Check all / Check none / Download checked (one combined PDF via pdf-lib), template + all sites. C251 Utilities documents split into one card per service.
- 2026-11-11: Rule 13 (simple beats clever). `build_site.py --check` now fails when C251 is not checked out (it used to pass silently).

- 2026-11-10: C251 moved onto the template build (projects/c251, projects/c251-utilities, publicDir into the C251 repo). Utilities became their own sub-site at /utilities/ (ns util_, refs U-01..U-21, was C-01..C-21), like the Nitto Watermain beside L152. New extra tab type `paths` (section 1.12) brings back the stage-card layout. The old standalone utility pages redirect to /utilities/.

- 2026-11-09: In progress merged into Open (Jason). Statuses are Open, Pending, Done; the chip cycles Open -> Done -> Open; resolving a not-done check no longer moves an item to In progress; legacy In progress rows display as Open and were migrated in D1 (Nitto, L152, C251).

- 2026-11-09: Rule 12 added after the Refresh button was removed from C251 only and Jason had to ask for the template and Nitto. Header Refresh button removed from template, Nitto, L152 and C251 (auto-check every minute and on tab return covers it; `window.claudeRefresh` kept for the relay).
- 2026-11-09: Template: tracker flags open items missing a ball, Now line or confirmed date, counts them, asks for the ball on new issues, and shows when no sweep is on record (section 5).
- 2026-11-09: Sites are built from one shared template plus a config file per project (`template/`, `projects/`, `tools/build_site.py`); the per-site patch script is retired. Nitto Watermain and L152 rebuilt from it with identical output. Sections 2 and 12 updated.
- 2026-11-05: Process fix: Claude asked Jason to answer the G14 himself; the G14 is Claude's pre-approved tool, so Claude relays instead (Appendix C).
- 2026-11-09: Section 8: refs as highlighted page excerpts with wide context (kind `img`); comment arrow labelled Send to Claude with a waiting state.
- 2026-11-05: Appendix C added for the Nitto Watermain and L152 Cloudflare sites (hosting, no sample, access and invites, two sites, job queue).
- 2026-11-05: Right bar: tracker comment box (`asks`) that turns a typed change into a check request automatically. Added `repoqueue` (web chat to desktop chat job queue), section 13a (where each Claude can work), and rules 10 and 11 on the start page. J-20 closed as merged into J-19; J-47 removed. 11/3 internal recap posted to `meetings` (format: Executive Summary, Progress, Objectives, Details by Discipline written as what was discussed, Assignments by person once each, with decisions kept out of the details). MPC HVAC and plumbing cost items (11/4) and HVAC equipment list (11/5) traced into J-08, J-11, J-13, J-17, J-32.
- 2026-11-04: Added section 1 site anatomy (shell, left and right bars, Home cover, drawings strip, 3D model, status rail, Schedule Gantt rules and data format, approval path, week-by-week, Team directory with vCards, Teams chat, QR and photos, Meetings, Photos) and the consistency map. Maintenance rule: the playbook is updated with every Jaquet site change. ifc2mesh.py added to the handoff folder.
- 2026-11-04: Restructured into a handoff and collaboration standard: section 0 (start here), visual standard with tokens and components (3), writing and data formats (4), separate sections for validation requests (8), documents (9), meetings (10), new projects (12); sweep-agent brief as Appendix B; Jaquet facts consolidated in Appendix A. Old validation-UI history removed from the rules (kept below).
- 2026-11-04: Critical fix after J-31: item-first sweep with a saved record, thread check and missing links, independent sweep agent, answer from the record, recaps are drafts until reviewed. Data model: Pending (automatic from predecessors), now, ball, confirmed, source, due, sweeps; overdue and not-confirmed flags; check requests (Skip / Apply changes). Lessons from Procore, Microsoft Planner and Asana.
- 2026-11-04: Documents: Equipment cut sheets card with schedule-line and diagram-tag status; A1-A5 thumbnails from drawings/. Superseded layouts (9/24 first cut, v10 App. B, fall-zone exhibit) in z - archive only; Jaquet's Concept v9 on Jaquet provided.
- 2026-10-29: New plan set procedure (compare, copy, archive, replace sheets only without markups). Validation UI redesigned: one request per popup, source thumbnails, chat-style revise bar, proposal and Revise loop through the sample capability (republish must restate user scopes), invalid-request dismissal, no No button; Show me and Ask Claude buttons were added and later removed in favor of the thumbnail layout. Email-security attachments must be downloaded by Jason.
- 2026-10-28: Trace outputs proposals as validation requests; prior comments applied first. Documents cards are views over files; budget and schedule are not document cards; rule 11 equipment completeness. Owner replies to recaps are source documents. Playbook audit: Appendix A, voice-dictation note, no skill re-saves, ArtifactData tips, do-not-invent-steps and candid-asides rules, Copy for email, hard-coding gap. Oct 27 recap verified against the transcript. Tracker navigation (open items in the left bar, group pages, item detail pages). Approvals bucket = what the municipality decides. Shared-folder sync rule (current files only, superseded to z - archive, never delete). First version written from the Jaquet build.
