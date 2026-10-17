# Task packet: красные node-сторожа на дереве 17.10 (прогон `node --test tests/*.test.mjs tests/*.test.cjs`)

Governance-ID: TG-CE4B226D513A
Governance-ID: TG-45F62AB902EF
Status: Planned
Owner: сессия «2 · ДИЗАЙН» (список), чинят зоны владельцев
Related epic/enabler: R115

## Outcome
Список тестов, красных при прогоне 17.10 (~19:55, дерево с чужими незакоммиченными правками): 1302 теста, 1232 зелёных, 69 красных в 40 файлах. Мои изменения новых красных не добавляют: на снимок HEAD (git archive app components constants hooks config tests) применил только мои файлы — набор падающих тот же (48 из них падают и на чистом снимке, остальные — из-за чужих правок или отсутствующих в снимке каталогов). Часть красных сторожей — устаревшие хэши/слепки (например `survey_unavailable`: хэш SurveySheetModal.tsx расходится уже на HEAD; `settings_notifications`: хэш persistPrefs), часть — реальные расхождения (`privacy_settings`: чужая правка добавила ThemedArt без заглушки в сторожe; Home: сторожа notepad-арта ищут `<Image source={art}>`, карточка давно на ThemedArtLayers).

## Scope
In scope: список файлов и названий. Out of scope: правки тестов (делают владельцы зон: Макеты — паритет/макеты/эталоны/kit; Темы — ratchet цветов/типографики/обводок; Переводчик — i18n/«ты»; Ядро/Сайт — релизные гейты Learning V2).

## Architecture
No architecture change: документ-список. Полный лог прогона: `C:\Temp\claude\c1\big.log` (вне репозитория, живёт до очистки временной папки); перезапуск одного файла: `node --test tests/<файл>`.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Contain: каждая красная строка — чей-то долг; чинить пересчётом слепка только при подтверждённом намеренном изменении, не ослаблять проверку.

## Verification
`node --test tests/*.test.mjs tests/*.test.cjs` до и после; цель — число красных не растёт.

## Rollback
Откат документа.

## Красные сторожа: причина, чей файл, вердикт (прогон 17.10 ~21:00; ✅ — уже починено)

Вердикты: **устарел** — тест отстал от намеренной правки кода; **код** — сломан код; **заглушка** — в тесте нет заглушки нового импорта.

| # | Тест | Причина одной строкой | Чей | Вердикт |
|---|------|-----------------------|-----|---------|
| 1 | accent_text_on_light_card_contract | псевдоним токена заливки красит текст/значок — нужен accentText | Темы | код |
| 2 | achievement_modals_liquid_glass_source_contract | ожидание «непрозрачное досье без градиентов/hex» не выполнено | Темы/Достижения | устарел |
| 3 | action_toast_liquid_glass_source_contract | «toast surface uses translucent glass» — поверхность тоста стала другой | Темы | устарел |
| 4 | admin_message_modals_liquid_glass_source_contract | нет claimAndDismissGlobalBroadcastModal в слепке | Рассылки | устарел |
| 5 | cards_free_limit_variants_contract | регулярка `savedLimitReached = …` не находит строку (формула лимита переписана) | Карточки | устарел |
| 6 | feedback_rating_liquid_glass_source_contract | хэш защищённого `app/stable_id.ts` разошёлся | Ядро | устарел |
| 7 | flashcards_speaking_liquid_glass_source_contract | слепок deep-equal разошёлся | Карточки | устарел |
| 8 | flashcards_training_setup_liquid_glass_source_contract | слепок разметки (число 28, хэш) разошёлся | Карточки | устарел |
| 9 | friend_study_invite_liquid_glass | нет «одобренного текста» «Пять минут на английский?» | Друзья/Переводчик | устарел |
| 10 | home_last_lesson_notepad_asset_contract | искал `<Image source={art}>` — ✅ починен 121c28dd6 | Макеты/Дизайн | устарел ✅ |
| 11 | home_v2_feature_tiles_text_integrity_source_contract | искал contentFit="contain" — ✅ починен 516ca26fd | Макеты/Дизайн | устарел ✅ |
| 12 | home_v2_glass_coin_contract | нет testID home-hero-avatar-button (шапка Главной перестроена) | Макеты/Дизайн | устарел |
| 13 | home_v2_video_rail_contract | TypeError: render_cause_probe не в заглушках теста | Макеты/Дизайн | заглушка |
| 14 | i18n_design_zone_ratchet | скрипт scan_i18n_design_zone завершился с ошибкой (число текстов вне переводов растёт) | Переводчик | код |
| 15 | informal_address_ru_uk_guard | в ru/uk новые «вы/Нажмите» вне исключений | Переводчик | код |
| 16 | learning_v1_active_header_and_summary_contract | искал градиент без прозрачного слоя R69 — ✅ перепин 047099aa3 | Дизайн | устарел ✅ |
| 17 | learning_v2_mockup_readiness_evidence | нет файла content/learning-v2-course/pipeline/session_readiness.mjs | Курс V2 | код |
| 18 | learning_v2_mockup_session_quality | в макете нет встроенного JSON #session-audio-evidence | Курс V2/Макеты | устарел |
| 19 | learning_v2_release_parity_released_scope | число/состав выпущенных занятий не совпал (strict equal) | Курс V2 | устарел |
| 20 | learning_v2_release_parity_route | не нашёл `const qualityResult = validateReleaseQuality()` в скрипте | Курс V2 | устарел |
| 21 | manage_subscription_liquid_glass_source_contract | не было заглушки BackGlyph — ✅ 3b742cb2d | Дизайн | заглушка ✅ |
| 22 | manage_subscription_overlays_liquid_glass | то же + регулярка g.opaque… — ✅ | Дизайн | заглушка ✅ |
| 23 | mistake_list_detail_liquid_glass_source_contract | регулярка `g.opaque(Card\|Control\|Sheet)\|glassButtonFill(g)` не находит | Ошибки/Темы | устарел |
| 24 | moment_titles_font_cap_contract | слепок deep-equal разошёлся | Моменты | устарел |
| 25 | moments_dev_preview_release_guard | слепок deep-equal разошёлся | Моменты | устарел |
| 26 | privacy_settings_liquid_glass_source_contract | нет заглушек ThemedArt/privacyAiStateArt и значок 27 — ✅ 047099aa3 | Приватность/Дизайн | заглушка ✅ |
| 27 | release_precheck_learning_v2_failure_classification | не нашёл «ОТКАЗ: не прошло гейтов — 1» (текст релизного предпроверочного скрипта) | Курс V2/Сайт | устарел |
| 28 | render_daily_phrase_content_preview | strict equal на предпросмотре фразы дня | Фраза дня | устарел |
| 29 | review_prompt_bottom_sheet_source_contract | «rate/store actions must remain unchanged» — слепок | Отзывы | устарел |
| 30 | saved_packs_completion | strict equal в 3 случаях (завершение сохранённых паков) | Карточки | устарел |
| 31 | settings_notifications_liquid_glass | хэши persistPrefs/persistSchedule (откат на диск 15.10) — ✅ перепин 047099aa3 | Дизайн | устарел ✅ |
| 32 | shadow_style_no_container_borders | новые обводки: MomentDown.tsx, mode_feedback_v1.tsx | Моменты/Курс V2 | код |
| 33 | spire_design_layer_contract | ✅ уже зелёный (чужая правка) | Моменты | ✅ |
| 34 | store_release_gate_levers | в learning_v2_ceiling_committed_gate.mjs нет пропуска в стор-режиме | Сайт/Курс V2 | код |
| 35 | survey_unavailable_liquid_glass_source_contract | хэш SurveySheetModal.tsx (пин 12.10) — ✅ перепин 047099aa3 | Дизайн | устарел ✅ |
| 36 | theme_hardcoded_colors_ratchet | новые hex в ComboMomentLayer, LegacyBonusHero, моментах | Моменты/Темы | код |
| 37 | typography_two_sizes_ratchet | новые размеры текста вне 16/13: HomeV2FeatureTiles (2), SpireWeekMomentHost (1); моя метка этапа 12→13 — ✅ | Макеты/Моменты | код |
| 38 | update_modals_liquid_glass_source_contract | «failed store opening must restore the modal through the existing callback» | Обновления | устарел |
| 39 | v2_palette_theme_levels | strict equal в уровнях палитры тем | Темы | устарел |
| 40 | video_market_loader_error_contract | Transform failed: тест не собирает TS-исходник (синтаксис/путь) | Видео | код |

Мои правки новых красных не добавили; пересчёт «было 69 → стало N» — по `node --test tests/*.test.mjs tests/*.test.cjs` после коммитов владельцев.

Замечание: столбец «Чей» — по имени теста и зоне файла (предположение), «Вердикт» — по первой ошибке прогона; перед правкой проверь первую ошибку командой `node --test tests/<файл>`.
