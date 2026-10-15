# R08 на Pixel_8_B — 15.10 16:38–16:41, гость, dev-сборка с 97572a3e4

| кадр | что |
|---|---|
| 00_lessons_tab.png | вкладка «Обучение»: список A1, таббар, справа от поиска круг «Новые уроки» |
| 01_after_tap_0s.png / 02_after_3s.png | тап «Новые уроки» (925,370): на экране по-прежнему список A1 и таббар — байт-в-байт одинаковые кадры |
| dump.xml | uiautomator сразу после тапа: только `legacy-lessons-*` и `lessons-row-*`, ни одного узла карты V2 |
| 03_after_tab_roundtrip.png | тап «Главная» → тап «Обучение»: открылась Главная и **таббар пропал** |
| 04_home_no_tabbar_3s.png | через 3 с — Главная без таббара, вкладки не нажать |
| 05_tap_lessons_slot.png | тап туда, где был таббар «Обучение» — ничего |
| 06_home_tile_lessons.png | выход только плиткой «Уроки» на Главной: «Обучение» открылось отдельным экраном (presentation=push) со стрелкой «назад» |
| dump_after_roundtrip.xml | после круга: 20 узлов chapter/v2 в дереве, но экран — Главная |
| logs_v2map.txt | все строки [V2-MAP] |

## Выжимка журнала [V2-MAP]

1. 16:38:53 `page:commit page=lessons branch=legacy_list visible=true navFocused=true`.
2. 16:39:19 тап: `chapters:mount`, `chapters:rows rows=2048 active=true`, `page:commit page=v2 branch=v2_map visible=true navFocused=true` — логика в V2.
3. **Нет `chapters:layout` и нет `tabbar hidden=true` сразу после тапа** — карта не разложена нативно, таббар не спрятан; на экране остаётся старый нативный кадр списка.
4. `scrollToCurrent:skip reason=no_current_row rows=0` — в момент прокрутки у списка 0 строк, хотя `chapters:rows` = 2048.
5. 16:39:40 (после тапа «Главная») только теперь: `chapters:layout 411×864`, `page:commit page=v2 runtimeOwnerId=home visible=false`, `tabbar hidden=true` — таббар прячется, когда ушли на Главную, и остаётся спрятанным.
6. 16:40:50 плитка «Уроки»: второй экземпляр `xoav3k page=lessons presentation=push`, а первый `x7xiqd page=v2 visible=true navFocused=false`.

Вывод: решение «показать карту / спрятать таббар» применяется с опозданием на один фокус-цикл — пока вкладка «Обучение» в фокусе, нативный кадр не обновляется; при уходе со вкладки срабатывает отложенное «спрятать таббар», и человек застревает на Главной без таббара.
