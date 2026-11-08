import { api } from '../core/api.js';
import { getState, setState } from '../core/store.js';
import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

let cameraRooms = [];
let cameraRoomDetails = null;
let cameraStatuses = [];
let cameraRefills = [];
let cameraProducts = [];
let cameraCounts = {};
let cameraBusy = false;
let cameraNotice = '';
let cameraPreview = null;
let cameraStream = null;
let loadToken = 0;

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function currentRoom(state=getState()) {
  return cameraRooms.find(room => String(room.number) === String(state.cameraRoomNumber)) || null;
}
function listLabel(type) { return type === 'arrivals' ? 'Заезды' : type === 'departures' ? 'Выезды' : 'Все номера'; }
function currentRefill(room) { return cameraRefills.find(r => Number(r.roomId) === Number(room?.id)) || null; }

export async function initializeCamera(roomNumber, listType) {
  const token = ++loadToken;
  cameraNotice = '';
  cameraPreview = null;
  await stopCamera();
  setState({ screen: 'camera', cameraRoomNumber: String(roomNumber || ''), cameraListType: listType || '' });
  try {
    const [queue, list, refills] = await Promise.all([
      api.get('miniapp/queue'),
      listType === 'arrivals' || listType === 'departures'
        ? api.get(listType === 'arrivals' ? 'arrivals/miniapp-list' : 'departures/miniapp-list').catch(() => null)
        : Promise.resolve(null),
      api.get('refills/active').catch(() => ({requests:[]}))
    ]);
    if (token !== loadToken) return;
    const allowed = list?.roomNumbers ? new Set(list.roomNumbers.map(String)) : null;
    cameraRooms = (queue.rooms || []).filter(room => !allowed || allowed.has(String(room.number)))
      .sort((a,b) => Number(a.floor)-Number(b.floor) || Number(a.number)-Number(b.number));
    cameraRefills = (refills.requests || []).filter(r => r.status === 'pending');
    const chosen = cameraRooms.some(r => String(r.number) === String(roomNumber))
      ? String(roomNumber) : String(cameraRooms[0]?.number || '');
    setState({ cameraRoomNumber: chosen, cameraListData: list || null });
    await loadRoom(chosen);
  } catch (error) {
    cameraNotice = error.message || 'Не удалось загрузить номера';
    setState({ cameraLoadError: cameraNotice });
  }
}
async function loadRoom(number) {
  const token = ++loadToken;
  const room = cameraRooms.find(r => String(r.number) === String(number));
  cameraRoomDetails = room;
  cameraStatuses = [];
  cameraProducts = [];
  cameraCounts = {};
  if (!room?.id) { setState({cameraRoomNumber:String(number || '')}); return; }
  setState({ cameraRoomNumber:String(number), cameraRoomLoading:true });
  try {
    const [details, statuses] = await Promise.all([
      api.get('rooms/' + Number(room.id)),
      api.get('rooms/' + Number(room.id) + '/product-statuses')
    ]);
    if (token !== loadToken) return;
    cameraRoomDetails = details;
    cameraStatuses = Array.isArray(statuses) ? statuses : [];
    cameraProducts = (details.template?.items || []).map(item => {
      const product = item.product || {};
      return { id:Number(item.productId || product.id), name:product.name || 'Продукт',
        category:product.category || 'Напитки', emoji:product.emoji || '•',
        volume:product.volume, unit:product.unit || 'шт', max:Math.max(1,Number(item.qty)||1),
        bgColor:product.bgColor || 'slate' };
    }).filter(item => item.id);
    const request = currentRefill(room);
    (request?.items || []).forEach(item => { cameraCounts[Number(item.productId)] = Number(item.qty)||0; });
    setState({ cameraRoomLoading:false, cameraRoomDetails:details, cameraStatuses, cameraProducts, cameraCounts:{...cameraCounts} });
  } catch (error) {
    if (token !== loadToken) return;
    cameraNotice = error.message || 'Не удалось загрузить данные номера';
    setState({ cameraRoomLoading:false, cameraRoomError:cameraNotice });
  }
}
async function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
}
function roomSummary(room, state) {
  if (!room) return '<div class="camera-empty-state">В выбранном списке нет номеров</div>';
  const entry = state.cameraListData?.entries?.[String(room.number)] || {};
  const status = cameraRoomDetails?.expiryStatus || room.expiryStatus || 'neutral';
  const deadline = status === 'empty' ? 'Пустой' : cameraStatuses.filter(s => Number(s.qtyToReplace)>0)
    .map(s => (s.product?.name || 'Продукт') + ' × ' + s.qtyToReplace).join(', ');
  const refill = currentRefill(room);
  const refillText = refill?.items?.filter(i=>Number(i.qty)>0).map(i=>i.name+' × '+i.qty).join(', ');
  const info = [
    room.floor ? Number(room.floor)+' этаж' : '',
    (room.category || room.type) ? (String(room.category || room.type).toLowerCase().includes('lux') ? 'Люкс' : 'Стандарт') : '',
    entry.time || '',
    entry.comment || ''
  ].filter(Boolean);
  return '<section class="camera-room-summary"><div class="camera-room-heading"><div><span class="camera-eyebrow">'+esc(listLabel(state.cameraListType))+'</span><h2>Номер '+esc(room.number)+'</h2></div>' +
    (status === 'empty' ? '<span class="camera-empty-badge">Пустой</span>' : '') + '</div>' +
    '<div class="camera-room-meta">'+info.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>' +
    (deadline ? '<div class="camera-summary-line">'+icon('timer',15)+'<span>Сроки: '+esc(deadline)+'</span></div>' : '') +
    (entry.vip ? '<div class="camera-summary-line">'+icon('crown',15)+'<span>VIP</span></div>' : '') +
    (entry.empty && status !== 'empty' ? '<div class="camera-summary-line">'+icon('package-x',15)+'<span>Опустошить</span></div>' : '') +
    (refillText ? '<div class="camera-summary-line">'+icon('package-check',15)+'<span>Требует пополнения: '+esc(refillText)+'</span></div>' : '') +
    '</section>';
}
function renderProducts() {
  if (!cameraProducts.length) return '<p class="camera-muted">Для номера не задан шаблон наполнения.</p>';
  const groups = [...new Set(cameraProducts.map(p=>p.category))];
  return groups.map(group => '<section class="camera-product-group"><h3>'+esc(group)+'</h3><div class="camera-product-grid">'+
    cameraProducts.filter(p=>p.category===group).map(p=>{
      const count = Number(cameraCounts[p.id])||0;
      const meta = [p.volume,p.unit].filter(Boolean).join(' ');
      return '<button type="button" class="camera-product-card'+(count?' is-selected':'')+'" data-camera-product="'+p.id+'" data-max="'+p.max+'" aria-pressed="'+Boolean(count)+'">'+
        '<span class="camera-product-emoji">'+esc(p.emoji)+'</span><strong>'+esc(p.name)+'</strong><small>'+esc(meta)+'</small>'+
        '<span class="camera-product-count">'+(count ? count+' / '+p.max : '—')+'</span></button>';
    }).join('')+'</div></section>').join('');
}
function renderPreview() {
  if (!cameraPreview) return '';
  return '<div class="camera-preview-overlay"><div class="camera-preview-card"><img src="'+cameraPreview.url+'" alt="Фото номера '+esc(cameraPreview.room)+'">'+
    '<strong>Номер '+esc(cameraPreview.room)+'</strong><div class="camera-preview-actions"><button data-camera-action="retake" class="camera-secondary">Переснять</button>'+
    '<button data-camera-action="send-photo" class="camera-primary">Отправить фото</button></div></div></div>';
}
export function renderCamera(state=getState()) {
  const room = currentRoom(state);
  const active = String(room?.number || '');
  return '<div class="screen screen-camera">'+pageHeader({title:'Камера'})+
    '<div class="camera-carousel-wrap"><div class="camera-carousel" aria-label="Выбор номера">'+cameraRooms.map(r=>
      '<button type="button" class="camera-carousel-item'+(String(r.number)===active?' is-active':'')+(r.expiryStatus==='empty'?' is-empty':'')+'" data-camera-room="'+esc(r.number)+'">'+esc(r.number)+'</button>').join('')+'</div></div>'+
    (state.cameraLoadError ? '<div class="camera-error">'+esc(state.cameraLoadError)+'</div>' : '')+
    roomSummary(room,state)+
    (state.cameraRoomLoading ? '<div class="camera-muted">Загружаем данные номера…</div>' : '')+
    '<section class="camera-actions-grid"><button class="camera-action-card camera-action-photo" data-camera-action="photo">'+icon('camera',20)+'<span>Фото</span></button>'+
      '<button class="camera-action-card" data-camera-action="refill">'+icon('package-plus',20)+'<span>Пополнение</span></button>'+
      '<button class="camera-action-card" data-camera-action="empty">'+icon('package-x',20)+'<span>Опустошил</span></button>'+
      '<button class="camera-action-card" data-camera-action="message">'+icon('message-square',20)+'<span>Сообщение</span></button></section>'+
    (state.cameraMode === 'refill' ? '<section class="camera-refill-panel"><div class="camera-panel-heading"><h3>Что требуется пополнить</h3><button data-camera-action="close-panel" aria-label="Закрыть">'+icon('x',18)+'</button></div>'+renderProducts()+
      '<button class="camera-primary camera-save-refill" data-camera-action="save-refill" '+(cameraBusy?'disabled':'')+'>Сохранить пополнение</button></section>' : '')+
    (state.cameraMode === 'message' ? '<section class="camera-refill-panel"><div class="camera-panel-heading"><h3>Сообщение по номеру</h3><button data-camera-action="close-panel">'+icon('x',18)+'</button></div>'+
      '<textarea class="camera-message-input" id="cameraMessageText" placeholder="Текст сообщения"></textarea><button class="camera-primary" data-camera-action="send-message">Отправить</button></section>' : '')+
    (cameraNotice ? '<div class="camera-notice">'+esc(cameraNotice)+'</div>' : '')+
    (cameraPreview ? renderPreview() : '')+
    '</div>';
}
async function saveRefill() {
  const state=getState(), room=currentRoom(state);
  if (!room?.id || cameraBusy) return;
  const items=Object.entries(cameraCounts).map(([productId,qty])=>({productId:Number(productId),qty:Number(qty)})).filter(x=>x.qty>0);
  const existing=currentRefill(room);
  if (!items.length && !existing) { cameraNotice='Выбери хотя бы один продукт.'; setState({cameraNotice}); return; }
  cameraBusy=true; setState({cameraBusy:true});
  try {
    const result=await api.post('refills',{roomId:Number(room.id),allProducts:false,expectedRequestId:existing?.id || null,items});
    cameraRefills=cameraRefills.filter(r=>Number(r.roomId)!==Number(room.id));
    if(result.request?.status==='pending') cameraRefills.push(result.request);
    cameraNotice=result.request?.status==='cancelled'?'Потребность в пополнении снята':'Пополнение сохранено';
    setState({cameraMode:'',cameraNotice,cameraBusy:false});
  } catch(error) { cameraNotice=error.message; setState({cameraNotice,cameraBusy:false}); }
  finally { cameraBusy=false; }
}
async function sendMessage(text) {
  const room=currentRoom(); if(!room) return;
  const response=await fetch('/minibar-os/vk-proxy/send-message',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message:text})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok || !data.ok) throw new Error(data.error || 'Не удалось отправить сообщение');
}
async function takePhoto() {
  const room=currentRoom(); if(!room) return;
  const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.setAttribute('capture','environment');
  input.onchange=()=>{const file=input.files?.[0];if(!file)return; if(cameraPreview?.url)URL.revokeObjectURL(cameraPreview.url);cameraPreview={file,url:URL.createObjectURL(file),room:String(room.number)};setState({cameraPreviewOpen:true});};
  input.click();
}
async function uploadPhoto() {
  if(!cameraPreview?.file) return;
  const form=new FormData(); form.append('photo',cameraPreview.file,'photo.jpg');form.append('room',cameraPreview.room);form.append('random_id',String(Math.floor(Math.random()*2147483647)+1));
  const response=await fetch('/minibar-os/vk-proxy/send-photo',{method:'POST',body:form});
  const data=await response.json().catch(()=>({}));
  if(!response.ok || !data.ok) throw new Error(data.error || 'Не удалось отправить фото');
  URL.revokeObjectURL(cameraPreview.url);cameraPreview=null;setState({cameraPreviewOpen:false,cameraNotice:'Фото отправлено'});
}
export async function handleCameraClick(event) {
  const target=event.target instanceof Element?event.target:null;if(!target)return false;
  const roomButton=target.closest('[data-camera-room]');
  if(roomButton){await stopCamera();cameraPreview=null;setState({cameraRoomNumber:roomButton.dataset.cameraRoom,cameraMode:''});await loadRoom(roomButton.dataset.cameraRoom);return true;}
  const control=target.closest('[data-camera-action]');if(!control)return false;
  const action=control.dataset.cameraAction;event.preventDefault();
  try {
    if(action==='photo') await takePhoto();
    else if(action==='refill') {cameraNotice='';setState({cameraMode:'refill'});if(!cameraRoomDetails?.template) await loadRoom(currentRoom()?.number);}
    else if(action==='close-panel') setState({cameraMode:''});
    else if(action==='save-refill') await saveRefill();
    else if(action==='empty') {await sendMessage(String(currentRoom()?.number)+' опустошён');cameraNotice='Сообщение об опустошении отправлено';setState({cameraNotice});}
    else if(action==='message') setState({cameraMode:'message'});
    else if(action==='send-message') {const value=document.getElementById('cameraMessageText')?.value.trim();if(!value)throw new Error('Напиши сообщение');await sendMessage('Номер '+currentRoom()?.number+': '+value);cameraNotice='Сообщение отправлено';setState({cameraMode:'',cameraNotice});}
    else if(action==='send-photo') await uploadPhoto();
    else if(action==='retake') {if(cameraPreview?.url)URL.revokeObjectURL(cameraPreview.url);cameraPreview=null;setState({cameraPreviewOpen:false});await takePhoto();}
  } catch(error){cameraNotice=error.message||'Не удалось выполнить действие';setState({cameraNotice});}
  return true;
}
export function handleCameraChange(event) { return false; }
