import { trackPage, registerAnalytics } from './analytics.js';
import { liveInternetHit } from './liveinternet.js';
import { startSberAds } from './sberads.js';
import { startMyTracker } from './mytracker.js';
const legacy = location.hash.match(/^#\/(.*)$/);
if (legacy) {
  const [page, slug] = legacy[1].split('/');
  const pages = { '': 'index', yandex: 'yandex', mospolytech: 'mospolytech', history: 'history', about: 'about', contacts: 'contacts', news: 'news', service: 'service' };
  if (Object.hasOwn(pages, page)) location.replace('./' + pages[page] + '.html' + (page === 'service' ? '?service=' + encodeURIComponent(slug || '') : ''));
} else {
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); document.querySelector('main').focus(); document.querySelector('main').scrollIntoView(); });
  registerAnalytics('liveinternet', () => liveInternetHit(document, screen));
  registerAnalytics('sberads', () => startSberAds(window, document));
  registerAnalytics('mytracker', () => startMyTracker(window, document));
  trackPage(location.pathname + location.search, document.title);
  if (!['about','contacts'].includes(document.body.dataset.page)) await import('./app.js');
}
