import { availabilityOf, escapeHTML as e, formatDate, catalog } from './model.js';

export function availabilityChart(rows, period, slug, now = Date.now()) {
  if (!rows.length) return '';
  const duration = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[period] || 86400000;
  const start = now - duration;
  const x = time => 172 + Math.max(0, Math.min(1, (time - start) / duration)) * 760;
  const states = {
    available: { y: 45, label: 'HTTP доступен', color: '#22845a' },
    unavailable: { y: 95, label: 'Ошибка HTTP', color: '#b43d38' },
    unknown: { y: 145, label: 'Не определено', color: '#7c8797' },
  };
  const name = catalog.find(c => c.slug === slug)?.name || slug;
  const span = `Полученные проверки: ${formatDate(rows[0].checked_at)} — ${formatDate(rows.at(-1).checked_at)} МСК.`;
  return `<h3 class="chart-subtitle">Доступность адреса</h3><div class="availability-scroll" tabindex="0" role="region" aria-label="График доступности; на узком экране можно прокрутить вправо"><svg class="availability-chart" viewBox="0 0 960 205" role="img" aria-label="HTTP-доступность ${e(name)}. Каждая точка — одна проверка. ${e(span)}">
    <rect x="172" y="20" width="760" height="150" rx="6" fill="#f5f7fa"/>
    ${Object.values(states).map(s => `<text x="155" y="${s.y+4}" text-anchor="end">${s.label}</text><path d="M172 ${s.y}H932" stroke="#e0e6ed"/>`).join('')}
    ${rows.map(row => { const s = states[availabilityOf(row)]; return `<circle cx="${x(Date.parse(row.checked_at)).toFixed(2)}" cy="${s.y}" r="3" fill="${s.color}"><title>${e(formatDate(row.checked_at))} МСК · ${s.label} · HTTP ${e(row.http_status ?? '—')}</title></circle>`; }).join('')}
    <text x="172" y="193">${formatDate(new Date(start).toISOString())}</text><text x="552" y="193" text-anchor="middle">${formatDate(new Date(start + duration/2).toISOString())}</text><text x="932" y="193" text-anchor="end">${formatDate(new Date(now).toISOString())}</text>
  </svg></div><p class="chart-range">${e(span)}</p><p class="section-note">Каждая точка — реальная проверка. Пустые участки означают отсутствие измерений в полученной выборке. HTTP-доступность не гарантирует работу всех функций сервиса.</p>`;
}
