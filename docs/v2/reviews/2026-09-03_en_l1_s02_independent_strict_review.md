# Independent strict learner review — English L1 / S2

**Date:** 2026-09-03 (Europe/Dublin)  
**Verdict:** **BLOCK**  
**Reviewer scope:** read-only. No learner-facing source, registry, or gate was changed.

## 1. Identity, fingerprint, locales, and actual evidence

| Item | Evidence |
|---|---|
| Exact packet | `lesson-01:session:02`; review set `en.grammar.present_be_affirmative.i_am`; new senses `happy`, `sad`, `tired`; canonical examples `I am happy/sad/tired/here.` |
| Exact packet shape | 3 intro pages + 17 activities, slots 4–20; source status is still `PLANNED_NOT_AUTHORED`. |
| Current source / registry fingerprint | `e3c33b209176329569d1c73da46ba0202375fb49b3d3bc3a96b007b0c8a9db01`; registry labels it `LOCKED`. |
| Actual reviewed pipeline | source → shard → `buildLearningV2AuthoringDevicePreviewV1(2, locale)` → rebuilt owner-review HTML. |
| Eight locale projections | Every `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, and `pl` projection has 3 intro pages, 7 interactions, 2 single-choice tasks, and 7 non-empty wrong-option feedback entries. |
| Rendered UI evidence | The owner HTML contains L1:S2, but local browser policy blocks the `file:` page. Pixel, gesture, audio, motion, and reduced-motion claims are therefore not made and remain an evidence blocker. |

## 2. Learner journey actually projected

1. The intro presents `I am` as a two-word unit, then teaches its fixed order and the visible trap of losing `am`.
2. Practice offers only seven actions: say `happy`; listen/select `sad`; say `tired`; a three-pair Speed Match; build `I am tired`; listen/build `I am happy`; choose `sad` in `I am ___`.
3. The last choice uses concrete emotion alternatives (`happy`, `tired`, `angry`, `fine`) and its wrong answers have individual locale feedback.

## 3. What works well

- The intro is clearer and more connected than a rule list. The Russian `I am — крепкое начало` gives a memorable learner-friendly image without grammar jargon.
- The `sad` listening distractors are genuinely diagnostic: `said` isolates vowel contrast, `sat` final consonant, and `sand` the extra `/n/`. Their feedback names the selected trap and the deciding difference.
- The eight inspected locale projections keep their local explanatory language and have no blank wrong-option feedback.
- All six permitted mode families are represented, and the focused Session 2 word-first and mode-native gates pass. This is useful partial evidence, not the verdict.

## 4. Blocking findings

### P0 — A seven-task card set is substituted for the exact seventeen-task lesson

- **Screen / evidence:** The exact packet has 17 activity slots. The learner projection has 7. Its last projected step is ordinal 10; the exact packet continues through slot 20, including low-support and independent changed-context work.
- **Requirement:** exact-packet fidelity and the Full B1 rule that a new/review operation is a complete 3-intro + 17-practice session, not a short set of cards.
- **Learner harm:** support never fades across the declared route. The learner gets no complete guided → retrieval → independent progression and no reliable independent evidence.
- **Required repair:** write the dedicated 17-task S2 package from slots 4–20, with unique primary targets and the exact support schedule. Do not inflate the count with copied target/family pairs or a second Speed Match.

### P1 — The actual board contradicts its visible instruction and omits required retrieval

- **Screen / quote:** The Speed Match prompt says `Соедините восемь английских слов с их точными значениями.`, but its actual `pairGrid` contains only `happy`, `sad`, and `tired` — three pairs. It does not contain the packet's earlier retrieval senses `here`, `ready`, and `fine`.
- **Requirement:** a real four-pair atomic Speed Match board; exact packet retrieval/fidelity; no generic or misleading action prompt.
- **Learner harm:** the UI promises an eight-word action that is neither visually nor pedagogically available. The session also loses its planned bridge from S1 vocabulary into the new emotional-state context.
- **Required repair:** use exactly four already grounded, packet-permitted atomic pairs; make the prompt match the board; include planned retrieval through distinct contexts rather than reusing a generic list.

### P1 — New-word learning is not a complete standalone word-first cycle

- **Screen / evidence:** Before phrases, `happy` and `tired` receive repeat-and-compare, `sad` receives one listening choice, and all three are then put on the three-pair board. The projection does not materialise each exact target through separate `recognize → retrieve_meaning → build_form` actions across distinct families before phrase use.
- **Requirement:** `СТАРТ В2`, section 5, word-first choreography for each new lexical item.
- **Learner harm:** production is requested before meaning and written-form retrieval have been built for every target; one exposure plus a small board is not an independent word cycle.
- **Required repair:** interleave all three stages across `happy`, `sad`, and `tired`, then move each word into its first phrase only after its own completed standalone cycle.

### P1 — The required exact packet and current lock are contradicted by quality evidence

- **Evidence:** `evaluateLearningV2SessionContentQuality` returns `quality_review_missing` / `Без независимых review-решений материал остаётся HOLD`; the exact packet remains `PLANNED_NOT_AUTHORED`, while the registry is `LOCKED`.
- **Requirement:** `DRAFT → AUTO_PASS → OWNER_APPROVED → LOCKED`; no lock without a real independent review.
- **Learner harm:** a later lesson can treat unreviewed S2 vocabulary and retrieval as stable prerequisites.
- **Required repair:** remove the acceptance implication until the rewritten source has a fresh independent review receipt. The author may record the receipt but may not self-approve it.

### P1 — Owner-preview state proof is absent

- **Evidence:** static HTML was rebuilt but local browser policy rejects its local URL, leaving no observed state-by-state proof for word cards, audio unavailable/error, Speed Match shuffling, hold-to-talk, feedback, or reduced motion.
- **Requirement:** mode-native 1:1 owner mock parity requires real state, gesture, audio, and motion receipts.
- **Required repair:** expose a reviewable owner-preview URL or collect device evidence after the content repair, covering every interaction state and all eight locales.

### P1 — The registry guard is stale and red

- **Evidence:** `tests/learning_v2_lesson1_authoring_registry_gate.ts` fails: actual statuses are all `LOCKED`, while the guard expects all `DRAFT`.
- **Requirement:** a lock/status guard must encode the current owner contract and remain green; unrelated green gates cannot override it.
- **Required repair:** update the guard only as part of a contract-correct repair, with regression coverage for the sequential lock state.

## 5. Fullness and human-session assessment

The intro and the `sad` feedback have a human voice. The session as a whole does not: it shifts from three emotional word cards to three very short phrases without a social reason to say them, a changed setting, a transfer prompt, or an independent check. The good microcopy therefore sits inside an incomplete teaching shell. The remedy is substantive story and retrieval design, not longer prose or decorative filler.

## 6. Mode, feedback, locale, grammar, and repetition review

- **Intro:** concept → formula → trap is present, but it alone cannot establish the missing 17-step lesson.
- **Modes:** one use of every family exists, but a family name is not a mode-native lesson. The sparse deployment cannot realise the packet's progression.
- **Distractors / feedback:** the inspected `sad` choice and gap distractors are close, unique, and locally explained. Preserve this quality when authoring the ten missing interactions.
- **Locales:** all eight inspected projections were non-empty; completeness after the needed expansion is unproven. The internal `[[NEEDS_TRANSLATION]]` English fallback must not reach an owner-visible selector.
- **Grammar / prerequisites:** only `I am` is acceptable in S2. The repair must retain that boundary while adding no question, negation, new subject, article, or contraction.
- **Repeats:** `learning_v2_no_repeated_primary_task_gate.ts` currently passes, but seven interactions can pass a no-repeat gate while ten required tasks do not exist. It is not evidence of packet completeness.

## 7. Required repair order

1. Mark S2 non-accepted for authoring/review purposes; do not infer prerequisite completion from its existing lock.
2. Implement all exact slots 4–20 with independent, changed-context work; preserve `I + am` only.
3. Complete word-first cycles for all three new emotional states before phrase use.
4. Replace the three-pair/mislabelled Speed Match with one exact four-pair board and an honest prompt.
5. Preserve the strong phonetic distractor feedback, then author and audit all missing feedback in eight locales.
6. Repair the registry guard contract and add an exact packet-to-learner-projection count/fidelity regression.
7. Rebuild the owner mock, attach device/browser state receipts, then obtain a fresh independent review.

## 8. Mandatory retest

```powershell
npx tsx tests/learning_v2_lesson1_session_02_word_first_gate.ts
npx tsx tests/learning_v2_lesson1_authoring_registry_gate.ts
npx tsx tests/learning_v2_no_repeated_primary_task_gate.ts
npm run learning-v2:mode-native-authoring-gate -- --target=en --session=2
npm run learning-v2:owner-review-ready-gate
```

Also inspect source → shard → learner projection for all eight locales, assert 17 projected interactions against the exact packet, and attach real owner-preview/device proof for each stateful mode.

## 9. Final verdict

**BLOCK.** L1 S2 remains an incomplete seven-task legacy package, not the exact Full B1 S2 lesson. The independent inventory continues with L1 S3; it does not wait for the author repair, and it does not accept later locks.

## Находки и предложения

Add a packet-fidelity guard that compares the exact activity-plan count, required retrieval senses, canonical examples, and Speed Match board shape with the built learner child. It would have caught both the missing ten activities and the misleading eight-word prompt before `LOCKED` was written.
