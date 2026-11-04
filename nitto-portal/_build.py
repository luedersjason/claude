import json, html, datetime
S = json.load(open('_data.json'))
E = html.escape
OUT = 'watermain.html'
VERSION = 'v4'
UPDATED = '2026-11-04 4:15 PM'

DOCS = [
 ('Village DA conditional approval letter', 'Rob Hanson, 8/25/26. Conditions 1-12.', 'NW-Village-DA-Approval-Letter-8.25.26.pdf'),
 ('Development Agreement (draft) with Exhibits', 'Art. VI Financial Security; D1/D2 blank.', 'NW-Development-Agreement-DRAFT.pdf'),
 ('Project manual (contract, terms, bid form)', 'Pinnacle, 11/3/26.', 'NW-Project-Manual-Pinnacle-11.3.26.pdf'),
 ('Public watermain plans, bid set', 'Pinnacle 644.00 rev. 4, 11/3/26.', 'NW-Public-Watermain-Plans-BidSet-11.3.26.pdf'),
 ('KWU approval letter', 'Ian Bagley, 11/4/26.', 'NW-KWU-Approval-11.4.26.pdf'),
 ('Village Engineer comments', 'Marked plans, 8/11/26.', 'NW-Village-Engineer-Comments-8.11.26.pdf'),
 ('CSM dedication language (draft)', '"Lakeveiw" typo.', 'NW-CSM-Dedication-Covenant-Language-DRAFT.pdf'),
 ('Stormwater Maintenance Agreement (draft)', 'Exhibit B still needed.', 'NW-Stormwater-Maintenance-Agreement-DRAFT.pdf'),
]
TAG = {'done':('g','Done'),'active':('b','In progress'),'open':('n','Open'),'attn':('r','Needs action'),'hold':('a','On hold'),'na':('n','N/A')}

def path():
    h=''
    for i,(t,st,n) in enumerate(S['path'],1):
        mark = '&#10003;' if st=='done' else str(i)
        h += f'<li class="p-{st or "later"}"><span class="pn">{mark}</span><span class="pt">{E(t)}</span>' + (f'<span class="pnote">{E(n)}</span>' if n else '') + '</li>'
    return f'<ol class="path">{h}</ol>'

def rows(items, cls):
    return ''.join(f'<div class="{cls}"><b>{E(a)}</b><span>{E(b)}</span>' + (f'<em>{E(c)}</em>' if len(x)>2 else '') + '</div>' for x in items for a,b,*c_ in [x] for c in [c_[0] if c_ else ''])

def review():
    h='<div class="rtools"><span id="rcount" style="font-size:13px;color:var(--muted);font-weight:600"></span><span style="margin-left:auto;display:flex;gap:6px"><button class="btn" type="button" id="r-open">Expand all</button><button class="btn" type="button" id="r-close">Collapse all</button></span></div>'
    for g in S['review']:
        h += f'<h3 class="rg">{E(g["g"])} <span class="cnt">{len(g["items"])}</span></h3>'
        for it in g['items']:
            k=it['k']
            where=''.join(f'<li><b>{E(a)}</b> &middot; {E(b)}</li>' for a,b in it['where'])
            cur=''.join(f'<p>{E(x)}</p>' for x in it['cur'])
            new=''.join(f'<p>{E(x)}</p>' for x in it['new'])
            h += f'''<details class="ri" data-k="{k}"><summary><span class="rk">{k}</span><span class="rt">{E(it["t"])}</span><span class="tag n rs">Open</span></summary>
<div class="rd">
 <div class="rrow"><span class="lab">Where</span><ul class="wl">{where}</ul></div>
 <div class="rrow"><span class="lab">Who edits</span><div>{E(it["who"])}</div></div>
 <div class="rbox cur"><span class="lab">Current text</span>{cur}</div>
 <div class="rbox new"><span class="lab">Proposed</span>{new}</div>
 <div class="rrow"><span class="lab">Why</span><div>{E(it["why"])}</div></div>
 <div class="rrow"><span class="lab">On accept</span><div>{E(it["deliver"])}</div></div>
 <div class="dec"><button type="button" data-d="accept">Accept</button><button type="button" data-d="change">Accept with changes</button><button type="button" data-d="reject">Reject</button><button type="button" data-d="discuss">Discuss with Pinnacle</button></div>
 <textarea class="dnote" id="note-{k}" rows="2" placeholder="Notes from the review (optional)"></textarea>
</div></details>'''
    return h

def steps():
    h=''
    for w in S['ws']:
        h += f'<h3 class="rg">{E(w["name"])}</h3>'
        for s in w['steps']:
            t,tl=TAG[s['s']]
            h += f'<div class="srow"><span class="tag {t}">{tl}</span><div><b>{E(s["t"])}</b><div class="d">{E(s["o"])}{" &middot; "+E(s["d"]) if s.get("d") else ""}{" &middot; "+E(s["n"]) if s["n"] else ""}</div></div></div>'
    return h

def obligations():
    h=''
    for g in S['obl']:
        h += f'<h3 class="rg">{E(g["g"])}</h3><div class="tblw"><table class="otbl"><tbody>'
        for r in g['rows']:
            gap = r[2] and not any(k in r[2] for k in ('Meets','done','Covered'))
            h += f'<tr{" class=gap" if gap else ""}><td>{E(r[0])}</td><td class="src">{E(r[1])}</td></tr>'
        h += '</tbody></table></div>'
    return h

def timeline():
    return ''.join(f'<div class="srow"><span class="when">{datetime.date.fromisoformat(e["d"]).strftime("%b %-d")}</span><div class="d" style="color:var(--ink)">{E(e["t"])}</div></div>' for e in sorted(S['events'], key=lambda e:e['d'], reverse=True))

def contacts():
    h=''
    for g in S['contacts']:
        h += f'<h3 class="rg">{E(g["org"])}</h3>'
        for p in g['p']:
            h += f'<div class="srow"><div><b>{E(p["n"])}</b> <span class="d">{E(p["r"])}</span><div class="d">' + ' &middot; '.join(E(l[1]) for l in p['l']) + '</div></div></div>'
    return h

def sec(title, body, count=None, open_=False):
    c = f' <span class="cnt">{count}</span>' if count is not None else ''
    return f'<details class="card more"{" open" if open_ else ""}><summary><h2>{E(title)}{c}</h2></summary><div class="body">{body}</div></details>'

nrev = sum(len(g['items']) for g in S['review'])
DEC = {it['k']:{'dec':it.get('dec','open'),'note':it.get('note','')} for g in S['review'] for it in g['items']}
decisions_block = '<script type="application/json" id="decisions">'+json.dumps(DEC).replace('<','\\u003c')+'</script>' + '<div class="savebar" id="savebar" hidden><div class="wrap"><span id="savemsg">Unsaved review decisions.</span><button class="btn pri" type="button" id="savebtn">Save decisions</button></div></div><script id="app">'+open('_review.js').read()+'</script>'
css = open('_style.css').read()
page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zilber Industrial 3 — Nitto Public Watermain | Project Portal</title>
<style>{css}
  main{{max-width:860px;margin:0 auto;padding-top:24px}}
  .hero p{{max-width:680px}}
  .path{{list-style:none;display:flex;flex-direction:column;gap:2px}}
  .path li{{display:flex;align-items:center;gap:12px;padding:7px 4px;border-radius:8px}}
  .path .pn{{flex:0 0 26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid var(--line);color:var(--muted);background:#fff}}
  .path .pt{{font-size:14.5px;font-weight:600;color:var(--muted)}}
  .path .pnote{{font-size:12px;color:var(--muted);margin-left:auto;text-align:right}}
  .path .p-done .pn{{background:var(--green);border-color:var(--green);color:#fff}} .path .p-done .pt{{color:var(--ink)}}
  .path .p-now{{background:var(--red-bg)}} .path .p-now .pn{{border-color:var(--red);color:var(--red)}} .path .p-now .pt{{color:var(--red)}}
  .path .p-next .pt{{color:var(--ink)}}
  .two{{display:grid;grid-template-columns:1fr 1fr;gap:22px}}
  @media(max-width:700px){{.two{{grid-template-columns:1fr}}}}
  .act{{display:flex;flex-direction:column;gap:2px;padding:9px 0;border-bottom:1px solid #f0f3f7}} .act:last-child{{border-bottom:none}}
  .act b{{font-size:14px;font-weight:600}} .act span{{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.4px}}
  .act em{{font-style:normal;font-size:12px;color:var(--muted)}}
  details.more > summary{{list-style:none;cursor:pointer}}
  details.more > summary::-webkit-details-marker{{display:none}}
  details.more > summary h2{{padding:14px 18px;display:flex;align-items:center;gap:8px}}
  details.more > summary h2::before{{content:"\\25B6";font-size:10px;color:var(--muted);transition:transform .15s}}
  details.more[open] > summary h2::before{{transform:rotate(90deg)}}
  details.more > .body{{padding-top:0}}
  .cnt{{font-size:11px;font-weight:700;background:#eef1f5;color:var(--muted);padding:1px 8px;border-radius:10px;letter-spacing:0}}
  .rg{{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--steel);margin:14px 0 4px;display:flex;align-items:center;gap:8px}}
  .rg:first-child{{margin-top:0}}
  .ri{{border-bottom:1px solid #f0f3f7}}
  .ri summary{{display:flex;align-items:center;gap:10px;padding:9px 2px;cursor:pointer;list-style:none}}
  .ri summary::-webkit-details-marker{{display:none}}
  .ri .rk{{flex:0 0 32px;font-size:12px;font-weight:800;color:var(--steel)}}
  .ri .rt{{flex:1;font-size:13.5px;font-weight:600}}
  .ri .rd{{padding:0 2px 12px 42px;font-size:12.5px;color:#41505f;display:flex;flex-direction:column;gap:3px}}
  .lab{{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-right:4px}}
  .srow{{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f0f3f7;align-items:flex-start}} .srow:last-child{{border-bottom:none}}
  .srow b{{font-size:13.5px;font-weight:600}} .srow .d{{font-size:12px;color:var(--muted)}}
  .srow .tag{{flex:0 0 auto;margin-top:2px}} .when{{flex:0 0 52px;font-size:12px;font-weight:700;color:var(--steel)}}
  .otbl td{{font-size:12.5px}}
  .rtools{{display:flex;align-items:center;gap:8px;margin-bottom:6px}}
  .ri[open]{{background:#f7f9fc;border:1px solid var(--line);border-radius:10px;margin:6px 0;padding:0 10px}}
  .rd{{padding:0 0 14px 42px !important;gap:10px !important}}
  .rrow{{display:grid;grid-template-columns:90px 1fr;gap:8px;font-size:13px}}
  .wl{{list-style:none;display:flex;flex-direction:column;gap:2px}}
  .rbox{{border-radius:8px;padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:6px}}
  .rbox.cur{{background:var(--red-bg);border:1px solid #f0c9c3}} .rbox.cur p{{text-decoration:line-through;text-decoration-color:rgba(207,74,60,.5);color:#5b2620}}
  .rbox.new{{background:var(--green-bg);border:1px solid #bfe5d2}} .rbox.new p{{color:#14513a}}
  .dec{{display:flex;flex-wrap:wrap;gap:6px}}
  .dec button{{font:600 12.5px inherit;font-family:inherit;padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--navy);cursor:pointer}}
  .dec button.on[data-d=accept],.dec button.on[data-d=change]{{background:var(--green);border-color:var(--green);color:#fff}}
  .dec button.on[data-d=reject]{{background:var(--red);border-color:var(--red);color:#fff}}
  .dec button.on[data-d=discuss]{{background:var(--amber);border-color:var(--amber);color:#fff}}
  .dnote{{width:100%;font:13px inherit;font-family:inherit;padding:8px;border:1px solid var(--line);border-radius:8px;resize:vertical}}
  .savebar{{position:fixed;left:0;right:0;bottom:0;background:var(--navy);color:#fff;z-index:20;padding-bottom:env(safe-area-inset-bottom,0px)}}
  .savebar .wrap{{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:10px;padding-bottom:10px;max-width:860px}}
  @media(max-width:600px){{.rd{{padding-left:4px !important}}.rrow{{grid-template-columns:1fr}}}}

  .sent{{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}} .sent span{{text-transform:none;letter-spacing:0;font-weight:500;font-size:12px;background:#eef1f5;border-radius:6px;padding:3px 8px;color:#41505f}}
</style>
</head>
<body>
<header>
  <div class="topbar"><div class="brand"><img src="zpg-logo.png" alt="Zilber Property Group"><div><b>Construction Project Portal</b><span>Zilber Industrial 3 (Nitto) &middot; Pleasant Prairie</span></div></div></div>
  <div class="wrap hero">
    <h1>Nitto Public Watermain <span class="pill">STEP 2 OF 8</span></h1>
    <p>Goal: get a winning contractor under contract, send it to Kurt, and post the financial security the DA requires. Water main must be installed and accepted by <b style="color:#fff">Nov 15, 2027</b>.</p>
  </div>
</header>
<main class="wrap">
  <div class="card"><h2>Where we are</h2><div class="body">{path()}</div></div>
  <div class="two">
    <div class="card"><h2>Do next</h2><div class="body">{''.join(f'<div class="act"><span>{E(o)}</span><b>{E(t)}</b></div>' for t,o in S['donext'])}</div></div>
    <div class="card"><h2>Waiting on</h2><div class="body">{''.join(f'<div class="act"><span>{E(w)}</span><b>{E(t)}</b><em>{E(d)}</em></div>' for w,t,d in S['waiting'])}
      <div class="act"><span>Sent to Pinnacle 11/4</span><div class="sent">{''.join(f'<span>{E(x)}</span>' for x in S['sent_to_pinnacle'])}</div></div></div></div>
  </div>
  {sec('Review list: who should do what', '<p class="d" style="font-size:12.5px;color:var(--muted);margin-bottom:8px">For the review with Pinnacle. Each item shows where the text is, the current wording, the proposed wording, and what Claude will produce once you accept it.</p>'+review(), nrev, True)}
  {sec('Documents', ''.join(f'<div class="drow"><div class="dicon">PDF</div><div class="dn"><b>{E(t)}</b><div class="dm">{E(d)}</div></div><a class="btn" href="{f}" target="_blank">View</a></div>' for t,d,f in DOCS), len(DOCS))}
  {sec('All steps in detail', steps())}
  {sec('Contract obligations (project manual + DA)', obligations())}
  {sec('Timeline', timeline(), len(S['events']))}
  {sec('Contacts', contacts())}
</main>
{decisions_block}
<footer>Zilber Property Group &middot; Nitto public watermain &middot; updated {UPDATED} &middot; layout {VERSION}</footer>
</body>
</html>
'''
open(OUT,'w').write(page)
print(len(page))
