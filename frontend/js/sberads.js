import { isPublishedSite } from './analytics-host.js';

// Официальный код счётчика 7753202 из кабинета Статистики от SberAds.
export function startSberAds(win, doc) {
  if (!isPublishedSite(doc.URL) || doc.getElementById('sberads-script')) return;
  (win._top100q = win._top100q || []).push(function () {
    try { win.top100Counter = new win.top100({ project: 7753202 }); }
    catch { /* Недоступность аналитики не мешает мониторингу. */ }
  });
  const script = doc.createElement('script');
  script.id = 'sberads-script';
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://st.top100.ru/top100/top100.js';
  doc.head.appendChild(script);
}
