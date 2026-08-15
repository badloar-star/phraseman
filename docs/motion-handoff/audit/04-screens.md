# 04 — Инвентаризация всех 158 экранов + система переходов и состояний

Кодовая база: `/root/pm2` (phraseman v1.5.53, Expo SDK 54, `newArchEnabled: true` — `app.json:11`).
Обследовано: 158 `.tsx` в `app/` (140 885 строк), плюс движковые файлы в `components/` и `constants/`.

> Примечание о полноте снимка: в контейнере лежат только `app/`, `components/`, `constants/`, `hooks/`.
> Папок `modules/`, `docs/`, `ux-audit/` нет — где экран уходит в `../modules/...`, это отмечено явно.

---

## 0. TL;DR — семь системных дыр движения

| # | Что | Где | Последствие |
|---|-----|-----|-------------|
| 1 | Все фоновые анимации выключены compile-time константой | `components/ScreenGradient.tsx:22` → `SCREEN_GRADIENT_MOTION_ENABLED = false` | Орбы, кино-блум, золотая ткань, частицы — 837 строк мёртвой анимации. Фон **абсолютно статичен** на всех 12 темах |
| 2 | Кроссфейд фона при смене темы выключен | `components/backgroundTransition.tsx:9` → `FABRIC_BACKGROUND_TRANSITIONS_ENABLED = false` | Смена темы = мгновенная подмена всей палитры. На экране, чья единственная задача — показать красоту темы (`settings_themes.tsx`, 423 строки, **0 анимаций**) |
| 3 | Глобальный переход между экранами — 140 мс `fade` | `app/_layout.tsx:3117-3121` + `app/config.ts:160` (`ENABLE_SCREEN_TRANSITIONS` требует env-флага, в проде не задан) | Ни глубины, ни направления, ни иерархии. Push и pop выглядят одинаково. Возврат не читается как «назад» |
| 4 | Арт-подложки экранов игнорируют собственное имя | `components/AppArtBackdrop.tsx:52` → `void name;` | 14 именованных подложек (`home`, `exam`, `flashcards`, `shardsShop`…) и полный роутинг-реестр `appArtBackdropRegistry.ts` рисуют **один и тот же** скрим. Идентичность экрана по фону утрачена |
| 5 | 90 из 158 файлов не содержат ни одной анимации | см. §7 | Включая `(tabs)/settings.tsx` (2341 стр.), `level_exam.tsx` (1855), `lesson_menu.tsx` (1672), `hint.tsx` (1582), `achievements_screen.tsx` (1550) |
| 6 | Переход «загрузка → контент» **нигде** не анимирован | 12 экранов со скелетонами, все — тернарный hard-swap | 25 файлов имеют `entering=`, **2** имеют `exiting=`. Контент всегда «щёлкает» на месте скелетона |
| 7 | `LayoutAnimation` мёртв на Android | `constants/layoutAnimation.ts:24-26` — ранний `return` при Fabric | Аккордеоны главной (`home.tsx:1201,1277,1291`), редактор UGC-паков — на Android прыгают мгновенно |

---

## 1. Конфиг expo-router — `app/_layout.tsx`

### 1.1 Глобальные `screenOptions` (`_layout.tsx:3134-3157`)

```
headerShown: false
contentStyle: { backgroundColor: tTheme.bgPrimary }
freezeOnBlur: true
gestureEnabled: false          ← свайп-назад ОТКЛЮЧЁН глобально
fullScreenGestureEnabled: false
...defaultScreenAnimationOptions
```

### 1.2 Какая анимация реально стоит (`_layout.tsx:3116-3127`)

```ts
const screenFadeEnabled = SCREEN_FADE_TRANSITIONS && !ENABLE_SCREEN_TRANSITIONS;
const defaultScreenAnimationOptions = ENABLE_SCREEN_TRANSITIONS
  ? { animation: 'slide_from_right', animationDuration: 220 }   // выключено
  : screenFadeEnabled
    ? { animation: 'fade', animationDuration: 140 }             // ← РЕАЛЬНЫЙ ПРОД
    : { animation: 'none', animationDuration: 0 };
```

- `app/config.ts:160` — `ENABLE_SCREEN_TRANSITIONS = process.env.EXPO_PUBLIC_SCREEN_TRANSITIONS === '1'`. Флаг **нигде не задан** (нет `.env`, нет в `app.json`, нет в `package.json`) ⇒ `false`.
- `app/config.ts:176` — `SCREEN_FADE_TRANSITIONS = process.env.EXPO_PUBLIC_SCREEN_FADE !== '0'` ⇒ `true`.
- **Итог: весь стек — `fade` 140 мс.** Slide-переходы существуют только как мёртвая ветка кода, отключённая после старой истории крашей на Android/Fabric (комментарий `_layout.tsx:3106-3115`).
- `bottomModalAnimationOptions` (`_layout.tsx:3123-3127`) объявлен, попадает в deps `useMemo` (`_layout.tsx:3284`), но **ни одному `<Stack.Screen>` не передан** — мёртвая переменная.

### 1.3 Исключения из глобальной анимации

| Экран | Опции | Файл:строка |
|---|---|---|
| `index`, `(tabs)` | `animation: 'none'` | `_layout.tsx:3159-3160` |
| `pack_opening` | `presentation:'modal', animation:'none', animationDuration:0` | `_layout.tsx:3253` — **модалка открытия пака вываливается вообще без движения** |
| `lesson_theory_v2` | `presentation:'card'` + дефолтный fade | `_layout.tsx:3172` |
| `arena_match` | `freezeOnBlur:false, gestureEnabled:false` | `_layout.tsx:3203` |
| `arena_today` | `freezeOnBlur:false, gestureEnabled:false` | `_layout.tsx:3212` |
| `exam` | `freezeOnBlur:false` | `_layout.tsx:3222` |

### 1.4 Presentation-режимы

**«Шторки разделов»** — `app/section_sheet_navigation.ts:27-29`:
```ts
SECTION_SHEET_STACK_OPTIONS = SECTION_SHEET_TRANSITIONS
  ? { presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }
  : { presentation: 'modal', gestureEnabled: true, ...fallback }
```
`SECTION_SHEET_TRANSITIONS` включён по умолчанию (`config.ts:194`, kill-switch `=0`). Применён к 13 экранам: `settings_edu`, `settings_notifications`, `settings_themes`, `settings_language`, `privacy_settings`, `ideas_submit`, `top_helpers`, `tournament_tickets`, `premium_modal`, `manage_subscription`, `account_details`, `referrals`, `promo_code_entry`, `privacy_screen`, `terms_screen`.
Это **единственные экраны в приложении с настоящим направленным переходом**. И, по иронии, именно у них внутри 0 анимаций (см. §4.N).

**Пейволы** — `components/paywall/paywallShared.tsx:91-100`:
- онбординг → `presentation:'card', animation:'none', gestureEnabled:false`;
- вне онбординга → `presentation:'modal', animation:'slide_from_bottom', gestureEnabled:true`.

### 1.5 ~20 маршрутов вообще без `<Stack.Screen>`

Задекларировано 90 экранов. Реальных роут-файлов больше. Без явной записи (наследуют дефолт `fade` 140 мс, `gestureEnabled:false`, `freezeOnBlur:true`):

`season_pass`, `max_call_prestart`, `max_call_session`, `max_voice_review`, `ai_dialog_home`, `ai_dialog_briefing`, `ai_dialog_consent_gate`, `ai_dialog_session`, `ai_companion_session`, `arena_history`, `arena_review`, `arena_tops`, `learning-v2/course`, `learning-v2/lesson/[id]`, `learning-v2/session/[id]`, `learning_v2_session_intro`, `learning_v2_session_intro_check`, `learning_v2_direct_session_player_v1`, `lesson_intro_screens`, `lesson_intro_rich`, `lesson_help_theory_ui`, `premium_modal_v2`, `referral_access_ended_modal`, `trainer_session_report`, `flashcards_market_dev`, `modal`.

Практические следствия:
- **`season_pass.tsx`** (1024 стр., монетизация) должен быть модалкой — открывается как обычный fade-экран.
- **`referral_access_ended_modal.tsx`**, **`premium_modal_v2.tsx`** — по названию модалки, по факту card-экраны без выезда.
- **`max_call_session.tsx`** (живой голосовой звонок, 1092 стр.) **не в allowlist `freezeOnBlur:false`** — в отличие от `arena_match`/`arena_today`/`exam`. Открытая поверх модалка заморозит рантайм звонка.
- **`trainer_session_report.tsx`** — экран результата с каскадом `FadeInDown` (delay 400/540/680/820 мс) выезжает как card-fade: каскад стартует уже после того, как экран «щёлкнул» на месте.

### 1.6 Стартовый сплэш — `StartupSplashHold` (`_layout.tsx:453-560`)

Лучшая анимация в приложении: вход глифа `Easing.out(Easing.back(1.4))` 520 мс, бесконечный пульс 1150+1150 мс, ворд-марк с задержкой 300 мс, проезд блика 900 мс @620 мс, подзаголовок @720 мс.

**И она обрывается кадром:** `_layout.tsx:506` — `if (!visible) return null;`. Никакого fade-out, никакой передачи эстафеты главному экрану. Самый дорогой момент приложения кончается щелчком.

---

## 2. Переходы между табами

### 2.1 Свайп — `app/TabSlider.tsx` (201 стр.)

Единственный по-настоящему хорошо сделанный жест в проекте.

- `Gesture.Pan` целиком на UI-потоке, `activeOffsetX ±22`, `failOffsetY ±12` (`TabSlider.tsx:17-18, 100-101`).
- Резина при драге: `translateX = base + dx * 0.92` (`:112`).
- Порог коммита: `|dx| > 50 || |vx| > 400` (`:126-127`).
- Коммит: `withTiming(260, Easing.out(Easing.cubic))` (`:134-142`).
- Отскок: `withSpring({damping:22, stiffness:220, mass:0.4, velocity:vx})` (`:161-166`) — velocity передана, инерция читается.
- `useReducedMotion()` уважается (`:38, 77-81, 136, 150, 159`).

### 2.2 Тап — `app/(tabs)/_layout.tsx`

Тап по вкладке идёт **через тот же** `TabSlider`: `useLayoutEffect` на смену `activeIndex` (`TabSlider.tsx:73-92`) гонит ту же `withTiming(260, easeOutCubic)`. Свайп и тап дают идентичное движение — это правильно.

**Но: при тапе через 2 позиции панель пролетает промежуточный таб за те же 260 мс**, т.е. скорость прокрутки удваивается. Длительность не масштабируется по `|Δindex|`.

### 2.3 Хром таббара

| Элемент | Реализация | Файл:строка |
|---|---|---|
| Бегунок активной вкладки | `Animated.spring(speed:18, bounciness:4)` | `:456-461` |
| Press-lift | `spring(speed:34, bounciness:6)`, pill `scale 1→0.992`, active-pill `1→1.1`, иконка `1→1.08` | `:470-490, 500-513, 685-687` |
| Сжатие при скролле | `timing(220 collapse / 260 expand, easeOutCubic)`, `scale 0.9`, `translateY 8`, `opacity 0.94` | `:296-303, 521-526` |
| Cooldown переключения | `TAB_SCROLL_TOGGLE_COOLDOWN_MS` | `:512-516` |

Всё на старом `Animated` API + `useNativeDriver:true`. Работает, но `useReducedMotion` **не проверяется нигде в `(tabs)/_layout.tsx`** — таббар пружинит даже при системном «уменьшении движения».

### 2.4 Пустой слот вместо ещё не смонтированного таба

`(tabs)/_layout.tsx:968-970` и `:116`:
```tsx
const placeholder = (k) => <View style={{width: tabPaneWidth, flex:1, backgroundColor: t.bgPrimary}} .../>
```
Свайп на «Друзей»/«Настройки» до их премаунта показывает **плоский цветной прямоугольник**, который затем hard-swap'ается на экран. Ни скелетона, ни кроссфейда.

---

## 3. Фоны экранов

### 3.1 `constants/screenBackground.ts` (49 стр.)

Чистая карта данных — стопы градиента на тему. Никакой анимации, и не должно быть.
Особенности:
- `business: ['#000000','#000000']`, `businessLight: ['#FFFFFF','#FFFFFF']` (`:16-18`) — вырожденные градиенты, физически плоская заливка.
- Кино-темы (`midnight/ember/aurora/volt`) тянут стопы из `CINEMA.*.bgGradient3` (`:26-29`).
- `LEGACY_UNSUPPORTED_BG_GRADIENTS` (`:36-41`) — ocean/sakura, темы удалены, палитра осталась.

### 3.2 `components/ScreenGradient.tsx` (837 стр.) — **анимация выключена целиком**

`ScreenGradient.tsx:22`:
```ts
const SCREEN_GRADIENT_MOTION_ENABLED = false;
```
Отключает шесть подсистем:

| Слой | Что должно было делать | Где заглушка |
|---|---|---|
| `Orb` | дрейф ±12 px + `scale 0.98↔1.07` + пульс opacity, период 7600 + i·900 мс | `:154-157` (`return undefined`), `:185-201` (статичный `<View>`) |
| `GoldFabricFlow` | 4 параллельных лупа — полосы ткани, нити, блик-sweep | `:256-262`, `:360-372` (два статичных `LinearGradient`) |
| `CinemaParticle` | дрейф 12000 + i·1700 мс | `:489-493` |
| `CinemaBloom` | пульсирующий блум кино-тем | через `reduceMotion`/флаг |
| Кроссфейд слоёв фона | `BACKGROUND_LAYER_FADE_MS = 720` | `:670-676` — при выключенном флаге рендерит обычный `<View>` вместо `Animated.View` |
| `entranceOffsetY` параллакс | сдвиг глубины при входе | `:756-757` — `animatedY` вычисляется только при `SCREEN_GRADIENT_MOTION_ENABLED` ⇒ всегда `undefined` |

`(tabs)/_layout.tsx:604` передаёт `staticParallaxY={HOME_ENTRANCE.bgDriftPx}` (9 px) — но это **число**, не `Animated.Value`: фикс-сдвиг, не параллакс.

### 3.3 `components/backgroundTransition.tsx`

`:9` — `FABRIC_BACKGROUND_TRANSITIONS_ENABLED = false`.
`:5-8` — `BACKGROUND_BLUR_SWITCH_MAX_RADIUS = 0`, `..._IN_MS = 0`, `..._OUT_MS = 0`.
`:10` — `BACKGROUND_TRANSITION_USE_NATIVE_DRIVER = false`.

Смена темы, смена арт-подложки, смена акцента — **мгновенная подмена**. `BACKGROUND_LAYER_FADE_MS = 720` объявлен и не используется.

### 3.4 `components/AppArtBackdrop.tsx` (96 стр.) — имя подложки игнорируется

`:50-52`:
```tsx
function AppArtBackdrop({ name }: { name: AppArtBackdropName }) {
  const { themeMode } = useTheme();
  void name;                                   // ← имя выброшено
```
Дальше рисуются два `LinearGradient`: вертикальный скрим (`VERTICAL_SCRIMS[themeMode]`) и краевой (`EDGE_SCRIMS[themeMode]`). Всё.

При этом `components/appArtBackdropRegistry.ts` содержит 14 имён (`home`, `lessons`, `lessonIntro`, `lessonPractice`, `friends`, `settings`, `achievements`, `diagnosticTest`, `exam`, `flashcards`, `progressMap`, `shardsShop`, `levelGifts`, `statistics`) и полную карту `APP_ART_ROUTE_BACKDROPS` — мёртвый вес.
`rememberAppArtBackdrop()` (`AppArtBackdrop.tsx:78-82`) — пустая функция-заглушка.

**Следствие:** 68 экранов оборачиваются в `ScreenGradient`, и все 68 выглядят фоново одинаково. Единственная фоновая дифференциация — `TournamentBackdrop` в Арене/Турнирах (`components/tournament/`).

### 3.5 `components/TopFadeMask.tsx` (104 стр.) — работает

Единственный анимированный элемент фонового слоя: alpha-маска верхнего края, `opacity` привязан к `scrollY`, `timing(180 in / 260 out, useNativeDriver:true)` (`:51-62`). Порог `showThreshold = 6` px.

---

## 4. Инвентаризация по разделам

Легенда «вход»: `fade` = глобальный 140 мс кроссфейд стека, `sheet` = `slide_from_bottom` (SECTION_SHEET), `none` = без анимации, `+каскад` = внутренний `entering=`.
Оценка 1-5: 5 = движение на уровне графики; 1 = мёртвый экран.

### A. Корень и навигация

| Экран | Назначение | Вход | Внутренние анимации | Состояния | Оц. | Главная проблема |
|---|---|---|---|---|---|---|
| `_layout.tsx` (3714) | Корневой стек + ~40 глобальных оверлеев | — | 19 `Animated.*` (сплэш, gold-bridge) | offline-баннер глобальный (`:3462`) | 3 | Сплэш обрывается `return null` (`:506`) |
| `(tabs)/_layout.tsx` (1090) | Каркас табов | — | 4 `Animated.*` (бегунок, press, collapse) | placeholder = плоский `<View>` (`:968`) | 3 | Нет `reduceMotion`; placeholder без скелетона |
| `TabSlider.tsx` (201) | Свайп между табами | — | 7 `withTiming/Spring`, `reduceMotion` ✓ | — | **5** | Длительность не масштабируется по `|Δindex|` |
| `TabContext.tsx` (60) | Контекст | — | нет | — | — | — |
| `index.tsx` (6) / `(tabs)/index.tsx` (12) / `+not-found.tsx` (6) | Редиректы | `none` | нет | `DeferredRedirect` = плоский `<View bgPrimary>` (`components/DeferredRedirect.tsx:33`) | 1 | Первый кадр приложения — цветной прямоугольник |
| `(tabs)/journal.tsx` (7), `lessons_list.tsx` (7), `league_screen.tsx` (2), `flashcards.tsx` (19), `lesson_verbs.tsx` (18), `learning-v2/course.tsx` (14) | Ре-экспорты | — | — | — | — | — |
| `modal.tsx` (33) | **Шаблон Expo, не удалён** | fade | нет | нет | 1 | Мусор в проде («This is a modal») |
| `+native-intent.tsx` (123) | Диплинк-резолвер | — | нет | нет | — | — |

### B. Табы

| Экран | Назначение | Вход | Внутренние анимации | Состояния | Оц. | Главная проблема |
|---|---|---|---|---|---|---|
| `(tabs)/home.tsx` (3462) | Главная | `none` (`_layout:3160`) | 26 `Animated.*` (тултип энергии, всплеск осколков, пульс подсказки, streak-pop 1.6×), 4 `configureAccordionLayout` | error: баннер «Не удалось загрузить» (`:3203-3230`); loading — **нет**; empty — **нет** | 3 | **Каскад входа вырезан, код остался** (см. §6.1) |
| `(tabs)/lessons.tsx` (3357) | Список уроков | fade (как `/lessons_list`) | **1** `withTiming` — аккордеон 320 мс (`:1534`) | нет loading, нет empty, нет error | 2 | 3357 строк на одну анимацию раскрытия |
| `(tabs)/friends.tsx` (3940) | Лента друзей | `none` | 10 `withTiming` (пульс, pop лайка `1→1.4→1`), 4 `entering=FadeInDown` каскадом по 40 мс | `loading` объявлен (`:1366`) и **не читается**; `refreshing` (`:1367`) **не читается**, `RefreshControl` отсутствует; empty ✓ (`:1530-1546`); offline — только глобальный баннер | 2 | **Ложный empty-state мигает** перед приходом данных |
| `(tabs)/settings.tsx` (2341) | Настройки | `none` | **0**. `Reanimated.ScrollView` (`:1218`) — только ради scroll-handler | 1 `ActivityIndicator` (`:2316`) | 1 | Самый большой полностью мёртвый экран |
| `(tabs)/tournaments.tsx` (1738) | Хаб турниров | `none` | 4 `withTiming` + 3 `FadeIn(220)` (`:985, 1129, 1177`), пульс 1100 мс (`:1460`), `reduceMotion` ✓ | empty ✓, error ✓ | 3 | Каскад только на 3 блока из ~10 |

### C. Уроки (классический трек)

| Экран | Назначение | Вход | Внутр. анимации | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `lesson1.tsx` (3888) | Основной урок (сборка фразы) | fade | 23 `Animated.*`, `reduceMotion` ✓ | loading → `LessonFirstFrame` (из `modules/`, вне снимка) в 3 местах (`:952, 964, 3681`); error-экран для FR (`:3691+`) | 4 | Скелетон→контент — тернарный hard-swap |
| `lesson_words.tsx` (3790) | Урок «слова» | fade | 7 `Animated.*` | error ✓ | 3 | Нет entrance |
| `lesson_irregular_verbs.tsx` (1292) | Неправильные глаголы | fade | 7 `Animated.*` | empty ✓ | 3 | Нет entrance |
| `lesson_menu.tsx` (1672) | Меню урока | fade | **0** | empty ✓, error ✓ | 1 | Ноль движения на узловом экране флоу |
| `lesson_complete.tsx` (1806) | Итог урока | fade | 12 `Animated.*` | empty ✓ | 4 | Празднование есть, вход — fade |
| `lesson_help.tsx` (634) | Помощь | fade | 3 `Animated.*` | нет | 2 | — |
| `lesson_help_theory_ui.tsx` (311) | UI теории | fade | **0** | нет | 1 | — |
| `lesson_help_theory_data.tsx` (19523) | Данные теории | — | 0 | — | — | Данные в `.tsx` |
| `lesson_intro_screens.tsx` (1051) | Интро-слайды урока | fade (**нет `Stack.Screen`**) | 26 `Animated.*` — самый анимированный интро | нет | 4 | Не зарегистрирован в стеке |
| `lesson_intro_rich.tsx` (621) | Богатое интро | fade | **0** | нет | 1 | Богатое только по названию |
| `lesson_theory_v2.tsx` (263) | Теория v2 | `card` + fade (`_layout:3172`) | **0** | нет | 1 | Единственный экран с явным `presentation:'card'` — и без движения |
| `hint.tsx` (1582) | Подсказка/теория | fade | **0** (только `TapScale`) | нет loading/empty/error | 1 | 1582 строки, ноль движения |
| `preposition_drill.tsx` (860) | Дрилл предлогов | fade | 7 `Animated.*` | нет | 3 | — |
| `review.tsx` (1966) | Повторение (SRS) | fade | **64** `withTiming/Spring` + 8 `Animated.*` — рекорд по плотности | loading → полноценный скелетон (`:1233-1345`) | 4 | Скелетон→контент hard-swap; 0 `exiting` |

### D. Learning V2

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `learning-v2/lesson/[id].tsx` (1512) | Карта урока | fade (**нет `Stack.Screen`**) | 14 `withTiming` + `entering` на узлах (`:314, 972`), `reduceMotion` ✓ | **нет loading/empty/error** | 4 | Ноль обработки состояний |
| `learning-v2/session/[id].tsx` (2342) | Сессия | fade (**нет `Stack.Screen`**) | 18 `withTiming` + **8** `entering=` (`:1198,1227,1490,1510,1638,1657,1667,1677`), `reduceMotion` ✓ | **нет loading/empty**; offline-маркер есть | **5** | Самый живой экран приложения — и он вне стека |
| `learning_v2_session_intro.tsx` (982) | Интро сессии | fade | 7 `withTiming` + 1 `entering` | нет | 4 | — |
| `learning_v2_session_intro_check.tsx` (323) | Проверка интро | fade | 11 `withTiming` + 3 `entering(FadeInDown 220/280)`, `ReduceMotion.System` ✓ | нет | **5** | — |
| `learning_v2_direct_session_player_v1.tsx` (1384) | Прямой плеер | fade | 7 `withTiming` | `ActivityIndicator` (`:552`), error-текст (`:511`) | 3 | Голый спиннер |

### E. Экзамены и тесты

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `exam.tsx` (1840) | Экзамен урока | fade, `freezeOnBlur:false` | 1 `Animated.*` | error ✓ | 2 | Экзамен без движения ощущается как бланк |
| `level_exam.tsx` (1855) | Экзамен уровня | fade | **0** | error ✓ | 1 | 1855 строк, ноль анимаций |
| `diagnostic_test.tsx` (2012) | Диагностика | fade | 1 `Animated.*`, **9 `SkeletonBlock`** (`:1439-1441`) | скелетон ✓, empty ✓, error ✓ | 3 | Лучшие состояния, худшее движение |
| `survey_screen.tsx` (450) | Опрос | fade | 2 `Animated.*` | `ActivityIndicator` (`:369`), error ✓ | 2 | — |

### F. Тренажёр

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `trainer.tsx` (744) | Хаб ошибок | fade | **0** | empty ✓ (`:541`), error ✓ (`:414`), offline-маркер; `components/TrainerLoadStates.tsx` даёт скелетон | 2 | Хорошие состояния, нулевое движение |
| `trainer_words_session.tsx` (778) | Сессия слов | fade | 2 `Animated.*` | empty ✓, error ✓ | 2 | — |
| `trainer_phrases_session.tsx` (1094) | Сессия фраз | fade | 7 `withTiming` + 5 `Animated.*` + 2 `entering` | error ✓ | 4 | — |
| `trainer_session_report.tsx` (378) | Отчёт | fade (**нет `Stack.Screen`**) | 4 `entering=FadeInDown` delay 400/540/680/820 + 4 `withTiming` | empty ✓ | 4 | Каскад стартует ПОСЛЕ того, как экран уже «щёлкнул» |
| `problem_coach.tsx` (790) | Коуч проблем | fade | **0** | нет loading/empty/error | 1 | Полностью мёртвый |

### G. Карточки

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `flashcards_collection.tsx` (854) | Коллекция | fade | **0** в самом файле (движение — в подкомпонентах) | `if (loading) return` (`:380`); empty ✓ (`:648`); error ✓ | 3 | — |
| `flashcards_packs.tsx` (581) | Каталог наборов | fade | 1 `Animated.*` | **нет loading, нет empty, нет error** | 1 | Сетевой каталог без единого состояния |
| `flashcards_my_packs.tsx` (477) | Мои наборы | fade | **0** | empty-текст (`:411`) | 1 | — |
| `flashcards_audio.tsx` (1441) | Аудио-режим | fade | 2 `Animated.*` | loading = **текст «Загрузка…»** в панели (`:867-871`), затем hard-swap; empty ✓; error ✓ | 2 | Текстовый лоадер вместо скелетона |
| `flashcards_swipe.tsx` (3963) | Свайп-сессия | fade | 11 `Animated.*`, `reduceMotion` ✓, токены `FC_SWIPE` | `loadingSources` (`:901`), empty ✓, error ✓ | 4 | Жест хорош, вход/выход экрана — fade |
| `flashcards_blitz_session.tsx` (834) | Блиц | fade | **17** `withTiming/Spring`, `reduceMotion` ✓ | `if (loading) return` (`:538`) | 4 | — |
| `flashcards_listening_session.tsx` (1019) | Аудирование | fade | **0** (движение в `ListeningEqualizer`) | **`if (loading) return <Text>…</Text>`** (`:562-569`) — многоточие на весь экран | 1 | Самое бедное состояние загрузки в проекте |
| `flashcards_card_editor.tsx` (685) | Редактор карточки | fade | **0** | `ActivityIndicator` (`:423`), empty ✓, error ✓ | 1 | — |
| `flashcards_voice_picker.tsx` (457) | Выбор голоса | fade | **0** | `loading` (`:83`) → `ActivityIndicator` (`:288`), empty testID (`:375`) | 1 | — |
| `community_pack_create.tsx` (1460) | Создание UGC-пака | fade | 1 `configureAccordionLayout` (`:310`) — **не работает на Android** | error ✓ | 2 | — |
| `pack_opening.tsx` (858) | Открытие пака | **`presentation:'modal', animation:'none'`** (`_layout:3253`) | 14 `Animated.*`, 4 `SkeletonBlock` (`:543-570`) | скелетон ✓, error ✓ | 3 | Церемония открытия пака **вываливается без движения** |
| `flashcards_market_dev.tsx` (393) | Dev-маркет | fade | **0** | error ✓ | — | dev |

Подкомпоненты `app/flashcards/*` — здесь движение живёт:
`PhraseCard.tsx` (12 `withTiming`, 3D-флип), `ListeningEqualizer.tsx` (16), `FlashcardsTabBar.tsx` (12+4), `DeckPickerSheet.tsx` (13, `fcStaggerDelay`), `CollectionDeckView.tsx` (11), `CardPackShardPaywallModal.tsx` (**14 `entering=` + 17 `withTiming`** — самая анимированная поверхность проекта), `FlashcardsCategoryHub.tsx` (6 + `fcStaggerDelay`), `CollectionListView.tsx` (14 `Animated.*` + 2 `entering`), `FlashcardListItem.tsx` (8+5).
Мёртвые: `FlashcardsCategoryBar.tsx` (65), `FlashcardsCategoryTiles.tsx` (118), `FlashcardsFilterDropdown.tsx` (106 — **выпадашка без анимации раскрытия**), `WordStrengthDots.tsx` (57), `FlashcardDetailsBody.tsx` (241), `SessionResultScreen.tsx` (227 — **экран результата сессии без празднования**), `CollectionHeader.tsx` (385, только `ActivityIndicator`).

### H. Арена (18 экранов)

Единственная секция с явным конечным автоматом состояний: `'loading' | 'ready' | 'empty' | 'unavailable' | 'error'`.

**Но loading молчит:** `components/arena/ArenaExpansionUI.tsx:201-202`
```tsx
// Загрузка молчит: слово «Загрузка…» ничего не сообщает, а ожидание рисует.
if (copy.silent) return null;
```
⇒ 8 экранов расширения показывают **пустой экран** во время загрузки, затем контент возникает без перехода.

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `arena.tsx` (289) | Хаб | fade | **0** | warm-cache первым кадром (`:31-38`), empty ✓ | 2 | Хаб раздела без движения |
| `arena_match.tsx` (675) | Матч | fade, `freezeOnBlur:false` | **4** `entering` (`:502,544,569,625`), `SlideInRight`, `reduceMotion` ✓ | empty ✓ | **5** | — |
| `arena_matchmaking.tsx` (313) | Поиск соперника | fade | **0** | голый `<ActivityIndicator size="large">` (`:252`) | 1 | Стоковый спиннер в «дорогом» приложении |
| `arena_results.tsx` (311) | Результат | fade | **0** (`reduceMotion` импортирован, движения нет) | нет | 1 | Экран победы без празднования |
| `arena_ranks.tsx` (337) | Ранги | fade | 6 `withTiming` + 3 `entering` (delay i·45) | empty ✓ | 4 | — |
| `arena_history.tsx` (186) | История | fade (**нет `Stack.Screen`**) | 2 `entering` (delay min(i,8)·40) | empty ✓, error ✓ | 4 | — |
| `arena_tops.tsx` (197) | Топы | fade (**нет `Stack.Screen`**) | 2 `entering` | empty ✓, error ✓ | 4 | — |
| `arena_review.tsx` (209) | Разбор | fade (**нет `Stack.Screen`**) | 2 `entering` (`FadeInDown` + `FadeInRight`) | empty ✓, error ✓ | 4 | — |
| `arena_today.tsx` (208) | Сегодня | fade, `freezeOnBlur:false` | 1 `entering=SlideInRight` | пустой loading (silent), empty ✓, error ✓ | 3 | — |
| `arena_rivalries.tsx` (87) | Соперничества | fade | **0** | `'loading'` → **пусто**; empty ✓; error ✓ | 2 | Пустой кадр загрузки |
| `arena_mastery_map.tsx` (87) | Карта мастерства | fade | **0** | то же | 2 | то же |
| `arena_partner.tsx` (156) | Партнёр | fade | **0** | то же | 2 | то же |
| `arena_star_wallet.tsx` (176) | Кошелёк звёзд | fade | **0** | то же | 2 | то же |
| `arena_match_lab.tsx` (146) | Лаборатория | fade | **0** | то же | 2 | то же |
| `arena_ghost_duel.tsx` (121) | Дуэль с призраком | fade | **0** | то же | 2 | то же |
| `arena_season_pass.tsx` (122) | Сезонный пропуск | fade | **0** | то же | 2 | то же |
| `arena_friend_duel.tsx` (148) | Дуэль с другом | fade | **0** | error ✓ | 2 | — |
| `arena_invite.tsx` (98) | Приглашение | fade | **0** | error ✓ | 2 | — |

### I. Турниры (7 экранов) — лучшая секция по движению

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `tournament_round.tsx` (2355) | Раунд | fade | 13 `withTiming` + **7 `entering`** + **`exiting=QUESTION_EXIT`** (`:1433`) — один из двух `exiting` в проекте; `reduceMotion` ✓ везде | empty ✓, error ✓, offline ✓ | **5** | Вход в сам экран — плоский fade |
| `tournament_results.tsx` (1030) | Итоги | fade | 13 `withTiming` + 2 `entering` (`:629, 890`) | empty ✓, offline ✓ | 4 | — |
| `tournament_lobby.tsx` (928) | Лобби | fade | 8 `withTiming` + `ZoomIn.springify().damping(14).stiffness(190)` (`:768`) | empty ✓, error ✓, offline ✓ | 4 | — |
| `tournament_table.tsx` (506) | Таблица | fade | 4 `withTiming` + `FadeIn.delay(320)` (`:393`) | offline ✓ | 3 | — |
| `tournament_review.tsx` (600) | Разбор | fade | 1 `entering=FadeIn(200)` | empty ✓ | 2 | — |
| `tournament_season.tsx` (389) | Сезон | fade | 1 `entering` (delay min(i,8)·40) | empty ✓ | 3 | — |
| `tournament_tickets.tsx` (206) | Билеты | **sheet** | `ZoomIn.delay(i·70).springify()` (`:86`) | empty ✓ | 4 | — |

### J. Лига / клуб / социальное

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `club_screen.tsx` (1820) | Лига/клуб | fade | 5 `Animated.*` | **`LeagueHubSkeleton`** (`:1560`) — правильный скелетон; empty ✓, error ✓ | 3 | Скелетон→контент hard-swap |
| `LeagueResultModal.tsx` (1473) | Итоги недели лиги | — (оверлей) | **22 `Animated.*`**, `reduceMotion` ✓ | нет | 4 | — |
| `top_helpers.tsx` (448) | Топ помощников | **sheet** | **0** | 5 `SkeletonBlock` (`:133-143`) + снапшот прошлой сессии | 2 | Скелетон есть, движения нет |
| `referrals.tsx` (915) | Рефералы | **sheet** | 1 `entering=FadeInDown(delay i·40)` | **`RefreshControl`** (`:657`) — 1 из 2 в проекте; 2 `SkeletonBlock` (`:870`); 2 `ActivityIndicator`; empty ✓; error ✓ | 4 | Лучший набор состояний в проекте |
| `WeeklyReviewCard.tsx` (335) | Недельный обзор | — (карточка) | **0** | 3 `SkeletonBlock`, error ✓, offline ✓ | 2 | — |

### K. Экономика и награды

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `shards_shop.tsx` (2200) | Магазин осколков | fade | 14 `withTiming` | `cardMarketLoading` (`:826`), `ListEmptyComponent` (`:1968`), error ✓ | 3 | Покупка без празднования на самом экране |
| `coin_exchange.tsx` (390) | Обмен монет | fade | **0** | `ActivityIndicator` в кнопке (`:366`), error ✓ | 1 | Транзакция без обратной связи движением |
| `season_pass.tsx` (1024) | Сезонный пропуск | fade (**нет `Stack.Screen`**) | **0** | `ActivityIndicator` (`:931`), empty ✓, error ✓ | 1 | Монетизационный экран с нулевым движением |
| `level_gifts_inventory.tsx` (777) | Инвентарь подарков | fade | 7 `withTiming`, `reduceMotion` ✓ | нет loading/empty | 3 | — |
| `level_reward_spin.tsx` (271) | Рулетка награды | fade | **0** в файле (эффекты в `components/roulette_win_*`) | нет | 2 | Рулетка сама по себе не крутится в этом файле |
| `collectibles_screen.tsx` (759) | Коллекционки | fade | 2 `LayoutAnimation.configureNext` (`:623`) — **без Fabric-гарда**, в отличие от `constants/layoutAnimation.ts` | `loaded` флаг гасит ложный empty (`:555`), `CollectiblesEmptyStateMotion` | 3 | `LayoutAnimation` на Android Fabric — no-op/варнинг |
| `achievements_screen.tsx` (1550) | Достижения | fade | **0** | `states = []` (`:1351`) + 6 `AsyncStorage.multiGet` + `Promise.all` ⇒ **`ListEmptyComponent` «Пока нет полученных наград» (`:1501-1507`) мигает** до прихода данных | 1 | Ложный empty + ноль движения на витрине наград |
| `avatar_select.tsx` (952) | Выбор аватара | fade | **0** | error ✓ | 1 | Выбор аватара — чистая витрина — без единого перехода |

### L. Монетизация

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `paywall_a…g` (280-395 стр. ×7) | A/B/C/D/E/F/G пейволы | **modal + slide_from_bottom** (вне онбординга) / `card+none` (онбординг) | **0 в каждом файле** | Цена: `price \|\| (loading ? '…' : '—')` — `components/paywall/PaywallPlanCards.tsx:157`, `PaywallPlanTiles.tsx:168` | 2 | **Цена подменяется с «…» на «$9.99» щелчком** на самом монетизирующем экране |
| `premium_modal.tsx` (116) | Диспетчер пейволов | **sheet** | **0** | нет | 2 | — |
| `premium_modal_v2.tsx` (44) | Диспетчер v2 | fade (**нет `Stack.Screen`**) | **0** | голый `<ActivityIndicator size="large">` (`:31`) | 1 | Экран-спиннер |
| `manage_subscription.tsx` (518) | Управление подпиской | **sheet** | **0** | 4 `SkeletonBlock` (`:355-357`), `ActivityIndicator` (`:408`) | 2 | — |
| `promo_code_entry.tsx` (339) | Промокод | **sheet** | **0** | `ActivityIndicator` (`:313`), error ✓ | 1 | Успешное применение промокода без празднования |
| `referral_access_ended_modal.tsx` (311) | Конец реф-доступа | fade (**нет `Stack.Screen`**) | **0** | нет | 1 | Модалка без модальности |

Онбординг-затемнение пейвола (`paywallShared.tsx:120-122`) — `ONBOARDING_DIM_ENTER/EXIT_DURATION = 4000` мс. Четыре секунды на затемнение: не «медленно и премиально», а «зависло».

### M. AI и голос

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `ai_dialog_session.tsx` (2885) | AI-диалог | fade (**нет `Stack.Screen`**) | **1** `Animated.*` | 4 `SkeletonBlock`, `ActivityIndicator` (`:2746`), empty ✓, error ✓, offline ✓ | 2 | Диалог — живая ткань — без движения (пузыри в `components/AiTypingBubble.tsx`) |
| `ai_dialog_home.tsx` (95) | Хаб диалогов | fade | **0** | нет | 1 | — |
| `ai_dialog_briefing.tsx` (132) | Брифинг | fade | **0** | нет | 1 | — |
| `ai_dialog_consent_gate.tsx` (111) | Согласие | fade | **0** | нет | 1 | — |
| `ai_companion_session.tsx` (532) | Компаньон | fade | **0** | нет loading/empty/error | 1 | — |
| `max_call_prestart.tsx` (417) | Пред-звонок | fade (**нет `Stack.Screen`**) | **0** | нет | 1 | Ожидание звонка без движения |
| `max_call_session.tsx` (1092) | Живой голосовой звонок | fade (**нет `Stack.Screen`, нет `freezeOnBlur:false`**) | **0** в файле; всё в `max_call_halo.tsx` | offline-маркер | 2 | Рантайм звонка может быть заморожен при накрытии модалкой |
| `max_call_halo.tsx` (185) | Гало вокруг аватара | — | 10 `withTiming/withRepeat` (breath, micPulse), `reduceMotion` ✓ | — | **5** | — |
| `max_voice_review.tsx` (613) | Разбор звонка | fade (**нет `Stack.Screen`**) | **0** | `ActivityIndicator` (`:432`), empty ✓, error ✓ | 1 | — |
| `voice_equalizer.tsx` (269) | Эквалайзер записи | — | 6 `Animated.*`, императивный `setSample` без ре-рендера | — | 4 | — |

### N. Настройки и «шторки разделов» — 0 анимаций на всю секцию

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `settings_themes.tsx` (423) | **Выбор темы** | **sheet** | **0** | нет | 1 | Смена темы = мгновенная подмена палитры (§3.3). Экран, продающий визуал, не показывает переход |
| `settings_language.tsx` (83) | Язык | **sheet** | **0** | нет | 1 | Смена языка перерисовывает весь текст без перехода |
| `settings_notifications.tsx` (395) | Уведомления | **sheet** | **0** | нет | 1 | — |
| `settings_edu.tsx` (331) | Обучение | **sheet** | **0** | error ✓ | 1 | — |
| `privacy_settings.tsx` (229) | Приватность | **sheet** | **0** | нет | 1 | — |
| `privacy_screen.tsx` (79) | Политика | **sheet** | **0** | нет | 1 | — |
| `terms_screen.tsx` (79) | Условия | **sheet** | **0** | нет | 1 | — |
| `account_details.tsx` (399) | Аккаунт | **sheet** | **0** | empty ✓ | 1 | — |
| `ideas_submit.tsx` (217) | Отправить идею | **sheet** | **0** | `ActivityIndicator` (`:206`) | 1 | Отправка без подтверждающего движения |
| `language_welcome.tsx` (600) | Приветствие/язык | fade | 11 `withTiming` + 1 `Animated.*` | `ActivityIndicator` (`:309`) | 4 | Единственный анимированный экран секции |

Единственная анимация во всей секции — переключатель: `components/CustomSwitch.tsx:37-47` (`Animated.parallel`: `spring` на thumb + `timing 110 мс` на трек).

### O. Статистика и видео

| Экран | Назначение | Вход | Внутр. | Состояния | Оц. | Проблема |
|---|---|---|---|---|---|---|
| `streak_stats.tsx` (4875) | Статистика/стрик | fade | **12 `entering`** + **1 `exiting`** (`:2969`) + 10 `withTiming` + 3 `Animated.*`, 6 `SkeletonBlock` | **`if (loading) return null`** (`:1215-1216`) — блок пари исчезает и появляется скачком; empty ✓ | 4 | `return null` вместо скелетона внутри самого «анимированного» экрана |
| `phrase_analytics_screen.tsx` (973) | Аналитика фраз | fade | **0** | **7 `SkeletonBlock`** (`:590-597`), empty ✓, комментарий `B7` про ложный empty | 2 | Идеальные состояния, ноль движения |
| `lingman_videos.tsx` (347) | Каталог видео | fade | **0** | **`RefreshControl`** ×3 (`:300,304,307`) — 1 из 2 в проекте; 4 `SkeletonBlock`; error ✓; offline ✓ | 2 | Эталон состояний / антиэталон движения |
| `lingman_playlist.tsx` (124) | Плейлист | fade | **0** | 3 `SkeletonBlock` (`:75`) | 2 | — |

### P. Dev / служебные

`_pos_analytics_audit.tsx` (196), `pos_analytics_audit.tsx` (14), `product_analytics_runtime_observer.tsx` (101), `_store_release_dev_module_stub.tsx` (4), `flashcards_market_dev.tsx` (393) — вне продового флоу, движение не требуется.

---

## 5. Переходы МЕЖДУ состояниями: loading → content

**Вывод: анимированного перехода между состояниями в приложении не существует.**

Все 12 экранов со `SkeletonBlock` и все 18 с `ActivityIndicator` используют один паттерн:

```tsx
loading ? <Скелетон/> : <Контент/>      // либо  if (loading) return <...>
```

Ни `entering`/`exiting` на ветках, ни `useAnimatedStyle` на opacity, ни `Animated.timing` на кроссфейд. Подтверждения:

| Экран | Строка | Что происходит |
|---|---|---|
| `review.tsx` | `:1233` | `if (loading) { return <ScreenGradient>…скелетон…` — щелчок |
| `pack_opening.tsx` | `:543` | `if (loading) { return <ScreenGradient artBackdrop="flashcards">…` — щелчок |
| `flashcards_blitz_session.tsx` | `:538` | `if (loading) {` — щелчок |
| `flashcards_listening_session.tsx` | `:562-569` | `if (loading) return <Text>…</Text>` — многоточие вместо экрана |
| `streak_stats.tsx` | `:1215-1216` | `if (loading) return null` — блок исчезает, потом скачком появляется |
| `phrase_analytics_screen.tsx` | `:587-598` | тернарная цепь `sourceGate ? … : visibleLoading && !data ? скелетон : !data ? empty : контент` |
| `top_helpers.tsx` | `:120-150` | скелетон-строки → строки данных, hard-swap |
| `lingman_playlist.tsx` | `:75` | `loading && !playlist ? скелетон : playlist ? …` |
| `manage_subscription.tsx` | `:355-357` | hard-swap |
| `arena_*` (8 экранов) | `ArenaExpansionUI.tsx:202` | `if (copy.silent) return null` — **пустой экран** → контент |

Счётчики по `app/`:
- `entering=` — **25** файлов из 158;
- `exiting=` — **2** файла (`tournament_round.tsx:1433`, `streak_stats.tsx:2969`);
- `RefreshControl` — **2** файла (`lingman_videos.tsx`, `referrals.tsx`);
- `SkeletonBlock` — **12** файлов;
- `ActivityIndicator` — **18** файлов.

Сам `components/SkeletonShimmer.tsx` (135 стр.) сделан отлично: Reanimated на UI-потоке, `withRepeat`, гард по `useIsScreenFocused()` + `AppState` (`:65-95`), пиксельный `translateX` вместо процентного. Проблема не в скелетоне — проблема в том, что он **исчезает** без перехода.

**Готовый и неиспользуемый:** `components/LessonLoadingSkeleton.tsx` (83 стр.) — полноценный скелетон урока с комментарием «заменяет ТРИ разных состояния». Внутри `app/` и `components/` **не импортируется ни разу** (`lesson1.tsx:30` берёт `LessonFirstFrame` из `modules/`).

---

## 6. Мёртвый и полумёртвый код движения

### 6.1 Каскад входа главной вырезан, каркас остался

`app/(tabs)/home.tsx:959-966`:
```tsx
// Секции главной: без entrance-анимации при открытии таба / возврате в приложение (сразу видимы).
const S_COUNT = 6;
const sectionOpacity = useRef(Array.from({length: S_COUNT}, () => new Animated.Value(1))).current;  // ← сразу 1
const sectionSlide   = useRef(Array.from({length: S_COUNT}, () => new Animated.Value(0))).current;  // ← сразу 0
const sectionStyle = (i) => ({ opacity: sectionOpacity[i], transform: [{translateY: sectionSlide[i]}] });
```
`sectionStyle()` оборачивает 5 секций (`:2732, 2802, 2883, 3032, 3097`) в `Animated.View`, которые **никогда не анимируются**. То же для `eliteStatusEntrance` / `eliteQuickTileEntrance` / `eliteActivityTileEntrance` (`:919-921` — инициализированы в `1`, `:977-979` — `setValue(1)`), при том что `:2425-2426` строит из них `eliteCardY` (18→0) и `eliteCardScale` (0.985→1).

`app/(tabs)/home.tsx:957, 969-970` — **`fadeAnim` анимируется 0→1 за 380 мс на каждом маунте и не привязан ни к одному стилю**. Чистая трата кадра.

`constants/motion.ts:90-100` — `HOME_ENTRANCE` из 9 констант. Используется **одна**: `bgDriftPx` в `(tabs)/_layout.tsx:604`. Мертвы: `sectionStaggerMs: 58`, `quickStaggerMs: 46`, `bgDriftMs: 1500`, `initialOpacity: 0.9`, `initialTranslateY: 20`, `initialScale: 0.95`, `quickTranslateY: 12`, `quickScale: 0.93`.

### 6.2 Прочее мёртвое

| Что | Где | Статус |
|---|---|---|
| `MOTION_SPRING.nav/gesture` (Telegram-параметры push/pop) | `constants/motion.ts:27-29` | Не используются — навигации нет |
| `MOTION_DURATION.navPush/modalSnap/modalDismiss/bottomSheetOpen/…` | `constants/motion.ts:7-16` | Комментарии со ссылками на исходники Telegram, потребителей нет |
| `bottomModalAnimationOptions` | `_layout.tsx:3123-3127, 3284` | Объявлен, ни одному экрану не передан |
| `BACKGROUND_LAYER_FADE_MS = 720` | `backgroundTransition.tsx:8` | Флаг перехода `false` |
| `isLowEndDevice()` | `hooks/device_perf_tier.ts:24-29` | **Не вызывается нигде** в `app/`/`components/` — деградации анимаций по классу устройства нет |
| `useGuardedNav` | `hooks/use-guarded-nav.ts` | Используется **в одном** месте (`home.tsx:492`); остальные 157 экранов делают `router.push` напрямую |
| `components/LessonLoadingSkeleton.tsx` | 83 стр. | Не импортируется |
| `APP_ART_BACKDROP_NAMES` + `APP_ART_ROUTE_BACKDROPS` | `appArtBackdropRegistry.ts` | Имя игнорируется (`AppArtBackdrop.tsx:52`) |
| `rememberAppArtBackdrop()` | `AppArtBackdrop.tsx:78-82` | Пустое тело |
| `LEGACY_UNSUPPORTED_BG_GRADIENTS` / `LEGACY_UNSUPPORTED_ORBS` | `screenBackground.ts:36-41`, `ScreenGradient.tsx:123` | Темы удалены |

### 6.3 `LayoutAnimation` — платформенный разрыв

`constants/layoutAnimation.ts:24-26`:
```ts
if (Platform.OS === 'android' && isFabricRuntime()) {
  return;                                  // ← Android Fabric = no-op
}
```
`app.json:11` → `"newArchEnabled": true` ⇒ на Android Fabric **всегда** активен. Значит `configureAccordionLayout()` не делает ничего в:
`(tabs)/home.tsx:1201, 1277, 1291`, `community_pack_create.tsx:310`, `community_packs/UgcPackEditorCardPreview.tsx:162`.
На iOS — плавно (320 мс), на Android — прыжок. Один и тот же продукт ведёт себя по-разному.

`collectibles_screen.tsx:623` вызывает `LayoutAnimation.configureNext(Presets.easeInEaseOut)` **напрямую, без Fabric-гарда**.

### 6.4 `reduceMotion` покрытие

33 файла в `app/` содержат маркер, но реально гейтят анимации только 14: `tournament_round`, `tournament_lobby`, `arena_match`, `arena_today`, `arena_ranks`, `arena_history`, `arena_review`, `arena_tops`, `arena_results`, `max_call_halo`, `flashcards_swipe`, `lesson1`, `LeagueResultModal`, `(tabs)/home`, `TabSlider`, плюс `learning-v2/*`.
**Не гейтят:** таббар (`(tabs)/_layout.tsx` — 4 пружины), `lesson_intro_screens` (26 анимаций), `lesson_complete` (12), `pack_opening` (14), `review` (64), `shards_shop` (14), `StartupSplashHold` (бесконечный пульс).

---

## 7. Где вообще нет обработки состояния (файл:строка)

### 7.1 Сетевой/асинхронный экран без loading, empty и error одновременно

| Файл | Строк | Что грузит | Строка входа |
|---|---|---|---|
| `app/flashcards_packs.tsx` | 581 | каталог наборов сообщества | нет ни одного маркера состояния во всём файле |
| `app/learning-v2/lesson/[id].tsx` | 1512 | карта урока v2 | нет `loading`/`empty`/`error` |
| `app/learning-v2/session/[id].tsx` | 2342 | сессия v2 | нет `loading`/`empty` |
| `app/ai_companion_session.tsx` | 532 | сессия AI-компаньона | нет ни одного |
| `app/ai_dialog_home.tsx` | 95 | хаб диалогов | нет ни одного |
| `app/ai_dialog_briefing.tsx` | 132 | брифинг | нет ни одного |
| `app/max_call_prestart.tsx` | 417 | подготовка звонка | нет ни одного |
| `app/max_call_session.tsx` | 1092 | живой звонок | только offline-маркер |
| `app/problem_coach.tsx` | 790 | подбор проблем | нет ни одного |
| `app/hint.tsx` | 1582 | теория/подсказка (`AsyncStorage`, `theory_content_registry`) | нет ни одного |
| `app/lesson_intro_rich.tsx` | 621 | интро | нет ни одного |
| `app/lesson_theory_v2.tsx` | 263 | теория v2 | нет ни одного |
| `app/level_reward_spin.tsx` | 271 | рулетка | нет ни одного |
| `app/flashcards/SessionResultScreen.tsx` | 227 | результат сессии | нет ни одного |
| `app/flashcards/FlashcardDetailsBody.tsx` | 241 | детали карточки | нет ни одного |
| `app/referral_access_ended_modal.tsx` | 311 | конец доступа | нет ни одного |

### 7.2 Состояние объявлено, но не читается (ложный empty / мёртвый флаг)

| Файл:строка | Дефект |
|---|---|
| `app/(tabs)/friends.tsx:1366` | `const [loading, setLoading] = useState(false)` — `setLoading` вызывается (`:1388, :1401`), **`loading` не читается в рендере ни разу**. Во время первой загрузки ленты показывается `emptyState` «Пока нет активности» (`:1538-1546`), затем контент подменяется |
| `app/(tabs)/friends.tsx:1367` | `refreshing` — то же самое; `RefreshControl` в файле отсутствует ⇒ pull-to-refresh не существует, хотя `load(force=true)` реализован |
| `app/achievements_screen.tsx:1351` | `states = []` при монтировании; данные приходят из 6× `AsyncStorage.multiGet` + `Promise.all`(14 ключей). `ListEmptyComponent` «Пока нет полученных наград» (`:1501-1507`) успевает показаться |
| `app/streak_stats.tsx:1215-1216` | `if (loading) return null` — блок пари схлопывается в 0 и раскрывается скачком, толкая вёрстку 4875-строчного экрана |

### 7.3 Загрузка «молчит» — пустой экран вместо состояния

| Файл:строка | Дефект |
|---|---|
| `components/arena/ArenaExpansionUI.tsx:201-202` | `if (copy.silent) return null` — при `state === 'loading'` **8 экранов Арены** (`arena_rivalries`, `arena_mastery_map`, `arena_partner`, `arena_star_wallet`, `arena_match_lab`, `arena_ghost_duel`, `arena_season_pass`, `arena_today`) рисуют пустоту |
| `app/flashcards_listening_session.tsx:562-569` | `if (loading) return <ScreenGradient><SafeAreaView…><Text>…</Text>` — многоточие по центру экрана |
| `app/flashcards_audio.tsx:867-871` | Текст «Загрузка…» в стеклянной панели, дальше hard-swap |
| `components/paywall/PaywallPlanCards.tsx:157` | `{price \|\| (loading ? '…' : '—')}` — цена меняется с «…» на сумму щелчком |
| `components/paywall/PaywallPlanTiles.tsx:168` | то же |
| `app/(tabs)/_layout.tsx:968-970` | placeholder несмонтированного таба = `<View backgroundColor: bgPrimary>` |
| `app/(tabs)/_layout.tsx:116` | `DeferredTabScreen` fallback — тот же плоский `<View>` |
| `components/DeferredRedirect.tsx:33` | `return <View style={{flex:1, backgroundColor: theme.bgPrimary}} />` — первый кадр `index.tsx` / `+not-found.tsx` / `(tabs)/index.tsx` |

### 7.4 Нет offline-обработки на уровне экранов

`OfflineBanner` смонтирован ровно один раз — `app/_layout.tsx:3462`. Ни один из 158 экранов не имеет собственной offline-ветки: при потере сети `arena_*`, `tournament_*`, `flashcards_packs`, `top_helpers`, `club_screen` уходят в `error`/`empty` и выглядят как «данных нет», а не как «сети нет». Единственное осмысленное исключение — `(tabs)/home.tsx:3203-3230` (баннер «Не удалось загрузить данные. Проверь соединение» с кнопкой «Обновить»).

### 7.5 Нет disabled/locked-состояния с движением

`gestureEnabled: false` глобально (`_layout.tsx:3152`) — свайп-назад отсутствует на всём приложении, кроме 15 sheet-экранов и пейволов. Заблокированные элементы (`locked` в `settings_themes.tsx:136`, `disabled` в `V2Cta`) меняют только цвет — нет ни shake, ни pulse, ни haptic-отказа. `MOTION_SPRING.shake` (`constants/motion.ts:37`) и `MOTION_DURATION.shake: 300` объявлены и **не используются ни разу**.

---

## 8. Сводная статистика

| Метрика | Значение |
|---|---|
| Файлов `.tsx` в `app/` | 158 (140 885 строк) |
| Файлов **без единой анимации** | **90** (57 %) |
| Файлов с `entering=` | 25 (16 %) |
| Файлов с `exiting=` | **2** (1,3 %) |
| Файлов со `SkeletonBlock` | 12 (7,6 %) |
| Файлов с `ActivityIndicator` | 18 (11,4 %) |
| Файлов с `RefreshControl` | **2** (1,3 %) |
| Файлов, гейтящих `reduceMotion` | ~14 из 158 |
| Экранов в `ScreenGradient` | 68 — все с одинаковым статичным фоном |
| Анимированных переходов loading→content | **0** |
| Экранов с направленным переходом входа | 15 (sheet) + 7 (пейволы вне онбординга) = **22 из ~130** |

**Диагноз.** Графика в приложении дорогая, а движение — нет: оно либо выключено флагом (`SCREEN_GRADIENT_MOTION_ENABLED`, `FABRIC_BACKGROUND_TRANSITIONS_ENABLED`, `ENABLE_SCREEN_TRANSITIONS`), либо вырезано с оставленным каркасом (каскад главной, `HOME_ENTRANCE`, `LessonLoadingSkeleton`), либо сконцентрировано в трёх островах (Турниры, Арена-матч, Learning V2 session) при мёртвом остатке. Единственные две по-настоящему живые системы — `TabSlider` (свайп табов) и `StartupSplashHold` (сплэш), и обе обрываются: первая не масштабирует длительность по расстоянию, вторая исчезает через `return null`.
