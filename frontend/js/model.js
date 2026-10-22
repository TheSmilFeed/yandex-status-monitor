import { config } from '../config.js';

// Справочник задаёт только названия и оформление, никогда — состояние.
export const catalog = [
  { slug: 'yandex-main', name: 'Яндекс', group: 'yandex', icon: 'search', tone: 'red', url: 'https://ya.ru/' },
  { slug: 'yandex-mail', name: 'Яндекс Почта', group: 'yandex', icon: 'mail', tone: 'red', url: 'https://mail.yandex.ru/' },
  { slug: 'yandex-market', name: 'Яндекс Маркет', group: 'yandex', icon: 'market', tone: 'yellow', url: 'https://market.yandex.ru/' },
  { slug: 'yandex-food', name: 'Яндекс Еда', group: 'yandex', icon: 'food', tone: 'yellow', url: 'https://eda.yandex.ru/' },
  { slug: 'yandex-go', name: 'Яндекс Go', group: 'yandex', icon: 'go', tone: 'yellow', url: 'https://go.yandex/' },
  { slug: 'yandex-disk', name: 'Яндекс Диск', group: 'yandex', icon: 'disk', tone: 'blue', url: 'https://disk.yandex.ru/' },
  { slug: 'mospolytech-main', name: 'Московский Политех', group: 'mospolytech', icon: 'poly', tone: 'navy', url: 'https://mospolytech.ru/' },
  { slug: 'mospolytech-account', name: 'Личный кабинет', group: 'mospolytech', icon: 'account', tone: 'navy', url: 'https://e.mospolytech.ru/' },
  { slug: 'mospolytech-lms', name: 'LMS', group: 'mospolytech', icon: 'lms', tone: 'navy', url: 'https://online.mospolytech.ru/' },
];
export const labels = { operational: 'Работает штатно', degraded: 'Наблюдаются сбои', major_outage: 'Массовый сбой', unavailable: 'Недоступен', unknown: 'Нет данных' };
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function dateValue(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null; }
export function formatDate(value, short = false) {
  if (dateValue(value) === null) return 'Нет данных';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: config.timeZone, ...(short ? {} : { day: '2-digit', month: '2-digit' }), hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
}
export function number(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
export function statusOf(service, now = Date.now()) {
  const check = service?.current;
  const checked = dateValue(check?.checked_at);
  if (!check || checked === null) return { code: 'unknown', note: 'Проверка ещё не получена', stale: false };
  if (now - checked > config.staleMs || checked > now + 60_000) return { code: 'unknown', note: 'Данные устарели · нужна новая проверка', stale: true };
  const combined = service.monitor_type === 'combined' || service.slug?.startsWith('yandex-');
  const external = check.external_status;
  const confirmed = service.incident?.is_confirmed === true;
  if (combined && (external === 'major_outage' || (confirmed && ['unavailable', 'major_outage'].includes(service.incident.severity)))) return { code: 'major_outage', note: 'Есть подтверждённый сигнал об инциденте', stale: false };
  if (external === 'degraded' || (number(check.complaints_count) ?? 0) > 0) return { code: 'degraded', note: 'Есть внешний сигнал о проблемах', stale: false };
  if ([401, 403].includes(check.http_status)) return { code: 'unknown', note: `HTTP ${check.http_status} · возможна блокировка проверки`, stale: false };
  let code = Object.hasOwn(labels, check.status) ? check.status : 'unknown';
  if (combined && ['unavailable', 'major_outage'].includes(code)) return { code: 'degraded', note: 'Ошибка HTTP · массовый сбой не подтверждён', stale: false };
  if (code === 'operational' && !(check.http_status >= 200 && check.http_status < 400)) code = 'unknown';
  return { code, note: code === 'operational' ? 'HTTP-доступность · функции не проверены' : code === 'unavailable' ? 'Не отвечает на автоматическую HTTP-проверку' : code === 'degraded' ? 'По данным мониторинга' : 'Недостаточно данных для оценки', stale: false };
}
export function readPayload(payload, field) {
  if (!payload || payload.ok !== true || !Array.isArray(payload[field]) || payload[field].some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('API вернул неожиданный формат данных.');
  return payload[field];
}
export function historyRows(checks, period, now = Date.now()) {
  const windowMs = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[period] ?? Infinity;
  return checks.filter(c => dateValue(c.checked_at) !== null && Date.parse(c.checked_at) >= now - windowMs && Date.parse(c.checked_at) <= now + 60000).sort((a,b) => Date.parse(a.checked_at) - Date.parse(b.checked_at));
}
export function associatedIncidents(service, incidents) {
  return incidents.filter(i => i.id === service?.incident?.id || (service?.id && i.service_id === service.id) || (i.service_slug && i.service_slug === service?.slug));
}

// Оценка исторической HTTP-проверки без проверки её свежести сегодня.
export function availabilityOf(check) {
  const code = number(check?.http_status);
  if ([401, 403].includes(code) || check?.status === 'unknown') return 'unknown';
  if (code !== null && code >= 200 && code < 400) return 'available';
  if ((code !== null && code >= 400 && code <= 599) || (code === null && check?.is_available === false && check?.status === 'unavailable')) return 'unavailable';
  return 'unknown';
}
