# Existing locale audit: id

## Scope
- Target locale: `id`
- Role: interface/explanation source language for learning English.
- Study target: `en`
- Mode: `existing-locale-production-audit`

## Summary
| Metric | Value |
| Files scanned | 2271 |
| Localized items | 139077 |
| Target localized items | 5768 |
| Target item share | 0.0415 |
| Field coverage gap files | 172 |
| Item coverage gap files | 274 |
| HTML coverage backlog files | 6 |
| HTML partial coverage files | 0 |
| Resolved sidecar coverage files | 0 |
| Russian-only report files | 0 |
| Fallback risk files | 8 |
| Verified fallback files | 0 |
| Production gate files | 0 |
| Isolated study-target files | 18 |
| Study-target risk files | 0 |

## Policy
- id is treated as an interface/explanation source language for learning English.
- Do not switch, generate, or expose a studied Spanish course in this run.
- The study target stays `en`; any `StudyTargetLang = es` code is a separate dev-only feature and must not drive this localization.
- Generated audit output is isolated under docs/heisenberg/<locale>/<run>; no production content is overwritten.
- Before enabling the locale in production, every UI surface must have an explicit target-language branch or an intentional fallback record.

## Blockers
- Some localized RU/UK field contracts have no ES field marker.
- Some extracted RU/UK localized items have no extracted ES counterpart.

## Target items by surface
| Surface | Target items |
| app-other | 190 |
| daily-phrase | 1056 |
| personal-training | 112 |
| quizzes | 4145 |
| scripts-tools | 37 |
| tests | 4 |
| ui-locale | 224 |


## Field Coverage Gaps
| File | Surface | Reason |
| app/quiz_data.ts | quizzes | Has 1691 localized source-language field marker(s), but no ID field marker. |
| app/lesson_data_1_8_phrases_es.gen.ts | lessons | Has 1200 localized source-language field marker(s), but no ID field marker. |
| app/lesson_data_1_8_phrases_source.ts | lessons | Has 1200 localized source-language field marker(s), but no ID field marker. |
| app/lesson_data_17_24.ts | lessons | Has 1200 localized source-language field marker(s), but no ID field marker. |
| app/lesson_data_25_32.ts | lessons | Has 1200 localized source-language field marker(s), but no ID field marker. |
| app/lesson_data_9_16_phrases_es.gen.ts | lessons | Has 1200 localized source-language field marker(s), but no ID field marker. |
| app/idioms_data.ts | daily-phrase | Has 1062 localized source-language field marker(s), but no ID field marker. |
| admin/daily_phrases_seed.json | daily-phrase | Has 1056 localized source-language field marker(s), but no ID field marker. |
| app/achievements.ts | app-other | Has 926 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_en_17_32.ts | lessons | Has 921 localized source-language field marker(s), but no ID field marker. |
| app/daily_tasks.ts | progression-daily-rewards | Has 662 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_es_l2.ts | lessons | Has 625 localized source-language field marker(s), but no ID field marker. |
| app/diagnostic_test.tsx | app-other | Has 596 localized source-language field marker(s), but no ID field marker. |
| app/achievements_es_locale.ts | app-other | Has 456 localized source-language field marker(s), but no ID field marker. |
| app/premium_modal.tsx | app-other | Has 409 localized source-language field marker(s), but no ID field marker. |
| app/level_gift_system.ts | progression-daily-rewards | Has 305 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson10_v2.ts | lessons | Has 195 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson14_v2.ts | lessons | Has 165 localized source-language field marker(s), but no ID field marker. |
| app/league_engine.ts | app-other | Has 156 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson8_v2.ts | lessons | Has 156 localized source-language field marker(s), but no ID field marker. |
| app/lesson_data_all.ts | lessons | Has 148 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson11_v2.ts | lessons | Has 147 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson12_v2.ts | lessons | Has 147 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson20_v2.ts | lessons | Has 138 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson21_v2.ts | lessons | Has 138 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson9_v2.ts | lessons | Has 138 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson13_v2.ts | lessons | Has 129 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson15_v2.ts | lessons | Has 129 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson16_v2.ts | lessons | Has 129 localized source-language field marker(s), but no ID field marker. |
| app/lesson_intro_screens_lesson17_v2.ts | lessons | Has 129 localized source-language field marker(s), but no ID field marker. |

## Item Coverage Gaps
| File | Surface | Reason |
| app/lesson_words.tsx | app-other | Extracted 4890 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_data_1_8_phrases_es.gen.ts | lessons | Extracted 1200 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_data_1_8_phrases_source.ts | lessons | Extracted 1200 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_data_17_24.ts | lessons | Extracted 1200 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_data_25_32.ts | lessons | Extracted 1200 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_data_9_16_phrases_es.gen.ts | lessons | Extracted 1200 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_intro_screens_en_17_32.ts | lessons | Extracted 1002 non-HTML source localized item(s), but no id extracted items. |
| app/achievements.ts | app-other | Extracted 908 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_words_source_locales.ts | app-other | Extracted 852 non-HTML source localized item(s), but no id extracted items. |
| app/diagnostic_test.tsx | app-other | Extracted 830 non-HTML source localized item(s), but no id extracted items. |
| app/daily_tasks.ts | progression-daily-rewards | Extracted 651 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_intro_screens_es_l2.ts | lessons | Extracted 624 non-HTML source localized item(s), but no id extracted items. |
| app/premium_modal.tsx | app-other | Extracted 510 non-HTML source localized item(s), but no id extracted items. |
| app/daily_tasks_screen.tsx | progression-daily-rewards | Extracted 495 non-HTML source localized item(s), but no id extracted items. |
| app/flashcards/system-cards.ts | app-other | Extracted 465 non-HTML source localized item(s), but no id extracted items. |
| app/achievements_es_locale.ts | app-other | Extracted 454 non-HTML source localized item(s), but no id extracted items. |
| app/streak_stats.tsx | progression-daily-rewards | Extracted 442 non-HTML source localized item(s), but no id extracted items. |
| app/pos_workout_engine.ts | app-other | Extracted 390 non-HTML source localized item(s), but no id extracted items. |
| app/pos_micro_diagnosis.ts | app-other | Extracted 372 non-HTML source localized item(s), but no id extracted items. |
| app/preposition_explanations.ts | app-other | Extracted 354 non-HTML source localized item(s), but no id extracted items. |
| admin/personal-trainings.js | personal-training | Extracted 336 non-HTML source localized item(s), but no id extracted items. |
| app/level_exam.tsx | app-other | Extracted 312 non-HTML source localized item(s), but no id extracted items. |
| app/level_gift_system.ts | progression-daily-rewards | Extracted 267 non-HTML source localized item(s), but no id extracted items. |
| app/_admin_settings_testers.tsx | app-other | Extracted 234 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_intro_screens_lesson10_v2.ts | lessons | Extracted 225 non-HTML source localized item(s), but no id extracted items. |
| constants/custom_avatars.ts | app-other | Extracted 225 non-HTML source localized item(s), but no id extracted items. |
| app/flashcards_swipe.tsx | app-other | Extracted 213 non-HTML source localized item(s), but no id extracted items. |
| app/exam.tsx | app-other | Extracted 200 non-HTML source localized item(s), but no id extracted items. |
| app/lesson_intro_screens_lesson14_v2.ts | lessons | Extracted 192 non-HTML source localized item(s), but no id extracted items. |
| app/flashcards/bundles/official_peaky_blinders_en.json | app-other | Extracted 184 non-HTML source localized item(s), but no id extracted items. |

## HTML Coverage Backlog
| File | Surface | Reason |
| admin/index.html | admin-site | Extracted 1371 HTML source localized item(s), but no id HTML items. |
| knowly-www/contact/index.html | public-web | Extracted 86 HTML source localized item(s), but no id HTML items. |
| knowly-www/download/index.html | public-web | Extracted 76 HTML source localized item(s), but no id HTML items. |
| knowly-www/index.html | public-web | Extracted 70 HTML source localized item(s), but no id HTML items. |
| admin/support.html | admin-site | Extracted 9 HTML source localized item(s), but no id HTML items. |
| duel/index.html | app-other | Extracted 3 HTML source localized item(s), but no id HTML items. |

## HTML Partial Coverage
- None detected.

## Resolved Sidecar Coverage
- None detected.

## Russian-Only Reports
- None detected.

## Fallback Risk Files
| File | Surface | Reason |
| components/LangContext.tsx | ui-locale | Language helper/fallback path present; verify target locale is not silently returning RU. |
| constants/i18n.ts | ui-locale | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/exam.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| components/ShardRewardModal.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/flashcards_market_dev.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| components/ExamResultPreviewAdminModal.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/lesson_irregular_verbs.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/shards_shop.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |

## Verified Fallback Files
- None detected.

## Production Gate Files
- None detected.

## Isolated Study-Target Files
| File | Surface | Reason |
| app/flashcards_swipe.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/review.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson_data_all.ts | lessons | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/flashcards_collection.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson_intro_screens.tsx | lessons | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/pack_opening.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| components/MasteryReplayModal.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/(tabs)/settings.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson1.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/study_target_lang_dev.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/config.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/home_screen_hydration.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson_locale_utils.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson_titles_for_study_target.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson1_smart_options.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/phrase_target_utils.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/spanish_content_gate.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| components/StudyTargetContext.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |

## Study-Target Risk Files
- None detected.

## Next gate
- Resolve or document every blocker above before turning Spanish UI on in production.
- Keep Spanish UI/explanations separate from Spanish-as-study-target experiments.
- Run the Spanish locale test bundle after every integration block.
