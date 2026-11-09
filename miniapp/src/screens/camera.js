import { api } from '../core/api.js';
import { getState } from '../core/store.js';
import { icon, renderIcons } from '../components/icons.js';

let stream = null;
let videoTrack = null, torchSupported = null, torchArmed = false, deviceAngle = 0, sensorAngleReady = false;
let orientationPermissionPromise = null;
let orientationPermissionGranted = false;
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
    : room.expiryStatus === 'needs_replacement' || (room.productStatuses || []).some(item => item.expiryStatus === 'needs_replacement' || Number(item.qtyToReplace) > 0) ? 'is-deadline' : '';
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
    '</section>';
  renderIcons();
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
    const entry = listEntry(number);
    const empty = room.expiryStatus === 'empty' || Boolean(entry.empty);
    const needsDeadline = room.expiryStatus === 'needs_replacement' ||
      (room.productStatuses || []).some(item => item.expiryStatus === 'needs_replacement' || Number(item.qtyToReplace) > 0);
    const needsRefill = Boolean(refill?.items?.length);
    const classes = ['camera-number-item'];
    if (String(number) === String(selectedNumber)) classes.push('is-active');
    if (empty) classes.push('is-empty');
    if (needsDeadline) classes.push('is-deadline');
    if (needsRefill) classes.push('is-refill');
    const checked = (getState().listData?.[getState().cameraSourceListType || getState().listType]?.checkedRoomNumbers ||
      getState().listData?.[getState().cameraSourceListType || getState().listType]?.completedNumbers || []).map(String).includes(String(number));
    if (checked) classes.push('is-checked');
    const marks=[];
    if(entry.vip)marks.push('<i class="camera-room-marker is-vip" title="VIP">'+icon('crown',9)+'</i>');
    if(empty)marks.push('<i class="camera-room-marker is-empty" title="Опустошён">'+icon('package-x',9)+'</i>');
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
    if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
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
  return ((Math.round(Number(angle) || 0) % 360) + 360) % 360;
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
function updatePhysicalAngle(event) {
  const gravity = event?.accelerationIncludingGravity;
  if (gravity && Number.isFinite(gravity.x) && Number.isFinite(gravity.y)) {
    const x = gravity.x, y = gravity.y;
    const ax = Math.abs(x), ay = Math.abs(y);
    if (Math.max(ax, ay) > 5.5 && Math.min(ax, ay) < Math.max(ax, ay) * .72) {
      deviceAngle = ay > ax ? (y >= 0 ? 0 : 180) : (x >= 0 ? 90 : 270);
      sensorAngleReady = true;
      return;
    }
  }
  if (Number.isFinite(event?.beta) && Number.isFinite(event?.gamma)) {
    const beta = Math.sin(event.beta * Math.PI / 180);
    const gamma = Math.sin(event.gamma * Math.PI / 180);
    if (Math.max(Math.abs(beta), Math.abs(gamma)) > .62) {
      deviceAngle = Math.abs(beta) > Math.abs(gamma) * 1.25
        ? (beta >= 0 ? 0 : 180)
        : (gamma > 0 ? 90 : 270);
      sensorAngleReady = true;
    }
  }
}
function currentDeviceAngle() {
  if (sensorAngleReady) return deviceAngle;
  const angle = window.screen?.orientation?.angle;
  if (Number.isFinite(angle)) return normalizeAngle(angle);
  if (typeof window.orientation === 'number') return normalizeAngle(window.orientation);
  return window.innerWidth > window.innerHeight ? 90 : 0;
}
function getCaptureOrientationAngle(sourceWidth, sourceHeight) {
  const angle = currentDeviceAngle();
  // Native camera sensors can return landscape pixels without EXIF orientation.
  if (sourceWidth > sourceHeight) {
    if (angle === 90) return 180;
    if (angle === 270) return 0;
    return angle;
  }
  return normalizeAngle(angle);
}
window.addEventListener('devicemotion', updatePhysicalAngle, true);
window.addEventListener('deviceorientation', updatePhysicalAngle, true);
window.addEventListener('orientationchange', () => { sensorAngleReady = false; });

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
  photoBlob = null;
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
  if (captureBusy || photoBlob || isArrivalNotReady(room)) {
    if (isArrivalNotReady(room)) showNotice('Сначала отметь «Можно делать» для этого номера', true);
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
    send.disabled = true;
    send.textContent = 'Подготовка…';
    $('cameraPreviewRoom').textContent = 'Номер ' + number;
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
    uploadCanvas.toBlob(blob => {
      if (!$('cameraPreviewModal') || $('cameraPreviewModal').classList.contains('hidden')) return;
      if (!blob) {
        showNotice('Не удалось подготовить фото. Пересними.', true);
        send.disabled = true;
        send.textContent = 'Ошибка';
        return;
      }
      photoBlob = blob;
      send.disabled = false;
      send.textContent = 'Отправить';
    }, 'image/jpeg', .84);
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
  if (captureBusy && !force) return;
  $('cameraPreviewModal')?.classList.add('hidden');
  $('cameraPreviewModal')?.setAttribute('aria-hidden','true');
  $('cameraCarouselWrap')?.classList.remove('is-disabled');
  $('cameraStage')?.classList.remove('is-preview');
  clearPhoto();
  if($('cameraSendPhoto')){$('cameraSendPhoto').disabled=false;$('cameraSendPhoto').textContent='Отправить';}
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
  else if (action === 'retry-camera') { hideLoader(); void capturePhoto(); }
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
  carousel.addEventListener('scroll', () => {
    cancelAnimationFrame(carouselFrame);
    carouselFrame = requestAnimationFrame(() => {
      const rect = carousel.getBoundingClientRect();
      const activationLine = rect.top + 12;
      let active = null;
      for (const item of carousel.querySelectorAll('[data-camera-room]')) {
        const itemRect = item.getBoundingClientRect();
        if (itemRect.bottom > activationLine) {
          active = item;
          break;
        }
      }
      if (active && active.dataset.cameraRoom !== selectedNumber) {
        setSelectedRoom(active.dataset.cameraRoom, { haptic: true });
      }
    });
  }, { passive: true });
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
    '<div class="camera-workspace">' +
      '<aside class="camera-carousel-wrap" id="cameraCarouselWrap"><div class="camera-carousel" id="cameraCarousel"></div></aside>' +
      '<div class="camera-main-column">' +
        '<div class="camera-viewport" id="cameraViewport">' +
          '<video id="cameraVideo" autoplay playsinline muted></video><canvas id="cameraCanvas" hidden></canvas>' +
          '<div class="camera-focus-frame" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
          '<div class="camera-standby" id="cameraStandby"></div>' +
          '<div class="camera-loader hidden" id="cameraLoader"><span class="camera-loader-spinner"></span><strong id="cameraLoaderTitle">Запуск камеры…</strong><small id="cameraLoaderSubtitle"></small><button type="button" class="camera-retry hidden" data-camera-action="retry-camera" id="cameraLoaderRetry">Повторить</button></div>' +
        '</div>' +
        '<div class="camera-action-row"><button type="button" class="camera-room-action" data-camera-action="empty" id="cameraActionEmpty">Опустошён</button><button type="button" class="camera-room-action is-primary" data-camera-action="open-refill" id="cameraActionRefill">Пополнить</button><button type="button" class="camera-room-action" data-camera-action="residential" id="cameraActionResidential">Жилой</button></div>' +
        '<div class="camera-capture-zone"><button type="button" class="camera-capture-button" data-camera-action="capture" id="cameraCapture" aria-label="Сделать фото"><span></span></button></div>' +
      '</div>' +
    '</div>' +
    '<div class="camera-feedback" id="cameraFeedback" role="status"></div>' +
    '<div class="camera-modal-overlay hidden" id="cameraPreviewModal" role="dialog" aria-modal="true" aria-label="Предпросмотр фотографии" aria-hidden="true"><div class="camera-preview-card"><div class="camera-preview-room" id="cameraPreviewRoom">Номер</div><canvas id="cameraPreviewCanvas" class="camera-preview-canvas"></canvas><div class="camera-preview-actions"><button type="button" class="camera-preview-secondary" data-camera-action="retake">Переснять</button><button type="button" class="camera-preview-primary" data-camera-action="send-photo" id="cameraSendPhoto">Отправить</button></div></div></div>' +
    '<div class="camera-modal-overlay hidden" id="refillModal" role="dialog" aria-modal="true" aria-label="Пополнить номер" aria-hidden="true"><div class="camera-refill-modal"><header class="camera-modal-header"><strong>Пополнить · номер <span id="refillModalRoom"></span></strong><button type="button" data-camera-action="close-refill" aria-label="Закрыть">×</button></header><div class="camera-refill-products" id="refillProducts"></div><div class="camera-refill-feedback" id="refillFeedback"></div><footer class="camera-refill-footer"><button type="button" class="camera-refill-all" data-camera-action="refill-all">Всё в списке продуктов</button><div class="camera-refill-footer-row"><button type="button" data-camera-action="clear-refill">Очистить</button><button type="button" class="is-save" data-camera-action="save-refill" id="refillSave">Сохранить пополнение</button></div></footer></div></div>' +
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
}
export function cameraWillUnmount() {
  mounted = false;
  loadToken++;
  if (carouselTimer) clearTimeout(carouselTimer);
  if (stream) stopCamera();
  clearPhoto();
}
