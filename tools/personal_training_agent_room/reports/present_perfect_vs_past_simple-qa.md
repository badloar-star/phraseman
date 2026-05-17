# present_perfect_vs_past_simple QA

Status: PASS

Checks planned:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- Targeted `trainer_modes.test.ts` for Present Perfect vs Past Simple
- Full `trainer_modes.test.ts`

Contract:
- id: `present_perfect_vs_past_simple`
- status: `active`
- priority: `39`
- locales: `ru`, `uk`
- contrastSet: `present perfect`, `past simple`, `result now`, `life experience`, `finished time`, `yesterday`, `last week`, `ago`, `ever`, `never`
- smart contrastSet matches the training contrastSet.
- steps: 15
- examples: 8

QA notes:
- `pp_vs_past_easy_002` gives `Past Simple` feedback for `have lost`.
- `pp_vs_past_contrast_001` gives `Have you ever tried` feedback for `Did`.
- `pp_vs_past_contrast_004` gives `finished` feedback for `has finished`.
- `pp_vs_past_mixed_006` gives `went` feedback for `I have never was to London, but I have went to Dublin in 2020.`

