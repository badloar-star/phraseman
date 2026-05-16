# pronoun_case QA

Training id: `pronoun_case`

Room: Jesse Pinkman

Files created:

- `tools/personal_training_agent_room/drafts/pronoun_case.draft.md`
- `tools/personal_training_agent_room/reports/pronoun_case-qa.md`

Files intentionally not touched:

- app training files
- registry files
- docs exports
- admin/manual lists
- shared templates

## Scope Check

Status: pass.

The draft is scoped to one error type: choosing English words for "who does" versus words for "whom / who receives it" after an action or after `to`, `for`, `with`, `between`.

The draft does not expand into possessives except as distractors like `my`, `his`, `their`, `our`; each of those is explained only as the selected wrong option.

## Replacement Sweep

Status: read-only done.

Current repo already has an active `pronoun_case` implementation in `app/diagnosis_training_pronoun_case.ts` and registry references. The user requested draft/report only and "do not touch shared files", so no app or registry edits were made.

No stale draft/report siblings were created for this training id.

## Copy Gate

Status: pass.

Learner-facing explanation uses the required beginner model:

- RU: есть слова для "кто делает": `he/she/I`; после действия нужны слова для "кого": `him/her/me`.
- UK: є слова для "хто робить": `he/she/I`; після дії потрібні слова для "кого": `him/her/me`.
- ES: hay palabras para "quien hace": `he/she/I`; despues de la accion usamos palabras para "a quien": `him/her/me`.

The banned English grammar label from the request is not used in the draft or this report.

## Locale Gate

Status: pass.

All learner-facing sections include RU/UK/ES:

- title
- short diagnosis
- mental model
- every step translation
- every correct feedback
- every wrong-option feedback

## Exercise Gate

Status: pass.

The draft has exactly 12 steps:

1. `pronoun_case_001` - `I` before `called`
2. `pronoun_case_002` - `me` after `called`
3. `pronoun_case_003` - `She` before `helped`
4. `pronoun_case_004` - `her` after `saw`
5. `pronoun_case_005` - `me` after `for`
6. `pronoun_case_006` - `him` after `to`
7. `pronoun_case_007` - `They` before `invited`
8. `pronoun_case_008` - `us` after `asked`
9. `pronoun_case_009` - `me` after `between`
10. `pronoun_case_010` - `I` in `You and I need`
11. `pronoun_case_011` - mixed sentence `She helped him.`
12. `pronoun_case_012` - mixed sentence `They gave it to us.`

Difficulty shape: easy identification first, then after-action / after-short-word contrast, then mixed sentence choices.

## Feedback Gate

Status: pass.

Every wrong answer option has its own explanation tied to the selected mistake.

Examples:

- `Me` in step 1 explains that `Me` is for after the action, while the blank does `called`.
- `He` in step 1 explains that it is a valid "who does" word but the person is wrong because the translation is "I".
- `my`, `his`, `their`, `our` are explained as belonging words that need a noun, not as generic wrong choices.
- Mixed options in steps 11-12 explain whether the first position, second position, or both positions are wrong.

## Beginner Gate

Status: pass.

The draft avoids broad grammar lecture and keeps one repeatable question:

Is this word doing the action, or is it after the action / after `to`, `for`, `with`, `between`?

The tone is calm, direct, and shame-free. No feedback says only "wrong"; each line gives a concrete repair.

## Final QA Result

Ready as a room draft. Not integrated into app files by request.
