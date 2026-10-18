# Пустые Настройки при холодном старте, тёмная (трасса 5bb9024a6) — 18.10 09:28
Холодный старт (force-stop), тап «Настройки» сразу после строки [TABS-PREMOUNT] start (home_painted), кадры 0,5 / 2 / 6 с после тапа (фактически 1,3 / 2,6 / 6,6 с по часам скрипта).
- 0,5 с и 2 с: пустой тёмный экран — видны только тёмный фон, градиент в строке статуса и панель вкладок. Ни заголовка, ни скелета (🔴 пустота ≥2 с).
- 6 с: экран Настроек целиком.
Журнал (cold_dark_log.txt), время тапа = activate 24.223:
 TABS-DEFERRED placeholder start 24.133 → end 24.818 (heldMs=679);
 settings:first_render +722 мс; header_layout +2035 мс; first_focus +2505 мс (sinceRender 1814, sinceCommit 327).
 Затем TABS-PREMOUNT step idx=1 mounted 28.8 (maxLagMs 1169) — предзагрузка соседних вкладок идёт ПОСЛЕ тапа и конкурирует за JS-поток.
Вывод: от тапа до видимого заголовка ≥2 с; плейсхолдер (679 мс) пустой, без скелета. На эмуляторе (старая нативная сборка).
Попутно: [THEME-BOOT] hydrate storedTheme=null → decision=new_user/follow_system_marker; первый кадр theme=graphite (#101214), через ~1,3 с marine (#000F16) — смена темы на холодном старте (гейт splash-hold: fontsReady=false до 4,5 с).
first_try_tap_on_splash/ — первая попытка, тап пришёлся на заставку (недействительна).
