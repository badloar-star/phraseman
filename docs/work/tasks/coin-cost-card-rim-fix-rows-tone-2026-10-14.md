# «Стоимость повышения» с кромкой и «Что исправить» с тоном темы

Governance-ID: TG-193CFA43B4BB
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (цикл координатора; DIFF_BURNDOWN: coins-005, results/cards)
Related epic/enabler: diff-burndown-color-triage-2026-10-13.md

## Outcome

Карточки экрана «Повысить ранг» (стоимость, максимум, «не хватает», «проверяем») получают стеклянную кромку `GlassRim` темы (светлая линия сверху, тонкое кольцо, блик); строки «Что исправить» итога тренировки карточек — заливка с тоном темы (`accentSoft` поверх `opaqueCard`) и та же кромка.

## Scope

In scope: `app/coin_rank.tsx` (только вставка `GlassRim` рядом с `V2GlassSheen`), `app/flashcards/CardsSessionResultV2.tsx` (`FixRow`). Out of scope: цены, повышение, церемония; разбор состава экранов.

## Architecture

`GlassRim` уже используется в панели «Мои ошибки» и берёт токены темы (`bevelHi`, `bevelLo`, `hairlineSoft`, `mediaInk`); слой не перехватывает нажатия.

## Security and privacy

Не применимо.

## Technical debt

Без кадра эмулятора совпадение с макетом не подтверждено; Сверка пересмотрит.

## Verification

Синтаксис, контрактные тесты экрана ранга и результата, ратчет цветов.

## Rollback

`git revert` коммита.
