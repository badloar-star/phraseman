# Заходы для af6044a1f (18.10 00:46–00:50, холодный старт приложения)
(2) «Сегодня» → «назад» ×4: все 4 возврата на Главную ✅ (af2_today_after.png). Журнал af2_today_journal.txt: `[HOME-FOCUS-COST]` теперь пишется (12 строк, напр. n=14 renderToEffectsMs=107 ownEffectsMs=10; n=15 142/7; n=16 76/5). `[BACK-BTN]` на «Сегодня»: только `tap seq 1–4 screen=today_tasks handler=BackButton`, БЕЗ decision/arrived (в отличие от «Все уроки»).
(3) «Все уроки» → «назад» ×2: `tap → decision «all_lessons → map» (2–3 мс) → arrived arrivedAt=v2_map via=all_lessons_closed ms=418 / 509` ✅ (af3_all_lessons_journal.txt, af3_after.png). Теперь метка есть.
(1) [SCROLL-RESTORE]: см. следующую запись.
