#!/usr/bin/env python3
"""Build public/index.html for the Nitto project site (Zilber Industrial 3) from the Jaquet reference + Nitto data."""
import json, html, re
import os
SP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src') + '/'
PUB = '/home/user/claude/zpg-site-platform/public/'
E = html.escape
DATA = json.load(open('/home/user/claude/nitto-portal/_data.json'))
PROJ = json.load(open(SP + 'project.json'))
AREAS = [w[0] for w in PROJ['ws']]
AREA0 = 'Public water main'
DNAME_JS = '{' + ','.join("'%s':'%s'" % (a, a) for a in AREAS) + '}'
DISC_JS = '[' + ','.join("['%s','%s']" % (a, a) for a in AREAS) + ']'

# ---------- CSS: reference tokens and components, minus parts this site does not use ----------
css_lines = open(SP + 'ref.css').read().replace('</style>', '').split('\n')
DROP = ('.m3d', '.panel.m3d-only', '.bp', '.cp', '.vcp', '.mt-', '.vq .vcpin', '.weeks', '.vis', '.prof-card.lb', '.cover-zoom', '.dw', '.facts', '.fact', '.team', '.hero', '.chip', '.status{', '.links', '.link', '.path{', '.od', '@media(max-width:600px){.od', '@media(max-width:600px){.cp')
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
directory = R(directory, "`NOTE:Jaquet USA BTS (LakeView Corporate Park) – ${f.g}${p.r?': '+p.r:''}`", "`NOTE:Nitto - Zilber Industrial 3 (LakeView Corporate Park) – ${f.g}${p.r?': '+p.r:''}`")
directory = R(directory, "[['Project role',p.r],['Email',p.em||'To confirm'],['Office',f.ph],", "[['Project role',p.r],['Email',p.em||'To confirm'],['Phone',p.ph],['Office',f.ph||'To confirm'],")
directory = R(directory, "${[f.addr,f.ph].filter(Boolean).map(esc).join(' · ')}", "${[f.addr,f.ph||'Main line to confirm'].filter(Boolean).map(esc).join(' · ')}")
directory = R(directory, "'<span class=\"note\">No published bio on the company website yet.</span>'", "'<span class=\"note\">Bio to confirm.</span>'")
# qrcodejs 1.0.0 sizes the code by characters, not UTF-8 bytes, so a non-ASCII character (the en dash in NOTE) overflows it
directory = R(directory, "new QRCode(q,{text:vcf(p),", "new QRCode(q,{text:vcf(p).replace(/[\\u2013\\u2014]/g,'-').replace(/[^\\x00-\\x7F]/g,''),")
directory = R(directory, "  const order=['jaq','zpg','riley','pida','ras','pin','mpc','next','ahern','card','tbd'];", "  const order=['zpg','pin','vpp','kwu','wdnr','usace'];")
directory = R(directory, "save('Jaquet_project_directory.vcf'", "save('Nitto_project_directory.vcf'")

shell = sec(464, 543)
shell = R(shell, "const label={home:'Home',tracker:'Tracker',documents:'Documents',schedule:'Schedule',team:'Team',meetings:'Meetings',photos:'Photos'};",
          "const label={home:'Home',watermain:'Water main',tracker:'Tracker',documents:'Documents',schedule:'Schedule',team:'Team'};")
shell = R(shell, "'.panel tbody tr, .panel li, .panel .pcard, .panel .item, .panel .step, .panel section > header h2, .panel .g-row'",
          "'.panel tbody tr, .panel li, .panel .pcard, .panel .ri, .panel .step, .panel section > header h2, .panel .g-row, .panel .act'")
shell = R(shell, "const DISC=[['Design','Drawings and Design'],['Approvals','Village, DSPS & permits'],['Steel','Structural & steel'],['Fire','Fire protection'],['MEP','MEP & process piping'],['General Contractor','General Contractor'],['Jaquet','Owner decisions (Jaquet)']];",
          "const DISC=" + DISC_JS + ";")
shell = R(shell, "const feedEl=document.getElementById('feed'), postsEl=document.getElementById('posts'), form=document.getElementById('postForm');", "const feedEl=document.getElementById('feed');")
shell = R(shell, "if(!db){document.getElementById('feedForm').hidden=true;feedEl.innerHTML='<li class=\"note\">Sign in to claude.ai to see the feed.</li>';postsEl.innerHTML='<p class=\"note\">Sign in to see the forum.</p>';form.hidden=true;return;}",
          "if(!db){document.getElementById('feedForm').hidden=true;feedEl.innerHTML='<li class=\"note\">Sign in to see the feed.</li>';return;}")
a = shell.index("    db.collection('posts').onSnapshot("); b = shell.index("\n  })();\n})();", a)
shell = shell[:a].rstrip('\n') + shell[b:]
# Search hits inside a closed review item: open it so the hit is visible (details handled already)

issue_modal = sec(544, 551)
visuals = sec(552, 559)

viewer = sec(634, 906)
a = viewer.index("  const SHEETS=[{id:'A1'"); b = viewer.index("  let vis=[0,1,2,3,4];")
viewer = viewer[:a] + "  const SHEETS=window.NW_SHEETS.map(x=>Object.assign({},x));\n  let vis=[0];" + viewer[b + len("  let vis=[0,1,2,3,4];"):]
viewer = R(viewer, "  const PDF_URL='drawings/26082-Jacquet-plans-102826.pdf', SETDATE='10/28/26';\n", "  const PDF_URL='', SETDATE='';  // every sheet here is a rendered page (x:1); no vector base set\n")
viewer = R(viewer, "img.src=S.img;$('dvSheets')", "img.src=S.img;{const o=$('dvOrig');if(o){o.hidden=!S.pdf;if(S.pdf)o.href=S.pdf+(S.pg?'#page='+S.pg:'');}}$('dvSheets')")
a = viewer.index("  // open from the Home page drawing"); b = viewer.index("  /* ---------- shared database")
viewer = viewer[:a] + viewer[b:]
viewer = R(viewer, "Sign in to claude.ai to save markup layers.", "Sign in to save markup layers.")
viewer = R(viewer, "markups from jaquet project site", "markups from the Nitto project site")
viewer = R(viewer, "const fn=`Jaquet_", "const fn=`Nitto_")

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
val = R(val, "keep a construction project tracker correct.", "keep the tracker for the Nitto project (Zilber Industrial 3, LakeView Corporate Park, Pleasant Prairie: building, site, approvals and the public water main) correct.")
val = R(val, "Areas allowed: Design (Drawings and Design), Approvals (only what the Village or DSPS itself decides), Steel, Fire, MEP, General Contractor, Jaquet (what Jaquet itself must do).",
        "Areas allowed (use the exact text): " + ", ".join(AREAS) + ".")

man = json.load(open(PUB + 'sheets/manifest.json'))
spec = json.load(open(SP + 'spec.json'))
pdfmap = {s['id']: ('docs/' + s['pdf'].split('/')[-1], s['page']) for s in spec}
for m in man:
    m['pdf'], m['pg'] = pdfmap[m['id']]
sheets_js = 'window.NW_SHEETS=' + json.dumps(man, separators=(',', ':')) + ';'

js = '\n'.join([sheets_js, open(SP + 'own_top.js').read(), tracker, directory, shell, issue_modal, visuals, viewer, docsdb, val])
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

pp = PROJ['path']
pnow = next(i for i, x in enumerate(pp) if x[1] == 'now')
def prail(path):
    out = []
    for i, (t, st, n) in enumerate(path):
        cls = {'done': 'done', 'now': 'now', 'next': 'next'}.get(st, '') + (' key' if i == len(path) - 1 else '')
        eye = {'done': 'Done' + (' · ' + n if n and len(n) <= 12 else ''), 'now': 'Now', 'next': 'Next'}.get(st, 'Step %d' % (i + 1))
        note = n if (n and not (st == 'done' and len(n) <= 12)) else ''
        mark = '&#10003;' if st == 'done' else str(i + 1)
        out.append(f'<li class="pstep {cls.strip()}"><i>{mark}</i><div><span class="eyebrow">{E(eye)}</span><b>{E(t)}</b>' + (f'<small>{E(note)}</small>' if note else '') + '</div></li>')
    return ''.join(out)
P_DONEXT = ''.join(f'<div class="act"><span class="eyebrow">{E(o)}</span><b>{E(t)}</b></div>' for t, o in PROJ['donext'])
P_WAIT = ''.join(f'<div class="act"><span class="eyebrow">{E(w)}</span><b>{E(t)}</b><em>{E(d)}</em></div>' for w, t, d in PROJ['waiting'])
P_WS = ''.join(f'<button type="button" class="ws-card" data-tabgo="tracker"><b>{E(a)}</b><span>{E(d)}</span></button>' for a, d in PROJ['ws'])
AREAOPTS = ''.join(f'<option>{E(a)}</option>' for a in AREAS)
page = open(SP + 'page.html').read()
for k, v in {'%%CSS%%': css, '%%JS%%': js, '%%RAIL%%': rail, '%%DONEXT%%': donext, '%%WAITING%%': waiting, '%%SENT%%': sent,
             '%%SUMMARY%%': E(DATA['summary']), '%%STEPN%%': str(now_i + 1), '%%STEPS%%': steps_html, '%%PATHN%%': str(len(path)),
             '%%PSUMMARY%%': E(PROJ['summary']), '%%PSTEPN%%': str(pnow + 1), '%%PPATHN%%': str(len(pp)), '%%PRAIL%%': prail(pp),
             '%%PDONEXT%%': P_DONEXT, '%%PWAITING%%': P_WAIT, '%%PWS%%': P_WS, '%%AREAOPTS%%': AREAOPTS}.items():
    assert k in page, k
    page = page.replace(k, v)
open(PUB + 'index.html', 'w').write(page)
open(SP + 'app_extracted.js', 'w').write(js)
print('index.html', len(page) // 1024, 'KB')
