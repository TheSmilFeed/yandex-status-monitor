# Фактический публичный API

Все запросы frontend — GET к `https://yandex-status-monitor.fbgh111.workers.dev`, `credentials: omit`, без ключей.

## GET /api/status

Envelope: `{ ok: true, generated_at, services: [...] }`.

Service: `slug`, `name`, `provider`, `url`, `monitor_type`, `current`, `incident`.

`current`: `status`, `http_status`, `response_time_ms`, `is_available`, `external_status`, `complaints_count`, `checked_at`, `error_message`. `current` может отсутствовать; значения null не считаются нулями. Статусы: operational, degraded, major_outage, unavailable, unknown.

`incident`: null либо `id`, `title`, `severity`, `started_at`, `is_confirmed`.

## GET /api/incidents

Envelope: `{ ok: true, generated_at, incidents: [...] }`.

Incident: `id`, `service_id`, `title`, `description`, `severity`, `started_at`, `ended_at`, `source`, `source_url`, `is_confirmed`.

`ended_at: null` обозначает открытый инцидент. `is_confirmed: false` не превращается в официальное подтверждение.

## GET /api/history?service=<slug>&limit=500

Envelope: `{ ok: true, service: { slug, name }, checks: [...] }`.

Check: `checked_at`, `http_status`, `response_time_ms`, `is_available`, `status`, `error_message`, `external_status`, `complaints_count`.

Frontend сортирует записи по времени. Временные фильтры применяются к полученным данным. Серверное максимальное значение limit и пагинация не документированы; полный период не обещается. Строки с некорректным timestamp отбрасываются.

## Недостающие поля и следующие расширения

* Для надёжной связи закрытых инцидентов: добавить `id` в сервис либо `service_slug` в инцидент.
* Для полной истории: документированный диапазон `from/to` и курсорная пагинация.
* Для внешних статусов: ссылки, время получения, тип и степень подтверждения источника.
* Для ЦОДов: отдельный read-only endpoint с актуальностью и источниками, без вымышленного ping.
* Для новостей: endpoint для title, summary, source, source_url, published_at, category, image_url, keywords, is_official.

Эти изменения только описаны и не применены к production.
