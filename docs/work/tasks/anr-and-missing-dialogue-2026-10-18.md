# Task packet: ANR на эмуляторе (разбор) и «Диалог не найден» без экрана-ошибки

Governance-ID: TG-63AAC0BDE88E
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 09:22 (кадры Макетов modals_1018/energy004_en, dialogs_3dae3); правило владельца «экранов-ошибок нигде».

## Outcome

1. ANR «Phraseman isn't responding» объяснён по фактам, а не догадкой. Источник — системные записи dropbox data_app_anr за 06:40, 06:43 и 06:47.
2. Битая ссылка на старый ИИ-диалог (`ai_dialog_briefing` / `ai_dialog_session` с неизвестным scenarioId или языком без диалогов) не показывает «Диалог не найден». Вместо этого — тихий уход в хаб Диалогов (`/ai_dialog_home`) и лог `[NO-ERROR-SCREEN]`.

## Scope

В работе:
- app/ai_dialog_briefing.tsx — MissingDialogueScreen;
- tests/dead_end_screens_and_theory_table.test.ts, если сторожит этот экран.

Вне работы:
- замок языка ИИ-диалога (aiDialogTargetGateCopy) — это замок, а не ошибка;
- новые Диалоги V2 — их сделал раздел Диалогов в a70855a55;
- ANR: код приложения не меняется, это вывод по трассам.

## Architecture

Архитектура не меняется. MissingDialogueScreen остаётся тем же экспортом, его импортирует ai_dialog_session. Внутри вместо V2DeadEnd — useSilentLeave (hooks/use_silent_leave.ts) и пустой ScreenGradient.

## Security and privacy

Не затрагивает. В лог идёт только код причины.

## Technical debt

Accept temporarily: тексты «Диалог не найден» удаляются вместе с экраном, долга нет. Замок языка ИИ-диалога остаётся экраном. Решение за координатором, после релиза.

## Verification

- Babel-парс.
- Через слот: dead_end_screens_and_theory_table и тесты маршрута ai_dialog, если есть.

## Rollback

Ревертнуть коммит.
