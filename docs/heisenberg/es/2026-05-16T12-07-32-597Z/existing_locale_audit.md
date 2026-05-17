# Existing locale audit: es

## Scope
- Target locale: `es`
- Role: interface/explanation source language for learning English.
- Study target: `en`
- Mode: `existing-locale-production-audit`

## Summary
| Metric | Value |
| Files scanned | 1763 |
| Localized items | 80465 |
| Target localized items | 12902 |
| Target item share | 0.1603 |
| Field coverage gap files | 54 |
| Item coverage gap files | 70 |
| Russian-only report files | 4 |
| Fallback risk files | 14 |
| Production gate files | 21 |
| Study-target confusion files | 17 |

## Policy
- es is treated as an interface/explanation source language for learning English.
- Do not switch, generate, or expose a studied Spanish course in this run.
- The study target stays `en`; any `StudyTargetLang = es` code is a separate dev-only feature and must not drive this localization.
- Generated audit output is isolated under docs/heisenberg/<locale>/<run>; no production content is overwritten.
- Before enabling the locale in production, every UI surface must have an explicit target-language branch or an intentional fallback record.

## Blockers
- Spanish UI is currently behind ENABLE_SPANISH_LOCALE / Lang-gate code.
- Some localized RU/UK field contracts have no ES field marker.
- Some extracted RU/UK localized items have no extracted ES counterpart.
- Some files contain Spanish study-target logic; these must stay separate from UI Spanish.

## Target items by surface
| Surface | Target items |
| app-other | 6593 |
| arena | 201 |
| docs | 450 |
| lessons | 3665 |
| personal-training | 1046 |
| progression-daily-rewards | 432 |
| quizzes | 34 |
| scripts-tools | 221 |
| tests | 11 |
| ui-locale | 249 |


## Field Coverage Gaps
| File | Surface | Reason |
| docs/reports/_phrases_all.json | docs | Has 3200 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_phrases_full.json | docs | Has 3200 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_phrases_extracted.json | docs | Has 2700 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_audit_issues.json | docs | Has 1180 localized source-language field marker(s), but no ES field marker. |
| app/daily_tasks.ts | progression-daily-rewards | Has 326 localized source-language field marker(s), but no ES field marker. |
| docs/atlas/atlas.full.json | docs | Has 159 localized source-language field marker(s), but no ES field marker. |
| docs/atlas/atlas.viewer.html | docs | Has 159 localized source-language field marker(s), but no ES field marker. |
| docs/reports/qa_lessons_full.json | docs | Has 136 localized source-language field marker(s), but no ES field marker. |
| app/lesson_help.tsx | lessons | Has 68 localized source-language field marker(s), but no ES field marker. |
| exports/lesson-theory-dump/lesson_theory_help.json | app-other | Has 64 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_audit_translations.js | docs | Has 49 localized source-language field marker(s), but no ES field marker. |
| scripts/qa_lessons_full.ts | scripts-tools | Has 48 localized source-language field marker(s), but no ES field marker. |
| docs/reports/semantic_audit_phrases_1_32.md | docs | Has 44 localized source-language field marker(s), but no ES field marker. |
| tools/lesson_qa/check_text.cjs | scripts-tools | Has 20 localized source-language field marker(s), but no ES field marker. |
| scripts/audit_lessons_1_27.mjs | scripts-tools | Has 12 localized source-language field marker(s), but no ES field marker. |
| tests/daily_tasks_claim.test.ts | tests | Has 12 localized source-language field marker(s), but no ES field marker. |
| tools/lesson_qa/run.ts | scripts-tools | Has 12 localized source-language field marker(s), but no ES field marker. |
| tests/app_messages.test.ts | tests | Has 9 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_extract_1_32.js | docs | Has 8 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_extract_all.js | docs | Has 8 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_extract.js | docs | Has 8 localized source-language field marker(s), but no ES field marker. |
| scripts/extract_lesson_theory_help.ts | scripts-tools | Has 8 localized source-language field marker(s), but no ES field marker. |
| docs/DAILY_PHRASE_EXAMPLES.md | docs | Has 7 localized source-language field marker(s), but no ES field marker. |
| docs/PHRASEMEN_API_REFERENCE.md | docs | Has 6 localized source-language field marker(s), but no ES field marker. |
| scripts/audit_bug_report_patterns.mjs | scripts-tools | Has 6 localized source-language field marker(s), but no ES field marker. |
| scripts/fix_l28_used_to.mjs | scripts-tools | Has 6 localized source-language field marker(s), but no ES field marker. |
| tools/lesson_qa/check_structure.cjs | scripts-tools | Has 6 localized source-language field marker(s), but no ES field marker. |
| docs/reports/_extract_full.js | docs | Has 5 localized source-language field marker(s), but no ES field marker. |
| scripts/fix_l13_questions.mjs | scripts-tools | Has 5 localized source-language field marker(s), but no ES field marker. |
| app/flashcards_collection.tsx | app-other | Has 4 localized source-language field marker(s), but no ES field marker. |

## Item Coverage Gaps
| File | Surface | Reason |
| exports/lesson-theory-dump/lesson_theory_help.json | app-other | Extracted 9664 source localized item(s), but no es extracted items. |
| app/quiz_data.ts | quizzes | Extracted 8290 source localized item(s), but no es extracted items. |
| docs/reports/lesson_words_en_ru_uk.json | docs | Extracted 3918 source localized item(s), but no es extracted items. |
| docs/reports/_phrases_all.json | docs | Extracted 3200 source localized item(s), but no es extracted items. |
| docs/reports/_phrases_full.json | docs | Extracted 3200 source localized item(s), but no es extracted items. |
| docs/reports/lessons_translations_flat.json | docs | Extracted 3200 source localized item(s), but no es extracted items. |
| docs/reports/_phrases_extracted.json | docs | Extracted 2700 source localized item(s), but no es extracted items. |
| docs/reports/_audit_issues.json | docs | Extracted 1180 source localized item(s), but no es extracted items. |
| docs/reports/victoria-office-remote-english-20260425.json | docs | Extracted 604 source localized item(s), but no es extracted items. |
| docs/reports/victoria-speaking-survival-chunks-20260425.json | docs | Extracted 604 source localized item(s), but no es extracted items. |
| admin/daily_phrases_seed.json | admin-site | Extracted 528 source localized item(s), but no es extracted items. |
| app/idioms_data.ts | app-other | Extracted 528 source localized item(s), but no es extracted items. |
| app/achievements.ts | app-other | Extracted 416 source localized item(s), but no es extracted items. |
| app/flashcards/system-cards.ts | app-other | Extracted 310 source localized item(s), but no es extracted items. |
| scripts/lesson_27_cards.json | scripts-tools | Extracted 300 source localized item(s), but no es extracted items. |
| scripts/lesson_28_cards.json | scripts-tools | Extracted 300 source localized item(s), but no es extracted items. |
| scripts/lesson_29_cards.json | scripts-tools | Extracted 300 source localized item(s), but no es extracted items. |
| scripts/lesson_30_cards.json | scripts-tools | Extracted 300 source localized item(s), but no es extracted items. |
| scripts/lesson_31_cards.json | scripts-tools | Extracted 300 source localized item(s), but no es extracted items. |
| scripts/lesson_32_cards.json | scripts-tools | Extracted 300 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/official_peaky_blinders_en.json | app-other | Extracted 184 source localized item(s), but no es extracted items. |
| docs/reports/phrase_plausibility_audit.json | docs | Extracted 172 source localized item(s), but no es extracted items. |
| scripts/generate_elegant_comebacks_bundle.mjs | scripts-tools | Extracted 126 source localized item(s), but no es extracted items. |
| scripts/small_talk_victoria_seed.ts | scripts-tools | Extracted 120 source localized item(s), but no es extracted items. |
| scripts/generate_modern_abbreviations_bundle.mjs | scripts-tools | Extracted 106 source localized item(s), but no es extracted items. |
| app/irregular_verbs_data.ts | app-other | Extracted 102 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part1.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part2.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part3.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part4.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |

## Russian-Only Reports
| File | Surface | Reason |
| app/streak_stats.tsx | progression-daily-rewards | Report/data screen is explicitly marked Russian-only. |
| app/quizzes/result_view.tsx | quizzes | Report/data screen is explicitly marked Russian-only. |
| components/AchievementToast.tsx | app-other | Report/data screen is explicitly marked Russian-only. |
| constants/report_ui_ru.ts | app-other | Report/data screen is explicitly marked Russian-only. |

## Fallback Risk Files
| File | Surface | Reason |
| components/LangContext.tsx | ui-locale | Language helper/fallback path present; verify target locale is not silently returning RU. |
| constants/i18n.ts | ui-locale | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/exam.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/flashcards_market_dev.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| components/ExamResultPreviewAdminModal.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| components/ShardRewardModal.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/lesson_irregular_verbs.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| app/shards_shop.tsx | app-other | Language helper/fallback path present; verify target locale is not silently returning RU. |
| tests/locale_ru_uk_es.test.ts | tests | Language helper/fallback path present; verify target locale is not silently returning RU. |
| scripts/lib/heisenberg_core.cjs | scripts-tools | Language helper/fallback path present; verify target locale is not silently returning RU. |
| tests/i18n_locale.test.ts | tests | Language helper/fallback path present; verify target locale is not silently returning RU. |
| docs/heisenberg/fr/2026-05-16T11-59-59-137Z/inventory.json | docs | Language helper/fallback path present; verify target locale is not silently returning RU. |
| scripts/generate-spanish-agent-prompts.mjs | scripts-tools | Language helper/fallback path present; verify target locale is not silently returning RU. |
| tests/i18n_helpers.test.ts | tests | Language helper/fallback path present; verify target locale is not silently returning RU. |

## Production Gate Files
| File | Surface | Reason |
| components/LangContext.tsx | ui-locale | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| constants/i18n.ts | ui-locale | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| constants/arena_i18n.ts | ui-locale | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/locale_ru_uk_es.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| scripts/lib/heisenberg_core.cjs | scripts-tools | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/i18n_locale.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/i18n_utils.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/app_messages.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/config.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/exam_certificate.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/flashcards/types.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/quizzes/results.ts | quizzes | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/referral_invite_share.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/settings_language.tsx | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/spanish_content_gate.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| components/onboarding.tsx | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/i18n_helpers.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/level_gift_locale.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/level_gift_milestones.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/level_gift_xp_bank.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| tests/shards_level_gift.test.ts | tests | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |

## Study-Target Confusion Files
| File | Surface | Reason |
| app/flashcards_collection.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/review.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_data_all.ts | lessons | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_intro_screens.tsx | lessons | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/pack_opening.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/(tabs)/settings.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson1.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| scripts/lib/heisenberg_core.cjs | scripts-tools | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| tests/lesson_locale_utils.test.ts | tests | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/config.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_locale_utils.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson1_smart_options.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/phrase_target_utils.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/spanish_content_gate.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/study_target_lang_dev.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| components/StudyTargetContext.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| tests/flashcard_content_lang.test.ts | tests | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |

## Next gate
- Resolve or document every blocker above before turning Spanish UI on in production.
- Keep Spanish UI/explanations separate from Spanish-as-study-target experiments.
- Run the Spanish locale test bundle after every integration block.
