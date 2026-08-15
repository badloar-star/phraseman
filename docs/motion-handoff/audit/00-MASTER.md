# 00 — МАСТЕР-АУДИТ ДВИЖЕНИЯ · phraseman v1.5.53

Кодовая база: `/root/pm2` — `app/` (158 `.tsx`, 140 885 строк), `components/` (311 `.tsx`), `constants/`, `hooks/`.
Всего проанализировано 1463 файла `.ts/.tsx`. Дата: 2026-08-14.
Источники: `01-modals-components.md` (641 стр.), `02-modals-screens.md` (341), `03-toasts.md` (875), `04-screens.md` (585), `05-motion-tech.md` (928), `06-gold-and-levelup.md` (599).
Папок `docs/` и `ux-audit/` в контейнере нет (проверено всеми шестью агентами) — сверка с прошлыми аудитами возможна только по комментариям в коде (`components/GlobalShardsEarnedHost.tsx:15` ссылается на `docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md`).

**Тезис аудита.** Графика приложения дорогая и внутренне непротиворечивая: 12 тем, `GOLD_GRADIENTS` с тремя стопами, `goldShadow()`, кольцевые прогрессы, фактурные подложки, «жидкое стекло» из градиентов. Движение — нет. Оно либо **выключено compile-time флагом**, либо **вырезано с оставленным каркасом**, либо **сконцентрировано на трёх островах** (Турниры, Арена-матч, Learning V2 session, плюс `ResultsSequence`) при мёртвом остатке. Разрыв не в том, что «анимаций мало» — их 112 сайтов `entering=`, 292 `useSharedValue`, 324 `Animated.Value`. Разрыв в том, что **у 3/4 поверхностей нет выхода, нет реакции на палец, нет звука и хаптики на кульминации, и нет ни одного анимированного перехода между состояниями**.

---

## 1. РЕЗЮМЕ ДЛЯ ВЛАДЕЛЬЦА — 12 ГЛАВНЫХ ВЫВОДОВ

**1. Половина приложения не имеет собственной анимации панели, а выхода нет почти нигде.**
27 из 66 модалок в `components/` анимируются только нативным RN `fade` (`ThemedChoiceModal.tsx:43` — базовый алерт всего приложения, на нём висит вся модерация через `ThemedBlockingAlertHost.tsx:19`, и он рисует золотые бевели `GoldBevel intensity="strong"` при нулевом движении). Анимированный **выход** есть у 10 из 66; 8 поверхностей исчезают мгновенным кадром (`animationType="none"` + нет exit): `LeagueChestOpenModal.tsx:391`, `LevelSpinRewardModal.tsx:104`, `RewardCardV2.tsx:337`, `PlayerProfileModal.tsx:2457`, `LeagueBonusAvailableModal.tsx:70`, `LeagueChestTeaserModal.tsx:128`, `dev/DevHubSheet.tsx:570`, и `arena/ArenaModeSheet.tsx`, где выход **написан** (`:135`), но недостижим — `<Modal visible>` снимается родителем в тот же кадр. В `app/` перепись `animationType`: 20×`fade`, 5×`none`, 3×`slide`.

**2. Канонический анимированный модал проекта не используется в экранах ни разу.**
`components/MotionModal.tsx` даёт полный цикл (open 280 / close 180, `translateY 18`, `scaleFrom 0.985`, reduce-motion через `getModalMotionPlan`, защита от гонок через `modal_motion_state`). `grep MotionModal app/` → пусто. Его знают два файла в `components/`. Причина неиспользования видна в коде: `MotionModal.tsx:71` — `panel: {flex:1}`, шелл не даёт ни радиуса, ни тени, ни центрирования, поэтому каждый потребитель строит геометрию заново.

**3. Токена затемнения не существует — 13 разных хардкодов чёрного в 45 файлах.**
От `0.26` (`StatsPremiumBlur.tsx:268`) до `0.76` (`StreakReviveModal.tsx:387`, единственный не-чёрный `rgba(2,4,10,0.76)`). В `app/` — ещё 12 своих значений. Ни `theme.ts`, ни `goldTheme.ts` токена не содержат. При 12 темах светлые (`LIGHT_OCEAN`, `LIGHT_SAKURA`, `BUSINESS_LIGHT`, `SAGE_PORCELAIN`, `CANDY_BLUE`) получают тот же чёрный дым. Единственное исключение во всём проекте — `LeagueResultModal.tsx:547` (`onLight ? 'rgba(23,32,29,0.55)' : 'rgba(0,0,0,0.86)'`). Backdrop анимируется у 14 из 66.

**4. Фон приложения статичен по флагу: 837 строк анимации мертвы.**
`ScreenGradient.tsx:22` — `SCREEN_GRADIENT_MOTION_ENABLED = false` глушит шесть подсистем: дрейф орбов (`:154-201`), `GoldFabricFlow` из 4 параллельных лупов (`:256-372`), кино-частицы (`:489-493`), `CinemaBloom`, кроссфейд слоёв (`:670-676`), параллакс `entranceOffsetY` (`:756-757`). `backgroundTransition.tsx:9` — `FABRIC_BACKGROUND_TRANSITIONS_ENABLED = false`: смена темы мгновенная (на экране `settings_themes.tsx`, чья единственная задача — продать визуал, 423 строки и **0 анимаций**). `AppArtBackdrop.tsx:52` — `void name;`: 14 именованных подложек и полный роутинг-реестр рисуют один скрим, 68 экранов фоново идентичны.

**5. Переход между экранами — 140 мс кроссфейд; направления не существует.**
`_layout.tsx:3116-3127` выбирает `fade` 140 мс, потому что `ENABLE_SCREEN_TRANSITIONS` требует `EXPO_PUBLIC_SCREEN_TRANSITIONS=1` (`config.ts:160`), а флаг не задан ни в `.env`, ни в `app.json`, ни в `package.json`. Ветка `slide_from_right` 220 мс недостижима, `gestureEnabled:false` глобально (`:3152`), `bottomModalAnimationOptions` объявлен и не передан ни одному экрану. Push и pop выглядят одинаково — возврат не читается как «назад». Открытие пака — самая праздничная механика — идёт с `animation:'none', animationDuration:0` (`_layout.tsx:3253`). ~20 маршрутов вообще без `<Stack.Screen>`, включая `season_pass` (1024 стр., монетизация) и `max_call_session` (живой звонок, 1092 стр., ещё и без `freezeOnBlur:false` — накрывающая модалка заморозит рантайм звонка).

**6. Анимированного перехода «загрузка → контент» нет НИГДЕ.**
Все 12 экранов со `SkeletonBlock` и 18 с `ActivityIndicator` — тернарный hard-swap или ранний `return`. `entering=` в 25 файлах из 158, `exiting=` — **в двух** (`tournament_round.tsx:1433`, `streak_stats.tsx:2969`). `RefreshControl` — в двух. Сам `SkeletonShimmer.tsx` сделан отлично (Reanimated, гард по focus + AppState) — проблема в том, что он исчезает щелчком. 8 экранов Арены грузятся в **пустоту** (`ArenaExpansionUI.tsx:201-202`, `if (copy.silent) return null`), `flashcards_listening_session.tsx:562` показывает многоточие на весь экран, `streak_stats.tsx:1215` — `if (loading) return null`. Плюс два ложных empty-state, которые успевают мигнуть: `friends.tsx:1366` (`loading` объявлен и **не читается в рендере**) и `achievements_screen.tsx:1351`.

**7. Кульминация прогрессии молчит: ни хаптики, ни звука, ни движения бейджа.**
`LevelUpThresholdModal.tsx` — 539 строк полноэкранного окна нового уровня, и во всём файле **ноль** haptic-вызовов; во всём `GlobalLevelUpHandler` (`_layout.tsx:770-1500`) — тоже ноль. `:220` — `<LevelBadge autoplay={false} />`: анимированная webp-медаль заморожена ровно в свой звёздный час. `:148` — `onRequestClose={() => {}}`, Android-back мёртв. Между окном уровня и сундуком — **пауза 180/260 мс голого нижнего экрана** (`_layout.tsx:1233-1243`). Сундук за уровень (`LevelGiftModal`, `LevelGiftDualModal`) **не имеет звука открытия**, при том что `BoonChestModal.tsx:133` вызывает `pm.reward.chest_open` при идентичной механике; кульминация раскрытия награды — `finalize()` (`:384-413`) — без звука, без success-хаптики, без частиц (`GiftOpenEffects.tsx:1-10` прямо декларирует «Никакого движения, никаких частиц»).

**8. Эталон существует и он превосходен — но он один, и половина его конфига мертва.**
`components/feedback/ResultsSequence.tsx` — градуированный отскок (герой 17-23 %, свита 6-9 %), ритм-сетка 0/500/940/1500/2500/3000, звук+хаптика на каждой вехе, счётчик на UI-треде через `AnimatedTextInput`+`useAnimatedProps`, зарезервированные слоты, скип за 120-160 мс, конечные детерминированные конфетти, полный reset+`cancelAnimation`. При этом `getResultsSequenceMotionPlan` возвращает `badgeDelayMs/starsDelayMs/xpDelayMs/ctaDelayMs` (`:131-139`), которые **нигде не читаются** — конфиг врёт о таймлайне. И весь послеурочный каскад на том же экране — недостижимый мёртвый код (`lesson_complete.tsx:1358` `legacyCompletionSurfacesEnabled = false` + безусловный `return` на `:1359`), при этом его таймеры и сетевые запросы исполняются, а невидимая модалка держит слот арбитра (`:762`) и морозит все тосты ниже.

**9. Тосты: 36 поверхностей, 19 с собственным жизненным циклом, общий токен читают две.**
`constants/themedToastChrome.ts` покрывает все 13 тем — его читают `ActionToast.tsx:314` и `InGameToast.tsx:43`. Разброс: показ 900…10 000 мс (×11), вход 180…520, выход 0 (щелчок)…480, `zIndex` 20…999 999, радиус — 7 значений, паддинг — 7, пружин — 5 наборов плюс 3 `Animated.spring()` вообще без параметров. Хаптика у 3 из 19, звук у 2, reduce-motion у 1, `accessibilityRole="alert"` у 2. Четыре критических бага: `MedalToast` игнорирует 12 из 13 тем (`lesson1.tsx:3865` не передаёт `themeMode` — 346 строк выверенных палитр не доходят до экрана, правка = одно слово); `InGameToast.tsx:42` — `void type;` (ошибка и успех идентичны) и не задан `pointerEvents` (плашка 3,5 с блокирует тапы); `ReportUserModal.tsx:103` эмитит тост из-под нативной модалки, где он физически невидим; `actionToast` предпоследний в приоритете арбитра при очереди на 2 элемента с выбросом **старейшего**.

**10. Производительность: движок собран грамотно, но четыре точки уезжают на JS-поток, а детектор слабого устройства мёртв.**
465 `useNativeDriver:true` против 14 `false` — редкая дисциплина; `expo-blur` не используется вовсе (правильно для Android-бюджетников); `androidGlow.ts` грамотно разбирает `elevation` vs `shadow*`; `ConfettiBurst` — эталон (кап 120, seed, автостоп). Но: XP-счётчик через `setInterval(…,16)`+`setState` поверх летящего конфетти (`DialogVictoryCelebration.tsx:303`, ~75 ре-рендеров за 1,2 с); 60 частиц с `Math.random()` **в теле рендера** (`review.tsx:539` — при любом ре-рендере родителя все 60 анимаций перезапускаются); таймер-бар диагностики гонит `width '0%'→'100%'` на JS-потоке 30 секунд на каждый вопрос (`diagnostic_test.tsx:1225`); весь скролл-хром табов идёт через JS `onScroll` + 2 `Animated.Value.addListener`, при готовом UI-поточном пути в `BouncyScrollView.tsx:294`. `isLowEndDevice` (`hooks/device_perf_tier.ts:23`) и `useDevForceLowEnd` — **0 импортов по всем 1463 файлам**, а единственная реальная эвристика `PixelRatio.get() < 2` (`ConfettiBurst.tsx:115`) на Snapdragon 4xx физически не срабатывает (720p при density 2.0-2.75) ⇒ бюджетники получают полные 120 частиц.

**11. Инфраструктура очередей написана, но до экранов не доходит — и это уже выстрелило багами.**
`OverlayArbiter` описывает 33 ключа и прямо документирует проблему iOS present-over-present (`overlay_arbiter_core.ts:38-43`), но `useOverlayVisible` вызывается только в `_layout.tsx` и `(tabs)/home.tsx`. Остальные 26 экранных `<Modal>` идут мимо, и три экрана завели свои обходные пути с комментариями об уже случившихся багах: `friends.tsx:2193` («мёртвый экран» → `modalWedgeGuardRef`), `settings.tsx:344` (системный `Alert.alert` вместо themedAlert, потому что «Сохранить ничего не делает»), `streak_stats.tsx:1152` (ручной координатор пяти модальных состояний).

**12. Токены движения существуют, но живут своей жизнью: три параллельные шкалы длительностей и один идентификатор на две несовместимые системы пружин.**
9 из 17 токенов `MOTION_DURATION` мертвы (`navPush`, `modalSnap`, `modalDismiss`, `blurFade`, `scrollAdapt`, `bottomSheetOpen`, `bottomSheetClose`, `iconCross`, `actionMode`), причём `bottomSheetOpen/Close` созданы ровно под шторки — а шесть шторок дублируют 380/240 копипастой. Параллельно живут `modal_motion_plan.ts` (280/180) и голые литералы в 40+ файлах. `MOTION_SPRING` в `EnergyBar.tsx:3`, `ActionToast.tsx:9`, `AchievementToast.tsx:22` — это алиас `MOTION_SPRING_LEGACY` (tension/friction), а в `PopUpActionButton.tsx:12` — настоящий reanimated-токен (damping/stiffness/mass). Один идентификатор, две несовместимые шкалы — ровно то, о чём предупреждает комментарий `constants/motion.ts:20-22`. Не менее 14 уникальных spring-конфигов мимо токенов; `HOME_ENTRANCE` из 9 констант используется одной.

---

## 2. СКВОЗНОЙ РЕЕСТР ПОВЕРХНОСТЕЙ

**Итого 339 поверхностей:** `M` — 145 модальных/оверлейных (87 в `components/` + 28 нативных `<Modal>` в `app/` + 9 inline-оверлеев + 3 инстанса турнирного Sheet + 18 route-модалок), `T` — 36 транзиентных, `S` — 158 экранов.
Тосты, физически лежащие в `components/`, вынесены в блок `T` и не дублируются в `M`.

Легенда: **ВХ** — вход (`spr`=spring, `tim`=timing, `RN`=только нативный fade/slide, `—`=нет). **ВЫХ** — выход (`✔`=анимирован, `RN`=нативный, `✂`=мгновенный обрыв кадра, `—`=нет). **BD** — альфа затемнения (`anim`=анимируется, `grad`=градиентная подложка). **H/S** — хаптика/звук. **RM** — reduce-motion.

### 2.1 M-блок · Инфраструктура и шеллы (M-001…M-006)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | BD | H/S | RM | Ключевой дефект |
|---|---|---|---|---|---|---|---|---|
| M-001 | MotionModal (канон) | `components/MotionModal.tsx:43` | tim 280 out-cubic, ty18, sc.985 | ✔ tim 180 in-cubic | .42 anim | —/— | ✔ | 0 использований в `app/`; `panel:{flex:1}` (`:71`); `presented` в deps эффекта (`:40`) |
| M-002 | centered_dialog_shell | `components/centered_dialog_shell.tsx:100` | tim 180/200/260 bezier | ✔ tim 160 | .55 anim | tap/— | ✗ | вход sc .94, выход sc .96 (`:74` vs `:84`) — дёргается при re-open |
| M-003 | referral_sheet_shell | `components/referral_sheet_shell.tsx:143` | tim 200/220/380 | ✔ 200/180/240 | .55 anim+drag | tap/— | ✗ | прародитель 6 клонов; opacity 220 кончается на 160 мс раньше sheetY 380 |
| M-004 | RewardModalBackdrop (хром) | `components/RewardModalBackdrop.tsx:22-132` | статичные градиенты | — | grad | —/— | — | осознанный отказ от blur (`:64-69`) — не трогать |
| M-005 | OverlayArbiter | `components/OverlayArbiter.tsx:76-215` | gap 360 мс, watchdog 15 с | — | — | — | — | не доходит до 26 экранных `<Modal>` |
| M-006 | modal_motion_plan | `components/modal_motion_plan.ts:3-7` | 280/180/18/.985 | — | — | — | ✔ | третья параллельная шкала длительностей |

### 2.2 M-блок · Нижние шторки (M-007…M-023)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | BD | H/S | RM | Дефект |
|---|---|---|---|---|---|---|---|---|
| M-007 | ExplainSheet | `components/ExplainSheet.tsx:211` | 200/220/380 (клон) | ✔ 200/180/240 | .58 anim+drag | tap/— | ✗ | копипаста; нет стаггера контента |
| M-008 | AiConsentSheetModal | `components/AiConsentSheetModal.tsx:137` | клон | ✔ | .58 anim+drag | tap/— | ✗ | копипаста |
| M-009 | MistakeEli5Modal | `components/MistakeEli5Modal.tsx:180` | клон | ✔ | .58 anim+drag | tap/— | ✗ | копипаста |
| M-010 | AvatarEditorSheet | `components/customization/AvatarEditorSheet.tsx:118` | клон | ✔ | .58 anim+drag | **✗**/— | ✗ | единственная шторка **без hapticTap** (`:65`) |
| M-011 | RegistrationPromptModal | `components/RegistrationPromptModal.tsx:1264` | клон + cascade 640 | ✔ | .60·anim+drag | tap/— | ✗ | копипаста ×2 блока (`:331`, `:1201`) |
| M-012 | ArenaModeSheet | `components/arena/ArenaModeSheet.tsx:145` | spr{18,210,.9} + стаггер 45 мс | **✂ мёртвый код** | .62 anim | tap/— | ✔ | выход написан на `:135` и недостижим |
| M-013 | DevHubSheet | `components/dev/DevHubSheet.tsx:399` | tim 180 + spr{24,260} | ✔ 160/240 | .62 anim | tap/— | ✔ | дублирует драйвер level-up (`:291-306`) |
| M-014 | YoutubeChannelPickerSheet | `components/youtube/YoutubeChannelPickerSheet.tsx:22` | RN slide | RN | .56 | ✗/✗ | ✗ | нет анимации панели, нет хаптики |
| M-015 | tournament_ui Sheet | `components/tournament/tournament_ui.tsx:174` | RN slide | RN | .60 | Med/✗ | ✗ | **backdrop едет вместе со шитом**; grabber без жеста (`:250`) |
| M-016 | StatsLearningInsights | `components/StatsLearningInsights.tsx:20` | RN slide | RN | .58 | ✗/✗ | ✗ | вся модалка — **одна строка 5,5 КБ** инлайн-стилей |
| M-017 | ReportErrorButton (sheet) | `components/ReportErrorButton.tsx:279` | **—** | RN | .55 | ✗/✗ | ✗ | нет анимации панели |
| M-018 | ExplainReportButton | `components/ExplainReportButton.tsx:185` | **—** | RN | .55 | tap/✗ | ✗ | нет анимации панели |
| M-019 | ReviewPromptModal | `components/ReviewPromptModal.tsx:71` | **—** | RN | .62 | ✗/✗ | ✗ | нет анимации, нет хаптики |
| M-020 | DailyPhraseCard details | `components/DailyPhraseCard.tsx:651` | tim 220 bezier | ✔ tim 180 in | .58 anim | —/— | ✔ | — |
| M-021 | referral_code_sheet | `components/referral_code_sheet.tsx` → M-003 | насл. | насл. | насл. | tap/— | ✗ | — |
| M-022 | referral_how_sheet | `components/referral_how_sheet.tsx` → M-003 | насл. | насл. | насл. | ✗/— | ✗ | нет хаптики |
| M-023 | OnboardingWelcomeSheet | `components/OnboardingWelcomeSheet.tsx:56` → M-003 | насл. | насл. | насл. | tap/— | ✗ | — |

### 2.3 M-блок · Центрированные диалоги и алерты (M-024…M-038)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | BD | H/S | RM | Дефект |
|---|---|---|---|---|---|---|---|---|
| M-024 | **ThemedConfirmModal** (16 хостов) | `components/ThemedConfirmModal.tsx:117` | **—** (только drag) | RN | .60 | tap/— | ✗ | свайп есть (`:71-113`), **grabber'а нет**; spring `{16,180,.9}` мимо токенов |
| M-025 | **ThemedChoiceModal** (база алертов) | `components/ThemedChoiceModal.tsx:43` | **—** | RN | .60 | tap/— | ✗ | золотые бевели + `GOLD_GRADIENTS` при нулевом движении |
| M-026 | ThemedBlockingAlertHost | `components/ThemedBlockingAlertHost.tsx:19` | → M-025 | — | .60 | —/— | — | пустые пропсы при смене head → моргание (`:19-31`) |
| M-027 | CustomizationPurchaseConfirmModal | `components/customization/CustomizationPurchaseConfirmModal.tsx:10` | → M-024 | — | .60 | —/— | — | — |
| M-028 | NotificationPermissionModal | `components/NotificationPermissionModal.tsx:71` | **—** | RN | .72 | ✗/✗ | ✗ | нет анимации, нет хаптики |
| M-029 | DeleteAccountConfirmModal | `components/DeleteAccountConfirmModal.tsx:254` | **—** | RN | .70 | tap/✔ | ✗ | нет анимации на деструктивном действии |
| M-030 | NicknameEditModal | `components/account/NicknameEditModal.tsx:317` | **—** | RN | .70 | tap/— | ✗ | нет анимации |
| M-031 | AccountLogoutFlow | `components/account/AccountLogoutFlow.tsx:187` | **—** | RN | .75/.70 | tap/— | ✗ | два разных backdrop в одном флоу |
| M-032 | CertificateNameModal | `components/CertificateNameModal.tsx:55` | **—** | RN | .60 | tap/— | ✗ | нет анимации; вне арбитра |
| M-033 | ReportUserModal | `components/ReportUserModal.tsx:113` | **—** | RN | .53 | tap/succ/err | ✗ | **эмитит тост из-под своей же модалки** (`:103-108`) |
| M-034 | ReportPackModal | `components/ReportPackModal.tsx:142` | **—** | RN | .55 | tap/succ/err | ✗ | вне арбитра |
| M-035 | PersonalAdminMessageModal | `components/PersonalAdminMessageModal.tsx:34` | **—** | RN | .62 | tap/— | ✗ | нет анимации |
| M-036 | SeasonRewardInfoModal | `components/SeasonRewardInfoModal.tsx:85` | **—** | RN | .62 | tap/— | ✗ | нет анимации |
| M-037 | VipSurveyReviewPromptModal | `components/VipSurveyReviewPromptModal.tsx:60` | **—** | RN | .56 | tap/— | ✗ | нет анимации |
| M-038 | StudyLanguagePicker | `components/settings/StudyLanguagePicker.tsx:128` | — | — | — | tap/— | ✗ | inline, без движения |

### 2.4 M-блок · Награды, подарки, праздники (M-039…M-062)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | BD | H/S | RM | Дефект |
|---|---|---|---|---|---|---|---|---|
| M-039 | **LevelUpThresholdModal** | `components/LevelUpThresholdModal.tsx:142` | драйвер извне: spr fr8 + glow tim 900; каскад .30/.36/.38 | **opacity 220/300, без ty/glow** | grad, фон **вне** анимируемого узла | **✗/✗** | ✔ | ноль хаптики; `onRequestClose={()=>{}}`; `LevelBadge autoplay={false}` |
| M-040 | LevelGiftModal | `components/LevelGiftModal.tsx:576` | spr{115,12} + 4 бесконечных лупа | **✗** | .52 | tap+succ/**✗** | ✗ | нет звука сундука; кульминация без частиц/хаптики |
| M-041 | LevelGiftDualModal | `components/LevelGiftDualModal.tsx:799` | spr{110,12}, reveal 420, shine 1500 | **✗** | .48/.78 hc | tap+succ/**✗** | ✗ | мёртвый тернарник `false ? … : …` (`:770`) |
| M-042 | LevelSpinRewardModal | `components/LevelSpinRewardModal.tsx:104` | spr{118,12}+icon spr{170,8} d100+glow 1250 | **✂** | grad | tap+succ/✔ | ✗ | обрыв кадра |
| M-043 | BoonChestModal | `components/BoonChestModal.tsx:230` | spr{115,12}, shake 34/34/30/24, lid 360 | **✗** | .60 | tap+succ/✔ | ✗ | нет выхода |
| M-044 | BoonActivatedModal | `components/BoonActivatedModal.tsx:145` | spr{120,12}+icon spr{150,9} d90 | **✗** | .60 | succ+tap/**✗** | ✗ | нет звука |
| M-045 | WeeklyBoonDetailModal | `components/WeeklyBoonDetailModal.tsx:95` | spr{120,12} + float 1600 | **✗** | .72 anim | tap/✗ | ✗ | `useModalBackdropFade` с `useNativeDriver:false` |
| M-046 | CollectibleDropModal | `components/CollectibleDropModal.tsx:72` | **—** | RN | grad | succ/✔ | ✗ | **звук и хаптика играют под статичную картинку** |
| M-047 | SeasonGiftModal | `components/SeasonGiftModal.tsx:358` | slide-loop 5200 (фон) | **✗** | .62 | tap/**✗** | ✗ | нет звука, нет выхода |
| M-048 | LeagueChestOpenModal | `components/LeagueChestOpenModal.tsx:391` | spr{7,110}+tim 220, crown 1000, shine 2600 | **✂** | ? | tap+succ/**✗** | ✗ | джекпот заканчивается обрывом кадра |
| M-049 | LeagueBonusAvailableModal | `components/LeagueBonusAvailableModal.tsx:70` | spr(ui)+tim 220, glow 1700 | **✂** | ? | tap/✗ | ✗ | обрыв |
| M-050 | LeagueChestTeaserModal | `components/league/LeagueChestTeaserModal.tsx:128` | tim 240 + sc .86→1; **FadeInDown.delay(160+i·80)** | **✂** | .72 anim | tap/✗ | ✔ | единственный Reanimated-стаггер — и он пропадает |
| M-051 | RewardCardV2 | `components/reward_v2/RewardCardV2.tsx:337` | spr(ui)×2 + tim 240, halo 1400 | **✂** | токен | ✗/✗ | ✗ | универсальная карточка наград без хаптики |
| M-052 | roulette_win_modal | `components/roulette_win_modal.tsx:98` | spr{13,160} + tim 220 | **✗** | .72 | ✗/✗ | ✔ | ни хаптики, ни звука на выигрыше |
| M-053 | roulette_win_celebration | `components/roulette_win_celebration.tsx:141` | tim 1500 + стаггер (i%6)·40 | авто | — | ✗/✗ | ✔ | 24 частицы на legacy Animated |
| M-054 | referral_friend_reward_modal | `components/referral_friend_reward_modal.tsx:59` | spr{14,170} + tim 200 | **✗** | .68 | ✗/✗ | ✗ | награда без отклика |
| M-055 | **PremiumCelebrationModal** | `components/PremiumCelebrationModal.tsx:344` | hero 520 back(1.4); стаггер **170 мс/строка** от 450; ring 6000 | **✗** | grad 4-стоп | tap+succ/✔ | ✔ | лучшая хореография проекта; нет выхода |
| M-056 | VipCelebrationModal | `components/VipCelebrationModal.tsx:11` → M-055 | — | — | — | — | — | — |
| M-057 | **VipCelebrationModal 2.tsx** | `components/VipCelebrationModal 2.tsx:4` | — | — | — | — | — | **файл-дубликат с пробелом в имени — мусор** |
| M-058 | IntroFullAccessModal | `components/IntroFullAccessModal.tsx:151` | **—** | RN | .72 + grad | ✗/✗ | ✗ | весь премиальный хром при нулевом движении |
| M-059 | ReferralWelcomeHost modal | `components/ReferralWelcomeHost.tsx:152` | spr{7,80} + tim 180 | **✗** | .60 | ✗/✗ | ✗ | нет выхода |
| M-060 | TournamentWelcomeModal | `components/tournament/TournamentWelcomeModal.tsx:111` | tim 220 + seq(1.03→spr{14,220}) | **✗** | ? | ✗/✗ | ✔ | нет выхода |
| M-061 | DialogVictoryCelebration | `components/DialogVictoryCelebration.tsx:402` | BD 350; hero spr{9,150,.7}; ring 1100 | **✗** | `#070b10` hc | succ+med/✗ | част. | **XP-счётчик на `setInterval(…,16)`** (`:303`) |
| M-062 | SpinRewardPlaque | `components/SpinRewardPlaque.tsx:11-14` | delay 280→enter 320→hold 1100→exit 650 | авто | — | —/✔ | ✔ | внутри M-039 самоуничтожается на 2350 мс, оставляя дыру 76 px |

### 2.5 M-блок · Полноэкранные (M-063…M-068)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | BD | H/S | RM | Дефект |
|---|---|---|---|---|---|---|---|---|
| M-063 | ActivityHeatmap365 | `components/ActivityHeatmap365.tsx:417` | RN slide fullScreen | RN | opaque | ✗/✗ | ✗ | 3 кнопки навигации без хаптики |
| M-064 | ExamResultPreviewAdminModal | `components/ExamResultPreviewAdminModal.tsx:203` | RN slide fullScreen | RN | opaque | tap/✗ | ✗ | нет анимации |
| M-065 | PlayerProfileModal | `components/PlayerProfileModal.tsx:2457` | tim 300 out-cubic + fade 220 | **✂** | .55 | tap/✗ | ✔ | 2497 строк, вход есть, выход — обрыв (`:2448`) |
| M-066 | AppMessagesInbox | `components/AppMessagesInbox.tsx:1173` → M-001 | 280 | ✔ 180 | **.42+.56 = двойной** | tap/✗ | ✗ | единственный клиент MotionModal; двойное затемнение |
| M-067 | AppMessagesInbox конверт-полёт | `components/AppMessagesInbox.tsx:1143` | tim 720 in-cubic + spr | tim | — | ✗/✗ | ✗ | отдельный `<Modal>` для FX |
| M-068 | SpeakingPanel modal | `components/SpeakingPanel.tsx:2012` | **—** | RN | .55 | tap/succ/err | ✗ | нет анимации |

### 2.6 M-блок · Системные, блокирующие, dev (M-069…M-076)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | BD | H/S | RM | Дефект |
|---|---|---|---|---|---|---|---|---|
| M-069 | UpdateModal | `components/UpdateModal.tsx:277` | **—** | RN | grad wash | tap/✗ | ✗ | 4 темовые палитры + SVG-градиенты, ноль движения |
| M-070 | ReleaseNotesModal | `components/ReleaseNotesModal.tsx:252` | spr{74,9}+glow 1400+shine 3200 | **✗** | ? | tap/✗ | ✔ | сосед M-069 с несовместимой пластикой |
| M-071 | GlobalBroadcastModal | `components/GlobalBroadcastModal.tsx:98` | **—** | RN | .62 | tap+succ/✗ | ✗ | нет анимации |
| M-072 | NoEnergyModal (16 хостов) | `components/NoEnergyModal.tsx:387` | spr(ui)+bolt spr(micro) d120+shake+halo | **✗** | .72+radial | tap/✔ | ✗ | **единственный shared-модал, реально читающий `constants/motion.ts`** |
| M-073 | StreakReviveModal | `components/StreakReviveModal.tsx:257` | **—** | RN | `rgba(2,4,10,.76)` | tap+succ/✗ | ✗ | платное действие без движения |
| M-074 | VipSurveyModal | `components/VipSurveyModal.tsx:320` | **—** | RN | .58 | tap+succ/✗ | ✗ | 695 строк, переходы между шагами не анимированы |
| M-075 | **ForceUpdateGate** | `components/ForceUpdateGate.tsx:227` | **—** | **—** | `#0b0b12` hc | ✗/✗ | ✗ | **вне 12-темной системы**, мгновенный кадр |
| M-076 | **MaintenanceGate** (block+banner) | `components/MaintenanceGate.tsx:120, 164` | **—** / — | — / tim 180 | `#0b0b12`, `#7c2d12` hc | ✗/✗ | ✗ | **вне тем**, вход отсутствует |

### 2.7 M-блок · Невизуальные хосты-диспетчеры (M-077…M-087)

| ID | Хост | Файл:строка | Что делает |
|---|---|---|---|
| M-077 | GlobalShardsEarnedHost | `components/GlobalShardsEarnedHost.tsx:42-65` | `shards_earned` → тост; ключ арбитра `shardsEarned` остался мёртвым |
| M-078 | GlobalFriendGiftHost | `components/GlobalFriendGiftHost.tsx:45-86` | поллинг подарков 5 мин → тост `reward` |
| M-079 | BillingIssueToastHost | `components/BillingIssueToastHost.tsx:48` | RevenueCat billing issue → `warning`, кулдаун 3 дня |
| M-080 | StreakRiskToastHost | `components/StreakRiskToastHost.tsx:32-39` | риск серии ≥17:00 → `warning`, 1 раз в день |
| M-081 | BoonActivatedHost | `components/BoonActivatedHost.tsx:150` | → M-044, ключ `boonActivated` |
| M-082 | MysteryMondayHost | `components/MysteryMondayHost.tsx:188` | → M-043, ключ `mysteryMondayChest` |
| M-083 | PerfectWeekHost | `components/PerfectWeekHost.tsx:137` | → M-043, ключ `perfectWeekReward` |
| M-084 | ComebackBoonHost | `components/ComebackBoonHost.tsx:112` | → M-043, ключ `comebackDay` |
| M-085 | EntitlementExpiredHost | `components/EntitlementExpiredHost.tsx:301` | → M-051 с `backdropAction="ghost"` |
| M-086 | OnboardingWelcomeHost | `components/OnboardingWelcomeHost.tsx:60` | → M-023, ключ `onboardingWelcome` |
| M-087 | DevHubSheetGate + AiConsent-обёртки | `components/dev/DevHubSheetGate.tsx:15`, `AiDialogConsentModal.tsx`, `AiExplainConsentModal.tsx` | ленивый require / копирайтеры над M-008 |

### 2.8 M-блок · Нативные `<Modal>` прямо в `app/` (M-088…M-115)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | BD / тап | SBT | Дефект |
|---|---|---|---|---|---|---|---|
| M-088 | FriendQuestStartedModal | `app/(tabs)/friends.tsx:1274` | RN fade | RN | `rgba(9,8,12,.72)` / **нет** | нет | нет тап-закрытия |
| M-089 | FriendQuestCompletedModal | `app/(tabs)/friends.tsx:1310` | RN fade | RN | `rgba(9,8,12,.72)` / **нет** | нет | нет тап-закрытия |
| M-090 | Шит «Подарок другу» | `app/(tabs)/friends.tsx:3475` | RN **slide** | RN | `.58` / есть | нет | **backdrop едет со шитом** |
| M-091 | «Подарок получен» | `app/(tabs)/friends.tsx:3681` | RN fade | RN | `rgba(9,8,12,.72)` / **нет** | нет | нет тапа |
| M-092 | AddFriendModal → M-002 | `app/(tabs)/friends.tsx:1783` | Rea 180/200/260 | ✔ 160 | токен | да | — |
| M-093 | Energy Tooltip | `app/(tabs)/home.tsx:3235` | spr **useNativeDriver:false** (`:925`) | **✂** при тапе / fade 220 авто | прозрачный / есть | нет | JS-поток; асимметрия выхода |
| M-094 | Выбор титула | `app/(tabs)/home.tsx:3344` | RN fade | RN | `.62` / есть | нет | нет хаптики |
| M-095 | Аккаунт | `app/(tabs)/settings.tsx:1875` | RN fade | RN | `.70` / **нет** | нет | нет тапа, нет хаптики |
| M-096 | Подтв. смены аккаунта | `app/(tabs)/settings.tsx:1950` | RN fade | RN | `.70` / **нет** | нет | нет тапа |
| M-097 | Лоадер wipe | `app/(tabs)/settings.tsx:2194` | RN fade | RN | `.75` / нет (верно) | нет | — |
| M-098 | Смена имени | `app/(tabs)/settings.tsx:2223` | RN fade | RN | `.70` / есть | нет | нет хаптики |
| M-099 | **LeagueResultModal** | `app/LeagueResultModal.tsx:553` | **Animated.parallel spr+tim, единый драйвер** | **✔ exitProgress 150** | `.86` / `.55` light | **да** | эталон в `app/`; 11 градиентов + 4 лупа (перф) |
| M-100 | AchievementModal | `app/achievements_screen.tsx:1052` | RN fade | **✂** (нет `visible`) | `#00000088` / есть | нет | размонтаж родителем (`:1540`) |
| M-101 | CardDetailModal | `app/collectibles_screen.tsx:369` | RN fade | **✂** (`visible` = `true` хардкод) | `rgba(2,3,6,.92)` / **нет** | да | размонтаж родителем (`:751`) |
| M-102 | CardPackShardPaywallModal | `app/flashcards/CardPackShardPaywallModal.tsx:444` | **Rea: BD 320 + spr sheetY + CTA-пульс; 14 `entering=`** | ✔ 180-200 | токен / есть | да | самая анимированная поверхность проекта |
| M-103 | DeckPickerSheet | `app/flashcards/DeckPickerSheet.tsx:319` | **Rea spr{22,260,.9}** | ✔ 250 + runOnJS(unmount) | `.55` / есть | да | grabber без жеста (`:364`) |
| M-104 | ListeningModePicker | `app/flashcards/ListeningModePicker.tsx:302` | **Rea spr + measureInWindow-якорь** | ✔ 150 | `#000×progress·.55` | да | эталон дропдауна |
| M-105 | LessonMapSheet | `app/learning-v2/lesson/[id].tsx:549` | RN **fade** | RN | токен / есть | да | **bottom sheet, который не выезжает**; жест уже написан (`:519-546`) |
| M-106 | «Пройденные фразы» | `app/lesson1.tsx:1773` | RN fade | RN | `.60` / есть | нет | — |
| M-107 | ReviewModal (оценка) | `app/lesson_complete.tsx:246` | Animated fade 200 | **✂** (`none` + `onClose()`) | `.50` / есть | нет | асимметрия |
| M-108 | «Урок заблокирован» | `app/lesson_menu.tsx:1495` | RN fade | RN | `.50` / есть | нет | — |
| M-109 | Шит транскрипта | `app/max_call_session.tsx:1026` | RN **slide** | RN | `.45` / **нет** | нет | backdrop едет со шитом |
| M-110 | ReferralAccessEnded | `app/referral_access_ended_modal.tsx:134` | RN fade | RN | токен / **нет** | да | «модалка» без модальности |
| M-111 | Покупка пропуска | `app/season_pass.tsx:946` | RN fade | RN | `.62` / **нет** | нет | монетизация без движения |
| M-112 | TimeModal (часы/минуты) | `app/settings_notifications.tsx:98` | RN fade | **✂** (`if(!visible) return null` на `:96`) | `.55` / **нет** | нет | модал гасится до проигрыша fade |
| M-113 | Шит ставки (пари) | `app/streak_stats.tsx:1438` | RN **slide** + PanResponder | **конфликт** | `#00000088` / есть | нет | **телепорт панели** (`:1157-1180`) |
| M-114 | Заморозка цепочки | `app/streak_stats.tsx:3841` | RN fade | RN | `.60` / есть | нет | — |
| M-115 | Лист «Пари на серию» | `app/streak_stats.tsx:4129` | RN fade (геометрия — sheet) | RN | `.62` / есть | нет | grabber без жеста (`:4132`) |

### 2.9 M-блок · Inline-оверлеи без `<Modal>` в `app/` (M-116…M-124)

| ID | Поверхность | Файл:строка | ВХ | ВЫХ | Дефект |
|---|---|---|---|---|---|
| M-116 | **Шит отмены подписки** | `app/manage_subscription.tsx:426` | **—** | **—** | голый условный рендер; backdrop `.62` без тапа; **Android-Back уводит с экрана**; нет хаптики на submit (`:458`) |
| M-117 | AchievementNotifModal | `app/lesson_complete.tsx:481` | parallel(tim 300, spr fr6) | tim 200, **карточка не уезжает** | `friction:6` вне токенов; zIndex 999 дублируется; **мёртвая ветка** |
| M-118 | **Церемония завершения сессии** | `app/learning-v2/session/[id].tsx:1631` | `FadeInDown.duration(420).springify().damping(15)` | **`exiting` не задан → срез** | `#090D13F2` hc, тапа нет, хаптики нет, звука нет |
| M-119 | FlashcardsFilterDropdown | `app/flashcards/FlashcardsFilterDropdown.tsx:31` | **0 мс** | **0 мс** | телепорт; `top:56/right:16` хардкод вместо `measureInWindow`; backdrop прозрачный; хаптики нет |
| M-120 | XP-тост урока | `app/lesson1.tsx:1053` | tim 200 | 300 | смещение 4 px; нет zIndex |
| M-121 | XP-тост слов | `app/lesson_words.tsx:3091` | 420 | 480 | `top:100` без `insets`; `#FFC800` хардкод; zIndex 99999 |
| M-122 | XP-тост предлогов | `app/preposition_drill.tsx:804` | 420 | 480 | третья реализация |
| M-123 | XP-тост глаголов | `app/lesson_irregular_verbs.tsx:654` | 420 | 480 | четвёртая реализация; hold 1200 |
| M-124 | post-onboarding gold bridge | `app/_layout.tsx:3296` | opacity anim | opacity | замечаний нет |

### 2.10 M-блок · Инстансы турнирного Sheet (M-125…M-127)

| ID | Поверхность | Файл:строка | Дефект |
|---|---|---|---|
| M-125 | Банк турнира | `app/(tabs)/tournaments.tsx:1286` | нет хаптики (`openBank :321`), backdrop едет со шитом |
| M-126 | Недельный приз | `app/(tabs)/tournaments.tsx:1343` | нет хаптики (`:362`) |
| M-127 | Подтверждение входа (списание билета) | `app/(tabs)/tournaments.tsx:1358` | **списание билета без единого тактильного отклика** (`:704`) |

### 2.11 M-блок · Route-модалки (M-128…M-145 → 18 маршрутов)

| ID | Маршрут | Опции | Дефект |
|---|---|---|---|
| M-128 | `pack_opening` | `presentation:'modal', animation:'none', animationDuration:0` (`_layout.tsx:3253`) | **церемония открытия пака без единого кадра перехода** |
| M-129…M-142 | 14 «шторок разделов»: `referrals`, `promo_code_entry`, `privacy_screen`, `terms_screen`, `settings_edu`, `settings_language`, `settings_themes`, `settings_notifications`, `privacy_settings`, `account_details`, `top_helpers`, `ideas_submit`, `tournament_tickets`, `premium_modal`/`manage_subscription` | `modal + slide_from_bottom + gestureEnabled` (`section_sheet_navigation.ts:27-29`) | **единственные направленные переходы в приложении — и внутри них 0 анимаций** |
| M-143 | Пейволы вне онбординга | `modal + slide_from_bottom` (`paywall/paywallShared.tsx:99`) | внутри 7 файлов — 0 анимаций |
| M-144 | Пейволы на онбординге | `card + animation:'none'` (`paywallShared.tsx:95`) | без перехода; `ONBOARDING_DIM_ENTER/EXIT = 4000 мс` (`:120-122`) читается как зависание |
| M-145 | `lesson_theory_v2` | `presentation:'card'` (`_layout.tsx:3172`) | единственный явный `card` — и без движения |

### 2.12 T-блок · Транзиентные поверхности (T-01…T-36)

**Глобальные, смонтированы в `_layout.tsx`**

| ID | Поверхность | Файл:строка | Позиция | ВХ | Показ | ВЫХ | zIndex | H/S | RM | Дефект |
|---|---|---|---|---|---|---|---|---|---|---|
| T-01 | **ActionToast** (98 эмитов из 38 файлов) | `components/ActionToast.tsx:181-247` | низ, `useGlobalBottomOverlayOffset` | rAF→spr(250/22)+tim 240 | **3200** | ✔ 240/180 | 9997 | 5 веток / 5 событий | ✗ | голодание в арбитре (предпоследний, `overlay_arbiter_core.ts:78`); очередь max 2 с выбросом **старейшего** (`:269`); `pointerEvents:none` ⇒ действий нет; тон = цвет темы, а не события (в `dark` ошибка **зелёная**) |
| T-02 | AchievementToast | `components/AchievementToast.tsx:217-256` | низ | spr+fade+**scale .88** | 3800 | ✔ 320/240 | 9999 | succ / `pm.reward.achievement` | ✗ | **три разных выхода**: 240/180, 320/240, свайп 180; `transition={0}` у ExpoImage (`:429`) — арт щёлкает |
| T-03 | OfflineBanner | `components/OfflineBanner.tsx:50-99` | верх | **fade 220 без движения** | **10 000** | ✔ 180 + ty −80 | 9999 | ✗/✗ | ✗ | вход без движения, выход с движением; палитра целиком хардкод; потеря сети беззвучна |
| T-04 | PromoBanner | `components/PromoBanner.tsx:135-193` | верх, в потоке | **нет** | ∞ до `until` | tim 180 → X+420 | 20 | ✗/✗ | ✗ | входа нет; толкает весь стек; фон `#3b1d6e` во всех 13 темах |
| T-05 | ThemedBlockingAlertHost | `components/ThemedBlockingAlertHost.tsx` | → M-025 | — | до действия | — | — | —/— | — | единственная строгая FIFO-очередь, стоит выше всех тостов |

**Headless-эмитенты (рендерят `null`)**

| ID | Хост | Файл:строка | Тон | Кулдаун |
|---|---|---|---|---|
| T-06 | GlobalShardsEarnedHost | `components/GlobalShardsEarnedHost.tsx:46` | `reward` | дедуп внутри T-01 |
| T-07 | GlobalFriendGiftHost | `components/GlobalFriendGiftHost.tsx:75` | `reward` + `pm.social.gift_received` | 5 мин |
| T-08 | StreakRiskToastHost | `components/StreakRiskToastHost.tsx:45` | `warning` | 1/день |
| T-09 | BillingIssueToastHost | `components/BillingIssueToastHost.tsx:73` | `warning` | 3 дня |
| T-10 | EntitlementExpiredHost | `components/EntitlementExpiredHost.tsx:274` | `action_toast` + M-051 | — |

**Экранные тосты и снекбары**

| ID | Поверхность | Файл:строка | Позиция | ВХ | Показ | ВЫХ | H/S | Дефект |
|---|---|---|---|---|---|---|---|---|
| T-11 | **MedalToast** | `components/MedalToast.tsx` + драйвер `app/lesson1.tsx:3597` | низ, **`bottom:120` фикс** | spr friction 6 | **2200** | 350 | **✗/✗** | **игнорирует 12 из 13 тем** (`lesson1.tsx:3865` не передаёт `themeMode`); `useNativeDriver:false` на драге; `zIndex` не задан; мёртвый проп `isLightTheme` |
| T-12 | CoachToast | `components/CoachToast.tsx:96-115` | низ, **`bottom:24` фикс** | spr{80,10}+tim 250 | **8000** | 220/200 | только CTA / ✗ | 8 с на плашку с CTA, таймер не сбрасывается; `zIndex:100` уходит под T-01 |
| T-13 | InGameToast | `components/InGameToast.tsx:23-27` | **верх `top:60`** | tim 250 | 3000 | ✔ 250 | ✗/✗ | **`void type;`** (`:42`) — error = info; **`pointerEvents` не задан** → 3,5 с блокирует тапы |
| T-14 | BonusXPCard | `components/BonusXPCard.tsx:69-87` | **центр** | 3× spr{7,50}, sc .8 | 2000 | 200 (без сдвига) | `hapticMediumImpact` / ✗ (обещан в `:6, :89`) | `elevation:8` без `noAndroidOutline`; фон `#1a1a2e` |
| T-15 | RankChangeBanner | `components/RankChangeBanner.tsx:38-44` | **в потоке** | tim 280, ty −12 | 5000 | 240 | **✗/✗** | **обгон в лиге беззвучен**; 7 цветов хардкодом; крестик — текстовый символ без `onPress` |
| T-16 | **UndoDeleteSnackbar** | `app/flashcards/CollectionListView.tsx:681-750` | низ, своя формула | `FadeInDown(220)` | 5000 | **нет — щелчок** | на тап / ✗ | единственный снекбар с действием — исчезает мгновенно (`useCollectionData.ts:687`) |
| T-17 | «Верный перевод» | `app/flashcards_swipe.tsx:3213` | верх 54/70 | tim 180 | 3200 | 180 | ✗/✗ | лучшая a11y проекта (`:3217-3219`), но без отклика |
| T-18 | Подсказка свайпа | `app/flashcards_swipe.tsx:2877` | в потоке | 300 | **6000** | 220 | ✗/✗ | единственный потребитель `glassSurfaceFill` среди плашек |
| T-19 | Подсказка удаления | `app/flashcards/CollectionListView.tsx:521` | в потоке | 350 + **пульс ∞ 700/700** | 5000 | 250 | ✗/✗ | единственная плашка с бесконечным лупом; локализация 3 языка из 8 |
| T-20 | +XP урок | `app/lesson1.tsx:3051` | inline | 200 | 900 | 300 | ✗/✗ | `#F5A623` хардкод |
| T-21 | +XP слова | `app/lesson_words.tsx:2798` | `top:100` | 420 | 1000 | 480 | ✗/✗ | вторая реализация |
| T-22 | +XP предлоги | `app/preposition_drill.tsx:188` | низ | 420 | 1000 | 480 | ✗/✗ | третья |
| T-23 | +XP глаголы | `app/lesson_irregular_verbs.tsx:324` | `top:50` | 420 | 1200 | 480 | ✗/✗ | четвёртая; оборачивает `XpGainBadge` с `noInnerAnimation` |
| T-24 | XpGainBadge (внутр. анимация) | `components/XpGainBadge.tsx:35-48` в `exam:1348`, `lesson_help:613`, `review:1410`, `SessionResultScreen:139` | inline | 260 | — | 240 | ✗/✗ | **пятая** вариация того же «+N XP» |
| T-25 | **AccountDeletedNotice** | `components/AccountDeletedNotice.tsx:57-69` | верх | 260 `out(exp)` | 3000, **старт после входа** | ✔ 340 `out(exp)` | ✗/✗ | **единственная поверхность с reduce-motion и осознанной асимметрией** — эталон категории |
| T-26 | **FeedbackPlashka** ☠ | `components/feedback/FeedbackPlashka.tsx` | — | `withSpring{16,180,.9}` | — | `withTiming 200` | — | **0 импортов во всём репозитории** — единственная Reanimated-плашка мертва |

**Inline-плашки без анимации (появляются и исчезают сменой ветки JSX)**

| ID | Плашка | Файл:строка | Живёт | Дефект |
|---|---|---|---|---|
| T-27 | «Бонус за вход!» | `app/(tabs)/home.tsx:2217-2275` | до тапа «×» | единственный не-тост потребитель `themedToastChrome`; **без входа** |
| T-28 | «С возвращением!» | `app/(tabs)/home.tsx:2276` | до сброса флага | рамка `#FF9500+'88'` хардкод |
| T-29 | «Восстановить цепочку» | `app/(tabs)/home.tsx:2302` | — | хардкод |
| T-30 | «Не удалось загрузить» + «Обновить» | `app/(tabs)/home.tsx:3203-3232` | до загрузки | **единственная экранная offline-ветка во всём приложении** |
| T-31 | `friends.addFeedback` | `app/(tabs)/friends.tsx:2542` → `:1880`, `:3396`, `:3571` | 2500 мс | **один state, три визуала, три веса шрифта (600/700/800)** |
| T-32 | «Сохранено» | `app/settings_notifications.tsx:301` | 1400 мс | самая короткая нотификация проекта |
| T-33 | Плашка ошибки ИИ + «Повторить» | `app/ai_dialog_session.tsx:1986-2032` | до отправки | без движения |
| T-34 | Reconnect-баннер звонка | `app/max_call_session.tsx:885-903` | `phase==='reconnecting'` | без движения на живом звонке |
| T-35 | Дубликат карточки | `app/flashcards_card_editor.tsx:490-516` | пока есть дубль | живая рамка (исключение из правила проекта) |
| T-36 | «Скопировано» | `app/referrals.tsx:565`, `app/account_details.tsx:164` | 1600 / `COPY_FEEDBACK_MS` | два разных таймера на одну механику |

**Смежные постоянные (для полноты, движение оценивается по тем же правилам):** `SaveProgressBanner.tsx:198` — вход `tim 520 out-cubic` (самый долгий в проекте), **выхода нет**; `TodaysBoonStrip`, `GiftExpiryCountdown`, `LeagueRaceFeed` (`FadeInLeft.delay(120+i·120)`), `ArenaStarFlight`.

---

### 2.13 S-блок · Экраны (S-001…S-158)

Оценка 1-5: 5 — движение на уровне графики; 1 — мёртвый экран. «Вход»: `fade` = глобальный 140 мс, `sheet` = `slide_from_bottom`, `none` = без анимации.

**Корень и навигация**

| ID | Экран | Стр. | Вход | Внутр. | Состояния | Оц. | Дефект |
|---|---|---|---|---|---|---|---|
| S-001 | `app/_layout.tsx` | 3714 | — | 19 `Animated.*` | глобальный offline (`:3462`) | 3 | сплэш обрывается `return null` (`:506`) |
| S-002 | `app/(tabs)/_layout.tsx` | 1090 | — | 4 пружины (бегунок, press, collapse) | placeholder = плоский `<View>` (`:968`) | 3 | нет `reduceMotion`; скролл-хром на JS (`:540`) |
| S-003 | `app/TabSlider.tsx` | 201 | — | 7 `withTiming/Spring`, `reduceMotion` ✓ | — | **5** | длительность не масштабируется по \|Δindex\| |
| S-004 | `app/TabContext.tsx` | 60 | — | — | — | — | — |
| S-005 | `app/index.tsx` | 6 | `none` | — | `DeferredRedirect` = плоский `<View>` | 1 | первый кадр приложения — цветной прямоугольник |
| S-006 | `app/(tabs)/index.tsx` | 12 | `none` | — | то же | 1 | — |
| S-007 | `app/+not-found.tsx` | 6 | fade | — | то же | 1 | — |
| S-008 | `app/modal.tsx` | 33 | fade | — | — | 1 | **шаблон Expo не удалён («This is a modal») — мусор в проде** |
| S-009 | `app/+native-intent.tsx` | 123 | — | — | — | — | — |
| S-010…S-015 | ре-экспорты: `(tabs)/journal`, `lessons_list`, `league_screen`, `(tabs)/flashcards`, `lesson_verbs`, `learning-v2/course` | 2-19 | — | — | — | — | — |

**Табы**

| ID | Экран | Стр. | Вход | Внутр. | Состояния | Оц. | Дефект |
|---|---|---|---|---|---|---|---|
| S-016 | `(tabs)/home.tsx` | 3462 | `none` | 26 `Animated.*`, 4 аккордеона | error-баннер (T-30); **loading нет, empty нет** | 3 | **каскад входа вырезан, каркас остался** (`:959-966`); `fadeAnim` анимируется в никуда (`:957, 969`) |
| S-017 | `(tabs)/lessons.tsx` | 3357 | fade | **1** `withTiming` (аккордеон 320) | нет | 2 | 3357 строк на одну анимацию |
| S-018 | `(tabs)/friends.tsx` | 3940 | `none` | 10 `withTiming`, 4 `FadeInDown` по 40 мс | `loading`/`refreshing` **не читаются** (`:1366-1367`) | 2 | **ложный empty мигает**; `RefreshControl` отсутствует |
| S-019 | `(tabs)/settings.tsx` | 2341 | `none` | **0** | 1 `ActivityIndicator` | 1 | **самый большой полностью мёртвый экран** |
| S-020 | `(tabs)/tournaments.tsx` | 1738 | `none` | 4 `withTiming` + 3 `FadeIn`, `reduceMotion` ✓ | empty ✓, error ✓ | 3 | каскад на 3 блока из ~10 |

**Уроки (классический трек)**

| ID | Экран | Стр. | Вход | Внутр. | Состояния | Оц. | Дефект |
|---|---|---|---|---|---|---|---|
| S-021 | `lesson1.tsx` | 3888 | fade | 23 `Animated.*`, `reduceMotion` ✓ | `LessonFirstFrame` ×3 | 4 | скелетон→контент hard-swap |
| S-022 | `lesson_words.tsx` | 3790 | fade | 7 | error ✓ | 3 | нет entrance |
| S-023 | `lesson_irregular_verbs.tsx` | 1292 | fade | 7 | empty ✓ | 3 | `useNativeDriver:false` на scrollX (`:929`) |
| S-024 | `lesson_menu.tsx` | 1672 | fade | **0** | empty ✓, error ✓ | 1 | ноль движения на узловом экране флоу |
| S-025 | `lesson_complete.tsx` | 1806 | fade | 12 | empty ✓ | 4 | **весь послеурочный каскад — мёртвый код** (`:1358`) |
| S-026 | `lesson_help.tsx` | 634 | fade | 3 | нет | 2 | — |
| S-027 | `lesson_help_theory_ui.tsx` | 311 | fade | **0** | нет | 1 | `useNativeDriver:false` (`:207`) |
| S-028 | `lesson_help_theory_data.tsx` | 19523 | — | 0 | — | — | данные в `.tsx` |
| S-029 | `lesson_intro_screens.tsx` | 1051 | fade (**нет `Stack.Screen`**) | **26** | нет | 4 | не зарегистрирован; 2 лупа без гардов |
| S-030 | `lesson_intro_rich.tsx` | 621 | fade | **0** | нет | 1 | «богатое» только по названию |
| S-031 | `lesson_theory_v2.tsx` | 263 | `card` + fade | **0** | нет | 1 | — |
| S-032 | `hint.tsx` | 1582 | fade | **0** | нет | 1 | 1582 строки, ноль движения |
| S-033 | `preposition_drill.tsx` | 860 | fade | 7 | нет | 3 | — |
| S-034 | `review.tsx` | 1966 | fade | **64** `withTiming/Spring` + 8 | скелетон (`:1233`) | 4 | **60 частиц + `Math.random()` в рендере** (`:539`) |

**Learning V2**

| ID | Экран | Стр. | Вход | Внутр. | Состояния | Оц. | Дефект |
|---|---|---|---|---|---|---|---|
| S-035 | `learning-v2/lesson/[id].tsx` | 1512 | fade (**нет `Stack.Screen`**) | 14 + `entering`, `reduceMotion` ✓ | **нет loading/empty/error** | 4 | M-105 внутри |
| S-036 | `learning-v2/session/[id].tsx` | 2342 | fade (**нет `Stack.Screen`**) | 18 + **8 `entering=`** | нет loading/empty | **5** | самый живой экран — и он вне стека; M-118 без `exiting` |
| S-037 | `learning_v2_session_intro.tsx` | 982 | fade | 7 + 1 `entering` | нет | 4 | — |
| S-038 | `learning_v2_session_intro_check.tsx` | 323 | fade | 11 + 3 `entering`, `ReduceMotion.System` ✓ | нет | **5** | — |
| S-039 | `learning_v2_direct_session_player_v1.tsx` | 1384 | fade | 7 | `ActivityIndicator` | 3 | голый спиннер |

**Экзамены и тесты**

| ID | Экран | Стр. | Вход | Внутр. | Состояния | Оц. | Дефект |
|---|---|---|---|---|---|---|---|
| S-040 | `exam.tsx` | 1840 | fade, `freezeOnBlur:false` | 1 | error ✓ | 2 | экзамен ощущается как бланк |
| S-041 | `level_exam.tsx` | 1855 | fade | **0** | error ✓ | 1 | 1855 строк, ноль анимаций |
| S-042 | `diagnostic_test.tsx` | 2012 | fade | 1 + **9 `SkeletonBlock`** | скелетон/empty/error ✓ | 3 | **таймер-бар `width%` на JS-потоке 30 с/вопрос** (`:1225`) |
| S-043 | `survey_screen.tsx` | 450 | fade | 2 | `ActivityIndicator`, error ✓ | 2 | — |

**Тренажёр**

| ID | Экран | Стр. | Вход | Внутр. | Состояния | Оц. | Дефект |
|---|---|---|---|---|---|---|---|
| S-044 | `trainer.tsx` | 744 | fade | **0** | empty/error/offline ✓, скелетон | 2 | хорошие состояния, нулевое движение |
| S-045 | `trainer_words_session.tsx` | 778 | fade | 2 | empty/error ✓ | 2 | — |
| S-046 | `trainer_phrases_session.tsx` | 1094 | fade | 7+5+2 `entering` | error ✓ | 4 | — |
| S-047 | `trainer_session_report.tsx` | 378 | fade (**нет `Stack.Screen`**) | 4 `FadeInDown` delay 400-820 | empty ✓ | 4 | каскад стартует после того, как экран щёлкнул |
| S-048 | `problem_coach.tsx` | 790 | fade | **0** | **нет ни одного** | 1 | полностью мёртвый |

**Карточки**

| ID | Экран | Стр. | Вход | Внутр. | Состояния | Оц. | Дефект |
|---|---|---|---|---|---|---|---|
| S-049 | `flashcards_collection.tsx` | 854 | fade | 0 (в подкомпонентах) | `if(loading) return`, empty/error ✓ | 3 | — |
| S-050 | `flashcards_packs.tsx` | 581 | fade | 1 | **нет loading/empty/error** | 1 | сетевой каталог без состояний |
| S-051 | `flashcards_my_packs.tsx` | 477 | fade | **0** | empty-текст | 1 | — |
| S-052 | `flashcards_audio.tsx` | 1441 | fade | 2 | текст «Загрузка…» (`:867`) | 2 | текстовый лоадер |
| S-053 | `flashcards_swipe.tsx` | 3963 | fade | 11, `reduceMotion` ✓ | loading/empty/error ✓ | 4 | **главный жест на `PanResponder`** (`:2401`) — JS-поток |
| S-054 | `flashcards_blitz_session.tsx` | 834 | fade | **17**, `reduceMotion` ✓ | `if(loading) return` | 4 | hard-swap |
| S-055 | `flashcards_listening_session.tsx` | 1019 | fade | **0** | **`if(loading) return <Text>…</Text>`** | 1 | самое бедное состояние загрузки в проекте |
| S-056 | `flashcards_card_editor.tsx` | 685 | fade | **0** | `ActivityIndicator`, empty/error ✓ | 1 | — |
| S-057 | `flashcards_voice_picker.tsx` | 457 | fade | **0** | `ActivityIndicator` | 1 | — |
| S-058 | `community_pack_create.tsx` | 1460 | fade | 1 аккордеон — **не работает на Android** | error ✓ | 2 | — |
| S-059 | `pack_opening.tsx` | 858 | **`modal + animation:'none'`** | 14 + 4 `SkeletonBlock` | скелетон/error ✓ | 3 | **церемония без перехода** |
| S-060 | `flashcards_market_dev.tsx` | 393 | fade | **0** | error ✓ | — | dev |
| S-061…S-076 | подкомпоненты `app/flashcards/*`: `PhraseCard` (12), `ListeningEqualizer` (16), `FlashcardsTabBar` (12+4), `DeckPickerSheet` (13), `CollectionDeckView` (11), `CardPackShardPaywallModal` (**14 `entering=` + 17 `withTiming`**), `FlashcardsCategoryHub` (6), `CollectionListView` (14+2), `FlashcardListItem` (8+5) — живые; `FlashcardsCategoryBar`, `FlashcardsCategoryTiles`, `FlashcardsFilterDropdown`, `WordStrengthDots`, `FlashcardDetailsBody`, `SessionResultScreen`, `CollectionHeader` — **мёртвые** | | | | | | `SessionResultScreen` (227) — экран результата сессии **без празднования** |

**Арена (единственная секция с конечным автоматом состояний — и loading в нём молчит)**

| ID | Экран | Стр. | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|
| S-077 | `arena.tsx` | 289 | **0** | 2 | хаб раздела без движения |
| S-078 | `arena_match.tsx` | 675 | **4 `entering`**, `SlideInRight`, `reduceMotion` ✓ | **5** | — |
| S-079 | `arena_matchmaking.tsx` | 313 | **0** | 1 | **голый `<ActivityIndicator size="large">`** (`:252`) |
| S-080 | `arena_results.tsx` | 311 | **0** (`reduceMotion` импортирован, движения нет) | 1 | **экран победы без празднования** |
| S-081 | `arena_ranks.tsx` | 337 | 6 + 3 `entering` (delay i·45) | 4 | — |
| S-082 | `arena_history.tsx` | 186 | 2 `entering` | 4 | нет `Stack.Screen` |
| S-083 | `arena_tops.tsx` | 197 | 2 `entering` | 4 | нет `Stack.Screen` |
| S-084 | `arena_review.tsx` | 209 | 2 `entering` | 4 | нет `Stack.Screen` |
| S-085 | `arena_today.tsx` | 208 | 1 `SlideInRight` | 3 | пустой loading |
| S-086…S-092 | `arena_rivalries` (87), `arena_mastery_map` (87), `arena_partner` (156), `arena_star_wallet` (176), `arena_match_lab` (146), `arena_ghost_duel` (121), `arena_season_pass` (122) | **0** | 2 | **`if (copy.silent) return null`** (`ArenaExpansionUI.tsx:202`) — загрузка в пустоту |
| S-093 | `arena_friend_duel.tsx` | 148 | **0** | 2 | — |
| S-094 | `arena_invite.tsx` | 98 | **0** | 2 | — |

**Турниры — лучшая секция по движению**

| ID | Экран | Стр. | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|
| S-095 | `tournament_round.tsx` | 2355 | 13 + **7 `entering`** + **`exiting`** (`:1433`), `reduceMotion` ✓ | **5** | вход в экран — плоский fade |
| S-096 | `tournament_results.tsx` | 1030 | 13 + 2 `entering` | 4 | — |
| S-097 | `tournament_lobby.tsx` | 928 | 8 + `ZoomIn.springify()` | 4 | — |
| S-098 | `tournament_table.tsx` | 506 | 4 + `FadeIn.delay(320)` | 3 | — |
| S-099 | `tournament_review.tsx` | 600 | 1 `entering` | 2 | — |
| S-100 | `tournament_season.tsx` | 389 | 1 `entering` | 3 | — |
| S-101 | `tournament_tickets.tsx` | 206 | `ZoomIn.delay(i·70)` | 4 | **sheet** |

**Лига, клуб, социальное**

| ID | Экран | Стр. | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|
| S-102 | `club_screen.tsx` | 1820 | 5 | 3 | `LeagueHubSkeleton` → hard-swap |
| S-103 | `LeagueResultModal.tsx` | 1473 | **22**, `reduceMotion` ✓ | 4 | эталон в `app/`; 11 градиентов (перф) |
| S-104 | `top_helpers.tsx` | 448 | **0** | 2 | **sheet**; 5 `SkeletonBlock` без перехода |
| S-105 | `referrals.tsx` | 915 | 1 `entering` | 4 | **лучший набор состояний в проекте** (`RefreshControl` `:657`) |
| S-106 | `WeeklyReviewCard.tsx` | 335 | **0** | 2 | — |

**Экономика и награды**

| ID | Экран | Стр. | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|
| S-107 | `shards_shop.tsx` | 2200 | 14 | 3 | покупка без празднования |
| S-108 | `coin_exchange.tsx` | 390 | **0** | 1 | транзакция без обратной связи |
| S-109 | `season_pass.tsx` | 1024 | **0** | 1 | **нет `Stack.Screen`**; монетизация с нулевым движением |
| S-110 | `level_gifts_inventory.tsx` | 777 | 7, `reduceMotion` ✓ | 3 | — |
| S-111 | `level_reward_spin.tsx` | 271 | **0** в файле | 2 | честный motion-план в `level_reward_spin_motion.ts` — и туда никто не ведёт |
| S-112 | `collectibles_screen.tsx` | 759 | 2 `LayoutAnimation` **без Fabric-гарда** (`:623`) | 3 | до 44 бесконечных циклов на экран (`CollectibleArtFrame`) |
| S-113 | `achievements_screen.tsx` | 1550 | **0** | 1 | **ложный empty** (`:1351`, `:1501`) + витрина наград без движения |
| S-114 | `avatar_select.tsx` | 952 | **0** | 1 | чистая витрина без единого перехода |

**Монетизация**

| ID | Экран | Стр. | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|
| S-115…S-121 | `paywall_a…g` | 280-395 ×7 | **0 в каждом** | 2 | **цена подменяется с «…» на сумму щелчком** (`PaywallPlanCards.tsx:157`) |
| S-122 | `premium_modal.tsx` | 116 | **0** | 2 | **sheet** |
| S-123 | `premium_modal_v2.tsx` | 44 | **0** | 1 | экран-спиннер; нет `Stack.Screen` |
| S-124 | `manage_subscription.tsx` | 518 | **0** | 2 | M-116 внутри |
| S-125 | `promo_code_entry.tsx` | 339 | **0** | 1 | успешный промокод без празднования |
| S-126 | `referral_access_ended_modal.tsx` | 311 | **0** | 1 | модалка без модальности |

**AI и голос**

| ID | Экран | Стр. | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|
| S-127 | `ai_dialog_session.tsx` | 2885 | **1** | 2 | нет `Stack.Screen`; диалог без движения |
| S-128 | `ai_dialog_home.tsx` | 95 | **0** | 1 | нет состояний |
| S-129 | `ai_dialog_briefing.tsx` | 132 | **0** | 1 | нет состояний |
| S-130 | `ai_dialog_consent_gate.tsx` | 111 | **0** | 1 | — |
| S-131 | `ai_companion_session.tsx` | 532 | **0** | 1 | нет состояний |
| S-132 | `max_call_prestart.tsx` | 417 | **0** | 1 | ожидание звонка без движения |
| S-133 | `max_call_session.tsx` | 1092 | **0** | 2 | **нет `Stack.Screen`, нет `freezeOnBlur:false`** — рантайм звонка можно заморозить |
| S-134 | `max_call_halo.tsx` | 185 | 10 `withTiming/withRepeat`, `reduceMotion` ✓ | **5** | — |
| S-135 | `max_voice_review.tsx` | 613 | **0** | 1 | — |
| S-136 | `voice_equalizer.tsx` | 269 | 6, императивный `setSample` | 4 | — |

**Настройки и «шторки разделов» — 0 анимаций на секцию**

| ID | Экран | Стр. | Вход | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|---|
| S-137 | `settings_themes.tsx` | 423 | **sheet** | **0** | 1 | **экран, продающий визуал, меняет тему мгновенной подменой палитры** |
| S-138 | `settings_language.tsx` | 83 | sheet | **0** | 1 | весь текст перерисовывается без перехода |
| S-139 | `settings_notifications.tsx` | 395 | sheet | **0** | 1 | M-112 внутри |
| S-140 | `settings_edu.tsx` | 331 | sheet | **0** | 1 | — |
| S-141 | `privacy_settings.tsx` | 229 | sheet | **0** | 1 | — |
| S-142 | `privacy_screen.tsx` | 79 | sheet | **0** | 1 | — |
| S-143 | `terms_screen.tsx` | 79 | sheet | **0** | 1 | — |
| S-144 | `account_details.tsx` | 399 | sheet | **0** | 1 | — |
| S-145 | `ideas_submit.tsx` | 217 | sheet | **0** | 1 | отправка без подтверждающего движения |
| S-146 | `language_welcome.tsx` | 600 | fade | 11 | 4 | единственный анимированный экран секции; 2 лупа без гардов |

**Статистика и видео**

| ID | Экран | Стр. | Внутр. | Оц. | Дефект |
|---|---|---|---|---|---|
| S-147 | `streak_stats.tsx` | 4875 | **12 `entering` + 1 `exiting`** + 10 + 3 | 4 | `if(loading) return null` (`:1215`); M-113 телепорт; 5 модальных состояний без координатора |
| S-148 | `phrase_analytics_screen.tsx` | 973 | **0** | 2 | 7 `SkeletonBlock` — идеальные состояния, ноль движения |
| S-149 | `lingman_videos.tsx` | 347 | **0** | 2 | `RefreshControl` ×3 — эталон состояний / антиэталон движения |
| S-150 | `lingman_playlist.tsx` | 124 | **0** | 2 | — |

**Dev и служебные**

| ID | Экран | Стр. | Комментарий |
|---|---|---|---|
| S-151…S-155 | `_pos_analytics_audit` (196), `pos_analytics_audit` (14), `product_analytics_runtime_observer` (101), `_store_release_dev_module_stub` (4), `flashcards_market_dev` (393) | — | вне продового флоу |
| S-156…S-158 | остаток `.tsx` в `app/` (учтён в общем счёте 158 файлов; включает `learning_v2_direct_*`, `themed_blocking_alert_queue`-хосты и `.ts`-соседей маршрутов) | — | — |

**Сводка по S-блоку:** 90 из 158 файлов (57 %) не содержат ни одной анимации. `entering=` — 25 файлов, `exiting=` — **2**. `SkeletonBlock` — 12, `ActivityIndicator` — 18, `RefreshControl` — **2**. `reduceMotion` реально гейтит ~14 файлов. 68 экранов в `ScreenGradient` — все со статичным идентичным фоном. **Анимированных переходов loading→content — 0.**

---

## 3. MOTION DNA — ЗАКОН ПРОЕКТА

Законы 1-14 извлечены из эталона `components/feedback/ResultsSequence.tsx` + `results_sequence_motion_plan.ts` + `ConfettiBurst.tsx` + `feedback_kit.ts` — это не пожелания, а реально работающий на проде код, замеренный по строкам. Законы 15-18 добавлены по итогам сквозного аудита: они закрывают то, чего в эталоне нет, потому что эталон — не модалка.

**Закон 1. ГРАДУИРОВАННЫЙ ОТСКОК: герой пружинит, свита — нет.**
Медаль `damping 10 / stiffness 150 / mass 0.7` → ζ = 0.488 → перерегулирование **17,3 %**, период 492 мс, установка ≈560 мс. Звезда `11/170/1` → ζ = 0.422 → **23,2 %**. Всё остальное — 6-9 %: XP `14/200/0.6` → 7,4 %; финальная галка `12/180/0.55` → 9,3 %; CTA `14/130/1` → 8,7 %; пилюля награды `14/210/0.55` → 6,8 %.
**Правило: ровно один-два элемента кадра имеют право на отскок > 15 %; всем остальным — 6-9 %.**

**Закон 2. РИТМ-СЕТКА ВХОДА, ЗАМЕДЛЯЮЩАЯСЯ К КУЛЬМИНАЦИИ.**
0 / 500 / 940 / 1500 / ~2100 / 2500 / 3000 мс. Стаггер звёзд **неравномерный: 440 мс, затем 560 мс** — последняя веха получает на 27 % больше воздуха. Метроном запрещён.

**Закон 3. CTA НА 2500 МС, БЕЗУСЛОВНАЯ РАЗБЛОКИРОВКА НА 3000 МС.**
`ResultsSequence.tsx:122` (`T_CTA = 2500`, `CTA_HARD_UNLOCK = 3000`), `:450-453`. Ни одна поверхность не имеет права держать палец пользователя дольше трёх секунд.

**Закон 4. МЕЖДУ ДВУМЯ НАГРАДНЫМИ ЗВУКАМИ — МИНИМУМ 100 МС ТИШИНЫ.**
Следующий бит стартует не по круглому числу, а по формуле «конец предыдущего звука + `COMPLETION_SOUND_GAP_MS`» (`results_sequence_motion_plan.ts:4-7, 42-89`). Арбитр звука однослотовый; наложение наградных звуков запрещено.

**Закон 5. КАЖДАЯ ВЕХА = ЗВУК И ХАПТИКА ОДНОВРЕМЕННО.**
`fk.milestone()` всегда несёт `haptics.success()` (`feedback_kit.ts:116`), плюс отдельный success-импульс на T+40 мс при входе героя (`ResultsSequence.tsx:381`). **Поверхность без хаптики — поверхность вне DNA.**

**Закон 6. ЧИСЛА СЧИТАЮТСЯ НА UI-ТРЕДЕ.**
`Animated.createAnimatedComponent(TextInput)` + `useAnimatedProps` (`ResultsSequence.tsx:126, 139-142`). Никаких `setState` в тик счётчика — ни `setInterval`, ни `runOnJS(setDisplay)` покадрово.

**Закон 7. ШИРИНА ЧИСЛОВОГО СЛОТА ФИКСИРУЕТСЯ ДО СТАРТА.**
`xpWidth = max(84, len·32 + 20)` (`ResultsSequence.tsx:262`). Цифры не сдвигают соседей на переходах 9→10 и 99→100.

**Закон 8. ВЫСОТА БУДУЩИХ СЛОТОВ РЕЗЕРВИРУЕТСЯ ЗАРАНЕЕ.**
`rewardStackHeight` (`:260-261`), `finaleSlot {height:34}` (`:637`). Появление награды не двигает макет.

**Закон 9. ПРАЗДНОВАНИЕ — СОСТОЯНИЕ ЭКРАНА, А НЕ ОКНО ПОВЕРХ НЕГО.**
Фон — `ScreenGradient` самого маршрута, ноль бэкдропов (`lesson_complete.tsx:1362`). Если фон всё-таки нужен — он **обязан анимироваться вместе со сценой**, а не появляться отдельным кадром (прямое нарушение — `LevelUpThresholdModal.tsx:154-162` vs `:169`).

**Закон 10. ТАП В ЛЮБОЙ МОМЕНТ = СКИП ЗА 120-160 МС; ВТОРОЙ ТАП ВСЕГДА ЗАКРЫВАЕТ.**
`ResultsSequence.tsx:298-319`: контент `withTiming(1,120)`, CTA `160`, счётчики выставляются мгновенно, аудио-очередь глушится `fk.cancelResultsSequenceAudio()`. «Залипшего» празднования не существует.

**Закон 11. КОНФЕТТИ КОНЕЧНЫ И ДЕТЕРМИНИРОВАНЫ.**
≤120 частиц (`HARD_CAP`, `ConfettiBurst.tsx:27`), ровно 1200 мс, `Easing.out(cubic)`, фиксированный `seed = 11`, автостоп по общему таймеру (`:122-129`). **Никаких бесконечных циклов в наградном слое.**

**Закон 12. REDUCE MOTION — НЕ «БЫСТРЕЕ», А «СРАЗУ».**
`motion_plan.ts:119-129` + `ResultsSequence.tsx:349-374`: всё в финальном состоянии одним кадром, таймеры не заводятся, вехи молчат, `confettiCount: 0`.

**Закон 13. ПОЛНЫЙ СБРОС + `cancelAnimation` НА КАЖДЫЙ РЕМАУНТ И UNMOUNT.**
`ResultsSequence.tsx:321-343, 455-464`. Ни один shared value не переживает смену данных.

**Закон 14. ТИПОГРАФИЧЕСКАЯ ИЕРАРХИЯ КУЛЬМИНАЦИИ 50 / 28 / 22 / 18 / 15.**
Главное число 50/900 (`lineHeight 54`), заголовок 28/900, служебные знаки при числе 22 и 18, подпись 15/600 (`ResultsSequence.tsx:626-632`). **Награда всегда крупнее заголовка** — в 2,3 раза крупнее служебных знаков.

### Законы, добавленные аудитом (обязательны для модальных поверхностей)

**Закон 15. ВЫХОД ОБЯЗАТЕЛЕН И НЕ ДЛИННЕЕ ВХОДА.**
Эталон выхода — `MotionModal.tsx:29/34`: вход 280 `Easing.out(cubic)`, выход 180 `Easing.in(cubic)`, панель держится смонтированной до конца выхода (`modal_motion_state.ts`), `onClose` вызывается из колбэка. Второй ориентир — `AccountDeletedNotice.tsx:57-70`: быстрый вход 260, спокойный уход 340, и эта асимметрия **задокументирована**. Запрещено: `animationType="none"` без собственного exit; `onClose()` напрямую из `onPress`; снятие `<Modal visible>` родителем в тот же кадр (`ArenaModeSheet.tsx:135` vs `:145`); `if (!visible) return null` до проигрыша анимации (`settings_notifications.tsx:96`).

**Закон 16. ЗАТЕМНЕНИЕ — ТОКЕН, ЗАВИСЯЩИЙ ОТ СВЕТЛОСТИ ТЕМЫ, И ОНО АНИМИРУЕТСЯ ВМЕСТЕ С ПАНЕЛЬЮ.**
Единственный правильный образец в проекте — `LeagueResultModal.tsx:547` (`onLight ? 'rgba(23,32,29,0.55)' : 'rgba(0,0,0,0.86)'`). Backdrop всегда лежит **вне** узла, который едет: при `animationType="slide"` затемнение обязано гаснуть по opacity на месте (образец — `DeckPickerSheet.tsx:328-345`), иначе оно наползает снизу вместе со шитом (нарушения: M-015, M-090, M-109, M-113, M-125…M-127).

**Закон 17. ОДНА ОЧЕРЕДЬ, ОДИН ЗАЗОР, ОДИН ИСТОЧНИК ТАЙМИНГОВ.**
Все модальные поверхности проходят через `OverlayArbiter` (`useOverlayVisible`), зазор между нативными окнами — только `NATIVE_MODAL_HANDOFF_GAP_MS = 360` (`OverlayArbiter.tsx:58`), длительности — только из `constants/motion.ts`. Запрещено: локальные таймеры-дубли (`_layout.tsx:1239-1243` — 180/260 мс параллельно арбитрному 360), самодельные анти-клин-гарды (`friends.tsx:2195`, `settings.tsx:344`, `streak_stats.tsx:1152`), третьи шкалы длительностей.

**Закон 18. ТИР УСТРОЙСТВА — ЧАСТЬ КОНТРАКТА АНИМАЦИИ, НЕ РЕШЕНИЕ АВТОРА.**
Каждая поверхность с частицами, лупами или тенями обязана читать `useMotionTier(): 'full' | 'lite' | 'off'` (сегодня не существует; `isLowEndDevice` написан и имеет 0 импортов). Жест и скролл живут в worklet'ах (`TabSlider.tsx:97-168` — образец), числа — на UI-треде, `LayoutAnimation` — только под Fabric-гардом. Бесконечный луп без пары «reduce-motion + runtime-active» запрещён.

---

## 4. РАЗРЫВ МЕЖДУ ЭТАЛОНОМ И ОСТАЛЬНЫМ ПРИЛОЖЕНИЕМ

| Закон DNA | Эталон | Остальное приложение | Масштаб разрыва |
|---|---|---|---|
| 1. Градуированный отскок | 6 spring-конфигов, ζ посчитан | **≥14 уникальных spring-конфигов мимо токенов**; `Animated.spring({friction:8})` без `tension` (`_layout.tsx:888`) → дефолт 40, ~800 мс до покоя; 3 `Animated.spring()` вообще без параметров (`MedalToast.tsx:245,264`, `OfflineBanner.tsx:68`) | ~40 поверхностей |
| 2. Ритм-сетка со стаггером | 440→560 мс | **Стаггер контента есть у 4 поверхностей из 66**: M-039 (интерполяция glow .30/.36/.38), M-055 (170 мс/строка), M-012 (45 мс), M-050 (80 мс). Остальные 62 — панель приезжает, контент внутри статичный блок | 62 из 66 |
| 3. CTA ≤ 3 с | 2500/3000 | `CoachToast` держит 8000 мс без сброса таймера; `ONBOARDING_DIM_ENTER = 4000` (`paywallShared.tsx:120`); `OfflineBanner` 10 000 | 3 поверхности |
| 4. 100 мс тишины между звуками | формула по длительности звука | `pm.reward.level_up` (`_layout.tsx:1468`) и `pm.reward.small` (`SpinRewardPlaque.tsx:59`) стартуют **в один момент** | прямое нарушение |
| 5. Веха = звук + хаптика | всегда | **Звук есть у 14 файлов из 311**; хаптики нет у M-039 (весь level-up), T-11 (смена ранга), T-15 (обгон в лиге), M-052, M-054, M-058, M-063, M-075, M-076; звука нет у M-040, M-041, M-044, M-047, M-048, M-051; **ни одна модалка в `app/` не звучит** | ~25 поверхностей |
| 6. Числа на UI-треде | `AnimatedTextInput` | `setInterval(…,16)`+`setState` (`DialogVictoryCelebration.tsx:303`), `runOnJS(setDisplay)` покадрово (`StatCountUpText.tsx:59`, ×N строк в `streak_stats.tsx:892`), rAF+`setState` (`leagueStatusShared.ts:92`), посимвольный `setState` (`TypewriterText.tsx:50`) | 5 точек |
| 7-8. Резерв слотов | есть | `SpinRewardPlaque` внутри M-039 оставляет **пустую дыру 76 px** на 2350 мс; `streak_stats.tsx:1215` `return null` толкает вёрстку 4875-строчного экрана | 2 явных |
| 9. Празднование = состояние экрана | ноль бэкдропов | M-039 — непрозрачный фон **вне** анимируемого узла: экран подменяется за 1 кадр, потом пружинит содержимое; соседний кадр того же праздника (M-040) — карточка на затемнении 0.52 с `animationType="fade"`. **Два кадра одного праздника говорят на разных языках** | флагман |
| 10. Скип за 120-160 мс | двойной тап закрывает | Скипа нет **нигде** за пределами эталона; 11 поверхностей вообще не закрываются тапом по фону | 65 из 66 |
| 11. Конечные конфетти | кап 120, seed, автостоп | 60 частиц с `Math.random()` в рендере и 28 бесконечных `withRepeat(-1)` в конечном по смыслу эффекте (`review.tsx:539-567`); 22 частицы на legacy Animated с тенями (`AuroraBackground.tsx`); до 44 лупов на экране коллекционок | 4 точки |
| 12. Reduce Motion = «сразу» | полная ветка | **24 анимированные модалки без `useReduceMotion`**, включая ВСЕ бесконечные лупы наградного слоя; в тостах — 1 из 19; в `app/` — 4 из 28 модалок при готовом `modal_motion_plan.ts:4-6` | ~50 поверхностей |
| 13. Сброс + `cancelAnimation` | есть | 5 файлов с `withRepeat` без `cancelAnimation`; `TapScale.tsx:44` без `stopAnimation()` при **158 сайтах в 61 файле** | ~10 |
| 14. Типографика кульминации | 50/28/22/18/15 | 9 разных радиусов панелей, 6 световых моделей теней, 7 радиусов и 7 паддингов у тостов; половина тостов пишет кегли литералами и не масштабируется с системным размером текста | системно |

**Одной фразой:** эталон — это один экран (`lesson_complete` → `ResultsSequence`), и даже на нём половина конфига мертва, а весь послеурочный каскад отключён флагом. За его пределами живут ещё три острова (`tournament_round`, `arena_match`, `learning-v2/session`, плюс раздел `app/flashcards/*` со своей моторной системой `constants/flashcards_motion.ts`). Всё остальное — 150 экранов и ~55 модалок — на нативном `animationType="fade"` и глобальном 140-мс кроссфейде. **Внутри одного приложения сосуществуют две несовместимые школы движения, и пользователь переключается между ними при каждом переходе из карточек в статистику, турниры или настройки.**

---

## 5. ТЕХНИЧЕСКИЙ ДОЛГ ПО SEVERITY

### CRITICAL — ломает функциональность или рубит впечатление на самых дорогих поверхностях

| # | Дефект | Файл:строка | Фикс |
|---|---|---|---|
| C-1 | XP-счётчик `setInterval(…,16)` + `setState` → ~75 ре-рендеров поверх 26 конфетти, лучей, SVG-кольца и двух `withRepeat` | `components/DialogVictoryCelebration.tsx:299-314` | `useSharedValue`+`withTiming`+`useAnimatedProps` на `AnimatedTextInput` (готовый паттерн — `ResultsSequence.tsx:126`). ~1 ч |
| C-2 | 60 частиц + `Math.random()` **в теле рендера**: при любом ре-рендере родителя все 60 анимаций перезапускаются; 28 бесконечных `withRepeat(-1)` в конечном эффекте; ~300 shared values | `app/review.tsx:539, 549, 559` | `useMemo` + `seeded()` (скопировать `ConfettiBurst.tsx:31-34`), 60→24 частиц, `rotate` конечным. ~2 ч |
| C-3 | Таймер-бар `width '0%'→'100%'` + `backgroundColor` на JS-потоке, 30 с на каждый вопрос, с layout-pass каждый кадр | `app/diagnostic_test.tsx:1225, 1472, 1739` | полоса полной ширины + `scaleX` с `transformOrigin:'left'` (`useNativeDriver:true`), цвет — `interpolateColor` в `useAnimatedStyle`. ~2 ч |
| C-4 | 27 модалок без собственной анимации панели (только RN `fade`), включая базовый алерт всего приложения | `ThemedChoiceModal.tsx:43` + список §2.8 отчёта 01 | расширить `MotionModal` (радиус/тень/центрирование) и перевести на него. Закрывает разом вход, выход, reduce-motion, `statusBarTranslucent` |
| C-5 | Анимированный выход у 10 из 66; 8 поверхностей — мгновенный обрыв кадра | `LeagueChestOpenModal.tsx:391`, `LevelSpinRewardModal.tsx:104`, `RewardCardV2.tsx:337`, `PlayerProfileModal.tsx:2457`, `LeagueBonusAvailableModal.tsx:70`, `LeagueChestTeaserModal.tsx:128`, `ArenaModeSheet.tsx:145`, `DevHubSheet.tsx:570` | закон 15; для `ArenaModeSheet` — держать `visible` локально до конца exit |
| C-6 | `MedalToast` игнорирует 12 из 13 тем: 346 строк палитр не доходят до экрана | `components/MedalToast.tsx:273` ← `app/lesson1.tsx:3865-3874` | **передать `themeMode` — одно слово** |
| C-7 | `InGameToast` выбрасывает тип (`void type;`) и не задаёт `pointerEvents` → error = info + 3,5 с блокирует тапы поверх профиля | `components/InGameToast.tsx:42, 46` | вернуть тон, добавить `pointerEvents="none"` |
| C-8 | Тост эмитится из-под нативной модалки и физически невидим; только вибрация | `components/ReportUserModal.tsx:103-108` (+ M-032, M-034, M-065, M-024 — все с 0 `useOverlayVisible`) | закрывать модалку перед эмитом либо провести модалки через арбитр |
| C-9 | Весь послеурочный каскад — недостижимый мёртвый код, но его таймеры и сетевые запросы исполняются; невидимая модалка держит слот арбитра | `app/lesson_complete.tsx:1358-1437`, `:762`, `:1171-1193` | удалить мёртвую ветку целиком и снять `useOverlayVisible('lessonCompleteNotif')` |
| C-10 | M-039: фон вне анимируемого узла ⇒ экран подменяется за 1 кадр; выход гасит только `stage`, фон снимается скачком | `components/LevelUpThresholdModal.tsx:154-162` vs `:169`; `app/_layout.tsx:1230-1233` | внести фон в `Animated.View` с общей opacity |
| C-11 | Пауза 180-260 мс голого нижнего экрана между окном уровня и сундуком | `app/_layout.tsx:1233-1243` | один непрерывный переход в одной поверхности |

### HIGH — системная несогласованность, видна пользователю

| # | Дефект | Файл:строка | Фикс |
|---|---|---|---|
| H-1 | Токена затемнения нет: 13 хардкодов в `components/` + 12 в `app/`; при 12 темах светлые получают чёрный дым | 45 файлов; образец — `LeagueResultModal.tsx:547` | `MODAL_SCRIM(themeMode)` в `constants/`, замена во всех точках |
| H-2 | `animationType="slide"` двигает backdrop вместе со шитом | `tournament_ui.tsx:174` (×3), `friends.tsx:3475`, `max_call_session.tsx:1026`, `streak_stats.tsx:1438` | backdrop наружу, opacity отдельно (образец `DeckPickerSheet.tsx:328-345`) |
| H-3 | Телепорт панели при свайп-закрытии: уехало → дёрнулось наверх → уехало | `app/streak_stats.tsx:1157-1180` | не сбрасывать `wagerSheetY` синхронно с `setModalOpen(false)` |
| H-4 | Скролл-хром табов целиком на JS: 1 колбэк + 2 `setValue` + 2 JS-листенера на кадр, при готовом UI-поточном пути | `TopFadeScrollContext.tsx:48`, `TopFadeMask.tsx:53`, `(tabs)/_layout.tsx:540`, 4 таба | `useSharedValue` + `useAnimatedReaction`, табы передают `onScrollWorklet`. **Единственная правка, улучшающая ощущение всего приложения** |
| H-5 | Детектор слабого устройства мёртв; единственная эвристика на Snapdragon 4xx не срабатывает | `hooks/device_perf_tier.ts:23`, `ConfettiBurst.tsx:115` | критерий по физическому разрешению (`width*px ≤ 800`) или API<29; хук `useMotionTier()`; подключить к 5 точкам |
| H-6 | Главный жест обучения на `PanResponder` + `Animated.ValueXY` — карточка отстаёт от пальца при занятом JS | `app/flashcards_swipe.tsx:2401-2440` | `Gesture.Pan()` + shared values по шаблону `TabSlider.tsx:97-168` |
| H-7 | Анимация `shadowRadius`/`shadowOpacity` 60 раз/с в сетке; на Android считается впустую; до 44 лупов + 11 анимаций тени на экране | `components/CollectibleArtFrame.tsx:210-215`, `collectibles_screen.tsx:287` | слой-ореол с `opacity`+`scale`; кап на число «искрящихся» карточек |
| H-8 | 30 бесконечных циклов в 19 файлах без единого гарда; `useIsScreenFocused` возвращает `true` для всех четырёх табов; `react-freeze` не останавливает нативные анимации | §4.3 отчёта 05; `hooks/use_is_screen_focused.ts:17`; `(tabs)/_layout.tsx:130` | `runtimeOwnerId` в 17 компонентов + `reduceMotion`+`runtimeActive` в 19 файлов |
| H-9 | Шесть побайтовых клонов анимации нижней шторки; альфа backdrop уже разошлась | `referral_sheet_shell.tsx:74`, `ExplainSheet.tsx:100`, `AiConsentSheetModal.tsx:68`, `MistakeEli5Modal.tsx:72`, `AvatarEditorSheet.tsx:55`, `RegistrationPromptModal.tsx:331/1201` | один `BottomSheetShell` на `MOTION_DURATION.bottomSheetOpen/Close` |
| H-10 | 24 анимированные модалки без reduce-motion, включая все бесконечные лупы наградного слоя | список §1 отчёта 01 | `useReduceMotion` + ветка «сразу» |
| H-11 | Флагманские сундуки без звука открытия при готовом событии `pm.reward.chest_open` | `LevelGiftModal.tsx`, `LevelGiftDualModal.tsx` (0 вызовов `soundDirector`) | добавить звук + success-хаптику на `finalize()` |
| H-12 | Ноль хаптики во всём флоу повышения уровня | `app/_layout.tsx:770-1500`, `LevelUpThresholdModal.tsx` | `hapticSuccess()` в `onShow` синхронно со звуком + импульсы на строки наград |
| H-13 | `pack_opening` — модалка с `animation:'none'`; `ENABLE_SCREEN_TRANSITIONS` не задан ⇒ весь стек на 140-мс fade | `_layout.tsx:3253`, `config.ts:160` | включить флаг после проверки Fabric-крашей; `pack_opening` — `slide_from_bottom` |
| H-14 | Шит отмены подписки: ноль анимации, backdrop без тапа, Android-Back уводит с экрана, нет хаптики на submit | `app/manage_subscription.tsx:426, 458, 506` | перевести на `MotionModal`/шелл шторки |
| H-15 | `OverlayArbiter` не доходит до 26 экранных `<Modal>`; три самодельных обходных пути с багами в комментариях | `friends.tsx:2193`, `settings.tsx:344-362`, `streak_stats.tsx:1152-1156` | `useOverlayVisible` на всех экранных модалках, обходы удалить |
| H-16 | Ложный empty мигает на двух витринах; `loading`/`refreshing` объявлены и не читаются | `friends.tsx:1366-1367`, `achievements_screen.tsx:1351` | читать `loading` в рендере, добавить `RefreshControl` |
| H-17 | 8 экранов Арены грузятся в пустоту | `components/arena/ArenaExpansionUI.tsx:201-202` | скелетон вместо `return null` |
| H-18 | Голодание `ActionToast`: предпоследний приоритет + очередь на 2 с выбросом старейшего | `overlay_arbiter_core.ts:78`, `ActionToast.tsx:134, 269` | поднять приоритет транзиентных, увеличить очередь, дропать новейший дубликат |
| H-19 | `UndoDeleteSnackbar` — единственный снекбар с действием — исчезает щелчком | `CollectionListView.tsx:697`, `useCollectionData.ts:686` | `exiting={FadeOutDown.duration(180)}` |
| H-20 | Гейты `ForceUpdateGate` и `MaintenanceGate` вне 12-темной системы и появляются рывком | `ForceUpdateGate.tsx:227-236`, `MaintenanceGate.tsx:119-175` | цвета из темы + вход/выход + хаптика |

### MEDIUM — несогласованность токенов и мелкие дефекты

| # | Дефект | Файл:строка |
|---|---|---|
| M-1 | 9 из 17 токенов `MOTION_DURATION` мертвы; три параллельные шкалы длительностей | `constants/motion.ts:6-16`, `modal_motion_plan.ts:6`, 40+ файлов |
| M-2 | `MOTION_SPRING` — один идентификатор на две несовместимые шкалы | `EnergyBar.tsx:3`, `ActionToast.tsx:9`, `AchievementToast.tsx:22` vs `PopUpActionButton.tsx:12` |
| M-3 | `HOME_ENTRANCE` из 9 констант используется одной; каскад главной вырезан, каркас `Animated.View` остался; `fadeAnim` анимируется в никуда | `constants/motion.ts:90-100`, `(tabs)/home.tsx:957-979, 2732+` |
| M-4 | `LayoutAnimation` мёртв на Android Fabric; 3 из 4 файлов без гарда | `constants/layoutAnimation.ts:24`, `smooth_layout.ts:21`, `collectibles_screen.tsx:623`, `PaywallProofCards.tsx:490` |
| M-5 | 11 поверхностей без тап-закрытия backdrop при явном стандарте проекта | `ThemedConfirmModal.tsx:114-121` (стандарт) vs список §6.7 отчёта 02 |
| M-6 | `statusBarTranslucent` на 8 из 28 модалок в `app/` | список §2.8 |
| M-7 | Grabber без жеста (5 мест) и жест без grabber'а (`ThemedConfirmModal`, 16 хостов) | `tournament_ui.tsx:250`, `streak_stats.tsx:4132`, `DeckPickerSheet.tsx:364` |
| M-8 | Пять реализаций «+N XP» с разными таймингами, позициями и хардкод-цветом | T-20…T-24 |
| M-9 | `AchievementToast` — три разных выхода в одном файле | `:169-172`, `:251-254`, `:119-121` |
| M-10 | `themedToastChrome.border` считается для 13 тем и не рисуется никогда; поле `body` — 0 чтений | `constants/themedToastChrome.ts:134`, `ActionToast.tsx:377-407` |
| M-11 | Двойной backdrop 0.42+0.56 ≈ 0.74 | `MotionModal.tsx:70` + `AppMessagesInbox.tsx:1405` |
| M-12 | `useNativeDriver:false` там, где это чистая опечатка | `(tabs)/home.tsx:927, 931`, `lesson_irregular_verbs.tsx:929`, `lesson_help_theory_ui.tsx:207`, `useModalBackdropFade.ts:17` |
| M-13 | 66 индивидуальных `AppState.addEventListener` при готовом синглтоне; `use_reduce_motion` делает нативный вызов на каждый из 65 инстансов (в т.ч. на каждую кнопку) | `runtime_app_state_store.ts` (правильно) vs 66 файлов; `hooks/use_reduce_motion.ts:20-31` |
| M-14 | `presented` в deps эффекта `MotionModal` → микро-рывок на первом кадре открытия | `components/MotionModal.tsx:40` |
| M-15 | Шкала `zIndex` не нормирована: 1…999 999 | `CoachToast.tsx:281` (100) vs `InGameToast.tsx:66` (999 999) |
| M-16 | Аналитика по тостам выключена — нет данных о том, какие тосты пользователь видит | `app/events.ts:10` (`TRACK_INTERNAL_APP_EVENTS = false`) |
| M-17 | Локализация локальных плашек — 3 языка из 8 | `CollectionListView.tsx:537`, `flashcards_card_editor.tsx:509`, `coin_exchange.tsx:327` |

### LOW — мусор

`VipCelebrationModal 2.tsx` (файл-дубликат с пробелом в имени) · мёртвый тернарник `false ? … : …` (`LevelGiftDualModal.tsx:770`) · `SHARD_MODAL_FRAME_COLORS`/`SHARD_MODAL_ACCENT_GLOW` — 0 импортов · `StatsLearningInsights.tsx:20` — модалка в одну строку 5,5 КБ · `app/modal.tsx` — шаблон Expo в проде · `FeedbackPlashka` — 0 использований · `MedalToast.isLightTheme` — обязательный проп, не читается · ключ `shardsEarned` в арбитре после перевода модалки в тост · `bottomModalAnimationOptions` объявлен и не передан · `LessonLoadingSkeleton.tsx` — не импортируется · `APP_ART_BACKDROP_NAMES` + `APP_ART_ROUTE_BACKDROPS` — имя игнорируется · `rememberAppArtBackdrop()` — пустое тело · `expo-blur` в зависимостях при 0 импортов (~200 КБ APK) · асимметрия scale 0.94/0.96 (`centered_dialog_shell.tsx:74` vs `:84`) · три копии shake-таймлайна 9/−11/8/0.

---

## 6. ПРОИЗВОДИТЕЛЬНОСТЬ НА СЛАБЫХ УСТРОЙСТВАХ (Snapdragon 4xx / 4 ГБ)

**Что уже сделано правильно (не трогать):** 465 `useNativeDriver:true` против 14 `false` — 97 % дисциплины; `expo-blur` не используется вовсе, «стекло» имитируется полупрозрачными заливками (`glassSurfaceFill.ts`) — единственно верное решение, `BlurView` на Android стоит 8-15 мс/кадр; `constants/androidGlow.ts` корректно гасит `elevation` на прозрачном фоне (58 потребителей); `ConfettiBurst` — хардкап, детерминированный seed, автостоп, `cancelAnimation`; `TabSlider`/`BouncyScrollView` — жесты целиком в worklet'ах; `ArenaTimerRing.tsx:172-176` выносит цифры из компонента кольца; `runtime_app_state_store.ts` — синглтон-стор AppState; `ScreenGradient` заглушён флагом (иначе было бы 6 лупов на каждом из 82 экранов).

**Четыре точки, где движение уезжает на JS-поток:** C-1 (XP-счётчик), C-2 (сжигание карточки), C-3 (таймер диагностики), H-4 (скролл-хром табов). Плюс H-6 (главный жест обучения).

**Деградации по классу устройства не существует.** `isLowEndDevice` (`hooks/device_perf_tier.ts:23-27`) и `useDevForceLowEnd` (`dev_force_low_end.ts:33`) — **0 импортов по всем 1463 файлам**. Порог `LOW_END_ANDROID_API_LEVEL = 26` бесполезен: Snapdragon 429/460/680 идут с Android 11-13 (API 30-33). Единственная реальная эвристика `PixelRatio.get() < 2` (`ConfettiBurst.tsx:115`) защищает устройства до 2014 года: Redmi 9A, Galaxy A0x, realme C — это 720p при density 2.0-2.75, условие ложно ⇒ **они получают полные 120 частиц**.

**План: ввести `useMotionTier(): 'full' | 'lite' | 'off'`** на `useSyncExternalStore` поверх `reduceMotion || devForceLowEnd || isLowEndDevice`, критерий — `Platform.OS === 'android' && (width*PixelRatio ≤ 800 || Platform.Version < 29)`. Подключить к пяти точкам:

| Точка | `full` | `lite` |
|---|---|---|
| `results_sequence_motion_plan.ts:133` | 120 / 72 | **40 / 24** |
| `app/review.tsx:539-567` | 28+22+10 | **10+6+0** |
| `premium_celebration/AuroraBackground.tsx:44` | 22 частицы | **8** |
| `CollectibleArtFrame.tsx:244-252` (Sheen/Sparkle) | вкл | **выкл** |
| `ScreenGradient.tsx:22` | (сейчас `false`) | `false` — но осознанно, а не глобально |

Тумблер для DevHub уже написан (`setDevForceLowEnd`).

**Прочие точки нагрузки:** 22 тени на летящих частицах (`AuroraBackground.tsx:107-118` — на Android эффект вообще отсутствует, вычисления остаются); 5-стоповый `LinearGradient` внутри вращающейся вью под `overflow:'hidden'` ×11 карточек (`CollectibleArtFrame.tsx:100-105`); 11 градиентов + 4 лупа + анимируемый `elevation` в `LeagueResultModal.tsx:584`; `TapScale` без `stopAnimation()` при 158 сайтах в 61 файле; 66 прямых `AppState.addEventListener`; `use_reduce_motion` с нативным вызовом на каждый из 65 инстансов, включая каждую кнопку через `PressableScale.tsx:58`.

---

## 7. ДЫРЫ В СОСТОЯНИЯХ

**7.1 Переход между состояниями не анимирован нигде.** `entering=` — 25 файлов из 158, `exiting=` — 2. Все 12 экранов со `SkeletonBlock` и 18 с `ActivityIndicator` — тернарный hard-swap или ранний `return`: `review.tsx:1233`, `pack_opening.tsx:543`, `flashcards_blitz_session.tsx:538`, `streak_stats.tsx:1215` (`return null`), `phrase_analytics_screen.tsx:587-598`, `top_helpers.tsx:120-150`, `lingman_playlist.tsx:75`, `manage_subscription.tsx:355`.

**7.2 Загрузка «молчит» — пустой экран вместо состояния.** `ArenaExpansionUI.tsx:201-202` (8 экранов Арены), `flashcards_listening_session.tsx:562-569` (многоточие на весь экран), `flashcards_audio.tsx:867-871` (текст «Загрузка…»), `PaywallPlanCards.tsx:157` и `PaywallPlanTiles.tsx:168` (цена «…» → сумма щелчком на семи пейволах), `(tabs)/_layout.tsx:968-970` и `:116` (placeholder несмонтированного таба — плоский цветной прямоугольник), `DeferredRedirect.tsx:33` (первый кадр приложения).

**7.3 Состояние объявлено и не читается — ложный empty.** `friends.tsx:1366` (`loading` не читается в рендере; `emptyState` «Пока нет активности» успевает показаться), `friends.tsx:1367` (`refreshing` — pull-to-refresh не существует при полностью реализованном `load(force=true)`), `achievements_screen.tsx:1351` (`states = []` + 6× `AsyncStorage.multiGet` ⇒ «Пока нет полученных наград» мигает на витрине достижений), `streak_stats.tsx:1215`.

**7.4 16 асинхронных экранов без loading, empty и error одновременно:** `flashcards_packs` (581, каталог сообщества), `learning-v2/lesson/[id]` (1512), `learning-v2/session/[id]` (2342), `ai_companion_session` (532), `ai_dialog_home` (95), `ai_dialog_briefing` (132), `max_call_prestart` (417), `max_call_session` (1092, только offline-маркер), `problem_coach` (790), `hint` (1582), `lesson_intro_rich` (621), `lesson_theory_v2` (263), `level_reward_spin` (271), `flashcards/SessionResultScreen` (227), `flashcards/FlashcardDetailsBody` (241), `referral_access_ended_modal` (311).

**7.5 Offline на уровне экранов отсутствует.** `OfflineBanner` смонтирован один раз (`_layout.tsx:3462`). Ни один из 158 экранов не имеет собственной offline-ветки: при потере сети `arena_*`, `tournament_*`, `flashcards_packs`, `top_helpers`, `club_screen` уходят в `error`/`empty` и выглядят как «данных нет», а не «сети нет». Единственное исключение — T-30 (`home.tsx:3203-3230`).

**7.6 Disabled/locked без движения.** `gestureEnabled:false` глобально; заблокированные элементы меняют только цвет — ни shake, ни pulse, ни haptic-отказа. `MOTION_SPRING.shake` и `MOTION_DURATION.shake: 300` объявлены и **не используются ни разу**.

**7.7 Молчаливые провалы.** `showNext:950-954` при `displayStatus === 'unavailable'` не показывает **ничего** — ни окна, ни тоста, ни ретрая; сбой резервации подарка за уровень выглядит как «ничего не произошло».

---

## 8. LEVEL-UP: ТЕКУЩЕЕ СОСТОЯНИЕ И ЧТО МЕНЯТЬ

### 8.1 Что происходит сейчас, покадрово

| Фаза | t | Что | Файл:строка |
|---|---|---|---|
| 0 | — | `registerXP` детектит уровень, начисляет спин, пишет очередь, эмитит `level_up_pending`. **Ни одного визуального события**: XP-полоса, аватар и рамка переписываются молча | `xp_manager.ts:658-683`, `level_spin_level_up_queue.ts:60-83` |
| 1 | — | `flushQueue` → `showNext` делает **до четырёх сетевых round-trip'ов ДО показа окна**; при `unavailable` — тишина | `_layout.tsx:1007-1068, 864-977` |
| 2 | 0 | `<Modal animationType="none">` + **весь экран за 1 кадр заливается непрозрачным градиентом** (фон вне анимируемого узла) | `LevelUpThresholdModal.tsx:142-162` vs `:169` |
| 2 | 0 | `onShow` → звук `pm.reward.level_up`. **Хаптики ноль** | `_layout.tsx:1466-1472` |
| 2 | 0→650 | `stage` въезжает: `spring(friction:8)` без `tension` (~800 мс до покоя) | `_layout.tsx:969-976` |
| 2 | 0→900 | `glow` драйвит каскад: портал 0, milestone 0.36, награды **270 мс**, кнопка **342 мс** | `LevelUpThresholdModal.tsx:116-139` |
| 2 | 0 | `LevelBadge autoplay={false}` — анимированная webp заморожена; `centeredNumber` не передан, цифра уровня не рисуется | `:220`, `LevelBadge.tsx:98` |
| 2 | 900→∞ | **полная статика.** Ни пульса, ни shimmer, ни счётчика. «УРОВЕНЬ N» появляется готовым, «+100 XP» — статичная строка | `:232-234`, `_layout.tsx:1417` |
| 2 | 1700→2350 | плашка «+1 СПИН» **улетает и оставляет пустую дыру 76 px** | `SpinRewardPlaque.tsx:65-79`, `LevelUpThresholdModal.tsx:275-283` |
| 3 | 0→300 | выход: гаснет **только** `stage`; `translateY` и `glow` не откатываются; фон снимается скачком | `_layout.tsx:1230-1233` |
| 3 | +180/260 | **пауза голого нижнего экрана**, затем сундук | `_layout.tsx:1239-1243` |
| 4 | 0 | `LevelGiftModal` — `animationType="fade"`, карточка `radius 30` на затемнении 0.52. **Другой язык, чем фаза 2** | `LevelGiftModal.tsx:573-576` |
| 4 | ~482 | кульминация раскрытия: **нет звука, нет success-хаптики, нет частиц** (`GiftOpenEffects` — «статичное радиальное свечение, никакого движения») | `:384-413`, `GiftOpenEffects.tsx:1-10` |
| 5 | — | на уровне 5 free-юзер получает `premium_modal` немедленно после закрытия сундука | `_layout.tsx:1296-1311` |
| 5′ | — | спин-уровень — **тупик**: награда показана и потеряна; барабан с честным motion-планом лежит на отдельном push-маршруте, куда никто не ведёт | `_layout.tsx:1174-1221`, `level_reward_spin_motion.ts` |

**Дополнительно:** повышение уровня **перекрывает урок между ответами** — `TOURNAMENT_INTERRUPTION_PROTECTED_ROUTES` содержит только `/tournament_*` (`tournament_interruption_guard.ts:1-7`), а XP начисляется на каждый ответ (`lesson1.tsx:2993`). Серия уровней не нарастает: `queueMicrotask(showNext)` без паузы, уровень 7 выглядит ровно как уровень 6. `lessonResultsSequence` стоит **ниже** `levelUp` в приоритете — празднование урока приходит после празднования уровня, хотя причина у них одна.

### 8.2 Что менять — по уровням

**Уровень 1 — вернуть модальность.** Внести фон в анимируемый узел (`:154-162` → `Animated.View` с общей opacity); ввести бэкдроп-токен вместо непрозрачной заливки, `palette.background` перенести внутрь карточки (`stage`, `maxWidth:410` уже есть); `onRequestClose={()=>{}}` → `onContinue`; согласовать два кадра одного праздника (либо оба карточка на затемнении, либо оба full-bleed).

**Уровень 2 — убрать разрыв.** Схлопнуть fade 300 → снос фона → `runAfterInteractions` → таймер 180/260 в один непрерывный переход: одна `Modal`, морфинг содержимого уровень→сундук либо кросс-фейд без снятия фона. Единый механизм зазора — либо арбитрный 360, либо локальный, но не оба.

**Уровень 3 — вернуть кульминации движение и отклик.** `hapticSuccess()` в `onShow` синхронно со звуком + импульсы на строки наград (они уже стаггерятся по `glow`); `autoplay={true}` на бейдже + собственный spring с перерегулированием 17-23 % (закон 1); «+100 XP» — на `AnimatedTextInput` с фиксированной шириной слота (законы 6-7); переход числа уровня `N−1 → N` — это единственный смысл всего окна; на раскрытии подарка — success-хаптика, звук и конечный `ConfettiBurst` с `count` по редкости (закон 11); дифференциация по редкости (в `LevelGiftDualModal.tsx:572-573` она есть, в одиночном — нет).

**Уровень 4 — баги таймлайна.** `SpinRewardPlaque` передавать со `staticPresentation` (как `ResultsSequence.tsx:565`); развести `pm.reward.level_up` и `pm.reward.small` минимум на 100 мс (закон 4); все бесконечные лупы наградного слоя — под `useReduceMotion` (закон 12).

**Уровень 5 — флоу.** Не перебивать урок: добавить маршруты урока в защищённые и показывать уровень после экрана завершения — либо встроить уровень в `ResultsSequence` отдельной вехой (слоты наград там уже есть, `:553-581`); спин-уровень довести до барабана (`router.push('/level_reward_spin')` по «Готово» или встроить `LevelSpinFinishLine` в окно); молчаливый провал резервации закрыть тостом; серию уровней — стаггерить с нарастанием (закон 2); пейвол на уровне 5 отложить хотя бы на длину выходной анимации.

---

## 9. ПЛАН РЕФАКТОРИНГА ПО ЭТАПАМ

### Этап 0 — «одно слово» (0,5 дня)
Правки в одну-две строки с непропорциональным эффектом: `themeMode` в `MedalToast` (C-6) · `pointerEvents="none"` и возврат `type` в `InGameToast` (C-7) · `useNativeDriver:true` в 5 местах (M-12) · `autoplay={true}` на `LevelBadge` · `onRequestClose` в M-039 · `staticPresentation` для `SpinRewardPlaque` · `presented` из deps `MotionModal` (M-14) · удалить `app/modal.tsx`, `VipCelebrationModal 2.tsx`, мёртвый тернарник, `expo-blur` из зависимостей.

### Этап 1 — фундамент токенов (3-4 дня)
`MODAL_SCRIM(themeMode)` в `constants/` + замена 25 хардкодов (H-1) · развести `MOTION_SPRING` и `MOTION_SPRING_LEGACY` по именам, убить мёртвые токены `MOTION_DURATION` либо начать ими пользоваться (M-1, M-2) · `OVERLAY_Z` лестница вместо 999 999 (M-15) · `useMotionTier()` на `useSyncExternalStore` (H-5) · `use_reduce_motion` → модульный стор с одной нативной подпиской (M-13).

### Этап 2 — шеллы движения (5-6 дней)
Расширить `MotionModal` (радиус, тень, центрирование, backdrop-токен, `statusBarTranslucent`, тап-закрытие, обязательный exit) и `BottomSheetShell` (один вместо шести клонов, H-9) · перевести 27 модалок без анимации (C-4) и 8 с обрывом кадра (C-5) · починить `slide`-backdrop в 5 местах (H-2) и телепорт панели (H-3) · провести экранные `<Modal>` через `OverlayArbiter`, снять три самодельных обхода (H-15).

### Этап 3 — производительность (4-5 дней)
C-1, C-2, C-3 точечно (~5 ч суммарно) · скролл-хром табов на UI-поток (H-4, 1 день) · `runtimeOwnerId` в 17 компонентов + гарды в 19 файлов с лупами (H-8) · `shadowRadius`-пульс → слой-ореол и кап на «искрящиеся» карточки (H-7) · главный жест обучения на `Gesture.Pan` (H-6) · 66 `AppState` → синглтон · единый Fabric-гард для `LayoutAnimation` (M-4).

### Этап 4 — состояния (3-4 дня)
Кроссфейд скелетон→контент как общий примитив (`SkeletonSwap`) и раскатка на 12+18 экранов · скелетоны вместо `return null` в Арене (H-17), `streak_stats`, `flashcards_listening_session` · чтение `loading` и `RefreshControl` в `friends` и `achievements_screen` (H-16) · offline-ветка как общий компонент по образцу T-30 · loading/empty/error в 16 экранах без состояний.

### Этап 5 — level-up и наградной слой (4-5 дней)
Уровни 1-5 раздела 8.2 · звук и хаптика во всех наградных модалках (H-11, H-12) · конечный `ConfettiBurst` вместо статичного пятна · reduce-motion во всех лупах (H-10) · единый примитив shake-таймлайна вместо трёх копий.

### Этап 6 — тосты (2-3 дня)
`useTransientSurface` с обязательными параметрами (якорь, `durationTier`, вход/выход из токенов, reduce-motion, `pointerEvents`) · `bottom` только через `useGlobalBottomOverlayOffset()` · `exiting` обязателен (H-19) · хаптика и звук как часть тира (T-11, T-15, T-16, T-03) · пять «+XP» → один компонент с пропом `anchor` (M-8) · тону вернуть цвет (акцент-рейка и глиф по `type`, фон по теме) · включить `TRACK_INTERNAL_APP_EVENTS` (M-16).

### Этап 7 — переходы и фон (3-4 дня, после проверки Fabric-крашей)
Включить `ENABLE_SCREEN_TRANSITIONS` с направленным push/pop (H-13) · `pack_opening` → `slide_from_bottom` · зарегистрировать ~20 маршрутов в `<Stack.Screen>`, добавить `max_call_session` в allowlist `freezeOnBlur:false` · вернуть `AppArtBackdrop` чтение `name` либо удалить реестр · включить `FABRIC_BACKGROUND_TRANSITIONS_ENABLED` хотя бы для смены темы в `settings_themes` · превратить `SCREEN_GRADIENT_MOTION_ENABLED` в `useMotionTier()`-переключатель либо удалить 837 строк.

### Этап 8 — отделка
Каскад входа главной вернуть или удалить каркас (M-3) · grabber ↔ жест (M-7) · тап-закрытие backdrop на 11 поверхностях (M-5) · `statusBarTranslucent` на 20 модалках (M-6) · `stopAnimation()` в `TapScale` · локализация локальных плашек до 8 языков (M-17) · удаление мёртвого кода из раздела LOW.

**Порядок обязателен:** этапы 1-2 создают инструмент, которым чинятся 4-8. Начинать с косметики отдельных экранов бессмысленно — через месяц копипаста разойдётся снова, ровно как разошлась альфа backdrop у шести побайтовых клонов шторки.
