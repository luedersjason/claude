const D=s=>new Date(s+'T12:00:00');
const TODAY=new Date();

// Confirmed dates only. lab = group label row, m = milestone, k = key milestone.
// Bid, contract, closing and construction have no dates yet; they are approval-path cards marked "date not set".
const MASTER=[
 {n:'Approvals',lab:1},
 {n:'Village Board approves the DA, CSM and public improvement plans',s:'2026-08-24',m:1},
 {n:'Village conditional approval letter (conditions 1-12)',s:'2026-08-25',m:1},
 {n:'WDNR wetland and pond individual permits',s:'2026-10-15',m:1},
 {n:'WDNR Section 401 water quality certification',s:'2026-10-16',m:1},
 {n:'Village + KWU approve the watermain plans',s:'2026-11-04',m:1},
 {n:'Deadlines',lab:1},
 {n:'Watermain installed, inspected and accepted by the Village (DA s.6.1)',s:'2027-11-15',m:1,k:1},
 {n:'Phase A substantial completion (approval letter p.1)',s:'2028-01-01',m:1,k:1},
];
const VIEWS={
 master:{t:MASTER,s:'2026-08-01',e:'2028-02-29',title:'Master schedule',lede:'Confirmed dates only. Bid, contract, closing and construction dates are not set yet; they are in the approval path below.'},
};

let CUR='master';
(function gantt(){
  const g=document.getElementById('gantt');
  const md=d=>(d.getMonth()+1)+'/'+d.getDate();
  function render(){
    const V=VIEWS[CUR], start=D(V.s), end=D(V.e), pct=d=>((d-start)/(end-start))*100;
    document.getElementById('gTitle').textContent=V.title;
    document.getElementById('gLede').textContent=V.lede;
    let qs='',ms='',grid='';
    for(let d=new Date(start);d<=end;d.setMonth(d.getMonth()+1)){
      if(d.getMonth()%3===0||+d===+start){qs+=`<span class="q" style="left:${pct(d)}%">Q${Math.floor(d.getMonth()/3)+1} ’${String(d.getFullYear()).slice(2)}</span>`;}
      ms+=`<span class="m" style="left:${pct(d)}%">${d.toLocaleDateString('en-US',{month:'short'})}</span>`;
      grid+=`<span style="left:${pct(d)}%"></span>`;
    }
    let h=`<div class="g-head">${qs}${ms}</div><div class="g-grid">${grid}</div>`;
    V.t.forEach((t,i)=>{
      if(t.lab){h+=(i>0?'<div class="g-row gap"></div>':'')+`<div class="g-row phase"><span class="g-lab">${t.n}</span></div>`;return;}
      const s=D(t.s), e=t.e?D(t.e):s;
      if(t.p&&i>0) h+='<div class="g-row gap"></div>';
      const state=t.pend?'pend':(e<TODAY?'done':(s<=TODAY?'live':''));
      let row;
      if(t.m){
        const cls=`ms ${t.k&&!t.pend?'key':''} ${e<TODAY&&!t.pend?'done':''}`;
        // a name that would run off the left edge goes after the date instead
        if(pct(s)<45) row=`<i class="${cls}" style="left:${pct(s)}%"></i><span class="dt f" style="left:calc(${pct(s)}% + 9px)">${md(s)} <span class="nm" style="margin-left:6px">${t.n}</span></span>`;
        else row=`<span class="dt s" style="right:calc(${100-pct(s)}% + 9px)"><span class="nm">${t.n}</span></span>`+
          `<i class="${cls}" style="left:${pct(s)}%"></i>`+
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
  window.jqFit=render;
  render(); if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(g.offsetWidth)fit();});
  addEventListener('resize',()=>{if(g.offsetWidth)fit();});
})();

// Documents: cards are views over files. Item = [title, PDF path, version/date, viewer sheet ids, status lines?]
const SR=(p,n)=>Array.from({length:n},(_,i)=>p+'-'+(i+1));
const dcards=[
 {t:'Village / DA',img:'img/docs/village-da.jpg',d:'Village approval letter, Development Agreement draft, CSM language, stormwater agreement draft and the Village Engineer comments.',
  it:[['DA conditional approval letter','docs/NW-Village-DA-Approval-Letter-8.25.26.pdf','Rob Hanson, 8/25/26',SR('AL',5)],
   ['Development Agreement (draft) with exhibits','docs/NW-Development-Agreement-DRAFT.pdf','08/2026 draft · pp.1-18 and Exhibits D, D1, D2',SR('DA',18).concat(['DA-D','DA-D1','DA-D2']),['Exhibits D1 (cost breakdown) and D2 (security) are blank','Full 57-page PDF: Open full PDF']],
   ['CSM dedication and covenant language (draft)','docs/NW-CSM-Dedication-Covenant-Language-DRAFT.pdf','8/13/26 draft',SR('CSM',2),['Owner spelled "Lakeveiw" on line 1']],
   ['Stormwater Maintenance Agreement (draft)','docs/NW-Stormwater-Maintenance-Agreement-DRAFT.pdf','Draft, with the 8/25 packet',SR('SW',11),['Exhibit B still needed']],
   ['Village Engineer comments (marked plans)','docs/NW-Village-Engineer-Comments-8.11.26.pdf','8/11/26',SR('EC',5)]]},
 {t:'Approvals & permits',img:'img/docs/approvals.jpg',d:'KWU approval and the WDNR permits and water quality certification.',
  it:[['KWU approval letter','docs/NW-KWU-Approval-11.4.26.pdf','Ian Bagley, 11/4/26',['KWU-1']],
   ['WDNR wetland individual permit IP-SE-2026-30-01917','docs/NW-WDNR-Wetland-IP-01917-10.15.26.pdf','Sonya Ponzi, 10/15/26',SR('WP',7),['Completion date and permit number need correcting']],
   ['WDNR pond individual permit IP-SE-2026-30-02789','docs/NW-WDNR-Pond-IP-02789-10.15.26.pdf','Sonya Ponzi, 10/15/26',SR('PP',5)],
   ['WDNR Section 401 water quality certification','docs/NW-WDNR-WQC-01917-10.16.26.pdf','10/16/26 · for Corps MVP-2017-01912-LRK',SR('WQC',3)]]},
 {t:'Bid package',img:'img/docs/bid-package.jpg',d:'What goes out to bidders: the Pinnacle project manual and the watermain plans bid set.',
  it:[['Project manual (contract, terms, proposal form)','docs/NW-Project-Manual-Pinnacle-11.3.26.pdf','Pinnacle, 11/3/26',SR('PM',12),['Completion date still 7/31/2026; 8 items sent to Pinnacle 11/4']],
   ['Public watermain plans, bid set (rev. 4)','docs/NW-Public-Watermain-Plans-BidSet-11.3.26.pdf','Pinnacle 644.00, 11/3/26',SR('PL',8)]]},
];
(function dcardsUi(){
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const g=id=>document.getElementById(id);
  dcards.forEach(c=>{c.it=c.it.filter(x=>x[3]);});
  g('dcards').innerHTML=dcards.map((c,i)=>`<button type="button" class="dc" data-i="${i}"><div class="dc-img" style="background-image:url('${c.img}')"></div><div class="dc-b"><span class="dc-n">${c.it.length} file${c.it.length===1?'':'s'}</span><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></div></button>`).join('');
  const m=g('dcModal');
  function openItem(i,ids){if(!ids||!ids.length||!window.jqOpenSheets)return;window.jqOpenSheets(ids,ids[0],()=>list(i));}
  function list(i){const c=dcards[i];g('dcH').textContent=c.t;g('dcSub').textContent=c.d+' Click a file to open it in the viewer.';
    g('dcList').innerHTML=c.it.map((x,k)=>{const v=x[3];
      const img=`<div class="dfc-i" style="background-image:url('sheets/${esc(v[0])}.jpg')"></div>`;
      return `<div class="dfw"><button type="button" class="dfc" data-k="${k}">${img}<div class="dfc-b"><b>${esc(x[0])}</b><span>${esc(x[2]||'')}${v.length>1?' · '+v.length+' sheets':''}</span>${(x[4]||[]).map(t=>`<span class="dfc-t">${esc(t)}</span>`).join('')}</div></button><a class="dfc-pdf" href="${esc(x[1])}" target="_blank" rel="noopener">Open full PDF ↗</a></div>`;}).join('');
    g('dcList').dataset.i=i;m.hidden=false;}
  g('dcards').addEventListener('click',e=>{const b=e.target.closest('.dc');if(!b)return;list(+b.dataset.i);});
  g('dcList').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;const i=+g('dcList').dataset.i,it=dcards[i].it[+b.dataset.k];m.hidden=true;openItem(i,it[3]);});
  g('dcX').addEventListener('click',()=>m.hidden=true);
  m.addEventListener('click',e=>{if(e.target===m)m.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)m.hidden=true;});
})();

const toast=document.getElementById('toast');
function say(m){toast.textContent=m;toast.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove('show'),1600)}

// Review list: item text in `reviewItems` (Claude edits it there), decisions in `reviews` (doc id = item key).
(function review(){
  const $=id=>document.getElementById(id);
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const LABEL={open:['n','Open'],accept:['g','Accepted'],change:['g','Accepted w/ changes'],reject:['r','Rejected'],discuss:['a','Discuss']};
  let items=[],decs={},db=null,me=null,user=null,names={},canWrite=true,sig='';
  const md=ms=>{const d=new Date(ms);return (d.getMonth()+1)+'/'+d.getDate();};
  const keyNum=k=>[String(k).charCodeAt(0),parseInt(String(k).slice(1))||0];
  const cmp=(a,b)=>((a.order||0)-(b.order||0))||(keyNum(a.k)[0]-keyNum(b.k)[0])||(keyNum(a.k)[1]-keyNum(b.k)[1]);
  function build(){
    const s=JSON.stringify(items); if(s===sig){paint();return;} sig=s;
    const open=new Set([...document.querySelectorAll('#rList .ri[open]')].map(x=>x.dataset.k));
    const groups=[];items.slice().sort(cmp).forEach(it=>{let g=groups.find(x=>x.g===it.g);if(!g)groups.push(g={g:it.g,items:[]});g.items.push(it);});
    $('rList').innerHTML=groups.length?groups.map(g=>`<h3 class="rg">${esc(g.g)} <span>${g.items.length}</span></h3>`+g.items.map(it=>`<details class="ri" data-k="${esc(it.k)}"${open.has(it.k)?' open':''}><summary><span class="rk">${esc(it.k)}</span><span class="rt">${esc(it.t)}</span><span class="rby"></span><span class="rs n">Open</span></summary>
<div class="rd">
 <div class="rrow"><span class="rlab">Where</span><ul class="wl">${(it.where||[]).map(w=>`<li><b>${esc(w[0])}</b> · ${esc(w[1])}</li>`).join('')}</ul></div>
 <div class="rrow"><span class="rlab">Who edits</span><div>${esc(it.who)}</div></div>
 <div class="rbox cur"><span class="rlab">Current text</span>${(it.cur||[]).map(x=>`<p>${esc(x)}</p>`).join('')}</div>
 <div class="rbox new"><span class="rlab">Proposed</span>${(it.new||[]).map(x=>`<p>${esc(x)}</p>`).join('')}</div>
 <div class="rrow"><span class="rlab">Why</span><div>${esc(it.why)}</div></div>
 <div class="rrow"><span class="rlab">On accept</span><div>${esc(it.deliver)}</div></div>
 <div class="dec"><button type="button" class="btn" data-d="accept">Accept</button><button type="button" class="btn" data-d="change">Accept with changes</button><button type="button" class="btn" data-d="reject">Reject</button><button type="button" class="btn" data-d="discuss">Discuss with Pinnacle</button></div>
 <textarea class="dnote" rows="2" placeholder="Notes from the review (saves when you click away)" aria-label="Notes for ${esc(it.k)}"></textarea>
</div></details>`).join('')).join(''):'<p class="note">No review items yet.</p>';
    paint();
  }
  function paint(){
    const n={accept:0,change:0,reject:0,discuss:0,open:0};let total=0;
    document.querySelectorAll('#rList .ri').forEach(el=>{
      const k=el.dataset.k,d=decs[k]||{dec:'open',note:''},dec=LABEL[d.dec]?d.dec:'open';total++;n[dec]++;
      const t=el.querySelector('.rs'),l=LABEL[dec];t.className='rs '+l[0];t.textContent=l[1];
      const by=el.querySelector('.rby');by.textContent=dec!=='open'&&d.at?md(d.at)+((names[d.by]&&names[d.by].name)?' · '+names[d.by].name:''):'';
      el.querySelectorAll('.dec button').forEach(b=>{b.classList.toggle('on',b.dataset.d===dec);b.setAttribute('aria-pressed',String(b.dataset.d===dec));b.disabled=!canWrite;});
      const ta=el.querySelector('.dnote');if(ta&&document.activeElement!==ta&&ta.dataset.dirty!=='1')ta.value=d.note||'';if(ta)ta.readOnly=!canWrite;
    });
    $('rcount').textContent=(n.accept+n.change)+' accepted · '+n.reject+' rejected · '+n.discuss+' to discuss · '+n.open+' open of '+total;
  }
  async function save(k,patch){
    if(!db)return false;const prev=decs[k];const d=Object.assign({dec:'open',note:''},prev||{},patch,{at:Date.now(),by:me||''});
    decs[k]=d;paint();
    try{await db.collection('reviews').doc(k).set({dec:d.dec,note:d.note||'',at:d.at,by:d.by});$('rMsg').textContent='';return true;}
    catch(e){decs[k]=prev;paint();say('That change did not save. You may have view-only access.');return false;}
  }
  $('rList').addEventListener('click',e=>{
    const b=e.target.closest('.dec button');if(!b||b.disabled)return;const el=b.closest('.ri'),k=el.dataset.k,cur=(decs[k]||{}).dec||'open';
    const ta=el.querySelector('.dnote'),note=ta?ta.value:((decs[k]||{}).note||'');
    save(k,{dec:cur===b.dataset.d?'open':b.dataset.d,note}).then(ok=>{if(ok&&ta)ta.dataset.dirty='';});
  });
  const timers={};
  function saveNote(ta){const k=ta.closest('.ri').dataset.k;clearTimeout(timers[k]);if(ta.dataset.dirty!=='1')return;
    if((decs[k]||{}).note===ta.value){ta.dataset.dirty='';return;}
    save(k,{note:ta.value}).then(ok=>{if(ok){ta.dataset.dirty='';say('Note saved');}});}
  $('rList').addEventListener('input',e=>{const ta=e.target.closest('.dnote');if(!ta)return;ta.dataset.dirty='1';const k=ta.closest('.ri').dataset.k;clearTimeout(timers[k]);timers[k]=setTimeout(()=>saveNote(ta),1500);});
  $('rList').addEventListener('focusout',e=>{const ta=e.target.closest('.dnote');if(ta)saveNote(ta);});
  $('rOpen').addEventListener('click',()=>document.querySelectorAll('#rList .ri').forEach(x=>x.open=true));
  $('rClose').addEventListener('click',()=>document.querySelectorAll('#rList .ri').forEach(x=>x.open=false));
  const norm=s=>Array.from((s&&(s.docs||s))||[]).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id};});
  (async()=>{
    try{db=window.claude?await window.claude.use('db'):null;user=window.claude?await window.claude.use('user'):null;}catch(e){}
    if(!db){$('rList').innerHTML='<p class="note">Sign in to see the review list.</p>';return;}
    try{me=user&&user.id?await user.id():null;const c=user&&user.can?await user.can('data.write'):null;if(c===false){canWrite=false;$('rMsg').textContent='View only: you can read the list but not record decisions.';}}catch(e){}
    db.collection('reviewItems').onSnapshot(s=>{items=norm(s).map(x=>Object.assign({k:x._id},x));build();},()=>{$('rList').innerHTML='<p class="note">The review list could not load. Reload the page to try again.</p>';});
    db.collection('reviews').onSnapshot(async s=>{const m={};norm(s).forEach(x=>{m[x._id]=x;});decs=m;
      try{const ids=[...new Set(Object.values(m).map(x=>x.by).filter(Boolean))];if(ids.length&&user&&user.profiles)names=await user.profiles(ids);}catch(e){}
      paint();},()=>{});
  })();
})();

(function quick(){
  // Home buttons: [data-sheets] opens the drawing viewer
  document.addEventListener('click',e=>{const b=e.target.closest('[data-sheets]');if(!b||!window.jqOpenSheets)return;const ids=b.dataset.sheets.split(',');window.jqOpenSheets(ids,ids[0]);});
})();
