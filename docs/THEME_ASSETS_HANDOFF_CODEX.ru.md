# HANDOFF для Codex — темы Ванилла/Кенди Блу/Индиго/Лайм: доработка + генерация ассетов + новые монеты

> Дата: 2026-07-22. Ветка: `feature/referral-roulette`. Автор хэндофа: Kimi-сессия.
> Сначала прочитай `AGENTS.md` полностью — особенно разделы **New Theme / Per-Theme Asset Hygiene**, **Codex Bulk Image Safety**, **Codex OpenAI API Firewall**, **UI Contrast Rule**, **Do Not Delete Functionality**, **Tests Are Read-Only Guards**.

---

## 1. Миссия (одним абзацем)

Довести до конца ребрендинг тем, начатый 2026-07-21: (A) починить светлую тему **Ванилла** — сейчас фон/плашки/элементы сливаются, нужны нормальные контрасты и градиенты контейнеров как у остальных тем; (B) сгенерировать через DALL-E пайплайн **полный набор ассетов** для новых тем `candyBlue`, `indigo`, `vanilla` (сейчас они переиспользуют ассеты `minimalDark` как fallback) в стиле уже существующих ассетов приложения; (C) перегенерировать ассеты темы **Лайм** (ключ `volt`, бывшая «Вольт») под новую лаймовую концепцию; (D) **полностью переделать ассеты монет** (`assets/images/currency/coin_*.webp`) — текущие владельцу не нравятся и не подходят по стилю.

## 2. Что уже сделано (не переделывать)

Коммиты на ветке `feature/referral-roulette`:

- В `constants/theme.ts` добавлены палитры `CANDY_BLUE`, `INDIGO`, `VANILLA`; `ThemeMode` расширен: `'candyBlue' | 'indigo' | 'vanilla'` (все три — premium-only).
- Ребрендинг: `volt` → label **«Лайм»** (акцент `#C6FF34`), `minimalDark` «Графит» → **«Оникс»** (фон `#0B0B0C`/`#171717`), `coral` акцент → `#FF7F50`, `ember` акцент → `#FFCC55`. Ключи НЕ переименованы (миграция не нужна).
- Названия на 8 языках в `app/settings_themes.tsx` (THEME_OPTIONS + themeSwatches) и `app/(tabs)/settings.tsx` (names + SETTINGS_SURFACES).
- Все `Record<ThemeMode, …>`-карты покрыты (иконки новых тем → fallback на `minimalDark`-ассеты). `tsc` по новым темам чист.
- Тесты обновлены: `tests/theme_context_default.test.ts`, `tests/paywallThemeConfig.test.ts`. Мёртвые тесты удалённых квизов/арены удалены (`arena_season_reward_icon_assets`, `cinema_home_assets`, `cinema_theme_assets`). Фокусные сьют: 5 шт, 63 теста зелёные.

### Палитры новых тем (источник: `constants/theme.ts`)

| Тема | Ключ | Фон | Акцент | Текст на акценте |
|---|---|---|---|---|
| Кенди Блу | `candyBlue` | `#0B161B` | `#B2D5E5` | тёмный `#07110A` |
| Индиго | `indigo` | `#14131F` | `#C8C3FF` | тёмный `#17162B` |
| Ванилла (светлая!) | `vanilla` | `#F1E6CB`* | `#3D4E8F` (royal dusk) | белый |

\* — см. §3: в рабочем дереве есть **незакоммиченные правки Ваниллы**, их сохранить и доделать.

## 3. НЕЗАКОММИЧЕННОЕ — сохранить и доделать (задача A: Ванилла)

В `constants/theme.ts` уже внесены (git diff, 15 строк) первые правки контраста Ваниллы:

- `bgPrimary #FAF4E4 → #F1E6CB`, `bgCard → #FFFDF6`, `bgSurface → #F8F0DA`, `bgSurface2 → #EEDFC0`
- `border #E3D6B8 → #D9C69C`, `borderLight → #E9DCC0`, `textGhost → #B7A888`
- `shadowDark → rgba(58,44,8,0.30)`, `cardShadow → rgba(58,44,8,0.24)`, `borderHighlight → #FFFDF6`
- `cardGradient → ['#FFFEF9', '#F0E2BE']`, `bgGradient → ['#F1E6CB', '#E7D5AC', '#DCC694']` (3 стопа, через `as unknown as`)

**Что осталось для Ваниллы:**

1. `constants/screenBackground.ts` — запись `vanilla` всё ещё старая `['#FAF4E4', '#F3E9D2']`; привести к новой гамме (3 стопа как у других тем, тёплая глубина вниз).
2. Проверить `app/(tabs)/settings.tsx` `SETTINGS_SURFACES.vanilla` и `app/settings_themes.tsx` `themeSwatches('vanilla')` — синхронизировать с новыми hex.
3. Пройтись глазами по картам, где vanilla получила «светлые» значения (themedToastChrome, statsThemeChrome, medalToastThemeStyles, DailyTaskRewardToast, DailyTasksFirstVisitModal, RewardModalBackdrop, cardPackPaywallTheme, paywallThemeConfig, weekDotTheme, leagueBonusPalette, daily_phrase_chrome): убедиться, что карточки отделяются от фона (бордер/тень/градиент), а не сливаются. Критерий владельца: «фон, плашки и все элементы не должны сливаться».
4. Проверить, что на акцентных CTA Ваниллы текст белый на `#3D4E8F`, на `correct #5E9A3C` — белый (UI Contrast Rule не нарушать).
5. tsc + фокусные тесты (§7), коммит отдельным коммитом `fix(themes): ванилла — контрасты и градиенты контейнеров`.

## 4. Задача B: полные ассеты для candyBlue / indigo / vanilla (DALL-E пайплайн)

Сейчас во всех asset-картах новые темы указывают на `minimalDark`-ассеты (fallback). Нужно сгенерировать собственные наборы и перевести `require()` на них.

### Слоты (= точно такие же наборы ключей, что у minimalDark; ни больше ни меньше — AGENTS.md «Match the existing theme's slot list exactly»)

Перечисли слоты из самих карт (не хардкодь, возьми из источника):

- `constants/streakIconAssets.ts` — tier-иконки стрика (10 порогов: 1/2/3/5/7/10/20/35/60/100) + связанные rgb/accent-записи
- `constants/boonIconAssets.ts` — 11 бун-иконок (streak_saver, mystery_monday, turbo_regen, energy_free_window, double_xp, flashcard_friday, arena_saturday, speaking_saturday, early_bird, perfect_week, comeback)
- `constants/socialIconAssets.ts` — 2 карты соц-иконок
- `constants/trainerThemeIcons.ts` — 3 вида (phrases, words, analytics) + строковые пути
- `constants/weeklyCompassIcons.ts` — компас-иконки
- `constants/levelGiftRewardIcons.ts`, `constants/levelGiftImages.ts`, `constants/leagueBonusGiftImages.ts` — подарки уровней/лиги
- `constants/generatedThemeIconAssets.ts` — главная иконка темы
- `app/home_menu_icons.ts` — ветка иконок домашнего меню (сейчас новые темы шарят ветку minimalDark)

### Стиль

Ориентир — существующие ассеты minimalDark/midnight в `assets/images/**` (открой несколько и повтори манеру: тот же рендер-стиль, композиция, фон/прозрачность, размеры). Палитра обязана соответствовать теме: candyBlue — холодная синева `#0B161B` + леденцовый голубой `#B2D5E5`; indigo — сумрак `#14131F` + лаванда `#C8C3FF` + royal dusk `#273468`; vanilla — светлая тёплая бумага + royal dusk `#3D4E8F` (иконки должны читаться на СВЕТЛОМ фоне — тёмные силуэты/обводки).

### Техника (AGENTS.md Codex Bulk Image Safety — обязательно)

- Никаких in-thread DALL-E батчей. Файловый пайплайн: промпты/манифест/чекпоинты в `.codex-tmp/theme-assets-<theme>/`, картинки сразу на диск.
- Длинные генерации через `node scripts/codex-safe-run.mjs -- <command>`, в stdout только короткие прогрессы.
- Можно форкнуть существующий генератор (например `scripts/generate-coin-icons.mjs` или `scripts/generate-skyler-thematic-theme-assets.mjs`) в `scripts/generate-theme-assets.mjs` с параметром `--theme`.
- Финалы: `assets/images/<feature>/<theme>/...` — **только** проводимые `require()` файлы, webp, сжатие quality ~58–80 через `sharp` (альфа сохранить). Исходники/контакт-шиты — в `*sources*`/`.codex-tmp/`, НЕ в bundled-дерево.
- Сначала wire `require()` (уже wired на fallback → просто переключить пути), потом генерация. 1:1 слоты.
- После: аудит — каждый новый файл в `assets/images/**` встречается в исходниках (базовое имя) ровно там, где ожидается.

## 5. Задача C: новые ассеты для Лайм (ключ `volt`)

Тема переименована «Вольт» → «Лайм», акцент теперь `#C6FF34` (research lime). Ассеты остались вольтовыми — перегенерировать под лаймовую концепцию (сочный лайм `#C6FF34` на чёрном/карбоне, тот же рендер-стиль cinema-тем). Слоты: те же, что у volt сейчас — `constants/cinemaAssetVariants.ts` (midnight/ember/aurora/volt), cinema-иконки в общих картах, home_menu_icons ветка `volt`. Ключи и пути имён можно оставить `volt`-префиксом (файловая схема не меняется) — меняется только визуал. Сжатие webp обязательно.

## 6. Задача D: переделать ассеты монет

- Файлы: `assets/images/currency/coin_{1,2,3,5,10}.webp`, карта `app/coin_icons.ts`, генератор `scripts/generate-coin-icons.mjs`.
- Текущий дизайн владельцу не нравится («не подходят и не нравятся»). Сделать новый, стилистически родной приложению (посмотри на иконки стрика/бунов/подарков — объём, блики, чистый силуэт, прозрачный фон).
- Иерархия по номиналу сохраняется: coin_1 → coin_10 визуально «богаче» (больше монет/металл дороже), но единый стиль. Число рядом — главный индикатор, иконка вторична (см. комментарий в `app/coin_icons.ts`).
- Имена файлов и ключи `COIN_ICONS` НЕ менять (уже wired). Перезаписать webp, сжать.

## 7. Верификация (после каждой задачи)

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "candyBlue, indigo, vanilla"   # должно быть пусто
npx jest tests/theme_context_default.test.ts tests/paywallThemeConfig.test.ts \
  tests/app_art_backdrop_contract.test.ts tests/cinema_asset_variants.test.ts \
  tests/quiz_level_theme_assets.test.ts                                       # всё зелёное
```

- Не запускать широкие сьюты/гейты (AGENTS.md Session Performance). Не чинить чужие падения (арена/квизы удалены владельцем осознанно).
- В дереве работают параллельные сессии — коммить только свои файлы, ничего чужого не ревертить; перед коммитом `git status` и точечный `git add`.

## 8. Acceptance criteria

- Ванилла: фон/карточки/плашки визуально различимы (Δ фон↔карта заметна, бордеры видны, тени мягкие тёплые), градиенты контейнеров есть и сопоставимы по выразительности с другими темами; контраст-текст правило соблюдено.
- candyBlue/indigo/vanilla: ни одна asset-карта не указывает на minimalDark-fallback; каждый слот — собственный сжатый webp; аудит basename-поиском чист.
- volt: все ассеты в лаймовой гамме `#C6FF34`, стиль cinema сохранён.
- Монеты: 5 новых webp, единый стиль с приложением, имена/ключи без изменений.
- tsc чист по новым темам, 5 фокусных сьютов зелёные, отдельные коммиты на каждую задачу (A/B/C/D).

## 9. Известные риски

- Параллельные сессии периодически перетирают дерево — перед стартом `git status`, после каждой задачи коммит.
- `app/(tabs)/quizzes.tsx`, арена и часть quiz-инфраструктуры удалены владельцем — не восстанавливать и не «чинить» связанные падения.
- Светлые ассеты Ваниллы на тёмных тостах/пейволах могут смотреться чужеродно — проверить места, где chrome-тостов для vanilla светлый.
