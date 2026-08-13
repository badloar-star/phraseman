# Ресерч: UX-паттерны flashcard-приложений 2024–2026 для переработки раздела карточек

## 1. Колода (deck/stack) vs список — что делают лидеры

**Паттерн-победитель: полноэкранная колода со стопкой (Tinder-style stack), а не список.**

- **Quizlet (mobile)**: одна карточка на весь экран, tap в любом месте — флип, свайп влево/вправо — переход/сортировка. Список терминов вынесен в отдельный sidebar/экран сета, в режиме учёбы его нет. В редизайне Quizlet объединил два режима в один Flashcards с двумя «моушенами»: **Flip** (клик — переворот) и **Flow** (одно движение вниз = показать ответ + перейти к следующей) — минимизация числа действий на карточку.
- **Стек с подглядыванием**: следующая карточка видна под текущей (scale ~0.95, offset 8–12px) — это создаёт ощущение «колоды» и прогресса. Реализуется в RN библиотеками [rn-swiper-list](https://github.com/Skipperlla/rn-swiper-list) (Reanimated + Gesture Handler, есть `flipCard()`, `swipeBack()`, overlay labels, spring config damping/stiffness/mass) или [react-native-swipeable-card-stack](https://github.com/antoine-cottineau/react-native-swipeable-card-stack).

**Что взять**: полноэкранная карточка + видимая стопка из 2–3 карточек под ней; список карточек — только на экране колоды/сета (для browse), не в сессии.

## 2. Жесты: свайп know / don't know

**Quizlet — эталон**: при включённой опции «Sort» свайп вправо = «Знаю» (зелёный overlay + счётчик), влево = «Ещё учу» (оранжевый). Раунд завершается, когда просмотрены все карточки; затем — экран итогов раунда и повтор только «Ещё учу». Это и есть главный сессионный цикл.

**AnkiMobile**: настраиваемые **tap zones** (карточка делится на зоны, каждой назначается действие: показать ответ, Again/Good, undo, TTS) + свайпы. Ответ — тап в любом месте, чтобы открыть, потом 2–4 кнопки оценки с показом интервала («10m», «5d»). Паттерн «весь экран — кнопка "показать ответ"» критичен для скорости.

**Что взять:**
- Свайп вправо = знаю, влево = не знаю; порог срабатывания ~30–40% ширины экрана, ниже — spring-возврат.
- Overlay-лейблы, проявляющиеся с opacity, пропорциональной прогрессу жеста (interpolate по translationX), + rotate карточки ±8–12°.
- Дублирующие кнопки внизу (галка/крестик) — доступность и одноручный режим.
- **swipeBack/undo** — обязательный (есть в rn-swiper-list как `swipeBack()`, в Anki — undo): случайный свайп без отмены = главный источник фрустрации.
- Haptics на каждое событие: `expo-haptics` — `impactAsync(Light)` на флип, `notificationAsync(Success/Warning)` на свайп. Duolingo известен тем, что хаптика «часть одного языка с моушеном» ([разбор](https://www.threads.com/@hi.nixson/post/DDBZIxgsHYp?hl=en-gb), [60fps.design](https://60fps.design/apps/duolingo)).

## 3. Флип-анимация — что делает её «премиальной»

- 3D-переворот по оси Y: Reanimated `rotateY` 0→180°, длительность **250–350 мс**, обязательно `perspective: 1000` в transform и `backfaceVisibility: 'hidden'` на обеих сторонах. Spring (damping ~15, stiffness ~150) ощущается дороже, чем timing-easing.
- Тень/elevation слегка растёт в середине флипа (карточка «поднимается»).
- Duolingo-подход: ключевые празднования (конец сессии, стрик) — не покадровый Lottie, а **Rive** (интерактивные state-machine анимации, лёгкие по размеру) — [разбор](https://dev.to/uianimation/duolingo-style-animation-in-mobile-apps-how-it-works-and-what-a-rive-animator-brings-to-developers-3n38). Для RN: `rive-react-native` или Lottie на экраны результатов.
- Кнопки в стиле Duolingo: «толстая» нижняя грань (border-bottom 4px), при нажатии сдвиг вниз на 2–4px — тактильный «3D press» ([пример](https://60fps.design/shots/duolingo-button-tactile-interaction)).

## 4. Self-grading vs проверка ввода

| Подход | Кто | Механика |
|---|---|---|
| Бинарный self-grade (знаю/не знаю) | Quizlet Sort, Knowt | Свайп, минимум трения, для казуального юзера |
| 4 кнопки Again/Hard/Good/Easy | Anki | Питает алгоритм **FSRS** (дефолт с Anki 23.10): единственный обязательный параметр — **desired retention, дефолт 0.9** (90%), 17–21 весов оптимизируются по истории; интервалы показываются прямо на кнопках. [FAQ](https://faqs.ankiweb.net/frequently-asked-questions-about-fsrs.html), [tutorial](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md) |
| Confidence 1–5 | Brainscape | 1 → повтор через минуты, 2 → 10+ мин, 3 → часы, 4 → дни, 5 → недели/месяцы; mastery% на деку. [Механика](https://brainscape.zendesk.com/hc/en-us/articles/13103043051149-How-Does-Brainscape-s-Spaced-Repetition-Algorithm-Work) |
| Проверка ввода/multiple choice | Memrise, Busuu, Duolingo | Отдельные режимы (Learn/Review/Speed Review), не в flashcard-экране |
| Anki-SM-2 c 4 кнопками поверх заметок | RemNote | [SM-2 описание](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm) |

**Рекомендация для ru/uk-аудитории (казуальные study-сессии):** в основном режиме — **бинарный свайп** (маппится на FSRS как Again/Good — FSRS отлично работает и с двумя оценками); 4-кнопочный grade — как опция «для продвинутых». Проверку ввода не тащить в карточки — сделать отдельным режимом «письмо/квиз» (как Memrise Classic Review — тайпинг и multiple choice отдельно от карточек: [описание](https://memrise.zendesk.com/hc/en-us/articles/360015887697-What-is-Classic-Review-How-can-I-review-words-and-phrases-in-the-app)). Memrise Speed Review — таймерный multiple-choice с «жизнями» — хороший третий режим ([что это](https://memrise.zendesk.com/hc/en-us/articles/4629148290961-What-is-Speed-Review)).

## 5. Режим слушания (auto-play audio decks)

- **Quizlet Autoplay**: кнопка Play — карточки листаются сами (~2 сек на сторону; юзеры массово просят настраиваемую скорость — сделайте её сразу: 1x/1.5x/2x или слайдер интервала 2–8 сек), TTS-озвучка каждой стороны, значок динамика на карточке. [Blog](https://quizlet.com/blog/introducing-our-new-flip-flashcards-mode), [Help](https://help.quizlet.com/hc/en-us/articles/360030988091-Studying-with-Flashcards).
- Паттерн hands-free-приложений ([MemTalk](https://apps.apple.com/us/app/id6468964614), Voice Flashcards): цикл «слово (EN) → пауза на вспоминание → перевод (RU/UK) → следующая», работа с выключенным экраном.
- **Для RN**: `expo-av`/`expo-audio` + **background audio** (`UIBackgroundModes: audio`, `staysActiveInBackground: true`) + lock-screen controls (play/pause/next) через `react-native-track-player` — это то, что реально отличает «премиум» listening-режим. Настройки: порядок (EN→RU / RU→EN / только EN), пауза между сторонами, loop колоды.

## 6. Сессии: длина и структура

- **Quizlet**: сессия = раунд по всему сету → экран результата → повтор «Ещё учу». Прогресс раунда сохраняется при выходе (X).
- **Duolingo**: урок ~2–5 минут, всегда с конечной точкой и празднованием. Микросессии — ядро retention.
- **Исследования/практика**: оптимум **15–30 мин** общего времени, **20–30 карточек** за сессию, новых слов — 10–20/день; сессии короче 10 карточек не дают «потока», длиннее 50 — падение точности ([NoteKnight](https://www.noteknight.com/blog/how-many-flashcards-is-too-many), [Fulin Labs](https://fulinlabs.com/blog/how-many-flashcards-per-day-2026/), [классика Kornell 2009: spacing > cramming](https://sites.williams.edu/nk2/files/2011/08/Kornell.2009b.pdf)).

**Что взять**: сессия фиксированного размера (дефолт **15–20 карточек**, настраиваемо 10/20/30), прогресс-бар сверху (сегментированный, как у Duolingo), экран промежуточного итога после раунда с CTA «добить Ещё учу (N)». Never endless queue — юзер всегда видит, сколько осталось.

## 7. Прогресс и стрики (числа Duolingo)

Из [кейс-стади Trophy](https://trophy.so/blog/duolingo-gamification-case-study):
- **Streak freeze** удлиняет стрики на **48%** (17.19 vs 11.62 дня у 7-day+ юзеров) — заморозка обязательна, стрик без неё вызывает churn при первом срыве.
- Достижение в **день 1** → 14-дневный retention **33.4% vs 20.4%** — дать лёгкую награду в первой же сессии карточек.
- XP сразу после сессии; milestone-празднования стрика (7/30/100 дней) с анимацией.
- Анти-«shame»-подход ([UX Magazine](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame)): не стыдить за срыв, давать «восстановление стрика».
- **Busuu**: word strength 3 уровня (**Weak/Medium/Strong**) с деградацией по Эббингаузу — понятная альтернатива процентам; у Brainscape — mastery % по деке. Хорошо для ru/uk-аудитории: цветной индикатор силы слова на карточке и в списке ([Busuu Vocabulary Review](https://help.busuu.com/hc/en-us/articles/16911730266513-What-is-Vocabulary-Review)).

## 8. Сводка: что конкретно брать в реализацию

1. **Экран сессии**: full-screen стек (2–3 карточки видны), свайп L/R = don't know/know + overlay-цвета, tap = 3D-флип (Reanimated, rotateY, perspective 1000, spring ~300 мс), кнопка undo, дублирующие кнопки внизу.
2. **Grading**: бинарный по умолчанию → FSRS (есть готовые пакеты: [`fsrs` PyPI](https://pypi.org/project/fsrs/2.5.0), `ts-fsrs` для JS) с desired retention 0.9; расширенный 4-кнопочный — в настройках.
3. **Сессии**: 15–20 карточек, сегментированный прогресс-бар, экран результата раунда (знаю/учу + XP + Rive/Lottie-празднование), цикл «добить Ещё учу».
4. **Listening deck**: autoplay с настраиваемым интервалом, background audio + lock-screen controls (react-native-track-player), порядок сторон EN↔RU/UK.
5. **Прогресс**: 3-уровневая сила слова (Weak/Medium/Strong) на карточках, mastery % на деке, стрик со freeze, награда в первой сессии.
6. **Библиотеки**: `rn-swiper-list` или собственный стек на Reanimated 3 + Gesture Handler ([гайд Stormotion](https://stormotion.io/blog/how-to-create-a-tinder-like-card-stack-using-react-native/), [LogRocket](https://blog.logrocket.com/how-to-make-tinder-like-card-animations-with-react-native/)), `expo-haptics` на все жесты, Rive для празднований.

Sources:
- [Quizlet: Studying with Flashcards](https://help.quizlet.com/hc/en-us/articles/360030988091-Studying-with-Flashcards)
- [Quizlet: Introducing our new Flashcards mode](https://quizlet.com/blog/introducing-our-new-flip-flashcards-mode)
- [Quizlet: The Best Thing to Happen to Flashcards](https://quizlet.com/blog/the-best-thing-to-happen-to-flashcards)
- [AnkiMobile Manual: Study Screen](https://docs.ankimobile.net/study-screen.html)
- [Anki FAQ: FSRS](https://faqs.ankiweb.net/frequently-asked-questions-about-fsrs.html)
- [fsrs4anki tutorial](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md)
- [Brainscape: How the algorithm works](https://brainscape.zendesk.com/hc/en-us/articles/13103043051149-How-Does-Brainscape-s-Spaced-Repetition-Algorithm-Work)
- [Brainscape: Confidence-Based Repetition](https://www.brainscape.com/academy/confidence-based-repetition-definition/)
- [Memrise: Classic Review](https://memrise.zendesk.com/hc/en-us/articles/360015887697-What-is-Classic-Review-How-can-I-review-words-and-phrases-in-the-app), [Speed Review](https://memrise.zendesk.com/hc/en-us/articles/4629148290961-What-is-Speed-Review)
- [Busuu: Vocabulary Review](https://help.busuu.com/hc/en-us/articles/16911730266513-What-is-Vocabulary-Review)
- [RemNote: Anki SM-2](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm)
- [Trophy: Duolingo Gamification Case Study](https://trophy.so/blog/duolingo-gamification-case-study)
- [UX Magazine: Hot Streak Game Design](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame)
- [rn-swiper-list](https://github.com/Skipperlla/rn-swiper-list), [react-native-swipeable-card-stack](https://github.com/antoine-cottineau/react-native-swipeable-card-stack), [react-native-deck-swiper](https://www.npmjs.com/package/react-native-deck-swiper)
- [Stormotion: Tinder-like card stack in RN](https://stormotion.io/blog/how-to-create-a-tinder-like-card-stack-using-react-native/), [LogRocket: Tinder-like animations](https://blog.logrocket.com/how-to-make-tinder-like-card-animations-with-react-native/)
- [Rive-анимации в стиле Duolingo](https://dev.to/uianimation/duolingo-style-animation-in-mobile-apps-how-it-works-and-what-a-rive-animator-brings-to-developers-3n38), [60fps.design: Duolingo](https://60fps.design/apps/duolingo), [Duolingo button interaction](https://60fps.design/shots/duolingo-button-tactile-interaction)
- [NoteKnight: How many flashcards](https://www.noteknight.com/blog/how-many-flashcards-is-too-many), [Fulin Labs: cards per day](https://fulinlabs.com/blog/how-many-flashcards-per-day-2026/), [Kornell 2009 (PDF)](https://sites.williams.edu/nk2/files/2011/08/Kornell.2009b.pdf)
- [MemTalk Audio Flashcards](https://apps.apple.com/us/app/id6468964614)


Собрал достаточно данных. Формирую итоговый отчёт.

# Ресерч: премиальные анимации для flashcards в RN (2025–2026, с прицелом на слабые устройства)

## 1. Базовый стек и принципы

**Стек:** `react-native-reanimated` v4 (требует New Architecture) + `react-native-gesture-handler` v2 + `react-native-worklets` (теперь отдельный пакет, peer-dependency Reanimated 4) + `expo-haptics` + `@shopify/flash-list` v2 + `react-native-svg` (для колец прогресса).

**Главные правила производительности:**
- Всё, что движется каждый кадр, — только на UI-потоке (worklets / CSS API). Ни одного `setState` внутри жеста.
- Анимировать только **transform** и **opacity** (композитор, без layout/paint). Не анимировать `width/height/top/left/borderRadius` на слабых Android.
- В Reanimated 4 два режима: **CSS-like API** (`animationName`, `transitionProperty` в стиле) — для state-driven анимаций (флип, появление, прогресс), декларативно и с меньшим оверхедом, т.к. движок заранее знает анимируемые свойства; **worklets + shared values** — для gesture-driven (свайп колоды). Новый spring в v4: задаются только `duration` + `dampingRatio` — поведение предсказуемо независимо от дистанции (старые `stiffness/mass/threshold` больше не нужны).
- Бюджет на слабый Android: ≤ 8–10 одновременно анимируемых вью, без теней (`elevation`+анимация = дорогой redraw), `shadowOpacity` анимировать нельзя — вместо этого кросс-фейд двух слоёв.

## 2. Колода карточек со свайпами (рецепт)

**Не рендерить всю колоду.** Рендерятся **3 карточки**: активная + 2 подложки. Остальные — данные в массиве, монтируются по мере ухода верхней.

```tsx
// per-card
const tx = useSharedValue(0), ty = useSharedValue(0);

const pan = Gesture.Pan()
  .activeOffsetX([-10, 10])            // не конфликтует со скроллом
  .onUpdate(e => { tx.value = e.translationX; ty.value = e.translationY * 0.4; })
  .onEnd(e => {
    const shouldFly = Math.abs(tx.value) > SCREEN_W * 0.35 || Math.abs(e.velocityX) > 800;
    if (shouldFly) {
      tx.value = withTiming(Math.sign(tx.value) * SCREEN_W * 1.5,
        { duration: 250, easing: Easing.out(Easing.quad) },
        (f) => f && runOnJS(onSwiped)(direction));
    } else {
      tx.value = withSpring(0, { duration: 350, dampingRatio: 0.7 }); // rubber-band возврат
      ty.value = withSpring(0, { duration: 350, dampingRatio: 0.7 });
    }
  });

const style = useAnimatedStyle(() => ({
  transform: [
    { translateX: tx.value }, { translateY: ty.value },
    { rotateZ: `${interpolate(tx.value, [-SCREEN_W, SCREEN_W], [-12, 12])}deg` },
  ],
}));
```

**Ключевые числа:**
- Порог свайпа: **35–40% ширины экрана** или **velocityX > 800 px/s** (учёт скорости обязателен — иначе быстрые флики "не долетают").
- Поворот карточки: **±10–15°** на полную ширину, точка вращения смещается вниз (визуально) через дополнительный `translateY` в интерполяции.
- Подложки: карточка №2 — `scale: 0.95, translateY: 12`, №3 — `scale: 0.90, translateY: 24`. При свайпе верхней подложки "подтягиваются" интерполяцией от `|tx| / SCREEN_W` — **без отдельных анимаций**, чистая деривация от одного shared value (бесплатно по CPU).
- Оверлеи "знаю/не знаю": opacity = `interpolate(tx, [0, SCREEN_W*0.35], [0, 1])`, никаких условных рендеров в жесте.
- Готовые референсы: `rn-swiper-list` (Skipperlla) и `react-native-swipeable-card-stack` — можно взять паттерн, но своя реализация на 3 карточках легче.

## 3. 3D-флип карточки (рецепт)

```tsx
const rotate = useSharedValue(0); // 0 = front, 180 = back

const front = useAnimatedStyle(() => ({
  transform: [{ perspective: 1200 }, { rotateY: `${rotate.value}deg` }],
  backfaceVisibility: 'hidden',
}));
const back = useAnimatedStyle(() => ({
  transform: [{ perspective: 1200 }, { rotateY: `${rotate.value + 180}deg` }],
  backfaceVisibility: 'hidden',
}));

const flip = () => { rotate.value = withSpring(rotate.value === 0 ? 180 : 0,
  { duration: 500, dampingRatio: 0.8 }); };
```

**Критично для Android:**
- `perspective` обязателен и должен идти **первым** в массиве transform; значение **1000–1500** (меньше — "рыбий глаз", больше — плоско).
- `backfaceVisibility: 'hidden'` на старых Android иногда глючит (обе стороны видны) → фолбэк: доп. `opacity = rotate.value < 90 ? 1 : 0` внутри `useAnimatedStyle` (шаговое переключение на 90°). Это официальный паттерн из примера Flip Card в доках Reanimated.
- Обе стороны absolute-заполнением, `pointerEvents` переключать по стороне.
- Лёгкий "подскок" премиальности: параллельно `scale: withSequence(withTiming(1.05, {duration: 120}), withTiming(1, {duration: 180}))`.
- Haptic на середине флипа: в `useAnimatedReaction` следить за пересечением 90° и `runOnJS(Haptics.selectionAsync)()`.

## 4. Staggered-вход (появление колоды/списка)

- Для списков/сеток: `entering={FadeInDown.duration(300).delay(index * 60).springify().damping(14)}` — layout-анимации Reanimated работают на UI-потоке, ноль стоимости в JS.
- **Ограничить каскад первыми 8–10 элементами** (`delay(Math.min(index, 8) * 60)`), иначе хвост списка "въезжает" секундами.
- В FlashList entering-анимации применять только при первом маунте экрана (флаг `hasAnimated` в ref), т.к. recycling будет переигрывать их при скролле.
- Альтернатива в Reanimated 4 — CSS API: `animationName: { from: { opacity: 0, transform: [{translateY: 20}] } }, animationDuration: '300ms', animationDelay: \`${index*60}ms\`` — самый дешёвый вариант для state-driven входа.
- Колода из 3 карточек: вход снизу с разлётом — задержки 0/80/160 мс, `dampingRatio 0.75`.

## 5. Celebration-эффекты (частицы без Skia)

- **Лучший компромисс**: **20–30 View-частиц** (цветные прямоугольники 8×14), каждая — один `withTiming`/`withSpring` по заранее рассчитанной траектории (случайный угол, дальность, 2–3 оборота `rotateZ`+`rotateX`), длительность 900–1400 мс, затем размонтировать контейнер целиком. Паттерн описан Shopify ("Building Arrive's Confetti with Reanimated") — 60 FPS на чистом Reanimated без Skia.
- Готовое: `react-native-reanimated-confetti` (без Skia). `react-native-fast-confetti` — быстрее, но тянет Skia — брать только если Skia уже в проекте.
- Дешёвая альтернатива "полного экрана конфетти": **burst из точки** (звёздочки/эмодзи разлетаются от карточки) — 12–16 частиц, читается как премиум, стоит копейки.
- На совсем слабых устройствах — деградация: вместо частиц масштаб-пульс карточки + haptic `notificationAsync(Success)`. Детект: `Platform.OS === 'android' && totalMemory < 3GB` (через `expo-device`) или просто пользовательский тумблер "упрощённые эффекты".

## 6. Прогресс-кольца

- **react-native-svg + animatedProps**, НЕ Skia:

```tsx
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const progress = useSharedValue(0);
const animatedProps = useAnimatedProps(() => ({
  strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
}));
// <AnimatedCircle strokeDasharray={CIRCUMFERENCE} strokeLinecap="round" animatedProps={animatedProps} />
progress.value = withSpring(newValue, { duration: 800, dampingRatio: 1 }); // без overshoot
```

- Параметры: strokeWidth 8–10% диаметра, `rotation="-90"` (старт сверху), `strokeLinecap="round"`. Для колец >1 на экране — статичный фон-трек отдельным Circle (не анимируется).
- Счётчик процентов рядом — не через setState на каждый кадр. Либо `ReText` из `react-native-redash` (обновление текста на UI-потоке), либо обновлять состояние только по завершении анимации.

## 7. Haptics-синхронизация

- `expo-haptics`: `selectionAsync()` — тик при пересечении порога свайпа (один раз, флаг в shared value); `impactAsync(Light)` — флип; `notificationAsync(Success/Error)` — ответ верный/неверный; серия «стрик» — 3× `impactAsync(Light)` с шагом 100 мс.
- Из worklet — только `runOnJS(hapticFn)()`; задержка JS-моста ~1–2 кадра незаметна для тактильности. **Дебаунсить**: haptic на пересечении порога должен срабатывать один раз, храните `crossedThreshold` в `useSharedValue(false)`.
- Android: haptics заметно грубее — использовать только Light/selection, проверять `Haptics` доступность; дать выключатель в настройках.

## 8. Lottie / Skia — когда оправданы

| Инструмент | Брать когда | Не брать когда |
|---|---|---|
| **Reanimated (View/transform)** | 95% случаев: свайпы, флипы, stagger, burst-частицы, кольца (с SVG) | сложный векторный арт |
| **Lottie** (`lottie-react-native`) | одиночные декоративные сцены: маскот, пустые состояния, экран победы. Один инстанс, `renderMode="HARDWARE"` на Android, JSON < 200 KB, без масок/мэттов (дороги на слабых устройствах) | интерактив, синхронизация с жестом, много инстансов в списке |
| **Skia** (`@shopify/react-native-skia`) | сотни частиц, шейдеры, blur/gradient-меши, рисование | ради одного конфетти — +4–6 MB к бандлу и лишняя поверхность рендера; на low-end Android canvas на весь экран поверх UI сам по себе стоит FPS |
| **Rive** | нужен интерактивный маскот со state machine (лёгкий рантайм, легче Lottie по CPU) | простые one-shot эффекты |

Практическое правило: если эффект выразим через `transform+opacity` ≤ 30 вью — Reanimated; если это "видео-подобный" арт — Lottie; Skia — только при уже существующей потребности в кастомном рендеринге.

## 9. FlashList v2 vs FlatList

- **FlashList v2** (Shopify): drop-in замена FlatList, только New Architecture, теперь **JS-only** (нет нативных зависимостей), `estimatedItemSize` больше **не нужен**. Recycling вместо unmount/mount → стабильные 60 FPS и меньше CPU на слабых устройствах, нет blank cells.
- Обязательно: `getItemType` для гетерогенных ячеек (разные пулы recycling), ячейки без `key` завязанных на данные side-effects (recycling переиспользует компонент — сбрасывать локальный state через `useEffect` по item.id).
- FlatList оставлять только для списков < 20 элементов (например, сама колода) — там FlashList не даёт выигрыша.
- Для сетки наборов карточек: `numColumns` / masonry поддерживаются в v2 из коробки.

## 10. Оптимизация re-render (чек-лист)

1. Жест/анимация не должны трогать React state до завершения: всё через shared values, `runOnJS` — только терминальные колбэки (`onSwiped`, haptic).
2. `React.memo` на Card, компаратор по `item.id` + `isTop`; колбэки — стабильные (`useCallback` / прокидывать shared values, а не значения).
3. Деривации (подложки, оверлеи, прогресс) — через `useDerivedValue`/`interpolate` от одного источника, а не отдельные состояния.
4. Не создавать объекты стилей в рендере активной карточки; `useAnimatedStyle` не должен читать props, меняющиеся каждый рендер.
5. Изображения на картах — `expo-image` с `recyclingKey` (для FlashList) и `cachePolicy="memory-disk"`.
6. Замер: `useFrameCallback` + счётчик кадров в dev, целевой бюджет — UI thread 60 FPS при свайпе, JS thread может проседать (и это нормально, если анимация на UI-потоке).
7. `InteractionManager.runAfterInteractions` / `requestAnimationFrame` для тяжёлой логики после свайпа (запись прогресса, prefetch следующей карточки).

Sources:
- [Reanimated 4 Stable Release — Software Mansion](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)
- [Flip Card — Reanimated docs](https://docs.swmansion.com/react-native-reanimated/examples/flipCard/)
- [FlashList — Shopify GitHub](https://github.com/Shopify/flash-list)
- [Instant Performance Upgrade: FlatList to FlashList — Shopify Engineering](https://shopify.engineering/instant-performance-upgrade-flatlist-flashlist)
- [Building Arrive's Confetti with Reanimated — Shopify Engineering](https://shopify.engineering/building-arrives-confetti-in-react-native-with-reanimated)
- [react-native-reanimated-confetti](https://github.com/felippepuhle/react-native-reanimated-confetti)
- [react-native-fast-confetti](https://github.com/AlirezaHadjar/react-native-fast-confetti)
- [Skia discussion: performant confetti/snow](https://github.com/Shopify/react-native-skia/discussions/2141)
- [rn-swiper-list](https://github.com/Skipperlla/rn-swiper-list)
- [react-native-swipeable-card-stack](https://github.com/antoine-cottineau/react-native-swipeable-card-stack)
- [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [useHaptic hook — Medium/Timeless](https://medium.com/timeless/implementing-haptic-feedback-in-react-native-writing-a-usehaptic-hook-6b8612675599)
- [FlashList vs FlatList — Whitespectre](https://www.whitespectre.com/ideas/better-lists-with-react-native-flashlist/)
- [react-native-skottie (Skia+Lottie сравнение)](https://github.com/margelo/react-native-skottie)
- [GeekyAnts: Card Flip with Reanimated](https://geekyants.com/blog/how-to-build-simple-card-flip-animation-in-react-native-using-reanimated-v2)
- [freeCodeCamp: Fluid Animations with Reanimated v4](https://www.freecodecamp.org/news/how-to-create-fluid-animations-with-react-native-reanimated-v4/)


# Ресерч: система «звёзд» для раздела Flashcards

## 1. Что показал ресерч референсов

### Duolingo (gems, XP, streak, crowns)
- **Разделение ролей валют** — ключевой паттерн: XP = метрика усилий (лиги, уровни, ~10 XP/урок + комбо-бонус до +5 за безошибочный урок), gems = тратимая валюта, streak = удержание, crowns/legendary = мастерство контента. Валюты **не конвертируются друг в друга** — это главный анти-инфляционный приём.
- Конкретные цифры заработка gems: ~7 за просмотр рекламы, ~25 за ачивку, 5–75 за место в лиге (Bronze 1-е место = 20, Diamond 1-е = 75), сундуки с variable-наградой 5–60 gems. Стоки (sinks): Streak Freeze ~200, восстановление hearts 350–500, Timer Boost ~450, попытка Legendary ~100 gems. То есть **дневной заработок ~30–60, цена полезного стока 200–500** → на осмысленную покупку копить 3–7 дней. Это целевая пропорция.
- Streak-механика: milestone-праздники на 7/14/30/50/100/365 днях, streak freeze как «страховка», выбор цели стрика (7–50 дней) при онбординге.
- Критика (UX Collective): при избытке gems и отсутствии стоков валюта теряет смысл — у ветеранов копятся десятки тысяч gems, мотивационный эффект нулевой. Вывод: **стоки важнее источников**.

### 3-звёздочные рейтинги (Angry Birds / Candy Crush / Two Point Hospital)
- Звёзды за уровень — это **оценка качества, а не валюта**: пороги всегда видимы заранее, 3 звезды = perfect, что создаёт replayability («вернись и добей до 3 звёзд») без инфляции — по каждому юниту контента звёзды можно получить лишь один раз.
- Звёзды часто **гейтят контент** (открой следующую главу, набрав N звёзд суммарно) — это второй способ сделать их дефицитными.
- 3 тира (а не 5 и не проценты) — оптимум различимости: «прошёл / хорошо / идеально».

### Variable rewards и milestones
- Переменная награда (сундук 1–3x вместо фиксированной суммы) даёт более сильный дофаминовый отклик, чем предсказуемая — но её нужно вешать на **уже совершённое** целевое действие (perfect session), а не на лутбокс за деньги.
- Milestone-награды должны быть редкими и «праздничными» (7/30/100 дней), рядовые дни — маленькая предсказуемая база + шанс бонуса.

## 2. Роли валют в вашем стеке (чтобы звёзды не дублировали существующее)

| Валюта | Роль | Звёзды НЕ должны это делать |
|---|---|---|
| XP | накопительный прогресс/уровни/лиги | не мерить «количество усилий» |
| Shards | мягкая тратимая валюта | не быть вторым кошельком общего назначения |
| Energy | лимитер сессий | не покупать energy за звёзды напрямую (иначе связка ломает лимитер) — либо покупать очень дорого |
| **Звёзды** | **метрика качества/мастерства тренировки карточек** | — |

Главное правило анти-инфляции: **звёзды нельзя купить ни за деньги, ни за shards** — только заработать качеством. Обратная конвертация (звёзды→shards) допустима только с жёстким кэпом.

## 3. Три конкретные экономики

### Экономика A — «Звёзды-рейтинг» (по образцу 3-star levels, не валюта). Минимальный риск инфляции
Каждая колода/подтема имеет рейтинг 0–3★, звёзды перезаписываются лучшим результатом, суммарные звёзды гейтят контент.

- Сессия = 10 карточек. Пороги (видимы до старта):
  - ★ — accuracy ≥ 70%
  - ★★ — accuracy ≥ 90%
  - ★★★ — **perfect session**: 100% + среднее время ответа ≤ 5 сек/карточка
- Гейтинг: следующий раздел курса открывается при `totalStars ≥ 0.6 × maxStars` предыдущего (как в Angry Birds).
- Milestone-сундуки за суммарные звёзды: 10★ → 50 shards, 25★ → 150 shards + рамка аватара, 50★ → 400 shards. Одноразовые — инфляции нет по построению.
- Decay для ежедневности: через 7 дней без тренировки колоды её звёзды «тускнеют» (визуально, `isFaded: true`), повторная тренировка на тот же результат возвращает блеск. Мягкий триггер ежедневных сессий без отбирания прогресса.
- API: `POST /v1/flashcards/sessions/{id}/complete` → `{ stars: 0..3, bestStars, accuracy, avgAnswerMs, thresholds }`; `GET /v1/flashcards/decks?include=stars`; конфиг порогов в remote config `star_rating_config`.
- Плюсы: нулевая инфляция, понятность, replayability. Минусы: нет ежедневного «заработка», слабее хук на daily-сессии (компенсируется decay).

### Экономика B — «Звёзды-валюта с жёстким дневным кэпом» (по образцу gems). Максимальный daily-хук
Звёзды — копимая валюта исключительно за качество тренировок, с кэпом и собственными стоками.

- Заработок за сессию (10 карточек):
  - база: 1★ за завершение (требует accuracy ≥ 60%)
  - +2★ за perfect session (100%)
  - +1★ speed bonus (медиана ответа ≤ 4 сек при accuracy ≥ 90%)
  - training-streak дней подряд: ×1 (1–2 дня), ×1.5 округл. вниз (3–6), ×2 (7+). Максимум за сессию: 4★ × 2 = 8★
- **Дневной кэп: 20★** (примерно 2.5 идеальные сессии) — главный анти-инфляционный механизм; повторная тренировка той же колоды в тот же день даёт 50% звёзд (diminishing returns).
- Milestone стрика тренировок: 7 дней → +10★, 30 → +50★, 100 → +200★ (вне дневного кэпа, одноразово на milestone).
- Стоки (цены ~3–7 дней активной игры, по пропорции Duolingo):
  - Streak Freeze тренировок — 60★
  - «Заморозка колоды» (отключить decay на 7 дней) — 40★
  - Обмен на energy: 5 energy — 100★ (дорого, кэп 1 раз/день)
  - Косметика темы карточек / рубашки колод — 150–400★
  - Досрочный доступ к тематической колоде недели — 120★
- Health-метрика экономики: целевой sink/source ratio 0.7–0.9 в неделю; если у p90-игроков баланс растёт >3 недель подряд — поднимать цены через remote config `star_economy_v1`.
- API: `POST /v1/flashcards/sessions/{id}/complete` → `{ starsEarned, breakdown: { base, perfect, speed, streakMultiplier }, dailyCapRemaining }`; `GET /v1/wallet` → `{ xp, shards, energy, stars }`; `POST /v1/store/purchase { itemId, currency: "stars" }`; аналитика: события `stars_earned`, `stars_spent`, `star_daily_cap_hit`.
- Плюсы: сильный ежедневный хук, стыкуется с магазином. Минусы: нужен постоянный контент в стоках, иначе повторится «болезнь gems».

### Экономика C — гибрид «рейтинг + сундук» (рекомендую). Variable rewards поверх честного рейтинга
Сессия оценивается в 0–3★ как в экономике A (те же пороги 70/90/100+speed), но звёзды не копятся напрямую — они **заполняют недельный прогресс-бар** и открывают сундуки с переменной наградой в shards (существующей валюте!), т.е. новая валюта-кошелёк вообще не вводится.

- Недельный бар: 21★ (3★/день × 7). Чекпоинты-сундуки: 7★ → 20–40 shards (roll), 14★ → 40–80 shards, 21★ («perfect week») → 100–200 shards + эксклюзивная косметика.
- Variable reward: содержимое сундука — взвешенный ролл (70% нижняя граница, 25% середина, 5% джекпот ×2) — классический variable-ratio хук без лутбоксов за деньги.
- Perfect session дополнительно даёт мгновенный буст `xpMultiplier: 1.5` на 15 минут (паттерн Duolingo Early Bird/комбо) — связка с XP без эмиссии валют.
- Training streak учитывается просто: стрик ≥ 7 дней снижает порог perfect week с 21★ до 18★ («прощённые» 3★).
- Анти-инфляция: эмиссия shards предсказуема и ограничена сверху (максимум ~320 shards/нед с джекпотами), сундуки одноразовые, звёзды сгорают в конце недели (reset в понедельник 00:00 локали пользователя).
- API: `GET /v1/flashcards/week-progress` → `{ stars, checkpoints: [{at:7, state:"claimed"}, ...], resetsAt }`; `POST /v1/flashcards/checkpoints/{n}/claim` → `{ reward: { shards, roll: "mid" } }`; конфиг `weekly_star_track_config`.
- Плюсы: daily-хук + variable rewards + ноль новых кошельков + нулевая долгосрочная инфляция (недельный reset). Минусы: чуть сложнее объяснить в UI (нужен онбординг-тултип на 2 экрана).

## 4. Сравнение и рекомендация

| Критерий | A (рейтинг) | B (валюта) | C (гибрид) |
|---|---|---|---|
| Daily-мотивация | средняя | высокая | высокая |
| Риск инфляции | нулевой | средний (нужны стоки) | низкий (weekly reset) |
| Совместимость с XP+shards+energy | отличная | требует балансировки | отличная (кормит shards) |
| Стоимость разработки | низкая | высокая (магазин, кошелёк) | средняя |

Рекомендация: запускать **C** как MVP (2 спринта), при хорошем retention-эффекте докрутить гейтинг контента из **A** (звёзды колод как постоянный рейтинг мастерства + weekly-трек как расходный слой). **B** имеет смысл только если планируется полноценный магазин косметики для карточек.

Sources:
- [Duolingo — analyzing all engagement mechanics (Health Matters)](https://healthmattersandme.substack.com/p/duolingo-analyzing-all-engagement)
- [Duolingo XP vs Gems: differences and benefits (DuolingoGuides)](https://duolingoguides.com/duolingo-xp-vs-gems/)
- [The good, the bad and the ugly of Duolingo gamification (UX Collective)](https://uxdesign.cc/the-good-the-bad-and-the-ugly-of-duolingo-gamification-3a12f0e80dc7)
- [Duolingo Streak System — detailed breakdown (Medium, Premjit Singha)](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f)
- [Dave's Overly Detailed Analysis of a Game System: Scores / 3-star systems (Medium)](https://medium.com/@davesinhispants/daves-overly-detailed-analysis-of-a-game-system-part-1-scores-fbc0437ee950)
- [Variable rewards in product design (Appcues)](https://www.appcues.com/blog/variable-rewards)
- [Designing Reward Loops That Keep Players Hooked (Medium, Rakesh Roy)](https://medium.com/@rakeshroyakula/designing-reward-loops-that-keep-players-hooked-without-manipulation-58447c858d4a)
- [Duolingo's Gamification Secrets (Orizon)](https://www.orizon.co/blog/duolingos-gamification-secrets)
- [Hook Model critique — habits vs addiction (Yu-kai Chou)](https://yukaichou.com/gamification-analysis/hook-model-octalysis-habit-addiction/)


# Ресерч: звуковой дизайн раздела Flashcards (RN/Expo, аудитория ru/uk, изучение en)

## 1. Карта SFX: какие звуки нужны и какими они должны быть

Общие принципы (из практики Duolingo и гайдов по UI-звуку): звук должен закончиться **до** того, как задержит следующее действие; success/error различаются **направлением мелодии, ритмом и тембром, а не громкостью**; все звуки — одно «семейство» (один инструмент/синт, одна тональность); интерфейсные звуки всегда тише речи (TTS) и музыки.

| Событие | Характер звука | Длительность | Относит. громкость (volume в плеере) |
|---|---|---|---|
| `card_flip` | сухой короткий «flick»/бумажный шелест, без тона | 80–150 мс | 0.25–0.35 |
| `swipe_left` (не знаю) | нисходящий короткий whoosh | 120–200 мс | 0.3 |
| `swipe_right` (знаю) | восходящий whoosh + лёгкий «tick» | 120–200 мс | 0.3 |
| `correct` | мажорный восходящий интервал (2 ноты, напр. C5→E5), мягкий синт/маримба | 200–400 мс | 0.5–0.6 |
| `incorrect` | нисходящий приглушённый «thud»/минорная секунда, **без резкого buzzer** (не наказывать) | 150–300 мс | 0.4 (тише, чем correct) |
| `combo_x3/x5/x10` | тот же мотив correct + 1 нота выше с каждым уровнем комбо (питч +2 полутона на ступень — приём Duolingo: звук стрика «растёт») | 300–500 мс | 0.6 |
| `session_complete` | короткая фанфара/арпеджио 3–5 нот, единственный «длинный» звук | 700–1200 мс | 0.7 |
| `star_earned` / milestone | «sparkle»/колокольчик | 300–500 мс | 0.5 |
| `button_tap` (опционально) | едва слышный tick | 30–60 мс | 0.15–0.2 (или вообще haptics вместо звука) |

Технические параметры файлов: mp3/aac 44.1 kHz, моно достаточно для SFX; нормализация всего пака к единому уровню (пик ≈ −6…−3 dBFS, интегрально ≈ −16…−14 LUFS), чтобы баланс регулировать только `volume` в коде. Ошибочный звук делайте на 20–30% тише успешного. Обязательно дублируйте каждым звуком haptics (`expo-haptics`: `notificationAsync(Success/Error)` для correct/incorrect, `impactAsync(Light)` для flip/swipe) — при выключенном звуке фидбек сохраняется.

## 2. Где взять / как сгенерировать

- **[Kenney UI Audio](https://kenney.nl/assets/ui-audio)** и остальные паки Kenney — CC0, 50+ interface-звуков (clicks, switches, confirmations), идеально как база. Есть и в [Godot Asset Library](https://godotengine.org/asset-library/asset/796).
- **[uisfx.com](https://uisfx.com/ui-sound-design)** — 78 семантических событий × 12 «стилей» = 936 звуков, аудио CC0, ставится как `npm install uisfx`, звуки уже сгруппированы по ролям (success/error/notification) — самый быстрый путь получить когерентное «семейство».
- **[ZapSplat CC0-раздел](https://www.zapsplat.com/license-type/cc0-1-0-universal/)** и freesound.org (фильтр CC0) — для whoosh/flip.
- Генерация: jsfxr/sfxr (8-bit, вряд ли ваш стиль), либо ElevenLabs Sound Effects / Meta AudioGen по текстовому промпту («soft two-note marimba success chime, 300ms»); комбо-серию проще всего сделать самим: один сэмпл correct + питч-шифт на +2/+4/+6 полутонов (ffmpeg `asetrate`+`atempo` или заранее отрендерить 3–4 файла — лучше файлы, RN питч-шифт на лету неудобен).
- Референс-эталон: разберите звуки Duolingo на [Myinstants](https://www.myinstants.com/en/search/?name=duolingo) (не копировать, но снять тайминги/интервалы: их correct ≈ 0.3 с, две восходящие ноты).

## 3. Воспроизведение: expo-audio, дакинг, silent mode

Используйте **expo-audio** (новая библиотека; expo-av deprecated, и в expo-av дакинг на iOS официально сломан — [issue #29077](https://github.com/expo/expo/issues/29077), [#19042](https://github.com/expo/expo/issues/19042)).

```ts
import { setAudioModeAsync } from 'expo-audio';

await setAudioModeAsync({
  playsInSilentMode: true,      // SFX/TTS слышны при беззвучном переключателе
  interruptionMode: 'duckOthers', // музыка юзера (Spotify) приглушается на время TTS
  shouldPlayInBackground: false,  // true только для авто-listening режима
});
```

- **SFX**: по одному `AudioPlayer` (`createAudioPlayer(asset)`) на каждый звук, создать при входе в раздел, держать в пуле, перед `play()` делать `seekTo(0)` — нулевая задержка, допускается наложение flip+correct.
- **Дакинг TTS поверх чужой музыки**: `interruptionMode: 'duckOthers'`. Для SFX-только экранов достаточно `mixWithOthers` (дефолт), чтобы не трогать музыку пользователя ради 100-мс «тика». Практичный компромисс: `mixWithOthers` глобально, переключение на `duckOthers` при входе в listening-режим и обратно при выходе.
- **Дакинг своих SFX под свой TTS**: не играть correct/incorrect одновременно с речью — очередь: SFX (≤400 мс) → пауза 100–150 мс → TTS.
- **iOS silent mode**: по [Apple HIG](https://developers.apple.com/design/human-interface-guidelines/patterns/playing-audio/) короткие UI-звуки должны уважать беззвучный режим (категория ambient), а «контентное» аудио (TTS слова — это контент, ради него пользователь нажал кнопку) — играть несмотря на switch (категория playback). В Expo одна сессия на всё, поэтому выбор: `playsInSilentMode: true` (рекомендую — в языковом приложении произношение критично, так делают Duolingo/Quizlet) и отдельный **in-app тумблер «Звуковые эффекты» и «Автопроизношение»** в настройках раздела.
- **Важный баг**: `expo-speech` сам по себе молчит в silent mode ([issue #8235](https://github.com/expo/expo/issues/8235), [#29158](https://github.com/expo/expo/issues/29158)) — воркараунд именно в том, чтобы **до первого `Speech.speak` вызвать `setAudioModeAsync({ playsInSilentMode: true })`** из expo-audio, это переключает AVAudioSession в playback. Проверить на физическом девайсе обязательно.

## 4. TTS: выбор голосов через expo-speech

API ([docs](https://docs.expo.dev/versions/latest/sdk/speech/)): `Speech.speak(text, { voice, language, rate, pitch, volume, onDone, onStart, onError })`; `Speech.getAvailableVoicesAsync()` → `{ identifier, name, language, quality: VoiceQuality.Default | Enhanced }`.

**Стратегия выбора голоса (iOS):**
1. `getAvailableVoicesAsync()`, фильтр `language === 'en-US'`.
2. Приоритет: `quality === 'Enhanced'` → иначе compact. Форматы идентификаторов:
   - compact (всегда предустановлены): `com.apple.voice.compact.en-US.Samantha`, `com.apple.ttsbundle.siri_Aaron_en-US_compact`, `com.apple.ttsbundle.siri_Nicky_en-US_compact`;
   - enhanced (если пользователь скачал в Настройках): `com.apple.voice.enhanced.en-US.Ava`, `...enhanced.en-US.Evan`, `...enhanced.en-US.Samantha`, `...enhanced.en-US.Zoe`;
   - premium: `com.apple.voice.premium.en-US.Ava`, `com.apple.voice.premium.en-US.Zoe`.
3. **Не хардкодьте identifier**: enhanced/premium голоса появляются в списке только если скачаны пользователем ([iOS 16 issue #19756](https://github.com/expo/expo/issues/19756)); приложение скачать их не может. Фолбэк-цепочка: сохранённый выбор → лучший Enhanced en-US → `com.apple.voice.compact.en-US.Samantha` → просто `language: 'en-US'`. Избегайте Eloquence/novelty голосов (Albert, Fred, Grandma и т.п.) — исключите их по префиксу `eloquence`/имени.
4. Дайте экран «Голос» со списком en-US голосов + кнопка Play-превью + подсказка «скачайте улучшенный голос: Настройки → Универсальный доступ → Устный контент → Голоса» (текст на ru/uk).

**Android**: голоса Google TTS вида `en-us-x-tpf-network` / `...-local`; `network` качественнее, но требует сеть — предпочитайте `local` для офлайна. На Android `Speech.speak` с несуществующим voice молча падает на дефолт — это ок.

**Параметры произнесения:**
- слово/фраза на карточке: `rate: 1.0` (iOS-rate нелинейный; 1.0 = AVSpeechUtteranceDefaultSpeechRate), кнопка «черепаха» — `rate: 0.5` (iOS) / `0.7` (Android — там rate линейный, различайте платформы);
- `pitch: 1.0` всегда; `volume: 1.0` — TTS громче SFX;
- пример-предложение: `rate: 0.9`;
- `maxSpeechInputLength` учитывать только на Android (iOS = MAX_VALUE);
- перед новым speak — `Speech.stop()`, иначе очередь iOS накапливает фразы.

## 5. Auto-play / listening-режим: как устроено у Quizlet и Anki

**Quizlet Flashcards Play** ([help](https://help.quizlet.com/hc/en-us/articles/360030988091-Studying-with-Flashcards)): кнопка Play циклически листает карточки; читается лицевая сторона → пауза → авто-flip → обратная сторона → следующая карточка; сочетается с Shuffle; звук и «какая сторона первая» — в Options. Скорость фиксированная, темп задаётся длиной аудио.

**Anki Auto Advance** ([manual](https://docs.ankiweb.net/deck-options.html)): в опциях колоды два таймера — «Seconds to show question for» и «Seconds to show answer for» (типичные значения из практики форумов: 3–5 с вопрос, 3–8 с ответ), плюс настройка «дождаться окончания аудио перед стартом таймера» и «какой ответ ставить автоматически» (Again/Good). Ключевая идея: **таймер стартует после окончания аудио**, а не параллельно.

**Рекомендуемая машина состояний для вашего listening-режима:**

```
для каждой карточки:
  speak(EN-слово, en-US voice)  → onDone
  пауза 1.2–2 c (настраиваемая: «время подумать»)
  [опц. звук flip 100 мс]
  speak(перевод: ru/uk голосом com.apple.voice.compact.ru-RU.Milena / uk-UA.Lesya,
        либо снова EN-определение)
  → onDone → пауза 0.8–1 c → следующая
режимы повтора: EN×2 (второй раз rate 0.8), EN→RU, RU→EN (recall: перевод, пауза 3 c, слово)
```

- Очередь стройте на `onDone`-колбэках `Speech.speak` + `setTimeout` для пауз, с `AbortController`-подобным флагом отмены (swipe/выход мгновенно вызывает `Speech.stop()` и чистит таймеры).
- Настройки пользователю: пауза между сторонами (1/2/3/5 с), автоповтор слова (1–2 раза), shuffle, «читать только термин».
- **Фоновое воспроизведение**: `shouldPlayInBackground: true` + `ios.infoPlist.UIBackgroundModes: ["audio"]` в app.json. Ловушка: `AVSpeechSynthesizer` в фоне iOS может не начинать *новую* фразу после блокировки экрана — надёжный паттерн больших приложений (Quizlet) — пре-генерация mp3 на сервере (или кэширование), и в фоне гонять `AudioPlayer`-очередь файлов, а live-TTS оставить только для foreground. Для MVP: заявить listening-режим как «экран включён» (keep-awake), фоновый — фаза 2 с серверным TTS.
- В listening-режиме отключайте SFX correct/incorrect полностью — только речь и, максимум, тихий tick смены карточки.

## 6. Итоговый чек-лист внедрения

1. Пак из 9 файлов: `flip, swipe_l, swipe_r, correct, incorrect, combo1..3, complete, star` (Kenney/uisfx как база, нормализовать до −16 LUFS).
2. `SoundService`: пул `AudioPlayer`'ов, глобальные тумблеры `sfxEnabled`, `ttsAutoplay`, громкости из таблицы §1.
3. `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })` при входе в раздел — до первого TTS.
4. `TtsService`: кэш выбранного voice identifier, фолбэк-цепочка Enhanced→compact→language, `stop()` перед каждым `speak`, rate-пресеты normal/slow с platform-split.
5. Listening-режим: state machine на onDone, паузы 1.5/1.0 с по умолчанию, отмена по свайпу.
6. Haptics параллельно каждому SFX.
7. Тест-матрица: физический iPhone (silent switch on/off, Spotify в фоне), Android (Google TTS не установлен → диалог).

Sources: [uisfx — UI Sound Design guide](https://uisfx.com/ui-sound-design), [UXmatters — Sound in UX](https://www.uxmatters.com/mt/archives/2024/08/the-role-of-sound-design-in-ux-design-beyond-notifications-and-alerts.php), [Lessons in audio feedback (Medium)](https://medium.com/@fernando1lins/lessons-learned-in-audio-feedback-for-game-and-app-design-e4818c9b72fd), [Duolingo micro-interactions (Medium)](https://medium.com/@Bundu/little-touches-big-impact-the-micro-interactions-on-duolingo-d8377876f682), [Duolingo streak milestone design](https://blog.duolingo.com/streak-milestone-design-animation), [Myinstants Duolingo](https://www.myinstants.com/en/search/?name=duolingo), [expo-speech docs](https://docs.expo.dev/versions/latest/sdk/speech/), [expo-audio docs](https://docs.expo.dev/versions/latest/sdk/audio/), [expo-av deprecated docs](https://docs.expo.dev/versions/v54.0.0/sdk/audio-av/), [iOS voices gist](https://gist.github.com/asutekku/d5b09e5267b97c3af1f153a325089340), [expo #19756 missing voices iOS 16](https://github.com/expo/expo/issues/19756), [expo #8235 speech silent mode](https://github.com/expo/expo/issues/8235), [expo #29158 reopen](https://github.com/expo/expo/issues/29158), [expo #29077 duck broken expo-av](https://github.com/expo/expo/issues/29077), [expo #19042 ducked stays ducked](https://github.com/expo/expo/issues/19042), [Apple HIG — Playing audio](https://developers.apple.com/design/human-interface-guidelines/patterns/playing-audio/), [Apple forums — silent switch per-sound](https://developer.apple.com/forums/thread/703799), [Quizlet Flashcards help](https://help.quizlet.com/hc/en-us/articles/360030988091-Studying-with-Flashcards), [Quizlet new Flashcards mode](https://quizlet.com/blog/introducing-our-new-flip-flashcards-mode), [Anki Deck Options — Auto Advance](https://docs.ankiweb.net/deck-options.html), [Anki forums — audio-only deck](https://forums.ankiweb.net/t/create-an-audio-only-deck-almost-all-advances-are-automatic-and-then-content-is-all-on-mp3s-limited-text/37529), [Kenney UI Audio](https://kenney.nl/assets/ui-audio), [ZapSplat CC0](https://www.zapsplat.com/license-type/cc0-1-0-universal/)