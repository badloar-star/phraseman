# «Сегодня» → «назад» ×4 на 3fc7e4413 (R137 этап 2, Дизайн) — dev (СВЕРКА, 18.10 06:05–06:08; холодный старт, es, светлая, шрифт 1,0; бандл с рабочей копией). Режим без JS Dev Mode не снимала.
Журнал dev_log.txt, gfxinfo dev_gfxinfo.txt. Условия те же, что в back_after3/4.
## По возвратам (мс от тапа «назад»)
| возв. | tabs_cause #1 | home_render #1 / home_cause #1 | HOME-ACTIVE-SETTLE | tabs_focus_tick | tabs_cause #2 | home_render #2 / home_cause #2 | settled via, waitedMs | arrived | long-frame |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 74: none (parent/context) | 81 (n23) / [parent_or_unlisted] | deferred 189 | 204 | 214: focusTick 1→2 | 218 (n24) / [homeRuntimeActive, focusTick] 237 | focus_tick, 129 | ≈2 s по журналу (см. файл) | 645@645, frames 1 |
| 2 | 91: none (parent/context) | 99 (n29) / [parent_or_unlisted] | deferred 234 | 249 | 261: focusTick 2→3 | 267 (n30) / [homeRuntimeActive, focusTick] 271 | focus_tick, 137 | — | 412@412, frames 1 |
| 3 | 130: none (parent/context) | 158 (n35) / [parent_or_unlisted] | deferred 301 | 319 | 327: focusTick 3→4 | 336 (n36) / [homeRuntimeActive, focusTick] 345 | focus_tick, 267 | — | 598@598, frames 1 |
| 4 | 81: none (parent/context) | 91 (n41) / [parent_or_unlisted] | deferred 207 | 219 | см. dev_log | см. dev_log | focus_tick | — | см. dev_log |
## Что видно
- home_host_render: строк в журнале НЕТ (0) — шаг, обещанный в сообщении Дизайна, на этой сборке не печатается; считать рендеры можно по home_render (n растёт на 1 при каждом).
- Главная по-прежнему рисуется ДВАЖДЫ за возврат: рендер #1 (81–158 мс) с причиной [parent_or_unlisted]; tabs_cause #1 = «none (parent/context)» — layout табов рендерится на pathname /today_tasks без изменения входов (родитель/контекст); рендер #2 (218–345) = [homeRuntimeActive, focusTick] после tabs_focus_tick (204–319 мс) и tabs_cause #2 = focusTick N→N+1. Ожидание «home_host_render = 1» НЕ выполнено; render #1 от родителя не исчез.
- via = focus_tick во всех возвратах, fallback ни разу; waitedMs 129–267.
- Long-frame: 412–645 мс, frames=1 на возврат (было 438–1060 в back_after4, 366–421 в back_after3).
- gfxinfo: 689 кадров, janky 63 (9,14 %), p50 27 мс, p90 40, p95 61, p99 400 (back_after4: 26,8 % и 400; back_after3: 8,17 % и 350).
