# Gold Theme Detailed Audit

Дата аудита: 2026-05-17

## Короткий вердикт

Текущая Gold-тема не выглядит как золото и не выглядит премиально, потому что она не является полноценной дизайн-системой. Сейчас это в основном коричнево-темная база, поверх которой отдельные экраны продолжают использовать свои старые локальные цвета: синий, зеленый, оранжевый, фиолетовый, пастельный желтый и персиковый.

Главная проблема не в одном неправильном оттенке. Проблема в том, что Gold не владеет интерфейсом целиком: фон, карточки, вкладки, уроки, статистика, прогресс, иконки и semantic-цвета живут разными правилами.

## Что видно на скриншотах

### Home

- Фон читается как грязно-коричневый, а не как черный премиальный фон с золотыми акцентами.
- Большие полупрозрачные пятна на фоне создают ощущение случайного brown overlay.
- Верхняя часть экрана содержит сразу несколько чужих акцентов: синие молнии, розово-фиолетовые кристаллы, зеленое кольцо аватара, оранжевое пламя.
- Карточка статуса игрока визуально не собрана: золото, зеленый, оранжевый, белый и серый конкурируют между собой.
- Нижняя навигация показывает активную вкладку белым, поэтому gold-иерархия теряется.
- Иконки разделов выглядят серыми/туманными, а не дорогими золотыми объектами.

### Statistics / Streak

- Экран полностью ломает Gold-тему из-за hardcoded-цветов.
- Streak использует оранжевое пламя и оранжевые точки.
- Freeze использует яркий синий.
- Practice balance использует зеленый круг.
- Gift/boost использует фиолетовый.
- Рамки карточек окрашены разными semantic-цветами, из-за чего экран выглядит как старая цветная тема под коричневым фильтром.

### Lessons

- Уроки B1/B2 используют пастельные желтые и персиковые карточки.
- Эти карточки выглядят дешево и не связаны с черно-золотой системой.
- Exam-блок использует серо-коричневую заливку, которая выглядит как отдельная тема.
- Прогресс и completion-состояния не имеют премиальной gold-логики.

## Root Causes

### 1. Gold palette слишком коричневая

Файл: `constants/theme.ts`

Проблемные значения:

- `bgPrimary: '#050504'`
- `bgCard: '#11100B'`
- `bgSurface: '#18140D'`
- `bgSurface2: '#231C10'`
- `textMuted: '#B9A67D'`

Эти цвета делают всю тему warm-brown. Для дорогого gold фон должен быть почти нейтральным черным/графитовым, а золото должно жить в акцентах, тонких рамках, иконках, selected states и редких premium-поверхностях.

Правильное направление:

- Base: почти черный / нейтральный графит.
- Surface: нейтральный charcoal, не коричневый.
- Gold: не заливать весь UI, а использовать как металл: hairline borders, icons, selected states, progress highlights.
- Brown допустим только как очень слабый edge tint, а не как основной цвет.

### 2. ScreenGradient делает brown overlay

Файл: `components/ScreenGradient.tsx`

Проблема:

- `BG_GRADIENTS.gold` уходит в коричневый.
- `ORBS.gold` добавляет большие золотисто-коричневые пятна.
- На реальном экране эти пятна выглядят не как премиальный металл, а как грязная засветка.

Что нужно:

- Для Gold убрать крупные orbs или сделать их почти незаметными.
- Фон должен быть глубоко черный, с очень тонкой золотой виньеткой или hairline-свечением.
- Нельзя использовать большие translucent blobs как главный визуальный прием Gold-темы.

### 3. Tab bar не имеет gold-specific логики

Файл: `app/(tabs)/_layout.tsx`

Проблема:

- Gold не считается отдельным режимом.
- Active tab использует `t.textPrimary`, поэтому активная вкладка становится белой.
- Индикатор тоже белый.

Что нужно:

- Добавить `isGoldTheme`.
- Active icon/text: gold, не white.
- Indicator: gold hairline.
- Background: black / near-black.
- Border: тонкий muted gold.
- Не использовать белый как selected-состояние.

### 4. Lessons используют собственную pastel palette

Файл: `app/(tabs)/lessons.tsx`

Проблемные зоны:

- `PALETTE_SKETCH`
- `EXAM_META_SKETCH`
- `bookPalette(num)`
- lesson-card gradients через `lightenHex(bg, 1.28)`

Сейчас уровни B1/B2 получают пастельный желтый и персиковый цвет. Это прямо видно на скриншоте и полностью ломает premium gold.

Что нужно:

- Сделать theme-aware палитру уроков.
- Для Gold не использовать pastel fill.
- Карточки уроков: black/graphite surface, тонкая gold рамка, subtle gold progress strip, muted gold completed check.
- Различие CEFR-уровней показывать маленькими бейджами/иконками, а не полной заливкой карточки.

### 5. Statistics / Streak экран переполнен hardcoded semantic colors

Файл: `app/streak_stats.tsx`

Проблемные цвета:

- Fire/streak: `#FF6B35`
- Freeze/best: `#64B4FF`
- Gift: `#A78BFA`, `#9B59F5`, `#6B21D4`
- Practice balance: `#35D07F`, `#FFB020`, `#FF6B6B`
- Comeback: `#60A5FA`

Проблема:

- Эти цвета используются не только как tiny semantic indicators, а как рамки, крупные круги, точки, тексты и блоки.
- Экран перестает быть gold-темой и становится разноцветной статистикой на коричневом фоне.

Что нужно:

- Для Gold создать отдельную `goldStatsPalette`.
- Основные рамки и заголовки: muted gold.
- Streak: gold/amber, без яркого оранжевого.
- Practice balance: gold meter, не зеленый круг.
- Freeze можно оставить холодным, но только как маленький icon accent, не как большая синяя рамка/кнопка.
- Purple gift/boost нужно заменить на gold/ivory или сильно приглушить.

### 6. Home экран тащит старые brand/status цвета

Файл: `app/(tabs)/home.tsx`

Проблемные цвета:

- `PREMIUM_BLUE = '#4FC3F7'`
- `leagueChestAccent = '#16B7D9'`
- shard text: `#A78BFA`
- streak icon: `#FF8A3D`, `#FF6B35`, `#64B4FF`
- XP gradient: `[t.gold, '#FFF2B0', t.accent]`

Проблема:

- Home является главным экраном, но именно он больше всего выглядит как набор старых разноцветных элементов.
- Gold-тема не контролирует статусные иконки, top bar, currency, streak, avatar ring и progress.

Что нужно:

- Ввести `homePaletteForTheme(themeMode, t)`.
- Для Gold заменить shard/currency text на ivory/gold, если бренд кристалла не обязан оставаться фиолетовым.
- Streak сделать gold/amber, но без кислотного оранжевого.
- Avatar ring в Gold должен быть muted gold или graphite+gold, не ярко-зеленый.
- XP bar должен быть металлическим gold gradient, без flat yellow.
- Card backgrounds должны быть black/graphite с тонкой золотой рамкой.

### 7. Компоненты поправлены, но основные экраны их обходят

Файлы:

- `components/ThemeContext.tsx`
- `components/PremiumCard.tsx`
- `components/ui/PrimaryButton.tsx`
- `components/ui/ThemedInput.tsx`

Проблема:

- Даже если базовые компоненты стали тоньше, многие ключевые экраны используют inline styles, локальные gradients, свои borderRadius и свои цвета.
- Поэтому изменение дизайн-токенов не приводит к цельному результату.

Что нужно:

- Не ограничиваться `constants/theme.ts`.
- Пройти экраны вручную и убрать локальные цвета либо завести theme-aware фабрики палитр.

### 8. Assets не соответствуют Gold

Файлы:

- `app/home_menu_icons.ts`
- `components/DailyPhraseCard.tsx`
- `components/EnergyIcon.tsx`

Проблема:

- Сейчас часть Gold-маппинга ушла в fog/grey assets.
- На экране это выглядит как серые тяжелые иконки, а не как gold-premium система.

Что нужно:

- Либо создать отдельные gold-assets.
- Либо сделать monochrome/gold treatment прямо в UI: gold stroke, controlled opacity, subtle shadow.
- Нельзя подменять Gold серыми fog-ассетами и ожидать дорогого вида.

## Definition of Done для настоящей Gold-темы

- Экран в целом читается как black + metallic gold, а не brown.
- На одном экране нет конкурирующих saturated-цветов, кроме минимальных semantic indicators.
- Active states в навигации и главных controls золотые, не белые.
- Карточки имеют тонкие рамки, меньше визуального шума, аккуратный radius и controlled shadow.
- Большие фоны не используют коричневые пятна/orbs.
- Уроки не используют pastel fill.
- Статистика не использует зеленые/синие/фиолетовые/оранжевые крупные блоки.
- Прогресс, streak, rewards и premium states имеют общую metallic gold-логику.
- Все gold-specific решения живут не только в токенах, но и в screen-level palettes.

## Fix Checklist

### Critical

- [ ] Переделать `constants/theme.ts`: убрать коричневую базу, сделать нейтральный black/graphite palette.
- [ ] Переделать `components/ScreenGradient.tsx`: убрать/сильно приглушить `ORBS.gold`, заменить brown gradient на black luxury background.
- [ ] Добавить gold-specific tab bar в `app/(tabs)/_layout.tsx`.
- [ ] Переделать lesson-card palette в `app/(tabs)/lessons.tsx`, убрать pastel B1/B2 cards для Gold.
- [ ] Вынести hardcoded colors в `app/streak_stats.tsx` в theme-aware palette.
- [ ] Вынести hardcoded Home colors в `app/(tabs)/home.tsx` в theme-aware palette.

### High

- [ ] Сделать gold-specific treatment для avatar ring/aura.
- [ ] Пересобрать XP progress: metallic gold, меньше yellow, больше depth.
- [ ] Привести reward/currency/shard colors к общей иерархии.
- [ ] Проверить все `#FF6B35`, `#64B4FF`, `#A78BFA`, `#35D07F`, `#4FC3F7`, `#16B7D9` на Gold-экранах.
- [ ] Сделать Gold-compatible assets для home menu icons.
- [ ] Проверить title/level colors в `constants/titles.ts`.

### Medium

- [ ] Уменьшить радиусы крупных карточек там, где они выглядят слишком игрушечно.
- [ ] Убрать лишние glow/shadow effects.
- [ ] Выровнять border widths: premium gold должен чаще использовать 1px hairline, а не толстые цветные рамки.
- [ ] Проверить contrast на маленьком тексте gold-on-black.
- [ ] Сделать visual QA на Home, Lessons, Statistics, Quiz, Settings, Premium modal.

## Suggested Target System

### Palette

- Base black: `#030303`
- Deep surface: `#080808`
- Raised surface: `#101010`
- Soft surface: `#171717`
- Primary gold: `#D6B35A`
- Bright gold highlight: `#F4D987`
- Antique gold: `#9F7A2D`
- Ivory text: `#F6F1E3`
- Muted text: `#B8AD92`
- Hairline gold: `rgba(214, 179, 90, 0.28)`

### Components

- Cards: black/graphite fill, 1px gold hairline, subtle inner highlight.
- Primary buttons: black-to-gold or gold metallic gradient only for main CTA.
- Secondary buttons: transparent/black with gold stroke.
- Progress: metallic gold gradient with dark track.
- Selected tab: gold icon/text/indicator.
- Disabled/muted: graphite/bronze, not brown.

### Semantic Colors In Gold

Semantic colors are allowed only when they communicate important status, but they should not dominate the layout.

- Success: muted gold or desaturated olive-gold, not bright green.
- Warning/streak: amber-gold, not orange flame as a large accent.
- Freeze: desaturated ice-blue only as a tiny icon detail.
- Error: muted red only for actual errors.
- Premium/gift: gold/ivory, not purple.

## Implementation Order

1. Fix base Gold palette and background first.
2. Fix tab bar active/inactive states.
3. Fix Home, because it defines the first impression.
4. Fix Lessons, because pastel cards are the most visible contradiction.
5. Fix Statistics/Streak, because it has the highest number of hardcoded semantic colors.
6. Fix icons/assets.
7. Run visual QA across all main screens and search for remaining hardcoded colors.

## Do Not Do

- Do not make surfaces brown and call it gold.
- Do not use huge gold/brown orbs as the main background.
- Do not leave old green/blue/purple/orange blocks on Gold screens.
- Do not use pastel lesson cards in Gold.
- Do not make selected states white.
- Do not solve this only inside `constants/theme.ts`.
- Do not rely on fog/grey assets as a replacement for gold assets.

