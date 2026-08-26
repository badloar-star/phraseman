# Phraseman V2 Content Studio Implementation Plan

> **Owner override 2026-08-25:** Content Studio для required sessions сначала
> выбирает одну из семи approved mechanics и требует её полный mode-native
> payload. Preview/runtime повторяют owner HTML 1:1. Более широкий каталог и
> generic template flow ниже не отменяют
> `docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hybrid Phraseman V2 Content Studio so administrators can create, configure, compose into a season, preview, validate, version, clone, localize, review, publish, activate, and roll back V2 content without being able to upload executable renderer or scorer code.

**Architecture:** Executable kernels, their capability catalog, gate policies, and the app-support manifest are code-owned and ship with the app. Every ModeTemplate/Episode/Season revision splits into a hashable canonical `*ArtifactBody`, immutable Firestore record envelope, mutable head/lifecycle projection, and append-only receipts; only the body bytes are hashed and stored as the artifact. Administrators author content-only activities and graphs, then pin approved exact revisions into a season. All writes, reviews, waivers, projections, sealing, activation, and rollback go through permission-checked Cloud Functions with idempotency, optimistic concurrency, maker-checker review, audit, and a season-aware release pointer; the client receives only validated `lesson-bundle.v2` artifacts inside the existing four-surface `course-release.v1`.

**Tech Stack:** TypeScript strict, Expo SDK 54, React Native 0.81, Expo Router, Firebase Auth/Firestore/Functions/Storage, Admin v2 vanilla ES modules, Jest, React Native Testing Library, Firebase Rules tests, Playwright, and Maestro.

---

## Hybrid boundary and file map

- App code owns the 17-family taxonomy, versioned `activityTypeKey`/kernel implementations, `rendererKey`, schema support, scorer/evidence policy support, fallback capability, and preview-state fixtures. An admin cannot enter an implementation path.
- Admin data owns names, instructions, payload defaults, policy selections allowed by the capability, localized copy, and episode composition.
- A published ModeTemplate resolves a `ModeTemplateArtifactBody + ModeTemplateVersionRecord + ModeTemplateLifecycleHead`; it is addressed by `templateId + version + contentHash`. A draft resolves its own body/record, while its mutable head uses `revision + fingerprint`; cloning starts a new `templateId` at `proposedVersion: 1`.
- An `ActivityInstance` stores content/template/payload data only and has no standalone mutable status; lifecycle belongs to the owning Episode. Order, required/gate/star/phase/fallback semantics belong to `EpisodeGraphNode`; `activityId` and `nodeId` are distinct identities.
- An `EpisodeDraft` is mutable only through `expectedRevision + expectedFingerprint`; every successful mutation writes an immutable `EpisodeRevision` snapshot. A sealed release contains only approved immutable versions/revisions and fresh validation/review fingerprints. Runtime never reads draft collections.
- A `SeasonDraft` pins exact approved EpisodeRevision refs, never mutable episode heads. Any episode replacement creates a new `SeasonRevision`; 32/4×8/checkpoints and E2–E32 gate values are validated against the selected code-owned `gatePolicyVersion`.

| Responsibility | Exact files |
|---|---|
| Shared authoring contracts and canonical bytes | `modules/learning-v2/contracts/content_studio.ts`, `modules/learning-v2/contracts/content_studio_validation.ts`, `modules/learning-v2/contracts/content_studio_canonical_json.ts` |
| Client capability catalog | `modules/learning-v2/registry/mode_capability_catalog.ts`, `modules/learning-v2/content/app_support_manifest.ts` |
| Pure template, season, and graph operations | `modules/learning-v2/authoring/mode_template.ts`, `modules/learning-v2/authoring/season_draft.ts`, `modules/learning-v2/authoring/episode_draft.ts`, `modules/learning-v2/authoring/episode_graph.ts` |
| Backend mirror and repositories | `functions/src/content_studio/contracts.ts`, `functions/src/content_studio/canonical_json.ts`, `functions/src/content_studio/mode_template_repository.ts`, `functions/src/content_studio/season_draft_repository.ts`, `functions/src/content_studio/episode_draft_repository.ts`, `functions/src/content_studio/review_queue_repository.ts`, `functions/src/content_studio/localization_repository.ts`, `functions/src/content_studio/projection_rebuild.ts`, `functions/src/content_studio/gate_receipt.ts` |
| Admin callables | `functions/src/admin_content_studio.ts`, exports in `functions/src/index.ts` |
| Validation and preview | `functions/src/content_studio/validation.ts`, `functions/src/content_studio/preview.ts`, `modules/learning-v2/preview/preview_envelope.ts`, `app/learning-v2-preview.tsx`, `app/+native-intent.tsx` |
| Generator and release seam | `functions/src/content_factory/v2_episode_artifacts.ts`, `functions/src/content_factory/v2_episode_qa.ts`, `functions/src/content_factory/v2_episode_bundle.ts`, `functions/src/content_factory/v2_release_adapter.ts` |
| Admin IA | `admin/v2/scripts/pages/content-overview.js`, `content-modes.js`, `content-episodes.js`, `content-generation.js`, `content-review.js`, `content-localization.js`, `content-preview.js`, `content-releases.js`, plus the responsibility-specific `admin/v2/scripts/content-studio/` modules from `docs/v2/08-admin-content-studio-and-mode-authoring.md`; new `content-generation.js` is only the route/IA wrapper over existing `content-generator.js`, which remains the single Generation Queue implementation |
| Security and delivery | `functions/src/admin/permissions.ts`, `firestore.rules`, `firestore.indexes.json`, `storage.rules` |

## Mandatory Phase 00 — Firestore boundary before namespaces

### Task 0: Inventory legacy direct access and remove the OR-rule bypass

**External security basis:** Firebase documents that overlapping `match` statements are OR-combined and access is allowed when any matching `allow` is true: [Overlapping match statements](https://firebase.google.com/docs/firestore/security/rules-structure#overlapping_match_statements). Therefore a nested `allow ...: if false` cannot override the existing broad admin allow.

**Files:**
- Read/audit: `admin/legacy.html`, `admin/v2/scripts/admin-firebase.js`, `admin/v2/scripts/admin-core.js`, `admin/v2/scripts/pages/*.js`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Create: `functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts`
- Create: `docs/reports/learning-v2/content-studio-direct-access-inventory.md`

- [ ] **Step 1: Write the failing authenticated-admin emulator proof**

Enumerate every planned `content_*`/`content_studio_*` authoring and projection path. From an authenticated admin client, assert direct `get/list/create/update/delete` is denied for all of them. In the same suite, exercise every legacy direct path recorded in the inventory and assert its current authorized behavior remains available until migrated.

- [ ] **Step 2: Run against the current rules and verify red**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/emulator/v2_authoring_rules.emulator.test.ts --no-cache --runInBand; Pop-Location`

Expected: FAIL because the existing global `isAdmin()` catch-all overlaps the new paths; a nested `allow ...: if false` cannot override it because Firestore allows are OR-combined.

- [ ] **Step 3: Produce the direct-access inventory and restructure rules**

For every direct legacy read/write record collection/path, file/function/action, role, mutation kind, migration owner and classification `explicit_legacy_allow | migrate_to_callable | remove_after_verified_migration`. Replace the global admin catch-all with explicit legacy path allows or a tested path-excluding predicate that cannot match any planned authoring prefix. Do not use "catch-all + narrow deny". Preserve existing functionality through explicit rules while callable migrations proceed.

- [ ] **Step 4: Run the real security and compatibility gate**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/emulator/v2_authoring_rules.emulator.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/firestore_rules_security.test.ts --no-cache --runInBand`

Expected: PASS; authenticated admin direct access is denied for every future authoring/projection namespace, every inventoried not-yet-migrated legacy path has an explicit compatibility assertion, and no global catch-all matches the new prefixes.

- [ ] **Step 5: Gate namespace creation**

Do not deploy indexes, create collections, or run any Content Studio callable until the Phase 00 packet contains the inventory, before/after rules map, emulator output and rollback ruleset.

- [ ] **Step 6: Commit the verified boundary**

```powershell
git add firestore.rules tests/firestore_rules_security.test.ts functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts docs/reports/learning-v2/content-studio-direct-access-inventory.md
git commit -m "security: isolate Content Studio authoring paths"
```

### Task 1: Authoring contracts and client/backend conformance

**Files:**
- Create: `modules/learning-v2/contracts/content_studio.ts`
- Create: `modules/learning-v2/contracts/content_studio_validation.ts`
- Create: `modules/learning-v2/contracts/content_studio_canonical_json.ts`
- Create: `modules/learning-v2/policies/decision_registry.ts`
- Create: `functions/src/content_studio/contracts.ts`
- Create: `functions/src/content_studio/canonical_json.ts`
- Create: `functions/src/content_studio/decision_registry.ts`
- Create: `tests/fixtures/learning-v2/content-studio/contract-corpus.json`
- Create: `tests/fixtures/learning-v2/content-studio/hash-golden-vectors.json`
- Create: `tests/fixtures/learning-v2/content-studio/decision-registry.v1.json`
- Create: `tests/learning_v2_content_studio_contract.test.ts`
- Create: `tests/learning_v2_content_studio_canonical_json.test.ts`
- Create: `tests/learning_v2_decision_registry.test.ts`
- Create: `functions/src/content_studio/contracts.test.ts`
- Create: `functions/src/content_studio/canonical_json.test.ts`
- Create: `functions/src/content_studio/decision_registry.test.ts`

- [ ] **Step 1: Write the failing conformance tests**

```ts
it('accepts and rejects the same authoring corpus in both runtimes', () => {
  expect(validateContentStudioEntity(validTemplate).ok).toBe(true);
  expect(validateContentStudioEntity(validSeason).ok).toBe(true);
  expect(validateContentStudioEntity(validEpisode).ok).toBe(true);
  expect(validEpisodeDraft.body.schemaVersion).toBe('episode-draft-body.v1');
  expect(validEpisodeRevision.body.schemaVersion).toBe('episode-authoring-body.v1');
  expect(validSeasonDraft.body.schemaVersion).toBe('season-draft-body.v1');
  expect(validateContentStudioEntity({ ...localizedContentValue, status: 'changes_requested' }).ok).toBe(false);
  expect(validateLocalizationProjection({ ...validLocalizationProjection, status: 'changes_requested' }).ok).toBe(true);
  expect(assertNoLocalizationWorkflowMetadata(validEpisodeRevision.body)).toBeUndefined();
  expect(validEpisodeRevision.body.learningDesign).toMatchObject({ independentProbeRef: expect.any(String), delayedProbeRef: { probeId: expect.any(String), contentHash: expect.stringMatching(/^[0-9a-f]{64}$/) }, delayedWindowPolicyId: expect.any(String) });
  expect(validEpisodeRevision.body.delayedProbeDefinitions).toHaveLength(1);
  expect(validEpisodeRevision.body.delayedProbeDefinitions[0].ref.contentHash).toBe(hashCanonicalBody(validEpisodeRevision.body.delayedProbeDefinitions[0].body));
  expect(validateContentStudioEntity(delayedProbeWrongHash).issues[0]?.code).toBe('delayed_probe_definition_hash_mismatch');
  expect(validateContentStudioEntity(delayedProbeGraphNodeReuse).issues[0]?.code).toBe('delayed_probe_node_namespace_invalid');
  expect(validateContentStudioEntity(delayedProbeActivityBindingMismatch).issues[0]?.code).toBe('delayed_probe_activity_binding_mismatch');
  expect(validEpisodeRevision.body.requiredLoops).not.toHaveProperty('independentProbeNodeIds');
  expect(validEpisodeRevision.body.assessmentNodes.independentProbeNodeIds.length).toBeGreaterThan(0);
  expect(validEpisodeRevision.body.reviewLinks.every((link) => link.scheduleKind === 'optional_review' || link.scheduleKind === 'delayed_probe')).toBe(true);
  expect(validateContentStudioEntity(episodeWithIndependentProbeInsideReviewLinks).issues[0]?.code).toBe('review_link_schedule_kind_invalid');
  expect(validateContentStudioEntity(invalidNode).issues[0]?.code).toBe('node_activity_reference_missing');
});

it('produces the same canonical bytes and SHA-256 in client and Functions', () => {
  expect(canonicalJsonV1(hashGoldenVector.value)).toBe('{"schemaVersion":"hash-golden-vector.v1","value":"Phraseman V2","version":1}');
  expect(hashCanonicalBody(hashGoldenVector.value)).toBe('12ac7b1d9d7c2c06fc88a1b99abfc42f1c21fa48dc8e6c9cea88c639c1291160');
  expect(JSON.stringify(validEpisodeRevision.body)).not.toContain('revisionFingerprint');
  expect(JSON.stringify(validEpisodeRevision.body)).not.toContain('objectGeneration');
  for (const record of [validTemplate.record, validActivity.record, validEpisodeRevision.record, validSeason.record]) {
    expect(assertRecordHasNoReceiptBackrefs(record)).toBeUndefined();
  }
});

it('resolves one immutable all-eight decision registry artifact', () => {
  const resolved = resolveDecisionRegistry(decisionRegistryFixture);
  expect(Object.keys(resolved.body.decisions).sort()).toEqual([
    'HYP-V2-001', 'HYP-V2-002', 'HYP-V2-003', 'HYP-V2-004',
    'HYP-V2-005', 'HYP-V2-006', 'HYP-V2-007', 'HYP-V2-008',
  ]);
  expect(resolved.body).not.toHaveProperty('contentHash');
  expect(resolved.record.ref).toMatchObject({ id: resolved.body.registryId, version: resolved.body.version });
  expect(resolved.record.ref.contentHash).toBe(hashCanonicalBody(resolved.body));
  expect(resolved.record.object.contentHash).toBe(resolved.record.ref.contentHash);
  expect(resolved.body.decisions['HYP-V2-007'].settings.delayedWindowPolicyId).toBe('dts-7.d3-d7.v1');
  expect(() => resolveDecisionRegistry(decisionRegistryWrongHashFixture)).toThrow('decision_registry_hash_mismatch');
  expect(() => resolveDecisionRegistry(decisionRegistryMissingHyp008Fixture)).toThrow('decision_registry_incomplete');
});
```

- [ ] **Step 2: Run the tests and verify red**

Run: `npx jest --runTestsByPath tests/learning_v2_content_studio_contract.test.ts tests/learning_v2_decision_registry.test.ts --no-cache --runInBand`

Expected: FAIL because the Content Studio contracts and decision-registry resolver do not exist.

- [ ] **Step 3: Implement the canonical types and stable issue codes**

Implement the exact contracts from sections 6–10.5 of spec 08. ModeTemplate, Episode and Season each have distinct hashable `*ArtifactBody`, immutable record envelope, mutable head/lifecycle projection and append-only receipt types. Implement the concrete section 6.2 `DecisionRegistryBody` eight-entry discriminated schema, immutable `DecisionRegistryRecord.ref: VersionRef`, Storage path and `ResolvedDecisionRegistry`; body contains no own hash/object/time and resolver validates body/ref/record/object plus numeric/range/ordinal/derived-total invariants. `HYP-V2-006` must preserve independent gate/chapter/season Access Boost caps, and the initial `HYP-V2-008` milestone is internal-safe 0% until a powered experiment passport creates a new immutable registry version. ActivityInstance lifecycle belongs only to the owning Episode; it has no third mutable status model. Resolved read models compose those parts and are never serialized as canonical artifacts. Implement `canonicalJsonV1` exactly once per runtime, with RFC 8785/JCS ordering, NFC precondition, strict JSON-value rejection and SHA-256 formulas from spec 08. Client/Admin/Functions consume one enum/schema corpus: six `PreviewState` values, a separate `PreviewConditions` axis and severity `info | warning | blocking`. Fixtures use only 64 lowercase hex hashes. `revisionFingerprint` hashes `{schemaVersion, entityType, entityId, revision, contentHash}`; receipt IDs/arrays and object refs never enter body bytes or immutable artifact records. Localization workflow metadata exists only in server-owned projections/receipts; hashable bodies contain content-only values.

```ts
export type AuthoringStatus = 'draft' | 'needs_review' | 'changes_requested' | 'approved' | 'published' | 'deprecated' | 'archived';
export type V2ActivityFamily =
  | 'visual_discovery' | 'listen_choose' | 'sound_contrast' | 'sound_syllable_lab'
  | 'scripted_repeat_compare' | 'phrase_builder' | 'listen_build_dictation'
  | 'context_gap_grammar' | 'quick_spoken_response' | 'shadowing_prosody'
  | 'describe_scene' | 'microstory_radio' | 'branching_scene'
  | 'scripted_dialogue' | 'speaking_club_mission' | 'personalized_review'
  | 'speed_match';
export type ActivityTypeKey = string;
export interface LocalizedContentValue { readonly locale: string; readonly value: string; readonly sourceHash: string }
export interface VersionRef { readonly id: string; readonly version: number; readonly contentHash: string }
export type V2DecisionId = 'HYP-V2-001' | 'HYP-V2-002' | 'HYP-V2-003' | 'HYP-V2-004' | 'HYP-V2-005' | 'HYP-V2-006' | 'HYP-V2-007' | 'HYP-V2-008';
export interface DecisionRegistryBody { readonly schemaVersion: 'v2-decision-registry-body.v1'; readonly registryId: 'phraseman-v2-product-decisions'; readonly version: number; readonly decisions: { readonly [K in V2DecisionId]: Extract<V2DecisionEntry, { readonly decisionId: K }> } }
export interface DecisionRegistryRecord { readonly schemaVersion: 'v2-decision-registry-record.v1'; readonly ref: VersionRef; readonly object: ImmutableObjectRef; readonly createdAt: string }
export interface ResolvedDecisionRegistry { readonly body: DecisionRegistryBody; readonly record: DecisionRegistryRecord }
export type PolicyKind = 'scoring' | 'evidence' | 'progress' | 'reward' | 'recovery';
export interface PolicyRef { readonly kind: PolicyKind; readonly key: string; readonly version: number; readonly contentHash: string }
export interface PolicyDescriptorBody { readonly schemaVersion: 'content-studio-policy-body.v1'; readonly kind: PolicyKind; readonly key: string; readonly version: number; readonly humanName: string; readonly description: string; readonly compatibleFamilies: readonly V2ActivityFamily[]; readonly compatibleKernelKeys: readonly string[]; readonly configurableFieldPaths: readonly string[]; readonly evidenceKinds: readonly EvidenceKind[]; readonly claims: readonly ('completion' | 'accuracy' | 'spoken_attempt' | 'spoken_confident' | 'acoustic_pronunciation' | 'transfer')[] }
export interface PolicyDescriptorRecord { readonly schemaVersion: 'content-studio-policy-record.v1'; readonly ref: PolicyRef; readonly object: ImmutableObjectRef; readonly createdAt: string }
export interface ResolvedPolicyDescriptor { readonly body: PolicyDescriptorBody; readonly ref: PolicyRef }
export interface ImmutableObjectRef { readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string; readonly byteSize: number }
export type ModeTemplateVersionIdentity = Pick<ModeTemplateVersionRecord, 'schemaVersion' | 'templateId' | 'version' | 'contentHash' | 'object'>;
export type ModeTemplateDraftIdentity = Pick<ModeTemplateDraftRevisionRecord, 'schemaVersion' | 'templateId' | 'proposedVersion' | 'revision' | 'contentHash' | 'fingerprint' | 'object'>;
export type ActivityInstanceIdentity = Pick<ActivityInstanceRecord, 'schemaVersion' | 'activityId' | 'revision' | 'episodeId' | 'contentHash' | 'payloadHash' | 'object'>;
export type EpisodeGraphNodePlacement = Pick<EpisodeGraphNode, 'nodeId' | 'activityId' | 'position' | 'visible' | 'requiredForCore' | 'voiceEvidenceOptional' | 'evidenceDeclarations' | 'phase' | 'fallback' | 'gateEligible' | 'starSlotId' | 'maxStars'>;
export interface EpisodeScenarioContract { readonly scenarioId: string; readonly title: readonly LocalizedContentValue[]; readonly setting: readonly LocalizedContentValue[]; readonly learnerRole: readonly LocalizedContentValue[]; readonly partnerRole: readonly LocalizedContentValue[]; readonly communicativeGoal: readonly LocalizedContentValue[]; readonly successCondition: readonly LocalizedContentValue[]; readonly criticalConstraintIds: readonly string[] }
export interface EpisodePhraseFrame { readonly phraseFrameId: string; readonly targetPattern: string; readonly learnerMeaning: readonly LocalizedContentValue[]; readonly semanticSlotIds: readonly string[]; readonly skillIds: readonly string[]; readonly required: boolean }
export interface EpisodeSemanticSlot { readonly semanticSlotId: string; readonly role: readonly LocalizedContentValue[]; readonly acceptedTargetValues: readonly string[]; readonly allowedContentUnitIds: readonly string[]; readonly minimumDistinctValues: number; readonly requiredInCapstone: boolean; readonly critical: boolean }
export interface V2CapstoneContract { readonly objectiveIds: readonly string[]; readonly requiredSemanticSlotIds: readonly string[]; readonly criticalConstraintIds: readonly string[]; readonly primaryNodeIds: readonly string[]; readonly deterministicAlternateNodeIds: readonly string[] }
export interface EpisodeLearningDesign { readonly primaryOutcomeId: string; readonly objectiveIds: readonly string[]; readonly prerequisiteEdges: readonly { readonly from: { readonly kind: 'outcome' | 'objective'; readonly id: string; readonly sourceEpisodeId: string }; readonly toObjectiveId: string; readonly requiredState: 'exposed' | 'supported_success' | 'independent_evidence' }[]; readonly supportPlan: readonly { readonly objectiveId: string; readonly initialSupport: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none'; readonly fadeRuleId: string; readonly escalationRuleId: string }[]; readonly independentProbeRef: string; readonly delayedProbeRef: import('./episode').V2DelayedProbeRef; readonly delayedWindowPolicyId: string }
export interface V2MasteryContract { readonly evidencePolicyRef: PolicyRef & { readonly kind: 'evidence' }; readonly requirements: readonly { readonly objectiveId: string; readonly construct: 'semantic' | 'listening' | 'recall' | 'spoken' | 'interaction'; readonly phase: 'near_transfer' | 'independent_probe' | 'delayed_probe'; readonly requiredValidity: 'assessed'; readonly requiredOutcome: 'success'; readonly maximumSupport: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none' }[]; readonly durableClaimRequiresDelayedProbe: true; readonly accessibilityHandling: 'learning_non_assessment_no_failure'; readonly numericCutoffHypothesisRef: 'HYP-V2-003'; readonly performanceStarsAreLearningEvidence: false; readonly confidentVoiceTurnCountAloneIsSufficient: false }
export type V2ReviewLink =
  | { readonly scheduleKind: 'optional_review'; readonly targetEpisodeId: string; readonly delay: 'next_episode' | 'chapter_checkpoint'; readonly probeRef?: never; readonly windowPolicyId?: never; readonly skillIds: readonly string[] }
  | { readonly scheduleKind: 'delayed_probe'; readonly targetEpisodeId: string; readonly delay: 'd_plus_1' | 'd_plus_7' | 'd_plus_21'; readonly probeRef: import('./episode').V2DelayedProbeRef; readonly windowPolicyId: string; readonly skillIds: readonly string[] };
// Canonical imports from modules/learning-v2/contracts/episode.ts (pilot Task 1.2).
// Content Studio must not redeclare a reduced checkpoint/evidence shape.
export type { V2CheckpointContract, V2NodeEvidenceDeclaration, V2DelayedProbeRef, V2DelayedProbeDefinitionBody, V2ResolvedDelayedProbeDefinition } from './episode';
export interface SeasonEpisodeRevisionRef { readonly draftId: string; readonly episodeId: string; readonly revision: number; readonly revisionFingerprint: string; readonly contentHash: string; readonly ordinal: number; readonly chapterId: string }
export interface SeasonGateDefinition { readonly gateId: string; readonly targetEpisodeId: string; readonly priorEpisodeId: string; readonly localEarnedMinimum: number; readonly requiredCumulativeAccess: number; readonly requiresPriorLoopsComplete: true; readonly requiredCheckpointEpisodeId?: string; readonly accessBoostPolicyKey: string }
export type SeasonReleaseScope =
  | { readonly kind: 'vertical_slice'; readonly includedChapterOrdinals: readonly [1]; readonly includedEpisodeOrdinals: readonly [1] }
  | { readonly kind: 'chapter_internal'; readonly includedChapterOrdinals: readonly [1]; readonly includedEpisodeOrdinals: readonly number[] }
  | { readonly kind: 'full_season'; readonly includedChapterOrdinals: readonly [1, 2, 3, 4]; readonly includedEpisodeOrdinals: readonly number[] };
export type SeasonDraftIdentity = Pick<SeasonDraftRevisionRecord, 'schemaVersion' | 'draftId' | 'seasonId' | 'revision' | 'contentHash' | 'fingerprint' | 'object'>;
export type SeasonRevisionIdentity = Pick<SeasonRevisionRecord, 'schemaVersion' | 'draftId' | 'seasonId' | 'revision' | 'contentHash' | 'revisionFingerprint' | 'object'>;
export type EpisodeDraftIdentity = Pick<EpisodeDraftRevisionRecord, 'schemaVersion' | 'draftId' | 'episodeId' | 'revision' | 'contentHash' | 'fingerprint' | 'object'>;
export type EpisodeRevisionIdentity = Pick<EpisodeRevisionRecord, 'schemaVersion' | 'draftId' | 'episodeId' | 'revision' | 'contentHash' | 'revisionFingerprint' | 'object'>;
export interface ContentStudioIssue { readonly code: string; readonly path: string; readonly severity: 'info' | 'warning' | 'blocking'; readonly waivable: boolean }
```

The bodies include every content field from spec 08: actual per-episode `EpisodeLearningDesign`, versioned evidence-policy mastery requirements, separate independent assessment nodes, phase-correlated declarations plus `LearningPedagogicalContextContract`, canonical `V2ReviewLink` scheduler links, canonical hash-free delayed-probe definitions plus typed refs, canonical `PublishedModeTemplateRef {templateId,version,contentHash}`, canonical discriminated `VoiceReleaseRequirements` from doc 06 (exact specialized calibration/policy refs, processing mode, registry key, purposes and `VoiceNetworkEgressRef`), an Episode per-template aggregate that cannot weaken them, and SeasonRevision `decisionRegistryRef: VersionRef`. Any referenced VoiceDataPolicy resolves immutable localized `VoiceConsentCopyRef`, specialized `VoiceDeletionRouteRef` and `VoiceMinorsPolicyRef`; Content Studio cannot replace them with strings or author per-user classification/guardian/consent/eligibility. `near_transfer` belongs only to `requiredLoops`, `independent_probe` only to `assessmentNodes`, and neither may be serialized in `reviewLinks`; those links contain only `optional_review` or scheduler-owned `delayed_probe`. Review-link `delay` is only delivery cadence; assessable DTS/durable timing comes from a server assignment/launch/timing receipt under the pinned `HYP-V2-007` window (currently D+3…D+7), so D+1/D+21 review delivery cannot create durable success. Records contain identity/hash/object/provenance only; lifecycle and append-only receipt sets stay separate and resolve by subject fingerprint. Tests assert bodies have no self hash/object/lifecycle/receipt or localization workflow metadata, records have no receipt backrefs, `EpisodeGraphNode` owns route/reward/phase/context fields, delayed `probeNodeId` stays outside graph/loops/stars/checkpoint while binding exact ActivityInstance/template/declarations/context, checkpoint node/requirement/objective sets and independent subsets match, independent probes never enter the two-loop gate for an ordinary episode, explicit checkpoint pass is the only independent-evidence chapter-boundary exception, delayed probes never gate access, every accessibility route can reach access-required star slots, and stars/voice-turn counts never satisfy learning-evidence/mastery validation. `V2CheckpointContract`, `V2NodeEvidenceDeclaration`, delayed-probe, template-ref and voice-governance types are imported from canonical runtime contracts; compile/schema tests reject a local shadow or reduced copy. Mirror strict parsers in Functions; both runtimes consume the same corpus, reject unknown/omitted fields and return the same ordered issue codes.

- [ ] **Step 4: Run client and Functions conformance tests**

Run: `npx jest --runTestsByPath tests/learning_v2_content_studio_contract.test.ts tests/learning_v2_content_studio_canonical_json.test.ts tests/learning_v2_decision_registry.test.ts --no-cache --runInBand; Push-Location functions; npx jest --runTestsByPath src/content_studio/contracts.test.ts src/content_studio/canonical_json.test.ts src/content_studio/decision_registry.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS; both suites report identical accepted fixture IDs and issue-code arrays.

- [ ] **Step 5: Commit the contracts**

```powershell
git add modules/learning-v2/contracts/content_studio.ts modules/learning-v2/contracts/content_studio_validation.ts modules/learning-v2/contracts/content_studio_canonical_json.ts modules/learning-v2/policies/decision_registry.ts functions/src/content_studio/contracts.ts functions/src/content_studio/canonical_json.ts functions/src/content_studio/decision_registry.ts functions/src/content_studio/contracts.test.ts functions/src/content_studio/canonical_json.test.ts functions/src/content_studio/decision_registry.test.ts tests/fixtures/learning-v2/content-studio/contract-corpus.json tests/fixtures/learning-v2/content-studio/hash-golden-vectors.json tests/fixtures/learning-v2/content-studio/decision-registry.v1.json tests/learning_v2_content_studio_contract.test.ts tests/learning_v2_content_studio_canonical_json.test.ts tests/learning_v2_decision_registry.test.ts
git commit -m "feat: define V2 Content Studio contracts"
```

### Task 2: Code-owned capability catalog and app-support manifest

**Files:**
- Create: `modules/learning-v2/registry/mode_capability_catalog.ts`
- Create: `modules/learning-v2/content/app_support_manifest.ts`
- Create: `functions/src/content_studio/app_support_manifest.ts`
- Create: `tests/learning_v2_mode_capability_catalog.test.ts`
- Create: `functions/src/content_studio/app_support_manifest.test.ts`

- [ ] **Step 1: Write failing catalog tests**

```ts
it('exposes all 17 runtime families, keeps checkpoint separate, and has no executable admin field', () => {
  expect(V2_ACTIVITY_FAMILIES).toHaveLength(17);
  expect(resolveKernelCapability('phrase.build.v1', 1)).toMatchObject({ family: 'phrase_builder', activityTypeKey: 'phrase.build.v1', rendererKey: 'composer.phrase_builder.v1' });
  expect(validateCheckpointContract(checkpointContractFixture).ok).toBe(true);
  expect(checkpointContractFixture.evidenceRequirements.every((requirement) => requirement.phase === 'independent_probe')).toBe(true);
  expect(checkpointContractFixture.criticalConstraintIds.length).toBeGreaterThan(0);
  expect(validateCheckpointContract(checkpointWithDelayedRequirement).issues[0]?.code).toBe('checkpoint_delayed_requirement_forbidden');
  expect(JSON.stringify(APP_SUPPORT_MANIFEST)).not.toContain('implementationPath');
  expect(CAPABILITY_CATALOG.body).not.toHaveProperty('contentHash');
  expect(CAPABILITY_CATALOG.record.contentHash).toBe(hashCanonicalBody(CAPABILITY_CATALOG.body));
  expect(JSON.stringify(APP_SUPPORT_MANIFEST.body)).not.toContain('manifestHash');
  expect(APP_SUPPORT_MANIFEST.record.manifestHash).toBe(hashCanonicalBody(APP_SUPPORT_MANIFEST.body));
  expect(APP_SUPPORT_MANIFEST.body.voiceNetworkEgressRefs).toEqual(
    expect.arrayContaining([DEPLOYED_VOICE_NETWORK_EGRESS_REF]),
  );
  expect(resolveVoiceNetworkEgress(DEPLOYED_VOICE_NETWORK_EGRESS_REF).body).toMatchObject({
    dispatchLifecycleProtocol: 'reservation-consume-settle-reconcile.v1',
    providerFinalityContract: 'terminal-no-future-writes.v1',
    dispatchDeletionBinding: 'operation-target-settlement-hash.v1',
  });
  for (const policy of Object.values(CAPABILITY_CATALOG.body.policies)) {
    expect(policy.ref).toMatchObject({ kind: policy.body.kind, key: policy.body.key, version: policy.body.version });
    expect(policy.ref.contentHash).toBe(hashCanonicalBody(policy.body));
  }
  expect(() => validatePolicyDescriptorPair(policyDescriptorWithWrongBodyHash)).toThrow('content_studio_policy_descriptor_hash_mismatch');
  expect(() => validateTemplatePolicies(templateMissingRecoveryPolicy, CAPABILITY_CATALOG, APP_SUPPORT_MANIFEST)).toThrow('content_studio_policy_set_incomplete');
  expect(() => validateTemplatePolicies(templateWithSameKeyVersionWrongHash, CAPABILITY_CATALOG, APP_SUPPORT_MANIFEST)).toThrow('content_studio_policy_hash_mismatch');
  expect(Object.keys(validTemplate.body.policies).sort()).toEqual(['evidence', 'progress', 'recovery', 'reward', 'scoring']);
});
```

- [ ] **Step 2: Verify the catalog test is red**

Run: `npx jest --runTestsByPath tests/learning_v2_mode_capability_catalog.test.ts --no-cache --runInBand`

Expected: FAIL with module-not-found for `mode_capability_catalog`.

- [ ] **Step 3: Implement the catalog and manifest**

```ts
export interface ExecutableKernelCapability {
  readonly family: V2ActivityFamily;
  readonly activityTypeKey: ActivityTypeKey;
  readonly kernelVersion: number;
  readonly rendererKey: string;
  readonly rendererSchemaVersion: number;
  readonly compatiblePolicyRefs: Readonly<Record<PolicyKind, readonly PolicyRef[]>>;
  readonly payloadSchemaKey: string;
  readonly previewStateIds: readonly string[];
  readonly requiredAppCapabilities: readonly string[];
}
export const V2_ACTIVITY_FAMILIES: readonly V2ActivityFamily[] = Object.freeze([
  'visual_discovery', 'listen_choose', 'sound_contrast', 'sound_syllable_lab',
  'scripted_repeat_compare', 'phrase_builder', 'listen_build_dictation', 'context_gap_grammar',
  'quick_spoken_response', 'shadowing_prosody', 'describe_scene', 'microstory_radio',
  'branching_scene', 'scripted_dialogue', 'speaking_club_mission', 'personalized_review',
  'speed_match',
]);
```

`family`, `activityTypeKey`, and executable kernel are separate fields; checkpoint stays episode-level. A policy is an explicit `PolicyDescriptorBody` without hash plus `PolicyRef`, where ref kind/key/version equal the body and `ref.contentHash=hashCanonicalBody(body)`; its immutable `PolicyDescriptorRecord.ref/object.contentHash` must match. Capability catalog stores each resolved `{body, ref}` pair. Require exact refs in kernel compatibility, support manifests and all five ModeTemplate policy slots. Same key/version with a different hash, body/ref or record/object mismatch, kind mismatch, or any missing scoring/evidence/progress/reward/recovery slot fails closed. Build `ContentStudioCapabilityCatalogBody` and immutable record where `contentHash=hash(body)`; build `AppCapabilitySupportManifestBody` and record where `manifestHash=hash(body)`. App support body carries typed `voiceNetworkEgressRefs`; each resolves to exact deployed backend body/record and, for network activation, must attest `reservation-consume-settle-reconcile.v1`, terminal-no-future-writes provider finality and settlement-hash-bound deletion. Bodies must not contain their **own** self hash/object/record; nested external policy/egress pins are expected. Functions recomputes catalog/support and nested policy/egress body hashes and rejects template refs or policy/egress refs absent from pinned body-record pairs. Missing lifecycle capability returns non-waivable `voice_network_dispatch_lifecycle_unsupported`. Add these objects to the shared golden/self-reference corpus alongside ModeTemplate/Episode/Season, preview envelope and season release manifest.

- [ ] **Step 4: Run catalog and backend compatibility tests**

Run: `npx jest --runTestsByPath tests/learning_v2_mode_capability_catalog.test.ts --no-cache --runInBand; Push-Location functions; npx jest --runTestsByPath src/content_studio/app_support_manifest.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS, including unknown kernel/version fail-closed, exact five-policy completeness/hash validation, exact 17-family exhaustiveness, and checkpoint fixture validation outside the catalog.

- [ ] **Step 5: Commit the catalog**

```powershell
git add modules/learning-v2/registry/mode_capability_catalog.ts modules/learning-v2/content/app_support_manifest.ts functions/src/content_studio/app_support_manifest.ts functions/src/content_studio/app_support_manifest.test.ts tests/learning_v2_mode_capability_catalog.test.ts
git commit -m "feat: add V2 mode capability catalog"
```

### Task 3: Immutable ModeTemplate versions, clone, deprecate, and localization

**Files:**
- Create: `modules/learning-v2/authoring/mode_template.ts`
- Create: `functions/src/content_studio/mode_template_repository.ts`
- Create: `functions/src/content_studio/storage_paths.ts`
- Create: `tests/learning_v2_mode_template.test.ts`
- Create: `functions/src/content_studio/mode_template_repository.test.ts`
- Create: `functions/src/content_studio/storage_paths.test.ts`

- [ ] **Step 1: Write failing immutable-operation tests**

```ts
it('uses version for immutable templates and revision only for mutable drafts/heads', () => {
  expect(createNextModeTemplateDraft(basePublished, patch)).toMatchObject({ body: { templateId: basePublished.body.templateId, baseVersion: 1, proposedVersion: 2 }, record: { revision: 1 } });
  expect(localizeModeTemplateDraft(basePublished, { locale: 'es', name: 'Constructor de frases', instructions: 'Ordena los bloques' }, 'actor-3')).toMatchObject({ body: { proposedVersion: 2 }, record: { revision: 1 } });
  expect(cloneModeTemplateVersion(basePublished, 'template-es-phrase-builder', 'actor-4')).toMatchObject({ body: { templateId: 'template-es-phrase-builder', proposedVersion: 1 }, record: { revision: 1 } });
  const deprecated = deprecateModeTemplateVersion(basePublished, 'replaced_by_v2', 'actor-5');
  expect(deprecated.body).toBe(basePublished.body);
  expect(deprecated.record).toBe(basePublished.record);
  expect(deprecated.lifecycle).toMatchObject({ templateId: basePublished.body.templateId, version: 1, contentHash: basePublished.record.contentHash, status: 'deprecated', reason: 'replaced_by_v2' });
  expect(deprecated.auditEvent).toMatchObject({ action: 'mode_template.deprecated', actorId: 'actor-5' });
  expect(modeTemplateDraftRevisionPath('template-1', 2, 3)).toBe('content_mode_template_draft_revisions/template-1__p2__r3');
  expect(modeTemplateDraftObjectPath('template-1', 2, 3, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toContain('/p2/r3/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json');
});
```

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/learning_v2_mode_template.test.ts --no-cache --runInBand`

Expected: FAIL because the immutable operations are undefined.

- [ ] **Step 3: Implement pure operations and append-only repository paths**

```ts
export const modeTemplateHeadPath = (templateId: string) => `content_mode_templates/${templateId}`;
export const modeTemplateDraftRevisionPath = (templateId: string, proposedVersion: number, revision: number) => `content_mode_template_draft_revisions/${templateId}__p${proposedVersion}__r${revision}`;
export const modeTemplateVersionPath = (templateId: string, version: number) => `content_mode_template_versions/${templateId}__v${version}`;
export const modeTemplateDraftObjectPath = (templateId: string, proposedVersion: number, revision: number, fingerprint: string) => `content-studio/mode-template-drafts/${sha256(templateId)}/p${proposedVersion}/r${revision}/${fingerprint}.json`;
export const modeTemplateVersionObjectPath = (templateId: string, version: number, contentHash: string) => `content-studio/mode-templates/${sha256(templateId)}/v${version}/${contentHash}.json`;
export function createNextModeTemplateDraft(current: ModeTemplateVersion, patch: Readonly<Partial<ModeTemplateArtifactBody>>): ModeTemplateDraftArtifactBody {
  const data = applyAllowedPatch(current.body, patch);
  return Object.freeze({ schemaVersion: 'mode-template-draft-body.v1', templateId: current.body.templateId, baseVersion: current.body.version, proposedVersion: current.body.version + 1, data: omitPublishedIdentityFields(data) });
}
```

Every accepted save canonicalizes only `ModeTemplateDraftArtifactBody`, writes those bytes to Storage, then creates `ModeTemplateDraftRevisionRecord` with content hash/object/fingerprint and advances the mutable head after checking expected revision/fingerprint. Approval/publish writes only `ModeTemplateArtifactBody` bytes with exactly five hash-pinned `PolicyRef` values, creates an immutable `ModeTemplateVersionRecord`, and separately creates/advances `ModeTemplateLifecycleHead`; receipts remain append-only documents resolved by subject fingerprint, never record backrefs. Every template binding/fallback/replacement uses the one canonical `PublishedModeTemplateRef {templateId,version,contentHash}`; generic `{id,version,contentHash}` is a compile/schema failure. A voice template additionally stores the canonical discriminated `VoiceReleaseRequirements`: on-device forbids every network field, while network pins exact policy/registry/purposes/egress and fallback; the UI selects only approved exact refs and cannot type a free-form provider/deletion/minors/copy key. Never serialize the resolved `ModeTemplateVersion`. Lifecycle changes preserve body/record bytes and append audit. Tests recompute hash from downloaded body, reject a body containing self hash/object/receipt, reject generic/identity-mismatched template refs, verify clone/delayed binding byte equality, reject incomplete/hash-mismatched policies or voice refs, fail network publish without the deployed egress capability and compare client/server golden vectors.

- [ ] **Step 4: Run domain and repository tests**

Run: `npx jest --runTestsByPath tests/learning_v2_mode_template.test.ts --no-cache --runInBand; Push-Location functions; npx jest --runTestsByPath src/content_studio/mode_template_repository.test.ts src/content_studio/storage_paths.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS; every accepted draft save has an immutable draft-revision metadata/object pair, mutation attempts against published content/object fields are rejected, lifecycle-only deprecate/archive preserves `version/contentHash/object`, audit is append-only, and stale mutable heads do not advance.

- [ ] **Step 5: Commit template versioning**

```powershell
git add modules/learning-v2/authoring/mode_template.ts functions/src/content_studio/mode_template_repository.ts functions/src/content_studio/storage_paths.ts functions/src/content_studio/mode_template_repository.test.ts functions/src/content_studio/storage_paths.test.ts tests/learning_v2_mode_template.test.ts
git commit -m "feat: version V2 mode templates immutably"
```

### Task 4: SeasonDraft, ActivityInstance, and EpisodeDraft operations

**Files:**
- Create: `modules/learning-v2/authoring/episode_draft.ts`
- Create: `modules/learning-v2/authoring/episode_graph.ts`
- Create: `modules/learning-v2/authoring/season_draft.ts`
- Create: `functions/src/content_studio/episode_draft_repository.ts`
- Create: `functions/src/content_studio/season_draft_repository.ts`
- Read: `modules/learning-v2/progress/gate_policy.ts`
- Read: `tests/learning_v2_gate_policy.test.ts`
- Create: `tests/learning_v2_episode_draft_editor.test.ts`
- Create: `tests/learning_v2_season_authoring.test.ts`
- Create: `tests/fixtures/learning-v2/content-studio/season-full-contract.json`
- Create: `functions/src/content_studio/episode_draft_repository.test.ts`
- Create: `functions/src/content_studio/season_draft_repository.test.ts`

- [ ] **Step 1: Write failing graph-operation tests**

```ts
it('keeps activity content separate from graph-owned route, phase, fallback, and star fields', () => {
  const withActivity = addActivityInstance(emptyDraft, phraseBuilderInstance);
  const withPrimary = addEpisodeGraphNode(withActivity, primaryNode);
  const withAlternate = addEpisodeGraphNode(withPrimary, alternateNode);
  const branched = connectEpisodeGraphNodes(withAlternate, { edgeId: 'edge-1', fromNodeId: 'node-1', toNodeId: 'node-2', condition: 'fallback_selected' });
  expect(validateEpisodeGraph(branched)).toEqual([]);
  expect(() => removeEpisodeGraphNode(branched, 'node-2')).toThrow('episode_node_has_edges');
  expect(() => removeActivityInstance(branched, alternateNode.activityId)).toThrow('episode_activity_has_nodes');
  expect(cloneEpisodeDraft(branched, { draftId: 'draft-ep02', episodeId: 'ep-02', ordinal: 2 }).revision).toBe(1);
});

it('validates vertical-slice, chapter-internal, and production season scopes', () => {
  const slice = pinApprovedEpisodeRevisions(verticalSliceDraft, approvedEpisodeRefs.slice(0, 1), gatePolicyCatalog);
  expect(slice.body.releaseScope.kind).toBe('vertical_slice');
  expect(slice.body.episodeRevisionRefs.map((ref) => ref.ordinal)).toEqual([1]);
  expect(slice.body.gates).toEqual([]);
  expect(() => assertSeasonEnvironmentEligible(slice, 'production')).toThrow('season_scope_not_production_eligible');

  const chapter = pinApprovedEpisodeRevisions(chapterInternalDraft, approvedEpisodeRefs.slice(0, 8), gatePolicyCatalog);
  expect(chapter.body.releaseScope.kind).toBe('chapter_internal');
  expect(chapter.body.episodeRevisionRefs.map((ref) => ref.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(chapter.body.chapters[0]?.checkpointEpisodeId).toBe('ep-08');
  expect(chapter.body.gates).toHaveLength(7);

  const season = pinApprovedEpisodeRevisions(fullSeasonDraft, approvedEpisodeRefs, gatePolicyCatalog);
  expect(season.body.releaseScope.kind).toBe('full_season');
  expect(season.body).toMatchObject(fullSeasonContractFixture);
  expect(season.body.episodeRevisionRefs).toHaveLength(32);
  expect(season.body.chapters.map((chapter) => chapter.episodeIds.length)).toEqual([8, 8, 8, 8]);
  expect(season.body.chapters.map((chapter) => chapter.checkpointEpisodeId)).toEqual(['ep-08', 'ep-16', 'ep-24', 'ep-32']);
  expect(season.body.gates).toHaveLength(31);
  expect(season.body.gates).toEqual(materializeSeasonGates(approvedEpisodeRefs, gatePolicyCatalog.get(season.body.gatePolicyVersion)));
  expect(season.body.decisionRegistryRef).toEqual(decisionRegistryRecord.ref);
  expect(resolveSeasonDecisionSettings(season.body, decisionRegistryRecord)).toMatchObject({ decisionIds: ['HYP-V2-001', 'HYP-V2-002', 'HYP-V2-003', 'HYP-V2-004', 'HYP-V2-005', 'HYP-V2-006', 'HYP-V2-007', 'HYP-V2-008'] });
  expect(() => resolveSeasonDecisionSettings(season.body, decisionRegistryWithMissingHyp007)).toThrow('season_decision_registry_incomplete_or_mismatched');
  expect(() => pinApprovedEpisodeRevisions(emptySeasonDraft, [staleEpisodeRef], gatePolicyCatalog)).toThrow('season_episode_revision_not_approved_or_stale');
  expect(cloneSeasonDraft(season, { draftId: 'season-draft-clone', seasonId: 'season-clone' })).toMatchObject({ revision: 1, status: 'draft' });
});
```

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/learning_v2_episode_draft_editor.test.ts tests/learning_v2_season_authoring.test.ts --no-cache --runInBand`

Expected: FAIL because graph/season operations and repositories are undefined.

- [ ] **Step 3: Implement deterministic graph operations**

Implement separate operations for `ActivityInstance` content (`addActivityInstance`, `updateActivityInstance`, `removeActivityInstance`) and graph placement (`addEpisodeGraphNode`, `updateEpisodeGraphNode`, `removeEpisodeGraphNode`, `moveEpisodeGraphNode`, `connectEpisodeGraphNodes`, `disconnectEpisodeGraphNodes`, `setStartNode`). Graph-node operations exclusively own `requiredForCore`, `voiceEvidenceOptional`, phase-correlated exact bounded `evidenceDeclarations`, immutable `pedagogicalContextContract`, `phase`, `gateEligible`, `starSlotId/maxStars`, and fallback `alternateNodeId`; ActivityInstance has no standalone lifecycle status. Clone must assign new draft/episode/activity IDs, graph node IDs and scheduler-only delayed probe/probe-node IDs; remap edges, fallback alternate-node IDs, `starSlots.acceptedNodeIds`, two-loop `requiredLoops`, separate `assessmentNodes.independentProbeNodeIds`, checkpoint evidence/alternate/repair node refs, delayed definition activity/template/declaration/context bindings, typed `learningDesign.delayedProbeRef` and canonical review links; recompute every delayed definition hash while preserving each exact canonical `templateRef.templateId + version + contentHash`; create a new subject fingerprint with no validation/preview/review/waiver receipt set; set episode draft `revision: 1` and status `draft`. Episode identity uses draft revision and immutable `EpisodeRevision`; it has no template-style `proposedVersion`. Independent probes remain assessment, not an access-required loop except through the explicit checkpoint-pass boundary; delayed probes are scheduler definitions/links, never graph access blockers or checkpoint requirements. Their D+1/D+7/D+21 cadence does not define mastery timing: only a server-finalized candidate with exact assignment/launch/timing receipts inside the `HYP-V2-007` D+3…D+7 window may become DTS/durable evidence; other deliveries are learning/review with typed non-assessment.

Implement `createSeasonDraft`, `pinApprovedEpisodeRevision`, `replacePinnedEpisodeRevision`, `reorderSeasonEpisode`, `materializeSeasonGates`, `validateSeasonComposition`, `assertSeasonEnvironmentEligible`, `resolveSeasonDecisionSettings`, and `cloneSeasonDraft`. A season pins only exact approved `EpisodeRevision` refs with revision/fingerprint/content hash plus one exact `decisionRegistryRef: VersionRef`; resolver recomputes its body hash and requires `HYP-V2-001..008`. Validation is scope-aware: `vertical_slice` is exactly E1 and lab/staging-only; `chapter_internal` is exactly E1–E8 with checkpoint E8 and internal staging-only; production-eligible `full_season` is 32 continuous ordinals, four chapters of eight, and checkpoints E8/E16/E24/E32. Within any scope E1 has no gate, each later included episode has exactly one gate. `materializeSeasonGates` must import the same pure policy/table from `modules/learning-v2/progress/gate_policy.ts` that runtime/tests use; it may select an immutable `gatePolicyVersion`, but that version must resolve under `HYP-V2-005` of the pinned registry and cannot copy or invent a second threshold formula. Retry cap/cutoffs/star budget/boost price/delayed-window IDs/rollout settings likewise resolve under `HYP-V2-002..008`. The admin cannot enter a custom numeric decision. Replacing/reordering an episode appends a new immutable SeasonRevision and makes receipt documents for the old subject fingerprint stale without mutating that record. Clone assigns new season/draft IDs, preserves scope, pinned immutable episode refs, gate-policy version and decision-registry ref, then starts a new lifecycle/subject fingerprint with no approval or receipt set.

```ts
export function mutateEpisodeDraft(current: EpisodeDraft, expectedRevision: number, expectedFingerprint: string, mutate: (body: EpisodeDraftArtifactBody) => EpisodeDraftArtifactBody): EpisodeDraft {
  if (current.record.revision !== expectedRevision || current.record.fingerprint !== expectedFingerprint) throw new Error('authoring_revision_stale');
  const body = mutate(current.body);
  return persistEpisodeDraftBody(body, current.record.revision + 1, current.record, 'draft');
}
```

- [ ] **Step 4: Run graph and repository tests**

Run: `npx jest --runTestsByPath tests/learning_v2_gate_policy.test.ts tests/learning_v2_episode_draft_editor.test.ts tests/learning_v2_season_authoring.test.ts --no-cache --runInBand; Push-Location functions; npx jest --runTestsByPath src/content_studio/episode_draft_repository.test.ts src/content_studio/season_draft_repository.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS, including DAG/reachability, exact-ID remapping, stale revision/fingerprint cases, exact approved episode pins, scope-specific E1/E1–E8/32 composition and checkpoints, deterministic gates, environment eligibility, and season clone invalidation.

- [ ] **Step 5: Commit episode authoring operations**

```powershell
git add modules/learning-v2/authoring/episode_draft.ts modules/learning-v2/authoring/episode_graph.ts modules/learning-v2/authoring/season_draft.ts functions/src/content_studio/episode_draft_repository.ts functions/src/content_studio/season_draft_repository.ts functions/src/content_studio/episode_draft_repository.test.ts functions/src/content_studio/season_draft_repository.test.ts tests/fixtures/learning-v2/content-studio/season-full-contract.json tests/learning_v2_episode_draft_editor.test.ts tests/learning_v2_season_authoring.test.ts
git commit -m "feat: add V2 season and episode authoring operations"
```

### Task 5: Callables, permissions, indexes, storage, audit, and concurrency

**Files:**
- Create: `functions/src/admin_content_studio.ts`
- Create: `functions/src/admin_content_studio.test.ts`
- Modify: `functions/src/admin/roles.ts`
- Modify: `functions/src/admin/permissions.ts`
- Modify: `functions/src/admin/permissions.test.ts`
- Modify: `functions/src/admin_content_stages.ts`
- Modify: `functions/src/admin_content_stages.test.ts`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/pages/content-generator.js`
- Modify: `tests/admin_v2_r7_permission_contract.test.ts`
- Modify: `functions/src/content_studio/storage_paths.ts`
- Modify: `functions/src/content_studio/storage_paths.test.ts`
- Modify: `functions/src/content_factory/artifact_storage.ts`
- Modify: `functions/src/content_factory/artifact_storage.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `storage.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Modify: `functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts`
- Create: `tests/storage_rules_content_release_contract.test.ts`

- [ ] **Step 1: Write failing permission, replay, conflict, and rules tests**

```ts
expect(hasPermission('content_editor', 'content.draft.write')).toBe(true);
expect(hasPermission('content_editor', 'content.review')).toBe(false);
expect(hasPermission('content_reviewer', 'content.review')).toBe(true);
expect(hasPermission('content_reviewer', 'content.draft.write')).toBe(false);
expect(hasPermission('content_editor', 'content.publish')).toBe(false);
expect(parseEpisodeMutationRequest({ draftId: 'draft-1', expectedRevision: 3, expectedFingerprint: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', idempotencyKey: 'op-1', requestId: 'req-1', mutation: { kind: 'set_title', value: 'Hello' } }).expectedRevision).toBe(3);
await expect(reviewModeTemplate({ actorUid: creatorUid, decision: 'approved', reviewFingerprint })).rejects.toThrow('content_review_self_review_forbidden');
await expect(reviewV2Season({ actorUid: lastEditorUid, decision: 'approved', reviewFingerprint })).rejects.toThrow('content_review_self_review_forbidden');
await expect(reviewV2Episode({ actorUid: lastEditorUid, decision: 'changes_requested', reviewFingerprint })).rejects.toThrow('content_review_self_review_forbidden');
expect(activityInstanceObjectPath('draft-global-1', 4, 'activity-2', 3, 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')).toBe('content-studio/activity-instances/' + sha256('draft-global-1') + '/er4/' + sha256('activity-2') + '/r3/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.json');
expect(seasonObjectPath('season-draft-1', 4, 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd')).toBe('content-studio/seasons/' + sha256('season-draft-1') + '/r4/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.json');
```

This task is blocked until Task 0 passes. Rules/emulator tests enumerate every new authoring, lifecycle, review/localization projection, receipt, waiver, preview and manifest collection and prove direct read/write denial from an authenticated admin, not merely an unauthenticated user. They also rerun the explicit legacy compatibility inventory. A nested deny under a remaining global admin catch-all is an automatic failure. Authoring Storage paths are denied; authenticated release clients can `get` `course-releases/**`, while list/write remain denied.

- [ ] **Step 2: Verify red**

Run: `Push-Location functions; npx jest --runTestsByPath src/admin/permissions.test.ts src/admin_content_studio.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/firestore_rules_security.test.ts tests/storage_rules_content_release_contract.test.ts --no-cache --runInBand`

Expected: FAIL for missing permissions, callables, collection guards, and Storage rule.

- [ ] **Step 3: Implement guarded server operations**

Use only the canonical pilot permissions `content.read`, `content.draft.write`, `content.review`, and `content.publish`. Add role `content_reviewer`; ModeTemplate/Season/Episode/stage review, ModeTemplate publish/deprecate, waiver, and localization approval use `content.review`; only release seal/activate/pause/rollback uses `content.publish`. Migrate the existing stage path end-to-end: `admin_content_stages.ts`, Functions permission tests, `admin-core.js`, `content-generator.js` and browser role contract. The server must reject a publisher lacking review permission even if old UI invokes the action; the reviewer UI must expose the action without publish. Export the spec-08 callable surface from `functions/src/index.ts`, including explicit submit/review operations:

```ts
export const adminGetV2ContentCapabilities = onCall(callableOptions, getV2ContentCapabilitiesHandler);
export const adminListModeTemplates = onCall(callableOptions, listModeTemplatesHandler);
export const adminGetModeTemplate = onCall(callableOptions, getModeTemplateHandler);
export const adminSaveModeTemplateDraft = onCall(callableOptions, saveModeTemplateDraftHandler);
export const adminCloneModeTemplate = onCall(callableOptions, cloneModeTemplateHandler);
export const adminSubmitModeTemplateReview = onCall(callableOptions, submitModeTemplateReviewHandler);
export const adminReviewModeTemplate = onCall(callableOptions, reviewModeTemplateHandler);
export const adminPublishModeTemplate = onCall(callableOptions, publishModeTemplateHandler);
export const adminDeprecateModeTemplate = onCall(callableOptions, deprecateModeTemplateHandler);
export const adminListV2Seasons = onCall(callableOptions, listV2SeasonsHandler);
export const adminGetV2Season = onCall(callableOptions, getV2SeasonHandler);
export const adminSaveV2SeasonDraft = onCall(callableOptions, saveV2SeasonDraftHandler);
export const adminCloneV2Season = onCall(callableOptions, cloneV2SeasonHandler);
export const adminValidateV2Season = onCall(callableOptions, validateV2SeasonHandler);
export const adminSubmitV2SeasonReview = onCall(callableOptions, submitV2SeasonReviewHandler);
export const adminReviewV2Season = onCall(callableOptions, reviewV2SeasonHandler);
export const adminListV2Episodes = onCall(callableOptions, listV2EpisodesHandler);
export const adminGetV2Episode = onCall(callableOptions, getV2EpisodeHandler);
export const adminSaveV2EpisodeDraft = onCall(callableOptions, saveV2EpisodeDraftHandler);
export const adminCloneV2Episode = onCall(callableOptions, cloneV2EpisodeHandler);
export const adminValidateV2Episode = onCall(callableOptions, validateV2EpisodeHandler);
export const adminSubmitV2EpisodeReview = onCall(callableOptions, submitV2EpisodeReviewHandler);
export const adminReviewV2Episode = onCall(callableOptions, reviewV2EpisodeHandler);
export const adminCreateContentWaiver = onCall(callableOptions, createContentWaiverHandler);
export const adminListV2ReviewQueue = onCall(callableOptions, listV2ReviewQueueHandler);
```

Every write transaction checks expected revision/fingerprint, claims idempotency, writes canonical `*ArtifactBody` bytes, creates an immutable identity/hash/object/provenance record, advances only the head/lifecycle projection, appends receipts/audit, and registers orphaned Storage objects on transaction failure. Artifact records never receive validation/preview/review receipt IDs or arrays. Receipts resolve by exact entity type/id/revision/fingerprint. No resolved aggregate is written as canonical JSON. Submit freezes the exact body-derived fingerprint. Review accepts only `approved | changes_requested`, requires a fresh fingerprint and rejects self-review. Approval/seal transaction rechecks the bounded fresh receipt set and writes a separate hashable `ContentGateReceiptBody + Record`; it never mutates the artifact record. Add bounded indexes for heads, review/localization projections and preview receipts. Direct Firestore access remains denied after the Phase 00 catch-all replacement.

- [ ] **Step 4: Run focused security tests**

Run: `Push-Location functions; npx jest --runTestsByPath src/admin/permissions.test.ts src/admin_content_studio.test.ts src/admin_content_stages.test.ts src/content_studio/storage_paths.test.ts src/content_factory/artifact_storage.test.ts src/content_studio/emulator/v2_authoring_rules.emulator.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_r7_permission_contract.test.ts tests/firestore_rules_security.test.ts tests/storage_rules_content_release_contract.test.ts --no-cache --runInBand`

Expected: PASS with replay returning the original result, stale revision/fingerprint rejected, immutable template/season/episode/activity records unchanged and free of receipt backrefs, receipt sets/gate receipts bound to exact subject fingerprints, ActivityInstance lifecycle inherited only from its owning Episode, abandoned objects registered as orphans, no global activity collection, maker-checker enforced for template/season/episode approval or changes-requested decisions, and every authoring collection/path default-denied outside callables and release delivery.

- [ ] **Step 5: Commit the server boundary**

```powershell
git add functions/src/admin_content_studio.ts functions/src/admin_content_studio.test.ts functions/src/admin/roles.ts functions/src/admin/permissions.ts functions/src/admin/permissions.test.ts functions/src/admin_content_stages.ts functions/src/admin_content_stages.test.ts functions/src/content_studio/storage_paths.ts functions/src/content_studio/storage_paths.test.ts functions/src/content_factory/artifact_storage.ts functions/src/content_factory/artifact_storage.test.ts functions/src/index.ts admin/v2/scripts/admin-core.js admin/v2/scripts/pages/content-generator.js firestore.rules firestore.indexes.json storage.rules tests/firestore_rules_security.test.ts tests/storage_rules_content_release_contract.test.ts tests/admin_v2_r7_permission_contract.test.ts functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts
git commit -m "feat: secure V2 Content Studio mutations"
```

### Task 5A: Competitor reference-evidence pack before UI work

**Files:**
- Create: `docs/v2/reference-evidence/activity-mode-capture-ledger.json`
- Create: `docs/v2/reference-evidence/activity-mode-patterns.md`
- Create: `docs/v2/reference-evidence/phraseman-wireframes.md`
- Create: `docs/v2/reference-evidence/contact-sheets/<mode-id>.png` for every selected mode
- Create: `docs/v2/reference-evidence/activity-mode-ui-review.json`
- Create: `tests/learning_v2_reference_evidence_contract.test.ts`
- Store raw lawful first-hand captures: ignored `qa-artifacts/learning-v2/reference-evidence/<product>/<mode>/`

**Required skills:** invoke the already-audited `competitor-ux-evidence`, `ui-ux-pro-max`, `emil-design-eng`, and `rn-accessibility-audit` workflows before approving frames. Their output is advisory: project UI Contrast Rule, Performance Bible, Admin UI Bible and traceable reference evidence override any generic style preset.

- [ ] **Step 1: Write the failing evidence-ledger contract**

For every selected activity mode, require product, mode, platform, app version/build, locale, capture date, first-hand/source URL, rights/use note and at least 3–6 state records covering prompt, active/input, feedback/recovery and any behavior-defining processing/permission/offline/accessibility state. Reject marketing-only screenshots and entries without version/platform/locale metadata.

- [ ] **Step 2: Capture and annotate interaction evidence**

Use the `competitor-ux-evidence` workflow. Annotate hierarchy, controls, feedback timing, retry, motion, audio/haptics, accessibility and anti-patterns. Keep raw captures out of app assets and do not copy logos, copy, illustrations or trade dress.

- [ ] **Step 3: Produce original Phraseman multi-frame wireframes**

Map every selected pattern to the canonical six `PreviewState` values plus separate conditions. Each Phraseman mode gets its own 3–6+ frame flow using shared shells, project visual language and accessibility rules. Export one original Phraseman per-mode contact sheet, index/link every sheet from `phraseman-wireframes.md`, and add a distinctiveness matrix explaining what interaction principle was retained and what branded expression was deliberately changed. Raw competitor captures remain ignored evidence inputs and never become the shown/committed contact sheet.

- [ ] **Step 4: Present contact sheets and record review decision**

Show the indexed 3–6+ frame contact sheet for every selected mode to the user before any Task 6/7 UI implementation. Record `approved | changes_requested`, reviewer, timestamp, reviewed wireframe revision/hash and notes in `activity-mode-ui-review.json`. A changed sheet requires a new decision; silence or an unrecorded chat reaction is not approval.

- [ ] **Step 5: Run the evidence, distinctiveness, and approval gate**

Run: `npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand`

Expected: PASS; every UI mode selected for Phase 03/05 and every Content Studio authoring/preview shell has traceable evidence, an indexed original contact sheet, a current recorded `approved` decision and no unlicensed/branded asset dependency. Any `changes_requested` or missing/stale decision blocks that mode from Tasks 6/7 and blocks corresponding Pilot Phase 03/05 UI work.

- [ ] **Step 6: Commit the reference contract and approved original wireframes**

```powershell
git add docs/v2/reference-evidence/activity-mode-capture-ledger.json docs/v2/reference-evidence/activity-mode-patterns.md docs/v2/reference-evidence/phraseman-wireframes.md docs/v2/reference-evidence/contact-sheets docs/v2/reference-evidence/activity-mode-ui-review.json tests/learning_v2_reference_evidence_contract.test.ts
git commit -m "docs: add V2 activity reference evidence"
```

### Task 6: Admin information architecture and shared wizard shell

**Required skills:** invoke `ui-ux-pro-max`, `emil-design-eng`, and `rn-accessibility-audit` against the approved Task 5A contact sheets before implementation. Apply their interaction/accessibility checks under the project UI Contrast Rule, Performance Bible and `ADMIN_UI_BIBLE.md`; never copy a style preset or competitor trade dress blindly.

**Files:**
- Create: `admin/v2/scripts/pages/content-overview.js`
- Create: `admin/v2/scripts/pages/content-modes.js`
- Create: `admin/v2/scripts/pages/content-episodes.js`
- Create: `admin/v2/scripts/pages/content-generation.js`
- Create: `admin/v2/scripts/pages/content-review.js`
- Create: `admin/v2/scripts/pages/content-localization.js`
- Create: `admin/v2/scripts/pages/content-preview.js`
- Create: `admin/v2/scripts/pages/content-releases.js`
- Create: `admin/v2/scripts/content-studio/capability-client.js`
- Create: `admin/v2/scripts/content-studio/mode-template-state.js`
- Create: `admin/v2/scripts/content-studio/mode-template-controller.js`
- Create: `admin/v2/scripts/content-studio/season-state.js`
- Create: `admin/v2/scripts/content-studio/season-controller.js`
- Create: `admin/v2/scripts/content-studio/episode-state.js`
- Create: `admin/v2/scripts/content-studio/episode-controller.js`
- Create: `admin/v2/scripts/content-studio/review-state.js`
- Create: `admin/v2/scripts/content-studio/localization-state.js`
- Create: `admin/v2/scripts/content-studio/preview-state.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-router.js`
- Modify: `admin/v2/scripts/admin-capabilities.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Create: `tests/admin_v2_learning_v2_content_studio_ia_contract.test.ts`
- Create: `tests/admin_v2_content_studio_bible_contract.test.ts`

- [ ] **Step 1: Write the failing IA contract**

```ts
for (const route of ['content', 'content-modes', 'content-episodes', 'content-generation', 'content-review', 'content-localization', 'content-preview', 'content-releases']) {
  expect(router).toContain(`'${route}'`);
}
expect(contentPages).toHaveLength(8);
expect(contentGeneration).toContain('renderContentGeneratorShell');
expect(contentGeneration).toContain('Очередь стадий');
expect(contentReview).toContain('Очередь проверки');
expect(contentPages.join('\n')).toContain('aria-current="step"');
expect(contentPages.join('\n')).toContain('data-tooltip');
const requiredBibleChecks = ['category', 'title_description', 'one_primary_cta', 'tooltips', 'aria_labels', 'field_labels', 'danger_confirm', 'mass_preview', 'loading_empty_error', 'audit_log', 'contrast', 'focus', 'responsive_375_768_1024_1440', 'human_text_first', 'no_overlap'];
for (const requirement of requiredBibleChecks) expect(auditContentStudioPages(contentPages)).toContainEqual(expect.objectContaining({ requirement, passed: true }));
```

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/admin_v2_learning_v2_content_studio_ia_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the eight Content subroutes, page modules, and responsibility-specific state/controllers do not exist.

- [ ] **Step 3: Add all eight Content subroutes and one-task-per-page shells**

Read and follow `docs/design/ADMIN_UI_BIBLE.md`, then register exactly the eight routes under `Контент`. Keep Generation Queue by wrapping/reusing `renderContentGeneratorShell` from the existing `admin/v2/scripts/pages/content-generator.js`. `admin_v2_content_studio_bible_contract.test.ts` explicitly checks every Definition-of-Done item: category/title/description, one primary CTA, tooltip/aria/labels, confirm/preview/audit, loading/empty/error, contrast/focus, responsive widths, human text first and no overlap. All 13 V2 stage kinds use the Russian human-label map from spec 08; raw kind is secondary text only.

```js
export const CONTENT_SUBROUTES = Object.freeze(['content', 'content-modes', 'content-episodes', 'content-generation', 'content-review', 'content-localization', 'content-preview', 'content-releases']);
export const MODE_TEMPLATE_STEPS = Object.freeze(['purpose', 'kernel', 'fields', 'policies', 'fallback', 'copy', 'fixtures', 'summary']);
export const EPISODE_STEPS = Object.freeze(['basics', 'learning-content', 'recipe', 'activities', 'graph', 'contracts', 'localization', 'validation', 'preview', 'review']);
```

Keep mode-template, season, episode, review, localization, and preview state in their named modules; do not fold season composition into episode state or expand the existing generator state into a universal editor. Wire callables through named methods in `createFirebaseAdminActions`; do not write Firestore directly from the browser.

- [ ] **Step 4: Run IA and syntax checks**

Run: `npx jest --runTestsByPath tests/admin_v2_learning_v2_content_studio_ia_contract.test.ts tests/admin_v2_content_studio_bible_contract.test.ts --no-cache --runInBand; Get-ChildItem admin/v2/scripts/pages/content-*.js,admin/v2/scripts/content-studio/*.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }`

Expected: PASS, all eight page routes are present, Generation Queue and Review Queue remain separate, and every new module passes syntax check.

- [ ] **Step 5: Commit the IA shell**

```powershell
git add admin/v2/scripts/pages/content-overview.js admin/v2/scripts/pages/content-modes.js admin/v2/scripts/pages/content-episodes.js admin/v2/scripts/pages/content-generation.js admin/v2/scripts/pages/content-review.js admin/v2/scripts/pages/content-localization.js admin/v2/scripts/pages/content-preview.js admin/v2/scripts/pages/content-releases.js admin/v2/scripts/content-studio/capability-client.js admin/v2/scripts/content-studio/mode-template-state.js admin/v2/scripts/content-studio/mode-template-controller.js admin/v2/scripts/content-studio/season-state.js admin/v2/scripts/content-studio/season-controller.js admin/v2/scripts/content-studio/episode-state.js admin/v2/scripts/content-studio/episode-controller.js admin/v2/scripts/content-studio/review-state.js admin/v2/scripts/content-studio/localization-state.js admin/v2/scripts/content-studio/preview-state.js admin/v2/scripts/admin-firebase.js admin/v2/scripts/admin-router.js admin/v2/scripts/admin-capabilities.js admin/v2/scripts/admin-core.js tests/admin_v2_learning_v2_content_studio_ia_contract.test.ts tests/admin_v2_content_studio_bible_contract.test.ts
git commit -m "feat: add Content Studio admin information architecture"
```

### Task 7: Mode Library wizard

**Files:**
- Modify: `admin/v2/scripts/pages/content-modes.js`
- Modify: `admin/v2/scripts/content-studio/capability-client.js`
- Modify: `admin/v2/scripts/content-studio/mode-template-state.js`
- Modify: `admin/v2/scripts/content-studio/mode-template-controller.js`
- Create: `tests/admin_v2_content_studio_mode_library_contract.test.ts`

- [ ] **Step 1: Write the failing Mode Library contract**

```ts
for (const label of ['Основное', 'Возможности приложения', 'Контент', 'Переводы', 'Предпросмотр', 'Итог']) expect(page).toContain(label);
for (const action of ['create-mode-template', 'clone-mode-template', 'save-mode-template-draft', 'submit-mode-template-review', 'deprecate-mode-template']) expect(page).toContain(`data-action="${action}"`);
expect(page).not.toContain('implementationPath');
```

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/admin_v2_content_studio_mode_library_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the Task 6 `content-modes.js` shell has no eight-step wizard or template lifecycle actions.

- [ ] **Step 3: Implement the eight-step Mode Library wizard**

The wizard steps are purpose, kernel, fields, policies, fallback/accessibility, learner copy, fixtures, and summary. The capability selector shows only code-owned kernels supported by the selected app manifest, while displaying family and `activityTypeKey` separately. Payload fields are rendered from `payloadSchemaKey`; policy selectors are limited to catalog allowlists. Clone names the new template and creates a new draft with `proposedVersion: 1, revision: 1`; editing a published version creates the next `proposedVersion` without changing the source `version/contentHash`. Deprecation is a `content.review` danger action with reason, replacement version ref or explicit no-replacement, impact count, confirmation, and rollback explanation. Runtime preview is enabled only after saving the form as an exact immutable draft revision; dirty unsaved state is labeled and never treated as runtime preview input. Preview remains mandatory before submit/review/publish.

```js
export function renderModeLibrary(model) {
  return renderContentStudioPage({ title: 'Библиотека режимов', description: 'Создавайте переиспользуемые настройки только для поддерживаемых приложением режимов.', primaryAction: 'Создать шаблон', body: renderModeWizard(model) });
}
```

- [ ] **Step 4: Run contract and syntax checks**

Run: `npx jest --runTestsByPath tests/admin_v2_content_studio_mode_library_contract.test.ts --no-cache --runInBand; node --check admin/v2/scripts/pages/content-modes.js; node --check admin/v2/scripts/content-studio/mode-template-state.js; node --check admin/v2/scripts/content-studio/mode-template-controller.js`

Expected: PASS; the page exposes clone/version/deprecate, saves an immutable draft revision before runtime preview, requires preview before submit/review/publish, and exposes no executable path field.

- [ ] **Step 5: Commit Mode Library**

```powershell
git add admin/v2/scripts/pages/content-modes.js admin/v2/scripts/content-studio/capability-client.js admin/v2/scripts/content-studio/mode-template-state.js admin/v2/scripts/content-studio/mode-template-controller.js tests/admin_v2_content_studio_mode_library_contract.test.ts
git commit -m "feat: add V2 Mode Library wizard"
```

### Task 8: Episode Builder and graph editor

**Files:**
- Modify: `admin/v2/scripts/pages/content-episodes.js`
- Modify: `admin/v2/scripts/content-studio/season-state.js`
- Modify: `admin/v2/scripts/content-studio/season-controller.js`
- Modify: `admin/v2/scripts/content-studio/episode-state.js`
- Modify: `admin/v2/scripts/content-studio/episode-controller.js`
- Create: `tests/admin_v2_content_studio_episode_builder_contract.test.ts`
- Create: `tests/admin_v2_content_studio_season_workspace_contract.test.ts`

- [ ] **Step 1: Write the failing Episode Builder contract**

```ts
for (const label of ['Основное', 'Учебная цель', 'Активности', 'Маршрут и запасные пути', 'Повторение и перевод', 'Предпросмотр', 'Итог']) expect(page).toContain(label);
for (const action of ['add-activity-instance', 'add-graph-node', 'move-graph-node', 'connect-graph-nodes', 'clone-episode-draft', 'save-episode-draft']) expect(page).toContain(action);
for (const action of ['create-season-draft', 'select-release-scope', 'pin-episode-revision', 'preview-season-gates', 'submit-season-review']) expect(page).toContain(action);
expect(page).toContain('season-workspace');
expect(page).toContain('episode-detail');
```

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/admin_v2_content_studio_episode_builder_contract.test.ts tests/admin_v2_content_studio_season_workspace_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the Task 6 Episode Builder shell lacks content-vs-graph operations and revision-conflict handling.

- [ ] **Step 3: Implement the seven-step editor**

Keep one `#content-episodes` route with two focused states, never a new top-level or subroute: the season workspace owns release scope, season composition/order, exact approved EpisodeRevision pins, read-only exact `decisionRegistryRef`, code-owned `gatePolicyVersion`, materialized in-scope gate table, checkpoint placement, environment eligibility, and stale-ref warnings; episode detail owns one EpisodeRevision. The UI explains `vertical_slice` (E1, lab/staging), `chapter_internal` (E1–E8 plus checkpoint E8, internal staging), and `full_season` (32/4×8/checkpoints, production-eligible). Each state has one primary CTA and they are never rendered as one long form.

Episode detail captures content-only localized values, title, chapter/ordinal, can-do, scenario, phrase frames, semantic slots, capstone/checkpoint, actual `EpisodeLearningDesign`, versioned evidence-policy mastery requirements, separate independent assessment nodes, canonical optional/delayed scheduler links, hash-free delayed-probe definitions with content-hashed refs, and activities pinned to exact template version/hash. Each graph node declares bounded evidence tuples; checkpoint authoring maps independent-only requirements, critical semantic slots/constraints, deterministic alternates and targeted repair/reassessment. A delayed definition separately binds a scheduler-only `probeNodeId`, exact ActivityInstance/template, new context/support and delayed-only declarations; it is not draggable into the graph, loops, star slots or checkpoint. Localization status/reviewer/timestamps appear from the server projection, never inside the hashable episode body. Voice modes pin canonical discriminated `VoiceReleaseRequirements` without redefining those contracts. For a network mode the UI shows read-only human labels plus exact policy/egress version+hash, supported consent-copy locales, processor/region/retention, deletion-route and minors-policy refs, provider-proof/legal-hold capability and deterministic fallback; it never edits account consent, age class or guardian state. Activity forms edit content/payload/allowed overrides only and expose no standalone status. A separate graph step owns node order, required/voice/evidence/phase flags, performance-star slots, conditional edges and fallback; it never writes them onto `ActivityInstance`. The UI labels encounter-build and near-transfer as the two access-required loops, an ordinary-episode independent probe as non-gating assessment, checkpoint-boundary independent evidence as the explicit checkpoint-pass requirement, and delayed probe as scheduler work that can never block checkpoint/access. Mastery UI reads typed learning evidence and never derives it from `performanceStarsEarned`, `accessStarsEarned`, purchased access, completion or voice-turn count. Human names appear before IDs. Saves send expected revision/fingerprint; conflict shows semantic diff rather than overwriting.

```js
export function graphMutationRequest(model, mutation) {
  return Object.freeze({ draftId: model.draft.draftId, expectedRevision: model.draft.revision, expectedFingerprint: model.draft.fingerprint, idempotencyKey: model.operationId, requestId: model.requestId, mutation });
}
```

- [ ] **Step 4: Run contract and syntax checks**

Run: `npx jest --runTestsByPath tests/admin_v2_content_studio_episode_builder_contract.test.ts tests/admin_v2_content_studio_season_workspace_contract.test.ts --no-cache --runInBand; node --check admin/v2/scripts/pages/content-episodes.js; node --check admin/v2/scripts/content-studio/season-state.js; node --check admin/v2/scripts/content-studio/season-controller.js; node --check admin/v2/scripts/content-studio/episode-state.js; node --check admin/v2/scripts/content-studio/episode-controller.js`

Expected: PASS; season workspace and episode detail remain distinct, scope/environment eligibility is explicit, gate values are read-only outputs of the selected policy, all graph operations are keyboard reachable, ActivityInstance fields remain content-only, and stale-save UI covers both heads.

- [ ] **Step 5: Commit Episode Builder**

```powershell
git add admin/v2/scripts/pages/content-episodes.js admin/v2/scripts/content-studio/season-state.js admin/v2/scripts/content-studio/season-controller.js admin/v2/scripts/content-studio/episode-state.js admin/v2/scripts/content-studio/episode-controller.js tests/admin_v2_content_studio_episode_builder_contract.test.ts tests/admin_v2_content_studio_season_workspace_contract.test.ts
git commit -m "feat: add V2 Episode Builder"
```

### Task 9: V2 preview envelope Body/Record and real-device Preview Lab

**Files:**
- Create: `modules/learning-v2/preview/preview_envelope.ts`
- Create: `functions/src/content_studio/preview.ts`
- Create: `functions/src/content_studio/preview.test.ts`
- Modify: `functions/src/admin_content_studio.ts`
- Modify: `functions/src/index.ts`
- Create: `app/learning-v2-preview.tsx`
- Modify: `app/+native-intent.tsx`
- Create: `tests/learning_v2_preview_route.test.ts`
- Create: `tests/learning_v2_preview_envelope.test.ts`
- Create: `tests/learning_v2_preview_no_progress.test.ts`
- Modify: `admin/v2/scripts/pages/content-preview.js`
- Modify: `admin/v2/scripts/content-studio/preview-state.js`
- Create: `tests/admin_v2_content_studio_preview_contract.test.ts`

- [ ] **Step 1: Write failing envelope and no-side-effect tests**

```ts
expect(parsePreviewEnvelope(validEnvelopeResponse).body.schemaVersion).toBe('v2-preview-envelope-body.v1');
expect(parsePreviewEnvelope(validEnvelopeResponse).body.requestedStates).toEqual(['prompt', 'active', 'processing', 'success', 'needs_work', 'recovery']);
expect(parsePreviewEnvelope(validEnvelopeResponse).body.requestedConditions).toContainEqual(expect.objectContaining({ connectivity: 'offline', microphone: 'denied', motion: 'reduced', textScalePercent: 200 }));
expect(JSON.stringify(validEnvelopeResponse.body)).not.toContain('envelopeHash');
expect(validEnvelopeResponse.envelopeHash).toBe(hashCanonicalBody(validEnvelopeResponse.body));
expect(parsePreviewEnvelope(validTemplateDraftEnvelope).body.entity).toEqual({ type: 'mode_template', templateId: 'template-1', ref: { kind: 'draft_revision', proposedVersion: 2, revision: 3 } });
expect(parsePreviewEnvelope(validActivityEnvelope).body.entity).toEqual({ type: 'activity_instance', draftId: 'draft-global-1', episodeRevision: 4, activityId: 'activity-2', activityRevision: 3 });
expect(parsePreviewEnvelope(validSeasonEnvelope).body.entity).toEqual({ type: 'season', draftId: 'season-draft-1', revision: 2 });
expect(() => parsePreviewEnvelope({ ...validEnvelopeResponse, body: { ...validEnvelopeResponse.body, entityFingerprint: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' } })).toThrow('preview_envelope_hash_mismatch');
expect(assertDevicePreviewParity([iosReceipt, androidReceipt], validEnvelopeResponse.body.entityFingerprint, validEnvelopeResponse.envelopeHash)).toBe(true);
const previewSession = createPreviewSession(validRequest);
expect(previewSession.grants.map((grant) => grant.platform)).toEqual(['ios', 'android']);
expect(previewSession.grants[0].token).not.toBe(previewSession.grants[1].token);
expect(normalizeIncomingPath('phraseman://learning-v2-preview?session=s1&grant=g1&token=t1')).toBe('/learning-v2-preview?session=s1&grant=g1&token=t1');
expect(createPreviewRuntime({ mode: 'preview' })).toMatchObject({ progressWriter: null, rewardWriter: null, shardWriter: null, analyticsWriter: null });
```

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/learning_v2_preview_envelope.test.ts tests/learning_v2_preview_route.test.ts tests/learning_v2_preview_no_progress.test.ts tests/admin_v2_content_studio_preview_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the envelope, route, and Preview Lab do not exist.

- [ ] **Step 3: Implement deterministic web/device preview**

```ts
export interface V2PreviewEnvelopeBody {
  readonly schemaVersion: 'v2-preview-envelope-body.v1';
  readonly previewSessionId: string;
  readonly entity:
    | { readonly type: 'mode_template'; readonly templateId: string; readonly ref: { readonly kind: 'published_version'; readonly version: number } | { readonly kind: 'draft_revision'; readonly proposedVersion: number; readonly revision: number } }
    | { readonly type: 'activity_instance'; readonly draftId: string; readonly episodeRevision: number; readonly activityId: string; readonly activityRevision: number }
    | { readonly type: 'season'; readonly draftId: string; readonly revision: number }
    | { readonly type: 'episode'; readonly draftId: string; readonly revision: number };
  readonly entityFingerprint: string;
  readonly environment: 'development' | 'staging';
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly requestedStates: readonly PreviewState[];
  readonly requestedConditions: readonly PreviewConditions[];
  readonly resolvedTemplateVersions: readonly PublishedModeTemplateRef[];
  readonly resolvedKernelRefs: readonly { readonly activityTypeKey: string; readonly kernelVersion: number; readonly rendererKey: string; readonly rendererSchemaVersion: number }[];
  readonly resolvedPolicyRefs: readonly PolicyRef[];
  readonly supportManifestHashes: Readonly<{ ios: string; android: string }>;
  readonly payloadObject: ImmutableObjectRef;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface V2PreviewEnvelopeResponse {
  readonly body: V2PreviewEnvelopeBody;
  readonly envelopeHash: string;
}

export interface V2PreviewEnvelopeRecord {
  readonly schemaVersion: 'v2-preview-envelope-record.v1';
  readonly previewSessionId: string;
  readonly envelopeHash: string;
  readonly bodyObject: ImmutableObjectRef;
  readonly createdAt: string;
  readonly expiresAt: string;
}
```

`adminCreateV2PreviewSession` accepts only immutable refs. It canonicalizes `V2PreviewEnvelopeBody`, stores a separate immutable record and returns `{body,envelopeHash}` where hash recomputes from body; body has no self hash/object. Both one-use platform/build grants and receipts pin the same envelope hash plus entity fingerprint. Each token is independently actor/platform/build-bound. The only route is `app/learning-v2-preview.tsx` ↔ `/learning-v2-preview` through native-intent; test cold/warm launches. Reject reused/expired/revoked/wrong target grants. Keep six states separate from conditions and disable all progress/performance-star/access-star/shard/reward/analytics/provider writes.

- [ ] **Step 4: Run preview tests**

Run: `npx jest --runTestsByPath tests/learning_v2_preview_envelope.test.ts tests/learning_v2_preview_route.test.ts tests/learning_v2_preview_no_progress.test.ts tests/admin_v2_content_studio_preview_contract.test.ts --no-cache --runInBand; Push-Location functions; npx jest --runTestsByPath src/content_studio/preview.test.ts src/admin_content_studio.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS; every requested template/activity/season/episode state resolves, exact refs/fingerprint are verified, season map/locks/gates use pinned episode refs, both iOS and Android receipts are required, and preview mode cannot write progress, stars, shards, rewards, or analytics.

- [ ] **Step 5: Commit Preview Lab**

```powershell
git add modules/learning-v2/preview/preview_envelope.ts functions/src/content_studio/preview.ts functions/src/content_studio/preview.test.ts functions/src/admin_content_studio.ts functions/src/index.ts app/learning-v2-preview.tsx app/+native-intent.tsx tests/learning_v2_preview_envelope.test.ts tests/learning_v2_preview_route.test.ts tests/learning_v2_preview_no_progress.test.ts admin/v2/scripts/pages/content-preview.js admin/v2/scripts/content-studio/preview-state.js tests/admin_v2_content_studio_preview_contract.test.ts
git commit -m "feat: add V2 Content Studio Preview Lab"
```

### Task 10: Validation receipts and revision-bound waivers

**Files:**
- Create: `functions/src/content_studio/validation.ts`
- Create: `functions/src/content_studio/validation.test.ts`
- Create: `functions/src/content_studio/review_queue_repository.ts`
- Create: `functions/src/content_studio/review_queue_repository.test.ts`
- Create: `functions/src/content_studio/projection_rebuild.ts`
- Create: `functions/src/content_studio/projection_rebuild.test.ts`
- Create: `functions/src/content_studio/gate_receipt.ts`
- Create: `functions/src/content_studio/gate_receipt.test.ts`
- Modify: `admin/v2/scripts/pages/content-review.js`
- Modify: `admin/v2/scripts/content-studio/review-state.js`
- Create: `tests/admin_v2_content_studio_validation_contract.test.ts`
- Modify: `functions/src/admin_content_studio.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Write failing validation tests**

```ts
expect(validateSeasonForReview(invalidSeason).issues).toContainEqual(expect.objectContaining({ code: 'season_gate_policy_mismatch', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(invalidGraph).issues).toContainEqual(expect.objectContaining({ code: 'graph_dead_end', severity: 'blocking', waivable: false }));
expect(() => createContentWaiver(blockingIssue, { reason: 'This blocking issue cannot be waived.', reviewerUid: 'reviewer', expiresInDays: 7 })).toThrow('content_studio_issue_not_waivable');
expect(createContentWaiver(warningIssue, { reason: 'Accepted documented dialect variant.', reviewerUid: 'reviewer', expiresInDays: 7 })).toMatchObject({ entityRevision: 7, entityFingerprint: warningIssue.entityFingerprint });
expect(validateEpisodeForReview(missingSpeechCalibration).issues).toContainEqual(expect.objectContaining({ code: 'speech_calibration_receipt_missing', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(missingVoiceDataPolicy).issues).toContainEqual(expect.objectContaining({ code: 'voice_data_policy_missing', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(missingVoiceNetworkEgress).issues).toContainEqual(expect.objectContaining({ code: 'voice_network_egress_missing', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(invalidVoiceConsentCopyRef).issues).toContainEqual(expect.objectContaining({ code: 'voice_consent_copy_ref_invalid', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(invalidVoiceDeletionRouteRef).issues).toContainEqual(expect.objectContaining({ code: 'voice_deletion_route_ref_invalid', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(invalidVoiceMinorsPolicyRef).issues).toContainEqual(expect.objectContaining({ code: 'voice_minors_policy_ref_invalid', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(directProviderAdapterCapability).issues).toContainEqual(expect.objectContaining({ code: 'voice_provider_direct_access_forbidden', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(missingLearningDesign).issues).toContainEqual(expect.objectContaining({ code: 'learning_design_missing', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(invalidProbeSemantics).issues).toContainEqual(expect.objectContaining({ code: 'learning_probe_semantics_invalid', severity: 'blocking', waivable: false }));
expect(validateEpisodeForReview(inaccessibleStarRoute).issues).toContainEqual(expect.objectContaining({ code: 'accessibility_access_star_unreachable', severity: 'blocking', waivable: false }));
expect(invalidProbeSemantics.body.requiredLoops).not.toHaveProperty('independentProbeNodeIds');
const gateReceipt = buildContentGateReceipt(freshReceiptSet);
expect(gateReceipt.record.receiptHash).toBe(hashCanonicalBody(gateReceipt.body));
expect(JSON.stringify(gateReceipt.body)).not.toContain('receiptHash');
```

- [ ] **Step 2: Verify red**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/validation.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_content_studio_validation_contract.test.ts --no-cache --runInBand`

Expected: FAIL because validation receipts and waiver UI are absent.

- [ ] **Step 3: Implement deterministic validation and waiver callables**

Validate schema/identity/hash, capability/app support, exact refs, graph, phase-correlated declared evidence/context tuples, performance-star slots, AI/network fallback, independent-only checkpoint node/requirement/objective set equality and subset/critical coverage/alternates/repair, delayed-probe body/ref/activity/template/declaration/context binding, assets, six preview states, conditions, content-only localization and legacy superset. Treat missing/invalid actual `EpisodeLearningDesign`, broken prerequisite/support/probe/window semantics, string/mutable/orphan/hash-mismatched delayed ref, generic `{id,...}` where canonical template `{templateId,...}` is required, delayed definition reused as graph/loop/star/checkpoint node, delayed/outside-window checkpoint input, stale evidence policy, inaccessible access-required star slots on any supported accessibility route, invalid exact `VoiceReleaseRequirements`, missing/stale or cross-manifest `VoiceNetworkEgressRef`, unsupported reservation-consume-settle-reconcile/finality/deletion protocol, mutable/string/hash-mismatched consent-copy/deletion-route/minors refs, duplicate consent-copy locale, missing processor route/provider-proof/legal-hold capability, direct provider adapter access, mastery derived from stars/voice-turn count, localization workflow metadata inside a body, artifact-record receipt backrefs and body self-reference as non-waivable `blocking`. On-device voice forbids all network governance fields; network voice requires the exact policy/registry/purposes/egress tuple and fallback. Independent assessment and delayed scheduler work never enter `requiredLoops`; ordinary episode gates cannot depend on an independent probe, while the explicit checkpoint-pass condition at chapter boundaries is derived only from the published independent-only checkpoint contract. Delayed scheduler work never enters any access/checkpoint gate. Every validation receipt and waiver carries the same `entityRevision + entityFingerprint`; no alternate revision interpretation exists.

Resolve validation/localization/preview/review/waiver receipts only by exact subject tuple. Approval/seal creates a separate canonical `ContentGateReceiptBody + immutable Record` pinning the fresh receipt hashes; lifecycle/pointer may reference that gate receipt, but ModeTemplate/Activity/Episode/Season records remain untouched.

Submission transactionally upserts a deterministic full-SHA `ReviewQueueItem`; review/withdraw/edit resolves or stales it in the same transaction as lifecycle/audit/append-only receipt. `adminListV2ReviewQueue` uses a filter-bound opaque `(submittedAt, queueItemId)` cursor and limit <=100. Implement server-only idempotent projection rebuild and `ProjectionConsistencyReceipt`; drift blocks publish and is never silently repaired. Review Queue reads this projection via callable, not an unbounded scan.

- [ ] **Step 4: Run validation tests**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/validation.test.ts src/content_studio/review_queue_repository.test.ts src/content_studio/projection_rebuild.test.ts src/content_studio/gate_receipt.test.ts src/admin_content_studio.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_content_studio_validation_contract.test.ts --no-cache --runInBand`

Expected: PASS; blockers cannot be waived, warnings are revision-bound, ordinary independent assessment and every delayed assessment cannot block access, the explicit checkpoint-pass boundary remains enforceable, accessibility routes keep required stars reachable, immutable records have no receipt backrefs, gate receipt hashes its body without self-reference, and issue links focus the corresponding field/node.

- [ ] **Step 5: Commit validation**

```powershell
git add functions/src/content_studio/validation.ts functions/src/content_studio/validation.test.ts functions/src/content_studio/review_queue_repository.ts functions/src/content_studio/review_queue_repository.test.ts functions/src/content_studio/projection_rebuild.ts functions/src/content_studio/projection_rebuild.test.ts functions/src/content_studio/gate_receipt.ts functions/src/content_studio/gate_receipt.test.ts functions/src/admin_content_studio.ts functions/src/index.ts admin/v2/scripts/pages/content-review.js admin/v2/scripts/content-studio/review-state.js tests/admin_v2_content_studio_validation_contract.test.ts
git commit -m "feat: validate V2 content drafts and waivers"
```

### Task 11: Translator workflow for templates and episodes

**Files:**
- Create: `functions/src/content_studio/localization_repository.ts`
- Create: `functions/src/content_studio/localization_repository.test.ts`
- Modify: `admin/v2/scripts/pages/content-localization.js`
- Modify: `admin/v2/scripts/content-studio/localization-state.js`
- Create: `tests/admin_v2_content_studio_translations_contract.test.ts`
- Modify: `functions/src/admin_content_studio.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Write failing stale-source and review tests**

```ts
expect(buildLocalizationUnit({ source: 'Nice to meet you', translation: 'Приятно познакомиться', locale: 'ru' }).sourceHash).toMatch(/^[a-f0-9]{64}$/);
expect(reconcileLocalizationUnits(savedUnits, changedSource).status).toBe('stale');
expect(() => approveLocalization(staleBundle, reviewerUid)).toThrow('content_studio_localization_stale');
expect(() => approveLocalization(freshBundle, lastEditorUid)).toThrow('content_review_self_review_forbidden');
expect(localizationUnitId(unitIdentity)).toMatch(/^[a-f0-9]{64}$/);
expect(() => listLocalizationUnits({ ...page2Request, cursor: page1Cursor, targetLocale: 'de' })).toThrow('content_studio_cursor_filter_mismatch');
expect(Object.keys(sealedApprovedBodyValue).sort()).toEqual(['locale', 'sourceHash', 'value']);
expect(approvedLocalizationProjection).toMatchObject({ status: 'approved', reviewerUid, reviewedAt: expect.any(String) });
expect(assertNoLocalizationWorkflowMetadata(sealedEpisodeBody)).toBeUndefined();
```

- [ ] **Step 2: Verify red**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/localization_repository.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_content_studio_translations_contract.test.ts --no-cache --runInBand`

Expected: FAIL because localization repository and page do not exist.

- [ ] **Step 3: Implement source-hash-bound translation revisions**

Support `mode_template`, `season`, and `episode` exact revisions. Materialize a server-owned `LocalizationUnitProjection` per full-SHA tuple `(entityType, entityId, entityRevision, targetLocale, fieldPath)`. Hashable bodies use only `LocalizedContentValue { locale, value, sourceHash }`; status, editor/reviewer UIDs, timestamps, reasons and receipt IDs exist only in projection/append-only receipts. Authoring-save transaction preserves units with unchanged source hash, marks changed/removed fields stale and creates missing units; translation edit/review transactionally updates projection plus append-only receipt/audit. Approval/seal accepts exact values only when the matching projection is approved for the same subject/source hash, but does not copy workflow metadata into canonical bytes or artifact records. List callable uses server filters, limit <=100 and filter-bound opaque `(updatedAt, localizationUnitId)` cursor. Rebuild/consistency shares Task 10 machinery and never repairs drift silently. Browser direct access is denied. Editors use draft permission; different UID approves with review. The page shows source/target, status text+icon, locale profile, expansion/RTL preview, review reason and one primary action.

- [ ] **Step 4: Run translator tests**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/localization_repository.test.ts src/admin_content_studio.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_content_studio_translations_contract.test.ts --no-cache --runInBand; node --check admin/v2/scripts/pages/content-localization.js; node --check admin/v2/scripts/content-studio/localization-state.js`

Expected: PASS; stale translations cannot become approved or enter a validation/gate receipt, self-review is rejected, sealed body bytes stay content-only, and later workflow transitions never mutate an immutable artifact record.

- [ ] **Step 5: Commit localization workflow**

```powershell
git add functions/src/content_studio/localization_repository.ts functions/src/content_studio/localization_repository.test.ts functions/src/admin_content_studio.ts functions/src/index.ts admin/v2/scripts/pages/content-localization.js admin/v2/scripts/content-studio/localization-state.js tests/admin_v2_content_studio_translations_contract.test.ts
git commit -m "feat: add V2 Content Studio translation workflow"
```

### Task 12: V2 generation stage DAG

**Files:**
- Modify: `functions/src/content_factory/stage_contracts.ts`
- Modify: `functions/src/content_factory/stage_contracts.test.ts`
- Modify: `functions/src/content_factory/stage_capabilities.ts`
- Modify: `functions/src/content_factory/stage_capabilities.test.ts`
- Modify: `functions/src/content_factory/generation_plan.ts`
- Modify: `functions/src/content_factory/generation_plan.test.ts`
- Modify: `functions/src/content_factory/stage_service.ts`
- Modify: `functions/src/content_factory/stage_service.test.ts`
- Modify: `functions/src/content_factory/dependency_graph.ts`
- Modify: `functions/src/content_factory/dependency_graph.test.ts`
- Modify: `functions/src/admin_content_stages.ts`
- Modify: `functions/src/admin_content_stages.test.ts`
- Modify: `functions/src/content_stage_worker.ts`
- Create: `functions/src/content_factory/v2_episode_artifacts.ts`
- Create: `functions/src/content_factory/v2_episode_artifacts.test.ts`
- Create: `functions/src/content_factory/v2_episode_qa.ts`
- Create: `functions/src/content_factory/v2_episode_qa.test.ts`
- Modify: `admin/v2/scripts/content-factory/stage-renderers.js`
- Modify: `admin/v2/scripts/pages/content-generator.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Create: `tests/admin_v2_content_stage_human_labels.test.ts`

- [ ] **Step 1: Write failing DAG tests**

```ts
const seasonPlan = buildV2SeasonPlan(fullSeasonInput);
expect(seasonPlan.filter((stage) => stage.kind === 'v2_season_outline')).toHaveLength(1);
expect(seasonPlan.filter((stage) => stage.kind === 'v2_season_qa')).toHaveLength(1);
expect(seasonPlan.filter((stage) => stage.kind === 'v2_episode_outline')).toHaveLength(32);
expect(buildV2SeasonPlan(verticalSliceInput).filter((stage) => stage.kind === 'v2_episode_outline')).toHaveLength(1);
expect(buildV2SeasonPlan(chapterInternalInput).filter((stage) => stage.kind === 'v2_episode_outline')).toHaveLength(8);
expect(buildV2EpisodeSubgraph(dialogueRecipe).filter((stage) => stage.kind === 'v2_dialogue_script')).toHaveLength(1);
expect(buildV2EpisodeSubgraph(nonDialogueRecipe).filter((stage) => stage.kind === 'v2_dialogue_script')).toHaveLength(0);
expect(resolveStageDependencies(stageRequest)).toEqual(expect.arrayContaining([
  expect.objectContaining({ dependencyType: 'published_template', templateId: 'template-1', version: 2, contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
  expect.objectContaining({ dependencyType: 'language_profile', languageProfileId: 'en-ru', version: 1, contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
]));
expect(generatedEpisode.body.learningDesign).toMatchObject({ primaryOutcomeId: expect.any(String), independentProbeRef: expect.any(String), delayedProbeRef: { probeId: expect.any(String), contentHash: expect.stringMatching(/^[0-9a-f]{64}$/) }, delayedWindowPolicyId: expect.any(String) });
expect(generatedEpisode.body.delayedProbeDefinitions[0].ref.contentHash).toBe(hashCanonicalBody(generatedEpisode.body.delayedProbeDefinitions[0].body));
expect(generatedEpisode.body.requiredLoops).toEqual(expect.objectContaining({ encounterBuildNodeIds: expect.any(Array), nearTransferNodeIds: expect.any(Array) }));
expect(generatedEpisode.body.requiredLoops).not.toHaveProperty('independentProbeNodeIds');
expect(assertAccessibilityRoutesReachAccessStars(generatedEpisode.body)).toBeUndefined();
```

- [ ] **Step 2: Verify red**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/stage_contracts.test.ts src/content_factory/stage_capabilities.test.ts src/content_factory/generation_plan.test.ts src/content_factory/v2_episode_artifacts.test.ts src/content_factory/v2_episode_qa.test.ts --no-cache --runInBand; Pop-Location`

Expected: FAIL because V2 stage kinds and builders are absent.

- [ ] **Step 3: Implement the exact stage graph and freshness rules**

Add exactly thirteen canonical V2 kinds, but do not instantiate all thirteen once per episode. Implement `buildV2SeasonPlan` (one season outline, N episode subgraphs, one season QA) and `buildV2EpisodeSubgraph` with recipe-aware 0..1 dialogue/club branches. N is exactly 1/8/32 for vertical-slice/chapter/full-season. Generated episode artifacts must materialize the actual `EpisodeLearningDesign`, versioned evidence-policy requirements, two access-required loops, separate independent assessment nodes, scheduler-bound delayed links and an accessibility-route-to-access-stars proof; missing semantics fail QA. A published language profile and template records are typed immutable prerequisites, not stages. Use the discriminator union `stage | published_template | language_profile`, full content hashes/object generations, a canonical dependency fingerprint and freshness invalidation across parsers, capabilities, service, dependency graph, callable and worker.

```text
published language profile
  + published ModeTemplate versions
  → v2_season_outline
    → v2_episode_outline
      ├─ v2_scene_set
      ├─ v2_dialogue_script
      ├─ v2_speaking_mission
      └─ v2_voice_targets
    → v2_activity_instances
      → v2_activity_graph
        ├─ v2_asset_manifest
        └─ v2_localization
      → v2_preview_receipt
        → v2_episode_bundle
          → v2_season_qa
```

Editing an upstream artifact or changing a pinned lifecycle/hash marks downstream validation/review/preview stale; never auto-select latest. Existing leases/retries/budgets remain authoritative. Migrate stage review from `content.publish` to `content.review` in `admin_content_stages.ts`, server role tests, `admin-core.js` and `content-generator.js`. Use the spec Russian label map for all 13 kinds; raw keys are secondary. Preserve the existing Generation Queue, controls, pagination, receipts and corrections.

- [ ] **Step 4: Run DAG and renderer checks**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/stage_contracts.test.ts src/content_factory/stage_capabilities.test.ts src/content_factory/generation_plan.test.ts src/content_factory/stage_service.test.ts src/content_factory/dependency_graph.test.ts src/admin_content_stages.test.ts src/content_factory/v2_episode_artifacts.test.ts src/content_factory/v2_episode_qa.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_content_stage_human_labels.test.ts tests/admin_v2_r7_permission_contract.test.ts --no-cache --runInBand; node --check admin/v2/scripts/content-factory/stage-renderers.js; node --check admin/v2/scripts/pages/content-generator.js; node --check admin/v2/scripts/admin-core.js`

Expected: PASS with exactly 13 kinds, deterministic ordering, canonical dependencies, cycle rejection, stale-downstream invalidation, and the pre-existing Generation Queue still rendered.

- [ ] **Step 5: Commit the V2 stage DAG**

```powershell
git add functions/src/content_factory/stage_contracts.ts functions/src/content_factory/stage_contracts.test.ts functions/src/content_factory/stage_capabilities.ts functions/src/content_factory/stage_capabilities.test.ts functions/src/content_factory/generation_plan.ts functions/src/content_factory/generation_plan.test.ts functions/src/content_factory/stage_service.ts functions/src/content_factory/stage_service.test.ts functions/src/content_factory/dependency_graph.ts functions/src/content_factory/dependency_graph.test.ts functions/src/admin_content_stages.ts functions/src/admin_content_stages.test.ts functions/src/content_stage_worker.ts functions/src/content_factory/v2_episode_artifacts.ts functions/src/content_factory/v2_episode_artifacts.test.ts functions/src/content_factory/v2_episode_qa.ts functions/src/content_factory/v2_episode_qa.test.ts admin/v2/scripts/content-factory/stage-renderers.js admin/v2/scripts/pages/content-generator.js admin/v2/scripts/admin-core.js tests/admin_v2_content_stage_human_labels.test.ts tests/admin_v2_r7_permission_contract.test.ts
git commit -m "feat: add V2 content generation stage DAG"
```

### Task 13: lesson-bundle.v2, sealing, activation, and rollback

**Files:**
- Create: `functions/src/content_factory/v2_episode_bundle.ts`
- Create: `functions/src/content_factory/v2_episode_bundle.test.ts`
- Create: `functions/src/content_factory/v2_release_adapter.ts`
- Create: `functions/src/content_factory/v2_release_adapter.test.ts`
- Create: `functions/src/content_factory/v2_season_release_manifest.ts`
- Create: `functions/src/content_factory/v2_season_release_manifest.test.ts`
- Modify: `functions/src/content_factory/release_sealing.ts`
- Modify: `functions/src/content_factory/release_sealing.test.ts`
- Modify: `functions/src/admin_content_release.ts`
- Modify: `functions/src/language_release.ts`
- Modify: `admin/v2/scripts/pages/content-releases.js`
- Create: `tests/admin_v2_content_studio_release_center_contract.test.ts`

- [ ] **Step 1: Write failing adapter and release preflight tests**

```ts
expect(buildV2LessonBundle(input)).toMatchObject({ schemaVersion: 'lesson-bundle.v2', lessonId: 1, phrases: expect.any(Array), vocabulary: expect.any(Array), drills: expect.any(Array), v2Episode: expect.any(Object) });
expect(resolveApprovedSeasonForRelease(input.seasonRef)).toMatchObject({ body: { schemaVersion: 'season-authoring-body.v1' }, lifecycle: { status: 'approved' }, record: { revisionFingerprint: input.seasonRef.revisionFingerprint } });
expect(() => assertSeasonReleaseEnvironment(verticalSliceSeason, 'production')).toThrow('season_scope_not_production_eligible');
expect(() => assertSeasonReleaseEnvironment(chapterInternalSeason, 'production')).toThrow('season_scope_not_production_eligible');
expect(assertSeasonReleaseEnvironment(fullSeason, 'production')).toBeUndefined();
expect(() => assertV2ReleaseSealable({ ...candidate, validationFingerprint: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' })).toThrow('content_studio_validation_stale');
const manifest = buildV2SeasonReleaseManifest(candidate);
expect(manifest.body.schemaVersion).toBe('v2-season-release-manifest-body.v1');
expect(JSON.stringify(manifest.body)).not.toContain('manifestHash');
expect(manifest.record.manifestHash).toBe(hashCanonicalBody(manifest.body));
expect(manifest.body.decisionRegistryRef).toEqual(candidate.season.body.decisionRegistryRef);
expect(manifest.body.supportManifestRefs).toEqual([candidate.iosSupportRef, candidate.androidSupportRef]);
expect(manifest.body.voiceNetworkEgressRefs).toEqual(candidate.usedVoiceNetworkEgressRefs);
expect(candidate.bundle.authoringProvenance.decisionRegistryRef).toEqual(manifest.body.decisionRegistryRef);
expect(() => assertV2ReleaseSealable(candidateWithEgressMissingFromAndroidSupport)).toThrow('voice_network_egress_support_mismatch');
expect(() => assertV2ReleaseSealable(candidateWithLegacyDispatchLifecycle)).toThrow('voice_network_dispatch_lifecycle_unsupported');
expect(() => assertV2ReleaseSealable(candidateWithDecisionRegistryHashMismatch)).toThrow('decision_registry_hash_mismatch');
expect(() => assertV2ReleaseSealable(candidateWithMissingHyp008)).toThrow('decision_registry_incomplete_or_setting_unresolved');
```

- [ ] **Step 2: Verify red**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/v2_episode_bundle.test.ts src/content_factory/v2_release_adapter.test.ts src/content_factory/release_sealing.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_content_studio_release_center_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the V2 bundle, adapter, and release center are absent.

- [ ] **Step 3: Implement deterministic adaptation and guarded lifecycle**

Keep `course-release.v1` and its four canonical surfaces unchanged. Resolve the exact approved Season body/record/lifecycle, pinned episode bodies/records and template bodies/records; verify all hashes/generations. Resolve Season `decisionRegistryRef`, recompute its immutable body hash and require every used numeric decision under `HYP-V2-001..008`, including retry cap, cutoffs, star/gate/boost values, `delayedWindowPolicyId`, and rollout settings. Immutable artifact records contain no receipt backrefs: seal resolves the exact append-only validation/localization/preview/review set by subject fingerprint, verifies approved content-only localized values, and writes a separate `ContentGateReceiptBody + Record`. Build `lesson-bundle.v2` inside `lesson` with the same decision ref in authoring provenance. Separately build hashable `V2SeasonReleaseManifestBody` without self hash/object and with the exact same `decisionRegistryRef`, exact iOS+Android `supportManifestRefs`, and deduplicated `voiceNetworkEgressRefs` equal to the network template union; create immutable record with `manifestHash = hashCanonicalBody(body)`. Reject a self hash, mismatched registry/support ref, egress absent from either app support body, environment mismatch, or gateway body without reservation→consume→terminal settlement→settlement-bound deletion. Seal requires valid actual per-episode `learningDesign`, ordinary-episode non-gating independent probes, explicit independent-only checkpoint-pass semantics at chapter boundaries, never-gating scheduled delayed probes, fresh versioned evidence/support policies, exact dependency refs, exact discriminated `VoiceReleaseRequirements` plus matching Episode aggregate, fresh SpeechCalibrationReceipt/VoiceDataPolicy body-record pairs whenever those requirements reference them, and exact immutable consent-copy/deletion-route/minors/egress dependency bodies. Adapter inventory/direct-access gate, dispatch lifecycle, provider-proof and legal-hold capability must pass before a network template seals; account-specific classification/guardian/consent/eligibility/reservation/consumption/settlement records remain runtime-only and never enter authoring artifacts. Environment comes from server deployment context, never request/UI. Release Center shows manifest record, registry version/hash, support/voice egress/dependency readiness, scope/environment eligibility, impact, target/previous release, the separate gate receipt, audit and reason-required actions.

- [ ] **Step 4: Run release tests**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/v2_episode_bundle.test.ts src/content_factory/v2_release_adapter.test.ts src/content_factory/v2_season_release_manifest.test.ts src/content_factory/release_sealing.test.ts src/admin_content_release.test.ts src/language_release.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/admin_v2_content_studio_release_center_contract.test.ts --no-cache --runInBand`

Expected: PASS; old four-surface releases still seal, release resolution begins from one exact approved SeasonRevision, the same exact decision-registry ref appears in Season/manifest/bundle provenance and resolves every used `HYP-V2-001..008` setting, scope-specific QA/environment rules are enforced, stale season/episode/template/registry content cannot seal, activation is revision-checked, and rollback targets prior membership only.

- [ ] **Step 5: Commit the release seam**

```powershell
git add functions/src/content_factory/v2_episode_bundle.ts functions/src/content_factory/v2_episode_bundle.test.ts functions/src/content_factory/v2_release_adapter.ts functions/src/content_factory/v2_release_adapter.test.ts functions/src/content_factory/v2_season_release_manifest.ts functions/src/content_factory/v2_season_release_manifest.test.ts functions/src/content_factory/release_sealing.ts functions/src/content_factory/release_sealing.test.ts functions/src/admin_content_release.ts functions/src/language_release.ts admin/v2/scripts/pages/content-releases.js tests/admin_v2_content_studio_release_center_contract.test.ts
git commit -m "feat: publish V2 episodes through lesson bundle releases"
```

### Task 14: Episode 1 author-to-device end-to-end gate

**Files:**
- Create: `tests/fixtures/learning-v2/content-studio/episode-01-authoring.json`
- Create: `tests/fixtures/learning-v2/content-studio/season-01-authoring.json`
- Create: `tests/e2e/r7/admin_learning_v2_content_studio.spec.ts`
- Create: `tests/learning_v2_content_studio_e1_contract.test.ts`
- Create: `tests/learning_v2_content_studio_preview_runtime_integration.test.tsx`
- Create: `maestro/flows/learning_v2/content_studio_e1_preview.yaml`
- Modify: `scripts/serve-admin-e2e.cjs`

- [ ] **Step 1: Write the failing admin journey and native runtime proof**

```ts
test('authors, previews, validates, publishes, activates, and rolls back E1', async ({ page }) => {
  await page.goto('/v2/#content-modes');
  await page.getByRole('button', { name: 'Создать шаблон' }).click();
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await page.getByRole('button', { name: 'Проверить все состояния' }).click();
  await expect(page.getByText('6 из 6 состояний проверены')).toBeVisible();
  await page.getByRole('button', { name: 'Передать на проверку' }).click();
  await page.goto('/v2/#content-review');
  await page.getByRole('button', { name: 'Одобрить шаблон' }).click();
  await page.goto('/v2/#content-modes');
  await page.getByRole('button', { name: 'Опубликовать шаблон' }).click();
  await page.goto('/v2/#content-episodes');
  await page.getByRole('button', { name: 'Создать сезон' }).click();
  await page.getByRole('button', { name: 'Создать эпизод' }).click();
  await page.getByRole('button', { name: 'Сохранить эпизод' }).click();
  await page.goto('/v2/#content-localization');
  await page.getByRole('button', { name: 'Передать на проверку' }).click();
  await page.goto('/v2/#content-review');
  await page.getByRole('button', { name: 'Одобрить перевод' }).click();
  await page.goto('/v2/#content-preview');
  await page.getByRole('button', { name: 'Создать device preview' }).click();
  await expect(page.getByText('iOS grant')).toBeVisible();
  await expect(page.getByText('Android grant')).toBeVisible();
  await page.goto('/v2/#content-episodes');
  await page.getByRole('button', { name: 'Проверить эпизод' }).click();
  await expect(page.getByText('Ошибок, блокирующих публикацию: 0')).toBeVisible();
  await page.getByRole('button', { name: 'Передать эпизод на проверку' }).click();
  await page.goto('/v2/#content-review');
  await page.getByRole('button', { name: 'Одобрить эпизод' }).click();
  await page.goto('/v2/#content-episodes');
  await page.getByRole('button', { name: 'Добавить утверждённую редакцию эпизода' }).click();
  await page.getByRole('button', { name: 'Проверить сезон' }).click();
  await expect(page.getByText('Состав сезона и ворота проверены')).toBeVisible();
  await page.getByRole('button', { name: 'Передать сезон на проверку' }).click();
  await page.goto('/v2/#content-review');
  await page.getByRole('button', { name: 'Одобрить сезон' }).click();
  await page.goto('/v2/#content-releases');
  await page.getByRole('button', { name: 'Подготовить релиз' }).click();
  await page.getByRole('button', { name: 'Активировать в staging' }).click();
  await page.getByRole('button', { name: 'Остановить rollout' }).click();
  await page.getByRole('button', { name: 'Откатить релиз' }).click();
  await expect(page.getByText('Откат завершён')).toBeVisible();
});

test('opens the exact E1 preview through the real native runtime without progress writes', async () => {
  const result = await openContentStudioPreviewDeepLink(E1_PREVIEW_DEEP_LINK);
  expect(getV2PreviewEnvelope).toHaveBeenCalledWith(e1PreviewRequestFixture);
  expect(e1PreviewRequestFixture).toMatchObject({
    sessionId: E1_PREVIEW_SESSION_ID,
    grantId: E1_PREVIEW_GRANT_ID,
  });
  expect(result).toMatchObject({
    envelopeHash: E1_ENVELOPE_HASH,
    fingerprint: E1_PREVIEW_FINGERPRINT,
    loader: 'remote-v2',
    registry: 'learning-v2',
    rendered: true,
  });
  expect(progressWriter).not.toHaveBeenCalled();
  expect(starWriter).not.toHaveBeenCalled();
  expect(rewardWriter).not.toHaveBeenCalled();
  expect(analyticsWriter).not.toHaveBeenCalled();
});
```

The Playwright spec owns the **full fake lifecycle**: ModeTemplate save/preview/submit/review/publish; episode save/localize/preview/validate/submit/review; season pin/validate/submit/review; manifest seal/activate/pause/rollback. Fake grants/receipts only prove UI state transitions and are explicitly labelled simulated. They never satisfy the release evidence gate. The focused native/runtime integration owns the real deep-link → envelope body/hash verification → loader/registry/renderer/no-progress path; it may fake only callable transport.

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/learning_v2_content_studio_e1_contract.test.ts tests/learning_v2_content_studio_preview_runtime_integration.test.tsx --no-cache --runInBand; npx playwright test --config playwright.r7.config.ts tests/e2e/r7/admin_learning_v2_content_studio.spec.ts`

Expected: FAIL because the fake Admin callable seam does not yet model the Content Studio lifecycle and the native preview deep-link/runtime integration does not exist.

- [ ] **Step 3: Add deterministic E1 lifecycle and the cross-platform device packet**

The E1 fixture encodes the selected curriculum path, separate activity/node identities and Episode-owned lifecycle, deterministic non-voice fallback, eight performance-star slots reachable through supported accessibility routes, can-do/capstone, actual `EpisodeLearningDesign`, versioned evidence-policy mastery requirements, two access-required loops, separate non-gating independent probe nodes and scheduled delayed probe link. It uses content-only Russian localization values, external workflow projections/receipts, six preview states plus conditions and exact template pins. Immutable artifact records contain no receipt backrefs. Any voice/acoustic claim pins exact hash-verified SpeechCalibrationReceipt body/record ref; any network speech pins an approved VoiceDataPolicy body/record ref, exact deployed VoiceNetworkEgress ref and resolved immutable consent-copy/deletion-route/minors refs. The fixture proves fallback when subject eligibility is unknown and contains no fake per-user consent, guardian or dispatch reservation. No policy/receipt fixture contains its own hash. The vertical-slice season pins only approved E1, has no gate and stays lab/staging; full-season cardinality remains Task 4. Fake Admin actions mirror expected revision, submit/review, validation, separate gate receipt, scope, manifest body/record, activation/pause/rollback, but never count as device evidence.

The Maestro flow is the device evidence. One session issues `IOS_PREVIEW_GRANT_ID/TOKEN` and `ANDROID_PREVIEW_GRANT_ID/TOKEN`, both pinned to identical `PREVIEW_SESSION_ID`, `ENVELOPE_HASH` and `EXPECTED_FINGERPRINT`. Pass the Android grant only to Android and iOS grant only to iOS. Each one-use link opens the exact route, verifies envelope hash/fingerprint, records its own receipt and writes no progress/reward. Missing, stale, simulated, reused, cross-platform or single-platform evidence fails. Revoke/expire session after both receipts. Never use production.

- [ ] **Step 4: Run the joint Playwright + native/runtime + real-device packet**

Run (contracts and real native runtime path): `npx jest --runTestsByPath tests/learning_v2_content_studio_e1_contract.test.ts tests/learning_v2_content_studio_preview_runtime_integration.test.tsx --no-cache --runInBand`

Run (Admin UI only): `npx playwright test --config playwright.r7.config.ts tests/e2e/r7/admin_learning_v2_content_studio.spec.ts`

Run on the Android internal-build host: `maestro --device $env:PHRASEMAN_ANDROID_DEVICE test -e PREVIEW_SESSION_ID=$env:PREVIEW_SESSION_ID -e PREVIEW_GRANT_ID=$env:ANDROID_PREVIEW_GRANT_ID -e PREVIEW_TOKEN=$env:ANDROID_PREVIEW_TOKEN -e ENVELOPE_HASH=$env:E1_ENVELOPE_HASH -e EXPECTED_FINGERPRINT=$env:E1_PREVIEW_FINGERPRINT maestro/flows/learning_v2/content_studio_e1_preview.yaml`

Run on the iOS internal-build host: `maestro --device $env:PHRASEMAN_IOS_DEVICE test -e PREVIEW_SESSION_ID=$env:PREVIEW_SESSION_ID -e PREVIEW_GRANT_ID=$env:IOS_PREVIEW_GRANT_ID -e PREVIEW_TOKEN=$env:IOS_PREVIEW_TOKEN -e ENVELOPE_HASH=$env:E1_ENVELOPE_HASH -e EXPECTED_FINGERPRINT=$env:E1_PREVIEW_FINGERPRINT maestro/flows/learning_v2/content_studio_e1_preview.yaml`

Expected: PASS; Playwright proves the Admin authoring/release UI, the focused integration test proves the real deep-link → `getV2PreviewEnvelope` → loader/registry/renderer/no-progress path, and Maestro records fresh real-device `android` plus `ios` receipts from distinct one-use grants for the same envelope hash and entity fingerprint. E1 is pinned into an approved `vertical_slice` SeasonRevision, staging activation succeeds, production activation is rejected, pause is audited, rollback restores the previous catalog revision, and all audit entries are visible.

- [ ] **Step 5: Commit the E1 vertical slice gate**

```powershell
git add tests/fixtures/learning-v2/content-studio/episode-01-authoring.json tests/fixtures/learning-v2/content-studio/season-01-authoring.json tests/e2e/r7/admin_learning_v2_content_studio.spec.ts tests/learning_v2_content_studio_e1_contract.test.ts tests/learning_v2_content_studio_preview_runtime_integration.test.tsx maestro/flows/learning_v2/content_studio_e1_preview.yaml scripts/serve-admin-e2e.cjs
git commit -m "test: cover V2 Content Studio E1 lifecycle"
```

### Task 15: Controlled Content Studio rollout

**Files:**
- Create: `functions/src/content_studio/rollout.ts`
- Create: `functions/src/content_studio/rollout.test.ts`
- Create: `modules/learning-v2/content/content_studio_rollout.ts`
- Create: `tests/learning_v2_content_studio_rollout.test.ts`
- Modify: `functions/src/language_release.ts`
- Modify: `admin/v2/scripts/pages/content-releases.js`

- [ ] **Step 1: Write failing stable-cohort and kill-switch tests**

```ts
expect(resolveContentStudioCohort({ stableAccountId: 'user-1', rolloutPercent: 10, revision: 3 })).toBe(resolveContentStudioCohort({ stableAccountId: 'user-1', rolloutPercent: 10, revision: 3 }));
expect(resolvePublishedV2Release({ enabled: false, activeReleaseId: 'release-b' })).toEqual({ kind: 'legacy_or_bundled' });
expect(() => resolvePublishedV2Release({ enabled: true, environment: 'production', releaseScope: { kind: 'vertical_slice' }, activeReleaseId: 'release-e1' })).toThrow('season_scope_not_production_eligible');
expect(() => activateSeasonPointer({ ...request, environment: 'production' }, stagingServerContext)).toThrow('release_environment_request_forbidden');
expect(pauseSeasonPointer(activePointer, { reason: 'Health regression', expectedRolloutRevision: 4 })).toMatchObject({ rollout: { state: 'paused', percent: 0, revision: 5 } });
```

- [ ] **Step 2: Verify red**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/rollout.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/learning_v2_content_studio_rollout.test.ts --no-cache --runInBand`

Expected: FAIL because rollout resolution is absent.

- [ ] **Step 3: Implement staged rollout without changing immutable releases**

Persist one `V2SeasonReleasePointer` per server-derived environment + locale pair + seasonId. It references the exact manifest record hash, active/previous release, catalog revision and rollout `{revision,state,percent,cohortSaltVersion,allowlist,exclusions,healthReceiptHash,pauseReason}`. Requests cannot choose environment; derive it from deployment/project configuration and reject mismatches. Assignment is stable by account and salt/revision. Unknown/disabled returns fallback. Scope gates precede cohorts; only full season enters production. Percent, observation windows and milestone sizes must resolve under `HYP-V2-008` of the manifest's exact `decisionRegistryRef`; unsupported values fail closed. Above 25% requires fresh health receipt/approval. Pause sets effective percent 0 through revision-checked pointer mutation; rollback targets only a previously active manifest in the same identity and never changes artifacts/progress. Preserve `course-release.v1` four surfaces.

- [ ] **Step 4: Run rollout and focused regression gates**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_studio/rollout.test.ts src/language_release.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/learning_v2_content_studio_rollout.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts --no-cache --runInBand`

Expected: PASS; assignment is sticky, scope prevents partial-season production rollout, kill switch is fail-safe, and existing navigation/performance guards remain green.

- [ ] **Step 5: Commit rollout controls**

```powershell
git add functions/src/content_studio/rollout.ts functions/src/content_studio/rollout.test.ts modules/learning-v2/content/content_studio_rollout.ts tests/learning_v2_content_studio_rollout.test.ts functions/src/language_release.ts admin/v2/scripts/pages/content-releases.js
git commit -m "feat: roll out V2 content releases safely"
```

## Final verification packet

- [ ] Run all Content Studio root contracts:

`npx jest --runTestsByPath tests/learning_v2_content_studio_contract.test.ts tests/learning_v2_content_studio_canonical_json.test.ts tests/learning_v2_decision_registry.test.ts tests/learning_v2_mode_capability_catalog.test.ts tests/learning_v2_mode_template.test.ts tests/learning_v2_season_authoring.test.ts tests/learning_v2_episode_draft_editor.test.ts tests/learning_v2_preview_envelope.test.ts tests/learning_v2_preview_route.test.ts tests/learning_v2_preview_no_progress.test.ts tests/learning_v2_content_studio_e1_contract.test.ts tests/learning_v2_content_studio_preview_runtime_integration.test.tsx tests/learning_v2_content_studio_rollout.test.ts tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand`

Expected: PASS, zero failed tests.

- [ ] Run all Content Studio Functions contracts:

`Push-Location functions; npx jest --runTestsByPath src/content_studio/contracts.test.ts src/content_studio/canonical_json.test.ts src/content_studio/decision_registry.test.ts src/content_studio/app_support_manifest.test.ts src/content_studio/mode_template_repository.test.ts src/content_studio/season_draft_repository.test.ts src/content_studio/episode_draft_repository.test.ts src/content_studio/storage_paths.test.ts src/content_studio/preview.test.ts src/content_studio/validation.test.ts src/content_studio/gate_receipt.test.ts src/content_studio/review_queue_repository.test.ts src/content_studio/localization_repository.test.ts src/content_studio/projection_rebuild.test.ts src/content_studio/rollout.test.ts src/admin_content_studio.test.ts src/admin_content_stages.test.ts src/content_factory/artifact_storage.test.ts src/content_factory/stage_contracts.test.ts src/content_factory/stage_capabilities.test.ts src/content_factory/stage_service.test.ts src/content_factory/dependency_graph.test.ts src/content_factory/generation_plan.test.ts src/content_factory/v2_episode_artifacts.test.ts src/content_factory/v2_episode_qa.test.ts src/content_factory/v2_episode_bundle.test.ts src/content_factory/v2_release_adapter.test.ts src/content_factory/v2_season_release_manifest.test.ts src/content_factory/release_sealing.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS, zero failed tests.

- [ ] Run Admin contracts and E1 browser journey:

`npx jest --runTestsByPath tests/admin_v2_learning_v2_content_studio_ia_contract.test.ts tests/admin_v2_content_studio_bible_contract.test.ts tests/admin_v2_content_stage_human_labels.test.ts tests/admin_v2_r7_permission_contract.test.ts tests/admin_v2_content_studio_mode_library_contract.test.ts tests/admin_v2_content_studio_episode_builder_contract.test.ts tests/admin_v2_content_studio_season_workspace_contract.test.ts tests/admin_v2_content_studio_preview_contract.test.ts tests/admin_v2_content_studio_validation_contract.test.ts tests/admin_v2_content_studio_translations_contract.test.ts tests/admin_v2_content_studio_release_center_contract.test.ts --no-cache --runInBand; npx playwright test --config playwright.r7.config.ts tests/e2e/r7/admin_learning_v2_content_studio.spec.ts`

Expected: PASS; Playwright reports one complete season-and-E1 author-to-rollback Admin journey. This browser result is not device-load or receipt evidence.

- [ ] Run the E1 real-device preview flow against the same short-lived internal/staging preview session:

`maestro --device $env:PHRASEMAN_ANDROID_DEVICE test -e PREVIEW_SESSION_ID=$env:PREVIEW_SESSION_ID -e PREVIEW_GRANT_ID=$env:ANDROID_PREVIEW_GRANT_ID -e PREVIEW_TOKEN=$env:ANDROID_PREVIEW_TOKEN -e ENVELOPE_HASH=$env:E1_ENVELOPE_HASH -e EXPECTED_FINGERPRINT=$env:E1_PREVIEW_FINGERPRINT maestro/flows/learning_v2/content_studio_e1_preview.yaml`

`maestro --device $env:PHRASEMAN_IOS_DEVICE test -e PREVIEW_SESSION_ID=$env:PREVIEW_SESSION_ID -e PREVIEW_GRANT_ID=$env:IOS_PREVIEW_GRANT_ID -e PREVIEW_TOKEN=$env:IOS_PREVIEW_TOKEN -e ENVELOPE_HASH=$env:E1_ENVELOPE_HASH -e EXPECTED_FINGERPRINT=$env:E1_PREVIEW_FINGERPRINT maestro/flows/learning_v2/content_studio_e1_preview.yaml`

Expected: both real internal builds consume their own platform/build-bound one-use grant, load the same envelope hash and entity fingerprint through the actual app runtime, write no progress/reward/analytics state, and leave distinct fresh `android` and `ios` receipts visible in Release Center.

- [ ] Run type and security gates:

`npx tsc --noEmit --pretty false; Push-Location functions; npx tsc --noEmit --pretty false; npx jest --runTestsByPath src/content_studio/emulator/v2_authoring_rules.emulator.test.ts --no-cache --runInBand; Pop-Location; npx jest --runTestsByPath tests/firestore_rules_security.test.ts tests/storage_rules_content_release_contract.test.ts --no-cache --runInBand`

Expected: all commands exit 0.

- [ ] Record the phase packet with exact release IDs/hashes, screenshots at 375/768/1024/1440 px, permissions exercised, audit IDs, rollback target, commands/results, and remaining limitations.
