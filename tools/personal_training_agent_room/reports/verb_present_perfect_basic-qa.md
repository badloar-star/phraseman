# verb_present_perfect_basic QA

Status: PASS

Checks planned:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- Targeted `trainer_modes.test.ts` for Present Perfect
- Full `trainer_modes.test.ts`

Contract:
- id: `verb_present_perfect_basic`
- status: `active`
- priority: `38`
- locales: `ru`, `uk`
- contrastSet: `have + V3`, `has + V3`, `past participle`, `already`, `yet`, `ever`, `never`, `result now`, `life experience`, `past simple`
- smart contrastSet excludes `life experience`, matching the test contract.
- steps: 15
- examples: 8

QA notes:
- `present_perfect_contrast_001` gives `seen` feedback for `saw`.
- `present_perfect_easy_002` gives `has` feedback for `have`.
- `present_perfect_contrast_005` gives `yet` feedback for `already`.
- `present_perfect_mixed_005` gives `Past Simple` feedback for `I have lost my keys yesterday.`
- `present_perfect_mixed_006` gives `done` feedback for the legacy mojibake apostrophe option and the curly apostrophe variant.

