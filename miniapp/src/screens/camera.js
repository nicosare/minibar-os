import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

export function renderCamera() {
  return '<div class="screen screen-camera">' + pageHeader({ title: 'Камера' }) +
    '<section class="camera-stage-card"><div class="camera-viewfinder-placeholder">' +
    '<span class="viewfinder-corner corner-tl"></span><span class="viewfinder-corner corner-tr"></span>' +
    '<span class="viewfinder-corner corner-bl"></span><span class="viewfinder-corner corner-br"></span>' +
    '<span class="viewfinder-symbol">' + icon('camera', 34) + '</span></div></section></div>';
}
