# 05 — Технический аудит анимаций: слабые устройства (Snapdragon 4xx / 4 GB RAM)

Кодовая база: `/root/pm2` (phraseman v1.5.53).
Стек по факту: `react-native 0.81.5`, `react 19.1.0`, `expo ~54.0.35`, `react-native-reanimated ~4.1.1`,
`react-native-gesture-handler ~2.28.0`, `react-native-svg 15.12.1`, `expo-linear-gradient ~15.0.8`,
`expo-image ~3.0.11`, `expo-blur ~15.0.8` (**не используется, см. §5**).
`app.json:11` → `"newArchEnabled": true` — Fabric + Reanimated 4 (worklets на UI-потоке).

Папок `docs/` и `ux-audit/` в контейнере нет — пункт пропущен.

Всего проанализировано **1463** `.ts/.tsx` файла.

---

## 0. Главный вывод и топ-8 проблем

Графика в приложении дорогая, и **движок движения в целом собран грамотно**: 465 вызовов
`useNativeDriver: true` против 14 `false`, есть `hooks/use_reduce_motion.ts`, есть
`useIsScreenFocused`/`useRuntimeActive`, есть `constants/androidGlow.ts` с честным разбором
`elevation` на Android, есть `ConfettiBurst` с хардкапом и автостопом. Это не «типовой RN-проект».

Но ровно там, где графика самая дорогая (празднования, сжигание карточки, тайминг-бары,
скролл-хром табов), движение уезжает на JS-поток — и на Snapdragon 4xx это видно.

| # | Проблема | Файл | Sev |
|---|---|---|---|
| 1 | XP-счётчик через `setInterval(…, 16)` → 75 ре-рендеров модалки поверх летящего конфетти | `components/DialogVictoryCelebration.tsx:303` | **CRITICAL** |
| 2 | Сжигание карточки: 60 частиц + `Math.random()` в теле рендера | `app/review.tsx:539–567` | **CRITICAL** |
| 3 | Таймер-бар диагностики: `width: '0%'→'100%'` + `backgroundColor`, 30 сек на JS-потоке, на каждый вопрос | `app/diagnostic_test.tsx:1225, 1472, 1739` | **CRITICAL** |
| 4 | Весь скролл-хром табов идёт через JS `onScroll` + 2 `Animated.Value.addListener` | `components/TopFadeScrollContext.tsx:48`, `app/(tabs)/_layout.tsx:540`, `components/TopFadeMask.tsx:53` | **HIGH** |
| 5 | Детектор слабого устройства написан и **никуда не подключён** (мёртвый код) | `hooks/device_perf_tier.ts`, `hooks/dev_force_low_end.ts` | **HIGH** |
| 6 | Главный жест обучения (свайп карточек) на `PanResponder` + `Animated.ValueXY` — JS-поток | `app/flashcards_swipe.tsx:2401–2440` | **HIGH** |
| 7 | Анимация `shadowRadius`/`shadowOpacity` через `useAnimatedStyle` на сетке коллекционок | `components/CollectibleArtFrame.tsx:210–215` | **HIGH** |
| 8 | 30 бесконечных циклов в 19 файлах вообще без гарда (ни reduce-motion, ни focus/AppState) | см. §4.3 | **HIGH** |

---

## 1. Карта: какая технология где

### 1.1 Цифры

| Технология | Файлов | Доля |
|---|---|---|
| Reanimated (только) | **106** | app 51 / components 76 (в сумме с «обе») |
| RN Animated legacy (только) | **96** | app 38 / components 77 (в сумме с «обе») |
| **Оба API в одном файле** | **21** | — |
| LayoutAnimation | **4** | — |
| Без анимаций вообще | 1240 | 85 % |

Примитивы:

| Примитив | Кол-во вызовов |
|---|---|
| `useSharedValue(` | **292** |
| `new Animated.Value` | **324** |
| `useNativeDriver: true` | **465** |
| `useNativeDriver: false` | **14** |
| `withRepeat(` | **46** |
| `Animated.loop(` | **66** |
| `useAnimatedScrollHandler` | **6** (в 2 файлах) |
| `entering=`/`exiting=` (Reanimated layout anims) | **112** сайтов в 44 файлах |
| `PanResponder` | 11 файлов |

**Наблюдение.** Соотношение почти 50/50 Reanimated ↔ legacy Animated. Это не ошибка сама по себе
(legacy + `useNativeDriver: true` на Fabric работает нативно), но означает, что **половина движения
не может быть привязана к жесту без прыжка через JS**, и что в 21 файле в одном дереве живут
два разных планировщика анимаций.

### 1.2 Файлы, где смешаны оба API (риск рассинхрона таймингов)

```
app/(tabs)/friends.tsx          app/lesson_menu.tsx
app/(tabs)/lessons.tsx          app/review.tsx
app/(tabs)/settings.tsx         app/shards_shop.tsx
app/_layout.tsx                 app/streak_stats.tsx
app/club_screen.tsx             app/trainer_phrases_session.tsx
app/flashcards/CollectionListView.tsx    components/LevelUpThresholdModal.tsx
app/flashcards/FlashcardListItem.tsx     components/PremiumCelebrationModal.tsx
app/flashcards/FlashcardsTabBar.tsx      components/SpinRewardPlaque.tsx
app/flashcards/PhraseCard.tsx            components/league/LeagueChestTeaserModal.tsx
components/league/LeagueCompetitionScene.tsx   components/league/LeagueMyPositionBar.tsx
components/premium_celebration/AuroraBackground.tsx
```

Худший пример — `components/premium_celebration/AuroraBackground.tsx`: 22 частицы на RN Animated
(`RNAnim.loop`, строки 75–86) и ленты на Reanimated в одном компоненте. Тайминги двух движков
дрейфуют друг относительно друга — «дыхание» фона и «дрейф» частиц никогда не совпадут по фазе.

### 1.3 LayoutAnimation — 4 файла, и они противоречат друг другу

| Файл | Гард `Fabric+Android` | Итог на Android |
|---|---|---|
| `constants/layoutAnimation.ts:24–26` | **есть** (`isFabricRuntime()` → `return`) | корректно выключено |
| `app/smooth_layout.ts:21–28` | **нет** | `configureNext` — холостой вызов, 8 сайтов |
| `app/collectibles_screen.tsx:62–67, 623` | **нет** | то же |
| `components/paywall/PaywallProofCards.tsx:490` | **нет** | то же |

`UIManager.setLayoutAnimationEnabledExperimental` на Fabric — no-op (это прямо признано комментарием
в `app/smooth_layout.ts:13`). При `newArchEnabled: true` анимация раскрытия аккордеонов пейвола и
сетов коллекции **на Android просто не проигрывается**, на iOS — проигрывается. Раскрытие сета в
«Сокровищнице» на Android — телепорт.

**Исправление:** вынести единый гард из `constants/layoutAnimation.ts` в `app/smooth_layout.ts` и
использовать его во всех 4 местах; для Android+Fabric заменить на Reanimated `LinearTransition` /
`FadeIn`+`FadeOut` (в проекте уже 112 сайтов `entering=`, идиома освоена).

---

## 2. Все `useNativeDriver: false` — 14 штук

| # | Файл:строка | Что анимируется | Оценка | Как перевести |
|---|---|---|---|---|
| 1 | `app/diagnostic_test.tsx:1225` | `timerAnim` → `width: '0%'→'100%'` (`:1739`) + `backgroundColor` (`:1472`) | **CRITICAL** | см. ниже |
| 2 | `app/(tabs)/home.tsx:927` | `energyTooltipAnim` (spring) | **HIGH** — ложное `false` | Стиль в `:3241–3245` — только `opacity` + `translateY` + `scale`. **Всё native-совместимо.** Просто поставить `true`. |
| 3 | `app/(tabs)/home.tsx:931` | тот же токен (timing на скрытие) | **HIGH** | то же — `true` |
| 4 | `hooks/useModalBackdropFade.ts:17` | `opacity` затемнения под модалкой | **MED** | Комментарий на `:13` оправдывает `false` «стабильностью на Fabric». Для чистого `opacity` это неверно — native driver поддерживает `opacity` на Fabric. Перевести на `true` либо на `useSharedValue` + `useAnimatedStyle`. |
| 5 | `components/CustomSwitch.tsx:47` | `progress` → `backgroundColor` трека (`:54–57`) | **MED** | `backgroundColor` действительно нельзя нативно в legacy API. Перевести на Reanimated `interpolateColor` в `useAnimatedStyle` — тогда всё на UI-потоке. `thumbX` уже `true` (`:40`) — сейчас переключатель едет двумя разными движками. |
| 6 | `components/league/LeagueChestRing.tsx:40` | `strokeDashoffset` SVG-круга | **LOW** — одноразово, 1100 мс | Оправдано комментарием. Но правильный путь — Reanimated `useAnimatedProps` + `createAnimatedComponent(Circle)`: **в проекте так уже сделано в 8 местах** (`StatScoreRing`, `ArenaTimerRing`, `ComboRing`, `TournamentCountdown`…). Единственный SVG-ринг, оставшийся на JS. |
| 7–11 | `components/MedalToast.tsx:237, 245, 252, 257, 264` | drag-жест тоста (`Animated.ValueXY` + `PanResponder`) | **MED** | `Animated.event` c `ValueXY` из `PanResponder` **обязан** быть `false`. Правильно — перевести тост на `Gesture.Pan()` + `useSharedValue`, как уже сделано в `TabSlider.tsx` и `BouncyScrollView.tsx`. |
| 12 | `app/lesson_irregular_verbs.tsx:929` | `scrollX` горизонтального скролла → позиция кастомного thumb-скроллбара (`:917–919`) | **MED** | `Animated.event` со `scrollX` можно делать с `useNativeDriver: true`, если `scrollX` используется только в `transform`. Здесь `thumbTranslate` — именно `translateX` (`:918`). **Ставится `true` без изменений логики.** |
| 13 | `app/lesson_help_theory_ui.tsx:207` | то же (таблица теории) | **MED** | то же |
| 14 | (второй `useNativeDriver: false` в `MedalToast`) | см. 7–11 | | |

### 2.1 Разбор #1 — `app/diagnostic_test.tsx` (главный убийца)

```
1005  const timerAnim = useRef(new Animated.Value(1)).current;
1222  const progress = Animated.timing(timerAnim, { toValue: 0, duration: remainingMs,
1225                                                useNativeDriver: false });
1472  const barColor = timerAnim.interpolate({ ... });          // backgroundColor
1739  width: timerAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }),
```

`TIMER_SEC = 30` (`:56`). То есть **на каждый вопрос диагностики 30 секунд подряд** JS-поток
шлёт по кадру значение в нативку, а нативка на каждый кадр пересчитывает **Yoga-layout** (потому
что анимируется `width` в процентах — это layout-свойство, а не transform). Плюс интерполяция
цвета фона. Всё это — на экране, где пользователь одновременно тапает варианты ответа, и где
крутится звуковой тик последних 5 секунд (`:1244–1249`).

**Исправление (конкретно):**
1. Полосу сделать полной ширины и анимировать `transform: [{ scaleX }]` от 1 к 0 с
   `transformOrigin: 'left'` (RN 0.76+ поддерживает `transformOrigin`) — `useNativeDriver: true`.
   Либо обёртка `overflow:hidden` + внутренняя вью на `width: '100%'` и `translateX: -width`.
2. Цвет — на Reanimated: `useSharedValue` + `useAnimatedStyle` + `interpolateColor` (UI-поток).
3. Оба — под один `useSharedValue(1)`; тогда весь таймер живёт на UI-потоке и переживает
   даже полную блокировку JS.

Ожидаемый эффект на Snapdragon 4xx: снятие 3–6 мс/кадр JS-работы + один layout-pass на кадр.

---

## 3. Анимации через `setState` / `setInterval` / `requestAnimationFrame` в JS

### 3.1 CRITICAL — `components/DialogVictoryCelebration.tsx:299–314`

```
303   xpTimerRef.current = setInterval(() => {
306     const t = Math.min(1, (now - xpStart) / xpDuration);
307     const eased = 1 - Math.pow(1 - t, 3);
308     setXpDisplay(Math.round(eased * xp));
313   }, 16);
```

`setInterval` с периодом **16 мс** и `setState` внутри → ~**75 полных ре-рендеров** компонента
за 1.2 с. И это происходит ровно в момент, когда на экране:
- 26 конфетти (`CONFETTI_COUNT = 26`, `:75`),
- лучи `RAY_COUNT` (`:363`),
- SVG-кольцо (`AnimatedCircle`, `:44`),
- `heroFloat` + `shimmer` (`withRepeat`, `:266`, `:284`).

Каждый ре-рендер пересоздаёт JSX всех 26 конфетти и лучей. На Snapdragon 4xx это гарантированный
провал в 15–25 fps на самой «дорогой» модалке приложения.

**Исправление:** ровно тот паттерн, который уже есть в `components/stats/StatCountUpText.tsx`
и `components/stats/StatScoreRing.tsx` — `useSharedValue` + `withTiming` + `useAnimatedProps`
на `<AnimatedTextInput value=…>` (компонент уже импортирован в проекте:
`components/feedback/ResultsSequence.tsx:126`). Ноль ре-рендеров, счётчик на UI-потоке.
Промежуточный вариант «в один коммит» — квантование как в `components/SpeakingScoreRing.tsx:76–91`
(12 шагов вместо 75).

### 3.2 HIGH — `components/stats/StatCountUpText.tsx:56–61` и `StatScoreRing.tsx:91–96`

```
56  useAnimatedReaction(() => quantized.value,
58    (v, prev) => { if (v !== prev) runOnJS(setDisplay)(v); });
```

Формально «идиома проекта», но по факту: `quantized` = `Math.round(counter.value * factor)`.
При `decimals = 0` и цели, скажем, 12 500 XP за 900 мс — значение меняется **каждый кадр**,
значит `runOnJS(setDisplay)` вызывается ~54 раза → 54 ре-рендера `<Text>` + 54 перехода
UI-поток → JS-поток. `app/streak_stats.tsx:892` монтирует такой счётчик **в цикле по строкам**
(`delayMs={120 + rowIndex * 70}`) — то есть N счётчиков одновременно, каждый по 54 хопа.

**Исправление:** `AnimatedTextInput` + `useAnimatedProps(() => ({ text: … }))` — текст меняется
на UI-потоке, JS не трогается вообще. Fallback: дать `useAnimatedReaction` явный квант
(обновлять только при изменении на ≥1 % диапазона или не чаще 8 раз/с).

### 3.3 MED — `components/onboarding_aha/TypewriterText.tsx:47–60`

Цепочка `setTimeout(step, charMs)` с `setShownLength(index)` на **каждый символ**.
Для фразы в 60 символов — 60 ре-рендеров. Плюс мигающий курсор отдельным циклом (`:73+`).
Не критично по абсолютной цене (это статичный экран онбординга), но это ровно тот кадр, по
которому пользователь судит о плавности приложения в первую минуту.
**Исправление:** рендерить полную строку и анимировать ширину маски/`opacity` посимвольных
спанов через один shared value; либо оставить, но батчить по 2–3 символа.

### 3.4 MED — `components/league/leagueStatusShared.ts:82–100` (`useCountUp`)

```
92    setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
95    if (p < 1) raf = requestAnimationFrame(tick);
```

Честный rAF-цикл с `setState` на кадр, 620 мс → ~37 ре-рендеров. Гард `reduceMotion` есть
(`:86`) — это хорошо. Но `Date.now()` вместо timestamp из rAF даёт дрожание при джанке.
**Исправление:** тот же `useSharedValue` + `withTiming` + `useAnimatedProps`.

### 3.5 MED — `components/tournament/TournamentFx.tsx:119–121`

```
119  const remove = useCallback((id) => {
120    setEffects((prev) => prev.filter((e) => e.id !== id));
```

Каждая из **16** конфетти (`:137`) и каждая из **4** трасс звезды (`:128`) при завершении
вызывает свой `setEffects` → 20 отдельных `setState` подряд, каждый пересоздаёт массив и
ре-рендерит хост со всеми ещё живыми эффектами. На хвосте анимации — 20 ре-рендеров подряд.
**Исправление:** буферизовать `id` в ref и сбрасывать одним `setEffects` по таймеру
(`requestAnimationFrame` / 100 мс), либо вообще снимать эффекты по одному общему таймеру
длительности, как это сделано в `ConfettiBurst.tsx:123–129`.

### 3.6 Остальные rAF — безопасны

Из 36 сайтов `requestAnimationFrame` **35 — одноразовые отложки на кадр** (фокус инпута,
`scrollToEnd`, `SplashScreen.hideAsync`, `emitAppEvent`). Единственный настоящий цикл —
`leagueStatusShared.ts` (§3.4). `components/animationScheduling.ts` — корректная обёртка с
`cancel()`. Это плюс.

### 3.7 setInterval — 48 сайтов, из них проблемных два

- `components/DialogVictoryCelebration.tsx:303` — 16 мс, см. §3.1.
- `components/arena/ArenaTimerRing.tsx:204` — `setInterval(tick, 250)` с `setSeconds`.
  **Не проблема**: значение меняется раз в секунду, React бейлится на одинаковом стейте,
  а цифры вынесены в отдельный компонент (`:172–176` — грамотное решение, кольцо не
  перерисовывается).
- Остальные 46 — секундные часы/countdown’ы (`visible_wall_clock.ts`, `energy_countdown_clock.ts`,
  `GiftExpiryCountdown`, `tournament_*`). `app/visible_wall_clock.ts` и
  `components/energy_countdown_clock.ts` — синглтон-сторы с подпиской, это правильно.

---

## 4. Бесконечные циклы

### 4.1 Объём

**112 вызовов** бесконечных/повторяющихся анимаций (`withRepeat` 46 + `Animated.loop` 66)
в **70 файлах**.

Топ по плотности:

| Файл | Циклов |
|---|---|
| `components/ScreenGradient.tsx` | 6 (**все под флагом `false`**, см. ниже) |
| `app/LeagueResultModal.tsx` | 4 |
| `components/LevelGiftModal.tsx` | 4 |
| `app/review.tsx` | 3 |
| `components/PremiumCelebrationModal.tsx` | 3 |
| `components/paywall/PaywallMotion.tsx` | 3 |
| `app/shards_shop.tsx` | 3 |
| `components/CollectibleArtFrame.tsx` | 3 (**×N карточек в сетке**) |
| `components/LevelGiftDualModal.tsx` | 3 |
| `components/BoonChestModal.tsx` | 3 |
| `components/league/LeagueCompetitionScene.tsx` | 3 |

### 4.2 Хорошая новость: `ScreenGradient` заглушен

`components/ScreenGradient.tsx:22` → `const SCREEN_GRADIENT_MOTION_ENABLED = false;`
Все 6 циклов фона (главный дрейф, кросс-слой, «нить», sweep, дрейф частиц Cinema) выключены на
уровне флага. `ScreenGradient` используется в **82 файлах** — если бы флаг был `true`, это было бы
6 бесконечных циклов **на каждом экране приложения**. Аналогично
`components/backgroundTransition.tsx:9` → `FABRIC_BACKGROUND_TRANSITIONS_ENABLED = false`.

*Побочный вывод:* примерно 250 строк мёртвого анимационного кода в `ScreenGradient.tsx` и
`backgroundTransition.tsx`. Их стоит либо удалить, либо превратить флаг в `low-end`-переключатель
(см. §10).

### 4.3 HIGH — 30 циклов в 19 файлах вообще без гардов

Ни `reduceMotion`, ни `useIsScreenFocused`, ни `AppState`:

```
4x  components/LevelGiftModal.tsx
3x  components/LevelGiftDualModal.tsx
3x  components/BoonChestModal.tsx
2x  components/LeagueChestOpenModal.tsx
2x  components/BoonActivatedModal.tsx
2x  app/lesson_intro_screens.tsx
2x  app/language_welcome.tsx
1x  components/reward_v2/RewardCardV2.tsx
1x  components/learning-v2-lab/ModeDemoPlayer.tsx
1x  components/WeeklyBoonDetailModal.tsx
1x  components/SeasonGiftModal.tsx
1x  components/PremiumGoldButton.tsx
1x  components/LevelSpinRewardModal.tsx
1x  components/LeagueBonusAvailableModal.tsx
1x  app/voice_equalizer.tsx
1x  app/pack_opening.tsx
1x  app/lesson_complete.tsx
1x  app/flashcards/CollectionListView.tsx
1x  app/flashcards/CardPackShardPaywallModal.tsx
```

Смягчающее обстоятельство: почти все — модалки, которые размонтируются целиком, и у них
**есть корректный cleanup** (`idleLoop.current?.stop()` при `visible === false`, например
`components/LevelGiftModal.tsx:226–228, 291, 308`; `components/BoonChestModal.tsx:89–92, 124–127`).
То есть утечки нет — не хватает именно **reduce-motion** и остановки при сворачивании приложения.

Отягчающее: если пользователь свернул телефон на открытой модалке подарка — 4 цикла
`LevelGiftModal` крутятся на UI-потоке в фоне и греют батарею.

**Исправление (шаблон, уже применённый в `components/CollectibleArtFrame.tsx:59–88`):**
```ts
const reduceMotion = useReduceMotion();
const runtimeActive = useRuntimeActive();       // hooks/use_runtime_active.ts
useEffect(() => {
  if (reduceMotion || !runtimeActive) { loop.current?.stop(); return; }
  …start…
  return () => loop.current?.stop();
}, [reduceMotion, runtimeActive]);
```

### 4.4 CRITICAL (архитектурно) — `useIsScreenFocused` не различает табы

`hooks/use_is_screen_focused.ts:17` — это `useIsFocused()` из React Navigation.
Но все 4 таба живут в **одном** роутном экране `(tabs)` и рендерятся одновременно внутри
`app/TabSlider.tsx:180–190`:

```tsx
{tabs.map((child, i) => (
  <View key={i} style={[s.tab, { width: W }]} pointerEvents={i === activeIndex ? 'auto' : 'none'}>
    {child}
  </View>
))}
```

Значит `useIsFocused()` возвращает **`true` для всех четырёх табов сразу**. Проект это уже
обнаружил и задокументировал в `app/(tabs)/friends.tsx:697–702`:

> «все табы живут в ОДНОМ роутном экране, поэтому `useIsFocused()` возвращает true и для
> невидимых — одного `useRuntimeActive()` было мало, пульс крутился, пока пользователь сидел
> на главной. `runtimeOwnerId` — честный сигнал.»

Но правильный гард (`runtimeOwnerId`) есть только в 5 файлах табов. **17 компонентов с циклами
гардятся только `useIsScreenFocused` и потому не выключаются при переключении таба:**

```
components/HomeTheoAdvisorCard.tsx   components/SkeletonShimmer.tsx
components/ProfileCardMotionFx.tsx   components/ShineOverlay.tsx
components/CollectibleArtFrame.tsx   components/SeasonAuraRing.tsx
components/HoloFoilCard.tsx          components/LevelSpinFinishLine.tsx
components/league/LeagueHotHoursChip.tsx     components/league/LeagueMyPositionBar.tsx
components/league/LeagueCompetitionScene.tsx components/stats/AiBlockNote.tsx
components/paywall/PaywallMotion.tsx components/CleanOnboarding.tsx
components/tournament/TournamentBackdrop.tsx components/onboarding_aha/TypewriterText.tsx
app/learning-v2/lesson/[id].tsx
```

### 4.5 HIGH — `react-freeze` не останавливает нативные анимации

`app/(tabs)/_layout.tsx:130–134`:
```tsx
function TabPane({ freezeWanted, children }) {
  …
  return <Freeze freeze={freezeActive}>{children}</Freeze>;
}
```
`ENABLE_TAB_FREEZE = true` (`:287`), `TAB_FREEZE_MIN_DISTANCE = 2` (`:288`).

Два следствия:
1. **Активный таб + оба соседа всегда «живые»** (расстояние < 2). На табе «Уроки» (idx 1)
   одновременно активны home, lessons, friends — со всеми их циклами.
2. `react-freeze` работает через Suspense: он **прекращает React-рендеры** поддерева, но
   не размонтирует нативные вью и **не выполняет cleanup у `useEffect`**. А значит уже
   запущенные `withRepeat(-1)` (Reanimated, UI-поток) и `Animated.loop(… useNativeDriver: true)`
   (нативный драйвер) **продолжают крутиться на замороженном табе**. Заморозка спасает от
   JS-ре-рендеров, но не от GPU/UI-потока.

**Исправление:** пробросить `runtimeOwnerId` из `app/TabContext.tsx` вниз через контекст
`ownerActive` (в `AvatarView`/`AvatarAura` такой проп уже есть — `components/AvatarAura.tsx:18, 33`)
и перевести 17 компонентов из §4.4 на `useRuntimeActive(runtimeOwnerId === '<мой таб>')`.
Это одна правка на файл и она снимает большую часть фоновой нагрузки.

### 4.6 Reanimated-циклы без `cancelAnimation` на unmount

```
app/language_welcome.tsx
app/(tabs)/friends.tsx
app/learning-v2/lesson/[id].tsx
components/tournament/TournamentAudioButton.tsx
components/arena/ArenaTabBar.tsx
```
Строго говоря, при размонтировании shared value уходит в GC и worklet перестаёт применяться,
но до сборки цикл продолжает тикать на UI-потоке. Стоимость мала, но это ровно тот класс
«накопительной деградации», который уже описан в `hooks/use_is_screen_focused.ts:5–10`.

---

## 5. expo-blur / BlurView

**BlurView не используется нигде.** `expo-blur ~15.0.8` числится в `package.json:226`, но
`import … from 'expo-blur'` в коде отсутствует (0 совпадений по всем 1463 файлам).

Стекло имитируется дешёвым способом — полупрозрачная заливка:
- `components/GlassSurface.tsx` + `constants/glassSurfaceFill.ts:26–30` (`rgba` от токена темы),
- `components/StatsPremiumBlur.tsx` — вопреки названию, **не блюр**:
  `components/statsPremiumBlurCache.ts:12` жёстко возвращает `'flat-veil'`, а сам компонент —
  `LinearGradient` + текст (`:1–11`, нет ни одного импорта blur).

**Вердикт: это лучшее решение из возможных для Snapdragon 4xx.** `BlurView` на Android
(RenderEffect/RenderScript) стоит 8–15 мс/кадр на среднем чипе и делает анимацию поверх себя
невозможной.

**Действие:** удалить `expo-blur` из зависимостей — это лишний нативный модуль в бандле
(~200 КБ APK) и лишняя нативная пересборка.

---

## 6. Тени / elevation / androidGlow на анимируемых вью

### 6.1 Инфраструктура — сделано правильно

`constants/androidGlow.ts` (58 файлов-потребителей) корректно разбирает главный подвох Android:
`elevation` строит outline по **непрозрачному** background-drawable, поэтому на полупрозрачном
фоне рисует квадрат. `softShadow()` (`:59–77`) гасит `elevation` на Android при прозрачном фоне,
`noAndroidOutline` (`:85–86`) — точечный фикс. Это грамотно.

### 6.2 45 анимируемых вью несут тень/elevation

Полный список (файл:строка первой строки JSX):

```
elevation НА АНИМИРУЕМОЙ ВЬЮ (Android перестраивает outline каждый кадр):
  app/(tabs)/lessons.tsx:674          app/LeagueResultModal.tsx:584
  app/club_screen.tsx:1447            components/CollectibleArtFrame.tsx:218
  components/MaintenanceGate.tsx:165  components/PlayerProfileModal.tsx:1238
  components/PromoBanner.tsx:192      components/TopFadeMask.tsx:77

shadowRadius/shadowOpacity НА АНИМИРУЕМОЙ ВЬЮ (iOS перерастрирует тень каждый кадр):
  app/(tabs)/lessons.tsx:674, 2808    app/LeagueResultModal.tsx:584, 1305, 1393
  app/lesson_complete.tsx:486         components/AvatarAura.tsx:159, 175, 191
  components/CollectibleArtFrame.tsx:147   components/LevelGiftDualModal.tsx:801
  components/LevelGiftModal.tsx:588   components/NoEnergyModal.tsx:413
  components/PlayerProfileModal.tsx:1238, 2113   components/level_gift_box.tsx:139, 160, 193
  components/premium_celebration/AuroraBackground.tsx:113–116  (×22 частицы!)

только shadowColor (безвредно):
  ещё 20 сайтов
```

### 6.3 HIGH — анимация самого `shadowRadius`

`components/CollectibleArtFrame.tsx:210–215`:
```ts
const glowStyle = useAnimatedStyle(() => {
  const op  = interpolate(pulse.value, [0,1], [p.glowOpacity*0.55, p.glowOpacity]);
  const rad = interpolate(pulse.value, [0,1], [p.glow*0.7, p.glow]);
  return { shadowColor: color, shadowOpacity: op, shadowRadius: rad, shadowOffset: {…} };
});
```
Это **анимация радиуса размытия тени 60 раз в секунду**. На iOS каждый кадр — новый offscreen-pass
для тени по alpha-каналу слоя. На Android `shadowRadius`/`shadowOpacity` вообще не существуют:
`elevation` задан статически на `:228`, значит все три интерполируемых свойства **на Android
не делают ничего** — worklet считается каждый кадр впустую.

И это в **сетке**: `app/collectibles_screen.tsx:287` (`ownedCards.map`) при раскрытом сете
монтирует до ~11 таких кадров, каждый из которых даёт 1 `Sheen` + 3 `Sparkle` (`:244–252`)
= **до 44 бесконечных циклов + 11 анимаций shadowRadius одновременно**.

**Исправление:**
1. Заменить пульсирующую тень на пульсирующий **отдельный слой-ореол**: абсолютная вью с
   `borderRadius`, залитая `LinearGradient`/сплошным цветом, у которой анимируется только
   `opacity` + `scale`. Это native-friendly на обеих платформах и одинаково выглядит.
2. Сделать «премиальные» эффекты (`Sheen`, `Sparkle`, `pulse`) свойством **только раскрытого /
   видимого** сета: `animated={expanded && isNearViewport}`.
3. Ограничить одновременное число «искрящихся» карточек (например, 3 верхних по редкости).

### 6.4 22 тени на летящих частицах

`components/premium_celebration/AuroraBackground.tsx:107–118` — каждая из 22 частиц
(`PARTICLE_COUNT = 22`, `:44`) несёт `shadowColor/shadowOpacity: 0.9/shadowRadius: 4` и при
этом непрерывно двигается (`translateY` через весь экран, `:88`). На iOS это 22 offscreen-теней
в движении. На Android — 22 бесполезных пропса (без `elevation` тень не рисуется вообще), то
есть **эффект свечения частиц на Android просто отсутствует**, а вычисления остаются.

**Исправление:** заменить тень на сам цвет с чуть большим радиусом и `opacity` — визуально
неотличимо на 3–5 px точке, нулевая цена. Либо один `RadialGradient`-спрайт из `react-native-svg`
как `Image` c `tintColor`.

---

## 7. Частицы / конфетти / звёзды / свечения — сколько одновременно

| Эффект | Файл | Кол-во элементов | Реализация | Оценка |
|---|---|---|---|---|
| Сжигание карточки | `app/review.tsx:539, 549, 559` | **28 + 22 + 10 = 60** | Reanimated, ~5 shared values на частицу ⇒ ~300 SV | **CRITICAL** |
| Конфетти FeedbackKit | `components/feedback/ConfettiBurst.tsx:104, 27` | **до 120** (`HARD_CAP`) | Reanimated, 1 SV + 1 стиль на частицу | HIGH |
| План интенсивности | `components/feedback/results_sequence_motion_plan.ts:133` | `major: 120`, `milestone: 72` | — | HIGH |
| Победа в диалоге | `components/DialogVictoryCelebration.tsx:75` | **26** конфетти + лучи | Reanimated + seeded rand | MED |
| Турнирный FX | `components/tournament/TournamentFx.tsx:128, 137` | 4 трассы + **16** конфетти | Reanimated | MED |
| Рулетка | `components/roulette_win_celebration.tsx:21` | **24** | RN Animated | MED |
| Aurora premium | `components/premium_celebration/AuroraBackground.tsx:44` | **22** частицы, каждая — свой `RNAnim.loop` | legacy Animated | HIGH |
| Лига (сцена) | `components/league/LeagueCompetitionScene.tsx:58, 157` | `CONFETTI_DOTS` — свой `Animated.loop` на точку | legacy Animated | MED |
| Звёзды онбординга | `components/CleanOnboarding.tsx:423` | 18 | **статичные `<View>`, без анимации** | OK |
| Звёзды Cinema-фона | `components/ScreenGradient.tsx:583` | `CINEMA_STARS` | выключено флагом | OK |

### 7.1 CRITICAL — `app/review.tsx` `BurnCardEffect`

```
539  for (let i = 0; i < 28; i++) {
540    const px    = 6 + Math.random() * (w - 12);      // ← Math.random В ТЕЛЕ РЕНДЕРА
541    const py    = Math.random() * h * 0.85;
542    const delay = Math.random() * 480;
543    const size  = 8 + Math.random() * 22;
544    const color = flameColors[Math.floor(Math.random() * flameColors.length)]!;
545    flames.push(<FlameLickParticle key={`f-${i}`} … delay={delay} startY={py} … />);
549  for (let i = 0; i < 22; i++) { … sparks … }
559  for (let i = 0; i < 10; i++) { … smokes … }
```

Три проблемы разом:

**(а) `Math.random()` в render-фазе.** Рендер перестаёт быть чистым. При любом ре-рендере
родителя все 60 частиц получают новые `delay`/`startY`, а у `FlameLickParticle` это deps
эффекта (`:346` → `[delay, startY]`) — **все 60 анимаций перезапускаются с нуля**. Проект
сам знает, что так нельзя: `components/feedback/ConfettiBurst.tsx:29–34` и
`components/tournament/TournamentFx.tsx:95–99` используют детерминированный `seeded()`
именно «без `Math.random` в рендере».

**(б) 60 частиц.** Каждая `FlameLickParticle` — 5 `useSharedValue` (`:303–307`) +
`useAnimatedStyle` с 4 трансформами. Итого ~300 shared values и 60 worklet-стилей,
пересчитываемых каждый кадр на UI-потоке, плюс 60 нативных вью.

**(в) 28 бесконечных `withRepeat(-1)`** на `rotate` (`:331–338`) — в эффекте «сгорания»,
который по смыслу конечен.

Плюс поверх — 3 `LinearGradient` (`:583`, `:591`, `:599`) и анимируемый `backgroundColor`
через `useAnimatedStyle` (`:518–523`, интерполяция `rgba(...)` строкой каждый кадр).

**Исправление:**
1. Вынести генерацию в `useMemo` c детерминированным `seeded(i, salt)` — скопировать
   `ConfettiBurst.tsx:31–34`.
2. Сократить до 18–24 частиц и сделать `rotate` конечным (`withRepeat(…, N, true)`).
3. Добавить low-end-деление (см. §10) и `reduceMotion` — сейчас эффекта нет ни того, ни другого.
4. `charDarken` перевести с `backgroundColor: 'rgba(...)'` на `opacity` чёрного слоя.

### 7.2 HIGH — эвристика «слабого устройства» в `ConfettiBurst` не срабатывает

`components/feedback/ConfettiBurst.tsx:112–116`:
```ts
return PixelRatio.get() < 2 ? Math.max(1, Math.floor(capped / 2)) : capped;
```

`PixelRatio.get() < 2` — это mdpi/hdpi, то есть устройства до ~2014 года.
Типичный Snapdragon 4xx-телефон (Redmi 9A/10A, Galaxy A0x, realme C-серия) — HD+ 720×1600
с density **2.0** (xhdpi) или 2.75 (xxhdpi). Условие `< 2` **ложно** → такие устройства получают
полные **120** частиц. Эвристика защищает ровно тот класс устройств, которого уже нет, и
пропускает целевой.

**Исправление:** привязаться к реальному тиру устройства (§10), а не к плотности. Минимальная
правка — `Platform.OS === 'android' && Platform.Version < 30 → count/2`, плюс кап 60 для
low-end. Ещё лучше — вынести `confettiCount` в `results_sequence_motion_plan.ts:133`, где он
уже вычисляется, и добавить туда третий аргумент `perfTier`.

---

## 8. Утечки: таймеры и анимации без cleanup

**Хорошая новость: явных утечек почти нет.** Автоматический прогон по всем `useEffect`/
`useFocusEffect`, содержащим `setTimeout`/`setInterval` без `clearTimeout`/`clearInterval`
в том же блоке, дал 12 кандидатов; **все 12 при ручной проверке оказались ложными
срабатываниями** — чистка вынесена в ref-массив или в `clearTimers()`:

| Кандидат | Реальный cleanup |
|---|---|
| `components/PremiumCelebrationModal.tsx:218` | `clearTimers()` на `:212–216`, вызывается в `:297` |
| `components/EnergyBar.tsx:71` | `bonusTimersRef` + отдельный unmount-эффект `:43–46` |
| `components/arena/ArenaVersusIntro.tsx:62` | `timers[]` + `:113` |
| `components/feedback/ResultsSequence.tsx:321` | `timeoutsRef` + `clearAllTimers` `:273–277` |
| остальные 8 | аналогично |

### 8.1 Что всё-таки протекает / недочищается

| Файл:строка | Проблема | Sev |
|---|---|---|
| `components/TapScale.tsx:44–45` | нет `stopAnimation()` на unmount. Сравните с `components/PressableScale.tsx:62–65`, где он есть. **158 сайтов `<TapScale>` в 61 файле** — в списках это десятки живущих `Animated.Value` с незавершёнными пружинами | MED |
| §4.6 (5 файлов) | `withRepeat` без `cancelAnimation` | LOW |
| `components/CollectibleArtFrame.tsx:80, 136, 200` | **три** `AppState.addEventListener` на карточку (Sheen + Sparkle + pulse). При 11 карточках и 3 Sparkle — до **44 нативных подписок** на один экран | MED |

### 8.2 66 индивидуальных `AppState.addEventListener`

В проекте **есть** правильный синглтон — `app/runtime_app_state_store.ts` (одна нативная
подписка на всё приложение, `useSyncExternalStore`, 59 потребителей). Но параллельно
**66 компонентов подписываются напрямую**, в том числе те, что размножаются в списках:
`CollectibleArtFrame` (×3), `AvatarAura:60`, `SeasonAuraRing:69`, `HoloFoilCard:152`,
`SkeletonShimmer:87`, `ShineOverlay:88`, `ProfileCardMotionFx:65, 116`.

**Исправление:** заменить все внутрикомпонентные `AppState.addEventListener` на
`useAppRuntimeActive()` / `useRuntimeActive()`. Это ~30 однострочных правок и снимает
десятки нативных подписок на «списковых» экранах.

### 8.3 То же с `useReduceMotion`

`hooks/use_reduce_motion.ts:20–31` на **каждый инстанс** делает:
- асинхронный `AccessibilityInfo.isReduceMotionEnabled()` (нативный вызов),
- `AccessibilityInfo.addEventListener('reduceMotionChanged', …)`,
- собственный `useState`.

**65 call-sites**, и один из них — `components/PressableScale.tsx:58`, то есть **каждая кнопка**.
Плюс `components/CollectibleArtFrame.tsx:167–172` дублирует ту же логику вручную, и
`components/ScreenGradient.tsx:446–463` — третий раз.

На экране с 30 кнопками это 30 нативных вызовов и 30 подписок при монтировании — заметная
доля бюджета первого кадра на Snapdragon 4xx.

**Исправление:** переписать `use_reduce_motion.ts` на модульный стор с
`useSyncExternalStore` (ровно как `app/runtime_app_state_store.ts` и `hooks/dev_force_low_end.ts`):
одна нативная подписка, один промис, N дешёвых подписчиков. Заодно убрать два дубля
(`CollectibleArtFrame`, `ScreenGradient`).

---

## 9. Лишние ре-рендеры от анимаций; setState в render-фазе

### 9.1 setState / побочные эффекты в render-фазе

Единственное настоящее нарушение — **`app/review.tsx:539–567`** (`Math.random()` в теле рендера,
см. §7.1). Прямых `setState` во время рендера не найдено — это редкость для проекта такого
размера и это заслуга.

Пограничный случай — `components/MotionModal.tsx:23–40`:
```ts
useEffect(() => {
  progress.stopAnimation();                       // :24
  …
  if (transition.kind === 'open') { setPresented(true); Animated.timing(…).start(); }
  …
}, [plan.closeMs, plan.openMs, presented, progress, visible]);   // ← presented в deps
```
`setPresented(true)` внутри эффекта, а `presented` — в его же зависимостях. Эффект отрабатывает
дважды: второй проход на строке 24 **останавливает только что запущенную анимацию открытия** и,
поскольку `nextModalTransition` при `visible === true` всегда возвращает `kind: 'open'`
(`components/modal_motion_state.ts:9`), перезапускает её с текущего значения.
Итог — микро-рывок на первом кадре открытия каждой `MotionModal`.
**Исправление:** убрать `presented` из зависимостей (это состояние-производная, а не вход).

### 9.2 Ре-рендеры на кадр от анимаций

| Источник | Файл:строка | Ре-рендеров |
|---|---|---|
| XP-счётчик | `components/DialogVictoryCelebration.tsx:303` | ~75 за 1.2 с |
| `runOnJS(setDisplay)` | `components/stats/StatCountUpText.tsx:59` | ~54 за 0.9 с **×N строк** |
| `runOnJS(setDisplayNum)` | `components/stats/StatScoreRing.tsx:94` | ~54 |
| `useCountUp` rAF | `components/league/leagueStatusShared.ts:92` | ~37 |
| Посимвольная печать | `components/onboarding_aha/TypewriterText.tsx:50` | = длине строки |
| Удаление эффектов по одному | `components/tournament/TournamentFx.tsx:120` | до 20 подряд |

### 9.3 HIGH — скролл табов идёт полностью через JS

Цепочка на каждый кадр скролла в любом табе:

```
ScrollView onScroll (JS, scrollEventThrottle=16)
  └─ app/(tabs)/settings.tsx:418  handleSettingsScroll
       ├─ topFadeScroll.onScroll  → components/TopFadeScrollContext.tsx:48–54
       │     ├─ scrollY.setValue(y)
       │     └─ tabBarScrollY.setValue(y)
       │           ├─ components/TopFadeMask.tsx:53   listener  (порог)
       │           └─ app/(tabs)/_layout.tsx:540      listener  (направление + пороги)
       ├─ settingsScrollYRef.current = …
       └─ onBouncyScroll(e) → components/BouncyScrollView.tsx:206–222
```

То есть **1 JS-колбэк + 2 `setValue` + 2 JS-листенера на каждый кадр скролла**.
Ключевая деталь — `components/BouncyScrollView.tsx:294`:
```ts
const effectiveOnScroll = onScrollWorklet ? onAnimatedScroll
                        : typeof onScroll === 'function' ? handleScroll
                        : onAnimatedScroll;
```
UI-поточный `useAnimatedScrollHandler` (`:226–239`) — уже написан и работает.
Но **как только таб передаёт JS-`onScroll` (а его передают все четыре**:
`home.tsx:521`, `lessons.tsx:2098`, `settings.tsx:419`, `friends.tsx:1906`) — компонент
падает на JS-путь и весь UI-тред-код становится мёртвым.

Комментарии в коде («скролл идёт UI-потоком», `settings.tsx:415–416`) описывают намерение,
а не факт: порог действительно избавляет от анимации на кадр, но **сам колбэк на JS-потоке
выполняется каждый кадр всё равно**.

**Исправление:**
1. Перевести `TopFadeScrollContext` со `Animated.Value` на `useSharedValue` + worklet-сеттер.
2. Пороговую логику маски (`TopFadeMask.tsx:53–64`) и логику схлопывания капсулы таббара
   (`_layout.tsx:540–558`) переписать как `useAnimatedReaction` — обе целиком выражаются
   в worklet'ах (сравнения и `withTiming`).
3. Табы передают `onScrollWorklet` вместо `onScroll` — путь `onAnimatedScroll` включается сам.

Это единственная правка, которая улучшит ощущение **всего приложения** на слабом железе,
потому что скролл — самое частое взаимодействие.

### 9.4 HIGH — главный жест обучения на `PanResponder`

`app/flashcards_swipe.tsx:2401–2440`:
```ts
2401  PanResponder.create({
2409    onPanResponderMove: (_, gesture) => {
2410      position.setValue({ x: gesture.dx, y: gesture.dy * 0.16 });
```
`position` — `Animated.ValueXY` (`:955`), от неё интерполируются `rotate` (`:2463`)
и `yesOpacity`/`noOpacity` (`:2476`, `:2481`).

`PanResponder` — **JS-поток**: каждое движение пальца это нативное событие → JS-колбэк →
2 `setValue` → пересчёт 3 интерполяций. Если в этот момент JS занят (подгрузка следующей карточки,
аналитика, AsyncStorage) — карточка отстаёт от пальца. На Snapdragon 4xx это заметно.

Проект уже умеет делать правильно — `app/TabSlider.tsx:97–168` (`Gesture.Pan()` + shared values,
всё в worklet'ах) и `components/BouncyScrollView.tsx:175–200`.

**Исправление:** переписать свайп на `Gesture.Pan()` + `useSharedValue` + `useAnimatedStyle`,
`runOnJS` только на `onEnd` для смены карточки. Шаблон целиком берётся из `TabSlider.tsx`.

Остальные 10 файлов с `PanResponder` — тосты и bottom-sheet'ы (`MedalToast`, `AchievementToast`,
`OfflineBanner`, `PromoBanner`, `ThemedConfirmModal`, `DevHubSheet`, `MaintenanceGate`,
`streak_stats.tsx:1161`, `trainer_words_session.tsx:145`, `stats/StatBars.tsx:256`).
Там цена ниже (жест короткий, экран статичен), но `MedalToast` — единственный, где
`Animated.event` жёстко тянет `useNativeDriver: false` (§2, #7–11).

---

## 10. reduce-motion / accessibility / деградация на слабых устройствах

### 10.1 reduce-motion — покрытие хорошее, но дырявое

- Хук: `hooks/use_reduce_motion.ts` — корректный (читает начальное значение **и** подписывается
  на `reduceMotionChanged`, `:26–31`).
- **65 call-sites в 56 файлах.**
- Есть на уровне планов движения: `components/feedback/results_sequence_motion_plan.ts:118–128`
  (при reduce-motion `confettiCount: 0`, все задержки в 0), `components/modal_motion_plan.ts:4–6`.
- `app/TabSlider.tsx:38` использует `useReducedMotion()` из самого Reanimated — корректно.

**Дыра:** из 70 файлов с бесконечными циклами **37 не упоминают reduce-motion вообще**
(список гейтов в §4.3). Самое заметное: все модалки подарков/сундуков
(`LevelGiftModal`, `LevelGiftDualModal`, `BoonChestModal`, `LeagueChestOpenModal`,
`SeasonGiftModal`, `LevelSpinRewardModal`) — при включённом «Уменьшении движения» коробка
всё равно качается и парит.

### 10.2 CRITICAL — деградации по производительности НЕТ

`hooks/device_perf_tier.ts` содержит чистую функцию `isLowEndDevice(platform)`
(Android API < 26 → low-end, `:23–27`), а `hooks/dev_force_low_end.ts` — dev-тумблер поверх неё.

**Оба файла не импортируются нигде.** Поиск по всем 1463 файлам:
```
isLowEndDevice        → только объявление (device_perf_tier.ts:23) + комментарий (:10)
useDevForceLowEnd     → только объявление (dev_force_low_end.ts:33)
device_perf_tier      → 0 импортов
dev_force_low_end     → 0 импортов
```

Это **мёртвый код**. Ни один эффект в приложении не знает о тире устройства.

Единственная попытка деградации — `components/feedback/ConfettiBurst.tsx:115`
(`PixelRatio.get() < 2`), и она, как показано в §7.2, **на Snapdragon 4xx не срабатывает**.

Дополнительно: порог `LOW_END_ANDROID_API_LEVEL = 26` (Android 8.0) сам по себе бесполезен —
современный бюджетный Snapdragon 429/460/680 идёт с Android 11–13 (API 30–33) и по этому
критерию считается «сильным».

**Исправление (по шагам):**

1. **Заменить критерий.** Без нативного модуля доступны:
   `PixelRatio.get()` (плотность), `Dimensions.get('window')` (разрешение — у low-end это
   почти всегда 720p, `width ≤ 400 dp` при `height ≤ 900 dp`), `Platform.Version`,
   `Platform.constants.Manufacturer/Model` (доступно на Android без доп. пакетов),
   `performance.now()`-бенчмарк первых 30 кадров. Практичный компромисс:
   ```ts
   // low-end, если Android И (screen ≤ 720p ИЛИ API < 29)
   const { width, height } = Dimensions.get('window');
   const px = PixelRatio.get();
   const physicalW = width * px;            // 720 на бюджетниках
   return Platform.OS === 'android' && (physicalW <= 800 || Number(Platform.Version) < 29);
   ```
2. **Ввести `useMotionTier(): 'full' | 'lite' | 'off'`** — один хук поверх
   `reduceMotion || devForceLowEnd || isLowEndDevice`, на `useSyncExternalStore`.
3. **Подключить к 5 точкам, где это даёт основной выигрыш:**

   | Точка | `full` | `lite` |
   |---|---|---|
   | `results_sequence_motion_plan.ts:133` | 120 / 72 | **40 / 24** |
   | `app/review.tsx:539–567` | 28+22+10 | **10+6+0** |
   | `AuroraBackground.tsx:44` `PARTICLE_COUNT` | 22 | **8** |
   | `CollectibleArtFrame.tsx:244–252` (Sheen/Sparkle) | вкл | **выкл** |
   | `ScreenGradient.tsx:22` `SCREEN_GRADIENT_MOTION_ENABLED` | (сейчас `false`) | `false` — но теперь осознанно, а не глобально |

4. **Показать тумблер в DevHub** (`components/dev/DevHubSheet.tsx`) — `setDevForceLowEnd`
   уже написан ровно под это.

### 10.3 Прочая accessibility

Сделано хорошо: `pointerEvents`, `accessibilityElementsHidden`,
`importantForAccessibility={i === activeIndex ? 'auto' : 'no-hide-descendants'}`
в `app/TabSlider.tsx:184–186` и в `app/(tabs)/_layout.tsx:613–614`;
`components/a11y_state.ts` с `mergeAccessibilityDisabled`; проброс всех Pressable-пропсов
в `TapScale`/`PressableScale`. Замечаний нет.

---

## 11. Тяжёлые SVG и градиенты в анимируемых поверхностях

### 11.1 SVG — объём умеренный

`react-native-svg` в **38** файлах. `SvgXml` (парсинг XML в рантайме — самая дорогая форма) —
только в **одном** месте: `components/CollectibleArt.tsx:74`, и то как fallback, когда нет
удалённой картинки; основной путь — `expo-image` с `cachePolicy="memory-disk"` (`:57–61`).
Арты достижений — тоже растровые (`components/AchievementArt.tsx:77, 93`). Это правильно.

**Анимируемые SVG (`createAnimatedComponent`) — 20 сайтов**, и почти все на Reanimated
(UI-поток, `useAnimatedProps`):
`StatScoreRing`, `ArenaTimerRing`, `ComboRing`, `TournamentCountdown`, `TournamentRoundIntro`,
`TournamentAudioButton`, `DialogVictoryCelebration`, `trainer_session_report`,
`(tabs)/lessons.tsx:1318`.
Единственное исключение — `components/league/LeagueChestRing.tsx:11, 40` на legacy Animated
с `useNativeDriver: false` (§2, #6).

### 11.2 Градиенты — вот тут плотно

`<LinearGradient` по файлам (топ):

| Файл | Кол-во |
|---|---|
| `app/LeagueResultModal.tsx` | **11** |
| `components/ScreenGradient.tsx` | 10 |
| `app/flashcards/CardPackShardPaywallModal.tsx` | 10 |
| `app/(tabs)/home.tsx` | 9 |
| `app/(tabs)/friends.tsx` | 9 |
| `components/reward_v2/RewardCardV2.tsx` | 8 |
| `app/level_exam.tsx` | 8 |
| `components/GoldBevel.tsx` | 7 |
| `app/lesson_menu.tsx` | 7 |
| `app/(tabs)/lessons.tsx` | 7 |

На Android каждый `expo-linear-gradient` — отдельная нативная вью с шейдером. Само по себе
это дёшево, **пока он не двигается**. Проблемные сочетания:

| Место | Проблема | Sev |
|---|---|---|
| `components/CollectibleArtFrame.tsx:100–105` | 5-стоповый `LinearGradient` внутри вращающейся (`rotateZ: 18deg`) и едущей вью, ×11 карточек, ×бесконечный цикл, внутри `overflow: 'hidden'` — каждый кадр композитинг с отсечением | **HIGH** |
| `app/review.tsx:583–605` | 3 `LinearGradient` под 60 анимируемыми частицами, два из них внутри `Reanimated.View` с анимируемой `opacity`/`height` | **HIGH** |
| `app/shards_shop.tsx:124`, `app/flashcards/CardPackShardPaywallModal.tsx:77` | `createAnimatedComponent(LinearGradient)` — анимация пропсов градиента. В `shards_shop` осознанно ограничена (`:314` — комментарий «при 20-30 паках…») и загейчена фокусом (`:200–238`). В `CardPackShardPaywallModal` — **без гарда** (§4.3) | MED |
| `components/GoldBevel.tsx` (7 градиентов) | если применяется к анимируемым кнопкам — 7 слоёв на элемент | MED (проверить сайты применения) |

**Исправление:**
1. Для бегущего блика (`Sheen`) вместо `LinearGradient` использовать одну `Image` с готовым
   градиентным PNG (или `expo-image` с `contentFit="fill"`): нативный композитинг битмапа
   на порядок дешевле шейдера, а на 5-стоповом бликe разницы не видно.
2. Слои, у которых анимируется только `opacity`, вынести из-под `overflow: 'hidden'`, где
   возможно: `overflow: hidden` на Android заставляет создавать промежуточный слой.
3. `app/LeagueResultModal.tsx` (11 градиентов + 4 бесконечных цикла + анимируемые `elevation`
   на `:584`) — кандидат на отдельный проход: свести к 4–5 градиентам, часть заменить на
   плоские `rgba`-заливки из `constants/glassSurfaceFill.ts`.

---

## 12. Сводный план работ по приоритету

### P0 — видно на глаз, чинится точечно

| Задача | Файл:строка | Оценка |
|---|---|---|
| Убрать `setInterval(…,16)` + `setState` из XP-счётчика | `components/DialogVictoryCelebration.tsx:299–314` | 1 ч |
| Таймер-бар диагностики: `width%` → `scaleX`, цвет → Reanimated | `app/diagnostic_test.tsx:1222–1228, 1472, 1739` | 2 ч |
| `Math.random()` из рендера → `useMemo` + `seeded()`; 60 частиц → 24 | `app/review.tsx:533–567` | 2 ч |
| `useNativeDriver: false` → `true` там, где это чистая опечатка | `app/(tabs)/home.tsx:927, 931`; `app/lesson_irregular_verbs.tsx:929`; `app/lesson_help_theory_ui.tsx:207`; `hooks/useModalBackdropFade.ts:17` | 30 мин |

### P1 — системные, дают выигрыш на всём приложении

| Задача | Файл | Оценка |
|---|---|---|
| Скролл-хром табов на UI-поток (`useAnimatedScrollHandler` + `useAnimatedReaction`) | `TopFadeScrollContext.tsx`, `TopFadeMask.tsx:53`, `(tabs)/_layout.tsx:540`, 4 таба | 1 день |
| `useMotionTier()` + подключение к 5 точкам (§10.2) | новый хук + 5 файлов | 1 день |
| `use_reduce_motion` → `useSyncExternalStore` (одна подписка вместо 65) | `hooks/use_reduce_motion.ts` + 2 дубля | 2 ч |
| 66 `AppState.addEventListener` → `useAppRuntimeActive()` | ~30 файлов | 4 ч |
| `runtimeOwnerId` в 17 компонентов с циклами внутри табов (§4.4) | 17 файлов | 4 ч |

### P2 — качество, ощутимо на конкретных экранах

| Задача | Файл |
|---|---|
| Свайп карточек `PanResponder` → `Gesture.Pan()` | `app/flashcards_swipe.tsx:2401–2440` |
| `shadowRadius`-пульс → слой-ореол с `opacity`/`scale` | `components/CollectibleArtFrame.tsx:210–215` |
| Sheen: `LinearGradient` → готовый битмап; кап на число «искрящихся» карточек | `components/CollectibleArtFrame.tsx:100, 244–252` |
| reduce-motion в 19 файлах без гардов | §4.3 |
| Тени на 22 летящих частицах → цвет + opacity | `AuroraBackground.tsx:107–118` |
| Единый Fabric-гард для LayoutAnimation (или переезд на Reanimated) | `app/smooth_layout.ts`, `collectibles_screen.tsx:623`, `PaywallProofCards.tsx:490` |
| `stopAnimation()` на unmount в `TapScale` | `components/TapScale.tsx:44` |
| `presented` из deps эффекта `MotionModal` | `components/MotionModal.tsx:40` |
| Батчинг удаления эффектов | `components/tournament/TournamentFx.tsx:119–121` |
| Удалить `expo-blur` из зависимостей | `package.json:226` |
| Удалить мёртвый анимационный код (`ScreenGradient` 6 циклов, `backgroundTransition`) | §4.2 |

---

## 13. Что в проекте сделано лучше, чем в среднем по индустрии

Чтобы не сложилось впечатление, что всё плохо:

- **97 % анимаций на нативном драйвере** (465 против 14) — редкая дисциплина.
- **Blur не используется вовсе** — единственно верное решение для Android-бюджетников,
  и «стекло» получено дешёвыми полупрозрачными заливками (`constants/glassSurfaceFill.ts`).
- `constants/androidGlow.ts` — грамотный разбор `elevation` vs `shadow*`, 58 потребителей.
- `components/feedback/ConfettiBurst.tsx` — хардкап, детерминированный seed, автостоп,
  `cancelAnimation` в cleanup: эталонная реализация (подводит только эвристика low-end).
- `app/TabSlider.tsx` и `components/BouncyScrollView.tsx` — жесты целиком в worklet'ах,
  с честным разбором прошлых багов в комментариях.
- `components/arena/ArenaTimerRing.tsx:172–176` — цифры вынесены из компонента кольца,
  чтобы посекундный `setState` не перерисовывал SVG. Это ровно тот уровень внимания,
  которого не хватает в §3.1.
- `app/runtime_app_state_store.ts` — синглтон-стор AppState с ленивой нативной подпиской.
- `constants/motion.ts` — токенизированные длительности/пружины/кривые со ссылками на
  первоисточник (Telegram iOS/Android), и раздельные шкалы для Reanimated и legacy API.
