# Task packet: красные тесты зоны «Дизайн / сторожа» + два пейвол-контракта (перепроверка Диспетчера f5f2f6991)

Governance-ID: TG-A25670AA913E
Status: Planned
Owner: 2 · ДИЗАЙН
Related epic/enabler: docs/work/release/RED_TESTS_RECHECK_2026-11-05.md

## Outcome

18 красных файлов тестов зоны Дизайна приведены в зелёное: настоящие регрессии кода чиним в коде; проверки, устаревшие из-за позднего решения владельца, перепривязываем к решению с хэшем коммита. Мерило — каждый файл зелёный точечным запуском; ни одна проверка не ослаблена без записанной причины.

## Scope

In scope: tests/{flashcards_speaking_quota_unavailable_behavior, flashcards_training_target_language_behavior, flashcards_recall_pending_start_behavior, audio_player_arbiter_guard, button_fill_sweep_guard, coral_theme_removal_guard, account_provision_lock_android_runtime_entrypoint, learning_v2_mode_feedback_lane, lesson_exit_sheet_contract, modal_theme_hardcode_guard, lessons_tabs_memory, lesson_first_try_counts, light_accent_graphics_ratchet, lesson_was_perfect_first_try, paywall_purchase_failure_ui_contract, screen_back_content_below_contract, themed_art_guard, paywall_purchase_activation_contract} и минимально необходимый код под ними.

Out of scope: тесты других зон (Learning V2, Ядро, Карточки, Главная), чужие незакоммиченные файлы, functions/.

## Architecture

No architecture change: правки точечные — либо код возвращается к контракту, либо контракт перепривязывается к решению владельца.

## Security and privacy

Данные не собираются; оплата — только вёрстка/сторожа покупки, логика покупки не меняется.

## Technical debt

Pay now: устаревшие ожидания. Contain: потолки храповиков меняются только вниз либо с записью решения.

## Verification

`npm run test:one -- tests/<файл>` по каждому; typecheck по затронутым файлам; numstat перед коммитом.

## Rollback

Откат коммитов по файлам.
