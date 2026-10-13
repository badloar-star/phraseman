# Ночная проверка регрессий — 13.10 (коммиты кода с 12.10 22:00)

Исполнитель: 5 · АВТОРИЗАЦИЯ, по заданию координатора. Пакет: `docs/work/tasks/night-regression-2026-10-13.md`.

## Как проверяли

- 186 изменённых за ночь файлов `app/ components/ modules/ hooks/ constants/` → 579 покрывающих тестов (импорт или чтение исходника).
  26 файлов без единого теста — список внизу.
- 73 группы по 8 файлов, одна нить (`--runInBand`), только при свободной памяти ≥ 2 ГБ, со слотом светофора. Памяти хватило везде, OOM — 0.
- Итог прогона: **5057 тестов, 146 красных, 17 групп с красным.** Почти все 146 — одна группа Learning V2 (134).
- ⚠️ Первый запуск был пустым: npm-обёртка падала на пробеле в «C:\Program Files», группы «проходили» за 0 с без единого теста.
  Перезапуск — прямым вызовом раннера; пустая группа теперь помечается `NO_RESULT`.

## Итог по красным

### Ночные регрессии (коммит после 22:00)

| Тест | Коммит | Зона | Причина | Статус |
|---|---|---|---|---|
| dev_coin_rank | eb0bd2e49 (23:16) | Авторизация | комментарий в `app/dev_coin_rank.ts` называл файл хука повышения — сторож запрещает это имя | **исправлено c0aa76dc3** |
| dev_fc_lang_state | 228448bfe (23:14) | dev-state «Видео» | строка `videopacks=empty\|demo` в DEV_SWITCHES_R1_CORE.md расширена `\|catalog\|catalog_upcoming` — сторож ищет прежний текст | владельцу |
| theme_intensity_slider | c62e8fc70 (23:22) | Темы | в опорных точках ползунка `accentGraphic`/`accentTextSafe` = `#5ED99E` вместо `#D8EADB` | **Темам: смена намеренная или ошибка** |
| flashcards_blitz_access_behavior | 4e74715d4 (01:23) | Блиц / Сверка | новый импорт `dev_animations_off` тянет `app/config.ts` → `Platform.OS`; мок react-native в тесте без `Platform` | владельцу |
| spire_reject_rollback | 78726f65c (02:29) + незакоммиченное | Шпиль | строка отката ступени поменялась; файл сейчас в работе у сессии Шпиля | ждать конца её правки |

### Красные ещё до ночи (сторож устарел)

| Тест | Коммит | Зона | Причина |
|---|---|---|---|
| accounts_v2_client_wiring_v2 | 52429d419 (19:15) | Авторизация | дедлайн гостя 4-м аргументом — **исправлено 1eb649b0d** |
| en_readiness_dictionaries_contract | 963d8b8e5 / cca3a2602 (15:xx) | i18n-сторож | `maskLocaleKeyedEntries(source, original = source)` — тест ждёт прежнюю подпись |
| olive_phase1_surface_contract | 5b1e4a80a (19:11) | Темы | оболочка окна покупки набора переведена на токены — нет `shellOlive()` |
| r1_candidates_makety_2026_10_12_contract | 016488a3c (17:42) | Настройки (dev) | `DEV_POLL_EMPTY_BODY` → `DEV_POLL_BODY` |
| r1_candidates_pack_header_oral_offline | b662f70df (20:32) | Сверка / ссылки | cards-gap-034 `wait:3500` → `wait:5500` |
| sage_porcelain_real_device_visibility_contract | a573bc660 (21:44) | Уроки / Темы | `isSagePorcelainCard = … \|\| lightCard !== null` |

### Чужая незакоммиченная работа (рабочее дерево ≠ HEAD)

- gustav_french_daily_phrase_target_gate — `app/daily_phrase_target_gate.ts` изменён и не закоммичен (другая сессия).
- learning_v2_lesson1_bundle_builds («I am fine.» без озвучки), learning_v2_release_access_contract, learning_v2_intro_theme_contract —
  зона Codex, в Learning V2 больше 1000 незакоммиченных путей. Не трогал.

### 🔴 Раннер тестов интерфейса (RNTL) сломан целиком — проверить нельзя

9 файлов `.tsx` (friend_list_row, friend_together_sheet, hybrid_sheet_shell_observer_runtime, learning_v2_intro_reader_a,
learning_v2_new_word_encounter_overlay, nickname_edit_modal_availability, session_attempts_hud, survey_offer_render,
survey_sheet_modal) по основной настройке «не запускаются» — ожидаемо: они живут в `jest.rntl.config.cjs`.
Но и по своей настройке **ни один не запустился** (0 тестов): `react-native/jest/setup.js` не трансформируется —
«Cannot use import statement outside a module». Причина: `transformIgnorePatterns`
`node_modules/(?!(react-native…)/)` не учитывает путь pnpm `node_modules/.pnpm/react-native@0.81.5…/node_modules/react-native/…`
(первое `node_modules/` идёт перед `.pnpm`). Значит, ВСЕ RNTL-тесты сейчас ничего не охраняют. То же у
`jest.sunday-sheet.config.cjs`. Правка — инфраструктура тестов, решение координатора (вариант: допускать `\.pnpm/` в паттерне).

## Файлы без тестов (26)

app/_motion_showcase.tsx, app/community_packs/communityModerationAlerts.ts, app/flashcards/FlashcardsCategoryTiles.tsx,
app/flashcards/PackVideoHero.tsx, app/flashcards/VideoSetView.tsx, app/flashcards/use_training_study_target.ts,
components/CombinedLessonBreakdown.tsx, components/feedback/{ComboRing, HybridRefreshControl, ResultsSequence, TransitionBridge, VictoryBurst}.tsx,
components/home/DayRings.tsx, components/icons/LiveStreakFlame.tsx, components/lessons/LessonMenuGlass.tsx,
components/mistakes-panel/{PanelKit.tsx, panelPaint.ts}, components/profile-card/profile_card_sheet_paint.ts,
components/theory/ThreeTileChoice.tsx, components/ui/{v2_sheet, v2_ui}.tsx, constants/{themeAccentRoles, v2StyleGlassVariant}.ts,
hooks/{useFirstQuestionEnergyGate, use_accent_graphics, use_en_ui_study_target_migration}.ts.
