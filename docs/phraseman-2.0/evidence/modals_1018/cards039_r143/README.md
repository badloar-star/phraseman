# cards-039 на 99fcd481f (R143) — 🔴 вечный скелетон остался (СВЕРКА, 18.10 05:43–05:45; тёмная, es; бандл с рабочей копией — правка Дизайна R137 этап 2 в дереве, импорт DIAG_ENABLED добавлен, приложение поднялось)
Ссылка: cards=empty&fail=saved_load&…&next=/flashcards_collection?cat=saved. Кадры t3/t8/t14/t22/t32/t52 (все: «Guardadas 0» + скелетон из 4 карточек, без смены), журналы load_log.txt, load_log2.txt.
## Журнал
- 05:43:44.482 [CARDS-LOAD] offline probe online connected=true reachable=true wifi.
- 05:43:44.483 [CARDS-LOAD] branch {"branch":"state","reason":"ошибка загрузки","loading":false,"loadError":true,"deviceOffline":false,"collectionDataReady":true,"listCards":0,…} — ветка уже «state/ошибка загрузки», loading=false.
- 05:43:44.554 load:start cacheSaved… source cache_warm → 05:43:44.631 load:ok 76 ms saved 0.
- 05:43:45.487 [LOAD-GATE:fc-saved] «тихий повтор» attempt 1 status error waitedMs 1000 → load:start → load:ok 10 ms.
- Дальше ТИШИНА: за 52 секунды больше ни одного [LOAD-GATE] (attempt 2/3 нет), ни одной новой branch-строки, экран не меняется.
## Вывод
Ожидаемое (тихий скелетон на время автоповторов, затем «Сейчас недоступно» + «Попробовать снова», вечного скелетона нет) НЕ достигнуто: только один тихий повтор на 1-й секунде, потом экран остаётся в скелетоне навсегда; ошибка не показывается, «Попробовать снова» недоступна (проверять нажатием нечего). Подозрение: после load:ok (saved 0, без ошибки) шлюз считает загрузку успешной, а fail=saved_load подмешивает loadError только на уровне данных; скелет остаётся от шлюза (fc-saved) и ветка state не рисуется.
Время до ошибки: >52 с (не появилась).
