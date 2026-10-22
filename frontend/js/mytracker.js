import { isPublishedSite } from './analytics-host.js';

// Веб-счётчик 3807709, выданный MyTracker для приложения 1093228.
export function startMyTracker(win, doc) {
  if (!isPublishedSite(doc.URL) || doc.getElementById('tmr-code')) return;
  const queue = win._tmr || (win._tmr = []);
  queue.push({ id: '3807709', type: 'pageView', start: Date.now() });
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.id = 'tmr-code';
  script.src = 'https://top-fwz1.mail.ru/js/code.js';
  doc.head.appendChild(script);
}
