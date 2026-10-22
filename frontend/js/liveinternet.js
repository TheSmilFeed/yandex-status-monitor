import { isPublishedSite } from './analytics-host.js';
// Параметры официального кода LiveInternet, полученного владельцем сайта.
// Локальные проверки и копии сайта не отправляют просмотры.
export function liveInternetHit(doc, display) {
  if (!isPublishedSite(doc.URL)) return;
  const counter = doc.getElementById('licntCDCA');
  if (!counter) return;
  counter.src = 'https://counter.yadro.ru/hit?t52.11;r' + escape(doc.referrer)
    + (typeof display === 'undefined' ? '' : ';s' + display.width + '*' + display.height + '*' + (display.colorDepth ? display.colorDepth : display.pixelDepth))
    + ';u' + escape(doc.URL) + ';h' + escape(doc.title.substring(0, 150)) + ';' + Math.random();
}
