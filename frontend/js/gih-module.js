// МОДУЛЬ GIH — фабрика (тап по продукту) → черновик → сохранённая запись
App.gihModule = (() => {
const api = () => window.api;
const { escapeHtml, pluralize, showToast } = window.AppUtils;
const colorMap = { amber:'bg-amber-50', red:'bg-red-50', blue:'bg-blue-50', yellow:'bg-yellow-50', purple:'bg-purple-50', emerald:'bg-emerald-50', rose:'bg-rose-50', orange:'bg-orange-50', slate:'bg-slate-100' };
const cc = c => colorMap[c] || 'bg-slate-100';
const emo = p => (p && p.emoji) || (p && p.name ? p.name.charAt(0) : '•');
const CATS = ['Дверца','Напитки','Алкоголь','Соки'];
const CYCLE = ['pending','replenished','in_place','out','not_replenished'];
const ITEM = { pending:{cls:'gih-st-pending'}, replenished:{cls:'gih-st-replenished'}, in_place:{cls:'gih-st-inplace'}, out:{cls:'gih-st-out'}, not_replenished:{cls:'gih-st-not'} };
const ITEM_FULL = { pending:'Не размечено', replenished:'Пополнено', in_place:'На месте', out:'Выложили', not_replenished:'Не пополнено' };
const MODES = [ {key:'dnd',label:'DND'}, {key:'all_in_place',label:'Всё на месте'}, {key:'all_out',label:'Всё выложили'}, {key:'empty',label:'Опустошён'} ];
const MODE_LABEL = { dnd:'DND', all_in_place:'Всё на месте', all_out:'Всё выложили', empty:'Опустошён' };
let rooms = [], drafts = [], dones = [];
let factoryOpen = false;
let factory = { roomId:null, input:'', counts:{}, editId:null, _mode:null, _notes:'' };
let loaded = false, bound = false;
const $ = id => document.getElementById(id);
const productsDirty = d => (d.gihItems||[]).some(it => it.itemStatus !== 'pending');
const modeActive = d => !!d._mode;
const canSave = d => modeActive(d) || ((d.gihItems||[]).length>0 && (d.gihItems||[]).every(it=>it.itemStatus!=='pending'));
const timeStr = iso => { if(!iso) return ''; const d=new Date(iso); return d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); };
const dateShort = () => { const d=new Date(); const p=(n)=>String(n).padStart(2,'0'); return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2); };
const roomById = id => rooms.find(r=>r.id===id);
function norm(c){
  return { id:c.id, roomId:c.roomId, number:c.room?c.room.number:'—', date:c.checkDate||c.createdAt,
    gihRoomStatus:c.gihRoomStatus, notes:c.notes||'', _mode:c.gihRoomStatus||null,
    gihItems:(c.gihItems||[]).map(it=>({ id:it.id, productId:it.productId, name:it.product?it.product.name:'Продукт', emoji:it.product?it.product.emoji:null, bgColor:it.product?it.product.bgColor:'slate', itemStatus:it.itemStatus||'pending' })) };
}
async function load(){
  try{
    const [r, checks] = await Promise.all([ api().getRooms(), api().getGihChecks() ]);
    rooms = r||[]; const all = checks||[];
    drafts = all.filter(c=>(c.status||'draft')==='draft').map(norm);
    dones = all.filter(c=>(c.status||'draft')==='done').map(norm);
    loaded = true; render();
    if (App.badges) App.badges.update('gih');
  }catch(err){ console.error('GIH load error', err); showToast('Не удалось загрузить GIH'); }
}
function render(){
  const td = document.getElementById('gih-title-date'); if (td) td.textContent = dateShort();
  const sub = $('gih-date');
  if (sub) sub.textContent = drafts.length+' '+pluralize(drafts.length,['черновик','черновика','черновиков'])+' · '+dones.length+' '+pluralize(dones.length,['закрыта','закрыты','закрытых']);
  renderFactory(); renderDrafts(); renderDones();
  if (window.lucide) lucide.createIcons();
}
function renderFactory(){
  const box = $('gih-factory'); if(!box) return;
  if(!factoryOpen){ box.classList.add('hidden'); box.innerHTML=''; return; }
  box.classList.remove('hidden');

  const prevInput = $('gih-finput');
  const wasFocused = !!prevInput && document.activeElement === prevInput;
  const caretStart = prevInput ? prevInput.selectionStart : 0;
  const caretEnd = prevInput ? prevInput.selectionEnd : 0;

  const room = factory.roomId ? roomById(factory.roomId) : null;
  const items = room && room.template ? (room.template.items||[]) : [];
  const byCat = {};
  items.forEach(it=>{ const c=(it.product&&it.product.category)||'Напитки'; (byCat[c]=byCat[c]||[]).push(it); });
  const totalQty = Object.values(factory.counts).reduce((s,n)=>s+(n||0),0);
  const prodCount = Object.values(factory.counts).filter(n=>n>0).length;
  const gridHtml = room
    ? (CATS.filter(c=>byCat[c]&&byCat[c].length).map(c=>`
      <div class="gih-fcat">
        <div class="gih-fcat-t">${c}</div>
        <div class="gih-fcat-grid">
          ${byCat[c].map(it=>{ const pid=it.productId; const q=factory.counts[pid]||0; const max=it.qty||99;
            return `<button type="button" class="gih-fitem${q>0?' has':''}" data-act="ftap" data-pid="${pid}" data-max="${max}">
              <span class="gih-fitem-emo ${cc(it.product.bgColor)}">${emo(it.product)}</span>
              <span class="gih-fitem-name" title="${escapeHtml(it.product.name)}">${escapeHtml(it.product.name)}</span>
              <span class="gih-fitem-q${q>0?'':' zero'}">${q}</span>
            </button>`; }).join('')}
        </div>
      </div>`).join('')) || '<div class="gih-fempty">У этого номера нет шаблона наполнения</div>'
    : '<div class="gih-fempty">Введите номер, чтобы увидеть продукты его шаблона</div>';
  const isEdit = !!factory.editId;
  box.innerHTML = `
    <div class="gih-fhead">
      <div class="gih-ac-field">
        <i data-lucide="search" class="w-4 h-4 gih-ac-ico"></i>
        <input id="gih-finput" class="gih-ac-input" inputmode="numeric" autocomplete="off" placeholder="Номер комнаты…" value="${escapeHtml(factory.input||'')}">
        <div id="gih-ac" class="gih-ac"></div>
      </div>
      <button type="button" class="gih-x" data-act="fclose" aria-label="Закрыть"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <div class="gih-fbody">
      <div class="gih-fgrid">${gridHtml}</div>
    </div>
    <div class="gih-ffoot">
      <span class="gih-ffoot-info">${room?('<b>'+escapeHtml(String(room.number))+'</b> · '):''}${prodCount} ${pluralize(prodCount,['позиция','позиции','позиций'])} · ${totalQty} шт</span>
      <button type="button" class="btn btn-primary" data-act="fcreate" ${factory.roomId&&totalQty>0?'':'disabled'}><i data-lucide="${isEdit?'save':'plus'}" class="w-4 h-4"></i> ${isEdit?'Сохранить изменения':'Создать запись'}</button>
    </div>`;

  if (wasFocused) {
    const nextInput = $('gih-finput');
    if (nextInput) {
      requestAnimationFrame(() => {
        nextInput.focus();
        try { nextInput.setSelectionRange(caretStart, caretEnd); } catch (_) {}
      });
    }
  }

  if (window.lucide) lucide.createIcons();
}

function acHtml(val){
  const v=(val||'').trim(); if(!v) return '';
  const matches = rooms.filter(r=>String(r.number).startsWith(v)).slice(0,8);
  if(!matches.length) return '<div class="gih-ac-empty">Номер не найден</div>';
  return '<div class="gih-ac-list">'+matches.map(r=>`<button type="button" class="gih-ac-item" data-act="fpick" data-rid="${r.id}"><span class="gih-ac-num">${r.number}</span><span class="gih-ac-cat">${r.category==='lux'?'Люкс':'Стандарт'}</span></button>`).join('')+'</div>';
}
function selectRoom(id){
  factory.roomId=id; factory.counts={};
  const r=roomById(id); factory.input = r?String(r.number):factory.input;
  const currentInput = $('gih-finput');
  const shouldKeepFocus = !!currentInput && document.activeElement === currentInput;
  renderFactory();
  if (shouldKeepFocus) {
    const nextInput = $('gih-finput');
    if (nextInput) {
      requestAnimationFrame(() => {
        nextInput.focus();
        try { nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length); } catch (_) {}
      });
    }
  }
  const ac=$('gih-ac'); if(ac) ac.innerHTML='';
}
function legendWrap(){
  return `<div class="gih-legend">
    <span><i class="gih-lg-replenished"></i>Пополнено</span>
    <span><i class="gih-lg-inplace"></i>На месте</span>
    <span><i class="gih-lg-out"></i>Выложили</span>
    <span><i class="gih-lg-not"></i>Не пополнено</span></div>`;
}
function pillHtml(it, disabled){
  const m = ITEM[it.itemStatus]||ITEM.pending;
  return `<button type="button" class="gih-pill ${m.cls}" data-act="pill" data-iid="${it.id}" ${disabled?'disabled':''} title="${ITEM_FULL[it.itemStatus]}">
    <span class="gih-pill-emo ${cc(it.bgColor)}">${emo(it)}</span><span class="gih-pill-name">${escapeHtml(it.name)}</span></button>`;
}
function noteBtnHtml(d){
  return `<button type="button" class="gih-note-btn" data-act="notes" data-did="${d.id}">${(d.notes&&d.notes.trim())?escapeHtml(d.notes):'Добавить комментарий'}</button>`;
}
function pillsWrap(d){
  const mOn = modeActive(d);
  const inner = (d.gihItems||[]).length ? d.gihItems.map(it=>pillHtml(it, mOn)).join('') : '<div class="gih-mini-empty">Нет позиций</div>';
  return `<div class="gih-pills${mOn?' locked':''}" data-role="pills" data-did="${d.id}">${inner}</div>`;
}
function modesWrap(d){
  const pDirty = productsDirty(d);
  const inner = MODES.map(m=>`<button type="button" class="gih-mode${pDirty?'':(d._mode===m.key?' on gih-m-'+m.key:'')}" data-act="mode" data-mode="${m.key}" ${pDirty?'disabled':''}>${m.label}</button>`).join('');
  return `<div class="gih-modes${pDirty?' locked':''}" data-role="modes" data-did="${d.id}">${inner}</div>`;
}
function footWrap(d){
  const ok = canSave(d);
  if(!ok) return '';
  return `<div class="gih-card-foot" data-role="foot" data-did="${d.id}"><button type="button" class="btn btn-primary gih-save" data-act="save" data-id="${d.id}"><span class="gih-save-icon"><i data-lucide="save" class="w-4 h-4"></i></span> <span>Сохранить</span></button></div>`;
}
function patchDraftCard(d){
  const root = document.querySelector('.gih-card[data-did="'+d.id+'"]'); if(!root) return;
  const p=root.querySelector('[data-role="pills"]'); if(p) p.outerHTML=pillsWrap(d);
  const m=root.querySelector('[data-role="modes"]'); if(m) m.outerHTML=modesWrap(d);
  const n=root.querySelector('.gih-note-btn'); if(n) n.outerHTML = noteBtnHtml(d);
  const f=root.querySelector('[data-role="foot"]');
  const footHtml = footWrap(d);
  if(f){
    f.outerHTML = footHtml;
  } else if(footHtml){
    // if footer didn't exist (was hidden), append it and recreate icons
    root.insertAdjacentHTML('beforeend', footHtml);
    if (window.lucide) lucide.createIcons();
  }
}
function draftHtml(d){
  return `<div class="gih-card gih-draft" data-did="${d.id}">
    <div class="gih-card-head">
      <div class="gih-card-num">${escapeHtml(String(d.number))}</div>
      <span class="gih-card-time">${timeStr(d.date)}</span>
      <div class="gih-card-actions">
        <button type="button" class="gih-iconbtn" data-act="edit-draft" data-id="${d.id}" title="Редактировать"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button type="button" class="gih-iconbtn" data-act="del" data-id="${d.id}" title="Удалить"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    </div>
    ${pillsWrap(d)}
    ${modesWrap(d)}
    <button type="button" class="gih-note-btn" data-act="notes" data-did="${d.id}">${(d.notes||'').trim()?escapeHtml(d.notes): 'Добавить комментарий'}</button>
    ${legendWrap()}
    ${footWrap(d)}
  </div>`;
}
function renderDrafts(){
  const box=$('gih-drafts'); if(!box) return;
  if(!drafts.length){
    box.innerHTML = (!dones.length && !factoryOpen) ? `<div class="gih-empty"><div class="gih-empty-orb"><i data-lucide="clipboard-check" class="w-7 h-7"></i></div><div class="gih-empty-t">Нет активных проверок</div><div class="gih-empty-s">Создайте новую запись, чтобы начать проверку минибаров</div></div>` : '';
    if (window.lucide) lucide.createIcons(); return;
  }
  box.innerHTML = `<div class="gih-zone-t"><span>Несохранённые</span><b>${drafts.length}</b></div><div class="gih-cards">${drafts.map(draftHtml).join('')}</div>`;
  if (window.lucide) lucide.createIcons();
}
function formatDoneItems(items){
  const groups = {};
  items.forEach(it => {
    const status = it.itemStatus || 'pending';
    groups[status] = groups[status] || {};
    groups[status][it.name] = (groups[status][it.name] || 0) + 1;
  });
  const order = ['replenished','in_place','out','not_replenished','pending'];
  return order.filter(k => groups[k]).map(k => {
    const productList = Object.entries(groups[k]).map(([name,qty]) => qty > 1 ? `${escapeHtml(name)} х${qty}` : escapeHtml(name));
    const cls = 'gih-st-'+(k==='in_place'?'inplace':k==='not_replenished'?'not':k);
    return `<div class="gih-done-line ${cls}"><span class="gih-done-k ${cls}">${ITEM_FULL[k]||k}</span><span class="gih-done-v">${productList.join(', ')}</span></div>`;
  }).join('');
}
function formatDoneText(items){
  const groups = {};
  items.forEach(it => { groups[it.name] = (groups[it.name] || 0) + 1; });
  return Object.entries(groups).map(([name,qty]) => qty>1?`${escapeHtml(name)} х${qty}`:escapeHtml(name)).join(', ');
}
function doneBody(d){
const items = d.gihItems||[];
const itemsText = formatDoneText(items);
const modeTag = d.gihRoomStatus ? `<span class="gih-mode-tag gih-m-${d.gihRoomStatus}">${MODE_LABEL[d.gihRoomStatus]||d.gihRoomStatus}</span>` : '';
const note = (d.notes && d.notes.trim()) ? `<div class="gih-done-note">${escapeHtml(d.notes)}</div>` : '';
if (d.gihRoomStatus) {
  const comment = itemsText ? `<div class="gih-done-comment">${itemsText}</div>` : '';
  return `<div class="gih-done-products gih-done-withmode">${modeTag}${comment}${note}</div>`;
}
const itemsHtml = formatDoneItems(items);
const productsBlock = itemsHtml ? `<div class="gih-done-products">${itemsHtml}</div>` : '<div class="gih-mini-empty">Нет данных</div>';
return productsBlock + note;
}

function doneHtml(d){
  return `<div class="gih-card gih-done" data-did="${d.id}">
    <div class="gih-card-head">
      <div class="gih-card-num">${escapeHtml(String(d.number))}</div>
      <span class="gih-card-time">${timeStr(d.date)}</span>
      <div class="gih-card-actions">
        <button type="button" class="gih-iconbtn" data-act="edit" data-id="${d.id}" title="Редактировать"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button type="button" class="gih-iconbtn" data-act="del" data-id="${d.id}" title="Удалить"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    </div>
    <div class="gih-done-body">${doneBody(d)}</div>
  </div>`;
}
function renderDones(){
  const box=$('gih-dones'); if(!box) return;
  if(!dones.length){ box.innerHTML=''; return; }
  box.innerHTML = `<div class="gih-zone-t"><span>Сохранённые</span><b>${dones.length}</b></div><div class="gih-cards">${dones.map(doneHtml).join('')}</div>`;
  if (window.lucide) lucide.createIcons();
}
async function createFactory(){
  if(!factory.roomId) return;
  const items = Object.entries(factory.counts).filter(([_,q])=>q>0).map(([pid,q])=>({productId:parseInt(pid,10), qty:q}));
  if(!items.length){ showToast('Добавьте хотя бы одну позицию'); return; }
  try{
    if(factory.editId){
      await api().updateGihCheck(factory.editId, { roomId:factory.roomId, gihItems:items, status:'draft', gihRoomStatus:factory._mode||null, notes:(factory._notes&&factory._notes.trim())?factory._notes.trim():null });
      showToast('Черновик обновлён');
    } else {
      await api().createGihCheck({ roomId:factory.roomId, type:'gih', status:'draft', gihItems:items });
      showToast('Запись создана');
    }
    factory={ roomId:null, input:'', counts:{}, editId:null, _mode:null, _notes:'' }; factoryOpen=false; await load();
  }catch(err){ console.error(err); showToast('Не удалось сохранить'); }
}
function openFactoryEdit(d){
  const counts={}; (d.gihItems||[]).forEach(it=>{ counts[it.productId]=(counts[it.productId]||0)+1; });
  factory={ editId:d.id, roomId:d.roomId, input:String(d.number), counts:counts, _mode:d._mode, _notes:d.notes||'' };
  factoryOpen=true; render();
}
async function saveDraft(id){
  const d=drafts.find(x=>x.id===id); if(!d||!canSave(d)) return;
  const payload={ status:'done', gihRoomStatus:d._mode||null, notes:(d.notes&&d.notes.trim())?d.notes.trim():null, pills: d._mode ? [] : d.gihItems.map(it=>({ id:it.id, itemStatus:it.itemStatus })) };
  try{ await api().updateGihCheck(id, payload); showToast('Сохранено'); await load(); }
  catch(err){ console.error(err); showToast('Не удалось сохранить'); }
}
async function editDone(id){
  try{ await api().updateGihCheck(id, { status:'draft', gihRoomStatus:null }); showToast('Открыто для редактирования'); await load(); }
  catch(err){ console.error(err); showToast('Не удалось открыть'); }
}
async function del(id){
  if(!confirm('Удалить запись?')) return;
  try{ await api().deleteGihCheck(id); await load(); }
  catch(err){ console.error(err); showToast('Не удалось удалить'); }
}
function bind(){
  if(bound) return; bound=true;
  $('gih-new-btn')?.addEventListener('click', ()=>{ factoryOpen=!factoryOpen; if(factoryOpen) factory={roomId:null,input:'',counts:{},editId:null,_mode:null,_notes:''}; render(); if(factoryOpen){ const i=$('gih-finput'); if(i) i.focus(); } });
  const fac=$('gih-factory');
  fac?.addEventListener('click', e=>{
    const b=e.target.closest('[data-act]'); if(!b) return; const act=b.dataset.act;
    if(act==='fclose'){ factoryOpen=false; render(); return; }
    if(act==='fpick'){ selectRoom(parseInt(b.dataset.rid,10)); return; }
    if(act==='ftap'){ const pid=+b.dataset.pid; const max=+b.dataset.max||99; let q=factory.counts[pid]||0; q = q>=max?0:q+1; factory.counts[pid]=q; renderFactory(); return; }
    if(act==='fcreate'){ createFactory(); return; }
  });
  fac?.addEventListener('input', e=>{
    if(e.target.id!=='gih-finput') return;
    factory.input=e.target.value; const v=factory.input.trim();
    const exact=v?rooms.find(r=>String(r.number)===v):null;
    if(exact){ selectRoom(exact.id); return; }
    // avoid full re-render on each keystroke to preserve focus
    factory.roomId=null; factory.counts={}; const caret=e.target.selectionStart;
    const ac=$('gih-ac'); if(ac) ac.innerHTML=acHtml(v);
    try{ e.target.setSelectionRange(caret, caret); }catch(_){}
  });
  const dr=$('gih-drafts');
  dr?.addEventListener('click', e=>{
    const b=e.target.closest('[data-act]'); if(!b) return; const act=b.dataset.act;
    const card=b.closest('.gih-card'); const did=card?parseInt(card.dataset.did,10):NaN; const d=drafts.find(x=>x.id===did);
    if(act==='del'){ del(did); return; }
    if(!d) return;
    if(act==='edit-draft'){ openFactoryEdit(d); return; }
    if(act==='save'){ saveDraft(d.id); return; }
    if(act==='notes'){ const next = window.prompt('Комментарий к номеру', d.notes||''); if(next===null) return; d.notes=next; patchDraftCard(d); return; }
    if(act==='mode'){ if(productsDirty(d))return; const k=b.dataset.mode; d._mode=d._mode===k?null:k; patchDraftCard(d); return; }
    if(act==='pill'){ if(modeActive(d))return; const iid=parseInt(b.dataset.iid,10); const it=d.gihItems.find(x=>x.id===iid); if(!it)return; const i=CYCLE.indexOf(it.itemStatus); it.itemStatus=CYCLE[(i+1)%CYCLE.length]; patchDraftCard(d); return; }
  });
  const dn=$('gih-dones');
  dn?.addEventListener('click', e=>{
    const b=e.target.closest('[data-act]'); if(!b) return; const id=parseInt(b.dataset.id,10);
    if(b.dataset.act==='edit') editDone(id);
    if(b.dataset.act==='del') del(id);
  });
}
function init(){ bind(); load(); }
App.badges.register('gih', async ()=>{
  if(!loaded){ try{ const checks=await api().getGihChecks(); const all=checks||[]; drafts=all.filter(c=>(c.status||'draft')==='draft').map(norm); dones=all.filter(c=>(c.status||'draft')==='done').map(norm); loaded=true; }catch(e){ return 0; } }
  return drafts.length;
});
return { init, refresh: load };
})();
