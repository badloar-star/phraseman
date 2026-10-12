# R1: 253 нарушения гейта сверки — разбор по владельцам и действиям (Макеты, 12.10, ночь)

Источник: `node scripts/visual_parity_gate.mjs --release=r1 --defer-triage --json` (HEAD после п.81). Гейт блокирует выпуск; обход — только `PARITY_GATE_WAIVER` владельца.
Нарушений в прогоне: **252** (было 253 до перепривязки образцов под замком; уникальных строк 250 — у energy-modes-009/010 по два нарушения); строк r1 — 531, отложено по варианту «А+Б» — 256 (b_reshoot 215 · d_mockup_stale 19 · c_owner_decides 16 · theme_tone 6) — это НЕ сверено, см. R1_PARITY_GATE_OPTIONS.md.
Разбор — по меткам вердикта и состоянию кадра в реестре (эвристика, не повторный просмотр кадров); где метка не однозначна, строка отнесена к Сверке (пересъёмка проверит и состояние, и данные).

## Цифры по корзинам

| Корзина (как просил координатор) | Строк | Кто закрывает | Что делать |
|---|---|---|---|
| (а) дефект кода | 0 доказанных | Дизайн / Ядро / Авторизация | Доказанных кодовых дефектов в оставшихся нарушениях нет (R1_DIFF_ONE_FIX.md: a_code_defect = 3 правки, уже сделаны). Кандидатов «мелкая вёрстка ±px» — 16 строк: код не трогаем, пока пересклейка с новыми образцами не подтвердит (см. б) |
| (а′) состояние нужно ДОБАВИТЬ в приложение (blocked) | 12 | Ядро / Дизайн / Авторизация / владелец | решение владельца п.81: dialogs-028 (лимит 3 голосовых попытки Free — Ядро), community-010, cards-027 (чип «EN» без меню — Дизайн, образец перерисован), overlays-campaigns-013/021; остальные — NO_CODE, решает владелец (убрать образец или вернуть экран) |
| (б) нет кадра / кадр старше кода | 218 | Сверка | снять впервые 116 (ссылка и шаги в DEV_LINKS_R1, coverage=ready) · переснять устаревшие 23 (match, кадр старше кода) · переснять «состояние не то» 50 (ссылки исправлены 12.10) · артефакты кадра 6 · пересклейка a2 после правок образца п.81 16 · пересклейка/пересъёмка после правок Авторизации/Дизайна 7 |
| (в) образец устарел | 5 | Макеты | перерисовать/поправить образец по коду (список ниже) |
| (г) нужен вердикт по существующему кадру | 12 | Макеты | 8 pending с кадром + 4 diff с мелкими отличиями (данные/вёрстка, мелко) → вердикт match/diff |
| (д) без подмены/ручное | 3 | владелец / Ядро / Codex | energy-modes-011 (Learning V2, Codex), cards-gap-025 (успешная публикация пишет в прод — «да» владельца или подмена publish=ok), settings-gap-001 (настоящий вход) |
| **Итого** | **250** | | |

## (а′) blocked — что нужно сделать в приложении (12)
- `cards-004` — NO_CODE (12.10): в коде нет — на хабе А блок «Лучшее у сообщества» (SavedTopCommunityPacks, saved-top-communit
- `cards-027` — делается по решению владельца п.81 (12.10): состояние добавляется в приложение, образец остаётся
- `cards-080` — NO_CODE (12.10): в коде нет — у «Из видео» нет «Пока пусто»: пустой каталог → скелет → «Сейчас недоступно» (fl
- `cards-083` — NO_CODE (12.10): в коде нет — на хабе А нет «Лучшее у сообщества грузится» (saved-top-pack-loading-*) — блока 
- `dialogs-028` — делается по решению владельца п.81 (12.10): состояние добавляется в приложение, образец остаётся
- `community-010` — делается по решению владельца п.81 (12.10): состояние добавляется в приложение, образец остаётся
- `profile-002` — нужен привязанный аккаунт: строки Email/«Способ входа»/«Выйти и войти под другим» доступны только при привязке
- `profile-027` — NO_CODE (12.10): в коде нет — окна «Выйти из аккаунта?» нет: выход мгновенный, стадия confirm не вызывается (a
- `overlays-runtime-017` — NO_CODE (12.10): в коде нет — окна «Выйти из аккаунта?» нет: выход мгновенный, стадия confirm не вызывается (a
- `overlays-campaigns-013` — делается по решению владельца п.81 (12.10): состояние добавляется в приложение, образец остаётся
- `onboarding-016` — NO_CODE (12.10): в коде нет — шаг «Уровень» выключен в коде (CleanOnboarding.tsx:217). Решение: убрать кадр об
- `onboarding-017` — NO_CODE (12.10): в коде нет — шаг «Уровень» выключен в коде (CleanOnboarding.tsx:217). Решение: убрать кадр об

## (б) Сверка — списки id

**Снять впервые (116, ссылка и шаги готовы):** cards-043, cards-064, cards-081, dialogs-009, dialogs-010, dialogs-021, dialogs-024, dialogs-025, dialogs-026, dialogs-027, dialogs-033, dialogs-037, dialogs-040, dialogs-042, dialogs-043, dialogs-044, dialogs-046, community-002, community-008, community-009, community-011, community-012, community-013, community-015, community-017, community-018, community-019, community-021, community-022, community-024, paywalls-008, paywalls-009, paywalls-010, overlays-campaigns-006, cards-section-013, cards-section-014, cards-section-016, cards-section-029, cards-section-030, cards-section-031, cards-section-038, cards-section-039, cards-section-046, cards-section-049, cards-section-050, cards-section-052, cards-section-053, cards-section-055, cards-section-056, energy-modes-007, energy-modes-012, energy-modes-013, energy-modes-014, onboarding-paywall-001, onboarding-002, onboarding-003, onboarding-004, onboarding-005, onboarding-006, onboarding-008, onboarding-010, onboarding-025, onboarding-026, onboarding-027, onboarding-028, onboarding-029, cards-v2-035, cards-v2-036, cards-v2-037, cards-v2-038, cards-v2-039, cards-v2-040, cards-v2-041, cards-v2-042, cards-v2-049, cards-v2-050, cards-v2-051, cards-v2-052, auth-gap-001, auth-gap-002, auth-gap-003, auth-gap-004, auth-gap-005, auth-gap-006, auth-gap-007, auth-gap-008, auth-gap-009, auth-gap-010, auth-gap-012, auth-gap-016, dialogs-gap-001, dialogs-gap-004, dialogs-gap-005, dialogs-gap-006, dialogs-gap-007, dialogs-gap-008, dialogs-gap-009, dialogs-gap-014, spire-gap-019, spire-gap-021, spire-gap-022, cards-gap-019, cards-gap-021, cards-gap-023, cards-gap-024, cards-gap-027, cards-gap-028, cards-gap-032, cards-gap-033, cards-gap-036, cards-gap-038, settings-gap-012, settings-gap-023, cards-gap-039, cards-v2-053, cards-gap-040

**Переснять: кадр старше кода (23, были match):** cards-008, cards-011, cards-012, cards-031, cards-045, cards-046, cards-063, cards-065, cards-067, profile-018, paywalls-014, paywalls-015, paywalls-021, cards-section-011, cards-section-021, energy-modes-009, energy-modes-010, onboarding-007, onboarding-018, cards-v2-007, cards-v2-010, settings-gap-009, settings-gap-035

**Переснять: «состояние не то» (50; ссылки/шаги исправлены Макетами 12.10 после вердикта):** cards-018, cards-019, cards-022, cards-030, cards-041, cards-042, cards-044, cards-049, cards-050, cards-051, cards-052, cards-053, cards-054, cards-055, cards-056, cards-057, cards-058, cards-059, cards-060, cards-061, cards-066, cards-069, cards-071, cards-072, cards-073, cards-074, cards-076, cards-079, cards-082, cards-section-018, cards-section-041, energy-modes-002, energy-modes-003, energy-modes-004, energy-modes-005, energy-modes-006, energy-modes-008, energy-modes-015, energy-modes-016, cards-v2-015, cards-v2-016, cards-v2-027, cards-v2-028, cards-v2-044, cards-v2-047, auth-gap-013, dialogs-gap-011, cards-gap-029, cards-gap-031, settings-gap-007

**Артефакты кадра (6):** profile-023, paywalls-025, cards-section-042, cards-section-043, cards-v2-032, dialogs-gap-016

**Пересклейка a2 «вёрстка ±px» после правок образца п.81 — чип «EN ⌄», стопка слоёв, (16):** cards-047, overlays-campaigns-014, cards-v2-006, cards-v2-020, cards-v2-025, cards-v2-026, cards-v2-045, cards-v2-046, cards-gap-007, cards-gap-009, cards-gap-010, cards-gap-011, cards-gap-012, cards-gap-016, cards-gap-035, paywall-gap-012

**Пересклейка/пересъёмка после правок Авторизации/Дизайна (7):** auth-gap-014, auth-gap-015, auth-gap-017, auth-gap-018, settings-gap-010, settings-gap-017, settings-gap-027

## (в) Макеты — образец устарел
- `community-014`, `community-016` — образец (community.html) под код/подмены Ядра: правка текста/состояния.
- `cards-section-040` — «Устно — ожидание»: образец по коду (cards-v2 №80 нарисован, привязка есть) — проверить после пересъёмки.
- `settings-gap-020`, `settings-gap-021` — образец по коду «Настройки» (diff: [образец ≠ код]).
- `cards-027` — образец cards-states №22 перерисовать: чип «EN» без стрелки и меню справа в верхнем ряду рядом с пилюлей остатка (решение владельца 22:0x).

## (г) Макеты — вердикт по существующему кадру
- pending с кадром: cards-026, cards-033, cards-035, cards-036, cards-068, cards-077, cards-section-019, cards-section-054
- diff с мелкими отличиями (данные / вёрстка, мелко): cards-040, cards-v2-019, settings-gap-006, settings-gap-034

## Топ-20 самых дешёвых закрытий (порядок: от самых дешёвых)
1–4. **Мои вердикты по мелким diff (минуты, без съёмки):** cards-040, cards-v2-019, settings-gap-006, settings-gap-034
5–12. **Мои вердикты по pending с кадром:** cards-026, cards-033, cards-035, cards-036, cards-068, cards-077, cards-section-019, cards-section-054
13–16. **Пересклейка без съёмки (Сверка, образец уже поправлен):** auth-gap-014, auth-gap-015, auth-gap-017, auth-gap-018
17–18. **Пересклейка без съёмки после п.81 (чип «EN ⌄», стопка слоёв):** cards-v2-025, cards-v2-026
19. **Пересклейка «Тень»:** cards-v2-001 (и packs-simple-001, cards-section-004 — те же копии «Тень»)
20. **Пересъёмка settings-gap-010/027 (одна правка текста «Фраза дня»):** 2 кадра за один проход Сверки

## Что сделано сразу
- RESCAN_QUEUE_FOR_ROBOT_2026-10-11.md дополнен списком (б) отдельным разделом.
- Корзину (в)+(г) беру в работу следующим шагом (вердикты и образцы), итог числом — координатору.
