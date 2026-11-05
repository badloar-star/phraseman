Governance-ID: TG-9949B381A57D

# Припаркованная сирота: «журнал завершения урока» (classic_completion_*)

Решение координатора 06.11 («вариант Б»): владелец эту фичу не заказывал, на доделку нужно 6–9 часов с E2E на эмуляторе, для сборки 150 она рискованна. Всё сохранено здесь, рабочее дерево приведено к HEAD.

## Что это
Долговечный журнал завершения урока классического курса: намерение завершения (intent) и квитанции пишутся на диск до отправки на сервер, исходящая очередь событий (outbox) с повтором, чтение итога урока из журнала (result reader / snapshot), восстановление после падения (recovery при старте), строгое чтение медали (`loadMedalInfoStrict`), владелец сеанса и «область первого показа» экрана урока (`lesson_screen_prime_origin_scope`).

## Что лежит в этой папке
- `classic_completion_journal_tracked.patch` — изменения ТРЁХ видов файлов, которые были изменены относительно HEAD:
  - девять файлов целиком: `app/lesson1.tsx`, `app/lesson_complete.tsx`, `app/lesson_lock_system.ts`, `app/lesson_screen_bootstrap.ts`, `app/medal_utils.ts`, `app/progress_events_client.ts`, тесты `cloud_sync_customization_account_isolation`, `lesson_complete_repeat_navigation`, `lesson_completion_attempt_identity_contract`;
  - из смешанных файлов только блоки журнала (чужие правки в них НЕ парковались): `app/cloud_sync.ts` (две строки ключей `classic_completion_pending_v1:` / `classic_completion_outbox_v1:`), `app/_layout.tsx` (эффект `classic_completion_recovery` при старте).
- `untracked/` — копии 21 нового файла с суффиксом `.untracked` (в репозитории их не было): `app/classic_completion_{journal_engine,outbox,result_reader,result_snapshot,runtime}.ts`, 15 тестов `tests/classic_completion_*.test.ts` и `tests/lesson_screen_origin_scope_race.test.ts`.

## Как вернуть
Из корня репозитория:
```bash
# 1. новые файлы обратно на свои места (в папке они с суффиксом .untracked, чтобы сторожа коммита не разбирали их как код)
cd docs/work/_parked_2_1_1/classic_completion_journal/untracked
find . -type f -name '*.untracked' | while read f; do t="../../../../../${f%.untracked}"; mkdir -p "$(dirname "$t")"; cp "$f" "$t"; done
cd -
# 2. изменения изменённых файлов
git apply docs/work/_parked_2_1_1/classic_completion_journal/classic_completion_journal_tracked.patch
```
Если за это время файлы ушли вперёд и патч не ложится — `git apply --3way` или вручную по блокам патча.

## Что делать перед возвратом в релиз
1. Решение владельца (фича им не заказывалась).
2. Типы и тесты `tests/classic_completion_*` + `lesson_complete_repeat_navigation` + `cloud_sync_customization_account_isolation` зелёные.
3. E2E на эмуляторе: пройти урок, убить приложение посреди завершения, проверить восстановление и однократную отправку события; смена аккаунта посреди завершения; офлайн → онлайн.
4. Флаг выключен по умолчанию (OFF), включение — через Пульт.
5. Серверный контракт: события других языков (кроме en/fr) пока удерживаются в outbox (`progress_transport_target_unavailable`) — решить судьбу es/de/it.

## Состояние на момент парковки
Тесты кластера на рабочем дереве не прогонялись целиком; в полном прогоне 06.11 их красные/зелёные результаты (если были) — в `docs/work/release/RED_TESTS_*.md`.
