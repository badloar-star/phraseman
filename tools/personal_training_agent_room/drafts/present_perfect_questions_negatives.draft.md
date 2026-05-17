# present_perfect_questions_negatives

Jesse rework pass: Present Perfect questions and negatives.

Scope:
- One repair only: questions and negatives in Present Perfect.
- Question side: `Have you finished?`, `Has she called?`, `Has it started?`
- Negative side: `haven't + V3`, `hasn't + V3`
- Marker words: `yet`, `ever`, `already`, `never`
- Do not expand into the full Present Perfect vs Past Simple contrast.
- Do not expand into `for/since`.

Required traps:
- `pp_qn_easy_001`: wrong `Did` must point to `Have you finished`.
- `pp_qn_contrast_001`: wrong `Have` must point to `has`.
- `pp_qn_contrast_006`: wrong `see` must point to `seen`.
- `pp_qn_mixed_006`: wrong `Have you ever saw it? I haven't see it yet.` must point to `seen`.

Learner-facing copy rule:
- Russian and Ukrainian text avoids internal grammar jargon such as `subject`, `object`, `base verb`, `main verb`, `auxiliary`, and `modal`.

