# Independent strict learner review — English L1 / S1

> **AMENDMENT — 2026-09-03, fresh repaired-source re-review.** The original
> review above is historical evidence for the pre-repair fingerprint
> `8c869e2d…b3c9` only. Its claim that S1 should contain `I am happy.` is
> withdrawn: the owner-confirmed current S1 lexical scope is only
> `here/ready/fine`; `I am happy.` belongs to S2. Its prescription to restore a
> historical 17-path mechanically is also withdrawn. The current no-repeat
> contract, not the old count alone, governs the repair. The authoritative
> current re-review is appended below.

**Date:** 2026-09-03 (Europe/Dublin)  
**Verdict:** **BLOCK**  
**Reviewer scope:** read-only review. No learner-facing source, registry, or gate was changed.

## 1. Identity, fingerprint, and evidence actually reviewed

| Item | Evidence |
|---|---|
| Exact packet | `lesson-01:session:01`, grammar operation `en.grammar.present_be_affirmative.i_am`; exact packet still declares `learnerFacingAuthoringStatus: PLANNED_NOT_AUTHORED`. |
| Current learner source fingerprint | `8c869e2d02f980351edb1bcfbc6755c580497c51b03e4753916c12254494b3c9` |
| Registry state | `LOCKED`, with the same fingerprint. This is audited state, not acceptance evidence. |
| Reviewed pipeline | source → shard → `buildLearningV2AuthoringDevicePreviewV1(1, locale)` → rebuilt static owner-review HTML. |
| Locales projected | `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`: every one produced 3 intro pages, 7 practice interactions, 2 single-choice tasks, and 6 non-empty wrong-option feedback entries. |
| Owner mock | `npm run learning-v2:owner-review-ready-gate` rebuilt `.codex-tmp/learning-v2-owner-review/index.html` and listed `L1:S1`. The local browser policy blocked opening that file, so no unsupported claim is made about pixels, hit targets, motion, or audio playback in the browser. That missing direct UI receipt is itself open BLOCK evidence. |

## 2. Learner journey actually projected

1. Three intro pages teach `I` as the speaker, `am` as a link, then the word order `I am here`.
2. Practice has only seven interactions: hear/select `here`; listen/build `ready`; select the spelling of `fine`; one three-pair Speed Match; build `I am here`; fill the gap in `I am fine`; repeat and compare `I am ready`.
3. The three direct word tasks have diagnostic alternatives, and the two single-choice tasks provide feedback for each wrong visible option.

## 3. What is good and worth preserving

- The three RU intros form a recognisable concept → formula → trap sequence. For example, `I — слово с воображаемым микрофоном` gives a concrete speaking perspective instead of a metalanguage lecture.
- All eight required locale projections are present for the inspected intro text. Their first pages are genuinely locale-native rather than Russian text copied into another locale field.
- The source-to-projection path materialises all six allowed families, and the focused mode-native gate and word-first choreography gate currently pass.
- The inspected single-choice tasks retain six wrong-answer feedback entries per required locale; none was blank in the projected data.

These positives cannot compensate for the following blocking failures.

## 4. Blocking findings

### P0 — The visible session is not the exact 17-practice packet

- **Screen / proof:** The exact packet contains activity slots 4–20: **17** mode-native activities, including `I am happy.`. The actual learner child contains only **7** interactions and never presents `I am happy`.
- **Visible examples:** projected flow ends after `I am ready`; the seven targets are `here`, `ready`, `fine`, the three-word board, `I am here`, `I am fine`, `I am ready`.
- **Requirement violated:** exact-packet fidelity; `СТАРТ В2` requires a full session with 3 intros and 17 practices for a new grammar operation, and forbids treating a short card collection as a complete lesson.
- **Pedagogical / UX harm:** a beginner gets one brief recognition action per new word and then an abrupt three-phrase mini-set. There is no gradual 17-step progression from supported work through changed-context retrieval to an independent check. The declared sentence `I am happy.` is never learned or assessed.
- **Required repair:** author a dedicated S1 learner package from the exact packet, materialising all slots 4–20 with unique primary targets and the prescribed support fade. Do not fill the deficit by duplicating the same phrase or a second Speed Match.

### P0 — Learner-facing quality gate says HOLD while the registry says LOCKED

- **Screen / proof:** `evaluateLearningV2SessionContentQuality(source)` returns `ok: false` with `quality_review_missing · qualityReview · Без независимых review-решений материал остаётся HOLD.` The registry nevertheless labels S1 `LOCKED`.
- **Requirement violated:** `DRAFT → AUTO_PASS → OWNER_APPROVED → LOCKED`; a missing independent review is a HOLD, not a clerical omission.
- **Pedagogical / UX harm:** a locked label can cause later material to inherit an unreviewed foundation and hides the absence of the required human-quality proof.
- **Required repair:** keep S1 out of acceptance until the rebuilt source passes the quality gate with a genuine independent review receipt. The author must not self-approve this report.

### P1 — The word-first sequence is incomplete in the learner projection

- **Screen / proof:** Before phrase practice, the projected flow has one direct task for `here`, one for `ready`, one for `fine`, then a three-pair board. It does not materialise the required standalone `recognize → retrieve_meaning → build_form` cycle for **each** new lexical target across distinct families before the word enters a phrase.
- **Requirement violated:** `СТАРТ В2`, section 5: each new word requires three standalone target-word contacts in three families; a full phrase cannot substitute for a missing stage.
- **Pedagogical / UX harm:** the session jumps from a single exposure to sentence work. Learners who can choose a form once do not yet have stable meaning recall or form retrieval.
- **Required repair:** give each of `here`, `ready`, and `fine` three separate, mode-native word tasks before its first phrase use; interleave targets by stage, not as three consecutive repetitions of one word.

### P1 — Speed Match is underfilled and cannot supply the promised retrieval board

- **Screen / proof:** its `pairGrid` is exactly `[here, ready, fine]` — three pairs.
- **Requirement violated:** the mode-native owner contract requires a real four-pair board of familiar, atomic items for the current sessions; the board is a pairing mechanic, not a three-item vocabulary list.
- **Pedagogical / UX harm:** three pairs make the action too shallow and reduce discrimination/retrieval pressure; it also fails the exact owner-approved interaction shape.
- **Required repair:** add one already grounded, packet-permitted atomic target; retain exactly four pairs, independently shuffled columns, and no unknown/filler word.

### P1 — Current focused gates contradict the claimed locked state

- **Proof:** `tests/learning_v2_lesson1_session_01_word_first_intro_gate.ts` fails on page 2: `intro page 2 ru: unexpected target-language item before word contacts`, with actual `{I, am, here}` versus expected `{I, am, here, ready}`. `tests/learning_v2_lesson1_authoring_registry_gate.ts` fails because every registry entry is now `LOCKED` while the guard expects the protected `DRAFT` range.
- **Requirement violated:** an authoring gate must reflect the current authoritative contract and be green before the session advances. A green unrelated mode-native gate cannot override a red focused gate.
- **Pedagogical / UX harm:** future sessions may be accepted on a contradictory contract; the test suite stops distinguishing a valid lock from a stale status flip.
- **Required repair:** after source repair, update the guards only to encode the current owner-approved rule, never to make the present output pass. Re-run both failing focused gates and record their fresh output.

### P1 — Evidence for 1:1 rendered UI/motion and audio is missing

- **Screen / proof:** the static owner artifact was rebuilt but the local browser policy rejected opening its `file:` URL. No device/browser receipt proves the required word-card states, independently shuffled Speed Match columns, unavailable-audio route, hold-to-talk lifecycle, error feedback, or reduced-motion final states.
- **Requirement violated:** the mode-native contract requires state-by-state interaction proof, screenshots, motion receipt, audio route, and owner mock with the same package as runtime.
- **Pedagogical / UX harm:** source data cannot prove a learner can play audio, hold the microphone, recover from a wrong answer, or complete the flow accessibly.
- **Required repair:** provide a reachable owner-preview URL or a device receipt for every listed state after the content is fixed; attach it to the independent review, not merely to the registry.

## 5. Fullness, human voice, and filler assessment

The three intros have a humane metaphor (the microphone and bridge), and the initial lexical choices are useful. But the whole session is not a live lesson: after the explanation it collapses into seven isolated cards. There is no connected social situation in which a learner uses `I am here`, `I am ready`, and `I am fine` for a reason; no gradual context change; and no independent transfer beyond a small three-pair board and one repeat prompt. The problem is not verbosity. It is missing instructional substance and missing steps.

## 6. Detailed required analyses

### Intro

The visible RU copies are intelligible, but the red intro gate means they are not presently compatible with the word-first boundary. The repair must keep the concept/formula/trap arc while bringing the target-word plan and test into one exact, prerequisite-safe contract.

### Modes

All six family names are present, which is positive. Their deployment is nevertheless too sparse for the exact packet: one `listen_choose`, one `listen_build_dictation`, two builders, one gap task, one Speed Match, one voice task. The required 17-slot support progression and unique target coverage are missing.

### Distractors and feedback

The inspected direct word tasks use plausible near traps such as `hear/hair` for `here` and `really/reading/already` for `ready`. The two single-choice tasks have three wrong options and specific feedback in every required locale. Re-audit all new tasks after expansion; these findings do not approve the uninspected 10 missing interactions.

### Locales

All eight required locales have the inspected 3 intro pages and the existing wrong-choice feedback; no blank feedback was found. Locale completeness of the required 17-task rewrite remains unproven until the new projection exists. The internal English placeholder `[[NEEDS_TRANSLATION]]` remains in shared maps and must not leak into any owner-visible locale selector.

### Grammar, prerequisites, packet, and repeats

The intended grammar is correctly bounded to `I + am + complement`; no later grammar is accepted by this review. The exact packet, however, specifies 17 activities, a changed-context independent probe, and canonical `I am happy.`; the source projection is a different seven-interaction package. The no-repeat gate passes only because the shortened package uses few targets. It cannot certify the absent required work.

## 7. Required repair order

1. Return S1 to a truthful non-accepted state; do not advance or accept later sessions on its current lock.
2. Build the dedicated 17-activity S1 source from the exact packet, preserving `I + am` only and adding no premature grammar.
3. Complete standalone word-first cycles for `here`, `ready`, and `fine`; add exactly one four-pair Speed Match with prior/allowed material.
4. Add the missing `I am happy.` and all other exact packet slots through novel contexts, not repeated targets or generic cards.
5. Reconcile the intro word-boundary test and registry guard with the rewritten source and current owner decisions; add a regression proving 17 projected interactions.
6. Rebuild owner preview and collect the actual browser/device state, audio, error, voice, and reduced-motion receipts.
7. Obtain a fresh independent review and only then consider `AUTO_PASS`/owner approval/`LOCKED`.

## 8. Mandatory rechecks after repair

```powershell
npx tsx tests/learning_v2_lesson1_session_01_word_first_choreography_gate.ts
npx tsx tests/learning_v2_lesson1_session_01_word_first_intro_gate.ts
npx tsx tests/learning_v2_lesson1_authoring_registry_gate.ts
npx tsx tests/learning_v2_no_repeated_primary_task_gate.ts
npm run learning-v2:mode-native-authoring-gate -- --target=en --session=1
npm run learning-v2:owner-review-ready-gate
```

Also run the source→shard→learner projection for each of the eight required locales and attach a real owner-preview/device receipt for all stateful modes. A green subset is not a substitute for the exact packet, the independent review receipt, or the visual/motion proof.

## 9. Final verdict

**BLOCK.** English Lesson 1 Session 1 must not be treated as accepted or as permission to trust subsequent locked sessions. The independent read-only audit nevertheless continues immediately through the already marked locked range; `BLOCK` stops acceptance, not inventory.

## Находки и предложения

The central defect is structural, not cosmetic: a legacy seven-interaction card sequence is labelled as a completed Full B1 session whose exact packet requires seventeen authored interactions. Add a narrow projection-count-and-packet-fidelity gate so a future registry lock cannot mask this class of short-package substitution.

---

# Fresh repaired-source re-review — English L1 / S1

**Current source fingerprint:** `6ef4d45db4eae6ea9af074f1130e837a5ce99014a1814d5cd5ea797dc2e2d0f0`  
**Registry:** `DRAFT`; `CURRENT: 1`; future range `2–56` sealed.  
**Verdict:** **BLOCK**

## What was actually re-reviewed

The source → shard → learner projection has 3 intros and 17 interactions. The
fresh focused choreography, intro, no-repeat, registry, curriculum-boundary,
device-preview, guardrail, and S1 preflight commands all pass. This is evidence
that the repair is structurally coherent, not independent approval.

The visible path is: three `I/am` intros; hear/build tasks for `I`, `am`,
`here`, `ready`; meaning/build tasks for those same items; one four-pair Speed
Match; then `I am ready`, `I am here`, a gap for `I am ready`, and voice
`I am here`. I inspected the eight-locale projection contract in the source
path; real browser/device UI, playback, hold-to-talk, error, and reduced-motion
states remain unobserved because the local `file:` owner mock cannot be opened
by the host browser policy.

## Good evidence to preserve

- The repaired intro now explicitly gives both `I am here` and `I am ready` in
  the formula page and the previous intro gate is green.
- The action sequence is no longer a seven-card shell: it exposes 17 distinct
  actions, and its word stages are differentiated as hear/meaning/build rather
  than repeated under a single generic task identity.
- A genuine four-pair board exists: `I`, `am`, `here`, `ready`.
- The focused preflight truthfully keeps S1 `DRAFT` and seals S2–S56.

## Blocking findings

### P0 — Current canonical word `fine` is absent from the repaired learner journey

- **Evidence:** owner-confirmed S1 scope is `here/ready/fine`. The 17 projected
  interactions contain `I`, `am`, `here`, and `ready`; no interaction target,
  option, or Speed Match pair is `fine`.
- **Requirement violated:** exact current lexical assignment and full word-first
  coverage of every current new sense.
- **Learner harm:** the session can appear complete by count while omitting one
  of its promised useful words; later retrieval may assume a word the learner
  never met.
- **Required repair:** introduce `fine` through its own prerequisite-safe
  hear/meaning/build actions and a natural phrase context; replace only
  non-essential current actions as needed to preserve the no-repeat contract.
  Do not add `I am happy.` and do not pad the session with copied tasks.

### P1 — The owner-review mock cannot currently present this DRAFT session

- **Evidence:** the static owner-review bundle intentionally filters to
  `LOCKED` rows, while repaired S1 is correctly `DRAFT`. No real owner mock
  therefore materialises this exact candidate for interaction review.
- **Requirement violated:** the owner mock must materialise the real current
  session before it can advance.
- **Required repair:** supply a draft-safe review path that renders precisely
  this candidate without changing learner progress or claiming a lock; then
  collect state, audio, voice, error, and reduced-motion receipts.

### P1 — Independent quality receipt remains absent

- **Evidence:** `evaluateLearningV2SessionContentQuality` remains
  `ok: false` solely on `quality_review_missing`.
- **Requirement violated:** independent review is required before any later
  acceptance state.
- **Required repair:** after `fine` and preview evidence are repaired, attach a
  fresh external reviewer receipt; the author must not self-approve it.

## Required retest

```powershell
npm run learning-v2:lesson1-authoring-preflight -- --session 1
npx tsx tests/learning_v2_lesson1_session_01_word_first_choreography_gate.ts
npx tsx tests/learning_v2_lesson1_session_01_word_first_intro_gate.ts
npx tsx tests/learning_v2_no_repeated_primary_task_gate.ts
npm run learning-v2:mode-native-authoring-gate -- --target=en --session=1
npm run learning-v2:owner-review-ready-gate
```

Additionally assert that every current lexical target (`here`, `ready`, `fine`)
is visibly present in the learner child and receives its complete distinct
word-first cycle across all eight locales.

## Final verdict

**BLOCK.** The repair resolves the historical short-package and status-gate
defects, but it cannot be approved while `fine` is missing, the DRAFT candidate
is not owner-reviewable as a real session, and independent quality evidence is
absent.

## Находки и предложения

Add a current-packet lexical-coverage assertion to the learner-child gate. It
must compare the owner-approved lexical assignment directly with visible
actions, not merely count interactions or check a fingerprint.
