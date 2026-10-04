# Монеты PhraseMan — точное ТЗ для генерации (20 рангов)

Источник правды по рангам: app/coin_rank_table_v1.ts — 20 рангов, 4 металла × 5 чеканок,
цена перехода на ранг N = N × 1000. Имена файлов: assets/images/coins/coin_rank_00.webp … coin_rank_19.webp.
Монета показывается как аватар (круг 32–120 px), на кнопке «Повысить уровень» и в церемонии чеканки (до 280 px).
Один комплект на все темы (металл есть металл), но монета обязана хорошо читаться и на тёмном #0B0B0D,
и на светлом #F4F2EE фоне.

---------------------------------------------------------------------------------------------------
## 0. Общее для ВСЕХ 20 монет (одинаково, без исключений)
ФОРМА И РАКУРС
- Строго АНФАС: монета смотрит прямо в камеру, идеальный круг, без наклона и перспективы.
- Толщина видна чуть-чуть: нижняя кромка ребра 3 % диаметра, как у монеты, лежащей на столе и снятой сверху.
- Холст 1024×1024, прозрачный фон. Диаметр монеты — ровно 920 px, центр в центре холста.
  Тень НЕ рисовать (её даёт приложение), свечение вокруг не рисовать.
РЕЛЬЕФ (чеканка)
- Настоящий металлический рельеф: высокий центр, мягкие скругления, глубина ощутима.
- Центральная эмблема ОДИНАКОВАЯ на всех 20 монетах, один размер, одно место:
  талисман PhraseMan — круглые очки (две линзы-кольца с перемычкой и короткими дужками в стороны) и под ними
  пышные закрученные усы.
  - Ширина эмблемы 54 % диаметра. Очки занимают верхние 45 % эмблемы, усы — нижние 40 %, зазор 15 %.
  - Линзы — выпуклые гладкие «пуговицы» с полированной поверхностью, обод очков приподнят.
  - Усы симметричные, кончики закручены вверх-наружу на 1,5 оборота, волоски не прорисовывать — гладкий объём.
- Поле монеты вокруг эмблемы — матовое, мелкая равномерная фактура (как после пескоструя).
- Эмблема, кант и узоры — полированные, светлее поля.
СВЕТ
- Один мягкий ключевой свет сверху-слева под 45°, слабый заполняющий справа.
- Блики на выпуклых частях узкие и чистые. Без цветных отражений, без окон и студии в отражении,
  без пересвета.
- Самая тёмная часть поля для меди/золота не темнее 30 % яркости, для серебра/платины — не темнее 40 %
  (чтобы на чёрном фоне монета не проваливалась).
ЗАПРЕТ: текст, буквы, цифры, номинал, год, лицо человека, животные, драгоценные камни, цветная эмаль,
  трещины, потёртости «старины», грязь, зелёная патина, неоновое свечение, мультяшность, плоский вектор.

Позитив-префикс (вставлять в начало каждого промпта):
"Ultra-detailed realistic 3D struck metal coin, perfect front view facing camera, perfect circle, thin visible rim edge,
centered on transparent background, diameter fills 90% of square canvas, central emblem of round eyeglasses above a
symmetrical curled handlebar mustache in polished high relief, matte finely sandblasted coin field, polished raised
rim and ornaments, soft key light from top-left 45 degrees, clean narrow highlights, premium mint-quality product render,"
Негатив (к каждому):
"text, letters, numbers, year, face, portrait, animal, gems, colored enamel, scratches, wear, dirt, patina, glow, neon,
perspective tilt, ellipse, shadow, background, cartoon, flat vector, low detail, blurry, cropped"

---------------------------------------------------------------------------------------------------
## 1. Металлы (по 5 монет каждого)
МЕДЬ (ранги 0–4): тёплая красно-оранжевая медь. Поле #9A5A3A → #B86E46, полированные части #E3A57C,
  тени #5E321E. Блеск мягкий, тёплый.
СЕРЕБРО (ранги 5–9): тёплое серое серебро, чуть темнее платины. Поле #8C8A86 → #A7A49F,
  полированные части #DAD7D1, тени #55524E.
ЗОЛОТО (ранги 10–14): насыщенное жёлтое золото, НЕ лимонное и не оранжевое. Поле #B08A2E → #C9A23E,
  полированные части #F0D27A, тени #6E5418.
ПЛАТИНА (ранги 15–19): холодная светлая платина с лёгким голубоватым оттенком. Поле #A9B0B8 → #C3C9D0,
  полированные части #EEF2F6, тени #687079.
Внутри одного металла цвет НЕ меняется — меняется только чеканка (узор).

## 2. Чеканки — 5 ступеней (одинаковая лестница для каждого металла)
Узоры только по кольцу между краем монеты и эмблемой (кольцо шириной 18 % диаметра); эмблема не меняется.
ЧЕКАНКА 1 «Гладкая» — один простой приподнятый кант по краю (ширина 3 % диаметра). Кольцо пустое, матовое.
ЧЕКАНКА 2 «Двойной кант» — внешний кант + второе тонкое приподнятое кольцо на 8 % внутрь от края. Между ними пусто.
ЧЕКАНКА 3 «Лавры» — кант + лавровый венок: две ветви по 9 листьев слева и справа, от низа вверх, не сходятся
  наверху; вверху по центру маленькая выпуклая точка-заклёпка, внизу по центру — такая же.
ЧЕКАНКА 4 «Жемчужный пояс» — кант + кольцо из 48 мелких выпуклых точек-жемчужин по всему кругу;
  сверху и снизу по центру — небольшой симметричный завиток-аканф (растительный орнамент шириной 22 % диаметра).
ЧЕКАНКА 5 «Барокко» — двойной кант + жемчужный пояс + пышный резной орнамент из завитков-аканфов,
  заполняющий всё кольцо: крупные симметричные элементы сверху и снизу, по бокам — сходящиеся завитки,
  у эмблемы — тонкие лучи. Самая богатая, но эмблема по-прежнему главная и не перекрыта.

## 3. Все 20 монет — по одной строке на файл
| файл | ранг | звание | металл | чеканка | промпт-хвост (добавить к префиксу) |
|---|---|---|---|---|---|
| coin_rank_00 | 0 | Стажёр | Медь | 1 | "warm red-orange copper, single plain raised rim, empty smooth ring" |
| coin_rank_01 | 1 | Кадет | Медь | 2 | "warm red-orange copper, outer rim plus second thin raised inner ring" |
| coin_rank_02 | 2 | Скаут | Медь | 3 | "warm red-orange copper, rim plus laurel wreath of two branches nine leaves each, small dot top and bottom" |
| coin_rank_03 | 3 | Агент | Медь | 4 | "warm red-orange copper, rim plus ring of 48 tiny pearl dots, small symmetric acanthus scroll top and bottom" |
| coin_rank_04 | 4 | Спикер | Медь | 5 | "warm red-orange copper, double rim, pearl dot ring, rich symmetric baroque acanthus scrollwork filling the ring" |
| coin_rank_05 | 5 | Лектор | Серебро | 1 | "warm grey silver, single plain raised rim, empty smooth ring" |
| coin_rank_06 | 6 | Эксперт | Серебро | 2 | "warm grey silver, outer rim plus second thin raised inner ring" |
| coin_rank_07 | 7 | Профи | Серебро | 3 | "warm grey silver, rim plus laurel wreath of two branches nine leaves each, small dot top and bottom" |
| coin_rank_08 | 8 | Мастер | Серебро | 4 | "warm grey silver, rim plus ring of 48 tiny pearl dots, small symmetric acanthus scroll top and bottom" |
| coin_rank_09 | 9 | Эрудит | Серебро | 5 | "warm grey silver, double rim, pearl dot ring, rich symmetric baroque acanthus scrollwork filling the ring" |
| coin_rank_10 | 10 | Дипломат | Золото | 1 | "rich yellow gold, single plain raised rim, empty smooth ring" |
| coin_rank_11 | 11 | Консул | Золото | 2 | "rich yellow gold, outer rim plus second thin raised inner ring" |
| coin_rank_12 | 12 | Стратег | Золото | 3 | "rich yellow gold, rim plus laurel wreath of two branches nine leaves each, small dot top and bottom" |
| coin_rank_13 | 13 | Магистр | Золото | 4 | "rich yellow gold, rim plus ring of 48 tiny pearl dots, small symmetric acanthus scroll top and bottom" |
| coin_rank_14 | 14 | Лидер | Золото | 5 | "rich yellow gold, double rim, pearl dot ring, rich symmetric baroque acanthus scrollwork filling the ring" |
| coin_rank_15 | 15 | Элита | Платина | 1 | "cool light platinum with faint blue tint, single plain raised rim, empty smooth ring" |
| coin_rank_16 | 16 | Кумир | Платина | 2 | "cool light platinum with faint blue tint, outer rim plus second thin raised inner ring" |
| coin_rank_17 | 17 | Икона | Платина | 3 | "cool light platinum with faint blue tint, rim plus laurel wreath of two branches nine leaves each, small dot top and bottom" |
| coin_rank_18 | 18 | Легенда | Платина | 4 | "cool light platinum with faint blue tint, rim plus ring of 48 tiny pearl dots, small symmetric acanthus scroll top and bottom" |
| coin_rank_19 | 19 | Титан | Платина | 5 | "cool light platinum with faint blue tint, double rim, pearl dot ring, rich symmetric baroque acanthus scrollwork filling the ring" |

## 4. Как добиться ОДИНАКОВОСТИ (главный риск генерации)
1) Сначала сгенерировать ОДНУ эталонную монету coin_rank_02 (медь, лавры). Утвердить у владельца.
2) Остальные 19 — от неё (image-to-image / тот же seed): менять ТОЛЬКО металл и узор кольца.
   Эмблема, диаметр, толщина ребра, свет и ракурс — пиксель в пиксель как у эталона.
3) Контрольный лист: все 20 монет в сетке 10×2 на #0B0B0D и на #F4F2EE — эмблемы должны совпадать при наложении,
   лестница чеканок читаться слева направо одинаково в каждом металле.

## 5. Технически
WebP с альфой, 1024×1024, качество 88, вес ≤ 140 КБ на монету. Без тени и фона (тень, свечение и анимацию
чеканки даёт приложение). Проверка: в круге 32 px читаются очки и усы; в 280 px видно чеканку без «мыла».

## 6. Опционально (если нужно приложению — спросить координатора)
- coin_currency — значок валюты «Монеты» для счётчика в шапке: монета ранга 10 в анфас, 256×256.
- coin_stack_small / medium / large — горка из 3 / 8 / 20 монет ранга 0 для витрины магазина, ракурс три четверти.
