# Independent strict learner review — English L1 / S3

**Date:** 2026-09-03 (Europe/Dublin)  
**Verdict:** **BLOCK**  
**Scope:** read-only. No learner-facing source, registry, or gate changed.

## 1. Identity and reviewed evidence

| Item | Evidence |
|---|---|
| Exact packet | `lesson-01:session:03`; review `I am`; new senses `busy/free/late`; retrieval `happy/sad/tired`; 17 activity slots; status `PLANNED_NOT_AUTHORED`. |
| Current source / registry fingerprint | `4d07a5636ba8e34f85be515f66c7b0e5f1df190b01186b2c6d8269a088811041`; registry says `LOCKED`. |
| Actual path | source → shard → learner child in `buildLearningV2AuthoringDevicePreviewV1(3, locale)` → rebuilt owner review. |
| Locale audit | Every required locale (`ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`) projects 3 intros, 7 tasks, and 6 non-empty wrong-option feedback entries. |
| Visual evidence limit | The local owner HTML could not be opened by the host browser policy. No 1:1 visual, gesture, audio, or motion claim is made. |

## 2. Actual learner journey

The three intros revisit `I am` through `I am here/ready/happy`. Practice then gives: say `busy`; listen/select `free`; say `late`; a four-pair retrieval Speed Match (`happy/sad/tired/ready`); build `I am late`; listen/build `I am busy`; choose `free` in `I am ___`.

## 3. What works well

- The previous emotional-state vocabulary becomes a genuine four-pair retrieval board; this is the first audited session whose Speed Match has the required four atomic pairs.
- The intros are grammatically within the `I am` review boundary and use already introduced state vocabulary.
- All eight required locale projections have the inspected feedback data, and the focused exact-packet and mode-native gates pass.

## 4. Blocking findings

### P0 — The projected lesson contains 7 tasks instead of the exact packet's 17

- **Evidence:** exact packet has slots 4–20; learner child ends at ordinal 10 with seven interactions.
- **Violated requirement:** exact-packet fidelity and the complete Full B1 lesson shape (3 intro + 17 practice, support fade, changed-context independent probe).
- **Learner harm:** the learner sees a short card strip rather than the required progression. Ten authored contexts, low-support retrieval, and independent evidence are absent.
- **Required repair:** create dedicated S3 content for every packet slot with unique targets and real support reduction. Do not pad by repeating target/family pairs or adding a second Speed Match.

### P1 — Every projected practice prompt is generic rather than mode-native

- **Visible evidence:** ordinals 4–9 show exactly `Выполните задание.`; ordinal 10 only adds a gap sentence after the same generic prefix.
- **Violated requirement:** the learner UI prompt must name the real action (listen, choose, build, say) and change with the mode; generic activity wording is explicitly forbidden.
- **Learner harm:** a beginner cannot predict what to do before interacting, especially in audio and voice modes; this turns distinct mechanics into a template carousel.
- **Required repair:** author an action-specific, locale-native instruction for each interaction and visually separate it from the target phrase/word.

### P1 — New vocabulary never receives the required three standalone word contacts before phrases

- **Evidence:** `busy` and `late` start as voice actions, `free` as one listening choice, then phrases begin. There is no separately materialised recognize → retrieve meaning → build form cycle for each target.
- **Violated requirement:** word-first contract: every new target has three target-word contacts in distinct families before first phrase use.
- **Learner harm:** voice production is requested before a learner has reliably recognised, understood, and built every new word.
- **Required repair:** interleave all three word stages for `busy/free/late`; enter each word into phrase work only after its own cycle.

### P1 — Quality status and locked label conflict

- **Evidence:** quality evaluator returns `quality_review_missing` / `Без независимых review-решений материал остаётся HOLD`, yet the registry is `LOCKED`.
- **Violated requirement:** independent review is mandatory before `LOCKED`.
- **Required repair:** treat current lock as unaccepted; attach a new independent receipt only after the rebuilt session passes all content and UI evidence gates.

### P1 — No observed owner-preview UI/motion/audio state receipt

- **Evidence:** source projection and static artifact exist, but the local browser policy rejected the local mock URL.
- **Violated requirement:** exact mode UI/motion parity needs state-by-state proof, including unavailable audio, voice hold lifecycle, wrong state, success, and reduced motion.
- **Required repair:** provide a reviewable URL/device receipt for all modes after content repair.

## 5. Fullness, modes, feedback, locales, grammar, packet fidelity, and repeats

The S3 Speed Match and prerequisite-safe intro are useful pieces. They do not make a living lesson: there is no connected situation for being busy, free, or late; the seven cards lack natural transitions and independent transfer. The six modes appear by name, but the generic prompt erases their native action. Existing choice feedback and the eight locale projections are non-empty; all ten missing interactions and their feedback remain unreviewed. The grammar boundary must remain `I am` only. The no-repeat gate passing for the abbreviated sequence proves neither packet completeness nor human quality.

## 6. Required repair order

1. Treat S3 as non-accepted and retain the audit record; do not use its lock as a prerequisite receipt.
2. Author all 17 exact packet slots under the `I am` review boundary.
3. Complete standalone word-first cycles for `busy/free/late`.
4. Replace every `Выполните задание.` with the real local action and target layer.
5. Preserve the valid four-pair retrieval board, but place it where the completed learning progression requires it.
6. Add projection-count/packet-fidelity regression, rebuild owner review, collect device/UI states, then obtain a fresh independent review.

## 7. Retest

```powershell
npx tsx tests/learning_v2_lesson1_session_03_word_first_gate.ts
npx tsx tests/learning_v2_no_repeated_primary_task_gate.ts
npm run learning-v2:mode-native-authoring-gate -- --target=en --session=3
npm run learning-v2:owner-review-ready-gate
```

Also assert 17 learner interactions against the exact packet, re-project all eight locales, and attach real owner-preview/device state receipts.

## 8. Final verdict

**BLOCK.** S3 is a seven-task generic-prompt package, not the exact Full B1 S3 session. The independent inventory continues to L1 S4 without accepting any later lock.

## Находки и предложения

Add a permanent gate that rejects generic prompt literals such as `Выполните задание.` in every mode-native learner projection. It should check the rendered locale text, not only source metadata.
