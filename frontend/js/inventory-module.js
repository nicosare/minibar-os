App.inventoryModule = (() => {
const api = () => window.api;
const { escapeHtml, pluralize } = window.AppUtils;
const colorMap = { amber:'bg-amber-50', red:'bg-red-50', blue:'bg-blue-50', yellow:'bg-yellow-50', purple:'bg-purple-50', emerald:'bg-emerald-50', rose:'bg-rose-50', orange:'bg-orange-50', slate:'bg-slate-100' };
let products = [], entries = {}, isInitialized = false, isLoaded = false, drawerBuilt = false;
const getColorClass = c => colorMap[c] || 'bg-slate-100';
const parseCount = v => { const n = parseInt(String(v).replace(/\D/g,''),10); return Number.isFinite(n)&&n>0?n:0; };
const getEntry = id => entries[id] || { a:'', b:'' };
const getQtySum = id => { const {a,b}=getEntry(id); return parseCount(a)+parseCount(b); };
const getTotalVolume = p => getQtySum(p.id)*(parseFloat(p.volume)||0);
const formatVolume = (p,t) => t ? `${t.toLocaleString('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:3})} ${p.unit||'шт'}` : '';
const filled = v => v !== '';
const orderedProducts = () => products.slice();
function renderProducts(){
  const c = document.getElementById('inventory-products-container'); if(!c) return;
  if(!products.length){ c.innerHTML='<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>'; return; }
  c.innerHTML = orderedProducts().map(p => {
    const e = getEntry(p.id), qty = getQtySum(p.id), vol = getTotalVolume(p), em = p.emoji||p.name.charAt(0).toUpperCase();
    const fA = filled(e.a), fB = filled(e.b);
    const cls = (fA&&fB)?'inv-both':((fA||fB)?'inv-one':'');
    return `<div class="product-card inv-card ${qty>0?'has-qty':''} ${cls}" data-product-id="${p.id}">
      <div class="inv-id">
        <div class="inv-emo ${getColorClass(p.bgColor)}">${em}</div>
        <div class="inv-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
      </div>
      <div class="inv-controls">
        <div class="inv-field-wrap"><span class="inv-field-label">На складе</span>
          <input type="text" class="inv-field" maxlength="4" placeholder="0" value="${e.a}" data-product-id="${p.id}" data-field="a" inputmode="numeric" autocomplete="off" /></div>
        <span class="inv-plus">+</span>
        <div class="inv-field-wrap"><span class="inv-field-label">Bartech</span>
          <input type="text" class="inv-field" maxlength="4" placeholder="0" value="${e.b}" data-product-id="${p.id}" data-field="b" inputmode="numeric" autocomplete="off" /></div>
        <div class="inv-result"><span class="inv-eq">=</span><span class="inv-result-qty">${qty}</span><span class="inv-result-vol">${qty>0?formatVolume(p,vol):''}</span></div>
      </div>
    </div>`;
  }).join('');
}
function onInvKey(e){
  const f = e.target.closest('.inv-field'); if(!f) return;
  const cont = document.getElementById('inventory-products-container'); if(!cont) return;
  const cards = Array.from(cont.querySelectorAll('.inv-card'));
  const card = f.closest('.inv-card'); const ci = cards.indexOf(card); if(ci<0) return;
  const field = f.dataset.field;
  let tci = -1, tfield = field;
  if(e.key==='ArrowDown'){ e.preventDefault(); tci = ci+1; }
  else if(e.key==='ArrowUp'){ e.preventDefault(); tci = ci-1; }
  else if(e.key==='Enter'){ e.preventDefault();
    for(let k=ci+1;k<cards.length;k++){
      const a=cards[k].querySelector('.inv-field[data-field="a"]'), b=cards[k].querySelector('.inv-field[data-field="b"]');
      if(a&&a.value===''){tci=k;tfield='a';break;}
      if(b&&b.value===''){tci=k;tfield='b';break;}
    }
    if(tci<0 && ci+1<cards.length){ tci=ci+1; tfield='a'; }
  }
  if(tci>=0 && cards[tci]){ const tf = cards[tci].querySelector('.inv-field[data-field="'+tfield+'"]'); if(tf){ tf.focus(); try{tf.select();}catch(_){} } }
}
function updateProductSummary(id){
  const p = products.find(x=>x.id===id), card = document.querySelector(`.inv-card[data-product-id="${id}"]`);
  if(!p||!card) return;
  const e = getEntry(id), qty = getQtySum(id), vol = getTotalVolume(p);
  const fA = filled(e.a), fB = filled(e.b);
  const q = card.querySelector('.inv-result-qty'), v = card.querySelector('.inv-result-vol');
  if(q) q.textContent = qty; if(v) v.textContent = qty>0?formatVolume(p,vol):'';
  card.classList.toggle('has-qty', qty>0);
  card.classList.toggle('inv-one', (fA&&!fB)||(!fA&&fB));
  card.classList.toggle('inv-both', fA&&fB);
}
function getSummaryEntries(){
  return orderedProducts().filter(p=>getQtySum(p.id)>0).map(p=>({product:p, qty:getQtySum(p.id), volume:getTotalVolume(p)}));
}
function renderSummary(){
  const list = getSummaryEntries();
  const totalQty = list.reduce((s,e)=>s+e.qty,0);
  const totalVol = list.reduce((s,e)=>s+e.volume,0);
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  const rows = list.map(e=>`<div class="bill-row"><div class="bill-row-info"><div class="bill-row-name">${escapeHtml(e.product.name)}</div><div class="bill-row-meta">${e.qty} шт</div></div><div class="bill-row-sum">${formatVolume(e.product,e.volume)}</div></div>`).join('');
  const emptyEl = document.getElementById('inventory-summary-empty'), listEl = document.getElementById('inventory-summary-list');
  if(emptyEl) emptyEl.classList.toggle('hidden', list.length>0);
  if(listEl){ listEl.classList.toggle('hidden', list.length===0); listEl.innerHTML = rows; }
  set('inventory-total-count', totalQty);
  set('inventory-total-volume', totalVol.toLocaleString('ru-RU',{maximumFractionDigits:2}));
  const bar = document.getElementById('inventory-mobile-bar'); if(bar) bar.classList.toggle('hidden', list.length===0);
  set('inventory-mobile-count', totalQty>0 ? totalQty+' шт' : '0 шт');
  const tc = document.getElementById('inventory-toggle-count');
  if(tc){ if(totalQty>0){ tc.textContent = totalQty; tc.classList.remove('hidden'); } else tc.classList.add('hidden'); }
  const ml = document.getElementById('inventory-summary-modal-list');
  if(ml) ml.innerHTML = list.length===0 ? '<div class="text-center py-8 text-slate-400 text-sm">Нет введённых данных</div>' : rows;
}
function clearAll(){ entries={}; renderProducts(); renderSummary(); }
async function loadProducts(){
  const c = document.getElementById('inventory-products-container');
  try { products = await api().getProducts(); isLoaded=true; renderProducts(); renderSummary(); }
  catch(err){ console.error(err); if(c) c.innerHTML='<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>'; }
}
function openSummaryModal(){ document.getElementById('inventory-summary-modal')?.classList.remove('hidden'); }
function closeSummaryModal(){ document.getElementById('inventory-summary-modal')?.classList.add('hidden'); }
// ── Ящик сводки: сосед main справа (не внутри скролла контента) → не уезжает при прокрутке ──
function buildDrawer(){
  if(drawerBuilt) return;
  const view = document.getElementById('view-inventory'); if(!view) return;
  const aside = view.querySelector('.side-panel'); const main = document.querySelector('main');
  if(!aside || !main) return;
  const drawer = document.createElement('div');
  drawer.id = 'inv-drawer'; drawer.className = 'inv-drawer';
  main.after(drawer);
  drawer.appendChild(aside);
  const header = aside.querySelector('.side-panel-header');
  if(header && !header.querySelector('.inv-drawer-close')){
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'inv-drawer-close'; close.setAttribute('aria-label','Закрыть сводку');
    close.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
    close.addEventListener('click', closeDrawer);
    header.appendChild(close);
  }
  drawerBuilt = true;
  if(window.lucide) lucide.createIcons();
}
function openDrawer(){ const d=document.getElementById('inv-drawer'); if(d){ d.classList.add('open'); if(window.lucide) lucide.createIcons(); } }
function closeDrawer(){ const d=document.getElementById('inv-drawer'); if(d) d.classList.remove('open'); }
function toggleDrawer(){ const d=document.getElementById('inv-drawer'); if(!d) return; d.classList.contains('open') ? closeDrawer() : openDrawer(); }
function setupListeners(){
  if(isInitialized) return;
  document.getElementById('inventory-clear-btn')?.addEventListener('click', ()=>{ if(Object.keys(entries).length===0) return; if(confirm('Очистить все введённые данные?')) clearAll(); });
  document.getElementById('inventory-summary-toggle')?.addEventListener('click', toggleDrawer);
  document.getElementById('inventory-mobile-expand')?.addEventListener('click', openSummaryModal);
  document.getElementById('inventory-summary-modal-close')?.addEventListener('click', closeSummaryModal);
  document.getElementById('inventory-summary-modal-backdrop')?.addEventListener('click', closeSummaryModal);
  document.getElementById('inventory-summary-modal-clear')?.addEventListener('click', ()=>{ if(Object.keys(entries).length===0) return; if(confirm('Очистить все введённые данные?')){ clearAll(); closeSummaryModal(); } });
  document.getElementById('inventory-products-container')?.addEventListener('input', e=>{
    const inp = e.target.closest('.inv-field'); if(!inp) return;
    const id = parseInt(inp.dataset.productId,10), field = inp.dataset.field;
    inp.value = inp.value.replace(/\D/g,'').slice(0,4);
    if(!entries[id]) entries[id]={a:'',b:''};
    entries[id][field]=inp.value;
    if(!entries[id].a && !entries[id].b) delete entries[id];
    updateProductSummary(id); renderSummary();
  });
  document.getElementById('inventory-products-container')?.addEventListener('keydown', onInvKey);
  if(window.App && App.events) App.events.on('route:change', r => { if(r!=='inventory') closeDrawer(); });
  isInitialized = true;
}
function init(){ buildDrawer(); setupListeners(); if(!isLoaded) loadProducts(); else { renderProducts(); renderSummary(); } }
return { init, clearAll };
})();
