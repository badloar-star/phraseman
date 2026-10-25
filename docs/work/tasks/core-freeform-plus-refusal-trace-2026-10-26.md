# Ядро · свободный диалог: трассировка отказа «нужен Plus» на сервере (бэклог стр. 241)

Governance-ID: TG-DF61B5B49D23
Status: In progress
Owner: 1 · ЯДРО (NIGHT_BACKLOG_2026-10-26 стр. 241)

## Outcome
Журнал облака `dialogueV2FreeformSessionStart` за 23–25.10 (только чтение): 22 успешных старта и 48 отказов
`permission-denied` = `dialogue_v2_freeform_plus_required`, очередями по 13–18 попыток каждые 3–5 с (25.10 06:xx,
07:xx, 13:22–13:24). Чей это отказ и почему сервер не увидел Plus, журнал не говорит: строка
`[DIALOGUE-V2-FREEFORM-START] refused` несёт только код. Правило «сперва логи»: на отказе печатаем короткие
префиксы uid, совпадает ли запись с авторизацией и снимок полей подписки с решением каждой ветки. По этим фактам —
диагноз: настоящий не-Plus (тогда вопрос клиенту — почему он стучится повторно) или Plus, который сервер не видит.

## Scope
In scope: `functions/src/dialogue_v2_freeform_production_adapter.ts` — лог на ветке plus_required и причины в трёх
`catch`, которые сейчас молча подменяют ошибку (identity / account / entitlement).
Out of scope: правило доступа (не меняется), клиент (`app/dialogue_v2_freeform*.ts` — 36eba41a0 уже открывает экран
Plus), выкладка — по «да» владельца в пакете сервера.

## Architecture
Без изменений решений. Снимок берётся из того же документа `users/{stableAccountId}`, что уже прочитан внутри
транзакции (`memoizeDocumentReads`) — **новых чтений Firestore нет**. Сроки печатаются относительно «сейчас» в часах.

## Security and privacy
uid — только первые 6 символов (как `[AI-CONSENT]`), поля подписки — план, флаги и сроки, без почты и имени.
Новых данных не собирается.

## Technical debt
После диагноза: строку отказа и причины в `catch` оставить навсегда, подробный снимок полей — по итогам решить.

## Verification
`functions/src/dialogue_v2_freeform_production_adapter.test.ts` и соседние тесты свободного диалога; проверка типов
functions. Живая проверка — после выкладки, по журналу `[FREEFORM-PLUS]`.

## Rollback
Откат коммита (сервер не выложен).
