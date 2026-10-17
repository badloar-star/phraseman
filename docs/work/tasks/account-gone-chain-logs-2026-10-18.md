# Task packet: [ACCOUNT-GONE] — лог на каждом шаге «аккаунт удалён в другом месте / сервер вернул not-found»

Governance-ID: TG-89A7649289BA
Status: В работе (координатор 18.10, задача 1 из 3)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Одним поиском `[ACCOUNT-GONE]` видна вся цепочка: что пришло (маркер удаления / user-not-found / отказ входа
identity_retired / account_delete_pending), какая ветка выбрана и каким значением, чем кончилась свежая личность и что
увидел человек (онбординг, окно «Аккаунт удалён» при входе, окно «Восстановить аккаунт?», ничего — пропуск).

## Scope

- app/auth_provider.ts: handleAccountDeletedOnAnotherDevice — вход, исход свежей личности (status/phase), ранний выход
  с причиной, успех; ветки входа identity_retired (subject, fresh.status, итоговый результат) и account_delete_pending.
- app/_layout.tsx: обработчик монитора — пропуск при локальном удалении, отказ обработчика (reason), событие
  account_deleted → `user_sees: onboarding`.
- app/account_delete_restore_prompt.ts: noticeAccountDeletedForever — `user_sees: retired_notice` + surface.
- Поведение и тексты НЕ меняются (тексты уже человеческие, без системных слов — проверено при чтении).

## Architecture

Только console.log/warn с префиксом [ACCOUNT-GONE], JSON одной строкой; uid/stableId — не больше 8 знаков.

## Security and privacy

Без почты, имён и полных идентификаторов; коды ошибок и названия веток.

## Technical debt

Временных логов нет: всё это ранние выходы и итоги, по правилу владельца остаются навсегда.

## Verification

Точечные тесты tests/remote_account_deletion_monitor.test.ts и тесты auth_provider по удалению; проверка типов трёх
файлов. На эмуляторе — при прогоне удаления (задача 2) цепочка видна в .expo/metro-console.log.

## Rollback

Обратный собственный патч (только строки логов).
