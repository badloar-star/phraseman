# Цвета вне токенов темы — перепись по приложению (25.10.2026)

Правило владельца: **каждый цвет — оттенок текущей темы**. Ниже — литералы цвета (`#…`, `rgb(a)(…)`, `white` / `black` и т. п. в стилях) в `app/`,
`components/`, `modules/`, которые не взяты из токенов темы и **не** помечены `theme-exempt: <причина>`. Только изучение — код не правился.

Как получено: `node scripts/color_literal_census.mjs`. Сканер — те же регулярки, что у сторожа `tests/theme_hardcoded_colors_ratchet`, но без его
исключений для Главной и Learning V2. Не смотрим: файлы самих токенов и палитр (там цвета — это и есть тема), dev-витрины, тесты, админку, контент-данные,
комментарии и журналы. «Чей модуль» — область из заголовка последнего коммита в файле, его хэш и дата. «Как заменить» — подсказка по цвету и роли:
перед правкой владелец зоны проверяет её глазами (белый на медиа — `mediaInk`, на поверхности темы — `text` и т. д.).

**Итого:** 1468 литералов в 43 файлах из 2684 просмотренных; строк с пометкой theme-exempt (не считаются) — 890.

## Главное (прочитать первым)

Литералы сосредоточены в **43 файлах**: остальные 2641 из 2684 просмотренных чистые, их держит сторож-храповик. Три четверти литералов —
в пяти «таблицах-палитрах» старого оформления. Ниже по зонам, от заметного к незаметному.

**1 · Главная — 43 литерала, почти все в сцене.**
- `components/home/v2/scene/HomeSceneStage.tsx` (17), `today_scene/TodaySceneView.tsx` (11), `HomeScene.tsx` (3), `HomeSceneEnergy.tsx` (1),
  тон «сцена» в `HomeV2Header.tsx` (3). Это белые чернила на градиенте сцены, затемнение низа и тёмная подпись белой кнопки
  `#121318`. По замыслу они не цвет темы, но правилу владельца место им — токенам сцены: собрать в модуль чернил сцены по образцу
  `SPIRE_SCENE_INK` у Пика (Пик так уже сделал), пометку theme-exempt снять. Контраст этих цветов уже проверен
  (`docs/work/home-scene-special-contrast-2026-10-25.md`), так что перенос его не меняет.
- `app/(tabs)/home.tsx:2955, 3102, 3107, 3128` (7) — окно званий: золотистые подложки кнопки и метки «текущее»
  (`rgba(202,138,4,…)`, `rgba(252,211,77,…)`, `rgba(246,227,161,…)` для золотой темы). Заменить на `g.warnSoft`, для золотой темы — `g.accentSoft`.
- `components/home/HomeMistakesLockedSheet.tsx:64` — затемнение под шторкой `rgba(0,0,0,0.5)` → `g.scrim`.

**2 · Занятие — 222, из них видно человеку немного.**
- `app/theory_topic_accents.ts` (76) — цвета тем теории; `components/learning-v2/horizons/model.ts` (70) — палитра иллюстраций
  «Горизонтов» (арт: theme-exempt с причиной, если владелец оставит); `app/learning_v2_session_intro_check.tsx` (43) — маршрут
  проверки вступления.


**Невидимо, кандидат на удаление после OTA (поправка координатора 25.10).** `app/learning-v2/session/[id].tsx` (106) — `MODE_META` со своим
цветом у каждого режима (`#6FD6FF`, `#A78BFA`, `#F8C65C`, `#8EE65A`…) и постоянный `#5872FF` в градиенте значка режима (строки 1360–1396). Всё это живёт
только в старом экране занятия `LearningV2LegacySessionScreen`. Люди его не видят: английский идёт через
`app/learning_v2_direct_session_player_v1.tsx` (там 0 литералов), другие языки скрыты. Перекрашивать не нужно — удалить вместе со старым
экраном после выхода OTA.

**3 · Пик — 112, все в `modules/spire/tower_skins.ts`.** Это скины башни, покупаемый арт. Правильнее пометить theme-exempt с
причиной («скин башни — коллекционный арт»), чем перекрашивать. Решение за владельцем Пика.

**4 · Plus — 295.** `components/paywallThemeConfig.ts` (210) и `app/paywall_copy.ts` (80) — старая таблица пейвола по `ThemeMode`.
Она **живая**: `usePaywallChrome` в `components/paywall/paywallShared.tsx` берёт `getPaywallThemeConfig(mode)` для `PaywallPlusScreen` и
`PaywallProofCards`. **Самый крупный настоящий долг:** экран Plus окрашен не текущей темой Liquid Glass, а прежним режимом. Пейвол М
уже размечен токенами (`docs/work/paywall-m-theme-token-map-2026-10-25.md`) — при его сборке таблицу можно снять целиком.

**Остальное:**
- `components/medalToastThemeStyles.ts` (177) — старая таблица тоста медали. В приложении **не используется**: живой путь — токены
  (31b17106b), таблица нужна только витрине движения через `themeMode`. Кандидат на удаление вместе с витриной.
- `app/daily_phrase_chrome.ts` (126) — **живая**: оформление «Фразы дня» (`DailyPhraseCard`), свои цвета мимо темы. Второй по
  заметности долг после пейвола.
- `app/profile_card_system.ts`, `components/profile-card/profile_card_looks.ts` (132) — облики карточки профиля (коллекционный арт:
  theme-exempt с причиной).
- `components/CleanOnboarding.tsx` (63), `components/onboarding_aha/aha_theme.ts` (46) — онбординг: первый экран у новичка, тема ещё
  не выбрана. Нужно решение, по какой теме его красить (по умолчанию «Спокойно»).
- `components/ui/v2_theme.ts` (56), `app/lingman_youtube_chrome.ts` (25), `app/_layout.tsx` (19), `app/pos_workout_engine.ts` (15) и
  мелочь — по таблице ниже.

«Чей модуль» в таблице — область последнего коммита в файле (`home`, `learning-v2`, `spire`…). Это подсказка, кому отдать, а не
владелец по реестру.

## По зонам (сначала самое заметное)

| Зона | Литералов | Файлов |
|---|---|---|
| 1 · Главная | 43 | 7 |
| 2 · Занятие | 222 | 5 |
| 3 · Пик | 112 | 1 |
| 4 · Plus | 295 | 3 |
| 5 · Карточки | 29 | 4 |
| 7 · Ошибки | 3 | 1 |
| 8 · Профиль и настройки | 132 | 2 |
| 9 · Прочее | 632 | 20 |

## Таблица


### 1 · Главная

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| components/home/v2/scene/HomeSceneStage.tsx:165 | `#FFFFFF` | градиент | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:166 | `#FFFFFF` | градиент | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:181 | `rgba(0,0,0,0)` | градиент | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:181 | `rgba(0,0,0,0.40)` | градиент | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:250 | `#FFFFFF` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:287 | `#FFFFFF` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:288 | `#FFFFFF` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:289 | `#FFFFFF` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:293 | `rgba(255,255,255,0.28)` | заливка | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:294 | `#FFFFFF` | заливка | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:295 | `rgba(255,255,255,0.88)` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:296 | `#FFFFFF` | заливка | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:297 | `#121318` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:299 | `rgba(255,255,255,0.14)` | заливка | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:300 | `#FFFFFF` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:301 | `rgba(255,255,255,0.86)` | текст или значок | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeSceneStage.tsx:302 | `rgba(255,255,255,0.18)` | заливка | home · c5f60dc21 · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:114 | `#FFFFFF` | градиент | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:115 | `#FFFFFF` | градиент | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:135 | `rgba(0,0,0,0)` | градиент | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:135 | `rgba(0,0,0,0.40)` | градиент | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:162 | `#121318` | текст или значок | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:236 | `#FFFFFF` | текст или значок | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:240 | `rgba(255,255,255,0.86)` | текст или значок | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:241 | `#FFFFFF` | текст или значок | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:244 | `rgba(255,255,255,0.88)` | текст или значок | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:247 | `#FFFFFF` | заливка | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/today_scene/TodaySceneView.tsx:248 | `#121318` | текст или значок | ratchets · 3e278380a · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| app/(tabs)/home.tsx:2955 | `rgba(246,227,161,0.13)` | значение цвета | home-scene · a796ac60e · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/(tabs)/home.tsx:2955 | `rgba(202,138,4,0.12)` | значение цвета | home-scene · a796ac60e · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/(tabs)/home.tsx:2955 | `rgba(252,211,77,0.13)` | значение цвета | home-scene · a796ac60e · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/(tabs)/home.tsx:3102 | `rgba(246,227,161,0.10)` | заливка | home-scene · a796ac60e · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/(tabs)/home.tsx:3107 | `rgba(246,227,161,0.08)` | заливка | home-scene · a796ac60e · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/(tabs)/home.tsx:3128 | `rgba(202,138,4,0.14)` | заливка | home-scene · a796ac60e · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/(tabs)/home.tsx:3128 | `rgba(252,211,77,0.16)` | заливка | home-scene · a796ac60e · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/home/v2/HomeV2Header.tsx:101 | `#FFFFFF` | значение цвета | home · d3c4c5b26 · 2026-10-22 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/HomeV2Header.tsx:102 | `rgba(255,255,255,0.78)` | значение цвета | home · d3c4c5b26 · 2026-10-22 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/HomeV2Header.tsx:180 | `rgba(255,255,255,0.16)` | заливка | home · d3c4c5b26 · 2026-10-22 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeScene.tsx:347 | `#FFFFFF` | текст или значок | home-scene · fdd62974d · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeScene.tsx:361 | `rgba(255,255,255,0.14)` | заливка | home-scene · fdd62974d · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/v2/scene/HomeScene.tsx:363 | `#FFFFFF` | текст или значок | home-scene · fdd62974d · 2026-10-25 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |
| components/home/HomeMistakesLockedSheet.tsx:64 | `rgba(0,0,0,0.5)` | заливка | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.scrim` / `g.scrimStrong` (или theme-exempt: затемнение) |
| components/home/v2/scene/HomeSceneEnergy.tsx:42 | `#FFFFFF` | текст или значок | theme · 0f9ebd205 · 2026-10-22 | чернила сцены: вынести в токены сцены (как `SPIRE_SCENE_INK` у Пика), белое на градиенте сцены — по замыслу |

### 2 · Занятие

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| app/learning-v2/session/[id].tsx:143 | `#6FD6FF` | значение цвета | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:147 | `#A78BFA` | значение цвета | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:151 | `#F8C65C` | значение цвета | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:155 | `#8EE65A` | значение цвета | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:159 | `#5EEAD4` | значение цвета | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:163 | `#FB7185` | значение цвета | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/learning-v2/session/[id].tsx:167 | `#F472B6` | значение цвета | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/learning-v2/session/[id].tsx:1296 | `#10151D` | градиент | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:1296 | `#151B26` | градиент | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:1296 | `#0E1219` | градиент | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:1310 | `#EAF0F6` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:1326 | `#F8C84E` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1396 | `#5872FF` | градиент | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:1402 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:1485 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:1565 | `#DDE5EE` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:1606 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:1606 | `#DDE5EE` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:1657 | `#FFD75A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1657 | `#596273` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:1683 | `#ABB7C5` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:1744 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:1755 | `#FFF1A8` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:1761 | `#F8C84E` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1764 | `#FFD75A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1800 | `#FFF0A8` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:1810 | `#F8C84E` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1820 | `#FFF4BD` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:1822 | `#FFD75A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1849 | `#FFD75A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1859 | `#FFD75A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1871 | `#FFD75A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:1883 | `#7B8492` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:1923 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:2173 | `#10151D` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:2220 | `#F7F9FB` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning-v2/session/[id].tsx:2231 | `#202936` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2239 | `#27313F` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2246 | `#8EE65A` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:2253 | `#202936` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2257 | `#E9EEF4` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:2262 | `#2D2819` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2270 | `#FFF1B8` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2272 | `#9D8F5A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2292 | `#F5F7FA` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning-v2/session/[id].tsx:2294 | `#7F8B99` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2301 | `#1B2430` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2306 | `#000` | тень | learning-v2 · 72f72a94e · 2026-10-22 | `g.dropShadow` / `g.shadowTint` |
| app/learning-v2/session/[id].tsx:2317 | `#6FD6FF` | тень | learning-v2 · 72f72a94e · 2026-10-22 | `g.dropShadow` / `g.shadowTint` |
| app/learning-v2/session/[id].tsx:2329 | `#F8FAFC` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning-v2/session/[id].tsx:2337 | `#9BA8B8` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2346 | `#F8C65C` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:2354 | `#F7F9FB` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning-v2/session/[id].tsx:2359 | `#9EABB9` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2361 | `#728091` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2372 | `#1A222D` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2379 | `#203A25` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:2379 | `#8EE65A` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:2384 | `#2A3543` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2385 | `#BFC9D4` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:2393 | `#EDF2F7` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning-v2/session/[id].tsx:2402 | `#121821` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:2409 | `#6F7B89` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2411 | `#31402D` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2417 | `#E9F7E2` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2428 | `#222C39` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2433 | `#F3F6F9` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning-v2/session/[id].tsx:2434 | `#83909E` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2439 | `#F472B6` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/learning-v2/session/[id].tsx:2445 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:2457 | `#111821E8` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/learning-v2/session/[id].tsx:2465 | `#202A36` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2467 | `#8EE65A` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:2476 | `#121821F2` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/learning-v2/session/[id].tsx:2478 | `#FF9B9B` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/learning-v2/session/[id].tsx:2480 | `#B8C4D1` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:2486 | `#FFF2B5` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2491 | `#2B2619` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2502 | `#C7B777` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:2521 | `#ABB7C5` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2523 | `#AEB9C5` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:2524 | `#AEB9C5` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:2528 | `#8EE65A` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:2535 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:2552 | `#F8C84E33` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:2553 | `#FFD75A` | тень | learning-v2 · 72f72a94e · 2026-10-22 | `g.dropShadow` / `g.shadowTint` |
| app/learning-v2/session/[id].tsx:2574 | `#FFF6D1` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2577 | `#5A4100` | тень текста | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2583 | `#090D13F2` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/learning-v2/session/[id].tsx:2593 | `#1B2430` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.opaqueControl` |
| app/learning-v2/session/[id].tsx:2594 | `#000` | тень | learning-v2 · 72f72a94e · 2026-10-22 | `g.dropShadow` / `g.shadowTint` |
| app/learning-v2/session/[id].tsx:2608 | `#9BA8B8` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2621 | `#F8C84E18` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:2622 | `#FFD75A` | тень | learning-v2 · 72f72a94e · 2026-10-22 | `g.dropShadow` / `g.shadowTint` |
| app/learning-v2/session/[id].tsx:2631 | `#FFF6D1` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2639 | `#B9A96A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:2650 | `#303746` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2657 | `#FFD75A` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning-v2/session/[id].tsx:2671 | `#141B24` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning-v2/session/[id].tsx:2685 | `#FFF0A8` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2691 | `#95A2B1` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2698 | `#D9E1E9` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.secondary` |
| app/learning-v2/session/[id].tsx:2706 | `#9EABB9` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2714 | `#7F8B99` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning-v2/session/[id].tsx:2725 | `#8EE65A` | заливка | learning-v2 · 72f72a94e · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning-v2/session/[id].tsx:2733 | `#07110A` | текст или значок | learning-v2 · 72f72a94e · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:5 | `#101c19` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:6 | `#192b24` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:7 | `#253c31` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:8 | `#d1ebbe` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/learning-v2/horizons/model.ts:9 | `#2b4b3b` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/learning-v2/horizons/model.ts:10 | `#42654c` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/learning-v2/horizons/model.ts:11 | `#709075` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/learning-v2/horizons/model.ts:12 | `#42584a` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:13 | `#b1bfb1` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:14 | `#e5c48b` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:17 | `#101d22` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:18 | `#192c32` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:19 | `#24414a` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:20 | `#b6e1de` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/learning-v2/horizons/model.ts:21 | `#294f56` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:22 | `#416a70` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:23 | `#6b9090` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:24 | `#425c62` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:25 | `#afbec2` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:26 | `#e1d1a6` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:29 | `#231916` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:30 | `#32231f` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:31 | `#4a3228` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:32 | `#f4c8a6` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/learning-v2/horizons/model.ts:33 | `#604134` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:34 | `#835740` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/learning-v2/horizons/model.ts:35 | `#b77e5b` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/learning-v2/horizons/model.ts:36 | `#664a3e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:37 | `#c8b7ac` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:38 | `#efd39e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:41 | `#1b1927` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:42 | `#292437` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:43 | `#3d344e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:44 | `#d7c8f2` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:45 | `#483d60` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:46 | `#635275` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:47 | `#8b779c` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:48 | `#564b64` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:49 | `#bfb6cb` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:50 | `#e7d4af` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:53 | `#211c13` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:54 | `#30291c` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.opaqueControl` |
| components/learning-v2/horizons/model.ts:55 | `#443a27` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:56 | `#efda9b` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:57 | `#54482c` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:58 | `#76643b` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:59 | `#a58e59` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:60 | `#60543a` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:61 | `#c5bfac` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:62 | `#f0d59a` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:65 | `#171e27` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:66 | `#232e39` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.opaqueControl` |
| components/learning-v2/horizons/model.ts:67 | `#32424e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:68 | `#c2dfef` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:69 | `#3b5260` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:70 | `#526f7c` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:71 | `#7e9eab` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:72 | `#4e626e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:73 | `#b9c4cc` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.secondary` |
| components/learning-v2/horizons/model.ts:74 | `#e2dabf` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:77 | `#24191e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/model.ts:78 | `#34262d` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:79 | `#4b353f` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:80 | `#edc7cf` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:81 | `#614450` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:82 | `#805b68` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:83 | `#ac818e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:84 | `#68505a` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:85 | `#cbb7be` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/learning-v2/horizons/model.ts:86 | `#ebc59e` | значение цвета | снимок · 0217c4a21 · 2026-09-14 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:189 | `#10151D` | градиент | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning_v2_session_intro_check.tsx:189 | `#151B26` | градиент | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning_v2_session_intro_check.tsx:189 | `#0E1219` | градиент | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning_v2_session_intro_check.tsx:202 | `#FFD75A` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning_v2_session_intro_check.tsx:220 | `#F8C84E` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning_v2_session_intro_check.tsx:258 | `#8EE65A` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning_v2_session_intro_check.tsx:282 | `#FFD75A` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning_v2_session_intro_check.tsx:282 | `#596273` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:312 | `#07110A` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning_v2_session_intro_check.tsx:325 | `#10151D` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning_v2_session_intro_check.tsx:328 | `#202936` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.opaqueControl` |
| app/learning_v2_session_intro_check.tsx:329 | `#27313F` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:330 | `#F8C84E` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning_v2_session_intro_check.tsx:331 | `#202936` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.opaqueControl` |
| app/learning_v2_session_intro_check.tsx:332 | `#E9EEF4` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.secondary` |
| app/learning_v2_session_intro_check.tsx:333 | `#2D2819` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:334 | `#FFF1B8` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:344 | `#F8C84E1F` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning_v2_session_intro_check.tsx:346 | `#F8C84E` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning_v2_session_intro_check.tsx:347 | `#1B2430` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.dropShadow` / `g.shadowTint` |
| app/learning_v2_session_intro_check.tsx:347 | `#000` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.dropShadow` / `g.shadowTint` |
| app/learning_v2_session_intro_check.tsx:350 | `#758395` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:351 | `#F8FAFC` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning_v2_session_intro_check.tsx:355 | `#1A222D` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.opaqueControl` |
| app/learning_v2_session_intro_check.tsx:356 | `#203A25` | заливка | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning_v2_session_intro_check.tsx:356 | `#8EE65A` | заливка | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning_v2_session_intro_check.tsx:357 | `#3A2327` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:357 | `#FB7185` | заливка | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/learning_v2_session_intro_check.tsx:358 | `#2A3543` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:358 | `#BFC9D4` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.secondary` |
| app/learning_v2_session_intro_check.tsx:359 | `#8EE65A` | заливка | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning_v2_session_intro_check.tsx:359 | `#07110A` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning_v2_session_intro_check.tsx:360 | `#FB7185` | заливка | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/learning_v2_session_intro_check.tsx:360 | `#07110A` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/learning_v2_session_intro_check.tsx:361 | `#EDF2F7` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/learning_v2_session_intro_check.tsx:362 | `#121821F2` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/learning_v2_session_intro_check.tsx:363 | `#FF9B9B` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/learning_v2_session_intro_check.tsx:364 | `#2B2619` | заливка | l10n · f305f6ed6 · 2026-10-25 | `g.opaqueControl` |
| app/learning_v2_session_intro_check.tsx:367 | `#FFF2B5` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/learning_v2_session_intro_check.tsx:368 | `#C7B777` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/learning_v2_session_intro_check.tsx:372 | `#AEB9C5` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.secondary` |
| app/learning_v2_session_intro_check.tsx:373 | `#8EE65A` | заливка | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/learning_v2_session_intro_check.tsx:375 | `#07110A` | текст или значок | l10n · f305f6ed6 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/art.ts:12 | `#000` | заливка значка | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/learning-v2/horizons/art.ts:23 | `#000` | заливка значка | снимок · 0217c4a21 · 2026-09-14 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/_learning_v2_modes_showcase.tsx:70 | `#000000` | заливка | android · b5fd39c4f · 2026-10-15 | `g.dropShadow` / `g.shadowTint` |

### 3 · Пик

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| modules/spire/tower_skins.ts:96 | `#ffffff` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:97 | `#000000` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:104 | `#1F1F23` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:104 | `#3D3D44` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:104 | `#5A5A62` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.mutedText` |
| modules/spire/tower_skins.ts:104 | `#46464D` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:104 | `#2C2C31` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:104 | `#18181B` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:105 | `#232328` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:105 | `#46464D` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:105 | `#67676F` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.mutedText` |
| modules/spire/tower_skins.ts:105 | `#505058` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:105 | `#303035` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:105 | `#1A1A1D` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:106 | `#2A2A2F` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:106 | `#77777F` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.mutedText` |
| modules/spire/tower_skins.ts:106 | `#55555C` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:106 | `#222226` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:107 | `#1E1E22` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:107 | `#55555D` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:107 | `#3A3A41` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:107 | `#151518` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:108 | `#EEF0F6` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:109 | `#3A3A40` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:110 | `#0B0B0D` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:111 | `#6B6B72` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.mutedText` |
| modules/spire/tower_skins.ts:112 | `#101013` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:112 | `#17171A` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:112 | `#0E0E10` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:113 | `#26262A` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:113 | `#0E0E10` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:114 | `#FFFFFF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:117 | `#FFFFFF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:119 | `#D6D6D8` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:122 | `#FFFFFF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:128 | `#424247` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:129 | `#6E6E73` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.mutedText` |
| modules/spire/tower_skins.ts:134 | `#55575E` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:134 | `#A9B6C6` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:134 | `#8C9098` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.mutedText` |
| modules/spire/tower_skins.ts:134 | `#F2EEE6` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:134 | `#111215` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:135 | `#384352` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:135 | `#8FA6C2` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:135 | `#7D8796` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:135 | `#36597E` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:135 | `#E2EEF8` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:135 | `#0E1217` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:136 | `#D4CEC4` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:136 | `#FFF4DE` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:136 | `#D9B566` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| modules/spire/tower_skins.ts:136 | `#FFF2D6` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:136 | `#15141A` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:137 | `#23664F` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| modules/spire/tower_skins.ts:137 | `#9FF0C8` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| modules/spire/tower_skins.ts:137 | `#D9B566` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| modules/spire/tower_skins.ts:137 | `#4FD69C` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| modules/spire/tower_skins.ts:137 | `#FFE6B0` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:137 | `#0C1411` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:138 | `#B38494` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:138 | `#FFE0EC` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:138 | `#E6B8A2` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:138 | `#F7C2D6` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:138 | `#FFEFF4` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:138 | `#161116` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:139 | `#80502E` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:139 | `#FFC98A` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:139 | `#C8894A` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| modules/spire/tower_skins.ts:139 | `#D9894A` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| modules/spire/tower_skins.ts:139 | `#8E3A2A` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:139 | `#FFE1B0` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:139 | `#15100D` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:140 | `#2C2C33` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueControl` |
| modules/spire/tower_skins.ts:140 | `#C9D2E2` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:140 | `#C9CCD6` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:140 | `#1A1A20` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:140 | `#EEF0F6` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:140 | `#111114` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:141 | `#4A2D72` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:141 | `#D6B4FF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:141 | `#C9CCD6` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:141 | `#B58CFF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:141 | `#6A3FB0` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:141 | `#F0E2FF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:141 | `#110D17` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:142 | `#C4BED0` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:142 | `#DDF4FF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:142 | `#E8E6EE` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:142 | `#BFE3FA` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:142 | `#FFF4EA` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.secondary` |
| modules/spire/tower_skins.ts:142 | `#14131A` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:143 | `#8E6522` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:143 | `#FFE7A0` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:143 | `#F2D08A` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:143 | `#FFB43C` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| modules/spire/tower_skins.ts:143 | `#FFF0C0` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:143 | `#15120B` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:144 | `#1C1A20` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:144 | `#E0503A` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:144 | `#5E5A66` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.mutedText` |
| modules/spire/tower_skins.ts:144 | `#E0503A` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:144 | `#9E2A22` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:144 | `#FFC08A` | значение цвета | spire · 78b060acd · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| modules/spire/tower_skins.ts:144 | `#130C0C` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:145 | `#5C7698` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:145 | `#E6FAFF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:145 | `#EEF2F8` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |
| modules/spire/tower_skins.ts:145 | `#E8F8FF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:145 | `#BFE6FF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:145 | `#EAF8FF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| modules/spire/tower_skins.ts:145 | `#0C1220` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| modules/spire/tower_skins.ts:174 | `#FFFFFF` | значение цвета | spire · 78b060acd · 2026-10-22 | `g.opaqueCard` |

### 4 · Plus

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| components/paywallThemeConfig.ts:74 | `#58CC89` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:76 | `#58CC89` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:77 | `rgba(88,204,137,0.13)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:78 | `rgba(21,32,25,0.86)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:79 | `rgba(17,31,23,0.74)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:80 | `rgba(30,56,40,0.88)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:81 | `#47C870` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:83 | `#FFC800` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:84 | `#07100A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:86 | `#47C870` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:87 | `#042010` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:89 | `#58CC89` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:90 | `#042010` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:91 | `#47C870` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:93 | `rgba(88,204,137,0.13)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:94 | `#58CC89` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:95 | `rgba(88,204,137,0.28)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:97 | `rgba(255,200,0,0.10)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:98 | `#FFC800` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:99 | `#8AB49A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:100 | `#506A5C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:101 | `#58CC89` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:103 | `#58CC89` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:104 | `rgba(88,204,137,0.28)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:106 | `#8AB49A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:107 | `#FFC800` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:116 | `rgba(10,10,10,0.88)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:117 | `rgba(18,15,9,0.78)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:118 | `rgba(41,32,15,0.88)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:122 | `#0A0702` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:125 | `#0A0702` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:128 | `#0A0702` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:148 | `#E3CC88` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#594719` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#C9A84C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `#161208` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:148 | `#8EAA72` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:148 | `#10160C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:148 | `#C9A84C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `#161208` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:148 | `#594719` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#E3CC88` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#E3CC88` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#A69F8A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#8D8777` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#F4ECD8` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#E3CC88` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#A69F8A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:148 | `#C9A84C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `rgba(201,168,76,0.22)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `rgba(201,168,76,0.14)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `rgba(13,15,11,0.88)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:148 | `rgba(20,24,15,0.78)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:148 | `rgba(30,34,20,0.88)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:148 | `rgba(201,168,76,0.12)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `rgba(201,168,76,0.18)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `rgba(201,168,76,0.10)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:148 | `rgba(201,168,76,0.18)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:161 | `#C9D2FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:163 | `rgba(143,160,255,0.46)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:164 | `rgba(143,160,255,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:165 | `rgba(255,255,255,0.06)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.hairlineSoft` |
| components/paywallThemeConfig.ts:166 | `rgba(17,20,42,0.78)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:167 | `rgba(30,35,72,0.86)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:168 | `#39448F` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:170 | `#8FA0FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:171 | `#0D1030` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:173 | `#C9D2FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:174 | `#0D1030` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:176 | `#8FA0FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:177 | `#0D1030` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:180 | `rgba(143,160,255,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:181 | `#8FA0FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:182 | `rgba(143,160,255,0.18)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:184 | `rgba(143,160,255,0.08)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:185 | `#C9D2FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:186 | `#A9AECB` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:187 | `#6E7390` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:188 | `#8FA0FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:190 | `#8FA0FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:191 | `rgba(143,160,255,0.22)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:193 | `#A9AECB` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:194 | `#FFD27A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:197 | `#FFE9B8` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:199 | `rgba(255,204,85,0.46)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:200 | `rgba(255,204,85,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:201 | `rgba(255,255,255,0.06)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.hairlineSoft` |
| components/paywallThemeConfig.ts:202 | `rgba(36,22,14,0.78)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:203 | `rgba(59,32,16,0.86)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:204 | `#9A6E0E` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/paywallThemeConfig.ts:206 | `#FFCC55` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:207 | `#2A1A02` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:209 | `#FFE9B8` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:210 | `#2A1A02` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:212 | `#FFCC55` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:213 | `#2A1A02` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:216 | `rgba(255,204,85,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:217 | `#FFCC55` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:218 | `rgba(255,204,85,0.18)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:220 | `rgba(255,204,85,0.08)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:221 | `#FFE9B8` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:222 | `#C9B4A4` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:223 | `#8A7464` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:224 | `#FFCC55` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:226 | `#FFCC55` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:227 | `rgba(255,204,85,0.22)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:229 | `#C9B4A4` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:230 | `#FFCB5C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:233 | `#9FF2CF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:235 | `rgba(61,232,166,0.46)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:236 | `rgba(61,232,166,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:237 | `rgba(255,255,255,0.06)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.hairlineSoft` |
| components/paywallThemeConfig.ts:238 | `rgba(13,34,28,0.78)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:239 | `rgba(19,58,45,0.86)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:240 | `#0E7A57` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:242 | `#3DE8A6` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:243 | `#052A1C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:245 | `#9FF2CF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:246 | `#052A1C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:248 | `#3DE8A6` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:249 | `#052A1C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:252 | `rgba(61,232,166,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:253 | `#3DE8A6` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:254 | `rgba(61,232,166,0.18)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:256 | `rgba(61,232,166,0.08)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:257 | `#9FF2CF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:258 | `#A7C0B5` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:259 | `#6F837A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:260 | `#3DE8A6` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:262 | `#3DE8A6` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:263 | `rgba(61,232,166,0.22)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:265 | `#A7C0B5` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:266 | `#F2D27A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:269 | `#E8FF96` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:271 | `rgba(198,255,52,0.46)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:272 | `rgba(198,255,52,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:273 | `rgba(255,255,255,0.06)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.hairlineSoft` |
| components/paywallThemeConfig.ts:274 | `rgba(31,37,11,0.78)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/paywallThemeConfig.ts:275 | `rgba(49,61,14,0.86)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:276 | `#5F7A0A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:278 | `#C6FF34` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:279 | `#1A2002` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:281 | `#E8FF96` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:282 | `#1A2002` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:284 | `#C6FF34` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:285 | `#1A2002` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:288 | `rgba(198,255,52,0.1)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:289 | `#C6FF34` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:290 | `rgba(198,255,52,0.18)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:292 | `rgba(198,255,52,0.08)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:293 | `#E8FF96` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:294 | `#BFC6A3` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:295 | `#7E8563` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:296 | `#C6FF34` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:298 | `#C6FF34` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:299 | `rgba(198,255,52,0.22)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:301 | `#BFC6A3` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:302 | `#FFE85C` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:307 | `#E4E1FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:309 | `rgba(200,195,255,0.46)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:310 | `rgba(200,195,255,0.10)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:311 | `rgba(42,41,82,0.88)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:312 | `rgba(34,33,64,0.78)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:313 | `rgba(42,41,82,0.88)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:314 | `#3D3A72` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:316 | `#FFC53D` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:317 | `#1A1408` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:319 | `#C8C3FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:320 | `#17162B` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:322 | `#C8C3FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:323 | `#17162B` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:324 | `#3D3A72` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:326 | `rgba(200,195,255,0.12)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:327 | `#C8C3FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:328 | `rgba(200,195,255,0.28)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:330 | `rgba(255,197,61,0.10)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:331 | `#FFC53D` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:332 | `#B7B3D9` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:333 | `#605C8A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:334 | `#C8C3FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:336 | `#C8C3FF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:337 | `rgba(200,195,255,0.28)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:339 | `#B7B3D9` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:340 | `#FFC53D` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/paywallThemeConfig.ts:343 | `#315F50` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:344 | `#315F50` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:345 | `#D9E9E1` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:346 | `#FCFDF9` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.opaqueCard` |
| components/paywallThemeConfig.ts:350 | `#FCFDF9` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.opaqueCard` |
| components/paywallThemeConfig.ts:351 | `#E1E5DC` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.secondary` |
| components/paywallThemeConfig.ts:352 | `rgba(49,95,80,0)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:353 | `#8B6320` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:354 | `#FFFFFF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.opaqueCard` |
| components/paywallThemeConfig.ts:355 | `#D9E9E1` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:356 | `#17201D` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/paywallThemeConfig.ts:357 | `#315F50` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:358 | `#FFFFFF` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.opaqueCard` |
| components/paywallThemeConfig.ts:359 | `rgba(49,95,80,0)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:360 | `#E1E5DC` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.secondary` |
| components/paywallThemeConfig.ts:361 | `#3C5A50` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:362 | `#BDC8BD` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.secondary` |
| components/paywallThemeConfig.ts:363 | `rgba(139,99,32,0.12)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:364 | `#8B6320` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:365 | `#52605A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:368 | `#61706A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:369 | `#315F50` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:370 | `#315F50` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/paywallThemeConfig.ts:371 | `#BDC8BD` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.secondary` |
| components/paywallThemeConfig.ts:372 | `#52605A` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/paywallThemeConfig.ts:373 | `#8B6320` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:48 | `#FFE86A` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:48 | `#64B4FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:51 | `#C8FF00` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:51 | `#67E8F9` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:52 | `#63E6BE` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:52 | `#FFD86B` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:53 | `#38BDF8` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:53 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:54 | `#8BD3FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:54 | `#FDE68A` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:55 | `#8BD3FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:55 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:56 | `#8BD3FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:56 | `#86EFAC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:57 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:57 | `#8BD3FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:58 | `#FFB020` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:58 | `#FF5C5C` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/paywall_copy.ts:59 | `#F0ABFC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:59 | `#67E8F9` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:60 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:60 | `#22C55E` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:61 | `#58D6FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:61 | `#A7FF4F` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:62 | `#58D6FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:62 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:63 | `#5EEAD4` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:63 | `#F87171` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/paywall_copy.ts:64 | `#67E8F9` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:64 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:65 | `#86EFAC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:65 | `#FDE68A` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:66 | `#60A5FA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:66 | `#FDE68A` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:67 | `#34D399` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:67 | `#A3E635` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:68 | `#F87171` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/paywall_copy.ts:68 | `#C084FC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:69 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:69 | `#38BDF8` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:70 | `#FFB020` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:70 | `#66A8FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:71 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:71 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:72 | `#5EEAD4` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:72 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:73 | `#FF7A8A` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/paywall_copy.ts:73 | `#5EEAD4` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:74 | `#FFB020` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:74 | `#66A8FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:75 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:75 | `#F0ABFC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:76 | `#C8FF00` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:76 | `#67E8F9` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:77 | `#66A8FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:77 | `#5EEAD4` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:78 | `#FDE68A` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:78 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:79 | `#72E6A9` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:79 | `#FDE68A` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:80 | `#E879F9` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:80 | `#38BDF8` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:81 | `#63E6BE` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:81 | `#FFD86B` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:82 | `#FFB020` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:82 | `#66A8FF` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:83 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:83 | `#F0ABFC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:86 | `#7DD3FC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:86 | `#C4B5FD` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:91 | `#63E6BE` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:91 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:93 | `#63E6BE` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/paywall_copy.ts:93 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:95 | `#74C0FC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:95 | `#A78BFA` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:100 | `#FACC15` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:100 | `#F0ABFC` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/paywall_copy.ts:101 | `#C8FF00` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/paywall_copy.ts:101 | `#67E8F9` | значение цвета | i18n · e8fd151c5 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/premiumMemberStyles.ts:6 | `#E8C547` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/premiumMemberStyles.ts:7 | `#A9781E` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/premiumMemberStyles.ts:20 | `#6F4A00` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/premiumMemberStyles.ts:28 | `rgba(246,227,161,0.85)` | значение цвета | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/premiumMemberStyles.ts:50 | `rgba(232, 197, 71, 0.45)` | тень текста | checkpoint: снимок общего дерева по кома · 96c32bb97 · 2026-08-24 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |

### 5 · Карточки

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| app/community_packs/ugcCardThemePresets.ts:124 | `#C8FF00` | значение цвета | i18n · 838b12267 · 2026-10-11 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/community_packs/ugcCardThemePresets.ts:124 | `#6F8C00` | значение цвета | i18n · 838b12267 · 2026-10-11 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/community_packs/ugcCardThemePresets.ts:125 | `#00D0FF` | значение цвета | i18n · 838b12267 · 2026-10-11 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/community_packs/ugcCardThemePresets.ts:125 | `#0E7490` | значение цвета | i18n · 838b12267 · 2026-10-11 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/community_packs/ugcCardThemePresets.ts:126 | `#FF006E` | значение цвета | i18n · 838b12267 · 2026-10-11 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/community_packs/ugcCardThemePresets.ts:126 | `#C01360` | значение цвета | i18n · 838b12267 · 2026-10-11 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/community_packs/ugcCardThemePresets.ts:127 | `#FBB040` | значение цвета | i18n · 838b12267 · 2026-10-11 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/community_packs/ugcCardThemePresets.ts:127 | `#B4720F` | значение цвета | i18n · 838b12267 · 2026-10-11 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/community_packs/ugcCardThemePresets.ts:128 | `#A78BFA` | значение цвета | i18n · 838b12267 · 2026-10-11 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/community_packs/ugcCardThemePresets.ts:128 | `#6D46D6` | значение цвета | i18n · 838b12267 · 2026-10-11 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/community_packs/ugcCardThemePresets.ts:129 | `#E85D3A` | значение цвета | i18n · 838b12267 · 2026-10-11 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/community_packs/ugcCardThemePresets.ts:129 | `#B8431F` | значение цвета | i18n · 838b12267 · 2026-10-11 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/flashcards/constants.ts:276 | `#4A90D9` | значение цвета | i18n · e544ce866 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/flashcards/constants.ts:276 | `#7B68EE` | значение цвета | i18n · e544ce866 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/flashcards/constants.ts:276 | `#E87D3E` | значение цвета | i18n · e544ce866 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/flashcards/constants.ts:276 | `#50BFA0` | значение цвета | i18n · e544ce866 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/flashcards/constants.ts:283 | `#4CAF72` | значение цвета | i18n · e544ce866 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/flashcards/constants.ts:284 | `#40B4E8` | значение цвета | i18n · e544ce866 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/flashcards/constants.ts:285 | `#D4A017` | значение цвета | i18n · e544ce866 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/flashcards/constants.ts:286 | `#DC6428` | значение цвета | i18n · e544ce866 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/flashcards/cardStatus.ts:22 | `#9FB4CC` | значение цвета | i18n · 552c7716c · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/flashcards/cardStatus.ts:23 | `#5AA6FF` | значение цвета | i18n · 552c7716c · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/flashcards/cardStatus.ts:24 | `#F5C842` | значение цвета | i18n · 552c7716c · 2026-10-17 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/flashcards/cardStatus.ts:25 | `#35D07F` | значение цвета | i18n · 552c7716c · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/flashcards/cardStatus.ts:26 | `#FF6B7E` | значение цвета | i18n · 552c7716c · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/flashcards/trainingSources.ts:59 | `#7CDAFF` | значение цвета | i18n · a00f814c8 · 2026-10-18 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/flashcards/trainingSources.ts:60 | `#FFB84D` | значение цвета | i18n · a00f814c8 · 2026-10-18 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/flashcards/trainingSources.ts:61 | `#7CFF92` | значение цвета | i18n · a00f814c8 · 2026-10-18 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/flashcards/trainingSources.ts:62 | `#D6A4FF` | значение цвета | i18n · a00f814c8 · 2026-10-18 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |

### 7 · Ошибки

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| components/mistakes-panel/panelPaint.ts:14 | `#888888` | значение цвета | theme · b7fa6eacf · 2026-10-13 | `g.mutedText` |
| components/mistakes-panel/panelPaint.ts:49 | `#33333A` | значение цвета | theme · b7fa6eacf · 2026-10-13 | `g.opaqueControl` |
| components/mistakes-panel/panelPaint.ts:49 | `#2B2B31` | значение цвета | theme · b7fa6eacf · 2026-10-13 | `g.opaqueControl` |

### 8 · Профиль и настройки

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| app/profile_card_system.ts:495 | `#94A3B8` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:496 | `rgba(148,163,184,0.12)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:497 | `rgba(148,163,184,0.34)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:498 | `#CBD5E1` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.secondary` |
| app/profile_card_system.ts:499 | `#000000` | тень | i18n · d4247dd07 · 2026-10-17 | `g.dropShadow` / `g.shadowTint` |
| app/profile_card_system.ts:500 | `#4D6E9E` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:501 | `#33445E` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:504 | `#9FB4CC` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:505 | `rgba(77,110,158,0.12)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:506 | `rgba(159,180,204,0.4)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:507 | `#C7D3E2` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:508 | `#4D6E9E` | тень | i18n · d4247dd07 · 2026-10-17 | `g.dropShadow` / `g.shadowTint` |
| app/profile_card_system.ts:509 | `#4D6E9E` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:510 | `#33445E` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:513 | `#4FE0C8` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/profile_card_system.ts:514 | `rgba(18,183,158,0.13)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/profile_card_system.ts:515 | `rgba(79,224,200,0.42)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/profile_card_system.ts:516 | `#9FF3E4` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/profile_card_system.ts:517 | `#12B79E` | тень | i18n · d4247dd07 · 2026-10-17 | `g.dropShadow` / `g.shadowTint` |
| app/profile_card_system.ts:518 | `#12B79E` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/profile_card_system.ts:519 | `#0C5F55` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/profile_card_system.ts:522 | `#5AA6FF` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:523 | `rgba(46,123,255,0.14)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:524 | `rgba(90,166,255,0.44)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:525 | `#A9CBFF` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:526 | `#2E7BFF` | тень | i18n · d4247dd07 · 2026-10-17 | `g.dropShadow` / `g.shadowTint` |
| app/profile_card_system.ts:527 | `#2E7BFF` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:528 | `#1A3F8C` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:531 | `#FF6B7E` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/profile_card_system.ts:532 | `rgba(226,51,80,0.13)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/profile_card_system.ts:533 | `rgba(255,107,126,0.44)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/profile_card_system.ts:534 | `#FFAAB5` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/profile_card_system.ts:535 | `#E23350` | тень | i18n · d4247dd07 · 2026-10-17 | `g.dropShadow` / `g.shadowTint` |
| app/profile_card_system.ts:536 | `#E23350` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/profile_card_system.ts:537 | `#7A1730` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/profile_card_system.ts:540 | `#EDEFF4` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.opaqueCard` |
| app/profile_card_system.ts:541 | `rgba(199,208,222,0.1)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:542 | `rgba(237,239,244,0.42)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| app/profile_card_system.ts:543 | `#FFFFFF` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.opaqueCard` |
| app/profile_card_system.ts:544 | `#C7D0DE` | тень | i18n · d4247dd07 · 2026-10-17 | `g.dropShadow` / `g.shadowTint` |
| app/profile_card_system.ts:545 | `#C7D0DE` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:546 | `#8792A6` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:554 | `#0F1013` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:554 | `#0A0B0E` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:554 | `#070709` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:555 | `#0C0E12` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:555 | `#08090C` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:555 | `#060708` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:556 | `#08110F` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:556 | `#060C0B` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:556 | `#040807` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:557 | `#080B14` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:557 | `#06080F` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:557 | `#04050A` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:558 | `#120A0C` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:558 | `#0C0708` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:558 | `#070405` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:559 | `#0D0D0F` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:559 | `#0A0A0C` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:559 | `#08080A` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/profile_card_system.ts:568 | `rgba(255,255,255,0.06)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.hairlineSoft` |
| app/profile_card_system.ts:569 | `rgba(77,110,158,0.12)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:570 | `rgba(18,183,158,0.12)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/profile_card_system.ts:571 | `rgba(46,123,255,0.13)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/profile_card_system.ts:572 | `rgba(226,51,80,0.12)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/profile_card_system.ts:573 | `rgba(199,208,222,0.1)` | значение цвета | i18n · d4247dd07 · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:33 | `#FFFFFF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:33 | `rgba(255,255,255,0.13)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.glassEdge` |
| components/profile-card/profile_card_looks.ts:37 | `#151518` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:37 | `rgba(255,255,255,0.10)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.glassEdge` |
| components/profile-card/profile_card_looks.ts:38 | `#FFFFFF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:41 | `#0C0B10` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:41 | `rgba(214,196,255,0.55)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:42 | `#FFFFFF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:43 | `#FFD36E` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/profile-card/profile_card_looks.ts:43 | `#7BFFCF` | заливка значка | locks · 60f169487 · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/profile-card/profile_card_looks.ts:43 | `#6FB8FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:43 | `#FF7AB6` | заливка значка | locks · 60f169487 · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/profile-card/profile_card_looks.ts:43 | `#0C0B10` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:44 | `#FFE7A8` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:44 | `#B9FFE6` | заливка значка | locks · 60f169487 · 2026-10-22 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/profile-card/profile_card_looks.ts:44 | `#C9B8FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:44 | `#111111` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:48 | `#0A0907` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:48 | `rgba(233,200,130,0.62)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:49 | `#FBF3DF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:49 | `#F3E2B8` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:49 | `rgba(233,207,149,0.13)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:50 | `#FFF1C9` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:50 | `#D9B56C` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/profile-card/profile_card_looks.ts:50 | `#F6DC9C` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:50 | `#2A1F0C` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:51 | `#FFF1C9` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:51 | `#D9B56C` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/profile-card/profile_card_looks.ts:51 | `#F6DC9C` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:51 | `#2A1F0C` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:55 | `#120D1C` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:55 | `rgba(255,255,255,0.42)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/profile-card/profile_card_looks.ts:56 | `#FFFFFF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:57 | `#FFFFFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:57 | `#FFFFFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:57 | `#2A1340` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:62 | `#0D1620` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:62 | `rgba(190,236,255,0.60)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:63 | `#FFFFFF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:64 | `#F2FDFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:64 | `#A6E4FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:64 | `#FFD6F1` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:64 | `#0D1620` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:65 | `#F2FDFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:65 | `#BFEAFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:65 | `#FFE0F4` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:65 | `#0D1620` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:69 | `#05060F` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:69 | `rgba(130,150,255,0.50)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:70 | `#FFFFFF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:71 | `#6A5BFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:71 | `#00B8FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:71 | `#FFFFFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:72 | `#8B7DFF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:72 | `#4FD0FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:72 | `#06071A` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:76 | `#07030D` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:76 | `rgba(0,229,255,0.55)` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:77 | `#FFFFFF` | значение цвета | locks · 60f169487 · 2026-10-22 | `g.opaqueCard` |
| components/profile-card/profile_card_looks.ts:77 | `rgba(255,79,163,0.6)` | значение цвета | locks · 60f169487 · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/profile-card/profile_card_looks.ts:78 | `#00E5FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:78 | `#00E5FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:78 | `#07030D` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/profile-card/profile_card_looks.ts:79 | `#00E5FF` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/profile-card/profile_card_looks.ts:79 | `#FF4FA3` | заливка значка | locks · 60f169487 · 2026-10-22 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/profile-card/profile_card_looks.ts:79 | `#07030D` | заливка значка | locks · 60f169487 · 2026-10-22 | `g.text` (текст) / `g.deepBase` (заливка) |

### 9 · Прочее

| Файл:строка | Цвет | Что на экране | Чей модуль (последний коммит) | Как заменить токеном |
|---|---|---|---|---|
| components/medalToastThemeStyles.ts:29 | `#D08C4A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:30 | `#72D8FF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:31 | `#F2C44A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:37 | `#FCFDF9` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.opaqueCard` |
| components/medalToastThemeStyles.ts:37 | `#E1E5DC` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.secondary` |
| components/medalToastThemeStyles.ts:38 | `#CFD6CE` | обводка | themes · 31b17106b · 2026-10-25 | `g.secondary` |
| components/medalToastThemeStyles.ts:39 | `#17201D` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/medalToastThemeStyles.ts:40 | `#52605A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:41 | `#315F50` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:42 | `#3C5A50` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:43 | `rgba(252,253,249,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.hairlineSoft` |
| components/medalToastThemeStyles.ts:43 | `rgba(217,233,225,0.92)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:43 | `rgba(252,253,249,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.hairlineSoft` |
| components/medalToastThemeStyles.ts:46 | `rgba(49,95,80,0.10)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:47 | `#D9E9E1` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:48 | `#BDC8BD` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.secondary` |
| components/medalToastThemeStyles.ts:49 | `rgba(49,95,80,0.045)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:52 | `#8B6320` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:53 | `#52605A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:54 | `#8B6320` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:57 | `rgba(139,99,32,0.24)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:58 | `rgba(82,96,90,0.20)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:59 | `rgba(139,99,32,0.28)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:64 | `rgba(26,29,44,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:64 | `rgba(1,1,2,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:65 | `rgba(143,160,255,0.28)` | обводка | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:66 | `#FFFFFF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.opaqueCard` |
| components/medalToastThemeStyles.ts:67 | `rgba(255,255,255,0.74)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/medalToastThemeStyles.ts:68 | `#8FA0FF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:69 | `#8FA0FF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:70 | `rgba(143,160,255,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:70 | `rgba(143,160,255,0.56)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:70 | `rgba(143,160,255,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:73 | `rgba(91,124,255,0.14)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:74 | `rgba(143,160,255,0.07)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:75 | `rgba(143,160,255,0.22)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:76 | `rgba(169,91,255,0.05)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:79 | `#6E7FF5` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:80 | `#B79CFF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:81 | `#FFD27A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:84 | `rgba(110,127,245,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:85 | `rgba(183,156,255,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:86 | `rgba(255,210,122,0.34)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:91 | `rgba(35,26,18,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:91 | `rgba(1,1,2,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:92 | `rgba(255,204,85,0.28)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:93 | `#FFFFFF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.opaqueCard` |
| components/medalToastThemeStyles.ts:94 | `rgba(255,255,255,0.74)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/medalToastThemeStyles.ts:95 | `#FFCC55` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:96 | `#FFCC55` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:97 | `rgba(255,204,85,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:97 | `rgba(255,204,85,0.56)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:97 | `rgba(255,204,85,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:100 | `rgba(255,176,61,0.14)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:101 | `rgba(255,204,85,0.07)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:102 | `rgba(255,204,85,0.22)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:103 | `rgba(255,61,110,0.05)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/medalToastThemeStyles.ts:106 | `#F5801E` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/medalToastThemeStyles.ts:107 | `#FFC894` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/medalToastThemeStyles.ts:108 | `#FFCB5C` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:111 | `rgba(245,128,30,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/medalToastThemeStyles.ts:112 | `rgba(255,200,148,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/medalToastThemeStyles.ts:113 | `rgba(255,203,92,0.34)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:118 | `rgba(21,33,27,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:118 | `rgba(1,1,2,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:119 | `rgba(61,232,166,0.28)` | обводка | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:120 | `#FFFFFF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.opaqueCard` |
| components/medalToastThemeStyles.ts:121 | `rgba(255,255,255,0.74)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/medalToastThemeStyles.ts:122 | `#3DE8A6` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:123 | `#3DE8A6` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:124 | `rgba(61,232,166,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:124 | `rgba(61,232,166,0.56)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:124 | `rgba(61,232,166,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:127 | `rgba(46,230,160,0.14)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:128 | `rgba(61,232,166,0.07)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:129 | `rgba(61,232,166,0.22)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:130 | `rgba(46,157,255,0.05)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:133 | `#1FC487` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:134 | `#9FF2D4` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:135 | `#F2D27A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:138 | `rgba(31,196,135,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:139 | `rgba(159,242,212,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:140 | `rgba(242,210,122,0.34)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:145 | `rgba(28,32,16,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:145 | `rgba(1,1,2,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:146 | `rgba(198,255,52,0.28)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:147 | `#FFFFFF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.opaqueCard` |
| components/medalToastThemeStyles.ts:148 | `rgba(255,255,255,0.74)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/medalToastThemeStyles.ts:149 | `#C6FF34` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:150 | `#C6FF34` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:151 | `rgba(198,255,52,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:151 | `rgba(198,255,52,0.56)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:151 | `rgba(198,255,52,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:154 | `rgba(168,232,30,0.14)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:155 | `rgba(198,255,52,0.07)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:156 | `rgba(198,255,52,0.22)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:157 | `rgba(46,224,140,0.05)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:160 | `#96CC10` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:161 | `#E2FF7A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:162 | `#FFE85C` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:165 | `rgba(150,204,16,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:166 | `rgba(226,255,122,0.3)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:167 | `rgba(255,232,92,0.34)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:172 | `rgba(34,33,64,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:172 | `rgba(10,9,18,0.97)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:173 | `rgba(200,195,255,0.26)` | обводка | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:174 | `#F1EFFF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.opaqueCard` |
| components/medalToastThemeStyles.ts:175 | `rgba(183,179,217,0.76)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:176 | `#C8C3FF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:177 | `#B7B3D9` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:178 | `rgba(200,195,255,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:178 | `rgba(200,195,255,0.50)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:178 | `rgba(200,195,255,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:181 | `rgba(200,195,255,0.12)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:182 | `rgba(200,195,255,0.06)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:183 | `rgba(200,195,255,0.20)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:184 | `rgba(228,225,255,0.045)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:188 | `rgba(208,140,74,0.30)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:189 | `rgba(114,216,255,0.30)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:190 | `rgba(255,197,61,0.32)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:195 | `rgba(13,45,25,0.96)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:195 | `rgba(4,17,8,0.96)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:196 | `rgba(71,200,112,0.28)` | обводка | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:197 | `#F0F7F2` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.opaqueCard` |
| components/medalToastThemeStyles.ts:198 | `rgba(194,226,198,0.76)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:199 | `#47C870` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:200 | `#F4C28A` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/medalToastThemeStyles.ts:201 | `rgba(71,200,112,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:201 | `rgba(71,200,112,0.64)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:201 | `rgba(71,200,112,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:204 | `rgba(71,200,112,0.14)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:205 | `rgba(71,200,112,0.08)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:206 | `rgba(71,200,112,0.22)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:207 | `rgba(71,200,112,0.11)` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:211 | `rgba(208,140,74,0.34)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:212 | `rgba(114,216,255,0.32)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:213 | `rgba(242,196,74,0.36)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:218 | `rgba(31,27,17,0.98)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:218 | `rgba(4,4,3,0.98)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:219 | `rgba(214,179,90,0.36)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:220 | `#FFF7DF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:221 | `rgba(228,204,148,0.78)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:222 | `#D6B35A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:223 | `#F4C28A` | значение цвета | themes · 31b17106b · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/medalToastThemeStyles.ts:224 | `rgba(214,179,90,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:224 | `rgba(214,179,90,0.78)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:224 | `rgba(214,179,90,0)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:227 | `rgba(214,179,90,0.16)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:228 | `rgba(214,179,90,0.065)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:229 | `rgba(214,179,90,0.25)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:230 | `rgba(214,179,90,0.095)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:233 | `#D99A5B` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:234 | `#72D8FF` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:235 | `#F2C44A` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:238 | `rgba(217,154,91,0.34)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:239 | `rgba(114,216,255,0.32)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:240 | `rgba(242,196,74,0.46)` | значение цвета | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `#F4ECD8` | обводка | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:243 | `#C9A84C` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `#E3CC88` | обводка | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:243 | `#C98B55` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `#97A9A1` | обводка | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:243 | `#C9A84C` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(30,34,20,0.98)` | обводка | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:243 | `rgba(4,5,3,0.98)` | обводка | themes · 31b17106b · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0.18)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(207,197,171,0.78)` | обводка | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0.34)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0.10)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0.06)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0.16)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(142,170,114,0.08)` | обводка | themes · 31b17106b · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/medalToastThemeStyles.ts:243 | `rgba(201,139,85,0.26)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/medalToastThemeStyles.ts:243 | `rgba(151,169,161,0.22)` | обводка | themes · 31b17106b · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/medalToastThemeStyles.ts:243 | `rgba(201,168,76,0.30)` | обводка | themes · 31b17106b · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:39 | `#193025` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:39 | `#13241C` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:39 | `#09110D` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:40 | `rgba(116,232,156,0.28)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:41 | `rgba(71,200,112,0.22)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:42 | `#D9FFE5` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:43 | `#FFFFFF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:44 | `#B8D9C2` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:45 | `rgba(116,232,156,0.13)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:46 | `rgba(116,232,156,0.22)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:47 | `#58CC89` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:48 | `#58CC89` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:49 | `#07110A` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:50 | `#47C870` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:53 | `#242424` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:53 | `#151515` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:53 | `#070707` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:54 | `rgba(230,190,103,0.42)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:55 | `rgba(214,179,90,0.15)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:56 | `#FFF0BF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:57 | `#FFF8E8` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:58 | `#D2BE91` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:59 | `rgba(230,190,103,0.14)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:60 | `rgba(230,190,103,0.34)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:61 | `#D6B35A` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:62 | `#D6B35A` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:63 | `#1B1205` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:64 | `#D6B35A` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:69 | `#24281A` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:69 | `#11140D` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:69 | `#090A08` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:70 | `rgba(201,168,76,0.28)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:71 | `rgba(201,168,76,0.13)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:72 | `#E3CC88` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:73 | `#F4ECD8` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:74 | `#C8C2AC` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:75 | `rgba(201,168,76,0.14)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:76 | `rgba(201,168,76,0.26)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:77 | `#C9A84C` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:78 | `#C9A84C` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:79 | `#111109` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:80 | `#000000` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:83 | `#FCFDF9` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:83 | `#F0F1EC` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:83 | `#E1E5DC` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.secondary` |
| app/daily_phrase_chrome.ts:84 | `#CFD6CE` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.secondary` |
| app/daily_phrase_chrome.ts:85 | `rgba(49,95,80,0.10)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:86 | `#3C5A50` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:87 | `#17201D` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:88 | `#52605A` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:89 | `#D9E9E1` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:90 | `#BDC8BD` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.secondary` |
| app/daily_phrase_chrome.ts:91 | `#315F50` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:92 | `#315F50` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:93 | `#FCFDF9` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:94 | `rgba(35,50,43,0.14)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:97 | `#1A1D2C` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:97 | `#0D0E16` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:97 | `#050506` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:98 | `rgba(143,160,255,0.42)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:99 | `rgba(91,124,255,0.16)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:100 | `#C9D2FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:101 | `#FFFFFF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:102 | `#A9AECB` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:103 | `rgba(143,160,255,0.15)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:104 | `rgba(143,160,255,0.31)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:105 | `#8FA0FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:106 | `#8FA0FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:107 | `#0D1030` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:108 | `#8FA0FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:111 | `#231A12` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:111 | `#0F0B07` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:111 | `#050506` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:112 | `rgba(255,204,85,0.42)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:113 | `rgba(255,138,42,0.16)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/daily_phrase_chrome.ts:114 | `#FFE9B8` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:115 | `#FFFFFF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:116 | `#C9B4A4` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:117 | `rgba(255,204,85,0.15)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:118 | `rgba(255,204,85,0.31)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:119 | `#FFCC55` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:120 | `#FFCC55` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:121 | `#2A1A02` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:122 | `#FFCC55` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:125 | `#15211B` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:125 | `#090F0C` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:125 | `#050506` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:126 | `rgba(61,232,166,0.42)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:127 | `rgba(46,230,160,0.16)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:128 | `#9FF2CF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:129 | `#FFFFFF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:130 | `#A7C0B5` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:131 | `rgba(61,232,166,0.15)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:132 | `rgba(61,232,166,0.31)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:133 | `#3DE8A6` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:134 | `#3DE8A6` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:135 | `#052A1C` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:136 | `#3DE8A6` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:139 | `#1C2010` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:139 | `#0C0E06` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:139 | `#050506` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:140 | `rgba(198,255,52,0.42)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:141 | `rgba(168,232,30,0.16)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/daily_phrase_chrome.ts:142 | `#E8FF96` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:143 | `#FFFFFF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:144 | `#BFC6A3` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:145 | `rgba(198,255,52,0.15)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:146 | `rgba(198,255,52,0.31)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:147 | `#C6FF34` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:148 | `#C6FF34` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:149 | `#182002` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:150 | `#C6FF34` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/daily_phrase_chrome.ts:153 | `#222140` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:153 | `#17162B` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:153 | `#0A0912` | градиент | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/daily_phrase_chrome.ts:154 | `rgba(200,195,255,0.34)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:155 | `rgba(200,195,255,0.20)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:156 | `#E4E1FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:157 | `#FFFFFF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.opaqueCard` |
| app/daily_phrase_chrome.ts:158 | `#B7B3D9` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:159 | `rgba(200,195,255,0.13)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:160 | `rgba(200,195,255,0.24)` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:161 | `#C8C3FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:162 | `#C8C3FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:163 | `#17162B` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/daily_phrase_chrome.ts:164 | `#C8C3FF` | значение цвета | chore: общий снимок PhraseMan 2.0 — рабо · efe19ae9d · 2026-09-30 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:22 | `#5EA3FF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:22 | `#1D5FC4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:22 | `rgba(94,163,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:23 | `#5EA3FF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:23 | `#1D5FC4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:23 | `rgba(94,163,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:25 | `#34C2C2` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:25 | `#17706F` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:25 | `rgba(52,194,194,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:26 | `#34C2C2` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:26 | `#17706F` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:26 | `rgba(52,194,194,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:28 | `#B68CFF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:28 | `#6D3FC4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:28 | `rgba(182,140,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:29 | `#B68CFF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:29 | `#6D3FC4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:29 | `rgba(182,140,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:31 | `#8AA0FF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:31 | `#4356C4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:31 | `rgba(138,160,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:32 | `#8AA0FF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:32 | `#4356C4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:32 | `rgba(138,160,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:34 | `#4FD1C5` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:34 | `#177067` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:34 | `rgba(79,209,197,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:36 | `#F4B452` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/theory_topic_accents.ts:36 | `#8A5A12` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:36 | `rgba(244,180,82,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/theory_topic_accents.ts:38 | `#FF8E72` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:38 | `#AE3A22` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:38 | `rgba(255,142,114,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:39 | `#FF8E72` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:39 | `#AE3A22` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:39 | `rgba(255,142,114,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:41 | `#F2A65A` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/theory_topic_accents.ts:41 | `#8C5214` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:41 | `rgba(242,166,90,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/theory_topic_accents.ts:42 | `#F2A65A` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/theory_topic_accents.ts:42 | `#8C5214` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:42 | `rgba(242,166,90,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/theory_topic_accents.ts:44 | `#F08FB8` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:44 | `#A83A6E` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:44 | `rgba(240,143,184,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:45 | `#F08FB8` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:45 | `#A83A6E` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:45 | `rgba(240,143,184,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:47 | `#62C3FF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:47 | `#175E8A` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:47 | `rgba(98,195,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:48 | `#62C3FF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:48 | `#175E8A` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:48 | `rgba(98,195,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:50 | `#A98CFF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:50 | `#5F44C4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:50 | `rgba(169,140,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:51 | `#A98CFF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:51 | `#5F44C4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:51 | `rgba(169,140,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:53 | `#5BD6A8` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:53 | `#1C7154` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:53 | `rgba(91,214,168,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:54 | `#5BD6A8` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:54 | `#1C7154` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:54 | `rgba(91,214,168,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:59 | `#5EA3FF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:60 | `rgba(94,163,255,0.10)` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:61 | `#1D5FC4` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/theory_topic_accents.ts:89 | `#dc5050` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/theory_topic_accents.ts:90 | `#3cb478` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/theory_topic_accents.ts:122 | `#FCFDF9` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.opaqueCard` |
| app/theory_topic_accents.ts:122 | `#FFFFFF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.opaqueCard` |
| app/theory_topic_accents.ts:122 | `#F0FAFF` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.opaqueCard` |
| app/theory_topic_accents.ts:122 | `#DCE1D8` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.secondary` |
| app/theory_topic_accents.ts:122 | `#E1E5DC` | значение цвета | feat: AI-consent flow, season pass theme · d38dd1f23 · 2026-08-05 | `g.secondary` |
| components/CleanOnboarding.tsx:1436 | `rgba(12,17,27,0.07)` | заливка значка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:1451 | `rgba(12,17,27,0.05)` | заливка значка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:1452 | `rgba(12,17,27,0.07)` | заливка значка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:1721 | `#F97316` | линия/значок | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/CleanOnboarding.tsx:1722 | `#F97316` | заливка значка | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/CleanOnboarding.tsx:1729 | `#F97316` | заливка значка | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/CleanOnboarding.tsx:1734 | `#07110A` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:1872 | `#8CD39B` | градиент | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/CleanOnboarding.tsx:1873 | `#8CD39B` | градиент | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/CleanOnboarding.tsx:1876 | `#F29A5C` | градиент | scroll · f838e9af1 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/CleanOnboarding.tsx:1877 | `#F29A5C` | градиент | scroll · f838e9af1 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/CleanOnboarding.tsx:1880 | `#FFD27A` | градиент | scroll · f838e9af1 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/CleanOnboarding.tsx:1881 | `#FFD27A` | градиент | scroll · f838e9af1 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/CleanOnboarding.tsx:1884 | `#35604F` | заливка значка | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/CleanOnboarding.tsx:1892 | `rgba(255,255,255,0.92)` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:1893 | `rgba(255,255,255,0.92)` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:1894 | `rgba(255,255,255,0.92)` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:1918 | `#34C759` | заливка | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/CleanOnboarding.tsx:1919 | `#FFFFFF` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| components/CleanOnboarding.tsx:1924 | `#FF375F` | заливка | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/CleanOnboarding.tsx:1925 | `#FFFFFF` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| components/CleanOnboarding.tsx:2380 | `#FF7A59` | значение цвета | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/CleanOnboarding.tsx:2380 | `#FFC93C` | значение цвета | scroll · f838e9af1 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/CleanOnboarding.tsx:2380 | `#3ECF8E` | значение цвета | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/CleanOnboarding.tsx:2380 | `#5B8DEF` | значение цвета | scroll · f838e9af1 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/CleanOnboarding.tsx:2380 | `#B48CFF` | значение цвета | scroll · f838e9af1 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/CleanOnboarding.tsx:2380 | `#FF5C8A` | значение цвета | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/CleanOnboarding.tsx:2490 | `#07110A` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:4861 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:4874 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:4883 | `rgba(20, 22, 28, 0.45)` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:4895 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5067 | `rgba(12,17,27,0.22)` | окраска значка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:5340 | `#17181C` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5342 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5342 | `#17181C` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5348 | `#35604F` | заливка | scroll · f838e9af1 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/CleanOnboarding.tsx:5366 | `#17181C` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5373 | `rgba(255,255,255,0.92)` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:5383 | `#FFFFFF` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| components/CleanOnboarding.tsx:5391 | `rgba(255,255,255,0.85)` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:5409 | `rgba(255,255,255,0.92)` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:5414 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5414 | `rgba(255,255,255,0.92)` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:5433 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5440 | `#2A303B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.opaqueControl` |
| components/CleanOnboarding.tsx:5447 | `#6B7280` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/CleanOnboarding.tsx:5463 | `rgba(255,255,255,0.78)` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:5469 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:5469 | `rgba(255,255,255,0.78)` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/CleanOnboarding.tsx:5490 | `rgba(12,17,27,0.14)` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:5687 | `rgba(10,12,18,0.55)` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:5975 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6020 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6033 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6068 | `#F59E0B` | разделитель | scroll · f838e9af1 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/CleanOnboarding.tsx:6077 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6114 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6165 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6236 | `#07110A` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6329 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/CleanOnboarding.tsx:6333 | `rgba(20, 22, 28, 0.45)` | заливка | scroll · f838e9af1 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/CleanOnboarding.tsx:6348 | `#0C111B` | текст или значок | scroll · f838e9af1 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:14 | `#070C08` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:15 | `#101710` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:16 | `#17241A` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:17 | `#1D2E22` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:18 | `#F0F7F2` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.opaqueCard` |
| components/ui/v2_theme.ts:19 | `#8AB49A` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:20 | `#5B7A67` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:21 | `#47C870` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:22 | `#47C870` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:23 | `#47C870` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:24 | `rgba(71,200,112,0.14)` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:25 | `#042010` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:26 | `#1E6B3A` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:27 | `#FFD43B` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:28 | `rgba(255,212,59,0.12)` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:29 | `#B98A1B` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:30 | `#7D5F0E` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:31 | `#C9D4DC` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.secondary` |
| components/ui/v2_theme.ts:32 | `#D29A6A` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:33 | `#FF5B6C` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:34 | `rgba(255,91,108,0.12)` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:35 | `#7A2530` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:36 | `#FB923C` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:40 | `#8AB49A` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:41 | `#FFD43B` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:42 | `#FF5B6C` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:43 | `#3B82F6` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:44 | `#47C870` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:45 | `#FB923C` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:46 | `#47C870` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ui/v2_theme.ts:47 | `#FFD43B` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:57 | `rgba(255,255,255,0.045)` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.hairlineSoft` |
| components/ui/v2_theme.ts:162 | `#FFFFFF` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.opaqueCard` |
| components/ui/v2_theme.ts:163 | `#000000` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:173 | `#D19E1D` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:173 | `#FFD86E` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:173 | `#E3A812` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:174 | `#93A1AE` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:174 | `#E9EFF5` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.secondary` |
| components/ui/v2_theme.ts:174 | `#8B98A4` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.mutedText` |
| components/ui/v2_theme.ts:175 | `#A96F3D` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:175 | `#E7B587` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:175 | `#9C6434` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/ui/v2_theme.ts:177 | `#241A05` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:179 | `#F6E3A1` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:179 | `#E9C86A` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:179 | `#C99B33` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:180 | `#7A5C14` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:181 | `#231A04` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/ui/v2_theme.ts:245 | `rgba(255,255,255,0.12)` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.glassEdge` |
| components/ui/v2_theme.ts:253 | `#F0DEA5` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:254 | `#C9A84C` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/ui/v2_theme.ts:255 | `#9C7A29` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/ui/v2_theme.ts:256 | `rgba(255,255,255,0.34)` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.bevelHi` |
| components/ui/v2_theme.ts:261 | `#FFFFFF` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.opaqueCard` |
| components/ui/v2_theme.ts:266 | `#07110A` | значение цвета | theme · 1a6676dc2 · 2026-10-12 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/onboarding_aha/aha_theme.ts:7 | `#050711` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/onboarding_aha/aha_theme.ts:7 | `#080914` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/onboarding_aha/aha_theme.ts:7 | `#02030A` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/onboarding_aha/aha_theme.ts:9 | `#E3ECFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:9 | `#7B8CFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:9 | `#C95CFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:11 | `#3549E8` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:12 | `#07111F` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/onboarding_aha/aha_theme.ts:13 | `#293044` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:15 | `#8AB9FF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:15 | `#9B7CFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:15 | `#E36EFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:17 | `#F4F6FF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.opaqueCard` |
| components/onboarding_aha/aha_theme.ts:18 | `rgba(244,246,255,0.72)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/onboarding_aha/aha_theme.ts:19 | `rgba(244,246,255,0.45)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/onboarding_aha/aha_theme.ts:21 | `rgba(255,255,255,0.08)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.glassEdge` |
| components/onboarding_aha/aha_theme.ts:22 | `rgba(255,255,255,0.14)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.glassEdge` |
| components/onboarding_aha/aha_theme.ts:23 | `#121525` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/onboarding_aha/aha_theme.ts:25 | `rgba(255,255,255,0.06)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.hairlineSoft` |
| components/onboarding_aha/aha_theme.ts:26 | `rgba(255,255,255,0.14)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.glassEdge` |
| components/onboarding_aha/aha_theme.ts:27 | `rgba(255,255,255,0.04)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.hairlineSoft` |
| components/onboarding_aha/aha_theme.ts:28 | `rgba(255,255,255,0.20)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.bevelHi` |
| components/onboarding_aha/aha_theme.ts:30 | `rgba(255,255,255,0.08)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.glassEdge` |
| components/onboarding_aha/aha_theme.ts:31 | `rgba(255,255,255,0.18)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.bevelHi` |
| components/onboarding_aha/aha_theme.ts:32 | `rgba(133,143,255,0.18)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:33 | `#AAB5FF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:35 | `rgba(227,110,255,0.65)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:38 | `rgba(244,246,255,0.40)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/onboarding_aha/aha_theme.ts:39 | `#F4F6FF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.opaqueCard` |
| components/onboarding_aha/aha_theme.ts:40 | `#B9A8FF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:43 | `#4ADE80` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/onboarding_aha/aha_theme.ts:44 | `#FBBF24` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| components/onboarding_aha/aha_theme.ts:45 | `rgba(244,246,255,0.35)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/onboarding_aha/aha_theme.ts:48 | `rgba(62,98,255,0.18)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:49 | `rgba(198,92,255,0.14)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:52 | `rgba(2,3,10,0.88)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/onboarding_aha/aha_theme.ts:53 | `rgba(2,3,10,0.30)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/onboarding_aha/aha_theme.ts:54 | `rgba(2,3,10,0.92)` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/onboarding_aha/aha_theme.ts:56 | `#9B7CFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:57 | `#E36EFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:59 | `#E3ECFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:59 | `#7B8CFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:59 | `#C95CFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:59 | `#8AB9FF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:59 | `#E36EFF` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| components/onboarding_aha/aha_theme.ts:59 | `#4ADE80` | значение цвета | onboarding-aha · 0381e2476 · 2026-07-02 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/lingman_youtube_chrome.ts:38 | `#2A2818` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/lingman_youtube_chrome.ts:38 | `#211F15` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/lingman_youtube_chrome.ts:38 | `#000000` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/lingman_youtube_chrome.ts:41 | `#F2C48D` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:42 | `rgba(242,196,141,0.14)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:43 | `rgba(242,196,141,0.08)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:44 | `#151008` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/lingman_youtube_chrome.ts:45 | `rgba(23,20,16,0.90)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/lingman_youtube_chrome.ts:46 | `rgba(242,196,141,0.18)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:47 | `rgba(242,196,141,0.12)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:48 | `#151008` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/lingman_youtube_chrome.ts:49 | `rgba(242,196,141,0.08)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:50 | `rgba(242,196,141,0.18)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:51 | `rgba(242,196,141,0.10)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:52 | `rgba(242,196,141,0.24)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/lingman_youtube_chrome.ts:53 | `#000000` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/lingman_youtube_chrome.ts:71 | `rgba(15,18,25,0.88)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/lingman_youtube_chrome.ts:71 | `rgba(255,255,255,0.94)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| app/lingman_youtube_chrome.ts:72 | `rgba(255,255,255,0.10)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.glassEdge` |
| app/lingman_youtube_chrome.ts:72 | `rgba(15,23,42,0.10)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/lingman_youtube_chrome.ts:75 | `rgba(255,255,255,0.08)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.glassEdge` |
| app/lingman_youtube_chrome.ts:75 | `rgba(255,255,255,0.78)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| app/lingman_youtube_chrome.ts:76 | `rgba(255,255,255,0.10)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.glassEdge` |
| app/lingman_youtube_chrome.ts:76 | `rgba(15,23,42,0.10)` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/lingman_youtube_chrome.ts:79 | `#000000` | значение цвета | feat: add olive theme and personal card  · 443ba4833 · 2026-08-13 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/_layout.tsx:631 | `rgba(255,224,144,0.34)` | значение цвета | nav · f1094bec8 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/_layout.tsx:631 | `rgba(163,104,24,0.16)` | значение цвета | nav · f1094bec8 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/_layout.tsx:631 | `rgba(18,14,6,0.08)` | значение цвета | nav · f1094bec8 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/_layout.tsx:633 | `rgba(122,75,12,0.44)` | значение цвета | nav · f1094bec8 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/_layout.tsx:633 | `rgba(54,34,8,0.30)` | значение цвета | nav · f1094bec8 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/_layout.tsx:633 | `rgba(11,9,5,0.12)` | значение цвета | nav · f1094bec8 · 2026-10-25 | `g.scrim` / `g.mediaScrim` (на медиа) |
| app/_layout.tsx:634 | `#FFF0B5` | значение цвета | nav · f1094bec8 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/_layout.tsx:634 | `#E2A923` | значение цвета | nav · f1094bec8 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/_layout.tsx:635 | `#3F2C08` | значение цвета | nav · f1094bec8 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/_layout.tsx:844 | `rgba(255,255,255,0.85)` | градиент | nav · f1094bec8 · 2026-10-25 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| app/_layout.tsx:4034 | `#06141B` | заливка | nav · f1094bec8 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/_layout.tsx:4035 | `#121826` | заливка | nav · f1094bec8 · 2026-10-25 | `g.text` (текст) / `g.deepBase` (заливка) |
| app/_layout.tsx:4035 | `#7f1d1d` | заливка | nav · f1094bec8 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/_layout.tsx:4036 | `#f87171` | текст или значок | nav · f1094bec8 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/_layout.tsx:4037 | `#fff` | текст или значок | nav · f1094bec8 · 2026-10-25 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/_layout.tsx:4040 | `#9ca3af` | текст или значок | nav · f1094bec8 · 2026-10-25 | `g.secondary` |
| app/_layout.tsx:4045 | `#1f2937` | заливка | nav · f1094bec8 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/_layout.tsx:4047 | `#fff` | текст или значок | nav · f1094bec8 · 2026-10-25 | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| app/_layout.tsx:4088 | `rgb(174,170,161)` | текст или значок | nav · f1094bec8 · 2026-10-25 | `g.secondary` |
| app/pos_workout_engine.ts:300 | `#7C3AED` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/pos_workout_engine.ts:326 | `#F97316` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/pos_workout_engine.ts:352 | `#22C55E` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/pos_workout_engine.ts:378 | `#38BDF8` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/pos_workout_engine.ts:404 | `#EC4899` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/pos_workout_engine.ts:430 | `#A3E635` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/pos_workout_engine.ts:456 | `#F59E0B` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/pos_workout_engine.ts:482 | `#14B8A6` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/pos_workout_engine.ts:509 | `#FACC15` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/pos_workout_engine.ts:535 | `#14B8A6` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/pos_workout_engine.ts:561 | `#0EA5E9` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/pos_workout_engine.ts:587 | `#818CF8` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/pos_workout_engine.ts:613 | `#06B6D4` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/pos_workout_engine.ts:639 | `#C084FC` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/pos_workout_engine.ts:665 | `#F43F5E` | значение цвета | l10n · f305f6ed6 · 2026-10-25 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/medal_utils.ts:368 | `#CD7F32` | значение цвета | fix: R58 #27 #33 #34 #40 — lesson finish · eee340a59 · 2026-10-15 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/medal_utils.ts:369 | `#C0C0C0` | значение цвета | fix: R58 #27 #33 #34 #40 — lesson finish · eee340a59 · 2026-10-15 | `g.secondary` |
| app/medal_utils.ts:370 | `#FFD700` | значение цвета | fix: R58 #27 #33 #34 #40 — lesson finish · eee340a59 · 2026-10-15 | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| app/medal_utils.ts:371 | `#E53935` | значение цвета | fix: R58 #27 #33 #34 #40 — lesson finish · eee340a59 · 2026-10-15 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/medal_utils.ts:372 | `#50C878` | значение цвета | fix: R58 #27 #33 #34 #40 — lesson finish · eee340a59 · 2026-10-15 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/medal_utils.ts:373 | `#4FC3F7` | значение цвета | fix: R58 #27 #33 #34 #40 — lesson finish · eee340a59 · 2026-10-15 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/medal_utils.ts:426 | `rgba(255,255,255,0.85)` | значение цвета | fix: R58 #27 #33 #34 #40 — lesson finish · eee340a59 · 2026-10-15 | `g.mediaInkSoft` (на медиа) / `g.text` + альфа |
| components/UpdateModal.tsx:243 | `rgba(255,255,255,0.28)` | градиент | ts · 507732250 · 2026-10-18 | `g.bevelHi` |
| components/UpdateModal.tsx:243 | `rgba(255,255,255,0)` | градиент | ts · 507732250 · 2026-10-18 | `g.hairlineSoft` |
| components/UpdateModal.tsx:311 | `rgba(0,0,0,0.68)` | заливка | ts · 507732250 · 2026-10-18 | `g.scrim` / `g.scrimStrong` (или theme-exempt: затемнение) |
| components/UpdateModal.tsx:321 | `#000000` | тень | ts · 507732250 · 2026-10-18 | `g.dropShadow` / `g.shadowTint` |
| components/UpdateModal.tsx:355 | `#000000` | тень | ts · 507732250 · 2026-10-18 | `g.dropShadow` / `g.shadowTint` |
| app/_pos_analytics_audit.tsx:129 | `#22C55E` | значение цвета | 2.0 · 3591d0115 · 2026-10-01 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| app/_pos_analytics_audit.tsx:129 | `#FB7185` | значение цвета | 2.0 · 3591d0115 · 2026-10-01 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/_pos_analytics_audit.tsx:167 | `#FB7185` | значение цвета | 2.0 · 3591d0115 · 2026-10-01 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| app/_pos_analytics_audit.tsx:167 | `#22C55E` | значение цвета | 2.0 · 3591d0115 · 2026-10-01 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/ForceUpdateGate.tsx:493 | `rgba(0,0,0,0.68)` | заливка | ts · 507732250 · 2026-10-18 | `g.scrim` / `g.mediaScrim` (на медиа) |
| components/ForceUpdateGate.tsx:637 | `#000000` | тень | ts · 507732250 · 2026-10-18 | `g.dropShadow` / `g.shadowTint` |
| components/ForceUpdateGate.tsx:679 | `#000000` | тень | ts · 507732250 · 2026-10-18 | `g.dropShadow` / `g.shadowTint` |
| components/onboarding_aha/SpeechBeat.tsx:48 | `#FF6E78` | значение цвета | речь · e6392a5a7 · 2026-10-15 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/onboarding_aha/SpeechBeat.tsx:48 | `#FF4A55` | значение цвета | речь · e6392a5a7 · 2026-10-15 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/onboarding_aha/SpeechBeat.tsx:48 | `#E5484D` | значение цвета | речь · e6392a5a7 · 2026-10-15 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/homeNotificationBadge.ts:1 | `#EF4444` | значение цвета | admin · c65476519 · 2026-07-03 | `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| components/homeNotificationBadge.ts:2 | `#FFFFFF` | значение цвета | admin · c65476519 · 2026-07-03 | `g.opaqueCard` |
| app/language_welcome.tsx:301 | `#293044` | градиент | back · 8317a2ffc · 2026-10-17 | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| app/notifications.ts:150 | `#06141B` | значение цвета | video · 4269259ee · 2026-10-21 | `g.text` (текст) / `g.deepBase` (заливка) |
| components/DailyPhraseCard.tsx:1294 | `#22C55E` | текст или значок | home · 1da903c7a · 2026-10-23 | `semanticInk(g).goodText` (текст) / `g.good` (значок) |
| components/GlobalBroadcastModal.tsx:83 | `rgba(0,0,0,0.62)` | значение цвета | i18n · 31fa965f7 · 2026-10-17 | `g.scrim` / `g.scrimStrong` (или theme-exempt: затемнение) |
| components/onboarding_aha/aha_ui.tsx:183 | `rgba(255,255,255,0.28)` | обводка | checkpoint: preserve current mobile work · 2fba54828 · 2026-07-15 | `g.bevelHi` |

## Уточнение после проверки (25.10, по раздаче координатора)

- **`app/daily_phrase_chrome.ts` (126) — мёртвый код, а не живой долг.** Единственный показ «Фразы дня» — `app/(tabs)/home.tsx:2943`, в варианте
  `homeV2`, а он рисуется палитрой 2.0 (`useV2Palette`), не таблицей. Ветки с `dailyPhraseChromeFor` в `DailyPhraseCard` (плашка и
  `homeAdditional`) не вызываются. Таблицу держат только тесты `daily_phrase_chrome`, `daily_phrase_quest_card_contract` и
  `sage_porcelain_surface_chrome_contract`. Это в уборку вместе со старыми вариантами карточки, перекрашивать нечего.
- **Окно званий в `app/(tabs)/home.tsx` (2955, 3102, 3107, 3128) — не открывается:** `setTitleModalVisible(true)` нигде не вызывается.
  В уборку.
- **`components/home/HomeMistakesLockedSheet.tsx` — не импортируется с 21.09** (см. комментарий в `home.tsx:137`). В уборку.
- **Сцена Главной:** цвета вынесены в `components/home/v2/scene/home_scene_ink.ts` (`HOME_SCENE_INK`, по образцу `SPIRE_SCENE_INK`), подключают
  Моменты. Попутно: в `today_scene/TodaySceneView.tsx:240` надзаголовок ещё белый 86 % — с модулем он станет белым 100 %, как у обычной и
  особых сцен.
