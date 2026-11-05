# Task packet: простые слова вместо терминов (ru/uk) и единые формулировки заданий на 9 языках

Governance-ID: TG-F49DA866FDA9
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: P0 владельца 08:50 — стандарт «объясняем как ребёнку» (docs/work/classic_plain_explanation_standard_2026-11-05.md)

## Outcome

Список ЗАПРЕЩЁННЫХ терминов с простыми заменами для ru/uk (docs/work/classic_plain_words_ru_uk.md) — взамен прежнего «глоссария терминов». Единые простые формулировки трёх команд заданий на девяти языках — для Learning V2. Успех: файлы в docs/work, коммит, сообщения Теории, Темам и Learning V2.

## Scope

In scope: docs/work/classic_plain_words_ru_uk.md, docs/work/classic_task_commands_9lang.md, этот пакет.
Out of scope: сами главы и интро (пишут Теория и Темы), код заданий Learning V2, прежний глоссарий (остаётся как справка, помечается устаревшим).

## Architecture

Документы-справочники и таблица строк. Код не меняется.

## Security and privacy

Персональных данных нет.

## Technical debt

Простые замены для uk помечены как требующие носителя; локали кроме ru/uk переводятся после того, как Теория и Темы перепишут главы и интро.

## Verification

Файлы на месте; замены проверены на отсутствие терминов в примерах; коммит через safe_commit.

## Rollback

Удалить новые файлы; прежний глоссарий остаётся без изменений.
