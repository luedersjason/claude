#!/usr/bin/env python3
"""Build public/index.html for the L152 project site (Zilber Industrial 3) from the Jaquet reference + Nitto data."""
import json, html, re
import os
SP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src') + '/'
PUB = '/home/user/claude/zpg-site-platform/public/'
E = html.escape
DATA = json.load(open('/home/user/claude/nitto-portal/_data.json'))
PROJ = json.load(open(SP + 'project.json'))
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

js = '\n'.join([sheets_js, open(SP + 'own_top.js').read(), tracker, directory, shell, issue_modal, visuals, drawings, viewer, docsdb, val, meetings])
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
for k, v in {'%%CSS%%': css, '%%JS%%': js,
             '%%SUMMARY%%': E(DATA['summary']), '%%STEPS%%': steps_html,
             '%%RAIL4%%': rail4(PROJ['rail']), '%%WRAIL4%%': rail4(PROJ['wrail']), '%%AREAOPTS%%': AREAOPTS}.items():
    assert k in page, k
    page = page.replace(k, v)
open(PUB + 'index.html', 'w').write(page)
open(SP + 'app_extracted.js', 'w').write(js)
print('index.html', len(page) // 1024, 'KB')
