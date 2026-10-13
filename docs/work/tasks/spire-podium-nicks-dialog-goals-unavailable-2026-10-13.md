# Task packet: Пик — подиум: длинные имена и dev-превью nicks=long; диалоги — «—» вместо скелета целей при «недоступен» (13.10)

Governance-ID: TG-AFAF3FAD6E26
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручениям координатора (находки Макетов и Сверки)

## Outcome

1. Подиум Пика: имя до 2 строк, перенос по слогам (Android `hyphenationFrequency="full"`), потолок роста шрифта 1,15 только у имени; без ужатия под ширину. На 360 dp колонка ≈ 99 dp.
2. Для кадров Сверки: `dev_spire_preview?…&nicks=long` ставит на три первых места длинные ники без пробела («мокрый_асфальт», «Александра», «anna.k-2024»).
3. Итог диалога в состоянии «Итог пока недоступен»: ячейка целей показывает «—» вместо мерцающего скелета (выглядел как вечная загрузка); ячейка не скрывается, раскладка не прыгает; журнал на ветке.

## Scope

In scope: `components/spire/SpirePodium.tsx`, `components/spire/spire_preview_fixtures.ts`, `app/dev_spire_preview.tsx`, `app/dialogue_v2_completion.tsx`, сторожа `spire_podium_name_wrap`, `spire_preview_long_nicks`, `dialogue_v2_completion_goals_unavailable`.

Out of scope: сам подсчёт итога и ответы сервера диалога; «Все участники» (правит сессия доступности).

## Architecture

Ники: невидимая точка переноса после `_`, `.`, `-` (`spireNickWrap`) плюс `numberOfLines=2`, `maxFontSizeMultiplier=1.15`, `android_hyphenationFrequency="full"` на тексте имени. Превью: параметр `nicks=long` живёт только в dev-маршруте (в стор-сборке маршрут вырезан сторожем `spire_dev_preview_release_guard`). Диалог: три ветки ячейки целей — цифра, «—» при `unavailable`, скелет только пока идёт загрузка.

## Security and privacy

Данных не касается.

## Technical debt

Remove: мерцающий скелет в состоянии «недоступен».

## Verification

Точечно: `spire_podium_name_wrap`, `spire_nick_wrap`, `spire_preview_long_nicks`, `spire_preview_tier_floor`, `dialogue_v2_completion_*`, `spire_dev_preview_release_guard`, `spire_tab_gate_source_contract` (запрет ужатия шрифта); кадры Сверки.

## Rollback

git revert коммитов.
