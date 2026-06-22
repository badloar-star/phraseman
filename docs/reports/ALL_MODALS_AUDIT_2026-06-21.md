# Мастер-аудит редизайна ВСЕХ пользовательских модалок Phraseman

Дата: 2026-06-21
Тип: единый дизайн-аудит + план редизайна (синтез по 11 семействам модалок)
Код НЕ менялся. Это проектный документ для реализации.

---

## 1. Краткое резюме

Аудит охватил **11 семейств** пользовательских модалок (праздник/награды, бонусы дня, лига/сезон, арена, пейволл/монетизация, онбординг, решения/подтверждения, системные сообщения, социальное/жалобы, учебные шторки) — суммарно **~95 файлов-модалок/оверлеев** (ключевых редизайн-целей ≈ **75**, плюс хосты и экраны-оркестраторы).

Главный диагноз один и тот же во всех семьях — **у приложения нет единого языка модалок**. Симптомы:

- **Раскол на «поколения»**: почти в каждой семье соседствуют 2-3 несовместимых визуальных диалекта (богатый Reanimated-материал рядом с плоской `t.bgCard`-карточкой на нативном `fade`). Три модалки про «тебе упала ценность» выглядят «из трёх разных приложений».
- **Бумажное конфетти** (то, что пользователь прямо ненавидит) — живёт только в двух семьях: **Арена** (две независимые реализации плоских прямоугольников: `ArenaConfettiBurst` и `RankChangeModal.ConfettiPiece`) и **Лига** (`LeagueResultModal.ConfettiPiece`). В остальных семьях конфетти нет — но и **премиальной замены празднику тоже нет**: успех почти нигде не отмечается.
- **Плоские панели без глубины**: подавляющее большинство модалок — это центрированная карточка на `rgba(0,0,0,0.55–0.72)` с нативным `animationType="fade"`. Ни параллакса, ни лучей, ни жидкого блика.
- **Два движка анимации**: новый **Reanimated 4.1** (UI-поток) использован лишь точечно (`ProfileCardMotionFx`, `ShineOverlay`, `GiftOpenEffects`, `PremiumCelebrationModal`), а 80% модалок сидят на устаревшем JS-driver `Animated` — один и тот же эффект написан дважды.
- **Эмодзи как «герой»**: 🚀 🛠️ ⚠️ 📣 🏆 🥇 🚩 ⏰ 😔 ⚔️ — дёшево, не масштабируется по Dynamic Type, ломает премиум-тон.
- **Цвет-по-контексту сломан или отсутствует**: у каждой модалки своя хардкод-таблица цветов (до 66 строк в `NoEnergyModal`), а семантика местами инвертирована — `ArenaLimitModal` красит апсейл в `t.wrong` (красный = «наказание» вместо «доступно с Premium»).
- **Мёртвый код-балласт**: ветки `false ? ...`, `isCompassTheme = false`, `USE_ELITE_* = true`, мёртвый ярус `'confetti'` — следы выпиленной светлой/компас-темы и старых A/B-тестов в десятках файлов.
- **Готовая премиум-инфраструктура простаивает**: `RewardModalBackdrop` / `rewardModalGlowLayers` / `ShineOverlay` / `ProfileCardMotionFx` уже написаны и «дорогие», но переиспользуются лишь в редких местах.

**Вывод:** редизайн — это не рисование с нуля, а **сборка единого языка из уже существующих премиум-примитивов** + удаление дубликатов и конфетти. Один источник правды по цвету, один материал панели, один словарь движения в трёх регистрах.

---

## 2. Таблица семейств

| # | Семья | Приоритет | Модалок (≈) | Суть редизайна (1 строка) |
|---|-------|-----------|-------------|----------------------------|
| 1 | Премиум и продажа (Paywall) | **P0** | 20 | Один «Liquid Gold Depth»: один источник золота, один материал панели, floating-depth вход; убрать красный из апсейла. |
| 2 | Праздник и награды (Reward) | **P0** | 22 | Всё через расширенный `RewardCardV2`; убить «поколение B»; единый accent + общий burst; улёт ценности к счётчику. |
| 3 | Арена: матч и ранг | **P0** | 6 | Удалить ОБА бумажных конфетти; единый `ArenaCinematicFx` (всплывающие осколки + лучи), Reanimated. |
| 4 | Лига и сезонные итоги | **P1** | 5 | Единый «Podium Light»: общий подиум, energy-shards вместо конфетти, убрать emoji-медали. |
| 5 | Бонусы дня и возвращения (Boons) | **P1** | 4 | Один герой `BoonChestStage` + `BoonAuroraBackdrop`; reveal сундука как момент (вспышка + шарды). |
| 6 | Онбординг и первое знакомство | **P1** | 7 | Единый `FirstRunScene` (пыль + лучи + sheen); поднять «бедные три» до уровня онбординга; убрать эмодзи-замок. |
| 7 | Учебные шторки в уроке | **P1** | ~10 | Единый `LearningSheet` (стекло над `RewardModalBackdrop`); цвет-по-контексту; energy-shards на успех. |
| 8 | Социальное и жалобы | **P2** | ~11 | Единый `TrustSheet`; одна форма-жалоба; ProfileCardMotionFx для всех; light-rays на успех. **+ почин локализации VIP-опроса.** |
| 9 | Решения и подтверждения | **P2** | 6 | Единый `DecisionPanel`; row-кнопки (отмена слева/действие справа); tone-цвет; деструктив = красный. |
| 10 | Системные блоки и сообщения | **P2** | 9 | Единый `SystemShell` (calm/rich); сапфир/янтарь/золото по контексту; убрать `#0b0b12`-вьюхи и эмодзи. |
| 11 | Бонусы-деталь / служебное | в составе семей | — | (поглощается семьями выше) |

Итого ключевых редизайн-целей: **≈ 75 модалок** в **10 рабочих семьях**.

---

## 3. Единая дизайн-система модалок

Цель — чтобы любая модалка собиралась **композицией существующих примитивов**, а её «личность» задавалась одним пропом `accent` (+ опц. `warmShift`). Никаких новых движков с нуля.

### 3.1. Фон и материал панели (один на всех)

- **Материал**: тёмная стеклянная карта, `borderRadius 20–28`, `overflow:hidden`, `border 1px hairline`. Внутри 3 слоя глубины из `RewardModalBackdrop.tsx`:
  1. градиент-плита `rewardModalPanelColors(themeMode)`;
  2. верхний световой блик `topHighlight` из `rewardModalGlowLayers(accent)`;
  3. нижняя цветная вуаль `bottomVeil`, окрашенная в accent контекста.
- **Фото-webp-бэкдропы** (лес/золото/коралл) → перевести на **процедурный градиент-материал** (темо-независим, легче, не «дерётся» с текстом скримами). Исключение — где фото-сцена осмысленна (онбординг welcome).
- **Затемнение фона**: единое значение, бэкдроп затемняется отдельным timing-ом параллельно входу панели (параллакс входа).

### 3.2. Цвет-по-контексту (ОДИН источник правды)

Расширить уже существующий `rewardModalGlowLayers(accent, warmShift)` (он отдаёт `topHighlight / bottomVeil / ringStroke / ringInnerGlow`). Поверх него — тонкие семантические функции на семью (`paywallContextAccent`, `standingsAccent`, `arenaCinematicPalette`, `systemModalAccent`, `learningSheetAccentFor`, `tone`-проп). Единый словарь акцентов:

| Контекст | Accent | warmShift |
|----------|--------|-----------|
| Продажа / подписка / celebration | золото `#E8C36C → #B9852E` | — |
| Подарок (intro/loyalty/referral) | тёплый янтарь + «дарящий» зелёный | золото |
| Лимит энергии / арены | янтарь `#F4D889` (**НЕ красный**) | — |
| Осколки / наборы | сапфир `#6FB1FF` | — |
| Стрик / возрождение | огонь `#FF7A1A` | угольно-тёплый |
| Социальное (ачивка/реферал/жалоба-юзер) | сирень `#D8A6FF` / коралл `#F0A35E` | — |
| Повышение/победа/трон | изумруд→золото `#34C759 → #FFD24A` | золото |
| Понижение/поражение | сдержанный гранат `#FF6B6B → #7A1A1A` (без золота, без праздника) | — |
| Доверие/безопасность (registration) | сапфир `#6EA8FF` | — |
| Модерация (жалоба-набор/ошибка) | сине-стальной сапфир `#6EA8FF` | — |
| Тревога (warning/billing) | янтарь `#F2A03D` (красный — ТОЛЬКО реальный бан) | — |
| Деструктив (удаление аккаунта) | `t.wrong` красный | — |
| Редкость коллекций | строго из `COLLECTIBLE_RARITY_COLORS` | — |

**Правило:** один accent прокрашивает ВСЁ — кольцо, кикер-засечку, нижнюю вуаль, лучи, искры, CTA-градиент. `GiftOpenEffects.PALETTE` сделать общим экспортом, чтобы accent карточки и accent взрыва были тождественны.

### 3.3. Типографика (одна лестница)

Через `theme.f` (убрать сырые `fontSize`-литералы):

- **Кикер/eyebrow**: 11–13px, `letterSpacing 2.0–2.5`, `weight 900`, UPPERCASE, цвет accent, двусторонняя градиент-засечка.
- **Заголовок**: `f.h2` (+2 для hero), `weight 900`, `letterSpacing -0.2…-0.35`.
- **Тело**: `f.body`, `weight 600`, muted, `lineHeight 1.5`.
- **Большое число награды/счёта** (осколки/XP/X:Y/место): отдельный крупный numeric-стиль (донор — `BonusXPCard`), `tabular-nums`, 56–76px, `weight 900`, мягкая цветная тень в accent. **Сейчас этого стиля не хватает дропу/осколкам/сезону.**
- **Лейблы кнопок**: `f.body`, `weight 700`.
- **Запрет эмодзи-героев**: 🚀🛠️⚠️📣🏆🥇🚩⏰😔⚔️ → Ionicons/SVG-жетоны в кольце-медальоне. Медали 1/2/3 → градиентные металл-фольга жетоны; стрелки Δ → `trending-up/down`.
- **Запрет слов «ошибка/wrong» в негативе** (жалобы, mistake-разбор) — тёплый тон, без loss-framing.

### 3.4. Плашки, кольцо, hero

- **Hero-эмблема**: круг/скруглённый icon-shell с двойным светящимся кольцом (`ringStroke` + `ringHaloOuter`/`ringInnerGlow`). Заменяет ВСЕ эмодзи, плоские кружки и Ionicons-бейджи.
- **Eyebrow-капсула** (контекст-метка) — общий `SystemPill`/`kickerRow`.
- **Reason / ценность** — одна строка под значением.
- **Карточки задач/причин/планов** — единые pill-карточки: soft-surface + accent-glow рамка при выборе + галочка.

### 3.5. Кнопки

- **Первичная CTA** — всегда объёмная (материал `PremiumGoldButton` для золота / `DuoPressable` 3D / `rewardModalPrimaryButtonColors`) + **liquid sheen** поверх (общий `GoldSheen`/`ShineOverlay`).
- **Вторичная** — ghost («Позже/Не сейчас/Отмена»).
- **Раскладка**: ВСЕГДА row, **отмена слева (ghost) / действие справа (filled)**. Перенос в column — только если лейблы не влезают по measure, а не по умолчанию (чиним главный баг `ThemedConfirmModal`).
- **Деструктив**: action справа красная; до подтверждения притушена.

### 3.6. Движок анимации — 3 регистра (всё на Reanimated 4.1, UI-поток, NO confetti)

Все три регистра собираются из общих суб-компонентов: `ProfileCardMotionFx` (Spark/HoloSweep/breath/EliteAura/частицы), `ShineOverlay`/`SheenBand` (жидкий блик), `GiftOpenEffects` (burst по ярусам), `RewardModalBackdrop` (глоу-слои). Все уважают **reduce-motion** (`AccessibilityInfo`, паттерн уже в `ProfileCardMotionFx`).

**Регистр A — «Спокойный» (decisions, system, learning, social, briefing):**
- Вход: панель всплывает из глубины — `spring` `translateY 16–24→0` + `scale 0.92–0.96→1` + opacity; backdrop затемняется параллельно.
- Дыхание hero-кольца (breath), 1 медленный диагональный sheen раз в ~5с.
- Параллакс: слой частиц/вуаль смещается на 4–6px относительно текста при наклоне/нажатии.

**Регистр B — «Праздничный» (reward, boons, league-up, arena-win, celebration):**
- Всё из «спокойного» +:
- **Energy shards вместо конфетти**: 6–12 гранёных осколков-ромбов цвета accent с внутренним glow — **всплывают вверх по дугам** с разным delay/scale/blur и тают (~1.1с). Парят, не сыплются. Донор — `Spark` из `ProfileCardMotionFx`.
- **God-rays / лучи света**: 3–4 конических луча из-под иконки/крышки сундука, медленно вращаются (~14с) + пульс opacity.
- **Reveal-вспышка**: кольцо `scale-pop 1→1.12→1` + вспышка `ringInnerGlow` 0→1→0.4 за ~220мс, синхронно с вылетом шардов и haptic.
- **Оседание ценности**: после CTA число/иконка НЕ исчезает — одним парящим пузырём улетает к своему счётчику в шапке (`fly-out` из `RewardStackV2` → общий хук).

**Регистр C — «Тревожный/сдержанный» (demote, warning, billing, force-update, delete-confirm):**
- Вход тот же спокойный, но **БЕЗ праздника**: нет sheen-вспышек, нет золота.
- Частицы (если есть) **оседают вниз**, opacity гаснет.
- Приглушённый гранат/янтарь; деструктив — мягкая тревожная пульсация кольца + `energy-ring` импульс в момент подтверждения.

**reduce-motion везде**: статичный мягкий ореол (`GiftOpenEffects.StaticGlow` / `ProfileCardMotionFx` StaticGlow).

### 3.7. Очередь и оркестрация

- Любые **2+ награды подряд** идут ТОЛЬКО через `RewardStackV2` (одна карточка + стопка + «Забрать всё»). **Запрет парада отдельных `Modal`.**
- `app/lesson_complete.tsx` оркеструет очередь медаль/подарок/дроп через стек, не показывает модалки параллельно.
- Монтаж через `OverlayArbiter`/`useOverlayVisible` **не трогаем** (критично для антифриза холодного старта) — меняем только визуальный слой внутри карточки, не claim-логику и порядок `markClaimed → grant`.

### 3.8. Гигиена кода (сквозная)

- Снести мёртвые ветки `false ? ...`, `isCompassTheme = false`, мёртвый ярус `'confetti'`.
- `USE_ELITE_*`-разветвления → одно «elite»-состояние по умолчанию.
- Удалить ручные хардкод-таблицы цветов (редкость, темы) — заменить общими функциями accent.

---

## 4. По каждой семье: «Сейчас → Станет»

### Семья 1 — Премиум и продажа (Paywall) · P0

**Сейчас:** три несовместимых диалекта — фото-reward-бэкдроп (intro/loyalty, текст мёртво-белый, анимация = нативный fade), богатый «paywall chrome» (paywall_a/b/c, вход на legacy `Animated`), и «per-theme chrome» с хардкод-таблицами на 8 тем (66 строк в `NoEnergyModal`). `ArenaLimitModal` красит апсейл в красный. Три «золота», три материала панели. Эталон моторики уже есть — `PremiumCelebrationModal` (aurora, ring-spin, проезд камеры, sheen, без конфетти).

**Станет:** один «Liquid Gold Depth» — один процедурный золотой материал, один источник золота (`paywallContextAccent`), floating-depth вход на Reanimated, опциональный `AuroraBackground` за hero, общий `GoldSheen` на ВСЕ золотые CTA, parallax-hero с ring-spin. Лимиты перекрашиваются в янтарь (НЕ красный). Снести `false ?`-ветки и хардкод-таблицы.

**Модалки:** `paywall_a/b/c.tsx`, `IntroFullAccessModal.tsx`, `LoyaltyGiftModal.tsx`, `manage_subscription.tsx`, `PremiumCelebrationModal.tsx` (эталон), `VipCelebrationModal.tsx` (обёртка, не трогать), `EntitlementExpiredHost.tsx`, `BillingIssueToastHost.tsx`, `StatsPremiumBlur.tsx` (донор `GoldSheen`), `promo_code_entry.tsx`, `CardPackShardPaywallModal.tsx` (сапфир), `personal_plan_thank_you.tsx`, `PromoBanner.tsx` (перекрасить из `#3b1d6e`), `referral_access_ended_modal.tsx`, `NoEnergyModal.tsx`, `ArenaLimitModal.tsx` (**КРИТ: убрать красный**), `EnergyRefillShardModal.tsx`.

### Семья 2 — Праздник и награды (Reward) · P0

**Сейчас:** раскол на «поколение A» (эталон `RewardCardV2` + `RewardStackV2` со стопкой и веер-улётом) и «поколение B» (самописные `LevelGiftModal` 889 строк, `CollectibleDropModal` со своим overlay/fade, тосты-баннеры). Три хардкода редкости (`RARITY_BORDER`, `giftAccent`, `COLLECTIBLE_RARITY_COLORS`) — три модалки про «упала ценность» как из трёх приложений. Правильный движок `GiftOpenEffects` (Reanimated, без конфетти) уже есть, но v2-карточка на старом `Animated`. Мёртвый ярус `'confetti'` и ветки `false ?` повсюду.

**Станет:** ВСЁ через расширенный `RewardCardV2` (тосты = «компакт»-режим карточки). Убить «поколение B». Единый accent, общий `GiftOpenBurst` для ВСЕХ ярусов всех модалок, holo-параллакс на арт, универсальный fly-out к счётчику. Перевести пульс/вход с JS-`Animated` на Reanimated 4.1 + параллакс-наклон. Крупный numeric для осколков/XP.

**Модалки:** `RewardCardV2.tsx` (эталон), `RewardStackV2.tsx` (лучший паттерн), `RewardModalBackdrop.tsx`, `ShardRewardModal.tsx` (образец), `ShardsEarnedModal.tsx` (слить с Shard), `CollectibleDropModal.tsx`, `LevelGiftModal.tsx`, `LevelGiftDualModal.tsx` (→ через стек), `MedalToast.tsx`, `AchievementToast.tsx`, `DailyTaskRewardToast.tsx`, `ReleaseWaveBonusModal.tsx`, `BonusXPCard.tsx` (донор numeric), `GiftOpenEffects.tsx` (движок), `StreakReviveModal.tsx`, `ProfileCardUpgradeModal.tsx` (референс motion), + экраны `app/pack_opening.tsx`, `app/lesson_complete.tsx` (оркестратор), `app/level_gifts_inventory.tsx`, `app/achievements_screen.tsx`, `app/collectibles_screen.tsx`, `app/referral_access_activated_modal.tsx`.

### Семья 3 — Арена: матч и ранг · P0

**Сейчас:** два движка (Reanimated `ArenaFinalScoreOverlay` vs legacy `RankChangeModal`) и **ДВА независимых бумажных конфетти** (`ArenaConfettiBurst` + `RankChangeModal.ConfettiPiece`). `ThroneRewardModal` ушёл в `RewardCardV2` и потерял арена-драму. Эмодзи ⚔️🚀⬇️ в заголовках. Цвет захардкожен в каждом файле.

**Станет:** единый кинематографичный слой `arena/ArenaCinematicFx.tsx` — **удалить ОБА конфетти**, заменить на FloatingShards (всплытие вверх, параллакс 3 слоя глубины, glow). Общие RaysHalo (конический), liquid sheen, parallax-вход, score-pulse как «удар» на кольцо. `RankChangeModal` мигрировать на Reanimated. `ThroneRewardModal` остаётся на `RewardCardV2`, но сверху монтируется shards+rays. Тир — только в обводку кольца.

**Модалки:** `ArenaFinalScoreOverlay.tsx`, `RankChangeModal.tsx`, `ThroneRewardModal.tsx`, `ArenaConfettiBurst.tsx` (→ заменить целиком), `MatchFoundToast.tsx`, `ArenaDuelEmojiReact.tsx`.

### Семья 4 — Лига и сезонные итоги · P1

**Сейчас:** два языка — «легаси Animated» (`LeagueResultModal` с бумажным `ConfettiPiece` и текстовой ✦, emoji-медалями 🥇🥈🥉, плоским подиумом) и «премиум reward-палитра» (`LeagueChestOpenModal`/`LeagueBonusAvailableModal`). `SeasonResultModal` беднейший (52px-emoji 🏆, голый fade). Подиум есть только в одном месте. Три цветовые системы исхода.

**Станет:** единый «Podium Light» на Reanimated — `standingsAccent(outcome)` вместо 3 систем, общий `<StandingsPodium>` (вынести из `LeagueResultModal`, переиспользовать в Season/Chest), крупное число 56–64px, energy-shards + god-rays вместо конфетти, металл-фольга жетоны мест вместо emoji. Понижение = сдержанное «оседание света» вниз, без праздника.

**Модалки:** `LeagueResultModal.tsx` (флагман), `LeagueChestOpenModal.tsx`, `LeagueBonusAvailableModal.tsx`, `RankChangeBanner.tsx`, `SeasonResultModal.tsx`.

### Семья 5 — Бонусы дня и возвращения (Boons) · P1

**Сейчас:** 3 из 4 Host-модалок — побайтовый copy-paste StyleSheet (`MysteryMonday`/`Comeback`/`PerfectWeek`), различаются только accent. Reveal сундука **не существует как момент** — `open()` мгновенно меняет текст. Голое затемнение, премиум-слои (`RewardModalBackdrop`/glow) не подключены. `WeeklyBoonDetailModal` выпал из тона.

**Станет:** один герой `BoonChestStage` + контейнер `BoonAuroraBackdrop` (на Reanimated 4.1), переиспользуемые всеми четырьмя; серия держится на ОДНОМ материале, перекрашиваемом по контексту (индиго/изумруд/золото + warmShift). Reveal как событие: вспышка кольца + вылет energy-shards + haptic, ПОТОМ смена текста. Парение/глубина, вращающиеся лучи «свет изнутри сундука». Detail — приглушённая на 40% аурора, без reveal.

**Модалки:** `MysteryMondayHost.tsx` (эталон reveal), `ComebackBoonHost.tsx`, `PerfectWeekHost.tsx`, `WeeklyBoonDetailModal.tsx`.

### Семья 6 — Онбординг и первое знакомство · P1

**Сейчас:** три поколения «дороговизны» — премиальное (`onboarding` с готовыми частицами, `lesson_intro_screens` с киношными expo-out фейдами), среднее (`DailyTasksFirstVisitModal` — мёртв в проде, `SaveProgressBanner`), дешёвое (`RegistrationPromptModal` с эмодзи-замком 🛡️/🔐 56px, `ReferralWelcomeHost` плоский gift-кружок, `compass_briefing_modal` — 0 анимаций, хардкод шрифтов).

**Станет:** единый `FirstRunScene` — глубокая сцена с парящей пылью (`useFloatingDust` из готовых `ONBOARDING_BACKGROUND_PARTICLES`), god-rays, liquid-sheen по канту. Hero-кольцо вместо эмодзи/плоских кружков. Цвет-по-контексту: welcome=золото, registration=сапфир (безопасность), referral=изумруд, compass=тема. Единый `DuoPressable` CTA + ShineOverlay. Energy-shards на подарок.

**Модалки:** `onboarding.tsx` (эталон темпа/частиц), `lesson_intro_screens.tsx` (эталон кино), `DailyTasksFirstVisitModal.tsx` (образец карточек), `RegistrationPromptModal.tsx` (самый датированный), `SaveProgressBanner.tsx` (синхронизировать, не переверстывать), `ReferralWelcomeHost.tsx`, `compass_briefing_modal.tsx` (самый бедный).

### Семья 7 — Учебные шторки в уроке · P1

**Сейчас:** два языка — «тихие» нижние шторки (`ExplainSheet`, `MistakeEli5Modal` — клоны, плоское `accent1F`-свечение, Reanimated запрещён правилом) и «центральные» карты (`QuizTimeoutModal` с эмодзи ⏰ 52px и 😔, `SpeakingPanel`). `DailyPhraseCard` — лучший по motion, но всё на legacy `Animated`, фон плоский `t.bgCard`. `RewardModalBackdrop` используется только в `ActivityHeatmap365`. Скелетоны — статичные серые полоски.

**Станет:** единый `LearningSheet` — стеклянная панель над `RewardModalBackdrop`, многослойная глубина (гало + parallax-орб + бегущий sheen). Снять запрет Reanimated для входа. `learningSheetAccentFor(kind)`: explain=сапфир, mistake=тёплый янтарь (НЕ красный), timeout=коралл, speaking-passed=зелёный. Energy-shards на успех (обобщить `<LearningShardsBurst>` из success-кольца DailyPhrase). Skeleton → accent-shimmer. Убрать эмодзи → орб-иконки.

**Модалки:** `ExplainSheet.tsx` (эталон bottom-sheet/подсветки англ.), `MistakeEli5Modal.tsx`, `QuizTimeoutModal.tsx`, `SpeakingPanel.tsx`, `DailyPhraseCard.tsx` (лучший motion), `ActivityHeatmap365.tsx` (уже на backdrop), `hint.tsx`, `trainer_smart_session.tsx` + `personal_plan_exercise.tsx` (инлайн-фидбэк).

### Семья 8 — Социальное и жалобы · P2

**Сейчас:** богатый `PlayerProfileModal` (но `ProfileCardMotionFx` включён только при prestige — у 95% юзеров профиль статичен, премиум-бейдж = дешёвый opacity-loop) vs нищие формы-жалобы (плоские `bgCard` + emoji 🚩✅⏳ как иконки, нативный fade, успех = просто текст). Три почти идентичные формы-жалобы дублируют верстку. **КРИТ-баг прода: `VipSurveyModal` и `VipSurveyReviewPromptModal` — половина копи английские заглушки во всех языках кроме ru/uk** (сломанная локализация).

**Станет:** единый `TrustSheet` (матовое стекло, спокойная глубина). Accent-по-контексту: профиль=золото, жалоба-юзер=коралл, жалоба-набор/ошибка=сапфир, VIP=изумруд, review=золото. Одна форма-жалоба (reason-чипы → светящиеся pill + галочка). ProfileCardMotionFx для ВСЕХ (тихий sheen на карте 0). Light-rays + щит на успех вместо текста. **Сначала починить локализацию VIP-опроса.**

**Модалки:** `PlayerProfileModal.tsx` (флагман), `ReportUserModal.tsx`, `ReportPackModal.tsx` (каноничная форма), `ReportErrorButton.tsx`, `ExplainReportButton.tsx`, `VipSurveyModal.tsx` (**локализация!**), `VipSurveyReviewPromptModal.tsx` (**локализация!**), + хосты `arena_results.tsx`, `club_screen.tsx`, `LeagueChatPanel.tsx`, `friends.tsx`.

### Семья 9 — Решения и подтверждения · P2

**Сейчас:** «плоская карточка + затемнение», нативный `fade`, анимации фактически нет. `ThemedConfirmModal` — кнопки stacked-column (отмена СВЕРХУ — нарушение раскладки), мёртвый `isCompassTheme=false` раздувает каждый стиль до 4 тернарников, деструктив рисуется обычным `t.accent` (красного нет). Правильная row-раскладка живёт ТОЛЬКО в `DeleteAccountConfirmModal`. `CertificateNameModal` выпадает (хардкод-золото `#d4a017`). Шесть членов — шесть разных карточек (radius 14/16/18/20, border 0/0.5/1).

**Станет:** единый `DecisionPanel` — стеклянная плита из глубины, 3 слоя, медальон-кольцо с иконкой контекста. Проп `tone`: neutral (accent темы), destructive (`t.wrong` + тревожная пульсация + energy-ring при совпадении слова «УДАЛИТЬ»), ceremonial (золото-токен, шампань-вуаль, золотые осколки), focus/commit (огонь). Row-кнопки всегда (отмена слева/действие справа). Спокойный вход на Reanimated.

**Модалки:** `ThemedConfirmModal.tsx` (станет эталоном), `ThemedChoiceModal.tsx`, `DeleteAccountConfirmModal.tsx`, `CertificateNameModal.tsx`, `settings_notifications.tsx` (TimeModal), `streak_stats.tsx` (ставка серии — bottom-sheet, одеть в материал).

### Семья 10 — Системные блоки и сообщения · P2

**Сейчас:** два лагеря — «сырые» полноэкранные гейты на голых инлайн-стилях (`ForceUpdateGate`/`MaintenanceGate` — захардкоженный `#0b0b12`, эмодзи 🚀/🛠️, индиго-кнопка `#6366f1` мимо всех тем, ноль анимации) и «богатые» (`UpdateModal` со статичным SVG-фоном и палитрами на 50 строк, `ReleaseNotesModal` — единственный с движением, но legacy `Animated` и shine = белая палка). Мёртвый `isCompassTheme=false` в каждом файле. Три дизайна для одного сообщения «обнови».

**Станет:** единый `<SystemModalShell kind accent intensity>` для всех 9 — стеклянная панель из `RewardModalPanelBackdrop`, значок-капсула с Ionicons вместо эмодзи. `systemModalAccent(kind)`: блок/force/maintenance=сапфир-сталь, warning=янтарь (не красный), broadcast/release=золото, inbox/permission=accent темы. Движок `SystemShellMotionFx` (Reanimated): всплытие-вход, парящие световые пятна, god-rays, liquid sheen, breath + редкие энергошарды. `intensity:'calm'` для блокирующих гейтов, `'rich'` для broadcast/release.

**Модалки:** `ForceUpdateGate.tsx`, `MaintenanceGate.tsx`, `UserWarningModal.tsx`, `NotificationPermissionModal.tsx`, `ReleaseNotesModal.tsx`, `GlobalBroadcastModal.tsx`, `AppMessagesInbox.tsx` (детальный экран), `UpdateModal.tsx`, `ThemedBlockingAlertHost.tsx` (хост — не трогать, редизайн через ThemedChoiceModal).

---

## 5. Рекомендованный порядок реализации (волнами)

**Волна 0 — Фундамент (общие примитивы, без видимого UI).** Расширить `rewardModalGlowLayers` до полного словаря accent; вынести `GiftOpenEffects.PALETTE` в общий экспорт; сделать общий хук `useFlyToCounter` (из `RewardStackV2`); общий `GoldSheen`/`SheenBand`-обёртка; общий `<FloatingShards>` / `<LearningShardsBurst>` / `<RaysHalo>`; общий `useFloatingDust`. Снести сквозной мёртвый код (`false ?`, `isCompassTheme`, ярус `'confetti'`). Это разблокирует все семьи.

**Волна 1 — P0, максимум денег и максимум «дешевизны».**
1. **Арена** — удалить ОБА бумажных конфетти (самая видимая боль пользователя), собрать `ArenaCinematicFx`.
2. **Reward** — расширить `RewardCardV2`, перевести «поколение B» (`LevelGiftModal`/`CollectibleDropModal`/тосты) на v2-тело, общий burst + fly-out.
3. **Paywall** — единый золотой материал + floating-depth вход + `ArenaLimitModal` красный→янтарь (порча конверсии и семантики).

**Волна 2 — P1, эмоциональные пики.**
4. **Лига** — вырезать конфетти, общий подиум, energy-shards.
5. **Boons** — `BoonChestStage`, reveal-момент сундука.
6. **Learning Sheets** — `LearningSheet`, shards на успех.
7. **Онбординг** — `FirstRunScene`, поднять «бедные три».

**Волна 3 — P2, доверие и системность.**
8. **Social & Reporting** — `TrustSheet` + **СНАЧАЛА почин локализации VIP-опроса** (это баг прода, не дизайн-долг).
9. **Decisions** — `DecisionPanel`, row-кнопки, деструктив-красный.
10. **System** — `SystemModalShell`, убрать `#0b0b12`-гейты и эмодзи.

**Принцип волн:** Волна 0 даёт всем семьям общие детали; дальше — по убыванию «видимой дешевизны × влияния на выручку». Конфетти (Арена+Лига) и сломанная локализация (VIP) — приоритетные «кровотечения», их закрыть раньше косметики.

---

## 6. Топ модалок для HTML-макетов в первую очередь (6–10)

Эти макеты должны зафиксировать **систему**, а не отдельные экраны: каждый выбран как **камертон своего регистра/семьи**, на котором согласуются цвет, типографика и движение до того, как тиражировать.

1. **`RewardCardV2` (расширенный) — БАЗОВЫЙ КАМЕРТОН.** Это анатомия всего «праздничного» регистра (кикер→кольцо→заголовок→крупное число→reason→CTA→fly-out). Утвердив его, мы определяем половину дизайн-системы. Показать 3 ценностных яруса (common/epic/legendary) + компакт-режим (бывший тост).
2. **`paywall_a` (Liquid Gold Depth).** Самый дорогой для выручки экран и эталон «золотого материала» + floating-depth входа. Камертон золота для всей монетизации.
3. **`ArenaFinalScoreOverlay` (с FloatingShards вместо конфетти).** Визуально доказывает замену бумажного конфетти на всплывающие осколки+лучи — главная боль пользователя. Камертон «праздника без бумаги».
4. **`MysteryMondayHost` / `BoonChestStage` (reveal сундука).** Показывает «момент раскрытия» (вспышка кольца + energy-shards), которого сейчас нет вообще. Камертон серии и reveal-драматургии.
5. **`LeagueResultModal` (Podium Light).** Содержит общий `<StandingsPodium>`, который переиспользуется в Season/Chest — утвердив подиум и energy-shards-на-повышение vs сдержанное-оседание-на-понижение, закрываем регистры B и C разом.
6. **`DecisionPanel` (на базе ThemedConfirmModal).** Камертон «спокойного» регистра и tone-системы (neutral/destructive/ceremonial) — фиксирует row-кнопки, медальон и материал для самой массовой группы утилитарных модалок.
7. **`SystemModalShell` (ForceUpdate calm + ReleaseNotes rich).** Один макет с переключателем `intensity` показывает, как одна оболочка обслуживает и серьёзный блок, и праздничный анонс — камертон унификации «бедных родственников».
8. **`TrustSheet` — форма-жалоба + успех (light-rays/щит).** Камертон «спокойной глубины» и премиальной замены текстовому «✅ отправлено»; одна форма заменяет три копии верстки.

*(Опционально 9–10, если есть бюджет на макеты:)*
9. **`IntroFullAccessModal`** — высочайший по конверсии «подарочный» янтарно-зелёный вариант, чтобы отделить «подарок» от «продажи» внутри золотого языка.
10. **`LearningSheet` (ExplainSheet + success-shards)** — камертон учебного регистра: спокойствие + тонкая глубина без отвлечения от обучения.

**Почему именно эти:** 1–3 закрывают P0 и самые денежно/эмоционально нагруженные моменты; 4–5 фиксируют праздничные регистры B/C; 6–8 утверждают спокойный и системный регистры на массовых утилитарных модалках. Вместе восемь макетов покрывают ВСЕ три регистра движения и ВСЕ ключевые контексты accent — остальные ~67 модалок собираются их композицией без новых дизайн-решений.

---

## Итог простым языком

- Проверили все всплывающие окна в приложении — их около 75 штук в 10 группах, и сейчас они выглядят как из разных приложений: где-то дорого и живо, где-то плоско и дёшево.
- Главные проблемы: летающие «бумажки» (конфетти) в окнах арены и лиги, которые ты не любишь; много плоских окон без глубины; одинаковые по смыслу окна окрашены по-разному и анимированы по-разному.
- Нашли отдельную настоящую поломку: в опросах для VIP половина текста осталась на английском почти во всех языках — это надо чинить в первую очередь, это не про красоту.
- Предложили единый стиль для всех окон: один «дорогой» материал фона, один набор цветов «по смыслу», один способ оживления в трёх настроениях — спокойное, праздничное и тревожное. Праздник делаем не бумажками, а парящими光-искрами и лучами света.
- Расписали порядок работы волнами: сначала общие детали, потом убираем конфетти и чиним продающие окна, потом эмоциональные моменты, в конце — служебные окна.
- Выбрали 8 главных окон, для которых стоит сначала нарисовать примеры-макеты: на них утверждается общий стиль, а все остальные окна потом собираются по их образцу.
- Код мы не меняли — это план, по которому можно делать редизайн.
