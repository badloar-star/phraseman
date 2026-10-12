# Task packet: удаление гостя — логи таймаута accountDeleteEnqueue + оценка очистки кэша Firestore SDK

Governance-ID: TG-59CF426223BF
Governance-ID: TG-8946D50527F3
Governance-ID: TG-EF9B6F108426
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10 ~19:05, п.B — важнее A)
Related epic/enabler: настоящее удаление гостя Сверкой 18:36: холодный старт accountDeleteEnqueue ≈8 с = клиентский дедлайн 8 с
(account_delete_enqueue_timeout), сервер получил запрос в 17:37:05; дальше accountDeleteMine (42 документа) + FAILED_PRECONDITION
(индекс — 37e53b290 координатора, ждёт деплоя).

## Outcome

1. «Сперва логи»: в помощнике дедлайна постановки ([ACC-MUT] enqueue:<метка>) — старт, длительность прогрева, момент отправки,
   срабатывание дедлайна (через сколько мс, на какой стадии), ПОЗДНИЙ ответ после дедлайна (ok/код, через сколько мс) — только коды
   ошибок, без текста. В ожидании квитанции по ключу — итог: попыток, мс, последний код.
2. Предложение координатору: дедлайн фоновой фазы (UI не ждёт) / прогрев; оценка очистки локального кэша Firestore SDK при удалении.

## Scope

In scope: app/account_delete_enqueue.ts (логи, параметр метки), app/cloud_sync.ts (метки вызовов, итог ожидания квитанции).
Out of scope в этом шаге: изменение дедлайна и очистка кэша — только предложение и оценка, по «да» координатора.

## Architecture

Логи без изменения логики: таймер, гонка и решения прежние. Поздний ответ только наблюдается (обработчик ставится на исходную операцию).

## Security and privacy

В журнал — только коды ошибок и длительности (сторож aa_auth_error_codes_only). Без uid, почты и текста ошибок.

## Technical debt

- Contain: после разбора логов по запуску — оставить логи ранних выходов/catch, убрать лишнее.

## Verification

account_delete_enqueue_deadline, aa_guest_server_delete, aa_guest_offline_delete_retry, aa_auth_error_codes_only, auth_provider_behavior.

## Rollback

Откат коммита (логика не менялась).
