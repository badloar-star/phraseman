# Запечённые фоны сцены Главной для 6 премиум-тем (долг после 2.0.2)

Governance-ID: TG-855699D36ECF

## Outcome
Координатор 25.10: фоны сцены Главной для премиум-тем — по образцу 23 обычных тем, на токенах темы; сторож home_scene_baked_assets снимает фильтр (5482e1f3c) и снова мерит все 29 тем.

## Scope
In scope: `scripts/gen_scene_assets.mts` (запуск, без правки), новые `assets/images/v2scene/scene_bg_grad_full_*_{dark,light}_{day,eve}.webp` (24 файла), `components/home/v2/scene/home_scene_baked_assets.generated.ts`, `tests/home_scene_baked_assets.test.ts` (снять фильтр).
Out of scope: пигменты Codex, рантайм-чтение таблицы (её в приложении никто не читает).

## Architecture
Тот же генератор и та же математика (scripts/lib/scene_backdrop_math.ts) из homeSceneTokensForTheme; существующие 92 файла должны остаться побайтно прежними.

## Security and privacy
Не касается.

## Technical debt
Нет.

## Verification
home_scene_baked_assets (все 29 тем), `gen_scene_assets.mts --check` чистый, git status — только новые 24 файла + таблица.

## Rollback
Откатить коммит.
