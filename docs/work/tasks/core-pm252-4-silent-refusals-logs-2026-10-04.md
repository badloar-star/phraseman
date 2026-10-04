# Task packet: PM-252 п.4 — логи причин в немых отказах + проверка бана «закрыто при сбое» для записей

Governance-ID: TG-B04D18158F5E
Status: In progress
Owner: Ядро; поручение координатора 04.10 (PM-252 п.4)

## Outcome
1. Бан: `assertNotBanned` в `friend_codes.ts` (выдача кода друга) и `leaderboard.ts` (резерв имени) при сбое
   чтения `banned_users`/`users` больше не пропускают — отказ `unavailable ban_check_unavailable` + лог `[BAN-CHECK]`.
   Чтение (поиск друга, `friend_lookup.ts`) при сбое по-прежнему скрывает человека, но пишет причину.
2. Немые отказы платных ИИ получают строку причины: explainChoice, dialogueV2 (старт/фриформ/ход/голос бота),
   `ai_globally_disabled` (premium_dialog, premium_dialog_review, mistake_explain), неудачный возврат месячной
   квоты диалога. Только причина и длины/коды — без текстов ученика и без uid в открытом виде.

## Scope
functions/src: friend_codes.ts, leaderboard.ts, friend_lookup.ts, explain_choice.ts, dialogue_v2_*_callable.ts,
premium_dialog.ts, premium_dialog_review.ts, mistake_explain.ts (+ тесты на бан-проверку).

## Architecture
Без новых чтений и записей: логи на уже существующих ветках отказа; бан-проверка — те же два чтения, меняется
только реакция на сбой.

## Security and privacy
Fail-closed для записей закрывает обход бана при сбое Firestore. В логах нет текстов ответов и личных данных.

## Technical debt
Лимиты на человека для friendLookupUser/friendsGetProfiles (ревью PM-252 §2) — отдельной задачей.

## Verification
Тест: сбой чтения бана → отказ для выдачи кода/резерва имени; прежние тесты затронутых файлов; tsc functions.

## Rollback
Откат коммита.
