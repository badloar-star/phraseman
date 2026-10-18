# Task packet: курсор повтора завершений Learning V2 — служебный след, не прогресс гостя (сценарий №1)

Governance-ID: TG-5A7CCA394CAE
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Свежий гость (0 монет, 0 уроков) входит в существующий Google-аккаунт без окна «Телефон уже связан с другим аккаунтом».
Курсор планировщика завершений Learning V2 (`v2:required-session-completion-scheduler:v1:<scope>`) классифицируется
как служебный след; сами завершения (spool/коммиты) остаются прогрессом.

## Scope

- app/guest_clean_classifier.ts: правило для префикса курсора повтора.
- tests/guest_clean_handoff_matrix.test.ts: свежий гость + курсор = чист; префикс совпадает с экспортом модуля курсора.

## Architecture

Факт (эмулятор 18.10 10:34, logcat): первая проверка `clean_by_defaults progress=0`, через 2,5 с проверка под замком
`progress=1` — единственный новый ключ `v2:required-session-completion-scheduler:v1:<id>` формы {reason:'attempt_reserved'
(str16), failureOrdinal:0, nextAttemptAtMs, revision, cursorFingerprint} — планировщик (deferred install на старте)
резервирует попытку даже без отложенных завершений. Итог: account_switch_required у свежего гостя. Курсор — только
расписание попыток; данных урока в нём нет (их хранят spool-ключи, которые классифицируются как прогресс по умолчанию).
Префикс держим строкой в классификаторе (лёгкий модуль, без тяжёлых импортов), равенство с экспортом
LEARNING_V2_COMPLETION_RETRY_CURSOR_PREFIX сторожит тест.

## Security and privacy

Новых данных нет. Курсор стирается вместе с аккаунтом как и раньше (опись cloud_sync).

## Technical debt

Гонка «проверка до замка / под замком» остаётся — правильно: под замком решает факт. Чинится только ложный «прогресс».

## Verification

Точечные тесты матрицы и local_account_data через светофор; повтор сценария №1 на эмуляторе.

## Rollback

`git revert <hash>`.
