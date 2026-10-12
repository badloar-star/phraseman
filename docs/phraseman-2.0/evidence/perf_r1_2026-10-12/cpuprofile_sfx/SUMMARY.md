# Замер холодного старта ×3 после Ядра 21d429827 (прогрев звуков по одному) и Дизайна fda1e109b (развод вкладок), 13.10 00:07

Файлы: cold{1,2,3}.log (профиль), cold{1,2,3}.app.log (журнал по фильтру TABS-PREMOUNT|SFX-PREWARM|deferred:(done|sync_heavy)|JS-STALL), cpu_stacks_5-12.txt (scripts/cpu_stacks.py, окно +5…+12 с). Профили: C:/Temp/claude/sfx1..3.cpuprofile (3,9–5,3 МБ, не в git).

| | cold1 | cold2 | cold3 |
|---|---|---|---|
| `[SFX-PREWARM] step` ms | tap_soft 574, tap_primary 363, tap_blocked 211, micro 25, chest_open 16, small 33, streak.saved 131 | 373, 168, 17, 6, 10, 7, 11 | **1502**, 15, 8, 18, 11, 9, 3 |
| шагов ≥300 мс | 2 | 1 | 1 |
| `deferred:sync_heavy` | 0 | 0 | 0 |
| `createAudioPlayer` (лист стека, окно +5…+12 с) | 971 мс | 590 мс | 1551 мс |
| самая длинная JS-STALL | 2727 мс | 2356 мс | 2334 мс |
| стоянок ≥1 с | 3 | 3 | 3 |
| TABS-PREMOUNT step idx1 totalMs (idleWait / commit) | 2951 (1433 / 1226) | 3347 (1958 / 932) | 2834 (1884 / 621) |
| idx2 totalMs | 1071 | 878 | 772 |
| idx3 totalMs | 607 | 572 | 422 |

Вывод: сплошного куска ≥3 с `createAudioPlayer` больше нет (0,6–1,6 с суммарно в окне, шаги отдельные). Но: один шаг ≥300 мс есть в КАЖДОМ прогоне (первый — pm.ui.tap_soft, до 1502 мс в cold3), стоянки ≥1 с (2,3–2,7 с) остаются. В cold1 `v2_audio_seed` taskMs=4839 (syncMs=2). Dev-сборка на эмуляторе, разброс между прогонами большой.
