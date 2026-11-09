import { api } from '../core/api.js';
import { getState } from '../core/store.js';
import { loadList } from './lists.js';
import { icon, renderIcons } from '../components/icons.js';

let stream = null;
let videoTrack = null, torchSupported = null, torchArmed = false;
let currentDeviceAngle = 0;
let lastSensorOrientationAt = 0;
let hasSensorOrientation = false;
let hasMotionOrientation = false;
let orientationPermissionPromise = null;
let orientationPermissionGranted = false;
let selectedNumber = '';
let rooms = [];
const completedInCamera = new Map();
let activeRefills = [];
let refillCounts = {};
let refillRequestId = null;
let refillAllSelected = false;
let refillBusy = false;
let photoSending = false;
let deadlineBusy = false;
let deadlineRoomNumber = '';
let deadlineProducts = [];
let deadlineSelections = {};
let photoBlob = null;
let photoPreparationPromise = null;
let sharedRoomActionChanged = null;
let sharedRoomActionNumber = '';
let sharedRoomActionRoom = null;
let photoQueueDbPromise = null;
let photoQueueWorkerActive = false;
let photoQueueRetryTimer = null;
let photoQueueStatusTimer = null;
let pendingPhotoWriteActive = false;
let pendingPhotoWriteTimer = null;
const pendingPhotoWrites = new Map();
let photoUrl = '';
let photoRandomId = null;
let photoPreparationToken = 0;
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
  const shared = String(sharedRoomActionNumber) === String(number) ? (sharedRoomActionRoom || {}) : {};
  return { ...room, ...info, ...shared, number:String(number || '') };
}

function roomNumbers() {
  const state = getState();
  const { type, data } = sourceData();
  if (type === 'room-single') {
    const number = String(state.cameraSelectedRoomNumber || selectedNumber || '');
    return number ? [number] : [];
  }
  if (Array.isArray(data?.roomNumbers)) return [...new Set(data.roomNumbers.map(String))];
  return rooms.map(room => String(room.number));
}

function carouselRoomNumbers() {
  const state = getState();
  const { type, data } = sourceData();
  const all = roomNumbers();
  const completed = new Set([
    ...(data?.checkedRoomNumbers || []),
    ...(data?.completedNumbers || []),
    ...(completedInCamera.get(type) || [])
  ].map(String));
  let visible = all.filter(number => !completed.has(number));

  if (type === 'arrivals') {
    const ready = Array.isArray(data?.readyNumbers)
      ? new Set(data.readyNumbers.map(String))
      : new Set(all.filter(number => listEntry(number).ready === true));
    visible = visible.filter(number => ready.has(number));
  }

  // Match the list screen's exact numeric sort preference.
  const descending = state.listUi?.sort === 'desc';
  visible.sort((a, b) => descending ? Number(b) - Number(a) : Number(a) - Number(b));
  return visible;
}
function rememberCompletedRoom(type, number) {
  if (!completedInCamera.has(type)) completedInCamera.set(type, new Set());
  completedInCamera.get(type).add(String(number));
}
async function advanceAfterRoomCompletion(type, number) {
  const previousOrder = carouselRoomNumbers();
  const previousIndex = previousOrder.indexOf(String(number));
  rememberCompletedRoom(type, number);
  const remainingNow = carouselRoomNumbers();
  const nextNow = previousIndex >= 0
    ? previousOrder.slice(previousIndex + 1).find(candidate => remainingNow.includes(candidate))
    : null;
  const next = nextNow || remainingNow[0] || '';
  if (next) setSelectedRoom(next, { center: true, behavior: 'smooth', haptic: true });
  else {
    selectedNumber = '';
    renderCarousel();
    renderStandby();
    updateActionAvailability();
  }

  const selectionAtRefresh = selectedNumber;
  void loadList(type).then(() => {
    if (!mounted || selectedNumber !== selectionAtRefresh) return;
    const latest = carouselRoomNumbers();
    if (selectedNumber && latest.includes(selectedNumber)) {
      renderCarousel();
      renderStandby();
      return;
    }
    const fallback = latest[0] || '';
    if (fallback) setSelectedRoom(fallback, { center: true, behavior: 'smooth' });
    else {
      selectedNumber = '';
      renderCarousel();
      renderStandby();
      updateActionAvailability();
    }
  }).catch(() => {});
}

function listEntry(number) {
  const { data } = sourceData();
  return data?.entries?.[String(number)] || {};
}
function cameraRoomComment(number) {
  const room = roomByNumber(number);
  const values = [listEntry(number).comment, room.comment, $('cameraComment')?.value]
    .map(value => String(value || '').trim())
    .filter(Boolean);
  return [...new Set(values)].join(' · ').slice(0, 240);
}
function updatePreviewHeading() {
  const preview = $('cameraPreviewModal');
  const heading = $('cameraPreviewRoom');
  if (!preview || preview.classList.contains('hidden') || !heading) return;
  const number = String(selectedNumber || '');
  const comment = cameraRoomComment(number);
  heading.textContent = 'Номер ' + number + (comment ? ' (' + comment + ')' : '');
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
function renderStatusChips(room) {
  const { type } = sourceData();
  const entry = listEntry(room.number);
  const chips = [];
  if (entry.vip) chips.push('<span class="camera-info-chip is-vip">' + icon('crown',12) + ' VIP</span>');
  if (entry.time) chips.push('<span class="camera-info-chip">' + icon('clock',12) + ' ' + esc(entry.time) + '</span>');
  if (type === 'arrivals') {
    chips.push(entry.ready === true
      ? '<span class="camera-info-chip is-ready">' + icon('check',12) + ' Можно делать</span>'
      : '<span class="camera-info-chip is-not-ready">Пока нельзя</span>');
  }
  if (room.expiryStatus === 'empty') chips.push('<span class="camera-info-chip is-empty">Пустой</span>');
  if (entry.empty) chips.push('<span class="camera-info-chip is-empty-action">Опустошить</span>');
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
  const productsWasOpen = Boolean(panel.querySelector('.camera-list-products-dropdown')?.open);
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
    : room.expiryStatus === 'needs_replacement' || (room.productStatuses || []).some(item => item.expiryStatus === 'needs_replacement' || Number(item.qtyToReplace) > 0) ? 'is-deadline' : '';
  const summary = refillDescription(refill);
  const { type } = sourceData();
  const listTitle = type === 'arrivals' ? 'Заезды' : type === 'departures' ? 'Выезды' : 'Вне списков';
  panel.innerHTML =
    '<section class="camera-info-panel">' +
      '<header class="camera-info-room">' +
        '<div class="camera-info-room-main"><strong>Номер ' + esc(room.number) + '</strong>' +
          '<span>' + esc([floor,category].filter(Boolean).join(' · ')) + '</span></div>' +
        '<span class="camera-info-list-name">' + listTitle + '</span>' +
      '</header>' +
      '<div class="camera-info-chips">' + renderStatusChips(room) + '</div>' +
      '<div class="camera-info-grid">' +
        '<button type="button" class="camera-info-tile camera-info-tile-button ' + deadlineClass + '" data-camera-open="deadlines" aria-label="Открыть сроки номера ' + esc(room.number) + '">' +
          '<span class="camera-info-tile-label">' + icon('calendar-clock',13) + ' Сроки ' + icon('chevron-right',12) + '</span>' +
          '<strong>' + esc(deadline) + '</strong>' +
          (room.productStatuses?.length ? '<small>' + room.productStatuses.length + ' отмет.</small>' : '') +
        '</button>' +
        '<button type="button" class="camera-info-tile camera-info-tile-button is-refill" data-camera-open="refill" aria-label="Открыть пополнение номера ' + esc(room.number) + '">' +
          '<span class="camera-info-tile-label">' + icon('package',13) + ' Пополнение ' + icon('chevron-right',12) + '</span>' +
          '<strong>' + summary + '</strong>' +
        '</button>' +
      '</div>' +
    '</section>' + renderListRefillSummary();
  const productsDropdown = panel.querySelector('.camera-list-products-dropdown');
  if (productsWasOpen && productsDropdown) productsDropdown.open = true;
  renderIcons();
}
function updateActionAvailability() {
  const room = roomByNumber(selectedNumber);
  const disabled = !room.id || captureBusy || refillBusy;
  ['cameraActionEmpty','cameraActionResidential','cameraCapture'].forEach(id => {
    const button = $(id);
    if (button) button.disabled = disabled;
  });
}
function renderCarousel() {
  const host = $('cameraCarousel');
  const wrap = $('cameraCarouselWrap');
  if (!host || !wrap) return;
  const numbers = carouselRoomNumbers();
  if (!numbers.length) {
    host.innerHTML = '';
    wrap.classList.add('is-disabled');
    updateActionAvailability();
    return;
  }
  wrap.classList.remove('is-disabled');
  if (selectedNumber && !roomNumbers().includes(selectedNumber)) selectedNumber = '';
  host.innerHTML = numbers.map(number => {
    const room = roomByNumber(number);
    const refill = activeRefill(room);
    const entry = listEntry(number);
    const isPhysicallyEmpty = room.expiryStatus === 'empty';
    const needsEmptying = Boolean(entry.empty);
    const needsDeadline = room.expiryStatus === 'needs_replacement' ||
      (room.productStatuses || []).some(item => item.expiryStatus === 'needs_replacement' || Number(item.qtyToReplace) > 0);
    const needsRefill = Boolean(refill?.items?.length);
    const classes = ['camera-number-item'];
    if (String(number) === String(selectedNumber)) classes.push('is-active');
    if (isPhysicallyEmpty) classes.push('is-empty');
    if (needsEmptying) classes.push('is-empty-action');
    if (needsDeadline) classes.push('is-deadline');
    if (needsRefill) classes.push('is-refill');
    const checked = (getState().listData?.[getState().cameraSourceListType || getState().listType]?.checkedRoomNumbers ||
      getState().listData?.[getState().cameraSourceListType || getState().listType]?.completedNumbers || []).map(String).includes(String(number));
    if (checked) classes.push('is-checked');
    const marks=[];
    if(entry.vip)marks.push('<i class="camera-room-marker is-vip" title="VIP">'+icon('crown',9)+'</i>');
    const isArrival = (getState().cameraSourceListType || getState().listType) === 'departures' &&
      (getState().listData?.departures?.arrivalRooms || []).map(String).includes(String(number));
    if(isArrival)marks.push('<i class="camera-room-marker is-arrival" title="На заезд" aria-label="На заезд">'+icon('log-in',9)+'</i>');
    if(isPhysicallyEmpty)marks.push('<i class="camera-room-marker is-empty" title="Пустой" aria-label="Пустой">'+icon('package-open',9)+'</i>');
    if(needsEmptying)marks.push('<i class="camera-room-marker is-empty-action" title="Опустошить" aria-label="Опустошить">'+icon('package-x',9)+'</i>');
    if(needsDeadline)marks.push('<i class="camera-room-marker is-deadline" title="Сроки">'+icon('timer',9)+'</i>');
    if(needsRefill)marks.push('<i class="camera-room-marker is-refill" title="Пополнение">'+icon('package',9)+'</i>');
    if(entry.comment)marks.push('<i class="camera-room-marker is-comment" title="Комментарий">'+icon('message-square',9)+'</i>');
    if(checked)marks.push('<i class="camera-room-marker is-checked" title="Проверен">'+icon('check',9)+'</i>');
    return '<button type="button" class="' + classes.join(' ') + '" data-camera-room="' + esc(number) + '"><strong>'+esc(number)+'</strong><span class="camera-room-markers">'+marks.slice(0,5).join('')+'</span></button>';
  }).join('');
  const active = host.querySelector('.is-active');
  if (active) centerRoom(selectedNumber, 'auto');
  attachCarouselScroll(host);
  updateActionAvailability();
  renderIcons();
}
function centerRoom(number, behavior = 'smooth') {
  const host = $('cameraCarousel');
  if (!host) return;
  const item = [...host.querySelectorAll('[data-camera-room]')]
    .find(element => element.dataset.cameraRoom === String(number));
  if (!item) return;
  const hostRect = host.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const topPadding = 8;
  const target = host.scrollTop + itemRect.top - hostRect.top - topPadding;
  host.scrollTo({ top: Math.max(0, target), behavior });
}
function triggerCarouselHaptic() {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate([42, 28, 42]);
  } catch (_) {}
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
  if (changed && options.haptic) triggerCarouselHaptic();
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
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function requestOrientationPermission() {
  if (orientationPermissionGranted) return true;
  if (orientationPermissionPromise) return orientationPermissionPromise;
  const Orientation = window.DeviceOrientationEvent;
  const Motion = window.DeviceMotionEvent;
  const request = typeof Orientation?.requestPermission === 'function'
    ? Orientation.requestPermission.bind(Orientation)
    : typeof Motion?.requestPermission === 'function' ? Motion.requestPermission.bind(Motion) : null;
  if (!request) {
    orientationPermissionGranted = true;
    return true;
  }
  orientationPermissionPromise = request().then(result => {
    orientationPermissionGranted = result === 'granted';
    return orientationPermissionGranted;
  }).catch(() => false).finally(() => { orientationPermissionPromise = null; });
  return orientationPermissionPromise;
}

/* Match the tested legacy sensor logic: gravity orientation wins over the
   screen angle; Euler angles remain only a fallback. */
function updateOrientationFromScreen() {
  if (hasSensorOrientation) return;
  let angle = null;
  if (window.screen?.orientation &&
      typeof window.screen.orientation.angle === 'number') {
    angle = normalizeAngle(window.screen.orientation.angle);
  } else if (typeof window.orientation === 'number') {
    angle = normalizeAngle(window.orientation);
  } else if (window.innerWidth > window.innerHeight) {
    angle = 90;
  }
  if (angle !== null && [0, 90, 180, 270].includes(angle)) {
    currentDeviceAngle = angle;
  }
}
function applyGravityOrientation(x, y, fromMotion = false) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  if (Math.max(absX, absY) < 5.5 ||
      Math.min(absX, absY) > Math.max(absX, absY) * 0.72) return;
  const nextAngle = absY > absX
    ? (y >= 0 ? 0 : 180)
    : (x >= 0 ? 90 : 270);
  if (fromMotion) hasMotionOrientation = true;
  if (nextAngle === currentDeviceAngle) return;
  currentDeviceAngle = nextAngle;
  hasSensorOrientation = true;
  lastSensorOrientationAt = Date.now();
}
function updateOrientationFromMotion(event) {
  const gravity = event?.accelerationIncludingGravity;
  if (gravity) applyGravityOrientation(gravity.x, gravity.y, true);
}
function updateOrientationFromSensor(beta, gamma) {
  if (hasMotionOrientation || !Number.isFinite(beta) || !Number.isFinite(gamma)) return;
  const betaProjection = Math.sin(beta * Math.PI / 180);
  const gammaProjection = Math.sin(gamma * Math.PI / 180);
  const absBeta = Math.abs(betaProjection);
  const absGamma = Math.abs(gammaProjection);
  if (Math.max(absBeta, absGamma) < 0.62) return;
  let nextAngle = null;
  if (absBeta > absGamma * 1.25) {
    nextAngle = betaProjection >= 0 ? 0 : 180;
  } else if (absGamma > absBeta * 1.25) {
    nextAngle = gammaProjection > 0 ? 90 : 270;
  }
  if (nextAngle === null || nextAngle === currentDeviceAngle) return;
  currentDeviceAngle = nextAngle;
  hasSensorOrientation = true;
  lastSensorOrientationAt = Date.now();
}
function getPhysicalDeviceAngle() {
  if (hasMotionOrientation || hasSensorOrientation) return currentDeviceAngle;
  updateOrientationFromScreen();
  return currentDeviceAngle;
}
function getCaptureOrientationAngle(sourceWidth = $('cameraVideo')?.videoWidth || 0,
                                    sourceHeight = $('cameraVideo')?.videoHeight || 0) {
  const deviceAngle = getPhysicalDeviceAngle();
  if (sourceWidth > sourceHeight) {
    if (deviceAngle === 90) return 180;
    if (deviceAngle === 270) return 0;
    return deviceAngle;
  }
  return normalizeAngle(deviceAngle);
}
function syncViewportAfterOrientationChange() {
  updateOrientationFromScreen();
}
window.addEventListener('orientationchange', syncViewportAfterOrientationChange);
if (window.screen?.orientation?.addEventListener) {
  window.screen.orientation.addEventListener('change', syncViewportAfterOrientationChange);
}
if (window.DeviceMotionEvent) {
  window.addEventListener('devicemotion', updateOrientationFromMotion, true);
}
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', event => {
    updateOrientationFromSensor(event.beta, event.gamma);
  }, true);
}
updateOrientationFromScreen();

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => {
      try { track.stop(); } catch (_) {}
    });
  }
  stream = null;
  videoTrack = null;
  torchSupported = null;
  torchArmed = false;
  const video = $('cameraVideo');
  if (video) {
    video.pause?.();
    video.srcObject = null;
    video.style.transform = 'none';
    video.style.inset = '';
    video.style.left = '';
    video.style.top = '';
    video.style.width = '';
    video.style.height = '';
  }
  $('cameraStage')?.classList.remove('is-live');
}
async function setTorch(enabled) {
  if (!videoTrack) return false;
  if (!enabled && !torchArmed) return true;
  try {
    await videoTrack.applyConstraints({ advanced: [{ torch: Boolean(enabled) }] });
    torchArmed = Boolean(enabled);
    return true;
  } catch (_) {
    if (enabled) torchSupported = false;
    torchArmed = false;
    return false;
  }
}
async function armTorch() {
  if (!videoTrack || torchSupported === false) return false;
  return setTorch(true);
}
async function startCamera() {
  if (stream && videoTrack) {
    const existingVideo = $('cameraVideo');
    if (existingVideo && existingVideo.srcObject !== stream) {
      existingVideo.srcObject = stream;
      await existingVideo.play().catch(() => {});
      await waitForVideo(existingVideo);
    }
    $('cameraStage')?.classList.add('is-live');
    hideLoader();
    return true;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showLoader('Камера недоступна', 'Разреши доступ к камере в VK.', true);
    return false;
  }
  showLoader('Запуск камеры…', '');
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        aspectRatio: { ideal: 4 / 3 },
        width: { ideal: 1920 },
        height: { ideal: 1440 }
      }
    });
    videoTrack = stream.getVideoTracks()[0] || null;
    if (!videoTrack) throw new Error('Камера не вернула видеопоток');
    try {
      const capabilities = videoTrack.getCapabilities?.();
      torchSupported = capabilities ? capabilities.torch === true : null;
    } catch (_) {
      torchSupported = null;
    }
    const video = $('cameraVideo');
    if (!video) throw new Error('Не найдено окно камеры');
    video.srcObject = stream;
    await video.play();
    await waitForVideo(video);
    $('cameraStage')?.classList.add('is-live');
    hideLoader();
    return true;
  } catch (error) {
    stopCamera();
    showLoader('Не удалось открыть камеру', error.message || 'Проверь разрешение на камеру.', true);
    return false;
  }
}

function showLoader(title, subtitle, error = false) {
  const loader = $('cameraLoader');
  if (!loader) return;
  loader.classList.remove('hidden','is-error');
  loader.classList.toggle('is-error', error);
  $('cameraLoaderRetry').classList.toggle('hidden', !error);
  $('cameraLoaderTitle').textContent = title || '';
  $('cameraLoaderSubtitle').textContent = subtitle || '';
  $('cameraLoaderRetry').classList.toggle('hidden', !error);
}
function hideLoader() {
  $('cameraLoader')?.classList.add('hidden');
  $('cameraLoaderRetry')?.classList.add('hidden');
}
function clearPhoto() {
  photoPreparationToken++;
  photoBlob = null;
  photoPreparationPromise = null;
  photoRandomId = null;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = '';
}

async function waitForVideo(video, timeoutMs = 4500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
      if (typeof video.requestVideoFrameCallback === 'function') {
        await new Promise(resolve => video.requestVideoFrameCallback(() => resolve()));
      } else {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      return;
    }
    await wait(40);
  }
  throw new Error('Камера не успела подготовить изображение');
}
async function waitForOrientationToSettle() {
  const sensorTimestampBeforeWait = lastSensorOrientationAt;
  await (orientationPermissionPromise || Promise.resolve());
  const deadline = Date.now() + 420;
  while (Date.now() < deadline) {
    if (lastSensorOrientationAt > sensorTimestampBeforeWait) {
      await wait(60);
      return;
    }
    if (Date.now() - lastSensorOrientationAt < 900) {
      await wait(80);
      return;
    }
    await wait(40);
  }
}
function drawSourceToCanvas(source, srcW, srcH, angle = 0) {
  const canvas = $('cameraCanvas');
  if (!srcW || !srcH) throw new Error('Frame error');

  angle = normalizeAngle(angle);
  const quarterTurn = angle === 90 || angle === 270;
  canvas.width = quarterTurn ? srcH : srcW;
  canvas.height = quarterTurn ? srcW : srcH;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Не удалось подготовить снимок');

  ctx.save();
  if (angle === 90) {
    ctx.translate(srcH, 0);
    ctx.rotate(Math.PI / 2);
  } else if (angle === 180) {
    ctx.translate(srcW, srcH);
    ctx.rotate(Math.PI);
  } else if (angle === 270) {
    ctx.translate(0, srcW);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(source, 0, 0, srcW, srcH);
  ctx.restore();
}

/* Native still capture is consistently upside down in landscape in the VK WebView.
   Correct only the final landscape raster; portrait captures remain untouched. */
function correctNativeLandscapeCapture() {
  const canvas = $('cameraCanvas');
  if (!canvas.width || !canvas.height || canvas.width <= canvas.height) return;

  const source = document.createElement('canvas');
  source.width = canvas.width;
  source.height = canvas.height;
  const sourceContext = source.getContext('2d', { alpha: false });
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!sourceContext || !ctx) throw new Error('Не удалось подготовить снимок');

  sourceContext.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(-1, 0, 0, -1, canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  ctx.restore();
}

/* Prefer a full-resolution still photo when the browser supports it.
   Decode EXIF orientation first, then apply the physical-phone turn exactly once. */
async function prepareCameraFocus() {
  if (!videoTrack || typeof videoTrack.getCapabilities !== 'function') return;
  try {
    const capabilities = videoTrack.getCapabilities();
    const modes = Array.isArray(capabilities.focusMode) ? capabilities.focusMode : [];
    if (modes.includes('continuous')) {
      await videoTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
      await wait(100);
    } else if (modes.includes('single-shot')) {
      await videoTrack.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
      await wait(140);
    }
  } catch (error) {
    // Some WebViews expose focus capabilities but reject focus constraints.
    // ImageCapture can still run the camera's normal autofocus sequence.
    console.debug('[MINIBAR CAMERA] Explicit autofocus constraint unavailable:', error);
  }
}

/* Read EXIF Orientation ourselves, then remove the EXIF segment before decoding.
   This prevents browser auto-rotation and lets us apply orientation exactly once. */
function readExifOrientation(bytes, payload, segmentEnd) {
  const exifSignature = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  if (payload + 14 > segmentEnd ||
      !exifSignature.every((value, i) => bytes[payload + i] === value)) return null;

  const tiff = payload + 6;
  const byteOrder = String.fromCharCode(bytes[tiff], bytes[tiff + 1]);
  const littleEndian = byteOrder === 'II';
  if (!littleEndian && byteOrder !== 'MM') return null;

  const u16 = offset => {
    if (offset < tiff || offset + 2 > segmentEnd) return null;
    return littleEndian
      ? bytes[offset] | (bytes[offset + 1] << 8)
      : (bytes[offset] << 8) | bytes[offset + 1];
  };
  const u32 = offset => {
    if (offset < tiff || offset + 4 > segmentEnd) return null;
    return littleEndian
      ? (bytes[offset] | (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
      : ((bytes[offset] << 24) | (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
  };

  if (u16(tiff + 2) !== 42) return null;
  const ifdOffset = u32(tiff + 4);
  if (ifdOffset === null) return null;
  const ifd = tiff + ifdOffset;
  const entryCount = u16(ifd);
  if (entryCount === null) return null;

  for (let i = 0; i < entryCount; i++) {
    const entry = ifd + 2 + i * 12;
    const tag = u16(entry);
    if (tag === null || entry + 12 > segmentEnd) return null;
    if (tag !== 0x0112) continue;

    const type = u16(entry + 2);
    const count = u32(entry + 4);
    if (type !== 3 || count !== 1) return null;
    const orientation = u16(entry + 8);
    return orientation >= 1 && orientation <= 8 ? orientation : null;
  }
  return null;
}

async function stripJpegExifMetadata(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { blob, orientation: null };
  }

  const parts = [bytes.subarray(0, 2)];
  let offset = 2;
  let removedExif = false;
  let orientation = null;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Не удалось прочитать заголовок JPEG');

    const markerStart = offset;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) throw new Error('Повреждённый заголовок JPEG');

    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) {
      parts.push(bytes.subarray(markerStart));
      return {
        blob: removedExif ? new Blob(parts, { type: blob.type || 'image/jpeg' }) : blob,
        orientation
      };
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(markerStart, offset));
      continue;
    }

    if (offset + 2 > bytes.length) throw new Error('Повреждённый сегмент JPEG');
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.length) {
      throw new Error('Некорректная длина сегмента JPEG');
    }

    const payload = offset + 2;
    const isExifSegment = marker === 0xe1 &&
      bytes[payload] === 0x45 && bytes[payload + 1] === 0x78 &&
      bytes[payload + 2] === 0x69 && bytes[payload + 3] === 0x66 &&
      bytes[payload + 4] === 0x00 && bytes[payload + 5] === 0x00;

    if (isExifSegment) {
      if (orientation === null) orientation = readExifOrientation(bytes, payload, segmentEnd);
      removedExif = true;
    } else {
      parts.push(bytes.subarray(markerStart, segmentEnd));
    }
    offset = segmentEnd;
  }

  return {
    blob: removedExif ? new Blob(parts, { type: blob.type || 'image/jpeg' }) : blob,
    orientation
  };
}

function drawExifOrientedToCanvas(source, srcW, srcH, orientation) {
  const canvas = $('cameraCanvas');
  if (!srcW || !srcH) throw new Error('Frame error');
  const turn = orientation >= 5 && orientation <= 8;
  canvas.width = turn ? srcH : srcW;
  canvas.height = turn ? srcW : srcH;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Не удалось подготовить снимок');

  // EXIF values 1–8 include rotations and mirrored orientations.
  switch (orientation) {
    case 2: ctx.setTransform(-1, 0, 0, 1, srcW, 0); break;
    case 3: ctx.setTransform(-1, 0, 0, -1, srcW, srcH); break;
    case 4: ctx.setTransform(1, 0, 0, -1, 0, srcH); break;
    case 5: ctx.setTransform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.setTransform(0, 1, -1, 0, srcH, 0); break;
    case 7: ctx.setTransform(0, -1, -1, 0, srcH, srcW); break;
    case 8: ctx.setTransform(0, -1, 1, 0, 0, srcW); break;
    default: ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.drawImage(source, 0, 0, srcW, srcH);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

async function captureStillPhotoToCanvas() {
  if (typeof window.ImageCapture !== 'function' ||
      typeof window.createImageBitmap !== 'function' ||
      !videoTrack) {
    return false;
  }

  let bitmap = null;
  try {
    const capture = new window.ImageCapture(videoTrack);
    const photoBlob = await capture.takePhoto();
    if (torchArmed) await setTorch(false);
    if (!photoBlob || !photoBlob.size) throw new Error('Камера вернула пустое фото');

    const decoded = await stripJpegExifMetadata(photoBlob);
    bitmap = await window.createImageBitmap(decoded.blob);
    if (decoded.orientation !== null) {
      drawExifOrientedToCanvas(bitmap, bitmap.width, bitmap.height, decoded.orientation);
    } else {
      drawSourceToCanvas(
        bitmap,
        bitmap.width,
        bitmap.height,
        getCaptureOrientationAngle(bitmap.width, bitmap.height)
      );
    }
    return true;
  } catch (error) {
    console.warn('[MINIBAR CAMERA] Native still capture unavailable; falling back to video frame:', error);
    return false;
  } finally {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
  }
}


function cropCanvasToFourThree() {
  const canvas = $('cameraCanvas');
  if (!canvas?.width || !canvas?.height) return;
  const landscape = canvas.width >= canvas.height;
  const targetRatio = landscape ? 4 / 3 : 3 / 4;
  const currentRatio = canvas.width / canvas.height;
  if (Math.abs(currentRatio - targetRatio) < 0.008) return;

  let sx = 0, sy = 0, sw = canvas.width, sh = canvas.height;
  if (currentRatio > targetRatio) {
    sw = canvas.height * targetRatio;
    sx = (canvas.width - sw) / 2;
  } else {
    sh = canvas.width / targetRatio;
    sy = (canvas.height - sh) / 2;
  }
  const source = document.createElement('canvas');
  source.width = canvas.width;
  source.height = canvas.height;
  const sourceContext = source.getContext('2d', { alpha: false });
  const context = canvas.getContext('2d', { alpha: false });
  if (!sourceContext || !context) throw new Error('Не удалось обрезать фото до 4:3');
  sourceContext.drawImage(canvas, 0, 0);
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
}
async function capturePhoto() {
  const room = roomByNumber(selectedNumber);
  if (captureBusy) {
    showNotice('Камера уже выполняет действие. Подожди немного.');
    return;
  }
  // A previous preview may have been closed while JPEG encoding was still running.
  // Discard that stale result instead of silently blocking the next capture.
  if ($('cameraPreviewModal')?.classList.contains('hidden') && (photoBlob || photoPreparationPromise)) clearPhoto();
  if (!room.id) {
    showNotice('Сначала выбери номер из списка.', true);
    return;
  }

  const number = String(selectedNumber);
  captureBusy = true;
  updateActionAvailability();
  try {
    await requestOrientationPermission();
    const started = await startCamera();
    if (!started || !videoTrack) throw new Error('Не удалось открыть камеру');

    const video = $('cameraVideo');
    await waitForVideo(video);
    await waitForOrientationToSettle();
    await prepareCameraFocus();
    const flashReady = await armTorch();
    await waitForVideo(video, 1800);
    if (flashReady) await wait(140);

    const nativeCaptureSucceeded = await captureStillPhotoToCanvas();
    if (!nativeCaptureSucceeded) {
      if (torchArmed) await setTorch(false);
      drawSourceToCanvas(
        video,
        video.videoWidth,
        video.videoHeight,
        getCaptureOrientationAngle(video.videoWidth, video.videoHeight)
      );
    } else {
      correctNativeLandscapeCapture();
    }
    cropCanvasToFourThree();

    const canvas = $('cameraCanvas');
    const previewCanvas = $('cameraPreviewCanvas');
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    previewCanvas.getContext('2d', { alpha: false }).drawImage(canvas, 0, 0);

    photoBlob = null;
    photoRandomId = String(Math.floor(Math.random() * 2147483646) + 1);
    const send = $('cameraSendPhoto');
    send.disabled = false;
    send.textContent = 'Отправить';
    updatePreviewHeading();
    const previewDeadlines = $('cameraPreviewDeadlines');
    if (previewDeadlines) previewDeadlines.hidden = room.expiryStatus !== 'empty';
    $('cameraPreviewModal').classList.remove('hidden');
    $('cameraPreviewModal').setAttribute('aria-hidden', 'false');
    $('cameraCarouselWrap').classList.add('is-disabled');
    $('cameraStage').classList.add('is-preview');

    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(canvas.width, canvas.height));
    const uploadCanvas = document.createElement('canvas');
    uploadCanvas.width = Math.max(1, Math.round(canvas.width * scale));
    uploadCanvas.height = Math.max(1, Math.round(canvas.height * scale));
    uploadCanvas.getContext('2d', { alpha: false }).drawImage(
      canvas, 0, 0, uploadCanvas.width, uploadCanvas.height
    );
    const preparationToken = ++photoPreparationToken;
    photoPreparationPromise = new Promise((resolve, reject) => {
      uploadCanvas.toBlob(blob => {
        if (preparationToken !== photoPreparationToken) {
          reject(new Error('Подготовка фото отменена'));
          return;
        }
        if (!blob) {
          reject(new Error('Не удалось подготовить фото. Пересними.'));
          return;
        }
        photoBlob = blob;
        resolve(blob);
      }, 'image/jpeg', .84);
    });
    // A retake can cancel this promise while the preview is open; observe the rejection
    // here so it never becomes an unhandled promise rejection.
    void photoPreparationPromise.catch(() => {});
    // The preview is ready to confirm immediately; JPEG encoding continues in parallel.
  } catch (error) {
    showNotice(error.message || 'Не удалось сделать снимок', true);
  } finally {
    if (torchArmed) await setTorch(false);
    stopCamera();
    captureBusy = false;
    updateActionAvailability();
  }
}

function closePreview(force = false) {
  if ((captureBusy || photoSending) && !force) return;
  $('cameraPreviewModal')?.classList.add('hidden');
  $('cameraPreviewModal')?.setAttribute('aria-hidden','true');
  $('cameraCarouselWrap')?.classList.remove('is-disabled');
  $('cameraStage')?.classList.remove('is-preview');
  clearPhoto();
  if($('cameraSendPhoto')){$('cameraSendPhoto').disabled=false;$('cameraSendPhoto').textContent='Отправить';}
  hideLoader();
  updateActionAvailability();
}
const PHOTO_QUEUE_DB_NAME = 'minibar-miniapp-photo-queue-v1';
const PHOTO_QUEUE_STORE_NAME = 'photos';

function setPhotoQueueStatus(message, tone = 'pending', hideAfter = 0) {
  const host = $('cameraUploadStatus');
  if (!host) return;
  if (photoQueueStatusTimer) clearTimeout(photoQueueStatusTimer);
  photoQueueStatusTimer = null;
  const spinner = tone === 'pending'
    ? '<span class="camera-upload-spinner" aria-hidden="true"></span>' : '';
  host.innerHTML = (message ? spinner + '<span>' + esc(message) + '</span>' : '');
  host.className = 'camera-upload-status' + (message ? ' is-visible is-' + tone : '');
  if (message && hideAfter > 0) {
    const expected = message;
    photoQueueStatusTimer = setTimeout(() => {
      if (host.textContent.trim() === expected) {
        host.innerHTML = '';
        host.className = 'camera-upload-status';
      }
      photoQueueStatusTimer = null;
    }, hideAfter);
  }
}

function openPhotoQueueDb() {
  if (!window.indexedDB) return Promise.reject(new Error('IndexedDB недоступен'));
  if (!photoQueueDbPromise) {
    photoQueueDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(PHOTO_QUEUE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PHOTO_QUEUE_STORE_NAME)) {
          db.createObjectStore(PHOTO_QUEUE_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          photoQueueDbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        photoQueueDbPromise = null;
        reject(request.error || new Error('Не удалось открыть очередь фото'));
      };
    });
  }
  return photoQueueDbPromise;
}
function photoQueueDbAction(mode, action, value) {
  return openPhotoQueueDb().then(db => new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(PHOTO_QUEUE_STORE_NAME, mode); }
    catch (error) { reject(error); return; }
    const store = tx.objectStore(PHOTO_QUEUE_STORE_NAME);
    let request;
    if (action === 'getAll') request = store.getAll();
    else if (action === 'put') request = store.put(value);
    else if (action === 'delete') request = store.delete(value);
    else { reject(new Error('Неизвестная операция очереди фото')); return; }
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error('Ошибка очереди фото'));
    tx.oncomplete = () => resolve(action === 'getAll' ? (result || []) : true);
    tx.onerror = () => reject(tx.error || request.error || new Error('Не удалось сохранить очередь фото'));
    tx.onabort = () => reject(tx.error || new Error('Сохранение очереди фото прервано'));
  }));
}
function sortPhotoQueue(items) {
  return items.sort((a,b) =>
    (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0) ||
    String(a.id).localeCompare(String(b.id))
  );
}
async function queuePhotoForUpload(pending, blob) {
  let requestId = Number(pending.requestId);
  if (!Number.isInteger(requestId) || requestId < 1 || requestId > 2147483647) {
    requestId = Math.floor(Math.random() * 2147483647) + 1;
  }
  const now = Date.now();
  const item = {
    id: String(now) + '-' + requestId + '-' + Math.random().toString(36).slice(2, 9),
    roomNumber: String(pending.roomNumber), requestId,
    comment: String(pending.comment || '').trim(),
    refillRequestId: Number.isSafeInteger(Number(pending.refillRequestId)) && Number(pending.refillRequestId) > 0
      ? Number(pending.refillRequestId) : null,
    listType: pending.listType || 'arrivals',
    refillRetryToken: null, photoSent: false, blob, createdAt: now,
    attempts: 0, nextAttemptAt: 0, lastError: ''
  };
  await photoQueueDbAction('readwrite', 'put', item);
  return item;
}
function schedulePendingPhotoWriteRetry(delay = 3000) {
  if (pendingPhotoWriteTimer) clearTimeout(pendingPhotoWriteTimer);
  pendingPhotoWriteTimer = setTimeout(() => {
    pendingPhotoWriteTimer = null;
    void flushPendingPhotoWrites();
  }, Math.max(500, delay));
}
async function flushPendingPhotoWrites() {
  if (pendingPhotoWriteActive || !pendingPhotoWrites.size) return;
  pendingPhotoWriteActive = true;
  try {
    for (const [id, pending] of pendingPhotoWrites) {
      let blob = pending.blob;
      try {
        if (!blob && pending.blobPromise) blob = await pending.blobPromise;
      } catch (error) {
        pendingPhotoWrites.delete(id);
        setPhotoQueueStatus('Не удалось подготовить фото №' + pending.roomNumber + '. Пересними номер.', 'error');
        continue;
      }
      if (!blob || !blob.size) {
        pendingPhotoWrites.delete(id);
        setPhotoQueueStatus('Не удалось подготовить фото №' + pending.roomNumber + '. Пересними номер.', 'error');
        continue;
      }
      try {
        await queuePhotoForUpload(pending, blob);
        pendingPhotoWrites.delete(id);
        setPhotoQueueStatus('Фото №' + pending.roomNumber + ' сохранено. Отправка продолжается в фоне…', 'pending');
      } catch (error) {
        console.warn('[MINIBAR PHOTO QUEUE] IndexedDB save will retry:', error);
        setPhotoQueueStatus('Фото №' + pending.roomNumber + ' пока хранится в памяти. Повторяю сохранение…', 'error');
        schedulePendingPhotoWriteRetry(3000);
        return;
      }
    }
    if (!pendingPhotoWrites.size) void processPhotoQueue();
  } finally {
    pendingPhotoWriteActive = false;
  }
}

async function sendPhotoToServer(item) {
  try {
    const form = new FormData();
    form.append('photo', item.blob, 'photo.jpg');
    form.append('room', String(item.roomNumber));
    if (item.comment) form.append('comment', String(item.comment));
    if (item.requestId) form.append('random_id', String(item.requestId));
    if (item.refillRequestId) form.append('refill_request_id', String(item.refillRequestId));
    const response = await fetch('/minibar-os/vk-proxy/send-photo', {
      method: 'POST', body: form,
      signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось отправить фото (HTTP ' + response.status + ')');
    return {
      ok: true, site_synced: data.site_synced !== false, site_sync_error: data.site_sync_error || '',
      refill_synced: data.refill_synced !== false, refill_sync_error: data.refill_sync_error || '',
      refill_retry_token: data.refill_retry_token || '', photo_sent: true
    };
  } catch (error) {
    return { ok: false, error: error.message || 'Ошибка отправки фото' };
  }
}
async function retryRefillCompletion(item) {
  try {
    const response = await fetch('/minibar-os/vk-proxy/complete-refill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        room: String(item.roomNumber), refill_request_id: Number(item.refillRequestId),
        refill_retry_token: String(item.refillRetryToken || ''), random_id: Number(item.requestId)
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || data.refill_synced === false) {
      return { ok: false, photo_sent: true, refill_synced: false, refill_sync_error: data.error || 'Не удалось завершить пополнение' };
    }
    return { ok: true, photo_sent: true, refill_synced: true };
  } catch (error) {
    return { ok: false, photo_sent: true, refill_synced: false, refill_sync_error: error.message || 'Ошибка синхронизации пополнения' };
  }
}
function schedulePhotoQueueRetry(delay) {
  if (photoQueueRetryTimer) clearTimeout(photoQueueRetryTimer);
  photoQueueRetryTimer = setTimeout(() => {
    photoQueueRetryTimer = null;
    void processPhotoQueue();
  }, Math.max(250, delay));
}
async function refreshAfterPhotoUpload(item, result) {
  void loadList(item.listType || 'arrivals').catch(() => {});
  if (item.refillRequestId) {
    try {
      const response = await api.get('refills/active');
      activeRefills = (response?.requests || []).filter(request => request?.status === 'pending');
      if (mounted) { renderStandby(); renderCarousel(); }
    } catch (_) {}
  }
  if (result.site_synced === false) {
    console.warn('[MINIBAR PHOTO QUEUE] Site sync failed:', result.site_sync_error);
    setPhotoQueueStatus('Фото №' + item.roomNumber + ' отправлено, но список не синхронизировался.', 'error');
  }
}
async function processPhotoQueue() {
  if (photoQueueWorkerActive) return;
  if (photoQueueRetryTimer) { clearTimeout(photoQueueRetryTimer); photoQueueRetryTimer = null; }
  photoQueueWorkerActive = true;
  let sentAny = false;
  try {
    while (true) {
      const items = sortPhotoQueue(await photoQueueDbAction('readonly', 'getAll'));
      if (!items.length) {
        if (sentAny) setPhotoQueueStatus('Все фото отправлены', 'success', 2400);
        return;
      }
      if (navigator.onLine === false) {
        setPhotoQueueStatus('Нет сети. Фото сохранено; отправка продолжится автоматически.', 'error');
        return;
      }
      const item = items[0];
      const waitMs = Math.max(0, (Number(item.nextAttemptAt) || 0) - Date.now());
      if (waitMs > 0) {
        setPhotoQueueStatus('Фото №' + item.roomNumber + ' ожидает повторной отправки. В очереди: ' + items.length, 'pending');
        schedulePhotoQueueRetry(waitMs);
        return;
      }
      setPhotoQueueStatus('Отправляю фото №' + item.roomNumber + (items.length > 1 ? ' · в очереди ещё ' + (items.length - 1) : '…'), 'pending');
      const result = item.photoSent && item.refillRequestId
        ? await retryRefillCompletion(item)
        : await sendPhotoToServer(item);
      if (result.ok) {
        if (item.refillRequestId && result.refill_synced === false) {
          const attempts = (Number(item.attempts) || 0) + 1;
          const retryDelay = Math.min(1000 * Math.pow(2, Math.min(attempts - 1, 6)), 60000);
          await photoQueueDbAction('readwrite', 'put', {
            ...item, photoSent: Boolean(item.photoSent || result.photo_sent),
            refillRetryToken: result.refill_retry_token || item.refillRetryToken || null,
            attempts, nextAttemptAt: Date.now() + retryDelay,
            lastError: result.refill_sync_error || 'Ожидаю завершения пополнения'
          });
          setPhotoQueueStatus('Фото №' + item.roomNumber + ' уже отправлено; завершаю пополнение…', 'pending');
          schedulePhotoQueueRetry(retryDelay);
          return;
        }
        await photoQueueDbAction('readwrite', 'delete', item.id);
        sentAny = true;
        void refreshAfterPhotoUpload(item, result);
        continue;
      }
      const attempts = (Number(item.attempts) || 0) + 1;
      const retryDelay = Math.min(1000 * Math.pow(2, Math.min(attempts - 1, 6)), 60000);
      await photoQueueDbAction('readwrite', 'put', {
        ...item, attempts, nextAttemptAt: Date.now() + retryDelay,
        lastError: result.error || 'Неизвестная ошибка отправки'
      });
      setPhotoQueueStatus('Фото №' + item.roomNumber + ' сохранено. Повторная отправка через ' + Math.ceil(retryDelay / 1000) + ' сек.', 'error');
      schedulePhotoQueueRetry(retryDelay);
      return;
    }
  } catch (error) {
    console.error('[MINIBAR PHOTO QUEUE] Queue worker failed:', error);
    setPhotoQueueStatus('Очередь фото сохранена. Отправка повторится автоматически.', 'error');
    schedulePhotoQueueRetry(5000);
  } finally {
    photoQueueWorkerActive = false;
  }
}
async function restorePhotoUploadQueue() {
  try {
    const items = sortPhotoQueue(await photoQueueDbAction('readonly', 'getAll'));
    if (items.length) {
      setPhotoQueueStatus('В очереди сохранено фото: ' + items.length + '. Продолжаю отправку…', 'pending');
      void processPhotoQueue();
    }
  } catch (error) {
    console.warn('[MINIBAR PHOTO QUEUE] Could not restore queue:', error);
  }
}
window.addEventListener('online', () => {
  if (photoQueueRetryTimer) clearTimeout(photoQueueRetryTimer);
  photoQueueRetryTimer = null;
  if (pendingPhotoWriteTimer) clearTimeout(pendingPhotoWriteTimer);
  pendingPhotoWriteTimer = null;
  void flushPendingPhotoWrites();
  void processPhotoQueue();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void flushPendingPhotoWrites();
    void processPhotoQueue();
  }
});

// Restore pending uploads on app startup, even when the user opens another tab first.
void restorePhotoUploadQueue();

async function sendPhoto() {
  if (photoSending || (!photoBlob && !photoPreparationPromise) || !selectedNumber || captureBusy) return;
  const preview = $('cameraPreviewModal');
  if (!preview || preview.classList.contains('hidden')) return;

  const number = String(selectedNumber);
  const listType = sourceData().type;
  const requestId = photoRandomId || String(Math.floor(Math.random() * 2147483646) + 1);
  const pendingId = String(Date.now()) + '-' + requestId;
  const commentInput = $('cameraComment');
  const sendButton = $('cameraSendPhoto');
  const blobPromise = photoBlob ? Promise.resolve(photoBlob) : photoPreparationPromise;

  photoSending = true;
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = 'Подготавливаю…';
  }

  try {
    // Do not close the preview or invalidate photoPreparationToken until JPEG
    // encoding has completed. The old flow cancelled its own Blob promise here.
    const blob = await blobPromise;
    if (!blob || !blob.size) throw new Error('Фото не подготовлено. Пересними номер.');
    if (preview.classList.contains('hidden')) return;

    const request = activeRefill(roomByNumber(number));
    const comment = cameraRoomComment(number);
    pendingPhotoWrites.set(pendingId, {
      roomNumber: number,
      requestId,
      blob,
      comment,
      refillRequestId: request?.id || null,
      listType
    });
    if (commentInput) commentInput.value = '';

    // Only advance after a valid Blob is ready and the upload has entered the queue.
    closePreview(true);
    triggerCarouselHaptic();
    setPhotoQueueStatus('Фото №' + number + ' отправляется в фоне…', 'pending');
    void advanceAfterRoomCompletion(listType, number);
    void flushPendingPhotoWrites();
  } catch (error) {
    if (!preview.classList.contains('hidden')) {
      showNotice(error.message || 'Не удалось подготовить фото. Пересними номер.', true);
    }
  } finally {
    photoSending = false;
    if (!preview.classList.contains('hidden') && sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = 'Отправить';
    }
  }
}

async function sendRoomMessage(message, action) {
  if (!selectedNumber || captureBusy) return;
  const number = String(selectedNumber);
  const sourceType = sourceData().type;
  const commentInput = $('cameraComment');
  const typedComment = String(commentInput?.value || '').trim();
  const comment = cameraRoomComment(number);
  const messageText = number + ' ' + message + (comment ? ' (' + comment + ')' : '');
  captureBusy = true;
  updateActionAvailability();
  try {
    const response = await fetch('/minibar-os/vk-proxy/send-message',{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({message:messageText})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось отправить сообщение');
    if (commentInput && commentInput.value.trim() === typedComment) commentInput.value = '';
    showNotice(action + ' · номер ' + number);
    if (action === 'Опустошение отправлено') {
      await advanceAfterRoomCompletion(sourceType, number);
    }
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

function currentListRefillProducts() {
  const roomsById = new Map();
  roomNumbers().forEach(number => {
    const room = roomByNumber(number);
    if (Number(room.id) > 0) roomsById.set(Number(room.id), room);
  });

  const productsByKey = new Map();
  activeRefills.filter(request => request?.status === 'pending').forEach(request => {
    const room = roomsById.get(Number(request.roomId));
    if (!room) return;
    const metadata = new Map(refillItems(room, request).map(item => [Number(item.id), item]));

    (request.items || []).forEach(item => {
      const productId = Number(item.productId) || 0;
      const meta = productId > 0 ? metadata.get(productId) || {} : {};
      const name = String(item.name || meta.name || 'Продукт');
      const key = productId > 0 ? 'id:' + productId : 'name:' + name.toLocaleLowerCase('ru-RU');
      if (!productsByKey.has(key)) {
        productsByKey.set(key, {
          id: productId,
          name,
          category: item.category || meta.category || 'Напитки',
          emoji: item.emoji || meta.emoji || name.charAt(0).toUpperCase(),
          unit: item.unit || meta.unit || 'шт',
          qty: 0,
          rooms: new Set()
        });
      }
      const product = productsByKey.get(key);
      product.qty += Math.max(0, Number(item.qty) || 0);
      product.rooms.add(String(room.number));
    });
  });

  return [...productsByKey.values()].filter(item => item.qty > 0).sort((a, b) =>
    (categoryOrder.indexOf(a.category) < 0 ? 99 : categoryOrder.indexOf(a.category)) -
    (categoryOrder.indexOf(b.category) < 0 ? 99 : categoryOrder.indexOf(b.category)) ||
    a.name.localeCompare(b.name, 'ru')
  );
}

function renderListRefillSummary() {
  const products = currentListRefillProducts();
  if (!products.length) return '';
  const roomCount = new Set(products.flatMap(item => [...item.rooms])).size;
  const rows = products.map(item =>
    '<div class="gih-list-product">' +
      '<span class="gih-list-product-icon">' + esc(item.emoji || item.name.charAt(0)) + '</span>' +
      '<span class="gih-list-product-name">' + esc(item.name) + '</span>' +
      '<strong class="gih-list-product-qty">' + esc(Number(item.qty).toLocaleString('ru-RU') + ' ' + item.unit) + '</strong>' +
    '</div>'
  ).join('');
  return '<section class="camera-list-products-section">' +
    '<details class="gih-products-summary-dropdown camera-list-products-dropdown">' +
      '<summary class="gih-products-summary-head"><span>Пополнение списка</span>' +
        '<span class="gih-products-summary-count">' + products.length + ' позиций · ' + roomCount + ' номеров</span></summary>' +
      '<div class="gih-products-summary-content"><div class="gih-list-products">' + rows + '</div></div>' +
    '</details>' +
  '</section>';
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
function deadlineProductsForRoom(room) {
  const source = Array.isArray(room?.template?.items) ? room.template.items
    : Array.isArray(room?.templateItems) ? room.templateItems : [];
  return source.map(item => {
    const product = item.product || item;
    return {
      id: Number(item.productId || product.id),
      name: product.name || item.name || 'Продукт',
      category: product.category || item.category || 'Напитки',
      volume: product.volume ?? item.volume ?? null,
      unit: product.unit || item.unit || 'шт',
      emoji: product.emoji || item.emoji || null,
      bgColor: product.bgColor || item.bgColor || 'slate',
      hasExpiry: product.hasExpiry !== false,
      maxQty: Math.max(1, Number(item.qty || item.maxQty || 1))
    };
  }).filter(item => item.id > 0 && item.hasExpiry)
    .sort((a,b) =>
      (categoryOrder.indexOf(a.category) < 0 ? 99 : categoryOrder.indexOf(a.category)) -
      (categoryOrder.indexOf(b.category) < 0 ? 99 : categoryOrder.indexOf(b.category)) ||
      a.name.localeCompare(b.name,'ru'));
}
function renderDeadlineProducts() {
  const host = $('deadlineProducts');
  if (!host) return;
  if (!deadlineProducts.length) {
    host.innerHTML = '<div class="camera-deadline-empty">В шаблоне номера нет продуктов со сроком годности.</div>';
    return;
  }
  const groups = new Map();
  deadlineProducts.forEach(item => {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  });
  const ordered = [
    ...categoryOrder.filter(category => groups.has(category)),
    ...[...groups.keys()].filter(category => !categoryOrder.includes(category)).sort((a,b)=>a.localeCompare(b,'ru'))
  ];
  host.innerHTML = ordered.map(category =>
    '<section class="camera-deadline-category"><h4>' + esc(category) + '</h4><div class="camera-deadline-grid">' +
    groups.get(category).map(item => {
      const qty = Number(deadlineSelections[item.id]) || 0;
      const emoji = item.emoji || String(item.name).charAt(0).toUpperCase();
      const color = productColors[item.bgColor] || productColors.slate;
      return '<button type="button" class="camera-deadline-product' + (qty ? ' is-selected' : '') +
        '" data-deadline-product="' + item.id + '" data-max-qty="' + item.maxQty + '" aria-pressed="' + String(qty > 0) + '">' +
        (qty ? '<span class="camera-deadline-count">' + qty + '</span>' : '') +
        '<span class="camera-deadline-emoji" style="background:' + color + '">' + esc(emoji) + '</span>' +
        '<span class="camera-deadline-copy"><strong>' + esc(item.name) + '</strong><small>' +
        esc((item.volume == null ? '—' : item.volume) + ' ' + item.unit + ' · до ' + item.maxQty + ' шт.') +
        '</small></span></button>';
    }).join('') + '</div></section>'
  ).join('');
}
async function openDeadlineModal() {
  const room = roomByNumber(selectedNumber);
  if (!room.id || deadlineBusy) return;
  deadlineRoomNumber = String(room.number);
  deadlineProducts = deadlineProductsForRoom(room);
  deadlineSelections = {};
  $('deadlineModalRoom').textContent = deadlineRoomNumber;
  $('deadlineModalInfo').textContent = 'Загрузка текущих отметок…';
  $('deadlineFeedback').textContent = '';
  $('deadlineModal').classList.remove('hidden');
  $('deadlineModal').setAttribute('aria-hidden','false');
  renderDeadlineProducts();
  try {
    const statuses = await api.get('rooms/' + Number(room.id) + '/product-statuses');
    (Array.isArray(statuses) ? statuses : []).forEach(status => {
      if (Number(status.qtyToReplace) > 0) {
        deadlineSelections[Number(status.productId)] = Number(status.qtyToReplace);
      }
    });
    const freshRoom = roomByNumber(deadlineRoomNumber);
    $('deadlineModalInfo').textContent = [
      freshRoom.floor ? 'Этаж ' + freshRoom.floor : '',
      freshRoom.category === 'lux' ? 'Люкс' : freshRoom.category === 'standard' ? 'Стандарт' : '',
      deadlineStatusLabel(freshRoom.expiryStatus)
    ].filter(Boolean).join(' · ');
    renderDeadlineProducts();
  } catch (error) {
    $('deadlineModalInfo').textContent = 'Не удалось загрузить текущие отметки';
    $('deadlineFeedback').textContent = error.message || 'Ошибка загрузки сроков';
  }
}
function deadlineStatusLabel(status) {
  return ({
    neutral: 'Не проверен',
    valid: 'В порядке',
    empty: 'Пустой',
    needs_replacement: 'Требует замены'
  })[status] || 'Не проверен';
}
function closeDeadlineModal(force = false) {
  if (deadlineBusy && !force) return;
  $('deadlineModal')?.classList.add('hidden');
  $('deadlineModal')?.setAttribute('aria-hidden','true');
  if (!force && sharedRoomActionChanged) {
    sharedRoomActionChanged = null;
    sharedRoomActionNumber = '';
    sharedRoomActionRoom = null;
  }
}
function toggleDeadlineProduct(button) {
  if (deadlineBusy) return;
  const id = Number(button.dataset.deadlineProduct);
  const product = deadlineProducts.find(item => item.id === id);
  if (!product) return;
  const current = Number(deadlineSelections[id]) || 0;
  const next = current >= product.maxQty ? 0 : current + 1;
  if (next) deadlineSelections[id] = next;
  else delete deadlineSelections[id];
  renderDeadlineProducts();
}
async function refreshSelectedRoom(type) {
  const [roomResult] = await Promise.allSettled([api.get('rooms')]);
  if (roomResult.status === 'fulfilled') {
    rooms = Array.isArray(roomResult.value) ? roomResult.value : roomResult.value?.rooms || [];
    rooms.sort((a,b) => Number(a.floor || 0) - Number(b.floor || 0) || Number(a.number) - Number(b.number));
    if (String(sharedRoomActionNumber)) {
      sharedRoomActionRoom = rooms.find(item => String(item.number) === String(sharedRoomActionNumber)) || sharedRoomActionRoom;
    }
  }
  if (!sharedRoomActionChanged && (type === 'arrivals' || type === 'departures')) await loadList(type);
  renderStandby();
  renderCarousel();
  const previewDeadlines = $('cameraPreviewDeadlines');
  if (previewDeadlines) previewDeadlines.hidden = roomByNumber(selectedNumber).expiryStatus !== 'empty';
  if (sharedRoomActionChanged) await notifySharedRoomActionChanged(sharedRoomActionNumber);
}

async function saveDeadlineSelections() {
  const room = roomByNumber(deadlineRoomNumber);
  if (!room.id || deadlineBusy) return;
  const items = Object.entries(deadlineSelections)
    .map(([productId, qty]) => ({
      productId: Number(productId),
      qtyToReplace: Number(qty),
      expiryStatus: 'needs_replacement'
    }))
    .filter(item => item.productId > 0 && item.qtyToReplace > 0);
  deadlineBusy = true;
  const button = $('deadlineSave');
  if (button) { button.disabled = true; button.textContent = 'Сохраняем…'; }
  try {
    await api.put('rooms/' + Number(room.id) + '/product-statuses', {
      items,
      roomStatus: items.length ? 'needs_replacement' : 'neutral'
    });
    await refreshSelectedRoom(sourceData().type);
    closeDeadlineModal(true);
    showNotice('Сроки номера ' + room.number + ' сохранены');
  } catch (error) {
    $('deadlineFeedback').textContent = error.message || 'Не удалось сохранить сроки';
  } finally {
    deadlineBusy = false;
    if (button) { button.disabled = false; button.textContent = 'Сохранить'; }
  }
}
async function setDeadlineRoomStatus(status) {
  const room = roomByNumber(deadlineRoomNumber);
  if (!room.id || deadlineBusy) return;
  deadlineBusy = true;
  $('deadlineFeedback').textContent = 'Сохраняем…';
  try {
    await api.delete('rooms/' + Number(room.id) + '/product-statuses', { body: { roomStatus: status } });
    await refreshSelectedRoom(sourceData().type);
    closeDeadlineModal(true);
    showNotice(status === 'empty' ? 'Номер отмечен как пустой'
      : status === 'valid' ? 'Номер отмечен как исправный'
      : 'Статус номера сброшен');
  } catch (error) {
    $('deadlineFeedback').textContent = error.message || 'Не удалось обновить статус номера';
  } finally {
    deadlineBusy = false;
  }
}
function openRefillModal() {
  const room = roomByNumber(selectedNumber);
  if (!room.id || refillBusy) return;
  const request = activeRefill(room);
  refillRequestId = request?.id || null;
  const template = refillItems(room, request);
  refillCounts = {};
  if (room.expiryStatus === 'empty') {
    template.forEach(item => { refillCounts[Number(item.id)] = Number(item.maxQty) || 1; });
    refillAllSelected = template.length > 0;
  } else {
    (request?.items || []).forEach(item => {
      refillCounts[Number(item.productId)] = Number(item.qty) || 0;
    });
    refillAllSelected = Boolean(request?.allProducts);
  }
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
  if (!force && sharedRoomActionChanged) {
    sharedRoomActionChanged = null;
    sharedRoomActionNumber = '';
    sharedRoomActionRoom = null;
  }
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
      allProducts:refillAllSelected,
      expectedRequestId:refillRequestId,
      items
    });
    activeRefills = activeRefills.filter(item=>Number(item.roomId)!==Number(room.id));
    if (result.request?.status==='pending') activeRefills.push(result.request);
    refillAllSelected = Boolean(result.request?.allProducts);
    closeRefillModal(true);
    renderStandby();
    renderCarousel();
    await notifySharedRoomActionChanged(room.number);
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
  const template = refillItems(room, activeRefill(room));
  if (!template.length) {
    $('refillFeedback').textContent = 'Для номера не задан шаблон продуктов.';
    return;
  }

  // Choosing the whole template means the minibar is empty: select the full
  // quantity of every product and persist the empty-room status together.
  refillCounts = Object.fromEntries(template.map(item => [
    Number(item.id), Math.max(1, Number(item.maxQty) || 1)
  ]));
  refillAllSelected = true;
  renderRefillProducts();

  if (room.expiryStatus === 'empty') {
    $('refillFeedback').textContent = 'Номер уже отмечен пустым. Выбрана полная корзина по шаблону.';
    return;
  }

  refillBusy = true;
  const bulkButton = document.querySelector('[data-camera-action="refill-all"]');
  if (bulkButton) bulkButton.disabled = true;
  $('refillFeedback').textContent = 'Отмечаем номер пустым…';
  try {
    await api.delete('rooms/' + Number(room.id) + '/product-statuses', { body: { roomStatus: 'empty' } });
    room.expiryStatus = 'empty';
    const list = sourceData().data;
    if (list?.roomInfo?.[String(room.number)]) list.roomInfo[String(room.number)].expiryStatus = 'empty';
    const baseRoom = rooms.find(item => Number(item.id) === Number(room.id));
    if (baseRoom) baseRoom.expiryStatus = 'empty';
    renderStandby();
    renderCarousel();
    await notifySharedRoomActionChanged(room.number);
    $('refillFeedback').textContent = 'Номер отмечен пустым. Выбрана полная корзина — нажми «Сохранить пополнение».';
    showNotice('Номер отмечен как пустой');
  } catch (error) {
    $('refillFeedback').textContent = error.message || 'Не удалось отметить номер пустым';
  } finally {
    refillBusy = false;
    if (bulkButton) bulkButton.disabled = false;
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
    setSelectedRoom(next,{center:true,behavior:'smooth',haptic:true});
    return;
  }
  const detailTile = target.closest('[data-camera-open]');
  if (detailTile) {
    if (detailTile.dataset.cameraOpen === 'refill') openRefillModal();
    else if (detailTile.dataset.cameraOpen === 'deadlines') void openDeadlineModal();
    return;
  }
  const deadlineProduct = target.closest('[data-deadline-product]');
  if (deadlineProduct) {
    toggleDeadlineProduct(deadlineProduct);
    return;
  }
  const product = target.closest('[data-refill-product]');
  if (product) {
    if (refillBusy) return;
    const id = Number(product.dataset.refillProduct);
    const max = Number(product.dataset.max) || 1;
    const current = Number(refillCounts[id]) || 0;
    refillCounts[id] = current >= max ? 0 : current + 1;
    refillAllSelected = false;
    renderRefillProducts();
    return;
  }
  const action = target.closest('[data-camera-action]')?.dataset.cameraAction;
  if (!action) {
    if (target.id === 'refillModal') closeRefillModal();
    if (target.id === 'deadlineModal') closeDeadlineModal();
    if (target.id === 'cameraPreviewModal') closePreview();
    return;
  }
  if (action === 'capture') {
    showNotice('Запускаю камеру…');
    void capturePhoto();
  }
  else if (action === 'retry-camera') { hideLoader(); void capturePhoto(); }
  else if (action === 'retake') closePreview();
  else if (action === 'preview-deadlines') void openDeadlineModal();
  else if (action === 'send-photo') void sendPhoto();
  else if (action === 'empty') void sendRoomMessage('опустошён','Опустошение отправлено');
  else if (action === 'residential') void sendRoomMessage('проверен, жилой','Отметка «Жилой» отправлена');
  else if (action === 'close-deadlines') closeDeadlineModal();
  else if (action === 'save-deadlines') void saveDeadlineSelections();
  else if (action === 'deadline-empty') void setDeadlineRoomStatus('empty');
  else if (action === 'deadline-valid') void setDeadlineRoomStatus('valid');
  else if (action === 'deadline-reset') void setDeadlineRoomStatus('neutral');
  else if (action === 'open-refill') openRefillModal();
  else if (action === 'close-refill') closeRefillModal();
  else if (action === 'save-refill') void saveRefill();
  else if (action === 'clear-refill') {
    if (refillBusy) return;
    refillCounts = {};
    refillAllSelected = false;
    renderRefillProducts();
  }
  else if (action === 'refill-all') void markRoomEmpty();
}
function carouselTopIndex(carousel) {
  const items = [...carousel.querySelectorAll('[data-camera-room]')];
  if (!items.length) return -1;
  const topLine = carousel.getBoundingClientRect().top + 8;
  const index = items.findIndex(item => item.getBoundingClientRect().bottom > topLine);
  return index < 0 ? items.length - 1 : index;
}
function triggerCarouselScrollHaptic() {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(22);
  } catch (_) {}
}
function attachCarouselScroll(carousel = $('cameraCarousel')) {
  if (!carousel || carousel.dataset.cameraScrollBound === '1') return;
  carousel.dataset.cameraScrollBound = '1';
  let lastIndex = carouselTopIndex(carousel);
  let lastHapticAt = 0;
  carousel.addEventListener('scroll', () => {
    // A light tactile tick is emitted only when another room position crosses
    // the top edge. This works for touch scrolling and programmatic scrolling,
    // without vibrating for every raw scroll event or changing the selection.
    const nextIndex = carouselTopIndex(carousel);
    if (nextIndex !== lastIndex) {
      const now = Date.now();
      if (lastIndex >= 0 && now - lastHapticAt >= 35) {
        triggerCarouselScrollHaptic();
        lastHapticAt = now;
      }
      lastIndex = nextIndex;
    }

    if (carouselTimer) clearTimeout(carouselTimer);
    carouselTimer = setTimeout(() => {
      carouselTimer = null;
      if (!mounted || !selectedNumber) return;
      centerRoom(selectedNumber, 'smooth');
    }, 3000);
  }, { passive: true });
}
export function renderSharedRoomActionModals() {
  return '<div class="camera-modal-overlay hidden" id="refillModal" role="dialog" aria-modal="true" aria-label="Пополнить номер" aria-hidden="true"><div class="camera-refill-modal"><header class="camera-modal-header"><strong>Пополнение · номер <span id="refillModalRoom"></span></strong><button type="button" data-camera-action="close-refill" aria-label="Закрыть">×</button></header><div class="camera-refill-products" id="refillProducts"></div><div class="camera-refill-feedback" id="refillFeedback"></div><footer class="camera-refill-footer"><button type="button" class="camera-refill-all" data-camera-action="refill-all">Пустой номер — выбрать все продукты</button><div class="camera-refill-footer-row"><button type="button" data-camera-action="clear-refill">Очистить</button><button type="button" class="is-save" data-camera-action="save-refill" id="refillSave">Сохранить пополнение</button></div></footer></div></div>' +
    '<div class="camera-modal-overlay hidden" id="deadlineModal" role="dialog" aria-modal="true" aria-label="Сроки номера" aria-hidden="true"><div class="camera-refill-modal camera-deadline-modal"><header class="camera-modal-header"><div><strong>Сроки · номер <span id="deadlineModalRoom"></span></strong><small id="deadlineModalInfo"></small></div><button type="button" data-camera-action="close-deadlines" aria-label="Закрыть">×</button></header><div class="camera-refill-products camera-deadline-products" id="deadlineProducts"></div><div class="camera-refill-feedback" id="deadlineFeedback"></div><footer class="camera-refill-footer camera-deadline-footer"><div class="camera-deadline-status-actions"><button type="button" data-camera-action="deadline-empty">Пустой</button><button type="button" data-camera-action="deadline-valid">В порядке</button><button type="button" data-camera-action="deadline-reset">Сбросить</button></div><button type="button" class="is-save" data-camera-action="save-deadlines" id="deadlineSave">Сохранить</button></footer></div></div>';
}

export async function openSharedRoomActionModal(number, mode, room, refill, onChanged) {
  bind();
  selectedNumber = String(number || '');
  sharedRoomActionNumber = selectedNumber;
  sharedRoomActionRoom = room && typeof room === 'object' ? room : null;
  sharedRoomActionChanged = typeof onChanged === 'function' ? onChanged : null;
  if (sharedRoomActionRoom) {
    const index = rooms.findIndex(item => Number(item.id) === Number(sharedRoomActionRoom.id));
    if (index >= 0) rooms[index] = { ...rooms[index], ...sharedRoomActionRoom };
    else rooms.push(sharedRoomActionRoom);
  }
  if (refill && refill.status === 'pending') {
    activeRefills = activeRefills.filter(item => Number(item.roomId) !== Number(refill.roomId));
    activeRefills.push(refill);
  }
  if (mode === 'deadlines') await openDeadlineModal();
  else if (mode === 'refill') openRefillModal();
}

async function notifySharedRoomActionChanged(number) {
  if (typeof sharedRoomActionChanged !== 'function') return;
  const callback = sharedRoomActionChanged;
  try {
    await callback(String(number || sharedRoomActionNumber || ''));
  } catch (error) {
    console.warn('[MINIBAR ROOM ACTION] Could not refresh room card:', error);
  } finally {
    sharedRoomActionChanged = null;
    sharedRoomActionNumber = '';
    sharedRoomActionRoom = null;
  }
}

function bind() {
  if (bound) return;
  bound = true;
  document.addEventListener('click',handleClick);
  document.addEventListener('input', event => {
    if (event.target?.id === 'cameraComment') updatePreviewHeading();
  });
}
export function renderCamera(state) {
  const type = state.cameraSourceListType || state.listType || 'arrivals';
  const data = state.listData?.[type];
  const numbers = carouselRoomNumbers();
  const initial = String(selectedNumber || state.cameraSelectedRoomNumber || numbers[0] || '');
  if (!selectedNumber && initial) selectedNumber = initial;
  return '<div class="screen screen-camera" id="cameraStage">' +
    '<div class="camera-upload-status" id="cameraUploadStatus" aria-live="polite"></div>' +
    '<div class="camera-workspace">' +
      '<aside class="camera-carousel-wrap" id="cameraCarouselWrap"><div class="camera-carousel" id="cameraCarousel"></div></aside>' +
      '<div class="camera-main-column">' +
        '<div class="camera-viewport" id="cameraViewport">' +
          '<video id="cameraVideo" autoplay playsinline muted></video><canvas id="cameraCanvas" hidden></canvas>' +
          '<div class="camera-focus-frame" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
              '<div class="camera-loader hidden" id="cameraLoader"><span class="camera-loader-spinner"></span><strong id="cameraLoaderTitle">Запуск камеры…</strong><small id="cameraLoaderSubtitle"></small><button type="button" class="camera-retry hidden" data-camera-action="retry-camera" id="cameraLoaderRetry">Повторить</button></div>' +
        '</div>' +
        '<div class="camera-standby" id="cameraStandby"></div>' +
        '<div class="camera-capture-zone"><button type="button" class="camera-capture-button" data-camera-action="capture" id="cameraCapture" aria-label="Сделать фото"><span></span></button></div>' +
        '<input type="text" class="camera-comment-input" id="cameraComment" maxlength="240" placeholder="Комментарий" aria-label="Комментарий к сообщению" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
        '<div class="camera-action-row"><button type="button" class="camera-room-action" data-camera-action="empty" id="cameraActionEmpty">Опустошён</button><button type="button" class="camera-room-action" data-camera-action="residential" id="cameraActionResidential">Жилой</button></div>' +
      '</div>' +
    '</div>' +
    '<div class="camera-feedback" id="cameraFeedback" role="status"></div>' +
    '<div class="camera-modal-overlay hidden" id="cameraPreviewModal" role="dialog" aria-modal="true" aria-label="Предпросмотр фотографии" aria-hidden="true"><div class="camera-preview-card"><div class="camera-preview-room" id="cameraPreviewRoom">Номер</div><canvas id="cameraPreviewCanvas" class="camera-preview-canvas"></canvas><button type="button" class="camera-preview-deadlines" data-camera-action="preview-deadlines" id="cameraPreviewDeadlines" hidden>Отметить сроки</button><div class="camera-preview-actions"><button type="button" class="camera-preview-secondary" data-camera-action="retake">Переснять</button><button type="button" class="camera-preview-primary" data-camera-action="send-photo" id="cameraSendPhoto">Отправить</button></div></div></div>' +
    renderSharedRoomActionModals() +
  '</div>';
}
export function cameraDidRender() {
  bind();
  if (mounted) {
    const video = $('cameraVideo');
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
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
  void restorePhotoUploadQueue();
}
export function cameraWillUnmount() {
  mounted = false;
  loadToken++;
  if (carouselTimer) clearTimeout(carouselTimer);
  if (stream) stopCamera();
  clearPhoto();
  selectedNumber = '';
}
