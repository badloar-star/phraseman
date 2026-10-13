# Task packet: «Итог недели» — мини-башня новой лиги; сверка палитр нарядов с утверждённым образцом

Governance-ID: TG-348C9BBB0D41
Status: Done
Owner: сессия «3 · Макеты» по поручению координатора (критический путь 16.10)
Related epic/enabler: docs/work/tasks/spire-league-tower-skins-2026-10-13.md (Дизайн)

## Outcome

1. Палитры 12 лиг в modules/spire/tower_skins.ts сверены с утверждённым образцом 8beb5d52d (skins.js → SPIRE_LEAGUE_SPECS): 12 строк × 12 полей, расхождений 0; формула производных цветов совпадает с paletteOf; текстуры перенесены дословно (проверено на marble/obsidian).
2. Мини-макет «Итог недели»: верхушка башни лиги новой недели вместо монеты, монета ранга — значком; 6 вариантов (повышение/остаёшься/понижение, Базальт, Гранит, Алмаз, Мрамор, Обсидиан); рецепт переноса в SPIRE_LEAGUE_TOWERS_SPEC.md.

## Scope

In scope: docs/design/v2-app/spire-leagues.html (новый раздел, режим ?preview=week), docs/design/v2-app/previews/spire-leagues-week-result.jpg, docs/phraseman-2.0/SPIRE_LEAGUE_TOWERS_SPEC.md (раздел «Итог недели»).

Out of scope: код (tower_skins.ts, SpireTowerSvg, SpireWeekResultCard — зона Дизайна).

## Architecture

No architecture change: образец и документация. Мини-башня — тот же SpireTowerSvg с узким viewBox, без сцены.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: мини-башня в коде ещё не сделана — передано Дизайну.

## Verification

Страница без ошибок консоли; превью снято playwright ×2 и проверено глазами; сверка палитр — скриптом по полям.

## Rollback

Откат коммита.
