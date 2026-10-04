# Окна первого входа в раздел — точное ТЗ картинок (14 штук)

Окно (components/FeatureIntroModal.tsx) показывается ОДИН раз при первом входе в раздел:
сверху картинка-сцена, ниже заголовок, 2–3 строки текста и кнопка.
Сейчас вместо картинок значки (126 старых картинок удалены 30.09). Нужны новые сцены.

## 0. Общие правила (всё из ASSETS_V2_PROMPTS.md, §0–§5 — НИКАКОГО СТЕКЛА)
- Настоящие предметы нейтральных цветов (графитовая кожа, тёплый серый камень, бумага цвета слоновой кости,
  матовый картон, матовый тёмный металл); у каждой сцены ОДНА цветная деталь отдельным слоем `.accent`.
- Два комплекта: dark и light; светлый — средние тёплые тона, НЕ белый.
- Холст 1536×1024 (3:2), прозрачный фон. Сцена занимает центральную область 1200×820,
  нижние 12 % холста пустые: там начинается заголовок окна, предмет не должен туда залезать.
- Это СЦЕНА, а не значок: 2–4 предмета, композиция «натюрморт на невидимом столе», общий ракурс три четверти
  сверху 30°, мягкий свет сверху-слева, общая мягкая контактная тень под группой.
- Читаемость в окне шириной 320 px: главный предмет крупный (≥ 45 % ширины сцены), второстепенные меньше.
- Без текста, букв, цифр, логотипов, людей, рук, лиц.
- Имена файлов: assets/images/v2art/{dark,light}/intro_<key>.webp + intro_<key>.accent.webp;
  ключи ниже совпадают с app/feature_intro_registry.ts.

Негатив (к каждой): из ASSETS_V2_PROMPTS.md §3 + "people, hands, faces, crowded scene, busy background, perspective
distortion, fisheye, wide angle".

---------------------------------------------------------------------------------------------------
## 1. cards_hub — «Фразы — в твою коллекцию» (вход в Карточки)
Сцена: в центре — веер из 5 учебных карточек 3:4 (картон основного тона, слоновая кость, тёмный картон чередуются),
раскрыт как игральные карты на 70°; справа от веера — открытая коробка-футляр для карточек, в ней стопка ещё ~10 карточек;
слева спереди — одна карточка лежит отдельно лицом вверх с выпуклым разделителем.
Акцент: загнутый уголок-закладка на центральной карточке веера.
Prompt: "<префикс>, still life scene: a fan of five thick rounded flashcards spread like playing cards in the center,
an open cardboard flashcard box with a stack of cards on the right, one single flashcard lying face up in front left with a raised divider line,
folded bookmark tab on the central card"

## 2. cards_swipe — «Карточки в движении»
Сцена: одна крупная карточка слоновой кости стоит чуть наклонённой и «уезжает» вправо; за ней два её бледных
полупрозрачных следа-копии (альфа 35 % и 15 %), сдвинутые влево — ощущение смахивания; под ней стопка из 4 карточек.
Акцент: маленькая выпуклая стрелка «→» на верхней карточке стопки.
Prompt: "<префикс>, a large ivory flashcard tilted and sliding to the right, two faint ghost copies trailing behind it to the left
suggesting a swipe motion, a neat stack of four cards beneath, small raised arrow pictogram on the top card of the stack"

## 3. legacy_lessons — «Знакомый путь — в новом порядке» (Старые уроки)
Сцена: раскрытая толстая книга (кожаный переплёт, страницы слоновой кости с тонкими выпуклыми строками) лежит в центре;
за ней стоят стоймя 3 закрытые книги разной высоты, как на полке без полки; в раскрытой книге — тканевая закладка.
Акцент: тканевая закладка.
Prompt: "<префикс>, an open thick leather-bound book lying in the center with ivory pages and faint raised text lines,
three closed books standing upright behind it of different heights, a fabric ribbon bookmark in the open book"

## 4. statistics — «Прогресс, который видно»
Сцена: на плоской подставке-плитке из матового камня стоят 5 прямоугольных столбиков разной высоты (растут слева направо,
последний самый высокий); перед подставкой лежит маленький настольный календарь-кубик с галочкой.
Акцент: верхушка самого высокого столбика.
Prompt: "<префикс>, five matte stone bar columns of increasing height standing on a flat stone base plate, rising left to right,
a small square desk calendar block with a raised check mark lying in front"

## 5. daily_phrase — «Одна фраза на сегодня»
Сцена: керамическая кружка с выпуклой пиктограммой кавычки, к ней прислонена свёрнутая записка на шнурке;
справа лежит раскрытая маленькая карточка-открытка с тремя выпуклыми строками; рядом — маленький круглый динамик-«звук»
(колонка-шайба с выпуклыми дугами звука).
Акцент: шнурок записки.
Prompt: "<префикс>, a matte ceramic mug with an embossed quotation-mark pictogram, a rolled note tied with a cord leaning against it,
a small open greeting card with three raised lines on the right, a small round puck speaker with raised sound arcs"

## 6. videos — «Занимаем место у экрана»
Сцена: тонкий планшет стоит на подставке под углом, экран тёмный матовый, на нём выпуклый треугольник ▶ (пиктограмма);
перед планшетом — 3 маленькие учебные карточки веером; сбоку — настольные наушники-дуга.
Акцент: треугольник ▶.
Prompt: "<префикс>, a thin tablet standing on a stand at an angle with a dark matte screen showing a raised play triangle pictogram,
three small flashcards fanned in front, over-ear headphones lying beside"

## 7. friends — «С компанией веселее»
Сцена: три толстых пузыря речи разного размера, стоящих рядом как фигуры, перекрываются; на среднем — выпуклая галочка
«заявка принята», на правом — три точки «…».
Акцент: кружок-индикатор на левом пузыре.
Prompt: "<префикс>, three thick soft ceramic speech bubbles of different sizes standing together and overlapping,
middle one with a raised check mark, right one with three raised dots, a small round indicator dot on the left bubble"

## 8. profile_card — «Твоя визитка»
Сцена: визитка-карточка 16:9 из плотного картона стоит на маленькой подставке; слева на ней выпуклый круг-место под аватар,
справа — 3 выпуклые строки-полоски; перед визиткой лежит монета-аватар (медная, с очками и усами, как coin_rank_00).
Акцент: тонкая полоска-ярлык сверху визитки.
Prompt: "<префикс>, a thick cardstock business card standing on a small stand, a raised circle avatar slot on the left and three raised text bars on the right,
a copper coin with an eyeglasses-and-mustache emblem lying in front"

## 9. arena — Шпиль
Сцена: башня-обелиск из 5 ступеней-ярусов из матового камня, каждый ярус чуть меньше; на вершине маленький флажок;
у подножия — 2 ступеньки-плитки, ведущие к башне.
Акцент: флажок на вершине.
Prompt: "<префикс>, a five-tier stepped stone tower obelisk, each tier slightly smaller, a small flag on the top,
two flat stone steps leading to its base"

## 10. training_listening — Тренировка «На слух»
Сцена: накладные наушники лежат на раскрытой карточке; из чашки наушника выходят 3 выпуклые дуги звука (форма, не свечение);
рядом маленькая колонка-шайба.
Акцент: подушка правого наушника.
Prompt: "<префикс>, over-ear headphones resting on an open ivory card, three raised sound arc shapes coming from one earcup,
a small puck speaker beside"

## 11. training_speaking — Тренировка «Устно»
Сцена: настольный микрофон на круглой подставке с решёткой; перед ним карточка с выпуклой полосой «волна звука»
(5 вертикальных палочек разной высоты).
Акцент: кнопка/кольцо на корпусе микрофона.
Prompt: "<префикс>, a desktop microphone with a mesh grille on a round base, an ivory card in front with a raised waveform of five vertical bars,
a small ring button on the microphone body"

## 12. training_blitz — Блиц
Сцена: секундомер (круглый корпус, кнопка сверху) и прислонённая к нему карточка; на циферблате выпуклая пиктограмма молнии
(форма, без цифр); стрелка у отметки «почти полный круг».
Акцент: кнопка секундомера.
Prompt: "<префикс>, a round stopwatch with a top button and a raised lightning bolt pictogram on its face, no numbers,
a flashcard leaning against it"

## 13. ai_dialog — Диалог с ИИ
Сцена: крупный пузырь речи и меньший перед ним; над большим пузырём — выпуклая четырёхлучевая искорка (форма звезды-искры),
рядом маленькая карточка с тремя строками.
Акцент: искорка.
Prompt: "<префикс>, a large thick speech bubble with a smaller one in front, a raised four-point sparkle shape above the large bubble,
a small card with three raised lines beside"

## 14. mistake_practice — «Работа над ошибками»
Сцена: открытая тетрадь, на правой странице 3 строки, средняя перечёркнута и рядом выпуклая галочка; поверх тетради —
выпуклая круговая стрелка (знак «повтор»), карандаш лежит поперёк.
Акцент: круговая стрелка.
Prompt: "<префикс>, an open notebook with three raised lines, the middle one struck through with a raised check mark beside it,
a raised circular repeat arrow shape resting on the notebook, a pencil lying across"

---------------------------------------------------------------------------------------------------
## Приёмка
1) Сначала 3 сцены (cards_hub, daily_phrase, mistake_practice) в обоих комплектах → владельцу на фоне окна
   (тёмный #141418, светлый #F4F2EE), акцент в трёх цветах тем. Без его «да» остальные не делать.
2) Проверка: нет стекла и прозрачности (кроме следов в №2); светлый не белый; нижние 12 % холста пустые;
   читается в 320 px; вес ≤ 180 КБ; слой .accent отдельно.
3) Подключение: реестр сессии 4 (app/theme/themed_art_registry.ts) → FeatureIntroModal (сессия 2).
