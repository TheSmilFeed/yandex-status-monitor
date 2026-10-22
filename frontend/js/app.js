import { config } from '../config.js';
import { catalog, labels, escapeHTML as e, safeURL, formatDate, number, statusOf, historyRows, associatedIncidents, availabilityOf } from './model.js';
import { getStatus, getIncidents, getHistory, errorText } from './api.js';
import { availabilityChart } from './charts.js';

const main = document.querySelector('main');
const state = { services: [], incidents: [], loading: true, refreshing: false, statusError: '', incidentError: '', receivedAt: null, selected: document.body.dataset.page === 'yandex' ? 'yandex-mail' : 'mospolytech-main', period: '24h', history: new Map(), historyError: '', historyLoading: false };
let historyController;
const route = readRoute();
const paths = {
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  market: '<path d="m5 8 2 12h10l2-12ZM9 8V6a3 3 0 0 1 6 0v2"/>',
  food: '<path d="M7 3v7m-3-7v5a3 3 0 0 0 6 0V3M7 11v10M19 3v18m0-18c-5 3-5 10 0 10"/>',
  go: '<path d="m4 13 2-6h12l2 6v7M4 20v-7h16M6 17h2m8 0h2M8 4h8"/>',
  disk: '<path d="m3 15 5-9h8l5 9-9 5ZM3 15l9-5 9 5M12 10v10"/>',
  poly: '<path d="M3 20V5l5 8 4-8 4 8 5-8v15M8 13v7m8-7v7"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  lms: '<path d="m2 9 10-5 10 5-10 5ZM6 11v6c4 3 8 3 12 0v-6m4-2v8"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.1M7 17.5h.1M12 6.5h5M12 17.5h5"/>',
  news: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h3m3 0h2M8 18h8"/>',
};
const icon = (key, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.server}</svg>`;
function readRoute() {
  return { page: document.body.dataset.page || 'home', slug: new URLSearchParams(location.search).get('service') || '' };
}
function serviceFor(slug) {
  const meta = catalog.find(s => s.slug === slug);
  const data = state.services.find(s => s.slug === slug);
  return meta ? { ...meta, ...data, name: meta.name, slug: meta.slug, group: meta.group, icon: meta.icon, tone: meta.tone } : null;
}
function badge(code, text = labels[code]) { return `<span class="badge ${e(code)}"><i></i>${e(text)}</span>`; }
function sectionHead(kicker, title, link = '') { return `<div class="section-head"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div>${link}</div>`; }
function empty(title, description, type = 'server') { return `<div class="empty">${icon(type)}<strong>${title}</strong><p>${description}</p></div>`; }
function loadSkeleton(count = 3) { return `<div class="card-grid" aria-busy="true" aria-label="Загрузка данных">${Array.from({length:count}, () => '<div class="skeleton"><span></span><span></span><span></span></div>').join('')}</div>`; }

function connectionNotice() {
  if (!state.statusError) return '';
  return `<div class="notice error" role="alert"><strong>Не удалось обновить статусы</strong><span>${e(state.statusError)} ${state.receivedAt ? `Ниже — последние полученные данные на ${formatDate(state.receivedAt)} МСК.` : 'Состояние сервисов неизвестно.'}</span><button data-action="refresh">Повторить</button></div>`;
}
function serviceCard(service) {
  const status = statusOf(service);
  const check = service.current;
  const response = number(check?.response_time_ms);
  return `<a class="service-card" href="./service.html?service=${encodeURIComponent(service.slug)}"><div class="card-top"><span class="service-icon ${service.tone}">${icon(service.icon)}</span><span class="card-arrow">↗</span></div><h3>${e(service.name)}</h3>${badge(status.code)}<p class="status-explanation">${e(status.note)}</p><div class="card-bottom"><span>${check?.checked_at ? `${formatDate(check.checked_at, true)} МСК` : 'Пока нет проверок'}</span><span>${response === null ? '—' : `${new Intl.NumberFormat('ru-RU').format(response)} мс`}</span></div></a>`;
}
function servicesSection(group) {
  const isYandex = group === 'yandex';
  return `<section class="section" id="${group}">${sectionHead(isYandex ? 'ЯНДЕКС' : 'МОСКОВСКИЙ ПОЛИТЕХ', isYandex ? 'Сервисы Яндекса' : 'Московский Политех', `<span class="section-caption">${isYandex ? '6 сервисов' : '3 сервиса'} · HTTP-мониторинг</span>`)}${state.loading ? loadSkeleton(isYandex ? 6 : 3) : `<div class="card-grid ${isYandex ? 'six' : 'three'}">${catalog.filter(s => s.group === group).map(c => serviceCard(serviceFor(c.slug))).join('')}</div>`}${isYandex ? '<p class="section-note">Внешние сигналы и жалобы отображаются только при наличии данных. Detector404 пока не подключён.</p>' : '<p class="section-note">Автоматический инцидент открывается после 3 последовательных неудачных проверок.</p>'}</section>`;
}
function incidentCards(items) {
  if (!items.length) return empty('Инцидентов в ответе API нет', 'Это не гарантирует отсутствия проблем: охват мониторинга ограничен.');
  return `<div class="incident-list">${items.map(i => `<article class="incident"><span class="incident-dot ${i.ended_at ? 'resolved' : ''}"></span><div><div class="incident-top"><span class="incident-state">${i.ended_at ? 'Завершён' : 'Открыт'}</span><time>${formatDate(i.started_at)} МСК</time></div><h3>${e(i.title || 'Инцидент без названия')}</h3><p>${e(i.description || 'Описание не предоставлено.')}</p><div class="incident-bottom"><span>${e(i.source || 'Источник не указан')} · ${i.is_confirmed === true ? 'Подтверждён источником' : 'Без внешнего подтверждения'}</span>${safeURL(i.source_url) ? `<a href="${e(safeURL(i.source_url))}" target="_blank" rel="noopener noreferrer">Источник ↗</a>` : ''}${i.ended_at ? `<span>Закрыт ${formatDate(i.ended_at)} МСК</span>` : ''}</div></div></article>`).join('')}</div>`;
}
function incidentsSection(service = null) {
  const items = service ? associatedIncidents(service, state.incidents) : state.incidents;
  return `<section class="section">${sectionHead('ЖУРНАЛ СОБЫТИЙ', service ? 'Инциденты сервиса' : 'История инцидентов')}${state.loading ? loadSkeleton(1) : state.incidentError ? `<div class="notice error" role="alert">${e(state.incidentError)}<button data-action="refresh">Повторить</button></div>` : incidentCards(items)}${service ? '<p class="section-note">Показаны события, которые API позволяет однозначно связать с этим сервисом. Полный журнал доступен в разделе «История».</p>' : ''}</section>`;
}
function historySection(slug = state.selected, detailed = false) {
  const c = catalog.find(c => c.slug === slug) || catalog[0];
  return `<section class="section history-section">${sectionHead('ИСТОРИЯ ПРОВЕРОК', 'Графики доступности', '<span class="section-caption">Результаты HTTP-проверок · МСК</span>')}<div class="chart-panel"><div class="chart-toolbar">${detailed ? `<strong>${e(c.name)}</strong>` : `<label class="select-label">Сервис<select id="history-service" aria-label="Сервис для графика">${catalog.filter(c => detailed || !['yandex','mospolytech'].includes(route.page) || c.group === route.page).map(c => `<option value="${c.slug}" ${c.slug === slug ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select></label>`}<div class="periods" role="group" aria-label="Период графика">${[['24h','24 часа'],['7d','7 дней'],['30d','30 дней']].map(([value,label]) => `<button data-period="${value}" aria-pressed="${state.period === value}">${label}</button>`).join('')}</div></div><div id="chart-content" aria-live="polite">${empty('Загрузка истории', 'Запрашиваем реальные результаты проверок.')}</div></div></section>`;
}
function drawHistory() {
  const target = document.querySelector('#chart-content');
  if (!target) return;
  if (state.historyLoading) { target.innerHTML = '<div class="chart-empty" role="status">Загружаем историю проверок…</div>'; return; }
  if (state.historyError) { target.innerHTML = `<div class="chart-empty" role="alert"><strong>Не удалось загрузить историю</strong><p>${e(state.historyError)}</p><button data-action="history-retry">Повторить</button></div>`; return; }
  const slug = route.page === 'service' ? route.slug : state.selected;
  const saved = state.history.get(slug);
  if (!saved) return;
  const rows = historyRows(saved.checks, state.period);
  if (!rows.length) { target.innerHTML = empty('За этот период нет проверок', slug === 'yandex-main' ? 'Проверка главной страницы Яндекса пока не подключена к API.' : 'Выберите другой период или дождитесь следующего запуска мониторинга.'); return; }
  const timed = rows.filter(c => number(c.response_time_ms) !== null);
  const available = rows.filter(c => availabilityOf(c) === 'available').length;
  const unknown = rows.filter(c => availabilityOf(c) === 'unknown').length;
  const max = Math.max(100, ...timed.map(c => c.response_time_ms)) * 1.1;
  const start = Date.parse(rows[0].checked_at), end = Date.parse(rows.at(-1).checked_at);
  const x = row => 62 + (end === start ? .5 : (Date.parse(row.checked_at) - start) / (end - start)) * 870;
  const y = row => 202 - row.response_time_ms / max * 170;
  let segments = [], segment = [];
  for (const row of rows) {
    const previous = segment.at(-1);
    if (number(row.response_time_ms) === null || (previous && Date.parse(row.checked_at) - Date.parse(previous.checked_at) > 12 * 60_000)) { if (segment.length) segments.push(segment); segment = []; }
    if (number(row.response_time_ms) !== null) segment.push(row);
  }
  if (segment.length) segments.push(segment);
  const graph = timed.length ? `<svg class="chart" viewBox="0 0 960 246" role="img" aria-label="Время ответа ${e(catalog.find(c=>c.slug===slug)?.name)}: ${rows.length} проверок, от ${e(formatDate(rows[0].checked_at))} до ${e(formatDate(rows.at(-1).checked_at))} МСК"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86c5ff" stop-opacity=".32"/><stop offset="1" stop-color="#86c5ff" stop-opacity=".02"/></linearGradient></defs>${[0,.5,1].map(t => `<path d="M62 ${202-t*170}H932" stroke="#e9edf2"/><text x="48" y="${206-t*170}" text-anchor="end">${Math.round(max*t)}</text>`).join('')}${segments.map(points => `<path d="M${x(points[0])},202 L${points.map(r=>`${x(r)},${y(r)}`).join(' L')} L${x(points.at(-1))},202Z" fill="url(#chart-fill)"/><polyline points="${points.map(r=>`${x(r)},${y(r)}`).join(' ')}" fill="none" stroke="#2e5aa7" stroke-width="2.5"/>`).join('')}${timed.map(r => `<circle cx="${x(r)}" cy="${y(r)}" r="3" fill="${r.http_status >= 200 && r.http_status < 400 ? '#2e5aa7' : '#cc6245'}"><title>${formatDate(r.checked_at)} МСК · ${r.response_time_ms} мс · HTTP ${e(r.http_status ?? '—')}</title></circle>`).join('')}<text x="62" y="235">${formatDate(rows[0].checked_at)}</text><text x="932" y="235" text-anchor="end">${formatDate(rows.at(-1).checked_at)}</text></svg>` : empty('Нет измерений времени ответа', 'Проверки есть, но response_time_ms отсутствует.');
  target.innerHTML = `<div class="chart-stats"><span><b>${rows.length}</b> проверок в выборке</span><span><i class="dot green"></i><b>${available}</b> HTTP 200–399</span><span><i class="dot gray"></i><b>${unknown}</b> неопределённых</span></div>${availabilityChart(rows, state.period, slug)}<h3 class="chart-subtitle">Время ответа</h3>${graph}<div class="chart-foot"><span>Реальные измерения, без интерполяции пропусков более 12 минут.</span><span>Получено ${saved.checks.length} из последних записей API · лимит запроса ${config.historyLimit}</span></div><p class="section-note">Период фильтрует полученную выборку и не гарантирует полное покрытие. Процент uptime не рассчитывается по неполным данным.</p>${route.page === 'service' || route.page === 'history' ? `<details class="history-details"><summary>Таблица проверок (${rows.length})</summary><div class="table-scroll"><table><thead><tr><th>Время, МСК</th><th>HTTP</th><th>Отклик</th><th>HTTP-доступность</th></tr></thead><tbody>${[...rows].reverse().map(r => `<tr><td>${formatDate(r.checked_at)}</td><td>${e(r.http_status ?? '—')}</td><td>${number(r.response_time_ms) === null ? '—' : `${r.response_time_ms} мс`}</td><td>${e({available:'Доступен по HTTP',unavailable:'Ошибка HTTP',unknown:'Не определено'}[availabilityOf(r)])}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`;
}
async function loadHistory(force = false) {
  if (!document.querySelector('#chart-content')) return;
  const slug = route.page === 'service' ? route.slug : state.selected;
  if (!state.loading && !state.statusError && !state.services.some(s => s.slug === slug)) {
    historyController?.abort(); state.historyLoading = false; state.historyError = '';
    state.history.set(slug, { checks: [], fetchedAt: Date.now() }); drawHistory(); return;
  }
  if (state.loading) return;
  const cached = state.history.get(slug);
  historyController?.abort();
  state.historyError = '';
  if (!force && cached && Date.now() - cached.fetchedAt < config.refreshMs) { state.historyLoading = false; drawHistory(); return; }
  const controller = new AbortController(); historyController = controller;
  state.historyLoading = true; drawHistory();
  try { const payload = await getHistory(slug, { signal: controller.signal }); if (!controller.signal.aborted) state.history.set(slug, { checks: payload.checks, fetchedAt: Date.now() }); }
  catch (error) { if (!controller.signal.aborted) state.historyError = errorText(error); }
  finally { if (historyController === controller && !controller.signal.aborted) { state.historyLoading = false; drawHistory(); } }
}
function newsSection(full = false) {
  return `<section class="section">${sectionHead('НОВОСТИ', full ? 'Новости и сообщения' : 'Последние новости', full ? '' : '<a class="text-link" href="./news.html">Все новости ↗</a>')}<div class="news-placeholder"><span class="news-symbol">${icon('news')}</span><div><h3>Проверенные новости появятся здесь</h3><p>Новостной источник пока не подключён. Здесь будут короткие обзоры официальных сообщений и публикаций СМИ со ссылками на оригиналы.</p></div><span class="pill">Скоро</span></div>${full ? '<div class="prose"><h2>Что попадёт в ленту</h2><p>Сообщения о сбоях и восстановлении сервисов, новости цифровых сервисов Московского Политеха. Официальные сообщения будут отмечены отдельно.</p><p>Полные тексты статей не копируются. Повторные публикации будут объединяться по ссылке и содержанию. Сейчас API не предоставляет новости, поэтому лента пуста.</p></div>' : ''}</section>`;
}
function hero() {
  return `<section class="hero"><div><h1>Что там<br>по серверам <span>Яндекса?</span></h1><p>Мониторинг состояния инфраструктуры<br class="desktop-break"> и цифровых сервисов</p><div class="hero-facts"><span>Яндекс</span><i></i><span>Московский Политех</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-label label-http">HTTP / STATUS</span><div class="server-stack"><div class="server-unit"><span></span><span></span><b></b></div><div class="server-unit"><span></span><span></span><b></b></div><div class="server-unit"><span></span><span></span><b></b></div><div class="server-base"></div></div><div class="signal-tile">↗</div><span class="art-label label-interval">ПРОВЕРКИ КАЖДЫЕ 5 МИН</span></div></section>`;
}
function updateBar() {
  return `<div class="update-bar"><span><i class="dot ${state.statusError ? 'gray' : 'blue'}"></i>${state.receivedAt ? `Данные получены ${formatDate(state.receivedAt)} МСК` : 'Ожидание данных API'}<span class="update-hint"> · обновление страницы раз в минуту</span></span><button class="refresh" data-action="refresh" ${state.refreshing ? 'disabled' : ''}><span aria-hidden="true">↻</span> ${state.refreshing ? 'Обновляем…' : 'Обновить'}</button></div>`;
}
function pageTitle(kicker, title, description) { return `<div class="page-title"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${description}</p></div>`; }
function detail() {
  const service = serviceFor(route.slug);
  if (!service) return `${pageTitle('404', 'Сервис не найден', 'Такого сервиса нет в текущем каталоге.')}<a class="button" href="./index.html">На главную</a>`;
  const status = statusOf(service), check = service.current;
  const source = safeURL(service.url);
  return `<a class="back-link" href="./${service.group}.html">← Все сервисы ${service.group === 'yandex' ? 'Яндекса' : 'Мосполитеха'}</a><div class="detail-title"><span class="service-icon ${service.tone}">${icon(service.icon)}</span><div><p class="eyebrow">${service.group === 'yandex' ? 'ЯНДЕКС' : 'МОСКОВСКИЙ ПОЛИТЕХ'}</p><h1>${e(service.name)}</h1></div>${badge(status.code)}</div>${connectionNotice()}<p class="detail-note">${e(status.note)}. HTTP 200–399 не подтверждает работоспособность входа, оплаты, отправки сообщений и других функций.</p><div class="metric-grid"><div><span>HTTP status</span><b>${e(check?.http_status ?? '—')}</b></div><div><span>Время ответа</span><b>${number(check?.response_time_ms) === null ? '—' : `${check.response_time_ms} <small>мс</small>`}</b></div><div><span>Последняя проверка, МСК</span><b class="date-metric">${formatDate(check?.checked_at)}</b></div><div><span>Жалобы из внешних источников</span><b class="date-metric">${number(check?.complaints_count) === null ? 'Нет данных' : check.complaints_count}</b></div></div>${historySection(service.slug, true)}${incidentsSection(service)}<section class="section">${sectionHead('ИСТОЧНИКИ', 'Источники информации')}<div class="source-grid"><div><h3>Автоматическая HTTP-проверка</h3><p>Cloudflare Worker, запуск по расписанию каждые 5 минут.</p>${source ? `<a href="${e(source)}" target="_blank" rel="noopener noreferrer">Открыть проверяемый сайт ↗</a>` : ''}</div><div><h3>Внешние сигналы</h3><p>${check?.external_status ? `Значение API: ${e(check.external_status)}. Ссылка на источник в текущем ответе не предоставлена.` : 'Нет данных из внешних источников.'}</p><p>Detector404 не подключён.${['yandex-mail','yandex-disk'].includes(service.slug) ? ' Интеграция официального статуса Яндекс 360 запланирована.' : ''}</p></div></div></section>`;
}
function render() {
  const active = document.activeElement?.id;
  const tableOpen = document.querySelector('.history-details')?.open;
  document.querySelectorAll('[data-nav]').forEach(a => { const selected = a.dataset.nav === (route.page === 'service' ? serviceFor(route.slug)?.group : route.page); a.classList.toggle('active', selected); if (selected) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  let content;
  if (route.page === 'home') content = `${hero()}${updateBar()}${connectionNotice()}${servicesSection('mospolytech')}${servicesSection('yandex')}${historySection()}`;
  else if (['yandex','mospolytech'].includes(route.page)) content = `${pageTitle('СТАТУС СЕРВИСОВ', route.page === 'yandex' ? 'Яндекс' : 'Московский Политех', 'Результаты автоматических проверок и доступные сигналы об инцидентах.')}${updateBar()}${connectionNotice()}${servicesSection(route.page)}${historySection()}`;
  else if (route.page === 'history') content = `${pageTitle('ПРОВЕРКИ И СОБЫТИЯ', 'История мониторинга', 'Реальные измерения, открытые и завершённые инциденты.')}${updateBar()}${historySection()}${incidentsSection()}`;
  else if (route.page === 'news') content = `${pageTitle('ОТКРЫТЫЕ ИСТОЧНИКИ', 'Новости', 'Контекст событий, официальные сообщения и публикации СМИ.')}${newsSection(true)}`;

  else if (route.page === 'service') content = detail();
  else content = `${pageTitle('404', 'Страница не найдена', 'Проверьте адрес или вернитесь на главную.')}<a class="button" href="./index.html">На главную</a>`;
  main.innerHTML = content;
  if (active) document.getElementById(active)?.focus({ preventScroll: true });
  drawHistory();
  if (tableOpen && document.querySelector('.history-details')) document.querySelector('.history-details').open = true;
}
async function refresh() {
  if (state.refreshing) return;
  state.refreshing = true;
  document.querySelectorAll('[data-action="refresh"]').forEach(b=>{ b.disabled = true; b.textContent = 'Обновляем…'; });
  const [status, incidents] = await Promise.allSettled([getStatus(), getIncidents()]);
  if (status.status === 'fulfilled') { state.services = status.value.services; state.receivedAt = new Date().toISOString(); state.statusError = ''; } else state.statusError = errorText(status.reason);
  if (incidents.status === 'fulfilled') { state.incidents = incidents.value.incidents; state.incidentError = ''; } else state.incidentError = errorText(incidents.reason);
  state.loading = false; state.refreshing = false; render(); loadHistory();
}
main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.action === 'refresh') refresh();
  if (button.dataset.action === 'history-retry') loadHistory(true);
  if (button.dataset.period) { state.period = button.dataset.period; document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.period===state.period))); drawHistory(); }
});
main.addEventListener('change', event => { if (event.target.id === 'history-service') { state.selected = event.target.value; loadHistory(); } });

document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, config.refreshMs);
if (route.page === 'service') document.title = `${serviceFor(route.slug)?.name || 'Сервис'} · Что там по серверам Яндекса?`;
render(); refresh();
