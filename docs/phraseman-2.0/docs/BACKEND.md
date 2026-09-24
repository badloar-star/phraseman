# Серверная чистка, бюджеты и диагностика

## Безопасная чистка
Проверенный `functions/src/index.ts` содержит auth recovery/merge, account deletion, support наряду с подарками/лигой [C05]. Сначала фактический deployed inventory и dependency graph. «Удалить все ненужные cron» не означает выключить все расписания разом или стереть live данные. Retire: stop producers → drain/resolve pending → remove clients/consumers → disable deployments → purge после срока.

## Учёт стоимости
По каждому изменению описать число document/index reads, writes/deletes, storage, egress и invocation/compute; AI отдельно. Сумма за период = количество событий × операции на событие × текущая цена региона + хранение/передача/compute. Учитывать пустые queries, reconnect listeners, retries/security checks и fan-out. Для миграции посчитать отдельный разовый расход. Источник правил тарификации: [W5]; реальные usage/region неизвестны, поэтому численной сметы евро пока нет.

Alerts-only бюджеты предупреждают, а не автоматически останавливают все расходы [W6]. Анонсированные 14.09.2026 Firebase spend caps в Public Preview относятся к перечисленным сервисам (AI Logic, Cloud Functions for Firebase, App Hosting); enforcement не мгновенный [W7]. Firestore не объявлять покрытым этим списком. Проверить доступность и последствия для конкретного проекта. Дешёвый план не должен внезапно ломать покупку, auth или сохранение из-за остановленного сервиса.

## Минимальная диагностика
Существующий DebugLogger/админ-канал аудировать до создания новой инфраструктуры. Контракт: error code, operation, screen/domain, build/SHA, traceId, severity, bounded safe context, occurrence timestamp; псевдонимизация account identifier при необходимости. Не собирать личные карточки, полные prompts, токены, пароли и сырое аудио «для полноты».

Неблокирующая локальная очередь с пределом памяти/диска; coalescing одинаковых ошибок; sampling некритичного; ограниченный retry/backoff; срок хранения. Ошибки денег/сохранения не терять молча, но и не делать серверную запись на каждую перерисовку. Есть неизбежная нагрузка — измерить и согласовать. Проверка конца пути: инъецированная ошибка появилась в нужной админке с правильным контекстом и без PII.

## Границы полномочий
Клиент не назначает balance/rank/leaderboard/favoriteCount. Проверить rules/callable auth/idempotency/server authority. Не отключать App Check/security rules ради latency. Auth/account delete/purchase callback и необходимые support jobs сохраняются. Мёртвые действия админки тоже удаляются, чтобы через них нельзя было выдавать исчезнувшие предметы.

AI вызовы — явное действие, ограниченные input/output, кеш где уместно, timeout, retry/idempotency, rate limits и деньги по домену. Нулевая энергия у Plus не означает неограниченное потребление всех внешних API.
