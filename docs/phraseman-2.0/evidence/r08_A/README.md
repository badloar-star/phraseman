# R08 на emulator-5554 (Pixel_8, аккаунт №2) — 15.10 17:20, бандл с 97572a3e4 и 703287796

Холодный старт → «Обучение» → искра «Новые уроки» (925,368), тап в 17:20:56.

| файл | что |
|---|---|
| 00_lessons_before.png / 01_after_tap_0s.png / 02_after_3s.png | список A1 и таббар до тапа, сразу после и через 3 с — экран не меняется (искра лишь подсвечена) |
| win.txt | `dumpsys window windows`: окно app.phraseman **одно** (`Window{17f2a0 … MainActivity}`) — второго окна поверх нет |
| top.txt | `dumpsys activity top`: `learning-v2-chapters-course` — 0 вхождений |
| dump_3s.xml | uiautomator через 3 с: `legacy-lessons-catalog`, узлов карты V2 нет |
| logcat_full.txt | полный logcat без фильтров, −2…+5 с вокруг тапа (426 строк) |
| logcat_excerpt.txt | ReactNative / Fabric / SurfaceMounting + все E/ и W/ в окне −2…+5 с (113 строк) |

Выжимка:
- 17:20:56.549 `chapters:mount` → .552 `chapters:rows rows=2048 active=true` → .560 `page:commit page=v2 branch=v2_map visible=true navFocused=true`.
- 17:20:57.150 `scrollToCurrent:skip reason=no_current_row rows=0`.
- **Нет** `chapters:layout`, **нет** `[V2-MAP] tabbar hidden` в окне +5 с.
- FabricUIManager / SurfaceMountingManager — 0 строк во всём файле (тег не пишется в этой сборке).
- Ошибок E/ в момент тапа нет. За 1–2 с ДО тапа дважды: `E/ReactNativeJS Invalid prop overScrollMode supplied to React.Fragment` (вероятно components/BouncyScrollView.tsx:256 — cloneElement с overScrollMode на ребёнка-Fragment) и `[JS-STALL]` 812 мс / 257 мс — поток JS был занят в момент перед тапом.

Вывод: то же, что на B — React коммитит страницу v2, но нативное дерево карту не получает; второго окна, которое могло бы её перекрыть, нет.
