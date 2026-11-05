# A5 — выход «только успех»: довести защитную запись смены вместо окна «Не удалось выйти» (Q24, решение владельца 05.11)

Governance-ID: TG-2BBC5880DAC1
Governance-ID: TG-C868373D25C7
Governance-ID: TG-B8B99FF64313
Status: В работе 06.11
Owner: «5 · ВХОД»

## Outcome

Если выход сорвался ПОСЛЕ записи защитного маркера (recovery_required / wipe_failed), приложение тихо доводит его восстановлением (как при запуске, до трёх попыток) и при успехе показывает обычную шторку входа. Окно «Не удалось выйти» остаётся только если восстановление не довело (карантин): тогда старый аккаунт не считается закрытым и пускать в другой нельзя.

## Scope

`components/account/AccountLogoutFlow.tsx` (ветка после двух форсированных попыток), сторож `tests/a5_logout_recovery_success_2026_11_06.test.ts`. Хелпер `resumeAccountSwitchRecovery` уже есть в `app/auth_provider.ts:4528`, не менялся.

## Architecture

Защитный маркер подтверждён самим кодом причины (`recovery_required`/`wipe_failed` возвращаются только после записи маркера). Без маркера (отказ до записи) прежние тихие повторы и окно. Восстановление идемпотентно; повторяем только retryable.

## Security and privacy

Чужие данные на телефоне не попадают: шторка входа показывается только когда восстановление вернуло `ok` (локальные данные стёрты). При `ok:false` окно остаётся — fail-closed. Данные не собираются.

## Technical debt

A12 (тост «Облако сейчас недоступно») отдельно. Живой прогон выхода — Эмулятор.

## Verification

Сторож по тексту кода + существующий `account_switch_recovery_resume_contract`; журнал `[AUTH-LOGOUT]` `recovery_attempt`, `ui_done`.

## Rollback

Убрать вызов `resumeAccountSwitchRecovery` в `AccountLogoutFlow.tsx`.
Governance-ID: TG-4D0326414D27
