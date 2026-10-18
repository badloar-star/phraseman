# «Сегодня» → «назад» ×4 «после 3» (0e53851a4: home_cause / tabs_layout_render / tabs_focus_tick) + gfxinfo dev и без JS Dev Mode (СВЕРКА, 18.10 03:18–03:30; эмулятор без GPU-ускорения, es, светлая)
Сырое: dev_log.txt, dev_gfxinfo.txt, nodev_gfxinfo.txt, кадры home.png / devmode_off.png / nodev_home.png / devmode_on_again.png. JS Dev Mode ВОЗВРАЩЁН (включён), приложение перезапущено, dev-журналы вернулись.
## Журнал по каждому возврату (dev), мс от тапа «назад»
| возв. | tabs_layout_render #1 (focusTick) | home_cause #1 changed | tabs_focus_tick | tabs_layout_render #2 | home_cause #2 changed | decision | arrived |
|---|---|---|---|---|---|---|---|
| 1 | 90 мс (/today_tasks, focusTick 1) | 106 — [homeRuntimeActive] | 305 | 315 (focusTick 2) | 323 — [focusTick] | 1 мс | 394 |
| 2 | 70 (focusTick 2) | 82 — [homeRuntimeActive] | 225 | 239 (focusTick 3) | 247 — [focusTick] | 1 | 321 |
| 3 | 68 (focusTick 3) | 87 — [homeRuntimeActive] | 256 | 262 (focusTick 4) | 270 — [focusTick] | 1 | 348 |
| 4 | 127 (focusTick 4) | 145 — [homeRuntimeActive] | 287 | 295 (focusTick 5) | 301 — [focusTick] | 1 | 377 |
Читается так: Главная перерисовывается ДВАЖДЫ за возврат по двум разным причинам: первый рендер (68–127 мс после тапа, ещё при pathname=/today_tasks) — changed=[homeRuntimeActive] (Главная становится активной), второй (247–323 мс, после tabs_focus_tick 225–305) — changed=[focusTick]. Между ними 130–215 мс. Других изменённых полей нет.
## Детектор long-frame / frames (dev)
| возв. | frames | long | maxMs | window мс | long-frame |
|---|---|---|---|---|---|
| 1 | 1 | 1 | 421 | 421 | 421@421 |
| 2 | 3 | 2 | 366 | 473 | 366@366, 79@473 |
| 3 | 2 | 2 | 384 | 499 | 384@384, 115@499 |
| 4 | 1 | 1 | 403 | 403 | 403@403 |
То есть в окне возврата 1–3 кадра, и первый из них 366–421 мс (первый кадр после тапа — длинный).
## gfxinfo: dev против без JS Dev Mode (4 возврата, окно ≈ 20–25 с)
| показатель | dev | не-dev |
|---|---|---|
| Total frames rendered | 698 | 733 |
| Janky frames | 57 (8,17 %) | 42 (5,73 %) |
| 50-й | 28 мс | 26 мс |
| 90-й | 38 мс | 34 мс |
| 95-й | 48 мс | 42 мс |
| 99-й | 350 мс | 300 мс |
| Missed Vsync | 23 | 17 |
| Slow UI thread | 36 | 29 |
В не-dev строк [BACK-BTN] нет (0) — __DEV__=false. Сравнение с предыдущим контрольным замером (back_dev_vs_nodev): dev 9,38 % → 8,17 %, p99 350 → 350; не-dev 5,96 % → 5,73 %, p99 200 → 300 (колебание эмулятора ±100 мс на 99-м; вывод тот же — рывок остаётся и без dev).
