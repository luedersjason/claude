import json, html, datetime
S = json.load(open('_data.json'))
E = html.escape
OUT = 'index.html'
VERSION = 'v1'

DOCS = [
 ('Village DA conditional approval letter', 'Rob Hanson, 8/25/26. Conditions 1-12.', 'NW-Village-DA-Approval-Letter-8.25.26.pdf'),
 ('Development Agreement (draft) with Exhibits A-D2', 'Art. VI Financial Security; D1 and D2 blank. 57 pp.', 'NW-Development-Agreement-DRAFT.pdf'),
 ('Project manual: contract, terms, proposal form', 'Pinnacle, 11/3/26. 12 pp.', 'NW-Project-Manual-Pinnacle-11.3.26.pdf'),
 ('Public watermain plans, bid set (rev. 4)', 'Pinnacle 644.00, 11/3/26. 8 sheets.', 'NW-Public-Watermain-Plans-BidSet-11.3.26.pdf'),
 ('KWU approval letter', 'Ian Bagley, 11/4/26.', 'NW-KWU-Approval-11.4.26.pdf'),
 ('Village Engineer comments', 'Marked plans, 8/11/26.', 'NW-Village-Engineer-Comments-8.11.26.pdf'),
 ('CSM dedication and covenant language (draft)', 'Says "Lakeveiw" in line 1.', 'NW-CSM-Dedication-Covenant-Language-DRAFT.pdf'),
 ('Stormwater Maintenance Agreement (draft)', 'Lot 1; Exhibit B still needed.', 'NW-Stormwater-Maintenance-Agreement-DRAFT.pdf'),
]
WS_DOCS = {'plan':[0,5,4,3],'bid':[2,3,0],'sec':[1,0,6,7],'con':[0,2]}
WS_COLOR = {'plan':('var(--blue)','PLANS'),'bid':('#0f8a8a','BID'),'sec':('#7a4fb5','SECURITY'),'con':('var(--amber)','BUILD')}

def doclink(i):
    t, d, f = DOCS[i]
    return f'<a class="lnk" href="{f}" target="_blank">{E(t)} &#8599;</a>'

def prog(w):
    st=[s for s in w['steps'] if s['s']!='na']; d=[s for s in st if s['s']=='done']
    return round(100*len(d)/len(st)) if st else 0
def wstatus(w):
    if any(s['s']=='attn' for s in w['steps']): return ('Needs action','var(--red)')
    p=prog(w)
    if p==100: return ('Done','var(--green)')
    if p>0 or any(s['s']=='active' for s in w['steps']): return ('In progress','var(--blue)')
    return ('Not started','var(--muted)')
TAG = {'done':('g','Done'),'active':('b','In progress'),'open':('n','Open'),'attn':('r','Needs action'),'hold':('a','On hold'),'na':('n','N/A')}

def steps_card(w):
    col, lab = WS_COLOR[w['id']]; st, sc = wstatus(w); p = prog(w)
    h = f'<div class="card" id="ws-{w["id"]}" style="border-top:4px solid {col}"><div class="body">'
    h += f'<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div style="min-width:0;flex:1"><span class="wtag" style="background:{col}">{lab}</span><h3 class="wname">{E(w["name"])}</h3><div class="wspec">{E(w["spec"])}</div></div><div style="text-align:right"><span style="color:{sc};font-weight:600">{st}</span></div></div>'
    h += f'<div class="bar" style="margin-top:12px"><i style="width:{p}%;background:{col}"></i></div><div class="wspec" style="margin-top:6px">{p}% of steps done</div>'
    h += '<div class="tl" style="margin-top:6px">'
    for s in w['steps']:
        cls = 'done' if s['s']=='done' else 'active' if s['s'] in ('active','attn') else ''
        t, tl = TAG[s['s']]
        meta = E(s['o']) + (f' &middot; {E(s["d"])}' if s.get('d') else '')
        h += f'<div class="ms {cls}{" attn" if s["s"]=="attn" else ""}"><div class="mk"><div class="ring"></div><div class="line"></div></div><div class="info"><div><b>{E(s["t"])}</b><div class="d">{meta}</div>' + (f'<div class="d" style="color:#41505f">{E(s["n"])}</div>' if s['n'] else '') + f'</div><span class="tag {t}">{tl}</span></div></div>'
    h += '</div></div><div class="ft" style="justify-content:flex-start">' + ''.join(doclink(i) for i in WS_DOCS[w['id']]) + '</div></div>'
    return h

def issues():
    h = ''
    for f in S['flags']:
        sev = {'high':'<span class="sev h">High</span>','med':'<span class="sev m">Med</span>','low':'<span class="sev l">Low</span>'}[f['sev']]
        h += f'<div class="exp" onclick="this.classList.toggle(\'open\')"><div class="oi"><span class="chev">&#9654;</span><div class="ob"><b>{E(f["t"])}</b> {sev}<div class="meta">Owner: {E(f["o"])}</div></div></div><div class="detail">{E(f["b"])}</div></div>'
    return h

def obligations():
    h = ''
    for g in S['obl']:
        h += f'<div class="exp ob-grp" onclick="if(event.target.closest(\'.detail\'))return;this.classList.toggle(\'open\')"><h2 class="oh"><span class="chev">&#9654;</span> {E(g["g"])} <span class="cnt">{len(g["rows"])}</span></h2><div class="detail"><div class="tblw"><table class="otbl"><thead><tr><th>Obligation</th><th>Source</th><th>Flag</th></tr></thead><tbody>'
        for r in g['rows']:
            gap = r[2] and not any(k in r[2] for k in ('Meets','done','Covered'))
            h += f'<tr{" class=gap" if gap else ""}><td>{E(r[0])}</td><td class="src">{E(r[1])}</td><td class="fl">{E(r[2])}</td></tr>'
        h += '</tbody></table></div></div></div>'
    return h

def contacts():
    h=''
    for g in S['contacts']:
        h += f'<div class="corg">{E(g["org"])}</div>'
        for p in g['p']:
            h += f'<div class="sl"><b>{E(p["n"])}</b><div class="d">{E(p["r"])}</div>' + ''.join(f'<div class="cl"><span>{E(l[0])}</span> {E(l[1])}</div>' for l in p['l']) + '</div>'
    return h

def timeline():
    h=''
    for e in sorted(S['events'], key=lambda e:e['d'], reverse=True):
        d = datetime.date.fromisoformat(e['d']).strftime('%b %-d, %Y')
        h += f'<div class="sl"><b>{d}</b><div class="d" style="color:#41505f;font-size:12.5px">{E(e["t"])}</div><div class="d">{E(e["src"])}</div></div>'
    return h

today = datetime.date(2026,11,4)
dl = (datetime.date(2027,11,15)-today).days
nopen = len([f for f in S['flags'] if f['sev']=='high'])
chain = ''.join((f'<span class="ar">&#8594;</span>' if i else '') + f'<span class="lk {c[1]}">{E(c[0])}</span>' for i,c in enumerate(S['chain']))

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zilber Industrial 3 — Nitto Public Watermain | Project Portal</title>
<style>
  :root{{
    --navy:#0f2540; --navy-2:#1b3a5f; --steel:#3d6088;
    --bg:#f4f6f9; --card:#ffffff; --line:#e3e8ef; --ink:#1c2733; --muted:#697789;
    --green:#1f9d6b; --green-bg:#e6f6ee; --amber:#d6932b; --amber-bg:#fbf2df;
    --red:#cf4a3c; --red-bg:#fbe9e7; --blue:#2f6fb0; --blue-bg:#e8f1fa;
    --shadow:0 1px 2px rgba(16,36,64,.06),0 4px 16px rgba(16,36,64,.06);
  }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased}}
  a{{color:var(--blue);text-decoration:none}}
  .wrap{{max-width:1180px;margin:0 auto;padding:0 24px}}
  header{{background:linear-gradient(180deg,var(--navy),var(--navy-2));color:#fff}}
  .topbar{{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;max-width:1180px;margin:0 auto;gap:12px;flex-wrap:wrap}}
  .brand{{display:flex;align-items:center;gap:14px}}
  .brand img{{height:40px;background:#fff;border-radius:6px;padding:4px 8px}}
  .brand b{{font-size:15px;font-weight:700;letter-spacing:.3px}}
  .brand span{{display:block;font-size:12px;color:#a9c0db;font-weight:500}}
  .hero{{padding:22px 0 26px}}
  .crumb{{font-size:12.5px;color:#a9c0db;margin-bottom:8px}}
  .hero h1{{font-size:26px;font-weight:700;letter-spacing:-.4px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}}
  .pill{{font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px;letter-spacing:.3px;background:var(--blue-bg);color:#1c4f80}}
  .hero p{{margin-top:8px;color:#d7e3f1;font-size:14px;max-width:820px}}
  .hero .meta{{margin-top:8px;color:#bcd0e6;font-size:14px;display:flex;gap:6px 18px;flex-wrap:wrap}}
  .hero .meta b{{color:#fff;font-weight:600}}
  main{{padding:24px 0 50px;display:flex;flex-direction:column;gap:22px}}
  .kpis{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}}
  .kpi{{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:16px}}
  .kpi.crit{{background:var(--red-bg);border-color:#f0b9b2}}
  .kpi .lab{{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px}}
  .kpi .val{{font-size:23px;font-weight:700;letter-spacing:-.5px;margin-top:6px;line-height:1.2}}
  .kpi.crit .val{{color:var(--red)}}
  .kpi .sub{{font-size:12.5px;margin-top:4px;font-weight:600}}
  .grid{{display:grid;grid-template-columns:1fr 340px;gap:22px;align-items:start}}
  .col{{display:flex;flex-direction:column;gap:22px;min-width:0}}
  .card{{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);overflow:hidden}}
  .card h2{{font-size:13px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);padding:16px 18px 0}}
  .card .body{{padding:14px 18px 18px}}
  .card .ft{{padding:11px 18px;border-top:1px solid var(--line);background:#fafbfc;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap}}
  .chain{{display:flex;flex-wrap:wrap;gap:6px;align-items:center}}
  .chain .lk{{font-size:12.5px;padding:5px 10px;border-radius:7px;border:1px solid var(--line);background:#fafbfc;font-weight:600;color:var(--muted)}}
  .chain .lk.done{{background:var(--green-bg);border-color:#bfe5d2;color:var(--green)}}
  .chain .lk.next{{background:var(--red-bg);border-color:#f0b9b2;color:var(--red)}}
  .chain .ar{{color:var(--muted);font-size:13px}}
  .wtag{{font-size:10.5px;font-weight:800;color:#fff;padding:2px 7px;border-radius:4px;letter-spacing:.5px}}
  .wname{{font-size:17px;font-weight:700;margin-top:6px}}
  .wspec{{font-size:12.5px;color:var(--muted)}}
  .bar{{height:6px;border-radius:4px;background:#eef1f5;overflow:hidden}}
  .bar i{{display:block;height:100%;border-radius:4px}}
  .ms{{display:flex;gap:14px;padding:11px 0;border-bottom:1px solid #f0f3f7}}
  .ms:last-child{{border-bottom:none}}
  .ms .mk{{flex:0 0 22px;display:flex;flex-direction:column;align-items:center}}
  .ms .ring{{width:18px;height:18px;border-radius:50%;border:2px solid var(--line);background:#fff;margin-top:2px}}
  .ms.done .ring{{background:var(--green);border-color:var(--green)}}
  .ms.active .ring{{border-color:var(--blue);box-shadow:0 0 0 4px var(--blue-bg)}}
  .ms.attn .ring{{border-color:var(--red);box-shadow:0 0 0 4px var(--red-bg)}}
  .ms .line{{flex:1;width:2px;background:#eef1f5;margin-top:2px}}
  .ms .info{{flex:1;display:flex;justify-content:space-between;gap:10px;min-width:0}}
  .ms .info b{{font-size:14.5px;font-weight:600}}
  .ms .info .d{{font-size:12.5px;color:var(--muted)}}
  .tag{{font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;height:fit-content;white-space:nowrap}}
  .tag.g{{background:var(--green-bg);color:var(--green)}} .tag.b{{background:var(--blue-bg);color:#1c4f80}}
  .tag.a{{background:var(--amber-bg);color:var(--amber)}} .tag.n{{background:#eef1f5;color:var(--muted)}} .tag.r{{background:var(--red-bg);color:var(--red)}}
  .lnk{{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;border:1px solid var(--line);border-radius:6px;padding:3px 9px;color:var(--navy);background:#fff}}
  .exp{{cursor:pointer;border:1px solid transparent;border-radius:10px}}
  .exp.open{{border-color:var(--line);background:#f7f9fc;margin:8px 0;box-shadow:var(--shadow)}}
  .chev{{flex:0 0 14px;color:var(--muted);font-size:11px;transition:transform .15s;display:inline-block;user-select:none}}
  .open > .oi .chev, .open > .oh .chev{{transform:rotate(90deg)}}
  .detail{{display:none;padding:2px 14px 12px 36px;font-size:12.5px;color:#41505f;line-height:1.55;cursor:auto}}
  .open > .detail{{display:block}}
  .oi{{display:flex;gap:12px;padding:12px 10px;border-bottom:1px solid #f0f3f7;align-items:flex-start}}
  .oi .ob b{{font-size:13.5px}}
  .oi .ob .meta{{font-size:11.5px;color:var(--muted);margin-top:2px}}
  .sev{{font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:10px;margin-left:4px}}
  .sev.h{{background:var(--red-bg);color:var(--red)}} .sev.m{{background:var(--amber-bg);color:var(--amber)}} .sev.l{{background:#eef1f5;color:var(--muted)}}
  .sl{{padding:9px 0;border-bottom:1px solid #f0f3f7}} .sl:last-child{{border-bottom:none}}
  .sl b{{font-size:13px;font-weight:700}} .sl .d{{font-size:11.5px;color:var(--muted);margin-top:1px}}
  .cl{{font-size:12.5px;overflow-wrap:anywhere}} .cl span{{color:var(--muted);display:inline-block;min-width:44px}}
  .corg{{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--steel);padding-top:12px}}
  .corg:first-child{{padding-top:0}}
  .drow{{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0f3f7}}
  .drow:last-child{{border-bottom:none}}
  .dicon{{flex:0 0 40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;background:#c0392b}}
  .drow .dn{{flex:1;min-width:0}} .drow .dn b{{font-size:13.5px}} .drow .dn .dm{{font-size:11.5px;color:var(--muted)}}
  .btn{{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:5px 10px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--navy)}}
  .oh{{display:flex;align-items:center;gap:8px;font-size:14px !important;text-transform:none !important;letter-spacing:0 !important;color:var(--ink) !important;padding:12px 10px !important}}
  .oh .cnt{{font-size:11px;font-weight:700;background:#eef1f5;color:var(--muted);padding:1px 8px;border-radius:10px}}
  .ob-grp{{border-bottom:1px solid #f0f3f7}}
  .tblw{{overflow-x:auto}}
  .otbl{{width:100%;border-collapse:collapse;font-size:12.5px}}
  .otbl th{{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);padding:6px 8px;border-bottom:1px solid var(--line)}}
  .otbl td{{padding:7px 8px;border-bottom:1px solid #eef1f5;vertical-align:top}}
  .otbl td.src{{white-space:nowrap;color:var(--muted);font-size:11.5px}}
  .otbl td.fl{{color:var(--amber);font-weight:600;font-size:11.5px}}
  .otbl tr.gap td{{background:var(--amber-bg)}}
  .note{{font-size:12px;color:var(--muted)}}
  footer{{border-top:1px solid var(--line);padding:22px 0;color:var(--muted);font-size:12.5px;text-align:center}}
  @media(max-width:900px){{.grid{{grid-template-columns:1fr}}.kpis{{grid-template-columns:1fr 1fr}}}}
  @media(max-width:520px){{.kpis{{grid-template-columns:1fr}}.wrap{{padding:0 16px}}}}
</style>
</head>
<body>
<header>
  <div class="topbar"><div class="brand"><img src="zpg-logo.png" alt="Zilber Property Group"><div><b>Construction Project Portal</b><span>Industrial Development</span></div></div></div>
  <div class="wrap hero">
    <div class="crumb">Zilber Industrial 3 at LakeView Corporate Park &middot; 108th St &amp; STH 31, Pleasant Prairie WI &middot; TPN 92-4-122-272-0502</div>
    <h1>Nitto Public Watermain <span class="pill">BIDDING NEXT</span></h1>
    <p>{E(S["summary"])}</p>
    <div class="meta"><span>Updated <b>2026-11-04</b></span><span>Owner: <b>TI Investors of Lakeview Nitto Parcel LLC</b></span><span>Engineer: <b>Pinnacle (Andy Shoaf)</b></span><span>Village: <b>Kurt Davidsen / Peggy Herrick</b></span></div>
  </div>
</header>
<main class="wrap">
  <div class="kpis">
    <div class="kpi crit"><div class="lab">Critical path</div><div class="val">Get it out to bid</div><div class="sub" style="color:var(--ink)">Fix the project manual first</div></div>
    <div class="kpi"><div class="lab">Approvals</div><div class="val">Village + KWU</div><div class="sub" style="color:var(--green)">Both 11/4 &middot; WDNR next</div></div>
    <div class="kpi"><div class="lab">Village acceptance deadline</div><div class="val">Nov 15, 2027</div><div class="sub" style="color:var(--amber)">{dl} days &middot; DA s.6.1</div></div>
    <div class="kpi"><div class="lab">Open issues</div><div class="val">{len(S["flags"])}</div><div class="sub" style="color:var(--red)">{nopen} high priority</div></div>
  </div>
  <div class="card"><h2>Path to the financial security</h2><div class="body"><div class="chain">{chain}</div><div class="note" style="margin-top:8px">From approval letter conditions 6-12 and DA Article VI. The Village sizes the security (120% of public improvements, inspections and construction services) from the approved contract and Pinnacle's CM estimate.</div></div></div>
  <div class="grid">
    <div class="col">
      {"".join(steps_card(w) for w in S["ws"])}
      <div class="card"><h2>Contract obligations</h2><div class="body"><div class="note" style="margin-bottom:6px">What each party owes under Pinnacle's project manual (11/3/26), and what the Developer owes the Village under the DA and the 8/25 approval letter. Highlighted rows need a fix or a check before bidding. Tap a group to open it.</div>{obligations()}
      <div class="note" style="margin-top:12px"><b style="color:var(--ink)">Not in the manual:</b> no contractor performance/payment bond (a business choice; not a Village requirement in the packet); no reference to the DA, the Nov 15, 2027 deadline or the Village's draw rights; no bid instructions; staking, as-builts and record drawings are Owner-side (s.13) and go in Pinnacle's separate CM estimate (condition 6d).</div></div></div>
    </div>
    <div class="col">
      <div class="card"><h2>Issues to resolve</h2><div class="body" style="padding-top:6px">{issues()}</div></div>
      <div class="card"><h2>Key dates</h2><div class="body">
        <div class="sl"><b>Watermain installed, inspected, accepted &middot; Nov 15, 2027</b><div class="d">DA s.6.1 / condition 4. Village may allow more time for causes beyond the Developer's control.</div></div>
        <div class="sl"><b>Phase A substantial completion &middot; Jan 1, 2028</b><div class="d">Approval letter p.1, to avoid payment penalties.</div></div>
        <div class="sl"><b>Contract substantial completion &middot; Jul 31, 2026</b><div class="d" style="color:var(--red)">Stale date in Standard Terms s.5. Must be reset before bidding.</div></div>
      </div></div>
      <div class="card"><h2>Documents</h2><div class="body">{"".join(f'<div class="drow"><div class="dicon">PDF</div><div class="dn"><b>{E(t)}</b><div class="dm">{E(d)}</div></div><a class="btn" href="{f}" target="_blank">View</a></div>' for t,d,f in DOCS)}</div></div>
      <div class="card"><h2>Timeline</h2><div class="body">{timeline()}</div></div>
      <div class="card"><h2>Contacts</h2><div class="body">{contacts()}</div></div>
    </div>
  </div>
</main>
<footer>Zilber Property Group &middot; Nitto public watermain portal &middot; layout {VERSION}</footer>
</body>
</html>
'''
open(OUT,'w').write(page)
print(len(page))
