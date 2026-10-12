# Task packet: E-1 — склейка записи серверных pushPrefs при быстрых переключениях

Governance-ID: TG-2F354A07279A
Status: In progress
Owner: сессия «1 · Ядро». Координатор 12.10: «E-1 из R1_SETTINGS_OPTIMISTIC_UI: склейка pushPrefs при быстрых переключениях
(push_token_registration.ts) — trailing 1,5 с, одна запись, лог, тест».

## Outcome
- app/push_token_registration.ts: updateServerPushPrefs копит последнее значение и пишет один раз через 1,5 с после последнего
  тапа («последнее побеждает»); записи идут строго по очереди (поздний ответ старой записи не обгоняет новую); кэш-ключ
  проверяется прямо перед записью. Лог [PUSH-PREFS]: склейка (сколько тапов), пропуск по кэшу, запись (мс), каждый ранний
  выход и сбой с причиной (раньше выходы были немыми).
- Интерфейс не ждёт записи (вызов «выстрелил и забыл» из notifications.saveNotifPrefs) — тумблер мгновенный, как и был.

## Scope
In: app/push_token_registration.ts, новый тест. Out: экраны, сервер, правила.

## Architecture
Модульные pending/таймер/цепочка промисов; функция записи вынесена в writeServerPushPrefsNow; flushServerPushPrefsForTests.

## Security and privacy
Те же три булевых флага, что и раньше; новых данных нет.

## Technical debt
Если приложение уйдёт в фон раньше 1,5 с, запись догонит при следующем сохранении настроек (кэш-ключ не совпадёт).

## Verification
tests/push_prefs_coalesce.test.ts: 5 быстрых тапов → 1 запись с последним значением; одинаковое значение → без записи.

## Rollback
`git revert`.
