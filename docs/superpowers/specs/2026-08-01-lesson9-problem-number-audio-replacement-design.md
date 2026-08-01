# Lesson 9: unambiguous singular/plural replacement

## Goal

Replace the ambiguous Ukrainian `питання` pair in lesson 9 with a pair whose
singular/plural distinction is explicit in English, Russian, Ukrainian, and
Spanish. Remove the temporary grammar-number badge because the phrase itself
will now carry the distinction.

## Exact phrase content

| ID | English | Russian | Ukrainian | Spanish |
| --- | --- | --- | --- | --- |
| `lesson9_phrase_3` | `Is there a problem?` | `Есть проблема?` | `Є проблема?` | `¿Hay un problema?` |
| `lesson9_phrase_4` | `Are there problems?` | `Есть проблемы?` | `Є проблеми?` | `¿Hay problemas?` |

The result forms a consistent six-phrase paradigm with the existing lesson 9
statements and negatives about `problem/problems`.

## App changes

- Update the generated lesson data, word-token arrays, intro examples, and help
  theory examples that refer to the old `question/questions` pair.
- Remove the temporary `targetGrammarNumber` metadata, helper, badge UI, and
  their tests.
- Keep every unrelated lesson and UI behavior unchanged.

## Audio replacement

- Regenerate English audio only for `lesson9_phrase_3` and
  `lesson9_phrase_4`, using the project's existing phrase voice, model, speed,
  and pronunciation instructions.
- Use only `OPENAI_TTS_API_KEY`, with the explicit spend and upload guards.
- Upload each new clip to the same Firebase Storage object name as the old
  clip. This replaces the old bytes atomically and avoids a missing-file window
  or an orphaned duplicate.
- Update the canonical audio metadata and rebuild the runtime text-to-audio map
  so the old `question/questions` keys disappear and the new
  `problem/problems` keys resolve to the two replaced files.

## Error-report preview

Update the two prepared admin replies so they accurately say that the
ambiguous phrases were replaced with forms where singular and plural are
explicit. Publish only the static admin preview; do not send replies or mutate
report state.

## Acceptance criteria

- All four languages contain the exact approved phrase pair above.
- Lesson 9 no longer contains the old `Is there a question?` or
  `Are there questions?` training pair.
- The grammar-number badge implementation is removed.
- Audio audit reports no stale-text drift for the two phrase IDs.
- The runtime audio map contains the new normalized English keys and not the
  old ones.
- Focused lesson, audio, and admin-preview contracts pass.
