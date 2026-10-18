# СВЕРКА 18.10 ~01:50–02:02 — результаты, которые не удалось отправить сообщением (лимит сообщений между сессиями)

## 1. Главная es, шрифт 1,3, светлая тема (после 1f561bbb4) — ✅ для Тем
«Lecciones» в одну строку, «Diálogos»/«Tarjetas» тоже; плашка серии: «0 días» / «Hoy aún no» в 2 строки.
[TILE-LABEL]: lessons «Lecciones» numberOfLines=1 brokenMidWord=false lineWidth 85,3 при boxWidth 102,9; dialogs 73,1/102,5; cards 67,7/102,9; effectiveMultiplier 1,05. Строк text-integrity нет.
Кадр tile_es13/home_es_13_light.png, журнал tile_es13/tile_label.txt.

## 2. «Сегодня» → «назад» ×4 после 304e5170e — для Дизайна
decision «today_tasks → home» 1 мс; arrived home via focus_tick 313/338/338/495 мс. Новые step-строки: home_render 63–283 мс, today_unmount 172–385, home_effects_done 191–402, затем ВТОРОЙ home_render на 224–424 мс (Главная рисуется дважды за возврат: n 18→19, 23→24…). HOME-CHILD-COST: header 8,9–18,2 мс, bell 9,5–17,6 мс; continue_card/feature_tiles/video_rail/today_card строк нет. HOME-FOCUS-COST renderToEffects 51–168 мс, ownEffects 0–21. 4-й возврат медленнее (interactions-free 242 мс против 26–54).
Журнал design3/back_x4_304e5170e.txt, кадры design3/today_open1.png, today_back4.png.

## 3. [MEM] 10 кругов — для Ядра/координатора
Native Heap 924→997 МБ (+73), пила, провал −74 на круге 7, плато нет. AUDIO-PLAYERS live=8 released=0 стабильно. Подробно mem_screens_README.md, mem_tabs10*.txt.

## 4. Прочее
- Сброс хранилища (онбординг после холодного старта в 01:51) — не мой, кто-то чистил данные; принимать условия/возраст в онбординге я не стала, поставила состояние ссылкой dev_state.
- Красный экран 01:49 «useMemHomeRegisterSources doesn't exist» в VideoThumb пропал после перезапуска (модуль app/mem_home_probe.ts был в момент записи).
- Не сделано: шторка play в светлой теме, «Все уроки» ru/uk [ALL-LESSONS], d30.
