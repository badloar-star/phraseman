# Task packet: имя пользователя больше не попадает в журналы сбоев и активности

Governance-ID: TG-5C10B2A62466
Status: In progress
Owner: 1 · ЯДРО (по поручению координатора 01:58, вопрос Авторизации §AUTH-0230)
Related epic/enabler: §AUTH-0230 (текст ошибок входа убран из аналитики)

## Outcome

Журналы `app_errors` (сбои) и `app_activity` (трейсы активности) больше не содержат
`userName`. Остаётся только uid. Админка App Health по-прежнему показывает имя рядом с uid:
она получает его пачкой из `users` через `resolveUserNames`. Уведомления в Telegram о сбоях
перестают получать имя, потому что в документе его больше нет.

## Scope

In scope:
- `app/app_health.ts`, `app/app_activity.ts`: не читать `user_name` и не отправлять `userName`;
- `functions/src/client_reports.ts`: виды `app_error` и `app_activity` не сохраняют `userName`
  (защита от старых сборок; вступает в силу после деплоя владельцем);
- `admin/v2/legacy.html`: App Health и Activity берут имя через `resolveUserNames`
  (кэш на сессию, 30 uid за запрос); немой `catch {}` в `resolveUserNames` пишет причину;
- тест-сторож и правка `tests/app_health_throttle_cache.test.ts`.

Out of scope:
- обращения, отправленные пользователем сознательно (`error_report`, `user_report`,
  `subscription_cancel_survey`): там имя нужно поддержке, человек отправляет его сам;
- форматтер Telegram `admin_alerts.ts`: строка «User:» станет «—» сама. Убрать её — отдельное
  решение (тест сейчас намеренно ждёт ник).
- Чистка старых документов: они уйдут по TTL `expireAt` (90 дней).

## Architecture

Нет новой архитектуры: из потока убирается одно поле. Имя для админа берётся по uid
из `users` — тот же путь, что везде в админке.

## Security and privacy

Сокращение обрабатываемых персональных данных: имя больше не копируется в журналы с
90-дневным хранением и в Telegram. Политика конфиденциальности описывает диагностические
журналы; сужение сбора правки политики не требует (проверено в `legal/`).

## Technical debt

- Contain: строка «User:» в Telegram-оповещении о критическом сбое остаётся до решения
  координатора (выход — решение по §CORE-0158).

## Verification

- tsc по затронутым файлам; jest: сторож + app_health_throttle_cache + app_activity-тесты;
  functions: client_reports / admin_alerts тесты.
- Ручная проверка: админка App Health показывает имя рядом с uid у новых записей.

## Rollback

Откатить коммит. Данные не мигрируются, схема не меняется.
