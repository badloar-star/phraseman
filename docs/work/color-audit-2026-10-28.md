# Аудит цвета: «каждый цвет — оттенок текущей темы» (4 · Темы, 28.10.2026)

Свежая перепись `node scripts/color_literal_census.mjs` (app, components, modules; без токенов и палитр, dev-витрин, тестов, комментариев, журналов; строки с `theme-exempt: <причина>` не считаются).

**Итого: 1343 литералов в 40 файлах из 2962 просмотренных; строк с пометкой theme-exempt — 862** (25.10 было 1468 в 43 файлах: Главная и сцены сошли с 43 до 8 литералов).

Сырая таблица «файл:строка → цвет → что на экране → токен» по каждому литералу — `node scripts/color_literal_census.mjs <файл>` (около 1400 строк); здесь — свёртка по файлам и решение по каждому.

## Цифры по решениям

| Решение | Литералов | Файлов | из них свободных от чужих правок |
|---|---|---|---|
| заменить токенами темы (живой экран) | 701 | 20 | 577 (12 ф.) |
| арт / коллекционное — theme-exempt с причиной | 237 | 8 | 223 (6 ф.) |
| мёртвое — удалить | 168 | 4 | 168 (4 ф.) |
| dev / служебное — вне сканера | 48 | 3 | 48 (3 ф.) |
| нужно решение владельца | 189 | 5 | 126 (4 ф.) |

Файлов с чужими незакоммиченными правками (Codex и др.): **11**, литералов в них **201** — не трогаю, список ниже.

## Таблица по файлам

| # | Файл | Литералов | Решение | Что это на экране | Чем заменить | Состояние |
|---|---|---|---|---|---|---|
| 1 | `components/paywallThemeConfig.ts` | 210 | A | Plus: старая таблица пейвола по ThemeMode (фон, текст, кнопки, акценты). Живая: `usePaywallChrome` → `PaywallPlusScreen`. | токены `g.*` (карта docs/work/paywall-m-theme-token-map-2026-10-25.md); таблицу снять целиком при сборке Пейвола М | зона Plus / Codex |
| 2 | `components/medalToastThemeStyles.ts` | 177 | A | Тост медали: старая таблица по ThemeMode, запасной путь рядом с токенами (`MedalToast`). | уже есть `medalToastThemeStylesFromTokens` — проверить, достижим ли запасной путь; недостижим → удалить таблицу | свободен |
| 3 | `app/daily_phrase_chrome.ts` | 126 | A | Фраза дня: градиент карточки, заголовок, подписи, кнопки по ThemeMode. Живая (`DailyPhraseCard`). | градиент → `g.accentGradient` / токены сцены; текст `g.text`, `g.secondary`; кнопка `g.cta`/`g.ctaInk` | свободен |
| 4 | `app/learning-v2/session/[id].tsx` | 106 | C | Старый экран занятия `LearningV2LegacySessionScreen`: `MODE_META` со своим цветом режима. Люди не видят (английский идёт через новый плеер). | удалить вместе со старым экраном после выхода OTA (решение координатора 25.10) | свободен |
| 5 | `app/paywall_copy.ts` | 80 | A | Plus: цвета оформления пейвола по ThemeMode рядом с текстами. | токены `g.*` вместе с paywallThemeConfig | ЧУЖОЙ ФАЙЛ (Codex, не закоммичен) |
| 6 | `app/theory_topic_accents.ts` | 76 | E | Раздел «Теория»: у каждой темы свой цвет (пожелание владельца) — пилюли формулы, акценты интерактива. | решение: оттенки текущей темы со сдвигом тона (`themeRoleColors`) или оставить цвет темы раздела с theme-exempt | свободен, нужно слово владельца |
| 7 | `components/learning-v2/horizons/model.ts` | 70 | B | Палитра иллюстраций «Горизонтов» (арт). | theme-exempt с причиной «иллюстрация» либо оттенки акцента темы — решение Макетов | свободен |
| 8 | `app/profile_card_system.ts` | 66 | B | Облики карточки профиля (коллекционный арт, фоны, акценты). | theme-exempt с причиной «облик карточки — коллекционный арт»; решение за владельцем зоны | свободен |
| 9 | `components/profile-card/profile_card_looks.ts` | 66 | B | Облики карточки профиля (коллекционный арт). | theme-exempt с причиной (как выше) | свободен |
| 10 | `components/CleanOnboarding.tsx` | 63 | E | Онбординг: первый экран новичка; тема ещё не выбрана. | решение, по какой теме красить (по умолчанию «Спокойно» → токены сцены) | ЧУЖОЙ ФАЙЛ (Codex, не закоммичен) |
| 11 | `components/ui/v2_theme.ts` | 56 | C | Токены режима «Турниры» (Deep Forest Green); турниры удалены в 2.0, импортёры — V2Countdown, V2Fx, v2_sheet. | проверить живость импортёров; мёртвые — удалить вместе; живые — на `g.*` | свободен, нужна проверка живости |
| 12 | `components/onboarding_aha/aha_theme.ts` | 46 | E | Онбординг «ага»: своя палитра (текст, фон, конфетти). | как CleanOnboarding: по теме по умолчанию | свободен, нужно решение |
| 13 | `app/learning_v2_session_intro_check.tsx` | 43 | D | Маршрут «проверка интро»: внутренний экран проверки (градиент `#10151D…`, звезда). | исключить из сканера как dev/служебный | свободен |
| 14 | `app/lingman_youtube_chrome.ts` | 25 | A | Оформление плеера YouTube Lingman по ThemeMode: акценты, мягкие подложки, текст кнопок. | `g.accent`, `g.accentSoft`, `g.ctaInk` (для olive — токены темы) | свободен |
| 15 | `app/pos_workout_engine.ts` | 15 | A | Цвета частей речи в тренировке (фиолетовый #7C3AED, оранжевый #F97316 …) — акценты плиток. | оттенки акцента темы через `themeRoleColors` (сдвиги тона), не фиксированные | свободен |
| 16 | `app/community_packs/ugcCardThemePresets.ts` | 12 | B | Цвета карточек, которые выбирает автор набора (неон-лайм, аква…). | theme-exempt: «цвет выбирает пользователь» | свободен |
| 17 | `app/_layout.tsx` | 11 | A | Корень приложения: цвета заставки/окна обновления (11 литералов). | токены `g.*` / `theme-exempt` для системных цветов | ЧУЖОЙ ФАЙЛ (Codex, не закоммичен) |
| 18 | `components/packs/CommunityScene.tsx` | 10 | A | Сцена наборов: белое на сцене, стекло (10 литералов). | чернила сцены `SPIRE_SCENE_INK` / токены сцены | ЧУЖОЙ ФАЙЛ (не закоммичен) |
| 19 | `app/flashcards/constants.ts` | 8 | A | Цвета категорий карточек (урок/слово/глагол/диалог) и шкала прогресса. | сдвиги тона акцента темы (`themeRoleColors`) для категорий; шкала — `semanticInk(g)` good/warn | свободен |
| 20 | `app/(tabs)/home.tsx` | 7 | A | Главная: окно званий — золотистые подложки кнопки и метки «текущее». | `g.warnSoft`; для золотой темы `g.accentSoft` | ЧУЖОЙ ФАЙЛ (Codex, не закоммичен) |
| 21 | `components/packs/CommunityAwardDecoration.tsx` | 7 | B | Награда месяца: золото, блики (7). | theme-exempt: «золото награды» | ЧУЖОЙ ФАЙЛ (не закоммичен) |
| 22 | `components/packs/CommunityWinnerDialog.tsx` | 7 | B | Окно победителя месяца: золото (7). | theme-exempt: «золото награды» | ЧУЖОЙ ФАЙЛ (не закоммичен) |
| 23 | `app/medal_utils.ts` | 7 | B | Цвета металлов медалей (бронза/серебро/золото). | theme-exempt: «цвет металла медали» | свободен |
| 24 | `app/community_packs/CommunityPackSocialBar.tsx` | 6 | A | Панель лайков набора (6). | `g.accentGraphic`, `g.bad` для сердца | ЧУЖОЙ ФАЙЛ (не закоммичен) |
| 25 | `components/premiumMemberStyles.ts` | 5 | C | Стили «участника Plus»; импортёров нет. | удалить | свободен |
| 26 | `app/flashcards/cardStatus.ts` | 5 | A | Цвета статусов карточек (new/learning/…) — метки и фильтры. | статусы: `g.secondary`/`g.accentGraphic`/`semanticInk(g).goodText` | свободен |
| 27 | `components/packs/CommunityPackScene.tsx` | 5 | A | Сцена набора (5). | токены сцены | ЧУЖОЙ ФАЙЛ (не закоммичен) |
| 28 | `app/flashcards/trainingSources.ts` | 4 | A | Цвета источников тренировки карточек. | `g.accentGraphic` со сдвигом тона | свободен |
| 29 | `app/_pos_analytics_audit.tsx` | 4 | D | Служебный экран аналитики (имя с `_`). | исключить из сканера | свободен |
| 30 | `app/flashcards_packs.tsx` | 3 | A | Экран наборов (3). | `g.*` | ЧУЖОЙ ФАЙЛ (не закоммичен) |
| 31 | `components/mistakes-panel/panelPaint.ts` | 3 | A | Краски панели «Ошибки» (3 литерала). | `g.bad`/`semanticInk(g).badText`, `g.opaqueControl` | свободен |
| 32 | `components/onboarding_aha/SpeechBeat.tsx` | 3 | E | Онбординг «ага», шаг речи (3 литерала). | как aha_theme | свободен, нужно решение |
| 33 | `components/learning-v2/horizons/art.ts` | 2 | B | Иллюстрации «Горизонтов» (2 литерала). | как model.ts | свободен |
| 34 | `components/packs/CommunityPackCheckScene.tsx` | 2 | A | Сцена проверки набора (2). | токены сцены | ЧУЖОЙ ФАЙЛ (не закоммичен) |
| 35 | `components/UpdateModal.tsx` | 2 | A | Окно обновления (2 литерала). | `g.scrim`, `g.mediaInk` | свободен |
| 36 | `components/home/HomeMistakesLockedSheet.tsx` | 1 | C | Шторка «Ошибки закрыты» на Главной: затемнение `rgba(0,0,0,0.5)`; файл никто не импортирует. | удалить (мёртвый) или `g.scrim`; Главная — по запрету владельца не трогать (в awaiting) | свободен, но «Главная — не трогать» |
| 37 | `app/_learning_v2_modes_showcase.tsx` | 1 | D | Витрина режимов Learning V2 (имя с `_`). | исключить из сканера | свободен |
| 38 | `app/notifications.ts` | 1 | A | Цвет канала уведомления (1 литерал, системный). | оставить: цвет Android-канала, не экран → theme-exempt с причиной | свободен |
| 39 | `components/DailyPhraseCard.tsx` | 1 | A | Фраза дня: 1 литерал. | `g.*` вместе с daily_phrase_chrome | свободен |
| 40 | `components/onboarding_aha/aha_ui.tsx` | 1 | E | Онбординг «ага» (1 литерал). | как aha_theme | свободен, нужно решение |

## Файлы с чужими незакоммиченными правками — для Codex

| Файл | Литералов | Что сделать |
|---|---|---|
| `app/paywall_copy.ts` | 80 | токены `g.*` вместе с paywallThemeConfig |
| `components/CleanOnboarding.tsx` | 63 | решение, по какой теме красить (по умолчанию «Спокойно» → токены сцены) |
| `app/_layout.tsx` | 11 | токены `g.*` / `theme-exempt` для системных цветов |
| `components/packs/CommunityScene.tsx` | 10 | чернила сцены `SPIRE_SCENE_INK` / токены сцены |
| `app/(tabs)/home.tsx` | 7 | `g.warnSoft`; для золотой темы `g.accentSoft` |
| `components/packs/CommunityAwardDecoration.tsx` | 7 | theme-exempt: «золото награды» |
| `components/packs/CommunityWinnerDialog.tsx` | 7 | theme-exempt: «золото награды» |
| `app/community_packs/CommunityPackSocialBar.tsx` | 6 | `g.accentGraphic`, `g.bad` для сердца |
| `components/packs/CommunityPackScene.tsx` | 5 | токены сцены |
| `app/flashcards_packs.tsx` | 3 | `g.*` |
| `components/packs/CommunityPackCheckScene.tsx` | 2 | токены сцены |

## План пакетов (после согласования)

1. **Фраза дня** — `daily_phrase_chrome.ts` (126) + `DailyPhraseCard.tsx` (1): живой экран, свободен, самый заметный.
2. **Тост медали и мелочь** — `lingman_youtube_chrome.ts` (25), `pos_workout_engine.ts` (15), `UpdateModal.tsx` (2), `panelPaint.ts` (3); `medalToastThemeStyles.ts` — сначала проверка достижимости, затем удаление таблицы или замена.
3. **Карточки (категории и статусы)** — `flashcards/constants.ts`, `cardStatus.ts`, `trainingSources.ts` (17) через `themeRoleColors`.
4. **Мёртвое** — `learning-v2/session/[id].tsx` (106), `premiumMemberStyles.ts` (5), `HomeMistakesLockedSheet.tsx` (1), `ui/v2_theme.ts` (56, после проверки живости): удаление уменьшает счёт без перекраски.
5. **Арт — пометки theme-exempt с причиной** (решение владельцев зон): карточка профиля (132), Горизонты (72), UGC-пресеты (12), медали (7).
6. **Ждут решения**: «Теория» (76), онбординг (63 + 46 + 4).
7. **Plus** (210 + 80) — вместе с Пейволом М, зона Codex.

## Ratchet

Тест `tests/color_literal_census_ratchet.test.ts` + `config/color-literal-census-baseline.json`: по файлам, число литералов не растёт, новые файлы с литералами не появляются; сканер — тот же, что у переписи (общий модуль). Снижение фиксируется `node scripts/color_literal_census.mjs --baseline`.


## Статус на вечер 28.10

Счёт литералов: **1343 → 760** в 18 файлах (минус 583). Ratchet — `tests/color_literal_census_ratchet.test.mjs`, база `config/color-literal-census-baseline.json` (760).

| Пакет | Коммит | Что | Литералов |
|---|---|---|---|
| ratchet + общий сканер | 6b493e83c | `scripts/color_literal_scan.mjs`, тест, база | — |
| 1 «Фраза дня» | ee52303b3 | оформление карточки из токенов текущей темы | −127 |
| 2 мелочь | 25a6393c7 | таблица YouTube удалена, мёртвое поле `accent` у POS, плитка «Ошибок» на токенах, 3 системных цвета с причиной | −46 |
| B + 4 + онбординг | ec25c850c | `theme-exempt` с конкретной причиной для арта (карточка профиля, Горизонты, UGC-пресеты, цвета металлов), удалён `premiumMemberStyles.ts`, онбординг «ага» в цвета темы (`ahaThemeFor`) | −278 |
| «Теория» + замки | см. `git log` «Theory takes its accent» | акцент темы урока = оттенок акцента текущей темы + сдвиг по номеру урока; две строки в `docs/work/OWNER_LOCKS.md` | −84 |

Остаются: Plus (`paywallThemeConfig` 210, `paywall_copy` 80 — Codex), `medalToastThemeStyles` 177 (удалить вместе с пропом витрины и двумя тестами), `learning-v2/session/[id].tsx` 106 (после OTA), `ui/v2_theme.ts` 56 (кластер «Турниров»), онбординг `CleanOnboarding.tsx` 63 (Codex), цвета статусов карточек 9 (закреплены тестом, решение Макетов), `app/_layout.tsx` 11 и наборы 31 (Codex). Подробно по файлам Codex — `docs/work/color-audit-codex-list-2026-10-28.md`.
