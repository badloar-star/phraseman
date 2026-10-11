# Миграция «акцент как текст» (список мест)

Governance-ID: TG-7995A0B31502

## Outcome
Подготовлен список мест в экранах стор-сборки, где цвет акцента темы красит ТЕКСТ или ЗНАЧОК (`color:` / `color=`): 261 мест в 72 файлах. После того как Темы выпустят токен `accentText` (акцент, затемнённый до ≥ 4.5:1 на карточке в светлом оформлении; в тёмном = акцент), эти места переходят на него. Правка кода в этом документе НЕ выполняется — только список.

## Scope
Только чтение. Затем (после токена Тем) — замены в списке и сторож по образцу `accent_ink_on_accent_fill_contract`.

## Architecture
Различаем два назначения акцента: ЗАЛИВКА (текст на ней — `textOnGold`/`accentInk`, уже сделано) и ТЕКСТ/ЗНАЧОК на светлой карточке (нужен `accentText`). `t.textSecond` = `g.cta` — тоже акцент: в светлом оформлении при accent/max у градиентных тем бледный (1.4–1.8:1 на белой карточке). `t.gold` = `accentBright` — тот же класс.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Часть мест стоит на тёмных или цветных заливках (скрим, кнопка, картинка) — им `accentText` не нужен; их отсеиваем при замене по колонке «Заливка рядом». Эвристика заливки смотрит 12 строк вверх и неточна.

## Verification
После токена: типы, контрактные тесты, сторож «текст акцентом на светлой карточке без `accentText`», кадры Сверки в светлой «Максимум» (grad_aurora, grad_iris, grad_magma).

## Rollback
Откатить коммит замен.

## Сводка

| Токен | Мест |
|---|---|
| `accent` | 129 |
| `textSecond` | 78 |
| `gold` | 42 |
| `cta` | 9 |
| `accentBright` | 3 |

Из них рядом заливка акцента/cta (эвристика, 26): текст на акценте — проверить отдельно, возможно уже `textOnGold`/ошибочная пара.

## Порядок миграции
1. Swipe (`app/flashcards_swipe.tsx`): перевод в карточке (`translationText`, `trueFalseTranslation`), «Показать ответ» (иконка и подпись), подсказки.
2. Экраны релиза по приоритету: Главная, Уроки, Диалоги, Видео, Карточки, Профиль, Монеты, пейволы, вход.
3. Остальное по таблице ниже, сверху — файлы с наибольшим числом мест.

## Список (файл · строка · токен · заливка · что красится)

#### `components/DialogVerdictScreen.tsx` — 18

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 274 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>` |
| 332 | `textSecond` | `scene.hue + '26'` | `color: t.textSecond,` |
| 426 | `textSecond` | `glassFill(t.bgCard` | `style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', flex: 1 }}` |
| 451 | `accent` | `t.accentBg` | `<Ionicons name="bulb-outline" size={15} color={t.accent} />` |
| 452 | `accent` | `t.accentBg` | `<Text style={{ color: t.accent, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }}>` |
| 470 | `textSecond` | `—` | `color: t.textSecond,` |
| 494 | `accent` | `glassFill(t.bgCard` | `<Ionicons name="school-outline" size={15} color={t.accent} />` |
| 495 | `accent` | `glassFill(t.bgCard` | `<Text style={{ color: t.accent, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }} maxFontSizeMultipl` |
| 520 | `accent` | `t.accentBg` | `<Ionicons name="chatbubble-ellipses-outline" size={14} color={t.accent} />` |
| 521 | `accent` | `t.accentBg` | `<Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '800' }} maxFontSizeMultiplier={1.2}>` |
| 536 | `textSecond` | `—` | `style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.42) }}` |
| 563 | `textSecond` | `—` | `style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.42) }}` |
| 636 | `accent` | `—` | `style={{ color: t.accent, fontSize: f.numLg, fontWeight: '700', letterSpacing: -1 }}` |
| 731 | `textSecond` | `—` | `color: t.textSecond,` |
| 746 | `accent` | `—` | `<Ionicons name="bulb-outline" size={14} color={t.accent} style={{ marginTop: 2 }} />` |
| 748 | `textSecond` | `—` | `style={{ color: t.textSecond, fontSize: f.body, flex: 1, lineHeight: Math.round(f.body * 1.42) }}` |
| 778 | `accent` | `glassFill(t.bgCard` | `<Ionicons name="school-outline" size={16} color={t.accent} />` |
| 833 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.body, flex: 1 }} maxFontSizeMultiplier={1.2}>` |

#### `app/ai_dialog_session.tsx` — 16

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 2437 | `accent` | `t.accentBg` | `<Ionicons name="flag" size={14} color={t.accent} />` |
| 2448 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontWeight: '400' }}>{currentGoal.labelRu}</Text>` |
| 2502 | `accent` | `t.accentBg` | `<Ionicons name="bulb" size={18} color={t.accent} />` |
| 2503 | `accent` | `t.accentBg` | `<Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>` |
| 2647 | `gold` | `—` | `<Ionicons name="create-outline" size={15} color={t.gold} style={{ marginTop: 2 }} />` |
| 2656 | `gold` | `—` | `<Text style={{ color: t.gold, fontWeight: '700' }}>{fixByIndex[i].corrected}</Text>` |
| 2692 | `gold` | `t.goldBg` | `<Ionicons name="create-outline" size={13} color={t.gold} />` |
| 2693 | `gold` | `t.goldBg` | `<Text style={{ color: t.gold, fontSize: f.label, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>` |
| 2797 | `accent` | `—` | `color: t.accent,` |
| 3006 | `textSecond` | `glassFill(t.bgSurface` | `style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}` |
| 3082 | `textSecond` | `—` | `color: t.textSecond,` |
| 3246 | `textSecond` | `voiceInputStatus === 'listening' ? t.accent : t.` | `<ActivityIndicator size="small" color={t.textSecond} style={{ marginTop: -5 }} />` |
| 3251 | `textSecond` | `—` | `color={voiceInputStatus === 'listening' ? t.textOnGold : t.textSecond}` |
| 3383 | `accent` | `—` | `color: voiceInputStatus === 'listening' ? t.accent : t.textMuted,` |
| 3400 | `accent` | `—` | `<Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '800' }}>` |
| 3420 | `accent` | `—` | `<Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '800' }}>` |

#### `app/flashcards/CardPackShardPaywallModal.tsx` — 15

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 440 | `gold` | `—` | `style={{ fontSize: Math.round(size * 0.82), fontWeight: '900', color: t.gold }}` |
| 652 | `accent` | `—` | `<Ionicons name={iconName} size={42} color={t.accent} />` |
| 658 | `textSecond` | `—` | `color: t.textSecond,` |
| 679 | `textSecond` | `—` | `color: t.textSecond,` |
| 705 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>` |
| 836 | `accent` | `—` | `<Ionicons name={iconName} size={42} color={t.accent} />` |
| 842 | `gold` | `—` | `color: t.gold,` |
| 890 | `textSecond` | `—` | `<Ionicons name={iconName} size={22} color={t.textSecond} />` |
| 892 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>{meta}</Text>` |
| 907 | `gold` | ``${t.gold` | `<Ionicons name="alert-circle-outline" size={20} color={t.gold} />` |
| 908 | `gold` | ``${t.gold` | `<Text style={{ flex: 1, color: t.gold, fontSize: f.body, fontWeight: '700', lineHeight: lh(22) }}>` |
| 935 | `accent` | `—` | `<Ionicons name={iconName} size={42} color={t.accent} />` |
| 941 | `textSecond` | `—` | `color: t.textSecond,` |
| 981 | `textSecond` | `—` | `<Ionicons name={iconName} size={22} color={t.textSecond} />` |
| 983 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>{meta}</Text>` |

#### `app/referrals.tsx` — 14

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 587 | `accent` | `t.bgSurface` | `<Ionicons name={spinReady ? 'sparkles-outline' : 'person-outline'} size={22} color={spinReady ? t.accent : t.t` |
| 593 | `accent` | `t.bgSurface` | `<Text style={{ color: spinReady ? t.accent : t.textMuted, fontSize: f.sub ?? 13, fontWeight: '700', marginTop:` |
| 634 | `textSecond` | `t.bgCard` | `<Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily, fontWeight: '700' }}>?</` |
| 652 | `accent` | `spinCredits > 0 ? t.accentBg : glassFill(t.bgSur` | `<Ionicons name="key-outline" size={15} color={spinCredits > 0 ? t.accent : t.textSecond} />` |
| 653 | `accent` | `spinCredits > 0 ? t.accentBg : glassFill(t.bgSur` | `<Text style={{ color: spinCredits > 0 ? t.accent : t.textSecond, fontSize: f.sub ?? 13, fontFamily: ds.fontFam` |
| 659 | `textSecond` | `spinCredits > 0 ? t.accentBg : glassFill(t.bgSur` | `<Text testID="referrals-condition-hint" style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 19, f` |
| 676 | `accent` | `—` | `<Text testID="referrals-pro-coins-hint" style={{ color: t.accent, fontSize: f.sub ?? 13, lineHeight: 19, fontF` |
| 729 | `accent` | `spinCredits > 0 ? glassFill(t.bgSurface` | `? <ActivityIndicator color={spinCredits > 0 ? t.accent : t.textOnGold} />` |
| 730 | `accent` | `spinCredits > 0 ? glassFill(t.bgSurface` | `: <Ionicons name="share-social" size={19} color={spinCredits > 0 ? t.accent : t.textOnGold} />}` |
| 763 | `accent` | `glassFill(t.bgSurface` | `<Ionicons name="ticket-outline" size={18} color={t.accent} />` |
| 794 | `accent` | `—` | `<Ionicons name="gift-outline" size={18} color={t.accent} />` |
| 807 | `accent` | `t.bgSurface` | `<Text testID="referrals-my-code-value" style={{ color: t.accent, fontSize: f.h2 ?? 22, fontWeight: '700', lett` |
| 818 | `accent` | `codeCopied ? t.accentBg : t.bgSurface` | `<Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={20} color={codeCopied ? t.accent : t.textSeco` |
| 848 | `textSecond` | `glassFill(t.bgSurface` | `<Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 19, fontWeight: '400' }}>` |

#### `app/flashcards_swipe.tsx` — 11

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 3478 | `textSecond` | `startBlockReason ? t.bgSurface2 : t.accent` | `<Ionicons name={startBlockReason?.icon ?? 'play'} size={20} color={startBlockReason ? t.textSecond : t.textOnG` |
| 3479 | `textSecond` | `startBlockReason ? t.bgSurface2 : t.accent` | `<Text style={[styles.heroStartText, { color: startBlockReason ? t.textSecond : t.textOnGold, fontSize: f.body ` |
| 3532 | `accent` | ``${t.accent` | `<Ionicons name="sparkles-outline" size={22} color={t.accent} />` |
| 3641 | `accent` | `glassFill(t.bgSurface` | `<Ionicons name="albums-outline" size={26} color={t.accent} />` |
| 3941 | `gold` | ``${t.gold` | `<Ionicons name="flame-outline" size={12} color={t.gold} />` |
| 3942 | `gold` | ``${t.gold` | `<Text style={[styles.headerStreakText, { color: t.gold, fontSize: f.caption }]}>` |
| 4083 | `textSecond` | `t.bgCard` | `<Ionicons name="volume-high-outline" size={isCompactFlashcardsTask ? 16 : 18} color={t.textSecond} />` |
| 4118 | `textSecond` | `glassFill(t.bgCard` | `style={[styles.translationText, isCompactFlashcardsTask && styles.compactTranslationText, { color: t.textSecon` |
| 4143 | `gold` | `feedback.kind === 'wrong' ? t.wrongBg : t.goldBg` | `{ color: feedback.kind === 'wrong' ? t.wrong : t.gold, fontSize: isCompactFlashcardsTask ? f.caption : f.body ` |
| 4181 | `textSecond` | `t.bgSurface` | `<Ionicons name="eye-outline" size={18} color={t.textSecond} />` |
| 4182 | `textSecond` | `t.bgSurface` | `<Text style={[styles.revealText, { color: t.textSecond, fontSize: f.caption }]}>{text.reveal}</Text>` |

#### `app/flashcards/FlashcardListItem.tsx` — 10

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 644 | `accent` | ``${t.accent` | `<Ionicons name="pencil-outline" size={16} color={t.accent} />` |
| 645 | `accent` | ``${t.accent` | `<FlowText testID={`fc-details-edit-label-${item.id}`} provenance="authored" style={{ color: t.accent, fontSize` |
| 795 | `accent` | ``${t.accent` | `<Text style={{ color: t.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>DEV PACK</Text>` |
| 953 | `accent` | ``${t.accent` | `<Text style={{ color: t.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>DEV PACK</Text>` |
| 1057 | `accent` | ``${t.bgSurface` | `<Ionicons name="volume-medium" size={15} color={t.accent} />` |
| 1088 | `accent` | ``${t.bgSurface` | `<Ionicons name="volume-medium" size={15} color={t.accent} />` |
| 1113 | `accent` | ``${t.bgSurface` | `<Ionicons name="volume-medium" size={15} color={t.accent} />` |
| 1133 | `accent` | ``${t.bgSurface` | `<Ionicons name="play" size={12} color={t.accent} />` |
| 1134 | `accent` | ``${t.bgSurface` | `<Text style={[styles.videoMomentText, { color: t.accent }]}>{formatVideoMoment(videoMomentSec)}</Text>` |
| 1157 | `accent` | `—` | `color={usePackFace && packCardTheme ? packCardTheme.borderAccent : t.accent}` |

#### `components/feedback/ResultsSequence.tsx` — 10

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 912 | `gold` | `—` | `color={t.gold}` |
| 920 | `accent` | `—` | `<Text style={[styles.pulseEyebrow, orbitMode ? styles.orbitEyebrow : null, { color: t.accent }]}>{eyebrow}</Te` |
| 954 | `gold` | `—` | `color={t.gold}` |
| 1003 | `gold` | `—` | `<Text style={[styles.rewardText, { color: t.gold }]}>{multiplier.label}</Text>` |
| 1011 | `gold` | `—` | `<Text style={[styles.finaleText, { color: t.gold }]}>✓</Text>` |
| 1030 | `gold` | `—` | `color={t.gold}` |
| 1044 | `gold` | `—` | `<Text style={[styles.rewardPlus, { color: t.gold }]}>+</Text>` |
| 1048 | `gold` | `—` | `color={t.gold}` |
| 1087 | `gold` | `—` | `<Text style={[styles.rewardText, { color: t.gold }]}>{multiplier.label}</Text>` |
| 1095 | `gold` | `—` | `<Text style={[styles.finaleText, { color: t.gold }]}>✓</Text>` |

#### `components/lesson_intro_rich.tsx` — 10

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 396 | `accent` | `—` | `color: (t) => t.accent,` |
| 420 | `gold` | `—` | `color: (t) => t.gold,` |
| 444 | `accent` | `—` | `color: (t) => t.accent,` |
| 456 | `accent` | `—` | `color: (t) => t.accent,` |
| 468 | `gold` | `—` | `color: (t) => t.gold,` |
| 492 | `gold` | `—` | `color: (t) => t.gold,` |
| 504 | `gold` | `—` | `color: (t) => t.gold,` |
| 528 | `accent` | `—` | `color: (t) => t.accent,` |
| 540 | `gold` | `—` | `color: (t) => t.gold,` |
| 552 | `accent` | `—` | `color: (t) => t.accent,` |

#### `app/flashcards/CollectionHeader.tsx` — 9

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 338 | `textSecond` | `—` | `<Text testID="fc-saved-selection-count" style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '900' }` |
| 383 | `accent` | `viewMode === 'deck' ? `${t.accent` | `color={viewMode === 'deck' ? t.accent : t.textSecond}` |
| 405 | `accent` | `savedSurface ? (activeFilter !== 'all' ? g.selec` | `<Ionicons name="filter-outline" size={12} color={savedSurface ? g.text : activeFilter !== 'all' ? t.accent : t` |
| 407 | `accent` | `savedSurface ? (activeFilter !== 'all' ? g.selec` | `style={{ maxWidth: screenW < 360 ? 44 : 86, fontSize: f.caption, fontWeight: '600', color: savedSurface ? g.te` |
| 413 | `accent` | `—` | `<Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={10} color={savedSurface ? g.text : activeFil` |
| 515 | `accent` | ``${t.accent` | `<ActivityIndicator size="small" color={t.accent} />` |
| 517 | `accent` | ``${t.accent` | `<Ionicons name="earth-outline" size={17} color={t.accent} />` |
| 519 | `accent` | ``${t.accent` | `<FlowText testID="fc-publish-label" provenance="authored" style={{ flexShrink: 1, color: t.accent, fontSize: f` |
| 583 | `accent` | `savedSurface ? g.card : t.bgSurface` | `<Ionicons name="search-outline" size={20} color={savedSurface ? g.secondary : searchActive ? t.accent : t.text` |

#### `app/lesson_complete.tsx` — 9

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 230 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>{variant.btnNo` |
| 1341 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: 16, textAlign: 'center' }}>` |
| 1410 | `gold` | `t.bgSurface` | `color: t.gold, fontSize: f.bodyLg, fontWeight: '700',` |
| 1424 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: 16, marginBottom: 16, textAlign: 'center' }}>` |
| 1442 | `accent` | `glassFill(t.bgCard` | `color={t.accent}` |
| 1461 | `textSecond` | `glassFill(t.bgCard` | `<Ionicons name="cafe-outline" size={24} color={t.textSecond} />` |
| 1543 | `gold` | `—` | `<Text style={{ color: t.gold, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacin` |
| 1619 | `textSecond` | `—` | `<Ionicons name="share-outline" size={18} color={t.textSecond} />` |
| 1620 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: 13 }}>` |

#### `app/streak_stats.tsx` — 8

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 942 | `accent` | `—` | `<Text style={{ color: t.accent, fontSize: f.body, flex: 1, fontWeight: '600' }} numberOfLines={2}>` |
| 1009 | `accent` | `—` | `color: isGoldTheme ? GOLD_RICH.champagne : t.accent,` |
| 1657 | `textSecond` | `isGoldTheme ? GOLD_RICH.graphiteWarm : t.bgSurfa` | `<Text style={{ flex: 1, color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: f.body * 1.35 }}` |
| 2256 | `accent` | `—` | `color: isGoldTheme ? GOLD_RICH.paleGold : t.accent,` |
| 2284 | `accent` | `—` | `<Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : t.accent, fontSize: f.numLg, fontWeight: '900' }}>` |
| 2506 | `accent` | `isGoldTheme ? GOLD_RICH.wash : accentTint(t.acce` | `<Ionicons name="bar-chart-outline" size={22} color={isGoldTheme ? GOLD_RICH.champagne : t.accent}/>` |
| 2610 | `textSecond` | `—` | `color: d.ms > 0 ? (isToday ? t.textPrimary : t.textSecond) : t.textGhost,` |
| 2630 | `textSecond` | `barColor` | `<Text style={{ color: isToday ? t.textSecond : t.textGhost, fontSize: 8 /* d145-micro: подпись оси графика в к` |

#### `app/(tabs)/lessons.tsx` — 6

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 583 | `accent` | `—` | `<Ionicons name="school-outline" size={Math.round(size * 0.78)} color={t.accent} />` |
| 1582 | `accent` | `—` | `color: theme.accent,` |
| 1832 | `gold` | `—` | `color={slot < earnedStars ? theme.gold : theme.textMuted}` |
| 1884 | `accent` | `—` | `color: theme.accent,` |
| 4868 | `accent` | `t.bgCard` | `<Ionicons name="book-outline" size={21} color={t.accent} />` |
| 5159 | `gold` | `t.bgCard` | `<Ionicons name="language-outline" size={14} color={t.gold} />` |

#### `app/(tabs)/settings.tsx` — 5

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 1521 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22 }}>` |
| 1552 | `accent` | `—` | `<Text style={{ color: t.accent, fontSize: f.body, fontWeight: '800' }}>` |
| 1606 | `accent` | `t.bgCard` | `<Ionicons name="shield-checkmark" size={28} color={t.accent} />` |
| 1633 | `textSecond` | `t.bgCard` | `<Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginBottom: 8 }}>` |
| 1989 | `accent` | `—` | `<Text style={{ color: t.accent, fontSize: f.body, fontWeight: '800' }}>` |

#### `app/ai_companion_session.tsx` — 5

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 522 | `accent` | `—` | `style={{ color: t.accent, fontWeight: '800', textDecorationLine: 'underline', opacity: strictPlaybackUnavailab` |
| 567 | `textSecond` | `glassFill(t.bgSurface` | `<Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.35), flex: 1 }}>` |
| 590 | `accent` | `glassFill(t.bgCard` | `<Ionicons name="bulb-outline" size={20} color={t.accent} style={{ marginTop: 2 }} />` |
| 615 | `textSecond` | `—` | `color: t.textSecond,` |
| 695 | `textSecond` | `input.trim() && !sending ? t.accent : t.bgSurfac` | `<Text style={{ color: input.trim() && !sending ? t.textOnGold : t.textSecond, fontWeight: '800', fontSize: f.b` |

#### `app/flashcards/FlashcardsFilterDropdown.tsx` — 5

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 73 | `accent` | `—` | `<Text style={{ fontSize: f.body, color: savedGlass ? g.text : activeFilter === 'all' ? t.accent : t.textPrimar` |
| 86 | `accent` | `—` | `{activeFilter === 'all' && <Ionicons name="checkmark" size={16} color={savedGlass ? g.lightTint : t.accent} />` |
| 92 | `textSecond` | `savedGlass ? g.card : t.bgSurface` | `<Text style={{ fontSize: f.caption, color: savedGlass ? g.secondary : t.textSecond, fontWeight: '700', textTra` |
| 110 | `accent` | `—` | `<Text style={{ fontSize: f.body, color: savedGlass ? g.text : active ? t.accent : t.textPrimary, fontWeight: a` |
| 111 | `accent` | `—` | `{active && <Ionicons name="checkmark" size={16} color={savedGlass ? g.lightTint : t.accent} />}` |

#### `app/flashcards_voice_picker.tsx` — 5

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 213 | `accent` | `active ? `${t.accent` | `color={active ? t.accent : t.textGhost}` |
| 233 | `gold` | `t.goldBg` | `<Text style={{ color: t.gold, fontSize: f.caption - 1, fontWeight: '800' }}>` |
| 262 | `accent` | `t.bgCard` | `<Ionicons name="volume-medium" size={17} color={t.accent} />` |
| 365 | `accent` | `active ? `${t.accent` | `color: active ? t.accent : t.textMuted,` |
| 372 | `accent` | `—` | `<Text style={{ color: active ? t.accent : t.textGhost, fontSize: f.caption - 1, marginTop: 1 }}>` |

#### `components/AiMistakeCard.tsx` — 5

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 112 | `accent` | `t.accent + '18'` | `<Ionicons name="bulb-outline" size={20} color={t.accent} />` |
| 137 | `textSecond` | `—` | `style={{ color: t.textSecond, fontSize: f.label }}` |
| 158 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 20 }}>` |
| 202 | `accent` | `t.bgSurface2` | `<Ionicons name="sparkles-outline" size={16} color={t.accent} />` |
| 226 | `accent` | `t.bgSurface2` | `<Ionicons name="sparkles-outline" size={16} color={t.accent} />` |

#### `components/dialogs/DialogPhraseReview.tsx` — 5

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 33 | `gold` | `—` | `if (kind === 'fix') return { icon: 'create-outline' as const, color: t.gold };` |
| 34 | `accent` | `—` | `if (kind === 'polish') return { icon: 'sparkles-outline' as const, color: t.accent };` |
| 86 | `textSecond` | `—` | `color: t.textSecond,` |
| 125 | `gold` | `t.goldBg` | `<Ionicons name="sparkles" size={18} color={t.gold} />` |
| 142 | `gold` | `—` | `<Ionicons name="chevron-forward" size={18} color={t.gold} />` |

#### `app/achievements_screen.tsx` — 4

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 1146 | `accent` | `t.bgSurface` | `<Ionicons name="open-outline" size={20} color={t.accent} />` |
| 1149 | `textSecond` | `t.bgSurface` | `<Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: Math.round(f.body * 1.5) ` |
| 1161 | `accent` | `t.bgSurface` | `<Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.6, textTransform: 'up` |
| 1278 | `gold` | `—` | `<Text numberOfLines={1} style={{ color: showAllAchievements ? t.gold : t.textSecond, fontWeight: '900', fontSi` |

#### `app/hint.tsx` — 4

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 150 | `textSecond` | `t.bgSurface` | `<Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing` |
| 182 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing` |
| 1487 | `textSecond` | `t.bgSurface` | `<Ionicons name="shield-checkmark-outline" size={30} color={t.textSecond} />` |
| 1492 | `textSecond` | `t.bgSurface` | `<Text style={{ color: t.textSecond, fontSize: f.bodyLg, lineHeight: 24, textAlign: 'center' }}>` |

#### `app/shop.tsx` — 4

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 344 | `gold` | `t.bgSurface` | `<Ionicons name="construct-outline" size={15} color={t.gold} />` |
| 471 | `accent` | `selected ? t.accentBg : t.bgSurface` | `<Ionicons name={cat.icon} size={18} color={selected ? t.accent : t.textMuted} />` |
| 485 | `accent` | `—` | `<Ionicons name="checkmark" size={19} color={t.accent} />` |
| 513 | `accent` | `t.bgCard` | `<Ionicons name={categoryIcon} size={17} color={t.accent} />` |

#### `components/level-exam/LevelExamResult.tsx` — 4

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 105 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '700' }}>` |
| 127 | `accent` | `—` | `<Ionicons name="book-outline" size={18} color={t.accent} />` |
| 128 | `textSecond` | `—` | `<Text style={{ flex: 1, color: t.textSecond, fontSize: f.body, fontFamily: ds.fontFamily }}>` |
| 140 | `gold` | `—` | `<Ionicons name={result.passed ? 'sparkles' : 'bulb-outline'} size={22} color={result.passed ? t.gold : t.accen` |

#### `app/(tabs)/home.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 2454 | `textSecond` | `titleColor + '20'` | `<Text allowFontScaling={false} style={{ color: item.unlocked ? titleColor : t.textSecond, fontSize: Math.max(1` |
| 2462 | `textSecond` | `isLightTheme ? 'rgba(202` | `<Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize: f.caption, fontWeight: '900' }} numberOf` |
| 2526 | `accent` | `—` | `color={t.accent}` |

#### `app/flashcards/FlashcardsCategoryHub.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 633 | `textSecond` | `t.bgCard` | `<Text style={{ fontSize: 13, fontWeight: '700', color: t.textSecond }}>{label}</Text>` |
| 655 | `accent` | `—` | `color={pack.isCommunityUgc ? t.accent : t.textPrimary}` |
| 705 | `accent` | ``${t.bgSurface` | `<ActivityIndicator color={t.accent} />` |

#### `components/AiDialogBriefingScreen.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 300 | `gold` | `—` | `<Text style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '900' }}>` |
| 303 | `gold` | `—` | `<Text style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '700' }}>` |
| 314 | `gold` | `—` | `color: purchase.errorReason \|\| purchase.balanceRunes < purchase.priceRunes ? t.gold : t.textMuted,` |

#### `components/DialogsTabContent.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 749 | `accent` | `t.accentBg` | `<Ionicons name="chatbubble-ellipses-outline" size={24} color={t.accent} />` |
| 774 | `textSecond` | `—` | `<Ionicons name={hasPremiumAccess ? 'chevron-forward' : 'lock-closed-outline'} size={20} color={t.textSecond} /` |
| 951 | `textSecond` | `—` | `<Ionicons name="chevron-forward" size={20} color={t.textSecond} />` |

#### `components/SpeakingPanel.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 2357 | `accent` | `—` | `<ActivityIndicator color={theme.accent} />` |
| 2363 | `accent` | `—` | `color={theme.accent}` |
| 2374 | `textSecond` | `—` | `color: theme.textSecond,` |

#### `components/VerbLetterBank.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 83 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.body, opacity: 0.6 }}>· · ·</Text>` |
| 139 | `textSecond` | `—` | `<Ionicons name="backspace-outline" size={18} color={t.textSecond} />` |
| 152 | `textSecond` | `canSubmit ? t.correct : t.bgCard` | `<Text style={{ color: canSubmit ? t.correctText : t.textSecond, fontSize: f.bodyLg, fontWeight: '800' }}>` |

#### `components/achievements/AchievementCategoryDock.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 123 | `accent` | `t.accentBg` | `<Ionicons name={option.icon} size={18} color={t.accent} />` |
| 130 | `accent` | `t.accentBg` | `{selected ? <Ionicons name="checkmark" size={19} color={t.accent} /> : null}` |
| 265 | `accent` | `t.accentBg` | `<Ionicons name={selected.icon} size={18} color={t.accent} />` |

#### `components/friends_together/FriendTogetherSheet.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 144 | `cta` | `isGold ? g.text : g.cta` | `<FlowText testID="friend-together-sheet-level" provenance="authored" style={{ color: isGold ? g.text : g.cta, ` |
| 166 | `cta` | `—` | `<Ionicons name="flame" size={26} color={isGold ? g.text : g.cta} />` |
| 175 | `cta` | `nudgeDisabled ? g.opaqueControl : g.cta` | `{together && onNudge && <PressableHybrid testID="friend-together-sheet-nudge" onPress={() => onNudge()} disabl` |

#### `components/roulette_win_modal.tsx` — 3

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 173 | `accent` | `t.bgCard` | `color={t.accent}` |
| 198 | `accent` | `—` | `style={[styles.winDays, { color: t.accent, fontSize: (f.numLg ?? 28) + 2, fontFamily: ds.fontFamily }]}` |
| 215 | `accent` | `—` | `<Text maxFontSizeMultiplier={1.2} style={{ color: t.accent, fontWeight: '700' }}>{daysShort}</Text>` |

#### `app/flashcards/DeckSelectionTile.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 215 | `accent` | `selected ? `${t.accent` | `<Ionicons name={deck.icon} size={22} color={selected ? t.accent : t.textMuted} />` |
| 241 | `textSecond` | `t.bgCard` | `<Text style={[styles.countText, { color: t.textSecond, fontSize: f.caption }]}>{deck.count}</Text>` |

#### `app/flashcards/VideoSetView.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 155 | `accent` | `g.accent` | `style={({ pressed }) => [styles.train, { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blu` |
| 184 | `accent` | `g.hairlineSoft` | `time: { width: 40, fontSize: 13, lineHeight: 17, fontWeight: '700', color: g.accent },` |

#### `app/flashcards_packs.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 467 | `accent` | `searchOpen || communityQuery.trim().length > 0 ?` | `color={searchOpen \|\| communityQuery.trim().length > 0 ? t.accent : g.secondary}` |
| 510 | `accent` | `g.hairlineSoft` | `<Ionicons name="search-outline" size={embedded ? 20 : 16} color={embedded ? g.text : t.accent} />` |

#### `app/mistake_practice_session.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 1461 | `accent` | `—` | `<ListeningPlayback audioRef={entry.exercise.audioRef} color={g.accent} foreground={g.accentInk} accessibilityL` |
| 1511 | `accent` | `g.accent` | `style={({ pressed }) => [styles.mic, { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 18, blurR` |

#### `components/DailyPhraseCard.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 882 | `accent` | `t.bgSurface2` | `<Ionicons name="volume-high" size={20} color={t.accent} />` |
| 1017 | `textSecond` | `—` | `<Text style={[styles.questDiagnosticText, { color: t.textSecond, fontSize: f.body }]}>` |

#### `components/FeedbackRatingCard.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 211 | `gold` | `—` | `color={rating >= star ? t.gold : glass.mutedText}` |
| 315 | `gold` | `—` | `<Ionicons name={rating >= star ? 'star' : 'star-outline'} size={compactStars ? 28 : 26} color={rating >= star ` |

#### `components/NotificationPermissionModal.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 113 | `accent` | `t.accentBg` | `<Ionicons name="notifications-outline" size={26} color={t.accent} />` |
| 120 | `textSecond` | `t.accentBg` | `{resolvedBody ? <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginTop: 10, textAlign` |

#### `components/WordDrillCard.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 181 | `textSecond` | `—` | `<Text style={[styles.status, { color: clean ? theme.correct : theme.textSecond }]}>` |
| 235 | `accent` | `—` | `<Text style={[styles.mineText, { color: theme.accent }]}>` |

#### `components/cards-grid/CardsKit.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 187 | `accent` | `g.accent` | `: { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, col` |
| 234 | `accent` | `—` | `return <Text testID="fc-search-found" style={[styles.found, { color: g.accent, lineHeight: lh(16) }]}>{label}<` |

#### `components/feedback/VictoryBurst.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 127 | `accent` | `t.bgCard` | `<Ionicons name={heroIcon} size={56} color={t.accent} style={styles.hero} />` |
| 140 | `accent` | `t.bgSurface` | `<Text style={[styles.statValue, { color: t.accent }]}>{s.value}</Text>` |

#### `components/youtube/YoutubeChannelPickerSheet.tsx` — 2

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 31 | `accent` | `t.accentBg` | `{channel.avatarUrl ? <Image source={{ uri: channel.avatarUrl }} style={styles.icon} /> : <View style={[styles.` |
| 33 | `accent` | `t.accentBg` | `{checked && <Ionicons name="checkmark-circle" size={23} color={t.accent} />}` |

#### `app/flashcards/CardsHubV2.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 206 | `accent` | `g.accent` | `{ backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, color` |

#### `app/flashcards/CollectionGalleryView.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 162 | `accent` | `g.hairlineSoft` | `<Text testID="fc-search-found" style={[styles.found, { color: g.accent }]}>{`${foundLabel} · ${cards.length}`}` |

#### `app/flashcards/CollectionListView.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 1055 | `textSecond` | `—` | `<Text style={{ color: t.textSecond, fontSize: f.sub, textDecorationLine: 'underline' }}>` |

#### `app/flashcards/FlashcardDetailsBody.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 140 | `textSecond` | `—` | `color: t.textSecond,` |

#### `app/flashcards/PackHeaderV2.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 99 | `accent` | `g.accent` | `style={({ pressed }) => [styles.train, { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blu` |

#### `app/flashcards/SavedTopCommunityPacks.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 119 | `cta` | `g.sheet` | `{opening ? <ActivityIndicator size="small" color={g.cta} style={styles.opening} /> : null}` |

#### `app/flashcards/SpeakingTaskHint.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 11 | `textSecond` | `—` | `<Text testID="fc-speak-task-hint" style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.5, te` |

#### `app/flashcards/VideoPackRow.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 176 | `cta` | `g.opaqueCard` | `<ActivityIndicator color={g.cta} />` |

#### `app/lesson1.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 1246 | `accent` | `—` | `<Animated.Text style={{ color: t.accent, opacity: selectedWords.length > 0 ? 1 : cursorAnim }}>` |

#### `app/pack_opening.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 318 | `textSecond` | `t.borderLight` | `style={[styles.cardRU, { color: t.textSecond, fontSize: f.caption }]}` |

#### `components/AiBadge.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 16 | `accent` | ``${t.accent` | `<Text style={[styles.text, { color: t.accent, fontSize: Math.max(10, f.label - 1) }]}>AI</Text>` |

#### `components/AiConsentSheetModal.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 213 | `textSecond` | `—` | `<Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>` |

#### `components/AiLimitUpsellCard.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 88 | `cta` | `glass.selected` | `<Ionicons name="flash" size={18} color={glass.cta} />` |

#### `components/FeatureIntroModal.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 144 | `cta` | `—` | `<Ionicons name={icon} size={28} color={glass.cta} />` |

#### `components/MistakeEli5Modal.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 260 | `textSecond` | `—` | `<Text style={[styles.skeletonText, { color: t.textSecond, fontSize: f.body }]}>` |

#### `components/MistakeEli5ModalHybrid.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 126 | `textSecond` | `—` | `<Text style={[styles.skeletonText, { color: t.textSecond, fontSize: f.body }]}>{loadingLine}</Text>` |

#### `components/NotificationCenterButton.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 734 | `accent` | `t.bgSurface` | `<Text style={[styles.notificationUndoAction, { color: t.accent }]}>Вернуть</Text>` |

#### `components/ReferralInviteBannerArt.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 74 | `accent` | `theme.bgSurface2` | `<Ionicons name="gift-outline" size={44} color={theme.accent} />` |

#### `components/RegistrationPromptModal.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 1564 | `textSecond` | `glass.opaqueControl` | `<Ionicons name="close" size={14} color={t.textSecond} />` |

#### `components/SoftContextualUpsellCard.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 75 | `cta` | `—` | `<Ionicons name="sparkles-outline" size={22} color={glass.cta} />` |

#### `components/StatsPremiumBlur.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 246 | `accentBright` | `g.opaqueControl` | `<Ionicons name="lock-closed" size={28} color={vivid ? g.accentBright : g.text} />` |

#### `components/dialogs/DialogBubbleActions.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 91 | `accent` | `options?.active ? t.accentBg : t.bgSurface2` | `<Ionicons name={icon} size={17} color={options?.active ? t.accent : t.textMuted} />` |

#### `components/dialogs/DialogWhySheet.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 195 | `gold` | `—` | `style={{ color: t.gold, fontSize: f.sub, fontWeight: '700', textAlign: 'center', marginTop: 10 }}` |

#### `components/energy/EnergyInfoPopover.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 283 | `cta` | `glass.opaqueCard` | `<Ionicons name="flash" size={18} color={glass.cta} />` |

#### `components/lesson_help_theory_data.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 211 | `accent` | `defaultOpen ? c.surfaceBg : 'transparent'` | `<Ionicons name={icon} size={17} color={iconColor ?? c.accent} />` |

#### `components/mistakes-panel/PanelKit.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 175 | `accent` | `g.accent` | `: { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, col` |

#### `components/prize_arc.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 337 | `accent` | `—` | `<Ionicons name="caret-down" size={28} color={dimmed ? t.textMuted : t.accent} />` |

#### `components/settings/SettingsGlassRows.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 161 | `accentBright` | `—` | `<Ionicons name={icon} size={20} color={glass.level === 'accent' \|\| glass.level === 'max' ? glass.accentBrigh` |

#### `components/settings/SettingsMessageSlotCard.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 144 | `accent` | `selected ? t.accentBg : t.bgSurface` | `color={selected ? t.accent : t.textGhost}` |

#### `components/settings/ThemeIntensitySlider.tsx` — 1

| Строка | Токен | Заливка рядом | Что красится |
|---|---|---|---|
| 199 | `accentBright` | `glass.isLight ? '#FFFFFF' : glass.text` | `<Ionicons name="water" size={ICON} color={glass.accentBright} />` |

