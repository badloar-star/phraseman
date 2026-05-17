# Gold Theme Remaining Color Audit

Дата: 2026-05-17

## Вердикт

После правок Home, Lessons, Streak, Daily Tasks, таббара и выбора темы Gold стал намного ближе к black/gold, но в проекте еще остались экраны и компоненты, которые продолжают тащить свои старые локальные палитры: blue, purple, green, orange, red, cyan, flat yellow.

Это уже не одна проблема токенов. Основной источник мусора: inline-стили и локальные `const`-палитры, которые не знают про Gold.

## Critical

### 1. Quizzes

Файлы:

- `app/(tabs)/quizzes.tsx`
- `app/quizzes/constants.ts`
- `app/quizzes/result_view.tsx`
- `components/BonusXPCard.tsx`

Проблемы:

- `THEME_PALETTES.gold` все еще коричневая: `#2A210F`, `#24180A`, `#191108`.
- В выборе уровня Gold-палитра есть, но рамка невыбранной карточки берет `LEVEL_CONFIG.color`: green/orange/purple через `${c.color}40`.
- `THEME_TEXT.gold` остался просто white/rgba-white, без ivory/muted gold логики.
- Result view использует `#D4A017`, `#F87171`, а `BonusXPCard` вообще не theme-aware: green/orange/purple tiers + dark blue card.

Точки входа:

- `app/(tabs)/quizzes.tsx:139`
- `app/(tabs)/quizzes.tsx:169`
- `app/(tabs)/quizzes.tsx:415`
- `app/quizzes/constants.ts:27`
- `app/quizzes/result_view.tsx:93`
- `components/BonusXPCard.tsx:88`

Что нужно:

- Сделать одну shared quiz palette для Gold: black/graphite cards, thin gold border, one gold accent.
- Убрать `LEVEL_CONFIG.color` из Gold card border.
- `BonusXPCard` должен брать `themeMode` и в Gold стать black/gold, без green/orange/purple tiers.

### 2. Achievements

Файл:

- `app/achievements_screen.tsx`

Проблемы:

- `CAT_COLOR` задает яркие категории: orange, blue, purple, pink, green, red.
- Эти цвета используются не как маленькие semantic dots, а как щиты, прогресс, рамки секций, modal title/date pills.
- Premium gate внутри achievements остается purple (`#6D28D9`, `#7C3AED`, `#A78BFA`).
- Экран берет `isDark`, но не различает Dark и Gold.

Точки входа:

- `app/achievements_screen.tsx:373`
- `app/achievements_screen.tsx:523`
- `app/achievements_screen.tsx:688`
- `app/achievements_screen.tsx:938`
- `app/achievements_screen.tsx:1045`

Что нужно:

- Ввести `isGoldTheme`.
- Для Gold заменить category colors на одну gold/graphite шкалу: unlocked gold, progress muted gold, locked graphite.
- Purple premium CTA заменить на gold premium CTA.

### 3. Trainer / My Practice

Файлы:

- `app/trainer.tsx`
- `app/trainer_smart_session.tsx`
- `app/trainer_session_report.tsx`

Проблемы:

- `SECTIONS` и `PRACTICE_OPTIONS` используют teal/blue/pink.
- `primaryAccent` для non-premium в Gold может стать `nextOption.accent`, то есть teal/blue.
- Smart session использует purple/red modes, current profile accents, green correct, red wrong.
- Эти цвета становятся крупными рамками, прогрессом, coach strips, badges, buttons.

Точки входа:

- `app/trainer.tsx:56`
- `app/trainer.tsx:88`
- `app/trainer.tsx:105`
- `app/trainer.tsx:121`
- `app/trainer.tsx:368`
- `app/trainer_smart_session.tsx:85`
- `app/trainer_smart_session.tsx:95`
- `app/trainer_smart_session.tsx:461`
- `app/trainer_smart_session.tsx:532`
- `app/trainer_smart_session.tsx:602`

Что нужно:

- Для Gold сделать trainerPalette: all section accents -> goldAccent/mutedGold.
- Correct/wrong оставить только как tiny semantic feedback или приглушить: gold-success, muted red-error.
- Badges/chips в Gold не должны брать `current.accent` напрямую.

### 4. Arena Room / Arena Results

Файлы:

- `app/arena_room.tsx`
- `app/arena_results.tsx`
- `app/arena_game.tsx`

Проблемы:

- Arena Room не получает `themeMode`, поэтому не может отличить Gold.
- Ready/host/start states: green, orange, purple gradients.
- Results breakdown: first/streak/outspeed bonuses purple/orange/blue.
- Shard rewards in results still purple.

Точки входа:

- `app/arena_room.tsx:80`
- `app/arena_room.tsx:94`
- `app/arena_room.tsx:583`
- `app/arena_room.tsx:609`
- `app/arena_room.tsx:627`
- `app/arena_room.tsx:647`
- `app/arena_results.tsx:1421`
- `app/arena_results.tsx:1675`
- `app/arena_results.tsx:1687`
- `app/arena_results.tsx:1699`
- `app/arena_game.tsx:937`

Что нужно:

- Передать `themeMode` / `isGoldTheme`.
- Start/ready/result states в Gold: graphite + gold border/fill.
- Bonus breakdown: one gold scale, not purple/orange/blue.

### 5. League Chest Open Modal

Файл:

- `components/LeagueChestOpenModal.tsx`

Проблемы:

- Модалка бонуса лиги полностью cyan/purple/gold: frame `#16B7D9`, `#F7D774`, `#A78BFA`.
- Reward icons and CTA are cyan.
- В Gold это будет выглядеть как отдельная ocean/purple модалка поверх gold-темы.

Точки входа:

- `components/LeagueChestOpenModal.tsx:116`
- `components/LeagueChestOpenModal.tsx:142`
- `components/LeagueChestOpenModal.tsx:159`
- `components/LeagueChestOpenModal.tsx:176`
- `components/LeagueChestOpenModal.tsx:204`

Что нужно:

- Для Gold заменить frame на black/gold metallic gradient.
- Reward icons: gold/muted gold.
- CTA: gold gradient, not cyan.

### 6. Activity Heatmap / Year Analytics

Файл:

- `components/ActivityHeatmap365.tsx`

Проблемы:

- Heatmap modal glow mixes blue and yellow.
- Year goal uses amber warning `#FFB020`.
- Period cards use green and amber gradients.
- Insights use blue cards for non-first insight.

Точки входа:

- `components/ActivityHeatmap365.tsx:231`
- `components/ActivityHeatmap365.tsx:278`
- `components/ActivityHeatmap365.tsx:552`
- `components/ActivityHeatmap365.tsx:574`
- `components/ActivityHeatmap365.tsx:586`
- `components/ActivityHeatmap365.tsx:605`

Что нужно:

- Gold heatmap palette: black cells + 4-step gold intensity.
- Period/insight cards: graphite background + hairline gold border.
- Warning can be muted amber, but not large orange/yellow blocks.

## High

### 7. Friends Tab

Файл:

- `app/(tabs)/friends.tsx`

Проблемы:

- Screen does not read `themeMode`.
- Friend streak count is orange `#FF9500`.
- Activity event icons use blue/purple/green/orange/red.
- Search success/error colors are green/red.

Точки входа:

- `app/(tabs)/friends.tsx:381`
- `app/(tabs)/friends.tsx:415`
- `app/(tabs)/friends.tsx:752`
- `app/(tabs)/friends.tsx:1039`
- `app/(tabs)/friends.tsx:1053`

Что нужно:

- Добавить `themeMode` and `isGoldTheme`.
- In Gold: event icon color should default to gold/muted gold, with only error as muted red.
- Streak text should be gold, not orange.

### 8. EnergyBar

Файл:

- `components/EnergyBar.tsx`

Проблемы:

- `PREMIUM_BLUE = '#4FC3F7'` применяется для unlimited energy globally.
- Home уже прикрыт локальной логикой, но все другие места с `EnergyBar` в Gold могут снова показать blue premium energy.
- Bonus slots use flat `#FFD700`, not theme gold.

Точки входа:

- `components/EnergyBar.tsx:13`
- `components/EnergyBar.tsx:23`
- `components/EnergyBar.tsx:85`
- `components/EnergyBar.tsx:86`

Что нужно:

- `PREMIUM_BLUE` заменить через `themeMode === 'gold' ? t.gold : '#4FC3F7'`.
- `BONUS_COLOR` в Gold тоже брать из `t.gold`.

### 9. Avatar Select / Profile Card Preview

Файлы:

- `app/avatar_select.tsx`
- `components/PlayerProfileModal.tsx`
- `components/ProfileCardUpgradeModal.tsx`

Проблемы:

- Shard balance in header is purple.
- Profile card visual presets include crystal/ember/aurora with cyan/pink/purple shadows and surfaces.
- Эти цвета могут быть user-owned cosmetics, но UI chrome вокруг них в Gold должен оставаться gold/graphite.

Точки входа:

- `app/avatar_select.tsx:157`
- `app/avatar_select.tsx:709`
- `components/PlayerProfileModal.tsx:164`
- `components/ProfileCardUpgradeModal.tsx:264`
- `components/ProfileCardUpgradeModal.tsx:318`

Что нужно:

- Header currency in Gold: `t.gold`.
- Разделить cosmetic preview colors и theme chrome colors.

### 10. Level Gift Modals

Файлы:

- `components/LevelGiftModal.tsx`
- `components/LevelGiftDualModal.tsx`
- `components/GiftOpenEffects.tsx`

Проблемы:

- Rare gifts are blue, premium/cosmetic blocks can be purple.
- Confetti/effects include blue, green, pink, purple.
- В Gold это можно оставить как reward rarity, но крупные рамки и CTA лучше приглушить.

Точки входа:

- `components/LevelGiftModal.tsx:52`
- `components/LevelGiftModal.tsx:366`
- `components/LevelGiftModal.tsx:490`
- `components/LevelGiftDualModal.tsx:57`
- `components/LevelGiftDualModal.tsx:850`
- `components/GiftOpenEffects.tsx:12`

Что нужно:

- Для Gold оставить rarity в маленьком бейдже, но frame/card/CTA сделать gold/graphite.
- Effects palette for Gold: ivory/gold/champagne, no rainbow confetti.

### 11. Exam / Certificate Flow

Файлы:

- `app/exam.tsx`
- `components/CertificateNameModal.tsx`
- `components/CertificatePreviewAdminModal.tsx`
- `components/ExamResultPreviewAdminModal.tsx`

Проблемы:

- Много старого `#FFD700`, `#B8860B`, `#d4a017`, `#0a1620`.
- Цвета вроде gold, но это flat yellow + brown, то есть тот самый дешевый gold, от которого уходим.

Точки входа:

- `app/exam.tsx:711`
- `app/exam.tsx:1021`
- `app/exam.tsx:1041`
- `app/exam.tsx:1199`
- `components/CertificateNameModal.tsx:61`
- `components/CertificateNameModal.tsx:113`

Что нужно:

- Заменить на tokens: `t.gold`, `t.borderHighlight`, `t.bgCard`, metallic gradients.
- Убрать `#B8860B` из CTA.

### 12. App Messages Inbox

Файл:

- `components/AppMessagesInbox.tsx`

Проблемы:

- Для dark themes используется blue-gray chrome: `#111820`, `#17202A`, `#202934`.
- Gold попадает в `isDark`, но не получает отдельную black/gold chrome.
- Like/dislike reactions green/red.

Точки входа:

- `components/AppMessagesInbox.tsx:163`
- `components/AppMessagesInbox.tsx:279`
- `components/AppMessagesInbox.tsx:293`
- `components/AppMessagesInbox.tsx:332`

Что нужно:

- `themeMode === 'gold'` branch для chrome.
- Reactions in Gold: gold selected, muted red only for dislike if needed.

## Medium / Contextual

### 13. Global first lesson sheet

Файл:

- `app/_layout.tsx`

Проблемы:

- Onboarding sheet uses neon lime: `#C8FF00`, `#141414`, `rgba(200,255,0,0.15)`.
- Это не постоянный экран, но в Gold выглядит как Neon.

Точка входа:

- `app/_layout.tsx:1442`

### 14. Premium Celebration / Stats Lock

Файлы:

- `components/PremiumCelebrationModal.tsx`
- `components/StatsPremiumBlur.tsx`

Проблемы:

- Flat `#FFD700` + `#B8860B` используется как старый premium gold.
- В Gold теме это менее критично, но визуально дешевле новой metallic palette.

Точки входа:

- `components/PremiumCelebrationModal.tsx:375`
- `components/StatsPremiumBlur.tsx:75`

### 15. Pack Opening

Файл:

- `app/pack_opening.tsx`

Проблемы:

- Confetti palette is rainbow: gold/green/blue/red/purple/orange.
- Это может быть допустимо для celebration, но в Gold лучше сделать gold-specific confetti.

Точка входа:

- `app/pack_opening.tsx:44`

## Suggested Fix Order

1. Quizzes + quiz result + BonusXPCard.
2. Achievements.
3. Trainer + smart trainer.
4. Arena room/results/game.
5. League chest modal + ActivityHeatmap365.
6. Friends tab + EnergyBar.
7. Avatar/profile card chrome.
8. Reward/certificate/premium celebration surfaces.

## Rule For Next Pass

Любой пользовательский экран, где есть `useTheme()` и hardcoded saturated color, должен либо:

- получить `isGoldTheme`, либо
- использовать theme tokens / shared gold-aware palette.

Исключения допустимы только для маленьких danger/error indicators, брендов внешних провайдеров и реально пользовательских cosmetic choices. Даже там Gold должен контролировать chrome: фон, рамки, CTA, selected state, progress, badges.
