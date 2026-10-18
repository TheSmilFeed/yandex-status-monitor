// Публичная конфигурация. Здесь никогда не должно быть секретов Supabase.
export const config = Object.freeze({
  apiBase: 'https://yandex-status-monitor.fbgh111.workers.dev',
  refreshMs: 60_000,
  staleMs: 15 * 60_000,
  timeoutMs: 15_000,
  historyLimit: 500,
  timeZone: 'Europe/Moscow',
});
