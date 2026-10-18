// Единая точка интеграции счётчиков на всех маршрутах.
// После получения настоящих ID добавьте официальные сниппеты и адаптеры.
// До этого никакие запросы в LiveInternet, Top-100 или Mail.ru не отправляются.
const adapters = new Map();
export function registerAnalytics(name, adapter) {
  if (!['liveinternet', 'top100', 'mailru'].includes(name) || typeof adapter !== 'function') throw new Error('Некорректный адаптер аналитики');
  adapters.set(name, adapter);
}
export function trackPage(path, title) {
  for (const adapter of adapters.values()) {
    try { adapter({ path, title }); } catch { /* Счётчик не должен нарушать работу мониторинга. */ }
  }
}
