# German Learning V2 — Task 6B2 guardian receipt, 2026-10-11

**Guardian verdict:** `HOLD`.

This is an independent recenter/scope receipt for the bounded source-adjudication
task. It is not a native-German review, an exact-spec review, source acceptance,
canonical-row acceptance, learner-content approval, or release approval.

## Bound inputs

The following required Task 6B2 inputs were read and SHA-256-bound at review
time. A byte change to any item invalidates this receipt.

| Required input | SHA-256 |
| --- | --- |
| `docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md` | `82d29e357da2e5444aa377de33dd07f06fe12dbaa8f1e3c3de8285d297489ba5` |
| `docs/v2/curriculum/de/OWNER_DECISIONS.md` | `eff5412a13531052aa56c1e40f4058f35da405297b418ca8fcbb7b44bc19f615` |
| `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md` | `55c8cc16bdedcb1e8e3b61bfbd9fb82d61c74a21119f4adc3caa7efd99c76318` |
| `docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md` | `38a878346f1bb410cba6f11311563669b29e91ad63e5eda6f548f21c4c6ce10a` |
| `docs/v2/curriculum/de/TASK6B1_LEXICAL_REVIEW_RECEIPT_2026-10-08.md` | `183d82f9f83d5d79ab7078767cb468004b54a6b7fac656022c0daab642bd9bd0` |
| `docs/v2/curriculum/de/TASK_PACKET_6B2_AUFZUG_SOURCE_ADJUDICATION.md` | `895071432264e72ceba0b611da4f8e405be8f33b1b35eefde033c55659fc34bf` |
| `docs/v2/curriculum/de/TASK6B2_AUFZUG_SOURCE_ADJUDICATION_DRAFT_2026-10-11.md` | `f30f7bc32ac3f62606fb8deb54a7aaeebb4a5d8e3c432792faf45c42d6c660ef` |

The guardian also inspected the exact candidate and every live canonical
integration found by a target-scoped search:

| Inspected live artifact | SHA-256 | Why it matters |
| --- | --- | --- |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29` | contains Task 5 candidate `de_lex_plan_l01_c02_aufzug_v1` |
| `modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts` | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` | contains a live Aufzug item-evidence record |
| `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json` | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` | contains a live canonical Aufzug lexical row |
| `tests/learning_v2_de_lexical_registry_gate.ts` | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` | asserts the Aufzug row, evidence and planned packet contacts |

## Checked facts

1. Stage 0 permits a native German grammar-first blueprint and research
   admission, but keeps learner-facing authoring on `HOLD` pending the complete
   owner-approved blueprint. It requires target-scoped gates and forbids an
   English fallback.
2. The owner decisions require Standarddeutsch with a Germany production
   baseline, RU+UK as independent learner locales, and a fresh German recenter
   before and after every authored session. They do not authorize this candidate
   as a canonical lexical row.
3. The dossier and ledger require a noun package to retain article/Genus and
   plural; the ledger explicitly treats the Germany baseline as a separate
   curriculum decision rather than a dictionary conclusion.
4. Task 6B1 expressly left Task 6 partial and named Task 6B2 only as a
   **source-adjudication candidate**. Its next-safe-step language does not
   authorize a canonical row, packet, session, release, mockup, or audio.
5. The Task 6B2 packet permits only a source-adjudication receipt. It requires
   fresh guardian input binding, independent native-German and exact-spec
   reviews, and a deterministic scope check. Its only success verdict is
   `SOURCE_ADJUDICATED`; it expressly prohibits creating, editing, accepting or
   promoting a canonical lexical row.
6. The current draft itself is correctly labelled `HOLD` and records its
   source claims as awaiting review. It also says that its HTTP observation and
   Duden cross-check do not establish productive policy, regional status,
   packet contact, learner wording, release, or approval.
7. Contrary to the Task 6B2 non-goal, live working-tree bytes already contain
   `de_lex_l01_c02_aufzug_v1` as a canonical lexical-sense row with
   `productionPolicy: "productive"`; a corresponding evidence record; and a
   gate fixture that asserts both planned packet contacts `de_l01_c02_s15` and
   `de_l01_c02_s16`. These are canonical integrations, not merely the Task 5
   candidate or this source-adjudication draft.
8. The repository is globally dirty. Within the German target scope, the
   Aufzug evidence module, lexical registry and gate are untracked; the base
   contract and an earlier linguistic receipt are modified. There is no
   provided before/after baseline, clean worktree, immutable runner ledger, or
   deterministic Task 6B2-only scope proof from which this guardian can prove
   that no forbidden integration occurred.

## Fact versus inference

| Statement | Classification | Basis |
| --- | --- | --- |
| The draft reports DWDS HTTP 200, 106091 bytes and a response hash on 2026-10-11. | Recorded observation, not independently accepted fact | The bound draft; this guardian did not substitute for the required native source review. |
| `Aufzug` / `der` / `Aufzüge` and the cited DWDS sense are source-supported. | Unadjudicated candidate claim | The draft and live evidence record state it; the required fresh native-German review is absent. |
| “lift in a building” is the correct curriculum gloss. | Curriculum inference, unaccepted | It narrows a polysemous lexical item and needs the independent review required by the packet. |
| `productive`, Germany-baseline use, Task 7 contact and planned scored use are justified by the dictionary source. | Not established | Both the task packet and draft explicitly prohibit this inference. |
| Existing canonical integration predates Task 6B2 authorization. | Blocking operational inference | The live row/evidence/gate exist while the only Task 6B2 draft remains `HOLD`; no prior Task 6B2 authorization or accepted review receipt was provided. |

## Requirement-by-requirement gate

| Applicable requirement | Result | Evidence / reason |
| --- | --- | --- |
| Bind the exact Stage 0, owner, research, ledger, B1, Task 6B2 packet and current draft inputs | `PASS` | SHA-256 table above. |
| Keep the candidate limited to lemma, building-lift sense, noun category, article and plural | `HOLD` | The live canonical row/evidence and gate additionally bind productive policy and packet contacts. |
| Preserve `NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY` | `HOLD` | The draft preserves it, but live integration already assigns production policy and planned contacts before Task 6B2 source acceptance. |
| Fresh independent native-German source-fidelity review | `HOLD` | No Task 6B2 native review receipt was present. |
| Fresh independent exact-spec review | `HOLD` | No Task 6B2 exact-spec review receipt was present. |
| Deterministic clean scope proof: no canonical promotion or learner-facing mutation | `HOLD` | Target scope is not clean and no trusted before/after scope baseline was supplied. |
| No RU/UK learner text, exercises, audio, mockup, release, runtime or English artifact changed by this task | `HOLD` | Absence cannot be proven from the available dirty worktree and missing baseline; this guardian makes no contrary claim. |
| No canonical lexical row may be created, edited, accepted or promoted by Task 6B2 | `HOLD` | A canonical Aufzug row and supporting integration are already live before authorization. |

## Verdict and exact permitted next action

`HOLD` is mandatory. `SOURCE_ADJUDICATED`, `PASS`, canonical-row acceptance,
authoring, registry promotion, packet materialization, mockup/release work and
any English-contour action are prohibited.

The only permitted next action is a **new bounded, read-only containment audit**
of the already-present Aufzug canonical integration: freeze all four hashes above,
establish a deterministic clean scope baseline, and obtain fresh independent
native-German and exact-spec reviews that classify the premature integration.
That audit must not edit or accept the row. Only after its result and an
owner-authorized remediation task may any source-adjudication task be restarted
from a clean, hash-bound state.

## Non-actions

This guardian did not edit canonical rows, source modules, tests, learner
content, RU/UK text, mockups, English artifacts, APIs, releases or deployment.
It created only this independent receipt.
