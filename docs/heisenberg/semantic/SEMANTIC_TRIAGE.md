# Heisenberg Semantic Triage

Latest calibrated run after content polish:

- Report: `docs/heisenberg/semantic/2026-05-17T07-07-00-750Z/semantic_audit.json`
- Blockers: `0`
- Warnings: `100`
- Review groups: `20`

## Verdict

The current warnings do not show a hard semantic failure. They show places where the localized explanation usually preserves the idea, but does not repeat one exact English anchor from the original Russian explanation.

That is useful as a review queue, but it should not block integration unless a group clearly proves one of these problems:

- the explanation points to the wrong answer choice;
- the distractor meaning changed;
- the explanation hides the English form that the learner must notice;
- an interface/source language starts behaving like the study target.

## Triage Categories

### Accept As Heuristic Noise

These groups preserve the intended explanation. They may stay as warnings only if we want a stricter editorial style, but they are not evidence of broken translation.

| Group | Missing anchor | Why it is acceptable |
|---|---|---|
| `medium #112 explanations[2]` | `asked` | The localized line keeps `Where I live`, `reported speech`, and `lived`; the key contrast is still present. |
| `medium #113 explanations[0]` | `will be` | The line explains no `will` after `if` and gives `if the weather is good`; the rule is preserved. |
| `medium #144 explanations[3]` | `the shelves` | The line contrasts `Shelves` with `themselves`; the article `the` is not semantically important. |
| `medium #157 explanations[3]` | long `none` phrases | The line explains `None` versus `known`; the distractor meaning is preserved. |
| `medium #160 explanations[1]` | `would have` | The line explains no `would` in the `if` part and gives `If I had`; the contrast is preserved. |
| `medium #160 explanations[2]` | `had` | The line explains `will` versus `would`; this is the real error in that option. |
| `medium #165 explanations[2]` | `told` | The line explains reported speech and `is` to `was`; `told` is context, not the error. |
| `medium #167 explanations[2]` | `asked` | Same pattern as `medium #112`; the key contrast is `Where I live` versus `lived`. |
| `medium #171 explanations[2]` | `when` | The line explains `seen` needs `have`; `when` is not the semantic target. |
| `medium #172 explanations[1]` | long `hotel which` phrases | The line explains `which`, `which we stayed in`, and `where`; the grammar issue is preserved. |
| `medium #175 explanations[0]` | `am used to` | The line uses the general form `be used to`, which correctly covers `am used to`. |
| `medium #186 explanations[2]` | `when` | The line explains `rung` versus `rang`; `when` is not the semantic target. |
| `medium #199 explanations[2]` | `had` | The line explains `will` versus `would`; this is the real error in that option. |
| `medium #224 explanations[2]` | `our shelves` | The line contrasts `Shelves` with `ourselves`; the distractor meaning is preserved. |
| `hard #17 explanations[1]` | `vital` | The line explains mandative subjunctive and `she arrive`; the target grammar is preserved. |
| `hard #30 explanations[0]` | `to be` | The line explains `resent` takes `-ing`, not infinitive with `to`; the rule is preserved. |
| `hard #59 explanations[1]` | `imperative` | The line explains the `that he arrive` structure; the exact adjective is not the core error. |
| `hard #80 explanations[0]` | `rather` | The line explains the past-form requirement after `would rather`; the rule is preserved. |
| `hard #84 explanations[1]` | `essential` | The line explains mandative subjunctive and `he arrive`; the target grammar is preserved. |
| `hard #84 explanations[2]` | `essential` | The line explains why `For him arriving` is not the structure; the target error is preserved. |

### Content Polish Closed

These groups were not blockers, but the exact English anchor was added to make the explanations stronger and keep the study target more visible.

| Group | Added or preserved English anchor | Why |
|---|---|---|
| `hard #11 explanations[0]` | `sign` or `get him to sign` | The current line explains the `to` gap, but the exact action can stay visible. |
| `hard #19 explanations[3]` | `but also` | The local-language translation of `also` is understandable, but the English connector is the target form. |
| `hard #43 explanations[0]` | `scrap` | The explanation covers the idiom, but the original also teaches `scrap` as the sharper verb. |
| `hard #46 explanations[1]` | `back out of` | The line explains missing `of`; preserving the full phrasal verb would be clearer. |
| `hard #48 explanations[0]` | `offend` / `offended` | The line explains the past result, but the exact verb contrast should remain visible. |
| `hard #81 explanations[1]` | `on the cross of roads` / `at a crossroads` | The explanation says literal translation is wrong; showing both English forms would make it safer. |
| `hard #92 explanations[1]` | `back down` | The line explains the need for a phrasal verb; naming it directly is better. |

## Pipeline Rule Going Forward

When Heisenberg writes translated quiz explanations, it should preserve exact English anchors when the explanation is correcting one of these things:

- a phrasal verb;
- an idiom;
- a connector such as `but also`;
- a confused word pair such as `offend` / `offended`;
- the exact wrong answer choice when the distractor is phrase-level.

For grammar context words like `asked`, `when`, `vital`, or `essential`, exact repetition is optional if the localized explanation already points to the same grammatical contrast.
