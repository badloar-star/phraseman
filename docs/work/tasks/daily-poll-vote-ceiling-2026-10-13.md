# Task packet: голос в опросе дня — потолок 10 с, откат и журнал [POLL-VOTE] (координатор 13.10 ~13:30)

Governance-ID: TG-38D409390C4A
Status: Done — тесты 2 + карточка 10 зелёные
Owner: 5 · АВТОРИЗАЦИЯ (координатор: «потолок для dailyPollVote делай сам»; файл Ядра — только свои хунки)

## Outcome

`submitDailyPollVote` (`app/daily_poll/daily_poll_client.ts`) ждёт callable `dailyPollVote` не дольше **10 с**. По потолку возвращается `reason: 'offline'` → карточка (`components/friends/DailyPollCard.tsx`, без правок) откатывает выбор, разблокирует строки и показывает готовый текст на 9 языках «Нет связи — голос не отправлен. Попробуй ещё раз.».

Журнал `[POLL-VOTE]`: вход (dateKey, option), каждый ранний выход с причиной, итог (status/reason, мс), срабатывание потолка.

## Scope

In scope:
- `app/daily_poll/daily_poll_client.ts`: `withCallableTimeout(…, 10_000)`, классификация `callable_timeout` → `offline`, журнал;
- тест `tests/daily_poll_vote_ceiling.test.ts`.

Out of scope: UI карточки и тексты (уже на 9 языках), сервер.

## Architecture

Общий помощник `app/callable_timeout.ts` (`CallableTimeoutError`, code `callable_timeout`) — тот же, что у отчётов и промокода. Поздний ответ после потолка игнорируется: промис уже отыгран. Повторный тап идемпотентен на сервере (`already_voted` возвращает серверный выбор — ветка уже есть).

## Security and privacy

Без новых данных.

## Technical debt

- Поздний успешный ответ после потолка не попадает в локальный кэш — голос подтянется при следующей загрузке опроса или при повторном тапе (`already_voted`).

## Verification

- тест: зависший callable → через 10 с `{ok:false, reason:'offline'}`, `voteInFlight` снят; `daily_poll_card_contract` зелёный.

## Rollback

`git revert` коммита.
