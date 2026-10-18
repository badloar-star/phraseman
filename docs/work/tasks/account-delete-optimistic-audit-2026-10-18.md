# Task packet: удаление аккаунта — проверка мгновенного отклика и журнал [AUTH-DELETE]

Governance-ID: TG-8E01D4902DF1
Status: В работе (координатор 18.10 05:03, до 08:00; само удаление НЕ запускать)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Путь «подтверждение → удаление → экран после» проверен по коду: двойного запуска нет, при ошибке до точки невозврата
ничего не стёрто и слова человеческие, индикатор только на кнопке, финальный тап делает только человек. Итог фоновой фазы
удаления виден в журнале и в обычной сборке.

## Аудит по коду (components/DeleteAccountConfirmModal.tsx → app/auth_provider.ts beginAccountDeletion)

| Проверка | Итог | Где |
|---|---|---|
| Финальный тап — только человек | да: «Удалить» недоступна, пока не введено слово (deleteConfirmMatches); «Повторить» — кнопка в окне отказа, только до точки невозврата | DeleteAccountConfirmModal 238–247, 213–219 |
| Двойной запуск | нет: deleteInFlightRef + deleting, отбитый тап пишет причину; повторный вызов beginAccountDeletion присоединяется к идущей попытке | 240–247; auth_provider beginAccountDeletion (reserve_failed → joined_active_completion) |
| Повторная авторизация | в пути удаления её нет: удаление идёт серверной задачей (accountDeleteEnqueue), Firebase deleteUser с недавним входом не нужен | — |
| Ошибка сети / отказ | UI ждёт только локальный замок (SecureStore); сеть — фоном. Отказ до замка: «Не удалось подготовить удаление. Аккаунт и данные не изменены…» / «Выход не завершился. Аккаунт под защитой — перезапусти…» / «Удаление не завершилось. Проверь интернет…» — данные не тронуты; после замка оборванный фон дочищает resumePendingAccountDeleteLocalExit на старте | 263–301, 345–369 |
| Спиннер на весь экран | нет: ActivityIndicator внутри кнопки «Удалить» | 556–560 |
| Экран после | онбординг сразу (account_deleted), окна «аккаунт удалён» нет (правило владельца 22.09) | 320–340 |
| Ранние выходы и catch | [ACC-MUT] delete:* без __DEV__ на каждом раннем выходе; catch UI — [ACCOUNT-DELETE-UI] local_delete_threw | auth_provider 4592–4700 |

Пробел: итог фоновой фазы ([ACC-MUT] delete:bg_out / bg_threw) пишется в консоль только под __DEV__ — в обычной сборке успех
не виден вовсе, отказ — только через DebugLogger.

## Scope

app/auth_provider.ts: в фоновой фазе beginAccountDeletion — постоянные строки [AUTH-DELETE] bg_out {ok, reason,
cloudDeleted, tookMs} и bg_threw {code, tookMs}. Поведение не меняется.

## Architecture

Только журнал.

## Security and privacy

Без идентификаторов: коды и миллисекунды.

## Technical debt

Нет новых.

## Verification

tests/account_delete_flow_contract.test.ts, tests/auth_provider_behavior.test.ts, tests/aa_guest_delete_deadline_and_cache.test.ts,
tests/aa_auth_double_tap_contract.test.ts.

## Rollback

Обратный собственный патч.
