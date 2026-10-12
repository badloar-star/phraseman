# Task packet: робот — составная склейка «образец | приложение», состояния из привязки реестра, зависания «DEV-STATE…»

Governance-ID: TG-969ED122B887
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: scripts/parity_batch_shoot.mjs, scripts/parity_shot.mjs, scripts/dev_links_r1_generate.py, app/dev_state_fixtures.ts

## Outcome

1. Робот кладёт в evidence/parity/<id>.png составную склейку «образец макета | кадр приложения» (как parity_shot Сверки); голый скриншот — в _runs. Реестр робот не пишет.
2. Генератор DEV_LINKS сверяет ожидаемое состояние со ссылкой реестра (mockup+phone), а не по названию; список несовпадений «да»-строк — координатору, ссылки и шаги поправлены.
3. Зависание экрана «DEV-STATE…» на cards-002/008/009/013 (40 с без «replace вызван»): трассировка и потолок на каждый шаг фикстуры.

## Scope

In scope: `scripts/parity_batch_shoot.mjs` (+ общий модуль склейки), генератор и данные ссылок, шаг-трассировка в `app/dev_state_fixtures.ts`, тесты.
Out of scope: запись в реестр (evidence_at/sha ставят Макеты), правки экранов.

## Architecture

No architecture change: склейка использует тот же сервер макетов/playwright, что parity_shot; потолок шага — защита dev-фикстур (в стор-сборке не работают).

## Security and privacy

Только локальный эмулятор/макеты; данные пользователей не затрагиваются; карточные фикстуры по-прежнему только на госте.

## Technical debt

Pay now: голые кадры Макеты сверять не могут, зависшие шаги съедают круги сверки.

## Verification

Тесты на подставных данных (склейка, привязка состояния), срез типов, существующие тесты фикстур и робота.

## Rollback

Откат коммитов.
