# Эталонные кадры моментов v3 — для переноса в приложение

Паритет переноса — только по снимкам: кадр приложения (маршрут dev_moments_preview или эмулятор Сверки) сравнивается с эталоном поэлементно, порог — все элементы совпали.

В репозитории (выборка, webp q85): `<момент>/<тема>_412_[<вариант>_]<точка>.webp` — 412×915; `aurora-dark` и `aurora-light` — точка `final` (конец тайм-листа) и `peak` (главный удар + 0,35 с) у m01, m14, m19, m21 и рубежей d*; `iris-light` — только `final`.

**Полный набор (вне репозитория, ~1100 PNG):** `C:/Temp/claude/etalon_v3/<момент>/<тема>_<ширина>_[<вариант>_]<точка>.png` — темы `aurora-dark`, `aurora-light`, `iris-light`; ширины 360 (360×800) и 412 (412×915); точки `start` (0,5 с), `peak`, `final`. Пересъёмка (один поток): `node scripts/mockups/etalon_shoot.cjs engagement-moments-v3-all.html` и `… stories-avatar.html` (сервер образцов на 127.0.0.1:8765), выборка в репозиторий — `python scripts/mockups/etalon_pack.py`, оглавление — `node scripts/mockups/etalon_index.cjs`.

**Склейка «приложение | эталон» для гейта паритета:** `python scripts/mockups/pgate.py <кадр_приложения.png> C:/Temp/claude/etalon_v3/<момент>/<тема>_412_<точка>.png <выход.png> "<момент> <тема> <точка>"` — обе половины приводятся к одной высоте, слева приложение, справа эталон. Порог — совпал каждый элемент.
Источник: `docs/design/v2-app/engagement-moments-v3-all.html` (одобрен 14.10 с правками) и `stories-avatar.html` (D192). ТЗ: `docs/phraseman-2.0/ETALON_MOMENTS_V3_TRANSFER.md`.

| момент | что | компоненты кода | ответственная сессия | кадров в репозитории |
|---|---|---|---|---|
| [m01](m01/) | Повышение лиги — три акта (варианты A, B) | SpireTowerRender | Дизайн — components/spire/moments | 10 |
| [m02](m02/) | Удержался в лиге | GlassAlertDialog | Дизайн — components/spire/moments | 3 |
| [m03](m03/) | Понижение лиги — мягко | — | Дизайн — components/spire/moments | 3 |
| [m04](m04/) | «Итог недели» — карточка и сторис (варианты A, B) | SpireWeekResultCard, SpireTowerRender | Дизайн — components/spire/moments | 6 |
| [m05](m05/) | Позиция выросла / обогнали / последний шанс (варианты A, B, C) | — | Дизайн — components/spire/moments | 9 |
| [m06](m06/) | Ступень пройдена / не пройдена (варианты A, B) | — | Дизайн — components/spire/moments | 6 |
| [m07](m07/) | Этаж пройден / Вершина (варианты A, B) | SpireTowerRender | Дизайн — components/spire/moments | 6 |
| [m08](m08/) | «Молния» — серия правильных ответов | — | назначит координатор | 3 |
| [m09](m09/) | Идеальный урок — «чекан» | — | назначит координатор | 3 |
| [m10](m10/) | Итог урока — цепная реакция | — | назначит координатор | 3 |
| [m11](m11/) | Кольца = задачи «Сегодня» — закрытие (варианты A, B) | HomeV2TodayCard | Темы — components/streak/moments | 6 |
| [m14](m14/) | Повышение ранга монеты — за монеты (варианты A, B) | GlassAlertDialog | назначит координатор | 10 |
| [m15](m15/) | Выход из урока | KitSheetModal | назначит координатор | 3 |
| [m16](m16/) | Диалог — поток «звонок → брифинг → переписка» (варианты A1, A2) | — | назначит координатор | 6 |
| [m17](m17/) | Первый диалог пройден | dialogue_v2_completion | назначит координатор | 3 |
| [m18](m18/) | Итог диалога | dialogue_v2_completion | назначит координатор | 3 |
| [m19](m19/) | Рубежи серии дней — 7 / 30 / 100 (варианты A, B, C) | StreakFlameFill, LiveStreakFlame | Темы — components/streak/moments | 15 |
| [m20](m20/) | «Серия под угрозой» — тост 21:00 | — | Темы — components/streak/moments | 3 |
| [m21](m21/) | Возвращение после перерыва — ОДОБРЕН владельцем 14.10, заменяет winback-пейвол (D193) (варианты A, B) | — | Авторизация (D193, вместо winback-пейвола) | 10 |
| [m22](m22/) | Энергия закончилась → Plus | — | назначит координатор | 3 |
| [m23](m23/) | Пробный период Plus (варианты A, B) | — | назначит координатор | 6 |
| [d1](d1/) | День 1 — малый | — | Темы — components/streak/moments | 5 |
| [d3](d3/) | День 3 — малый | StreakFlameFill | Темы — components/streak/moments | 5 |
| [d7](d7/) | День 7 — большой | — | Темы — components/streak/moments | 5 |
| [d14](d14/) | День 14 — малый | — | Темы — components/streak/moments | 5 |
| [d30](d30/) | День 30 — большой | — | Темы — components/streak/moments | 5 |
| [d50](d50/) | День 50 — средний | — | Темы — components/streak/moments | 5 |
| [d100](d100/) | День 100 — большой | — | Темы — components/streak/moments | 5 |
| [d150](d150/) | День 150 — малый | — | Темы — components/streak/moments | 5 |
| [d200](d200/) | День 200 — средний | — | Темы — components/streak/moments | 5 |
| [d250](d250/) | День 250 — малый | — | Темы — components/streak/moments | 5 |
| [d300](d300/) | День 300 — средний | — | Темы — components/streak/moments | 5 |
| [d365](d365/) | День 365 — огромный · Год | — | Темы — components/streak/moments | 5 |
| [d400](d400/) | День 400 — средний | — | Темы — components/streak/moments | 5 |
| [d500](d500/) | День 500 — большой · своя сцена | — | Темы — components/streak/moments | 5 |
| [d730](d730/) | День 730 — огромный · Два года | — | Темы — components/streak/moments | 5 |
| [d600](d600/) | День 600 — средний | — | Темы — components/streak/moments | 5 |
| [d800](d800/) | День 800 — средний | — | Темы — components/streak/moments | 5 |
| [d900](d900/) | День 900 — средний | — | Темы — components/streak/moments | 5 |
| [d1000](d1000/) | День 1000 — легенда | — | Темы — components/streak/moments | 5 |
| [s1](s1/) | Главная: красное кольцо вокруг аватара (варианты A, B, C) | HomeV2Header, coin_rank_XX, useStoryEvents | Дизайн — сторис (кольцо + просмотр), события — Ядро (useStoryEvents) | 9 |
| [s2](s2/) | Тап по аватару → все события подряд | KitSheetModal, SpireTowerSvg, LiveStreakFlame, coin_rank_XX | Дизайн — сторис (кольцо + просмотр), события — Ядро (useStoryEvents) | 3 |
| [s3](s3/) | События — по одному кадру (варианты 1, 2, 3, 4) | — | Дизайн — сторис (кольцо + просмотр), события — Ядро (useStoryEvents) | 12 |

Рубежи серии d1…d1000 сняты со страницы v3-all (там все 19 рубежей 1:1 со streak-milestones.html).