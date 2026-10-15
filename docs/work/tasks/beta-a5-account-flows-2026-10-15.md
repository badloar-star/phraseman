# Task packet: бета-тест А5 — потоки аккаунта (координатор/владелец 15.10 13:30)

Governance-ID: TG-4113DBA9CA48
Status: В работе — тесты потоков + разбор журналов; одна строка журнала в окне 14:00
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

А5 плана docs/work/tasks/beta-test-2026-10-15.md: гость → вход → выход → удаление (до экрана подтверждения) → восстановление; смена
аккаунта; «Восстановить покупки» без подписки не падает. Метод: прогон наборов тестов этих потоков + разбор журналов прогонов дня
(acc_aba_r1, acc_speed_r7/r7b, authfetch_off/on_r7g). Не покрытое тестами — пути для Сверки в разделе Б.

Находка журналов (authfetch_on_r7g, 08:43): после входа `[SIGNIN] bg:swap_restore:restoreFromCloud FAIL 20381ms
reason=timeout_swap_restore_20000ms`, итог `restore=failed` за 57 с (в r7 без fetch — 9,6 с; эмулятор под нагрузкой). withTimeout не
отменяет восстановление: `[LOGIN-BONUS-RESTORE]` идёт ещё через 3 с — похоже, оно дорабатывает молча, но событие
`cloud_profile_hydrated` после потолка не шлётся (экран может не обновить цифры до перехода). Сперва логи: строка
`[SIGNIN] bg:<stage>:restoreFromCloud late=<итог> afterTimeoutMs=… current=…` — чем восстановление кончилось после потолка.
Починка (событие на позднем «restored» при живом поколении) — только по фактам этой строки.

## Scope

In scope: прогон тестов потоков аккаунта; одна строка журнала в `app/auth_provider.ts` (scheduleSameStablePostAuthRefresh); строка
в «Результаты» плана. Out of scope: изменение потолка 20 с и логики восстановления до фактов.

## Architecture

Промис `restoreFromCloudDetailed()` сохраняется до withTimeout; при итоге `failed` к нему цепляется только лог (then/catch).
Поведение не меняется.

## Security and privacy

В лог — итог и миллисекунды, без идентификаторов.

## Technical debt

- После фактов: на позднем `restored` при `isCurrent()` — `emitAppEvent('cloud_profile_hydrated')`.

## Verification

Наборы тестов потоков (auth_provider_*, aa_*, account_delete_*, account_switch_*, paywall_restore_cap_contract, release_reason,
registration_prompt_*); типы auth_provider.

## Rollback

`git revert`.
