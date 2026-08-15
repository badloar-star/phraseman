# Аудит 2 · Блок 01 — ВСЕ модальные поверхности в `/root/pm2/components/`

Дата: 2026-08-14 · Кодовая база: phraseman v1.5.53 · Область: `components/` (311 `.tsx`, 188 в корне + 28 подпапок)

Метод: (1) `find -iname "*modal*|*sheet*|*host*|*toast*|*overlay*|*alert*|*banner*|*dialog*|*picker*|*confirm*|*prompt*|*gate*"`,
(2) `grep -rn "<Modal"` → **66 файлов, 72 вхождения**, (3) поиск absolute-оверлеев с анимацией без `<Modal>`,
(4) поиск порталоподобных `*Host*`/`*Gate*`, (5) чтение исходников с фиксацией номеров строк.

Папок `docs/` и `ux-audit/` в контейнере нет (проверено: `/root/pm2/docs`, `/root/pm2/ux-audit`, `/root/docs`, `/root/ux-audit` — отсутствуют).
Косвенное подтверждение прошлого аудита найдено в коде: `components/GlobalShardsEarnedHost.tsx:15` ссылается на
`docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md` — та работа перевела ShardsEarnedModal в тост. Здесь идём дальше.

---

## 0. Сводка одним абзацем

Поверхностей — **87**. Из них **66** используют нативный `<Modal>`, **11** — absolute-оверлеи без `Modal`,
**10** — невизуальные хосты-диспетчеры. Графика на всех поверхностях действительно дорогая (градиентные «жидкие стёкла»,
золотые бевели, кольца, ореолы). **Движение — нет.** Три системных провала:

1. **27 из 66 модалок вообще не имеют собственной анимации панели** — только `animationType="fade"` от RN
   (линейный кросс-фейд, без scale, без easing, без контроля длительности). Среди них — `UpdateModal`,
   `StreakReviveModal`, `VipSurveyModal`, `CollectibleDropModal`, `GlobalBroadcastModal`, `IntroFullAccessModal`.
2. **Выхода нет почти нигде.** Из 66 модалок анимированный ВЫХОД панели есть у **10** (+1 частичный —
   `ThemedConfirmModal`, только по свайпу). Остальные 55 либо схлопываются нативным fade, либо (при
   `animationType="none"`) **исчезают мгновенным кадром** — это 8 поверхностей, включая флагманские
   `LeagueChestOpenModal`, `LevelSpinRewardModal`, `RewardCardV2`, `LeagueBonusAvailableModal`.
3. **Backdrop — 13 разных хардкодов чёрного** (0.26 / 0.40 / 0.42 / 0.53 / 0.55 / 0.56 / 0.58 / 0.60 / 0.62 / 0.68 /
   0.70 / 0.72 / 0.75 / 0.76) в 45 файлах. Токена нет ни в `theme.ts`, ни в `goldTheme.ts`. Из 66 модалок
   backdrop **анимируется у 14**.

Плюс: `expo-blur` объявлен в `package.json:226`, но **`BlurView` не импортируется НИ В ОДНОМ файле проекта** —
всё «стекло» подделано градиентами (это честно задокументировано в `RewardModalBackdrop.tsx:64-69`).

---

## 1. Сводная таблица всех поверхностей

Легенда колонок:
**Мех.** — механизм показа: `M`=нативный `<Modal>`, `abs`=absolute-оверлей, `host`=невизуальный диспетчер, `→X`=обёртка над X.
**anim** — `animationType`. **ВХОД/ВЫХОД**: `spr`=spring, `tim`=timing, `RN`=только нативный fade/slide, `—`=нет, `✂`=мгновенный обрыв.
**BD** — backdrop: число = альфа чёрного, `anim`=анимируется, `grad`=градиентная подложка.
**H** — хаптика. **S** — звук. **RM** — `useReduceMotion`. **Токены** — `T`=useTheme, `G`=goldTheme, `RM$`=RewardModalBackdrop, `hc`=хардкод.

### 1.1 Инфраструктура и шеллы

| # | Файл | Стр. | Мех. | anim | ВХОД | ВЫХОД | BD | H | S | RM | Токены |
|---|------|------|------|------|------|-------|-----|---|---|----|--------|
| 1 | `MotionModal.tsx` | 43 | M | none | tim 280 ease-out-cubic, ty 18→0, sc .985→1 | **tim 180 ease-in-cubic** ✔ | .42 anim | — | — | ✔ | hc |
| 2 | `centered_dialog_shell.tsx` | 100 | M | none | tim 180/200/260 bezier(.32,.72,0,1) | **tim 160** ✔ | .55 anim | tap | — | ✗ | T |
| 3 | `referral_sheet_shell.tsx` | 143 | M | none | tim 200/220/380 bezier | **tim 200/180/240** ✔ | .55 anim+drag | tap | — | ✗ | T |
| 4 | `RewardModalBackdrop.tsx` | 22-132 | хром | — | статичные градиенты | — | grad | — | — | — | RM$/OLIVE |
| 5 | `OverlayArbiter.tsx` | 76-215 | арбитр | — | gap 360 мс, watchdog 15 с | — | — | — | — | — | — |
| 6 | `modal_motion_plan.ts` | 3-7 | план | — | 280/180/18/0.985 | — | — | — | — | ✔ | — |

### 1.2 Нижние шторки (bottom sheets)

| # | Файл | Стр. | Мех. | anim | ВХОД | ВЫХОД | BD | H | S | RM | Токены |
|---|------|------|------|------|------|-------|-----|---|---|----|--------|
| 7 | `ExplainSheet.tsx` | 211 | M | none | 200/220/380 (клон #3) | tim 200/180/240 ✔ | .58 anim+drag | tap | — | ✗ | T |
| 8 | `AiConsentSheetModal.tsx` | 137 | M | none | 200/220/380 (клон #3) | tim 200/180/240 ✔ | .58 anim+drag | tap | — | ✗ | T |
| 9 | `MistakeEli5Modal.tsx` | 180 | M | none | 200/220/380 (клон #3) | tim 200/180/240 ✔ | .58 anim+drag | tap | — | ✗ | T |
| 10 | `customization/AvatarEditorSheet.tsx` | 118 | M | none | 200/220/380 (клон #3) | tim 200/180/240 ✔ | .58 anim+drag | **✗** | — | ✗ | T |
| 11 | `RegistrationPromptModal.tsx` | 1264 | M | none | 200/220/380 + cascade 640 | tim 200/180/240 ✔ | .60·anim+drag | tap | — | ✗ | T |
| 12 | `arena/ArenaModeSheet.tsx` | 145 | M | none | spr{18,210,.9} + стаггер 45 мс | **✂ мёртвый код** | .62 anim | tap | — | ✔ | Tournament |
| 13 | `dev/DevHubSheet.tsx` | 399 | M | none | tim 180 + spr{24,260} | **tim 160/240** ✔ | .62 anim | tap | — | ✔ | T |
| 14 | `youtube/YoutubeChannelPickerSheet.tsx` | 22 | M | **slide** | RN | RN | .56 | ✗ | — | ✗ | T |
| 15 | `tournament/tournament_ui.tsx` | 174 | M | **slide** | RN | RN | .60 | Med.Impact | — | ✗ | Tournament |
| 16 | `StatsLearningInsights.tsx` | 20 | M | **slide** | RN | RN | .58 | ✗ | — | ✗ | T |
| 17 | `ReportErrorButton.tsx` | 279 | M | fade | **—** | RN | .55 | ✗ | — | ✗ | T |
| 18 | `ExplainReportButton.tsx` | 185 | M | fade | **—** | RN | .55 | tap | — | ✗ | T |
| 19 | `ReviewPromptModal.tsx` | 71 | M | slide/fade | **—** | RN | .62 | ✗ | — | ✗ | T |
| 20 | `DailyPhraseCard.tsx` (details) | 651 | M | none | tim 220 bezier(.32,.72,0,1) | **tim 180 ease-in** ✔ | .58 anim | — | — | ✔ | T |
| 21 | `referral_code_sheet.tsx` | — | →#3 | — | наследует | наследует | наследует | tap | — | ✗ | T |
| 22 | `referral_how_sheet.tsx` | — | →#3 | — | наследует | наследует | наследует | ✗ | — | ✗ | T |
| 23 | `OnboardingWelcomeSheet.tsx` | 56 | →#3 | — | наследует | наследует | наследует | tap | — | ✗ | T |

### 1.3 Центрированные диалоги / алерты

| # | Файл | Стр. | Мех. | anim | ВХОД | ВЫХОД | BD | H | S | RM | Токены |
|---|------|------|------|------|------|-------|-----|---|---|----|--------|
| 24 | `ThemedConfirmModal.tsx` | 117 | M | fade | **—** (только drag) | RN | .60 | tap | — | ✗ | T+G |
| 25 | `ThemedChoiceModal.tsx` | 43 | M | fade | **—** | RN | .60 | tap | — | ✗ | T+G |
| 26 | `ThemedBlockingAlertHost.tsx` | 19 | →#25 | fade | — | — | .60 | — | — | — | — |
| 27 | `customization/CustomizationPurchaseConfirmModal.tsx` | 10 | →#24 | fade | — | — | .60 | — | — | — | — |
| 28 | `NotificationPermissionModal.tsx` | 71 | M | fade | **—** | RN | .72 | ✗ | — | ✗ | T |
| 29 | `DeleteAccountConfirmModal.tsx` | 254 | M | fade | **—** | RN | .70 | tap | ✔ destructive_done | ✗ | T |
| 30 | `account/NicknameEditModal.tsx` | 317 | M | fade | **—** | RN | .70 | tap | — | ✗ | T |
| 31 | `account/AccountLogoutFlow.tsx` | 187 | M | fade | **—** | RN | .75/.70 | tap | — | ✗ | T |
| 32 | `CertificateNameModal.tsx` | 55 | M | fade | **—** | RN | .60 | tap | — | ✗ | T |
| 33 | `ReportUserModal.tsx` | 113 | M | fade | **—** | RN | .53 | tap/succ/err | — | ✗ | T |
| 34 | `ReportPackModal.tsx` | 142 | M | fade | **—** | RN | .55 | tap/succ/err | — | ✗ | T |
| 35 | `PersonalAdminMessageModal.tsx` | 34 | M | fade | **—** | RN | .62 | tap | — | ✗ | T |
| 36 | `SeasonRewardInfoModal.tsx` | 85 | M | fade | **—** | RN | .62 | tap | — | ✗ | T |
| 37 | `VipSurveyReviewPromptModal.tsx` | 60 | M | fade | **—** | RN | .56 | tap | — | ✗ | T |
| 38 | `settings/StudyLanguagePicker.tsx` | 128 | inline | — | — | — | — | tap | — | ✗ | T |

### 1.4 Награды, подарки, праздники

| # | Файл | Стр. | Мех. | anim | ВХОД | ВЫХОД | BD | H | S | RM | Токены |
|---|------|------|------|------|------|-------|-----|---|---|----|--------|
| 39 | `LevelUpThresholdModal.tsx` | 142 | M | none | Animated.Value из `_layout` (spr fr 8 + glow tim 900) | **opacity tim 220/300, без ty/scale** | grad (палитра) | ✗ | **✗** | ✔ | levelUpThresholdTheme |
| 40 | `LevelGiftModal.tsx` | 576 | M | fade | spr{115,12} + glow-loop 1450×2 + float 1700 + rock 1700 | **✗** | .52 | tap+success | **✗** | ✗ | T+RM$ |
| 41 | `LevelGiftDualModal.tsx` | 799 | M | fade | spr{110,12}, reveal 420, shine 1500 | **✗** | .48/.78 hc | tap+success | **✗** | ✗ | T+RM$ |
| 42 | `LevelSpinRewardModal.tsx` | 104 | M | **none** | spr{118,12} + icon spr{170,8} delay 100 + glow 1250 | **✂ обрыв** | grad | tap+success | ✔ | ✗ | T+RM$ |
| 43 | `BoonChestModal.tsx` | 230 | M | fade | spr{115,12}, shake 34/34/30/24, lid 360 | **✗** | .60 | tap+success | ✔ chest_open | ✗ | T+RM$ |
| 44 | `BoonActivatedModal.tsx` | 145 | M | fade | spr{120,12} + icon spr{150,9} d90 + flash 180/620 | **✗** | .60 | success+tap | **✗** | ✗ | T |
| 45 | `WeeklyBoonDetailModal.tsx` | 95 | M | fade | spr{120,12} + float 1600 | **✗** | .72 anim (`useModalBackdropFade`) | tap | ✗ | ✗ | T |
| 46 | `CollectibleDropModal.tsx` | 72 | M | fade | **—** | RN | .?/grad | success | ✔ collectible | ✗ | T |
| 47 | `SeasonGiftModal.tsx` | 358 | M | fade | slide-loop 5200 (фон) | **✗** | .62 | tap | **✗** | ✗ | T |
| 48 | `LeagueChestOpenModal.tsx` | 391 | M | **none** | spr{7,110}+tim 220, crown 1000, shine 2600+800 | **✂ обрыв** | ? | tap+success | **✗** | ✗ | T |
| 49 | `LeagueBonusAvailableModal.tsx` | 70 | M | **none** | spr(MOTION ui)+tim 220, glow 1700 | **✂ обрыв** | ? | tap | ✗ | ✗ | T+MOTION |
| 50 | `league/LeagueChestTeaserModal.tsx` | 128 | M | **none** | tim 240 → BD .72 + sc .86→1; rays 24000; bob 1500; `FadeInDown.delay(160+i·80).duration(320)` | **✂ обрыв** | .72 anim | tap | ✗ | ✔ | palette |
| 51 | `reward_v2/RewardCardV2.tsx` | 337 | M | **none** | spr(MOTION ui) ×2 + tim 240, halo 1400 | **✂ обрыв** | `rewardCardBackdropColor` | ✗ | ✗ | ✗ | T+RM$ |
| 52 | `roulette_win_modal.tsx` | 98 | M | fade | spr{13,160} + tim 220 | **✗** | .72 | ✗ | ✗ | ✔ | T |
| 53 | `roulette_win_celebration.tsx` | 141 | abs | — | tim 1500+delay, стаггер `(i%6)*40` | авто, safety-таймер | — | ✗ | ✗ | ✔ | T |
| 54 | `referral_friend_reward_modal.tsx` | 59 | M | fade | spr{14,170} + tim 200 | **✗** | .68 | ✗ | ✗ | ✗ | T |
| 55 | `PremiumCelebrationModal.tsx` | 344 | M | fade | hero 520 back(1.4); ring 6000 spin; pulse 1300×2; строки стаггер **170 мс** от 450; CTA spr{.6,12,120}; shimmer 2400 | **✗** | grad 4-стоп .62/.30/.34/.70 | tap на строку + success | ✔ premium/vip_open+finale | ✔ | T |
| 56 | `VipCelebrationModal.tsx` | 11 | →#55 | — | — | — | — | — | — | — | — |
| 57 | `VipCelebrationModal 2.tsx` | 4 | →#55 | — | **дубликат-мусор** | — | — | — | — | — | — |
| 58 | `IntroFullAccessModal.tsx` | 151 | M | fade | **—** | RN | .72 + grad | ✗ | ✗ | ✗ | RM$ |
| 59 | `ReferralWelcomeHost.tsx` | 152 | M | fade | spr{7,80} + tim 180 | **✗** | .60 | ✗ | ✗ | ✗ | T |
| 60 | `tournament/TournamentWelcomeModal.tsx` | 111 | M | fade | tim 220 + seq(1.03 @260 → spr{14,220}); звёзды delay 80/180 tim 900 | **✗** | ? | ✗ | ✗ | ✔ | Tournament |
| 61 | `DialogVictoryCelebration.tsx` | 402 | abs | — | BD tim 350; glow 700; hero spr{9,150,.7}; ring 1100; CTA spr{14,130}; shimmer 1800 | **✗** | `#070b10` hc | success + medium (по таймерам) | ✗ | ✔(частично) | hc PALETTE |
| 62 | `SpinRewardPlaque.tsx` | — | inline | — | — | — | — | — | ✔ reward.small | ✔ | — |

### 1.5 Полноэкранные

| # | Файл | Стр. | Мех. | anim | ВХОД | ВЫХОД | BD | H | S | RM | Токены |
|---|------|------|------|------|------|-------|-----|---|---|----|--------|
| 63 | `ActivityHeatmap365.tsx` | 417 | M | **slide** + `presentationStyle="fullScreen"` | RN | RN | нет (opaque) | ✗ | ✗ | ✗ | T+G |
| 64 | `ExamResultPreviewAdminModal.tsx` | 203 | M | **slide** + fullScreen | RN | RN | нет | tap | ✗ | ✗ | T |
| 65 | `PlayerProfileModal.tsx` | 2457 | M | none | tim 300 ease-out-cubic + fade 220; shimmer 1200×2 | **✗** | .55 | tap | ✗ | ✔ | T |
| 66 | `AppMessagesInbox.tsx` | 1173 | →#1 `MotionModal` | none | 280 из плана | 180 из плана ✔ | **.42 + .56 = двойной** | tap | ✗ | ✗ | T |
| 66b| `AppMessagesInbox.tsx` (конверт-полёт) | 1143 | M | none | tim 720 ease-in-cubic + spr{4,160}/{6,120} | tim | нет | ✗ | ✗ | ✗ | — |
| 67 | `SpeakingPanel.tsx` | 2012 | M | fade | **—** | RN | .55 | tap/succ/err | ✗ | ✗ | T |

### 1.6 Системные и блокирующие

| # | Файл | Стр. | Мех. | anim | ВХОД | ВЫХОД | BD | H | S | RM | Токены |
|---|------|------|------|------|------|-------|-----|---|---|----|--------|
| 68 | `UpdateModal.tsx` | 277 | M | fade | **—** | RN | grad wash | tap | ✗ | ✗ | T+G+OLIVE |
| 69 | `ReleaseNotesModal.tsx` | 252 | M | fade | spr{74,9} + glow 1400×2 + shine 3200/6800 | **✗** | ? | tap | ✗ | ✔ | T |
| 70 | `GlobalBroadcastModal.tsx` | 98 | M | fade | **—** | RN | .62 | tap+success | ✗ | ✗ | T |
| 71 | `NoEnergyModal.tsx` | 387 | M | fade | spr(ui)+tim 220; bolt spr(micro) d120; shake 70/70/70/90; halo 1100×2 | **✗** | .72 + radial glow | tap | ✔ energy.empty | ✗ | T+MOTION |
| 72 | `StreakReviveModal.tsx` | 257 | M | fade | **—** | RN | `rgba(2,4,10,.76)` | tap+success | ✗ | ✗ | T |
| 73 | `VipSurveyModal.tsx` | 320 | M | fade | **—** | RN | .58 | tap+success | ✗ | ✗ | T |
| 74 | `ForceUpdateGate.tsx` | 227 | **abs** z=10000 | — | **—** | **—** | `#0b0b12` / `rgba(11,11,18,.72)` hc | ✗ | ✗ | ✗ | **hc** |
| 75 | `MaintenanceGate.tsx` (block) | 120 | **abs** z=9999 | — | **—** | **—** | `#0b0b12` hc | ✗ | ✗ | ✗ | **hc** |
| 76 | `MaintenanceGate.tsx` (banner) | 164 | abs | — | **—** | tim 180 + spr fr 7 | — | ✗ | ✗ | ✗ | **hc** `#7c2d12` |
| 77 | `dev/DevHubSheet.tsx` (preview fullScreen) | 536 | M | fade | tim 0.34d/0.42d/d | **✗** | — | tap | ✗ | ✔ | T |
| 78 | `dev/DevHubSheet.tsx` (preview none) | 570 | M | none | — | **✂** | — | tap | ✗ | ✔ | T |

### 1.7 Тосты, плашки, баннеры

| # | Файл | Стр. | Мех. | anim | ВХОД | ВЫХОД | BD | H | S | RM | Токены |
|---|------|------|------|------|------|-------|-----|---|---|----|--------|
| 79 | `ActionToast.tsx` | 181-247 | abs | — | rAF → spr(toast 250/22) + tim 240 | tim 240/180 через 3200 мс ✔ | нет | err/succ/soft | ✔ 5 событий | ✗ | themedToastChrome |
| 80 | `AchievementToast.tsx` | 217-256 | abs + M(457) | fade | spr(toast) ty+scale + tim 240 | tim 320/240 через 3800 мс ✔ | нет; модалка — RM$ | success/tap | ✔ achievement | ✗ | T+RM$ |
| 81 | `MedalToast.tsx` | 279-377 | abs | — | `anim` prop извне | извне | нет | извне | ✗ | ✗ | medalToastThemeStyles |
| 82 | `CoachToast.tsx` | 96-115 | abs | — | spr{80,10} + tim 250 | tim 220/200 через **8000 мс** ✔ | нет | tap | ✗ | ✗ | T |
| 83 | `InGameToast.tsx` | 23-27 | abs | — | tim 250 | tim 250 ✔ | нет | ✗ | ✗ | ✗ | themedToastChrome |
| 84 | `OfflineBanner.tsx` | 50-99 | abs | — | tim 220 | tim 180 через 10 000 мс ✔ | нет | ✗ | ✗ | ✗ | T |
| 85 | `PromoBanner.tsx` | 135-193 | abs | — | **—** | tim 180 (свайп) | нет | ✗ | ✗ | ✗ | T |
| 86 | `RankChangeBanner.tsx` | 38-44 | abs | — | tim 280 | tim 240/200 ✔ | нет | ✗ | ✗ | ✗ | T |
| 87 | `SaveProgressBanner.tsx` | 198 | abs | — | tim 520 ease-out-cubic | **✗** | нет | tap | ✗ | ✗ | T |
| 88 | `AccountDeletedNotice.tsx` | 57-69 | abs | — | tim 260 ease-out-exp | tim 340 ✔ | нет | ✗ | ✗ | ✔ | T |
| 89 | `feedback/FeedbackPlashka.tsx` | 53-55 | abs | — | spr{16,180,.9} | tim 200 ✔ | нет | ✗ | ✗ | ✗ | T |

### 1.8 Невизуальные хосты и гейты

| # | Файл | Что делает |
|---|------|------------|
| 90 | `GlobalShardsEarnedHost.tsx:42-65` | Слушает `shards_earned` → `emitAppEvent('action_toast')`. Рендерит `null`. |
| 91 | `GlobalFriendGiftHost.tsx` | Подарки друзей → тост. |
| 92 | `BillingIssueToastHost.tsx` | RevenueCat billing issue → тост. |
| 93 | `StreakRiskToastHost.tsx` | Риск потери серии → тост. |
| 94 | `BoonActivatedHost.tsx:150` | → `BoonActivatedModal`, ключ арбитра `boonActivated`. |
| 95 | `MysteryMondayHost.tsx:188` | → `BoonChestModal`, ключ `mysteryMondayChest`. |
| 96 | `PerfectWeekHost.tsx:137` | → `BoonChestModal`, ключ `perfectWeekReward`. |
| 97 | `ComebackBoonHost.tsx:112` | → `BoonChestModal`, ключ `comebackDay`. |
| 98 | `EntitlementExpiredHost.tsx:301` | → `RewardCardV2` с `backdropAction="ghost"`. |
| 99 | `OnboardingWelcomeHost.tsx:60` | → `OnboardingWelcomeSheet`, ключ `onboardingWelcome`. |
| 100 | `ThemedBlockingAlertHost.tsx:13-32` | Очередь модерационных алертов → `ThemedChoiceModal`. |
| 101 | `dev/DevHubSheetGate.tsx:15` | Ленивый `require` DevHubSheet за `ENABLE_DEV_TOOLS`. |
| 102 | `AiDialogConsentModal.tsx` / `AiExplainConsentModal.tsx` | Обёртки-копирайтеры над `AiConsentSheetModal`. |

---

## 2. Детальный разбор

### 2.1 `MotionModal.tsx` — единственный правильный шелл, которым почти никто не пользуется

**Файл:** `/root/pm2/components/MotionModal.tsx` (72 строки)

1. **Назначение.** Универсальный контейнер: держит панель смонтированной на время закрытия, чтобы выход был виден.
   Пользователь видит его ровно в одном месте — «Входящие» (`AppMessagesInbox.tsx:1173`).
2. **Механизм.** `<Modal transparent visible={presented} animationType="none" statusBarTranslucent>` (стр. 43).
   `presented` — локальный state, снимается только в колбэке закрывающей анимации (стр. 34-38).
3. **Вход.** `Animated.timing(progress, 0→1, duration = plan.openMs, Easing.out(Easing.cubic), useNativeDriver: true)` (стр. 29).
   План — `modal_motion_plan.ts:6`: `openMs: 280, translateY: 18, scaleFrom: 0.985`. Стаггера нет.
4. **ВЫХОД.** Есть: `duration: plan.closeMs = 180`, `Easing.in(Easing.cubic)` (стр. 34). Через `nextModalTransition`/
   `completeModalClose` (`modal_motion_state.ts`) защищено от гонок при повторных open/close. **Это эталон.**
5. **Backdrop.** `styles.backdrop` — `rgba(0,0,0,0.42)` (стр. 70), `opacity: progress` → анимируется вместе с панелью. Blur нет.
6. **Состояния.** `presented` / `visible`, reduce-motion (`plan` → все длительности 0).
7. **Хаптика/звук.** Нет ни того, ни другого.
8. **Токены.** `rgba(0,0,0,0.42)` — **хардкод**, не токен темы. Длительности — свой `modal_motion_plan`, а не `MOTION_DURATION`.

**ПРОБЛЕМЫ**
- `MotionModal.tsx:70` — backdrop захардкожен и не совпадает ни с одним другим значением в проекте (0.42 — уникальное).
- `MotionModal.tsx:6,29,34` — параллельная система длительностей (`modal_motion_plan`) вместо `MOTION_DURATION` из
  `constants/motion.ts`. 280/180 не равны ни `normal`(240), ни `slow`(320), ни `modalDismiss`(300).
- `MotionModal.tsx:40` — в deps эффекта есть `presented`, но он же меняется внутри эффекта → лишний прогон эффекта
  на каждый переход; `progress.stopAnimation()` в начале (стр. 24) при этом обрывает уже идущую анимацию открытия.
- **Главная проблема — не в файле, а в его неиспользовании.** 65 из 66 модалок его игнорируют.
- `MotionModal.tsx:71` — `panel: { flex: 1 }`: shell не даёт ни радиуса, ни тени, ни центрирования, поэтому
  каждый потребитель заново строит геометрию. Это и есть причина, по которой им не пользуются.

### 2.2 Семейство «нижняя шторка» — пять побайтовых клонов

**Файлы и строки входа/выхода:**

| Файл | вход | выход | drag |
|------|------|-------|------|
| `referral_sheet_shell.tsx` | 74-77 | 89-99 | 112-131 |
| `ExplainSheet.tsx` | 100-103 | 137-139 | 154-172 |
| `AiConsentSheetModal.tsx` | 68-71 | 85-87 / 129-131 | 96-112 |
| `MistakeEli5Modal.tsx` | 72-75 | 89-91 | 106-124 |
| `customization/AvatarEditorSheet.tsx` | 55-58 | 66-68 | 83-101 |
| `RegistrationPromptModal.tsx` | 331-336 | 1201-1203 | 1224-1247 |

Все шесть содержат **идентичный** блок:
```
backdropO.value  = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
sheetOpacity     = withTiming(1, { duration: 220 });
sheetY           = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
// выход
backdropO        = withTiming(0, { duration: 200 });
sheetOpacity     = withTiming(0, { duration: 180 });
sheetY           = withTiming(SHEET_HIDDEN=320, { duration: 240, easing: REasing.out(REasing.cubic) });
// drag
dragTranslateY   = withTiming(swipeOffDistance, { duration: 260 })  |  withSpring(0, { damping: 22, stiffness: 300 })
backdropStyle    = backdropO * (1 - min(max(dragY,0)/600, 0.5))
```

1. **Назначение.** Всё, что «выезжает снизу»: объяснение ошибки, ELI5-разбор, AI-согласие, редактор аватара,
   рефералка, форма регистрации/входа.
2. **Механизм.** `<Modal transparent animationType="none" statusBarTranslucent>` + Reanimated 3 shared values.
3. **Вход.** Три несинхронных таймлайна: 200 (фон) / 220 (прозрачность листа) / 380 (позиция). Стаггера внутри контента нет.
4. **ВЫХОД.** Есть и корректный: `onClose` вызывается из колбэка `withTiming` через `runOnJS` — панель доживает до конца.
5. **Backdrop.** Анимируется + реагирует на драг (осветляется до 50 % при оттягивании). Blur нет.
   Альфа: `.55` (`referral_sheet_shell.tsx:192`), `.58` (`ExplainSheet.tsx:325`, `AiConsentSheetModal.tsx:225`,
   `MistakeEli5Modal.tsx:268`, `AvatarEditorSheet.tsx:161`), `.60·backdropO` (`RegistrationPromptModal.tsx:1255,1920`).
6. **Состояния.** visible / dragging / swipe-off / dismiss-fallback таймер (`referral_sheet_shell.tsx:95`).
7. **Хаптика.** `hapticTap()` при dismiss — **кроме `AvatarEditorSheet.tsx:65`, где хаптики нет вообще.** Звука нет нигде.
8. **Токены.** Цвета — `useTheme()`. Длительности — литералы, ни одна не берётся из `MOTION_DURATION`
   (хотя `bottomSheetOpen: 400` / `bottomSheetClose: 250` там ровно для этого и лежат, `constants/motion.ts:12-13`).

**ПРОБЛЕМЫ**
- **Копипаста движения ×6.** Правка тайминга шторок требует шести синхронных правок. Это первопричина того,
  что альфа backdrop разошлась (.55 vs .58 vs .60) при одинаковой анимации.
- `constants/motion.ts:12-13` — токены `bottomSheetOpen: 400` / `bottomSheetClose: 250` **не используются ни разу**
  (проверено grep'ом). Вместо них — 380/240 в шести местах.
- `referral_sheet_shell.tsx:74` (и аналоги) — эффект `if (!visible) return;`: **при внешнем сбросе `visible=false`
  выход не проигрывается**, `<Modal visible={visible}>` схлопывается мгновенно. Анимация выхода работает только
  через `dismissSheet`.
- `referral_sheet_shell.tsx:76-77` — `sheetOpacity` (220 мс) заканчивается на 160 мс раньше `sheetY` (380 мс):
  лист доезжает уже полностью непрозрачным. Это читается как «допрыгивание», а не как единое движение.
- `customization/AvatarEditorSheet.tsx:65` — единственная шторка семейства без `hapticTap()` на закрытии.
- Ни одна шторка не имеет **стаггера содержимого**. Панель приезжает, контент внутри — статичный блок.
- Ни одна не проверяет reduce-motion (`useReduceMotion` есть в `hooks/`, но в этих шести файлах не импортирован).

### 2.3 `centered_dialog_shell.tsx` — второй шелл, тоже почти неиспользуемый

**Файл:** `/root/pm2/components/centered_dialog_shell.tsx` (188 строк)

1. **Назначение.** Маленькое окно по центру, не двигается клавиатурой (см. комментарий стр. 1-16: «Добавить друга»).
2. **Механизм.** `<Modal visible transparent animationType="none" statusBarTranslucent>` (стр. 100).
3. **Вход** (стр. 72-75): backdrop 180 ease-out-cubic; opacity 200 ease-out-cubic; scale 0.94→1 за 260 мс
   `bezier(0.32, 0.72, 0, 1)`.
4. **ВЫХОД** (стр. 83-87): все три за 160 мс, scale 1→**0.96** (не 0.94!), `onClose` из колбэка. Выход есть. ✔
5. **Backdrop.** `rgba(0,0,0,0.55)` (стр. 155), анимируется. Blur нет.
6. **Состояния.** visible; контент скроллится внутри (стр. 135-143), геометрия не зависит от клавиатуры.
7. **Хаптика.** `hapticTap()` в `dismissDialog` (стр. 82). Звука нет.
8. **Токены.** `t.bgCard`, `t.bgSurface2`, `t.textPrimary`, `t.textMuted`, `f.h3` + `TonalSurface`. Backdrop — хардкод.

**ПРОБЛЕМЫ**
- `centered_dialog_shell.tsx:84` — выход уводит scale в **0.96**, а вход стартует с **0.94**. Асимметрия:
  при быстром re-open окно «дёргается» на 0.02. Должно быть одно значение.
- `centered_dialog_shell.tsx:68-76` — эффект срабатывает только на `visible === true`. Если родитель сбросит
  `visible` напрямую (не через `dismissDialog`), `backdropO`/`dialogO` останутся на 1 → **следующее открытие
  будет без анимации** (`withTiming(1)` из 1 = мгновенно).
- `centered_dialog_shell.tsx:155` — `rgba(0,0,0,0.55)` хардкод, отличается от `MotionModal` (0.42) при одинаковом
  назначении «центрированный диалог».
- Три разных длительности входа (180/200/260) без общего ритма; выход — одна (160). Вход и выход не зеркальны.

### 2.4 `ThemedConfirmModal` / `ThemedChoiceModal` — базовые алерты приложения без единой анимации

**Файлы:** `ThemedConfirmModal.tsx` (245), `ThemedChoiceModal.tsx` (169), хост `ThemedBlockingAlertHost.tsx` (35).

1. **Назначение.** `ThemedConfirmModal` — «подтвердить/отмена» (покупка кастомизации, деструктивные действия).
   `ThemedChoiceModal` — список вариантов и **все модерационные алерты** (через `ThemedBlockingAlertHost` +
   `app/themed_blocking_alert_queue`).
2. **Механизм.** Оба — `<Modal visible transparent animationType="fade">` (`ThemedConfirmModal.tsx:117`,
   `ThemedChoiceModal.tsx:43`).
3. **Вход.** **Отсутствует.** Панель просто появляется вместе с нативным фейдом фона. Ни scale, ни translate.
4. **ВЫХОД.** Только нативный fade. Для `ThemedConfirmModal` есть исключение: свайп-вниз уводит карточку
   `Animated.timing(dragY → 600, duration 180)` (`ThemedConfirmModal.tsx:85-92`) — это единственный
   осмысленный выход во всём семействе алертов.
5. **Backdrop.** `const dim = 'rgba(0,0,0,0.60)'` — `ThemedConfirmModal.tsx:38`, `ThemedChoiceModal.tsx:32`.
   Статичный, не анимируется (нативный fade фейдит его вместе со всем окном). Blur нет.
6. **Состояния/варианты.** `confirmVariant: 'accent' | ...`; golden-режим (`isGoldTheme` → `GOLD_GRADIENTS.premiumPanel`,
   `GOLD_SURFACE_LOCATIONS`, `<GoldBevel intensity="strong">`), olive-режим (`OLIVE_RICH.piano`).
   `ThemedConfirmModal` — drag-to-dismiss (порог `dy > 90 || vy > 1.2`, стр. 83), `ThemedChoiceModal` — **без drag**.
7. **Хаптика.** `hapticTap()` на каждой кнопке (`ThemedConfirmModal.tsx:123,181,221`; `ThemedChoiceModal.tsx:87,121`)
   и после свайпа (стр. 90). Звука нет.
8. **Токены.** Отлично: `GOLD_GRADIENTS`, `GOLD_RICH`, `GOLD_SURFACE_LOCATIONS`, `goldShadow`, `OLIVE_RICH`, `useTheme`.
   Единственный хардкод — `dim`.

**ПРОБЛЕМЫ**
- **Самая частая модалка приложения не имеет анимации панели.** Графика (золотой бевель, 3-стоповый градиент) —
  премиальная, движение — нулевое. Это ядро жалобы «движение не дотягивает».
- `ThemedChoiceModal.tsx:43` vs `ThemedConfirmModal.tsx:117` — **разное поведение у братьев**: в одном есть
  drag-to-dismiss, в другом нет. Пользователь учит жест на одном алерте, на соседнем он не работает.
- `ThemedConfirmModal.tsx:94-100,104-110` — `Animated.spring({damping:16, stiffness:180, mass:0.9})` — числа
  не из `MOTION_SPRING` и не из `MOTION_SPRING_LEGACY`. При этом `constants/motion.ts:20-22` явно предупреждает
  о смешении шкал — здесь взята вторая (валидная) форма RN-spring, но токена под неё в системе нет.
- `ThemedConfirmModal.tsx:38` / `ThemedChoiceModal.tsx:32` — `rgba(0,0,0,0.60)` продублирован в двух файлах.
- `ThemedBlockingAlertHost.tsx:19-31` — при пустой очереди в `ThemedChoiceModal` уходят `title=''`, `message=''`,
  `choices=[]`. Модалка невидима (`visible=false`), но пропсы мигают между кадрами — на смене head'а очереди
  окно **моргает пустым** при нативном fade.

### 2.5 `LevelUpThresholdModal` — флагман, у которого драйвер анимации живёт в чужом файле

**Файлы:** `components/LevelUpThresholdModal.tsx` (539) + драйвер `app/_layout.tsx:802-890, 969-977, 1174-1250, 1390-1465`.

1. **Назначение.** Экран «новый уровень»: портал с `LevelBadge`, награды (XP / титул / энергия / спин), кнопка «Продолжить».
2. **Механизм.** `<Modal transparent visible animationType="none" statusBarTranslucent onShow={onShow}>` (стр. 142-149).
3. **Вход.** Компонент **не анимирует сам** — принимает три `Animated.Value` пропами (`opacity`, `translateY`, `glow`, стр. 65-67).
   Драйвер в `app/_layout.tsx:888-890`:
   `Animated.spring(levelUpOpacity → 1, friction: 8)`, `Animated.spring(levelUpTranslateY 40→0, friction: 8)`,
   `Animated.timing(levelUpGlow → 1, duration: 900)`.
   Внутри модалки из `glow` разворачивается **стаггер интерполяцией**:
   - портал: `opacity 0.58→1`, `scale 0.92→1` (стр. 119-120);
   - milestone-вспышка: `opacity [0, 0.36, 1] → [0, 0.45, 1]`, `scale 0.82→1` (стр. 125-126);
   - блок наград: `opacity [0, 0.30, 1] → [0, 0, 1]`, `translateY 10→0` (стр. 131-132);
   - кнопка: `opacity [0, 0.38, 1] → [0, 0, 1]`, `translateY 8→0` (стр. 137-138).
   То есть награды появляются на 30 % от 900 мс = **270 мс**, кнопка — на 342 мс. Это единственный настоящий
   каскад во всём наборе модалок.
4. **ВЫХОД.** `app/_layout.tsx:1181` (спин-ветка) и `:1230` (обычная): `Animated.timing(levelUpOpacity → 0, 220 / 300)`.
   **`translateY` и `glow` не откатываются.** Окно просто гаснет, оставаясь на месте — вход был пружинным подъёмом,
   выход — плоским фейдом. Асимметрия максимальная.
5. **Backdrop.** Своего нет — окно полноэкранное: `palette.background` (3-стоповый `LinearGradient`, стр. 154-159)
   + `ambientTop`/`ambientBottom`/`horizon` (стр. 160-162). `overflow: 'hidden'`.
6. **Состояния.** `variant: 'standard' | 'milestone'` (milestone добавляет `sparkles`-вспышку, стр. 225-229);
   `compact` при `height < 720` (стр. 100) — портал 154 вместо 206, бейдж 82 вместо 108;
   опциональные `titleReward` / `energyReward` / `spinReward`; reduce-motion полностью выключает все стили (стр. 106, 116-138).
7. **Хаптика.** **Нет ни одной.** Достижение уровня — самое эмоциональное событие в приложении — проходит без вибрации.
8. **Звук.** **Нет.** (Ср. `LevelSpinRewardModal.tsx:63` и `PremiumCelebrationModal.tsx:231` — там звук есть.)
9. **Токены.** `getLevelUpThresholdPalette(themeMode)` из `components/levelUpThresholdTheme.ts` — по темам. Хардкодов нет.

**ПРОБЛЕМЫ**
- `LevelUpThresholdModal.tsx:148` — **`onRequestClose={() => {}}`**: аппаратная кнопка «Назад» на Android
  не делает ничего. Единственный выход — кнопка. Для полноэкранного окна это ловушка.
- `app/_layout.tsx:1181,1230` — выход только по `opacity`; `translateY`/`glow` остаются в конечном состоянии.
  При повторном показе они принудительно сбрасываются (`:884-886`, `:969-971`), значит асимметрия — не оптимизация, а недосмотр.
- `app/_layout.tsx:888-889` — `Animated.spring({ friction: 8 })` **без `tension`** → RN подставит дефолт 40:
  очень мягкая, долгая пружина (~700-900 мс до покоя). Ни `MOTION_SPRING_LEGACY.ui` (300/28),
  ни `.panel` (250/25) не использованы.
- `LevelUpThresholdModal.tsx:65-67` — анимационное состояние вынесено в пропсы. Компонент нельзя переиспользовать
  и нельзя протестировать в отрыве; `dev/DevHubSheet.tsx:291-306` вынужден дублировать весь драйвер заново
  (три `Animated.timing` с `duration * 0.34 / * 0.42 / duration`) — **две несовпадающие реализации одного движения**.
- Нет хаптики и звука на кульминации прогресса.
- `glow` доезжает за 900 мс, но `LevelBadge` вызывается с `autoplay={false}` (стр. 220) — бейдж статичен
  в момент, когда вокруг него всё оживает.

### 2.6 `LevelGiftModal` / `LevelGiftDualModal` / `BoonChestModal` — сундуки: богатый вход, нулевой выход, тишина

**Файлы:** `LevelGiftModal.tsx` (1044), `LevelGiftDualModal.tsx` (1274), `BoonChestModal.tsx` (423).

1. **Назначение.** Подарок за уровень (один сундук / два: обычный + премиум), сундук за буст/мистери-понедельник.
2. **Механизм.** `<Modal transparent visible animationType="fade">` — `LevelGiftModal.tsx:576`,
   `LevelGiftDualModal.tsx:799`, `BoonChestModal.tsx:230`.
3. **Вход.**
   - `LevelGiftModal.tsx:272-306`: `spring(modalEntrance, tension 115, friction 12)`;
     `loop(glow 1450↔1450)`; `loop(float −7↔2, 1700, inOut ease)`; `loop(rock −5↔5, 1700)`.
   - Открытие (`:421-433`): `shake 9(34) → −11(34) → 8(30) → 0(24)` параллельно `scale → 0.96 (66)`,
     затем `spring(scale → 1.06, t200/f8)` + `timing(lidLift, 360, out-cubic)`.
   - Раскрытие награды (`:396-410`): `spring(fadeReveal, t160/f9)` + `spring(orbRise, t120/f9)` + `loop(orbPulse 1250↔1250)`.
   - Страховка `LEVEL_GIFT_OPEN_SAFETY_MS` (`:418`), в `BoonChestModal.tsx:28` — `OPEN_SAFETY_MS = 520`.
   - `LevelGiftDualModal.tsx:412-436`: два сундука с расфазировкой — `mkLoop(fFloat, 0)` и `mkLoop(pFloat, 180)`,
     плюс `mkr()` — покачивание −4/+4/0 (360/360/300).
4. **ВЫХОД.** **Нет ни у одного.** Закрытие = `onClose()` → нативный fade. Вся построенная пластика
   (парение, покачивание, орб) обрывается кросс-фейдом.
5. **Backdrop.** `LevelGiftModal.tsx:573` — `screenDim = 'rgba(0,0,0,0.52)'`, статичный;
   `BoonChestModal.tsx:347` — `rgba(0,0,0,0.6)`;
   `LevelGiftDualModal.tsx:770-771` — тернарник на мёртвой константе: `USE_ELITE_DUAL_LEVEL_GIFT_MODAL ?
   (false ? 'rgba(24,18,10,0.32)' : 'rgba(0,0,0,0.48)') : 'rgba(0,0,0,0.78)'` — **`false ? … : …` внутри**.
   Все три поверх `RewardModalPanelBackdrop` / `RewardModalLiquidGlass` (`LevelGiftModal.tsx:607,609`).
6. **Состояния.** `box → opening → revealed`; редкости (`rare` / `epic` меняют силу хаптики,
   `LevelGiftDualModal.tsx:572-573`); `skipOpeningAnimation` (`LevelGiftModal.tsx:324`).
7. **Хаптика.** Есть: `hapticTap` на тап по сундуку, `hapticSuccess` на раскрытии.
8. **Звук.** `BoonChestModal.tsx:133` → `pm.reward.chest_open`. **`LevelGiftModal` и `LevelGiftDualModal` — БЕЗ ЗВУКА.**
   То есть сундук за буст звучит, а сундук за уровень (главная награда) — нет.
9. **Токены.** `useTheme`, `RewardModalPanelBackdrop`, `RewardModalLiquidGlass` — хорошо. Backdrop и часть
   служебных цветов (`LevelGiftDualModal.tsx:766,1185` — `'#0B1018'`, `'rgba(3,5,10,0.42)'`) — хардкод.

**ПРОБЛЕМЫ**
- **Нет выхода** — `LevelGiftModal.tsx:576`, `LevelGiftDualModal.tsx:799`, `BoonChestModal.tsx:230`.
- **Нет звука открытия сундука** в `LevelGiftModal.tsx` и `LevelGiftDualModal.tsx` при наличии готового
  события `pm.reward.chest_open`.
- `LevelGiftDualModal.tsx:770` — мёртвый тернарник `false ? 'rgba(24,18,10,0.32)' : 'rgba(0,0,0,0.48)'`.
- Бесконечные `Animated.loop` (glow / float / rock / orbPulse) **без проверки reduce-motion** —
  `LevelGiftModal.tsx:279,294,300,404`, `BoonChestModal.tsx:109,161`, `LevelGiftDualModal.tsx:376,412,421`.
  Файлы не импортируют `useReduceMotion`.
- Три файла воспроизводят **один и тот же shake-таймлайн** 9/−11/8/0 (34/34/30/24) построчно:
  `LevelGiftModal.tsx:421-433`, `LevelGiftDualModal.tsx:547-559`, `BoonChestModal.tsx:172-183`. Различие только
  в `lidLift` (360 vs 340). Общего примитива нет.
- `spring` конфиги `{t115,f12}`, `{t110,f12}`, `{t160,f9}`, `{t120,f9}`, `{t200,f8}`, `{t145,f8}` — шесть
  наборов, ни один не из `MOTION_SPRING_LEGACY`.

### 2.7 Восемь модалок с `animationType="none"` и без выхода — мгновенный обрыв

Это самый заметный дефект: панель красиво въезжает, а исчезает **одним кадром**, потому что нативной анимации
нет (`none`), а собственной выходной — тоже.

| Файл | строка `<Modal>` | что теряется на выходе |
|------|------------------|------------------------|
| `LevelSpinRewardModal.tsx` | 104-108 | `spring(entrance t118/f12)`, `spring(icon t170/f8, delay 100)`, `loop(glow 1250)` |
| `LeagueChestOpenModal.tsx` | 391 | `spring(scale f7/t110)`, `timing(opacity 220)`, `loop(crownFloat 1000)`, `loop(shine 2600 + delay 800)` |
| `LeagueBonusAvailableModal.tsx` | 70 | `spring(MOTION ui)`, `timing 220`, `loop(glow 1700)` |
| `league/LeagueChestTeaserModal.tsx` | 128 | `timing(backdrop 240)` → BD 0.72 + `scale 0.86→1`; `loop(raySpin 24000)`; `loop(bob 1500)`; `FadeInDown.delay(160+i·80).duration(320).springify()` |
| `reward_v2/RewardCardV2.tsx` | 337-342 | `spring ×2 (MOTION ui)`, `timing 240`, `loop(halo 1400)` |
| `PlayerProfileModal.tsx` | 2457-2463 | `timing(slide 300 out-cubic)`, `timing(fade 220)`, `loop(shimmer 1200)` |
| `arena/ArenaModeSheet.tsx` | 145 | выход **написан** (`:135` `withTiming(0, 160, in-quad)`), но `visible` уходит в `<Modal>` напрямую → **мёртвый код** |
| `dev/DevHubSheet.tsx` (preview) | 570-576 | — |

**ПРОБЛЕМЫ (по файлам)**
- `LeagueChestOpenModal.tsx:391` + `:397,518,533` — `onClose()` вызывается напрямую из `onPress`, ничего не анимируя.
  Открытие сундука лиги — событие уровня «джекпот» — заканчивается обрывом кадра.
- `LeagueBonusAvailableModal.tsx:70,76,186` — то же.
- `reward_v2/RewardCardV2.tsx:337-347` — универсальная карточка наград (её использует `EntitlementExpiredHost.tsx:301`
  для «премиум истёк»), тоже обрыв.
- `arena/ArenaModeSheet.tsx:131-136 vs :145` — **написанный и никогда не исполняемый выход**. Самый явный признак,
  что про выход в проекте думают, но механику `<Modal visible>` не учитывают.
- `league/LeagueChestTeaserModal.tsx:159` — `FadeInDown.delay(160 + index * 80)` — единственный настоящий
  Reanimated-стаггер во всём наборе (80 мс на строку), и он **пропадает вместе с обрывом**.
- `PlayerProfileModal.tsx:2448-2449` — `handleClose = () => onClose()`, без анимации, при живой входной 300 мс.

### 2.8 Двадцать семь модалок вообще без анимации панели

Полный список (проверено: в файле нет ни `Animated.timing/spring/loop/sequence/parallel`, ни `withTiming/withSpring`, ни `entering=`):

```
ActivityHeatmap365.tsx        slide+fullScreen   CertificateNameModal.tsx        fade
CollectibleDropModal.tsx      fade               DeleteAccountConfirmModal.tsx   fade
ExamResultPreviewAdminModal.tsx slide+fullScreen ExplainReportButton.tsx         fade
GlobalBroadcastModal.tsx      fade               IntroFullAccessModal.tsx        fade
LevelUpThresholdModal.tsx     none (драйвер вовне) NotificationPermissionModal.tsx fade
PersonalAdminMessageModal.tsx fade               ReportErrorButton.tsx           fade
ReportPackModal.tsx           fade               ReportUserModal.tsx             fade
ReviewPromptModal.tsx         slide|fade         SeasonRewardInfoModal.tsx       fade
SpeakingPanel.tsx             fade               StatsLearningInsights.tsx       slide
StreakReviveModal.tsx         fade               ThemedChoiceModal.tsx           fade
UpdateModal.tsx               fade               VipSurveyModal.tsx              fade
VipSurveyReviewPromptModal.tsx fade              account/AccountLogoutFlow.tsx   fade
account/NicknameEditModal.tsx fade               youtube/YoutubeChannelPickerSheet.tsx slide
```

Разбор ключевых:

**`UpdateModal.tsx:277-282`** — обновление приложения. Панель имеет 4 темовые палитры
(`DEFAULT/GOLD/OLIVE/SAGE`, `:115-160`), SVG-градиенты (`:198-199`), «wash»-слои — и **ноль движения**.
Единственная хаптика — `hapticTap` (`:265`). Соседний `ReleaseNotesModal.tsx:150-193` (та же семантика,
тот же слот арбитра) имеет `spring(t74/f9)` + два бесконечных loop'а. Два соседа с несовместимой пластикой.

**`StreakReviveModal.tsx:257-263`** — восстановление серии, платное действие. Backdrop
`rgba(2, 4, 10, 0.76)` (`:387`) — **единственный в проекте не-чёрный backdrop** (синеватый). Панель
`styles.pass` с `borderRadius: 30` (`:393`) — «билет». Ни входа, ни выхода. `hapticSuccess` только
после успеха (`:197`).

**`VipSurveyModal.tsx:320`** — 695 строк опроса, `KeyboardAvoidingView`, автоскролл по таймерам
(`:77,102,284`), но переход между шагами не анимирован и появление окна не анимировано.

**`CollectibleDropModal.tsx:72`** — выпадение коллекционного предмета. **Звук есть**
(`:57` `pm.reward.collectible`), **хаптика есть** (`:56` `hapticSuccess`), **движения нет**. Звук и вибрация
играют под статичную картинку — рассинхрон ощущений.

**`IntroFullAccessModal.tsx:151-156`** — «полный доступ» на старте. Использует весь премиальный хром
(`RewardModalBackdrop` + `RewardModalPanelBackdrop opacity 0.72` + `RewardModalLiquidGlass`, `:159-170`),
и при этом **не анимируется вообще и не имеет ни хаптики, ни звука**.

**`StatsLearningInsights.tsx:20`** — вся модалка (шторка «Все показатели») уложена в **одну строку 5,5 КБ**:
`<Modal>`, backdrop `rgba(0,0,0,0.58)`, четыре карточки, восемь языков — всё инлайн-стилями в одном выражении.
Ни `StyleSheet`, ни анимации, ни `TonalSurface`.

### 2.9 Полноэкранные и `presentationStyle="fullScreen"`

- `ActivityHeatmap365.tsx:417-423` — `animationType="slide"` + `presentationStyle="fullScreen"`.
  Системный слайд iOS. Использует `GOLD_RICH` для рампы тепловой карты (`:155`), `useTheme` для фона.
  Выхода своего нет, backdrop не нужен (окно непрозрачное). Хаптики нет ни на одной из трёх кнопок навигации
  (`:426,442,451`) — при том что в проекте `hapticTap` стоит буквально везде.
- `ExamResultPreviewAdminModal.tsx:203-207` — то же, `hapticTap` есть (`:160,172,194,239,356,380,432,468`).
- `PlayerProfileModal.tsx:2457` — 2497 строк, `animationType="none"`, свой вход (`:2374-2382`:
  `timing(slide 300 out-cubic)` + `timing(fade 220)`), backdrop `rgba(0,0,0,0.55)` (`:1232`) статичный,
  переключение уровней `timing(levelSwitchAnim, 380 out-cubic)` (`:754`), панель превью
  `timing(previewPanelAnim, 260 out-cubic)` (`:764`), shimmer `loop(1200↔1200)` (`:2305-2312`) — с проверкой
  `reduceMotion` (`:2301`). Выхода нет.
- `AppMessagesInbox.tsx:1173` — единственный клиент `MotionModal`. **Двойной backdrop:**
  `MotionModal.tsx:70` даёт `rgba(0,0,0,0.42)`, поверх него `AppMessagesInbox.tsx:1174,1405` кладёт
  `rgba(0,0,0,0.56)` → суммарно ≈ **0.74**. Плюс отдельный `<Modal animationType="none" pointerEvents="none">`
  на 1143 для «полёта конверта» — красивая анимация (`timing 720 ease-in-cubic` + скос/поворот/сжатие,
  `:1132-1141`) и «приём» иконкой (`spring 1.28 f4/t160 → 1 f6/t120`, `:258-259`).

### 2.10 Тосты — самая цельная часть системы

**`ActionToast.tsx`** (427) — глобальная очередь тостов.
1. Показывает результат действия поверх любого экрана.
2. Absolute-оверлей, без `<Modal>`; событие `action_toast` через `emitAppEvent`.
3. Вход (`:202-213`): `requestAnimationFrame` → `spring(y 120→0, MOTION_SPRING_LEGACY.toast: t250/f22)` +
   `timing(opacity, MOTION_DURATION.normal = 240)`. Задержка на кадр — сознательная (комментарий `:200-201`, Fabric).
4. Выход (`:215-219`): через `AUTO_DISMISS_MS = 3200` (`:132`) → `timing(y → 120, 240)` + `timing(opacity → 0, 180)`.
   Очередь: следующий тост стартует тоже на новом кадре (`:235-238`).
5. Backdrop — нет (нужен и не нужен).
6. Пять типов: `success | error | info | warning | reward` (`:42`), дедуп по `toastKey`, анти-повтор
   `lastDismissedKey` (`:226-228`).
7. Хаптика по типу (`:172-178`): `hapticError` для error/warning, `hapticSuccess` для success/reward,
   `hapticSoftImpact` иначе. **Звук** (`:44-50, 187-193`): `pm.system.success / error_recoverable / info /
   warning / pm.reward.small`, с `dedupeKey`, `deferAfterVoice`, `rateLimit {4/1000мс}`.
8. Цвета — `themedToastChrome(themeMode)` (`constants/themedToastChrome.ts`, 12 тем). **Единственная поверхность
   с полноценным theme-chrome-модулем.**

**ПРОБЛЕМЫ тостов**
- `ActionToast.tsx` — единственный **не** проверяет `useReduceMotion` из всей тост-группы; для пружины на 250/22
  это заметно.
- Тайминги автозакрытия расходятся без системы: `ActionToast 3200` (`:132`), `AchievementToast 3800` (`:40`),
  `CoachToast 8000` (`:47`), `OfflineBanner 10000` (`:21`). Токена нет.
- `AchievementToast.tsx:457` — внутри тоста живёт **вложенный `<Modal animationType="fade">`** (карточка достижения
  по тапу). Тост — absolute-слой, модалка — нативное окно; при свайпе тоста (`PanResponder`, `:99-146`) в момент
  открытой модалки состояния расходятся.
- `MedalToast.tsx:41` — вход/выход не свои: `anim: Animated.Value` приходит пропом (драйвер в `app/lesson1.tsx`).
  Внутри только drag (`:231-266`, `useNativeDriver: false` для `ValueXY` — **JS-поток**).
- `CoachToast.tsx:110-112` — `spring({tension: 80, friction: 10})`; `AchievementToast.tsx:132-134` —
  `spring({tension: 80, friction: 10})`; `ActionToast.tsx:205-210` — `MOTION_SPRING.toast (250/22)`.
  Три тоста, две разных пружины, одна из них токенизирована.
- `SaveProgressBanner.tsx:198-206` — вход `timing 520 ease-out-cubic`, **выхода нет вообще**.
- `PromoBanner.tsx` — **входа нет**, выход есть (`:135-140` `timing 180` при свайпе).
- `InGameToast.tsx:23-27` — линейный `timing 250 / delay / 250` без easing и без пружины; на фоне
  `themedToastChrome` (богатый хром) это самое плоское движение в проекте.

### 2.11 Гейты и блокирующие оверлеи — вне дизайн-системы

**`ForceUpdateGate.tsx:227-236`**
- Absolute-оверлей `zIndex: 10000, elevation: 10000` поверх всего.
- Цвета: `optional ? 'rgba(11, 11, 18, 0.72)' : '#0b0b12'` — **чистый хардкод**, `useTheme()` вызывается (`:181`),
  но берётся только `themeMode` (для `monoIcon`).
- **Ни входа, ни выхода, ни хаптики, ни звука.** Появляется мгновенным кадром.

**`MaintenanceGate.tsx:119-159` (block) и `:164-175` (banner)**
- Блокирующий режим: `#0b0b12`, иконка на `#431407`, текст `#fff` / `monoIcon(themeMode,'#cbd5e1')` — хардкод.
- Баннер: фон `#7c2d12`, бордер `#9a3412`, `zIndex: 25`. Есть свайп (`PanResponder`, `:100-115`) с
  `timing(translateX, 180)` (`:86`) и `spring(friction: 7)` возвратом.
- Вход у обоих отсутствует.

**ПРОБЛЕМЫ**
- `ForceUpdateGate.tsx:231`, `MaintenanceGate.tsx:124,135,143,155,172,174` — единственные поверхности в
  `components/`, полностью выпавшие из 12-темной системы. В светлых темах (`LIGHT_OCEAN`, `LIGHT_SAKURA`,
  `BUSINESS_LIGHT`, `SAGE_PORCELAIN`) чёрная плита `#0b0b12` — визуальный разрыв.
- Обе — самые «страшные» поверхности приложения (нельзя пользоваться), и обе появляются рывком.

---

## 3. Проблемы, отсортированные по влиянию

### P0 — ломает ощущение «дорого»

| # | Проблема | Файлы:строки |
|---|----------|--------------|
| 1 | **27 модалок без анимации панели** — только RN `fade`/`slide` | список в §2.8 |
| 2 | **Выхода нет у 55 из 66 модалок** (анимированный exit есть у 10: `MotionModal`, `centered_dialog_shell`, `referral_sheet_shell`, `ExplainSheet`, `AiConsentSheetModal`, `MistakeEli5Modal`, `AvatarEditorSheet`, `RegistrationPromptModal`, `dev/DevHubSheet`, `DailyPhraseCard`), из них 8 — мгновенный обрыв (`animationType="none"` + нет exit) | §2.7 |
| 3 | **Флагманы наград без звука**: `LevelGiftModal.tsx:576`, `LevelGiftDualModal.tsx:799`, `LeagueChestOpenModal.tsx:391`, `LevelUpThresholdModal.tsx:142`, `SeasonGiftModal.tsx:358`, `BoonActivatedModal.tsx:145` | там же |
| 4 | **`LevelUpThresholdModal` без хаптики** — кульминация прогресса молчит | `LevelUpThresholdModal.tsx` (весь файл) |
| 5 | **Асимметрия вход/выход у level-up**: spring-подъём → плоский opacity-фейд | `app/_layout.tsx:888-890` vs `:1181,1230` |
| 6 | **`onRequestClose={() => {}}`** — Android «Назад» мёртв на полноэкранной модалке | `LevelUpThresholdModal.tsx:148` |
| 7 | **Написанный, но никогда не исполняемый выход** | `arena/ArenaModeSheet.tsx:131-136` vs `:145` |
| 8 | **`expo-blur` в зависимостях, `BlurView` — 0 импортов** во всём проекте | `package.json:226` |

### P1 — системная несогласованность

| # | Проблема | Файлы:строки |
|---|----------|--------------|
| 9 | **13 разных альф backdrop**, токена нет | 45 файлов; крайние: `StatsPremiumBlur.tsx:268` (.26) … `StreakReviveModal.tsx:387` (.76) |
| 10 | **Backdrop анимируется только у 14 из 66** | см. колонку BD в §1 |
| 11 | **Копипаста шторки ×6** (200/220/380 → 200/180/240) | `referral_sheet_shell.tsx:74-99`, `ExplainSheet.tsx:100-139`, `AiConsentSheetModal.tsx:68-87`, `MistakeEli5Modal.tsx:72-91`, `AvatarEditorSheet.tsx:55-68`, `RegistrationPromptModal.tsx:331-336,1201-1203` |
| 12 | **9 из 17 токенов `MOTION_DURATION` мертвы** — `navPush`, `modalSnap`, `modalDismiss`, `blurFade`, `scrollAdapt`, `bottomSheetOpen`, `bottomSheetClose`, `iconCross`, `actionMode` не импортируются нигде (проверено grep'ом по всему проекту). Живут только `fast/normal/slow/celebrate/shake` | `constants/motion.ts:6-16` |
| 12б | **Один и тот же идентификатор `MOTION_SPRING` означает две разные шкалы**: в трёх файлах это алиас `MOTION_SPRING_LEGACY` (tension/friction), в одном — настоящий reanimated-токен (damping/stiffness/mass). Ровно то, о чём предупреждает комментарий `constants/motion.ts:20-22` | `EnergyBar.tsx:3`, `ActionToast.tsx:9`, `AchievementToast.tsx:22` vs `PopUpActionButton.tsx:12` |
| 13 | **Три параллельные системы длительностей**: `MOTION_DURATION`, `modal_motion_plan` (280/180), литералы | `constants/motion.ts`, `components/modal_motion_plan.ts:6`, 40+ файлов |
| 14 | **Не менее 14 уникальных spring-конфигов** мимо токенов: `{115,12} {110,12} {160,9} {120,9} {200,8} {145,8} {118,12} {170,8} {7,110} {74,9} {80,10} {13,160} {14,170} {16,180,.9} {18,210,.9} {24,260} {22,300}` | `LevelGiftModal.tsx:272,397,398,431`, `BoonChestModal.tsx:106,155,156,182`, `LeagueChestOpenModal.tsx:337`, `ReleaseNotesModal.tsx:150-155`, `CoachToast.tsx:111`, `roulette_win_modal.tsx:76`, `referral_friend_reward_modal.tsx:45`, `ThemedConfirmModal.tsx:94`, `arena/ArenaModeSheet.tsx:38`, `dev/DevHubSheet.tsx:175-179` |
| 15 | **24 анимированные модалки без `useReduceMotion`**, включая все бесконечные `loop` | §1 колонка RM; `AchievementToast`, `AiConsentSheetModal`, `AppMessagesInbox`, `BoonActivatedModal`, `BoonChestModal`, `ExplainSheet`, `LeagueBonusAvailableModal`, `LeagueChestOpenModal`, `LevelGiftDualModal`, `LevelGiftModal`, `LevelSpinRewardModal`, `MistakeEli5Modal`, `NoEnergyModal`, `ReferralWelcomeHost`, `RegistrationPromptModal`, `SeasonGiftModal`, `ThemedConfirmModal`, `WeeklyBoonDetailModal`, `centered_dialog_shell`, `AvatarEditorSheet`, `referral_friend_reward_modal`, `referral_sheet_shell`, `RewardCardV2`, `tournament_ui` |
| 16 | **Стаггер контента есть у 4 поверхностей из 66**: `LevelUpThresholdModal` (интерполяция glow 0.30/0.36/0.38), `PremiumCelebrationModal.tsx:66` (170 мс/строка), `arena/ArenaModeSheet.tsx:39` (45 мс), `LeagueChestTeaserModal.tsx:159` (80 мс) | — |
| 17 | **Три копии одного shake-таймлайна** 9/−11/8/0 (34/34/30/24) | `LevelGiftModal.tsx:421-433`, `LevelGiftDualModal.tsx:547-559`, `BoonChestModal.tsx:172-183` |
| 18 | **Два шелла (`MotionModal`, `centered_dialog_shell`) используются 1 и ~1 раз** | `AppMessagesInbox.tsx:1173`; `centered_dialog_shell` — только «Добавить друга» |
| 19 | **Drag-to-dismiss у 8 поверхностей из 66**, реализован тремя способами: Reanimated `Gesture.Pan` (6 шторок), `PanResponder` (`ThemedConfirmModal`, `AchievementToast`, `MedalToast`, `OfflineBanner`, `PromoBanner`, `MaintenanceGate`, `dev/DevHubSheet`), никак (остальные) | — |
| 20 | **Хаптика отсутствует** на: `AvatarEditorSheet.tsx:65`, `NotificationPermissionModal`, `ReviewPromptModal`, `StatsLearningInsights`, `YoutubeChannelPickerSheet`, `ActivityHeatmap365`, `roulette_win_modal`, `referral_friend_reward_modal`, `RewardCardV2`, `IntroFullAccessModal`, `LevelUpThresholdModal`, `ForceUpdateGate`, `MaintenanceGate` | — |

### P2 — мусор и мелочи

| # | Проблема | Файл:строка |
|---|----------|-------------|
| 21 | **Файл-дубликат** `VipCelebrationModal 2.tsx` (с пробелом в имени) — копия `VipCelebrationModal.tsx` без `memo` | `components/VipCelebrationModal 2.tsx:1-12` |
| 22 | **Мёртвый тернарник** `false ? 'rgba(24,18,10,0.32)' : 'rgba(0,0,0,0.48)'` | `LevelGiftDualModal.tsx:770` |
| 23 | **Мёртвые токены**: `SHARD_MODAL_FRAME_COLORS` и `SHARD_MODAL_ACCENT_GLOW` не импортируются нигде | `constants/shard_modal_chrome.ts:4,12` |
| 24 | **Модалка в одну строку 5,5 КБ**, инлайн-стили, 8 языков в одном выражении | `StatsLearningInsights.tsx:20` |
| 25 | **Двойной backdrop** 0.42 + 0.56 ≈ 0.74 | `MotionModal.tsx:70` + `AppMessagesInbox.tsx:1405` |
| 26 | **Асимметрия scale** 0.94 (вход) vs 0.96 (выход) | `centered_dialog_shell.tsx:74` vs `:84` |
| 27 | **Рассинхрон таймлайнов входа шторки**: opacity 220 мс завершается на 160 мс раньше позиции 380 мс | `referral_sheet_shell.tsx:76-77` (и 5 клонов) |
| 28 | **`Animated.spring({friction: 8})` без `tension`** → дефолт 40, ~800 мс до покоя | `app/_layout.tsx:888,889,973,974` |
| 29 | **Дублирование драйвера level-up** в dev-превью с другими числами | `dev/DevHubSheet.tsx:291-306` vs `app/_layout.tsx:888-890` |
| 30 | **Хардкод палитры вне тем** | `ForceUpdateGate.tsx:231`, `MaintenanceGate.tsx:124,135,143,155,172,174`, `DialogVictoryCelebration.tsx:48` (`PALETTE.backdrop = '#070b10'`) |
| 31 | **`MedalToast` анимируется `useNativeDriver: false`** (ValueXY) — драг в JS-потоке | `MedalToast.tsx:236,245,264` |
| 32 | **`useModalBackdropFade` (`hooks/useModalBackdropFade.ts:17`) намеренно `useNativeDriver: false`** и используется ровно одной модалкой | `WeeklyBoonDetailModal.tsx:37` |
| 33 | **`ThemedBlockingAlertHost` прокидывает пустые пропсы** при пустой очереди → моргание при смене head | `ThemedBlockingAlertHost.tsx:19-31` |

---

## 4. Что уже сделано хорошо (не трогать)

- **`OverlayArbiter.tsx`** — единственная очередь на весь проект, с handoff-gap 360 мс (`:58`) под
  present-after-dismiss на iOS, watchdog 15 с (`:51`) с карантином только для транзиентных ключей
  (`isForceEvictable`, `:152`), fail-soft при отсутствии провайдера (`:180-186`). Это зрелая инфраструктура.
- **`ActionToast`** — единственная поверхность с полным контуром: очередь + дедуп + `themedToastChrome` (12 тем)
  + хаптика по типу + звук с rate-limit + анимированный вход и выход.
- **`MotionModal` + `modal_motion_state.ts`** — правильная модель «держим смонтированным до конца выхода»,
  защищённая от гонок (`closeRun`).
- **`RewardModalBackdrop.tsx`** — честная и производительная подделка стекла градиентами, с явным
  обоснованием отказа от realtime blur (`:64-69`) и исключениями для olive/sagePorcelain (`:76-77`).
- **`LevelUpThresholdModal`** — единственный настоящий каскад раскрытия, построенный на одной `glow`-величине
  с разными `inputRange` (`:119-138`). Приём стоит распространить.
- **`PremiumCelebrationModal`** — самая проработанная хореография: 170 мс/строка, отдельный `finaleHapticTimer`,
  комментарий `:12-13` о причине выбора `hapticTap` вместо `hapticSuccess` (кулдаун 4,5 с в
  `hooks/use-haptics.ts:31`) — это уровень понимания, которого не хватает остальным 85 поверхностям.
