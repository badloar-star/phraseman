# Existing locale audit: es

## Scope
- Target locale: `es`
- Role: interface/explanation source language for learning English.
- Study target: `en`
- Mode: `existing-locale-production-audit`

## Summary
| Metric | Value |
| Files scanned | 1761 |
| Localized items | 80513 |
| Target localized items | 12918 |
| Target item share | 0.1604 |
| Field coverage gap files | 7 |
| Item coverage gap files | 33 |
| Russian-only report files | 4 |
| Fallback risk files | 8 |
| Production gate files | 12 |
| Study-target confusion files | 14 |

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
| personal-training | 1062 |
| progression-daily-rewards | 432 |
| quizzes | 34 |
| scripts-tools | 221 |
| tests | 11 |
| ui-locale | 249 |


## Field Coverage Gaps
| File | Surface | Reason |
| app/daily_tasks.ts | progression-daily-rewards | Has 326 localized source-language field marker(s), but no ES field marker. |
| app/lesson_help.tsx | lessons | Has 68 localized source-language field marker(s), but no ES field marker. |
| exports/lesson-theory-dump/lesson_theory_help.json | app-other | Has 64 localized source-language field marker(s), but no ES field marker. |
| app/flashcards_collection.tsx | app-other | Has 4 localized source-language field marker(s), but no ES field marker. |
| app/daily_tasks_es_locale.ts | progression-daily-rewards | Has 3 localized source-language field marker(s), but no ES field marker. |
| .claude/settings.local.json | app-other | Has 1 localized source-language field marker(s), but no ES field marker. |
| app/review.tsx | app-other | Has 1 localized source-language field marker(s), but no ES field marker. |

## Item Coverage Gaps
| File | Surface | Reason |
| exports/lesson-theory-dump/lesson_theory_help.json | app-other | Extracted 9664 source localized item(s), but no es extracted items. |
| app/quiz_data.ts | quizzes | Extracted 8290 source localized item(s), but no es extracted items. |
| admin/daily_phrases_seed.json | admin-site | Extracted 528 source localized item(s), but no es extracted items. |
| app/idioms_data.ts | app-other | Extracted 528 source localized item(s), but no es extracted items. |
| app/achievements.ts | app-other | Extracted 416 source localized item(s), but no es extracted items. |
| app/flashcards/system-cards.ts | app-other | Extracted 310 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/official_peaky_blinders_en.json | app-other | Extracted 184 source localized item(s), but no es extracted items. |
| app/irregular_verbs_data.ts | app-other | Extracted 102 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part1.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part2.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part3.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/dark_logic/dark_logic_part4.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/negotiator/negotiator_part1.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/negotiator/negotiator_part2.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/negotiator/negotiator_part3.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/royal_tea/royal_tea_part1.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/royal_tea/royal_tea_part2.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/royal_tea/royal_tea_part3.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/royal_tea/royal_tea_part4.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/wild_west/wild_west_part1.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/wild_west/wild_west_part2.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/wild_west/wild_west_part3.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/wild_west/wild_west_part4.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/flashcards/bundles/wild_west/wild_west_part5.ts | app-other | Extracted 60 source localized item(s), but no es extracted items. |
| app/trainer_store.ts | app-other | Extracted 30 source localized item(s), but no es extracted items. |
| app/active_recall.ts | app-other | Extracted 9 source localized item(s), but no es extracted items. |
| components/ErrorBoundary.tsx | app-other | Extracted 8 source localized item(s), but no es extracted items. |
| app/flashcards/marketplace.ts | app-other | Extracted 6 source localized item(s), but no es extracted items. |
| components/ForceUpdateScreen.tsx | app-other | Extracted 6 source localized item(s), but no es extracted items. |
| app/daily_phrase_system.ts | app-other | Extracted 3 source localized item(s), but no es extracted items. |

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

## Production Gate Files
| File | Surface | Reason |
| components/LangContext.tsx | ui-locale | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| constants/i18n.ts | ui-locale | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| constants/arena_i18n.ts | ui-locale | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/app_messages.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/config.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/exam_certificate.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/flashcards/types.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/quizzes/results.ts | quizzes | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/referral_invite_share.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/settings_language.tsx | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| app/spanish_content_gate.ts | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |
| components/onboarding.tsx | app-other | Spanish UI is tied to an app-locale gate or hard-coded Lang union. |

## Study-Target Confusion Files
| File | Surface | Reason |
| app/flashcards_collection.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/review.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_data_all.ts | lessons | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_intro_screens.tsx | lessons | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/pack_opening.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/(tabs)/settings.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson1.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/config.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_locale_utils.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson1_smart_options.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/phrase_target_utils.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/spanish_content_gate.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/study_target_lang_dev.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| components/StudyTargetContext.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |

## Next gate
- Resolve or document every blocker above before turning Spanish UI on in production.
- Keep Spanish UI/explanations separate from Spanish-as-study-target experiments.
- Run the Spanish locale test bundle after every integration block.
