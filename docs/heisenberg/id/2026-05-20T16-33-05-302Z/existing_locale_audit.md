# Existing locale audit: id

## Scope
- Target locale: `id`
- Role: interface/explanation source language for learning English.
- Study target: `en`
- Mode: `existing-locale-production-audit`

## Summary
| Metric | Value |
| Files scanned | 2271 |
| Localized items | 139085 |
| Target localized items | 5768 |
| Target item share | 0.0415 |
| Field coverage gap files | 0 |
| Item coverage gap files | 0 |
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
- No blocking architecture risks detected by the static audit.

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
- None detected.

## Item Coverage Gaps
- None detected.

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
