# Task packet: [DIALOG-QUOTA-OPT] — откуда начальный остаток «N/30» при входе в диалог (лог перед правкой)

Governance-ID: TG-9FF0E519E35A
Status: Logs done (71 тест зелёные, срез типов 0); правка — после журнала Сверки
Owner: сессия «1 · Ядро» (координатор 12.10, низкий приоритет: «сначала лог-строка: откуда взялось начальное значение»).

## Outcome
Сверка (DIALOG_QUOTA_OPT_2026-10-12.log): на первой реплике remaining=null, пилюля появляется только после ответа
сервера (~1,5 с). Код уже берёт остаток из зеркала AsyncStorage при входе — значит зеркало вернуло не «allowed» или
пришло поздно. Лог покажет: источник (cache / null), статус, остаток, ПРИЧИНУ пустого зеркала (нет stableId, нет
ключа, нет зеркала, месяц сменился, ошибка чтения), время чтения и не опоздало ли оно за ответом сервера. Правка
(мгновенный показ из кэша и −1 на первой реплике) — по фактам лога.

## Scope
In: `app/ai_dialog_daily_quota.ts` (строки причины на каждом выходе «unknown» в readAiDialogMonthlyQuota, форма
ответа не меняется), `hooks/use_dialogue_v2_session_coaching.ts` (строка initial + ранние выходы).
Out: `dialogue_v2_authorized_catalogue_projection.ts` и `dialogue_v2_session_outcome_store` — в работе у Дизайна.
Сервер, Firestore — не трогаются.

## Architecture
Только console.log/console.warn с префиксом [DIALOG-QUOTA-OPT]; читатель зеркала возвращает прежние объекты.

## Security and privacy
В лог — статус, числа, причина, миллисекунды; без uid и текста реплик.

## Technical debt
Строки чтения зеркала печатаются и в стор-сборке (console, как соседний `read:catch`); по одной строке на вход
в диалог/хаб — шум минимальный. После правки временную строку initial можно сократить.

## Verification
babel_check; точечные тесты ai_dialog_monthly_quota_client, ai_dialog_daily_quota, dialogue_v2_quota_optimistic.
Бой — журнал Сверки на входе в диалог.

## Rollback
`git revert`.
