# Task packet: «Аккаунт удалён на другом устройстве» — разбор и логи [ACCOUNT-GONE]

Governance-ID: TG-95DB61088068
Status: Логи сделаны; окно НЕ возвращено — конфликт с правилом владельца, вопрос координатору (17.10 ~22:10)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Удалил аккаунт на телефоне A → телефон B выходит: локальные данные очищены, новая личность, переход на старт
(онбординг). Каждая ветка монитора пишет причину [ACCOUNT-GONE].

## Что уже есть (по коду)

- app/remote_account_deletion_monitor.ts: для вошедшего провайдер-аккаунта один слушатель документа
  `account_deletion_auth_markers/{authUid}` (сервер создаёт его в той же транзакции, что и задачу удаления). Документа нет —
  1 чтение при подключении, дальше 0 (в журнале прогона: «оплачено 0»). Отказ правил → `user.reload()`: user-not-found = удалён.
- app/_layout.tsx: монитор → handleAccountDeletedOnAnotherDevice (auth_provider: стирание + свежая личность) →
  событие account_deleted → онбординг.
- Окно «Аккаунт удалён на другом устройстве» УБРАНО 12.10 по правилу владельца 22.09 «уведомлений об удалении не
  показывать никогда» (память feedback_no_deletion_alerts_ever): флаг снимается с логом
  `[ACC-DELETED-REMOTE] notice_suppressed reason=owner_rule_no_deletion_notices`.

## Scope

- Логи [ACCOUNT-GONE] в remote_account_deletion_monitor.ts: подключение/смена владельца, снимок маркера (есть/нет),
  ошибка слушателя (код), reload (код), запуск/итог/повторы onDeleted, немые catch загрузчиков модулей. Без uid целиком
  (8 знаков).
- Окно — НЕ делаю: противоречит прямому правилу владельца; решение — координатору/владельцу.

## Architecture

Только логи; поведение монитора не меняется.

## Security and privacy

8 знаков uid, коды ошибок.

## Technical debt

Если владелец разрешит окно — вернуть по флагу REMOTE_ACCOUNT_DELETED_NOTICE_KEY (механизм показа сохранён) + тексты на
9 языков через Переводчика.

## Verification

tests/remote_account_deletion_monitor.test.ts + проверка типов файла.

## Rollback

Обратный собственный патч.
