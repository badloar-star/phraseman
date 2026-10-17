# Task packet: красные node-сторожа на дереве 17.10 (прогон `node --test tests/*.test.mjs tests/*.test.cjs`)

Governance-ID: TG-CE4B226D513A
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

## Красные файлы (40)
- tests/accent_text_on_light_card_contract.test.mjs
- tests/achievement_modals_liquid_glass_source_contract.test.mjs
- tests/action_toast_liquid_glass_source_contract.test.mjs
- tests/admin_message_modals_liquid_glass_source_contract.test.mjs
- tests/cards_free_limit_variants_contract.test.mjs
- tests/feedback_rating_liquid_glass_source_contract.test.mjs
- tests/flashcards_speaking_liquid_glass_source_contract.test.mjs
- tests/flashcards_training_setup_liquid_glass_source_contract.test.mjs
- tests/friend_study_invite_liquid_glass.test.mjs
- tests/home_last_lesson_notepad_asset_contract.test.mjs
- tests/home_v2_feature_tiles_text_integrity_source_contract.test.mjs
- tests/home_v2_glass_coin_contract.test.cjs
- tests/home_v2_video_rail_contract.test.cjs
- tests/i18n_design_zone_ratchet.test.mjs
- tests/informal_address_ru_uk_guard.test.mjs
- tests/learning_v1_active_header_and_summary_contract.test.mjs
- tests/learning_v2_mockup_readiness_evidence.test.mjs
- tests/learning_v2_mockup_session_quality.test.mjs
- tests/learning_v2_release_parity_released_scope.test.mjs
- tests/learning_v2_release_parity_route.test.mjs
- tests/manage_subscription_liquid_glass_source_contract.test.mjs
- tests/manage_subscription_overlays_liquid_glass.test.mjs
- tests/mistake_list_detail_liquid_glass_source_contract.test.mjs
- tests/moment_titles_font_cap_contract.test.mjs
- tests/moments_dev_preview_release_guard.test.mjs
- tests/privacy_settings_liquid_glass_source_contract.test.mjs
- tests/release_precheck_learning_v2_failure_classification.test.mjs
- tests/render_daily_phrase_content_preview.test.mjs
- tests/review_prompt_bottom_sheet_source_contract.test.mjs
- tests/saved_packs_completion.test.cjs
- tests/settings_notifications_liquid_glass.test.mjs
- tests/shadow_style_no_container_borders.test.mjs
- tests/spire_design_layer_contract.test.mjs
- tests/store_release_gate_levers.test.mjs
- tests/survey_unavailable_liquid_glass_source_contract.test.mjs
- tests/theme_hardcoded_colors_ratchet.test.mjs
- tests/typography_two_sizes_ratchet.test.mjs
- tests/update_modals_liquid_glass_source_contract.test.mjs
- tests/v2_palette_theme_levels.test.cjs
- tests/video_market_loader_error_contract.test.cjs

## Красные названия (70)
- AchievementModal (achievements_screen) is an opaque glass dossier without gradients or hex colors
- ActionToast applies one active Liquid Glass material to all five real tones without changing behavior
- COM-04 invite uses the approved opaque Liquid Glass geometry, typography, and localized copy
- Home header renders stats left and a non-shrinking bell-avatar action group right without changing stat semantics
- Learning V2 parity failure cannot masquerade as a missing EAS secret
- V2 home identity and balance use one real coin-rank asset, never the hex avatar or rune
- a cached catalog for another target is never returned after a failed query
- a failed local consent write rolls the switch back and skips the cloud record
- a nonempty same-target cache remains usable when a forced refresh fails
- a successful catalog is cached for the same target
- a successful remote query with no documents remains a legitimate empty catalog
- accent keeps the calm background and glass, colours CTA and progress
- active V2 feature tiles retain left-aligned art and never clip their copy
- active mistake list and detail use Liquid Glass without text truncation
- actual close, legal navigation, and delete open/close callbacks keep their original behavior
- actual switches preserve independent state, local-before-cloud order, and one haptic per action
- all locale shells render and disclosures, dynamic strings, semantic delete color, and uncapped typography stay intact
- all saved contours include legacy French storage with explicit language
- an index failure without a usable cache rejects instead of reporting an empty catalog
- bounds the absolute overlay to ordinary safe-area content instead of the SafeAreaView itself
- broadcast keeps claim/review-promo behaviour and busy guard
- business AST and shared dependencies stay at the pre-edit baseline
- containers get no borders or inner rims in new code — the count only shrinks (стиль «Тень», 12.10)
- continue-learning card has no differently colored half-panel
- continue-learning card receives the approved notepad art from the real producer chain
- continue-learning card uses the supplied notepad asset for every selectable tint
- does not double-compensate resized Android viewports or alter iOS KeyboardAvoidingView behavior
- drafts follow the requested pack language without losing another language
- every mockup session displays its own exact release-quality counts
- every moment window title (accessibilityRole="header") is capped by MOMENT_TITLE_MAX_FONT_SCALE
- every rendered row and local switch has the approved geometry, wrapping, glass, and accessibility
- failing tests:
- forceRemote bypasses a warm cache and retries the Firestore query
- front speech uses the explicit French/German language
- hardcoded colors in screens never grow — they come from the selected theme tokens
- hides host accessibility if and only if any overlay is active
- identity, handoff, day-boundary, once-close, shared-sheet, messages, and protected source files remain byte-exact
- keeps loading, monthly, yearly, lifetime, absent-store-data, and busy controls behaviorally distinct
- keeps real renewal dates and lifetime notes hidden while store data is loading
- keeps the quota, attempt, hold, TTS, flight, and result runtime AST unchanged
- keeps the six reason callbacks, English reason copy, Other text, and one-haptic Continue flow
- lifts and bounds the Android panel by keyboard overlap minus the SafeAreaView bottom inset
- max tints background and glass, boosts smoke; light flips to light surfaces
- measures the keyboard-reduced inner viewport and updates the numeric bound after resize
- no local alias of an accent fill token paints text or icons
- preserves stay, decline, restore-close, and both close-before-support callback flows
- production code never imports the moments preview route
- protected scheduling, permission, and modal AST nodes remain byte-identical
- protected snapshots normalize only checkout CRLF to LF
- protects feedback delivery AST, dependencies, and unchanged legacy presentations
- renders canonical-pass diagnostic quizzes only, deterministically, and holds every other locale block
- renders empty restore with support and Close while preserving close-before-push and one haptic
- renders progress and support retention with reachable visible decline actions and original callbacks
- renders reasons, Other input, selected state, and disabled Continue for every palette
- renders reasons, progress, support, and empty restore in all nine retained locales
- renders the bounded Liquid Glass host across all 13 palettes with normalized full-wrap typography
- saved cards: limit pill and the Plus button replace the hidden-cards section
- spire screens: type scale, line-height, borders
- tests\learning_v2_mockup_readiness_evidence.test.mjs
- tests\review_prompt_bottom_sheet_source_contract.test.mjs
- tests\update_modals_liquid_glass_source_contract.test.mjs
- text sizes other than 16/13 (below title size) never grow — D145
- the Liquid Glass catalogue background is scoped to active Learning V1 only
- the packaged EAS gate emits a deliberate release-quality block without omitted authorities
- the routed production gate blocks on release-quality evidence
- uses passive host surfaces without container borders
- зона Дизайна: число текстов вне переводов и неполных переводов не растёт (храповик)
- интерфейс ru/uk обращается на «ты»: нет новых «вы/Нажмите/Перевірте» вне осознанных исключений
- каждые ворота Learning V2 в eas-build-post-install и release:precheck пропускаются в стор-режиме
- невыпущенное не влияет, выпущенное с замечанием — красное, общий файл — красное
