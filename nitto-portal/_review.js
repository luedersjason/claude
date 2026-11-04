(function(){
  var BODY = document.body ? document.body.innerHTML : '';
  var SKEL = (function(){try{var s=document.head&&document.head.querySelector('style');return s?s.textContent:''}catch(e){return ''}})();
  var D = JSON.parse(document.getElementById('decisions').textContent);
  var LABEL = {open:['n','Open'],accept:['g','Accepted'],change:['g','Accepted w/ changes'],reject:['r','Rejected'],discuss:['a','Discuss']};
  var dirty = false, art = null;

  function paint(){
    var n = {accept:0,change:0,reject:0,discuss:0,open:0}, total = 0;
    document.querySelectorAll('.ri').forEach(function(el){
      var k = el.dataset.k, d = D[k] || {dec:'open',note:''}; total++; n[d.dec] = (n[d.dec]||0)+1;
      var t = el.querySelector('.rs'), l = LABEL[d.dec] || LABEL.open;
      t.className = 'tag rs ' + l[0]; t.textContent = l[1];
      el.querySelectorAll('.dec button').forEach(function(b){ b.classList.toggle('on', b.dataset.d === d.dec) });
      var ta = el.querySelector('.dnote'); if (ta && document.activeElement !== ta) ta.value = d.note || '';
    });
    var c = document.getElementById('rcount');
    if (c) c.textContent = (n.accept+n.change) + ' accepted · ' + n.reject + ' rejected · ' + n.discuss + ' to discuss · ' + n.open + ' open of ' + total;
    var bar = document.getElementById('savebar');
    if (bar) bar.hidden = !dirty;
  }

  document.addEventListener('click', function(e){
    var b = e.target.closest('.dec button');
    if (b){ var k = b.closest('.ri').dataset.k; D[k] = D[k] || {dec:'open',note:''};
      D[k].dec = (D[k].dec === b.dataset.d) ? 'open' : b.dataset.d; dirty = true; paint(); return; }
    if (e.target.id === 'r-open'){ document.querySelectorAll('.ri').forEach(function(x){x.open=true}); return; }
    if (e.target.id === 'r-close'){ document.querySelectorAll('.ri').forEach(function(x){x.open=false}); return; }
    if (e.target.id === 'savebtn') save();
  });
  document.addEventListener('input', function(e){
    if (!e.target.classList.contains('dnote')) return;
    var k = e.target.closest('.ri').dataset.k; D[k] = D[k] || {dec:'open',note:''};
    D[k].note = e.target.value; dirty = true; document.getElementById('savebar').hidden = false;
  });

  function msg(t){ var m = document.getElementById('savemsg'); if (m) m.textContent = t; }
  async function save(){
    if (!art){ msg('Saving is only available in the Claude preview link. Your choices are still shown here.'); return; }
    var btn = document.getElementById('savebtn'); btn.disabled = true; btn.textContent = 'Saving…';
    var json = JSON.stringify(D).replace(/</g,'\\u003c');
    var body = BODY.replace(/(<script type="application\/json" id="decisions">)[\s\S]*?(<\/script>)/, function(_,a,b){ return a + json + b; });
    var doc = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' + SKEL + '</style></head><body>' + body + '</body></html>';
    try { await art.publish(doc); dirty = false; msg('Saved.'); }
    catch(err){ btn.disabled = false; btn.textContent = 'Save decisions';
      var c = err && err.code;
      if (c === 'conflict') msg('Someone else saved first. The page is reloading their version; re-apply your change.');
      else if (c === 'not_writer' || c === 'not_granted') msg('You can view this page but not save decisions.');
      else msg('Save failed (' + (c || 'error') + '). Your choices are still here; try again.'); }
  }

  paint();
  if (window.claude && window.claude.use){
    window.claude.use('artifact').then(function(a){ art = a; }).catch(function(){});
  }
})();
