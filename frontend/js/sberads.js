import { isPublishedSite } from './analytics-host.js';

// Официальный код счётчика 7753202 из кабинета Статистики от SberAds.
export function startSberAds(win, doc) {
  if (!isPublishedSite(doc.URL) || doc.getElementById('sberads-script')) return;
  const pending = [];
  const sendEvent = (name, data) => {
    if (!win.top100Counter) { pending.push([name, data]); return; }
    try { win.top100Counter.trackEvent(name, data); }
    catch { /* Ошибка счётчика не должна мешать переходу по ссылке. */ }
  };
  const onLinkClick = event => {
    if (event.defaultPrevented || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const current = new URL(doc.URL);
    const target = new URL(link.href, doc.URL);
    if (current.pathname.endsWith('/contacts.html') && target.href === 'https://t.me/ivan_litvin0v') {
      sendEvent('contactTelegram', { page: 'contacts', target: 'telegram' });
    } else if (target.origin === current.origin && target.pathname === '/yandex-status-monitor/history.html') {
      sendEvent('openHistory', { page: current.pathname.split('/').pop() || 'index.html' });
    }
  };
  doc.addEventListener('click', onLinkClick);
  doc.addEventListener('auxclick', onLinkClick);
  (win._top100q = win._top100q || []).push(function () {
    try {
      win.top100Counter = new win.top100({ project: 7753202 });
      pending.splice(0).forEach(([name, data]) => sendEvent(name, data));
    }
    catch { /* Недоступность аналитики не мешает мониторингу. */ }
  });
  const script = doc.createElement('script');
  script.id = 'sberads-script';
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://st.top100.ru/top100/top100.js';
  doc.head.appendChild(script);
}
