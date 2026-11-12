// ZPG project site script. One copy for every project; project data comes from CFG (projects/<name>/project.json).
window.NW_SHEETS=CFG.sheets;
const D=s=>new Date(s+'T12:00:00');
const TODAY=new Date();

// Confirmed dates only. lab = group label row, m = milestone, k = key milestone.
// Bid, contract, closing and construction have no dates yet; they are approval-path cards marked "date not set".
const MASTER=CFG.schedule.rows;
const VIEWS={master:{t:MASTER,s:CFG.schedule.start,e:CFG.schedule.end,title:CFG.schedule.title,lede:CFG.schedule.lede,label:'Master'}};
// Optional extra views (playbook 1.7): CFG.schedule.views = {precon:{label,rows,start,end,title,lede}, constr:{...}}; optional CFG.schedule.eyebrow.
Object.entries(CFG.schedule.views||{}).forEach(([k,v])=>{VIEWS[k]={t:v.rows,s:v.start,e:v.end,title:v.title,lede:v.lede,label:v.label||k};});
(function gviews(){const box=document.querySelector('.gviews');if(box&&Object.keys(VIEWS).length>1){box.innerHTML=Object.entries(VIEWS).map(([k,v],i)=>`<button class="gview" data-v="${k}" type="button" aria-pressed="${i?'false':'true'}">${v.label}</button>`).join('');}
  const eb=document.querySelector('#schedule .g-hdr .eyebrow');if(eb&&CFG.schedule.eyebrow)eb.textContent=CFG.schedule.eyebrow;})();

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
  const gv=document.querySelector('.gviews');if(gv)gv.addEventListener('click',e=>{const b=e.target.closest('.gview');if(!b||!VIEWS[b.dataset.v])return;CUR=b.dataset.v;gv.querySelectorAll('.gview').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));render();});
  render(); if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(g.offsetWidth)fit();});
  addEventListener('resize',()=>{if(g.offsetWidth)fit();});
})();

// Documents: cards are views over files. Item = [title, PDF path, version/date, viewer sheet ids, status lines?]
const SR=(p,n)=>Array.from({length:n},(_,i)=>p+'-'+(i+1));
const dcards=CFG.documents;
(function dcardsUi(){
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const g=id=>document.getElementById(id);
  dcards.forEach(c=>{c.it=c.it.filter(x=>x[3]);});
  g('dcards').innerHTML=dcards.map((c,i)=>`<button type="button" class="dc" data-i="${i}"><div class="dc-img" style="background-image:url('${c.img}')"></div><div class="dc-b"><span class="dc-n">${c.it.length} file${c.it.length===1?'':'s'}</span><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></div></button>`).join('');
  const m=g('dcModal');
  function openItem(i,ids){if(!ids||!ids.length||!window.jqOpenSheets)return;window.jqOpenSheets(ids,ids[0],()=>list(i));}
  function list(i){const c=dcards[i];g('dcH').textContent=c.t;g('dcSub').textContent=c.d+' Click a file to open it. Tick files, then Download for one combined PDF.';
    g('dcList').innerHTML=c.it.map((x,k)=>{const v=x[3];
      const img=`<div class="dfc-i" style="background-image:url('sheets/${esc(v[0])}.jpg')"></div>`;
      return `<div class="dfw"><label class="dfc-ck" title="Select for download"><input type="checkbox" data-ck="${k}" aria-label="Select ${esc(x[0])} for download"></label><button type="button" class="dfc" data-k="${k}">${img}<div class="dfc-b"><b>${esc(x[0])}</b><span>${esc(x[2]||'')}${v.length>1?' · '+v.length+' sheets':''}</span>${(x[4]||[]).map(t=>`<span class="dfc-t">${esc(t)}</span>`).join('')}</div></button><a class="dfc-pdf" href="${esc(x[1])}" target="_blank" rel="noopener">Open full PDF ↗</a></div>`;}).join('');
    g('dcList').dataset.i=i;dcCount();m.hidden=false;}
  const dcCks=()=>[...g('dcList').querySelectorAll('input[data-ck]')];
  function dcCount(){const n=dcCks().filter(x=>x.checked).length;g('dcDl').textContent=n?`Download (${n})`:'Download';g('dcDl').disabled=!n;}
  g('dcList').addEventListener('change',e=>{if(e.target.matches('input[data-ck]'))dcCount();});
  g('dcAll').addEventListener('click',()=>{dcCks().forEach(x=>x.checked=true);dcCount();});
  g('dcNone').addEventListener('click',()=>{dcCks().forEach(x=>x.checked=false);dcCount();});
  // Download checked: one combined PDF, files in card order; PNG/JPG files become one page each.
  g('dcDl').addEventListener('click',async()=>{
    const i=+g('dcList').dataset.i,c=dcards[i],ks=dcCks().filter(x=>x.checked).map(x=>+x.dataset.ck);if(!ks.length)return;
    const b=g('dcDl'),lab=b.textContent;b.disabled=true;b.textContent='Building PDF…';
    try{const L=window.PDFLib;if(!L)throw new Error('PDF library did not load');const out=await L.PDFDocument.create();
      for(const k of ks){const f=c.it[k][1],r=await fetch(f);if(!r.ok)throw new Error('Could not load '+f);const buf=await r.arrayBuffer();
        if(/\.pdf$/i.test(f)){const src=await L.PDFDocument.load(buf,{ignoreEncryption:true});(await out.copyPages(src,src.getPageIndices())).forEach(pg=>out.addPage(pg));}
        else{const im=/\.png$/i.test(f)?await out.embedPng(buf):await out.embedJpg(buf);const pg=out.addPage([im.width,im.height]);pg.drawImage(im,{x:0,y:0,width:im.width,height:im.height});}}
      const blob=new Blob([await out.save()],{type:'application/pdf'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download=`${CFG.filePrefix}_${c.t.replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
      say(ks.length+' file'+(ks.length===1?'':'s')+' downloaded as one PDF');}
    catch(err){say('Download failed: '+err.message);}
    finally{b.textContent=lab;dcCount();}});
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
  if(!$('rList'))return;   // pages without a review list
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
  // Download PDF: the review list exactly as shown (same colors and layout; expanded items open, collapsed items as one line).
  const loadJs=src=>new Promise((ok,no)=>{if([...document.scripts].some(x=>x.src===src))return ok();const t=document.createElement('script');t.src=src;t.onload=ok;t.onerror=no;document.head.appendChild(t);});
  $('rPdf').addEventListener('click',async()=>{
    const els=[...document.querySelectorAll('#rList .ri')];if(!els.length){say('No review items to download.');return;}
    const btn=$('rPdf');btn.disabled=true;const was=btn.textContent;btn.textContent='Building PDF…';
    let box=null;
    try{
      if(!window.html2pdf)await loadJs('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
      const now=new Date(),nOpen=els.filter(e=>e.open).length;
      box=document.createElement('div');box.style.cssText='position:fixed;left:-10000px;top:0;width:760px;background:#fff;padding:0';
      const sec=document.getElementById('review').cloneNode(false);sec.removeAttribute('id');
      const head=document.createElement('header');head.innerHTML='<span class="eyebrow"></span><h2></h2><p class="note"></p>';
      head.querySelector('.eyebrow').textContent=CFG.name;head.querySelector('h2').textContent='Review comments';
      head.querySelector('.note').textContent='Downloaded '+(now.getMonth()+1)+'/'+now.getDate()+'/'+now.getFullYear()+' · '+($('rcount').textContent||'')+' · '+nOpen+' of '+els.length+' expanded, as shown on screen';
      const list=$('rList').cloneNode(true);list.removeAttribute('id');list.className='rlist-pdf';
      // notes: show what is typed as text; keep the page's look otherwise
      const src=[...$('rList').querySelectorAll('.dnote')];list.querySelectorAll('.dnote').forEach((ta,i)=>{const v=(src[i]&&src[i].value||'').trim();if(!v){ta.remove();return;}const d=document.createElement('div');d.className='dnote';d.style.cssText='white-space:pre-wrap;min-height:0';d.textContent=v;ta.replaceWith(d);});
      // the PDF renderer ignores <details>, so rebuild each item as plain blocks: open items in full, collapsed items as the one-line header
      [...list.querySelectorAll('details.ri')].forEach((d,i)=>{const open=els[i].open,div=document.createElement('div');div.className='ri'+(open?' pdf-open':'');
        const sm=d.querySelector(':scope>summary'),hd=document.createElement('div');hd.className='rsum';hd.append(...sm.childNodes);div.appendChild(hd);
        if(open){const rd=d.querySelector(':scope>.rd');if(rd)div.appendChild(rd);}d.replaceWith(div);});
      const st=document.createElement('style');st.textContent='.rlist-pdf{display:block}.rlist-pdf .rsum{display:flex;gap:10px;align-items:baseline;padding:10px 12px;flex-wrap:wrap}.rlist-pdf .ri.pdf-open{border-color:#C5CFD9}.rlist-pdf .ri.pdf-open>.rsum{border-bottom:1px solid var(--line)}';box.appendChild(st);
      sec.append(head,list);box.appendChild(sec);document.body.appendChild(box);
      const fn=`${CFG.filePrefix}_review_comments_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.pdf`;
      const blob=await window.html2pdf().set({margin:[0.45,0.45,0.5,0.45],filename:fn,image:{type:'jpeg',quality:0.95},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'in',format:'letter',orientation:'portrait'},pagebreak:{mode:['css','avoid-all'],avoid:['.ri','.rg','.rbox','.rrow']}}).from(sec).outputPdf('blob');
      let dl=null;try{dl=window.claude?await window.claude.use('downloads'):null;}catch(e){}
      if(dl){try{await dl.save({filename:fn,data:blob});}catch(e){await dl.save({filename:fn,data:new Uint8Array(await blob.arrayBuffer())});}}
      else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
      say('PDF ready: '+els.length+' items, '+nOpen+' expanded.');
    }catch(err){say('The PDF could not be built: '+(err&&err.message?err.message:'the PDF tool did not load'));}
    finally{if(box)box.remove();btn.disabled=false;btn.textContent=was;}
  });
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

// Change something on the tracker (playbook 1.3, `asks`). A typed change becomes a check request (kind "check", askId)
// under Needs your check; Jason approves it with Apply changes and the comment then shows Done.
// This site has no `sample`, so Claude picks up "new" asks on its next check and writes the request itself.
(function asks(){
  const $=id=>document.getElementById(id);if(!$('askForm'))return;
  const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const LBL={done:'Done',working:'Claude is reading it…',proposed:'Ready under Needs your check'};
  (async()=>{let db=null,me=null;try{db=window.claude?await window.claude.use('db'):null;const u=await window.claude.use('user');me=u&&u.id?await u.id():null;}catch(e){}
    if(!db){$('askForm').hidden=true;$('askList').innerHTML='<li class="note">Sign in to send changes.</li>';return;}
    const norm=s=>Array.from((s&&(s.docs||s))||[]).map(d=>({...(typeof d.data==='function'?d.data():d.data),_id:d.id}));
    db.collection('asks').onSnapshot(s=>{const rows=norm(s).sort((a,b)=>b.at-a.at).slice(0,5);
      $('askList').innerHTML=rows.map(r=>{const d=new Date(r.at||0);return '<li><span class="note">'+(d.getMonth()+1)+'/'+d.getDate()+'<br>'+(LBL[r.state]||'Waiting')+'</span><div>'+esc(r.text)+(r.reply?'<div class="note" style="color:#007A39;margin-top:4px">Claude: '+esc(r.reply)+'</div>':'')+'</div></li>';}).join('');},()=>{});
    $('askForm').addEventListener('submit',async ev=>{ev.preventDefault();const v=$('askText').value.trim();if(!v)return;
      try{await db.collection('asks').doc('a'+Date.now()).set({text:v,at:Date.now(),by:me||'',state:'new'});$('askText').value='';say('Sent to Claude.');}
      catch(e){say('That did not send. You may have view-only access.');}});
    db.collection('validations').onSnapshot(s=>{norm(s).filter(v=>v.askId&&v.state==='resolved').forEach(v=>db.collection('asks').doc(v.askId).update({state:'done'}).catch(()=>{}));},()=>{});
  })();
})();

(async function tracker(){
  const body=document.getElementById('tkBody'), msg=document.getElementById('tkMsg');
  const ownerSel=document.getElementById('tkOwner'), showSel=document.getElementById('tkShow');
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const NEXT={Open:'Done',Pending:'Done',Done:'Open'};   // Prereq is never stored: it shows while a prerequisite is unfinished (playbook 5)
  let rows=[], canWrite=true, tkGrp='area', tkOnly=null, detailId=null; const tkOpen=new Set(), doneOpen=new Set();
  const DNAME=Object.fromEntries(CFG.disciplines);
  const syncSw=()=>document.querySelectorAll('#tkGrpSw button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.tg===tkGrp)));
  window.jqOpenItem=id=>{detailId=id;render();if(window.jqTab)window.jqTab('tracker',true);};
  // Arriving from another site with #ref=X: open that item once the tracker has loaded.
  let refHash=(location.hash.match(/^#ref=([^&]+)/)||[])[1];refHash=refHash&&decodeURIComponent(refHash);
  window.addEventListener('jqissues',()=>{if(!refHash)return;const r=rows.find(x=>x.ref===refHash);refHash=null;if(r){history.replaceState(null,'',location.pathname);window.jqOpenItem(r._id);}});
  window.jqOpenGroup=(kind,key,withDone)=>{detailId=null;tkGrp=kind;tkOnly=key;syncSw();tkOpen.add(kind+':'+key);if(withDone)doneOpen.add(kind+':'+key);showSel.value=showSel.value==='Done'?'active':showSel.value;render();if(window.jqTab)window.jqTab('tracker',true);};
  document.getElementById('tkGrpSw').addEventListener('click',e=>{const b=e.target.closest('[data-tg]');if(!b)return;tkGrp=b.dataset.tg;tkOnly=null;document.querySelectorAll('#tkGrpSw button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
  try{ if(localStorage.getItem('tkShow')) showSel.value=localStorage.getItem('tkShow'); }catch(e){}
  const db=window.claude?await window.claude.use('db'):null;
  if(!db){ body.innerHTML='<tr><td colspan="5" class="note">Sign in to see the tracker.</td></tr>'; return; }
  const user=await window.claude.use('user');
  try{ const c=user&&user.can?await user.can('data.write'):null; if(c===false) canWrite=false; }catch(e){}
  if(!canWrite){ document.getElementById('tkAdd').hidden=true; document.getElementById('newIss').hidden=true; }
  const col=db.collection('issues');
  function norm(snap){
    const list=snap&&(snap.docs||snap)||[];
    return Array.from(list).map(d=>{const v=typeof d.data==='function'?d.data():(d.data||d);return {...v,_id:d.id||v.id};});
  }
  // Prerequisites may sit on a linked site (CFG.linked: ref prefix -> {ns, path, name}); those trackers load read-only.
  window.jqX=window.jqX||[];
  const findRef=ref=>rows.find(x=>x.ref===ref)||window.jqX.find(x=>x.ref===ref);window.jqFind=findRef;
  window.jqWait=r=>(r.blockedBy||[]).map(findRef).filter(x=>x&&x.status!=='Done');
  // The step right before: one unfinished direct prereq (the one closest to Open first). Clicking it walks the chain one step at a time.
  window.jqNext=r=>{const w=window.jqWait(r);if(!w.length)return null;const ready=w.find(x=>!(x.blockedBy||[]).some(b=>{const y=findRef(b);return y&&y.status!=='Done';}));return {x:ready||w[0],more:w.length-1};};
  window.jqPreTag=(r,tag)=>{const n=window.jqNext(r);if(!n)return '';const x=n.x;return `<${tag||'span'} class="wait">Prereq: <a href="${x._x?esc(x._x.path)+'#ref='+esc(x.ref):'#'}" class="pre" data-pre="${esc(x.ref)}" title="${esc(x.title)}${x._x?' · '+esc(x._x.name):''}">${esc(x.ref)}</a>${n.more?` <span class="mono" style="font-weight:400">+${n.more} more</span>`:''}</${tag||'span'}> `;};
  (function linked(){const L=CFG.linked||{};const load=()=>Promise.all(Object.entries(L).map(([pfx,o])=>fetch('/api/c/'+encodeURIComponent(o.ns+'issues'),{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():{docs:[]}).then(j=>(j.docs||[]).map(d=>Object.assign({},d.data,{_x:o}))).catch(()=>[]))).then(a=>{window.jqX=a.flat();window.dispatchEvent(new Event('jqlinked'));});if(Object.keys(L).length){load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});}})();
  const eff=r=>{const s=(r.status==='Done')?'Done':'Open';return (s!=='Done'&&window.jqWait(r).length)?'Prereq':s;};window.jqEff=eff;
  const stc=s=>s==='In progress'?'Progress':s;
  const pd=t=>{const m=String(t||'').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);if(!m)return null;const now=new Date();let y=m[3]?+m[3]:now.getFullYear();if(y<100)y+=2000;let d=new Date(y,+m[1]-1,+m[2]);if(!m[3]&&d-now>60*864e5)d=new Date(y-1,+m[1]-1,+m[2]);return d;};
  const age=t=>{const d=pd(t);return d?Math.floor((new Date()-d)/864e5):null;};
  const gaps=r=>r.status==='Done'?[]:[!r.ball&&'ball',!r.now&&'Now line',!r.confirmed&&'confirmed date'].filter(Boolean);  // playbook 5: every open item carries these
  function flags(r){if(r.status==='Done')return '';let h='';if(r.ball)h+=`<span class="ball">Ball: ${esc(r.ball)}</span>`;const g=gaps(r);if(g.length)h+=`<span class="flag" title="The playbook asks every open item for a ball, a Now line and a confirmed date">Missing: ${g.join(', ')}</span>`;const dd=pd(r.due);if(dd&&new Date()-dd>864e5*0.99)h+=`<span class="flag">Overdue ${esc(r.due)}</span>`;else if(r.due)h+=`<span class="wait">Due ${esc(r.due)}</span>`;const a=age(r.confirmed||r.updated);if(a!==null&&a>=7)h+=`<span class="flag">Not confirmed in ${a} days</span>`;return h;}
  window.jqCmp=(a,b)=>((a.status==='Done')-(b.status==='Done'))||((b.pri?1:0)-(a.pri?1:0))||((parseInt(String(a.ref||'').replace(/\D/g,''))||999)-(parseInt(String(b.ref||'').replace(/\D/g,''))||999));
  window.jqPri=async id=>{const r=rows.find(x=>x._id===id);if(!r)return;try{await col.doc(id).update({pri:!r.pri});}catch(e){msg.textContent='Could not change priority. You may have view-only access.';}};
  function detailHtml(r){
    const lab=DNAME[r.area]||r.area||'';const L=ref=>findRef(ref);
    const link=x=>`<li><a href="${x._x?esc(x._x.path):'#'}" class="pre" data-pre="${esc(x.ref)}">${esc(x.ref)}</a> ${esc(x.title)} <span class="mono" style="font-size:11px">· ${esc(x.status)}${x._x?' · '+esc(x._x.name):''}</span></li>`;
    const pre=(r.blockedBy||[]).map(L).filter(Boolean),unb=rows.filter(x=>(x.blockedBy||[]).includes(r.ref)),ve=(r.ve||[]).map(L).filter(Boolean),feeds=rows.filter(x=>(x.ve||[]).includes(r.ref));
    const sec=(h,a)=>a.length?`<h3>${h}</h3><ul>${a.map(link).join('')}</ul>`:'';
    return `<button type="button" class="btn" data-back>← Back to ${esc(tkOnly?(tkGrp==='area'?(DNAME[tkOnly]||tkOnly):tkOnly):'the tracker')}</button>
    <div class="eyebrow" style="margin-top:12px">${esc(r.ref||'')} · ${esc(lab)}</div><h2 style="margin:4px 0 10px">${esc(r.title)}</h2>
    ${r.status!=='Done'&&window.jqNext(r)?`<p style="margin:0 0 10px">${window.jqPreTag(r)}</p>`:''}<div class="tk-facts"><div><span>Status</span><button class="st ${esc(stc(eff(r)))}" data-id="${esc(r._id)}"${canWrite?'':' disabled'}>${esc(eff(r))}</button></div>
    <div><span>Owner</span>${esc(r.owner||'Unassigned')}</div>${r.ball?`<div><span>Ball is with</span>${esc(r.ball)}</div>`:''}${r.due?`<div><span>Due</span>${esc(r.due)}</div>`:''}${r.confirmed?`<div><span>Last confirmed</span>${esc(r.confirmed)}${r.source?' · '+esc(r.source):''}</div>`:''}
    <div><span>Priority</span><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" aria-pressed="${!!r.pri}">★ ${r.pri?'Priority':'Mark priority'}</button></div>
    <div><span>Updated</span>${esc(r.updated||'')}</div></div>
    ${sec('Prerequisites (must be done first)',pre)}${sec('Unblocks',unb)}${sec('VE ideas for this item',ve)}${sec('Feeds the cost log item',feeds)}
    ${flags(r)?`<p>${flags(r)}</p>`:''}${r.now?`<h3>Now</h3><p style="max-width:80ch;line-height:1.55" class="nowl">${esc(r.now)}</p>`:''}<h3>${r.now?'History':'Next step / notes'}</h3><p style="max-width:80ch;line-height:1.55" class="tk-hist">${esc(r.next||'No notes yet.')}</p>`;
  }
  window.addEventListener('jqlinked',()=>{if(rows.length)render();});
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
    const c={Open:0,Prereq:0,Done:0}; rows.forEach(r=>{const e=eff(r);c[e]=(c[e]||0)+1;});
    document.getElementById('tkCounts').innerHTML=`<span>${c.Open} open</span><span>${c.Prereq} prereq</span><span>${c.Done} done</span>`+(()=>{const n=rows.filter(r=>gaps(r).length).length;return n?`<span class="flag" style="border-radius:999px">${n} incomplete</span>`:'';})();
    const show=showSel.value;
    const vis=rows.filter(r=>(!cur||String(r.owner||'Unassigned').includes(cur))&&(tkGrp!=='none'||show==='all'||(show==='Done'?r.status==='Done':r.status!=='Done')))
      .sort(window.jqCmp);
    const rowHtml=r=>`<tr class="${r.status==='Done'?'done':''}${r.pri?' pri':''}${r.status!=='Done'&&window.jqWait(r).length?' blocked':''}">
      <td class="id"><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" title="Priority: move to top" aria-pressed="${!!r.pri}">★</button> ${esc(r.ref||'')}</td>
      <td class="t"><a href="#" class="itm" data-open="${esc(r._id)}">${esc(r.title)}</a><span class="area">${esc(r.area||'')}</span></td>
      <td class="who">${esc(r.owner||'Unassigned')}</td>
      <td><button class="st ${esc(stc(eff(r)))}" data-id="${esc(r._id)}"${canWrite?'':' disabled'} title="${canWrite?'Click to change status':'View only'}">${esc(eff(r))}</button></td>
      <td class="nx">${(r.ve&&r.ve.length)?`<span class="wait" style="background:#E8F5EE;border-color:#BFE3CF;color:#1B6B3F">VE ideas: ${r.ve.map(x=>`<a href="#" class="pre" data-pre="${esc(x)}">${esc(x)}</a>`).join(', ')}</span> `:''}${r.status!=='Done'?window.jqPreTag(r):''}${flags(r)}${r.now?`<span class="nowl">${esc(r.now)}</span>`:esc(r.next||'')}${r.updated?` <span class="mono" style="font-size:11px">· ${esc(r.updated)}</span>`:''}</td></tr>`;
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
    const ref=CFG.refPrefix+'-'+String(n).padStart(2,'0');
    try{
      await col.doc(ref).set({ref,title:t,owner:document.getElementById('tkWho').value.trim()||'Unassigned',ball:document.getElementById('tkBall').value.trim()||document.getElementById('tkWho').value.trim(),area:document.getElementById('tkArea').value,
        status:'Open',next:document.getElementById('tkNext').value.trim(),order:n,updated:new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'})});
      e.target.reset(); msg.textContent='Added '+ref+'.'; document.getElementById('issModal').hidden=true;
    }catch(err){ msg.textContent='Could not add the item. You may have view-only access to this page.'; }
  });
  try{db.collection('sweeps').onSnapshot(sn=>{const L=norm(sn).sort((a,b)=>(b.at||0)-(a.at||0))[0];const el=document.getElementById('tkSweep');if(el&&!L){el.textContent='No full check recorded yet.';el.style.color='#9B1C1C';}if(el&&L)el.textContent=`Last full check: ${L.date||''} · ${L.checked||0} items checked · ${L.changed||0} changed`;},()=>{});}catch(e){}
  col.onSnapshot(snap=>{rows=norm(snap);render();},()=>{body.innerHTML='<tr><td colspan="5" class="note">The tracker could not load. Reload the page to try again.</td></tr>';});
})();
(function directory(){
  // Firms and people come from the project config. Unknown = "to confirm"; nothing guessed.
  const firms=CFG.team.firms;
  const P=CFG.team.people;
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
    p.t?`TITLE:${p.t}`:'',p.em?`EMAIL;TYPE=INTERNET,WORK:${p.em}`:'',p.ph?`TEL;TYPE=WORK,VOICE:${p.ph}`:'',f.ph&&f.ph!==p.ph?`TEL;TYPE=WORK,VOICE:${f.ph}`:'',p.cell?`TEL;TYPE=CELL:${p.cell}`:'',
    f.web?`URL:${f.web}`:'',`NOTE:${CFG.vcardNote} – ${f.g}${p.r?': '+p.r:''}`,'END:VCARD'].filter(Boolean).join('\r\n');};
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
    ${p.ph?`<div class="ln">${I.ph}${esc(p.ph)}</div>`:''}
    ${f.ph?`<div class="ln" title="Office main line">${I.ph}${esc(f.ph)}</div>`:(p.ph?'':'<div class="tbc">Phone to confirm</div>')}
    ${p.cell?`<div class="ln">${I.cell}${esc(p.cell)}</div>`:''}
    ${p.em?`<div class="ln">${I.em}${esc(p.em)}</div>`:'<div class="tbc">Email to confirm</div>'}
    <div class="acts"><button class="ib" type="button" data-vc="${p.id}" title="Add to Outlook (vCard)">${I.card}</button>${p.em?`<a class="ib" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(p.em)}" target="_blank" rel="noopener" title="Chat in Teams">${I.chat}</a>`:''}</div>
  </div>`;};
  const order=CFG.team.order;
  document.getElementById('dirList').innerHTML=order.map(k=>{const f=firms[k],ps=P.filter(p=>p.f===k);return `<section class="dgroup"><h3>${esc(f.g)} · ${esc(f.n)} <span>${[f.addr,f.ph||'Main line to confirm'].filter(Boolean).map(esc).join(' · ')}${f.web?` · <a href="${f.web}" target="_blank" rel="noopener">website ↗</a>`:''}</span></h3><div class="cards">${ps.map(card).join('')}</div></section>`;}).join('');
  const prof=document.getElementById('prof');
  function openProf(id){
    const p=P.find(x=>x.id===id);if(!p)return;const f=firms[p.f];
    document.getElementById('profPic').innerHTML=pic(p);
    document.getElementById('profGroup').textContent=f.g;
    document.getElementById('profName').textContent=full(p);
    document.getElementById('profTitle').textContent=(p.t||'Title to confirm')+' · '+f.n;
    document.getElementById('profDl').innerHTML=[['Project role',p.r],['Email',p.em||'To confirm'],['Phone',p.ph],['Office',f.ph||'To confirm'],['Cell',p.cell],['Office address',f.addr],['Company',f.web?`<a href="${f.web}" target="_blank" rel="noopener">${esc(f.n)} ↗</a>`:'']].filter(x=>x[1]).map(([a,b])=>`<dt>${a}</dt><dd>${a==='Company'?b:esc(b)}</dd>`).join('');
    document.getElementById('profBio').innerHTML=p.bio?`${esc(p.bio)} <a href="${p.src}" target="_blank" rel="noopener">Source ↗</a>`:'<span class="note">Bio to confirm.</span>';
    document.getElementById('profBtns').innerHTML=`<button class="btn go" type="button" data-vc="${p.id}">Add to Outlook (vCard)</button>${p.em?`<a class="btn" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(p.em)}" target="_blank" rel="noopener">Chat in Teams ↗</a>`:''}`;
    const q=document.getElementById('profQR');q.innerHTML='';
    try{ if(window.QRCode) new QRCode(q,{text:vcf(p).replace(/[\u2013\u2014]/g,'-').replace(/[^\x00-\x7F]/g,''),width:240,height:240,correctLevel:QRCode.CorrectLevel.L}); else q.innerHTML='<span class="note">QR unavailable</span>'; }catch(e){q.innerHTML='<span class="note">QR unavailable</span>';}
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
  document.getElementById('vcAll').addEventListener('click',()=>save(CFG.filePrefix+'_project_directory.vcf',P.map(vcf).join('\r\n')));

})();

// Paths to service (extra tab type "paths", playbook 1.12). CFG.paths: [{t, wr, goal, gs, icon, stages:[{n, cards:[[ref, short, [sheet ids]]]}]}].
// Cards are tracker items: status, date and owner come from the tracker; only the short label and the documents are config.
(function paths(){
  const el=document.getElementById('ppaths');if(!el||!(CFG.paths||[]).length)return;
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const firm=o=>{const m=String(o||'').match(/\(([^)]+)\)\s*$/);return m?m[1]:String(o||'Unassigned');};
  const IC={Done:['done','✓','Done'],Open:['open','○','Open'],Prereq:['pre','⧗','Prereq']};
  function draw(){
    const rows=window.jqIssues||[];if(!rows.length)return;const eff=window.jqEff||(r=>r.status||'Open');
    el.innerHTML=CFG.paths.map(p=>{
      const stages=p.stages.map(st=>({n:st.n,cards:st.cards.map(([ref,short,docs])=>({r:rows.find(x=>x.ref===ref),short,docs:docs||[]})).filter(c=>c.r)})).filter(st=>st.cards.length);
      const all=stages.flatMap(s=>s.cards),done=all.filter(c=>eff(c.r)==='Done').length,ok=all.length&&done===all.length;
      const cols=stages.map((st,i)=>{const d=st.cards.filter(c=>eff(c.r)==='Done').length;
        const cards=st.cards.map(({r,short,docs})=>{const e=eff(r),ic=IC[e]||IC.Open;const dt=e==='Done'&&r.confirmed?' · '+esc(r.confirmed):'';
          return `<button type="button" class="pp-card ${ic[0]}" data-ref="${esc(r.ref)}" title="${esc(r.ref)} · ${esc(r.title)}"><span class="s"><i class="pp-ic ${ic[0]}">${ic[1]}</i>${ic[2]}${dt}</span><b>${esc(short||r.title)}</b><span class="f"><span>${esc(firm(r.owner))}</span>${docs.length?`<span class="d" data-sheets="${esc(docs.join(','))}">${docs.length} doc${docs.length>1?'s':''}</span>`:''}</span></button>`;}).join('');
        return `${i?'<span class="pp-arrow" aria-hidden="true">→</span>':''}<div class="pp-st"><div class="pp-sh"><span class="n">${i+1}</span><span>${esc(st.n)}</span><span class="c">${d}/${st.cards.length}</span></div><div class="pp-col">${cards}</div></div>`;}).join('');
      return `<div class="pp"><div class="pp-h"><h3>${esc(p.t)}</h3><span class="pp-badge">${done}/${all.length} done</span><span class="note">${esc(p.wr||'')}</span></div><div class="pp-row">${cols}<span class="pp-arrow" aria-hidden="true">→</span><div class="pp-goal${ok?' ok':''}"><span class="i">${esc(p.icon||'⚡')}</span><b>${esc(p.goal)}</b><small>${esc(p.gs||'')}</small><small><strong>${done} of ${all.length} steps done</strong></small><span class="pp-bar"><i style="width:${all.length?Math.round(100*done/all.length):0}%"></i></span></div></div></div>`;
    }).join('');
  }
  window.addEventListener('jqissues',draw);draw();
  el.addEventListener('click',e=>{if(e.target.closest('[data-sheets]'))return;const b=e.target.closest('.pp-card');if(b&&window.jqGoRef)window.jqGoRef(b.dataset.ref);});
})();

// Critical path on Home (playbook 1.13). CFG.critical: {t, lede, deadline:{date, label}, goal, gs,
//   lanes:[{n, steps:[[ref, short]]}], merge:[[ref, short]]}. ref = "REF" (this site) or "col:REF" (a sister site's
//   tracker, e.g. "issues:N-24", "da_issues:D-05"). Bubbles take status from the tracker; nothing here is typed by hand.
(function critical(){
  const C=CFG.critical, el=document.getElementById('cpath'); if(!C||!el) return; el.hidden=false;
  const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const SITE={issues:['/', 'Nitto Watermain'], l152_issues:['/l152/', 'L152'], da_issues:['/da/', 'LakeView DA']};
  const other={}; const own=()=>window.jqIssues||[]; const eff=r=>(window.jqEff&&own().includes(r))?window.jqEff(r):(r.status||'Open');
  async function load(){
    const cols=[...new Set([...C.lanes.flatMap(l=>l.steps),...C.merge].map(([ref])=>ref.includes(':')?ref.split(':')[0]:null).filter(Boolean))];
    await Promise.all(cols.map(async col=>{try{const r=await fetch('/api/c/'+encodeURIComponent(col),{credentials:'same-origin',cache:'no-store'});if(r.ok){other[col]=(await r.json()).docs.map(d=>d.data);}}catch(e){}}));
    draw();
  }
  function find(ref){if(ref.includes(':')){const [col,id]=ref.split(':');return {r:(other[col]||[]).find(x=>x.ref===id),col,id};}return {r:own().find(x=>x.ref===ref),col:null,id:ref};}
  function bubble([ref,short]){const {r,col,id}=find(ref);const st=r?eff(r):'Open';const k=st==='Done'?'done':st==='Pending'?'pend':st==='Prereq'?'pre':'open';
    const site=col&&SITE[col]?SITE[col][1]+' · ':'';const tip=r?`${site}${id} · ${r.title}${r.ball&&st!=='Done'?' · ball: '+r.ball:''}`:`${site}${id}`;
    const when=st==='Done'&&r&&r.confirmed?r.confirmed:(r&&r.due&&st!=='Done'?'due '+r.due.slice(5).replace('-','/'):'');
    return `<button type="button" class="cp-b ${k}" data-ref="${esc(ref)}" title="${esc(tip)}"><i>${k==='done'?'✓':k==='pend'?'❙❙':k==='pre'?'⧗':'○'}</i><span>${esc(short)}</span>${when?`<em>${esc(when)}</em>`:''}${col?`<small>${esc(SITE[col]?SITE[col][1]:col)}</small>`:''}</button>`;}
  function draw(){
    const all=[...C.lanes.flatMap(l=>l.steps),...C.merge].map(s=>find(s[0]).r).filter(Boolean),done=all.filter(r=>eff(r)==='Done').length;
    let dl='';if(C.deadline){const d=Math.ceil((new Date(C.deadline.date+'T12:00:00')-new Date())/864e5);dl=`<span class="cp-dl${d<60?' hot':''}"><b>${d>0?d:0}</b> days to ${esc(C.deadline.label)}</span>`;}
    el.innerHTML=`<header class="cp-h"><div><span class="eyebrow">Critical path</span><h2>${esc(C.t)}</h2><p class="lede">${esc(C.lede||'')}</p></div>${dl}</header>
<div class="cp-grid"><div class="cp-lanes">${C.lanes.map(l=>`<div class="cp-lane"><span class="cp-ln">${esc(l.n)}</span><div class="cp-chain">${l.steps.map(bubble).join('<span class="cp-ar">→</span>')}</div></div>`).join('')}</div>
<div class="cp-join" aria-hidden="true"><span>All lanes finish</span></div>
<div class="cp-merge">${C.merge.map(bubble).join('<span class="cp-ar">→</span>')}<span class="cp-ar">→</span><div class="cp-goal${all.length&&done===all.length?' ok':''}"><b>${esc(C.goal)}</b><small>${esc(C.gs||'')}</small><small><strong>${done} of ${all.length} steps done</strong></small><span class="cp-bar"><i style="width:${all.length?Math.round(100*done/all.length):0}%"></i></span></div></div></div>
<div class="cp-leg"><span><i class="cp-i done">✓</i>Done</span><span><i class="cp-i open">○</i>Open</span><span><i class="cp-i pre">⧗</i>Prereq: waits on another step</span><span>Bubbles tagged with another site's name live on that site's tracker. Click any bubble to open it.</span></div>`;
  }
  el.addEventListener('click',e=>{const b=e.target.closest('.cp-b');if(!b)return;const ref=b.dataset.ref;
    if(ref.includes(':')){const [col,id]=ref.split(':');if(SITE[col])location.href=SITE[col][0]+'#tracker';return;}
    if(window.jqGoRef)window.jqGoRef(ref);});
  window.addEventListener('jqissues',draw); load();
})();

(function shell(){
  const tabs=[...document.querySelectorAll('.tab')], panels=[...document.querySelectorAll('.panel')];
  function show(name,scroll){
    if(!panels.some(p=>p.dataset.panel===name)) name='home';
    panels.forEach(p=>p.hidden=p.dataset.panel!==name);
    document.querySelector('.shell').classList.toggle('wide',name==='schedule'||(CFG.wideTabs||[]).includes(name));
    tabs.forEach(b=>{if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    try{sessionStorage.setItem((CFG.ns||'')+'jqTab',name)}catch(e){}
    if(scroll!==false) window.scrollTo(0,0);
    if(name==='schedule'&&window.jqFit) requestAnimationFrame(window.jqFit);
  }
  window.jqTab=show;
  tabs.forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
  let first=CFG.defaultTab||'home'; const h=location.hash.slice(1);
  if(h&&panels.some(p=>p.dataset.panel===h)) first=h; else { try{first=sessionStorage.getItem((CFG.ns||'')+'jqTab')||first}catch(e){} }
  show(first,false);
  window.jqShow=show;

  // search
  const q=document.getElementById('q'), res=document.getElementById('qres');
  const label=CFG.tabLabels;
  q.addEventListener('input',()=>{
    const s=q.value.trim().toLowerCase(); if(s.length<2){res.innerHTML='';return;}
    const els=[...document.querySelectorAll('.panel tbody tr, .panel li, .panel .pcard, .panel .ri, .panel .step, .panel section > header h2, .panel .g-row, .panel .act')];
    const hits=els.filter(e=>e.textContent.toLowerCase().includes(s)).slice(0,25);
    res.innerHTML=hits.length?hits.map((e,i)=>{const p=e.closest('.panel').dataset.panel;const txt=e.textContent.replace(/\s+/g,' ').trim().slice(0,90);return `<button type="button" data-i="${i}"><small>${label[p]}</small>${txt.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</button>`;}).join(''):'<span class="note">No matches.</span>';
    res.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const el=hits[+b.dataset.i];show(el.closest('.panel').dataset.panel,false);
      const d=el.closest('details');if(d)d.open=true; el.scrollIntoView({block:'center',behavior:'smooth'}); el.classList.add('hit'); setTimeout(()=>el.classList.remove('hit'),1800);};
  });

  // left-bar issue tracker grouped by discipline
  const DISC=CFG.disciplines;
  const discEl=document.getElementById('disc'); const openSet=new Set();
  let grp='area';
  function renderOwner(rows){
    const own=r=>String((r.owner&&String(r.owner).trim())||'Unassigned').split(/\s*[·,]\s*/).filter(Boolean);const names=[...new Set(rows.flatMap(own))];
    names.sort((a,b)=>a==='Unassigned'?1:b==='Unassigned'?-1:a==='Jason'?-1:b==='Jason'?1:a.localeCompare(b));
    discEl.innerHTML=names.map(n=>{const items=rows.filter(r=>own(r).includes(n)).sort(window.jqCmp);
      const open=items.filter(r=>r.status!=='Done').length;if(!open&&!items.length)return '';
      return `<details data-k="o:${esc(n)}"${(openSet.has('o:'+n)||(n==='Jason'&&!openSet.has('_x')))?' open':''}><summary>${esc(n)}<span><b>${open}</b> open / ${items.length}</span></summary><ul>${items.filter(r=>r.status!=='Done').map(r=>`<li class="${r.status==='Done'?'done':''}${r.pri?' pri':''}"><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" title="Priority: move to top" aria-pressed="${!!r.pri}">★</button><button type="button" data-ref="${esc(r._id)}"><i>${esc(r.ref||'')}</i><span>${esc(r.title)}${r.status!=='Done'&&window.jqWait&&window.jqWait(r).length?` <em class="pre" role="link" tabindex="0" data-pre="${window.jqNext(r).x.ref}">Prereq: ${esc(window.jqNext(r).x.ref)}${window.jqNext(r).more?' +'+window.jqNext(r).more:''}</em>`:''}</span></button></li>`).join('')}</ul>${items.filter(r=>r.status==='Done').length?`<button type="button" class="donelink" data-dl="owner:${esc(n)}">${items.filter(r=>r.status==='Done').length} completed →</button>`:''}</details>`;}).join('')||'<p class="note">No issues yet.</p>';}
  document.querySelector('.grpsw').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;grp=b.dataset.g;document.querySelectorAll('.grpsw button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderDisc();});
  function renderDisc(){
    const rows=window.jqIssues||[];if(grp==='owner'){renderOwner(rows);return;} const known=DISC.map(d=>d[0]);
    const groups=DISC.concat(rows.some(r=>!known.includes(r.area))?[['__other','Other']]:[]);
    discEl.innerHTML=groups.map(([k,n])=>{const items=rows.filter(r=>k==='__other'?!known.includes(r.area):r.area===k).sort(window.jqCmp);
      if(!items.length)return '';const open=items.filter(r=>r.status!=='Done').length;
      return `<details data-k="${k}"${openSet.has(k)?' open':''}><summary>${n}<span><b>${open}</b> open / ${items.length}</span></summary><ul>${items.filter(r=>r.status!=='Done').map(r=>`<li class="${r.status==='Done'?'done':''}${r.pri?' pri':''}"><button type="button" class="pri-b${r.pri?' on':''}" data-pid="${esc(r._id)}" title="Priority: move to top" aria-pressed="${!!r.pri}">★</button><button type="button" data-ref="${esc(r._id)}"><i>${esc(r.ref||'')}</i><span>${esc(r.title)}${r.status!=='Done'&&window.jqWait&&window.jqWait(r).length?` <em class="pre" role="link" tabindex="0" data-pre="${window.jqNext(r).x.ref}">Prereq: ${esc(window.jqNext(r).x.ref)}${window.jqNext(r).more?' +'+window.jqNext(r).more:''}</em>`:''}</span></button></li>`).join('')}</ul>${items.filter(r=>r.status==='Done').length?`<button type="button" class="donelink" data-dl="area:${esc(k)}">${items.filter(r=>r.status==='Done').length} completed →</button>`:''}</details>`;}).join('')||'<p class="note">No issues yet.</p>';
  }
  window.addEventListener('jqissues',renderDisc);
  discEl.addEventListener('toggle',e=>{const d=e.target;if(d.tagName==='DETAILS'){openSet.add('_x');d.open?openSet.add(d.dataset.k):openSet.delete(d.dataset.k);}},true);
  function goTo(id){if(window.jqOpenItem)window.jqOpenItem(id);}
  window.jqGoRef=ref=>{const r=(window.jqIssues||[]).find(x=>x.ref===ref);if(r){goTo(r._id);return;}const x=(window.jqX||[]).find(y=>y.ref===ref);if(x)location.href=x._x.path+'#ref='+encodeURIComponent(ref);};
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
    if(!db){document.getElementById('feedForm').hidden=true;feedEl.innerHTML='<li class="note">Sign in to see the feed.</li>';postsEl.innerHTML='<p class="note">Sign in to see the forum.</p>';form.hidden=true;return;}
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

(function drawings(){
  const SHEETS=window.NW_SHEETS.filter(s=>s.id.startsWith(CFG.drawings.prefix+'-')).map(s=>({id:s.lab.split(' ')[0],t:s.lab.split(' ').slice(1).join(' '),img:s.img,sid:s.id}));
  const tabs=document.getElementById('dwTabs'),view=document.getElementById('dwView'),img=document.getElementById('dwImg'),ttl=document.getElementById('dwTitle');
  tabs.innerHTML=SHEETS.map((s,i)=>`<button class="dw-tab" role="tab" data-i="${i}" aria-selected="false">${s.id}<small>${s.t}</small></button>`).join('');
  function show(i){const s=SHEETS[i];img.src=s.img;img.alt=s.id+' '+s.t;ttl.textContent=s.id+' · '+s.t;view.dataset.sid=s.sid;
    tabs.querySelectorAll('.dw-tab').forEach((b,k)=>b.setAttribute('aria-selected',String(k===i)));try{sessionStorage.setItem('jqSheet',i)}catch(e){}}
  tabs.addEventListener('click',e=>{const b=e.target.closest('.dw-tab');if(b)show(+b.dataset.i);});
  view.addEventListener('click',()=>{if(window.jqOpenSheets)window.jqOpenSheets(SHEETS.map(s=>s.sid),view.dataset.sid);});
  let n=0;try{n=+sessionStorage.getItem('jqSheet')||0}catch(e){} show(Math.min(n,SHEETS.length-1));
})();
(function drawingViewer(){
  let W=2016,H=1344,PW=2592,PH=1728,K=PW/W;
  const SHEETS=window.NW_SHEETS.map(x=>Object.assign({},x));
  let vis=[0];
  const PDF_URL='', SETDATE='';  // every sheet here is a rendered page (x:1); no vector base set
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
  function setSheet(i){sel=-1;txt.hidden=true;draft=null;sheet=i;const S=SHEETS[i];W=S.W||2016;H=S.H||1344;world.style.width=W+'px';world.style.height=H+'px';svg.setAttribute('viewBox','0 0 '+W+' '+H);img.src=S.img;{const o=$('dvOrig');if(o){o.hidden=!S.pdf;if(S.pdf)o.href=S.pdf+(S.pg?'#page='+S.pg:'');}}$('dvSheets').querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(+b.dataset.i===i)));draw();layers();}
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
  /* ---------- shared database: saved markup layers ---------- */
  (async()=>{
    try{db=window.claude?await window.claude.use('db'):null;user=window.claude?await window.claude.use('user'):null;dl=window.claude?await window.claude.use('downloads'):null;}catch(e){}
    try{me=user&&user.id?await user.id():null;}catch(e){}
    if(!db){say('Sign in to save markup layers. You can still draw and download a PDF.');$('dvSave').disabled=true;return;}
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
      pg.drawText(`${S0.id} ${S0.t} · ${S0.x?'':'PIDA '+SETDATE+' · '}markups from the ${CFG.name} project site · ${dateStr(Date.now())}${who?' · '+who:''}`,{x:24*(S0.x?K:1),y:10*(S0.x?K:1),size:11*(S0.x?K:1),font,color:rgb(.35,.4,.45)});
      if(rot[sheet])pg.setRotation(window.PDFLib.degrees(rot[sheet]));
      const bytes=await out.save();
      const blob=new Blob([bytes],{type:'application/pdf'});
      const fn=`${CFG.filePrefix}_${SHEETS[sheet].id}_${SHEETS[sheet].t.replace(/[^A-Za-z0-9]+/g,'_')}_markup.pdf`;
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
  const $=id=>document.getElementById(id);let db=null,list=[],cur=0,vPend=false;document.addEventListener('focusout',e=>{if(vPend&&e.target.matches&&e.target.matches('#vList [data-f=c]')){vPend=false;setTimeout(paint,0);}});
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
    return `<div class="vnext"><b>What I think happens next${v.rev?' (revised '+v.rev+(v.rev===1?' time':' times')+')':''}</b><div>${esc(p.summary)}</div>${(p.items||[]).map(it=>`<div>New item: ${esc(it.title)} · ${esc(it.owner||'Unassigned')} · ${esc(it.area||'')}${(it.blockedBy||[]).length?' · waits on '+esc(it.blockedBy.join(', ')):''}</div>`).join('')}${(p.itemUpdates||[]).map(u=>`<div>Update ${esc(u.ref)}: ${[u.status?'status → '+u.status:'',u.title?'title → '+u.title:'',u.owner?'owner → '+u.owner:'',u.ball?'ball → '+u.ball:'',u.now?'now: '+u.now:'',u.next?cut(u.next,160):''].filter(Boolean).map(esc).join(' · ')}</div>`).join('')}${v.lastComment?`<div class="vlc">${v.commentPending?'Sent to Claude, waiting for its revision: ':'Your last comment: '}${esc(v.lastComment)}${!v.commentPending&&v.reply?'<br>Claude: '+esc(v.reply):''}</div>`:''}</div>`;}
  const refsOf=v=>{const a=(v.refs||[]).slice();if(v.ref)a.push({label:'Tracker item '+v.ref,kind:'item'});return a;};
  function thumbs(v){const r=refsOf(v);if(!r.length)return '';
    return `<div class="vsrc"><span class="eyebrow">Where this came from · click to open</span><div class="vthumbs">${r.map((x,i)=>{
      const img=x.kind==='img'&&x.img?`<div class="vt-i" style="background-image:url('${esc(x.img)}');background-size:cover;background-position:left top"></div>`:x.kind==='sheet'&&x.ids&&x.ids[0]?`<div class="vt-i" style="background-image:url('${'sheets/'+esc(x.ids[0])}.jpg')"></div>`:x.kind==='text'&&x.body?`<div class="vt-i vt-doc"><div class="vt-dh">${MAIL}<span>${esc(x.title||x.label)}</span></div><div class="vt-dq"><mark>${esc(String(x.body).slice(0,260))}</mark></div></div>`:`<div class="vt-i">${x.kind==='item'?CLIP:MAIL}</div>`;
      return `<button type="button" class="vt" data-a="show" data-r="${i}">${img}<div class="vt-b">${esc(x.label)}</div></button>`;}).join('')}</div></div>`;}
  function showRef(v,r){
    const back=()=>{$('vRef').hidden=true;$('vModal').hidden=false;};const card=$('vRef').querySelector('.prof-card');card.style.maxWidth='720px';
    if(r.kind==='img'){card.style.maxWidth='1200px';$('vRefT').textContent=r.title||r.label;const im='<img src="'+esc(r.img)+'" alt="'+esc(r.label)+'" style="display:block;width:100%;border:1px solid #D5DDE5;border-radius:6px'+(r.href?';cursor:zoom-in':'')+'"'+(r.href?' title="Open the full document at this page"':'')+'>';$('vRefB').innerHTML=(r.href?'<a href="'+esc(r.href)+'" target="_blank" rel="noopener">'+im+'</a>':im)+(r.body?'<p style="margin-top:10px">'+esc(r.body)+'</p>':'')+(r.src?'<p class="note" style="margin-top:6px">Source: '+esc(r.src)+(r.href?' · <a href="'+esc(r.href)+'" target="_blank" rel="noopener">open the document ↗</a>':'')+'</p>':'');$('vModal').hidden=true;$('vRef').hidden=false;$('vRefX').onclick=back;$('vRef').onclick=e=>{if(e.target===$('vRef'))back();};return;}
    if(r.kind==='sheet'&&window.jqOpenSheets){$('vModal').hidden=true;window.jqOpenSheets(r.ids,r.ids[0],()=>{$('vModal').hidden=false;});return;}
    let title=r.title||r.label,body=r.body||'';
    if(r.kind==='item'){const is=(window.jqIssues||[]).find(x=>x.ref===v.ref);if(!is)return;title=is.ref+' '+is.title;body='Owner: '+(is.owner||'Unassigned')+'\nArea: '+(is.area||'')+'\nStatus: '+is.status+((is.blockedBy||[]).length?'\nWaits on: '+is.blockedBy.join(', '):'')+'\n\n'+(is.next||'No note yet.');}
    $('vRefT').textContent=title;if(r.kind==='text'){$('vRefB').innerHTML='<div class="vq-doc"><div class="vq-dh">'+esc(r.src||r.label)+'</div><mark>'+esc(body)+'</mark></div>';}else $('vRefB').textContent=body;$('vModal').hidden=true;$('vRef').hidden=false;
    $('vRefX').onclick=back;$('vRef').onclick=e=>{if(e.target===$('vRef'))back();};}
  function paint(){const n=list.length;$('vCount').textContent=n;$('vBtn').closest('.vbox').classList.toggle('has',n>0);$('vNote').textContent=n?(n+' item'+(n===1?'':'s')+' to confirm from new documents.'):'Nothing waiting.';{const fi=document.activeElement;if(fi&&fi.matches&&fi.matches('#vList [data-f=c]')){vPend=true;return;}}  // never redraw under the cursor; catch up when the box loses focus
    if(cur>=n)cur=Math.max(0,n-1);
    const old=document.querySelector('#vList .vq [data-f=c]'),oid=old&&old.closest('.vq').dataset.id,oval=old?old.value:'',hadFocus=!!old&&document.activeElement===old,ss=old?old.selectionStart:0,se=old?old.selectionEnd:0;
    if(!n){$('vList').innerHTML='<p class="note">Nothing waiting.</p>';return;}
    const v=list[cur],is=(window.jqIssues||[]).find(r=>r.ref===v.ref);
    const hdr=v.ref?`<span class="eyebrow">${esc(v.ref)} · ${esc(is?is.owner:'')}</span><h3>${esc(is?is.title:'')}</h3>`:`<span class="eyebrow">New follow-up from ${esc(v.doc)}</span>`;
    const foot=v.kind==='check'?`<button class="btn" data-a="skip" type="button">Skip</button><button class="btn go" data-a="apply" type="button">Apply changes</button>`:v.ref?(v.proposal&&v.proposal.invalid?`<button class="btn go" data-a="close" type="button">Dismiss invalid request</button>`:`<button class="btn" data-a="adv" type="button">Keep open and advance</button><button class="btn go" data-a="done" type="button">Close and advance</button>`):`<button class="btn" data-a="skip" type="button">Skip</button><button class="btn go" data-a="add" type="button">Add to tracker</button>`;
    $('vList').innerHTML=`<div class="vq vcard" data-id="${esc(v._id)}">
      <div class="vnav"><button type="button" data-a="prev" ${n<2?'disabled':''} aria-label="Previous request">‹</button><span>Request ${cur+1} of ${n}${Object.keys(VW).length?' · '+Object.keys(VW).length+' with Claude':''}</span><button type="button" data-a="nextr" ${n<2?'disabled':''} aria-label="Next request">›</button></div>
      <div class="vcol">${hdr}
      <div class="vwh"><span class="eyebrow">What happened · ${esc(v.doc)}</span><p>${esc(v.detail||v.evidence)}</p></div>
      ${thumbs(v)}</div>
      <div class="vcol">${vWorkHtml(v)}${proposalHtml(v)}
      <div class="vcomposer"><input data-f="c" value="${esc(oid===v._id?oval:'')}" placeholder="Correct me or add a step, then press Enter to send it to Claude" maxlength="400"><button type="button" class="vsend" data-a="revise" title="Send to Claude" aria-label="Send to Claude">&#10148;</button></div></div>
      <div class="vfoot"><div class="vfr">${foot}</div></div></div>`;
    const ci=document.querySelector('#vList [data-f=c]');if(ci&&oid===v._id&&hadFocus){ci.focus();try{ci.setSelectionRange(ss,se);}catch(e){}}}
  const upd=(id,d)=>db.collection('validations').doc(id).update(d);
  const VW={},VF={};let vws=null;
  function vSock(){if(vws&&vws.readyState<2)return;try{vws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/relay/page');}catch(e){return;}
    vws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}const NS=CFG.ns;if(m.col!==NS+'validations'||!VW[m.id])return;
      if(m.type==='working'){VW[m.id].s='working';paint();}
      if(m.type==='done'){delete VW[m.id];VF[m.id]=1;setTimeout(()=>{delete VF[m.id];paint();},5000);Promise.resolve(window.claudeRefresh&&window.claudeRefresh()).finally(paint);if(!Object.keys(VW).length)setTimeout(()=>{if(!Object.keys(VW).length&&vws)vws.close();},3000);}};
    vws.onclose=()=>{vws=null;};}
  function vWorkHtml(v){const w=VW[v._id];if(w&&v.commentPending===false)delete VW[v._id];
    if(VW[v._id]){const s=VW[v._id].s,t=s==='working'?'Claude is revising this request…':s==='queued'?'Queued. No Claude session is open right now; it will be revised when one is.':'Sent to Claude. You can go to the next request.';return `<div class="vwork${s==='queued'?' q':''}"><i></i><span>${t}</span></div>`;}
    return VF[v._id]?'<div class="vwork done"><span>Revised</span></div>':'';}
  async function applyProposal(v){const p=v.proposal;if(!p)return [];const rows=window.jqIssues||[];let n=rows.reduce((m,r)=>Math.max(m,parseInt(String(r.ref||'').replace(/\D/g,''))||0),0);const made=[];
    for(const it of (p.items||[])){if(!it.title)continue;n++;const ref=CFG.refPrefix+'-'+String(n).padStart(2,'0');await db.collection('issues').doc(ref).set({ref,title:it.title,owner:it.owner||'Unassigned',area:it.area||CFG.disciplines[0][0],status:'Open',next:it.next||'',order:n,updated:today(),blockedBy:it.blockedBy||[]});made.push(ref);}
    for(const u of (p.itemUpdates||[])){if(!u.ref)continue;const P={};['next','title','owner','status','now','ball','due'].forEach(k=>{if(u[k]!=null&&u[k]!=='')P[k]=String(u[k]);});if(Array.isArray(u.blockedBy))P.blockedBy=u.blockedBy;if(P.status==='Pending'||P.status==='Prereq')P.status='Open';if(P.status&&!['Open','Done'].includes(P.status))delete P.status;if(Object.keys(P).length){P.updated=today();await db.collection('issues').doc(u.ref).update(P);}}
    return made;}
  function buildPrompt(v,c){const rows=(window.jqIssues||[]),is=rows.find(r=>r.ref===v.ref)||{};
    const slim=rows.filter(r=>r.status!=='Done').map(r=>({ref:r.ref,title:cut(r.title,100),owner:r.owner,area:r.area,blockedBy:r.blockedBy||[]}));
    return `You help Jason Lueders (Director of Construction, Zilber Property Group) keep the tracker for ${CFG.trackerFor} correct. A validation card shows something that happened, what the tracker will do next, and Jason's comment. Revise the proposed outcome so it follows Jason's comment exactly. Return JSON only, no other text: {"invalid":false,"summary":"1 to 3 plain sentences: what happens to the item and what happens next","items":[{"title":"","owner":"","area":"","blockedBy":["${CFG.refPrefix}-00"]}],"itemUpdates":[{"ref":"${CFG.refPrefix}-00","next":"note text","now":"optional one-sentence current state","status":"optional Open|Done","ball":"optional who moves next","title":"optional new title","owner":"optional new owner"}]}. Use empty arrays when nothing is added. Omit optional fields you are not changing.
Rules: owner is the person who does the action (never put ZPG's action under another party). Use blockedBy with existing refs when a step cannot start until another finishes, so nobody gets an item they cannot act on yet. One item per hand-off; do not duplicate an existing open item (update it instead). Areas allowed (use the exact key): ${CFG.areasText}. Do not invent steps Jason did not ask for. If his comment adds an interim step or a follow-up (for example an email to send), add it as an item. If Jason says the request itself is wrong, does not apply, or the premise is mistaken, set "invalid":true, make the summary say plainly that nothing changes in the tracker and why in his words, and return empty arrays. Plain wording, short.
ITEM: ${JSON.stringify({ref:v.ref,title:is.title,owner:is.owner,area:is.area,status:is.status,next:cut(is.next,400),blockedBy:is.blockedBy||[]})}
WHAT HAPPENED (${v.doc}): ${v.detail||v.evidence}
CURRENT PROPOSAL: ${v.proposal&&v.proposal.summary?JSON.stringify(v.proposal):(v.ref?'Close the item and unblock anything waiting on it.':'Add this follow-up to the tracker: '+(v.nextTitle||''))}
JASON'S COMMENT: ${c}
OPEN ITEMS: ${JSON.stringify(slim)}`;}
  async function revise(v,card){const ci=card.querySelector('[data-f=c]'),c=ci?ci.value.trim():'';
    if(!c){$('vNote').textContent='Type a comment first, then press Enter.';return;}
    let sample=null;try{sample=window.claude?await window.claude.use('sample'):null;}catch(e){}
    if(!sample){try{const res=await upd(v._id,{lastComment:c,commentPending:true,commentAt:Date.now()});ci.value='';ci.blur();const k=res&&res.claude;if(k==null){$('vNote').textContent='Sent to Claude. The revised request shows here when a Claude session picks it up.';return;}VW[v._id]={s:k>0?'sent':'queued',at:Date.now()};if(k>0)vSock();$('vNote').textContent=k>0?'Sent to Claude. You can go to the next request.':'Saved. No Claude session is open; it will be revised when one is.';paint();}catch(err){$('vNote').textContent='That comment did not save. You may have view-only access.';}return;}
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
    try{
      if(a==='done'||a==='adv'){const ci=card.querySelector('[data-f=c]'),c=ci?ci.value.trim():'';
        const iu={updated:today()};
        if(a==='done')iu.status='Done';
        if(c)iu.next='Update from '+v.doc+': '+c;
        await db.collection('issues').doc(v.ref).update(iu);
        if(a==='done'&&window.jqFeed)window.jqFeed(v.ref+' done: '+String(v.doc).slice(0,50));
        let made=[];if(v.proposal)made=await applyProposal(v);
        await upd(v._id,{answer:a,comment:c,answeredAt:Date.now(),nextDone:true,applied:made,state:'resolved',at:Date.now()});return;}
      if(a==='apply'){const ci=card.querySelector('[data-f=c]'),c=ci?ci.value.trim():'';const made=await applyProposal(v);await upd(v._id,{answer:'apply',comment:c,answeredAt:Date.now(),nextDone:true,applied:made,state:'resolved',at:Date.now()});return;}
      if(a==='add'){let made=[];
        if(v.proposal&&((v.proposal.items||[]).length||(v.proposal.itemUpdates||[]).length))made=await applyProposal(v);
        else if(v.nextTitle){const rows=window.jqIssues||[],n=rows.reduce((m,r)=>Math.max(m,parseInt(String(r.ref||'').replace(/\D/g,''))||0),0)+1,ref=CFG.refPrefix+'-'+String(n).padStart(2,'0');
          await db.collection('issues').doc(ref).set({ref,title:v.nextTitle,owner:v.nextOwner||'Unassigned',area:v.nextArea||CFG.disciplines[0][0],status:'Open',next:'',order:n,updated:today()});made=[ref];}
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