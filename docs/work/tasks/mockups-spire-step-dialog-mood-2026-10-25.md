# Task packet: образцы по сверке Дизайна — шапка ступени Пика без энергии; диалог с настроением собеседника

Governance-ID: TG-A9962EE45087
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 25.10, по вердиктам 49c24a872)

## Outcome

1) spire-gaps-states.html, stepHead: убрать «⚡ 2» — шапка ступени только с сердцами (вердикт Макетов 18.10 c0cd6e2ae, код 31d078d01).
2) energy-modes-states.html, телефон диалога (energy-modes-013): под заголовком — настроение собеседника («Доволен» со значком), как
живая функция кода; «Или зажми и говори» — 13 по шкале D145. Образцы устарели, код верный.

## Scope

In scope: docs/design/v2-app/spire-gaps-states.html, docs/design/v2-app/energy-modes-states.html, этот пакет. Out of scope: код,
реестр (кадры заново после правок Дизайна по energy-modes-014 и paywalls-020/021).

## Architecture

No architecture change. Правка шаблонов образцов; число и порядок телефонов не меняются (по номерам снимает Сверка).

## Security and privacy

Макеты, данных нет.

## Technical debt

- None known.

## Verification

Обе страницы без ошибок; число телефонов прежнее; в шапке ступени нет энергии; в диалоге под заголовком настроение, подсказка 13 px.

## Rollback

Вернуть две страницы из git.
