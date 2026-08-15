# 02 — Инвентаризация модалок, оверлеев, шитов, дропдаунов и попапов в `/root/pm2/app/`

Дата: 2026-08-14 · Область: `/root/pm2/app/` (158 `.tsx`) · Версия: phraseman v1.5.53

Папок `docs/` и `ux-audit/` в контейнере нет (проверено: `ls -d /root/pm2/docs /root/pm2/ux-audit /root/docs /root/ux-audit` → пусто). Пункт пропущен.

Метод: сплошной проход по `<Modal`, `position: 'absolute'`, `zIndex`, `visible={`, `show* &&`, `Sheet`, `Popup`, `Dropdown`, `Tooltip`, плюс перекрёстная проверка импортов оверлейных компонентов из `components/` и `presentation:'modal'` в `_layout.tsx`.

---

## 0. Сводка: сколько поверхностей и где

| Класс поверхности | Кол-во | Где |
|---|---|---|
| Нативный RN `<Modal>` прямо в `app/` | **28** JSX-инстансов в 19 файлах | таблица §1 |
| Inline-оверлеи БЕЗ `<Modal>` (absolute + zIndex) | **9** | §2 |
| Шиты через локальный `Sheet` (tournament_ui) | **3** | §3 |
| Модалки через shared-компоненты `components/*` | **78 точек монтирования** в 40 экранах | §4 |
| Route-модалки (`presentation:'modal'` в `_layout.tsx`) | **18** (14 section-sheet + pack_opening + 7 пейволов) | §5 |

Итого **≈136 модальных/оверлейных точек** в `app/`.

### Три числа, которые задают тон всему отчёту

1. **`components/MotionModal.tsx` — канонический анимированный модал проекта (открытие 280мс, закрытие 180мс, `translateY 18`, `scaleFrom 0.985`, поддержка reduce-motion через `getModalMotionPlan`) — используется в `app/` РОВНО НОЛЬ раз.** Проверено: `grep -rn "MotionModal" app/` → пусто. Его знают только `components/AppMessagesInbox.tsx` и `components/NotificationCenterButton.tsx`.
2. **Перепись `animationType` в `app/`: 20× `"fade"`, 5× `"none"`, 3× `"slide"`.** То есть 20 из 28 поверхностей анимируются нативным кроссфейдом ОС — самой дешёвой анимацией, которая не умеет ни масштаб, ни смещение, ни разную кривую на вход/выход.
3. **`expo-blur` есть в `package.json:226` (`~15.0.8`), а `BlurView` не используется НИ РАЗУ — ни в `app/`, ни в `components/`.** Проверено двумя грепами (0 и 0). Все backdrop'ы приложения — плоская `rgba(0,0,0,α)`-заливка. При графике уровня GOLD_GRADIENTS / goldShadow / кольцевых прогрессов это самый заметный разрыв «графика ↔ движение».

---

## 1. Нативные `<Modal>` внутри `app/` — поимённо

Легенда столбцов: **вход** — как появляется; **выход** — как исчезает; **BD** — backdrop (цвет / тап-закрытие); **SBT** — `statusBarTranslucent`.

| # | Файл:строка | Поверхность | Вход | Выход | BD | SBT |
|---|---|---|---|---|---|---|
| 1 | `(tabs)/friends.tsx:1274` | FriendQuestStartedModal | native fade | native fade | `rgba(9,8,12,0.72)`, тапа нет | нет |
| 2 | `(tabs)/friends.tsx:1310` | FriendQuestCompletedModal | native fade | native fade | `rgba(9,8,12,0.72)`, тапа нет | нет |
| 3 | `(tabs)/friends.tsx:3475` | Шит «Подарок другу» | native **slide** | native slide | `rgba(0,0,0,0.58)` + absoluteFill Pressable | нет |
| 4 | `(tabs)/friends.tsx:3681` | «Подарок получен» | native fade | native fade | `rgba(9,8,12,0.72)`, тапа нет | нет |
| 5 | `(tabs)/home.tsx:3235` | Energy Tooltip | Animated.spring JS-поток | **мгновенно при тапе**, fade 220мс при авто-скрытии | прозрачный, тап закрывает | нет |
| 6 | `(tabs)/home.tsx:3344` | Выбор титула | native fade | native fade | `rgba(0,0,0,0.62)` + `Pressable absoluteFillObject` | нет |
| 7 | `(tabs)/settings.tsx:1875` | Аккаунт | native fade | native fade | `rgba(0,0,0,0.7)`, **тапа нет** | нет |
| 8 | `(tabs)/settings.tsx:1950` | Подтв. смены аккаунта | native fade | native fade | `rgba(0,0,0,0.7)`, **тапа нет** | нет |
| 9 | `(tabs)/settings.tsx:2194` | Лоадер wipe | native fade | native fade | `rgba(0,0,0,0.75)`, тапа нет (верно) | нет |
| 10 | `(tabs)/settings.tsx:2223` | Смена имени | native fade | native fade | `rgba(0,0,0,0.7)` + Pressable | нет |
| 11 | `LeagueResultModal.tsx:553` | Итоги недели | **Animated.parallel spring + timing** | **exitProgress 150мс** | `rgba(0,0,0,0.86)` / `rgba(23,32,29,0.55)` (light) + 2 LinearGradient-свечения | **да** |
| 12 | `achievements_screen.tsx:1052` | AchievementModal | native fade | **мгновенно** (нет `visible`, размонтируется родителем) | `#00000088`, тап закрывает | нет |
| 13 | `collectibles_screen.tsx:369` | CardDetailModal | native fade | **мгновенно** (`visible` хардкод `true`) | `rgba(2,3,6,0.92)`, тапа нет | да |
| 14 | `flashcards/CardPackShardPaywallModal.tsx:444` | Пейвол паков | **Reanimated: backdrop 320мс + spring sheetY + opacity 240мс + CTA-пульс** | **Reanimated 180–200мс** | `paywallVisual.backdropBase` + Pressable | да |
| 15 | `flashcards/DeckPickerSheet.tsx:319` | Выбор наборов | **Reanimated spring `{damping:22, stiffness:260, mass:0.9}`** + backdrop timing | **withTiming 250мс + runOnJS(unmount)** | `rgba(0,0,0,0.55)` + Pressable | да |
| 16 | `flashcards/ListeningModePicker.tsx:302` | Дропдаун режима | **Reanimated spring + поворот шеврона + measureInWindow-якорь** | **withTiming 150мс** | `#000` × `progress*0.55` + Pressable | да |
| 17 | `learning-v2/lesson/[id].tsx:549` | LessonMapSheet | native **fade** (панель НЕ выезжает) | native fade | `styles.sheetBackdrop` + Pressable | да |
| 18 | `lesson1.tsx:1773` | «Пройденные фразы» | native fade | native fade | `rgba(0,0,0,0.6)` + Pressable | нет |
| 19 | `lesson_complete.tsx:246` | ReviewModal (оценка) | **Animated fade 200мс** | **мгновенно** (`animationType="none"` + `onClose()` без анимации) | `rgba(0,0,0,0.5)` + Pressable | нет |
| 20 | `lesson_menu.tsx:1495` | Урок заблокирован | native fade | native fade | `rgba(0,0,0,0.5)` + Pressable | нет |
| 21 | `max_call_session.tsx:1026` | Шит транскрипта | native **slide** | native slide | `rgba(0,0,0,0.45)`, **тапа нет** | нет |
| 22 | `referral_access_ended_modal.tsx:134` | Доступ по рефералке кончился | native fade | native fade | `styles.backdrop`, тапа нет | да |
| 23 | `season_pass.tsx:946` | Покупка пропуска | native fade | native fade | `rgba(0,0,0,0.62)`, **тапа нет** | нет |
| 24 | `settings_notifications.tsx:98` | TimeModal (часы/минуты) | native fade, но **гасится `if (!visible) return null`** | **мгновенно** | `rgba(0,0,0,0.55)`, тапа нет | нет |
| 25 | `streak_stats.tsx:1438` | Шит ставки (пари) | native **slide** + PanResponder translateY | **конфликт** (см. §6.2) | `#00000088` + `Pressable absoluteFillObject` | нет |
| 26 | `streak_stats.tsx:3841` | Заморозка цепочки | native fade | native fade | `rgba(0,0,0,0.6)` + Pressable | нет |
| 27 | `streak_stats.tsx:4129` | Лист «Пари на серию» | native fade (но геометрия — bottom sheet) | native fade | `rgba(0,0,0,0.62)` + Pressable | нет |
| 28 | `(tabs)/friends.tsx:1783` | AddFriendModal → `CenteredDialogShell` | **Reanimated 180/200/260мс** | **Reanimated 160мс** | `styles.backdrop` | да |

**Итог по таблице: только 6 из 28 (#11, #14, #15, #16, #28 и частично #5) имеют осмысленную собственную анимацию. Остальные 22 — нативный кроссфейд ОС или мгновенный срез.**

**`statusBarTranslucent` стоит только на 8 из 28.** На Android остальные 20 модалок не покрывают статус-бар: backdrop обрывается по верхней кромке, над затемнением остаётся светлая полоса. Это ломает иллюзию «окно поверх всего» на самых заметных поверхностях — `(tabs)/settings.tsx:1875/1950/2194/2223`, `season_pass.tsx:946`, `streak_stats.tsx:1438/3841/4129`, `lesson_menu.tsx:1495`, `lesson1.tsx:1773`, все четыре в `friends.tsx`, обе в `home.tsx`.

---

## 2. Inline-оверлеи БЕЗ `<Modal>` (absolute + zIndex)

### 2.1 `manage_subscription.tsx:426` — шит опроса при отмене подписки
```
{showCancelSheet && ( <View style={S.sheetOverlay}> ... )}
S.sheetOverlay = position:'absolute', left/right/top/bottom:0, backgroundColor:'rgba(0,0,0,0.62)', justifyContent:'flex-end'   // :506
```
- **Механизм:** голый условный рендер внутри `SafeAreaView`. Не `Modal`.
- **Вход/выход:** ноль анимации. Оверлей + шит появляются одним кадром, исчезают одним кадром.
- **Backdrop:** `S.sheetOverlay` — обычный `View`, **без `onPress`**. Тап мимо шита не закрывает.
- **Аппаратный Back (Android):** не перехвачен (нет `Modal`/`onRequestClose`) → Back уводит с ЭКРАНА, а не закрывает шит. Пользователь в момент отмены подписки внезапно вылетает из настроек подписки.
- **Хаптика:** есть на выборе причины (`:439 hapticTap()`) и на «Остаться в Plus» (`:467`), **нет на открытии** (`:415 setShowCancelSheet(true)` — hapticTap есть, ок) и нет на submit (`:458 submitCancel` без тактильного отклика на деструктивном шаге).
- **Токены:** частично — `chrome.bgColors[1] ?? '#11151a'` (хардкод-фолбэк), радиусы/шрифты в локальном `StyleSheet` (`:507-517`) мимо дизайн-системы.
- **Приоритет: высокий.** Это единственная поверхность отмены подписки, и она самая «дешёвая» в приложении.

### 2.2 `lesson_complete.tsx:481` — AchievementNotifModal
```
<Animated.View style={{ position:'absolute', top:0,left:0,right:0,bottom:0, zIndex:999, opacity, backgroundColor:'rgba(0,0,0,0.65)' }}>
```
- **Вход:** `Animated.parallel([timing opacity 300мс, spring translateY friction:6])` (`:367-370`) — единственный inline-оверлей с приличным входом.
- **Выход:** `Animated.timing(opacity, 200мс)` (`:374`) — **карточка не уезжает, только гаснет фон вместе с ней**. Асимметрия: вход двумерный (fade + подъём), выход одномерный.
- **`friction: 6`** (`:369`) — вне токенов. В `MOTION_SPRING_LEGACY` (`constants/motion.ts:44-60`) для панелей заведено `panel: {tension:250, friction:25}`. `friction:6` — это заметный отскок, «игрушечный» по сравнению с золотом на карточке.
- **Backdrop:** `rgba(0,0,0,0.65)` хардкод, тап закрывает (`:485`).
- **zIndex 999** vs `zIndex 999` соседнего контейнера на `:1710` — два слоя с одинаковым индексом в одном дереве.
- **Хаптика/звук:** в компоненте нет ни одного вызова. Медаль/разблокировка урока — событие празднования, приходит молча.

### 2.3 `learning-v2/session/[id].tsx:1631` — церемония завершения сессии
```
{showCompletionCeremony && ( <View accessibilityViewIsModal style={styles.ceremonyBackdrop}> ...
styles.ceremonyBackdrop = {...StyleSheet.absoluteFillObject, zIndex:70, backgroundColor:'#090D13F2'}   // :2180
```
- **Вход:** `entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.duration(420).springify().damping(15)}` (`:1637-1641`) — карточка входит хорошо и уважает reduce-motion.
- **Выход:** **`exiting` не задан**. Условный рендер → карточка и весь тёмный фон `#090D13F2` исчезают одним кадром. Самый резкий контраст «вход/выход» в приложении: 420мс пружины на вход, 0мс на выход.
- **Backdrop:** `#090D13F2` (94% непрозрачности) хардкод, тапа нет — закрытие только кнопкой.
- Внутри при этом живёт качественная моторика: `ceremonyProgress` с `withTiming` (`:585`), `ceremonyHeroScale` с `withSequence` (`:590`). Т.е. содержимое анимировано, а контейнер — нет.

### 2.4 `flashcards/FlashcardsFilterDropdown.tsx:31-52` — фильтр коллекции карточек
```
if (!visible) return null;
<TouchableOpacity style={{position:'absolute', top:0,left:0,right:0,bottom:0}} activeOpacity={1} onPress={onClose} />   // :35
<View style={{ position:'absolute', top:56, right:16, zIndex:9999, ... }}>                                              // :36-51
```
Хост: `flashcards_collection.tsx:818`.
- **Вход/выход:** **абсолютный ноль анимации.** Дропдаун телепортируется. При этом в том же модуле рядом лежит `ListeningModePicker` — дропдаун с пружиной, поворотом шеврона и измеренным якорем. Два дропдауна в одном разделе живут по противоположным законам.
- **Позиция:** `top: 56, right: 16` — жёсткий хардкод, а не `measureInWindow` от кнопки-триггера (`flashcards/CollectionHeader.tsx:261`). При другом хедере/большом системном шрифте список отвяжется от кнопки.
- **Backdrop:** полностью прозрачный, без затемнения — под открытым дропдауном контент читается на равных, слоёвость не считывается.
- **zIndex 9999** — самое большое значение в `app/`; в том же дереве есть `zIndex 99999` (`lesson_words.tsx:3095`). Шкала не нормирована.
- **Хаптика:** ни на открытии, ни на выборе пункта (`:55`, `:83`). `ListeningModePicker` рядом делает `fcHaptic('tap')` и на открытии (`:197`), и на выборе (`:229`).

### 2.5–2.8 XP-тосты внутри уроков (4 штуки, три разных реализации)

| Файл:строка | Реализация | Проблема |
|---|---|---|
| `lesson1.tsx:1053` | `Animated.Text`, `position:'absolute'`, `right:0, bottom:'100%'`, opacity + translateY `[4,0]` | смещение **4px** — на грани восприятия; нет zIndex, зависит от порядка в дереве |
| `lesson_words.tsx:3091` | `Animated.View`, `top:100, alignSelf:'center'`, `zIndex: 99999` | цвет фона хардкод `'#FFC800'` / `'#92400E'`; `top:100` без учёта `insets.top` |
| `preposition_drill.tsx:804` | третий вариант | — |
| `lesson_irregular_verbs.tsx:654` | четвёртый вариант | — |

Четыре одинаковых по смыслу микро-попапа («+N XP») написаны четырьмя разными способами, с разной геометрией, разными zIndex и разными цветами. Ни один не берёт `MOTION_SCALE` / `MOTION_DURATION`.

### 2.9 `_layout.tsx:3296` — post-onboarding gold bridge
```
{postOnboardingGoldBridgeVisible && (
  <Animated.View pointerEvents="none" style={[styles.postOnboardingGoldBridge, { opacity: postOnboardingScreenTintOpacity }]}>
```
Полноэкранный золотой градиентный тинт поверх стека. Анимируется по opacity — корректно; `pointerEvents="none"` — корректно. Замечаний нет; фиксирую для полноты инвентаря.

---

## 3. Шиты через локальный `Sheet` — `(tabs)/tournaments.tsx`

Компонент: `components/tournament/tournament_ui.tsx:169-182`.
```
<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <Pressable style={styles.sheetBackdrop} onPress={onClose} .../>   // :175   backgroundColor:'rgba(0,0,0,0.6)'  :240
  <View style={styles.sheet}> <View style={styles.sheetGrip}/> {children} </View>
</Modal>
```
Три инстанса: `(tabs)/tournaments.tsx:1286` (банк), `:1343` (недельный приз), `:1358` (подтверждение входа в турнир).

- **Ключевой дефект:** `animationType="slide"` двигает **всё содержимое Modal**, а `sheetBackdrop` лежит ВНУТРИ него. Значит затемнение не проявляется, а **выезжает снизу вместе со шитом**. Верх экрана остаётся незатемнённым, пока шторка едет, — визуально это читается как «серая простыня наползает снизу», а не «экран притух, окно поднялось». Ровно тот же дефект в `(tabs)/friends.tsx:3475` (`animationType="slide"` + backdrop-`View` внутри) и `max_call_session.tsx:1026`.
- **Grabber есть** (`:250-258`), **а жеста нет**: 40×4 плашка обещает свайп-вниз, который не реализован. Ложный аффорданс на трёх поверхностях сразу.
- **Хаптика:** ни на одном из трёх открытий/закрытий. Проверено: `grep hapt (tabs)/tournaments.tsx` вокруг `openBank :321`, `closeBank :322`, `openConfirm :704`, `closeConfirm :707`, `setWeeklyPrize :362` — пусто. Подтверждение входа в турнир (списание билета) проходит без единого тактильного отклика.
- **Тема:** палитра берётся из `useTournamentPalette()` — отдельная палитра турниров, не `constants/theme.ts`. Т.е. эти три шита не переключаются вместе с 12 темами приложения.

---

## 4. Модалки через shared-компоненты (точки монтирования в `app/`)

78 точек. Полная карта хостов (файл:строка → компонент):

**`ThemedConfirmModal`** (16 точек) — `paywall_a.tsx:281`, `paywall_b.tsx:299`, `paywall_c.tsx:352`, `paywall_d.tsx:259`, `paywall_e.tsx:328`, `paywall_f.tsx:249`, `paywall_g.tsx:283`, `club_screen.tsx:1667`, `level_exam.tsx:1793`, `lesson_words.tsx:3147`, `community_pack_create.tsx:1340`, `streak_stats.tsx:1710/1775/4789`, `(tabs)/settings.tsx:1817`, `(tabs)/friends.tsx:3872`.
Качество носителя (`components/ThemedConfirmModal.tsx`): `animationType="fade"` (`:115`), backdrop `rgba(0,0,0,0.60)` хардкод (`:38`), **есть свайп-вниз на PanResponder** (`:71-113`) с порогом `dy>90 || vy>1.2` и пружиной возврата `{damping:16, stiffness:180, mass:0.9}`, `hapticTap()` на тапе по фону (`:120`) и на свайп-закрытии (`:89`). Вход при этом — нативный fade без scale/translate. **Свайп есть, а grabber'а нет** — обратная проблема турнирных шитов: жест реализован, но ничем не обозначен.

**`ThemedChoiceModal`** (3) — `lesson_menu.tsx:1585`, `(tabs)/lessons.tsx:3137/3185`. `animationType="fade"` (`components/ThemedChoiceModal.tsx:43`), backdrop `rgba(0,0,0,0.60)` (`:32`), свайпа нет, вход/выход — только нативный fade.

**`NoEnergyModal`** (16) — `exam.tsx:982/1133/1247/1276/1467/1664/1836`, `diagnostic_test.tsx:1645/1699`, `level_exam.tsx:1316/1618`, `lesson1.tsx:3879`, `lesson_words.tsx:3771`, `lesson_irregular_verbs.tsx:1287`, `review.tsx:1961`, `preposition_drill.tsx:846`, `trainer_phrases_session.tsx:953`, `trainer_words_session.tsx:649`. Единственный shared-модал с полноценной постановочной анимацией (`components/NoEnergyModal.tsx:307-320`: spring карточки по `MOTION_SPRING_LEGACY.ui`, задержанный вход молнии по `.micro`, шейк 70/70мс, halo-пульс). **Он же — единственный, кто реально читает `constants/motion.ts`.**

**`CollectibleDropModal`** (6) — `lesson_complete.tsx:1761`, `lesson_words.tsx:3139`, `lesson_irregular_verbs.tsx:610`, `preposition_drill.tsx:848`, `tournament_results.tsx:734`.
**`RegistrationPromptModal`** (4) — `_layout.tsx:3312`, `(tabs)/settings.tsx:1793`, `account_details.tsx:387`, `lesson_complete.tsx:1756`.
**`DeleteAccountConfirmModal`** (3) — `(tabs)/settings.tsx:1805`, `account_details.tsx:382`, `privacy_settings.tsx:222`.
**`ReviewPromptModal`** (3) — `lesson_complete.tsx:1385/1737`, `level_exam.tsx:1842`.
**`PlayerProfileModal`** (2) — `(tabs)/home.tsx:3330`, `top_helpers.tsx:440`.
**`StreakReviveModal`** (2) — `(tabs)/home.tsx:3409`, `streak_stats.tsx:4858`.
**`VipCelebrationModal`** (2) — `(tabs)/home.tsx:3440`, `promo_code_entry.tsx:334`.
**`LevelGiftModal`/`LevelGiftDualModal`** (4) — `_layout.tsx:1476/1487`, `level_gifts_inventory.tsx:703/733`.
**`GlobalBroadcastModal`** (2) — `_layout.tsx:1589/3394`.
**`ReportPackModal`** (2) — `flashcards/CardPackShardPaywallModal.tsx:1176`, `flashcards/FlashcardsCategoryHub.tsx:857`.
**`DeckPickerSheet`** (3 хоста) — `flashcards/FlashcardsTabBar.tsx:915`, `flashcards_blitz_session.tsx:482`, `flashcards_listening_session.tsx:528`.
**Одиночные** — `LevelUpThresholdModal` `_layout.tsx:1390`; `NotificationPermissionModal` `_layout.tsx:3319`; `UpdateModal` `:3373`; `ReleaseNotesModal` `:3389`; `PersonalAdminMessageModal` `:3400`; `LeagueBonusAvailableModal` `:3406`; `IntroFullAccessModal` `:3417`; `PremiumCelebrationModal` `(tabs)/home.tsx:3420`; `LeagueChestOpenModal` `club_screen.tsx:1795`; `SeasonGiftModal` `season_pass.tsx:986`; `SeasonRewardInfoModal` `:1007`; `LevelSpinRewardModal` `level_reward_spin.tsx:225`; `CertificateNameModal` `exam.tsx:1468/1665`; `AiDialogConsentModal` `ai_dialog_consent_gate.tsx:102`; `AiExplainConsentModal` `lesson1.tsx:1869`; `MistakeEli5Modal` `lesson1.tsx:1860`; `ExplainSheet` `lesson1.tsx:1761`; `ReferralAccessEndedModal` `(tabs)/friends.tsx:3845`; `ReferralCodeSheet`/`ReferralHowSheet`/`RouletteWinModal` `referrals.tsx:886/887/888`; `FlashcardsFilterDropdown` `flashcards_collection.tsx:818`; `ListeningModePicker` `flashcards_listening_session.tsx:800`; `CardPackShardPaywallModal` `flashcards/useCardPackShardPaywall.tsx:156`; `CenteredDialogShell` `(tabs)/friends.tsx:1783`.

---

## 5. Route-модалки (`presentation:'modal'` в `_layout.tsx`)

**Флаги переходов — `app/config.ts`:**
```
ENABLE_SCREEN_TRANSITIONS = process.env.EXPO_PUBLIC_SCREEN_TRANSITIONS === '1'     // :160  → по умолчанию FALSE
SCREEN_FADE_TRANSITIONS   = process.env.EXPO_PUBLIC_SCREEN_FADE !== '0'            // :176  → по умолчанию TRUE
SECTION_SHEET_TRANSITIONS = process.env.EXPO_PUBLIC_SECTION_SHEET_TRANSITIONS !== '0' // :194 → TRUE
```
Отсюда `_layout.tsx:3123-3127`:
```
bottomModalAnimationOptions = ENABLE_SCREEN_TRANSITIONS ? {animation:'slide_from_bottom'}
                            : screenFadeEnabled ? {animation:'fade', animationDuration:140}
                            : {animation:'none'}
```
**В дефолтной сборке `ENABLE_SCREEN_TRANSITIONS === false`, значит нижние модалки открываются кроссфейдом 140мс, а не выездом.** «Шторки разделов» спасает отдельный флаг `SECTION_SHEET_TRANSITIONS` (`app/section_sheet_navigation.ts:26-28` → `presentation:'modal' + slide_from_bottom + gestureEnabled`), и 14 экранов действительно выезжают: `referrals`, `promo_code_entry`, `privacy_screen`, `terms_screen`, `settings_edu`, `settings_language`, `settings_themes`, `settings_notifications`, `privacy_settings`, `account_details`, `top_helpers`, `ideas_submit`, `tournament_tickets` (+ хост в `_layout.tsx`). Пейволы тоже: `components/paywall/paywallShared.tsx:99` → `{presentation:'modal', animation:'slide_from_bottom', gestureEnabled:true}`.

**Дыра:** `_layout.tsx:3253`
```
<Stack.Screen name="pack_opening" options={{ presentation:'modal', animation:'none', animationDuration:0 }} />
```
Открытие пака — самая «праздничная» механика приложения — **появляется без единого кадра перехода**. Полноэкранная модалка мгновенно подменяет экран.

Аналогично `paywallShared.tsx:95`: при заходе с онбординга пейвол — `{presentation:'card', animation:'none', animationDuration:0, gestureEnabled:false}`.

---

## 6. Конкретные баги движения (не стилистика — воспроизводимые дефекты)

### 6.1 `animationType="slide"` двигает backdrop вместе со шитом
Затронуто: `(tabs)/friends.tsx:3475`, `max_call_session.tsx:1026`, `streak_stats.tsx:1438`, `components/tournament/tournament_ui.tsx:174` (×3 инстанса в `tournaments.tsx`).
Во всех пяти местах затемняющий `View`/`Pressable` лежит внутри `<Modal animationType="slide">`, т.е. едет снизу вместе с панелью. Правильное поведение — backdrop гаснет/появляется по opacity на месте, панель едет отдельно (как сделано в `flashcards/DeckPickerSheet.tsx:328-345`, где backdrop анимируется своим `backdropStyle`, а шит — своим `sheetStyle`).

### 6.2 `streak_stats.tsx:1438` — телепорт панели при свайп-закрытии
```
closeWagerModal = useCallback(() => { setModalOpen(false); wagerSheetY.setValue(0); }, [wagerSheetY]);   // :1157-1160
onPanResponderRelease: если dy>70||vy>0.85 → Animated.timing(wagerSheetY → 420, 160мс).start(closeWagerModal)  // :1173-1180
```
Последовательность на реальном свайпе: панель уезжает на +420px → `closeWagerModal` **синхронно ставит `wagerSheetY = 0`** (панель мгновенно прыгает обратно на исходную позицию) → и только теперь нативный `animationType="slide"` начинает свою анимацию ухода вниз. Пользователь видит: уехало → дёрнулось наверх → снова уехало. Плюс дефект §6.1 сверху.

### 6.3 Асимметрия «анимированный вход / мгновенный выход»
| Файл:строка | Вход | Выход |
|---|---|---|
| `lesson_complete.tsx:246` (ReviewModal) | `Animated.timing(fadeAnim, 200мс)` `:222` | `handleNo → onClose()` `:230-232`, `animationType="none"` → срез |
| `learning-v2/session/[id].tsx:1631` | `FadeInDown.duration(420).springify()` | нет `exiting` → срез |
| `achievements_screen.tsx:1052` | native fade | `<Modal>` без `visible`, родитель `setSelected(null)` `:1540` → размонтаж, срез |
| `collectibles_screen.tsx:369` | native fade | `visible` хардкод `true`, родитель размонтирует `:751` → срез |
| `settings_notifications.tsx:98` | native fade | `if (!visible) return null` `:96` гасит модал ДО того, как fade успевает проиграться → срез |
| `(tabs)/home.tsx:3235` (tooltip) | `Animated.spring(tension:120, friction:8)` `:925` | тап по фону → `setEnergyTooltip(visible:false)` `:3237` мгновенно; авто-скрытие через 3с — с fade 220мс `:930` |

Шесть поверхностей открываются мягко и закрываются рубящим срезом. Это самая заметная общая претензия: движение «дотягивает» на вход и обрывается на выход.

### 6.4 `(tabs)/home.tsx:3235` — energy tooltip на JS-потоке
```
Animated.spring(energyTooltipAnim, { toValue:1, useNativeDriver:false, tension:120, friction:8 })   // :925
Animated.timing(energyTooltipAnim, { toValue:0, duration:220, useNativeDriver:false })              // :930
```
`useNativeDriver: false` при том, что анимируются только `opacity`, `translateY`, `scale` (`:3239-3246`) — всё это нативно-совместимо. На главной с каскадом секций и фоновым дрейфом (`HOME_ENTRANCE` в `constants/motion.ts:90-100`) tooltip будет дёргаться под JS-нагрузкой. Плюс два уровня «стрелки» рисуются двумя вложенными `View` с borderWidth-треугольниками (`:3264-3265`) — на 4px смещения это заметно дрожит.

### 6.5 Grabber без жеста / жест без grabber'а
- **Grabber есть, свайпа нет:** `components/tournament/tournament_ui.tsx:250` (×3), `streak_stats.tsx:4132` (плашка 42×4), `flashcards/DeckPickerSheet.tsx:364` (40×4 — здесь свайпа тоже нет, только backdrop-tap).
- **Свайп есть, grabber'а нет:** `components/ThemedConfirmModal.tsx:71-113` (16 хостов) — центрированный диалог, который на самом деле смахивается вниз, но ничем об этом не сообщает.
- **Полный комплект (жест + индикатор):** только `learning-v2/lesson/[id].tsx:519-546` + `:583` и `flashcards/CardPackShardPaywallModal.tsx:376-396`.

### 6.6 `learning-v2/lesson/[id].tsx:549` — bottom sheet, который не выезжает
```
<Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
```
Панель прижата к низу (`styles.sheetModalAlign` + `styles.sheet`), имеет grabber (`:583`) и полноценный Pan-жест с `withSpring({damping:22, stiffness:300})` (`:539`) — но **появляется кроссфейдом**. Шит материализуется на месте вместо подъёма снизу. Вся жестовая машинерия уже написана; не хватает только анимации презентации.

### 6.7 Backdrop без тап-закрытия
`(tabs)/friends.tsx:1274`, `:1310`, `:3681`; `(tabs)/settings.tsx:1875`, `:1950`; `max_call_session.tsx:1026`; `season_pass.tsx:946`; `settings_notifications.tsx:98`; `collectibles_screen.tsx:369`; `referral_access_ended_modal.tsx:134`; `manage_subscription.tsx:427`.
11 поверхностей затемняют экран, но не реагируют на тап по затемнению. На iOS (нет аппаратного Back) единственный выход — найти кнопку. Для сравнения — `components/ThemedConfirmModal.tsx:114-121` явно комментирует это как стандарт проекта и реализует.

### 6.8 Хаптика на открытии/закрытии — выборочная
**Есть:** `lesson1.tsx:599` (openReview), `max_call_session.tsx:934`, `lesson_menu.tsx:716`, `streak_stats.tsx:3696` (handleFreezeStreak) и `:4061` (onOpenWager), `season_pass.tsx:277`, `(tabs)/friends.tsx:2788` (openGiftPicker), `LeagueResultModal.tsx:239-241` (дифференцированная: `hapticSuccess` на промоушен / `hapticWarning` на демоушен / `hapticSoftImpact` иначе) и `:327` на закрытии, `flashcards/CardPackShardPaywallModal.tsx:358` и `:437`, `flashcards/DeckPickerSheet.tsx:311`, `flashcards/ListeningModePicker.tsx:197/229`.
**Нет:** все три шита `(tabs)/tournaments.tsx:1286/1343/1358`; `(tabs)/settings.tsx:1875/1950/2223`; `(tabs)/home.tsx:3344` (титулы); `achievements_screen.tsx:1052`; `collectibles_screen.tsx:369`; `lesson_complete.tsx:246` и `:481`; `settings_notifications.tsx:98`; `learning-v2/session/[id].tsx:1631` (церемония!); `learning-v2/lesson/[id].tsx:549`; `flashcards/FlashcardsFilterDropdown.tsx`; `manage_subscription.tsx` (submit).
**Звук:** ни одна модальная поверхность в `app/` не воспроизводит SFX на появление. Единственная звуковая дисциплина в проекте — `FC_SFX_TTS_GAP_MS = 120` (`constants/flashcards_motion.ts:64`) и она про карточки, не про модалки. Церемония завершения сессии, открытие пака, итоги недели, награда за медаль — все беззвучны.

### 6.9 `reduce-motion` покрыт на 33 из 158 файлов
`grep -rl "useReduceMotion|reduceMotion|reducedMotion" app/ | wc -l` → **33**. Из 28 нативных модалок reduce-motion учитывают: `LeagueResultModal.tsx:343` (`if (reduceMotion) { finish(); return; }`), `flashcards/DeckPickerSheet.tsx:286`, `learning-v2/session/[id].tsx:1638`, `flashcards/ListeningModePicker.tsx` (через `simpleMotion`). Остальные 24 игнорируют системную настройку. При этом инфраструктура готова: `hooks/use_reduce_motion.ts` + `components/modal_motion_plan.ts:4-6` возвращает `{openMs:0, closeMs:0, translateY:0, scaleFrom:1}` — и этим никто не пользуется.

---

## 7. Токены темы: где модалки живут мимо дизайн-системы

### 7.1 Хардкод backdrop'ов — 12 разных значений на 28 поверхностей
`rgba(9,8,12,0.72)` (friends ×3) · `rgba(0,0,0,0.58)` (friends gift) · `rgba(0,0,0,0.62)` (home titles, season_pass, streak_stats:4130) · `rgba(0,0,0,0.7)` (settings ×3) · `rgba(0,0,0,0.75)` (settings wipe) · `#00000088` ≈ 0.53 (achievements, streak_stats:1439) · `rgba(2,3,6,0.92)` (collectibles) · `rgba(0,0,0,0.6)` (streak_stats:3842, tournament_ui:240) · `rgba(0,0,0,0.55)` (settings_notifications, DeckPickerSheet) · `rgba(0,0,0,0.5)` (lesson_complete, lesson_menu) · `rgba(0,0,0,0.45)` (max_call) · `rgba(0,0,0,0.65)` (lesson_complete:483) · `#090D13F2` (learning-v2 ceremony) · `rgba(0,0,0,0.86)`/`rgba(23,32,29,0.55)` (LeagueResultModal:547).
Единственные два места, где значение вынесено в константу — `components/ThemedConfirmModal.tsx:38` и `ThemedChoiceModal.tsx:32` (`const dim = 'rgba(0,0,0,0.60)'`), но и они локальные, не общий токен. **В `constants/` нет ни одного файла с токеном затемнения** — при 12 темах это значит, что светлые темы (LIGHT_OCEAN, LIGHT_SAKURA, BUSINESS_LIGHT, SAGE_PORCELAIN, CANDY_BLUE) получают тот же чёрный дым, что и DARK/GOLD. Единственное исключение, которое считает backdrop от темы — `LeagueResultModal.tsx:547`: `onLight ? 'rgba(23,32,29,0.55)' : 'rgba(0,0,0,0.86)'`.

### 7.2 Хардкод цветов панелей внутри модалок
- `(tabs)/home.tsx:3248` — `backgroundColor:'#1C1C1E'` (iOS-системный серый) для tooltip и `'#FFFFFF'` для текста `:3290`, при 12 темах.
- `(tabs)/friends.tsx:1327` — `backgroundColor:'#19351F'` для иконки квеста; `:3701` — фолбэк-градиент `['rgba(255,247,222,0.98)', ...]`.
- `manage_subscription.tsx:428` — `chrome.bgColors[1] ?? '#11151a'`.
- `lesson_words.tsx:3094` — `'#FFC800'` / `'#92400E'`.
- `learning-v2/session/[id].tsx:2180` — `'#090D13F2'`, `:2033` — `'#F472B6'`, `:2039` — `'#07110A'`.
- `(tabs)/tournaments.tsx` шиты — палитра `useTournamentPalette()` вне `constants/theme.ts`.

### 7.3 Радиусы модальных панелей — 9 разных значений, ни одного токена
`14` (`settings_notifications.tsx` кнопки) · `16` (`(tabs)/settings.tsx:1882/1957/2200/2229`, `ThemedConfirmModal:55`) · `18` (`settings_notifications.tsx:101`) · `20` (`(tabs)/friends.tsx:3494`, `max_call_session.tsx:1032`) · `22` (`(tabs)/home.tsx:3348`, `lesson1.tsx:1782`) · `24` (`friends.tsx:1279`, `achievements_screen.tsx:1056`, `lesson_menu.tsx:1503`, `streak_stats.tsx:3844`, `manage_subscription.tsx:507`, `DeckPickerSheet:322`) · `26` (`season_pass.tsx:949`, `streak_stats.tsx:4131`, `CardPackShardPaywallModal:446`) · `28` (`friends.tsx:3690`, `streak_stats.tsx:1442`, `lesson_complete.tsx:487`) · `32` (`learning-v2/session/[id].tsx:2190`).
`constants/flatDesign.ts` и `constants/statsThemeChrome.ts` содержат `statsSurfaceRadius(...)` — но им пользуются только карточки статистики, не модалки.

### 7.4 Тени модалок
`(tabs)/home.tsx:3252-3256` (`shadowOpacity:0.6, radius:16, elevation:20`), `(tabs)/home.tsx:3349` (`0.34/22/10`), `lesson_complete.tsx:492` (`0.4/24`), `LeagueResultModal.tsx:594-598` (`palette.glow, 0.45/28, elevation:24`), `FlashcardsFilterDropdown.tsx:46-49` (`0.25/12`), `tournament_ui.tsx:212-216` (`0.35/18, elevation:4`). Шесть разных световых моделей. `constants/goldTheme.ts` даёт `goldShadow()`, `constants/oliveTheme.ts` — `oliveShadow()`; в модалках `app/` они встречаются только в `(tabs)/friends.tsx:3697` и внутри `ThemedConfirmModal.tsx:154`.

---

## 8. Архитектурный разрыв: OverlayArbiter не доходит до экранов

`components/overlay_arbiter_core.ts:1-33` определяет 33 ключа очереди и `OVERLAY_PRIORITY` (`:37+`) — грамотная система, которая решает реальную проблему iOS «present-over-present». Комментарий на `:38-43` прямо описывает симптом: одновременный present двух `<Modal>` схлопывает первый и вешает стек презентаций.

**Но `useOverlayVisible` вызывается только в двух файлах `app/`:** `_layout.tsx` (`:3071-3081`, 8 ключей) и `(tabs)/home.tsx` (`:725/743/747` + `leagueResult`). Все остальные 26 нативных `<Modal>` в экранах монтируются мимо арбитра.

Последствия видны прямо в коде:
- `(tabs)/friends.tsx:2193-2195` — экран завёл СВОЙ локальный обходной путь:
  > «Анти-клин iOS: одновременный present двух `<Modal>` глушит тачи всего экрана («мёртвый экран» при серии быстрых тапов по карточке). Пока открыта/открывается одна модалка — вторую не пускаем.» → `modalWedgeGuardRef`.
- `(tabs)/settings.tsx:344-362` — второй обходной путь: вместо themedAlert (который идёт через арбитр) внутри `saveName` используется системный `Alert.alert`, потому что RN-Modal поверх RN-Modal вешает экран.
- `streak_stats.tsx` держит **пять** параллельных модальных состояний (`modalOpen :1099`, `wagerNeedShards :1107`, `wagerConfirm :1108`, `freezeConfirmVisible`, `wagerOpen`) без единого координатора, плюс `useEffect :1152-1156`, который вручную следит, чтобы все три не были открыты одновременно.

Три разных самодельных «арбитра» в трёх экранах при наличии готового общего — это не стилистика, это долг, который уже выстрелил багами (комментарии в коде это фиксируют).

---

## 9. Что уже сделано хорошо (эталоны, от которых считать норму)

1. **`LeagueResultModal.tsx`** — единственная модалка в `app/` с полным циклом: единый драйвер `intro` вместо цепочки из семи `Animated.sequence` (`:206-220`), параллельный вход (`:264-287`), два фоновых лупа (свечение своей строки `:289-298`, блик кнопки `:300-306`), дифференцированная хаптика по исходу (`:239-241`), корректный выход `exitProgress` 150мс с `closingRef`-защитой от двойного тапа (`:322-346`), reduce-motion (`:343`), `statusBarTranslucent`, backdrop, зависящий от светлости темы (`:547`).
2. **`flashcards/DeckPickerSheet.tsx`** — правильный паттерн жизненного цикла: `mounted` живёт дольше `visible` (`:222`), анимация входа стартует ПОСЛЕ монтирования (`:280-291` с объяснением почему), выход через `withTiming` + `runOnJS(unmount)` (`:243-247`), отдельные `backdropStyle`/`sheetStyle`, ветка `reduceMotion || web || isLowPowerEffective()` (`:227`).
3. **`flashcards/ListeningModePicker.tsx`** — эталон дропдауна: `measureInWindow`-якорь со страховочным таймаутом 80мс (`:207-214`), автоматический выбор направления раскрытия `openUp` (`:247`), клампинг по краям экрана (`:249-251`), синхронный поворот шеврона, `accessibilityState={{expanded}}`.
4. **`constants/motion.ts`** — токены с указанием ИСТОЧНИКА (Telegram-iOS `NavigationController.swift:187`, `BottomSheet.java`) и объяснением, почему `press: {tension:620, friction:22}` отличается от `micro` (`:49-59`). Такой уровень обоснования редко встречается; проблема только в том, что модалки `app/` этими токенами не пользуются.
5. **`constants/flashcards_motion.ts`** — цельная моторная система одного раздела (пружины, тайминги, стагер, пороги свайпа с пометкой «перепломбировано после теста на iPhone» `:37-43`).

**Ключевой вывод:** разрыв не между «есть анимации / нет анимаций», а между **разделом «Карточки» (`app/flashcards/*`), который живёт по Reanimated-системе с токенами, и остальными 150 экранами, которые живут на нативном `animationType="fade"`.** Внутри одного приложения сосуществуют две несовместимые школы движения, и пользователь переключается между ними при каждом переходе из карточек в статистику/турниры/настройки.

---

## 10. Приоритеты

**P0 — рубит впечатление на самых дорогих экранах**
1. `learning-v2/session/[id].tsx:1631` — церемония: добавить `exiting` (сейчас 420мс вход / 0мс выход), хаптику и звук.
2. `_layout.tsx:3253` — `pack_opening` с `animation:'none'`: открытие пака без перехода.
3. §6.2 `streak_stats.tsx:1157-1180` — телепорт панели при свайпе (воспроизводимый визуальный глитч).
4. §6.1 — backdrop, едущий вместе со шитом, в 5 местах.
5. `manage_subscription.tsx:426` — шит отмены подписки: ноль анимации, backdrop без тапа, Back уводит с экрана.

**P1 — системные**
6. Ввести токен затемнения в `constants/` и заменить 12 хардкод-значений; сделать его зависимым от светлости темы (образец — `LeagueResultModal.tsx:547`).
7. Перевести 22 модалки с `animationType="fade"` на `MotionModal` (или его расширение) — это одновременно закрывает выход, reduce-motion и `statusBarTranslucent`.
8. Добавить `statusBarTranslucent` на 20 модалок, где его нет.
9. Провести экранные `<Modal>` через `OverlayArbiter` и убрать три самодельных обходных пути (`friends.tsx:2195`, `settings.tsx:344-362`, `streak_stats.tsx:1152-1156`).
10. `FlashcardsFilterDropdown.tsx` — переписать по образцу `ListeningModePicker` (якорь + пружина + хаптика).

**P2 — отделка**
11. Тап-закрытие backdrop'а на 11 поверхностях (§6.7).
12. Хаптика на 15 поверхностях, где её нет (§6.8); звук на празднующих модалках.
13. Свести 4 реализации XP-тоста в одну.
14. Grabber ↔ жест: либо добавить свайп там, где есть grabber (5 мест), либо grabber там, где есть свайп (`ThemedConfirmModal`, 16 хостов).
15. `(tabs)/home.tsx:925/930` — перевести tooltip на `useNativeDriver: true`.
16. Нормировать шкалу `zIndex` (сейчас от 1 до 99999 без системы).
