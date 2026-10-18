# «Сегодня» → «назад» ×4 на a38186563 (R137, Дизайн) — dev (СВЕРКА, 18.10 05:20–05:24; холодный старт, es, светлая, шрифт 1,0; бандл с рабочей копией)
Журнал dev_log.txt, gfxinfo dev_gfxinfo.txt. Режим без JS Dev Mode не снимала (лимит использования). Дерево: на экране Главной другое состояние, чем в back_after3 (серия «1 día», монеты 77, урок 9/50) — данные сидящей установки изменились, на тайминги это не влияет.
## Строки по каждому возврату (мс от тапа «назад»)
| возв. | home_render (n) / home_cause #1 | HOME-ACTIVE-SETTLE deferred | tabs_focus_tick | home_render / home_cause #2 | settled via, waitedMs | arrived | long-frame (atMs) | frames/long/maxMs |
|---|---|---|---|---|---|---|---|---|
| 1 | 82 (30) — [parent_or_unlisted] | tickAtFocus 1, focusTick 1, fallbackMs 500 | 243 | 269 (31) — [homeRuntimeActive, focusTick] | focus_tick, 183 | 400 | 1060@1060 | 1/1/1060 |
| 2 | 150 (34) — [parent_or_unlisted] | 2 / 2 / 500 | 308 | 328 (35) — [homeRuntimeActive, focusTick] | focus_tick, 157 | 444 | 891@891 | 1/1/891 |
| 3 | 79 (39) — [parent_or_unlisted] | 3 / 3 / 500 | 236 | 271 (40) — [homeRuntimeActive, focusTick] | focus_tick, 158 | 368 | 438@438 | 1/1/438 |
| 4 | 92 (44) — [parent_or_unlisted] | 4 / 4 / 500 | 262 | 280 (45) — [homeRuntimeActive, focusTick] | focus_tick, 159 | 397 | 461@461 | 1/1/461 |
## Что видно
- via = focus_tick во всех 4 возвратах, fallback ни разу (waitedMs 157–183, внутри ожидаемых 150–220); cancelled_blur не было.
- Главная по-прежнему рисуется ДВАЖДЫ: рендер №1 на 79–150 мс (changed=[parent_or_unlisted] — новая причина, раньше [homeRuntimeActive]) и рендер №2 на 269–328 мс (changed=[homeRuntimeActive, focusTick] — обе причины теперь в одном рендере). То есть активация действительно ждёт tick (homeRuntimeActive и focusTick слились в один рендер), но первый рендер ещё приходит от родителя/неучтённой причины.
- Первый long-frame остался и стал ДЛИННЕЕ: 438–1060 мс (было 366–421), frames=1 на возврат (было 1–3). Так что «первый long-frame ушёл или стал короче» — НЕ выполнилось; на этом прогоне сказались также прогрев после холодного старта (возврат 1: 1060) и 209 «janky» кадров из 779 (26,8 %, p50 31 мс, p90 57, p99 400) — тяжелее прежних 8,2 % / p99 350. gfxinfo-окно содержит прогрев, повтор прогона может дать другое.
- arrived 368–444 мс (было 321–394): +~50 мс.
