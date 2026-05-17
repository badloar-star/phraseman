# present_perfect_questions_negatives QA

Status: PASS

Checks planned:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- Targeted `trainer_modes.test.ts` for Present Perfect questions/negatives
- Full `trainer_modes.test.ts`

Contract:
- id: `present_perfect_questions_negatives`
- status: `active`
- priority: `40`
- locales: `ru`, `uk`
- contrastSet: `have you + V3`, `has she + V3`, `haven't + V3`, `hasn't + V3`, `yet`, `ever`, `already`, `did vs have`
- smart contrastSet matches the training contrastSet.
- steps: 15
- examples: 8

QA notes:
- `pp_qn_easy_001` gives `Have you finished` feedback for `Did`.
- `pp_qn_contrast_001` gives `has` feedback for `Have`.
- `pp_qn_contrast_006` gives `seen` feedback for `see`.
- `pp_qn_mixed_006` gives `seen` feedback for `Have you ever saw it? I haven't see it yet.`

