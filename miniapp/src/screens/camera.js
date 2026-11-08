import { api } from '../core/api.js';
import { getState } from '../core/store.js';
import { icon } from '../components/icons.js';

let stream = null;
let videoTrack = null;
let torchSupported = false;
let torchEnabled = false;
let cameraStarting = null;
let currentDeviceAngle = 0;
let hasMotionOrientation = false;
let selectedNumber = '';
let rooms = [];
let activeRefills = [];
let refillCounts = {};
let refillRequestId = null;
let refillBusy = false;
let photoBlob = null;
let photoUrl = '';
let photoRandomId = null;
let captureBusy = false;
let messageTimer = null;
let carouselTimer = null;
let carouselFrame = 0;
let bound = false;
let mounted = false;
let loadToken = 0;

const $ = id => document.getElementById(id);
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));
const productColors = {
  amber:'#fef3c7', red:'#fee2e2', blue:'#dbeafe', yellow:'#fef9c3',
  purple:'#f3e8ff', emerald:'#d1fae5', rose:'#ffe4e6', orange:'#ffedd5', slate:'#e2e8f0'
};
const categoryOrder = ['Дверца','Напитки','Алкоголь','Соки'];

function sourceData() {
  const state = getState();
  const type = state.cameraSourceListType || state.listType || 'arrivals';
  return { type, data:state.listData?.[type] || null };
}
function roomByNumber(number) {
  const { data } = sourceData();
  const info = data?.roomInfo?.[String(number)] || {};
  const room = rooms.find(item => String(item.number) === String(number)) || {};
  return { ...room, ...info, number:String(number || '') };
}
function roomNumbers() {
  const { data } = sourceData();
  if (Array.isArray(data?.roomNumbers) && data.roomNumbers.length) {
    return [...new Set(data.roomNumbers.map(String))];
  }
  return rooms.map(room => String(room.number)).sort((a,b) =>
    Number(roomByNumber(a).floor || 0) - Number(roomByNumber(b).floor || 0) || Number(a) - Number(b));
}
function listEntry(number) {
  const { data } = sourceData();
  return data?.entries?.[String(number)] || {};
}
function activeRefill(room) {
  return activeRefills.find(item => Number(item.roomId) === Number(room?.id)) || null;
}
function productTemplate(room) {
  const fromRoom = Array.isArray(room?.template?.items) ? room.template.items : [];
  const fromList = Array.isArray(room?.templateItems) ? room.templateItems : [];
  const raw = fromRoom.length ? fromRoom : fromList;
  return raw.map(item => {
    const product = item.product || item;
    const id = Number(item.productId || product.id);
    return {
      id,
      name:product.name || item.name || 'Продукт',
      category:product.category || item.category || 'Напитки',
      volume:product.volume ?? item.volume ?? null,
      unit:product.unit || item.unit || 'шт',
      emoji:product.emoji || item.emoji || null,
      bgColor:product.bgColor || item.bgColor || 'slate',
      maxQty:Math.max(1, Number(item.qty || item.maxQty || 1))
    };
  }).filter(item => item.id > 0);
}
function deadlineDescription(room) {
  const statuses = Array.isArray(room?.productStatuses) ? room.productStatuses : [];
  if (room?.expiryStatus === 'empty') return 'Пустой';
  const needed = statuses.filter(item =>
    item.expiryStatus === 'needs_replacement' || Number(item.qtyToReplace) > 0
  ).map(item => String(item.name || 'Продукт') +
    (Number(item.qtyToReplace) > 0 ? ' ×' + Number(item.qtyToReplace) : ''));
  if (needed.length) return needed.join(', ');
  if (room?.expiryStatus === 'needs_replacement') return 'Требует замены';
  if (room?.expiryStatus === 'valid') return 'В порядке';
  return 'Без замечаний';
}
function refillDescription(request) {
  if (!request?.items?.length) return 'Нет потребности';
  return request.items.map(item => esc(item.name || 'Продукт') +
    (Number(item.qty) > 1 ? ' ×' + Number(item.qty) : '')).join(', ');
}
function isArrivalNotReady(room) {
  const { type, data } = sourceData();
  if (type !== 'arrivals' || !data) return false;
  const number = String(room?.number || '');
  const listed = (data.roomNumbers || []).map(String).includes(number);
  if (!listed) return false;
  const ready = Array.isArray(data.readyNumbers) && data.readyNumbers.length
    ? data.readyNumbers.map(String).includes(number)
    : listEntry(number).ready === true;
  return !ready;
}
function renderStatusChips(room) {
  const { type } = sourceData();
  const entry = listEntry(room.number);
  const chips = [];
  if (entry.vip) chips.push('<span class="camera-info-chip is-vip">' + icon('crown',12) + ' VIP</span>');
  if (entry.time) chips.push('<span class="camera-info-chip">' + icon('clock',12) + ' ' + esc(entry.time) + '</span>');
  if (entry.ready === true) chips.push('<span class="camera-info-chip is-ready">' + icon('check',12) + ' Можно делать</span>');
  if (entry.empty) chips.push('<span class="camera-info-chip is-empty">Опустошить</span>');
  if (type === 'departures' && (getState().listData?.departures?.arrivalRooms || []).map(String).includes(String(room.number))) {
    chips.push('<span class="camera-info-chip is-arrival">На заезд</span>');
  }
  if (entry.comment) chips.push('<span class="camera-info-comment">' + icon('message-square',12) + ' ' + esc(entry.comment) + '</span>');
  return chips.join('');
}
function renderStandby() {
  const room = roomByNumber(selectedNumber);
  const panel = $('cameraStandby');
  if (!panel) return;
  if (!room.number || !room.id) {
    panel.innerHTML = '<div class="camera-info-empty">Выбери номер в карусели</div>';
    return;
  }
  const floor = room.floor ? room.floor + ' этаж' : '';
  const category = room.category === 'lux' ? 'Люкс' : room.category === 'standard' ? 'Стандарт' : '';
  const deadline = deadlineDescription(room);
  const refill = activeRefill(room);
  const entry = listEntry(room.number);
  const deadlineClass = room.expiryStatus === 'empty' ? 'is-empty'
    : room.expiryStatus === 'needs_replacement' || room.productStatuses?.length ? 'is-deadline' : '';
  const summary = refillDescription(refill);
  const { type } = sourceData();
  const listTitle = type === 'arrivals' ? 'Заезды' : 'Выезды';
  panel.innerHTML =
    '<section class="camera-info-panel">' +
      '<header class="camera-info-room">' +
        '<div class="camera-info-room-main"><strong>Номер ' + esc(room.number) + '</strong>' +
          '<span>' + esc([floor,category].filter(Boolean).join(' · ')) + '</span></div>' +
        '<span class="camera-info-list-name">' + listTitle + '</span>' +
      '</header>' +
      '<div class="camera-info-chips">' + renderStatusChips(room) + '</div>' +
      '<div class="camera-info-grid">' +
        '<section class="camera-info-tile ' + deadlineClass + '">' +
          '<span class="camera-info-tile-label">' + icon('calendar-clock',13) + ' Сроки</span>' +
          '<strong>' + esc(deadline) + '</strong>' +
          (room.productStatuses?.length ? '<small>' + room.productStatuses.length + ' отмет.</small>' : '') +
        '</section>' +
        '<section class="camera-info-tile is-refill">' +
          '<span class="camera-info-tile-label">' + icon('package',13) + ' Пополнение</span>' +
          '<strong>' + summary + '</strong>' +
        '</section>' +
      '</div>' +
      (entry.comment ? '<div class="camera-info-comment-line">' + icon('message-square',13) + '<span>' + esc(entry.comment) + '</span></div>' : '') +
    '</section>';
}
function updateActionAvailability() {
  const room = roomByNumber(selectedNumber);
  const disabled = !room.id || isArrivalNotReady(room) || captureBusy || refillBusy;
  ['cameraActionEmpty','cameraActionRefill','cameraActionResidential','cameraCapture'].forEach(id => {
    const button = $(id);
    if (button) button.disabled = disabled;
  });
}
function renderCarousel() {
  const host = $('cameraCarousel');
  const wrap = $('cameraCarouselWrap');
  if (!host || !wrap) return;
  const numbers = roomNumbers();
  if (!numbers.length) {
    host.innerHTML = '';
    wrap.classList.add('is-disabled');
    updateActionAvailability();
    return;
  }
  wrap.classList.remove('is-disabled');
  host.innerHTML = numbers.map(number => {
    const room = roomByNumber(number);
    const refill = activeRefill(room);
    const classes = ['camera-number-item'];
    if (String(number) === String(selectedNumber)) classes.push('is-active');
    const empty = room.expiryStatus === 'empty';
    const needsDeadline = room.expiryStatus === 'needs_replacement' || (room.productStatuses || []).some(p => p.expiryStatus === 'needs_replacement' || Number(p.qtyToReplace) > 0);
    const needsRefill = Boolean(refill?.items?.length);
    if (empty) classes.push('is-empty');
    if (needsDeadline) classes.push('is-deadline');
    if (needsRefill) classes.push('is-refill');
    const checked = (getState().listData?.[getState().cameraSourceListType || getState().listType]?.checkedRoomNumbers ||
      getState().listData?.[getState().cameraSourceListType || getState().listType]?.completedNumbers || []).map(String).includes(String(number));
    if (checked) classes.push('is-checked');
    const entry = listEntry(number);
    const marks = [];
    if (entry.vip) marks.push('<span class="camera-number-mark is-vip" title="VIP">' + icon('crown',10) + '</span>');
    if (empty) marks.push('<span class="camera-number-mark is-empty" title="Опустошён">' + icon('package-x',10) + '</span>');
    if (needsDeadline) marks.push('<span class="camera-number-mark is-deadline" title="Сроки">' + icon('timer',10) + '</span>');
    if (needsRefill) marks.push('<span class="camera-number-mark is-refill" title="Пополнение">' + icon('package',10) + '</span>');
    if (entry.comment) marks.push('<span class="camera-number-mark is-comment" title="Комментарий">' + icon('message-square',10) + '</span>');
    if (checked) marks.push('<span class="camera-number-mark is-checked" title="Проверен">' + icon('check',10) + '</span>');
    return '<button type="button" class="' + classes.join(' ') + '" data-camera-room="' + esc(number) + '"><strong>' + esc(number) + '</strong><span class="camera-number-marks">' + marks.join('') + '</span></button>';
  }).join('');
  const active = host.querySelector('.is-active');
  if (active) host.scrollTop = Math.max(0, active.offsetTop - (host.clientHeight - active.clientHeight) / 2);
  attachCarouselScroll(host);
  updateActionAvailability();
}
function centerRoom(number, behavior = 'smooth') {
  const host = $('cameraCarousel');
  if (!host) return;
  const item = [...host.querySelectorAll('[data-camera-room]')].find(el => el.dataset.cameraRoom === String(number));
  if (!item) return;
  host.scrollTo({
    top:Math.max(0,item.offsetTop - (host.clientHeight - item.clientHeight) / 2),
    behavior
  });
}
function updateCarouselSelection() {
  const host = $('cameraCarousel');
  if (!host) return;
  host.querySelectorAll('[data-camera-room]').forEach(item => {
    item.classList.toggle('is-active', item.dataset.cameraRoom === selectedNumber);
  });
}
function setSelectedRoom(number, options = {}) {
  const next = String(number || '');
  if (!next || !roomNumbers().includes(next)) return;
  const changed = selectedNumber !== next;
  selectedNumber = next;
  updateCarouselSelection();
  if (options.center) centerRoom(next, options.behavior || 'smooth');
  renderStandby();
  updateActionAvailability();
  if (changed) void loadRoomProductStatuses(next);
}
async function loadRoomProductStatuses(number = selectedNumber) {
  const room = roomByNumber(number);
  if (!room.id) return;
  try {
    const statuses = await api.get('rooms/' + Number(room.id) + '/product-statuses');
    if (String(number) !== selectedNumber || !Array.isArray(statuses)) return;
    room.productStatuses = statuses.map(item => ({
      productId:Number(item.productId), name:item.product?.name || item.name || 'Продукт',
      expiryStatus:item.expiryStatus || 'ok', qtyToReplace:Number(item.qtyToReplace) || 0
    }));
    const baseRoom = rooms.find(item => Number(item.id) === Number(room.id));
    if (baseRoom) baseRoom.productStatuses = room.productStatuses;
    const listRoom = sourceData().data?.roomInfo?.[String(room.number)];
    if (listRoom) listRoom.productStatuses = room.productStatuses;
    renderStandby();
    renderCarousel();
  } catch (_) {}
}
async function loadCameraData() {
  const token = ++loadToken;
  const [roomResult, refillResult] = await Promise.allSettled([
    api.get('rooms'),
    api.get('refills/active')
  ]);
  if (!mounted || token !== loadToken) return;
  if (roomResult.status === 'fulfilled') {
    rooms = Array.isArray(roomResult.value) ? roomResult.value : roomResult.value?.rooms || [];
    rooms.sort((a,b) => Number(a.floor || 0) - Number(b.floor || 0) || Number(a.number) - Number(b.number));
  }
  if (refillResult.status === 'fulfilled') {
    activeRefills = (refillResult.value?.requests || []).filter(item => item.status === 'pending');
  }
  const numbers = roomNumbers();
  if (!numbers.includes(selectedNumber)) selectedNumber = numbers[0] || '';
  renderCarousel();
  renderStandby();
  updateActionAvailability();
  if (selectedNumber) void loadRoomProductStatuses(selectedNumber);
}
function showNotice(message, isError = false) {
  const host = $('cameraFeedback');
  if (!host) return;
  host.textContent = message || '';
  host.classList.toggle('is-error', Boolean(isError));
  host.classList.toggle('is-visible', Boolean(message));
  clearTimeout(messageTimer);
  if (message) messageTimer = setTimeout(() => {
    host?.classList.remove('is-visible');
  }, 3000);
}
function normalizeAngle(angle) {
  return ((Number(angle) % 360) + 360) % 360;
}
function updateOrientationFromScreen() {
  if (hasMotionOrientation) return;
  let angle = null;
  if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') angle = normalizeAngle(window.screen.orientation.angle);
  else if (typeof window.orientation === 'number') angle = normalizeAngle(window.orientation);
  else if (window.innerWidth > window.innerHeight) angle = 90;
  if ([0,90,180,270].includes(angle)) currentDeviceAngle = angle;
}
function updateOrientationFromMotion(event) {
  const gravity = event.accelerationIncludingGravity;
  if (!gravity || !Number.isFinite(gravity.x) || !Number.isFinite(gravity.y)) return;
  const x = gravity.x, y = gravity.y, ax = Math.abs(x), ay = Math.abs(y);
  if (Math.max(ax,ay) < 5.5 || Math.min(ax,ay) > Math.max(ax,ay)*.72) return;
  currentDeviceAngle = ay > ax ? (y >= 0 ? 0 : 180) : (x >= 0 ? 90 : 270);
  hasMotionOrientation = true;
}
function updateOrientationFromSensor(event) {
  if (hasMotionOrientation || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
  const beta = Math.sin(event.beta*Math.PI/180), gamma = Math.sin(event.gamma*Math.PI/180);
  if (Math.max(Math.abs(beta),Math.abs(gamma)) < .62) return;
  if (Math.abs(beta) > Math.abs(gamma)*1.25) currentDeviceAngle = beta >= 0 ? 0 : 180;
  else if (Math.abs(gamma) > Math.abs(beta)*1.25) currentDeviceAngle = gamma > 0 ? 90 : 270;
}
window.addEventListener('devicemotion',updateOrientationFromMotion,true);
window.addEventListener('deviceorientation',updateOrientationFromSensor,true);
window.addEventListener('orientationchange',updateOrientationFromScreen);
window.screen?.orientation?.addEventListener?.('change',updateOrientationFromScreen);
updateOrientationFromScreen();
let orientationPermissionAsked = false;
async function requestOrientationPermission() {
  if (orientationPermissionAsked) return;
  orientationPermissionAsked = true;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission();
    }
  } catch (_) {}
}
function captureAngle(width,height) {
  updateOrientationFromScreen();
  if (width > height) {
    if (currentDeviceAngle === 90) return 180;
    if (currentDeviceAngle === 270) return 0;
  }
  return normalizeAngle(currentDeviceAngle);
}
function drawCaptureFrame(video,canvas) {
  const sw = video.videoWidth, sh = video.videoHeight;
  if (!sw || !sh) throw new Error('Камера ещё не готова');
  const angle = captureAngle(sw,sh), quarter = angle === 90 || angle === 270;
  canvas.width = quarter ? sh : sw;
  canvas.height = quarter ? sw : sh;
  const ctx = canvas.getContext('2d',{alpha:false});
  if (!ctx) throw new Error('Не удалось подготовить снимок');
  ctx.save();
  if (angle === 90) { ctx.translate(sh,0); ctx.rotate(Math.PI/2); }
  else if (angle === 180) { ctx.translate(sw,sh); ctx.rotate(Math.PI); }
  else if (angle === 270) { ctx.translate(0,sw); ctx.rotate(-Math.PI/2); }
  ctx.drawImage(video,0,0,sw,sh);
  ctx.restore();
}
function detectTorch() {
  try { torchSupported = videoTrack?.getCapabilities?.().torch === true; }
  catch (_) { torchSupported = false; }
  const button = $('cameraFlash');
  if (button) {
    button.hidden = !torchSupported;
    button.classList.toggle('is-on',torchEnabled);
    button.setAttribute('aria-pressed',String(torchEnabled));
  }
}
async function setTorch(enabled) {
  if (!videoTrack || !torchSupported) return false;
  try {
    await videoTrack.applyConstraints({advanced:[{torch:enabled}]});
    torchEnabled = enabled;
    detectTorch();
    return true;
  } catch (_) { return false; }
}
async function toggleTorch() {
  if (!torchSupported || captureBusy) return;
  const ok = await setTorch(!torchEnabled);
  if (!ok) showNotice('Вспышка недоступна в этом режиме камеры',true);
}
function stopCamera() {
  if (stream) stream.getTracks().forEach(track => { try { track.stop(); } catch (_) {} });
  stream = null;
  videoTrack = null;
  torchSupported = false;
  torchEnabled = false;
  const video = $('cameraVideo');
  if (video) { video.pause?.(); video.srcObject = null; }
  $('cameraStage')?.classList.remove('is-live');
  detectTorch();
}
function showLoader(title, subtitle, error = false) {
  const loader = $('cameraLoader');
  if (!loader) return;
  loader.classList.remove('hidden','is-error');
  loader.classList.toggle('is-error',error);
  $('cameraLoaderTitle').textContent = title || '';
  $('cameraLoaderSubtitle').textContent = subtitle || '';
  $('cameraLoaderRetry')?.classList.toggle('hidden',!error);
}
function hideLoader() {
  $('cameraLoader')?.classList.add('hidden');
  $('cameraLoaderRetry')?.classList.add('hidden');
}
async function waitForVideo(video,timeout=5000) {
  const until = Date.now()+timeout;
  while (Date.now()<until) {
    if (video.videoWidth && video.videoHeight && video.readyState>=2) return;
    await new Promise(resolve=>setTimeout(resolve,35));
  }
  throw new Error('Камера не передала изображение');
}
async function startCamera() {
  if (stream && videoTrack?.readyState === 'live') return true;
  if (cameraStarting) return cameraStarting;
  cameraStarting = (async()=>{
    showLoader('Запускаем камеру…','Подготавливаем изображение');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Камера недоступна в этом браузере');
      const openedStream = await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1440}}
      });
      if (!mounted) {
        openedStream.getTracks().forEach(track=>track.stop());
        throw new Error('Камера закрыта');
      }
      stream = openedStream;
      videoTrack = stream.getVideoTracks()[0] || null;
      if (!videoTrack) throw new Error('Камера не вернула видеопоток');
      const video = $('cameraVideo');
      video.srcObject = stream;
      await video.play();
      await waitForVideo(video);
      try {
        const focusModes = videoTrack.getCapabilities?.().focusMode || [];
        if (focusModes.includes('continuous')) await videoTrack.applyConstraints({advanced:[{focusMode:'continuous'}]});
      } catch (_) {}
      detectTorch();
      $('cameraStage')?.classList.add('is-live');
      hideLoader();
      return true;
    } catch(error) {
      stopCamera();
      showLoader('Не удалось открыть камеру',error.message || 'Проверь разрешение на камеру и повтори попытку.',true);
      return false;
    } finally { cameraStarting = null; }
  })();
  return cameraStarting;
}
function clearPhoto() {
  photoBlob = null;
  photoRandomId = null;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = '';
}
async function capturePhoto() {
  const roomNumber = String(selectedNumber);
  if (captureBusy || photoBlob || !roomNumber || isArrivalNotReady(roomByNumber(roomNumber))) {
    if (isArrivalNotReady(roomByNumber(roomNumber))) showNotice('Сначала отметь «Можно делать» для этого номера',true);
    return;
  }
  captureBusy = true;
  updateActionAvailability();
  try {
    await requestOrientationPermission();
    if (!stream || !videoTrack || videoTrack.readyState !== 'live') {
      const ready = await startCamera();
      if (!ready) throw new Error('Не удалось открыть камеру');
    }
    const video = $('cameraVideo');
    const canvas = $('cameraCanvas');
    // Freeze the current live frame immediately. Encoding happens after the preview is already visible.
    drawCaptureFrame(video,canvas);
    const previewCanvas = $('cameraPreviewCanvas');
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    previewCanvas.getContext('2d',{alpha:false}).drawImage(canvas,0,0);
    photoRandomId = String(Math.floor(Math.random()*2147483646)+1);
    photoBlob = null;
    const sendButton = $('cameraSendPhoto');
    sendButton.disabled = true;
    sendButton.textContent = 'Подготовка…';
    $('cameraPreviewRoom').textContent = 'Номер ' + roomNumber;
    $('cameraPreviewModal').classList.remove('hidden');
    $('cameraPreviewModal').setAttribute('aria-hidden','false');
    $('cameraCarouselWrap').classList.add('is-disabled');
    $('cameraStage').classList.add('is-preview');
    if (torchEnabled) void setTorch(false);
    // Scale and encode off the critical UI path; the user sees the captured frame without waiting for JPEG conversion.
    const maxEdge = 1600;
    const scale = Math.min(1,maxEdge/Math.max(canvas.width,canvas.height));
    const uploadCanvas = document.createElement('canvas');
    uploadCanvas.width = Math.max(1,Math.round(canvas.width*scale));
    uploadCanvas.height = Math.max(1,Math.round(canvas.height*scale));
    uploadCanvas.getContext('2d',{alpha:false}).drawImage(canvas,0,0,uploadCanvas.width,uploadCanvas.height);
    uploadCanvas.toBlob(blob=>{
      if (!mounted || !$('cameraPreviewModal') || $('cameraPreviewModal').classList.contains('hidden')) return;
      if (!blob) {
        showNotice('Не удалось подготовить фото. Пересними.',true);
        sendButton.disabled = true;
        sendButton.textContent = 'Ошибка подготовки';
        return;
      }
      photoBlob = blob;
      sendButton.disabled = false;
      sendButton.textContent = 'Отправить';
    },'image/jpeg',.84);
  } catch(error) {
    showNotice(error.message || 'Не удалось сделать снимок',true);
  } finally {
    captureBusy = false;
    updateActionAvailability();
  }
}
function closePreview(force = false) {
  if (captureBusy && !force) return;
  $('cameraPreviewModal')?.classList.add('hidden');
  $('cameraPreviewModal')?.setAttribute('aria-hidden','true');
  $('cameraCarouselWrap')?.classList.remove('is-disabled');
  $('cameraStage')?.classList.remove('is-preview');
  clearPhoto();
  if ($('cameraSendPhoto')) { $('cameraSendPhoto').disabled = false; $('cameraSendPhoto').textContent = 'Отправить'; }
  hideLoader();
  updateActionAvailability();
}
async function sendPhoto() {
  if (!photoBlob || !selectedNumber || captureBusy) return;
  captureBusy = true;
  const number = String(selectedNumber);
  const room = roomByNumber(number);
  const request = activeRefill(room);
  updateActionAvailability();
  const button = $('cameraSendPhoto');
  button.disabled = true;
  button.textContent = 'Отправляем…';
  try {
    const form = new FormData();
    form.append('photo',photoBlob,'photo.jpg');
    form.append('room',number);
    if (photoRandomId) form.append('random_id',photoRandomId);
    if (request?.id) form.append('refill_request_id',String(request.id));
    const response = await fetch('/minibar-os/vk-proxy/send-photo',{
      method:'POST',
      body:form,
      signal:AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось отправить фото');
    if (data.refill_synced !== false && request?.id) {
      activeRefills = activeRefills.filter(item => Number(item.id) !== Number(request.id));
    }
    closePreview(true);
    renderStandby();
    renderCarousel();
    showNotice(data.refill_synced === false
      ? 'Фото отправлено, но пополнение не закрылось автоматически'
      : 'Фото отправлено');
  } catch (error) {
    showNotice(error.message || 'Не удалось отправить фото',true);
  } finally {
    captureBusy = false;
    if ($('cameraSendPhoto')) {
      $('cameraSendPhoto').disabled = false;
      $('cameraSendPhoto').textContent = 'Отправить';
    }
    updateActionAvailability();
  }
}
async function sendRoomMessage(message, action) {
  if (!selectedNumber || captureBusy) return;
  captureBusy = true;
  updateActionAvailability();
  try {
    const response = await fetch('/minibar-os/vk-proxy/send-message',{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({message:String(selectedNumber)+' '+message})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось отправить сообщение');
    showNotice(action + ' · номер ' + selectedNumber);
  } catch (error) {
    showNotice(error.message || 'Не удалось отправить сообщение',true);
  } finally {
    captureBusy = false;
    updateActionAvailability();
  }
}
function refillItems(room, request) {
  const byId = new Map();
  productTemplate(room).forEach(item => byId.set(item.id,item));
  (request?.items || []).forEach(item => {
    const id = Number(item.productId);
    if (!id) return;
    const previous = byId.get(id);
    byId.set(id,{
      id,
      name:item.name || previous?.name || 'Продукт',
      category:item.category || previous?.category || 'Напитки',
      volume:item.volume ?? previous?.volume ?? null,
      unit:item.unit || previous?.unit || 'шт',
      emoji:item.emoji || previous?.emoji || null,
      bgColor:item.bgColor || previous?.bgColor || 'slate',
      maxQty:Math.max(1,Number(item.maxQty)||Number(previous?.maxQty)||Number(item.qty)||1)
    });
  });
  return [...byId.values()].sort((a,b) =>
    (categoryOrder.indexOf(a.category) < 0 ? 99 : categoryOrder.indexOf(a.category)) -
    (categoryOrder.indexOf(b.category) < 0 ? 99 : categoryOrder.indexOf(b.category)) ||
    a.name.localeCompare(b.name,'ru'));
}
function renderRefillProducts() {
  const room = roomByNumber(selectedNumber);
  const request = activeRefill(room);
  const items = refillItems(room,request);
  const host = $('refillProducts');
  if (!host) return;
  if (!items.length) {
    host.innerHTML = '<div class="refill-empty">У этого номера нет продуктов в шаблоне наполнения.</div>';
    return;
  }
  const groups = new Map();
  items.forEach(item => {
    if (!groups.has(item.category)) groups.set(item.category,[]);
    groups.get(item.category).push(item);
  });
  const ordered = [...categoryOrder.filter(key => groups.has(key)), ...[...groups.keys()].filter(key => !categoryOrder.includes(key)).sort((a,b)=>a.localeCompare(b,'ru'))];
  host.innerHTML = ordered.map(category =>
    '<section class="refill-category"><div class="refill-category-title">' + esc(category) + '</div>' +
    '<div class="refill-product-grid">' + groups.get(category).map(item => {
      const count = Math.min(item.maxQty,Number(refillCounts[item.id])||0);
      const selected = count > 0;
      const color = productColors[item.bgColor] || productColors.slate;
      const emoji = item.emoji || String(item.name || '?').charAt(0).toUpperCase();
      return '<button type="button" class="refill-product' + (selected?' is-selected':'') +
        '" data-refill-product="' + item.id + '" data-max="' + item.maxQty + '" aria-pressed="' + String(selected) + '">' +
        (selected ? '<span class="refill-product-count">' + count + '</span>' : '') +
        '<span class="refill-product-emoji" style="background:' + color + '">' + esc(emoji) + '</span>' +
        '<span class="refill-product-name">' + esc(item.name) + '</span>' +
        '</button>';
    }).join('') + '</div></section>'
  ).join('');
}
function openRefillModal() {
  const room = roomByNumber(selectedNumber);
  if (!room.id || refillBusy) return;
  const request = activeRefill(room);
  refillRequestId = request?.id || null;
  refillCounts = {};
  (request?.items || []).forEach(item => {
    refillCounts[Number(item.productId)] = Number(item.qty) || 0;
  });
  $('refillModalRoom').textContent = String(room.number);
  $('refillFeedback').textContent = '';
  $('refillModal').classList.remove('hidden');
  $('refillModal').setAttribute('aria-hidden','false');
  renderRefillProducts();
}
function closeRefillModal(force = false) {
  if (refillBusy && !force) return;
  $('refillModal')?.classList.add('hidden');
  $('refillModal')?.setAttribute('aria-hidden','true');
}
async function saveRefill() {
  const room = roomByNumber(selectedNumber);
  if (!room.id || refillBusy) return;
  const items = Object.entries(refillCounts)
    .map(([productId,qty])=>({productId:Number(productId),qty:Number(qty)}))
    .filter(item=>item.productId>0&&item.qty>0);
  if (!items.length && !activeRefill(room)) {
    $('refillFeedback').textContent = 'Отметь продукты или укажи потребность в пополнении.';
    return;
  }
  refillBusy = true;
  const saveButton = $('refillSave');
  saveButton.disabled = true;
  saveButton.textContent = 'Сохраняем…';
  try {
    const result = await api.post('refills',{
      roomId:Number(room.id),
      allProducts:false,
      expectedRequestId:refillRequestId,
      items
    });
    activeRefills = activeRefills.filter(item=>Number(item.roomId)!==Number(room.id));
    if (result.request?.status==='pending') activeRefills.push(result.request);
    closeRefillModal(true);
    renderStandby();
    renderCarousel();
    showNotice(result.request?.status==='cancelled'?'Потребность снята':'Пополнение сохранено');
  } catch (error) {
    $('refillFeedback').textContent = error.message || 'Не удалось сохранить пополнение';
  } finally {
    refillBusy = false;
    saveButton.disabled = false;
    saveButton.textContent = 'Сохранить пополнение';
    updateActionAvailability();
  }
}
async function markRoomEmpty() {
  const room = roomByNumber(selectedNumber);
  if (!room.id || refillBusy) return;
  refillBusy = true;
  try {
    await api.delete('rooms/' + Number(room.id) + '/product-statuses',{body:{roomStatus:'empty'}});
    room.expiryStatus = 'empty';
    const list = sourceData().data;
    if (list?.roomInfo?.[String(room.number)]) list.roomInfo[String(room.number)].expiryStatus = 'empty';
    const baseRoom = rooms.find(item => Number(item.id) === Number(room.id));
    if (baseRoom) baseRoom.expiryStatus = 'empty';
    $('refillModal')?.classList.add('hidden');
    $('refillModal')?.setAttribute('aria-hidden','true');
    renderStandby();
    renderCarousel();
    showNotice('Номер отмечен как пустой');
  } catch (error) {
    $('refillFeedback').textContent = error.message || 'Не удалось отметить номер пустым';
  } finally {
    refillBusy = false;
    updateActionAvailability();
  }
}
function handleClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const roomButton = target.closest('[data-camera-room]');
  if (roomButton) {
    if ($('cameraPreviewModal') && !$('cameraPreviewModal').classList.contains('hidden')) return;
    const next = roomButton.dataset.cameraRoom;
    setSelectedRoom(next,{center:true,behavior:'smooth'});
    return;
  }
  const product = target.closest('[data-refill-product]');
  if (product) {
    if (refillBusy) return;
    const id = Number(product.dataset.refillProduct);
    const max = Number(product.dataset.max) || 1;
    const current = Number(refillCounts[id]) || 0;
    refillCounts[id] = current >= max ? 0 : current + 1;
    renderRefillProducts();
    return;
  }
  const action = target.closest('[data-camera-action]')?.dataset.cameraAction;
  if (!action) {
    if (target.id === 'refillModal') closeRefillModal();
    if (target.id === 'cameraPreviewModal') closePreview();
    return;
  }
  if (action === 'capture') void capturePhoto();
  else if (action === 'retry-camera') { hideLoader(); void startCamera(); }
  else if (action === 'toggle-flash') void toggleTorch();
  else if (action === 'retake') closePreview();
  else if (action === 'send-photo') void sendPhoto();
  else if (action === 'empty') void sendRoomMessage('опустошён','Опустошение отправлено');
  else if (action === 'residential') void sendRoomMessage('проверен, жилой','Отметка «Жилой» отправлена');
  else if (action === 'open-refill') openRefillModal();
  else if (action === 'close-refill') closeRefillModal();
  else if (action === 'save-refill') void saveRefill();
  else if (action === 'clear-refill') {
    if (refillBusy) return;
    refillCounts = {};
    renderRefillProducts();
  }
  else if (action === 'refill-all') void markRoomEmpty();
}
function attachCarouselScroll(carousel = $('cameraCarousel')) {
  if (!carousel || carousel.dataset.cameraScrollBound === '1') return;
  carousel.dataset.cameraScrollBound = '1';
  carousel.addEventListener('scroll',() => {
    cancelAnimationFrame(carouselFrame);
    carouselFrame = requestAnimationFrame(() => {
      const rect = carousel.getBoundingClientRect();
      const center = rect.top + rect.height/2;
      let best = null, distance = Infinity;
      carousel.querySelectorAll('[data-camera-room]').forEach(item => {
        const box = item.getBoundingClientRect();
        const delta = Math.abs(box.top + box.height/2 - center);
        if (delta < distance) { distance=delta; best=item; }
      });
      if (best && best.dataset.cameraRoom !== selectedNumber) setSelectedRoom(best.dataset.cameraRoom);
    });
  },{passive:true});
}
function bind() {
  if (bound) return;
  bound = true;
  document.addEventListener('click',handleClick);
}
export function renderCamera(state) {
  const type = state.cameraSourceListType || state.listType || 'arrivals';
  const data = state.listData?.[type];
  const numbers = data?.roomNumbers || rooms.map(room=>String(room.number));
  const initial = String(state.cameraSelectedRoomNumber || selectedNumber || numbers[0] || '');
  if (initial && initial !== selectedNumber) selectedNumber = initial;
  return '<div class="screen screen-camera" id="cameraStage">' +
    '<aside class="camera-carousel-wrap" id="cameraCarouselWrap"><div class="camera-carousel" id="cameraCarousel"></div></aside>' +
    '<section class="camera-workspace">' +
      '<div class="camera-viewport" id="cameraViewport">' +
        '<video id="cameraVideo" autoplay playsinline muted></video><canvas id="cameraCanvas" hidden></canvas>' +
        '<div class="camera-focus-frame" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
        '<button type="button" class="camera-flash" data-camera-action="toggle-flash" id="cameraFlash" hidden aria-label="Включить вспышку" aria-pressed="false">' + icon('flashlight',18) + '</button>' +
        '<div class="camera-standby" id="cameraStandby"></div>' +
        '<div class="camera-loader hidden" id="cameraLoader"><span class="camera-loader-spinner"></span><strong id="cameraLoaderTitle">Запуск камеры…</strong><small id="cameraLoaderSubtitle"></small><button type="button" class="camera-retry hidden" data-camera-action="retry-camera" id="cameraLoaderRetry">Повторить</button></div>' +
      '</div>' +
      '<div class="camera-action-row">' +
        '<button type="button" class="camera-room-action" data-camera-action="empty" id="cameraActionEmpty">' + icon('droplets',14) + ' Опустошён</button>' +
        '<button type="button" class="camera-room-action is-primary" data-camera-action="open-refill" id="cameraActionRefill">' + icon('package-plus',14) + ' Пополнить</button>' +
        '<button type="button" class="camera-room-action" data-camera-action="residential" id="cameraActionResidential">' + icon('house',14) + ' Жилой</button>' +
      '</div>' +
      '<div class="camera-capture-zone"><button type="button" class="camera-capture-button" data-camera-action="capture" id="cameraCapture" aria-label="Сделать фото"><span></span></button></div>' +
    '</section>' +
    '<div class="camera-feedback" id="cameraFeedback" role="status"></div>' +
    '<div class="camera-modal-overlay hidden" id="cameraPreviewModal" role="dialog" aria-modal="true" aria-label="Предпросмотр фотографии" aria-hidden="true">' +
      '<div class="camera-preview-card"><div class="camera-preview-room" id="cameraPreviewRoom">Номер</div><canvas id="cameraPreviewCanvas" class="camera-preview-canvas"></canvas><div class="camera-preview-actions"><button type="button" class="camera-preview-secondary" data-camera-action="retake">Переснять</button><button type="button" class="camera-preview-primary" data-camera-action="send-photo" id="cameraSendPhoto">Отправить</button></div></div>' +
    '</div>' +
    '<div class="camera-modal-overlay hidden" id="refillModal" role="dialog" aria-modal="true" aria-label="Пополнить номер" aria-hidden="true">' +
      '<div class="camera-refill-modal"><header class="camera-modal-header"><strong>Пополнить · номер <span id="refillModalRoom"></span></strong><button type="button" data-camera-action="close-refill" aria-label="Закрыть">×</button></header>' +
        '<div class="camera-refill-products" id="refillProducts"></div><div class="camera-refill-feedback" id="refillFeedback"></div>' +
        '<footer class="camera-refill-footer"><button type="button" class="camera-refill-all" data-camera-action="refill-all">Всё в списке продуктов</button><div class="camera-refill-footer-row"><button type="button" data-camera-action="clear-refill">Очистить</button><button type="button" class="is-save" data-camera-action="save-refill" id="refillSave">Сохранить пополнение</button></div></footer>' +
      '</div>' +
    '</div>' +
  '</div>';
}
export function cameraDidRender() {
  bind();
  if (mounted) {
    const video = $('cameraVideo');
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(()=>{});
      $('cameraStage')?.classList.add('is-live');
    }
    renderCarousel();
    renderStandby();
    return;
  }
  mounted = true;
  void loadCameraData();
  renderCarousel();
  renderStandby();
  void startCamera();
}
export function cameraWillUnmount() {
  mounted = false;
  loadToken++;
  if (carouselTimer) clearTimeout(carouselTimer);
  if (stream) stopCamera();
  cameraStarting = null;
  clearPhoto();
}
