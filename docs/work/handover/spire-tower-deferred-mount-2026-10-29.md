# Башня Пика встаёт следующим кадром — передача Codex (29.10)

Governance-ID: TG-306CC945F402
Записка задачи: `docs/work/tasks/spire-tower-deferred-mount-2026-10-29.md`.

## Что и зачем
Монтаж `SpireTowerSvg` (~500 узлов react-native-svg) в том же кадре, что и экран, даёт всплеск сборок мусора (кадр peak объявления: 61 за тик при 35–45 у соседей). Вид не меняется: до башни рисуется пустая рамка ТОГО ЖЕ размера, башня встаёт через два кадра (паттерн `towerReady` окна этажа).

## Уже в основной ветке (моим коммитом)
`components/spire/use_spire_tower_ready.ts`, `components/spire/SpireTowerDeferred.tsx`, экспорт `spireTowerSvgHeight` в `SpireTowerSvg.tsx`, подключено в `SpireTour.tsx` и `SpireWeekResultCard.tsx`, тест `tests/spire_tower_deferred_mount_2026_10_29.test.tsx`.

## Для Codex (файл у него грязный): `docs/work/handover/spire-tower-deferred-mount-2026-10-29.patch`
Кадр «peak» объявления, `components/stories/announcements_v2/frames_sections_a.tsx`: две строки — импорт и вызов `<SpireTowerDeferred source="announcement_peak" ...>` вместо `<SpireTowerSvg ...>`. Применить: `git apply -p1 docs/work/handover/spire-tower-deferred-mount-2026-10-29.patch` (проверено `--check` на рабочем дереве 29.10). Нужна ТОЛЬКО после того, как мой коммит с обёрткой в ветке.

## Что НЕ менял и почему
- `MomentPromotion` — башня акта 3 уже собирается заранее невидимой (prep3), повторная отсрочка ничего не даёт.
- `SpireFloorMoment` — там паттерн уже стоит.
- Тоже можно перевести тем же образом, но это шаблоны историй с гейтом «пиксель в пиксель» и анимацией `TowerReveal` (владелец 28.10), поэтому без решения их хозяина не трогал: `components/stories/templates/frames_progress.tsx:86` (SummitFrame), `components/stories/StorySlides.tsx:79` (грязный у Codex). Замена такая же: `source="story_summit"` / `source="story_league"`. `TowerReveal` стартует в момент монтажа рамки, башня встаёт на ~32 мс позже — на анимации раскрытия снизу вверх 1,5 с это неразличимо, но параллельность со склейкой макета проверяет Сверка.

## Проверка
Критерий для Сайта после пересборки: сборок мусора в первом тике кадра peak ≤ 40 (было 61). Замер на релизной сборке — Ядро. Лог `[SPIRE-TOWER-DEFER] башня разрешена {source, afterMs}`.
