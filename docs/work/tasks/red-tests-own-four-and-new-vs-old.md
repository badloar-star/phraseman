# Task packet: мои 4 красных теста после полного прогона (код, не базовая линия)

Governance-ID: TG-329DCE52097E
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручение координатора 15.10 после полного прогона на HEAD 32f96a169

## Outcome

Четыре красных теста моей зоны зелёные за счёт правки КОДА, а не базовых линий храповиков: акцентная графика рубежа серии через токен `accentGraphic`, гибридный вход у тоста рубежа, явная скорость прокрутки у `FontWeightStrip`, сторож звука Пика обновлён под `playUnlessRecentlyPlayed`, и звук этажа проигрывается ровно один раз.

## Scope

In scope: `components/streak/moments/StreakMilestoneScreen.tsx`, `StreakMilestoneToast.tsx`, `components/dev/FontWeightStrip.tsx`, `tests/sound_v2_single_path_guard.test.ts`; таблица `C:/Temp/claude/work/full/red_table.tsv` (разметка «новое этой ночью / было раньше», вне репозитория).

Out of scope: чужие красные тесты, базовые линии храповиков, V2Button.

## Architecture

No architecture change: токены темы и общий гибридный вход уже существуют, используются как у остальных окон.

## Security and privacy

Только вёрстка, анимация и тест; данные пользователя не затрагиваются.

## Technical debt

Pay now: четыре красных. Базовые линии не трогаем.

## Verification

Точечно `npm run test:one -- tests/<файл>` по слоту, строго «N passed», без «failed to run»: light_accent_graphics_ratchet, motion_hybrid_contract, scroll_inertia_contract, sound_v2_single_path_guard, streak_moments_v3_contract.

## Rollback

git revert соответствующих коммитов.
