# Task packet: покрытие съёмки r1, группа (2а) — записи ссылок и шагов; подмены Карточек (2б)

Governance-ID: TG-643227388385
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/R1_PENDING_COVERAGE.md, scripts/dev_links_r1_steps*.py, components/spire/spire_preview_fixtures.ts, app/dev_cards_state.ts

## Outcome

Для строк группы (2а) записаны ссылки и шаги в генераторе (документ перегенерируют Макеты). Для Шпиля добавлены два состояния превью (lose_timeout «время вышло», lose_aborted «ступень прервана»), чтобы spire-gap-012/013 различались. Далее — подмены Карточек (2б): cards=demo_published (уже есть), fail=saved_load|setup_decks|recall_load, fail=card_write|pack_write — только память, только гость, заглушки для стор-сборки, гейт заглушек.

## Scope

In scope: generators/steps, превью Шпиля (два состояния), dev-подмены Карточек.
Out of scope: подмены switch=… (Авторизация), реальные записи в прод, ручные группы (2в).

## Architecture

No architecture change: новые значения существующих dev-параметров.

## Security and privacy

Только dev, только память, в облако ничего не пишется; в стор-сборке вырезано заглушками.

## Technical debt

Pay now: строки без ссылки не снимаются роботом.

## Verification

Контракт ссылок, проверка существования селекторов шагов в исходниках, тест состояний превью, срез типов.

## Rollback

Откат коммитов.
