# Task packet: тост рубежа — движение ровно из макета; привязка трёх красных к кнопкам №35

Governance-ID: TG-3656640BFD34
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: решение координатора 15.10 («перенос 1:1 с одобренного макета сильнее общего кита»)

## Outcome

`StreakMilestoneToast` входит с движением макета `engagement-moments-v3-all.html` (`emToastIn` 600 мс `cubic-bezier(.3,1.6,.5,1)`), как и `SpireOvertakeToast`; в `config/motion-hybrid-baseline.json` — запись awaiting с причиной. Три красных learning_v2-теста разобраны: сломал ли их коммит №35 или они красные давно.

## Scope

In scope: `components/streak/moments/StreakMilestoneToast.tsx`, `config/motion-hybrid-baseline.json` (одна запись), чтение коммитов 05198c295 и 939f46023.

Out of scope: правка чужих тестов курса без вывода, что их сломал мой коммит.

## Architecture

No architecture change: движение в точности из макета, исключение объяснено в baseline.

## Security and privacy

Только анимация; данные не затрагиваются.

## Technical debt

Contain: исключение с причиной в baseline (движение из одобренного макета).

## Verification

`npm run test:one -- tests/motion_hybrid_contract.test.ts`, `tests/streak_moments_v3_contract.test.tsx` по слоту, строго «N passed».

## Rollback

git revert коммита.
