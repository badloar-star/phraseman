# Task packet: Шпиль — точная строка «Ступень не засчиталась» при откате ступени

Governance-ID: TG-78689D889761
Status: In progress
Owner: Ядро (сессия 1)
Related: Дизайн 497a2535d (откат ступени Шпиля при rejected), координатор 13.10

## Outcome

Сервер не засчитал ступень → маркер откатился. Сейчас под откатом общая строка saveFailed («не сохранилась»). Нужна точная:
«Ступень не засчиталась. Пройди её ещё раз» на 9 языках интерфейса.

## Scope

In scope: ключ `stepNotCounted` в `components/spire/spire_game_strings.ts`; одна строка в `components/spire/SpireHomeScreen.tsx`
(saveFailed → stepNotCounted, свой хунк). Out of scope: логика отката (Дизайн).

## Architecture

No architecture change.

## Security and privacy

Не касается данных.

## Verification

tests/spire_strings_completeness.test.ts, tests/spire_game_source_contract.test.mjs.

## Rollback

Откат коммита.
