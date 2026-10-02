# PM-009 — ассеты: размер исходников против вклада в release bundle

Сгенерировано `node scripts/pm009_asset_bundle_inventory.mjs` (детерминированно, без сборки и без сети).

Колонки: **исходники** — все байты файлов в `assets/`; **в архиве EAS** — не исключено `.easignore`; **в бандле** — есть статический `require()` из клиентского кода или ссылка из `app.json` (верхняя граница: достижимость модуля-потребителя не проверяется); **в архиве, но не в бандле** — грузится в сборочный архив, но Metro его не тянет (кандидаты на чистку). Настоящий diff `.aab/.ipa` требует EAS-сборки и здесь не делается.

Итого: файлов **3873**, исходники **107.08 МБ**, в архиве EAS **15.22 МБ**, в бандле **13.86 МБ** (501 файлов), в архиве, но не в бандле **1.37 МБ**.

## По каталогам

| Каталог | Файлов | Исходники, МБ | В архиве EAS, МБ | В бандле, МБ | В архиве, не в бандле, МБ | Файлы-потребители |
|---|---:|---:|---:|---:|---:|---|
| `assets/audio/learning-v2` | 3270 | 91.29 | 0.00 | 0.00 | 0.00 | нет |
| `assets/audio/learning-v2-bootstrap-v1` | 140 | 3.62 | 3.62 | 3.62 | 0.00 | 1: app/learning_v2_bootstrap_audio_assets_v1.generated.ts |
| `assets/audio/onboarding_aha` | 18 | 2.27 | 2.27 | 2.27 | 0.00 | 1: components/onboarding_aha/aha_assets.ts |
| `assets/images/home_menu` | 110 | 1.69 | 1.69 | 1.27 | 0.43 | 2: app/(tabs)/home.tsx, app/home_menu_icons.ts |
| `assets/audio/sfx` | 76 | 1.29 | 1.29 | 1.15 | 0.14 | 2: modules/audio/celebrationBackgroundPlayer.ts, modules/audio/sound_events.ts |
| `assets/images/ios-icon.png` | 1 | 0.64 | 0.64 | 0.64 | 0.00 | 1: app.json |
| `assets/images/levels` | 71 | 0.62 | 0.62 | 0.61 | 0.01 | 10: app/(tabs)/lessons.tsx, app/achievements_screen.tsx, app/home_menu_icons.ts, … |
| `assets/images/coins` | 20 | 0.48 | 0.48 | 0.48 | 0.00 | 5: app/coin_rank_table_v1.ts, app/theme_ui_assets.ts, components/PracticeRuneCounter.tsx, … |
| `assets/╨É╨á╨ò╨¥╨É - Copy.txt` | 1 | 0.45 | 0.00 | 0.00 | 0.00 | нет |
| `assets/images/android-icon-foreground.png` | 1 | 0.39 | 0.39 | 0.39 | 0.00 | 1: app.json |
| `assets/fonts/Inter-Black.ttf` | 1 | 0.33 | 0.33 | 0.33 | 0.00 | 2: app.json, app/typography_dev_fonts.ts |
| `assets/fonts/Inter-Bold.ttf` | 1 | 0.33 | 0.33 | 0.33 | 0.00 | 2: app.json, app/typography_dev_fonts.ts |
| `assets/fonts/Inter-SemiBold.ttf` | 1 | 0.33 | 0.33 | 0.33 | 0.00 | 2: app.json, app/typography_dev_fonts.ts |
| `assets/fonts/Inter-Regular.ttf` | 1 | 0.33 | 0.33 | 0.33 | 0.00 | 2: app.json, app/typography_dev_fonts.ts |
| `assets/images/streak_icons` | 20 | 0.32 | 0.32 | 0.32 | 0.00 | 1: constants/streakIconAssets.ts |
| `assets/images/icon.png` | 1 | 0.28 | 0.28 | 0.28 | 0.00 | 1: app.json |
| `assets/images/level-spin-rewards` | 12 | 0.28 | 0.28 | 0.00 | 0.28 | нет |
| `assets/images/league` | 9 | 0.24 | 0.24 | 0.00 | 0.24 | нет |
| `assets/images/home_mistakes` | 9 | 0.21 | 0.21 | 0.21 | 0.00 | 2: app/(tabs)/home.tsx, app/home_mistakes_assets.ts |
| `assets/images/achievements` | 3 | 0.15 | 0.15 | 0.15 | 0.00 | 1: constants/achievementImageAssets.ts |
| `assets/images/splash-icon.png` | 1 | 0.12 | 0.12 | 0.12 | 0.00 | 1: app.json |
| `assets/images/v2` | 6 | 0.12 | 0.12 | 0.12 | 0.00 | 3: app/(tabs)/home.tsx, app/flashcards/FlashcardsHubScreen.tsx, components/DailyPhraseCard.tsx |
| `assets/images/currency` | 9 | 0.11 | 0.11 | 0.11 | 0.00 | 1: app/coin_icons.ts |
| `assets/audio/personal-plans-runtime` | 5 | 0.11 | 0.00 | 0.00 | 0.00 | нет |
| `assets/images/learning_v2_map` | 4 | 0.10 | 0.10 | 0.10 | 0.00 | 1: app/learning-v2/lesson/[id].tsx |
| `assets/images/home_last_lesson` | 10 | 0.10 | 0.10 | 0.05 | 0.05 | 1: app/home_last_lesson_assets.ts |
| `assets/images/home_supporting_art` | 18 | 0.10 | 0.10 | 0.10 | 0.00 | 1: app/home_supporting_art.ts |
| `assets/roulette/card-6m.webp` | 1 | 0.07 | 0.07 | 0.07 | 0.00 | 1: app/roulette_prizes.ts |
| `assets/sounds/fc` | 13 | 0.07 | 0.07 | 0.07 | 0.00 | 1: app/flashcards/SoundService.ts |
| `assets/audio/ob_correct.mp3` | 1 | 0.06 | 0.06 | 0.00 | 0.06 | нет |
| `assets/audio/ob_purchase_success.mp3` | 1 | 0.05 | 0.05 | 0.00 | 0.05 | нет |
| `assets/roulette/card-7d.webp` | 1 | 0.05 | 0.05 | 0.05 | 0.00 | 1: app/roulette_prizes.ts |
| `assets/images/splash-glyph.webp` | 1 | 0.05 | 0.05 | 0.05 | 0.00 | 1: app/_layout.tsx |
| `assets/roulette/card-3m.webp` | 1 | 0.05 | 0.05 | 0.05 | 0.00 | 1: app/roulette_prizes.ts |
| `assets/roulette/card-1m.webp` | 1 | 0.04 | 0.04 | 0.04 | 0.00 | 1: app/roulette_prizes.ts |
| `assets/roulette/card-1y.webp` | 1 | 0.04 | 0.04 | 0.04 | 0.00 | 1: app/roulette_prizes.ts |
| `assets/images/achievement_categories` | 4 | 0.03 | 0.03 | 0.03 | 0.00 | 1: app/achievements_screen.tsx |
| `assets/images/flow_clean_202607` | 2 | 0.03 | 0.03 | 0.03 | 0.00 | 1: components/CleanOnboarding.tsx |
| `assets/audio/correct_new.mp3` | 1 | 0.03 | 0.03 | 0.00 | 0.03 | нет |
| `assets/roulette/card-1d.webp` | 1 | 0.03 | 0.03 | 0.03 | 0.00 | 1: app/roulette_prizes.ts |
| `assets/images/legacy-achievements` | 1 | 0.03 | 0.03 | 0.03 | 0.00 | 1: constants/achievementImageAssets.ts |
| `assets/images/icon.webp` | 1 | 0.03 | 0.03 | 0.03 | 0.00 | 1: components/CleanOnboarding.tsx |
| `assets/audio/correct.mp3` | 1 | 0.03 | 0.03 | 0.00 | 0.03 | нет |
| `assets/images/streak_overlays` | 1 | 0.02 | 0.02 | 0.02 | 0.00 | 1: app/theme_ui_assets.ts |
| `assets/images/android-icon-monochrome.png` | 1 | 0.02 | 0.02 | 0.02 | 0.00 | 1: app.json |
| `assets/paywall_preview_v2.html` | 1 | 0.01 | 0.00 | 0.00 | 0.00 | нет |
| `assets/images/language_flags` | 5 | 0.01 | 0.01 | 0.01 | 0.00 | 6: app/(tabs)/settings.tsx, app/flashcards/PackLanguagePicker.tsx, app/flashcards_my_packs.tsx, … |
| `assets/audio/message_received.mp3` | 1 | 0.01 | 0.01 | 0.00 | 0.01 | нет |
| `assets/audio/record_start.mp3` | 1 | 0.01 | 0.01 | 0.00 | 0.01 | нет |
| `assets/images/onboarding_icon_cutout.webp` | 1 | 0.01 | 0.01 | 0.01 | 0.00 | 1: components/onboarding_aha/aha_ui.tsx |
| `assets/images/splash-wordmark.webp` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | 1: app/_layout.tsx |
| `assets/fonts/OFL-Inter.txt` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/images/favicon.png` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | 1: app.json |
| `assets/theme-icons/gold.webp` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/theme-icons/sagePorcelain.webp` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/theme-icons/aurora.webp` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/theme-icons/midnight.webp` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/theme-icons/olive.webp` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/theme-icons/indigo.webp` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/images/spin` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |
| `assets/images/weekly_compass_icons` | 1 | 0.00 | 0.00 | 0.00 | 0.00 | нет |

## Топ-40 файлов по размеру

| Файл | КБ | В архиве EAS | В бандле | Путь импортирования (потребители) |
|---|---:|---|---|---|
| `assets/audio/learning-v2/factory-production-v1/manifest.json` | 1150 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/images/ios-icon.png` | 652 | да | да | app.json |
| `assets/╨É╨á╨ò╨¥╨É - Copy.txt` | 458 | нет (.easignore: assets/*Copy.txt) | нет | нет |
| `assets/images/android-icon-foreground.png` | 397 | да | да | app.json |
| `assets/fonts/Inter-Black.ttf` | 336 | да | да | app/typography_dev_fonts.ts:11<br>app.json<br>app.json |
| `assets/fonts/Inter-Bold.ttf` | 335 | да | да | app/typography_dev_fonts.ts:10<br>app.json<br>app.json |
| `assets/fonts/Inter-SemiBold.ttf` | 335 | да | да | app/typography_dev_fonts.ts:9<br>app.json<br>app.json |
| `assets/fonts/Inter-Regular.ttf` | 333 | да | да | app/typography_dev_fonts.ts:8<br>app.json<br>app.json |
| `assets/audio/onboarding_aha/ambient_everyday.mp3` | 329 | да | да | components/onboarding_aha/aha_assets.ts:32 |
| `assets/audio/onboarding_aha/ambient_media.mp3` | 329 | да | да | components/onboarding_aha/aha_assets.ts:30 |
| `assets/audio/onboarding_aha/ambient_people.mp3` | 329 | да | да | components/onboarding_aha/aha_assets.ts:31 |
| `assets/audio/onboarding_aha/ambient_self.mp3` | 329 | да | да | components/onboarding_aha/aha_assets.ts:33 |
| `assets/audio/onboarding_aha/ambient_travel.mp3` | 329 | да | да | components/onboarding_aha/aha_assets.ts:28 |
| `assets/audio/onboarding_aha/ambient_work.mp3` | 329 | да | да | components/onboarding_aha/aha_assets.ts:29 |
| `assets/images/icon.png` | 290 | да | да | app.json<br>app.json |
| `assets/audio/sfx/v1/celebration/cel_background_bed_v1.m4a` | 143 | да | да | modules/audio/celebrationBackgroundPlayer.ts:28<br>modules/audio/sound_events.ts:154 |
| `assets/images/splash-icon.png` | 121 | да | да | app.json |
| `assets/roulette/card-6m.webp` | 74 | да | да | app/roulette_prizes.ts:61 |
| `assets/audio/learning-v2/factory-production-v1/0355888a539cc7a0511020bf-ash.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/042dbbe70072c21e23b4c6e4-coral.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/536d6d4ad97f5a325ce9c4c0-ash.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/6080b8ebc121bccfab1caccb-nova.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/732a8d540d20ed05fcb88435-ash.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/980f9eabd94c4f2a2c46914d-nova.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/a953301b809116f7f963064a-ash.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/c27078dfe1ed1505f87bee7a-coral.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/f18e1d86a250688bf087eef7-nova.mp3` | 64 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/158e1d8b71f8ca01a71e9238-onyx.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/58c4334e90dd55c9322a5be7-ash.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/58c4334e90dd55c9322a5be7-coral.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/a2dcab7588c2297d94f5561b-nova.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/f79eeffac63e839867f9c42b-onyx.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/0090727026564798ff9e5a7c-onyx.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/235ae2c129254828c5239b45-onyx.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/2722ae644dc0037b559e70c0-coral.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/574c26324b6d40d17812a168-onyx.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/81537398faaedb704066c607-onyx.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/81fa0e88941b3c997d4dc490-nova.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/940cf0564a3209f2d1ead5d1-ash.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |
| `assets/audio/learning-v2/factory-production-v1/a2d47509968d07d398db0b76-nova.mp3` | 63 | нет (.easignore: assets/audio/learning-v2/) | нет | нет |

## Кандидаты на удаление: в архиве, потребителей нет (95 файлов, 1.37 МБ)

Для каждого кандидата проверено: ни одного `require()` в клиентском коде и ни одной ссылки в `app.json`. Перед удалением дополнительно: `git grep -n "<имя файла>"` (динамические пути и скрипты контента), владелец ассетов (D69: новые ассеты Главной и 20 монет рангов не трогать). Скрипт ничего не удаляет.

| Файл | КБ |
|---|---:|
| `assets/audio/ob_correct.mp3` | 62 |
| `assets/audio/ob_purchase_success.mp3` | 56 |
| `assets/images/level-spin-rewards/cosmetic_theme.webp` | 46 |
| `assets/audio/sfx/v1/celebration/cel_max_awaken_v1.m4a` | 39 |
| `assets/images/league/weekly-goal/ember.webp` | 36 |
| `assets/images/league/weekly-goal/aurora.webp` | 34 |
| `assets/audio/correct_new.mp3` | 33 |
| `assets/images/home_menu/home-gold-practice.webp` | 30 |
| `assets/images/league/weekly-goal/volt.webp` | 29 |
| `assets/audio/correct.mp3` | 29 |
| `assets/images/level-spin-rewards/cosmetic_avatar_aura.webp` | 28 |
| `assets/images/level-spin-rewards/stars_500.webp` | 27 |
| `assets/images/level-spin-rewards/pearls_20.webp` | 26 |
| `assets/images/league/weekly-goal/midnight.webp` | 26 |
| `assets/images/league/weekly-goal/olive.webp` | 26 |
| `assets/images/league/weekly-goal/indigo.webp` | 26 |
| `assets/images/level-spin-rewards/stars_1000.webp` | 26 |
| `assets/images/level-spin-rewards/stars_250.webp` | 24 |
| `assets/images/league/weekly-goal/sagePorcelain.webp` | 24 |
| `assets/images/league/weekly-goal/gold.webp` | 23 |
| `assets/images/level-spin-rewards/stars_10.webp` | 22 |
| `assets/images/league/weekly-goal/dark.webp` | 22 |
| `assets/images/home_menu/max/sagePorcelain/shell.webp` | 21 |
| `assets/images/level-spin-rewards/pearls_100.webp` | 21 |
| `assets/images/home_menu/max/aurora/shell.webp` | 21 |
| `assets/images/level-spin-rewards/pearls_250.webp` | 21 |
| `assets/images/home_menu/home-gold-league.webp` | 21 |
| `assets/audio/sfx/v1/social/pm_social_gift_received_v1.m4a` | 19 |
| `assets/images/home_menu/home-gold-cards.webp` | 19 |
| `assets/images/home_menu/max/dark/shell.webp` | 18 |
| `assets/images/home_menu/max/gold/shell.webp` | 18 |
| `assets/images/home_menu/max/olive/shell.webp` | 17 |
| `assets/images/home_menu/max/ember/shell.webp` | 17 |
| `assets/images/level-spin-rewards/stars_100.webp` | 17 |
| `assets/images/level-spin-rewards/pearls_50.webp` | 16 |
| `assets/audio/sfx/v1/celebration/cel_streak_shield_v1.m4a` | 16 |
| `assets/images/home_menu/max/indigo/shell.webp` | 16 |
| `assets/images/level-spin-rewards/pearls_10.webp` | 16 |
| `assets/audio/sfx/v1/max/pm_max_review_open_v1.m4a` | 16 |
| `assets/images/home_menu/home-gold-lessons.webp` | 16 |
| `assets/images/home_menu/max/aurora/field.webp` | 16 |
| `assets/images/home_menu/max/volt/shell.webp` | 15 |
| `assets/images/home_menu/max/midnight/shell.webp` | 15 |
| `assets/audio/sfx/v1/max/pm_max_prestart_ready_v1.m4a` | 15 |
| `assets/audio/sfx/v1/max/pm_max_call_end_v1.m4a` | 14 |
| `assets/images/home_menu/max/gold/field.webp` | 14 |
| `assets/audio/sfx/v1/max/pm_max_consent_granted_v1.m4a` | 13 |
| `assets/audio/sfx/v1/max/pm_max_call_connect_v1.m4a` | 13 |
| `assets/images/home_menu/max/indigo/field.webp` | 13 |
| `assets/images/home_menu/home-gold-diagnostic-test.webp` | 13 |
| `assets/images/levels/generated-v5-dalle/manifest.json` | 13 |
| `assets/images/home_menu/max/volt/field.webp` | 12 |
| `assets/images/home_menu/max/midnight/field.webp` | 12 |
| `assets/images/home_menu/max/sagePorcelain/field.webp` | 12 |
| `assets/images/home_menu/max/olive/field.webp` | 11 |
| `assets/images/home_menu/max/ember/field.webp` | 11 |
| `assets/audio/message_received.mp3` | 11 |
| `assets/images/home_menu/max/dark/field.webp` | 10 |
| `assets/images/home_menu/ember/home-ember-league.webp` | 9 |
| `assets/images/home_menu/gold/home-gold-league.webp` | 7 |
| `assets/images/home_menu/volt/home-volt-league.webp` | 7 |
| `assets/images/home_last_lesson/home-last-lesson-gold.webp` | 7 |
| `assets/images/home_menu/indigo/home-indigo-league.webp` | 7 |
| `assets/images/home_last_lesson/home-last-lesson-midnight.webp` | 6 |
| `assets/images/home_last_lesson/home-last-lesson-sagePorcelain.webp` | 6 |
| `assets/images/home_last_lesson/home-last-lesson-aurora.webp` | 6 |
| `assets/images/home_menu/midnight/home-midnight-league.webp` | 6 |
| `assets/images/home_last_lesson/home-last-lesson-indigo.webp` | 6 |
| `assets/images/home_menu/olive/home-olive-league.webp` | 6 |
| `assets/images/home_last_lesson/home-last-lesson-volt.webp` | 6 |
| `assets/images/home_last_lesson/home-last-lesson-olive.webp` | 6 |
| `assets/images/home_last_lesson/home-last-lesson-forest.webp` | 6 |
| `assets/images/home_menu/sagePorcelain/home-sagePorcelain-league.webp` | 6 |
| `assets/audio/record_start.mp3` | 5 |
| `assets/images/home_menu/aurora/home-aurora-league.webp` | 5 |
| `assets/images/home_last_lesson/home-last-lesson-ember.webp` | 5 |
| `assets/fonts/OFL-Inter.txt` | 4 |
| `assets/images/home_menu/max/volt/glints.webp` | 4 |
| `assets/images/flow_clean_202607/manifest.json` | 3 |
| `assets/theme-icons/gold.webp` | 2 |
| `assets/images/home_menu/max/ember/glints.webp` | 2 |
| `assets/theme-icons/sagePorcelain.webp` | 2 |
| `assets/images/home_menu/max/indigo/glints.webp` | 2 |
| `assets/theme-icons/aurora.webp` | 2 |
| `assets/theme-icons/midnight.webp` | 2 |
| `assets/theme-icons/olive.webp` | 2 |
| `assets/theme-icons/indigo.webp` | 2 |
| `assets/images/home_menu/max/sagePorcelain/glints.webp` | 2 |
| `assets/images/home_menu/max/dark/glints.webp` | 2 |
| `assets/images/home_menu/max/midnight/glints.webp` | 1 |
| `assets/images/spin/README.md` | 1 |
| `assets/images/home_menu/max/aurora/glints.webp` | 1 |
| `assets/images/weekly_compass_icons/README.md` | 0 |
| `assets/images/home_menu/max/gold/glints.webp` | 0 |
| `assets/images/home_menu/max/olive/glints.webp` | 0 |
