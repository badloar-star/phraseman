# Task packet: команда выкладки TTL 30 дней в DEPLOY_MORNING + скрипт backfill expireAt для старых error_reports (НЕ запускать)

Governance-ID: TG-E59E07FAD9A4
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10). Запуск backfill с --apply — ТОЛЬКО по слову владельца утром.

## Outcome

- docs/phraseman-2.0/DEPLOY_MORNING_2026-10-13.md: раздел «Журнал поддержки — срок 30 дней» с командой
  `firebase deploy --only functions:submitClientReport,firestore:indexes` из того же чистого среза, пометки «TTL до 24 ч», «без --force»,
  и пункт «нужно слово владельца» — backfill.
- scripts/error_reports_ttl_backfill_2026-10-13.mjs: по умолчанию dry-run (сколько документов, самый старый, сколько получат expireAt,
  сколько уже с expireAt, сколько пропущено как жалобы Шпиля); запись — только `--apply --owner-yes`, батчи по 400, обход по __name__
  с курсором и limit (where(expireAt==null) в Firestore невозможен); вход — ADC (`gcloud auth application-default login`), ключей нет.

## Scope

In scope: документ и скрипт. Out of scope: запуск выкладки и backfill, сервер.

## Architecture

expireAt = (createdAtMs | createdAt | serverCreatedAt | createTime документа) + 30 дней — та же формула, что supportReportExpireAt.
Уже прошедшие сроки получат expireAt в прошлом — TTL удалит их в течение ~24 ч (намеренно: «хранится 30 дней»).
Жалобы на задания Шпиля (category spire_task_report / contentScope spire) не трогаем: у них нет TTL на сервере.

## Security and privacy

Только поле expireAt; содержимое не читается в вывод (в журнал — счётчики и дата самого старого).

## Technical debt

- Contain: одноразовый скрипт с датой в имени.

## Verification

node --check скрипта; разбор аргументов без сети (без --apply ничего не пишет — проверка по коду).

## Rollback

Документ — откат коммита; если backfill запущен — снять expireAt нельзя после удаления TTL (поэтому только по слову владельца).

## Result

Скрипт готов: node --check OK; `--apply` без `--owner-yes` отказывает ДО подключения к базе (проверено). DEPLOY_MORNING_2026-10-13.md
в момент работы правился другой сессией (незакоммичен; раздел «Д» с командой уже вписан ею) — файл не трогал, пункт про backfill передан
координатору текстом для вставки в раздел «Д».
