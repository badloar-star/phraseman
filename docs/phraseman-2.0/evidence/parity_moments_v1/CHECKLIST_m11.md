# Лист приёмки — m11 · Кольца = задачи «Сегодня» — закрытие

Эталон: `docs/design/v2-app/engagement-moments-v3-all.html` → момент **m11**, телефон 412×915. Кадры: `docs/phraseman-2.0/evidence/etalon_v3/m11/` (полный набор — `C:/Temp/claude/etalon_v3/m11/`).
Компоненты кода: HomeV2TodayCard · ответственная сессия: **Темы — components/streak/moments**.

Как читать: значения сняты из эталона автоматически (scripts/mockups/acceptance_sheet.cjs). Текст — ru из эталона; ключ и uk — из строковой таблицы кода, если строка там есть («нет в строках кода» = текста нет ни в одной таблице — сверить/добавить). Цвет — токен `liquidGlassTokens` темы (grad_aurora тёмная/светлая, grad_iris светлая); «нет токена #…» = цвет образца без точного токена — сверить с компонентом. Место — x/y/ширина/высота в dp от левого верхнего угла экрана 412×915. «Появляется» — мс от старта момента; «уходит» — мс, когда элемент перестал быть виден (до финала).

> Блок «Сегодня» Главной 1:1 (HomeV2TodayCard) с тремя кольцами — три настоящие задачи дня (урок 1, ступени Пика 3, карточки 10), монета ранга в центре, цвет кольца = цвет отметки строки (токены темы). A: закрывается «Пройти урок» — докрутка с перехлёстом, вспышка, искры, отметка. B: все три — «День выполнен» (без бонусов, D09).

## Вариант A — Закрылось кольцо «Пройти урок»

### Тайм-лист

| t, с | что | звук-событие V2 | хаптик |
|---|---|---|---|
| 0.40 | кольцо докручивается 0,9 с с перехлёстом | `v2/tap` | — |
| 1.05 ★ | вспышка + 10 искр, отметка строки заливается | `v2/ring` | success |

### На экране в финале (15)

| # | элемент | текст ru / ключ / uk | шрифт кегль/строка · вес | цвет: Аврора тёмная | Аврора светлая | Ирис светлая | место, размер, радиус, отступы | появляется, мс |
|---|---|---|---|---|---|---|---|---|
| 1 | текст «Сегодня» | ru «Сегодня» · `today` (streak_moments_strings.ts) · uk «Сьогодні» | 13/17 · 700 · трекинг 1.6 · uppercase | цвет secondary / mutedText | цвет secondary / mutedText | цвет secondary / overline | x38 y388 · 348×17 | 90 |
| 2 | блок .rw | — | — | — | — | — | x132 y419 · 148×148 | 90 |
| 3 | svg-графика | — | — | — | — | — | x132 y419 · 148×148 | 90 |
| 4 | картинка `assets/images/coins/coin_rank_05.webp` | — | — | — | — | — | x177 y464 · 58×58 · радиус 50% | 90 |
| 5 | текст «Пройти урок» | ru «Пройти урок» · `ringLesson` (streak_moments_strings.ts) · uk «Пройти урок» | 16/20 · 700 | цвет text / mediaInk | цвет text | цвет text | x120 y642 · 218×20 | 90 |
| 6 | иконка Ionicons **book-outline** | — | 19/19 · 400 | цвет text / mediaInk | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x81 y643 · 19×19 | 90 |
| 7 | текст «1/1» | «1/1» · число из данных | 13/17 · 700 | цвет text / mediaInk | цвет text | цвет text | x350 y644 · 22×17 | 90 |
| 8 | иконка Ionicons **checkmark** | — | 14/14 · 400 | цвет opaqueSheet / opaqueControl | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x43 y645 · 14×14 | 1133 |
| 9 | текст «Пройти ступени Пика» | ru «Пройти ступени Пика» · `ringSpire` (streak_moments_strings.ts) · uk «Пройти сходинки Піку» | 16/20 · 700 | цвет text / mediaInk | цвет text | цвет text | x120 y710 · 218×20 | 90 |
| 10 | иконка Ionicons **trending-up-outline** | — | 19/19 · 400 | цвет text / mediaInk | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x81 y711 · 19×19 | 90 |
| 11 | текст «1/3» | «1/3» · число из данных | 13/17 · 700 | цвет secondary / mutedText | цвет secondary / mutedText | цвет secondary / overline | x350 y712 · 22×17 | 90 |
| 12 | текст «Повторить карточки» | ru «Повторить карточки» · `ringCards` (streak_moments_strings.ts) · uk «Повторити картки» | 16/20 · 700 | цвет text / mediaInk | цвет text | цвет text | x120 y769 · 210×20 | 90 |
| 13 | иконка Ionicons **copy-outline** | — | 19/19 · 400 | цвет text / mediaInk | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x81 y779 · 19×19 | 90 |
| 14 | текст «2/10» | «2/10» · число из данных | 13/17 · 700 | цвет secondary / mutedText | цвет secondary / mutedText | цвет secondary / overline | x342 y780 · 30×17 | 90 |
| 15 | текст «Не менее 10 слов» | ru «Не менее 10 слов» · `ringCardsSub` (streak_moments_strings.ts) · uk «Не менше 10 слів» | 13/17 · 400 | цвет secondary / mutedText | цвет secondary / mutedText | цвет secondary / overline | x120 y790 · 210×17 | 90 |

## Вариант B — Все три — «День выполнен»

### Тайм-лист

| t, с | что | звук-событие V2 | хаптик |
|---|---|---|---|
| 0.40 | кольцо «Карточки» докручивается | `v2/tap` | — |
| 1.05 | вспышка + искры, отметка | `v2/ring` | success |
| 1.70 ★ | аккорд: монета подпрыгивает, «День выполнен» | `v2/day_done` | heavy |

### На экране в финале (19)

| # | элемент | текст ru / ключ / uk | шрифт кегль/строка · вес | цвет: Аврора тёмная | Аврора светлая | Ирис светлая | место, размер, радиус, отступы | появляется, мс |
|---|---|---|---|---|---|---|---|---|
| 1 | текст «Сегодня» | ru «Сегодня» · `today` (streak_moments_strings.ts) · uk «Сьогодні» | 13/17 · 700 · трекинг 1.6 · uppercase | цвет secondary / mutedText | цвет secondary / mutedText | цвет secondary / overline | x38 y388 · 348×17 | 88 |
| 2 | блок .rw | — | — | — | — | — | x132 y419 · 148×148 | 88 |
| 3 | svg-графика | — | — | — | — | — | x132 y419 · 148×148 | 88 |
| 4 | картинка `assets/images/coins/coin_rank_05.webp` | — | — | — | — | — | x177 y464 · 58×58 · радиус 50% | 88 |
| 5 | текст «День выполнен» | ru «День выполнен» · `dayDone` (streak_moments_strings.ts) · uk «День виконано» | 13/auto · 700 | цвет text / mediaInk · фон нет токена #30313480 | цвет text · фон нет токена #FFFFFF80 | цвет text · фон нет токена #FFFFFF80 | x131 y577 · 150×32 · радиус 16 · отступы 0 12 0 10 · тень | 1765 |
| 6 | иконка Ionicons **checkmark** | — | 16/16 · 700 | цвет accent / accentBright | цвет accentGraphic | цвет accentGraphic | x141 y585 · 16×16 | 1765 |
| 7 | текст «Пройти урок» | ru «Пройти урок» · `ringLesson` (streak_moments_strings.ts) · uk «Пройти урок» | 16/20 · 700 | цвет text / mediaInk | цвет text | цвет text | x120 y642 · 218×20 | 88 |
| 8 | иконка Ionicons **book-outline** | — | 19/19 · 400 | цвет text / mediaInk | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x81 y643 · 19×19 | 88 |
| 9 | текст «1/1» | «1/1» · число из данных | 13/17 · 700 | цвет text / mediaInk | цвет text | цвет text | x350 y644 · 22×17 | 88 |
| 10 | иконка Ionicons **checkmark** | — | 14/14 · 400 | цвет opaqueSheet / opaqueControl | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x43 y645 · 14×14 | 88 |
| 11 | текст «Пройти ступени Пика» | ru «Пройти ступени Пика» · `ringSpire` (streak_moments_strings.ts) · uk «Пройти сходинки Піку» | 16/20 · 700 | цвет text / mediaInk | цвет text | цвет text | x120 y710 · 218×20 | 88 |
| 12 | иконка Ionicons **trending-up-outline** | — | 19/19 · 400 | цвет text / mediaInk | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x81 y711 · 19×19 | 88 |
| 13 | текст «3/3» | «3/3» · число из данных | 13/17 · 700 | цвет text / mediaInk | цвет text | цвет text | x350 y712 · 22×17 | 88 |
| 14 | иконка Ionicons **checkmark** | — | 14/14 · 400 | цвет opaqueSheet / opaqueControl | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x43 y713 · 14×14 | 88 |
| 15 | текст «Повторить карточки» | ru «Повторить карточки» · `ringCards` (streak_moments_strings.ts) · uk «Повторити картки» | 16/20 · 700 | цвет text / mediaInk | цвет text | цвет text | x120 y769 · 201×20 | 88 |
| 16 | иконка Ionicons **copy-outline** | — | 19/19 · 400 | цвет text / mediaInk | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x81 y779 · 19×19 | 88 |
| 17 | текст «10/10» | «10/10» · число из данных | 13/17 · 700 | цвет text / mediaInk | цвет text | цвет text | x333 y780 · 39×17 | 88 |
| 18 | иконка Ionicons **checkmark** | — | 14/14 · 400 | цвет opaqueSheet / opaqueControl | цвет opaqueCard / opaqueSheet | цвет opaqueCard / opaqueSheet | x43 y781 · 14×14 | 1132 |
| 19 | текст «Не менее 10 слов» | ru «Не менее 10 слов» · `ringCardsSub` (streak_moments_strings.ts) · uk «Не менше 10 слів» | 13/17 · 400 | цвет secondary / mutedText | цвет secondary / mutedText | цвет secondary / overline | x120 y790 · 201×17 | 88 |
