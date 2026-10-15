# Task packet: удаление аккаунта стирает метку onboarding_level_counted/{stableId}

Governance-ID: TG-7DB36B13CB0B
Status: В работе — коммит в окно 10:30, выкладка сервера 17.10 вместе со всем
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Ядро в 3705b3984 завело серверную метку `onboarding_level_counted/{stableId}` (только день, без уровня) — «этот человек уже
посчитан» для статистики экрана уровня онбординга. Документ адресован stableId человека, значит это персональный след и при
удалении аккаунта его нужно стирать (координатор 15.10). Дневные счётчики `onboarding_level_daily` — агрегаты без идентификатора,
их удаление не касается.

## Scope

In scope: `functions/src/account_delete.ts` — строка в `DIRECT_DOCUMENT_SPECS` (`values: 'stable'`, как `voice_minute_wallets`);
`functions/src/account_delete_coverage_gaps.test.ts` — проверка, что план удаления содержит метку по stableId.
Out of scope: сама статистика (Ядро), правила Firestore (метка уже закрыта `read, write: if false`), выкладка (17.10).

## Architecture

Прямые документы по id идут через `accountDeleteDirectDocumentPlan` → `deleteDirectDocs` — тот же путь, что у
`voice_minute_wallets/{stableId}`. Метка пишется только по stableId (не по authUid), поэтому `values: 'stable'`.

## Security and privacy

Удаление становится полнее: после удаления аккаунта не остаётся записи «этот stableId проходил экран уровня в такой-то день».
Политика конфиденциальности уже обещает удаление данных аккаунта — правка политики не нужна.

## Technical debt

- Если метку когда-нибудь начнут писать и по authUid — поменять на `values: 'both'`.

## Verification

`functions` jest: account_delete_coverage_gaps, account_delete (план прямых документов), account_delete_ai_audit (аудит покрытия
коллекций) — через slot.sh run; типы functions по затронутым файлам.

## Rollback

`git revert` коммита.
