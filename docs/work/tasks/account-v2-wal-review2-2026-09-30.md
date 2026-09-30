# Task packet: Account V2 — повторное независимое ревью WAL-пакета и запись статуса

Governance-ID: TG-FFDD2B19E272
Status: In progress
Owner: Claude session (Account V2)

## Outcome

Получить вердикт SOURCE APPROVE/HOLD по точным байтам пяти файлов WAL-пакета после ремонта (SHA-256 в отчёте ремонта), записать факты в статус проекта. Без устройства, без коммита.

## Scope

In scope: только чтение пяти файлов независимым ревьюером; запись результата в docs/work/tasks и в docs/phraseman-2.0/PROGRESS.md (краткая строка).
Out of scope: правки пяти файлов (замороженные хэши), device-кампания, staging, commit.

## Architecture

Без изменений: WAL-пакет остаётся library/source mode и fail-closed `device_campaign_not_authorized`.

## Security and privacy

Ревью проверяет утечки ключа, adb/shell-инъекции, запись вне разрешённых путей. Пользовательских данных нет.

## Technical debt

Contain: P3 (pwsh 7, канонический JSON, скорость checksum, failure-evidence, cleanup перекрывает код) остаются открытыми, записываются в статус.

## Verification

Вердикт ревьюера с file:line по каждой находке; при HOLD — ремонт только названной находки с authentic RED.

## Rollback

Ремонт обратим через резервную копию `.tmp_wal_backup/` (версия до ремонта) и повторный прогон тестов.
