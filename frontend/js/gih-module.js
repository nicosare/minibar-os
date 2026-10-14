// МОДУЛЬ GIH — фабрика (тап по продукту) → черновик → сохранённая запись
App.gihModule = (() => {
const api = () => window.api;
const { escapeHtml, pluralize, showToast } = window.AppUtils;
const colorMap = { amber:'bg-amber-50', red:'bg-red-50', blue:'bg-blue-50', yellow:'bg-yellow-50', purple:'bg-purple-50', emerald:'bg-emerald-50', rose:'bg-rose-50', orange:'bg-orange-50', slate:'bg-slate-100' };
const cc = c => colorMap[c] || 'bg-slate-100';
const emo = p => (p && p.emoji) || (p && p.name ? p.name.charAt(0) : '•');
const CATS = ['Дверца','Напитки','Алкоголь','Соки'];
const CYCLE = ['pending','replenished','in_place','out','not_replenished'];
const modeItemStatus = mode => mode === 'all_in_place' ? 'in_place' : mode === 'all_out' ? 'out' : null;
const effectiveItemStatus = (item, mode) => modeItemStatus(mode) || (item && item.itemStatus) || 'pending';
const ITEM = { pending:{cls:'gih-st-pending'}, replenished:{cls:'gih-st-replenished'}, in_place:{cls:'gih-st-inplace'}, out:{cls:'gih-st-out'}, not_replenished:{cls:'gih-st-not'} };
const ITEM_FULL = { pending:'Не размечено', replenished:'Пополнено', in_place:'На месте', out:'Выложили', not_replenished:'Не пополнено' };
const MODES = [ {key:'dnd',label:'DND'}, {key:'all_in_place',label:'Всё на месте'}, {key:'all_out',label:'Всё выложили'}, {key:'empty',label:'Опустошён'} ];
const MODE_LABEL = { dnd:'DND', all_in_place:'Всё на месте', all_out:'Всё выложили', empty:'Опустошён', not_checked:'Не проверен' };
let rooms = [], drafts = [], dones = [];
const recentHistoryCache = new Map();
let dayRolloverTimer = null;
let factory = { roomId:null, input:'', counts:{}, editId:null, _mode:null, _notes:'' };
let loaded = false, bound = false;
const locallyEditedDraftIds = new Set();
const $ = id => document.getElementById(id);
const productsDirty = d => (d.gihItems||[]).some(it => it.itemStatus !== 'pending');
const modeActive = d => !!d._mode;
const canSave = d => modeActive(d) || ((d.gihItems||[]).length>0 && (d.gihItems||[]).every(it=>it.itemStatus!=='pending'));
const timeStr = iso => { if(!iso) return ''; const d=new Date(iso); return d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); };
const dateShort = () => { const d=new Date(); const p=(n)=>String(n).padStart(2,'0'); return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2); };
const roomById = id => rooms.find(r=>r.id===id);
function recentEntryHtml(check) {
  const date = new Date(check.checkDate || check.createdAt || '');
  const validDate = Number.isFinite(date.getTime());
  const dateText = validDate
    ? date.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' +
      date.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })
    : 'Дата неизвестна';
  let summaryText = 'Проверка';
  let summaryHtml = '<span class="gih-recent-operation">Проверка</span>';
  if (check.type === 'emptied' || check.type === 'vk_emptied') {
    summaryText = 'Опустошение';
    summaryHtml = '<span class="gih-recent-empty-operation">Опустошение</span>';
  } else if (check.type === 'gih') {
    const mode = check.gihRoomStatus;
    if (mode) {
      summaryText = 'GIH · ' + (MODE_LABEL[mode] || mode);
      summaryHtml = '<span class="gih-recent-prefix">GIH</span><span class="gih-recent-separator"> · </span><span class="gih-recent-mode">' + escapeHtml(MODE_LABEL[mode] || mode) + '</span>';
    } else {
      const labels = {
        replenished:'Пополнено',
        in_place:'На месте',
        out:'Выложили',
        not_replenished:'Не пополнено',
        pending:'Не размечено'
      };
      const groups = {};
      (Array.isArray(check.gihItems) ? check.gihItems : []).forEach(item => {
        const status = item.itemStatus || 'pending';
        const name = item.productName || (item.product && item.product.name) || 'Продукт';
        (groups[status] = groups[status] || {});
        groups[status][name] = (groups[status][name] || 0) + 1;
      });
      const order = ['replenished','in_place','out','not_replenished','pending'];
      const details = order.filter(status => groups[status] && Object.keys(groups[status]).length).map(status => {
        const products = Object.entries(groups[status]).map(([name, qty]) => escapeHtml(name) + (qty > 1 ? ' ×' + qty : '')).join(', ');
        return {
          text: labels[status] + ': ' + Object.entries(groups[status]).map(([name, qty]) => name + (qty > 1 ? ' ×' + qty : '')).join(', '),
          html: '<span class="gih-recent-status gih-recent-' + status + '">' + labels[status] + ':</span> <span class="gih-recent-products">' + products + '</span>'
        };
      });
      summaryText = 'GIH · ' + (details.map(item => item.text).join(' · ') || 'Нет позиций');
      summaryHtml = '<span class="gih-recent-prefix">GIH</span><span class="gih-recent-separator"> · </span>' +
        (details.map(item => item.html).join('<span class="gih-recent-separator"> · </span>') || '<span class="gih-recent-operation">Нет позиций</span>');
    }
  }
  const note = String(check.notes || '').trim();
  const plainText = dateText + ' · ' + summaryText + (note ? ' · ' + note.replace(/\s+/g, ' ') : '');
  return '<div class="gih-room-recent-entry" title="' + escapeHtml(plainText) + '">' +
    '<span class="gih-room-recent-date">' + escapeHtml(dateText) + '</span>' +
    '<span class="gih-recent-separator">·</span>' +
    '<span class="gih-room-recent-summary">' + summaryHtml + '</span>' +
    (note ? '<span class="gih-room-recent-note">· ' + escapeHtml(note).replace(/\s*\n\s*/g, ' ') + '</span>' : '') +
    '</div>';
}
function recentHistoryContent(roomId) {
  const state = recentHistoryCache.get(Number(roomId));
  if (!state || state.loading) return '<span class="gih-room-recent-empty">Загрузка истории…</span>';
  if (state.error) return '<span class="gih-room-recent-empty">История недоступна</span>';
  if (!state.items.length) return '<span class="gih-room-recent-empty">Записей пока нет</span>';
  return state.items.map(recentEntryHtml).join('');
}
function updateRecentHistoryStrip(roomId) {
  const strip = $('gih-room-recent');
  const content = $('gih-room-recent-items');
  if (!strip || !content || strip.dataset.roomId !== String(roomId)) return;
  content.innerHTML = recentHistoryContent(roomId);
}
function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '';
  return String(date.getFullYear()).padStart(4, '0') + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}
function isToday(value) {
  const key = localDayKey(value);
  return !!key && key === localDayKey(new Date());
}
function scheduleDayRollover() {
  if (dayRolloverTimer) window.clearTimeout(dayRolloverTimer);
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  dayRolloverTimer = window.setTimeout(async () => {
    await load();
    scheduleDayRollover();
  }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
}
async function loadRecentRoomHistory(roomId) {
  const id = Number(roomId);
  const current = recentHistoryCache.get(id);
  if (current && (current.loading || current.loaded)) return;
  recentHistoryCache.set(id, { loading:true, loaded:false, error:false, items:[] });
  try {
    // Keep UI-refresh errors inside the same guard as network errors so the strip
    // never remains stuck at "Загрузка истории…" after a failed refresh.
    updateRecentHistoryStrip(id);
    const currentApi = api();
    if (!currentApi || typeof currentApi.getRoomHistory !== 'function') {
      throw new Error('API helper getRoomHistory is unavailable');
    }
    const response = await currentApi.getRoomHistory(id);
    const items = Array.isArray(response) ? response : (Array.isArray(response && response.items) ? response.items : []);
    items.sort((a, b) => {
      const aTime = new Date(a.checkDate || a.createdAt || 0).getTime() || 0;
      const bTime = new Date(b.checkDate || b.createdAt || 0).getTime() || 0;
      return bTime - aTime || Number(b.id || 0) - Number(a.id || 0);
    });
    recentHistoryCache.set(id, { loading:false, loaded:true, error:false, items:items.slice(0, 3) });
  } catch (error) {
    console.error('GIH recent room history error', error);
    recentHistoryCache.set(id, { loading:false, loaded:true, error:true, items:[] });
  }
  updateRecentHistoryStrip(id);
}
function norm(c){
  return { id:c.id, roomId:c.roomId, number:c.room?c.room.number:'—', date:c.checkDate||c.createdAt,
    gihRoomStatus:c.gihRoomStatus, notes:c.notes||'', _mode:c.gihRoomStatus||null,
    gihItems:(c.gihItems||[]).map(it=>{ const hasSnapshot=it.productName!==null && it.productName!==undefined; return { id:it.id, productId:it.productId, name:hasSnapshot?it.productName:(it.product?it.product.name:'Продукт'), emoji:hasSnapshot?it.productEmoji:(it.product?it.product.emoji:null), bgColor:hasSnapshot?it.productBgColor:(it.product?it.product.bgColor:'slate'), itemStatus:it.itemStatus||'pending' }; }) };
}
async function load(){
  const previousDrafts = drafts.slice();
  const localDraftById = new Map(previousDrafts.map(d => [d.id, d]));
  try {
    const [r, checks] = await Promise.all([api().getRooms(), api().getGihChecks()]);
    rooms = r || [];
    // If the user entered an exact room number before the room list finished loading,
    // resolve it now instead of requiring them to retype it.
    const typedRoomNumber = String(factory.input || '').trim();
    const exactTypedRoom = typedRoomNumber ? rooms.find(room => String(room.number) === typedRoomNumber) : null;
    if (!factory.roomId && exactTypedRoom) {
      factory.roomId = exactTypedRoom.id;
      factory.input = String(exactTypedRoom.number);
      factory.counts = {};
    }
    let all = checks || [];
    const today = localDayKey(new Date());
    const expiredDrafts = all.filter(c => {
      if ((c.status || 'draft') !== 'draft') return false;
      const createdDay = localDayKey(c.createdAt || c.checkDate);
      return !!createdDay && createdDay < today;
    });

    let archivedAny = false;
    for (const check of expiredDrafts) {
      const local = localDraftById.get(check.id);
      try {
        await api().updateGihCheck(check.id, {
          status: 'done',
          gihRoomStatus: 'not_checked',
          notes: local ? (local.notes || null) : (check.notes || null)
        });
        archivedAny = true;
        locallyEditedDraftIds.delete(check.id);
      } catch (archiveError) {
        // Keep the record in the database and retry on the next refresh.
        console.error('Не удалось перенести старый черновик GIH в историю:', check.id, archiveError);
      }
    }
    if (archivedAny) all = (await api().getGihChecks()) || all;

    const nextDrafts = all.filter(c =>
      (c.status || 'draft') === 'draft' && isToday(c.createdAt || c.checkDate)
    ).map(norm);
    const nextDones = all.filter(c =>
      (c.status || 'draft') === 'done' &&
      c.gihRoomStatus !== 'not_checked' &&
      isToday(c.checkDate || c.createdAt)
    ).map(norm);
    const nextDraftById = new Map(nextDrafts.map(d => [d.id, d]));

    // A remote invalidation must not erase unsaved edits in an open GIH draft.
    for (const id of [...locallyEditedDraftIds]) {
      const remote = nextDraftById.get(id);
      const local = localDraftById.get(id);
      if (!remote || !local) {
        locallyEditedDraftIds.delete(id);
        continue;
      }
      nextDraftById.set(id, {
        ...remote,
        ...local,
        id: remote.id,
        roomId: remote.roomId,
        number: remote.number,
        date: remote.date
      });
    }

    drafts = nextDrafts.map(d => nextDraftById.get(d.id) || d);
    dones = nextDones;
    loaded = true;
    render();
    if (App.badges) App.badges.update('gih');
  } catch (err) {
    console.error('GIH load error', err);
    showToast('Не удалось загрузить GIH');
  }
}
function render(){
  const td = document.getElementById('gih-title-date'); if (td) td.textContent = dateShort();
  const sub = $('gih-date');
  if (sub) sub.textContent = drafts.length+' '+pluralize(drafts.length,['черновик','черновика','черновиков'])+' · '+dones.length+' '+pluralize(dones.length,['закрыта','закрыты','закрытых']);
  if (factory.roomId) loadRecentRoomHistory(factory.roomId);
  renderFactory(); renderDrafts(); renderDones();
  if (window.lucide) lucide.createIcons();
}
function renderFactory(){
  const box = $('gih-factory'); if(!box) return;
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
    : '';
  const isEdit = !!factory.editId;
  box.innerHTML = `
    <div class="gih-fhead">
      <div class="gih-ac-field">
        <i data-lucide="search" class="w-4 h-4 gih-ac-ico"></i>
        <input id="gih-finput" class="gih-ac-input" inputmode="numeric" autocomplete="off" placeholder="Номер комнаты…" value="${escapeHtml(factory.input||'')}">
      </div>
    </div>
    ${room ? `<div class="gih-room-recent" id="gih-room-recent" data-room-id="${room.id}">
      <button type="button" class="gih-room-recent-open" data-act="open-room-history" data-history-room-id="${room.id}" data-history-room-number="${escapeHtml(String(room.number))}" title="Открыть историю номера" aria-label="Открыть историю номера"><i data-lucide="history" class="w-4 h-4"></i></button>
      <div class="gih-room-recent-items" id="gih-room-recent-items" aria-live="polite">${recentHistoryContent(room.id)}</div>
    </div>` : ''}
    <div class="gih-fbody">
      <div id="gih-fgrid" class="gih-fgrid">${gridHtml}</div>
    </div>
    <div class="gih-ffoot">
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

function selectRoom(id){
  factory.roomId=id; factory.counts={};
  const r=roomById(id); factory.input = r?String(r.number):factory.input;
  loadRecentRoomHistory(id);
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
}
function legendWrap(){
  return `<div class="gih-legend">
    <span><i class="gih-lg-replenished"></i>Пополнено</span>
    <span><i class="gih-lg-inplace"></i>На месте</span>
    <span><i class="gih-lg-out"></i>Выложили</span>
    <span><i class="gih-lg-not"></i>Не пополнено</span></div>`;
}
function pillHtml(it, disabled, mode){
  const status = effectiveItemStatus(it, mode);
  const m = ITEM[status]||ITEM.pending;
  return `<button type="button" class="gih-pill ${m.cls}" data-act="pill" data-iid="${it.id}" ${disabled?'disabled':''} title="${ITEM_FULL[status]}">
    <span class="gih-pill-emo ${cc(it.bgColor)}">${emo(it)}</span><span class="gih-pill-name">${escapeHtml(it.name)}</span></button>`;
}
function noteBtnHtml(d){
  return `<button type="button" class="gih-note-btn" data-act="notes" data-did="${d.id}">${(d.notes&&d.notes.trim())?escapeHtml(d.notes):'Добавить комментарий'}</button>`;
}
function pillsWrap(d){
  const mOn = modeActive(d);
  const inner = (d.gihItems||[]).length ? d.gihItems.map(it=>pillHtml(it, mOn, d._mode)).join('') : '<div class="gih-mini-empty">Нет позиций</div>';
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
      <button type="button" class="gih-card-num gih-room-history-link" data-history-room-id="${d.roomId}" data-history-room-number="${escapeHtml(String(d.number))}" title="Открыть историю номера">${escapeHtml(String(d.number))}</button>
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
    box.innerHTML = !dones.length ? `<div class="gih-empty"><div class="gih-empty-orb"><i data-lucide="clipboard-check" class="w-7 h-7"></i></div><div class="gih-empty-t">Нет активных проверок</div></div>` : '';
    if (window.lucide) lucide.createIcons(); return;
  }
  box.innerHTML = `<div class="gih-zone-t"><span>Несохранённые</span><b>${drafts.length}</b></div><div class="gih-cards">${drafts.map(draftHtml).join('')}</div>`;
  if (window.lucide) lucide.createIcons();
}
function formatDoneItems(items, mode = null){
  const groups = {};
  items.forEach(it => {
    const status = effectiveItemStatus(it, mode);
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
const showsModeTag = d.gihRoomStatus && !modeItemStatus(d.gihRoomStatus);
const modeTag = showsModeTag ? `<span class="gih-mode-tag gih-m-${d.gihRoomStatus}">${MODE_LABEL[d.gihRoomStatus]||d.gihRoomStatus}</span>` : '';
const note = (d.notes && d.notes.trim()) ? `<div class="gih-done-note">${escapeHtml(d.notes)}</div>` : '';
if (d.gihRoomStatus) {
  const assignedStatus = modeItemStatus(d.gihRoomStatus);
  if (assignedStatus) {
    const statusItems = formatDoneItems(items, d.gihRoomStatus);
    return `<div class="gih-done-products gih-done-withmode">${modeTag}${statusItems}${note}</div>`;
  }
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
      <button type="button" class="gih-card-num gih-room-history-link" data-history-room-id="${d.roomId}" data-history-room-number="${escapeHtml(String(d.number))}" title="Открыть историю номера">${escapeHtml(String(d.number))}</button>
      <span class="gih-card-time">${timeStr(d.date)}</span>
      <div class="gih-card-actions">
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
    const savedRoomId = factory.roomId;
    factory={ roomId:null, input:'', counts:{}, editId:null, _mode:null, _notes:'' };
    if (savedRoomId) recentHistoryCache.delete(Number(savedRoomId));
    await load();
    const nextInput = $('gih-finput'); if (nextInput) nextInput.focus();
  }catch(err){ console.error(err); showToast('Не удалось сохранить'); }
}
function openFactoryEdit(d){
  const counts={}; (d.gihItems||[]).forEach(it=>{ counts[it.productId]=(counts[it.productId]||0)+1; });
  factory={ editId:d.id, roomId:d.roomId, input:String(d.number), counts:counts, _mode:d._mode, _notes:d.notes||'' };
  render();
}
async function saveDraft(id){
  const d=drafts.find(x=>x.id===id); if(!d||!canSave(d)) return;
  const assignedStatus = modeItemStatus(d._mode);
  const payload={ status:'done', gihRoomStatus:d._mode||null, notes:(d.notes&&d.notes.trim())?d.notes.trim():null, pills: assignedStatus ? d.gihItems.map(it=>({ id:it.id, itemStatus:assignedStatus })) : (d._mode ? [] : d.gihItems.map(it=>({ id:it.id, itemStatus:it.itemStatus }))) };
  try{ await api().updateGihCheck(id, payload); locallyEditedDraftIds.delete(id); showToast('Сохранено'); await load(); }
  catch(err){ console.error(err); showToast('Не удалось сохранить'); }
}
async function del(id){
  if(!confirm('Удалить запись?')) return;
  try{ await api().deleteGihCheck(id); locallyEditedDraftIds.delete(id); await load(); }
  catch(err){ console.error(err); showToast('Не удалось удалить'); }
}
function bind(){
  if(bound) return; bound=true;
  const fac=$('gih-factory');
  fac?.addEventListener('click', e=>{
    const b=e.target.closest('[data-act]'); if(!b) return; const act=b.dataset.act;
    if(act==='open-room-history'){
      const roomId = parseInt(b.dataset.historyRoomId,10);
      if(Number.isInteger(roomId) && roomId > 0 && App.historyModule){
        App.historyModule.openRoomHistory(roomId, b.dataset.historyRoomNumber || factory.input);
      }
      return;
    }
    if(act==='ftap'){ const pid=+b.dataset.pid; const max=+b.dataset.max||99; let q=factory.counts[pid]||0; q = q>=max?0:q+1; factory.counts[pid]=q; renderFactory(); return; }
    if(act==='fcreate'){ createFactory(); return; }
  });
  fac?.addEventListener('input', e=>{
    if(e.target.id!=='gih-finput') return;
    factory.input=e.target.value; const v=factory.input.trim();
    const exact=v?rooms.find(r=>String(r.number)===v):null;
    if(exact){
      if (factory.roomId !== exact.id) selectRoom(exact.id);
      return;
    }
    // Clear the previous room's products without showing partial-number suggestions.
    factory.roomId=null; factory.counts={};
    const grid=$('gih-fgrid'); if(grid) grid.innerHTML='';
    const createButton=$('gih-factory')?.querySelector('[data-act="fcreate"]');
    if(createButton) createButton.disabled=true;
    const recent=$('gih-room-recent'); if(recent) recent.remove();
  });
  const dr=$('gih-drafts');
  dr?.addEventListener('click', e=>{
    const roomButton=e.target.closest('[data-history-room-id]');
    if(roomButton){
      e.preventDefault();
      e.stopPropagation();
      const roomId=parseInt(roomButton.dataset.historyRoomId,10);
      if(Number.isInteger(roomId)&&roomId>0&&App.historyModule){
        App.historyModule.openRoomHistory(roomId,roomButton.dataset.historyRoomNumber||roomButton.textContent.trim());
      }
      return;
    }
    const b=e.target.closest('[data-act]'); if(!b) return; const act=b.dataset.act;
    const card=b.closest('.gih-card'); const did=card?parseInt(card.dataset.did,10):NaN; const d=drafts.find(x=>x.id===did);
    if(act==='del'){ del(did); return; }
    if(!d) return;
    if(act==='edit-draft'){ openFactoryEdit(d); return; }
    if(act==='save'){ saveDraft(d.id); return; }
    if(act==='notes'){ const next = window.prompt('Комментарий к номеру', d.notes||''); if(next===null) return; d.notes=next; locallyEditedDraftIds.add(d.id); patchDraftCard(d); return; }
    if(act==='mode'){ if(productsDirty(d))return; const k=b.dataset.mode; d._mode=d._mode===k?null:k; locallyEditedDraftIds.add(d.id); patchDraftCard(d); return; }
    if(act==='pill'){ if(modeActive(d))return; const iid=parseInt(b.dataset.iid,10); const it=d.gihItems.find(x=>x.id===iid); if(!it)return; const i=CYCLE.indexOf(it.itemStatus); it.itemStatus=CYCLE[(i+1)%CYCLE.length]; locallyEditedDraftIds.add(d.id); patchDraftCard(d); return; }
  });
  const dn=$('gih-dones');
  dn?.addEventListener('click', e=>{
    const roomButton=e.target.closest('[data-history-room-id]');
    if(roomButton){
      e.preventDefault();
      e.stopPropagation();
      const roomId=parseInt(roomButton.dataset.historyRoomId,10);
      if(Number.isInteger(roomId)&&roomId>0&&App.historyModule){
        App.historyModule.openRoomHistory(roomId,roomButton.dataset.historyRoomNumber||roomButton.textContent.trim());
      }
      return;
    }
    const b=e.target.closest('[data-act]'); if(!b) return; const id=parseInt(b.dataset.id,10);
    if(b.dataset.act==='del') del(id);
  });
}
function init(){ bind(); load(); scheduleDayRollover(); }
App.badges.register('gih', async ()=>{
  try {
    const checks = await api().getGihChecks();
    return (checks || []).filter(c => (c.status || 'draft') === 'draft' && isToday(c.createdAt || c.checkDate)).length;
  } catch(e) {
    return drafts.length;
  }
});
return { init, refresh: load };
})();
