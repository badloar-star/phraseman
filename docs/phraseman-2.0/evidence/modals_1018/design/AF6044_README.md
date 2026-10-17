# Заходы для af6044a1f (18.10 00:46–00:50, холодный старт приложения)
(2) «Сегодня» → «назад» ×4: все 4 возврата на Главную ✅ (af2_today_after.png). Журнал af2_today_journal.txt: `[HOME-FOCUS-COST]` теперь пишется (12 строк, напр. n=14 renderToEffectsMs=107 ownEffectsMs=10; n=15 142/7; n=16 76/5). `[BACK-BTN]` на «Сегодня»: только `tap seq 1–4 screen=today_tasks handler=BackButton`, БЕЗ decision/arrived (в отличие от «Все уроки»).
(3) «Все уроки» → «назад» ×2: `tap → decision «all_lessons → map» (2–3 мс) → arrived arrivedAt=v2_map via=all_lessons_closed ms=418 / 509` ✅ (af3_all_lessons_journal.txt, af3_after.png). Теперь метка есть.
(1) [SCROLL-RESTORE]: см. следующую запись.

(1) [SCROLL-RESTORE] (00:50): язык интерфейса ru → es (через /settings_language), затем Настройки → Главная → Настройки → Главная. ВОСПРОИЗВЕДЕНО «открылось прокрученным вниз»: кадры sr_2_settings (Настройки без заголовка «Ajustes», верх обрезан), sr_3_home (Главная: шапка «0 дней / Монеты» прижата к верху, карточка урока обрезана), sr_4_settings2, sr_5_home2 (Главная прокручена сильнее: ряд плиток у самого верха, карточка «Урок 1» срезана).
Журнал scroll_restore.txt (9 строк):
- home `lang_change y=0 contentH=945 setBy=none_no_scrollTo_on_home` → через 430 мс `content_height before=945 after=975 y=81` (контент вырос на 30 px, y стал 81) — Главная сама оказалась на 81 px вниз без scrollTo: после смены языка высота растёт и позиция не удерживается наверху.
- home `focus focusTick=0/1 y=0 contentH=975 setBy=none_no_scrollTo_on_home` — на Главной восстановления нет вообще.
- settings `tab_visible y=0 savedY=0 setBy=restore_scrollTo` (первый вход), затем `y=598 savedY=598 focusTick=1` — Настройки восстанавливают сохранённые 598 px, хотя пользователь заходит «заново» (сохранённая позиция пережила смену языка, где контент меняется 1798→1827).
Вывод для Дизайна: (а) Главная после lang_change «уезжает» на ~81 px — высота контента меняется при смене языка (945→975) и верхний отступ не фиксируется; (б) restore_scrollTo на Настройках применяет старый savedY после смены языка — после lang_change позицию надо сбрасывать в 0.
