# Task packet: R131 — журнал [AUTH-LOGOUT] по каждому шагу выхода + проверка Optimistic UI выхода и смены

Governance-ID: TG-0E53A4799374
Status: В работе (координатор 18.10 04:52)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Одним поиском `[AUTH-LOGOUT]` видно: тап «Выйти», каждый шаг сохранения/копии/стирания с длительностью шага и от начала,
последний пройденный шаг при раннем выходе (с причиной), итог и что увидел человек.

## Состояние на 04:52

- Пропуск записи документа при полном совпадении со снимком того же владельца — уже сделан (077deccd0, лог [SIGNOUT-SPEED]).
- Optimistic UI выхода (экран «Аккаунт»): «Сохраняем прогресс…» на кнопке сразу (723613818), второй тап невозможен
  (строка без действия + logoutStartedRef), «назад» и прочие кнопки на время выхода отбиты; отказ — окно «Не удалось выйти»
  человеческими словами; при сбое синхронизации данные не стёрты (отказ до маркера).
- Смена аккаунта (Настройки, из окна входа): двойной тап — switchStageRef; сбой сети — окно «Прогресс не сохранён»
  («Остаться здесь» / «Сменить без сохранения»), данные целы. Но на время смены окно подтверждения заменяется карточкой
  «Аккаунт / Не закрывай приложение» поверх всего экрана без индикатора хода — по макету accounts-gaps-states; менять вид
  без нового макета нельзя → вопрос координатору/Дизайну.

## Scope

- app/auth_provider.ts: signoutStage — + [AUTH-LOGOUT] {stage, stepMs, sinceStartMs}; последний шаг запоминается; итог
  signOutAndWipeForAccountSwitch — [AUTH-LOGOUT] exit {ok, reason, detail, lastStage, tookMs} (покрывает каждый ранний
  выход: причина + на каком шаге).
- components/account/AccountLogoutFlow.tsx: [AUTH-LOGOUT] tap / attempt_1 / attempt_2_forced (ms) / user_sees.
- Перестановку анонимного входа и журналов не трогаю (после релиза).

## Architecture

Только журнал; поведение не меняется.

## Security and privacy

Без идентификаторов: названия шагов, коды причин, миллисекунды.

## Technical debt

Карточка смены аккаунта на весь экран — до решения по макету.

## Verification

tests/account_modals_liquid_glass_source_contract.test.mjs, tests/auth_provider_behavior.test.ts,
tests/aa_s2c_logout_wipe_trace.test.ts, tests/aa_account_switch_roundtrip_scenario.test.ts; babel-разбор.

## Rollback

Обратный собственный патч.
