# Существующий Cloudflare Worker

Production: `yandex-status-monitor`, <https://yandex-status-monitor.fbgh111.workers.dev>.

На момент передачи исходник находится в Dashboard. В этом репозитории нет заменяющего Worker, SQL-миграций или автоматического backend deploy. Запуск frontend не меняет базу и расписание.

## Перенос в Git / Wrangler позже

1. Экспортировать подлинный исходник текущей активной версии из Cloudflare Dashboard в `backend/src/worker.js`. Сначала проверить, что в нём нет секретов.
2. Прочитать `fetch` и `scheduled`: `fetch` должен выполнять только чтение, `scheduled` — мониторинг. Проверить три последовательных ошибки и закрытие инцидента для Мосполитеха; не добавлять HTTP-инциденты Яндекса без внешнего подтверждения.
3. Зафиксировать действующие bindings, compatibility date и Cron. Создать отдельную тестовую среду и отдельную тестовую базу. Не направлять тестовые записи в production Supabase.
4. Создать Wrangler-конфигурацию по действующему Worker, сначала для тестовой среды. Не придумывать compatibility date и не добавлять service-role key в конфигурацию. Секреты задаются средствами Cloudflare/Wrangler, локально — в игнорируемом `.dev.vars`.
5. Проверить read-only маршруты, CORS, обработку ошибок и отсутствия данных, лимиты истории. Сравнить поведение с production.
6. После отдельной проверки переносить deployment в Git. Не выполнять deploy заглушки в существующий Worker.

Нужные имена переменных: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Значения не копировались и не нужны frontend.
