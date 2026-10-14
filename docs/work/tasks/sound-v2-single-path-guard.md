# Task packet: сторож «одно событие V2 — один путь» и перепроверка зелёных прогонов

Governance-ID: TG-3FD128BCBD9A
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручения координатора 14.10 — двойной звук в StoryViewer (Дизайн нашёл), дыра ворот «Tests: 0 total считался зелёным» (Ядро)

## Outcome

В одном файле одно событие звуков V2 вызывается одним путём (мост `tryPlayV2Event` либо прямой `playEvent`), сторож это проверяет по всему приложению. Звуки Пика в `use_spire_game` молчат, когда включены моменты v3 (их компоненты играют те же события). Отчёты «N зелёных» по моей зоне перепроверены строго: «N passed» при N > 0 и без «failed to run».

## Scope

In scope: `tests/sound_v2_single_path_guard.test.ts`, `app/spire/use_spire_game.ts` (условие по флагу), список импортёров в `tests/streak_moments_v3_contract.test.tsx` (добавлены `app/lesson1.tsx` и `app/spire/use_spire_game.ts`).

Out of scope: правка чужих файлов (StoryViewer, моменты Пика) — владельцам одной строкой.

## Architecture

Сторож читает исходники по четырём каталогам. Известные расхождения — явный список с причиной, который может только сокращаться.

## Security and privacy

Только звук и тесты; данные не затрагиваются.

## Technical debt

Contain: `StoryViewer` двоит `story`, пока Дизайн не уберёт свою строку; он записан в список известных расхождений.

## Verification

Строгий перепрогон тестов зоны: 18 файлов, смотрю строки `PASS`/`FAIL`, `failed to run`, `Tests:` с числом больше нуля.

## Rollback

git revert коммита.
