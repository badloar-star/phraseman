# Task packet: PM-252 — срок хранения 90 дней для СТАРЫХ записей app_errors / app_activity

Governance-ID: TG-8ECDCC8585A5
Status: In progress (скрипт готов, запись — только по команде координатора)
Owner: Ядро; план §107 (PM-252 — открытое блокирующее замечание ревизии: «TTL 90 дн. app_errors/app_activity не реализован»)

## Outcome
Код уже пишет `expireAt` (functions/src/log_ttl.ts, client_reports.ts, коммит f8c948552 от 2026-10-01), TTL-политики ACTIVE (gcloud firestore fields ttls list). Но записи до выкладки — без `expireAt`, политика их не удалит никогда. Read-only 03.10: app_errors 6377 (старше 90 дн. — 772, самая старая 2026-05-29), app_activity 4600 (старше 90 дн. — 294, с 2026-06-02).
Нужно: разовый скрипт проставляет `expireAt = createdAtMs + 90 дн.` записям без поля; старые (>90 дн.) TTL удалит в течение ~24 ч.

## Scope
scripts/pm252_log_ttl_backfill.py (новый). Код функций не меняется.

## Architecture
Постраничный проход по createdAtMs (orderBy + startAfter, страница 300, маска полей createdAtMs/expireAt), запись только документам без expireAt, batch commit ≤ 500. По умолчанию dry-run (только счёт), запись — `--apply --approved-by="<кто>"`.

## Security and privacy
Только служебные поля; содержимое журналов не читается и не печатается (маска полей). Удаление старше 90 дней соответствует решению о сроке хранения журналов (log_ttl.ts); политика конфиденциальности — проверить формулировку срока хранения диагностики.

## Technical debt
Принято: если записи без createdAtMs существуют — пропускаются и считаются в отчёте (unknown, не 0).

## Verification
Dry-run на проде (read-only) → числа в INBOX; после --apply повторный dry-run → 0 без expireAt; через сутки count старше 90 дней → ~0.

## Rollback
Поле expireAt можно снять тем же скриптом до срабатывания TTL; удалённые TTL записи не восстанавливаются (журналы диагностики).

## Dry-run на проде (03.10, только чтение)
- app_errors: total 6377, с expireAt 17, без 6360 (часть — только `createdAt` ISO-строкой у самых старых), unknown 0, удалится TTL в течение ~24 ч после проставки — 1346.
- app_activity: total 4600, с expireAt 28, без 4572, unknown 0, удалится — 3096.
- Цена: ~10 932 записи поля один раз (центы); дальше TTL держит журналы в 90 днях сам.
- Ждёт: команда координатора на `--apply --approved-by=...`.
