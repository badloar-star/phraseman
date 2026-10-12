# Task packet: привести строки cards-001/cards-002 к правилу сторожа реестра

Governance-ID: TG-9E3454B16ABA
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

tests/visual_parity_gate.test.mjs зелёный: у cards-002 появляются явные поля evidence (null), у cards-001 уточнён removed_reason (хаб «вариант А» = cards-section №1, а не №4). Сторож не ослабляется. Если снятие cards-001 законно, а падение вызвано порядком проверок в тесте (mockup_pinned раньше removed_by_owner) — это докладывается координатору для Ядра.

## Scope

In scope: registries/visual_parity.json (cards-001, cards-002 по id).

Out of scope: tests/visual_parity_gate.test.mjs и scripts/visual_parity_gate.mjs (их правит Ядро); код приложения.

## Architecture

No architecture change: реестр.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: порядок проверок в сторожевом тесте — вопрос Ядру.

## Verification

node --test tests/visual_parity_gate.test.mjs; число строк реестра прежнее.

## Rollback

Откат коммита.
