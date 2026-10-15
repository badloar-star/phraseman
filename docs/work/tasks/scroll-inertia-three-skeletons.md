# Task packet: явная скорость прокрутки у трёх ничьих ScrollView (scroll_inertia_contract)

Governance-ID: TG-79E895114726
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручение координатора 15.10 (после полного прогона на HEAD 32f96a169)

## Outcome

`scroll_inertia_contract` зелёный: у обычных вертикальных ScrollView в `CommunityPackPreviewSkeleton`, `year_activity`, `LessonMenuGateSkeleton` стоит `decelerationRate="fast"`, как у остальных экранов.

## Scope

In scope: по одной строке в `app/flashcards/CommunityPackPreviewSkeleton.tsx`, `app/year_activity.tsx`, `components/lessons/LessonMenuGateSkeleton.tsx`.

Out of scope: чужие красные тесты, базовые линии.

## Architecture

No architecture change: тот же пропс, что у соседних ScrollView.

## Security and privacy

Только поведение прокрутки; данные не затрагиваются.

## Technical debt

Pay now: три места без явной скорости.

## Verification

`npm run test:one -- tests/scroll_inertia_contract.test.ts` по слоту, строго «N passed».

## Rollback

git revert коммита.
