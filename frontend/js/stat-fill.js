// Волновая заливка статистики «Сроки» — ФИНАЛЬНАЯ версия.
// Цвета задаются ИНЛАЙН-стилями (макс. приоритет, перебьют любой CSS),
// а оба текстовых слоя — position:absolute (из CSS) + эталонный HTML,
// поэтому маска точная и слои никогда не разъезжаются. ПК + клон в шторке.
(function(){
  var CFG = [
    { color:'emerald', num:'stat-valid',             pct:'stat-valid-pct',   label:'В порядке',    bg:'#ecfdf5', base:'#059669', grad:'linear-gradient(135deg,#10b981 0%,#059669 100%)' },
    { color:'sky',     num:'stat-empty',             pct:'stat-empty-pct',   label:'Пустые',       bg:'#f0f9ff', base:'#0284c7', grad:'linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)' },
    { color:'rose',    num:'stat-needs-replacement', pct:'stat-needs-pct',   label:'Заменить',     bg:'#fff1f2', base:'#e11d48', grad:'linear-gradient(135deg,#f43f5e 0%,#e11d48 100%)' },
    { color:'slate',   num:'stat-neutral',           pct:'stat-neutral-pct', label:'Проверить',    bg:'#f1f5f9', base:'#475569', grad:'linear-gradient(135deg,#64748b 0%,#475569 100%)' }
  ];
  var STRIP = ['bg-gradient-to-br','text-white','shadow-sm','p-5',
    'from-emerald-500','to-emerald-600','from-sky-500','to-sky-600',
    'from-rose-500','to-rose-600','from-slate-500','to-slate-600'];
  function pcGrid(view){ return view.querySelector('.dl-stats-grid') || view.querySelector('.grid.grid-cols-4'); }
  function origInner(card){
    if (card.dataset.sfOrig) return card.dataset.sfOrig;
    var h = card.innerHTML;
    if (h.indexOf('stat-layer-base') !== -1) return null;
    card.dataset.sfOrig = h;
    return h;
  }
  function applyColors(card, base, fill, c){
    card.style.background = c.bg;
    if (base) base.style.color = c.base;
    if (fill){ fill.style.background = c.grad; fill.style.color = '#fff'; }
  }
  function wrap(card, c){
    if (card.querySelector('.stat-layer-base')){
      applyColors(card, card.querySelector('.stat-layer-base'), card.querySelector('.stat-layer-fill'), c);
      return;
    }
    var inner = origInner(card);
    if (!inner) return;
    STRIP.forEach(function(k){ card.classList.remove(k); });
    card.classList.add('stat-fill-card');
    card.dataset.color = c.color;
    var base = document.createElement('div');
    base.className = 'stat-layer stat-layer-base';
    base.style.color = c.base;
    base.innerHTML = inner;
    var fill = document.createElement('div');
    fill.className = 'stat-layer stat-layer-fill';
    fill.style.background = c.grad;
    fill.style.color = '#fff';
    fill.innerHTML = inner;
    fill.querySelectorAll('[id]').forEach(function(el){ el.id = el.id + '-fill'; });
    card.innerHTML = '';
    card.appendChild(base);
    card.appendChild(fill);
    applyColors(card, base, fill, c);
  }
  function build(){
    var view = document.getElementById('view-deadlines'); if (!view) return false;
    var grid = pcGrid(view); if (!grid) return false;
    var cards = grid.querySelectorAll(':scope > div'); var ok = false;
    for (var i = 0; i < cards.length && i < CFG.length; i++){ wrap(cards[i], CFG[i]); ok = true; }
    var body = view.querySelector('.dl-sheet-body');
    if (body && !body.querySelector('.dl-stats-clone')){
      var clone = document.createElement('div'); clone.className = 'dl-stats-clone';
      clone.innerHTML = CFG.map(function(c, i){
        return '<div class="stat-fill-card dl-clone-card" data-color="'+c.color+'" data-idx="'+i+'" style="background:'+c.bg+'">'
          + '<div class="stat-layer stat-layer-base" style="color:'+c.base+'"><span class="dl-clone-label">'+c.label+'</span><span class="dl-clone-num">0</span></div>'
          + '<div class="stat-layer stat-layer-fill" style="background:'+c.grad+';color:#fff"><span class="dl-clone-label">'+c.label+'</span><span class="dl-clone-num">0</span></div>'
          + '</div>';
      }).join('');
      body.appendChild(clone); ok = true;
    }
    if (window.lucide) lucide.createIcons();
    sync(); return ok;
  }
  function setText(el, v){ if (el && el.textContent !== v) el.textContent = v; }
  function sync(){
    var view = document.getElementById('view-deadlines'); if (!view) return;
    var grid = pcGrid(view); if (!grid) return;
    var cards = grid.querySelectorAll(':scope > div.stat-fill-card');
    var clones = view.querySelectorAll('.dl-clone-card');
    for (var i = 0; i < cards.length && i < CFG.length; i++){
      var c = CFG[i];
      var base = cards[i].querySelector('.stat-layer-base');
      var fill = cards[i].querySelector('.stat-layer-fill');
      if (!base || !fill) continue;
      applyColors(cards[i], base, fill, c);
      var pctEl = base.querySelector('#' + c.pct); var pct = 0;
      if (pctEl){ var m = (pctEl.textContent || '').match(/(\d+)/); if (m) pct = Math.max(0, Math.min(100, parseInt(m[1], 10))); }
      cards[i].style.setProperty('--fill', pct + '%');
      var numEl = base.querySelector('#' + c.num); var numText = numEl ? numEl.textContent : '';
      setText(fill.querySelector('#' + c.num + '-fill'), numText);
      var cc = clones[i];
      if (cc){ cc.style.setProperty('--fill', pct + '%'); cc.querySelectorAll('.dl-clone-num').forEach(function(n){ setText(n, numText); }); }
    }
  }
  var obs = false;
  function attach(){
    if (obs) return; var view = document.getElementById('view-deadlines'); if (!view) return; obs = true;
    var raf = 0;
    new MutationObserver(function(){ if (raf) return; raf = requestAnimationFrame(function(){ raf = 0; sync(); }); })
      .observe(view, { childList:true, subtree:true, characterData:true });
  }
  function start(){
    attach(); build();
    var t = 0, iv = setInterval(function(){ t++; if (build() || t > 40) clearInterval(iv); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  if (window.App && App.events) App.events.on('route:change', function(){ setTimeout(build, 80); });
  window.AppStatFill = { build:build, sync:sync };
})();
