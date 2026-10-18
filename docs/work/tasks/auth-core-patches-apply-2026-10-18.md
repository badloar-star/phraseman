# Task packet: применение готовых патчей Ядра «вход без ошибки» (auth-patches-1018), по одному с тестами

Governance-ID: TG-BF88785643C6
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ (применяет), Ядро (готовило)

## Outcome

Правило владельца «ни один вход/выход без ошибки, кроме нет сети»: тихие повторы вместо карточек для
`restore_failed`, `account_delete_pending`/`not_restorable` (05_06), `local_progress_not_uploaded` (04),
`local_progress_backup_blocked` (03). Каждый патч — отдельный коммит после зелёных тестов.

## Scope

- 05_06_restore_prompt.patch: app/account_delete_restore_prompt.ts + тесты (git apply).
- 04_presync_retry.patch: app/presync_quiet_retry.ts, app/guest_background_upload.ts + тест; подключение в
  auth_provider по описанию 04_presync_retry.md.
- 03_backup_blocked.md, 06_delete_pending_outcomes.md — по описаниям Ядра.
- Окно входа (RegistrationPromptModal) — у Дизайна.

## Architecture

Повторы только на сетевые причины, паузы 0,7 с и 1,8 с; ответы сервера по существу не повторяются. Журнал
[ACCOUNT-RESTORE] на каждом шаге. Восстановление идемпотентно.

## Security and privacy

Новых данных нет; повтор не теряет заявку на удаление.

## Technical debt

Фоновая выгрузка гостя раз в 6 ч (патч 04) — дополнительные записи в Firestore, проверить стоимость перед включением.

## Verification

Точечные тесты каждого патча через светофор; приёмка Сайта и тесты входа после каждого.

## A5 (координатор 18.10)

`resumeAccountSwitchRecovery(): Promise<{ ok }>` в app/auth_provider.ts — для экрана выхода вместо окна «Не удалось выйти /
Перезапусти приложение»: доводит записанную смену тем же восстановлением, что при запуске (resumePendingAccountSwitchQuarantine),
тихо до 3 попыток (0,8 с, 2 с) только на retryable; quarantined — не повторяем. Журнал [AUTH-LOGOUT] recovery_*.
Подключение в AccountLogoutFlow — Дизайн (его файл).

## Rollback

`git revert <hash>` каждого коммита.
