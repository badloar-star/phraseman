# Task packet: башня Пика монтируется следующим кадром, а не в кадре появления экрана

Governance-ID: TG-306CC945F402
Governance-ID: TG-37A115F561A4
Governance-ID: TG-F7F5A7E997F4
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: разбор JS-стопа на «Пике» (улика Сайта js_stall_peak_2026-10-29.log), решение координатора 29.10

## Outcome

Кадр, в котором появляется башня Пика (объявление «peak», «Итог недели», тур, истории Пика), больше не несёт на себе монтаж ~500 узлов react-native-svg: сначала рисуется пустая рамка ТОГО ЖЕ размера, башня встаёт следующим кадром (паттерн `towerReady` из `SpireFloorMoment`). Вид и раскладка не меняются. Критерий для Сайта после пересборки: сборок мусора в первом тике кадра peak ≤ 40 (сейчас 61). Замер на релизной сборке делает Ядро.

## Scope

In scope: новый `components/spire/use_spire_tower_ready.ts` и `SpireTowerDeferred.tsx`, экспорт высоты `spireTowerSvgHeight` из `SpireTowerSvg.tsx`; подключение в `SpireWeekResultCard.tsx`, `SpireTour.tsx`, `stories/templates/frames_progress.tsx`; тест `tests/spire_tower_deferred_mount_2026_10_29.test.ts`. Для файлов, грязных у Codex (`stories/announcements_v2/frames_sections_a.tsx`, `stories/StorySlides.tsx`), — патч `docs/work/handover/spire-tower-deferred-mount-2026-10-29.patch`.

Out of scope: склейка швов и сокращение узлов башни (п.2 — только после замера на релизе и под гейтом паритета); `MomentPromotion` (башня акта 3 уже собирается заранее невидимой через prep3, повторная отсрочка ничего не даёт); `SpireFloorMoment` (паттерн там уже есть); экран Пика (`SpireTower`) — башня там часть самого экрана.

## Architecture

Нет архитектурных изменений: один хук-флаг «прошло два кадра» и тонкая обёртка над существующим `SpireTowerSvg`. Пока флаг не взведён, обёртка отдаёт `View` с шириной и высотой, равными высоте `Svg` (одна функция `spireTowerSvgHeight` считает обе стороны), поэтому раскладка не сдвигается. В тестовой среде без `requestAnimationFrame` кадр заменяет таймер 16 мс (как в `SpireFloorMoment`). Размонтирование отменяет оба кадра.

## Security and privacy

Данные не собираются и не передаются, сети и хранилища нет. Политика конфиденциальности не затрагивается.

## Technical debt

Pay now: единая обёртка вместо копипасты `towerReady` в каждом месте. Contain: тест фиксирует, что все места монтажа башни идут через обёртку. Accept temporarily: `SpireFloorMoment` оставляет собственную копию паттерна (уже закреплена тестом `moments_perf_first_frame_2026_10_26`); перевод на общую обёртку — по желанию Моментов. Патч для файлов Codex живёт до его применения владельцем файла.

## Verification

Точечные тесты под светофором: новый тест, `spire_tower_no_clip_contract`, `spire_static_tower_uncropped`, `spire_week_card_once`, `spire_tour_art_memory_clear`, `moments_perf_first_frame_2026_10_26`; типы по затронутым файлам. Лог `[SPIRE-TOWER-DEFER]` пишет, через сколько мс после монтажа рамки встала башня. Склейка «макет | эмулятор» для затронутых экранов — у Сверки (вид не должен отличаться). Проверка доступности: пустая рамка без касаний и без подписи, башня после монтажа — как раньше.

## Rollback

Вернуть прежний вызов `SpireTowerSvg` в трёх файлах (или откатить коммит); данных и прав доступа это не затрагивает.
