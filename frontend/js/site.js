import { trackPage } from './analytics.js';
const legacy = location.hash.match(/^#\/(.*)$/);
if (legacy) {
  const [page, slug] = legacy[1].split('/');
  const pages = { '': 'index', yandex: 'yandex', mospolytech: 'mospolytech', history: 'history', about: 'about', contacts: 'contacts', news: 'news', service: 'service' };
  if (Object.hasOwn(pages, page)) location.replace('./' + pages[page] + '.html' + (page === 'service' ? '?service=' + encodeURIComponent(slug || '') : ''));
} else {
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); document.querySelector('main').focus(); document.querySelector('main').scrollIntoView(); });
  if (!['about','contacts'].includes(document.body.dataset.page)) await import('./app.js');
  trackPage(location.pathname + location.search, document.title);
}
