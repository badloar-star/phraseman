# Task packet: вход после смены гостя не упирается в собственный замок (прогон Сверки 602a273a5, шаг 4)

Governance-ID: TG-887B5F6C3239
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Шторка гостя «Войти» доходит до входа тем же выбором Google без второго окна и без ошибки: передача входа дожидается
замка перехода и тишины синхронизации (до 8 с), а при обрыве до любых изменений запись передачи снимается и не запирает
следующий вход.

## Scope

- app/auth_provider.ts: PROVIDER_HANDOFF_LOCK_WAIT_MS = 8000 для замка передачи и тишины restore/cloud; журнал
  [AUTH-HANDOFF] lock_acquired/lock_wait_timeout/quiesce_failed; снятие записи в фазе prepared при том же госте.
- tests/auth_provider_behavior.test.ts: сторож «transition-lock deadline» — запись теперь снимается.

## Architecture

Факт (metro_live.log 102451–102637): rule2 switched (20 с) → resume тем же выбором → link conflict → clean → замок перехода
не дался за 1,5 с (provider_handoff_lock_timeout): держали курсор повтора Learning V2 (2,4 с) и withLocalAccountLock (1,1/2,6 с)
только что активированного поколения гостя → запись передачи осталась в фазе prepared («kept») → второе окно Google →
provider_handoff_active → карточка ошибки. Фаза prepared стоит ДО инвалидации поколения и любых изменений — снятие при
неизменном uid безопасно.

## Security and privacy

Без новых данных. Журнал — длительности и флаги.

## Technical debt

Ожидание до 8 с видно человеку как «Входим…»; обычно замок свободен за 1–3 с.

## Verification

Точечные тесты (6 файлов, 216/216) через светофор; повтор шага 4 у Сверки.

## Rollback

`git revert <hash>`.
