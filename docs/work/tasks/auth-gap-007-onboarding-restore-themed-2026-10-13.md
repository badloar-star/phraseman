# Task packet: auth-gap-007 — «Восстановить аккаунт?» в онбординге: нативный Alert → тёмное окно очереди (координатор 13.10 ~15:20, вариант а)

Governance-ID: TG-BF9656C3FFC2
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Окно входа из Настроек, после урока и после «Выйти» (`promptAccountRestoreAfterSignInRefusal`, `app/account_delete_restore_prompt.ts`) уже переведено на тёмное окно очереди в 1eb649b0d (13.10 02:23). Кадр auth-gap-007 от 12.10 — старше этой правки.

Онбординг (`components/CleanOnboarding.tsx`, `offerAccountRestore`) всё ещё рисует нативный `Alert.alert`: светлое системное окно с кнопками-текстом поверх тёмного приложения. Переводим и его на `enqueueThemedBlockingChoiceAlert`. Это та же очередь и то же окно `GlassAlertDialog` (тёмная карточка, кнопки-пилюли), что у окна входа и подтверждения смены аккаунта в онбординге (`onboarding_account_switch_confirm.ts`).

- Тексты 9 языков, кнопки и исходы прежние.
- Лог `[ACCOUNT-RESTORE] onboarding choice=… via=button|back` на каждом исходе: «Восстановить», «Не восстанавливать», системная «назад».
- Потолок ожидания слота — тот же `ACCOUNT_RESTORE_SLOT_WAIT`: лог через 2 с, поверх через 8 с.
- Защита от двойного тапа уже есть в `GlassAlertDialog` (`settledRef` — одна кнопка за показ).
- Отклик мгновенный: окно закрывается сразу, восстановление идёт после.

## Scope

In scope: только тело `offerAccountRestore` в `components/CleanOnboarding.tsx` и импорты.
Out of scope: `account_delete_restore_prompt.ts` (уже сделано), очередь и окно (без изменений), тексты.

## Architecture

`await enqueueThemedBlockingChoiceAlert<'decline' | 'restore'>(title, message, actions, { slotWait: ACCOUNT_RESTORE_SLOT_WAIT })` вместо `new Promise` + `Alert.alert`. «Назад» (`THEMED_ALERT_DISMISSED`) = «Не восстанавливать», как `cancelable: false` раньше (нативное окно «назад» не закрывало). Хост `ThemedBlockingAlertHost` смонтирован в `_layout.tsx` после экрана онбординга. Подтверждение смены аккаунта в онбординге уже идёт через эту очередь (прогон 11.10).

## Security and privacy

Данные не меняются. Запрос статуса и восстановление — прежние вызовы, их число не меняется.

## Technical debt

- Тексты окна по-прежнему дублируются в онбординге и в общем модуле (сторож паритета `aa_release_registration_restore_prompt`). Свести к одному вызову — отдельная правка вместе со сторожем.

## Verification

- syncheck файла.
- Тесты `aa_release_registration_restore_prompt`, `aa_release_floor_auth_ui`, `aa_dev_robot_no_cloud_and_restore`, `themed_blocking_alert_queue`.
- Кадр: при пересъёмке auth-gap-007 (окно входа) и при проходе онбординга с удалённым аккаунтом — тёмное окно.

## Rollback

`git revert` коммита.
