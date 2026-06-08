# PHRASEMAN — ПОЛНЫЙ ДИЗАЙН-АУДИТ (визуальный UI)

> Дата: 2026-06-08
> Фокус: цвета, типографика, отступы, иерархия, радиусы, контраст
> Метод: 5 параллельных аудит-агентов по всем поверхностям приложения
> Эталон: `constants/theme.ts` (7 тем) + `components/ThemeContext.tsx` (ds.spacing/ds.radius) + `app/typography.ts` (Inter)

---

## 0. TL;DR — что приложение упускает

Приложение **функционально богатое и красиво нарисованное**, но дизайн-система **держится на честном слове**. Три системных дефекта пронизывают весь код и обесценивают усилия по темизации:

1. **🔴 Жирный шрифт не работает на Android.** ~1 910 мест используют `fontWeight: '700'/'800'/'900'` БЕЗ `fontFamily: 'Inter-Bold'`. На Android для кастомного шрифта числовой вес игнорируется — **весь жирный текст рендерится обычным Roboto**. Вся типографическая иерархия (заголовки, CTA, стрик-счётчик, фраза-герой) на Android визуально плоская. Шрифты Inter-Bold/SemiBold/Black загружены, но **не используются ни в одном экране**.

2. **🔴 ~143 файла хардкодят цвета мимо тем.** Десятки `const xxxAccent = '#A78BFA'`, `#FFD700`, `#34C759` и т.д. не переключаются при смене темы. В 7 темах (особенно светлых: minimalLight) это даёт чужеродные пятна и «светлое-на-светлом». `#A78BFA` (41 вхождение) — артефакт **мёртвой** фиолетовой дизайн-системы из `UI_STANDARD_V5`.

3. **🔴 Радиусы — анархия: 64 уникальных значения** borderRadius (14, 17, 18, 22, 28, 30…) при наличии готового `ds.radius`. Это главный визуальный сигнал «непричёсанности».

Плюс два архитектурных: **`ThemedText`/`ThemedView` — мёртвые Expo-шаблонные компоненты**, не подключённые к `ThemeContext` (ломаются при смене темы), и **вся проектная UI-документация устарела** (описывает несуществующую фиолетовую систему).

**Суммарно: ~100+ критичных находок, ~45 средних, ~40 мелких.**

---

## 1. СИСТЕМНЫЕ ПРОБЛЕМЫ (фундамент)

### 🔴 1.1 fontWeight числом без fontFamily → нет жирного на Android
**Это дефект №1 проекта.** Распределение по всему коду:

| Вес | Кол-во мест |
|---|---|
| `'900'` | 590 |
| `'800'` | 441 |
| `'700'` | 516 |
| `'600'` | 187 |
| `'500'` | 57 |

`typography.ts` загружает `Inter-SemiBold/Bold/Black` в `APP_FONT_ASSETS`, но `themed-text.tsx` не задаёт `fontFamily` вообще, и **ни один экран не использует Inter-Bold через fontFamily**.

**Норма:** `'700'+` → `fontFamily: 'Inter-Bold'`; `'600'` → `'Inter-SemiBold'`; `'900'` → `'Inter-Black'`. Лучше — единый компонент `AppText` с пропом `weight`, маппящим в правильный `fontFamily`.

### 🔴 1.2 `ThemedText` / `ThemedView` — мёртвые шаблонные компоненты
Используют `useThemeColor` из Expo-шаблона (читает `Colors.light/dark`, которые **оба = DARK**), а НЕ `useTheme()` из `ThemeContext`. Игнорируют `f.*`, `ds.fontFamily`, пользовательский `FONT_SCALE`. Роли (`title: 32`, `default: 16`) захардкожены. `collapsible.tsx` использует их → при теме minimalLight фон будет тёмно-зелёным вместо бежевого.
**Норма:** удалить/переписать на `useTheme()`. В проекте фактически 2 параллельные системы текста.

### 🔴 1.3 Радиусы — 64 уникальных значения
Топ частоты: `14`(218), `16`(152), `12`(135), `18`(133), `10`(87), `20`(79), `999`(78), `8`(71), `22`(47)… плюс экзотика 66/74/86/90/104/110/120/170. `ds.radius` (`md12/lg16/xl20/xxl24`) есть, но **игнорируется большинством экранов**.
**Норма:** только `ds.radius.*`. Добавить `sm:8`, `full:999`. Grep-replace частых: 14→lg, 18→xl, 10→md.

### 🔴 1.4 143 файла с захардкоженными hex вне тем
83 в `app/`, 60 в `components/`. Топ: `#FFFFFF`(120), `#FFD700`(81), `#D4A017`(45), **`#A78BFA`(41 — фиолет мёртвой V5)**, `#C8FF00`(38), `#000000`(28), `#22C55E`(27).
- `CustomSwitch.tsx` — `'#34C759'` (iOS-зелёный) вместо `t.correct`: в NEON/CORAL переключатель будет iOS-зелёным.

### 🟡 1.5 Светлые темы выпадают из реестра
`LIGHT_OCEAN` и `LIGHT_SAKURA` экспортируются из `theme.ts`, но НЕ включены в `THEME_MAP` и тип `ThemeMode` (мигрируют в `dark`). ~90 строк мёртвого кода в главном файле системы.

### 🟡 1.6 Контраст CTA в CORAL ниже WCAG AA
CORAL: `correct: '#4A90FF'` + `correctText: '#FFFFFF'` ≈ **3.1:1** (норма 4.5:1). Кнопки правильного ответа в корал-теме не проходят доступность. (MINIMAL_LIGHT 7.8:1 — ок, остальные тёмные — ок.)

### 🟡 1.7 Spacing централизован, но обходится
`ds.spacing = {xs4,sm8,md12,lg16,xl24,xxl32}` есть, но `collapsible.tsx`, экраны упражнений и др. хардкодят `gap:6`, `padding:17/20/22`.

### 🟡 1.8 Нет канонической кнопки/текста
150 файлов используют сырой `TouchableOpacity`/`Pressable` мимо `PressableScale`/`TapScale` → разный тактильный отклик. `PrimaryButton.tsx:73` сам страдает от fontWeight `'800'` без fontFamily.

---

## 2. ЭКРАНЫ: Главная / Уроки / Вызовы

### 🔴 Критичные
- **Energy-тултип `home.tsx:3491–3556`** — полностью вне системы: `#1C1C1E`, `#2C2C2E`, `#8E8E93`, `#FFFFFF` (Apple HIG-цвета). В minimalLight — тёмное пятно на светлом.
- **Freeze-карточка `home.tsx:2375–2454`** — захардкожена в cyan: `#1A3A5C`, `#4FC3F7`, `#90CAF9`. В CORAL/GOLD/NEON выглядит чужеродно.
- **Comeback/repair-баннеры `home.tsx:1568,1594,1622`** — `#FF9500` (оранжевый) вместо `t.gold`.
- **`home.tsx:519`** — `BONUS_ENERGY_COLOR='#FFD700'` fallback не равен `t.gold` в NEON/CORAL/MINIMAL.
- **`lesson_complete.tsx:884–885`** — аватар-заглушка `#3A3A3A`/`#555`, не адаптируется к светлым темам.
- **`daily_tasks_screen.tsx:2746,2416,1978`** — `rgba(13,32,36,0.82)`, `#16120A/#FFD700`, `#63D98F` зашиты под тёмно-зелёный.
- Множество `fontWeight: '900'/'800'` без fontFamily: `home.tsx:1815,1890,2228,2878,3202`, `lesson_complete.tsx:901,919,952`, `lesson1.tsx:828`, `daily_tasks_screen.tsx:2781`.

### 🟡 Средние
- `quizzes.tsx:224–234` `THEME_TEXT` и `:169–219` `THEME_PALETTES` — дублируют токены темы, используют **устаревший** `LegacyQuizThemeMode` (light/neon/ocean/sakura), которого нет в текущем `ThemeMode` → новые темы (lightSakura/lightOcean) никогда не применятся.
- `daily_tasks_screen.tsx` — 26+ полей `tone` (`#60A5FA`,`#FBBF24`,`#34D399`,`#A78BFA`,`#FB7185`…) не привязаны к теме.
- Магические размеры/отступы: `home.tsx:1899` (`marginTop:19/marginBottom:18`), `lesson_complete.tsx:901–976` (fontSize 30/17/15/16/18 мимо шкалы `f.*`).
- Разнобой радиусов: `lesson_menu.tsx:1231/1282` (10/18 vs 14/24), `lesson_complete.tsx` padding 18 vs 16 у одинаковых CTA.

### 🟢 Мелкие
- `_layout.tsx:379` таббар `fontWeight:'600'` без fontFamily; `:549` `fontSize:10` (ниже порога читаемости).
- `home.tsx:556` `sketchShardAccent='#6245B2'/'#A78BFA'`; `lesson_menu.tsx:1088–1091` CEFR-цвета хардкод (слабый контраст на minimalLight).
- `lesson1.tsx:826,845`, `quizzes.tsx:1958,1981,1993,2227,2420` — оранжевые/золотые/красные хардкоды вместо `t.gold`/`t.wrong`.

---

## 3. ЭКРАНЫ УПРАЖНЕНИЙ: Тренажёр / План / Экзамен

### 🔴 Критичные
- **Семантические цвета не токенизированы** (главное здесь). Свои hex вместо `t.correct/t.wrong/t.correctBg/t.wrongBg`:
  - `#40C080`/`#E05050` — `trainer_words_session.tsx:430–562`, `trainer_phrases_session.tsx:144`, `trainer_arena_session.tsx:281`, `preposition_drill.tsx:512`
  - `#22C55E`/`#F87171` (цвета мёртвой V5) — `personal_plan_exercise.tsx:1086–1127`, `trainer_smart_session.tsx:933`
  - `#FB7185` — `trainer_smart_session.tsx:934`, `trainer_session_report.tsx:128`
  - Акценты секций `#2DD4BF/#60A5FA/#FB7185` — `trainer.tsx:142,169,196`
- **Фраза-герой size-хаос:** `personal_plan_exercise.tsx:1338` — 36px; `trainer_smart_session.tsx:700` — `f.h2`(18px). Одна роль = 3 разных размера в разных сессиях. fontWeight `'700'/'900'` без fontFamily → на Android не Inter-Bold.
- **Захардкоженные палитры/фоны:** `level_exam.tsx:451–456` (объект `LX`), `exam.tsx:1166,1186,1212,799`, `review.tsx:1695,1703`, `personal_plan_task_done.tsx:84–119` (`#4ECDC4`), `personal_plan_exercise_transition.tsx:18–54` (7 hex типов), `preposition_drill.tsx:569` (`#2E7D52`), `trainer_phrases_session.tsx:222,498`.

### 🟡 Средние
- Отступы магическими числами почти везде (`personal_plan_exercise.tsx`, `trainer_phrases_session.tsx`); `ds.spacing` применён только в `preposition_drill.tsx`.
- Радиусы 17/28/30 (`personal_plan_exercise.tsx:1257,1293,1305`), 10/16/18 (`trainer_phrases_session.tsx`).
- `trainer_phrases_session.tsx:144` feedback слабый: только цвет рамки, без фона/иконки/«Верно!» — нарушает «feedback должен быть заметен».
- `lesson_help.tsx` — **19 000+ строк** (макс. 800), inline-стили, `#F5A623` хардкод.

### 🟢 Мелкие
- `trainer_phrases_session.tsx:570,596` `'#fff'` вместо `t.correctText` (нечитаемо в minimalLight); `trainer_arena_session.tsx:194` `#E05050`/`#fff`; `exam.tsx:968+` `#D4A017` ≠ `t.gold`; `ClozeGapText.tsx:39` `'800'` без fontFamily.

### Расхождение со стандартом V5
**`UI_STANDARD_V5_CANONICAL.md` — мёртв на 100%.** Ни один цвет V5 (`#7C6FF7/#1E1A2E/#F0EEF8`) не в рабочем коде. Реальная система — зелёная Duolingo + 7 тем. Не использовать V5 как ориентир.

---

## 4. МОДАЛКИ / ПЕЙВОЛЛ / PREMIUM

### 🔴 Критичные
- **`StreakReviveModal.tsx:259` и `EnergyRefillShardModal.tsx:169`** — `const isLight = false;` хардкод → модалки **никогда** не адаптируются к светлым темам. Белый текст (`PAYWALL_MODAL.title='#FFFFFF'`) на светлом фоне = невидим.
- **`ForceUpdateScreen.tsx:112–139`** — собственная LIGHT/DARK из нативного colorScheme, игнорирует все 7 тем; CTA `#4F8EF7` хардкод.
- **`PremiumCelebrationModal.tsx:674–730`** — весь StyleSheet захардкожен (`#FFD700`,`#FFE07A`,`#1a1208`).
- **`ReleaseNotesModal.tsx:430–610`** — весь StyleSheet вне системы (`rgba(3,7,18,0.82)`,`#FFF7E3`,`#DDE7F6`,`#121826`), ни одного `t.`.
- `PremiumGoldButton.tsx:112` `#1a1206` вместо `t.textOnGold`.

### 🟡 Средние
- `premium_modal_v2.tsx:484` `'800'` без fontFamily; `:241` ternary только под minimalLight (не coral/compass).
- `IntroFullAccessModal.tsx:76–77` ternary вместо `t.textPrimary`.
- `LevelGiftModal.tsx:719–786` amber-блоки `#FEF3C7/#D97706/#78350F` без адаптации (на dark/neon выбиваются).
- `StreakReviveModal.tsx:472`, `ShardsEarnedModal.tsx:338` (`#fff` ribbon), `ReleaseNotesModal.tsx:439,541` хардкоды.
- `PremiumGoldButton.tsx:71,137` градиент/тень не из `GOLD_GRADIENTS`.
- **Дубль пейволла:** `premium_modal.tsx` (V1, legacy, много хардкодов) vs `premium_modal_v2.tsx` (V2, чёткая пирамида, `tc`-конфиг). → удалить V1.

### 🟢 Мелкие
- Радиусы модалок: 22/10/8/28/26/32/24/30/16 — нет стандарта.
- `ForceUpdateScreen.tsx:148`, `PremiumCelebrationModal.tsx:64–70`, `premium_modal_v2.tsx:243` хардкоды/локальные палитры.

---

## 5. АРЕНА / ЛИГИ / ДРУЗЬЯ / НАСТРОЙКИ / СТАТИСТИКА

### 🔴 Критичные — Арена (антипаттерн `const xxxAccent`)
- **Локальные акцент-константы в 5 файлах** (не реагируют на тему):
  - `arena_results.tsx:220–224`: `#A78BFA/#F87171/#38BDF8/#F97316`
  - `arena_room.tsx:175–178`: `#22C55E/#F59E0B` + градиенты
  - `arena_leaderboard.tsx:166`: `#F59E0B`; `arena_room.tsx:75–76`, `arena_game.tsx:979–988`
- Победа/поражение хардкод: `arena_rating.tsx:125,138` `#4CAF50`/`#F44336` вместо `t.correct/t.wrong`.
- Золото хардкод: `arena_rating.tsx:158,447,571,388,413` `#FFD700`/`#D4AF37`/`#1a1208` вместо `t.gold/t.textOnGold`.
- `arena_room.tsx:592,766` `#EF4444`; `arena_leaderboard.tsx:437` disabled `#4A4A4A/#6A6A6A`.
- Везде `fontWeight '800'/'900'` без fontFamily (arena_game/room/lobby — десятки мест).

### 🔴 Критичные — Лиги
- **`theme.ts:483–490` `STRINGS.leagues`** — все 6 цветов лиг захардкожены. «Профессор» `#E8F0EB` (почти белый) **невидим на светлых темах** (minimalLight/SAKURA/OCEAN). Системный контраст-риск.

### 🔴 Критичные — Друзья/Достижения
- `friends_screen.tsx:636,650` `#e55` (удаление друга) вместо `t.wrong`.
- `achievements_screen.tsx:901–908` `CAT_COLOR` — 7 категорий хардкод (`#FF6B35/#3B82F6/#F59E0B/#8B5CF6/#EC4899/#10B981/#E11D48`), не переключаются; в GOLD синий конкурирует с `t.gold`.

### 🔴 Критичные — Настройки/Магазин
- `shards_shop.tsx:85–86` `SHARD_TEAL='#2EC4B6'` — фирменный цвет осколков вне темы (конфликт в GOLD/minimalLight).
- `settings_themes.tsx:84` `cardText='#F5F5F5'` под тёмные карточки.

### 🟡 Средние
- `arena_lobby.tsx:1465–2952` — большой словарь тема→стиль с 30+ rgba; медали `#FACC15/#D6DEE8/#D69E65`; «живой» `#58E58B`.
- `streak_stats.tsx:378,444,1026,1152,2664` — статусные цвета score, iOS `#34C759/#FF3B30`, лавандовый fallback.
- `settings_themes.tsx:229,270`, `phrase_analytics_screen.tsx:52–68` (палитра с `rgba(255,255,255,0.55)` — невидима в светлых).

### 🟢 Мелкие
- `friends_screen.tsx:713,654`, `settings_notifications.tsx:114`, `avatar_select.tsx:127–174`, `personal_plan_stats_screen.tsx:39–46` — локальные палитры/overlay вместо `t.*`.

---

## 6. ПРИОРИТЕТНЫЙ ПЛАН (что чинить первым)

| # | Приоритет | Действие | Эффект |
|---|---|---|---|
| 1 | ✅ СДЕЛАНО | ~~Ввести `AppText`~~ → выбран **глобальный перехват** `Text.render` ([app/font_family_patch.ts](app/font_family_patch.ts), подключён в [app/_layout.tsx](app/_layout.tsx)). Маппит fontWeight→Inter-Bold/SemiBold/Black для всех ~1910 мест сразу, не трогая иконки/эмодзи. Покрыт тестом [tests/font_family_patch.test.ts](tests/font_family_patch.test.ts) (11/11 ✓). | Жирный текст и иерархия теперь работают на Android |
| 2 | 🔴 ВЫСОКИЙ | Удалить/переписать `ThemedText`/`ThemedView` на `useTheme()`; убрать `collapsible.tsx` с шаблона | Темы перестанут ломаться |
| 3 | 🔴 ВЫСОКИЙ | Токенизировать семантику: все `#40C080/#E05050/#22C55E/#F87171/#4CAF50/#F44336` → `t.correct/t.wrong` | Feedback корректен во всех 7 темах |
| 4 | 🔴 ВЫСОКИЙ | Убрать `const isLight=false` (StreakRevive, EnergyRefill), починить `ForceUpdateScreen` | Светлые темы читаемы |
| 5 | 🔴 СРЕДНИЙ | Цвета лиг (`theme.ts:483`) и `CAT_COLOR` → встроить в темы / добавить контрастный `textColor` | «Профессор» виден на светлых |
| 6 | 🟡 СРЕДНИЙ | Стандартизировать `borderRadius` → только `ds.radius.*` (grep-replace 14/18/10) | Уйдёт «непричёсанность» |
| 7 | 🟡 СРЕДНИЙ | Выпилить V1-пейволл; убрать `#A78BFA` (41 шт., мёртвая V5) | Консистентный пейволл |
| 8 | 🟡 НИЗКИЙ | Контраст CORAL `correctText` на `#4A90FF` (3.1:1 → ≥4.5:1) | Доступность AA |
| 9 | 🟢 ГИГИЕНА | Архивировать `UI_STANDARD_V4/V5_CANONICAL/PREMIUM_UI_GUIDE`; создать живой `DESIGN_TOKENS.md` из ThemeContext | Один источник правды |
| 10 | 🟢 ГИГИЕНА | Разбить `lesson_help.tsx` (19k строк); `LIGHT_OCEAN/SAKURA` — вернуть в реестр или удалить | Поддерживаемость |

---

## 7. ЧТО У ПРИЛОЖЕНИЯ ХОРОШО (чтобы не сломать)

- 7 проработанных тем с богатой палитрой (GOLD/COMPASS — премиальные металлические).
- `ds.spacing` и `ds.radius` **существуют** и масштабируются под размер экрана (`computeUiScale`) + пользовательский `FONT_SCALE` — фундамент есть, его надо просто **применять**.
- `PressableScale`/`TapScale` корректно разделены по назначению (тактильность).
- Текстовые токены тем (`textPrimary/textSecond/textMuted/textGhost`) последовательны по структуре во всех темах.

**Главный вывод:** инфраструктура дизайн-системы уже построена правильно — проблема не в её отсутствии, а в том, что **сотни экранов её обходят** хардкодами. Самая высокоокупаемая работа — не новый дизайн, а *приведение существующего кода к уже готовым токенам* + фикс шрифта на Android.
