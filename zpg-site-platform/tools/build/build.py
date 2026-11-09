#!/usr/bin/env python3
"""Build public/index.html for the L152 project site (Zilber Industrial 3) from the Jaquet reference + Nitto data."""
import json, html, re, sys
SITE = (sys.argv[1] if len(sys.argv) > 1 else 'watermain')  # watermain = deployed site; l152 = parked building site
assert SITE in ('watermain', 'l152')
import os
SP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src') + '/'
PUB = '/home/user/claude/zpg-site-platform/public/'
E = html.escape
DATA = json.load(open('/home/user/claude/nitto-portal/_data.json'))
PROJ = json.load(open(SP + 'project.l152.json'))
import subprocess
BUILD = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=PUB).stdout.strip() + ' ' + __import__('datetime').date.today().isoformat()
# Playbook 6.4: discipline buckets by who does the work. Approvals = only what an agency itself decides.
DISCS = PROJ['disciplines']
AREAS = [k for k, n in DISCS]
AREA0 = 'Design'
DNAME_JS = '{' + ','.join("'%s':'%s'" % (k, n) for k, n in DISCS) + '}'
DISC_JS = '[' + ','.join("['%s','%s']" % (k, n) for k, n in DISCS) + ']'

# ---------- CSS: reference tokens and components, minus parts this site does not use ----------
css_lines = open(SP + 'ref.css').read().replace('</style>', '').split('\n')
DROP = ('.m3d', '.panel.m3d-only', '.bp{', '.bp ', '.cp', '.vcp', '.vq .vcpin', '.weeks', '.vis', '.prof-card.lb', '.facts', '.fact', '.team', '.hero', '.chip', '.status{', '.links', '.link', '.path{', '.od', '@media(max-width:600px){.od', '@media(max-width:600px){.cp')
css = '\n'.join(l for l in css_lines if not l.strip().startswith(DROP))
css += open(SP + 'own.css').read()

# ---------- JS: reference sections with Nitto edits ----------
ref = open(SP + 'ref.js').read().split('\n')
def sec(a, b):  # 1-based inclusive line range of ref.js
    return '\n'.join(ref[a - 1:b])

def R(s, a, b, n=1):
    c = s.count(a)
    assert c == n, (c, a[:120])
    return s.replace(a, b)

# ---------- Watermain site: same playbook layout, watermain-only content ----------
def _one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90]); return s.replace(a, b)
def wm_top(s):
    a = s.index('const MASTER=['); b = s.index('const VIEWS=')
    s = s[:a] + """const MASTER=[
 {n:'Approvals',lab:1},
 {n:'Village Board approves the DA, CSM and public improvement plans',s:'2026-08-24',m:1},
 {n:'Village conditional approval letter (conditions 1-12)',s:'2026-08-25',m:1},
 {n:'WDNR wetland and pond individual permits',s:'2026-10-15',m:1},
 {n:'WDNR Section 401 water quality certification',s:'2026-10-16',m:1},
 {n:'Village + KWU approve the watermain plans',s:'2026-11-04',m:1},
 {n:'Deadlines',lab:1},
 {n:'Watermain installed, inspected and accepted by the Village (DA s.6.1)',s:'2027-11-15',m:1,k:1},
];
""" + s[b:]
    s = re.sub(r"master:\{t:MASTER,s:'[0-9-]+',e:'[0-9-]+',title:'Master schedule',lede:'[^']*'\}",
               "master:{t:MASTER,s:'2026-08-01',e:'2027-12-31',title:'Master schedule',lede:'Confirmed dates only. Bid, contract, closing and construction dates are not set yet; they are in the approval path below.'}", s)
    a = s.index(" {t:'Building & site'"); b = s.index(" {t:'Village / DA'"); s = s[:a] + s[b:]
    s = re.sub(r"\[\['WDNR construction stormwater permit coverage, FIN 103538'.*?\],\n\s*\['KWU approval letter'", "[['KWU approval letter'", s, flags=re.S)
    s = _one(s, "{t:'Water main bid package'", "{t:'Bid package'")
    s = _one(s, "d:'What goes out to water main bidders:", "d:'What goes out to bidders:")
    return s
def wm_page(s):
    s = _one(s, '<title>L152 · Zilber Industrial 3</title>', '<title>Nitto Watermain</title>')
    s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="ZPG project site for the Nitto public watermain at Zilber Industrial 3, LakeView Corporate Park, Pleasant Prairie.">', s, count=1)
    s = _one(s, '<div class="ptitle">L152 <span>Zilber Industrial 3 · LakeView Corporate Park · Pleasant Prairie</span></div>', '<div class="ptitle">Nitto Watermain <span>Zilber Industrial 3 · LakeView Corporate Park</span></div>')
    s = _one(s, '\n    <button class="tab" data-tab="watermain" type="button">Nitto Watermain</button>', '')
    s = _one(s, '<button class="tab" data-tab="home" type="button">Home</button>', '<button class="tab" data-tab="home" type="button">Home</button>\n    <button class="tab" data-tab="review" type="button">Review</button>')
    a = s.index('<section class="cover"'); b = s.index('</section>', a) + len('</section>')
    s = s[:a] + """<section class="cover" style="background-image:linear-gradient(90deg,rgba(14,28,42,.92) 0%,rgba(14,28,42,.70) 42%,rgba(14,28,42,.05) 75%),url('img/docs/cover-plan.jpg')">
  <div class="cover-in">
    <span class="cover-eye">Nitto Watermain · LakeView Corporate Park · Pleasant Prairie, WI</span>
    <div class="cover-big"><b>1,100 ft</b><span>public 16″ water main<br>west side of Green Bay Road (STH 31)</span></div>
    <p>Goal: get a winning contractor under contract, send it to Kurt, and post the financial security the DA requires. The water main must be installed and accepted by Nov 15, 2027.</p>
    <div class="status" id="status"><span class="chip now"><span class="dot"></span>Fix the project manual</span><span class="chip">Plans approved 11/4</span><span class="chip">Accept by 11/15/27</span></div>
  </div>
  <button type="button" class="cover-zoom" data-sheets="PL-1,PL-2,PL-3,PL-4,PL-5,PL-6,PL-7,PL-8">Open the bid set ⤢</button>
</section>""" + s[b:]
    s = _one(s, 'Nitto Watermain bid set · Pinnacle 11/3/26 · building plan set not on file here', 'Public watermain plans, bid set · Pinnacle 11/3/26')
    rv = re.search(r'<section id="review">.*?</section>', s, re.S).group(0)
    a = s.index('<div class="panel" data-panel="watermain" hidden>'); b = s.index('</main>', a)
    s = s[:a] + '<div class="panel" data-panel="review" hidden>\n' + rv + '\n<section class="box" aria-label="About the water main"><span class="eyebrow">The work</span><p class="about">%%SUMMARY%%</p></section>\n</div>\n' + s[b:]
    s = _one(s, '<span class="eyebrow">From the DA and site &amp; operational plan approval letters (8/25/26)</span><h2>Approval path, from water main bid to permits</h2>', '<span class="eyebrow">From the DA approval letter and DA draft</span><h2>Approval path, from plan approval to acceptance</h2>')
    s = re.sub(r'<p class="lede">The DA must be executed and the water main financial security provided.*?</p>', "<p class=\"lede\">The Village sizes the financial security at 120% of the public improvements, inspections and construction-related services, from the signed contract and Pinnacle's construction management estimate (DA Article VI, Ordinance s.395-17; conditions 6 and 7). The DA, Memorandum of DA and Stormwater Maintenance Agreement are signed at closing and recorded before any permits for the watermain (conditions 8 and 9). The Village schedules the preconstruction meeting once all documents and permits are in (condition 11). Dates for bidding, contract, closing and construction are not set yet.</p>", s, count=1, flags=re.S)
    s = _one(s, 'L152 · Zilber Industrial 3 · LakeView Corporate Park</span><h2>Project directory</h2>', 'Nitto Watermain · LakeView Corporate Park</span><h2>Project directory</h2>')
    s = _one(s, 'No recurring meeting is set for L152 yet.', 'No recurring meeting is set for the water main yet.')
    return s
def wm_final(s):
    for a, b in [("watermain:'Nitto Watermain'", "review:'Review'"), ("L152_project_directory.vcf", "Nitto_watermain_directory.vcf"),
                 ("NOTE:L152 - Zilber Industrial 3 (LakeView Corporate Park)", "NOTE:Nitto Watermain (Zilber Industrial 3, LakeView Corporate Park)"),
                 ("markups from the L152 project site", "markups from the Nitto watermain project site"), ("const fn=`L152_", "const fn=`Nitto_")]:
        s = _one(s, a, b)
    s = re.sub(r'keep the tracker for project L152 \([^)]*\) correct\.', 'keep the tracker for the Nitto public watermain (Zilber Industrial 3, LakeView Corporate Park, Pleasant Prairie) correct.', s)
    left = [m.start() for m in re.finditer('L152', s.replace('>L152 project →<', ''))]
    assert not left, [s[i-60:i+40] for i in left[:5]]
    return s

tracker = sec(247, 362)
tracker = R(tracker, "const DNAME={Design:'Drawings and Design',Approvals:'Village, DSPS & permits',Steel:'Structural & steel',Fire:'Fire protection',MEP:'MEP & process piping','General Contractor':'General Contractor',Jaquet:'Owner decisions (Jaquet)'};",
            "const DNAME=" + DNAME_JS + ";")
tracker = R(tracker, "Sign in to claude.ai to see the tracker.", "Sign in to see the tracker.")
tracker = R(tracker, "const ref='J-'+", "const ref='N-'+")

directory = sec(363, 463)
a = directory.index('  const firms={'); b = directory.index('  const esc=s=>')
directory = directory[:a] + open(SP + 'own_team.js').read() + directory[b:]
directory = R(directory, "    ${f.ph?`<div class=\"ln\">${I.ph}${esc(f.ph)}</div>`:''}",
              "    ${p.ph?`<div class=\"ln\">${I.ph}${esc(p.ph)}</div>`:''}\n    ${f.ph?`<div class=\"ln\" title=\"Office main line\">${I.ph}${esc(f.ph)}</div>`:(p.ph?'':'<div class=\"tbc\">Phone to confirm</div>')}")
directory = R(directory, "f.ph?`TEL;TYPE=WORK,VOICE:${f.ph}`:''", "p.ph?`TEL;TYPE=WORK,VOICE:${p.ph}`:'',f.ph&&f.ph!==p.ph?`TEL;TYPE=WORK,VOICE:${f.ph}`:''")
directory = R(directory, "`NOTE:Jaquet USA BTS (LakeView Corporate Park) – ${f.g}${p.r?': '+p.r:''}`", "`NOTE:L152 - Zilber Industrial 3 (LakeView Corporate Park) – ${f.g}${p.r?': '+p.r:''}`")
directory = R(directory, "[['Project role',p.r],['Email',p.em||'To confirm'],['Office',f.ph],", "[['Project role',p.r],['Email',p.em||'To confirm'],['Phone',p.ph],['Office',f.ph||'To confirm'],")
directory = R(directory, "${[f.addr,f.ph].filter(Boolean).map(esc).join(' · ')}", "${[f.addr,f.ph||'Main line to confirm'].filter(Boolean).map(esc).join(' · ')}")
directory = R(directory, "'<span class=\"note\">No published bio on the company website yet.</span>'", "'<span class=\"note\">Bio to confirm.</span>'")
# qrcodejs 1.0.0 sizes the code by characters, not UTF-8 bytes, so a non-ASCII character (the en dash in NOTE) overflows it
directory = R(directory, "new QRCode(q,{text:vcf(p),", "new QRCode(q,{text:vcf(p).replace(/[\\u2013\\u2014]/g,'-').replace(/[^\\x00-\\x7F]/g,''),")
directory = R(directory, "  const order=['jaq','zpg','riley','pida','ras','pin','mpc','next','ahern','card','tbd'];", "  const order=['zpg','pin','vpp','kwu','wdnr','usace'];")
directory = R(directory, "save('Jaquet_project_directory.vcf'", "save('L152_project_directory.vcf'")

shell = sec(464, 543)
shell = R(shell, "const label={home:'Home',tracker:'Tracker',documents:'Documents',schedule:'Schedule',team:'Team',meetings:'Meetings',photos:'Photos'};",
          "const label={home:'Home',tracker:'Tracker',documents:'Documents',schedule:'Schedule',team:'Team',meetings:'Meetings',photos:'Photos',watermain:'Nitto Watermain'};")
shell = R(shell, "'.panel tbody tr, .panel li, .panel .pcard, .panel .item, .panel .step, .panel section > header h2, .panel .g-row'",
          "'.panel tbody tr, .panel li, .panel .pcard, .panel .ri, .panel .step, .panel section > header h2, .panel .g-row, .panel .act'")
shell = R(shell, "const DISC=[['Design','Drawings and Design'],['Approvals','Village, DSPS & permits'],['Steel','Structural & steel'],['Fire','Fire protection'],['MEP','MEP & process piping'],['General Contractor','General Contractor'],['Jaquet','Owner decisions (Jaquet)']];",
          "const DISC=" + DISC_JS + ";")
shell = R(shell, "Sign in to claude.ai to see the feed.", "Sign in to see the feed.")

issue_modal = sec(544, 551)
visuals = sec(552, 559)
drawings = sec(620, 633)
a = drawings.index('  const SHEETS=['); b = drawings.index('  const tabs=')
drawings = drawings[:a] + "  const SHEETS=window.NW_SHEETS.filter(s=>/^PL-/.test(s.id)).map(s=>({id:s.lab.split(' ')[0],t:s.lab.split(' ').slice(1).join(' '),img:s.img,sid:s.id}));\n" + drawings[b:]
drawings = R(drawings, "view.dataset.full=s.img;view.dataset.cap=s.id+' · '+s.t+' · PIDA 10/28/26';", "view.dataset.sid=s.sid;")
drawings = R(drawings, "  tabs.addEventListener('click',e=>{const b=e.target.closest('.dw-tab');if(b)show(+b.dataset.i);});",
  "  tabs.addEventListener('click',e=>{const b=e.target.closest('.dw-tab');if(b)show(+b.dataset.i);});\n  view.addEventListener('click',()=>{if(window.jqOpenSheets)window.jqOpenSheets(SHEETS.map(s=>s.sid),view.dataset.sid);});")
meetings = sec(1033, 1084)

viewer = sec(634, 906)
a = viewer.index("  const SHEETS=[{id:'A1'"); b = viewer.index("  let vis=[0,1,2,3,4];")
viewer = viewer[:a] + "  const SHEETS=window.NW_SHEETS.map(x=>Object.assign({},x));\n  let vis=[0];" + viewer[b + len("  let vis=[0,1,2,3,4];"):]
viewer = R(viewer, "  const PDF_URL='drawings/26082-Jacquet-plans-102826.pdf', SETDATE='10/28/26';\n", "  const PDF_URL='', SETDATE='';  // every sheet here is a rendered page (x:1); no vector base set\n")
viewer = R(viewer, "img.src=S.img;$('dvSheets')", "img.src=S.img;{const o=$('dvOrig');if(o){o.hidden=!S.pdf;if(S.pdf)o.href=S.pdf+(S.pg?'#page='+S.pg:'');}}$('dvSheets')")
a = viewer.index("  // open from the Home page drawing"); b = viewer.index("  /* ---------- shared database")
viewer = viewer[:a] + viewer[b:]
viewer = R(viewer, "Sign in to claude.ai to save markup layers.", "Sign in to save markup layers.")
viewer = R(viewer, "markups from jaquet project site", "markups from the L152 project site")
viewer = R(viewer, "const fn=`Jaquet_", "const fn=`L152_")

docsdb = sec(907, 915)

val = sec(916, 1032)
val = R(val, "(/^A\\d$/.test(x.ids[0])?'drawings/':'sheets/')", "'sheets/'")
a = val.index("  function openCp(v,text){"); b = val.index("  function paint(){")
val = val[:a] + val[b:]
val = R(val, '<div class="vfl vcpr"><button type="button" class="vcp" data-a="cp" title="Open Copilot (placeholder)"><span class="cp-ic"><img src="img/copilot.png" alt="" width="28" height="28"></span>Copilot</button><input class="vcpin" data-f="cp" placeholder="Ask Copilot…" maxlength="300" aria-label="Ask Copilot"></div>', '')
val = R(val, "    if(a==='cp'){const ti=card.querySelector('[data-f=cp]');openCp(v,ti?ti.value.trim():'');return;}\n", "")
val = R(val, "ref='J-'+", "ref='N-'+", 2)
val = R(val, "area:it.area||'Design'", "area:it.area||'" + AREA0 + "'")
val = R(val, "area:v.nextArea||'Design'", "area:v.nextArea||'" + AREA0 + "'")
val = R(val, '"blockedBy":["J-00"]}],"itemUpdates":[{"ref":"J-00"', '"blockedBy":["N-00"]}],"itemUpdates":[{"ref":"N-00"')
val = R(val, "keep a construction project tracker correct.", "keep the tracker for project L152 (Zilber Industrial 3, Nitto parcel, LakeView Corporate Park, Pleasant Prairie: building, site, approvals and the public water main) correct.")
val = R(val, "Areas allowed: Design (Drawings and Design), Approvals (only what the Village or DSPS itself decides), Steel, Fire, MEP, General Contractor, Jaquet (what Jaquet itself must do).",
        "Areas allowed (use the exact key): Design (Drawings and Design, Pinnacle), Approvals (only what the Village, WDNR, Army Corps or KWU itself decides), General Contractor (bidding, cost, construction), ZPG (what ZPG itself must do).")

man = json.load(open(PUB + 'sheets/manifest.json'))
spec = json.load(open(SP + 'spec.json'))
pdfmap = {s['id']: ('docs/' + s['pdf'].split('/')[-1], s['page']) for s in spec}
for m in man:
    m['pdf'], m['pg'] = pdfmap[m['id']]
sheets_js = 'window.NW_SHEETS=' + json.dumps(man, separators=(',', ':')) + ';'

_t = open(SP + 'own_team.js').read()
_firms = json.loads(re.search(r'const firms=(\{.*?\});\n', _t, re.S).group(1))
_people = json.loads(re.search(r'const P=(\[.*?\]);', _t, re.S).group(1))
json.dump([{'id': x['id'], 'name': (x['fn'] + ' ' + x['ln']).strip(), 'company': _firms.get(x['f'], {}).get('n', ''),
            'email': x.get('em', ''), 'role': x.get('t', '') or x.get('r', '')} for x in _people],
          open(PUB + 'team.json', 'w'), indent=0)
OWN_TOP = open(SP + 'own_top.js').read()
if SITE == 'watermain':
    OWN_TOP = wm_top(OWN_TOP)
js = '\n'.join([sheets_js, OWN_TOP, tracker, directory, shell, issue_modal, visuals, drawings, viewer, docsdb, val, meetings])
# Validation refs: kind 'img' = highlighted page excerpt (public/excerpts/*.png), shown wide with surrounding context.
js = R(js, "const img=x.kind==='sheet'&&x.ids&&x.ids[0]?", "const img=x.kind==='img'&&x.img?`<div class=\"vt-i\" style=\"background-image:url('${esc(x.img)}');background-size:cover;background-position:center top\"></div>`:x.kind==='sheet'&&x.ids&&x.ids[0]?")
js = R(js, "const back=()=>{$('vRef').hidden=true;$('vModal').hidden=false;};", "const back=()=>{$('vRef').hidden=true;$('vModal').hidden=false;};const card=$('vRef').querySelector('.prof-card');card.style.maxWidth='720px';\n    if(r.kind==='img'){card.style.maxWidth='1200px';$('vRefT').textContent=r.title||r.label;$('vRefB').innerHTML='<img src=\"'+esc(r.img)+'\" alt=\"'+esc(r.label)+'\" style=\"display:block;width:100%;border:1px solid #D5DDE5;border-radius:6px\">'+(r.body?'<p style=\"margin-top:10px\">'+esc(r.body)+'</p>':'')+(r.src?'<p class=\"note\" style=\"margin-top:6px\">Source: '+esc(r.src)+'</p>':'');$('vModal').hidden=true;$('vRef').hidden=false;$('vRefX').onclick=back;$('vRef').onclick=e=>{if(e.target===$('vRef'))back();};return;}")
# The arrow sends the comment to Claude's seat (no API on this site); show that it is waiting until Claude revises.
js = R(js, 'title="Revise per comment" aria-label="Revise per comment"', 'title="Send to Claude" aria-label="Send to Claude"')
js = R(js, 'placeholder="Correct me or add a step, then press Enter to revise"', 'placeholder="Correct me or add a step, then press Enter to send it to Claude"')
js = R(js, "${v.lastComment?`<div class=\"vlc\">Your last comment: ${esc(v.lastComment)}</div>`:''}", "${v.lastComment?`<div class=\"vlc\">${v.commentPending?'Sent to Claude, waiting for its revision: ':'Your last comment: '}${esc(v.lastComment)}${!v.commentPending&&v.reply?'<br>Claude: '+esc(v.reply):''}</div>`:''}")
assert '</script' not in js

# ---------- Home content from _data.json ----------
path = DATA['path']
now_i = next(i for i, p in enumerate(path) if p[1] == 'now')
def pstep(i, p):
    t, st, n = p
    cls = {'done': 'done', 'now': 'now', 'next': 'next'}.get(st, '')
    if i == len(path) - 1: cls += ' key'
    eye = {'done': 'Done' + (' · ' + n if n and len(n) <= 6 else ''), 'now': 'Now', 'next': 'Next'}.get(st, 'Step %d' % (i + 1))
    note = n if (n and not (st == 'done' and len(n) <= 6)) else ''
    mark = '&#10003;' if st == 'done' else str(i + 1)
    return f'<li class="pstep {cls.strip()}"><i>{mark}</i><div><span class="eyebrow">{E(eye)}</span><b>{E(t)}</b>' + (f'<small>{E(note)}</small>' if note else '') + '</div></li>'
rail = ''.join(pstep(i, p) for i, p in enumerate(path))
donext = ''.join(f'<div class="act"><span class="eyebrow">{E(o)}</span><b>{E(t)}</b></div>' for t, o in DATA['donext'])
waiting = ''.join(f'<div class="act"><span class="eyebrow">{E(w)}</span><b>{E(t)}</b><em>{E(d)}</em></div>' for w, t, d in DATA['waiting'])
sent = ''.join(f'<span>{E(x)}</span>' for x in DATA['sent_to_pinnacle'])

# approval path cards (Schedule tab): steps after plan approval, no invented dates
steps_html = []
for i, (t, st, n) in enumerate(path):
    if st == 'done':
        continue
    last = i == len(path) - 1
    eye = 'Village acceptance by Mon Nov 15, 2027' if last else ('In progress · ' + n if st == 'now' and n else 'Date not set')
    note = {'now': 'Eight items sent to Pinnacle 11/4; answers awaited.',
            'next': 'Village-prequalified contractors only (Ch. 405). Bid date not set.'}.get(st, '')
    if last: note = 'Installed, inspected and accepted by the Village (DA s.6.1, condition 4). Construction dates not set.'
    elif not note: note = {3: 'Village checks the itemized contract, owner name and COI (condition 6c).',
                           4: '120% of public improvements, inspections and construction services (condition 7).',
                           5: 'DA, Memorandum of DA and SWMA executed; security delivered (condition 8).',
                           6: 'Recorded copies to the Village within 72 hours; then permits (conditions 9-12).'}.get(i, '')
    steps_html.append(f'<div class="step{" next" if st == "now" else ""}"><span class="eyebrow{" nd" if eye == "Date not set" else ""}">{E(eye)}</span><b>{E(t)}</b><span>{E(note)}</span></div>')
steps_html = ''.join(steps_html)

def rail4(steps):  # playbook 1.4: Now, Next, Gate, Target
    out = []
    for cls, eye, t, n in steps:
        out.append(f'  <div class="rstep{(" " + cls) if cls else ""}"><i></i><span class="eyebrow">{E(eye)}</span><b>{E(t)}</b><small>{E(n)}</small></div>')
    return '\n'.join(out)
AREAOPTS = ''.join(f'<option value="{E(k)}">{E(n)}</option>' for k, n in DISCS)
page = open(SP + 'page.html').read()
if SITE == 'watermain':
    page = wm_page(page)
for k, v in {'%%CSS%%': css, '%%JS%%': js,
             '%%SUMMARY%%': E(DATA['summary']), '%%STEPS%%': steps_html,
             '%%BUILD%%': BUILD, '%%SITELINK%%': ('<a class="tab" href="/l152/" style="text-decoration:none;border:1px solid rgba(255,255,255,.45);border-radius:6px;padding:6px 12px;margin-left:8px">L152 project →</a>' if SITE == 'watermain' else '<a class="tab" href="/" style="text-decoration:none;border:1px solid rgba(255,255,255,.45);border-radius:6px;padding:6px 12px;margin-left:8px">Nitto Watermain →</a>'), '%%RAIL4%%': rail4(PROJ['wrail'] if SITE == 'watermain' else PROJ['rail']), '%%WRAIL4%%': rail4(PROJ['wrail']), '%%AREAOPTS%%': AREAOPTS}.items():
    if k == '%%WRAIL4%%' and SITE == 'watermain': continue
    assert k in page, k
    page = page.replace(k, v)
OUTF = PUB + 'index.html' if SITE == 'watermain' else PUB + 'l152/index.html'
import os; os.makedirs(os.path.dirname(OUTF), exist_ok=True)
if SITE == 'watermain':
    page = wm_final(page)
else:
    page = page.replace('<head>', '<head>\n<base href="/">', 1)   # assets are shared at the site root
    i = page.index('<div class="panel" data-panel="watermain" hidden>'); j = page.index('</main>', i)
    page = page[:i] + '<div class="panel" data-panel="watermain" hidden>\n<section><header><span class="eyebrow">Public water main · its own site</span><h2>Nitto Watermain</h2><p class="lede">The public water main has its own project site with the bid package review, tracker, documents and schedule.</p></header><p><a class="btn go" href="/">Open the Nitto Watermain site →</a></p></section>\n</div>\n' + page[j:]
open(OUTF, 'w').write(page)
open(SP + 'app_extracted.js', 'w').write(js)
print(SITE, OUTF, len(page) // 1024, 'KB')
