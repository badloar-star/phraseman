import { readFileSync } from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { buildCanonicalAttemptRef, sanitizeAttemptBody, type V2DelayedAttemptEventBody } from "../../../../modules/learning-v2/contracts/attempt";
import { buildLearningEvidenceTupleKey } from "../../../../modules/learning-v2/contracts/evidence";
import { canonicalJsonV1, hashCanonicalBody } from "../../../../modules/learning-v2/policies/decision_registry";
import { episodeRevisionFingerprint, episodeRevisionObjectPath, validateEpisodeRevisionArtifactBody } from "../../content_studio/episode_revision_resolver";
import { createFirestoreEpisodeRevisionResolver } from "../../content_studio/firestore_authoring_store";
import { seasonRevisionFingerprint, seasonRevisionObjectPath } from "../../../../modules/learning-v2/authoring/season_revision";
import { createStorageSeasonRevisionObjectReader } from "../../content_studio/season_revision_resolver";
import { applyProgressEvent, deriveProgressAccountScopeHash } from "../progress_event";
import { createFirestoreProgressEventStore } from "../firestore_progress_event_store";
import { ingestDelayedProbeTerminal, materializeDelayedTerminalEvidence, type DelayedProbeTerminalRecord } from "../delayed_probe_ingestion";

const PROJECT_ID = "demo-phraseman-delayed-progress";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");
const stableUid = "delayed-progress-user";
const accountGeneration = 1;
const accountScopeHash = deriveProgressAccountScopeHash(stableUid, accountGeneration);
const binding = { nodeId: "delayed-node-1", objectiveId: "delayed-objective-1", skillId: "delayed-skill-1", construct: "semantic" as const, phase: "delayed_probe" as const, targetKind: "objective" as const, targetId: "delayed-objective-1" };

const episodeBody = () => ({
  schemaVersion: "episode-authoring-body.v1", draftId: "delayed-episode-draft", episodeId: "delayed-episode", revision: 1,
  seasonId: "delayed-season", ordinal: 1, chapterId: "delayed-chapter", studyTarget: "en", learnerSourceLocale: "ru",
  title: [], canDoOutcome: [], scenario: {}, phraseFrames: [], semanticSlots: [], contentUnits: {},
  activityInstances: [{ schemaVersion: "v2-activity-instance-body.v1", activityId: "delayed-activity", revision: 1, episodeId: "delayed-episode", progressCompatibilityKey: "delayed-activity", templateRef: { templateId: "delayed-template", version: 1, contentHash: "a".repeat(64) }, family: "visual_discovery", estimatedSeconds: 10, payload: {}, payloadHash: hashCanonicalBody({}), contentUnitIds: [], overrides: {}, tags: { skillIds: [], grammar: [], vocabulary: [], scenario: [], modalities: ["reading"] }, localization: { studyTarget: "en", learnerSourceLocale: "ru", requiredLocales: ["en", "ru"], fieldSourceHashes: {} }, assets: [] }],
  delayedProbeDefinitions: [], graph: { startNodeId: "delayed-node", capstoneNodeId: "delayed-node", nodes: [{ nodeId: "delayed-node", activityId: "delayed-activity", position: 1, visible: true, requiredForCore: true, voiceEvidenceOptional: true, phase: "encounter_build", evidenceDeclarations: [], gateEligible: false, maxStars: 0 }], edges: [] }, starSlots: [], requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
  assessmentNodes: { independentProbeNodeIds: [] }, capstoneContract: { objectiveIds: [], requiredSemanticSlotIds: [], criticalConstraintIds: [], primaryNodeIds: [], deterministicAlternateNodeIds: [] }, masteryContract: { requirements: [] },
  learningDesign: { primaryOutcomeId: "delayed-outcome", objectiveIds: ["delayed-objective-1"], prerequisiteEdges: [], supportPlan: [{ objectiveId: "delayed-objective-1", initialSupport: "partial_cue", fadeRuleId: "delayed-fade", escalationRuleId: "delayed-escalate" }], independentProbeRef: "delayed-probe", delayedProbeRef: { probeId: "delayed-probe", contentHash: "a".repeat(64) }, delayedWindowPolicyId: "delayed-window" }, voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: [], minAppVersion: "1.0.0",
});

const delayedBody = sanitizeAttemptBody({ schemaVersion: "v2-attempt-body.v1", opId: "delayed/progress-attempt", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "delayed-candidate", binding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] }) as V2DelayedAttemptEventBody;
const delayedAttemptRef = buildCanonicalAttemptRef(delayedBody);
const tupleKey = buildLearningEvidenceTupleKey(binding);

describe("V2 delayed progress post-receipt materialization against Firestore emulator", () => {
  jest.setTimeout(45_000);
  let environment: RulesTestEnvironment;
  let app: admin.app.App;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST) throw new Error("Firestore and Storage emulators are required");
    app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` });
    environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(RULES_PATH, "utf8") } });
  });
  afterAll(async () => { await environment?.cleanup(); await app?.delete(); });

  test("does not materialize before receipt; post-receipt apply writes scoped evidence/index and replays idempotently", async () => {
    const db = app.firestore();
    const bucket = app.storage().bucket();
    const body = episodeBody();
    const episodeHash = hashCanonicalBody(body);
    const episodeRef = { draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: episodeRevisionFingerprint(body.draftId, 1, episodeHash), contentHash: episodeHash, ordinal: 1, chapterId: body.chapterId, approvalStatus: "approved" as const };
    const episodePath = episodeRevisionObjectPath(body.draftId, 1, episodeHash);
    const episodeBytes = canonicalJsonV1(body);
    const episodeFile = bucket.file(episodePath);
    await episodeFile.save(Buffer.from(episodeBytes), { resumable: false, metadata: { metadata: { contentHash: episodeHash } } });
    const [episodeMeta] = await episodeFile.getMetadata();
    const now = new Date().toISOString();
    await db.doc(`content_episode_revisions/${body.draftId}__r1`).set({ record: { schemaVersion: "episode-authoring-record.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, contentHash: episodeHash, revisionFingerprint: episodeRef.revisionFingerprint, object: { objectPath: episodePath, contentHash: episodeHash, objectGeneration: String(episodeMeta.generation), byteSize: Buffer.byteLength(episodeBytes) }, provenance: { createdBy: "emulator", createdAt: now }, createdAt: now }, lifecycle: { schemaVersion: "episode-lifecycle.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: episodeRef.revisionFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 } });
    const seasonBody = { schemaVersion: "season-authoring-body.v1", draftId: "delayed-season-draft", seasonId: body.seasonId, releaseScope: { kind: "vertical_slice", includedChapterOrdinals: [1], includedEpisodeOrdinals: [1] }, episodeRevisionRefs: [episodeRef], chapters: [], gates: [], gatePolicyVersion: "v2-gates-1", decisionRegistryRef: { id: "registry", version: 1, contentHash: "a".repeat(64) } };
    const seasonHash = hashCanonicalBody(seasonBody);
    const seasonPath = seasonRevisionObjectPath(seasonBody.draftId, 1, seasonHash);
    const seasonBytes = canonicalJsonV1(seasonBody);
    const seasonFile = bucket.file(seasonPath);
    await seasonFile.save(Buffer.from(seasonBytes), { resumable: false, metadata: { metadata: { contentHash: seasonHash } } });
    const [seasonMeta] = await seasonFile.getMetadata();
    const seasonFingerprint = seasonRevisionFingerprint(seasonBody.draftId, 1, seasonHash);
    await db.doc("content_season_revisions/delayed-season-r1").set({ record: { schemaVersion: "season-authoring-record.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, contentHash: seasonHash, revisionFingerprint: seasonFingerprint, object: { objectPath: seasonPath, contentHash: seasonHash, objectGeneration: String(seasonMeta.generation), byteSize: Buffer.byteLength(seasonBytes) }, provenance: { createdBy: "emulator" }, createdAt: now } });
    await db.doc("content_season_lifecycle/delayed-season-r1").set({ schemaVersion: "season-lifecycle.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, revisionFingerprint: seasonFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 });

    const seasonObjectReader = createStorageSeasonRevisionObjectReader(bucket as never);
    const episodeResolverBase = createFirestoreEpisodeRevisionResolver(db, undefined, async (templateRef) => ({ templateRef, allowedOverridePaths: [] }));
    const episodeResolver = { ...episodeResolverBase, validateBody: validateEpisodeRevisionArtifactBody };
    await db.doc("auth_links/delayed-progress-auth").set({ stable_id: stableUid });
    await db.doc(`users/${stableUid}`).set({ accountGeneration });
    const store = createFirestoreProgressEventStore({ db, authUid: "delayed-progress-auth", stableUid, accountGeneration, accountScopeHash, seasonObjectReader, episodeResolver });
    const common = { accountScopeHash, seasonId: body.seasonId, studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "delayed-season-r1", episodeRevisionRef: episodeRef, attemptBody: delayedBody, attemptRef: delayedAttemptRef, projection: { starSlotId: "delayed-slot", previousBestStars: 0, candidateStars: 0, activityId: "delayed-activity", progressCompatibilityKey: "delayed-activity" } };
    const evidencePath = `users/${stableUid}/v2_progress/${accountScopeHash}/seasons/delayed-season-r1/episodes/delayed-episode/evidence/${tupleKey}`;
    const projectionPath = `users/${stableUid}/v2_progress/${accountScopeHash}/seasons/delayed-season-r1/episodes/delayed-episode/slots/delayed-slot`;
    const terminalRef = { schemaVersion: "v2-delayed-terminal-ref.v1" as const, mutationId: "delayed-terminal-1" };
    const emptyDelayedBundle = { schemaVersion: "v2-progress-evidence-bundle.v1" as const, attemptRef: delayedAttemptRef, evidenceBodies: [], nonAssessmentBodies: [] };
    expect((await db.doc(evidencePath).get()).exists).toBe(false);
    expect((await db.doc(projectionPath).get()).exists).toBe(false);

    await expect(applyProgressEvent(store, { ...common, idempotencyKey: "delayed-pre-receipt-op", evidenceBundle: emptyDelayedBundle, terminalRef } as any)).rejects.toThrow("delayed_terminal_missing");
    expect((await db.doc(evidencePath).get()).exists).toBe(false);
    expect((await db.doc(projectionPath).get()).exists).toBe(false);
    expect((await db.collection(`users/${stableUid}/v2_progress_attempts`).get()).empty).toBe(true);
    expect((await db.collection(`users/${stableUid}/v2_progress_ops`).get()).empty).toBe(true);

    const terminalStore = {
      read: async (mutationId: string): Promise<DelayedProbeTerminalRecord | undefined> => { const snapshot = await db.doc(`users/${stableUid}/v2_delayed_attempts/${accountScopeHash}__${mutationId}`).get(); return snapshot.exists ? snapshot.data() as DelayedProbeTerminalRecord : undefined; },
      create: async (record: DelayedProbeTerminalRecord): Promise<void> => { await db.doc(`users/${stableUid}/v2_delayed_attempts/${accountScopeHash}__${record.mutationId}`).create(record); },
    };
    const delayedInput = { stableUid, accountGeneration, accountScopeHash, mutationId: "delayed-terminal-1", candidate: { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody: delayedBody, attemptRef: delayedAttemptRef }, context: { candidate: { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody: delayedBody, attemptRef: delayedAttemptRef }, expectedTupleKeys: [tupleKey], assignmentRef: { assignmentId: "delayed-assignment", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "delayed-launch", contentHash: "b".repeat(64) }, probeRef: { probeId: "delayed-probe", contentHash: "c".repeat(64) }, timingReceiptId: "delayed-timing-receipt", failureReceiptId: "delayed-failure-receipt", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 100, windowPolicyId: "delayed-window" } };
    const firstTerminal = await ingestDelayedProbeTerminal(terminalStore, delayedInput, { resolveDecision: () => ({ kind: "timed" as const, window: "inside_pinned_window" as const }) });
    const replayTerminal = await ingestDelayedProbeTerminal(terminalStore, delayedInput, { resolveDecision: () => ({ kind: "timed" as const, window: "inside_pinned_window" as const }) });
    expect(firstTerminal.duplicate).toBe(false);
    expect(replayTerminal.duplicate).toBe(true);
    expect((await db.doc(evidencePath).get()).exists).toBe(false);
    const forgedPreReceiptBundle = materializeDelayedTerminalEvidence(delayedBody, firstTerminal.record);
    await expect(applyProgressEvent(store, { ...common, idempotencyKey: "delayed-forged-evidence-op", evidenceBundle: forgedPreReceiptBundle, terminalRef } as any)).rejects.toThrow("delayed_client_evidence_forbidden");
    await expect(applyProgressEvent(store, { ...common, idempotencyKey: "delayed-full-receipt-op", evidenceBundle: forgedPreReceiptBundle, terminalReceipt: firstTerminal.record } as any)).rejects.toThrow("v2_progress_event_request_invalid");
    expect((await db.doc(evidencePath).get()).exists).toBe(false);
    expect(firstTerminal.record.receipt.kind).toBe("timing");

    const postReceipt = { ...common, idempotencyKey: "delayed-progress-op-1", evidenceBundle: emptyDelayedBundle, terminalRef } as any;
    await expect(applyProgressEvent(store, postReceipt)).resolves.toMatchObject({ accepted: true, duplicate: false });
    await expect(applyProgressEvent(store, postReceipt)).resolves.toMatchObject({ accepted: true, duplicate: true });
    const evidenceSnapshot = await db.doc(evidencePath).get();
    expect(evidenceSnapshot.exists).toBe(true);
    expect(evidenceSnapshot.data()).toMatchObject({ accountStableUid: stableUid, accountGeneration, accountScopeHash, tupleKey, ref: { sourceAttempt: delayedAttemptRef } });
    expect((await db.doc(projectionPath).get()).exists).toBe(true);
    const attemptDocument = (await db.collection(`users/${stableUid}/v2_progress_attempts`).get()).docs.find((document) => document.data()?.attemptBodyHash === delayedAttemptRef.attemptBodyHash);
    const operationDocument = (await db.collection(`users/${stableUid}/v2_progress_ops`).get()).docs.find((document) => document.data()?.result?.canonicalAttemptRef?.opId === delayedAttemptRef.opId);
    expect(attemptDocument).toBeDefined();
    expect(operationDocument).toBeDefined();
    const attemptPath = attemptDocument!.ref.path;
    const operationPath = operationDocument!.ref.path;
    expect((await db.doc(operationPath).get()).exists).toBe(true);
    expect((await db.doc(attemptPath).get()).exists).toBe(true);

    const baselineEvidence = (await db.doc(evidencePath).get()).data()!;
    const baselineAttempt = (await db.doc(attemptPath).get()).data()!;
    const baselineProjection = (await db.doc(projectionPath).get()).data()!;
    const baselineOperation = (await db.doc(operationPath).get()).data()!;
    const operationFingerprint = hashCanonicalBody(baselineOperation);
    const replayError = async (): Promise<string | undefined> => {
      try { await applyProgressEvent(store, postReceipt); return undefined; }
      catch (error) { return error instanceof Error ? error.message : String(error); }
    };
    const restoreBaseline = async (): Promise<void> => {
      await Promise.all([
        db.doc(evidencePath).set(baselineEvidence),
        db.doc(attemptPath).set(baselineAttempt),
        db.doc(projectionPath).set(baselineProjection),
      ]);
    };
    const operationIsUnchanged = async (): Promise<boolean> => hashCanonicalBody((await db.doc(operationPath).get()).data()) === operationFingerprint;
    const matrix: Record<string, unknown> = {};

    await db.doc(evidencePath).delete();
    matrix.missingEvidence = {
      error: await replayError(),
      evidenceRestored: (await db.doc(evidencePath).get()).exists,
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await db.doc(attemptPath).delete();
    matrix.missingAttempt = {
      error: await replayError(),
      attemptRestored: (await db.doc(attemptPath).get()).exists,
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await Promise.all([db.doc(evidencePath).delete(), db.doc(attemptPath).delete()]);
    matrix.missingBoth = {
      error: await replayError(),
      evidenceRestored: (await db.doc(evidencePath).get()).exists,
      attemptRestored: (await db.doc(attemptPath).get()).exists,
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await db.doc(projectionPath).delete();
    matrix.missingProjection = {
      error: await replayError(),
      projectionRestored: (await db.doc(projectionPath).get()).exists,
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await db.doc(projectionPath).set({ ...baselineProjection, projection: { ...(baselineProjection.projection as Record<string, unknown>), activityId: "conflicting-activity" } });
    matrix.conflictingProjection = {
      error: await replayError(),
      projectionUnchanged: (await db.doc(projectionPath).get()).data()?.projection?.activityId === "conflicting-activity",
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await db.doc(projectionPath).set({ ...baselineProjection, projection: { ...(baselineProjection.projection as Record<string, unknown>), performanceStars: "invalid" } });
    matrix.malformedProjection = {
      error: await replayError(),
      projectionUnchanged: (await db.doc(projectionPath).get()).data()?.projection?.performanceStars === "invalid",
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await Promise.all([
      db.doc(evidencePath).delete(),
      db.doc(attemptPath).delete(),
      db.doc(projectionPath).set({ ...baselineProjection, projection: { ...(baselineProjection.projection as Record<string, unknown>), performanceStars: "invalid" } }),
    ]);
    matrix.malformedProjectionWithMissingArtifacts = {
      error: await replayError(),
      evidenceStillMissing: !(await db.doc(evidencePath).get()).exists,
      attemptStillMissing: !(await db.doc(attemptPath).get()).exists,
      projectionUnchanged: (await db.doc(projectionPath).get()).data()?.projection?.performanceStars === "invalid",
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await db.doc(evidencePath).set({ ...baselineEvidence, componentFingerprint: "f".repeat(64) });
    matrix.conflictingEvidence = {
      error: await replayError(),
      conflictPreserved: (await db.doc(evidencePath).get()).data()?.componentFingerprint === "f".repeat(64),
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await db.doc(attemptPath).set({ ...baselineAttempt, attemptBodyHash: "f".repeat(64) });
    matrix.conflictingAttempt = {
      error: await replayError(),
      conflictPreserved: (await db.doc(attemptPath).get()).data()?.attemptBodyHash === "f".repeat(64),
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    await Promise.all([db.doc(evidencePath).delete(), db.doc(attemptPath).delete()]);
    const concurrentResults = await Promise.all([applyProgressEvent(store, postReceipt), applyProgressEvent(store, postReceipt)]);
    matrix.concurrentRetry = {
      duplicates: concurrentResults.map((result) => result.duplicate),
      evidenceRestored: (await db.doc(evidencePath).get()).exists,
      attemptRestored: (await db.doc(attemptPath).get()).exists,
      operationUnchanged: await operationIsUnchanged(),
    };
    await restoreBaseline();

    expect(matrix).toEqual({
      missingEvidence: { error: undefined, evidenceRestored: true, operationUnchanged: true },
      missingAttempt: { error: undefined, attemptRestored: true, operationUnchanged: true },
      missingBoth: { error: undefined, evidenceRestored: true, attemptRestored: true, operationUnchanged: true },
      missingProjection: { error: undefined, projectionRestored: true, operationUnchanged: true },
      conflictingProjection: { error: "v2_progress_replay_projection_conflict", projectionUnchanged: true, operationUnchanged: true },
      malformedProjection: { error: "v2_progress_replay_projection_conflict", projectionUnchanged: true, operationUnchanged: true },
      malformedProjectionWithMissingArtifacts: { error: "v2_progress_replay_projection_conflict", evidenceStillMissing: true, attemptStillMissing: true, projectionUnchanged: true, operationUnchanged: true },
      conflictingEvidence: { error: "v2_progress_replay_evidence_conflict", conflictPreserved: true, operationUnchanged: true },
      conflictingAttempt: { error: "v2_progress_replay_attempt_conflict", conflictPreserved: true, operationUnchanged: true },
      concurrentRetry: { duplicates: [true, true], evidenceRestored: true, attemptRestored: true, operationUnchanged: true },
    });
  });
});
