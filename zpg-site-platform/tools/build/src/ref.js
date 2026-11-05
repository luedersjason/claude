<script>
const D=s=>new Date(s+'T12:00:00');
const TODAY=new Date();
const fmt=d=>d.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'2-digit'});

// p = summary row, m = milestone, k = key date, pend = carried from v9b, not yet re-sequenced
const PRECON=[
 {n:'Design and Approvals',s:'2026-08-24',e:'2027-07-02',p:1},
 {n:'Advanced funding agreement – deposit (Jaquet / ZPG)',s:'2026-08-24',m:1},
 {n:'Design development',s:'2026-08-24',e:'2026-11-13'},
 {n:'Jaquet walkthrough / sign-off',s:'2026-10-27',m:1,k:1},
 {n:'Locked footprint CAD w/ door thresholds (PIDA)',s:'2026-11-13',m:1,k:1},
 {n:'Finish Site & Ops set: arch, structural, civil',s:'2026-11-16',e:'2027-01-15'},
 {n:'Site & Operational Plan submittal',s:'2027-01-19',m:1,k:1},
 {n:'Village revisions (sets 1 → final)',s:'2027-01-19',e:'2027-04-16'},
 {n:'DSPS review of the Plan Commission set',s:'2027-04-05',e:'2027-04-26'},
 {n:'Plan Commission (projected)',s:'2027-04-19',m:1,k:1},
 {n:'Village Board (projected)',s:'2027-04-26',m:1,k:1},
 {n:'Early start permit (Village + DSPS)',s:'2027-04-27',e:'2027-05-28'},
 {n:'Building permit',s:'2027-07-02',m:1,k:1},
 {n:'Agreements & Closing',s:'2026-09-30',e:'2027-03-15',p:1,pend:1},
 {n:'Purchase agreement & inspection period',s:'2026-09-30',e:'2026-12-31',pend:1},
 {n:'Development mgmt. agreement / Riley GMAX',s:'2026-12-31',m:1,pend:1},
 {n:'Site acquisition closing',s:'2027-03-15',m:1,pend:1},
];
const CONSTR=[
 {n:'Shell Building Construction',s:'2027-04-15',e:'2027-12-31',p:1,pend:1},
 {n:'Groundbreaking / mobilization',s:'2027-04-15',m:1,pend:1},
 {n:'Site work',s:'2027-04-15',e:'2027-06-30',pend:1},
 {n:'Building foundations',s:'2027-06-10',e:'2027-07-06',pend:1},
 {n:'Precast panels',s:'2027-07-07',e:'2027-07-20',pend:1},
 {n:'Structural steel',s:'2027-07-21',e:'2027-09-06',pend:1},
 {n:'Roof',s:'2027-08-31',e:'2027-10-04',pend:1},
 {n:'Building enclosure',s:'2027-10-04',m:1,pend:1},
 {n:'Slab on grade',s:'2027-10-05',e:'2027-11-01',pend:1},
 {n:'Mechanical, electrical, plumbing',s:'2027-11-02',e:'2027-12-27',pend:1},
 {n:'Base building completion',s:'2027-12-03',m:1,pend:1},
 {n:'Office buildout',s:'2027-11-02',e:'2027-12-31',pend:1},
 {n:'Substantial completion / occupancy',s:'2027-12-31',m:1,pend:1},
];
const MASTER=[
 {n:'Design & Preconstruction',s:'2026-08-24',e:'2027-07-02',p:1},
 {n:'Design development → locked footprint',s:'2026-08-24',e:'2026-11-13'},
 {n:'Jaquet sign-off',s:'2026-10-27',m:1,k:1},
 {n:'Site & Ops set',s:'2026-11-16',e:'2027-01-15'},
 {n:'Site & Ops submittal',s:'2027-01-19',m:1,k:1},
 {n:'Village & DSPS review',s:'2027-01-19',e:'2027-04-26'},
 {n:'Village Board approval',s:'2027-04-26',m:1,k:1},
 {n:'Early start permit',s:'2027-05-28',m:1,k:1},
 {n:'Building permit',s:'2027-07-02',m:1,k:1},
 {n:'Construction',s:'2027-04-15',e:'2027-12-31',p:1,pend:1},
 {n:'Site work & foundations',s:'2027-04-15',e:'2027-07-06',pend:1},
 {n:'Structure & enclosure',s:'2027-07-07',e:'2027-10-04',pend:1},
 {n:'Slab, MEP & office',s:'2027-10-05',e:'2027-12-31',pend:1},
 {n:'Substantial completion / occupancy',s:'2027-12-31',m:1,pend:1},
];
const VIEWS={
 master:{t:MASTER,s:'2026-08-01',e:'2028-01-31',title:'Master schedule',lede:'Whole project at a glance: phases and key dates, design through occupancy.'},
 precon:{t:PRECON,s:'2026-08-01',e:'2027-07-31',title:'Preconstruction schedule',lede:'Today through the building permit, with the steps in between.'},
 constr:{t:CONSTR,s:'2027-04-01',e:'2028-01-31',title:'Construction schedule',lede:'Groundbreaking through occupancy. Still Schedule v9b dates; to be re-sequenced around the early start permit.'},
};

let CUR='master';
(function gantt(){
  const g=document.getElementById('gantt');
  const md=d=>(d.getMonth()+1)+'/'+d.getDate();
  function render(){
    const V=VIEWS[CUR], start=D(V.s), end=D(V.e), pct=d=>((d-start)/(end-start))*100;
    document.getElementById('gTitle').textContent=V.title;
    document.getElementById('gLede').textContent=V.lede;
    document.querySelectorAll('.gview').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===CUR)));
    let qs='',ms='',grid='';
    for(let d=new Date(start);d<=end;d.setMonth(d.getMonth()+1)){
      if(d.getMonth()%3===0||+d===+start){qs+=`<span class="q" style="left:${pct(d)}%">Q${Math.floor(d.getMonth()/3)+1} ’${String(d.getFullYear()).slice(2)}</span>`;}
      ms+=`<span class="m" style="left:${pct(d)}%">${d.toLocaleDateString('en-US',{month:'short'})}</span>`;
      grid+=`<span style="left:${pct(d)}%"></span>`;
    }
    let h=`<div class="g-head">${qs}${ms}</div><div class="g-grid">${grid}</div>`;
    V.t.forEach((t,i)=>{
      const s=D(t.s), e=t.e?D(t.e):s;
      if(t.p&&i>0) h+='<div class="g-row gap"></div>';
      const state=t.pend?'pend':(e<TODAY?'done':(s<=TODAY?'live':''));
      let row;
      if(t.m){
        row=`<span class="dt s" style="right:calc(${100-pct(s)}% + 9px)"><span class="nm">${t.n}</span></span>`+
          `<i class="ms ${t.k&&!t.pend?'key':''} ${e<TODAY&&!t.pend?'done':''}" style="left:${pct(s)}%"></i>`+
          `<span class="dt f" style="left:calc(${pct(s)}% + 9px)">${md(s)}</span>`;
      }else{
        row=`<span class="dt s" style="right:${100-pct(s)}%">${md(s)}</span>`+
          `<div class="bar ${t.p?'':state}" style="left:${pct(s)}%;width:${Math.max(.6,pct(e)-pct(s))}%" title="${t.n}"><span>${t.n}</span></div>`+
          `<span class="dt f" style="left:${pct(e)}%">${md(e)}</span>`;
      }
      h+=`<div class="g-row${t.p?' phase':''}${t.pend?' pend':''}">${row}</div>`;
    });
    g.innerHTML=h;
    if(TODAY>start&&TODAY<end){
      const tr=document.createElement('div');tr.className='today';
      tr.style.left=pct(TODAY)+'%';
      tr.innerHTML=`<b>Today ${md(TODAY)}</b>`;g.appendChild(tr);
    }
    fit();
  }
  // bars are drawn to true scale. A name that doesn't fit shrinks a little; if it still doesn't fit, it goes after the finish date.
  function fit(){g.querySelectorAll('.bar').forEach(b=>{const sp=b.firstElementChild,f=b.nextElementSibling;
    sp.hidden=false;b.style.fontSize='';const nm=f&&f.querySelector('.nm');if(nm)nm.remove();
    if(sp.scrollWidth>b.clientWidth-6){b.style.fontSize='10.5px';}
    if(sp.scrollWidth>b.clientWidth-6){sp.hidden=true;if(f)f.insertAdjacentHTML('beforeend',`<span class="nm" style="margin-left:6px">${sp.textContent}</span>`);}});}
  document.querySelectorAll('.gview').forEach(b=>b.addEventListener('click',()=>{CUR=b.dataset.v;try{sessionStorage.setItem('jqView',CUR)}catch(e){};render();}));
  try{const v=sessionStorage.getItem('jqView');if(v&&VIEWS[v])CUR=v;}catch(e){}
  window.jqFit=render;
  render(); if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(g.offsetWidth)fit();});
  addEventListener('resize',()=>{if(g.offsetWidth)fit();});
})();

const weeks=[
 ['Week 1','Kickoff',[
  ['ZPG / PIDA / PEG / Riley','Execute agreements: Riley MEPF, Pinnacle civil/landscape, PIDA architectural/structural','Deliverable'],
  ['ZPG / PIDA / PEG / Riley','Internal kickoff: align scope, roles and schedule','Meeting'],
  ['Jaquet','Confirm program unchanged: 137,040 SF production / 6,000 SF office, drive-thru bays, dock, crane bays, 32′ clear','Decision'],
  ['Design team','Compile open-items list for Jaquet','Deliverable'],
  ['PIDA','Confirm Pre-Application Conference date with Village staff','Meeting']]],
 ['Week 2','Pre-application and RFIs',[
  ['PIDA / PEG / ZPG','Pre-Application Conference: present concept to Village staff','Meeting'],
  ['PIDA','Refine site and building plans to the confirmed program','Deliverable'],
  ['All + Jaquet','Present RFIs to Jaquet, discuss options, set decision deadlines incl. elevations','Meeting']]],
 ['Week 3','Floor plans and Jaquet decisions',[
  ['PIDA','Develop floor plans and elevations','WIP'],
  ['Jaquet','Finalize the open items list (maintenance room, tank pad, equipment, cranes, dock, utilities, office)','Decision'],
  ['PIDA → PEG','Final building footprint coordination, arch to civil','WIP'],
  ['PEG','File and project setup: basemap, existing conditions, GIS','WIP']]],
 ['Week 4','Design development begins',[
  ['PIDA','Design development of elevations and floor plans','WIP'],
  ['PEG','Grading, utility and pavement plans','WIP'],
  ['ZPG / Riley','Cost control log: value engineering ideas and adds for Jaquet','Deliverable']]],
 ['Week 5','DD package',[
  ['PIDA','Design Development package coordinated with Riley: elevations, floor plans','Deliverable'],
  ['PEG','Grading, utility and pavement plans','WIP'],
  ['Riley (MEPF)','HVAC, electrical, plumbing, sprinkler narratives and diagrams','WIP']]],
 ['Week 6','Jaquet signs off DD',[
  ['PIDA','Detailing: sections, structural, schedules','WIP'],
  ['PEG','Grading, utility and pavement plans','WIP'],
  ['Riley','MEP documents','WIP'],
  ['Jaquet','Comment on / confirm DD package: OK to proceed','Decision']]],
 ['Week 7','Detailing',[
  ['PIDA','Detailing: sections, structural, schedules','WIP'],
  ['PEG','Grading, utility and pavement plans','WIP'],
  ['Riley','MEP documents','WIP']]],
 ['Week 8','Final drawings',[
  ['PIDA','Final arch and structural drawings for Village and State review','Deliverable'],
  ['PEG','Final civil details and specifications','Deliverable'],
  ['Riley (MEPF)','MEPF plans complete','Deliverable'],
  ['Jaquet','Comment on / confirm final development package','Decision']]],
 ['Week 9','Package and signatures',[
  ['PIDA / Pinnacle','Final Site & Operational Plan package','Deliverable'],
  ['Riley (MEPF)','MEPF bid documents ready for subcontractor release','Deliverable'],
  ['Jaquet / ZPG','Sign submittal package','Decision']]],
 ['Week 10','Municipal submittal',[
  ['PIDA / Pinnacle','Submit Site & Operational Plan package to the Village','Deliverable']]],
];
document.getElementById('weeks').innerHTML=weeks.map(([w,t,items],i)=>{
  const types=[...new Set(items.map(x=>x[2]))].filter(x=>x==='Decision'||x==='Deliverable');
  return `<details id="wk${i+1}"${i===0?' open':''}><summary><span class="wk">${w}</span><span class="ttl">${t}</span><span class="tags">${types.map(x=>`<span class="tag ${x}">${x}</span>`).join('')}</span></summary>
  <div class="items">${items.map(([who,d,ty])=>`<div class="item"><span class="who">${who}</span><span>${d}</span><span class="tag ${ty}">${ty}</span></div>`).join('')}</div></details>`;
}).join('');

const DCBASE="WI-ZPG - Documents\\0. SALES\\BTS_Jaquet USA\\jaquet - precon shared folder\\";
const JPD="Jaquet provided docs\\",EQD=JPD+"equipment (Dan 10-27)\\",RKD=JPD+"rack sotrage\\";
const R15=['R&M 15 ton TRDG 80 foot span crane drawing',JPD+'R&M 15 ton TRDG 80 foot span Crane Drawing 05252022xJC04-O.pdf','R&M, 5/25/22',['RM15-1','RM15-2']];
const R80=['R&M 80 ft span crane drawings: 10-ton and 15-ton',JPD+'R&M 10 ton / 15 ton TRDG 80 foot span Crane Drawing 05252022xJC03-O / xJC04-O.pdf','R&M, 5/25/22',['RM10-1','RM10-2','RM15-1','RM15-2']];
const R15S=['R&M 15 ton TRDG single truck crane drawing, 56 ft span',JPD+'R&M 15 ton TRDG Single Truck Crane Drawing 05112022xJC01-O.pdf','R&M, 5/11/22',['RM15S-1','RM15S-2']];
const CSCH=['Crane schematic (10/23)','Cranes\\20261023_Jacquet S Crane Schematic.pdf','10/23/26',['CR-SCH']];
const WJ=['Water jet MR2113: layout and utilities',JPD+'MR2113 LAYOUT.pdf','Dan, 11/2',['EQ-WJ'],['Schedule: Water Jet 1 to 3 (tags 14 to 16) listed, no data yet','Diagram tag: not checked']];
const WJD=['Water jet MR2113: dimensions (DXF, folder only)',JPD+'2113 DIMENSIONS.DXF','Dan, 11/2',null];
const CV9=['Concept v9, Rev 5.3 (Jaquet, May 2026)',JPD+'5097.00B Lot 22 Concept v9 building Rev5.3.pdf','5/2026',['CV9']];
const LASER=['ByStar fiber laser installation guide (324-page manual, folder only)',EQD+'ByStar Fiber Installation Guide en 1.pdf','Dan, 10/27',null];
const EQ_VAS=['Equipment layout: VAS OSF 6250x2000x2500x300',EQD+'lay-out VAS OSF 6250X2000X2500X300.pdf','Dan, 10/27',['EQ-VAS'],['Schedule line: not matched yet','Diagram tag: not matched yet']];
const EQ_RR=['Equipment layout: RR5570-REV01',EQD+'RR5570-REV01.pdf','Dan, 10/27',['EQ-RR-1','EQ-RR-2'],['Schedule line: not matched yet','Diagram tag: not matched yet']];
const EQ_FT=['Equipment drawing: 0029621600 [ft-in]',EQD+'0029621600 [ft-in].pdf','Dan, 10/27',['EQ-FT-1','EQ-FT-2','EQ-FT-3','EQ-FT-4','EQ-FT-5','EQ-FT-6','EQ-FT-7','EQ-FT-8','EQ-FT-9','EQ-FT-10'],['Schedule line: not matched yet','Diagram tag: not matched yet']];
const dcards=[
 {t:'Jaquet provided',img:'img/docs/crane-rm15.jpg',d:'What Jaquet sent us: sample crane drawings, racks, laser guide and the existing-building drawings.',
  it:[CV9,R80,R15S,EQ_VAS,EQ_RR,EQ_FT,WJ,WJD,LASER,
   ['Rack storage: 120140 4-28-25',RKD+'120140 4-28-25.pdf','4/28/25',['RK1-1','RK1-2','RK1-3']],
   ['Rack storage: CA000116 5-12-25',RKD+'CA000116 5-12-25.pdf','5/12/25',['RK2-1','RK2-2','RK2-3']],
   ['Rack storage: SD-1-1',RKD+'SD-1-1 2007-SD-1.pdf','2007',['RK3-1']],
   ['Rack storage: SD-2-1',RKD+'SD-2-1 2007-SD-2.pdf','2007',['RK4-1']],
   ['Rack storage: SD-3-1',RKD+'SD-3-1 2007-SD-3.pdf','2007',['RK5-1']],
   ['Rack storage: SD-7',RKD+'SD-7.pdf','—',['RK6-1']],
   ['Existing building: conformed construction document set (2018, folder only)',JPD+'2018 10 02 17-222 JACQUET CONFORMED CONSTRUCTION DOCUMENT SET - BUILDING (1).pdf','2018',null]]},
 {t:'Cranes',img:'img/docs/crane-schematic.jpg',d:'Sample crane drawings from Dan and the crane sheets in the plans.',
  it:[CSCH,R80,R15S,['Crane drawing in plans (isometric)','jaquet - plans and specs v12.pdf, p.10','v12',['V12-10']],['Crane drawing in plans','jaquet - plans and specs v12.pdf, p.9','v12',['V12-9']]]},
 {t:'Equipment',img:'img/docs/equip-saw.jpg',d:'Equipment diagram, schedule, layout and foundations. Every piece of equipment needs a cut sheet, a schedule line and a diagram tag.',
  it:[['Equipment layout / diagram (floor plan, A3)','26082 - Jacquet plans - 102826.pdf, A3','10/28/26',['A3']],
   ['Outdoor storage example: "mimic the Limerick facility" (plans and specs v12, p.8)','jaquet - plans and specs v12.pdf, p.8','v12',['V12-8']],
   ['Equipment schedule','equipment schedule - v2.pdf','v2',['EQ-SCH-1','EQ-SCH-2']],
   ['Equipment schedule (Excel, folder only)','equipment schedule - v1.xlsx','v1',null],
   ['Foundation drawings (equipment foundation plates)',EQD+'Foundation drawings.pdf','Dan, 10/27',['EQ-FD-1','EQ-FD-2']],
   LASER]},
 {t:'Equipment cut sheets',img:'img/docs/equip-cut.jpg',d:'One card per piece of equipment. Each needs a cut sheet, a schedule line and a diagram tag; the notes show what is still missing.',
  it:[WJ,WJD,EQ_VAS,EQ_RR,EQ_FT]},
 {t:'Plans and specs',img:'img/docs/plans.jpg',d:'Latest drawings and outline specs: site, floor, office, elevations, renderings.',
  it:[['Site plan','26082 - Jacquet plans - 102826.pdf, A1','10/28/26',['A1']],
   ['Outdoor storage plan','26082 - Jacquet plans - 102826.pdf, A2','10/28/26',['A2']],
   ['Overall floor plan and equipment layout','26082 - Jacquet plans - 102826.pdf, A3','10/28/26',['A3']],
   ['Office plan','26082 - Jacquet plans - 102826.pdf, A4','10/28/26',['A4']],
   ['Exterior elevations','26082 - Jacquet plans - 102826.pdf, A5','10/28/26',['A5']],
   ['Concept renderings','jaquet - plans and specs v12.pdf, pp.11-13','v12',['V12-11','V12-12','V12-13']],
   ['CAD: current floor plan, DWG and DXF (PIDA, folder only)','26082 - Jacquet floorplan-102826.dwg / .dxf','10/28/26',null],
   ['Shell and process outline specs (folder only)','Jaquet - shell and process specs v10a.docx','v10a',null],
   ['Office outline specs (folder only)','Jaquet - office specs v10a.docx','v10a',null],
   ['Programming meeting minutes 2/17/26 (folder only)','Jacquet programming meeting minutes v1.docx','v1',null]]},
 {t:'Existing site',img:'img/docs/alta.jpg',d:'Lot 22 survey and soils.',
  it:[['ALTA survey, Lot 22','ALTA_100th St_Lot 22_FINAL.pdf','Final',['ALTA-1','ALTA-2']],
   ['Geotechnical report (folder only)','42 2460 LVCP Lot 22 Pleasant Prairie WI Due Dil Geo Report.pdf','—',null]]}
];
(function dcardsUi(){
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const g=id=>document.getElementById(id);
  dcards.forEach(c=>{c.it=c.it.filter(x=>x[3]);});
  const setOf=c=>c.it.flatMap(x=>x[3]||[]);
  g('dcards').innerHTML=dcards.map((c,i)=>`<button type="button" class="dc" data-i="${i}"><div class="dc-img" style="background-image:url('${c.img}')"></div><div class="dc-b"><span class="dc-n">${c.it.length} file${c.it.length===1?'':'s'}</span><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></div></button>`).join('');
  const m=g('dcModal');
  function openItem(i,ids){if(!ids||!ids.length||!window.jqOpenSheets)return;window.jqOpenSheets(ids,ids[0],()=>list(i));}
  function list(i){const c=dcards[i];g('dcH').textContent=c.t;g('dcSub').textContent=c.d+' Click a file to open it.';
    g('dcList').innerHTML=c.it.map((x,k)=>{const v=x[3],ext=((x[1].match(/\.(\w{2,4})(?:,|$)/)||[])[1]||'file').toUpperCase();
      const img=v?`<div class="dfc-i" style="background-image:url('${/^A[1-5]$/.test(v[0])?'drawings':'sheets'}/${esc(v[0])}.jpg')"></div>`:`<div class="dfc-i">${esc(ext==='FILE'?'—':ext)}</div>`;
      return `<button type="button" class="dfc${v?'':' off'}" ${v?`data-k="${k}"`:'disabled'}>${img}<div class="dfc-b"><b>${esc(x[0])}</b><span>${esc(x[2]||'')}${v&&v.length>1?' · '+v.length+' sheets':''}${v?'':' · folder only'}</span>${(x[4]||[]).map(t=>`<span class="dfc-t">${esc(t)}</span>`).join('')}</div></button>`;}).join('');
    g('dcList').dataset.i=i;m.hidden=false;}
  g('dcards').addEventListener('click',e=>{const b=e.target.closest('.dc');if(!b)return;const i=+b.dataset.i;if(setOf(dcards[i]).length<=0)list(i);else list(i);});
  g('dcList').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const i=+g('dcList').dataset.i,it=dcards[i].it[+b.dataset.k];m.hidden=true;openItem(i,it[3]);});
  g('dcX').addEventListener('click',()=>m.hidden=true);
  m.addEventListener('click',e=>{if(e.target===m)m.hidden=true;});
  const ODURL='';const ob=g('odBanner');if(ODURL){ob.href=ODURL;}else{ob.addEventListener('click',e=>{e.preventDefault();say('Shared folder link not set yet');});}
})();
const dlog=[
 ['10/26/26','Plans - 102626.pdf (5 sheets)','New: A1 site, A2 outdoor storage, A3 floor, A4 office, A5 elevations. Now in the Drawings viewer.','Jeremy Hall, PIDA'],
 ['10/20/26','Floorplan-102026.dwg','CAD footprint received. Civil start still waits on locked footprint and door thresholds.','PIDA'],
 ['10/19/26','Plans and specs v11b','PIDA progress plans 10/13 and 10/19 added to the set.','PIDA / ZPG']];
document.getElementById('doclogbody').innerHTML=dlog.map(r=>'<tr><td class="v">'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td></tr>').join('');

const toast=document.getElementById('toast');
function say(m){toast.textContent=m;toast.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove('show'),1600)}
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>{
  const el=document.getElementById(b.dataset.copy),txt=el.textContent;
  const sel=()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);say('Selected. Press Ctrl+C to copy')};
  try{navigator.clipboard.writeText(txt).then(()=>say('Path copied'),sel)}catch(e){sel()}
}));
(async function tracker(){
  const body=document.getElementById('tkBody'), msg=document.getElementById('tkMsg');
  const ownerSel=document.getElementById('tkOwner'), showSel=document.getElementById('tkShow');
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const NEXT={Open:'In progress',Pending:'In progress','In progress':'Done',Done:'Open'};
  let rows=[], canWrite=true, tkGrp='area', tkOnly=null, detailId=null; const tkOpen=new Set(), doneOpen=new Set();
  const DNAME={Design:'Drawings and Design',Approvals:'Village, DSPS & permits',Steel:'Structural & steel',Fire:'Fire protection',MEP:'MEP & process piping','General Contractor':'General Contractor',Jaquet:'Owner decisions (Jaquet)'};
  const syncSw=()=>document.querySelectorAll('#tkGrpSw button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.tg===tkGrp)));
  window.jqOpenItem=id=>{detailId=id;render();if(window.jqTab)window.jqTab('tracker',true);};
  window.jqOpenGroup=(kind,key,withDone)=>{detailId=null;tkGrp=kind;tkOnly=key;syncSw();tkOpen.add(kind+':'+key);if(withDone)doneOpen.add(kind+':'+key);showSel.value=showSel.value==='Done'?'active':showSel.value;render();if(window.jqTab)window.jqTab('tracker',true);};
  document.getElementById('tkGrpSw').addEventListener('click',e=>{const b=e.target.closest('[data-tg]');if(!b)return;tkGrp=b.dataset.tg;tkOnly=null;document.querySelectorAll('#tkGrpSw button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
  try{ if(localStorage.getItem('tkShow')) showSel.value=localStorage.getItem('tkShow'); }catch(e){}
  const db=window.claude?await window.claude.use('db'):null;
  if(!db){ body.innerHTML='<tr><td colspan="5" class="note">Sign in to claude.ai to see the tracker.</td></tr>'; return; }
  const user=await window.claude.use('user');
  try{ const c=user&&user.can?await user.can('data.write'):null; if(c===false) canWrite=false; }catch(e){}
  if(!canWrite){ document.getElementById('tkAdd').hidden=true; document.getElementById('newIss').hidden=true; }
  const col=db.collection('issues');
  function norm(snap){
    const list=snap&&(snap.docs||snap)||[];
    return Array.from(list).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id||v.id};});
  }
  window.jqWait=r=>(r.blockedBy||[]).map(ref=>rows.find(x=>x.ref===ref)).filter(x=>x&&x.status!=='Done');
  const eff=r=>(r.status==='Open'&&window.jqWait(r).length)?'Pending':(r.status||'Open');window.jqEff=eff;
  const stc=s=>s==='In progress'?'Progress':s;
  const pd=t=>{const m=String(t||'').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);if(!m)return null;const now=new Date();let y=m[3]?+m[3]:now.getFullYear();if(y<100)y+=2000;let d=new Date(y,+m[1]-1,+m[2]);if(!m[3]&&d-now>60*864e5)d=new Date(y-1,+m[1]-1,+m[2]);return d;};
  const age=t=>{const d=pd(t);return d?Math.floor((new Date()-d)/864e5):null;};
  function flags(r){if(r.status==='Done')return '';let h='';if(r.ball)h+=`<span class="ball">Ball: ${esc(r.ball)}</span>`;const dd=pd(r.due);if(dd&&new Date()-dd>864e5*0.99)h+=`<span class="flag">Overdue ${esc(r.due)}</span>`;else if(r.due)h+=`<span class="wait">Due ${esc(r.due)}</span>`;const a=age(r.confirmed||r.updated);if(a!==null&&a>=7)h+=`<span class="flag">Not confirmed in ${a} days</span>`;return h;}
  window.jqCmp=(a,b)=>((a.status==='Done')-(b.status==='Done'))||((b.pri?1:0)-(a.pri?1:0))||((parseInt(String(a.ref||'').replace(/\D/g,''))||999)-(parseInt(String(b.ref||'').replace(/\D/g,''))||999));
  window.jqPri=async id=>{const r=rows.find(x=>x._id===id);if(!r)return;try{await col.doc(id).update({pri:!r.pri});}catch(e){msg.textContent='Could not change priority. You may have view-only access.';}};
  function detailHtml(r){
    const lab=DNAME[r.area]||r.area||'';const L=ref=>rows.find(x=>x.ref===ref);
    const link=x=>`<li><a href="#" class="pre" data-pre="${esc(x.ref)}">${esc(x.ref)}</a> ${esc(x.title)} <span class="mono" style="font-size:11px">· ${esc(x.status)}</span></li>`;
    const pre=(r.blockedBy||[]).map(L).filter(Boolean),unb=rows.filter(x=>(x.blockedBy||[]).includes(r.ref)),ve=(r.ve||[]).map(L).filter(Boolean),feeds=rows.filter(x=>(x.ve||[]).includes(r.ref));
    const sec=(h,a)=>a.length?`<h3>${h}</h3><ul>${a.map(link).join('')}</ul>`:'';
    return `<button type="button" class="btn" data-back>← Back to ${esc(tkOnly?(tkGrp==='area'?(DNAME[tkOnly]||tkOnly):tkOnly):'the tracker')}</button>
    <div class="eyebrow" style="margin-top:12px">${esc(r.ref||'')} · ${esc(lab)}</div><h2 style="margin:4px 0 10px">${esc(r.title)}</h2>
    <div class="tk-facts"><div><span>Status</span><button class="st ${esc(stc(eff(r)))}" data-id="${esc(r._id)}"${canWrite?'':' disabled'}>${esc(eff(r))}</button></div>
    <div><span>Owner</span>${esc(r.owner||'Unassigned')}</div>${r.ball?`<div><span>Ball is with</span>${esc(r.ball)}</div>`:''}${r.due?`<div><span>Due</span>${esc(r.due)}</div>`:''}${r.confirmed?`<div><span>Last confirmed</span>${esc(r.confirmed)}${r.source?' · '+esc(r.source):''}</div>`:''}
    <div><span>Priority</span><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" aria-pressed="${!!r.pri}">★ ${r.pri?'Priority':'Mark priority'}</button></div>
    <div><span>Updated</span>${esc(r.updated||'')}</div></div>
    ${sec('Predecessors (must finish first)',pre)}${sec('Unblocks',unb)}${sec('VE ideas for this item',ve)}${sec('Feeds the cost log item',feeds)}
    ${flags(r)?`<p>${flags(r)}</p>`:''}${r.now?`<h3>Now</h3><p style="max-width:80ch;line-height:1.55" class="nowl">${esc(r.now)}</p>`:''}<h3>${r.now?'History':'Next step / notes'}</h3><p style="max-width:80ch;line-height:1.55" class="tk-hist">${esc(r.next||'No notes yet.')}</p>`;
  }
  function render(){
    window.jqIssues=rows; window.dispatchEvent(new Event('jqissues'));
    const detEl=document.getElementById('tkDetail'),barEl=document.getElementById('tkBar'),wrapEl=document.getElementById('tkWrap'),onlyEl=document.getElementById('tkOnly');
    const dr=detailId?rows.find(x=>x._id===detailId):null; if(!dr)detailId=null;
    barEl.hidden=!!dr; wrapEl.hidden=!!dr; detEl.hidden=!dr; onlyEl.hidden=!!dr||!tkOnly;
    if(dr){detEl.innerHTML=detailHtml(dr);return;}
    if(tkOnly)onlyEl.innerHTML='Showing <b>'+esc(tkGrp==='area'?(DNAME[tkOnly]||tkOnly):tkOnly)+'</b> <button type="button" class="btn" data-clearonly>Show all</button>';
    const owners=[...new Set(rows.flatMap(r=>String(r.owner||'Unassigned').split(/\s*[·,]\s*/)))].sort();
    const cur=ownerSel.value;
    ownerSel.innerHTML='<option value="">Everyone</option>'+owners.map(o=>`<option${o===cur?' selected':''}>${esc(o)}</option>`).join('');
    const c={Open:0,Pending:0,'In progress':0,Done:0}; rows.forEach(r=>{const e=eff(r);c[e]=(c[e]||0)+1;});
    document.getElementById('tkCounts').innerHTML=`<span>${c.Open} open</span><span>${c.Pending} pending</span><span>${c['In progress']} in progress</span><span>${c.Done} done</span>`;
    const show=showSel.value;
    const vis=rows.filter(r=>(!cur||String(r.owner||'Unassigned').includes(cur))&&(tkGrp!=='none'||show==='all'||(show==='Done'?r.status==='Done':r.status!=='Done')))
      .sort(window.jqCmp);
    const rowHtml=r=>`<tr class="${r.status==='Done'?'done':''}${r.pri?' pri':''}${r.status!=='Done'&&window.jqWait(r).length?' blocked':''}">
      <td class="id"><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" title="Priority: move to top" aria-pressed="${!!r.pri}">★</button> ${esc(r.ref||'')}</td>
      <td class="t"><a href="#" class="itm" data-open="${esc(r._id)}">${esc(r.title)}</a><span class="area">${esc(r.area||'')}</span></td>
      <td class="who">${esc(r.owner||'Unassigned')}</td>
      <td><button class="st ${esc(stc(eff(r)))}" data-id="${esc(r._id)}"${canWrite?'':' disabled'} title="${canWrite?'Click to change status':'View only'}">${esc(eff(r))}</button></td>
      <td class="nx">${(r.ve&&r.ve.length)?`<span class="wait" style="background:#E8F5EE;border-color:#BFE3CF;color:#1B6B3F">VE ideas: ${r.ve.map(x=>`<a href="#" class="pre" data-pre="${esc(x)}">${esc(x)}</a>`).join(', ')}</span> `:''}${r.status!=='Done'&&window.jqWait(r).length?`<span class="wait">Predecessor: ${window.jqWait(r).map(x=>`<a href="#" class="pre" data-pre="${esc(x.ref)}">${esc(x.ref)}</a>`).join(', ')}</span> `:''}${flags(r)}${r.now?`<span class="nowl">${esc(r.now)}</span>`:esc(r.next||'')}${r.updated?` <span class="mono" style="font-size:11px">· ${esc(r.updated)}</span>`:''}</td></tr>`;
    const DN=DNAME;
    if(!vis.length){body.innerHTML='<tr><td colspan="5" class="note">Nothing matches this filter.</td></tr>';return;}
    if(tkGrp==='none'){body.innerHTML=vis.map(rowHtml).join('');return;}
    const own=r=>String(r.owner||'Unassigned').split(/\s*[·,]\s*/).filter(Boolean);
    let keys0=tkGrp==='area'?Object.keys(DN).concat([...new Set(vis.map(r=>r.area).filter(a=>a&&!DN[a]))]):[...new Set(vis.flatMap(own))].sort((a,b)=>a==='Unassigned'?1:b==='Unassigned'?-1:a==='Jason'?-1:b==='Jason'?1:a.localeCompare(b));
    const keys=tkOnly?keys0.filter(k=>k===tkOnly):keys0;
    body.innerHTML=keys.map(k=>{const items=vis.filter(r=>tkGrp==='area'?r.area===k:own(r).includes(k)).sort(window.jqCmp);if(!items.length)return '';
      const op=items.filter(r=>r.status!=='Done'),dn=items.filter(r=>r.status==='Done'),open=op.length,key=tkGrp+':'+k,isOpen=tkOpen.has(key)||tkOnly===k,doneShown=doneOpen.has(key)||show!=='active';
      return `<tr class="grp" data-gk="${esc(key)}" aria-expanded="${isOpen}"><td colspan="5"><span class="car">${isOpen?'▾':'▸'}</span> <b>${esc(tkGrp==='area'?(DN[k]||k):k)}</b><span class="gc"><b>${open}</b> open / ${items.length}</span></td></tr>`+(isOpen?((show==='Done'?[]:op).map(rowHtml).join('')+(dn.length?`<tr class="donetoggle" data-dk="${esc(key)}"><td colspan="5">${doneShown?'▾':'▸'} ${dn.length} completed</td></tr>`+(doneShown?dn.map(rowHtml).join(''):''):'')):'');
    }).join('');
  }
  ownerSel.addEventListener('change',render);
  showSel.addEventListener('change',()=>{try{localStorage.setItem('tkShow',showSel.value)}catch(e){};render();});
  async function cycle(b){
    if(!b||b.disabled) return;
    const r=rows.find(x=>x._id===b.dataset.id); if(!r) return;
    const s=NEXT[r.status]||'Open', d=new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
    b.disabled=true;
    try{ await col.doc(r._id).update({status:s,updated:d}); msg.textContent=''; if(s==='Done'&&window.jqFeed) window.jqFeed(r.ref+' done: '+String(r.title).slice(0,60)); }
    catch(err){ msg.textContent='That change did not save. You may have view-only access to this page.'; b.disabled=false; }
  }
  document.getElementById('tkDetail').addEventListener('click',e=>{
    if(e.target.closest('[data-back]')){detailId=null;render();return;}
    const pre=e.target.closest('a.pre'); if(pre){e.preventDefault();window.jqGoRef(pre.dataset.pre);return;}
    const pb=e.target.closest('.pri-b'); if(pb){window.jqPri(pb.dataset.pid);return;}
    cycle(e.target.closest('.st'));
  });
  document.querySelector('.tab[data-tab="tracker"]').addEventListener('click',()=>{detailId=null;tkOnly=null;render();});
  document.getElementById('tkOnly').addEventListener('click',e=>{if(e.target.closest('[data-clearonly]')){tkOnly=null;render();}});
  body.addEventListener('click',async e=>{
    const gr=e.target.closest('tr.grp'); if(gr){const k=gr.dataset.gk;tkOpen.has(k)?tkOpen.delete(k):tkOpen.add(k);render();return;}
    const pre=e.target.closest('a.pre'); if(pre){e.preventDefault();window.jqGoRef(pre.dataset.pre);return;}
    const pb=e.target.closest('.pri-b'); if(pb){window.jqPri(pb.dataset.pid);return;}
    const it=e.target.closest('a.itm'); if(it){e.preventDefault();detailId=it.dataset.open;render();window.scrollTo(0,0);return;}
    const dt=e.target.closest('tr.donetoggle'); if(dt){const k=dt.dataset.dk;doneOpen.has(k)?doneOpen.delete(k):doneOpen.add(k);render();return;}
    cycle(e.target.closest('.st'));
  });
  document.getElementById('tkForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const t=document.getElementById('tkTitle').value.trim(); if(!t) return;
    const n=rows.reduce((m,r)=>Math.max(m,parseInt(String(r.ref||'').replace(/\D/g,''))||0),0)+1;
    const ref='J-'+String(n).padStart(2,'0');
    try{
      await col.doc(ref).set({ref,title:t,owner:document.getElementById('tkWho').value.trim()||'Unassigned',area:document.getElementById('tkArea').value,
        status:'Open',next:document.getElementById('tkNext').value.trim(),order:n,updated:new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'})});
      e.target.reset(); msg.textContent='Added '+ref+'.'; document.getElementById('issModal').hidden=true;
    }catch(err){ msg.textContent='Could not add the item. You may have view-only access to this page.'; }
  });
  try{db.collection('sweeps').onSnapshot(sn=>{const L=norm(sn).sort((a,b)=>(b.at||0)-(a.at||0))[0];const el=document.getElementById('tkSweep');if(el&&L)el.textContent=`Last full check: ${L.date||''} · ${L.checked||0} items checked · ${L.changed||0} changed`;},()=>{});}catch(e){}
  col.onSnapshot(snap=>{rows=norm(snap);render();},()=>{body.innerHTML='<tr><td colspan="5" class="note">The tracker could not load. Reload the page to try again.</td></tr>';});
})();
(function directory(){
  const firms={
    jaq:{n:'JACQUET Midwest',g:'Owner',web:'https://usa.myjacquet.com/contact-us/jacquet-midwest/',ph:'262-898-1381',addr:'Racine, WI'},
    zpg:{n:'Zilber Property Group',g:'Developer',web:'https://www.zilberpropertygroup.com',ph:'800-945-4450',addr:'710 N. Plankinton Ave., Suite 1100, Milwaukee, WI'},
    riley:{n:'Riley Construction',g:'Design-build general contractor',web:'https://rileycon.com',ph:'262-658-4381',addr:'Kenosha, WI'},
    pida:{n:'Partners in Design Architects',g:'Architect',web:'https://www.pidarchitects.com',ph:'847-940-0300',addr:'2610 Lake Cook Rd., Suite 280, Riverwoods, IL'},
    ras:{n:'raSmith',g:'Structural engineer',web:'https://www.rasmith.com',ph:'',addr:'Brookfield, WI'},
    pin:{n:'Pinnacle Engineering Group',g:'Civil / landscape',web:'https://pinnacle-engr.com',ph:'262-754-8888',addr:'Brookfield, WI'},
    mpc:{n:'Martin Petersen Company (MPC)',g:'HVAC, plumbing, process piping',web:'https://mpcmech.com',ph:'262-658-1326',addr:'Kenosha, WI'},
    next:{n:'NEXT Electric',g:'Electrical',web:'https://nextelectricllc.com',ph:'262-393-1890',addr:'New Berlin, WI'},
    ahern:{n:'J.F. Ahern Co.',g:'Fire protection',web:'https://www.jfahern.com',ph:'800-532-4376',addr:'Fond du Lac, WI'},
    card:{n:'Cardinal Fabricating (to confirm)',g:'Structural steel / crane pricing',web:'https://www.cardinalfab.com',ph:'414-744-9700',addr:'Milwaukee, WI'},
    tbd:{n:'Firm to confirm',g:'Other attendees',web:'',ph:'',addr:''}
  };
  const P=[
    {id:'rich',f:'jaq',fn:'John',ln:'Rich',t:'',r:'Owner contact; final layout approval'},
    {id:'chatterton',f:'jaq',fn:'Dan',ln:'Chatterton',t:'CEO / Manager, JACQUET Midwest',r:'Equipment, cut sheets, Racine facility',em:'d.chatterton@myjacquet.com',cell:'262-909-4263',bio:'Leads JACQUET Midwest, the Racine, Wisconsin service center that stocks and cuts stainless and nickel-alloy plate (waterjet, laser and plasma).',src:'https://usa.myjacquet.com/contact-us/jacquet-midwest/'},
    {id:'lueders',f:'zpg',fn:'Jason',ln:'Lueders',t:'',r:'ZPG project lead',em:'jason.lueders@zilber.com'},
    {id:'navis',f:'zpg',fn:'Chad',ln:'Navis',t:'Vice President, Zilber Ltd.',r:'ZPG executive',bio:'Member of the Zilber Ltd. executive team.',src:'https://www.zilber.com/executive-team.html'},
    {id:'kleinke',f:'zpg',fn:'Lisa',ln:'Kleinke',t:'',r:'ZPG'},
    {id:'dillon',f:'riley',fn:'Erik',ln:'Dillon',t:'Chief Operating Officer, LEED AP',r:'Riley lead; steel and schedule coordination',bio:'Started at Riley as an intern in 2006 and rose through project management, becoming Vice President in 2022 and COO in 2026. B.S. in Construction Management, Western Illinois University.',src:'https://rileycon.com/staff/erik-dillon/'},
    {id:'delavan',f:'riley',fn:'John',ln:'Delavan',t:'Vice President of Preconstruction, LEED AP',r:'Preconstruction; cost control log',em:'johnd@rileycon.com',bio:'More than 25 years in the industry. Joined Riley in 2000 and helped build its dedicated preconstruction department. B.S., Purdue University; AGC Building Information Modeling certificate.',src:'https://rileycon.com/staff/john-delavan/'},
    {id:'brisske',f:'pida',fn:'Werner',ln:'Brisske',t:'Principal, AIA, ALA, NCARB',r:'Principal in charge',em:'werner@pidarchitects.com',bio:'Registered architect in 16 states including Illinois and Wisconsin, and a Green Globes Professional. M.Arch and B.S., University of Illinois Urbana-Champaign.',src:'https://www.pidarchitects.com/our-team/werner-h-brisske/'},
    {id:'hall',f:'pida',fn:'Jeremy',ln:'Hall',t:'Architect, AIA, ALA',r:'Project architect; plans, CAD and Village submittal',em:'jeremyh@pidarchitects.com',bio:'Registered in Illinois, with an M.Arch from the University of Illinois Urbana-Champaign and architecture degrees from Kent State. A carpenter\'s son who grew up around construction.',src:'https://www.pidarchitects.com/our-team/jeremy-j-hall/'},
    {id:'reed',f:'ras',fn:'Doug',ln:'Reed',t:'P.E., Structural Group Leader – Buildings',r:'Structural engineer of record',em:'Douglas.Reed@raSmith.com',bio:'Joined raSmith in 2025 with more than 30 years in structural engineering across steel, concrete, wood and FRP. Licensed in Wisconsin and Iowa; past president of the Structural Engineers Association of Wisconsin.',src:'https://www.rasmith.com/news/doug-reed-joins-rasmith-as-buildings-group-leader-in-the-structural-services-division/'},
    {id:'artz',f:'pin',fn:'Adam',ln:'Artz',t:'',r:'Civil engineer; Village coordination',em:'adam.artz@pinnacle-engr.com'},
    {id:'trotter',f:'mpc',fn:'Tyler',ln:'Trotter',t:'',r:'Process piping and utilities',em:'ttrotter@mpcmech.com'},
    {id:'wilfert',f:'mpc',fn:'Joe',ln:'Wilfert',t:'',r:'Mechanical',em:'jwilfert@mpcmech.com'},
    {id:'young',f:'mpc',fn:'Dan',ln:'Young',t:'',r:'Mechanical',em:'dyoung@mpcmech.com'},
    {id:'jablonski',f:'mpc',fn:'Nicholas',ln:'Jablonski',t:'',r:'Mechanical',em:'njablonski@mpcmech.com'},
    {id:'kowalkowski',f:'next',fn:'Scott',ln:'Kowalkowski',t:'',r:'Electrical',em:'scott.kowalkowski@nextelectricllc.com'},
    {id:'wehrman',f:'next',fn:'Eddie',ln:'Wehrman',t:'',r:'Electrical',em:'eddie.wehrman@nextelectricllc.com'},
    {id:'berth',f:'ahern',fn:'Matt',ln:'Berth',t:'',r:'Fire protection design; rack sprinkler strategy',em:'mberth@jfahern.com'},
    {id:'simon',f:'card',fn:'Simon',ln:'',t:'',r:'Steel and crane pricing'},
    {id:'johnson',f:'tbd',fn:'Justin',ln:'Johnson',t:'',r:'On the design meeting invite'},
    {id:'shoaf',f:'tbd',fn:'Andrew',ln:'Shoaf',t:'',r:'On the design meeting invite'},
  ];
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const SIL='<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="38" r="20" fill="#9FB0C0"/><path d="M12 100c0-22 17-36 38-36s38 14 38 36z" fill="#9FB0C0"/></svg>';
  const pic=p=>{const u=(window.JQ_PHOTOS||{})[p.id];return u?`<img src="${u}" alt="${esc(full(p))}">`:SIL;};
  const I={
    ph:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    cell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    em:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
    card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h5M14 14h4"/></svg>',
    chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-7M17 21v-4"/></svg>'
  };
  const full=p=>(p.fn+' '+p.ln).trim();
  const vcf=p=>{const f=firms[p.f];return ['BEGIN:VCARD','VERSION:3.0',`N:${p.ln};${p.fn};;;`,`FN:${full(p)}`,`ORG:${f.n.replace(' (to confirm)','')}`,
    p.t?`TITLE:${p.t}`:'',p.em?`EMAIL;TYPE=INTERNET,WORK:${p.em}`:'',f.ph?`TEL;TYPE=WORK,VOICE:${f.ph}`:'',p.cell?`TEL;TYPE=CELL:${p.cell}`:'',
    f.web?`URL:${f.web}`:'',`NOTE:Jaquet USA BTS (LakeView Corporate Park) – ${f.g}${p.r?': '+p.r:''}`,'END:VCARD'].filter(Boolean).join('\r\n');};
  const toast=m=>{const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);};
  let dl=null; window.claude&&window.claude.use('downloads').then(x=>dl=x).catch(()=>{});
  async function save(name,text){
    if(!dl){toast('Downloads are not available in this view');return;}
    try{await dl.save({filename:name,data:new Blob([text],{type:'text/vcard'})});}
    catch(e){try{await dl.save({filename:name,data:text});}catch(e2){toast('The download was not saved');}}
  }
  const card=p=>{const f=firms[p.f];return `<div class="pcard" data-id="${p.id}" tabindex="0" role="button" aria-label="Open ${esc(full(p))}'s profile">
    <span class="qi" title="QR code in profile">${I.qr}</span>
    <div class="avatar">${pic(p)}</div>
    <div class="nm">${esc(full(p))}</div>
    <div class="co">${esc(f.n)}</div>
    <div class="ro">${esc(p.t||'Title to confirm')}</div>
    <div class="ro">${esc(p.r||'')}</div>
    ${f.ph?`<div class="ln">${I.ph}${esc(f.ph)}</div>`:''}
    ${p.cell?`<div class="ln">${I.cell}${esc(p.cell)}</div>`:''}
    ${p.em?`<div class="ln">${I.em}${esc(p.em)}</div>`:'<div class="tbc">Email to confirm</div>'}
    <div class="acts"><button class="ib" type="button" data-vc="${p.id}" title="Add to Outlook (vCard)">${I.card}</button>${p.em?`<a class="ib" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(p.em)}" target="_blank" rel="noopener" title="Chat in Teams">${I.chat}</a>`:''}</div>
  </div>`;};
  const order=['jaq','zpg','riley','pida','ras','pin','mpc','next','ahern','card','tbd'];
  document.getElementById('dirList').innerHTML=order.map(k=>{const f=firms[k],ps=P.filter(p=>p.f===k);return `<section class="dgroup"><h3>${esc(f.g)} · ${esc(f.n)} <span>${[f.addr,f.ph].filter(Boolean).map(esc).join(' · ')}${f.web?` · <a href="${f.web}" target="_blank" rel="noopener">website ↗</a>`:''}</span></h3><div class="cards">${ps.map(card).join('')}</div></section>`;}).join('');
  const prof=document.getElementById('prof');
  function openProf(id){
    const p=P.find(x=>x.id===id);if(!p)return;const f=firms[p.f];
    document.getElementById('profPic').innerHTML=pic(p);
    document.getElementById('profGroup').textContent=f.g;
    document.getElementById('profName').textContent=full(p);
    document.getElementById('profTitle').textContent=(p.t||'Title to confirm')+' · '+f.n;
    document.getElementById('profDl').innerHTML=[['Project role',p.r],['Email',p.em||'To confirm'],['Office',f.ph],['Cell',p.cell],['Office address',f.addr],['Company',f.web?`<a href="${f.web}" target="_blank" rel="noopener">${esc(f.n)} ↗</a>`:'']].filter(x=>x[1]).map(([a,b])=>`<dt>${a}</dt><dd>${a==='Company'?b:esc(b)}</dd>`).join('');
    document.getElementById('profBio').innerHTML=p.bio?`${esc(p.bio)} <a href="${p.src}" target="_blank" rel="noopener">Source ↗</a>`:'<span class="note">No published bio on the company website yet.</span>';
    document.getElementById('profBtns').innerHTML=`<button class="btn go" type="button" data-vc="${p.id}">Add to Outlook (vCard)</button>${p.em?`<a class="btn" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(p.em)}" target="_blank" rel="noopener">Chat in Teams ↗</a>`:''}`;
    const q=document.getElementById('profQR');q.innerHTML='';
    try{ if(window.QRCode) new QRCode(q,{text:vcf(p),width:240,height:240,correctLevel:QRCode.CorrectLevel.L}); else q.innerHTML='<span class="note">QR unavailable</span>'; }catch(e){q.innerHTML='<span class="note">QR unavailable</span>';}
    prof.hidden=false;
  }
  document.addEventListener('click',e=>{
    const vc=e.target.closest('[data-vc]');
    if(vc){e.stopPropagation();const p=P.find(x=>x.id===vc.dataset.vc);save(full(p).replace(/\s+/g,'_')+'.vcf',vcf(p));return;}
    if(e.target.closest('a.ib'))return;
    const c=e.target.closest('.pcard');if(c){openProf(c.dataset.id);return;}
  });
  document.getElementById('dirList').addEventListener('keydown',e=>{const c=e.target.closest('.pcard');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openProf(c.dataset.id);}});
  document.getElementById('profX').addEventListener('click',()=>prof.hidden=true);
  prof.addEventListener('click',e=>{if(e.target===prof)prof.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!prof.hidden)prof.hidden=true;}});
  document.getElementById('vcAll').addEventListener('click',()=>save('Jaquet_project_directory.vcf',P.map(vcf).join('\r\n')));

})();

(function shell(){
  const tabs=[...document.querySelectorAll('.tab')], panels=[...document.querySelectorAll('.panel')];
  function show(name,scroll){
    if(!panels.some(p=>p.dataset.panel===name)) name='home';
    panels.forEach(p=>p.hidden=p.dataset.panel!==name);
    document.querySelector('.shell').classList.toggle('wide',name==='schedule');
    tabs.forEach(b=>{if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    try{sessionStorage.setItem('jqTab',name)}catch(e){}
    if(scroll!==false) window.scrollTo(0,0);
    if(name==='schedule'&&window.jqFit) requestAnimationFrame(window.jqFit);
  }
  window.jqTab=show;
  tabs.forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
  let first='home'; const h=location.hash.slice(1);
  if(h&&panels.some(p=>p.dataset.panel===h)) first=h; else { try{first=sessionStorage.getItem('jqTab')||'home'}catch(e){} }
  show(first,false);
  window.jqShow=show;

  // search
  const q=document.getElementById('q'), res=document.getElementById('qres');
  const label={home:'Home',tracker:'Tracker',documents:'Documents',schedule:'Schedule',team:'Team',meetings:'Meetings',photos:'Photos'};
  q.addEventListener('input',()=>{
    const s=q.value.trim().toLowerCase(); if(s.length<2){res.innerHTML='';return;}
    const els=[...document.querySelectorAll('.panel tbody tr, .panel li, .panel .pcard, .panel .item, .panel .step, .panel section > header h2, .panel .g-row')];
    const hits=els.filter(e=>e.textContent.toLowerCase().includes(s)).slice(0,25);
    res.innerHTML=hits.length?hits.map((e,i)=>{const p=e.closest('.panel').dataset.panel;const txt=e.textContent.replace(/\s+/g,' ').trim().slice(0,90);return `<button type="button" data-i="${i}"><small>${label[p]}</small>${txt.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</button>`;}).join(''):'<span class="note">No matches.</span>';
    res.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const el=hits[+b.dataset.i];show(el.closest('.panel').dataset.panel,false);
      const d=el.closest('details');if(d)d.open=true; el.scrollIntoView({block:'center',behavior:'smooth'}); el.classList.add('hit'); setTimeout(()=>el.classList.remove('hit'),1800);};
  });

  // left-bar issue tracker grouped by discipline
  const DISC=[['Design','Drawings and Design'],['Approvals','Village, DSPS & permits'],['Steel','Structural & steel'],['Fire','Fire protection'],['MEP','MEP & process piping'],['General Contractor','General Contractor'],['Jaquet','Owner decisions (Jaquet)']];
  const discEl=document.getElementById('disc'); const openSet=new Set();
  let grp='area';
  function renderOwner(rows){
    const own=r=>String((r.owner&&String(r.owner).trim())||'Unassigned').split(/\s*[·,]\s*/).filter(Boolean);const names=[...new Set(rows.flatMap(own))];
    names.sort((a,b)=>a==='Unassigned'?1:b==='Unassigned'?-1:a==='Jason'?-1:b==='Jason'?1:a.localeCompare(b));
    discEl.innerHTML=names.map(n=>{const items=rows.filter(r=>own(r).includes(n)).sort(window.jqCmp);
      const open=items.filter(r=>r.status!=='Done').length;if(!open&&!items.length)return '';
      return `<details data-k="o:${esc(n)}"${(openSet.has('o:'+n)||(n==='Jason'&&!openSet.has('_x')))?' open':''}><summary>${esc(n)}<span><b>${open}</b> open / ${items.length}</span></summary><ul>${items.filter(r=>r.status!=='Done').map(r=>`<li class="${r.status==='Done'?'done':''}${r.pri?' pri':''}"><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" title="Priority: move to top" aria-pressed="${!!r.pri}">★</button><button type="button" data-ref="${esc(r._id)}"><i>${esc(r.ref||'')}</i><span>${esc(r.title)}${r.status!=='Done'&&window.jqWait&&window.jqWait(r).length?` <em class="pre" role="link" tabindex="0" data-pre="${window.jqWait(r)[0].ref}">Predecessor: ${window.jqWait(r).map(x=>esc(x.ref)).join(', ')}</em>`:''}</span></button></li>`).join('')}</ul>${items.filter(r=>r.status==='Done').length?`<button type="button" class="donelink" data-dl="owner:${esc(n)}">${items.filter(r=>r.status==='Done').length} completed →</button>`:''}</details>`;}).join('')||'<p class="note">No issues yet.</p>';}
  document.querySelector('.grpsw').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;grp=b.dataset.g;document.querySelectorAll('.grpsw button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderDisc();});
  function renderDisc(){
    const rows=window.jqIssues||[];if(grp==='owner'){renderOwner(rows);return;} const known=DISC.map(d=>d[0]);
    const groups=DISC.concat(rows.some(r=>!known.includes(r.area))?[['__other','Other']]:[]);
    discEl.innerHTML=groups.map(([k,n])=>{const items=rows.filter(r=>k==='__other'?!known.includes(r.area):r.area===k).sort(window.jqCmp);
      if(!items.length)return '';const open=items.filter(r=>r.status!=='Done').length;
      return `<details data-k="${k}"${openSet.has(k)?' open':''}><summary>${n}<span><b>${open}</b> open / ${items.length}</span></summary><ul>${items.filter(r=>r.status!=='Done').map(r=>`<li class="${r.status==='Done'?'done':''}${r.pri?' pri':''}"><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" title="Priority: move to top" aria-pressed="${!!r.pri}">★</button><button type="button" data-ref="${esc(r._id)}"><i>${esc(r.ref||'')}</i><span>${esc(r.title)}${r.status!=='Done'&&window.jqWait&&window.jqWait(r).length?` <em class="pre" role="link" tabindex="0" data-pre="${window.jqWait(r)[0].ref}">Predecessor: ${window.jqWait(r).map(x=>esc(x.ref)).join(', ')}</em>`:''}</span></button></li>`).join('')}</ul>${items.filter(r=>r.status==='Done').length?`<button type="button" class="donelink" data-dl="area:${esc(k)}">${items.filter(r=>r.status==='Done').length} completed →</button>`:''}</details>`;}).join('')||'<p class="note">No issues yet.</p>';
  }
  window.addEventListener('jqissues',renderDisc);
  discEl.addEventListener('toggle',e=>{const d=e.target;if(d.tagName==='DETAILS'){openSet.add('_x');d.open?openSet.add(d.dataset.k):openSet.delete(d.dataset.k);}},true);
  function goTo(id){if(window.jqOpenItem)window.jqOpenItem(id);}
  window.jqGoRef=ref=>{const r=(window.jqIssues||[]).find(x=>x.ref===ref);if(r)goTo(r._id);};
  discEl.addEventListener('click',e=>{
    const dl=e.target.closest('.donelink');if(dl){const [kd,...kk]=dl.dataset.dl.split(':');window.jqOpenGroup(kd,kk.join(':'),true);return;}
    const sm=e.target.closest('summary');if(sm){e.preventDefault();const d=sm.parentElement,dk=d.dataset.k||'';openSet.add('_x');if(d.open){openSet.delete(dk);d.open=false;return;}openSet.add(dk);d.open=true;if(dk.startsWith('o:'))window.jqOpenGroup('owner',dk.slice(2));else if(dk)window.jqOpenGroup('area',dk);return;}const pb=e.target.closest('.pri-b');if(pb){window.jqPri&&window.jqPri(pb.dataset.pid);return;}
    const pre=e.target.closest('.pre');if(pre){window.jqGoRef(pre.dataset.pre);return;}
    const b=e.target.closest('button[data-ref]');if(!b)return;goTo(b.dataset.ref);});
  // feed + forum (shared database)
  const feedEl=document.getElementById('feed'), postsEl=document.getElementById('posts'), form=document.getElementById('postForm');
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const md=ms=>{const d=new Date(ms);return (d.getMonth()+1)+'/'+d.getDate();};
  const norm=snap=>Array.from((snap&&(snap.docs||snap))||[]).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id||v.id};});
  (async()=>{
    const db=window.claude?await window.claude.use('db'):null;
    if(!db){document.getElementById('feedForm').hidden=true;feedEl.innerHTML='<li class="note">Sign in to claude.ai to see the feed.</li>';postsEl.innerHTML='<p class="note">Sign in to see the forum.</p>';form.hidden=true;return;}
    const user=await window.claude.use('user');
    const me=user&&user.id?await user.id().catch(()=>null):null;
    window.jqFeed=async text=>{try{await db.collection('feed').doc('e'+Date.now()).set({text,at:Date.now(),by:me||''});}catch(e){}};
    document.getElementById('feedForm').addEventListener('submit',async ev=>{ev.preventDefault();const i=document.getElementById('feedText');const v=i.value.trim();if(!v)return;await window.jqFeed(v);i.value='';});
    db.collection('feed').onSnapshot(s=>{const rows=norm(s).sort((a,b)=>b.at-a.at).slice(0,30);
      feedEl.innerHTML=rows.length?rows.map(r=>`<li><time>${md(r.at)}</time><span>${esc(r.text)}</span></li>`).join(''):'<li class="note">Nothing yet.</li>';},()=>{});
    db.collection('posts').onSnapshot(async s=>{const rows=norm(s).sort((a,b)=>b.at-a.at).slice(0,20);
      let names={}; try{const ids=[...new Set(rows.map(r=>r.by).filter(Boolean))]; if(ids.length&&user&&user.profiles) names=await user.profiles(ids);}catch(e){}
      postsEl.innerHTML=rows.length?rows.map(r=>`<div class="post"><b>${esc((names[r.by]&&names[r.by].name)||'Someone')}</b><time>${md(r.at)}</time><p>${esc(r.text)}</p></div>`).join(''):'<p class="note">No posts yet. Start the conversation.</p>';},()=>{});
    form.addEventListener('submit',async e=>{e.preventDefault();const ta=document.getElementById('postText');const text=ta.value.trim();if(!text)return;
      try{await db.collection('posts').doc('p'+Date.now()).set({text,at:Date.now(),by:me||''});ta.value='';}
      catch(err){const t=document.getElementById('toast');t.textContent='That post did not save. You may have view-only access.';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}});
  })();
})();

(function issueModal(){const m=document.getElementById('issModal');
  document.getElementById('newIss').addEventListener('click',()=>{m.hidden=false;setTimeout(()=>document.getElementById('tkTitle').focus(),30);});
  document.getElementById('issX').addEventListener('click',()=>m.hidden=true);
  m.addEventListener('click',e=>{if(e.target===m)m.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')m.hidden=true;});
  if(document.getElementById('tkAdd').hidden) document.getElementById('newIss').hidden=true;
})();

(function visuals(){const lb=document.getElementById('lightbox');
  document.addEventListener('click',e=>{const b=e.target.closest('.vimg');if(b){document.getElementById('lbImg').src=b.dataset.full;document.getElementById('lbImg').alt=b.dataset.cap;document.getElementById('lbCap').innerHTML=b.dataset.cap;lb.hidden=false;return;}
    const g=e.target.closest('[data-tabgo]');if(g){e.preventDefault();window.jqShow&&window.jqShow(g.dataset.tabgo);}});
  document.getElementById('lbX').addEventListener('click',()=>lb.hidden=true);
  lb.addEventListener('click',e=>{if(e.target===lb)lb.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')lb.hidden=true;});
})();

(function m3dFullWidth(){
  const panel=document.querySelector('.panel[data-panel="home"]'),shell=document.querySelector('.shell'),btn=document.getElementById('m3dFull');
  window.jqM3dFull=()=>panel.classList.contains('m3d-only');
  window.jqM3dSet=on=>{panel.classList.toggle('m3d-only',on);shell.classList.toggle('wide',on);btn.textContent=on?'✕ Exit full width':'⤢ Full width';if(on)document.getElementById('model3d').scrollIntoView({block:'start'});};
  btn.addEventListener('click',()=>window.jqM3dSet(!window.jqM3dFull()));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.jqM3dFull())window.jqM3dSet(false);});
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{if(window.jqM3dFull()){panel.classList.remove('m3d-only');btn.textContent='⤢ Full width';if(b.dataset.tab!=='schedule')shell.classList.remove('wide');}}));
})();
(function model3d(){
  const stage=document.getElementById('m3dStage'),cv=document.getElementById('m3dCanvas'),msg=document.getElementById('m3dMsg');
  let started=false;
  function start(){
    if(started||!window.THREE)return; started=true;
    const T=window.THREE;
    const R=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
    R.setPixelRatio(Math.min(2,devicePixelRatio||1));
    const S=new T.Scene();
    const C=new T.PerspectiveCamera(40,1,1,6000);
    S.add(new T.HemisphereLight(0xffffff,0x8899aa,0.75));
    const sun=new T.DirectionalLight(0xffffff,0.75);sun.position.set(-300,500,400);S.add(sun);
    const fill=new T.DirectionalLight(0xffffff,0.3);fill.position.set(400,200,-300);S.add(fill);
    const grid=new T.GridHelper(900,30,0xb9c6d2,0xd5dde5);grid.position.y=-0.2;S.add(grid);
    const mats={walls:{c:0xE9ECEF},slabs:{c:0x9AA6B2},doors:{c:0x5B7A99},curtain:{c:0x2E3F50},glass:{c:0x8FC3E6,o:.55},other:{c:0xB59A72}};
    const groups={};
    fetch('model/jaquet-model.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(j=>{
      const q=j.q;
      for(const [k,b64] of Object.entries(j.groups)){
        const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
        const i16=new Int16Array(u8.buffer),f=new Float32Array(i16.length);for(let i=0;i<i16.length;i++)f[i]=i16[i]*q;
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(f,3));geo.computeVertexNormals();
        const m=mats[k]||{c:0xcccccc};
        const mat=new T.MeshStandardMaterial({color:m.c,roughness:.85,metalness:.05,side:T.DoubleSide,transparent:!!m.o,opacity:m.o||1,flatShading:true});
        const mesh=new T.Mesh(geo,mat);S.add(mesh);groups[k]=mesh;
        if(k==='walls'){const e=new T.LineSegments(new T.EdgesGeometry(geo,30),new T.LineBasicMaterial({color:0x7A8B9C}));S.add(e);groups.wallEdges=e;}
      }
      msg.hidden=true; view('iso');
    }).catch(()=>{msg.textContent='The 3D model could not load in this view.';});
    // simple orbit controls
    let th=-0.9,ph=0.95,rad=720,tgt=new T.Vector3(0,15,0);
    function upd(){ph=Math.max(.05,Math.min(1.55,ph));rad=Math.max(60,Math.min(2500,rad));
      C.position.set(tgt.x+rad*Math.sin(ph)*Math.sin(th),tgt.y+rad*Math.cos(ph),tgt.z+rad*Math.sin(ph)*Math.cos(th));C.lookAt(tgt);draw();}
    function size(){const w=stage.clientWidth,h=stage.clientHeight;if(!w)return;R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix();draw();}
    let raf=0;function draw(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;R.render(S,C);});}
    function view(v){tgt.set(0,15,0);if(v==='top'){th=0;ph=.06;rad=760;}else if(v==='front'){th=0;ph=1.45;rad=700;}else{th=-0.9;ph=0.95;rad=720;}upd();}
    let drag=null;
    cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,b:e.button,sh:e.shiftKey};cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
      if(drag.b===2||drag.sh){const s=rad/stage.clientHeight;const right=new T.Vector3().setFromMatrixColumn(C.matrix,0),up=new T.Vector3().setFromMatrixColumn(C.matrix,1);
        tgt.addScaledVector(right,-dx*s).addScaledVector(up,dy*s);}else{th-=dx*.006;ph-=dy*.006;}upd();});
    cv.addEventListener('pointerup',e=>{if(drag&&drag.b===0&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<4&&!window.jqM3dFull())window.jqM3dSet(true);drag=null;});cv.addEventListener('contextmenu',e=>e.preventDefault());
    cv.addEventListener('wheel',e=>{e.preventDefault();rad*=Math.exp(e.deltaY*.0012);upd();},{passive:false});
    document.getElementById('m3dBtns').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)view(b.dataset.view);});
    document.getElementById('m3dBtns').addEventListener('change',e=>{const k=e.target.dataset.layer;if(!k)return;const on=e.target.checked;
      const ks=k==='curtain'?['curtain','glass']:k==='slabs'?['slabs','other']:k==='walls'?['walls','wallEdges']:[k];ks.forEach(x=>{if(groups[x])groups[x].visible=on;});draw();});
    new ResizeObserver(size).observe(stage); size(); upd();
  }
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){if(window.THREE)start();else{const w=setInterval(()=>{if(window.THREE){clearInterval(w);start();}},200);setTimeout(()=>clearInterval(w),10000);}}});
  io.observe(stage);
})();

(function drawings(){
  const SHEETS=[
    {id:'A1',t:'Site Plan',img:'drawings/A1.jpg'},
    {id:'A2',t:'Outdoor Storage Plan',img:'drawings/A2.jpg'},
    {id:'A3',t:'Overall Floor Plan',img:'drawings/A3.jpg'},
    {id:'A4',t:'Office Plan Layout',img:'drawings/A4.jpg'},
    {id:'A5',t:'Exterior Elevations',img:'drawings/A5.jpg'}];
  const tabs=document.getElementById('dwTabs'),view=document.getElementById('dwView'),img=document.getElementById('dwImg'),ttl=document.getElementById('dwTitle');
  tabs.innerHTML=SHEETS.map((s,i)=>`<button class="dw-tab" role="tab" data-i="${i}" aria-selected="false">${s.id}<small>${s.t}</small></button>`).join('');
  function show(i){const s=SHEETS[i];img.src=s.img;img.alt=s.id+' '+s.t;ttl.textContent=s.id+' · '+s.t;view.dataset.full=s.img;view.dataset.cap=s.id+' · '+s.t+' · PIDA 10/28/26';
    tabs.querySelectorAll('.dw-tab').forEach((b,k)=>b.setAttribute('aria-selected',String(k===i)));try{sessionStorage.setItem('jqSheet',i)}catch(e){}}
  tabs.addEventListener('click',e=>{const b=e.target.closest('.dw-tab');if(b)show(+b.dataset.i);});
  let n=0;try{n=+sessionStorage.getItem('jqSheet')||0}catch(e){} show(Math.min(n,SHEETS.length-1));
})();
(function drawingViewer(){
  let W=2016,H=1344,PW=2592,PH=1728,K=PW/W;
  const SHEETS=[{id:'A1',t:'Site Plan',img:'drawings/A1.jpg'},{id:'A2',t:'Outdoor Storage Plan',img:'drawings/A2.jpg'},{id:'A3',t:'Overall Floor Plan',img:'drawings/A3.jpg'},{id:'A4',t:'Office Plan Layout',img:'drawings/A4.jpg'},{id:'A5',t:'Exterior Elevations',img:'drawings/A5.jpg'}];
  const BASE_N=SHEETS.length;SHEETS.push(...JSON.parse('[{"id":"CR-SCH","t":"Crane schematic (10/23)","img":"sheets/CR-SCH.jpg","W":2016,"H":1440,"pw":3000,"ph":2143,"x":1},{"id":"RM10-1","t":"R&M 10 ton 80 ft span, sheet 1","img":"sheets/RM10-1.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"RM10-2","t":"R&M 10 ton 80 ft span, sheet 2","img":"sheets/RM10-2.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"RM15-1","t":"R&M 15 ton 80 ft span, sheet 1","img":"sheets/RM15-1.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"RM15-2","t":"R&M 15 ton 80 ft span, sheet 2","img":"sheets/RM15-2.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"RM15S-1","t":"R&M 15 ton single truck, sheet 1","img":"sheets/RM15S-1.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"RM15S-2","t":"R&M 15 ton single truck, sheet 2","img":"sheets/RM15S-2.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"EQ-FT-1","t":"Equipment drawing 0029621600 [ft-in], sheet 1","img":"sheets/EQ-FT-1.jpg","W":2016,"H":1427,"pw":3000,"ph":2123,"x":1},{"id":"EQ-FT-2","t":"Equipment drawing 0029621600 [ft-in], sheet 2","img":"sheets/EQ-FT-2.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-FT-3","t":"Equipment drawing 0029621600 [ft-in], sheet 3","img":"sheets/EQ-FT-3.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"EQ-FT-4","t":"Equipment drawing 0029621600 [ft-in], sheet 4","img":"sheets/EQ-FT-4.jpg","W":2016,"H":1425,"pw":3000,"ph":2121,"x":1},{"id":"EQ-FT-5","t":"Equipment drawing 0029621600 [ft-in], sheet 5","img":"sheets/EQ-FT-5.jpg","W":2016,"H":1425,"pw":3000,"ph":2121,"x":1},{"id":"EQ-FT-6","t":"Equipment drawing 0029621600 [ft-in], sheet 6","img":"sheets/EQ-FT-6.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-FT-7","t":"Equipment drawing 0029621600 [ft-in], sheet 7","img":"sheets/EQ-FT-7.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"EQ-FT-8","t":"Equipment drawing 0029621600 [ft-in], sheet 8","img":"sheets/EQ-FT-8.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-FT-9","t":"Equipment drawing 0029621600 [ft-in], sheet 9","img":"sheets/EQ-FT-9.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"EQ-FT-10","t":"Equipment drawing 0029621600 [ft-in], sheet 10","img":"sheets/EQ-FT-10.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-FD-1","t":"Foundation drawings, sheet 1","img":"sheets/EQ-FD-1.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-FD-2","t":"Foundation drawings, sheet 2","img":"sheets/EQ-FD-2.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-RR-1","t":"Equipment layout RR5570-REV01, sheet 1","img":"sheets/EQ-RR-1.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-RR-2","t":"Equipment layout RR5570-REV01, sheet 2","img":"sheets/EQ-RR-2.jpg","W":2016,"H":1425,"pw":3000,"ph":2120,"x":1},{"id":"EQ-VAS","t":"Equipment layout VAS OSF 6250x2000x2500x300","img":"sheets/EQ-VAS.jpg","W":2016,"H":1427,"pw":3000,"ph":2123,"x":1},{"id":"EQ-SCH-1","t":"Equipment schedule v2, page 1","img":"sheets/EQ-SCH-1.jpg","W":2016,"H":2608,"pw":2319,"ph":3000,"x":1},{"id":"EQ-SCH-2","t":"Equipment schedule v2, page 2","img":"sheets/EQ-SCH-2.jpg","W":2016,"H":1558,"pw":3000,"ph":2319,"x":1},{"id":"V12-8","t":"v12 p.8 Outdoor storage example: mimic the Limerick facility","img":"sheets/V12-8.jpg","W":2016,"H":2850,"pw":2122,"ph":3000,"x":1},{"id":"V12-9","t":"v12 p.9 Crane drawing (in plans)","img":"sheets/V12-9.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"V12-10","t":"v12 p.10 Crane drawing, isometric (in plans)","img":"sheets/V12-10.jpg","W":2016,"H":1426,"pw":3000,"ph":2122,"x":1},{"id":"V12-11","t":"v12 p.11 Concept renderings: south / southeast","img":"sheets/V12-11.jpg","W":2016,"H":2608,"pw":2319,"ph":3000,"x":1},{"id":"V12-12","t":"v12 p.12 Concept renderings: northeast / northwest","img":"sheets/V12-12.jpg","W":2016,"H":2608,"pw":2319,"ph":3000,"x":1},{"id":"V12-13","t":"v12 p.13 Concept renderings: southwest / southeast","img":"sheets/V12-13.jpg","W":2016,"H":2608,"pw":2319,"ph":3000,"x":1},{"id":"RK1-1","t":"Rack 120140 4-28-25, page 1","img":"sheets/RK1-1.jpg","W":2016,"H":2608,"pw":2319,"ph":3000,"x":1},{"id":"RK1-2","t":"Rack 120140 4-28-25, page 2","img":"sheets/RK1-2.jpg","W":2016,"H":2608,"pw":2319,"ph":3000,"x":1},{"id":"RK1-3","t":"Rack 120140 4-28-25, page 3","img":"sheets/RK1-3.jpg","W":2016,"H":2608,"pw":2319,"ph":3000,"x":1},{"id":"RK2-1","t":"Rack CA000116 5-12-25, page 1","img":"sheets/RK2-1.jpg","W":2016,"H":1305,"pw":3000,"ph":1942,"x":1},{"id":"RK2-2","t":"Rack CA000116 5-12-25, page 2","img":"sheets/RK2-2.jpg","W":2016,"H":1305,"pw":3000,"ph":1942,"x":1},{"id":"RK2-3","t":"Rack CA000116 5-12-25, page 3","img":"sheets/RK2-3.jpg","W":2016,"H":1305,"pw":3000,"ph":1942,"x":1},{"id":"RK3-1","t":"Rack SD-1-1","img":"sheets/RK3-1.jpg","W":2016,"H":1344,"pw":3000,"ph":2000,"x":1},{"id":"RK4-1","t":"Rack SD-2-1","img":"sheets/RK4-1.jpg","W":2016,"H":1344,"pw":3000,"ph":2000,"x":1},{"id":"RK5-1","t":"Rack SD-3-1","img":"sheets/RK5-1.jpg","W":2016,"H":1344,"pw":3000,"ph":2000,"x":1},{"id":"RK6-1","t":"Rack SD-7","img":"sheets/RK6-1.jpg","W":2016,"H":3024,"pw":2000,"ph":3000,"x":1},{"id":"ALTA-1","t":"ALTA survey, sheet 1","img":"sheets/ALTA-1.jpg","W":2016,"H":3024,"pw":2000,"ph":3000,"x":1},{"id":"ALTA-2","t":"ALTA survey, sheet 2","img":"sheets/ALTA-2.jpg","W":2016,"H":1305,"pw":3000,"ph":1942,"x":1},{"id":"EQ-WJ","t":"Water jet MR2113 layout and utilities (Dan, 11/2)","img":"sheets/EQ-WJ.jpg","W":2016,"H":1305,"pw":3000,"ph":1942,"x":1,"lab":"Layout and utilities"},{"id":"CV9","t":"Concept v9 Rev 5.3 (Jaquet, May 2026)","img":"sheets/CV9.jpg","W":2016,"H":2850,"pw":2122,"ph":3000,"x":1,"lab":"Concept v9"}]'));
  const LAB=Object.assign({A1:'Site plan',A2:'Outdoor storage',A3:'Floor plan',A4:'Office plan',A5:'Elevations'},JSON.parse('{"CR-SCH":"Crane schematic","RM10-1":"10-ton: drawing","RM10-2":"10-ton: 3D view","RM15-1":"15-ton: drawing","RM15-2":"15-ton: 3D view","RM15S-1":"15-ton single truck: drawing","RM15S-2":"15-ton single truck: 3D view","EQ-FT-1":"Top view","EQ-FT-2":"Machine position","EQ-FT-3":"Plate detail 1","EQ-FT-4":"Plate detail 2","EQ-FT-5":"Plate detail 3","EQ-FT-6":"Plate detail 4","EQ-FT-7":"Plate detail 5","EQ-FT-8":"Plate detail 6","EQ-FT-9":"Plate detail 7","EQ-FT-10":"Plate detail 8","EQ-FD-1":"Foundation plates","EQ-FD-2":"Section A-A","EQ-RR-1":"Layout","EQ-RR-2":"Section C-C, parts","EQ-VAS":"Layout","EQ-SCH-1":"Schedule p.1","EQ-SCH-2":"Schedule p.2","V12-1":"Site plan","V12-2":"Outdoor storage","V12-3":"Floor plan and equipment","V12-4":"Office plan","V12-5":"Elevations","V12-8":"Limerick example","V12-9":"Crane drawing","V12-10":"Crane isometric","V12-11":"Renderings S / SE","V12-12":"Renderings NE / NW","V12-13":"Renderings SW / SE","RK1-1":"120140 p.1","RK2-1":"CA000116 p.1","RK1-2":"120140 p.2","RK2-2":"CA000116 p.2","RK1-3":"120140 p.3","RK2-3":"CA000116 p.3","RK3-1":"SD-1-1","RK4-1":"SD-2-1","RK5-1":"SD-3-1","RK6-1":"SD-7","ALTA-1":"Sheet 1","ALTA-2":"Sheet 2","EQ-WJ":"Layout and utilities","CV9":"Concept v9"}'));SHEETS.forEach(x=>{if(LAB[x.id])x.lab=LAB[x.id];});
  let vis=[0,1,2,3,4];
  const PDF_URL='drawings/26082-Jacquet-plans-102826.pdf', SETDATE='10/28/26';
  const $=id=>document.getElementById(id);
  const dv=$('dv'),stage=$('dvStage'),world=$('dvWorld'),svg=$('dvSvg'),img=$('dvImg'),txt=$('dvText'),msg=$('dvMsg');
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let sheet=0,tool='pen',color='#E11D2E',size=1,tx=0,ty=0,k=1,fitK=1;
  const rot=SHEETS.map(()=>0);          // view rotation per sheet, degrees clockwise
  const work=SHEETS.map(()=>[]);          // unsaved marks per sheet
  let saved=[];                           // saved sessions from the database
  const hidden=new Set();                 // hidden saved-session ids
  let names={},db=null,user=null,me=null,dl=null;
  const WID=[3,6,12],TXT_BASE=14,LH=1.15; /* 14 image px = 18 pt = 1/4 in on a 36 x 24 in sheet */
  let tsize=1;
  const _cx=document.createElement('canvas').getContext('2d');
  const tw=(s,px)=>{_cx.font=px+'px Arial, Helvetica, sans-serif';return _cx.measureText(s).width;};

  /* ---------- geometry / rendering ---------- */
  const px=p=>[p[0]*W,p[1]*H];
  function arrowHead(a,b,w){const L=Math.max(16,w*4.5),ang=Math.atan2(b[1]-a[1],b[0]-a[0]);return [[b[0],b[1]],[b[0]-L*Math.cos(ang-.45),b[1]-L*Math.sin(ang-.45)],[b[0]-L*Math.cos(ang+.45),b[1]-L*Math.sin(ang+.45)]];}
  function markSvg(m,i){
    const c=m.c,w=m.w,d=i===undefined?'':` data-i="${i}"`;
    const st=`fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
    const P=m.p.map(px);
    if(m.t==='pen'||m.t==='hl'){const dd='M'+P.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L');return `<path${d} d="${dd}" ${st}${m.t==='hl'?' stroke-opacity=".35"':''}/>`;}
    if(m.t==='line')return `<line${d} x1="${P[0][0]}" y1="${P[0][1]}" x2="${P[1][0]}" y2="${P[1][1]}" ${st}/>`;
    if(m.t==='arrow'){const h=arrowHead(P[0],P[1],w);return `<g${d}><line x1="${P[0][0]}" y1="${P[0][1]}" x2="${P[1][0]}" y2="${P[1][1]}" ${st}/><polygon points="${h.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')}" fill="${c}"/></g>`;}
    if(m.t==='rect'){const x=Math.min(P[0][0],P[1][0]),y=Math.min(P[0][1],P[1][1]);return `<rect${d} x="${x}" y="${y}" width="${Math.abs(P[1][0]-P[0][0])}" height="${Math.abs(P[1][1]-P[0][1])}" ${st}/>`;}
    if(m.t==='ell'){return `<ellipse${d} cx="${(P[0][0]+P[1][0])/2}" cy="${(P[0][1]+P[1][1])/2}" rx="${Math.abs(P[1][0]-P[0][0])/2}" ry="${Math.abs(P[1][1]-P[0][1])/2}" ${st}/>`;}
    if(m.t==='text'){const ls=String(m.s).split('\n'),pd=m.w*.18,bw=Math.max(...ls.map(l=>tw(l,m.w))),x=P[0][0],y=P[0][1];
      return `<g${d}><rect x="${x-pd}" y="${y-m.w*.9-pd}" width="${bw+2*pd}" height="${ls.length*m.w*LH+2*pd-m.w*.15}" fill="#fff" fill-opacity=".78" rx="${pd}"/><text x="${x}" y="${y}" font-size="${m.w}" font-family="Arial, Helvetica, sans-serif" fill="${c}">${ls.map((l,j)=>`<tspan x="${x}" dy="${j?m.w*LH:0}">${esc(l)}</tspan>`).join('')}</text></g>`;}
    return '';
  }
  function bbox(m){const P=m.p.map(px);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;P.forEach(q=>{x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);});
    if(m.t==='text'){const ls=String(m.s).split('\n');x1=x0+Math.max(...ls.map(l=>l.length))*m.w*.6;y0-=m.w;y1+=(ls.length-1)*m.w*LH;} const pad=Math.max(6,m.w);return [x0-pad,y0-pad,x1+pad,y1+pad];}
  function parseMarks(s){try{return JSON.parse(s)||[]}catch(e){return[]}}
  let draft=null,sel=-1;
  const editing=SHEETS.map(()=>null),hist=SHEETS.map(()=>[]);
  const snap=()=>{hist[sheet].push(JSON.stringify(work[sheet]));if(hist[sheet].length>60)hist[sheet].shift();};
  function segD(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;let t=l?((x-a[0])*dx+(y-a[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
  function mdist(m,x,y){const P=m.p.map(px);
    if(m.t==='pen'||m.t==='hl'){let d=1e9;for(let i=1;i<P.length;i++)d=Math.min(d,segD(x,y,P[i-1],P[i]));return P.length===1?Math.hypot(x-P[0][0],y-P[0][1]):d;}
    if(m.t==='line'||m.t==='arrow')return segD(x,y,P[0],P[1]);
    if(m.t==='rect'){const x0=Math.min(P[0][0],P[1][0]),x1=Math.max(P[0][0],P[1][0]),y0=Math.min(P[0][1],P[1][1]),y1=Math.max(P[0][1],P[1][1]);
      return Math.min(segD(x,y,[x0,y0],[x1,y0]),segD(x,y,[x1,y0],[x1,y1]),segD(x,y,[x1,y1],[x0,y1]),segD(x,y,[x0,y1],[x0,y0]));}
    if(m.t==='ell'){const cx=(P[0][0]+P[1][0])/2,cy=(P[0][1]+P[1][1])/2,rx=Math.max(1,Math.abs(P[1][0]-P[0][0])/2),ry=Math.max(1,Math.abs(P[1][1]-P[0][1])/2);
      return Math.abs(Math.hypot((x-cx)/rx,(y-cy)/ry)-1)*Math.min(rx,ry);}
    if(m.t==='text'){const ls=String(m.s).split('\n'),bw=Math.max(...ls.map(l=>tw(l,m.w))),x0=P[0][0],y0=P[0][1]-m.w*.9,x1=x0+bw,y1=P[0][1]+(ls.length-1)*m.w*LH+m.w*.25;
      const dx=Math.max(x0-x,0,x-x1),dy=Math.max(y0-y,0,y-y1);return Math.hypot(dx,dy);}
    return 1e9;}
  const wid=m=>(m.t==='text'?0:m.w/2);
  function hit(p){const x=p[0]*W,y=p[1]*H,tol=8/k;let best=null,bd=1e9;
    work[sheet].forEach((m,i)=>{const d=mdist(m,x,y)-wid(m);if(d<=tol&&d<bd){bd=d;best={src:'w',i};}});
    if(best)return best;
    saved.filter(r=>r.sheet===SHEETS[sheet].id&&!hidden.has(r._id)).forEach(r=>{parseMarks(r.marks).forEach((m,i)=>{const d=mdist(m,x,y)-wid(m);if(d<=tol&&d<bd){bd=d;best={src:'s',sid:r._id,i};}});});
    return best;}
  function pull(h){ // make a hit on a saved layer editable; returns index in work
    if(h.src==='w')return h.i;
    const r=saved.find(x=>x._id===h.sid);if(!r)return -1;
    if(work[sheet].length||editing[sheet]){say('Save or clear the current marks first, then you can edit another layer.');return -1;}
    snap();work[sheet]=parseMarks(r.marks);hidden.add(r._id);editing[sheet]=r._id;layers();return h.i;}
  function selSvg(){if(sel<0||!work[sheet][sel])return '';const m=work[sheet][sel],b=bbox(m);
    let h=`<rect x="${b[0]}" y="${b[1]}" width="${b[2]-b[0]}" height="${b[3]-b[1]}" fill="none" stroke="#1D4ED8" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    if(m.t==='line'||m.t==='arrow'||m.t==='rect'||m.t==='ell')m.p.map(px).forEach(q=>{h+=`<circle cx="${q[0]}" cy="${q[1]}" r="${6/k}" fill="#fff" stroke="#1D4ED8" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;});
    return h;}
  function draw(){
    let h='';
    saved.filter(s=>s.sheet===SHEETS[sheet].id&&!hidden.has(s._id)).forEach(s=>{h+=`<g data-sid="${esc(s._id)}">`+parseMarks(s.marks).map(m=>markSvg(m)).join('')+'</g>';});
    h+='<g id="dvWork">'+work[sheet].map((m,i)=>markSvg(m,i)).join('')+'</g>';
    if(draft)h+='<g>'+markSvg(draft)+'</g>';
    h+=selSvg();
    svg.innerHTML=h;
  }
  const rc=()=>{const a=rot[sheet]*Math.PI/180;return [Math.round(Math.cos(a)),Math.round(Math.sin(a))];};
  function applyT(){world.style.transform=`translate(${tx}px,${ty}px) rotate(${rot[sheet]}deg) scale(${k})`;}
  function fit(){const w=stage.clientWidth,h=stage.clientHeight;if(!w)return;const [c,s]=rc();
    const xs=[0,W,0,W].map((x,i)=>{const y=i<2?0:H;return k*0+(x*c-y*s);}),ys=[0,W,0,W].map((x,i)=>{const y=i<2?0:H;return x*s+y*c;});
    const mnx=Math.min(...xs),mxx=Math.max(...xs),mny=Math.min(...ys),mxy=Math.max(...ys),bw=mxx-mnx,bh=mxy-mny;
    fitK=Math.min(w/bw,h/bh)*.98;k=fitK;tx=(w-k*bw)/2-k*mnx;ty=(h-k*bh)/2-k*mny;applyT();}
  function rotate(d){rot[sheet]=(rot[sheet]+d+360)%360;txt.hidden=true;fit();}

  /* ---------- sheets, tools, layers ---------- */
  function setSheet(i){sel=-1;txt.hidden=true;draft=null;sheet=i;const S=SHEETS[i];W=S.W||2016;H=S.H||1344;world.style.width=W+'px';world.style.height=H+'px';svg.setAttribute('viewBox','0 0 '+W+' '+H);img.src=S.img;$('dvSheets').querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(+b.dataset.i===i)));draw();layers();}
  function renderTabs(){$('dvSheets').innerHTML=vis.map(i=>{const S=SHEETS[i];return `<button type="button" data-i="${i}" title="${esc(S.t)}">${esc(S.lab||S.id)}</button>`;}).join('');}
  renderTabs();
  $('dvSheets').addEventListener('click',e=>{const b=e.target.closest('button');if(b){setSheet(+b.dataset.i);fit();}});
  function setTool(t){tool=t;txt.hidden=true;$('dvTools').querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===t)));stage.classList.toggle('pan',t==='pan');}
  function setColor(c){color=c;if(sel>=0&&work[sheet][sel]&&c!==work[sheet][sel].c){snap();work[sheet][sel].c=c;draw();}$('dvColors').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===c)));}
  $('dvTools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)setTool(b.dataset.tool);const c=e.target.closest('[data-c]');if(c)setColor(c.dataset.c);});
  $('dvSize').addEventListener('change',e=>{size=+e.target.value;const m=work[sheet][sel];if(m&&m.t!=='text'&&m.t!=='text'){snap();m.w=m.t==='hl'?WID[size]*5:WID[size];draw();}});
  $('dvTextSize').addEventListener('change',e=>{tsize=+e.target.value;const m=work[sheet][sel];if(m&&m.t==='text'){snap();m.w=TXT_BASE*tsize;draw();}});
  $('dvRotL').addEventListener('click',()=>rotate(-90));$('dvRotR').addEventListener('click',()=>rotate(90));
  $('dvUndo').addEventListener('click',undo);$('dvFit').addEventListener('click',fit);
  function undo(){if(hist[sheet].length){work[sheet]=JSON.parse(hist[sheet].pop());sel=-1;draw();layers();}}
  const dateStr=ms=>{const d=new Date(ms);return (d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2);};
  function layers(){
    const cur=work[sheet].length;
    let h=`<li class="cur"><span>●</span><span>Current (not saved)<small>${cur} mark${cur===1?'':'s'}</small></span><button type="button" data-act="clear">Clear</button></li>`;
    saved.filter(s=>s.sheet===SHEETS[sheet].id).sort((a,b)=>b.at-a.at).forEach(s=>{
      h+=`<li><input type="checkbox" data-sid="${esc(s._id)}" ${hidden.has(s._id)?'':'checked'} aria-label="Show ${esc(s.name)}"><span>${esc(s.name)}<small>${esc((names[s.by]&&names[s.by].name)||'Someone')} · ${dateStr(s.at)}</small></span><span><button type="button" data-act="edit" data-sid="${esc(s._id)}" title="Copy these marks into the current layer">Edit</button> <button type="button" data-act="del" data-sid="${esc(s._id)}" title="Delete this layer">✕</button></span></li>`;});
    $('dvLayers').innerHTML=h;
  }
  $('dvLayers').addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;const s=saved.find(x=>x._id===b.dataset.sid);
    if(b.dataset.act==='clear'){snap();if(editing[sheet])hidden.delete(editing[sheet]);editing[sheet]=null;work[sheet]=[];sel=-1;draw();layers();}
    if(b.dataset.act==='edit'&&s){if(work[sheet].length||editing[sheet]){say('Save or clear the current marks first.');return;}snap();work[sheet]=parseMarks(s.marks);editing[sheet]=s._id;hidden.add(s._id);draw();layers();}
    if(b.dataset.act==='del'&&s){if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Sure?';return;}try{await db.collection('markups').doc(s._id).delete();}catch(err){say('That layer could not be deleted. You may have view-only access.');}}
  });
  $('dvLayers').addEventListener('change',e=>{const c=e.target.closest('input[data-sid]');if(!c)return;c.checked?hidden.delete(c.dataset.sid):hidden.add(c.dataset.sid);draw();});
  function say(m){msg.textContent=m;}

  /* ---------- pointer: draw, pan, zoom ---------- */
  const toN=e=>{const r=stage.getBoundingClientRect(),[c,s]=rc(),vx=(e.clientX-r.left-tx)/k,vy=(e.clientY-r.top-ty)/k,lx=vx*c+vy*s,ly=-vx*s+vy*c;return [Math.max(0,Math.min(1,lx/W)),Math.max(0,Math.min(1,ly/H))];};
  let drag=null;
  stage.addEventListener('contextmenu',e=>e.preventDefault());
  stage.addEventListener('pointerdown',e=>{
    if(e.target===txt)return;
    stage.setPointerCapture(e.pointerId);
    if(e.button===2||e.button===1||tool==='pan'){drag={mode:'pan',x:e.clientX,y:e.clientY};stage.classList.add('panning');return;}
    if(e.button!==0)return;
    const p=toN(e),w=WID[size];
    if(tool!=='erase'&&!e.shiftKey){
      if(sel>=0&&work[sheet][sel]){const m=work[sheet][sel];const hi=(m.t==='line'||m.t==='arrow'||m.t==='rect'||m.t==='ell')?m.p.findIndex(q=>Math.hypot((q[0]-p[0])*W,(q[1]-p[1])*H)<=11/k):-1;
        if(hi>=0){snap();drag={mode:'handle',h:hi};return;}}
      const h=hit(p);
      if(h){const i=pull(h);if(i>=0){sel=i;snap();drag={mode:'move',last:p,moved:false};draw();return;}return;}
      if(sel>=0){sel=-1;draw();}
    }
    if(tool==='text'){openText(e,p);return;}
    if(tool==='erase'){snap();eraseAt(p);drag={mode:'erase'};return;}
    const t=tool==='hl'?'hl':tool;
    draft={t,c:color,w:t==='hl'?w*5:w,p:(t==='pen'||t==='hl')?[p]:[p,p]};drag={mode:'draw'};draw();
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag){if(e.buttons===0&&tool!=='erase'&&tool!=='pan'&&!e.shiftKey){stage.style.cursor=hit(toN(e))?'move':'';}return;}
    if(drag.mode==='move'||drag.mode==='handle'){const q=toN(e),m=work[sheet][sel];if(!m)return;
      if(drag.mode==='move'){const dx=q[0]-drag.last[0],dy=q[1]-drag.last[1];m.p=m.p.map(a=>[a[0]+dx,a[1]+dy]);drag.last=q;}
      else m.p[drag.h]=q;
      draw();return;}
    if(drag.mode==='pan'){tx+=e.clientX-drag.x;ty+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;applyT();return;}
    const p=toN(e);
    if(drag.mode==='erase'){eraseAt(p);return;}
    if(!draft)return;
    if(draft.t==='pen'||draft.t==='hl'){const a=px(draft.p[draft.p.length-1]),b=px(p);if(Math.hypot(a[0]-b[0],a[1]-b[1])>1.5)draft.p.push(p);}
    else draft.p[1]=p;
    draw();
  });
  const end=()=>{if(!drag)return;stage.classList.remove('panning');
    if(drag.mode==='move'||drag.mode==='handle'){const m=work[sheet][sel];if(m)m.p=m.p.map(a=>[+a[0].toFixed(4),+a[1].toFixed(4)]);drag=null;draw();layers();return;}
    if(drag.mode==='draw'&&draft){const ok=(draft.t==='pen'||draft.t==='hl')?draft.p.length>1:(()=>{const a=px(draft.p[0]),b=px(draft.p[1]);return Math.hypot(a[0]-b[0],a[1]-b[1])>4;})();
      if(ok){snap();draft.p=draft.p.map(q=>[+q[0].toFixed(4),+q[1].toFixed(4)]);work[sheet].push(draft);}draft=null;draw();layers();}
    drag=null;};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    const k2=Math.max(fitK*.4,Math.min(24,k*Math.exp(-e.deltaY*.0016)));tx=mx-(mx-tx)*(k2/k);ty=my-(my-ty)*(k2/k);k=k2;applyT();},{passive:false});
  function eraseAt(p){const x=p[0]*W,y=p[1]*H,tol=10/k;let best=-1,ba=1e18;
    work[sheet].forEach((m,i)=>{const b=bbox(m);if(x>=b[0]-tol&&x<=b[2]+tol&&y>=b[1]-tol&&y<=b[3]+tol){const a=(b[2]-b[0])*(b[3]-b[1]);if(a<ba){ba=a;best=i;}}});
    if(best>=0){work[sheet].splice(best,1);sel=-1;draw();layers();}}
  function openText(e,p){const r=stage.getBoundingClientRect(),fs=Math.max(11,TXT_BASE*tsize*k);
    txt.style.fontSize=fs+'px';txt.style.left=(e.clientX-r.left)+'px';txt.style.top=(e.clientY-r.top-fs)+'px';txt.style.color=color;txt.value=(e.edit!==undefined?e.edit:'');txt.rows=Math.max(1,txt.value.split('\n').length);txt.hidden=false;txt.dataset.ed=(e.idx!==undefined?e.idx:'');txt.dataset.nx=p[0];txt.dataset.ny=p[1];setTimeout(()=>txt.focus(),0);}
  function commitText(){if(txt.hidden)return;const v=txt.value.replace(/\s+$/,'');txt.hidden=true;const ed=txt.dataset.ed;txt.dataset.ed='';
    if(ed!==''&&ed!==undefined){const m=work[sheet][+ed];if(m){snap();if(v.trim())m.s=v;else{work[sheet].splice(+ed,1);sel=-1;}draw();layers();}return;}
    if(!v.trim())return;snap();
    work[sheet].push({t:'text',c:color,w:TXT_BASE*tsize,s:v,p:[[+(+txt.dataset.nx).toFixed(4),+(+txt.dataset.ny).toFixed(4)]]});draw();layers();}
  stage.addEventListener('dblclick',e=>{if(e.target===txt)return;const p=toN(e),h=hit(p);if(!h)return;const i=pull(h);if(i<0)return;sel=i;const m=work[sheet][i];draw();
    if(m.t==='text'){const ev={clientX:e.clientX,clientY:e.clientY,edit:m.s,idx:i};color=m.c;const r=stage.getBoundingClientRect(),fs=Math.max(11,m.w*k);
      openText(ev,m.p[0]);txt.style.fontSize=fs+'px';txt.style.color=m.c;}});
  document.addEventListener('keydown',e=>{if(dv.hidden||!txt.hidden||sel<0||!work[sheet][sel]||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;const m=work[sheet][sel];
    if(e.key==='Escape'){sel=-1;draw();e.stopPropagation();return;}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();snap();work[sheet].splice(sel,1);sel=-1;draw();layers();return;}
    const st=e.shiftKey?10:1,d={ArrowLeft:[-st/W,0],ArrowRight:[st/W,0],ArrowUp:[0,-st/H],ArrowDown:[0,st/H]}[e.key];
    if(d){e.preventDefault();const [c,s2]=rc();const dx=d[0]*W*c+d[1]*H*s2,dy=-d[0]*W*s2+d[1]*H*c;snap();m.p=m.p.map(a=>[a[0]+dx/W,a[1]+dy/H]);draw();}});
  txt.addEventListener('input',()=>{txt.rows=Math.max(1,txt.value.split('\n').length);});
  txt.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commitText();}if(e.key==='Escape'){txt.dataset.ed='';txt.hidden=true;}});
  txt.addEventListener('blur',commitText);

  /* ---------- open / close (full screen) ---------- */
  function open(i){dv.hidden=false;document.body.style.overflow='hidden';setTool(tool);setColor(color);setSheet(i);
    try{const el=document.documentElement;if(!document.fullscreenElement&&el.requestFullscreen)el.requestFullscreen().catch(()=>{});}catch(e){}
    requestAnimationFrame(()=>{fit();});}
  let backFn=null;
  function doClose(discard){const cb=backFn;backFn=null;if(discard){for(let i=0;i<work.length;i++){work[i]=[];hist[i]=[];}sel=-1;draft=null;txt.hidden=true;}
    const c=$('dvConfirm');if(c)c.remove();dv.hidden=true;document.body.style.overflow='';try{if(document.fullscreenElement)document.exitFullscreen();}catch(e){}
    if(cb){cb();return;}
    const sel2=document.querySelector('#dwTabs .dw-tab[data-i="'+sheet+'"]');if(sel2)sel2.click();}
  function close(){
    if($('dvConfirm'))return;
    if(work.some(w=>w.length)){
      const c=document.createElement('div');c.id='dvConfirm';c.style.cssText='position:absolute;inset:0;z-index:50;background:rgba(22,33,44,.55);display:grid;place-items:center';
      c.innerHTML='<div style="background:#fff;color:#16212C;border-radius:8px;padding:22px 24px;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,.35)"><h3 style="margin:0 0 8px;font-size:18px">Close without saving?</h3><p style="margin:0 0 16px;color:#5A6B7B;font-size:14px">You have markups that are not saved. Save them as a layer first to keep them.</p><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn" id="dvKeep">Keep working</button><button type="button" class="btn go" id="dvDrop" style="background:#B42318;border-color:#B42318">Close without saving</button></div></div>';
      dv.appendChild(c);
      c.querySelector('#dvKeep').addEventListener('click',()=>c.remove());
      c.querySelector('#dvDrop').addEventListener('click',()=>doClose(true));
      return;}
    doClose(false);}
  window.jqOpenSheets=function(ids,start,back){backFn=back||null;$('dvClose').textContent=back?'← Back to files':'Close ✕';vis=ids.map(id=>SHEETS.findIndex(x=>x.id===id)).filter(i=>i>=0);if(!vis.length)return;renderTabs();const st=Math.max(0,vis.findIndex(i=>SHEETS[i].id===start));open(vis[st]);};
  $('dvClose').addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(dv.hidden)return;if(e.key==='Escape'&&txt.hidden&&!document.fullscreenElement)close();
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}});
  addEventListener('resize',()=>{if(!dv.hidden)fit();});
  document.addEventListener('fullscreenchange',()=>{if(!dv.hidden)setTimeout(fit,60);});
  img.addEventListener('load',()=>{if(!dv.hidden)draw();});
  // open from the Home page drawing
  const dwView=$('dwView');dwView.classList.remove('vimg');
  dwView.addEventListener('click',()=>{backFn=null;$('dvClose').textContent='Close ✕';vis=[0,1,2,3,4];renderTabs();let n=0;const s=document.querySelector('#dwTabs .dw-tab[aria-selected="true"]');if(s)n=+s.dataset.i;open(n);});

  /* ---------- shared database: saved markup layers ---------- */
  (async()=>{
    try{db=window.claude?await window.claude.use('db'):null;user=window.claude?await window.claude.use('user'):null;dl=window.claude?await window.claude.use('downloads'):null;}catch(e){}
    try{me=user&&user.id?await user.id():null;}catch(e){}
    if(!db){say('Sign in to claude.ai to save markup layers. You can still draw and download a PDF.');$('dvSave').disabled=true;return;}
    db.collection('markups').onSnapshot(async s=>{
      const list=Array.from((s&&(s.docs||s))||[]).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id||v.id};});
      saved=list;
      try{const ids=[...new Set(list.map(r=>r.by).filter(Boolean))];if(ids.length&&user&&user.profiles)names=await user.profiles(ids);}catch(e){}
      draw();layers();
    },()=>{});
  })();
  $('dvSave').addEventListener('click',async()=>{
    const marks=work[sheet];if(!marks.length){say('Draw something first, then save it as a layer.');return;}
    if(!db){return;}
    const nm=$('dvName').value.trim()||(SHEETS[sheet].id+' markup '+dateStr(Date.now()));
    const ed=editing[sheet]?saved.find(x=>x._id===editing[sheet]):null;
    const id=ed?ed._id:SHEETS[sheet].id+'-'+Date.now();
    try{await db.collection('markups').doc(id).set({sheet:SHEETS[sheet].id,name:$('dvName').value.trim()||(ed?ed.name:nm),by:ed?(ed.by||me||''):(me||''),at:Date.now(),marks:JSON.stringify(marks)});
      if(ed)hidden.delete(ed._id);editing[sheet]=null;sel=-1;hist[sheet]=[];work[sheet]=[];$('dvName').value='';say('Saved "'+nm+'". Everyone with the page can see it.');
      if(window.jqFeed)window.jqFeed('Markup added on '+SHEETS[sheet].id+': '+nm);
    }catch(err){say('That did not save. The markup may be too large, or you may have view-only access.');}
  });

  /* ---------- PDF: original sheet + checked layers (vector) ---------- */
  $('dvPdf').addEventListener('click',async()=>{
    if(!window.PDFLib){say('The PDF tool did not load. Check your connection and try again.');return;}
    say('Building PDF…');
    try{
      const {PDFDocument,rgb,StandardFonts,LineCapStyle}=window.PDFLib;
      const S0=SHEETS[sheet],out=await PDFDocument.create();let pg;
      if(S0.x){const jb=await (await fetch(S0.img)).arrayBuffer();const ji=await out.embedJpg(jb);pg=out.addPage([S0.pw,S0.ph]);pg.drawImage(ji,{x:0,y:0,width:S0.pw,height:S0.ph});PW=S0.pw;PH=S0.ph;K=PW/W;}
      else{const srcBytes=await (await fetch(PDF_URL)).arrayBuffer();const src=await PDFDocument.load(srcBytes);[pg]=await out.copyPages(src,[sheet]);out.addPage(pg);PW=2592;PH=1728;K=PW/W;}
      const font=await out.embedFont(StandardFonts.Helvetica);
      const hex=c=>{const n=parseInt(c.slice(1),16);return rgb(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);};
      const pt=p=>[p[0]*PW,p[1]*PH];
      const layersToDraw=saved.filter(s=>s.sheet===SHEETS[sheet].id&&!hidden.has(s._id)).sort((a,b)=>a.at-b.at).map(s=>parseMarks(s.marks)).concat([work[sheet]]);
      let count=0;
      layersToDraw.forEach(ms=>ms.forEach(m=>{count++;
        const col=hex(m.c),w=m.w*K,P=m.p.map(pt);
        const path=a=>'M'+a.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L');
        if(m.t==='pen'||m.t==='hl')pg.drawSvgPath(path(P),{x:0,y:PH,borderColor:col,borderWidth:w,borderLineCap:LineCapStyle.Round,borderOpacity:m.t==='hl'?.35:1});
        else if(m.t==='line'||m.t==='arrow'){pg.drawSvgPath(path(P),{x:0,y:PH,borderColor:col,borderWidth:w,borderLineCap:LineCapStyle.Round});
          if(m.t==='arrow'){const h=arrowHead(P[0],P[1],w/K*K);pg.drawSvgPath(path(h)+' Z',{x:0,y:PH,color:col,borderWidth:0});}}
        else if(m.t==='rect'){const x=Math.min(P[0][0],P[1][0]),y=Math.min(P[0][1],P[1][1]);pg.drawRectangle({x,y:PH-y-Math.abs(P[1][1]-P[0][1]),width:Math.abs(P[1][0]-P[0][0]),height:Math.abs(P[1][1]-P[0][1]),borderColor:col,borderWidth:w});}
        else if(m.t==='ell'){pg.drawEllipse({x:(P[0][0]+P[1][0])/2,y:PH-(P[0][1]+P[1][1])/2,xScale:Math.abs(P[1][0]-P[0][0])/2,yScale:Math.abs(P[1][1]-P[0][1])/2,borderColor:col,borderWidth:w});}
        else if(m.t==='text'){const ls=String(m.s).split('\n').map(l=>l.replace(/[^\x20-\x7E]/g,'?')),sz=m.w*K,pd=sz*.18,bw=Math.max(...ls.map(l=>font.widthOfTextAtSize(l,sz)));
          pg.drawRectangle({x:P[0][0]-pd,y:PH-P[0][1]-(ls.length-1)*sz*LH-sz*.25-pd,width:bw+2*pd,height:ls.length*sz*LH+2*pd-sz*.15,color:rgb(1,1,1),opacity:.78,borderWidth:0});
          ls.forEach((l,j)=>pg.drawText(l,{x:P[0][0],y:PH-P[0][1]-j*sz*LH,size:sz,font,color:col}));}
      }));
      const who=(names[me]&&names[me].name)||'';
      pg.drawText(`${S0.id} ${S0.t} · ${S0.x?'':'PIDA '+SETDATE+' · '}markups from jaquet project site · ${dateStr(Date.now())}${who?' · '+who:''}`,{x:24*(S0.x?K:1),y:10*(S0.x?K:1),size:11*(S0.x?K:1),font,color:rgb(.35,.4,.45)});
      if(rot[sheet])pg.setRotation(window.PDFLib.degrees(rot[sheet]));
      const bytes=await out.save();
      const blob=new Blob([bytes],{type:'application/pdf'});
      const fn=`Jaquet_${SHEETS[sheet].id}_${SHEETS[sheet].t.replace(/[^A-Za-z0-9]+/g,'_')}_markup.pdf`;
      if(!dl){say('Downloads are not available in this view.');return;}
      try{await dl.save({filename:fn,data:blob});say(count?'PDF ready with '+count+' mark'+(count===1?'':'s')+'.':'PDF ready (no markups on this sheet).');}
      catch(e){try{await dl.save({filename:fn,data:bytes});say('PDF ready.');}catch(e2){say('The download was not saved.');}}
    }catch(err){say('The PDF could not be built: '+(err&&err.message?err.message:'unknown error'));}
  });
})();

(function docsDb(){
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  (async()=>{let db=null;try{db=window.claude?await window.claude.use('db'):null;}catch(e){}if(!db)return;
    const rows=s=>Array.from((s&&(s.docs||s))||[]).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id};});
    db.collection('doclog').onSnapshot(s=>{const r=rows(s);if(!r.length)return;r.sort((a,b)=>(b.at||0)-(a.at||0));
      document.getElementById('doclogbody').innerHTML=r.map(x=>'<tr><td class="v">'+esc(x.date)+'</td><td>'+esc(x.doc)+'</td><td>'+esc(x.change)+'</td><td>'+esc(x.from)+'</td></tr>').join('');},()=>{});
  })();
})();

(function validations(){
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);let db=null,list=[],cur=0;
  const today=()=>new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  const cut=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1)+'…':t;};
  const MAIL='<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>';
  const CLIP='<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8 12h8M8 16h5"/></svg>';
  function pv(v){const rows=window.jqIssues||[],open=r=>r.status!=='Done';
    const dep=rows.filter(r=>open(r)&&(r.blockedBy||[]).includes(v.ref));
    const parts=dep.map(r=>{const other=(r.blockedBy||[]).filter(b=>b!==v.ref&&rows.some(x=>x.ref===b&&open(x)));
      return other.length?`<b>${esc(r.ref)}</b> ${esc(cut(r.title,90))} still waits on ${esc(other.join(', '))}.`:`<b>${esc(r.ref)}</b> is unblocked${r.owner?' for '+esc(r.owner):''}: ${esc(cut(r.title,110))}`;});
    if(v.nextTitle&&!v.nextDone)parts.push('A follow-up is offered: '+esc(cut(v.nextTitle,140))+(v.nextOwner?' ('+esc(v.nextOwner)+')':''));
    return (v.ref?`If you close it, ${esc(v.ref)} closes. `:'')+(parts.length?parts.map(x=>'<div>'+x+'</div>').join(''):(v.ref?'Nothing else is waiting on it.':''));}
  function proposalHtml(v){const p=v.proposal;
    if(!p||!p.summary)return `<div class="vnext"><b>What I think happens next</b><div>${pv(v)}</div></div>`;
    return `<div class="vnext"><b>What I think happens next${v.rev?' (revised '+v.rev+(v.rev===1?' time':' times')+')':''}</b><div>${esc(p.summary)}</div>${(p.items||[]).map(it=>`<div>New item: ${esc(it.title)} · ${esc(it.owner||'Unassigned')} · ${esc(it.area||'')}${(it.blockedBy||[]).length?' · waits on '+esc(it.blockedBy.join(', ')):''}</div>`).join('')}${(p.itemUpdates||[]).map(u=>`<div>Update ${esc(u.ref)}: ${[u.status?'status → '+u.status:'',u.title?'title → '+u.title:'',u.owner?'owner → '+u.owner:'',u.ball?'ball → '+u.ball:'',u.now?'now: '+u.now:'',u.next?cut(u.next,160):''].filter(Boolean).map(esc).join(' · ')}</div>`).join('')}${v.lastComment?`<div class="vlc">Your last comment: ${esc(v.lastComment)}</div>`:''}</div>`;}
  const refsOf=v=>{const a=(v.refs||[]).slice();if(v.ref)a.push({label:'Tracker item '+v.ref,kind:'item'});return a;};
  function thumbs(v){const r=refsOf(v);if(!r.length)return '';
    return `<div class="vsrc"><span class="eyebrow">Where this came from · click to open</span><div class="vthumbs">${r.map((x,i)=>{
      const img=x.kind==='sheet'&&x.ids&&x.ids[0]?`<div class="vt-i" style="background-image:url('${(/^A\d$/.test(x.ids[0])?'drawings/':'sheets/')+esc(x.ids[0])}.jpg')"></div>`:`<div class="vt-i">${x.kind==='item'?CLIP:MAIL}</div>`;
      return `<button type="button" class="vt" data-a="show" data-r="${i}">${img}<div class="vt-b">${esc(x.label)}</div></button>`;}).join('')}</div></div>`;}
  function showRef(v,r){
    const back=()=>{$('vRef').hidden=true;$('vModal').hidden=false;};
    if(r.kind==='sheet'&&window.jqOpenSheets){$('vModal').hidden=true;window.jqOpenSheets(r.ids,r.ids[0],()=>{$('vModal').hidden=false;});return;}
    let title=r.title||r.label,body=r.body||'';
    if(r.kind==='item'){const is=(window.jqIssues||[]).find(x=>x.ref===v.ref);if(!is)return;title=is.ref+' '+is.title;body='Owner: '+(is.owner||'Unassigned')+'\nArea: '+(is.area||'')+'\nStatus: '+is.status+((is.blockedBy||[]).length?'\nWaits on: '+is.blockedBy.join(', '):'')+'\n\n'+(is.next||'No note yet.');}
    $('vRefT').textContent=title;$('vRefB').textContent=body;$('vModal').hidden=true;$('vRef').hidden=false;
    $('vRefX').onclick=back;$('vRef').onclick=e=>{if(e.target===$('vRef'))back();};}
  function openCp(v,text){const is=(window.jqIssues||[]).find(r=>r.ref===v.ref)||{};const B=$('cpB');
    const bot=t=>`<div class="cp-m bot">${esc(t)}</div>`,me=t=>`<div class="cp-m me">${esc(t)}</div>`;
    const ctx=v.ref?(v.ref+(is.title?' '+cut(is.title,60):'')):cut(v.doc,60);
    const stub=(q,a)=>{B.insertAdjacentHTML('beforeend',me(q)+bot(a));B.scrollTop=B.scrollHeight;};
    B.innerHTML=bot('Hi Jason. What would you like to do for '+ctx+'?')+`<div class="cp-opts"><button type="button" class="cp-o" data-o="mail"><b>Draft an email</b><span>Follow up with ${esc(is.owner||'the owner')} about this request</span></button><button type="button" class="cp-o" data-o="file"><b>Find a file</b><span>Search the shared folder and your OneDrive</span></button></div>`;
    B.onclick=e=>{const o=e.target.closest('[data-o]');if(!o)return;
      if(o.dataset.o==='mail')stub('Draft a follow-up email','Placeholder only. Once Copilot is connected it will draft the email here from this request and the sources above, and you can edit it before sending.');
      else stub('Find a file','Placeholder only. Once Copilot is connected it will search the Jaquet shared folder and your OneDrive and show matches here.');};
    $('cpSend').onclick=()=>{const t=$('cpIn').value.trim();if(!t)return;$('cpIn').value='';stub(t,'Placeholder only. Copilot is not connected yet.');};
    $('cpIn').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('cpSend').click();}};
    $('cpIn').value='';$('vModal').hidden=true;$('cpModal').hidden=false;
    const back=()=>{$('cpModal').hidden=true;$('vModal').hidden=false;};$('cpX').onclick=back;$('cpModal').onclick=e=>{if(e.target===$('cpModal'))back();};
    if(text){stub(text,'Placeholder only. Copilot is not connected yet. Try the two options above.');}}
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('#vList [data-f=cp]')){e.preventDefault();const card=e.target.closest('.vq'),v=list.find(x=>x._id===card.dataset.id),t=e.target.value.trim();if(v)openCp(v,t);}});
  function paint(){const n=list.length;$('vCount').textContent=n;$('vBtn').closest('.vbox').classList.toggle('has',n>0);$('vNote').textContent=n?(n+' item'+(n===1?'':'s')+' to confirm from new documents.'):'Nothing waiting.';
    if(cur>=n)cur=Math.max(0,n-1);
    const old=document.querySelector('#vList .vq [data-f=c]'),oid=old&&old.closest('.vq').dataset.id,oval=old?old.value:'',hadFocus=!!old&&document.activeElement===old,ss=old?old.selectionStart:0,se=old?old.selectionEnd:0;
    if(!n){$('vList').innerHTML='<p class="note">Nothing waiting.</p>';return;}
    const v=list[cur],is=(window.jqIssues||[]).find(r=>r.ref===v.ref);
    const hdr=v.ref?`<span class="eyebrow">${esc(v.ref)} · ${esc(is?is.owner:'')}</span><h3>${esc(is?is.title:'')}</h3>`:`<span class="eyebrow">New follow-up from ${esc(v.doc)}</span>`;
    const foot=v.kind==='check'?`<button class="btn" data-a="skip" type="button">Skip</button><button class="btn go" data-a="apply" type="button">Apply changes</button>`:v.ref?(v.proposal&&v.proposal.invalid?`<button class="btn go" data-a="close" type="button">Dismiss invalid request</button>`:`<button class="btn" data-a="adv" type="button">Keep open and advance</button><button class="btn go" data-a="done" type="button">Close and advance</button>`):`<button class="btn" data-a="skip" type="button">Skip</button><button class="btn go" data-a="add" type="button">Add to tracker</button>`;
    $('vList').innerHTML=`<div class="vq vcard" data-id="${esc(v._id)}">
      <div class="vnav"><button type="button" data-a="prev" ${n<2?'disabled':''} aria-label="Previous request">‹</button><span>Request ${cur+1} of ${n}</span><button type="button" data-a="nextr" ${n<2?'disabled':''} aria-label="Next request">›</button></div>
      <div class="vcol">${hdr}
      <div class="vwh"><span class="eyebrow">What happened · ${esc(v.doc)}</span><p>${esc(v.detail||v.evidence)}</p></div>
      ${thumbs(v)}</div>
      <div class="vcol">${proposalHtml(v)}
      <div class="vcomposer"><input data-f="c" value="${esc(oid===v._id?oval:'')}" placeholder="Correct me or add a step, then press Enter to revise" maxlength="400"><button type="button" class="vsend" data-a="revise" title="Revise per comment" aria-label="Revise per comment">&#10148;</button></div><div class="vfl vcpr"><button type="button" class="vcp" data-a="cp" title="Open Copilot (placeholder)"><span class="cp-ic"><img src="img/copilot.png" alt="" width="28" height="28"></span>Copilot</button><input class="vcpin" data-f="cp" placeholder="Ask Copilot…" maxlength="300" aria-label="Ask Copilot"></div></div>
      <div class="vfoot"><div class="vfr">${foot}</div></div></div>`;
    const ci=document.querySelector('#vList [data-f=c]');if(ci&&oid===v._id&&hadFocus){ci.focus();try{ci.setSelectionRange(ss,se);}catch(e){}}}
  const upd=(id,d)=>db.collection('validations').doc(id).update(d);
  async function applyProposal(v){const p=v.proposal;if(!p)return [];const rows=window.jqIssues||[];let n=rows.reduce((m,r)=>Math.max(m,parseInt(String(r.ref||'').replace(/\D/g,''))||0),0);const made=[];
    for(const it of (p.items||[])){if(!it.title)continue;n++;const ref='J-'+String(n).padStart(2,'0');await db.collection('issues').doc(ref).set({ref,title:it.title,owner:it.owner||'Unassigned',area:it.area||'Design',status:'Open',next:it.next||'',order:n,updated:today(),blockedBy:it.blockedBy||[]});made.push(ref);}
    for(const u of (p.itemUpdates||[])){if(!u.ref)continue;const P={};['next','title','owner','status','now','ball','due'].forEach(k=>{if(u[k]!=null&&u[k]!=='')P[k]=String(u[k]);});if(Array.isArray(u.blockedBy))P.blockedBy=u.blockedBy;if(P.status&&!['Open','Pending','In progress','Done'].includes(P.status))delete P.status;if(Object.keys(P).length){P.updated=today();await db.collection('issues').doc(u.ref).update(P);}}
    return made;}
  function buildPrompt(v,c){const rows=(window.jqIssues||[]),is=rows.find(r=>r.ref===v.ref)||{};
    const slim=rows.filter(r=>r.status!=='Done').map(r=>({ref:r.ref,title:cut(r.title,100),owner:r.owner,area:r.area,blockedBy:r.blockedBy||[]}));
    return `You help Jason Lueders (Director of Construction, Zilber Property Group) keep a construction project tracker correct. A validation card shows something that happened, what the tracker will do next, and Jason's comment. Revise the proposed outcome so it follows Jason's comment exactly. Return JSON only, no other text: {"invalid":false,"summary":"1 to 3 plain sentences: what happens to the item and what happens next","items":[{"title":"","owner":"","area":"","blockedBy":["J-00"]}],"itemUpdates":[{"ref":"J-00","next":"note text","now":"optional one-sentence current state","status":"optional Open|Pending|In progress|Done","ball":"optional who moves next","title":"optional new title","owner":"optional new owner"}]}. Use empty arrays when nothing is added. Omit optional fields you are not changing.
Rules: owner is the person who does the action (never put ZPG's action under another party). Use blockedBy with existing refs when a step cannot start until another finishes, so nobody gets an item they cannot act on yet. One item per hand-off; do not duplicate an existing open item (update it instead). Areas allowed: Design (Drawings and Design), Approvals (only what the Village or DSPS itself decides), Steel, Fire, MEP, General Contractor, Jaquet (what Jaquet itself must do). Do not invent steps Jason did not ask for. If his comment adds an interim step or a follow-up (for example an email to send), add it as an item. If Jason says the request itself is wrong, does not apply, or the premise is mistaken, set "invalid":true, make the summary say plainly that nothing changes in the tracker and why in his words, and return empty arrays. Plain wording, short.
ITEM: ${JSON.stringify({ref:v.ref,title:is.title,owner:is.owner,area:is.area,status:is.status,next:cut(is.next,400),blockedBy:is.blockedBy||[]})}
WHAT HAPPENED (${v.doc}): ${v.detail||v.evidence}
CURRENT PROPOSAL: ${v.proposal&&v.proposal.summary?JSON.stringify(v.proposal):(v.ref?'Close the item and unblock anything waiting on it.':'Add this follow-up to the tracker: '+(v.nextTitle||''))}
JASON'S COMMENT: ${c}
OPEN ITEMS: ${JSON.stringify(slim)}`;}
  async function revise(v,card){const ci=card.querySelector('[data-f=c]'),c=ci?ci.value.trim():'';
    if(!c){$('vNote').textContent='Type a comment first, then press Enter.';return;}
    let sample=null;try{sample=window.claude?await window.claude.use('sample'):null;}catch(e){}
    if(!sample){try{await upd(v._id,{lastComment:c,commentPending:true,commentAt:Date.now()});ci.value='';$('vNote').textContent='Comment saved. Claude will revise this request the next time it processes new emails.';}catch(err){$('vNote').textContent='That comment did not save. You may have view-only access.';}return;}
    const sb=card.querySelector('.vsend');sb.disabled=true;ci.disabled=true;$('vNote').textContent='Revising…';
    try{const r=await sample.json(buildPrompt(v,c),{modelTier:'default',cache:false});
      const clean=x=>String(x??'').slice(0,300);
      const np={invalid:!!r.invalid,summary:clean(r.summary||'').slice(0,600),items:(Array.isArray(r.items)?r.items:[]).slice(0,5).map(it=>({title:clean(it.title),owner:clean(it.owner),area:clean(it.area),blockedBy:Array.isArray(it.blockedBy)?it.blockedBy.map(clean).slice(0,6):[]})).filter(it=>it.title),itemUpdates:(Array.isArray(r.itemUpdates)?r.itemUpdates:[]).slice(0,5).map(u=>{const o={ref:clean(u.ref)};['next','now','status','ball','title','owner'].forEach(k=>{if(u[k])o[k]=clean(u[k]);});return o;}).filter(u=>u.ref)};
      if(!np.summary)throw new Error('empty');
      await upd(v._id,{proposal:np,rev:(v.rev||0)+1,lastComment:c});$('vNote').textContent='Revised. Check it, then revise again or choose a button.';
    }catch(err){$('vNote').textContent='Could not revise: '+((err&&err.message)||'try again');sb.disabled=false;ci.disabled=false;}}
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.matches&&e.target.matches('#vList [data-f=c]')){e.preventDefault();const card=e.target.closest('.vq'),v=list.find(x=>x._id===card.dataset.id);if(v)revise(v,card);}});
  document.addEventListener('click',async e=>{
    if(e.target.closest('#vBtn')){$('vModal').hidden=false;return;}
    if(e.target.closest('#vX')||e.target===$('vModal')){$('vModal').hidden=true;return;}
    const b=e.target.closest('#vList [data-a]');if(!b||!db)return;const card=b.closest('.vq'),v=list.find(x=>x._id===card.dataset.id);if(!v)return;const a=b.dataset.a;
    if(a==='prev'){cur=(cur-1+list.length)%list.length;paint();return;}
    if(a==='nextr'){cur=(cur+1)%list.length;paint();return;}
    if(a==='show'){const r=refsOf(v)[+b.dataset.r];if(r)showRef(v,r);return;}
    if(a==='revise'){revise(v,card);return;}
    if(a==='cp'){const ti=card.querySelector('[data-f=cp]');openCp(v,ti?ti.value.trim():'');return;}
    try{
      if(a==='done'||a==='adv'){const ci=card.querySelector('[data-f=c]'),c=ci?ci.value.trim():'';
        const iu={updated:today()};
        if(a==='done')iu.status='Done';else if((window.jqIssues||[]).find(r=>r.ref===v.ref&&r.status==='Open'))iu.status='In progress';
        if(c)iu.next='Update from '+v.doc+': '+c;
        await db.collection('issues').doc(v.ref).update(iu);
        if(a==='done'&&window.jqFeed)window.jqFeed(v.ref+' done: '+String(v.doc).slice(0,50));
        let made=[];if(v.proposal)made=await applyProposal(v);
        await upd(v._id,{answer:a,comment:c,answeredAt:Date.now(),nextDone:true,applied:made,state:'resolved',at:Date.now()});return;}
      if(a==='apply'){const ci=card.querySelector('[data-f=c]'),c=ci?ci.value.trim():'';const made=await applyProposal(v);await upd(v._id,{answer:'apply',comment:c,answeredAt:Date.now(),nextDone:true,applied:made,state:'resolved',at:Date.now()});return;}
      if(a==='add'){let made=[];
        if(v.proposal&&((v.proposal.items||[]).length||(v.proposal.itemUpdates||[]).length))made=await applyProposal(v);
        else if(v.nextTitle){const rows=window.jqIssues||[],n=rows.reduce((m,r)=>Math.max(m,parseInt(String(r.ref||'').replace(/\D/g,''))||0),0)+1,ref='J-'+String(n).padStart(2,'0');
          await db.collection('issues').doc(ref).set({ref,title:v.nextTitle,owner:v.nextOwner||'Unassigned',area:v.nextArea||'Design',status:'Open',next:'',order:n,updated:today()});made=[ref];}
        await upd(v._id,{nextDone:true,nextAdded:made.join(','),state:'resolved',at:Date.now()});return;}
      if(a==='skip'){await upd(v._id,{nextDone:true,nextAdded:'',state:'resolved',at:Date.now()});return;}
      if(a==='close'){const ci=card.querySelector('[data-f=c]'),c=ci?ci.value.trim():'';await upd(v._id,{state:'resolved',at:Date.now(),dismissed:true,comment:c||v.lastComment||''});return;}
    }catch(err){$('vNote').textContent='Could not save. You may have view-only access.';}
  });
  (async()=>{try{db=window.claude?await window.claude.use('db'):null;}catch(e){}if(!db)return;
    db.collection('validations').onSnapshot(s=>{list=Array.from((s&&(s.docs||s))||[]).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id};}).filter(v=>v.state==='pending').sort((x,y)=>(x.at||0)-(y.at||0));paint();},()=>{});})();
  paint();
})();

(function meetings(){
  const $=id=>document.getElementById(id);const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let list=[],db=null,openId=null;
  const ul=a=>'<ul>'+(a||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  function draw(){
    const L=$('mtList'),D=$('mtDetail');
    if(openId){const m=list.find(x=>x._id===openId);if(m){L.hidden=true;D.hidden=false;
      D.innerHTML=`<button type="button" class="btn mt-back" id="mtBack">← All meetings</button> <button type="button" class="btn go mt-back" id="mtCopy">Copy for email</button><textarea id="mtCopyTxt" hidden style="width:100%;height:220px;font:13px/1.4 monospace;margin:8px 0"></textarea><div class="eyebrow">${esc(m.kind||'Meeting')} · ${esc(m.dateLabel||m.date)}</div><h2>${esc(m.title)}</h2><p class="sum">${esc(m.summary)}</p><div class="mt-meta"><b>Who:</b> ${esc(m.attendees)}</div>${m.note?`<div class="mt-note">${esc(m.note)}</div>`:''}`+
      `<h3>Executive summary</h3><p style="max-width:80ch;font-size:14px;line-height:1.55">${esc(m.exec)}</p><h3>${esc(m.progressLabel||'Progress and decisions')}</h3>${ul(m.progress)}<h3>${esc(m.objectivesLabel||'Current objectives to keep the critical path')}</h3>${ul(m.objectives)}`+
      `<h3>Details by discipline</h3><div class="mt-grid">${(m.disciplines||[]).map(d=>`<div class="mt-box"><h4>${esc(d.n)}</h4>${ul(d.items)}</div>`).join('')}</div>`+
      `<h3>Assignments and follow-ups</h3><div class="mt-grid">${(m.assignments||[]).map(d=>`<div class="mt-box"><h4>${esc(d.who)}</h4>${ul(d.items)}</div>`).join('')}</div>`+
      `<div class="mt-tr"><b>Full transcript</b><br>${m.transcript?`<a href="${esc(m.transcript)}" target="_blank" rel="noopener">Open the full transcript</a>`:`<span class="note">Not attached yet. Paste a link:</span> <input id="mtTrIn" placeholder="https://…"> <button type="button" class="btn" id="mtTrSave">Save</button>`}</div>`;
      return;}openId=null;}
    D.hidden=true;L.hidden=false;
    L.innerHTML=list.length?list.map(m=>`<button type="button" class="mt-card" data-id="${esc(m._id)}"><div class="d">${esc(m.dateLabel||m.date)} · ${esc(m.kind||'Meeting')}</div><h3>${esc(m.title)}</h3><p>${esc(m.summary)}</p></button>`).join(''):'<p class="note">No meeting notes yet.</p>';
  }

  const H=x=>esc(x);
  function emailText(m){const L=a=>(a||[]).map(x=>(/^\d+\./.test(x)?'':'- ')+x).join('\n');
    return [m.title+' ('+(m.dateLabel||m.date)+')','','Attendees: '+(m.attendees||''),m.note?'\n'+m.note:'','','EXECUTIVE SUMMARY',m.exec||'','',(m.progressLabel||'Progress and decisions').toUpperCase(),L(m.progress),'',(m.objectivesLabel||'Current objectives').toUpperCase(),L(m.objectives),'','DETAILS BY DISCIPLINE',...(m.disciplines||[]).map(d=>d.n+'\n'+L(d.items)+'\n'),'ASSIGNMENTS',...(m.assignments||[]).map(a=>a.who+'\n'+L(a.items)+'\n')].join('\n');}
  function emailHtml(m){
    const ul=a=>'<ul style="margin:6px 0 0;padding-left:22px">'+(a||[]).map(x=>'<li style="margin:3px 0">'+H(x)+'</li>').join('')+'</ul>';
    const h3=t=>'<h3 style="margin:22px 0 6px;padding-bottom:4px;border-bottom:1px solid #D5DDE5;font-size:16px;color:#1E3448;font-family:Arial,Helvetica,sans-serif">'+H(t)+'</h3>';
    const box=(t,a)=>'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #D5DDE5;margin:0 0 10px"><tr><td style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px"><b style="color:#1E3448">'+H(t)+'</b>'+ul(a)+'</td></tr></table>';
    return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1b2733;max-width:760px;background:#ffffff">'+
      '<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6B7C8C">'+H(m.kind||'Meeting')+' &middot; '+H(m.dateLabel||m.date)+'</div>'+
      '<h2 style="margin:4px 0 6px;font-size:22px;color:#1E3448;font-family:Arial,Helvetica,sans-serif">'+H(m.title)+'</h2>'+
      '<p style="margin:0 0 8px;color:#4a5b6b">'+H(m.summary)+'</p>'+
      '<p style="margin:8px 0"><b>Who:</b> '+H(m.attendees)+'</p>'+
      (m.note?'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0"><tr><td style="background:#FFF7E6;border:1px solid #F3D9A4;padding:8px 10px;font-size:13px;font-family:Arial,Helvetica,sans-serif">'+H(m.note)+'</td></tr></table>':'')+
      h3('Executive summary')+'<p style="margin:6px 0">'+H(m.exec)+'</p>'+
      h3(m.progressLabel||'Progress and decisions')+ul(m.progress)+
      h3(m.objectivesLabel||'Current objectives to keep the critical path')+ul(m.objectives)+
      h3('Details by discipline')+(m.disciplines||[]).map(d=>box(d.n,d.items)).join('')+
      h3('Assignments and follow-ups')+(m.assignments||[]).map(d=>box(d.who,d.items)).join('')+'</div>';}
  async function copyRich(html,text){
    try{if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);return true;}}catch(e){}
    try{const d=document.createElement('div');d.contentEditable='true';d.style.cssText='position:fixed;left:-9999px;top:0;background:#fff';d.innerHTML=html;document.body.appendChild(d);const r=document.createRange();r.selectNodeContents(d);const sl=getSelection();sl.removeAllRanges();sl.addRange(r);const ok=document.execCommand('copy');sl.removeAllRanges();d.remove();return ok;}catch(e){return false;}
  }
  document.addEventListener('click',async e=>{
    const c=e.target.closest('.mt-card');if(c){openId=c.dataset.id;draw();window.scrollTo(0,0);return;}
    if(e.target.closest('#mtBack')){openId=null;draw();return;}
    if(e.target.closest('#mtCopy')){const m=list.find(x=>x._id===openId);if(!m)return;const btn=e.target.closest('#mtCopy');
      const ok=await copyRich(emailHtml(m),emailText(m));
      if(ok){btn.textContent='Copied. Paste into your email';setTimeout(()=>{btn.textContent='Copy for email'},2600);}
      else{const ta=$('mtCopyTxt');ta.value=emailText(m);ta.hidden=false;ta.select();btn.textContent='Press Ctrl+C';}
      return;}
    if(e.target.closest('#mtTrSave')&&db){const v=$('mtTrIn').value.trim();if(!/^https?:\/\//.test(v))return;try{await db.collection('meetings').doc(openId).update({transcript:v});}catch(err){}}
  });
  (async()=>{try{db=window.claude?await window.claude.use('db'):null;}catch(e){}if(!db){$('mtList').innerHTML='<p class="note">Sign in to claude.ai to see meeting notes.</p>';return;}
    db.collection('meetings').onSnapshot(s=>{list=Array.from((s&&(s.docs||s))||[]).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id};}).sort((a,b)=>(b.sortAt||0)-(a.sortAt||0));draw();},()=>{$('mtList').innerHTML='<p class="note">Meeting notes could not load. Reload to try again.</p>';});})();
})();
</script>
