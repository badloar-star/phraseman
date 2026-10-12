# Аудит графики на сыром `accent` в светлой теме (Темы, 12.10 → 13.10)

**Проблема.** У 10 градиентных тем (`grad_aurora`, `grad_iris`, `grad_magma`, `grad_midnight`, `grad_champagne`, `grad_jade`, `grad_orchid`, `grad_ice`, `grad_coral`, `grad_lilac`) в СВЕТЛОМ оформлении сырой `accent` — пастель (у «Авроры» `#7EF0C8`), и на светлом фоне/карточке он даёт 1,0–1,8 (< 3). Начиная с level ≈ 0,55–0,75 (верхний «Акцент» и «Максимум») кольца, полосы, точки, контуры состояний, значки и текст, красящиеся сырым `accent`, там практически невидимы. 13 тонированных тем (graphite … marine) не затронуты (accent/фон ≥ 4,06 на любом уровне). Тёмное оформление не затронуто нигде. **Светлую градиентную тему на «Максимуме» пользователь может выбрать уже сейчас.**

| Тема (светлая) | accent/фон < 3 с level | accent/карточка < 3 с level | минимум (фон / карточка) |
|---|---|---|---|
| grad_aurora | 0,55 | 0,65 | 1,00 / 1,38 |
| grad_iris | 0,65 | 0,70 | 1,25 / 1,59 |
| grad_magma | 0,70 | 0,75 | 1,46 / 1,76 |
| grad_midnight | 0,70 | 0,75 | 1,49 / 1,83 |
| grad_champagne | 0,60 | 0,65 | 1,13 / 1,44 |
| grad_jade | 0,60 | 0,70 | 1,07 / 1,48 |
| grad_orchid | 0,65 | 0,75 | 1,33 / 1,84 |
| grad_ice | 0,60 | 0,65 | 1,04 / 1,31 |
| grad_coral | 0,65 | 0,75 | 1,43 / 1,75 |
| grad_lilac | 0,65 | 0,70 | 1,23 / 1,55 |

**Чем заменять (токены уже есть).** Текст и значки → `accentText` (≥ 4,5 на карточке; у светлой «Авроры» 7,69); графика (кольца, полосы прогресса, дорожки, точки, кромки, контуры состояний) → `accentBorder` (глубокий тон; у светлой «Авроры» ≥ 4,12 на ВСЕХ уровнях) или `progressGradient` для полосы. Заливка кнопки/плашки с текстом `accentInk` под сырым `accent` допустима: текст читается (`accentInk/accent` ≥ 4,98), а кнопка идентифицируется подписью. В тёмном оформлении `accentBorder` ≈ `accent` (оба светлые), поэтому замена ничего не меняет в тёмной теме.

**Метод.** Статический обход `app/` и `components/` (`scripts/light_accent_graphics_scan.mjs`): каждое `<объект>.accent` классифицируется по контексту строки (±4 строки) и имени стиля. Эвристика: строки с подписью «кнопка/чип/плитка/строка» отнесены к кнопкам и в учёт не вошли; полупрозрачные вуали (`accent + '1F'`, `alpha(...)`) и тени — тоже. Это СПИСОК К ПРОВЕРКЕ Дизайном по коду и кадру светлой «Авроры» 1, а не приговор по каждой строке. Определения палитр (`cardPackPaywallTokenTheme`, `medalToastThemeStylesFromTokens`, `v2_theme`, `theory_topic_accents`, `art_tint`, `useSpirePalette`, `ScreenGradient`) в учёт не входят — это источники, не потребители. Осознанное исключение — пометка `light-accent-ok: причина` в строке.

**Сторож-храповик.** `tests/light_accent_graphics_ratchet.test.ts` + `config/light-accent-graphics-baseline.json`: число мест по файлам и общее может только уменьшаться (сейчас **146**); новое место ломает тест — используйте токены выше или пометьте строку.

## 1. Графика, значки и текст на сыром `accent` — вероятно невидимы на светлой «Аврора/Максимум» (66)
| файл:строка | элемент | что стоит | на что заменить |
|---|---|---|---|
| `app/_motion_showcase.tsx:171` | text | `color={disabled ? t.textGhost : t.accent}` | `accentText` (текст ≥ 4,5 на карточке) |
| `app/streak_stats.tsx:867` | text | `color: isToday ? ct.accent : ct.textMuted,` | `accentText` (текст ≥ 4,5 на карточке) |
| `components/friends_together/DevBotsSheet.tsx:79` | text | `<Text style={{ color: t.accent, fontSize: f.caption ?? 12, fontFamily: ds.fontFamily, fontWeight: '700' }}>+1 day</Text>` | `accentText` (текст ≥ 4,5 на карточке) |
| `components/youtube/YoutubeInlinePlayer.tsx:180` | text | `<ActivityIndicator color={chrome.accent} />` | `accentText` (текст ≥ 4,5 на карточке) |
| `components/friends_together/DevBotsSheet.tsx:28` | icon | `const color = tone === 'danger' ? t.wrong : t.accent;` | `accentText` (значок ≥ 4,5; глубокий тон светлой темы) |
| `components/lesson_help_theory_data.tsx:211` | icon | `<Ionicons name={icon} size={17} color={iconColor ?? c.accent} />` | `accentText` (значок ≥ 4,5; глубокий тон светлой темы) |
| `components/SaveToCardsButton.tsx:148` | icon | `color={saved ? colors.accent : colors.text}` | `accentText` (значок ≥ 4,5; глубокий тон светлой темы) |
| `app/streak_stats.tsx:854` | svg | `{!hasDailyData ? (<Circle cx={startDotCx} cy={yZero} r={4.5} fill={ct.accent}/>) : chartLen === 1 && raw[0] > 0 ? (<Circle cx={LIFETIME_LINE_COL_W / 2` | `accentBorder` (кольцо/линия) или `progressGradient` (полоса) |
| `app/streak_stats.tsx:855` | svg | `{pointsPink.length > 0 ? (<Polyline points={pointsPink} fill="none" stroke={ct.accent} strokeOpacity={0.38} strokeWidth={2.25}/>) : null}` | `accentBorder` (кольцо/линия) или `progressGradient` (полоса) |
| `app/streak_stats.tsx:856` | svg | `{pointsRed.length > 0 ? (<Polyline points={pointsRed} fill="none" stroke={ct.accent} strokeWidth={2.75}/>) : null}` | `accentBorder` (кольцо/линия) или `progressGradient` (полоса) |
| `components/mistakes-panel/PanelKit.tsx:71` | svg | `stroke={g.accent}` | `accentBorder` (кольцо/линия) или `progressGradient` (полоса) |
| `components/ui/V2Countdown.tsx:142` | svg | `stroke={low ? P.danger : P.accent}` | `accentBorder` (кольцо/линия) или `progressGradient` (полоса) |
| `app/(tabs)/lessons.tsx:1780` | graphic-prop | `haloColor={current ? theme.accent : undefined}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/ai_companion_session.tsx:537` | graphic-prop | `dotColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/ai_dialog_session.tsx:3268` | graphic-prop | `remainingColor={voiceInputStatus === 'listening' ? t.textOnGold : t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/flashcards_recall_session.tsx:1127` | graphic-prop | `selectionColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/flashcards_swipe.tsx:3486` | graphic-prop | `edgeColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/flashcards_swipe.tsx:3558` | graphic-prop | `edgeColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/flashcards_swipe.tsx:4194` | graphic-prop | `edgeColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/lesson_complete.tsx:1599` | graphic-prop | `edgeColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/lesson1.tsx:1233` | graphic-prop | `cursorColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/streak_stats.tsx:1210` | graphic-prop | `inactiveColor={accentTint(t.accent, 'quiet')}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/streak_stats.tsx:1619` | graphic-prop | `inactiveColor={isGoldTheme ? GOLD_RICH.bronzeWash : accentTint(t.accent, 'quiet')}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/feedback/ComboRing.tsx:72` | graphic-prop | `const ringColor = level >= 1 ? t.gold : t.accent;` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/feedback/HybridRefreshControl.tsx:24` | graphic-prop | `tintColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/flashcards/CollectionLimitHeader.tsx:45` | graphic-prop | `const barColor = ratio >= 1 ? t.wrong : ratio >= 0.75 ? t.gold : t.accent;` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/home/DayRings.tsx:164` | graphic-prop | `const announceTrackColor = useMemo(() => withAlphaColor(t.accent, 0.1), [t.accent]);` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/home/HomeSectionPulseButton.tsx:80` | graphic-prop | `const fill = accented ? t.accent : t.bgSurface2;` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/profile-card/profile_card_sheet_paint.ts:53` | graphic-prop | `selection: g.accent,` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/SpeakingButton.tsx:146` | graphic-prop | `remainingColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `components/SpeakingButton.tsx:181` | graphic-prop | `remainingColor={t.accent}` | `accentBorder` (цвет кольца/полосы/кромки/точки передаётся в компонент) |
| `app/(tabs)/community.tsx:144` | border | `style={[s.tab, { borderBottomColor: on ? p.accent : 'transparent' }]}` | `accentBorder` (контур состояния) |
| `app/flashcards/DeckSelectionTile.tsx:251` | border | `borderColor: selected ? t.accent : t.textGhost,` | `accentBorder` (контур состояния) |
| `app/lesson_complete.tsx:1607` | border | `borderWidth: 0, borderColor: t.accent,` | `accentBorder` (контур состояния) |
| `components/feedback/TransitionBridge.tsx:94` | border | `<View style={[styles.iconRing, { backgroundColor: t.accentBg, borderColor: t.accent }]}>` | `accentBorder` (контур состояния) |
| `components/feedback/VictoryBurst.tsx:123` | border | `{ backgroundColor: t.bgCard, borderColor: t.accent },` | `accentBorder` (контур состояния) |
| `components/GlassSurface.tsx:86` | border | `? { borderTopWidth: 1, borderTopColor: glassFill(t.accent, 0.14) }` | `accentBorder` (контур состояния) |
| `components/NotificationPermissionModal.tsx:134` | border | `<TouchableOpacity testID="notification-permission-confirm" onPress={onConfirm} activeOpacity={0.85} style={{ width: '100%', backgroundColor: t.accent,` | `accentBorder` (контур состояния) |
| `components/youtube/YoutubeChannelTabs.tsx:40` | border | `style={[styles.tab, active && { borderBottomWidth: 2 /* shadow-ok: подчёркивание активной вкладки — индикатор выбора, не контейнер */, borderBottomCol` | `accentBorder` (контур состояния) |
| `app/flashcards_blitz_session.tsx:1505` | fill-graphic | `{ backgroundColor: danger ? BAD : blitzGlass.accent, transformOrigin: 'left' },` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/flashcards_swipe.tsx:3974` | fill-graphic | `<View style={[styles.progressFill, { width: `${progressPct}%` as `${number}%`, backgroundColor: t.accent }]} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/lesson_irregular_verbs.tsx:1073` | fill-graphic | `<Animated.View style={{ height: 4, width: thumbW, borderRadius: 2, backgroundColor: glass.accent, transform: [{ translateX: thumbTranslate }] }} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/lesson_irregular_verbs.tsx:1115` | fill-graphic | `<KitProgressFill ratio={allVerbs.length > 0 ? learnedTotal / allVerbs.length : 0} style={{ backgroundColor: glass.accent }} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/lesson_words.tsx:3473` | fill-graphic | `<KitProgressFill ratio={words.length > 0 ? learnedTotal / words.length : 0} style={{ backgroundColor: glass.accent }} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/mistakes_hub.tsx:225` | fill-graphic | `<View style={[styles.legendDot, { backgroundColor: g.accent }]} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/preposition_drill.tsx:408` | fill-graphic | `<KitProgressFill ratio={total > 0 ? (itemIdx + 1) / total : 0} style={{ backgroundColor: glass.accent }} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/referrals.tsx:724` | fill-graphic | `backgroundColor: spinCredits > 0 ? glassFill(t.bgSurface, 0.46) : t.accent,` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/achievements/AchievementShelfCarousel.tsx:309` | fill-graphic | `{ backgroundColor: index === indicator.active ? t.accent : t.textGhost + '55' },` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/ActionToast.tsx:223` | fill-graphic | `<View style={[styles.accentRail, { backgroundColor: chrome.accent }]} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/ActionToast.tsx:629` | fill-graphic | `<View style={[styles.accentRail, { backgroundColor: chrome.accent }]} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/feedback/ResultsSequence.tsx:899` | fill-graphic | `style={[styles.pulseGlow, { backgroundColor: t.accent }]}` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/feedback/ResultsSequence.tsx:1129` | fill-graphic | `style={[styles.ctaPrimary, pulseMode ? null : styles.glassDefaultCta, { backgroundColor: t.accent }]}` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/FeedbackRatingCard.tsx:352` | fill-graphic | `{ backgroundColor: text.trim() === '' && rating === 0 ? glassFill(t.bgCard, 0.6) : t.accent },` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/home/HomeSectionPulseButton.tsx:88` | fill-graphic | `<Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.accent }, haloStyle]} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/lesson_help_theory_ui.tsx:236` | fill-graphic | `<Animated.View style={{ height: 4, width: thumbW, borderRadius: 2, backgroundColor: c.accent, transform: [{ translateX: thumbTranslate }] }} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/level-exam/ExamGlassParts.tsx:88` | fill-graphic | `<View style={[styles.trackFill, { backgroundColor: glass.accent, width: `${r * 100}%` }]} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/mistakes-panel/PanelKit.tsx:128` | fill-graphic | `{/* guard-ok: ровно три полоски */ [0, 1, 2].map((i) => <View key={i} style={[styles.miniDot, { backgroundColor: i < n ? g.accent : g.glassEdge }]} />` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `components/theory/TheoryLessonView.tsx:679` | fill-graphic | `{ backgroundColor: glass.accent, width: `${progressPct}%` },` | `accentBorder` (точка/полоса/дорожка) или `progressGradient` |
| `app/achievements_screen.tsx:1090` | gradient-graphic | `}, [f.body, f.caption, f.h3, f.sub, lang, stateMap, t.accent, t.bgCard, t.bgSurface, t.bgSurface2, t.border, t.borderHighlight, t.shadowDark, t.textMu` | `progressGradient` / [`accentBorder`, `accentBorder`] |
| `components/feedback/HybridRefreshControl.tsx:25` | gradient-graphic | `colors={[t.accent]}` | `progressGradient` / [`accentBorder`, `accentBorder`] |
| `components/modal_fx/HybridSheetShell.tsx:384` | gradient-graphic | `colors={[`${glowColor \|\| t.accent}1F`, 'transparent']}` | `progressGradient` / [`accentBorder`, `accentBorder`] |
| `components/packs/PackRow.tsx:105` | gradient-graphic | `const colors = useMemo(() => [mixDark(g.accent, g.deepBase, 0.3), mixDark(b, g.deepBaseAlt, 0.34)] as const, [g.accent, g.deepBase, g.deepBaseAlt, b])` | `progressGradient` / [`accentBorder`, `accentBorder`] |
| `components/ui/v2_ui.tsx:419` | gradient-graphic | `colors={[palette.accent, palette.okGradA]}` | `progressGradient` / [`accentBorder`, `accentBorder`] |
| `app/lingman_video_watch.tsx:181` | switch | `<WatchProgress videoId={videoId} durationSec={video?.durationSec} trackColor={g.opaqueControl} fillColor={g.accent} />` | `accentBorder` (дорожка включённого переключателя) |
| `app/streak_stats.tsx:1168` | switch | `trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : accentTint(t.accent, 'quiet')}` | `accentBorder` (дорожка включённого переключателя) |
| `app/streak_stats.tsx:2304` | switch | `<StatProgressRow key={item.label} percent={item.percent} label={item.label} icon={item.icon} accent={item.color} accentSoft={item.color + 'AA'} trackC` | `accentBorder` (дорожка включённого переключателя) |

## 2. Заливки без подписи кнопки — проверить элемент (29)
Полоса/точка/дорожка → `accentBorder`; кнопка с иконкой без текста (отправка, микрофон) — иконка внутри должна быть `accentInk`, тогда оставить.
| файл:строка | элемент | что стоит | на что заменить |
|---|---|---|---|
| `app/_motion_showcase.tsx:144` | fill-unknown | `{ backgroundColor: item.approval === 'accepted' ? t.accent : t.bgCard },` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/(tabs)/lessons.tsx:5003` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_companion_session.tsx:132` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_companion_session.tsx:365` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_dialog_briefing.tsx:66` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_dialog_session.tsx:2157` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_dialog_session.tsx:2579` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_dialog_session.tsx:3239` | fill-unknown | `backgroundColor: voiceInputStatus === 'listening' ? t.accent : t.bgSurface,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_dialog_session.tsx:3281` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_dialog_session.tsx:3365` | fill-unknown | `backgroundColor: canSend ? t.accent : t.bgSurface,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/ai_dialog_session.tsx:3587` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/flashcards_swipe.tsx:3494` | fill-unknown | `backgroundColor: startBlockReason ? t.bgSurface2 : t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/flashcards_voice_picker.tsx:417` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/flashcards/CollectionListView.tsx:966` | fill-unknown | `backgroundColor: g.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/flashcards/FlashcardsCategoryTiles.tsx:91` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/lesson_complete.tsx:491` | fill-unknown | `backgroundColor: glass.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/referral_access_ended_modal.tsx:238` | fill-unknown | `backgroundColor: glass.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/referrals.tsx:698` | fill-unknown | `style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: spinCredits >` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/streak_stats.tsx:1592` | fill-unknown | `<View testID="stats-primary-metric-selector" style={{ flexDirection: 'row', borderRadius: 12, padding: 3, backgroundColor: isGoldTheme ? GOLD_RICH.bro` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/streak_stats.tsx:1706` | fill-unknown | `<View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? GOLD_RICH.wash ` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `app/streak_stats.tsx:2516` | fill-unknown | `<View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isGoldTheme ? GOLD_RICH.wash : accentTint(t.accent), alignItems: 'center', ju` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/account/NicknameEditModal.tsx:556` | fill-unknown | `backgroundColor: glass.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/AiDialogBriefingScreen.tsx:337` | fill-unknown | `backgroundColor: t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/CombinedLessonBreakdown.tsx:91` | fill-unknown | `backgroundColor: weak ? t.wrong : t.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/friends/FriendsGlassKit.tsx:147` | fill-unknown | `backgroundColor: disabled ? glass.opaqueControl : primary ? glass.accent : glass.opaqueControl,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/lessons/LessonMenuGlass.tsx:298` | fill-unknown | `<View style={{ width: `${ratio * 100}%`, minWidth: 7, height: 7, borderRadius: 4, backgroundColor: glass.accent }} />` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/lessons/LessonsListGlassCard.tsx:188` | fill-unknown | `<View style={{ width: `${pct}%`, minWidth: 6, height: 6, borderRadius: 4, backgroundColor: glass.accent }} />` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/SaveToCardsButton.tsx:124` | fill-unknown | `{ backgroundColor: colors.accent },` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |
| `components/settings/StudyLanguagePicker.tsx:337` | fill-unknown | `backgroundColor: glass.accent,` | проверить элемент: полоса/точка → `accentBorder`; кнопка с текстом — оставить |

## 3. Алиасы и передача цвета в компонент — проверить потребителя (51)
Сам `accent` здесь только переименовывается или передаётся; важно, чем красит получатель.
| файл:строка | элемент | что стоит | на что заменить |
|---|---|---|---|
| `app/(tabs)/lessons.tsx:5315` | pass-prop | `accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}` | проверить получателя: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/lessons.tsx:5341` | pass-prop | `accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}` | проверить получателя: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/lessons.tsx:5368` | pass-prop | `accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}` | проверить получателя: график → `accentBorder`, текст/значок → `accentText` |
| `components/energy/EnergyAttemptsHud.tsx:88` | pass-prop | `accent={g.accent}` | проверить получателя: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/home.tsx:2110` | alias | `const tileArt = (name: Parameters<typeof resolveThemedArt>[0], fallback: number) => { const r = resolveThemedArt(name, homeArtTone); return { art: (r.` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/lessons.tsx:1750` | alias | `? theme.accent` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/lessons.tsx:1840` | alias | `? theme.accent` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/lessons.tsx:1862` | alias | `? theme.accent` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/lessons.tsx:1922` | alias | `? theme.accent` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/(tabs)/lessons.tsx:5993` | alias | `const chapterAccent = isGoldTheme ? goldCefrAccent(chapterLevel).accent : t.accent;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/flashcards_swipe.tsx:3646` | alias | `const selectedAccent = t.accent;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/flashcards/CardsHubV2.tsx:73` | alias | `return [g.accent, g.accentBorder];` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/flashcards/PhraseCard.tsx:533` | alias | `const accent = packTheme?.borderAccent ?? t.accent;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/lesson_complete.tsx:1281` | alias | `accent: t.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/settings_themes.tsx:79` | alias | `ink: glass.level === 'calm' ? glass.text : glass.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/streak_stats.tsx:1120` | alias | `const scoreAccent = isGoldTheme ? GOLD_RICH.champagne : isBusiness ? t.accent : metrics.scoreColor;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/streak_stats.tsx:1167` | alias | `accentSoft={isGoldTheme ? GOLD_RICH.paleGold : isBusiness ? t.accent : metrics.scoreColor + 'B0'}` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/streak_stats.tsx:1209` | alias | `accentSoft={isGoldTheme ? GOLD_RICH.paleGold : isBusiness ? t.accent : metrics.scoreColor + 'CC'}` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/streak_stats.tsx:2612` | alias | `? (isToday ? t.textPrimary : t.accent)` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `app/streak_stats.tsx:2654` | alias | `accent: t.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ActivityHeatmap365.tsx:180` | alias | `const palette = useMemo(() => heatPalette(themeMode, t.accent), [themeMode, t.accent]); // зачем: рампа пересчитывается только при смене темы, не на к` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ActivityHeatmap365.tsx:249` | alias | `const palette = useMemo(() => heatPalette(themeMode, t.accent), [themeMode, t.accent]); // зачем: рампа пересчитывается только при смене темы, не на к` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/DialogsTabContent.tsx:343` | alias | `const accent = t.accent;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/DialogsTabContent.tsx:566` | alias | `accent: t.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/home/DayRings.tsx:158` | alias | `lesson: t.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/home/DayRings.tsx:160` | alias | `cards: lighten(t.accent, 0.18),` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/home/DayRings.tsx:161` | alias | `}), [t.accent, t.gold]);` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/icons/LiveStreakFlame.tsx:45` | alias | `const themeAccent = glassTheme.accent;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/lesson_help_theory_ui.tsx:59` | alias | `accent: t.accentText ?? t.accent ?? sx.second,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/mistakes-panel/panelPaint.ts:27` | alias | `return [g.accent, g.accentBorder];` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/PaywallPlus.tsx:57` | alias | `function markFill(g: GlassTokens): string { return g.level === 'accent' \|\| g.level === 'max' ? g.accent : g.text; }` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:83` | alias | `heroAccent: theme.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:84` | alias | `selectedCardBorder: theme.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:85` | alias | `selectedCardBg: glassAlpha(theme.accent, '26'),` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:89` | alias | `selectedCardShadow: theme.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:90` | alias | `ctaBg: theme.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:92` | alias | `ctaShadow: theme.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:93` | alias | `pillBg: glassAlpha(theme.accent, '22'),` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:94` | alias | `pillText: theme.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:95` | alias | `pillBorder: glassAlpha(theme.accent, '52'),` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:96` | alias | `expandBtnText: theme.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/paywall/paywallShared.tsx:97` | alias | `expandBtnBorder: glassAlpha(theme.accent, '52'),` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ReviewPromptModal.tsx:87` | alias | `const accent = glass.accent;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/SpeakingPanel.tsx:246` | alias | `accent: t.accent,` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/StatsPremiumBlur.tsx:219` | alias | `const ctaBg = vivid ? g.accent : g.cta;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ui/v2_sheet.tsx:123` | alias | `const bg = ghost ? P.elev : danger ? P.danger : P.accent;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ui/v2_sheet.tsx:194` | alias | `const fg = color ?? (tone === 'accent' ? P.accent` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ui/v2_ui.tsx:333` | alias | `const fg = tone === 'stars' ? P.gold : tone === 'gems' ? P.accent : tone === 'miss' ? P.danger : P.text;` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ui/v2_ui.tsx:462` | alias | `mixWithAlpha(P.accent, mix + (highlighted ? 0.1 : 0)),` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/ui/v2_ui.tsx:463` | alias | `mixWithAlpha(P.accent, Math.max(0, mix - 0.08)),` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |
| `components/youtube/YoutubeInlinePlayer.tsx:182` | alias | `), [chrome.accent]);` | проверить потребителя алиаса: график → `accentBorder`, текст/значок → `accentText` |

## 4. Learning V2 (Codex) — только список, без правок (34)
- `app/learning-v2/session/[id].tsx:1495` (icon) `<Ionicons name={meta.icon} size={19} color={meta.accent} />`
- `app/learning-v2/session/[id].tsx:1533` (gradient-graphic) `colors={[meta.accent, "#5872FF"]}`
- `app/learning_v2_direct_session_player_v1.tsx:2845` (fill-graphic) `backgroundColor: g.accent,`
- `app/learning_v2_intro_theme.ts:33` (alias) `theme.accent !== theme.textOnCard &&`
- `app/learning_v2_intro_theme.ts:34` (alias) `contrastOnReaderSurfaces(theme.accent) >= 4.5`
- `app/learning_v2_intro_theme.ts:36` (alias) `return theme.accent;`
- `app/learning_v2_intro_theme.ts:44` (alias) `return fallback ?? theme.accent;`
- `app/learning_v2_modes_showcase_run/[family].tsx:119` (alias) `host.phase === 'success' ? t.accent : host.canSubmit ? t.accent : t.bgSurface,`
- `app/learning_v2_modes_showcase_run/[family].tsx:250` (fill-graphic) `backgroundColor: t.accent,`
- `app/learning_v2_session_intro.tsx:552` (fill-unknown) `progressIndex <= safeIndex && { backgroundColor: g.accent },`
- `app/_learning_v2_modes_showcase.tsx:96` (icon) `<Ionicons name="play" size={16} color={t.accent} />`
- `components/learning-v2/horizons/art.ts:52` (svg) `return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 330"><defs><linearGradient id="rim" x2="1" y2="1"><stop stop-color="${p.accent}"/><st`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:231` (text) `style={[styles.buttonText, { color: primary ? t.correctText : p.accent }]}`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:238` (icon) `color={primary ? t.correctText : p.accent}`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:253` (icon) `<Ionicons name={icon} size={17} color={p.accent} />`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:272` (text) `<Text style={[styles.eyebrow, { color: p.accent }]}>`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:297` (fill-unknown) `{ backgroundColor: chapter === i + 1 ? p.accent : p.surface },`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:312` (text) `<Text style={[styles.eyebrow, { color: p.accent }]}>`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:351` (svg) `stroke={p.accent}`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:391` (alias) `done \|\| row.state === "current" ? p.accent : p.surface2`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:393` (graphic-prop) `haloColor={row.state === "current" ? p.accent : undefined}`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:498` (icon) `<Ionicons name="chevron-back" color={p.accent} size={20} />`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:529` (icon) `<Ionicons name="chevron-forward" color={p.accent} size={20} />`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:533` (text) `<Text style={[styles.eyebrow, { color: p.accent }]}>`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:549` (alias) `completed >= (i + 1) * 8 ? p.accent : p.edge,`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:637` (fill-unknown) `backgroundColor: indexLevel === i ? p.accent : p.surface,`
- `components/learning-v2/horizons/LearningV2Horizons.tsx:691` (icon) `color={p.accent}`
- `components/learning-v2/horizons/model.ts:168` (alias) `accent: theme.accent, terrain: theme.bgSurface, terrain2: theme.bgSurface2,`
- `components/learning-v2/LearningV2ChaptersCourse.tsx:297` (fill-graphic) `})}</View> : <View style={[styles.chapterTrack, { backgroundColor: g.opaqueControl }]}><View style={[styles.chapterTrackFill, { backgroundColor: g.acc`
- `components/learning-v2/LearningV2Glass.tsx:87` (alias) `if (state === 'completed') return { face: g.accent, ink: g.accentInk };`
- `components/learning-v2/LearningV2Glass.tsx:245` (graphic-prop) `const bg = disabled ? g.opaqueControl : ghost ? g.plateFillFrom : g.accent;`
- `components/learning-v2-lab/LearningV2ModesLab.tsx:59` (icon) `<Ionicons name="sparkles" size={28} color={theme.accent} />`
- `components/learning-v2-lab/ModeDemoPlayer.tsx:124` (alias) `const zoneTone = mode.group === 'understand' ? t.accent : mode.group === 'sound' ? t.gold : mode.group === 'build' ? t.correct : t.accent;`
- `components/learning-v2-lab/ModeDemoPlayer.tsx:157` (text) `<Text style={[styles.simChipText, { color: t.accent }]}>СИМУЛЯЦИЯ</Text>`
