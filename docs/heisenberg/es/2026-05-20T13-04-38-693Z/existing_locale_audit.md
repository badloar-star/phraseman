# Existing locale audit: es

## Scope
- Target locale: `es`
- Role: interface/explanation source language for learning English.
- Study target: `en`
- Mode: `existing-locale-production-audit`

## Summary
| Metric | Value |
| Files scanned | 2252 |
| Localized items | 139258 |
| Target localized items | 26188 |
| Target item share | 0.1881 |
| Field coverage gap files | 2 |
| Item coverage gap files | 2 |
| HTML coverage backlog files | 2 |
| HTML partial coverage files | 0 |
| Resolved sidecar coverage files | 18 |
| Russian-only report files | 0 |
| Fallback risk files | 0 |
| Verified fallback files | 8 |
| Production gate files | 0 |
| Isolated study-target files | 15 |
| Study-target risk files | 3 |

## Policy
- es is treated as an interface/explanation source language for learning English.
- Do not switch, generate, or expose a studied Spanish course in this run.
- The study target stays `en`; any `StudyTargetLang = es` code is a separate dev-only feature and must not drive this localization.
- Generated audit output is isolated under docs/heisenberg/<locale>/<run>; no production content is overwritten.
- Before enabling the locale in production, every UI surface must have an explicit target-language branch or an intentional fallback record.

## Blockers
- Some localized RU/UK field contracts have no ES field marker.
- Some extracted RU/UK localized items have no extracted ES counterpart.
- Some non-isolated files contain Spanish study-target logic; these must not drive UI Spanish.

## Target items by surface
| Surface | Target items |
| admin-site | 691 |
| app-other | 6579 |
| arena | 201 |
| daily-phrase | 1056 |
| docs | 7512 |
| lessons | 3672 |
| personal-training | 1122 |
| progression-daily-rewards | 468 |
| public-web | 165 |
| quizzes | 4182 |
| scripts-tools | 257 |
| tests | 34 |
| ui-locale | 249 |


## Field Coverage Gaps
| File | Surface | Reason |
| app/french_lesson_curriculum.ts | app-other | Has 68 localized source-language field marker(s), but no ES field marker. |
| app/lesson_titles_for_study_target.ts | app-other | Has 2 localized source-language field marker(s), but no ES field marker. |

## Item Coverage Gaps
| File | Surface | Reason |
| app/french_lesson_curriculum.ts | app-other | Extracted 64 non-HTML source localized item(s), but no es extracted items. |
| app/study_target_lang_dev.ts | app-other | Extracted 6 non-HTML source localized item(s), but no es extracted items. |

## HTML Coverage Backlog
| File | Surface | Reason |
| admin/support.html | admin-site | Extracted 9 HTML source localized item(s), but no es HTML items. |
| duel/index.html | app-other | Extracted 3 HTML source localized item(s), but no es HTML items. |

## HTML Partial Coverage
- None detected.

## Resolved Sidecar Coverage
| File | Surface | Reason |
| app/achievements.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/dark_logic/dark_logic_part1.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/dark_logic/dark_logic_part2.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/dark_logic/dark_logic_part3.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/dark_logic/dark_logic_part4.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/negotiator/negotiator_part1.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/negotiator/negotiator_part2.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/negotiator/negotiator_part3.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/official_peaky_blinders_en.json | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/royal_tea/royal_tea_part1.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/royal_tea/royal_tea_part2.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/royal_tea/royal_tea_part3.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/royal_tea/royal_tea_part4.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/wild_west/wild_west_part1.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/wild_west/wild_west_part2.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/wild_west/wild_west_part3.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/wild_west/wild_west_part4.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |
| app/flashcards/bundles/wild_west/wild_west_part5.ts | app-other | Spanish es coverage is supplied by sidecar locale file(s), not inline fields. |

## Russian-Only Reports
- None detected.

## Fallback Risk Files
- None detected.

## Verified Fallback Files
| File | Surface | Reason |
| app/exam.tsx | app-other | Exam screen uses bundleLang/triLang with explicit ES copy; textFallback is a native share/export fallback, not a language fallback. |
| app/flashcards_market_dev.tsx | app-other | DEV marketplace screen uses triLang/bundleLang with explicit ES copy; it is not part of production locale activation. |
| app/lesson_irregular_verbs.tsx | app-other | Irregular verbs now carry ES rows in the lesson data; any final fallback stays non-Russian to avoid UI/source-locale mixing. |
| app/shards_shop.tsx | app-other | Shard shop has explicit ES branches for store copy; marketplace data fallback is catalog availability fallback, not language fallback. |
| components/ExamResultPreviewAdminModal.tsx | app-other | Admin preview uses localized share-message builders; textFallback is a native share/export fallback, not a language fallback. |
| components/LangContext.tsx | ui-locale | Central UI string bundle explicitly returns ES when the Spanish interface locale is enabled; RU is only the disabled/default guard. |
| components/ShardRewardModal.tsx | app-other | Shard reward modal has an explicit ES text bundle and uses bundleLang only to choose the active UI bundle. |
| constants/i18n.ts | ui-locale | Central triLang/bundleLang helpers explicitly return ES when the Spanish interface locale is enabled; RU is only the disabled/default guard. |

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
| app/(tabs)/settings.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson1.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/study_target_lang_dev.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/config.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson_locale_utils.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/lesson1_smart_options.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/phrase_target_utils.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| app/spanish_content_gate.ts | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |
| components/StudyTargetContext.tsx | app-other | Known isolated Spanish-as-study-target file; verify it remains separated from UI/source-locale localization. |

## Study-Target Risk Files
| File | Surface | Reason |
| components/MasteryReplayModal.tsx | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/home_screen_hydration.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |
| app/lesson_titles_for_study_target.ts | app-other | Contains study-target Spanish logic; keep this separate from Spanish UI/explanation localization. |

## Next gate
- Resolve or document every blocker above before turning Spanish UI on in production.
- Keep Spanish UI/explanations separate from Spanish-as-study-target experiments.
- Run the Spanish locale test bundle after every integration block.
