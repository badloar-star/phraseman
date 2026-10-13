# Task packet: «Восстановить аккаунт?» — тёмное окно вместо системного Alert (auth-gap-007)

Governance-ID: TG-7AA7C60AF3B4
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10)

## Outcome

`app/account_delete_restore_prompt.ts` (promptAccountRestoreAfterSignInRefusal) показывает вопрос «Восстановить аккаунт?»
через существующую очередь `enqueueThemedBlockingChoiceAlert` (рисует `ThemedBlockingAlertHost` → `GlassAlertDialog`,
как `onboarding_account_switch_confirm.ts`) вместо нативного `Alert.alert`. Тексты, кнопки и исходы
('restored' / 'declined' / 'restore_failed' / 'not_restorable') — те же. Системная «назад» = «Не восстанавливать»
(раньше окно было `cancelable: false`; dismiss → declined, аккаунт не трогается). Лог `[ACCOUNT-RESTORE] choice=…`.

Попутно (scratchpad, не код): ночной прогон регрессий запускал jest через npm-обёртку и падал на пробеле в
«C:\Program Files» — перевод на прямой вызов jest.

## Scope

In scope: account_delete_restore_prompt.ts, его тесты. Out of scope: auth-gap-012 (своё RN Modal в settings.tsx
с переносом Plus — список координатору), поток удаления, сервер.

## Architecture

Та же очередь блокирующих окон, что у подтверждения смены аккаунта; хост уже смонтирован в `_layout.tsx`.

## Security and privacy

Логика восстановления и сервер не меняются; данные не добавляются.

## Technical debt

- Contain: нет.

## Verification

Точечный тест promptAccountRestoreAfterSignInRefusal (dev restore=offer/restored + dismiss), syncheck, сканер непереведённых строк.

## Rollback

Вернуть Alert.alert (git revert коммита).

## Result

Сделано: окно через enqueueThemedBlockingChoiceAlert, «назад» = declined; сторож accounts_v2_client_wiring_v2 обновлён под 52429d419 (дедлайн гостя). 5 файлов тестов: 120/120.
