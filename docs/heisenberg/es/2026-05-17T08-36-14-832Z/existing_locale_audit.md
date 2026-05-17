# Existing locale audit: es

## Scope
- Target locale: `es`
- Role: interface/explanation source language for learning English.
- Study target: `en`
- Mode: `existing-locale-production-audit`

## Summary
| Metric | Value |
| Files scanned | 1637 |
| Localized items | 92286 |
| Target localized items | 17226 |
| Target item share | 0.1867 |
| Field coverage gap files | 17 |
| Item coverage gap files | 20 |
| Russian-only report files | 0 |
| Fallback risk files | 8 |
| Production gate files | 0 |
| Study-target confusion files | 15 |

## Policy
- es is treated as an interface/explanation source language for learning English.
- Do not switch, generate, or expose a studied Spanish course in this run.
- The study target stays `en`; any `StudyTargetLang = es` code is a separate dev-only feature and must not drive this localization.
- Generated audit output is isolated under docs/heisenberg/<locale>/<run>; no production content is overwritten.
- Before enabling the locale in production, every UI surface must have an explicit target-language branch or an intentional fallback record.

## Blockers
- Some localized RU/UK field contracts have no ES field marker.
- Some extracted RU/UK localized items have no extracted ES counterpart.
- Some files contain Spanish study-target logic; these must stay separate from UI Spanish.

## Target items by surface
| Surface | Target items |
| app-other | 5114 |
| arena | 201 |
| daily-phrase | 1056 |
| docs | 2050 |
| lessons | 3666 |
| personal-training | 1000 |
| progression-daily-rewards | 432 |
| quizzes | 3194 |
| scripts-tools | 239 |
| tests | 25 |
| ui-locale | 249 |


## Field Coverage Gaps
| File | Surface | Reason |
| app/flashcards/bundles/official_peaky_blinders_en.json | app-other | Has 124 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/dark_logic/dark_logic_part1.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/dark_logic/dark_logic_part2.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/dark_logic/dark_logic_part3.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/dark_logic/dark_logic_part4.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/negotiator/negotiator_part1.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/negotiator/negotiator_part2.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/negotiator/negotiator_part3.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/royal_tea/royal_tea_part1.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/royal_tea/royal_tea_part2.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/royal_tea/royal_tea_part3.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/royal_tea/royal_tea_part4.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/wild_west/wild_west_part1.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/wild_west/wild_west_part2.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/wild_west/wild_west_part3.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/wild_west/wild_west_part4.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |
| app/flashcards/bundles/wild_west/wild_west_part5.ts | app-other | Has 40 localized source-language field marker(s), but no ES field marker. |

## Item Coverage Gaps
| File | Surface | Reason |
| app/achievements.ts | app-other | Extracted 520 source localized item(s), but no es extracted items. |
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

## Russian-Only Reports
- None detected.

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
- None detected.

## Study-Target Confusion Files
| File | Surface | Reason |
| app/flashcards_swipe.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/review.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_data_all.ts | lessons | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/flashcards_collection.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
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
