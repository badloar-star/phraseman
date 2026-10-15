# Task packet: сторис D192 — включение stories_v1 17.10, проверка старта, dev-подмена для Сверки (+ lv2voice)

Governance-ID: TG-88D9F117497C
Governance-ID: TG-D829358A8E6D
Status: In progress
Owner: Ядро (сессия 1)
Related: решение владельца ~11:00 15.10 через координатора: «сторис D192 (флаг stories_v1) включаем 17.10 вместе с moments_v3».

## Outcome

- В `docs/phraseman-2.0/handoff/SERVER_DEPLOY_2026-10-17.md` есть пункт 9: включить `remote_config/app.bools.stories_v1 = true` рядом с `moments_v3` (п. 6), с проверкой и откатом.
- Доказано тестом: флаг выкл → кольца нет и ничего не пишется; флаг вкл → на старте ноль чтений/записей Firestore (только локальное хранилище).
- Dev-подмена `stories=demo|seen|off` (только `__DEV__`, только память): 4 события (итог недели, серия 30, ранг 6, ачивка «7 дней»).
- Попутно (задача координатора на 11:00): dev `lv2voice=3|1|0|off` — остаток голоса на сегодня в курсе V2.

## Scope

- `modules/story_events/story_events_store.ts` — dev-демо в памяти (`setDevStoriesDemo`).
- `app/dev_state_fixtures.ts` — параметры `stories`, `lv2voice` (только свои ханки через `--patch`).
- `app/voice_daily_allowance.ts` — `setDevVoiceRemaining`.
- Тесты: `tests/story_events_store.test.ts`, `tests/voice_daily_allowance.test.ts`.
- Документ выкладки.

## Architecture

- Демо подменяет список историй в памяти процесса; диск (`story_events_v1:*`) и Firestore не трогаются. `markSeen` в демо гасит кольцо в памяти.
- Включение демо = флаг считается включённым только в dev; в стор-сборке `__DEV__` ложь, подмена отклоняется (`false`).

## Security and privacy

- Новых данных, сервисов и разрешений нет; политика конфиденциальности не затрагивается. Только dev-код, стор-заглушка dev_state_fixtures уже вырезана из стор-сборки.

## Technical debt

- Нет. Dev-ветки помечены `// зачем`.

## Verification

- Точечные тесты через `run_wait.sh` (story_events_store, stories_ring_viewer_contract, voice_daily_allowance), проверка типов затронутых файлов, syncheck.

## Rollback

- Откат коммитов; на прод не влияет (dev-only + документ). Флаг `stories_v1` → `false` выключает кольцо у людей (до 6 ч кэша конфига).
