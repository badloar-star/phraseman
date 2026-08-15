# 06 — ЭТАЛОН (lesson_complete) и ПОВЫШЕНИЕ УРОВНЯ

Аудит по реальному коду `/root/pm2`. Каждое утверждение — файл + строка.

Проверено наличие `docs/` и `ux-audit/`: в `/root/pm2` только `app/`, `components/`, `constants/`,
`hooks/`, `app.json`, `package.json`. Папок `docs/` и `ux-audit/` нет ни внутри, ни рядом (`/root`).
Пункт «прочитать предыдущие документы» пропущен по факту отсутствия файлов.

Отдельно: `modules/audio/sound_events.ts` (откуда берутся `SOUND_EVENTS[...].durationMs`) в контейнер
не попал. Там, где таймлайн зависит от длительности звука, ниже даётся точная формула, а не выдуманное
число. Это само по себе — важный факт (см. DNA-правило 4 и Проблему A-3).

---

# ЧАСТЬ А. ЭТАЛОН — экран победы урока

## A.0. Что на самом деле рендерится

`/root/pm2/app/lesson_complete.tsx:1358` — `const legacyCompletionSurfacesEnabled = false;`
и дальше `:1359-1437` — безусловный `return`. **Функция всегда выходит в одной из двух веток:**

| Состояние | Строки | Что видно |
|---|---|---|
| `sequenceShowing === true` | 1360–1393 | `ScreenGradient` → `SafeAreaView` → `<ResultsSequence>` + `<ReviewPromptModal>` |
| иначе | 1398–1436 | `ScreenGradient` → кнопка «назад» + статичный текст «Сохраняю результат…» |

Блок с 1439 по 1805 (медаль со spring, `BonusXPCard`, `AchievementNotifModal`, `CollectibleDropModal`,
`CoachToast`, `RegistrationPromptModal`, `SoftContextualUpsellCard`, premium-баннер, share-кнопки,
«Повторить урок», «На главную») — **недостижим**. См. Проблему A-1.

Гейт показа: `:776`
```
const sequenceShowing = resultsSequenceVisible && resultsReady && completionAccessReady && completionXpReady;
```
`resultsSequenceVisible` — слот арбитра `'lessonResultsSequence'` (`:775`), `completionXpReady`
выставляется в `grantBonus().finally` (`:1107-1109`), т.е. **после сетевых/сторедж-операций начисления**.

---

## A.1. ПОКАДРОВЫЙ ТАЙМЛАЙН `ResultsSequence`

Источники: `/root/pm2/components/feedback/ResultsSequence.tsx`,
`/root/pm2/components/feedback/results_sequence_motion_plan.ts`.

Обозначения: `D(x)` = `SOUND_EVENTS[x].durationMs`; `GAP` = 100 мс
(`results_sequence_motion_plan.ts:4`).

### t = 0 мс — сцена смонтирована

* `:321-343` — полный сброс: все SV в 0, все таймеры сняты, `skippedRef=false`.
* `:377-380` — **МЕДАЛЬ**: `badgeSV = withDelay(0, withSpring(1, {damping:10, stiffness:150, mass:0.7}))`.
  Стиль `:483-489`: `opacity 0→1`, `scale 0.4→1`, `translateY 20→0`.
  Физика: ω₀ = √(150/0.7) = **14.64 рад/с**, ζ = 10/(2√105) = **0.488** →
  перерегулирование **17.3 %** (масштаб перелетает до ≈1.10), период колебания **492 мс**,
  установка 2 % ≈ **560 мс**.
  Бейдж — медаль 110×110 webp (`lesson_complete.tsx:1370-1372`, `:86-90`: `bronza/serebro/zoloto.webp`).
* `:381` — **t = 40 мс**: `fk.successHaptic()` → `haptics.success()` → `hapticSuccess()`
  (`app/feedback/haptics.ts:39-41`). Единственная хаптика, не привязанная к звезде.

### t = 500 мс — ЗВЕЗДА 1

* Расписание жёстко зашито: `results_sequence_motion_plan.ts:42`
  `starSoundAtMs = [500, 940, 1500]`.
* `:387` — `starSVs[0] = withSpring(1, {damping:11, stiffness:170})` (mass = 1 по умолчанию).
  Стиль `Star` `:165-171`: `opacity 0→1`, `scale 0.3→1`, `rotate −40° → 0°`.
  Физика: ω₀ = **13.04 рад/с**, ζ = **0.422** → перерегулирование **23.2 %**, установка ≈ **727 мс**.
* `:388-393` — если `i < clampedStars`: `fk.milestone('star1')` →
  звук `pm.complete.star_1` + **success-хаптика** (`feedback_kit.ts:100-117`).
  Если звезда пустая — spring всё равно играет, но **без звука и без вибрации**.

### t = 940 мс — ЗВЕЗДА 2 (Δ = 440 мс)
Тот же spring; `pm.complete.star_2` + success-хаптика при `stars ≥ 2`.

### t = 1500 мс — ЗВЕЗДА 3 (Δ = 560 мс)
Тот же spring; `pm.complete.star_3_perfect` + success-хаптика при `stars = 3`.

> **Стаггер звёзд неравномерный: 440 → 560 мс.** Последняя звезда получает на 27 % больше воздуха.
> Это осознанный приём — кульминация замедляется.

### t = 1500 + D(star_3_perfect) + 100 = `xpStartAtMs` — ПОЯВЛЕНИЕ XP

`results_sequence_motion_plan.ts:43-44`. Действия `:399-404`:
* `setXpVisible(true)`;
* `xpRevealSV = withSpring(1, {damping:14, stiffness:200, mass:0.6})`.
  Стиль `:494-500`: `opacity 0→1`, `translateY 16→0`, `scale 0.9→1`.
  Физика: ω₀ = **18.26**, ζ = **0.639** → перерегулирование **7.4 %**, установка ≈ **343 мс**.
* `fk.xpCounterStart()` → `pm.complete.xp_counter_start`.

### t = `xpStartAtMs` + D(xp_counter_start) + 100 = `xpTickAtMs[0]` — СЧЁТЧИК ПОШЁЛ

`:405-408`:
* `xpProgress = withTiming(xp, {duration: 1000})` — константа
  `RESULTS_XP_COUNT_DURATION_MS = 1000` (`:120`). Easing по умолчанию Reanimated = `inOut(quad)`.
* `fk.tick()` → `pm.complete.xp_counter_tick`.

**Как реализован сам счётчик — ключевой премиальный приём:** `:128-152`.
Число рендерится в `Animated.createAnimatedComponent(TextInput)` через `useAnimatedProps`
(`:126`, `:139-142`) — текст обновляется **на UI-треде**, без единого ре-рендера JS.
Ширина слота фиксирована заранее: `:262`
`xpWidth = Math.max(84, String(Math.max(xp, finalXp)).length * 32 + 20)` — цифры **не прыгают**
при переходе 99 → 100.

### t = `xpTickAtMs[0]` + D(xp_counter_tick) + 100 = `xpCompleteAtMs` — ЗАМОК + КОНФЕТТИ

`:409-413`:
* `xpProgress.value = xp` — **жёсткая посадка** (обрывает `withTiming`, если тот ещё идёт);
* `fk.xpCounterComplete()` → `pm.complete.xp_counter_complete`;
* `setShowConfetti(true)`.

**Конфетти** (`components/feedback/ConfettiBurst.tsx`):
`count` = 120 (`intensity:'major'`) / 72 (`'milestone'`) / 0 (`'quiet'`) —
`results_sequence_motion_plan.ts:133`; жёсткий кап 120 (`ConfettiBurst.tsx:27`);
`durationMs` = 1200 (`ResultsSequence.tsx:515`); `seed = 11` (`:516`) — раскладка детерминирована
(`seeded()` на sin-хеше, `:31-34`), одинакова при любом ремаунте.
Частица `:56-75`: `Easing.out(Easing.cubic)`, `opacity [0,0.1,0.8,1]→[0,1,1,0]`,
разлёт `90 + rnd·(ширина·0.42)` px, вертикаль с апвард-байасом −50 и падением +70 к концу,
поворот до ±540°, `scale [0,0.2,1]→[0.4,1,0.9]`, размер 7–15 px, каждая третья — круг.
На слабом железе (`PixelRatio.get() < 2`) число частиц делится пополам (`:113-116`).
Автостоп по общему таймеру `min(1200, duration)+60` (`:122-129`).

### Награды (только если они есть)

`:416-437`. Расписание — `results_sequence_motion_plan.ts:50-89`:
* `activeGiftUnlockAtMs` — после XP-complete + GAP (и после спина, если он есть);
* `spinRewardAtMs` — сразу после XP-complete; блок живёт **2700 мс** (`:57`);
* `multiplierUpgradeAtMsList` — цепочка, шаг = `D(multiplier_upgrade) + 100` (`:66-73`);
  каждый шаг **доводит счётчик**: `xpProgress = withTiming(multiplierXpTotal, {duration: 420})` (`:434`).
* `RewardPill` `:188-201`: `withSpring(1, {damping:14, stiffness:210, mass:0.55})`,
  `opacity 0→1`, `translateY 14→0`, `scale 0.92→1`. ζ = **0.651** → перерегулирование **6.8 %**.

### t = `finaleAtMs` — ФИНАЛЬНАЯ ГАЛКА

`:440-444` + `results_sequence_motion_plan.ts:74-89`:
* `setFinaleVisible(true)`;
* `finaleSV = withSpring(1, {damping:12, stiffness:180, mass:0.55})`.
  Стиль `:501-507`: `opacity 0→1`, `translateY 10→0`, `scale 0.7→1`.
  ζ = **0.603** → перерегулирование **9.3 %**.
* `fk.resultsFinale()` → `pm.complete.rewards_finale`.

### t = 2500 мс — CTA (жёсткая константа)

`:122` `T_CTA = 2500`, `:447` `ctaSV = withDelay(2500, withSpring(1, {damping:14, stiffness:130}))`.
Стиль `:490-493`: `opacity 0→1`, `translateY 26→0`. ζ = **0.614** → перерегулирование **8.7 %**.
`:448` — `setCtaReady(true)` в тот же момент.

### t = 3000 мс — ЖЁСТКАЯ РАЗБЛОКИРОВКА

`:122` `CTA_HARD_UNLOCK = 3000`, `:450-453`: `ctaSV = withTiming(1, {duration:150})` + `setCtaReady(true)`.
Комментарий `:7` фиксирует правило: **никогда не блокировать пользователя дольше 3 с**.

### Тап-скип (в любой момент)

`:298-319`. Первый тап: `badge/stars → withTiming(1, 120)`, `cta → withTiming(1, 160)`,
`xpProgress = finalXp` мгновенно, `xpReveal/finale → withTiming(1, 120)`, конфетти включается,
`fk.cancelResultsSequenceAudio()` глушит очередь звуков (`feedback_kit.ts:151-154`).
**Второй тап = `onCtaPrimary()`** — гарантированный выход, чтобы не «залипало» (`:294-297`).

### Reduce Motion

`results_sequence_motion_plan.ts:119-129`: `immediate: true`, `confettiCount: 0`,
`playMilestones: false`. В компоненте `:349-374` — всё выставляется в финальное состояние
в один кадр, таймеры не заводятся, **ни звука вех, ни хаптики**.

### Полная карта состояний экрана

| # | Состояние | Строка | Движение |
|---|---|---|---|
| 1 | «Сохраняю результат…» | 1398–1436 | **Нет вообще**: статичный текст + кнопка назад |
| 2 | Секвенция | 1360–1393 | таймлайн выше |
| 3 | `ReviewPromptModal` после CTA | 1377–1381, 1385–1390 | своя анимация внутри компонента |
| 4 | Android back во время секвенции | 1311–1316 | `goBackFromComplete()` → replace в список уроков |
| 5–12 | медаль-нотиф, unlock-нотиф, зачёт, экзамен Лингмана, бонус-карточка, drop карточки, coach-toast, регистрация | 1439–1801 | **мертвы**, см. A-1 |

---

## A.2. Визуальные приёмы премиальности (эталон)

`ResultsSequence.tsx:621-650`:
* звезда — `fontSize 44`, `fontWeight '900'`, цвет `t.gold`, пустая — `t.border` (`:530-531`);
* заголовок — 28/900, `letterSpacing 0.3`; подзаголовок — 15/600, `lineHeight 21`;
* **число XP — 50/900, `lineHeight 54`**, «+» — 22/900, «XP» — 18/800: число доминирует над
  служебными знаками в 2.3 раза;
* награда-пилюля — `minHeight 40`, `radius 14`, текст 14/800;
* CTA — высота 56, `radius 18`, текст 17/900, `letterSpacing 0.3`, цвет `t.accent`/`t.correctText`;
* фон — **сам экран** (`ScreenGradient`, `lesson_complete.tsx:1362`), никакого затемнения,
  никакого бэкдропа: празднование не «модалка поверх», а состояние экрана;
* высота слотов зарезервирована заранее (`rewardStackHeight` `:260-261`, `finaleSlot: {height:34}`
  `:637`) — при появлении наград **макет не прыгает**.

---

## A.3. Что в эталоне сломано (фиксирую, не трогаю)

* **A-1 (критично). Весь послеурочный каскад — мёртвый код.**
  `lesson_complete.tsx:1358` выключает единственную ветку, где смонтированы
  `AchievementNotifModal` (`:1743`), `BonusXPCard` (`:1729`), `CollectibleDropModal` (`:1761`),
  `CoachToast` (`:1773`), `RegistrationPromptModal` (`:1756`), `SoftContextualUpsellCard` (`:1534`).
  При этом их бизнес-логика **исполняется**: очередь нотификаций строится (`:1171-1193`),
  `scheduleActiveNotif(queue[0], 1200)` заводит таймер, `maybeRollCollectibleDrop` крутит дроп
  (`:1113-1115`), таймер регистрации на 1500 мс тикает (`:1221`). Результат: медаль «🥉 Новая медаль!»,
  «🔓 Урок разблокирован», «📋 Зачёт доступен», «🎓 Экзамен Лингмана открыт» **не показываются никогда**.
  `seqDone` тоже никогда не станет `true` (`setSeqDone` только на `:1725`, в мёртвой ветке).
* **A-2. Невидимая модалка держит слот арбитра.** `:762`
  `useOverlayVisible('lessonCompleteNotif', activeNotif != null)` запрашивает слот для модалки,
  которая не рендерится. `lessonCompleteNotif` **не** входит в `FORCE_EVICTABLE_KEYS`
  (`components/overlay_arbiter_core.ts`), т.е. сторож 15 с его не выселит. Пока экран жив,
  все тосты ниже по приоритету заморожены.
* **A-3. Счётчик XP почти наверняка обрывается.** Счётчик идёт 1000 мс (`:120`), а окно до
  «замка» равно `D(xp_counter_tick) + 100` (`motion_plan.ts:48-49`). Тик — короткий звук;
  если `D(tick) < 900 мс`, `:410` `xpProgress.value = xp` **обрубает анимацию скачком**.
  Длительность визуала не связана с расписанием.
* **A-4. Половина `motionPlan` — мёртвые поля.** `badgeDelayMs`, `starsDelayMs (500)`,
  `xpDelayMs (1400)`, `ctaDelayMs (2500)` (`motion_plan.ts:135-138`) **нигде не читаются**:
  компонент использует `T_BADGE`, `audioPlan.*`, `T_CTA`. Конфиг врёт о таймлайне.
  Аналогично `audioPlan.medalSoundAtMs` всегда `null` и не используется.
* **A-5. CTA может приехать раньше XP.** `T_CTA = 2500` — константа, `xpStartAtMs` — производная
  от длительностей звуков. При сумме `D(star_3)+100 > 1000` мс кнопка «Продолжить» разблокируется
  **до того**, как появится число опыта — эмоциональный пик после призыва к выходу.
* **A-6. Состояние «Сохраняю результат…» полностью статично** (`:1420-1433`): ни скелетона,
  ни пульса, ни прогресса, — при этом длится столько, сколько идёт `grantBonus()` с сетью.

---

# MOTION DNA — 14 законов, извлечённых из эталона

1. **Герой пружинит, свита — нет.** Перерегулирование строго градуировано:
   медаль **17.3 %** (`damping 10 / stiffness 150 / mass 0.7`), звезда **23.2 %** (`11/170/1`) —
   и всё остальное **7–9 %**: XP `14/200/0.6` → 7.4 %, финальная галка `12/180/0.55` → 9.3 %,
   CTA `14/130/1` → 8.7 %, пилюля награды `14/210/0.55` → 6.8 %.
   Правило: **ровно один-два элемента кадра имеют право на отскок > 15 %; всем остальным — 6–9 %.**
2. **Единственный тайминг входа: 0 / 500 / 940 / 1500 / ~2100 / 2500 / 3000 мс.**
   Первый герой — на 0-м кадре, ритм-сетка стаггера **440 мс, затем 560 мс** (замедление к кульминации,
   а не равномерный шаг).
3. **CTA — на 2500 мс, безусловная разблокировка — на 3000 мс.** Ни одна поверхность не имеет права
   держать палец пользователя дольше 3 секунд (`ResultsSequence.tsx:122`, `:450-453`).
4. **Между двумя наградными звуками — минимум 100 мс тишины.** Следующий бит стартует не по «красивому»
   числу, а по `конец предыдущего звука + 100` (`results_sequence_motion_plan.ts:4-7, 42-89`).
   Наложение наградных звуков запрещено; арбитр звука — однослотовый.
5. **Каждая веха — звук И хаптика одновременно.** `fk.milestone()` всегда несёт
   `haptics.success()` (`feedback_kit.ts:116`). Отдельный success-импульс на T+40 мс на входе героя.
   Поверхность без хаптики = поверхность вне DNA.
6. **Числа считаются на UI-треде.** `Animated.createAnimatedComponent(TextInput)` +
   `useAnimatedProps` (`ResultsSequence.tsx:126, 139-142`). Никаких `setState` в тик счётчика.
7. **Ширина числового слота фиксируется до старта:** `max(84, len·32 + 20)`
   (`ResultsSequence.tsx:262`). Цифры не должны сдвигать соседей на переходе 9→10, 99→100.
8. **Высота будущих слотов резервируется заранее** (`rewardStackHeight` `:260-261`,
   `finaleSlot {height:34}` `:637`). Появление награды не двигает макет.
9. **Празднование — это состояние экрана, а не окно поверх него.** Фон — `ScreenGradient` самого
   маршрута, ноль бэкдропов и затемнений (`lesson_complete.tsx:1362`). Если фон всё-таки нужен —
   он обязан **анимироваться вместе со сценой**, а не появляться отдельным кадром.
10. **Тап в любой момент = скип за 120–160 мс.** `withTiming(1, 120)` для контента,
    `160` для CTA, значения-счётчики выставляются мгновенно, аудио-очередь глушится
    (`ResultsSequence.tsx:298-319`). **Второй тап всегда закрывает** — «залипшего» празднования не бывает.
11. **Конфетти конечны и детерминированы:** ≤ 120 частиц, ровно 1200 мс, `Easing.out(cubic)`,
    фиксированный `seed`, автостоп, половина частиц при `PixelRatio < 2`
    (`ConfettiBurst.tsx:27, 113-129`). Никаких бесконечных циклов в наградном слое.
12. **Reduce Motion — не «быстрее», а «сразу»:** всё в финальном состоянии одним кадром,
    таймеры не заводятся, вехи молчат (`motion_plan.ts:119-129`, `ResultsSequence.tsx:349-374`).
13. **Полный сброс + `cancelAnimation` на каждый ремаунт и unmount**
    (`ResultsSequence.tsx:321-343, 455-464`). Ни один SV не переживает смену данных.
14. **Типографическая иерархия кульминации 50 / 28 / 22 / 18 / 15**: главное число — 50/900,
    заголовок — 28/900, служебные знаки при числе — 22 и 18, подпись — 15/600
    (`ResultsSequence.tsx:626-632`). Награда всегда крупнее заголовка.

---

# ЧАСТЬ Б. ПОВЫШЕНИЕ УРОВНЯ

## Б.0. Инвентарь файлов

| Файл | Роль |
|---|---|
| `app/xp_manager.ts:656-705` | детект level-up внутри `registerXP` |
| `app/level_spin_level_up_queue.ts:60-83` | запись в очередь + `emitAppEvent('level_up_pending')` |
| `app/level_up_reward_reconciler.ts:458` | второй эмиттер того же события |
| `app/_layout.tsx:772-1500` | `GlobalLevelUpHandler` — вся оркестрация |
| `components/LevelUpThresholdModal.tsx` | **экран** повышения уровня (см. Б-1) |
| `components/LevelBadge.tsx` | бейдж уровня (анимированный webp) |
| `components/LevelGiftModal.tsx` (1044 стр.) | одиночный сундук |
| `components/LevelGiftDualModal.tsx` (1274 стр.) | двойной сундук (премиум) |
| `components/level_gift_box.tsx` | `GiftBox3D` + палитры редкости |
| `components/GiftOpenEffects.tsx` | «эффект» раскрытия — статичное пятно |
| `components/SpinRewardPlaque.tsx` | плашка «+1 СПИН» |
| `app/level_reward_spin.tsx` (270 стр.) | **отдельный маршрут** барабана |
| `app/level_reward_spin_motion.ts` | тайминги барабана |
| `components/LevelSpinFinishLine.tsx` (848 стр.) | лента барабана |
| `app/level_gifts_inventory.tsx` | **отдельный маршрут** инвентаря подарков |
| `components/OverlayArbiter.tsx` + `components/overlay_arbiter_core.ts` | разруливание коллизий |
| `app/level_up_storage_keys.ts`, `level_up_bonus_outbox.ts`, `level_up_account_guard.ts`, `local_level_spins.ts` | durability |

## Б.1. Полный текущий флоу — покадрово

### Фаза 0. Триггер (невидимая)

`app/xp_manager.ts:658-660` — внутри `registerXP` сравниваются `getLevelFromXP(currentTotal)` и
`getLevelFromXP(newTotal)`. При росте: `:662-664` `enqueueLevelSpinLevelUps(prev, new)`.
Внутри (`app/level_spin_level_up_queue.ts:60-83`) сначала начисляется локальный спин
(«credit first» `:67-69`), потом пишется очередь, потом `emitAppEvent('level_up_pending')` (`:82`).

Побочно: `:682-683` `emitAppEvent('energy_reload')` + `emitAppEvent('xp_changed')`,
`:685` запись в ленту друзей, `:693-695` проверка достижений `level_reached`.

**Никакого визуального события в момент самого перехода нет.** XP-полоса/аватар/рамка обновляются
молча, `user_avatar` и `user_frame` переписываются (`:674-678`) без единого кадра анимации.

### Фаза 1. Забор очереди (невидимая, но с сетью)

`_layout.tsx:1087` — `onAppEvent('level_up_pending', flushQueue)`. Дополнительные входы:
старт с задержкой 500 мс (`:1083`), возврат в foreground с троттлом (`:1105-1119`),
уход с маршрута `/level_reward_spin` (`:1096-1102`).

`flushQueue` (`:1007-1068`): `withAccountTransitionLock` → `retryPendingLevelUpRewards` →
`repairPendingLevelUpRewards` → чтение `'pending_level_up_queue'` → `showNext`.

`showNext` (`:864-977`) для **подарочного** уровня делает **до четырёх сетевых round-trip'ов
ДО показа окна**: `reserveLevelGiftForDisplay` ×1–2 (`:902-903`, `:925`),
`saveUnclaimedGift/Dual` (`:909`, `:930`), повторное чтение из стореджа (`:910`, `:931`),
`acquireLevelGiftDisplay` (`:945`). При `displayStatus === 'unavailable'` (`:950-954`) —
**молча ничего не происходит**: ни окна, ни тоста, ни индикатора.

### Фаза 2. Показ окна повышения уровня

`_layout.tsx:1390-1474` рендерит `<LevelUpThresholdModal>`.
Вход анимируется тремя `Animated.Value` из `_layout.tsx:802-804`, запуск `:969-976`:

```
levelUpOpacity.setValue(0); levelUpTranslateY.setValue(40); levelUpGlow.setValue(0);
Animated.parallel([
  Animated.spring(levelUpOpacity,   {toValue:1, friction:8}),   // tension по умолчанию 40
  Animated.spring(levelUpTranslateY,{toValue:0, friction:8}),
  Animated.timing(levelUpGlow,      {toValue:1, duration:900}),
]).start();
```

| t (мс) | Что происходит | Строка |
|---|---|---|
| **0** | `<Modal animationType="none">` становится `visible` → нативное окно возникает **мгновенно** | `LevelUpThresholdModal.tsx:142-149` |
| **0** | **Весь экран за один кадр заливается непрозрачным `LinearGradient`** (`palette.background`, `StyleSheet.absoluteFill`) + 3 декоративных слоя `ambientTop`/`ambientBottom`/`horizon` — **всё вне анимируемого узла** | `:154-162`, стили `:313-360` |
| **0** | `onShow` → `soundDirector.request('pm.reward.level_up')`. **Хаптики нет ни одной** (в диапазоне `_layout.tsx:770-1500` нет ни одного вызова haptic) | `_layout.tsx:1466-1472` |
| 0 → ~650 | `stage` (кикер + портал + заголовок + награды + кнопка) въезжает: `opacity 0→1`, `translateY 40→0`, `scale 0.94→1` (`scale` привязан к **opacity**, не к translateY) | `:105-114`, `:169` |
| 0 → 900 | `glow` 0→1 (`Easing.inOut(ease)`) драйвит: портал `opacity 0.58→1`, `scale 0.92→1` | `:116-121` |
| 0 → 900 | milestone-вспышка (только уровни, кратные 5 — `_layout.tsx:1391`): `opacity 0/0.45/1`, `scale 0.82→1` | `:122-127` |
| **270 → 900** | стопка наград проявляется (`glow` 0.30→1), `translateY 10→0` | `:128-133` |
| **342 → 900** | кнопка «Готово» проявляется (`glow` 0.38→1), `translateY 8→0` | `:134-139` |
| **280 → 600** | (спин-уровни) плашка «+1 СПИН» въезжает: `opacity 0→1`, `scale 0.92→1` + звук `pm.reward.small` **в t=0** | `SpinRewardPlaque.tsx:11-14, 59-80` |
| **1700 → 2350** | **плашка «+1 СПИН» улетает вверх на −96 px и исчезает**, оставляя пустую дыру 76 px | `SpinRewardPlaque.tsx:65-79`; `onComplete={()=>{}}` — `LevelUpThresholdModal.tsx:280` |
| 900 → ∞ | **полная статика.** Ни пульса, ни shimmer, ни счётчика, ни дыхания портала | — |

Бейдж уровня: `LevelUpThresholdModal.tsx:220` — `<LevelBadge level={level} size={badgeSize} autoplay={false} />`.
`LevelBadge.tsx:98` пробрасывает `autoplay` в `expo-image`. **Анимированная webp-медаль уровня
заморожена ровно в тот момент, когда она — герой сцены.** `centeredNumber` не передаётся →
цифра уровня на бейдже не рисуется.

Заголовок «УРОВЕНЬ N» (`:232-234`, 34/700, `letterSpacing −1.2`) появляется **готовым**.
Ни счётчика, ни переворота цифры, ни перехода «N−1 → N».
«+100 XP» — просто строка в `ThresholdRewardRow` (`_layout.tsx:1417`), **числа никто не считает**.

### Фаза 3. Выход из окна уровня → подарок

`dismissLevelUp` (`_layout.tsx:1223-1273`):

| t (мс) | Что | Строка |
|---|---|---|
| 0 | `setLevelUpTransitioning(true)` — удержание слота арбитра | `:1229` |
| 0 → 300 | `Animated.timing(levelUpOpacity → 0, 300)`. **`translateY` и `glow` не анимируются обратно.** Затухает **только stage** — фон-градиент **не участвует в fade** | `:1230` |
| 300 | `setShowLevelUp(false)` → нативное окно (вместе с непрозрачным фоном) **пропадает скачком в один кадр** | `:1233` |
| 300 → ? | `InteractionManager.runAfterInteractions` | `:1234` |
| +**180 мс (iOS) / 260 мс (Android)** | `setShowGiftModal(true)` | `:1239-1243` |
| фон | `registerXP(100,'level_up_bonus')` + `tryGrantPremiumMonthlyWagerFromLevelUp()` — **после** того, как «+100 XP» уже показали | `:1245-1270` |

**⇒ пользователь видит 180–260 мс (плюс кадр `runAfterInteractions`) голого нижнего экрана
между двумя частями одного праздника.**

### Фаза 4. Сундук (`LevelGiftModal`)

| t (мс) | Что | Строка |
|---|---|---|
| 0 | `<Modal transparent animationType="fade">` — **нативный кроссфейд**, поверхность **другого языка**, чем фаза 2 | `LevelGiftModal.tsx:576` |
| 0 | фон `ScrollView` с `backgroundColor 'rgba(0,0,0,0.52)'` — **настоящее затемнение** (в фазе 2 его не было) | `:573, 584` |
| 0 → ~450 | панель: `Animated.spring(modalEntrance, {tension:115, friction:12})` → `scale 0.94→1`, `translateY 18→0` | `:272-277`, `:561-562` |
| 0 → ∞ | верхняя линия 1.5 px мигает `opacity 0.3↔0.7`, цикл **1450 + 1450 мс, бесконечно** | `:279-285`, `:612-623` |
| после загрузки подарка → ∞ | сундук парит `0 → −7 → +2 px` и качается `±5°`, **по 1700 мс, бесконечно**, `Easing.inOut(ease)` | `:294-309` |

**Тап по сундуку** (`handleTap`, `:320-435`):

| t (мс) | Что | Строка |
|---|---|---|
| 0 | `hapticTap()` — **лёгкий** тап, не `success` | `:324` |
| 0 → 34 | `shakeX 0→9`, параллельно `scale 1→0.96` за 66 | `:422-425` |
| 34 → 68 | `shakeX 9→−11` | `:426` |
| 68 → 98 | `shakeX −11→8` | `:427` |
| 98 → 122 | `shakeX 8→0` | `:428` |
| 122 → 482 | `spring(scale→1.06, tension 200, friction 8)` ∥ `timing(lidLift 0→1, 360, Easing.out(cubic))`: крышка улетает на −0.42·size с поворотом **24°**, гаснет к 100 %; лента гаснет к 40 %; низ оседает на +0.06·size; свечение из щели `0→0.7→0.2` | `:430-433`, `level_gift_box.tsx:103-107, 212-225` |
| ~482 | `finalize()`: `spring(fadeReveal, 160/9)` ∥ `spring(orbRise, 120/9)` → награда `opacity 0→1`, `translateY 14→0`, орб `translateY 16→0`, `scale 0.2→1` | `:396-399`, `:564-567` |
| ~482 + ~400 → ∞ | `orbHoverLoop`: пульс `scale 1↔1.055` по 1250 мс, **бесконечно** | `:403-410` |
| страховка | `safetyTimer = 520 мс` — `finalize()` вызовется, даже если анимация не доиграла | `:103`, `:418` |

**В кульминации — момент, когда награда появляется, — НЕТ:**
звука (ни один `soundDirector.request` в `LevelGiftModal.tsx`),
success-хаптики (`hapticSuccess` только в `handleChoice`/кнопках `:469, 968, 991`),
частиц/вспышки — `GiftOpenEffects.tsx:1-10` прямо декларирует:
«БЕЗ конфетти и БЕЗ палок… только мягкое **статичное** радиальное свечение… **Никакого движения,
никаких частиц**» (реализация `:28-45`).

### Фаза 4′. Двойной сундук (`LevelGiftDualModal`)

* `<Modal transparent animationType="fade">` + свой `screenDim` (`:799-800`, `:769`);
* вход `spring(tension:110, friction:12)` (`:317-322`);
* idle двух сундуков с **фазовым сдвигом 180 мс** (`:411-429`) — единственный корректный
  стаггер во всём левелап-флоу;
* открытие — та же дрожь `34/34/30/24` + `spring 1.06` + `lid 340 мс` (`:547-559`);
* **дифференцированная хаптика по редкости**: `hapticSuccess` для prem/epic/rare,
  `hapticTap` для остального (`:572-573`) — **в одиночном модале этого нет**;
* reveal: `timing(fadeReveal, 420, Easing.out(cubic))` ∥ `spring(detailScale, 115/11)` (`:362-374`);
* `ctaShine` — бесконечный луп `delay 420 → 1500 → delay 900 → сброс за 1 мс` (`:376-390`).

### Фаза 5. Закрытие подарка

`onGiftClose` (`_layout.tsx:1275-1318`): снимает `levelUpTransitioning`, сдвигает очередь,
и если очередь пуста и `currentLevel === 5` у free-юзера — **`router.push('/premium_modal')`**
(`:1296`, `:1311`). Пейвол приезжает сразу после праздника.

### Фаза 5′. Спин-уровень — тупик

`finalizeSpinLevelUp` (`_layout.tsx:1174-1221`): `timing(opacity → 0, 220)` → acknowledge →
`setShowLevelUp(false)`. **Подарка нет, перехода к барабану нет.**
Спин лежит в локальном балансе; попасть в него можно только вручную:
`app/level_gifts_inventory.tsx:403` или `app/streak_stats.tsx:3953` → `router.push('/level_reward_spin')`.
Маршрут зарегистрирован как **обычный экран** без `presentation:'modal'` (`_layout.tsx:3257`).

Сам барабан при этом — единственная часть флоу с настоящим motion-планом
(`app/level_reward_spin_motion.ts`): разгон 350 мс по безье `(·,·,0.75,0.7375)`,
крейсер 15 строк / 1250 мс, торможение 1200 мс, оседание 200 мс, **overshoot 8–14 px
с откатом на строку** (`createLevelSpinOvershootPlan:44-59`). Уровень проработки — как у эталона.
И он спрятан за отдельным экраном, куда никто не ведёт.

---

## Б.2. Где именно «отдельный экран вместо модалки» и чем это хуже

**Формально `LevelUpThresholdModal` — это `<Modal transparent>`. Фактически это экран:**

| Признак модалки | Есть? | Строка |
|---|---|---|
| затемнённый бэкдроп / виден контекст | **нет** — непрозрачный `LinearGradient` на весь экран | `:154-159` |
| карточка со скруглениями | **нет** — `styles.screen: {flex:1}`, контент — `ScrollView` во всю высоту | `:314-317`, `:164-168` |
| анимация появления фона | **нет** — фон вне `entranceStyle`, появляется за 1 кадр | `:154-162` vs `:169` |
| анимация исчезновения фона | **нет** — затухает только `stage`, фон снимается скачком | `_layout.tsx:1230-1233` |
| закрытие свайпом / тапом по фону | **нет** | — |
| Android hardware back | **мёртв** — `onRequestClose={() => {}}` | `:148` |

Плюс два **настоящих** отдельных маршрута в том же флоу:
`/level_reward_spin` (`_layout.tsx:3257`) и `/level_gifts_inventory` (`:3256`).

**Чем это хуже модалки:**
1. **Потеря контекста.** Пользователь не видит, где он получил уровень — экран урока/главной
   исчезает целиком. Невозможен приём «бейдж вылетает из аватара в шапке» — источника нет на экране.
2. **Жёсткий cut вместо перехода.** Фон появляется и исчезает за один кадр; содержимое при этом
   плавно пружинит. Глаз читает «меня перебросили», а не «мне показали».
3. **Рваный выход.** Двухфазное закрытие (fade содержимого 300 мс → мгновенный снос фона)
   + пауза 180–260 мс на пустом экране до подарка.
4. **Разный язык двух соседних кадров одного праздника.** Фаза 2 — full-bleed без затемнения,
   `animationType="none"`. Фаза 4 — карточка `radius 30` на затемнении 0.52, `animationType="fade"`.
5. **Нет пути назад.** `onRequestClose` пустой, тап по фону не закрывает.
6. Раздел награды («спин») уводит в **третью** поверхность — обычный push-экран.

---

## Б.3. Все состояния (проверено по коду)

| Состояние | Как определяется | Что показывается |
|---|---|---|
| Обычный левелап без подарка | `queueRef` содержит уровень, ни `singleGiftsRef`, ни `dualGiftsRef` не заполнены | **Ничего.** `showNext:943-944` — `if (!displayGift) { isShowingRef=false; return; }` — окно не откроется вовсе |
| Левелап с одиночным подарком | `singleGiftsRef.current[lvl]` | фаза 2 → пауза 180/260 → `LevelGiftModal` |
| Двойной подарок (премиум) | `dualGiftsRef.current[lvl]` → `levelGiftDualMode=true` | фаза 2 → пауза → `LevelGiftDualModal` (два сундука) |
| Спин-уровень | `spinLevelsRef.has(lvl)` (`:875`) | фаза 2 + плашка «+1 СПИН», которая **исчезает на 2350 мс**; подарка нет, барабана нет |
| Milestone (кратно 5) | `_layout.tsx:1391` `currentLevel % 5 === 0` | добавляется одна иконка `sparkles` с fade + тень портала. **Всё отличие** |
| Догоняющая награда | `currentAccountLevel > currentLevel` (`:1327`) | меняется только текст кикера и сообщения (`:1328-1342`); движение идентично |
| Уровень 5, free-юзер | `onGiftClose:1296` | после подарка — `router.push('/premium_modal')` |
| Несколько уровней подряд | `queueRef` длиной > 1 | `onGiftClose:1285-1286` → `queueMicrotask(showNext)` — **без паузы и без нарастания**; уровень 7 выглядит ровно как уровень 6 |
| Во время урока | `isTournamentInterruptionProtectedPath` покрывает **только `/tournament_*`** (`app/tournament_interruption_guard.ts:1-7`) | **полноэкранное окно перекрывает урок между ответами** (XP начисляется на каждый ответ — `app/lesson1.tsx:2993`) |
| Во время турнира | `_layout.tsx:781, 1325` | подавлено (правильно) |
| На `/level_reward_spin` | `showNext:871` | подавлено (правильно) |
| Оффлайн / сбой резервации | `showNext:950-954` | **тишина**: ни окна, ни тоста, ни ретрая в UI |
| Смена аккаунта | `resetLevelUpChainForAccountChange` (`:828-862`) | всё сбрасывается, анимации останавливаются |
| Reduce Motion | `LevelUpThresholdModal.tsx:106` → `{opacity: 1}` | сцена появляется сразу; **но `glow` всё равно тикает 900 мс**, а `portalStyle`/`rewardRevealStyle`/`actionRevealStyle` становятся `undefined` — награды и кнопка видны сразу. Внутренние лупы сундука Reduce Motion **не уважают** вовсе |

---

## Б.4. Коллизии (левелап + достижение + осколки + лига)

* Единый слот — `OverlayArbiter` (`components/OverlayArbiter.tsx:113-131`), non-preemptive:
  владелец держит слот до самоосвобождения.
* Приоритет (`components/overlay_arbiter_core.ts`, `OVERLAY_PRIORITY`):
  `onboardingWelcome → update → authRecovery → releaseNotes → broadcast → personalAdminMessage →
  leagueBonusAvailable → notifNudge → introFullAccess → **levelUp** → themedAlert →
  premiumCelebration → vipCelebration → leagueResult → streakRevive → … →
  lessonResultsSequence → lessonCompleteNotif → collectibleDrop → reviewPrompt →
  shardsEarned → achievementToast → coachToast → actionToast → coinsMigration → perfectWeekReward`.
  ⇒ левелап всегда **раньше** лиги, достижений, осколков и всех тостов.
* Осколки идут через `emitAppEvent('action_toast')` (`components/GlobalShardsEarnedHost.tsx:55-59`) —
  самый низ очереди.
* `levelUp` **не** в `FORCE_EVICTABLE_KEYS` — сторож 15 с его не выселит (верно: иначе сундук
  с наградой пропал бы).
* Слот удерживается на **весь** переход уровень→подарок флагом `levelUpTransitioning`
  (`_layout.tsx:790, 1229, 1281, 1323-1326`), со сторожем на 4000 мс против залипания
  (`:1361-1385`).
* `NATIVE_MODAL_HANDOFF_GAP_MS = 360` (`OverlayArbiter.tsx:58`) — зазор между **разными** нативными
  модалками. Переход уровень→подарок идёт внутри одного ключа `'levelUp'`, поэтому арбитр зазор
  **не вставляет**; вместо него работает собственный таймер 180/260 мс (`_layout.tsx:1243`).
  **Два независимых механизма для одной задачи, с разными числами.**
* `lessonResultsSequence` (эталон) стоит **ниже** `levelUp`. Если урок дал уровень,
  порядок будет: full-bleed окно уровня → сундук → и только потом секвенция наград урока.
  Празднование урока приходит **после** празднования уровня, хотя причина у них одна.

---

## Б.5. Что конкретно чинить

### Уровень 1 — вернуть модальность (это и есть запрос владельца)

1. **`LevelUpThresholdModal.tsx:154-162` → внести фон в анимируемый узел.**
   Сейчас `LinearGradient` + `ambientTop/ambientBottom/horizon` — прямые дети `styles.screen`.
   Обернуть их в `Animated.View` с `opacity`, привязанной к тому же `opacity`, что и `stage`
   (или к отдельному `backdropSV` c `withTiming(240)`), — тогда исчезнет кадр «экран подменили».
2. **Ввести бэкдроп вместо заливки.** `styles.screen:314-317` → добавить
   `backgroundColor: 'rgba(0,0,0,0.55)'`, а `palette.background` перенести внутрь карточки
   (`stage`, `maxWidth: 410` уже есть — `:330-334`). Тогда сцена под окном остаётся видимой,
   и появляется возможность вылета бейджа из аватара.
3. **`:148` `onRequestClose={() => {}}` → `onContinue`.** Сейчас Android-back мёртв.
4. **Согласовать два кадра.** Либо оба — карточка на затемнении 0.52 (как `LevelGiftModal.tsx:573`),
   либо оба — full-bleed. Сейчас `animationType="none"` + без затемнения соседствует
   с `animationType="fade"` + затемнение 0.52.

### Уровень 2 — убрать разрыв между уровнем и подарком

5. **`_layout.tsx:1230-1243`.** Сейчас: fade 300 → снос фона → `runAfterInteractions` →
   таймер 180/260 → подарок. Схлопнуть в один непрерывный переход: держать одну поверхность
   (одну `Modal`) и морфить содержимое уровень→сундук, либо кросс-фейдить, не снимая фон.
   Пауза «голого экрана» между двумя частями одного праздника недопустима.
6. **Единый механизм зазора.** Либо арбитрный `NATIVE_MODAL_HANDOFF_GAP_MS`,
   либо локальный `180/260` — но не оба с разными числами.

### Уровень 3 — вернуть кульминации движение и обратную связь

7. **Хаптика.** В `_layout.tsx:770-1500` **ноль** haptic-вызовов. По DNA-правилу 5 нужно:
   `hapticSuccess()` в `onShow` (`:1466`) синхронно со звуком `pm.reward.level_up`,
   отдельные импульсы на появление каждой строки награды (`:243-284` — они и так стаггерятся
   по `glow` 0.30/0.38).
8. **`LevelUpThresholdModal.tsx:220` — `autoplay={false}` → `true`.** Анимированная медаль уровня
   заморожена ровно в свой звёздный час. Плюс дать бейджу собственный spring
   с перерегулированием 17–23 % (DNA-правило 1), сейчас он въезжает вместе со всей сценой.
9. **Счётчик «+100 XP».** `_layout.tsx:1417` `xpValue={'+100 XP'}` — статичная строка.
   Заменить на `AnimatedTextInput` + `useAnimatedProps` по образцу
   `ResultsSequence.tsx:128-152`, с фиксированной шириной слота (`:262`).
10. **Число уровня.** `LevelUpThresholdModal.tsx:232-234` — «УРОВЕНЬ N» появляется готовым.
    Нужен переход `N−1 → N` (счётчик или флип), это единственный смысл всего окна.
11. **Раскрытие подарка — немой кадр.** В `LevelGiftModal.tsx` нет ни одного
    `soundDirector.request`, нет `hapticSuccess` на `finalize()` (`:384-413`),
    а `GiftOpenEffects.tsx:28-45` — статичное пятно. Как минимум: success-хаптика на `finalize`,
    звук раскрытия, конечный `ConfettiBurst` (уже есть готовый компонент, DNA-правило 11)
    с `count` по редкости.
12. **Дифференциация по редкости.** В `LevelGiftDualModal.tsx:572-573` она есть
    (`hapticSuccess` для prem/epic/rare), в `LevelGiftModal.tsx:324` — нет (всегда `hapticTap`).

### Уровень 4 — баги таймлайна

13. **`SpinRewardPlaque` внутри окна уровня самоуничтожается.**
    `LevelUpThresholdModal.tsx:275-283` монтирует плашку без `staticPresentation`,
    `onComplete={() => {}}`. По `SpinRewardPlaque.tsx:65-79` она через
    `280 + 320 + 1100 = 1700 мс` улетает на −96 px и к **2350 мс** становится невидимой,
    оставляя пустую дыру 76 px в стопке наград. Передать `staticPresentation` (как это делает
    `ResultsSequence.tsx:565` через `spinRewardStatic`).
14. **Наложение двух наградных звуков.** `pm.reward.level_up` в `onShow` (`_layout.tsx:1468`)
    и `pm.reward.small` из плашки (`SpinRewardPlaque.tsx:59`) стартуют в один и тот же момент —
    прямое нарушение DNA-правила 4 (≥ 100 мс тишины между наградными звуками).
15. **Бесконечные лупы в наградном слое.** `LevelGiftModal.tsx:279-285` (glow 1450+1450),
    `:294-309` (float/rock 1700+1700), `:403-410` (пульс 1250+1250),
    `LevelGiftDualModal.tsx:376-390` (ctaShine). Ни один не уважает `useReduceMotion`
    (в отличие от `ResultsSequence`, DNA-правило 12).

### Уровень 5 — флоу

16. **Не перебивать урок.** `app/tournament_interruption_guard.ts:1-7` защищает только
    `/tournament_*`. Уровень выпадает поверх `/lesson1` между ответами. Добавить маршруты урока
    в защищённые и показывать уровень после экрана завершения — либо вовсе встроить его
    в `ResultsSequence` как отдельную веху (там уже есть слоты наград, `:553-581`).
17. **Спин-уровень — тупик.** `finalizeSpinLevelUp` (`_layout.tsx:1174-1221`) не ведёт к барабану.
    Либо `router.push('/level_reward_spin')` по «Готово», либо встроить барабан
    (`LevelSpinFinishLine`, у которого честный motion-план) прямо в окно.
18. **Молчаливый провал.** `showNext:950-954` при `displayStatus === 'unavailable'` не показывает
    ничего. Нужен тост «подарок сохранён, попробуем позже» (механика тоста уже есть —
    `LevelGiftModal.tsx:251-256`).
19. **Серия уровней не нарастает.** `onGiftClose:1285-1286` запускает следующий уровень
    через `queueMicrotask` без паузы и без усиления. Ввести стаггер между уровнями
    (по DNA-правилу 2 — замедляющийся ритм) и хотя бы одно отличие второго/третьего уровня подряд.
20. **Пейвол сразу после праздника.** `_layout.tsx:1296-1311` — на уровне 5 free-юзер получает
    `premium_modal` немедленно после закрытия сундука. Как минимум — задержка на длину
    выходной анимации, чтобы праздник не обрывался коммерцией в тот же кадр.
