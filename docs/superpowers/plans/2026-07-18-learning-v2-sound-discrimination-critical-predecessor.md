# Learning V2 Sound Discrimination Critical Predecessor Plan

> **Execution rule:** use `executing-plans` and strict TDD. One critical writer owns every source/test mutation. Fresh reviewers are read-only and never repair source. This plan must be GREEN before any task in `2026-07-18-learning-v2-sound-discrimination-vertical-slice.md` starts.

**Goal:** Freeze and prove the critical contracts needed before the first replaceable `sound-discrimination` implementation: genuine reference artifacts, per-mode implementation readiness without weakening the all-five release gate, one owner-approved mode/kernel crosswalk, kernel-only policy authorization, one canonical preview-state corpus, an owned React-free UI port with complete audio commands, and a real hash-checked/no-progress PreviewEnvelope seam.

**Current evidence:** the aggregate Reference Evidence Pack is RED with 15 mode-local blockers. The current gate reports per-mode results but accepts arbitrary bytes at raw-capture and `.png` paths. `activity_registry.ts` currently permits `rendererKey` as a policy compatibility fallback. `PreviewState` is duplicated locally and `PreviewConditions` is not implemented in the shared corpus. No `modules/learning-v2/preview/preview_envelope.ts`, Functions preview implementation, preview tests, or preview route exists. Spec 08 names the immutable PreviewEnvelope record pin `object`; Content Studio Task 9 names it `bodyObject`. The approved replaceable-frontend design places the port under `modules/learning-v2/runtime/`, while the downstream sound plan places it under `modules/learning-v2/ui-port/`.

**Outcome boundary:** completing this predecessor authorizes only the already approved next packet. It does not approve a contact sheet, invent activity keys, implement a renderer/controller/route, write progress, export a callable, deploy, release, modify Rules/indexes, acquire reference captures, or remove legacy behavior.

---

## 1. Authority and settled invariants

Read completely before execution:

- `AGENTS.md`
- `docs/v2/HANDOVER.md`
- `docs/v2/README.md`
- `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md`
- `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md`
- `docs/superpowers/specs/2026-07-18-learning-v2-replaceable-frontend-design.md`
- `docs/superpowers/plans/2026-07-18-learning-v2-sound-discrimination-vertical-slice.md`
- `docs/v2/04-activity-catalog-and-storyboards.md`
- `docs/v2/08-admin-content-studio-and-mode-authoring.md`, especially §§6.1 and 13
- `modules/learning-v2/contracts/activity.ts`
- `modules/learning-v2/contracts/content_studio.ts`
- `modules/learning-v2/contracts/validation.ts`
- `modules/learning-v2/runtime/activity_registry.ts`
- `modules/learning-v2/runtime/activity_runtime.ts`
- `modules/learning-v2/reference-evidence/reference_evidence_gate.ts`
- `tests/learning_v2_activity_registry.test.ts`
- `tests/learning_v2_reference_evidence_contract.test.ts`

The following are settled and are not owner questions:

1. `modeResults[modeId].ready` is the implementation-readiness result for that exact mode and its not-yet-approved shared-shell dependency.
2. Aggregate `ReferenceEvidenceGateResult.ready` remains the all-five release/readiness result. A single ready mode never makes the aggregate ready.
3. The strict environment gate remains aggregate. No release, season seal, chapter gate, or “Phase 03 complete” claim may consume per-mode readiness.
4. `rendererKey` selects presentation only. It never authorizes scoring, evidence, progress, reward, or recovery policy compatibility.
5. Policy compatibility is keyed by the code-owned executable kernel identity represented by `activityTypeKey`, plus the separately checked family/version/schema fields. A renderer alias is not a kernel alias.
6. Exactly six preview states exist: `prompt`, `active`, `processing`, `success`, `needs_work`, `recovery`. Connectivity, microphone, signal, scorer outcome, motion, text scale, and color scheme are orthogonal `PreviewConditions`.
7. `sound-discrimination` is listening/selection work in this slice. It creates no acoustic/phoneme/pronunciation, spoken mastery, or voice-specific performance claim.
8. Preview is no-progress: all progress, performance/access stars, learning evidence/non-assessment, shards, rewards, analytics, provider/network dispatch, and durable storage writers are absent or hard-disabled.
9. Frontend handoff folders and manifests are keyed by the owner-approved `activityTypeKey`, not `modeId`, family, or `rendererKey`.
10. Tests remain read-only guards. Temporary decoded/generated PNG fixtures live only under the test temp directory.

---

## 2. Mechanical defects versus owner decisions

### Mechanical defects to fix test-first

| ID | Verified defect | Required repair |
|---|---|---|
| M1 | A file containing text such as `sound-discrimination-sheet` passes the current contact-sheet existence/hash checks. | Decode the artifact as PNG, verify exact decoded metadata, and bind six non-overlapping frame regions to the canonical states before approval can be current. |
| M2 | `PREVIEW_STATES` is duplicated in the evidence gate/test and `PreviewConditions` is missing from the shared corpus. | Export both from `modules/learning-v2/contracts/content_studio.ts`; all gate, preview, UI-port, and test code imports them. |
| M3 | Current runtime policy compatibility accepts `rendererKey` when `activityTypeKey` is absent from `compatibleKernelKeys`. | Remove renderer fallback; add an adversarial test proving renderer-only compatibility fails closed. |
| M4 | Per-mode readiness and aggregate readiness exist, but no named consumer boundary prevents release code from using per-mode readiness. | Add explicit implementation and aggregate assertion functions/types; tests prove their consumers cannot be interchanged. |
| M5 | The owner-approved frontend design shows a bare `audio.play` command, which cannot identify the clip/rate and has no settings or offline retry route. | Freeze an explicit typed audio command surface in the UI port; UI supplies intent only and cannot choose unsupported rates or durable outcomes. |
| M6 | No PreviewEnvelope implementation or focused no-progress seam exists. | Implement the pure Body/Record/Response parser/hash boundary and a no-progress runtime factory before route work. |
| M7 | The sound plan names a new `ui-port` namespace while the collision-prone runtime files are already untracked user work. | Obtain a written ownership receipt and exact pre/post hashes; stop on any drift. |
| M8 | Raw captures are hash-checked but their declared format/MIME, decodability, state coverage, source kind, and structured provenance are not validated. | Bind every raw capture to a strict artifact/source schema, decode its declared format, and fail closed on MIME/magic-byte/source/state mismatch. |

### Owner decisions — never infer or combine silently

1. **DEC-SD-PRE-001: canonical five-row mode crosswalk.** The owner must approve exact final values for each selected `modeId → activityTypeKey → family → rendererKey → kernelVersion → rendererSchemaVersion → payloadSchemaKey → payloadSchemaVersion`. Existing literals and bindings must be shown first with exact evidence. Missing bindings must be marked `MISSING`; a newly proposed value must be marked `NEW_PROPOSAL`, justified from cited naming patterns, and remain non-canonical until explicit owner approval. Do not present a value derived from an English label or example as an existing fact. In particular, do not assume the existing `listen.choose.v1` fixture is the final `sound-discrimination` kernel.
2. **DEC-SD-PRE-002: PreviewEnvelope record object-pin field.** Spec 08 uses `object`; Content Studio Task 9 uses `bodyObject`. A fresh advisor presents the compatibility consequences and recommends one canonical field. The owner chooses one. The rejected name is not accepted as an alias unless the owner separately authorizes a versioned migration contract.
3. **DEC-SD-PRE-003: React-free port namespace.** The approved frontend design names `modules/learning-v2/runtime/activity_ui_port_types.ts`; the downstream sound plan names `modules/learning-v2/ui-port/activity_ui_port_types.ts`. The owner chooses exactly one canonical namespace and assigns its writer. The rejected namespace is not created as an adapter, re-export, or duplicate.

Ask exactly one owner question at a time. The first question can be DEC-SD-PRE-001 only after the complete provenance-classified advisor artifact and PASS receipt exist; the crosswalk controls the reference gate, registry, port descriptor, handoff namespace, and sound implementation packet. The owner may approve explicitly marked `NEW_PROPOSAL` cells as new canonical values, but silence or approval of a different row never does so. Ask DEC-SD-PRE-003 second, then DEC-SD-PRE-002. Persist each answer immediately and update every affected normative source before asking the next question. No source or test file may change until all three immutable decisions, the aggregate durable record, canonical/file hashes, and normative closure are frozen.

---

## 3. Exact scope and prohibited scope

### Planned source/test ownership

| Responsibility | Exact planned files |
|---|---|
| Pre-GRILL advisor evidence | Create `docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet.v1.md` and immutable `docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet-receipt.v1.json` before asking DEC-SD-PRE-001 |
| Sequential durable owner authority | Create immutable `docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-001.v1.json`, `docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-003.v1.json`, and `docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-002.v1.json` immediately after the corresponding answer; then create aggregate `docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-decisions.v1.json`; create `tests/learning_v2_sound_predecessor_owner_decisions.test.ts` only after normative closure |
| Pre-code normative closure | Amend `docs/v2/HANDOVER.md`, this plan, and `docs/superpowers/plans/2026-07-18-learning-v2-sound-discrimination-vertical-slice.md` after the applicable decisions; amend `docs/superpowers/specs/2026-07-18-learning-v2-replaceable-frontend-design.md` after DEC-SD-PRE-003; amend `docs/v2/08-admin-content-studio-and-mode-authoring.md` and `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md` after DEC-SD-PRE-002 |
| Canonical preview corpus | Modify `modules/learning-v2/contracts/content_studio.ts`; create `tests/learning_v2_content_studio_preview_corpus.test.ts` |
| Canonical mode crosswalk | Create `modules/learning-v2/contracts/activity_mode_crosswalk.ts`; create `tests/learning_v2_activity_mode_crosswalk.test.ts` |
| Evidence artifact/readiness gate | Modify `modules/learning-v2/reference-evidence/reference_evidence_gate.ts`; modify `tests/learning_v2_reference_evidence_contract.test.ts` |
| Kernel-only policy compatibility | Modify `modules/learning-v2/runtime/activity_registry.ts`; modify `tests/learning_v2_activity_registry.test.ts` |
| Frozen React-free port | Create exactly one owner-selected file: `modules/learning-v2/runtime/activity_ui_port_types.ts` **or** `modules/learning-v2/ui-port/activity_ui_port_types.ts`; create `tests/learning_v2_ui_port_contract.test.ts`; create `tests/learning_v2_ui_port_import_boundary.test.ts` |
| PreviewEnvelope pure seam | Create `modules/learning-v2/preview/preview_envelope.ts`; create `modules/learning-v2/preview/preview_runtime.ts`; create `tests/learning_v2_preview_envelope.test.ts`; create `tests/learning_v2_preview_no_progress.test.ts` |
| Functions conformance only | Create `functions/src/content_studio/preview.ts`; create `functions/src/content_studio/preview.test.ts` |
| Reproducible receipts | Create `docs/v2/evidence/phase-03/2026-07-18-sound-discrimination-critical-predecessor-receipt.v1.json`; update `docs/v2/HANDOVER.md` after every answered decision and again at final handoff |
| Downstream alignment | Before Task 1, amend `docs/superpowers/plans/2026-07-18-learning-v2-sound-discrimination-vertical-slice.md` with the DEC-SD-PRE-001 receipt/crosswalk references, every `docs/v2/frontend-handoff/modes/<owner-approved-activityTypeKey>/` path, and the exact DEC-SD-PRE-003 port namespace |

### Explicitly prohibited

- No renderer, shell, presenter, sound controller, route, native-intent, Admin page, Kimi handoff packet, evidence capture, contact-sheet art, owner approval mutation, or release loader work.
- No edit to `modules/learning-v2/runtime/activity_runtime.ts` in this predecessor. It is hash-receipted only; renderer decoupling remains Sound Plan Task 2 after a fresh runtime ownership packet.
- No edit to `functions/src/index.ts`, `functions/src/admin_content_studio.ts`, `app/+native-intent.tsx`, `app/learning-v2-preview.tsx`, Firestore/Storage Rules, indexes, Firebase config, permissions, auth, stars/access, evidence, progress, voice, migration, release, or rollback code.
- No callable export, emulator write outside temp/emulator state, production write, API spend, commit, push, deploy, publish, or release without separate authorization.
- No snapshot/fixture update command and no generated file under app/source/test directories.

### Frozen command outcomes and issue codes

Freeze these outcomes and exact codes before writing the first RED test. Do not rename a code or relax an assertion merely to obtain GREEN:

| Boundary | Frozen failure/issue codes and command outcome |
|---|---|
| Advisor artifact | `sound_predecessor_advisor_packet_invalid`, `sound_predecessor_advisor_packet_hash_mismatch`, `sound_predecessor_advisor_cell_unclassified`, `sound_predecessor_advisor_existing_literal_uncited`, `sound_predecessor_advisor_binding_unmarked`, `sound_predecessor_advisor_new_proposal_incomplete`, `sound_predecessor_advisor_proposal_not_approved` |
| Durable decisions | `sound_predecessor_decision_record_invalid`, `sound_predecessor_decision_hash_command_failed`, `sound_predecessor_decision_hash_mismatch`, `sound_predecessor_decision_receipt_path_mismatch`, `sound_predecessor_decision_receipt_content_hash_mismatch`, `sound_predecessor_decision_receipt_file_hash_mismatch`, `sound_predecessor_port_decision_invalid`, `activity_mode_crosswalk_decision_mismatch`; the decision test exits 1 until all three approved decisions and canonical/file/receipt hashes agree |
| Raw capture | `capture_artifact_format_unsupported`, `capture_artifact_mime_mismatch`, `capture_artifact_decode_failed`, `capture_artifact_hash_mismatch`, `capture_source_provenance_invalid`, `capture_state_coverage_invalid` |
| Contact sheet/approval | Preserve `contact_sheet_missing`, `current_owner_approval_missing`, `approval_record_incomplete`, and `approval_stale_hash`; add exactly `contact_sheet_invalid_png`, `contact_sheet_metadata_mismatch`, and `contact_sheet_frame_map_invalid` |
| Registry policy | `v2_activity_policy_incompatible`; `rendererKey` never satisfies an `activityTypeKey` allowlist |
| UI port | `v2_ui_port_command_invalid`, `v2_ui_port_audio_clip_unsupported`, `v2_ui_port_audio_rate_unsupported`, `v2_ui_port_fallback_unsupported` |
| PreviewEnvelope | `preview_envelope_schema_invalid`, `preview_envelope_hash_mismatch`, `preview_envelope_record_object_pin_mismatch`, `preview_envelope_crosswalk_mismatch`, `preview_runtime_writer_forbidden` |

The strict real-pack evidence command is expected to exit 1 with the exact current 15 blockers at baseline and may continue to exit 1 after source GREEN while lawful evidence is absent. That is an honest product-data RED, not a failed implementation gate. Each missing-contract RED suite must exit 1 for its frozen code or a module-not-found assertion; each focused GREEN suite must exit 0 with its exact suite/test counts recorded. No aggregate release command may be reported GREEN until all five `modeResults` are ready.

---

## 4. Task 0 — Freeze ownership, hashes, and baseline RED

**Writer:** one critical writer.
**Files modified before all decisions:** the advisor packet only. After each answer, create its immutable decision receipt and amend every affected normative source before asking the next question. No TypeScript source/test file may change until all three decisions, the aggregate record, canonical hashes, and normative closure pass review.

### Step 0.1 — Record repository state

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>$null
git worktree list --porcelain
Get-FileHash -Algorithm SHA256 modules/learning-v2/runtime/activity_registry.ts,modules/learning-v2/runtime/activity_runtime.ts,modules/learning-v2/reference-evidence/reference_evidence_gate.ts,tests/learning_v2_reference_evidence_contract.test.ts
Get-FileHash -Algorithm SHA256 modules/learning-v2/contracts/content_studio.ts
Test-Path modules/learning-v2/runtime/activity_ui_port_types.ts
Test-Path modules/learning-v2/ui-port
Test-Path modules/learning-v2/preview
Test-Path functions/src/content_studio/preview.ts
Test-Path functions/src/content_studio/preview.test.ts
```

Planning-time hashes observed on 2026-07-18:

- `activity_registry.ts`: `C4C9B123F53B63DBCB3FD93B1C68DC2B9306128FB648DAFC0164C4373908F721`
- `activity_runtime.ts`: `90460262A7CC707964E48C19B482457E2A63AAC85482B7C09A50B0584CD98FE6`
- `reference_evidence_gate.ts`: `2E370C0BD4B582B273064146AA51182E414E0FEED2D0052E4F9C348BF3C8B576`
- `learning_v2_reference_evidence_contract.test.ts`: `39CB29F3059A09B4ACEE0146A438650159C7B76048F429E17CAF6E55308758F0`
- untracked `content_studio.ts`: `BB5309AB7AE79843EF175B9F03C9F9DAB49E476323005E0AB4D1C08E6974C300`
- `modules/learning-v2/ui-port`: absent
- `modules/learning-v2/runtime/activity_ui_port_types.ts`: absent
- `modules/learning-v2/preview`: absent
- `functions/src/content_studio/preview.ts`: absent
- `functions/src/content_studio/preview.test.ts`: absent
- dirty/untracked `functions/src/content_studio/**` namespace planning-time manifest: 62 files, sorted relative-path plus lowercase-SHA-256 manifest hash `70bf94680f85fabfba45ee702d3020b0a046f43b47ba8acfd9d0cfbacd0ea22b`

These are comparison evidence, not authority to overwrite. Obtain explicit ownership for the untracked `content_studio.ts`, the exact two absent Functions preview paths inside the dirty namespace, the selected port path, the two preview paths, and `activity_registry.ts`. Do not claim ownership of the rest of either dirty namespace. If any hash/path/namespace-manifest state differs, stop and obtain a replacement receipt from its current owner.

### Step 0.2 — Reproduce the aggregate RED

```powershell
$env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL='1'
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
Remove-Item Env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL
```

Expected: strict aggregate test fails and reports the current 15 mode-local blockers, three for each exact selected mode. Record actual suite/test counts and blocker list. A different count is a stop, not a reason to edit expected values.

### Step 0.3 — Create and review the advisor packet before the first GRILL

Create exactly:

`docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet.v1.md`

A fresh read-only advisor must build a complete five-row candidate matrix before any owner question. For every selected mode, the packet must reproduce every candidate value for:

`modeId → activityTypeKey → family → rendererKey → kernelVersion → rendererSchemaVersion → payloadSchemaKey → payloadSchemaVersion`

The Markdown artifact must contain one fenced JSON block conforming exactly to this reviewable contract:

```ts
type CrosswalkColumn =
  | 'modeId'
  | 'activityTypeKey'
  | 'family'
  | 'rendererKey'
  | 'kernelVersion'
  | 'rendererSchemaVersion'
  | 'payloadSchemaKey'
  | 'payloadSchemaVersion';

interface ExactSourceEvidence {
  readonly path: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly supports: 'literal' | 'mode_binding' | 'naming_pattern' | 'version_pattern';
  readonly excerptSummary: string;
}

type ValueProvenance =
  | {
      readonly status: 'EXISTING_LITERAL';
      readonly evidence: readonly [ExactSourceEvidence, ...ExactSourceEvidence[]];
    }
  | {
      readonly status: 'NEW_PROPOSAL';
      readonly namingPatternEvidence: readonly [ExactSourceEvidence, ...ExactSourceEvidence[]];
      readonly rationale: string;
      readonly compatibilityWork: readonly [string, ...string[]];
      readonly alternatives: readonly [string, ...string[]];
      readonly ownerApprovalRequired: true;
    };

type BindingProvenance =
  | {
      readonly status: 'EXISTING_BINDING';
      readonly evidence: readonly [ExactSourceEvidence, ...ExactSourceEvidence[]];
    }
  | {
      readonly status: 'MISSING';
      readonly searchedPaths: readonly [string, ...string[]];
      readonly searchQuery: string;
      readonly finding: string;
    };

interface AdvisorMatrixCell {
  readonly cellId: string;
  readonly modeId: string;
  readonly column: CrosswalkColumn;
  readonly recommendedValue: string | number;
  readonly valueProvenance: ValueProvenance;
  readonly bindingProvenance: BindingProvenance;
}

interface SoundPredecessorAdvisorArtifact {
  readonly schemaVersion: 'learning-v2-sound-predecessor-advisor-artifact.v1';
  readonly decisionId: 'DEC-SD-PRE-001';
  readonly matrixCells: readonly AdvisorMatrixCell[];
  readonly candidateInventory: readonly {
    readonly modeId: string;
    readonly column: CrosswalkColumn;
    readonly candidateValue: string | number | null;
    readonly classification: 'EXISTING_LITERAL' | 'MISSING' | 'NEW_PROPOSAL';
    readonly evidenceOrSearch: readonly [string, ...string[]];
  }[];
  readonly conflictingCandidates: readonly {
    readonly cellId: string;
    readonly alternatives: readonly [string, ...string[]];
    readonly resolutionRationale: string;
  }[];
  readonly keyUniquenessRecommendation: {
    readonly value: boolean;
    readonly evidence: readonly [string, ...string[]];
    readonly rationale: string;
    readonly ownerApprovalRequired: true;
  };
  readonly concreteRecommendation: {
    readonly orderedCellIds: readonly string[];
    readonly ownerQuestion: string;
  };
}
```

There must be exactly 40 unique `matrixCells`: five exact selected modes times eight exact columns, with no missing or duplicate `(modeId, column)` pair. Every existing literal must carry exact path-and-line evidence. Every absent mode-to-value binding must use `bindingProvenance.status: 'MISSING'` with a bounded search receipt; an existing literal elsewhere is not evidence of this mode binding. Every newly coined key or version must use `valueProvenance.status: 'NEW_PROPOSAL'` with naming/version-pattern evidence, rationale, compatibility work, alternatives, and `ownerApprovalRequired: true`. A `NEW_PROPOSAL` is an honest proposal, not an existing repository fact or canonical value. The candidate inventory must include all located existing candidates, all observed missing bindings, and every new proposal used in the recommendation.

The packet must identify conflicts, explain the uniqueness recommendation, and provide one concrete complete five-row recommendation. It may recommend `NEW_PROPOSAL` values when their full provenance packet is present. Any unclassified cell, uncited existing literal, unmarked missing binding, unmarked invented value, or unsupported proposal blocks GRILL.

Hash the completed advisor packet and obtain a fresh read-only review confirming the exact 40-cell coverage and provenance classifications. Only then ask DEC-SD-PRE-001 by reproducing the recommendation verbatim while visibly retaining every `NEW_PROPOSAL` marker and approval consequence. Do not paraphrase, hide proposal status, or ask the owner to fill unidentified blanks.

Persist the review before GRILL in:

`docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet-receipt.v1.json`

Exact receipt schema:

```ts
interface SoundPredecessorAdvisorPacketReceipt {
  readonly schemaVersion: 'learning-v2-sound-predecessor-advisor-packet-receipt.v1';
  readonly packetPath: 'docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet.v1.md';
  readonly packetFileSha256: string;
  readonly reviewedBy: string;
  readonly reviewedAt: string;
  readonly verdict: 'PASS';
  readonly matrixCellCount: 40;
  readonly allFortyCellsClassifiedAndCited: true;
  readonly existingLiteralCount: number;
  readonly existingBindingCount: number;
  readonly missingBindingCount: number;
  readonly newProposalCount: number;
  readonly allExistingLiteralsHaveExactPathLines: true;
  readonly allMissingBindingsHaveBoundedSearchEvidence: true;
  readonly allNewProposalsHavePatternEvidenceRationaleCompatibilityAndAlternatives: true;
  readonly allNewProposalsRequireOwnerApproval: true;
  readonly noUnmarkedInventedValue: true;
  readonly concreteRecommendationPresent: true;
  readonly unresolvedCellCount: 0;
}
```

`packetFileSha256` is 64 lowercase hex. The counts must be recomputed from the artifact and agree with its per-cell statuses: `existingLiteralCount + newProposalCount === 40` and `existingBindingCount + missingBindingCount === 40`. The reviewer must parse the fenced JSON, not infer compliance from prose. A missing field, non-PASS verdict, changed packet hash, count mismatch, or unresolved/unclassified cell blocks the first GRILL. The receipt does not approve any value.

### Step 0.4 — Persist each answer and close its normative references before continuing

Use three immutable single-decision files:

- `docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-001.v1.json`
- `docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-003.v1.json`
- `docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-002.v1.json`

Each file has this hash-free Body/Record shape:

```ts
interface SoundPredecessorSingleDecisionBody {
  readonly schemaVersion: 'learning-v2-sound-predecessor-single-decision-body.v1';
  readonly decisionSetId: 'sound-discrimination-critical-predecessor-2026-07-18';
  readonly decisionId: 'DEC-SD-PRE-001' | 'DEC-SD-PRE-002' | 'DEC-SD-PRE-003';
  readonly decidedBy: string;
  readonly decidedAt: string;
  readonly advisorPacket?: {
    readonly path: 'docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet.v1.md';
    readonly fileSha256: string;
    readonly receiptPath: 'docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet-receipt.v1.json';
    readonly receiptFileSha256: string;
  };
  readonly decision:
    | {
        readonly kind: 'canonical_mode_crosswalk';
        readonly modeCrosswalk: readonly ModeCrosswalkRow[];
        readonly keyUniquenessRequired: boolean;
        readonly approvedNewProposalCellIds: readonly string[];
        readonly notes: string;
      }
    | {
        readonly kind: 'preview_envelope_record_object_field';
        readonly previewEnvelopeRecordObjectField: 'object' | 'bodyObject';
        readonly rejectedFieldAcceptedAsAlias: false;
        readonly notes: string;
      }
    | {
        readonly kind: 'activity_ui_port_path';
        readonly activityUiPortPath:
          | 'modules/learning-v2/runtime/activity_ui_port_types.ts'
          | 'modules/learning-v2/ui-port/activity_ui_port_types.ts';
        readonly rejectedNamespaceCreated: false;
        readonly notes: string;
      };
}

interface SoundPredecessorSingleDecisionRecord {
  readonly schemaVersion: 'learning-v2-sound-predecessor-single-decision-record.v1';
  readonly decisionSetId: 'sound-discrimination-critical-predecessor-2026-07-18';
  readonly decisionId: SoundPredecessorSingleDecisionBody['decisionId'];
  readonly contentHash: string;
}
```

The DEC-SD-PRE-001 file must include the advisor packet and receipt references/hashes and `kind: 'canonical_mode_crosswalk'`; the other two files must omit `advisorPacket` and use only their matching `kind`. If the owner approves a recommended `NEW_PROPOSAL`, its exact `cellId` must appear once in `approvedNewProposalCellIds`; this explicit approval makes the selected value canonical in the decision body. No unlisted proposal becomes canonical. For each file, `record.contentHash === hashCanonicalBody(body)`. Record its whole-file SHA-256, never mutate it after closure, and reject a mismatched `decisionId`/`kind`.

Process decisions strictly in this order:

1. **DEC-SD-PRE-001:** write and hash its immutable file immediately after the answer. Before asking the next question, amend `docs/v2/HANDOVER.md`, this critical plan, and the downstream sound plan so they cite the immutable decision path/hash, reproduce or reference the exact approved five-row crosswalk without a competing table, use the literal approved sound `activityTypeKey` for `docs/v2/frontend-handoff/modes/<activityTypeKey>/`, and preserve the rule that shared approved keys share one kernel namespace. Do not create the TypeScript crosswalk yet.
2. **DEC-SD-PRE-003:** only after DEC-SD-PRE-001 closure passes, ask the owner to choose the canonical port namespace. Write/hash its immutable file, then amend `docs/v2/HANDOVER.md`, this plan, the approved replaceable-frontend design, and the downstream sound plan to one exact selected path. Remove the rejected path as a normative option and state that no adapter/re-export is authorized.
3. **DEC-SD-PRE-002:** only after DEC-SD-PRE-003 closure passes, ask the object-pin question. Write/hash its immutable file, then amend `docs/v2/HANDOVER.md`, this plan, spec 08, and the 2026-07-14 Content Studio plan so both normative contracts use the same selected `object` or `bodyObject` field. State explicitly that the rejected name is not an accepted alias.

After every decision, run focused `git diff --check`, re-read every amended paragraph, and obtain fresh read-only confirmation that no affected normative source still contradicts the immutable answer. Do not ask the next question, write a test, or edit TypeScript while that closure is incomplete. These are execution-stage documentation amendments; this planning turn changes only this plan.

### Step 0.5 — Create the aggregate durable owner-decision record

After all three immutable decisions and normative amendments pass, create exactly:

`docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-decisions.v1.json`

Strict shape:

```ts
interface SoundPredecessorOwnerDecisionBody {
  readonly schemaVersion: 'learning-v2-sound-predecessor-owner-decisions-body.v1';
  readonly decisionSetId: 'sound-discrimination-critical-predecessor-2026-07-18';
  readonly decidedBy: string;
  readonly decidedAt: string;
  readonly decisionReceipts: readonly [
    {
      readonly decisionId: 'DEC-SD-PRE-001';
      readonly path: 'docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-001.v1.json';
      readonly fileSha256: string;
      readonly contentHash: string;
    },
    {
      readonly decisionId: 'DEC-SD-PRE-003';
      readonly path: 'docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-003.v1.json';
      readonly fileSha256: string;
      readonly contentHash: string;
    },
    {
      readonly decisionId: 'DEC-SD-PRE-002';
      readonly path: 'docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-002.v1.json';
      readonly fileSha256: string;
      readonly contentHash: string;
    },
  ];
  readonly decisions: {
    readonly 'DEC-SD-PRE-001': {
      readonly status: 'approved';
      readonly modeCrosswalk: readonly ModeCrosswalkRow[];
      readonly keyUniquenessRequired: boolean;
      readonly notes: string;
    };
    readonly 'DEC-SD-PRE-002': {
      readonly status: 'approved';
      readonly previewEnvelopeRecordObjectField: 'object' | 'bodyObject';
      readonly rejectedFieldAcceptedAsAlias: false;
      readonly notes: string;
    };
    readonly 'DEC-SD-PRE-003': {
      readonly status: 'approved';
      readonly activityUiPortPath:
        | 'modules/learning-v2/runtime/activity_ui_port_types.ts'
        | 'modules/learning-v2/ui-port/activity_ui_port_types.ts';
      readonly rejectedNamespaceCreated: false;
      readonly notes: string;
    };
  };
}

interface SoundPredecessorOwnerDecisionRecord {
  readonly schemaVersion: 'learning-v2-sound-predecessor-owner-decisions-record.v1';
  readonly decisionSetId: 'sound-discrimination-critical-predecessor-2026-07-18';
  readonly contentHash: string;
}

interface SoundPredecessorOwnerDecisionFile {
  readonly body: SoundPredecessorOwnerDecisionBody;
  readonly record: SoundPredecessorOwnerDecisionRecord;
}
```

Every aggregate decision must equal its matching immutable decision body exactly. Every `decisionReceipts` entry must match the immutable file path, whole-file SHA-256, and recomputed canonical content hash. Aggregate `contentHash` is 64 lowercase hex and equals `hashCanonicalBody(body)`. The record has no self hash, mutable “latest” alias, or duplicate crosswalk outside DEC-SD-PRE-001. Verify all four files with the existing canonical serializer before creating any source/test file; record exact hashes in the later receipt. If the serializer cannot be imported without source repair, stop rather than substituting `JSON.stringify`.

**Acceptance:** one named writer, exact current hashes/namespace manifest, path-specific ownership receipts, current aggregate RED reproduced, reviewed advisor packet, three immutable sequential decisions, all affected normative documents consistent before code, exact aggregate record, and recomputed canonical/file hashes. No TypeScript source/test file has changed.

**Stop:** incomplete/unreviewed advisor matrix, unmarked invented candidate, incomplete `NEW_PROPOSAL` provenance, proposal used without exact owner approval, unresolved decision, missing/invalid decision-file hash, stale hash, contradictory normative source, overlapping writer, unknown namespace owner, or an attempt to approve only the sound row while leaving the canonical five-row table ambiguous.

---

## 5. Task 1 — Canonical crosswalk and preview corpus

**Predecessor:** Task 0 acceptance, all three decisions, and verified durable decision-record hash.
**Commit boundary when separately authorized:** `feat(learning-v2): freeze activity mode identity contracts`

### Step 1.1 — Write RED tests first

Create tests that require:

- the advisor Markdown contains one parseable artifact JSON block with exactly 40 unique cells, valid per-cell value/binding provenance, and no unmarked proposal;
- the advisor receipt pins the exact packet SHA, recomputed provenance counts, all required true assertions, zero unresolved cells, and `verdict: 'PASS'`;
- every selected `NEW_PROPOSAL` cell appears in DEC-SD-PRE-001 `approvedNewProposalCellIds`, and no other cell is treated as newly canonical;
- the durable decision file has exact Body/Record keys, all three approved decisions, and a recomputed canonical content hash;
- exactly the five selected `modeId` values and no sixth value;
- each row exactly matches DEC-SD-PRE-001; repeated `activityTypeKey`/family/renderer values are allowed unless `keyUniquenessRequired` is explicitly true in that decision;
- handoff paths derive from `activityTypeKey`; two mode rows sharing one approved activity type share that kernel-keyed handoff namespace rather than creating mode-keyed aliases;
- `family` is one of the canonical 17 families;
- positive integer kernel, renderer-schema, and payload-schema versions;
- non-empty `rendererKey` and `payloadSchemaKey`;
- the owner-approved source values exactly, with no label-derived alias;
- `sound-discrimination` has no acoustic/voice claim field;
- `PREVIEW_STATES` is the frozen exact six-value tuple;
- `PreviewState` and `PreviewConditions` are imported by evidence/preview/UI-port consumers rather than redeclared.

```powershell
npx jest --runTestsByPath tests/learning_v2_sound_predecessor_owner_decisions.test.ts tests/learning_v2_activity_mode_crosswalk.test.ts tests/learning_v2_content_studio_preview_corpus.test.ts --no-cache --runInBand
```

Expected RED: module-not-found for the crosswalk and missing canonical preview exports.

### Step 1.2 — Minimal GREEN

- Add `PREVIEW_STATES`, `PreviewState`, and `PreviewConditions` to `modules/learning-v2/contracts/content_studio.ts`.
- Add the exact owner-approved five-row table from the hash-verified decision body to `activity_mode_crosswalk.ts`.
- Derive `SELECTED_REFERENCE_MODE_IDS` and its type from that table. Do not keep a second manually typed tuple in the evidence gate.
- Keep `modeId`, `activityTypeKey`, `family`, `rendererKey`, kernel version, renderer schema, and payload schema separate.
- Export a lookup by `modeId` and a lookup by `activityTypeKey`; both fail closed for unknown values.
- Do not add policies or executable component paths to the crosswalk.

Run the Step 1.1 command again. Expected GREEN: both suites pass, no snapshots.

**Acceptance:** one durable authority record, one code-owned crosswalk that exactly matches it, one preview corpus, exact owner-approved keys, no unapproved uniqueness assumption, no acoustic claim, and no duplicate enum/table in tests or gate code.

---

## 6. Task 2 — Harden real PNG/contact-sheet and readiness gates

**Predecessor:** Task 1 GREEN.
**Commit boundary when separately authorized:** `test(learning-v2): harden reference evidence readiness`

### Step 2.1 — RED artifact tests

Use `sharp` only against temporary test files. Tests create:

1. a raw capture whose declared format/MIME does not match its magic bytes;
2. an undecodable raw capture with a correct extension;
3. a raw capture with a mismatched SHA-256;
4. a raw capture with a missing/placeholder source kind, source path, capture method, or provenance field;
5. a raw capture with fewer than six state records or without all six canonical states;
6. arbitrary UTF-8 bytes with a `.png` contact-sheet suffix;
7. a truncated contact-sheet PNG signature/IHDR;
8. a decodable contact sheet whose recorded width/height do not match;
9. a decodable contact sheet with fewer than six frame records;
10. frame records that do not cover all six canonical states;
11. an out-of-bounds or overlapping frame region;
12. a changed contact sheet whose SHA no longer matches approval;
13. a real decoded PNG with at least six non-overlapping regions and exact coverage of all six canonical preview states.

Each raw capture uses a strict structured shape:

```ts
{
  artifact: {
    rawArtifactPath: string;
    rawSha256: string;
    artifactFormat: string;
    mimeType: string;
  };
  source: {
    kind: 'first_hand_device_capture';
    entryPath: string;
    captureMethod: string;
    sourceProvenance: string;
    rightsUseNote: string;
  };
  states: readonly {
    previewState: PreviewState;
    artifactFrameRef: string;
    observedAt: string;
  }[];
}
```

The gate dispatches to an explicit decoder for each allowed format/MIME pair. The initial test pair is `png` + `image/png`; any other pair is unsupported until its decoder and RED cases are added. Extension, declared format, declared MIME, magic bytes, decoder metadata, SHA, path containment, source kind, and provenance must all agree. Test-only synthetic captures use realistic complete metadata in a temp root; production records do not get a “test bypass”.

Required deterministic blockers:

- `capture_artifact_format_unsupported`
- `capture_artifact_mime_mismatch`
- `capture_artifact_decode_failed`
- `capture_artifact_hash_mismatch`
- `capture_source_provenance_invalid`
- `capture_state_coverage_invalid`
- `contact_sheet_invalid_png`
- `contact_sheet_metadata_mismatch`
- `contact_sheet_frame_map_invalid`
- existing missing/stale-approval blockers remain stable.

Each new code is prefixed with the exact mode ID using the current `<modeId>:<code>` convention.

The approved record must bind:

- decoded `format: 'png'`;
- decoded width and height;
- SHA-256;
- at least six frame records keyed by imported `PreviewState`;
- positive integer frame rectangles inside decoded bounds;
- pairwise non-overlapping rectangles;
- all six canonical states covered at least once; additional frames may repeat a canonical state only to show an orthogonal condition;
- the existing orthogonal condition coverage.

```powershell
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
```

Expected RED: the arbitrary-byte and malformed/frame-map cases are incorrectly accepted by the current gate.

### Step 2.2 — Minimal GREEN without aggregate weakening

- Convert the gate to the smallest async boundary needed for `sharp` decoding and update every discovered caller to `await`; do not create a second sync gate.
- Preserve the current result shape and existing flat blocker ordering for existing cases.
- Add explicit assertions:
  - `assertModeImplementationReady(result, modeId)` reads only `modeResults[modeId]`;
  - `assertReferenceEvidencePackReleaseReady(result)` reads only aggregate `ready`;
  - the aggregate assertion never calls or aliases the per-mode assertion.
- The real repository remains RED until lawful captures, genuine sheets, and current approvals exist.

Run:

```powershell
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
$env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL='1'
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
Remove-Item Env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL
```

Expected:

- normal suite GREEN with the strict real-pack test intentionally skipped;
- one synthetic valid mode has `modeResults[modeId].ready === true` while aggregate `ready === false`;
- all five synthetic valid modes make aggregate `ready === true`;
- strict real-pack command remains expected RED with the actual unresolved blockers;
- no placeholder bytes, valid-but-unmapped PNG, stale hash, or partial owner record becomes ready.

**Acceptance:** implementation readiness is usable per mode; aggregate remains the only all-five/release gate; actual reference evidence remains honestly RED; tests write only temp artifacts.

---

## 7. Task 3 — Enforce kernel-only policy compatibility

**Predecessor:** Task 1 GREEN and a fresh runtime hash check.
**Commit boundary when separately authorized:** `fix(learning-v2): enforce kernel-only policy compatibility`

### Step 3.1 — RED

Add tests where:

- every policy lists only the registration’s `rendererKey`: registration must fail with `v2_activity_policy_incompatible`;
- every policy lists the exact `activityTypeKey` but not the renderer: registration succeeds;
- family mismatch fails even when `activityTypeKey` matches;
- the owner-approved crosswalk row and the registration descriptor disagree on any identity/version/schema field: fail closed before runtime resolution;
- changing `rendererKey` does not change policy compatibility.

```powershell
npx jest --runTestsByPath tests/learning_v2_activity_registry.test.ts tests/learning_v2_activity_mode_crosswalk.test.ts --no-cache --runInBand
```

Expected RED: the renderer-only compatibility case currently succeeds.

### Step 3.2 — GREEN

Remove the `rendererKey` fallback from `assertPolicy`/registration validation. Keep renderer presence validation, but never pass it to `compatibleKernelKeys`.

Run the Step 3.1 command again and the episode compatibility guard:

```powershell
npx jest --runTestsByPath tests/learning_v2_activity_registry.test.ts tests/learning_v2_activity_mode_crosswalk.test.ts tests/learning_v2_episode_contract.test.ts --no-cache --runInBand
```

Expected GREEN. Record pre/post SHA-256 for `activity_registry.ts`; `activity_runtime.ts` must remain byte-identical to its pre-task receipt.

**Acceptance:** only `activityTypeKey` plus family/version/schema constraints authorize policies; renderer identity remains presentation metadata.

---

## 8. Task 4 — Freeze the owner-selected port and complete audio intent

**Predecessor:** Tasks 1 and 3 GREEN; DEC-SD-PRE-003; explicit ownership of only the selected port file.
**Commit boundary when separately authorized:** `feat(learning-v2): freeze activity ui port contract`

### Step 4.1 — RED port and import-boundary tests

The selected port file must be exactly the DEC-SD-PRE-003 path, import canonical `PreviewState` and `PreviewConditions`, and never create the rejected namespace as a re-export or adapter.

Required `ActivityCommand` behavior:

- `audio.play` identifies one descriptor-owned `clipId` and one supported descriptor-owned `rate`;
- an arbitrary clip ID or arbitrary numeric rate is rejected by the controller boundary;
- audio settings use an explicit typed command, never a direct device/settings import in UI;
- offline audio offers explicit retry and the exact policy-authorized fallback command;
- fallback intent carries only an allowlisted route; it never claims listening evidence;
- play/retry/settings/fallback commands do not mutate answer, score, result intent, progress, evidence, rewards, or analytics;
- answer commands remain distinct from audio commands;
- available commands are derived from current state/capability, not invented by the renderer.

The final field/value spellings must be frozen in this task packet before RED. The minimum semantic surface is:

- `audio.play` with `clipId` and `rate`;
- `audio.settings.open`;
- `audio.retry` with `clipId`;
- `fallback.open` with one policy-authorized route.

Rates come from the immutable activity descriptor. UI cannot send an unrestricted number. Offline fallback never silently substitutes text and calls it listening success.

```powershell
npx jest --runTestsByPath tests/learning_v2_ui_port_contract.test.ts tests/learning_v2_ui_port_import_boundary.test.ts --no-cache --runInBand
```

Expected RED: UI-port files do not exist.

### Step 4.2 — GREEN

Create only the shared immutable types and pure command validator. Do not implement the sound presenter/controller.

The boundary test scans the exact owner-selected port file and asserts that the rejected path remains absent. It rejects imports of:

- `react`, `react-native`, `expo-router`;
- Firebase, AsyncStorage, analytics, device audio, permission, voice, progress, evidence, stars/access, reward, provider, or backend writer modules;
- `components/learning-v2/**`;
- `modules/learning-v2/runtime/**`.

Canonical contract imports from `modules/learning-v2/contracts/**` are allowed.

Run the Step 4.1 command again. Expected GREEN.

**Acceptance:** exactly one owner-selected immutable ViewModel/typed-command port exists; the competing namespace remains absent; canonical preview types are imported; complete audio/settings/offline intent is representable; no UI or durable effect is implemented.

---

## 9. Task 5 — Resolve and implement the pure PreviewEnvelope seam

**Predecessor:** DEC-SD-PRE-002 plus Tasks 1 and 4 GREEN.
**Commit boundary when separately authorized:** `feat(learning-v2): add preview envelope contract seam`

### Step 5.1 — RED Body/Record/Response conformance

Tests cover:

- strict Body, Record, and Response keys;
- body contains no self hash or object pin;
- `envelopeHash === hashCanonicalBody(body)`;
- record pins the same hash and chosen canonical object-pin field;
- the rejected `object`/`bodyObject` spelling fails strict parsing;
- exact entity fingerprint, resolved template refs, resolved kernel refs, all five exact policy refs, support-manifest hashes, payload object, expiry, and environment are validated;
- `resolvedKernelRefs` must match the owner-approved crosswalk for `activityTypeKey`, family-owned capability data, renderer identity, and schema/kernel versions;
- canonical imported states/conditions only;
- stale release/template/activity/renderer/schema/hash mismatch fails closed;
- record/body/object hash mismatch fails closed;
- client and Functions produce the same canonical bytes/hash and ordered issue code.

```powershell
npx jest --runTestsByPath tests/learning_v2_preview_envelope.test.ts --no-cache --runInBand
Push-Location functions
npx jest --config jest.config.js --runTestsByPath src/content_studio/preview.test.ts --no-cache --runInBand
Pop-Location
```

Expected RED: preview modules do not exist.

### Step 5.2 — RED no-progress boundary

Create a preview runtime with all possible writer/provider dependencies represented. Assert construction fails if any durable or provider writer is supplied. A valid preview runtime exposes all as `null`/absent and dispatching every current UI-port command produces zero calls to:

- progress/outbox/persistence;
- performance/access stars;
- evidence/non-assessment/mastery/checkpoint;
- shards/reward/purchase;
- analytics/telemetry;
- voice capture/network provider;
- Firebase/Functions/backend mutations.

```powershell
npx jest --runTestsByPath tests/learning_v2_preview_no_progress.test.ts --no-cache --runInBand
```

Expected RED: no preview runtime exists.

### Step 5.3 — Minimal GREEN

- Implement strict pure parsers/builders and hash checks only.
- Implement a no-progress runtime factory that structurally cannot receive writers.
- Mirror the pure contract in Functions for conformance only.
- Do not export a callable, create Firestore/Storage records, issue grants, add a route, or claim device parity.
- The receipt must label the seam accurately as `pure_contract_and_no_progress_runtime`; transport/callable/grant/route/device fields remain `not_implemented` and continue to block Sound Plan Task 5 until its separate Task 9 packet.

Run the Step 5.1 and Step 5.2 commands again. Expected GREEN.

**Acceptance:** there is a real code/test seam for exact envelope parsing/hash and no-progress execution, with honest absence of transport/device proof. No mock route is described as a real device seam.

---

## 10. Task 6 — Receipt, handoff key, and final reviews

**Predecessor:** Tasks 1–5 GREEN.
**Commit boundary when separately authorized:** `docs(learning-v2): record sound predecessor receipts`

### Step 6.1 — Write one canonical receipt

Create `docs/v2/evidence/phase-03/2026-07-18-sound-discrimination-critical-predecessor-receipt.v1.json` with:

- schema version and creation time;
- branch, HEAD, worktree;
- writer identity and read-only reviewer identities;
- `advisorPacket` with exact artifact/receipt paths, packet SHA-256, reviewer, and PASS verdict;
- `ownerDecisionReceipts`, containing each immutable decision path, whole-file SHA-256, and canonical body content hash in decision order;
- `ownerDecisionAggregate` with exact aggregate path, whole-file SHA-256, and canonical body content hash;
- canonical crosswalk source path and SHA-256;
- canonical preview corpus source path and SHA-256;
- `content_studio.ts` pre/post hashes and its path-specific owner receipt;
- dirty Functions namespace pre/post manifest hashes, plus explicit `absent → <post-hash>` receipts for only `preview.ts` and `preview.test.ts`;
- evidence gate/test pre/post hashes;
- runtime registry pre/post hashes;
- unchanged `activity_runtime.ts` hash;
- selected port namespace owner, selected exact file hash, and proof that the rejected namespace remains absent;
- PreviewEnvelope client/Functions/no-progress source and test hashes;
- accurate seam capability flags;
- exact RED/GREEN commands and suite/test counts;
- aggregate strict-gate current status and blocker count;
- `handoffNamespaceKind: activityTypeKey`;
- the exact owner-approved sound `activityTypeKey` only as resolved from the crosswalk;
- prohibitions and no-commit/no-push/no-deploy/no-production state.

The receipt pins hashes; it does not duplicate the five-row crosswalk or policy bodies.

### Step 6.2 — Revalidate the pre-code normative closure

Do not defer normative amendments to Task 6. Re-read the already-amended HANDOVER, this plan, downstream sound plan, frontend design, spec 08, and Content Studio plan against the three immutable decision receipts:

- the downstream handoff path is the literal approved sound `activityTypeKey`, never `modeId`;
- all handoff lookup/verification derives from `activityTypeKey`;
- shared approved activity keys share one kernel namespace when DEC-SD-PRE-001 permits non-unique keys;
- visual evidence remains keyed by `modeId`;
- every port reference uses only the DEC-SD-PRE-003 path;
- both PreviewEnvelope normative sources use only the DEC-SD-PRE-002 object-pin field;
- all documents cite the applicable immutable decision path/hash.

Any stale alternative, placeholder, contradictory alias, or post-code amendment is a stop. The predecessor cannot complete until a fresh spec reviewer confirms reference closure.

### Step 6.3 — Fresh read-only spec review

Prompt:

> Compare the bounded predecessor diff against the two 2026-07-14 plans, spec 08 §§6.1/13, the approved replaceable-frontend design, and the sound-discrimination plan. Report P0/P1/P2 only for real PNG/frame-map validation, per-mode versus aggregate authority, exact owner-approved crosswalk, kernel-only policy compatibility, canonical PreviewState/Conditions imports, UI-port ownership/audio command completeness, PreviewEnvelope Body/Record/Response identity, object-pin decision, no-progress boundary, receipt hashes, and activityTypeKey-keyed handoff. Confirm no final key was silently invented: every new canonical value must trace to a complete `NEW_PROPOSAL` cell and exact owner approval. Confirm no renderer/route/callable/export was added. Do not edit.

Any finding returns the writer to the relevant RED task. Re-run the full focused command after repair, then request a fresh review context.

### Step 6.4 — Fresh adversarial review after spec PASS

Prompt:

> Adversarially review this predecessor for policy-authority confusion, aggregate-gate weakening, valid-but-fake PNG acceptance, stale/hash substitution, crosswalk aliasing, rendererKey authorization, duplicated preview enums, unrestricted audio rate/clip/settings commands, offline fallback making a false listening/acoustic claim, preview writes/provider calls, Body/Record self-reference, object/bodyObject dual acceptance, dirty-work overwrite, and misleading transport/device claims. Report P0/P1/P2 only; do not edit.

### Step 6.5 — Final deterministic gates

```powershell
npx jest --runTestsByPath tests/learning_v2_sound_predecessor_owner_decisions.test.ts tests/learning_v2_activity_mode_crosswalk.test.ts tests/learning_v2_content_studio_preview_corpus.test.ts tests/learning_v2_reference_evidence_contract.test.ts tests/learning_v2_activity_registry.test.ts tests/learning_v2_episode_contract.test.ts tests/learning_v2_ui_port_contract.test.ts tests/learning_v2_ui_port_import_boundary.test.ts tests/learning_v2_preview_envelope.test.ts tests/learning_v2_preview_no_progress.test.ts --no-cache --runInBand
Push-Location functions
npx jest --config jest.config.js --runTestsByPath src/content_studio/preview.test.ts --no-cache --runInBand
Pop-Location
$decisionPath = 'docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-decisions.v1.json'
$receiptPath = 'docs/v2/evidence/phase-03/2026-07-18-sound-discrimination-critical-predecessor-receipt.v1.json'
$decisionFile = Get-Content -Raw -Encoding UTF8 $decisionPath | ConvertFrom-Json
$receiptFile = Get-Content -Raw -Encoding UTF8 $receiptPath | ConvertFrom-Json
$canonicalHash = (npx tsx -e "import fs from 'node:fs'; import { hashCanonicalBody } from './modules/learning-v2/policies/decision_registry'; const value=JSON.parse(fs.readFileSync('$decisionPath','utf8')); process.stdout.write(hashCanonicalBody(value.body));").Trim()
if ($LASTEXITCODE -ne 0) { throw 'sound_predecessor_decision_hash_command_failed' }
$decisionFileSha = (Get-FileHash -Algorithm SHA256 $decisionPath).Hash.ToLowerInvariant()
if ($decisionFile.record.contentHash -cne $canonicalHash) { throw 'sound_predecessor_decision_hash_mismatch' }
if ($receiptFile.ownerDecisionAggregate.path -cne $decisionPath) { throw 'sound_predecessor_decision_receipt_path_mismatch' }
if ($receiptFile.ownerDecisionAggregate.contentHash -cne $canonicalHash) { throw 'sound_predecessor_decision_receipt_content_hash_mismatch' }
if ($receiptFile.ownerDecisionAggregate.fileSha256 -cne $decisionFileSha) { throw 'sound_predecessor_decision_receipt_file_hash_mismatch' }
$portPath = $decisionFile.body.decisions.'DEC-SD-PRE-003'.activityUiPortPath
if ($portPath -notin @('modules/learning-v2/runtime/activity_ui_port_types.ts','modules/learning-v2/ui-port/activity_ui_port_types.ts')) { throw 'sound_predecessor_port_decision_invalid' }
$boundedConfigPath = '.codex-tmp/learning-v2-critical/tsconfig.json'
$boundedFiles = @(
  'modules/learning-v2/contracts/content_studio.ts',
  'modules/learning-v2/contracts/activity_mode_crosswalk.ts',
  'modules/learning-v2/reference-evidence/reference_evidence_gate.ts',
  'modules/learning-v2/runtime/activity_registry.ts',
  $portPath,
  'modules/learning-v2/preview/preview_envelope.ts',
  'modules/learning-v2/preview/preview_runtime.ts',
  'functions/src/content_studio/preview.ts',
  'functions/src/content_studio/preview.test.ts',
  'tests/learning_v2_sound_predecessor_owner_decisions.test.ts',
  'tests/learning_v2_activity_mode_crosswalk.test.ts',
  'tests/learning_v2_content_studio_preview_corpus.test.ts',
  'tests/learning_v2_reference_evidence_contract.test.ts',
  'tests/learning_v2_activity_registry.test.ts',
  'tests/learning_v2_episode_contract.test.ts',
  'tests/learning_v2_ui_port_contract.test.ts',
  'tests/learning_v2_ui_port_import_boundary.test.ts',
  'tests/learning_v2_preview_envelope.test.ts',
  'tests/learning_v2_preview_no_progress.test.ts'
)
$boundedConfig = [ordered]@{
  extends = (Resolve-Path 'tsconfig.json').Path.Replace('\','/')
  compilerOptions = [ordered]@{ noEmit = $true; skipLibCheck = $true }
  files = @($boundedFiles | ForEach-Object { (Resolve-Path $_).Path.Replace('\','/') })
}
New-Item -ItemType Directory -Force (Split-Path $boundedConfigPath) | Out-Null
[IO.File]::WriteAllText((Join-Path (Get-Location) $boundedConfigPath), ($boundedConfig | ConvertTo-Json -Depth 6), [Text.UTF8Encoding]::new($false))
npx tsc --project $boundedConfigPath --pretty false
git diff --check -- docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet.v1.md docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet-receipt.v1.json docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-001.v1.json docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-003.v1.json docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-002.v1.json docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-decisions.v1.json docs/v2/HANDOVER.md docs/v2/08-admin-content-studio-and-mode-authoring.md docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md docs/superpowers/specs/2026-07-18-learning-v2-replaceable-frontend-design.md docs/superpowers/plans/2026-07-18-learning-v2-sound-discrimination-critical-predecessor.md docs/superpowers/plans/2026-07-18-learning-v2-sound-discrimination-vertical-slice.md modules/learning-v2/contracts/content_studio.ts modules/learning-v2/contracts/activity_mode_crosswalk.ts modules/learning-v2/reference-evidence/reference_evidence_gate.ts modules/learning-v2/runtime/activity_registry.ts $portPath modules/learning-v2/preview functions/src/content_studio/preview.ts functions/src/content_studio/preview.test.ts tests/learning_v2_sound_predecessor_owner_decisions.test.ts tests/learning_v2_activity_mode_crosswalk.test.ts tests/learning_v2_content_studio_preview_corpus.test.ts tests/learning_v2_reference_evidence_contract.test.ts tests/learning_v2_activity_registry.test.ts tests/learning_v2_ui_port_contract.test.ts tests/learning_v2_ui_port_import_boundary.test.ts tests/learning_v2_preview_envelope.test.ts tests/learning_v2_preview_no_progress.test.ts docs/v2/evidence/phase-03/2026-07-18-sound-discrimination-critical-predecessor-receipt.v1.json
$plannedUntracked = @(
  'docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet.v1.md',
  'docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-advisor-packet-receipt.v1.json',
  'docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-001.v1.json',
  'docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-003.v1.json',
  'docs/v2/decisions/2026-07-18-sound-discrimination-dec-sd-pre-002.v1.json',
  'docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-decisions.v1.json',
  'modules/learning-v2/contracts/activity_mode_crosswalk.ts',
  $portPath,
  'modules/learning-v2/preview/preview_envelope.ts',
  'modules/learning-v2/preview/preview_runtime.ts',
  'functions/src/content_studio/preview.ts',
  'functions/src/content_studio/preview.test.ts',
  'tests/learning_v2_sound_predecessor_owner_decisions.test.ts',
  'tests/learning_v2_activity_mode_crosswalk.test.ts',
  'tests/learning_v2_content_studio_preview_corpus.test.ts',
  'tests/learning_v2_ui_port_contract.test.ts',
  'tests/learning_v2_ui_port_import_boundary.test.ts',
  'tests/learning_v2_preview_envelope.test.ts',
  'tests/learning_v2_preview_no_progress.test.ts',
  'docs/v2/evidence/phase-03/2026-07-18-sound-discrimination-critical-predecessor-receipt.v1.json'
)
foreach ($untrackedPath in $plannedUntracked) {
  git ls-files --error-unmatch -- $untrackedPath 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    $whitespace = git diff --no-index --check -- NUL $untrackedPath 2>&1
    $whitespaceExit = $LASTEXITCODE
    $whitespaceFindings = @($whitespace | Where-Object { $_ -notmatch '^warning:' })
    if ($whitespaceFindings) { $whitespaceFindings; throw "untracked_whitespace_invalid:$untrackedPath" }
    if ($whitespaceExit -notin @(0,1)) { throw "untracked_whitespace_check_failed:$untrackedPath:$whitespaceExit" }
  }
}
rg -n ('TO' + 'DO' + '|' + 'TB' + 'D') docs/v2/decisions/2026-07-18-sound-discrimination-critical-predecessor-decisions.v1.json modules/learning-v2/contracts/activity_mode_crosswalk.ts $portPath modules/learning-v2/preview functions/src/content_studio/preview.ts functions/src/content_studio/preview.test.ts tests/learning_v2_sound_predecessor_owner_decisions.test.ts tests/learning_v2_activity_mode_crosswalk.test.ts tests/learning_v2_content_studio_preview_corpus.test.ts tests/learning_v2_reference_evidence_contract.test.ts tests/learning_v2_activity_registry.test.ts tests/learning_v2_ui_port_contract.test.ts tests/learning_v2_ui_port_import_boundary.test.ts tests/learning_v2_preview_envelope.test.ts tests/learning_v2_preview_no_progress.test.ts docs/v2/evidence/phase-03/2026-07-18-sound-discrimination-critical-predecessor-receipt.v1.json docs/superpowers/plans/2026-07-18-learning-v2-sound-discrimination-vertical-slice.md
git status --short
```

Expected: all focused suites PASS; the exact-file `.codex-tmp/learning-v2-critical/tsconfig.json` TypeScript gate exits 0; tracked and untracked whitespace checks and the placeholder scan have no output; status shows only the bounded packet plus preserved pre-existing dirty work. The temp config is ignored and extends the root compiler options but its `files` list is closed over this packet. Whole-project TypeScript is optional diagnostic evidence only, never the predecessor acceptance gate.

---

## 11. Time checkpoints

### 30-minute checkpoint

- Task 0 evidence collected.
- Aggregate 15-blocker RED reproduced or exact drift recorded.
- Ownership/hashes frozen.
- DEC-SD-PRE-001 asked; no source change if unanswered.

Stop if any owner/hashing/ownership evidence is missing.

### 60-minute checkpoint

- DEC-SD-PRE-001, DEC-SD-PRE-003, and DEC-SD-PRE-002 are all approved in that order.
- The durable decision JSON exists, `contentHash === hashCanonicalBody(body)`, and its file SHA-256 plus path-specific ownership receipts are recorded.
- No source or test file has changed before those three decisions and the hash check.
- If any decision, hash, or ownership receipt is missing, stop; do not continue Tasks 1–5.

### 120-minute checkpoint

- Canonical crosswalk/corpus, genuine capture validation, kernel-only policy compatibility, owner-selected UI-port contract, and PreviewEnvelope/no-progress seam have bounded RED→GREEN evidence.
- The strict real pack remains honestly RED until lawful evidence exists; it is not converted into a false source GREEN.
- Do not rush the receipt, skip fresh review, or reinterpret a partial GREEN as permission to start the sound renderer.

---

## 12. Completion and downstream unlock

This predecessor is complete only when:

- all three owner decisions are explicit and hash-receipted in the durable canonical record;
- the genuine PNG/frame-map gate is GREEN on temp fixtures and the real pack remains honestly RED;
- one mode can become implementation-ready without making the aggregate ready;
- aggregate all-five remains the only release-ready result;
- the canonical five-row crosswalk is the only mode-to-runtime identity mapping;
- policy compatibility uses `activityTypeKey`, never `rendererKey`;
- `PreviewState`/`PreviewConditions` have one import source;
- the UI-port namespace is owned and audio play/clip/rate/settings/retry/fallback intent is complete;
- the pure PreviewEnvelope/no-progress seam is implemented and accurately receipted;
- spec and adversarial reviews PASS;
- all focused deterministic gates pass;
- no unrelated dirty work was changed;
- no callable/export/route/device/release claim exists.

After completion, the next executable action is still evidence work, not UI implementation: obtain lawful first-hand inputs and create/review the genuine `sound-discrimination` contact sheet. Only when the owner approves its exact hash and `modeResults['sound-discrimination'].ready === true` may the sound vertical plan start Task 1. The all-five aggregate may remain RED and must remain release-blocking.

No commit, push, deploy, publish, production write, Rules/index change, API use, or legacy removal is authorized by this plan.
