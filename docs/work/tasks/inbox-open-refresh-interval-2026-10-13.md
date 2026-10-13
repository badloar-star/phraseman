# Task packet: колокольчик — свежее чтение при открытии не чаще раза в 60 с (смета Ядра e72a5417b №2)

Governance-ID: TG-91AAE9903D5C
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~03:40)

## Outcome

components/AppMessagesInbox.tsx: при открытой шторке/центре `refreshAppMessagesSnapshotOnce({ minIntervalMs: 0 })` — до 240 чтений
Firestore (3 запроса × 80) на КАЖДОЕ открытие колокольчика. Теперь при открытии интервал 60 с (`INBOX_OPEN_REFRESH_MIN_INTERVAL_MS`):
кэш показывается сразу (как было), сеть — если последнее чтение старше минуты. Лог `[INBOX-REFRESH]`: пропуск по интервалу (возраст)
/ чтение (сколько документов) / нет сети-uid / ошибка. Для лога у `refreshAppMessagesSnapshotOnce` необязательный `onOutcome`.

## Scope

In scope: AppMessagesInbox (интервал + лог), app_messages.ts (onOutcome, по умолчанию не передаётся — прочие вызовы без изменений),
4 теста-контракта, закрепляющие прежний 0. Out of scope: «потянуть вниз» и обновление по пушу — в шторке их нет (нет RefreshControl,
нет слушателя пушей для app_messages); добавление — отдельное решение (вид + макет), список координатору.

## Architecture

Отметка последнего чтения общая (readLastBackgroundRefreshMs): если вход/экран Настроек только что читали — открытие колокольчика
берёт кэш. Новые сообщения: максимум 60 с задержки при повторном открытии; первое открытие после входа в приложение читает сеть
(foreground-обновление на входе — 6 ч, но открытие колокольчика после минуты читает свежее).

## Security and privacy

Логи — только счётчики и миллисекунды.

## Technical debt

- Contain: нет «потянуть вниз» для принудительного обновления.

## Verification

Тест onOutcome (cache_interval / network-счётчики) + обновлённые контракты; untranslated-сканер.

## Rollback

git revert коммита.

## Result

INBOX_OPEN_REFRESH_MIN_INTERVAL_MS = 60_000 при открытой шторке/центре; onOutcome у refreshAppMessagesSnapshotOnce (cache_interval/unavailable/network/error); лог [INBOX-REFRESH] open/minIntervalMs/outcome. Тесты 7 файлов 26/26 (поведенческий: кэш в пределах 60 с, попытка сети после). «Потянуть вниз»/пуш — в шторке нет, список координатору.
