# Task packet: реестр сверки знает статус no_release_surface, пересборка его не стирает

Governance-ID: TG-866C83FAE175
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: гейт «приложение = макет» (91924d5b0, no_release_surface), координатор 05:50

## Outcome

`tests/visual_parity_gate.test.mjs` снова зелёный: строки реестра со статусом `no_release_surface` проверяются
по своим правилам (доказательство + кто проверил), а не падают как «неизвестный статус». `npm run parity:build`
при пересборке реестра сохраняет ручные проставления координатора: статус, `release_surface_proof`,
`removed_reason`, `reviewed_by`, `mockup_pinned`, `blocked_reason`. Отдельно — вердикт по practice-027.

## Scope

In scope: `scripts/visual_parity_build.mjs` (`buildRows` — перенос `release_surface_proof`),
`tests/visual_parity_gate.test.mjs` (ветка статуса + тест сохранения полей при пересборке), INBOX Ядра.

Out of scope: сам реестр (проставления — координатора), код экранов, решение по practice-027 в реестре
(даю вердикт, строку меняет координатор).

## Architecture

No architecture change: сборщик и так переносит ручные поля старой строки; добавляется одно забытое поле.
Инвариант: пересборка никогда не теряет решение, принятое человеком.

## Security and privacy

Нет влияния: инструменты сверки макетов, без данных пользователей.

## Technical debt

Pay now: забытое поле в переносе. Contain: тест сохраняет все ручные поля — новое поле без переноса уронит его.

## Verification

`node --test tests/visual_parity_gate.test.mjs`; новый тест вызывает `buildRows` со старой строкой
`no_release_surface` и проверяет, что статус и все ручные поля пережили пересборку.

## Rollback

`git revert` коммита; реестр не меняется.
