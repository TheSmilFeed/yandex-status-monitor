import { config } from '../config.js';
import { readPayload } from './model.js';

export async function request(path, field, { signal, fetcher = fetch } = {}) {
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const response = await fetcher(`${config.apiBase}${path}`, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`API временно недоступен (HTTP ${response.status}).`);
  const payload = await response.json();
  readPayload(payload, field);
  return payload;
}
export const getStatus = options => request('/api/status', 'services', options);
export const getIncidents = options => request('/api/incidents', 'incidents', options);
export const getHistory = (slug, options) => request(`/api/history?service=${encodeURIComponent(slug)}&limit=${config.historyLimit}`, 'checks', options);
export function errorText(error) {
  if (['TimeoutError', 'AbortError'].includes(error?.name)) return 'Сервер не ответил вовремя. Повторите запрос.';
  if (error instanceof TypeError) return 'Не удалось подключиться к API. Проверьте интернет; возможна недоступность сервера или ограничение CORS.';
  return error?.message || 'Не удалось получить данные.';
}
