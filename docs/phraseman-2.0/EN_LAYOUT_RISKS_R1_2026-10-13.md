# Риски вёрстки при английском интерфейсе — зона Дизайна, 13.10.2026

Метод: статический разбор кода. (1) Все места с `numberOfLines`, `ellipsizeMode`, фиксированными ширинами чипов и кнопок. (2) Все пары `ru/en` в файлах зоны (≈ 2 900 пар, 453 файла: Карточки, Диалоги, Видео, Главная, Шпиль, Уроки), отобраны строки, где en длиннее ru и длиной от 14 знаков (182 штуки), и для значимых проверен контейнер. Кадров не снимал — проверку по EN-кадрам делает Сверка. Динамические строки (имена, числа, серверный текст) в оценку не входят.

Итог: **явных обрезаний, которые лечатся правкой, не найдено** — вёрстка зоны почти везде на `flex`/`minWidth: 0`/переносе; поиск стилей чипов, пилюль, вкладок и кнопок с фиксированной `width`/`maxWidth` (по именам стилей `chip*/pill*/tab*/seg*/btn*/button*/badge*/cta*/toggle*`) нашёл один — 26-dp круг с цифрой у цели диалога (`DialogGoalsSheet.tsx:199`). Поиск по именам — не исчерпывающий: фиксированные ширины в стилях с другими именами могли остаться, их ловит только кадр. Кода не менял. Ниже — что обрезается по замыслу (безопасно), что переносится (смотреть на кадрах) и один мёртвый файл.

## 1. Места с однострочной обрезкой (`numberOfLines={1}`) и английская строка

| Файл:строка | Что рисует | Строка en | Вывод |
|---|---|---|---|
| `app/lesson1.tsx:1680`, `:1721` | подписи кнопок под иконками нижней панели урока | Back, Explain (Theory, Speak — рядом, без обрезки) | безопасно: 4–7 знаков при `TOOL_LABEL_FONT` 13 |
| `app/flashcards/CardPackShardPaywallModal.tsx:699`, `:883`, `:982` | надпись над названием, ЗАГЛАВНЫМИ, `letterSpacing 1.2` | FREE PACK / PACK (`:190`, `:197`) | безопасно: коротко, контейнер `flex: 1, minWidth: 0` |
| `app/(tabs)/home.tsx:2567` | пилюля «сейчас» в списке званий | Now | безопасно |
| `app/(tabs)/home.tsx:2533`, `:2536`, `:2559` | заголовок и подпись окна званий | названия званий из модели | динамика; контейнер `flex: 1, minWidth: 0`, обрезка с многоточием допустима |
| `components/dialogs/DialogueV2SessionScreen.tsx:349` | подпись настроения собеседника в шапке диалога | слова настроения | обрезка осознанная (`flexShrink: 1`, комментарий dialogs-023): целиком читает озвучка |
| `components/cards-grid/CardsGallery.tsx:171`, `:183` | перевод под словом в галерее | данные карточки | динамика, многоточие допустимо |
| `components/home/v2/HomeV2TodayCard.tsx:86`, `:88` | заголовок и подпись строки опроса на Главной | серверный текст | динамика |
| `app/flashcards_swipe.tsx:3984` | счётчик «N/M» | числа | безопасно |
| `app/community_packs/PackCommentsSheet.tsx:737` | имя автора комментария | имя | динамика, `maxWidth: 100%, flexShrink: 1` |
| `app/flashcards/FlashcardsCategoryBar.tsx:53` | подписи категорий в ширине 68 dp | Saved, Emotions, Fillers, **Reactions** (9 знаков при 13 px ≈ 65 из 68 dp), Traps, Verbs, Scenes, Links | **файл мёртвый**: на него нет ни одного импорта, на экране не рисуется. Если когда-либо вернётся — `width: 68` заменить на `minWidth: 68` |

Двухстрочные (`numberOfLines={2}`): `FlashcardsCategoryTiles.tsx:107`, `VideoThumb.tsx:61` (запасное название ролика), `home.tsx:2546`, `:2562`, `DialogueV2PlusTools.tsx:102` — названия плиток, английские короче или равны русским, запас есть.

## 2. Длинные английские строки, которые ПЕРЕНОСЯТСЯ (не режутся) — смотреть на кадрах Сверки

Контейнер без `numberOfLines` и с минимальной, а не фиксированной высотой: строка уйдёт на вторую строку и подвинет блок вниз, но не обрежется. Проверить, что сдвиг не заходит под нижние панели.

| Файл:строка | Строка en (знаков / ru) | Примечание |
|---|---|---|
| `components/spire/SpireHomeScreen.tsx:268–317` (`spire_strings.ts:14`) | «Granite · until the week ends 5 d 23 h» (38 / 33) | рядом кнопка «i»; блок `flex: 1, minWidth: 0`, число с единицей склеены неразрывным пробелом — переносится целиком |
| `components/spire/SpireFloorInfo.tsx:52` | «You are here · 3 of 8 steps · 40 coins per floor · Guardian» (≈ 58 / 46) | карточка `minHeight: 72`, подпись переносится |
| `components/spire/SpireAllMembers.tsx:89`, `:91` | «Promotion zone», «Demotion zone» (14 / 14) | не длиннее ru |
| `components/dialogs/DialogueV2PlusTools.tsx:40` | «Practice without a scenario» (27 / 21) | подзаголовок плитки со стрелкой справа |
| `components/dialogs/dialogue_world_subtitle.ts:14` | «Favours, advice and little things» (33 / 28) | подзаголовок плитки мира диалогов |
| `app/(tabs)/lessons.tsx:4680` | «Complete all ${lvl} lessons with 4.5+» (37 / 32) | подпись закрытой главы |
| `app/(tabs)/lessons.tsx:3825`, `:3847`, `:5465` | «Lessons 3+ are available in Plus», «This session is still in progress», «This lesson is still in progress» (32–33 / 17–24) | тексты окон, переносятся |
| `app/flashcards/CollectionListView.tsx:808` | «Unlock all with Plus» (20 / 18) | чип без фиксированной ширины (`paddingHorizontal: 22`) |
| `app/flashcards/CollectionGalleryView.tsx:89`, `:329` | «Unlimited with Plus» (19 / 15) | кнопка `minHeight: 56`, ширина по контейнеру |
| `app/flashcards_recall_session.tsx:749` | «Write in the language you are learning» (38 / 25) | подсказка над полем |
| `app/dialogue_v2_completion.tsx:75` | «Your partner is preparing the summary…» (38 / 24) | текст ожидания |
| `app/lesson_complete.tsx:380`, `:619`, `:1291` | «Keep learning whenever you are ready.» (37 / 35), «The next lesson is already unlocked» (35 / 32) | подписи итога урока |

## 3. Что проверено и опасности не несёт
- Нижняя панель вкладок рисует иконки, подписей нет.
- Короткие подписи: Back, Menu, Search, Words, Phrases, Climb, Floor, Summit, Guardian — не длиннее русских.
- Тосты (`action_toast`) переносятся сами: «Your friend turned off calls» и подобные в `friends.tsx:899–902`.
- Кнопки на всю ширину (`lesson_complete`, `DialogueGlassCta`, `KitEmpty`) — длинные английские подписи («Continue the journey», «Open the catalog») не упираются.

## 4. Что просить у Сверки в EN-кадрах (по убыванию риска)
1. Шпиль, главный экран: подзаголовок с «until the week ends» и карточка этажа (`spire-001…`, `spire-gap-007/014`).
2. Диалоги: хаб — плитка «Free conversation / Practice without a scenario» и подзаголовки миров.
3. Уроки: список с закрытой главой («Complete all … with 4.5+») и окна «still in progress».
4. Карточки: «Unlimited with Plus» (галерея) и «Unlock all with Plus» (список) при упёртом лимите Free.

## 5. Правки в окно
Не требуются: нет случая, где английский текст обрезается, а не переносится, кроме мёртвого файла. Если Сверка найдёт на EN-кадрах реальный клип — править переносом или `minWidth`/`flexShrink`, не размером шрифта.
