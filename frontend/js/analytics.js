// ЛР3 — LiveInternet, ЛР4 — Sber Ads, ЛР5 — MyTracker.
// Размещайте здесь только официальные коды, выданные для этого сайта.
// Видимый счётчик устанавливается в #analytics-counters на каждой странице.
const adapters = new Map();
let currentPage;
const delivered = new Set();
function deliver(name, adapter) {
  if (!currentPage || delivered.has(name)) return;
  try { adapter(currentPage); delivered.add(name); }
  catch { /* Ошибка счётчика не должна нарушать работу сайта. */ }
}
export function registerAnalytics(name, adapter) {
  if (!['liveinternet', 'sberads', 'mytracker'].includes(name) || typeof adapter !== 'function') throw new Error('Некорректный адаптер аналитики');
  adapters.set(name, adapter);
  deliver(name, adapter);
}
export function trackPage(path, title) {
  if (currentPage?.path === path) return;
  currentPage = { path, title };
  delivered.clear();
  for (const [name, adapter] of adapters) deliver(name, adapter);
}
