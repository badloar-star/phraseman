import { readFileSync } from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, runTransaction, setDoc } from "firebase/firestore";
import { canonicalJsonV1, hashCanonicalBody, sha256Utf8 } from "../../../modules/learning-v2/policies/decision_registry";
import { buildCanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import { episodeRevisionFingerprint, episodeRevisionObjectPath, validateEpisodeRevisionArtifactBody } from "../content_studio/episode_revision_resolver";
import { seasonRevisionFingerprint, seasonRevisionObjectPath } from "../../../modules/learning-v2/authoring/season_revision";
import { applyProgressEvent, deriveProgressAccountScopeHash } from "./progress_event";
import { createFirestoreProgressEventStore, progressAttemptDocumentId, progressOperationDocumentId } from "./firestore_progress_event_store";
import { createStorageSeasonRevisionObjectReader } from "../content_studio/season_revision_resolver";
import { createFirestoreEpisodeRevisionResolver } from "../content_studio/firestore_authoring_store";
import { PILOT_SCORING_POLICY_BODY, createCodeOwnedScoringPolicyCatalog } from "./server_score_policy_catalog";

const PROJECT_ID = "demo-phraseman-progress";
const RULES_PATH = path.resolve(__dirname, "../../../firestore.rules");
const TEMPLATE_FIXTURE = JSON.parse(readFileSync(path.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"), "utf8")) as { dependencies: { templates: Array<{ body: Record<string, any> }> } };
const PILOT_TEMPLATE_BODY = {
  ...TEMPLATE_FIXTURE.dependencies.templates[0].body,
  templateId: "template-positive",
  version: 1,
  policies: {
    ...TEMPLATE_FIXTURE.dependencies.templates[0].body.policies,
    scoring: { kind: "scoring", key: PILOT_SCORING_POLICY_BODY.key, version: PILOT_SCORING_POLICY_BODY.version, contentHash: hashCanonicalBody(PILOT_SCORING_POLICY_BODY) },
  },
};
const PILOT_TEMPLATE_HASH = hashCanonicalBody(PILOT_TEMPLATE_BODY);

const episodeBody = () => {
  return {
    schemaVersion: "episode-authoring-body.v1", draftId: "emulator-progress-episode-draft", episodeId: "emulator-progress-episode", revision: 1,
    seasonId: "emulator-progress-season", ordinal: 1, chapterId: "chapter-1", studyTarget: "en", learnerSourceLocale: "ru",
    title: [], canDoOutcome: [], scenario: {}, phraseFrames: [], semanticSlots: [], contentUnits: {},
    activityInstances: [{ schemaVersion: "v2-activity-instance-body.v1", activityId: "activity-1", revision: 1, episodeId: "emulator-progress-episode", progressCompatibilityKey: "activity-1", templateRef: { templateId: "template-1", version: 1, contentHash: "a".repeat(64) }, family: "visual_discovery", estimatedSeconds: 10, payload: {}, payloadHash: hashCanonicalBody({}), contentUnitIds: [], overrides: {}, tags: { skillIds: [], grammar: [], vocabulary: [], scenario: [], modalities: ["reading"] }, localization: { studyTarget: "en", learnerSourceLocale: "ru", requiredLocales: ["en", "ru"], fieldSourceHashes: {} }, assets: [] }],
    delayedProbeDefinitions: [], graph: { startNodeId: "node-1", capstoneNodeId: "node-1", nodes: [{ nodeId: "node-1", activityId: "activity-1", position: 1, visible: true, requiredForCore: true, voiceEvidenceOptional: true, phase: "encounter_build", evidenceDeclarations: [], gateEligible: false, maxStars: 0 }], edges: [] }, starSlots: [], requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
    assessmentNodes: { independentProbeNodeIds: [] }, capstoneContract: { objectiveIds: [], requiredSemanticSlotIds: [], criticalConstraintIds: [], primaryNodeIds: [], deterministicAlternateNodeIds: [] }, masteryContract: { requirements: [] },
    learningDesign: { primaryOutcomeId: "outcome-1", objectiveIds: ["objective-1"], prerequisiteEdges: [], supportPlan: [{ objectiveId: "objective-1", initialSupport: "partial_cue", fadeRuleId: "fade-1", escalationRuleId: "escalate-1" }], independentProbeRef: "probe-1", delayedProbeRef: { probeId: "probe-1", contentHash: "a".repeat(64) }, delayedWindowPolicyId: "window-1" }, voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: [],
    minAppVersion: "1.0.0",
  };
};

describe("Learning V2 progress event against Firestore/Storage emulators", () => {
  jest.setTimeout(120_000);
  let environment: RulesTestEnvironment;
  let app: admin.app.App;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST) throw new Error("Firestore and Storage emulators are required");
    app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` });
    environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(RULES_PATH, "utf8") } });
  });

  afterAll(async () => { await environment?.cleanup(); await app?.delete(); });

  it("resolves canonical Season/Episode bytes, writes scoped projection/evidence, and isolates accounts", async () => {
    const db = app.firestore();
    const bucket = app.storage().bucket();
    const body = episodeBody();
    body.activityInstances[0].templateRef = { templateId: PILOT_TEMPLATE_BODY.templateId, version: PILOT_TEMPLATE_BODY.version, contentHash: PILOT_TEMPLATE_HASH };
    (body.graph.nodes[0] as any).starSlotId = "slot-1"; body.graph.nodes[0].maxStars = 3; body.graph.nodes[0].gateEligible = true;
    (body as any).starSlots = [{ starSlotId: "slot-1", acceptedNodeIds: ["node-1"], maxStars: 3 }];
    const contentHash = hashCanonicalBody(body);
    const episodeRef = { draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: episodeRevisionFingerprint(body.draftId, 1, contentHash), contentHash, ordinal: 1, chapterId: body.chapterId, approvalStatus: "approved" as const };
    const episodePath = episodeRevisionObjectPath(body.draftId, 1, contentHash);
    const episodeFile = bucket.file(episodePath);
    const episodeBytes = canonicalJsonV1(body);
    await episodeFile.save(Buffer.from(episodeBytes), { resumable: false, metadata: { metadata: { contentHash } } });
    const [episodeMeta] = await episodeFile.getMetadata();
    const now = new Date().toISOString();
    await db.doc(`content_episode_revisions/${body.draftId}__r1`).set({ record: { schemaVersion: "episode-authoring-record.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, contentHash, revisionFingerprint: episodeRef.revisionFingerprint, object: { objectPath: episodePath, contentHash, objectGeneration: String(episodeMeta.generation), byteSize: Buffer.byteLength(episodeBytes) }, provenance: { createdBy: "emulator", createdAt: now }, createdAt: now }, lifecycle: { schemaVersion: "episode-lifecycle.v1", draftId: body.draftId, episodeId: body.episodeId, revision: 1, revisionFingerprint: episodeRef.revisionFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 } });

    const templatePath = `content-studio/mode-templates/${sha256Utf8(PILOT_TEMPLATE_BODY.templateId)}/v${PILOT_TEMPLATE_BODY.version}/${PILOT_TEMPLATE_HASH}.json`;
    const templateBytes = canonicalJsonV1(PILOT_TEMPLATE_BODY);
    const templateFile = bucket.file(templatePath);
    await templateFile.save(Buffer.from(templateBytes), { resumable: false, metadata: { metadata: { contentHash: PILOT_TEMPLATE_HASH } } });
    const [templateMeta] = await templateFile.getMetadata();
    await db.doc(`content_mode_template_versions/${PILOT_TEMPLATE_BODY.templateId}__v${PILOT_TEMPLATE_BODY.version}`).set({ schemaVersion: "v2-mode-template-record.v1", templateId: PILOT_TEMPLATE_BODY.templateId, version: PILOT_TEMPLATE_BODY.version, contentHash: PILOT_TEMPLATE_HASH, object: { objectPath: templatePath, contentHash: PILOT_TEMPLATE_HASH, objectGeneration: String(templateMeta.generation), byteSize: Buffer.byteLength(templateBytes) }, provenance: { createdBy: "emulator", createdAt: now }, createdAt: now });
    await db.doc(`content_mode_template_lifecycle/${PILOT_TEMPLATE_BODY.templateId}__v${PILOT_TEMPLATE_BODY.version}`).set({ schemaVersion: "v2-mode-template-lifecycle.v1", templateId: PILOT_TEMPLATE_BODY.templateId, version: PILOT_TEMPLATE_BODY.version, contentHash: PILOT_TEMPLATE_HASH, status: "published", reason: "runtime_resolution", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 });

    const seasonBody = { schemaVersion: "season-authoring-body.v1", draftId: "emulator-progress-season-draft", seasonId: body.seasonId, releaseScope: { kind: "vertical_slice", includedChapterOrdinals: [1], includedEpisodeOrdinals: [1] }, episodeRevisionRefs: [episodeRef], chapters: [], gates: [], gatePolicyVersion: "v2-gates-1", decisionRegistryRef: { id: "registry", version: 1, contentHash: "a".repeat(64) } };
    const seasonHash = hashCanonicalBody(seasonBody);
    const seasonPath = seasonRevisionObjectPath(seasonBody.draftId, 1, seasonHash);
    const seasonFile = bucket.file(seasonPath);
    const seasonBytes = canonicalJsonV1(seasonBody);
    await seasonFile.save(Buffer.from(seasonBytes), { resumable: false, metadata: { metadata: { contentHash: seasonHash } } });
    const [seasonMeta] = await seasonFile.getMetadata();
    const seasonFingerprint = seasonRevisionFingerprint(seasonBody.draftId, 1, seasonHash);
    await db.doc("content_season_revisions/emulator-progress-season-r1").set({ record: { schemaVersion: "season-authoring-record.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, contentHash: seasonHash, revisionFingerprint: seasonFingerprint, object: { objectPath: seasonPath, contentHash: seasonHash, objectGeneration: String(seasonMeta.generation), byteSize: Buffer.byteLength(seasonBytes) }, provenance: { createdBy: "emulator" }, createdAt: now } });
    await db.doc("content_season_lifecycle/emulator-progress-season-r1").set({ schemaVersion: "season-lifecycle.v1", draftId: seasonBody.draftId, seasonId: seasonBody.seasonId, revision: 1, revisionFingerprint: seasonFingerprint, status: "approved", changedBy: "emulator", changedAt: now, lifecycleRevision: 1 });
    expect((await db.doc("content_season_revisions/emulator-progress-season-r1").get()).exists).toBe(true);
    expect((await db.doc("content_season_lifecycle/emulator-progress-season-r1").get()).exists).toBe(true);

    const attemptBody = { schemaVersion: "v2-attempt-body.v1", opId: "emulator-progress-attempt", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [] } as const;
    const attemptRef = buildCanonicalAttemptRef(attemptBody);
    const base = { seasonId: body.seasonId, studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "emulator-progress-season-r1", episodeRevisionRef: episodeRef, attemptBody, attemptRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1" as const, attemptRef, evidenceBodies: [], nonAssessmentBodies: [] }, projection: { starSlotId: "slot-1", previousBestStars: 0, candidateStars: 0, activityId: "activity-1", progressCompatibilityKey: "activity-1" } };
    const seasonObjectReader = createStorageSeasonRevisionObjectReader(bucket as never);
    const episodeResolverBase = createFirestoreEpisodeRevisionResolver(db, undefined, async (templateRef) => ({ templateRef, allowedOverridePaths: [] }));
    const episodeResolver = { ...episodeResolverBase, validateBody: validateEpisodeRevisionArtifactBody };
    await db.doc("auth_links/progress-auth-a").set({ stable_id: "progress-user-a" });
    await db.doc("users/progress-user-a").set({ accountGeneration: 1 });
    await db.doc("auth_links/progress-auth-b").set({ stable_id: "progress-user-b" });
    await db.doc("users/progress-user-b").set({ accountGeneration: 1 });
    await db.doc("auth_links/progress-auth-positive").set({ stable_id: "progress-positive-user" });
    await db.doc("users/progress-positive-user").set({ accountGeneration: 1 });
    await db.doc("auth_links/progress-auth-default-resolver").set({ stable_id: "progress-default-resolver-user" });
    await db.doc("users/progress-default-resolver-user").set({ accountGeneration: 1 });
    const defaultResolverScope = deriveProgressAccountScopeHash("progress-default-resolver-user", 1);
    const defaultResolverOperationPath = `users/progress-default-resolver-user/v2_progress_ops/${progressOperationDocumentId(defaultResolverScope, "emulator-progress-season-r1", "emulator-progress-default-resolver-op")}`;
    const defaultResolverProjectionPath = `users/progress-default-resolver-user/v2_progress/${defaultResolverScope}/seasons/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`;
    const defaultResolverStore = createFirestoreProgressEventStore({ db, authUid: "progress-auth-default-resolver", stableUid: "progress-default-resolver-user", accountGeneration: 1, accountScopeHash: defaultResolverScope, seasonObjectReader });
    let defaultResolverError: string | undefined;
    try {
      await applyProgressEvent(defaultResolverStore, { ...base, accountScopeHash: defaultResolverScope, idempotencyKey: "emulator-progress-default-resolver-op" });
    } catch (error) {
      defaultResolverError = error instanceof Error ? error.message : String(error);
    }
    expect({
      error: defaultResolverError,
      operationWritten: (await db.doc(defaultResolverOperationPath).get()).exists,
      projectionWritten: (await db.doc(defaultResolverProjectionPath).get()).exists,
    }).toEqual({ error: undefined, operationWritten: true, projectionWritten: true });
    await db.doc(`content_mode_template_lifecycle/${PILOT_TEMPLATE_BODY.templateId}__v${PILOT_TEMPLATE_BODY.version}`).update({ status: "deprecated", noReplacement: true, lifecycleRevision: 2, reason: "historical_pin_only" });
    const deprecatedAttemptBody = { ...attemptBody, opId: "emulator-progress-deprecated-template-attempt" } as const;
    const deprecatedAttemptRef = buildCanonicalAttemptRef(deprecatedAttemptBody);
    await expect(applyProgressEvent(defaultResolverStore, {
      ...base,
      accountScopeHash: defaultResolverScope,
      idempotencyKey: "emulator-progress-deprecated-template-op",
      attemptBody: deprecatedAttemptBody,
      attemptRef: deprecatedAttemptRef,
      evidenceBundle: { ...base.evidenceBundle, attemptRef: deprecatedAttemptRef },
    })).resolves.toMatchObject({ accepted: true, duplicate: false });
    const first = createFirestoreProgressEventStore({ db, authUid: "progress-auth-a", stableUid: "progress-user-a", accountGeneration: 1, accountScopeHash: deriveProgressAccountScopeHash("progress-user-a", 1), seasonObjectReader, episodeResolver });
    const second = createFirestoreProgressEventStore({ db, authUid: "progress-auth-b", stableUid: "progress-user-b", accountGeneration: 1, accountScopeHash: deriveProgressAccountScopeHash("progress-user-b", 1), seasonObjectReader, episodeResolver });
    await expect(applyProgressEvent(first, { ...base, accountScopeHash: deriveProgressAccountScopeHash("progress-user-a", 1), idempotencyKey: "emulator-progress-op-a" })).resolves.toMatchObject({ accepted: true, duplicate: false });
    const secondAttemptBody = { ...attemptBody, opId: "emulator-progress-attempt-b" };
    const secondAttemptRef = buildCanonicalAttemptRef(secondAttemptBody);
    await expect(applyProgressEvent(second, { ...base, accountScopeHash: deriveProgressAccountScopeHash("progress-user-b", 1), idempotencyKey: "emulator-progress-op-b", attemptBody: secondAttemptBody, attemptRef: secondAttemptRef, evidenceBundle: { ...base.evidenceBundle, attemptRef: secondAttemptRef } })).resolves.toMatchObject({ accepted: true, duplicate: false });
    const snapshots = await db.getAll(db.doc(`users/progress-user-a/v2_progress/${deriveProgressAccountScopeHash("progress-user-a", 1)}/seasons/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`), db.doc(`users/progress-user-b/v2_progress/${deriveProgressAccountScopeHash("progress-user-b", 1)}/seasons/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`));
    expect(snapshots.every((snapshot) => snapshot.exists)).toBe(true);
    expect(snapshots[0].data()?.projection.performanceStars).toBe(0);
    expect(snapshots[0].ref.path).not.toBe(snapshots[1].ref.path);

    const collisionScope = deriveProgressAccountScopeHash("progress-user-a", 1);
    const operationCountBeforeCollisionCases = (await db.collection("users/progress-user-a/v2_progress_ops").get()).size;
    const attemptCountBeforeCollisionCases = (await db.collection("users/progress-user-a/v2_progress_attempts").get()).size;
    const collisionInputs = [
      { idempotencyKey: "collision:key-0001", opId: "collision/attempt-0001" },
      { idempotencyKey: "collision_key-0001", opId: "collision_attempt-0001" },
    ] as const;
    const collisionRequests = collisionInputs.map(({ idempotencyKey, opId }) => {
      const collisionAttemptBody = { ...attemptBody, opId };
      const collisionAttemptRef = buildCanonicalAttemptRef(collisionAttemptBody);
      return {
        ...base,
        accountScopeHash: collisionScope,
        idempotencyKey,
        attemptBody: collisionAttemptBody,
        attemptRef: collisionAttemptRef,
        evidenceBundle: { ...base.evidenceBundle, attemptRef: collisionAttemptRef },
      };
    });
    for (const request of collisionRequests) {
      await expect(applyProgressEvent(first, request)).resolves.toMatchObject({ accepted: true, duplicate: false });
    }
    for (const request of collisionRequests) {
      await expect(applyProgressEvent(first, request)).resolves.toMatchObject({ accepted: true, duplicate: true });
    }
    const collisionOperations = await db.collection("users/progress-user-a/v2_progress_ops").get();
    const collisionAttempts = await db.collection("users/progress-user-a/v2_progress_attempts").get();
    expect(collisionOperations.size - operationCountBeforeCollisionCases).toBe(2);
    expect(collisionAttempts.size - attemptCountBeforeCollisionCases).toBe(2);
    expect(collisionInputs.every(({ opId }) => collisionOperations.docs.some((document) => document.data()?.result?.canonicalAttemptRef?.opId === opId))).toBe(true);
    expect(collisionRequests.every((request) => collisionAttempts.docs.some((document) => document.data()?.attemptBodyHash === request.attemptRef.attemptBodyHash))).toBe(true);

    const positive = createFirestoreProgressEventStore({
      db,
      authUid: "progress-auth-positive",
      stableUid: "progress-positive-user",
      accountGeneration: 1,
      accountScopeHash: deriveProgressAccountScopeHash("progress-positive-user", 1),
      seasonObjectReader,
      episodeResolver,
      scoringTemplates: { read: async (ref) => ref.contentHash === PILOT_TEMPLATE_HASH ? { body: PILOT_TEMPLATE_BODY } : undefined },
      scoringPolicies: createCodeOwnedScoringPolicyCatalog([PILOT_SCORING_POLICY_BODY]),
    });
    const scoreRequest = (opId: string, resultCode: "NEEDS_WORK_CONFIDENT" | "CORRECT" | "WRONG", idempotencyKey: string) => {
      const scoredAttemptBody = { ...attemptBody, opId, outcome: { resultCode } } as const;
      const scoredAttemptRef = buildCanonicalAttemptRef(scoredAttemptBody);
      return { ...base, accountScopeHash: deriveProgressAccountScopeHash("progress-positive-user", 1), idempotencyKey, attemptBody: scoredAttemptBody, attemptRef: scoredAttemptRef, evidenceBundle: { ...base.evidenceBundle, attemptRef: scoredAttemptRef }, projection: { ...base.projection, candidateStars: 3 } };
    };
    await expect(applyProgressEvent(positive, scoreRequest("score-attempt-1", "NEEDS_WORK_CONFIDENT", "score-op-1"))).resolves.toMatchObject({ accepted: true, duplicate: false });
    const positiveSlotPath = `users/progress-positive-user/v2_progress/${deriveProgressAccountScopeHash("progress-positive-user", 1)}/seasons/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`;
    expect((await db.doc(positiveSlotPath).get()).data()?.projection).toMatchObject({ performanceStars: 1, performanceStarsDelta: 1 });
    await expect(applyProgressEvent(positive, scoreRequest("score-attempt-2", "CORRECT", "score-op-2"))).resolves.toMatchObject({ accepted: true, duplicate: false });
    expect((await db.doc(positiveSlotPath).get()).data()?.projection).toMatchObject({ performanceStars: 3, performanceStarsDelta: 2 });
    await expect(applyProgressEvent(positive, scoreRequest("score-attempt-2", "CORRECT", "score-op-2"))).resolves.toMatchObject({ duplicate: true });
    await applyProgressEvent(positive, scoreRequest("score-attempt-3", "WRONG", "score-op-3"));
    expect((await db.doc(positiveSlotPath).get()).data()?.projection.performanceStars).toBe(3);

    const raceStableUid = "progress-race-user";
    const raceAuthUid = "progress-auth-race";
    const raceScope = deriveProgressAccountScopeHash(raceStableUid, 1);
    const raceAttemptBody = { ...attemptBody, opId: "emulator-progress-attempt-race" };
    const raceAttemptRef = buildCanonicalAttemptRef(raceAttemptBody);
    const raceRequest = {
      ...base,
      accountScopeHash: raceScope,
      idempotencyKey: "emulator-progress-op-race",
      attemptBody: raceAttemptBody,
      attemptRef: raceAttemptRef,
      evidenceBundle: { ...base.evidenceBundle, attemptRef: raceAttemptRef },
    };
    await db.doc(`auth_links/${raceAuthUid}`).set({ stable_id: raceStableUid });
    await db.doc(`users/${raceStableUid}`).set({ accountGeneration: 1 });
    let bindingReadAttempts = 0;
    let signalFirstBindingReads!: () => void;
    const firstBindingReads = new Promise<void>((resolve) => { signalFirstBindingReads = resolve; });
    let releaseFirstAttempt!: () => void;
    const firstAttemptMayContinue = new Promise<void>((resolve) => { releaseFirstAttempt = resolve; });
    await environment.withSecurityRulesDisabled(async (context) => {
      const clientDb = context.firestore();
      const optimisticDb = {
        doc: (documentPath: string) => doc(clientDb, documentPath),
        runTransaction: <T>(work: (transaction: any) => Promise<T>) => runTransaction(clientDb, async (transaction) => work({
          get: async (ref: any) => {
            const snapshot = await transaction.get(ref);
            return { exists: snapshot.exists(), data: () => snapshot.data() };
          },
          create: (ref: any, value: any) => transaction.set(ref, value),
          set: (ref: any, value: any, options?: any) => options ? transaction.set(ref, value, options) : transaction.set(ref, value),
        })),
      };
      const racing = createFirestoreProgressEventStore({
        db: optimisticDb as any,
        authUid: raceAuthUid,
        stableUid: raceStableUid,
        accountGeneration: 1,
        accountScopeHash: raceScope,
        seasonObjectReader,
        episodeResolver,
        testHooks: {
          afterBindingReads: async () => {
            bindingReadAttempts += 1;
            if (bindingReadAttempts === 1) {
              signalFirstBindingReads();
              await firstAttemptMayContinue;
            }
          },
        },
      });
      const raceResult = applyProgressEvent(racing, raceRequest);
      await firstBindingReads;
      try {
        await db.doc(`users/${raceStableUid}`).update({ accountGeneration: 2 });
      } finally {
        releaseFirstAttempt();
      }
      await expect(raceResult).rejects.toThrow("account_generation_mismatch");
    });
    expect(bindingReadAttempts).toBe(2);
    const raceOperationPath = `users/${raceStableUid}/v2_progress_ops/${progressOperationDocumentId(raceScope, "emulator-progress-season-r1", "emulator-progress-op-race")}`;
    const raceAttemptPath = `users/${raceStableUid}/v2_progress_attempts/${progressAttemptDocumentId(raceScope, "emulator-progress-season-r1", "emulator-progress-episode", "emulator-progress-attempt-race")}`;
    const raceProjectionPath = `users/${raceStableUid}/v2_progress/${raceScope}/seasons/emulator-progress-season-r1/episodes/emulator-progress-episode/slots/slot-1`;
    const raceArtifacts = await db.getAll(db.doc(raceOperationPath), db.doc(raceAttemptPath), db.doc(raceProjectionPath));
    expect(raceArtifacts.every((snapshot) => !snapshot.exists)).toBe(true);
    expect((await db.collection(`users/${raceStableUid}/v2_progress/${raceScope}/seasons/emulator-progress-season-r1/episodes/emulator-progress-episode/evidence`).get()).empty).toBe(true);

    await db.doc("content_season_lifecycle/emulator-progress-season-r1").update({ status: "archived", lifecycleRevision: 2 });
    const archivedAttemptBody = { ...attemptBody, opId: "emulator-progress-attempt-archived" };
    const archivedAttemptRef = buildCanonicalAttemptRef(archivedAttemptBody);
    await expect(applyProgressEvent(first, { ...base, idempotencyKey: "emulator-progress-op-archived", attemptBody: archivedAttemptBody, attemptRef: archivedAttemptRef, evidenceBundle: { ...base.evidenceBundle, attemptRef: archivedAttemptRef }, accountScopeHash: deriveProgressAccountScopeHash("progress-user-a", 1) })).rejects.toThrow("v2_progress_season_not_approved_or_stale");
    const archivedScope = deriveProgressAccountScopeHash("progress-user-a", 1);
    expect((await db.doc(`users/progress-user-a/v2_progress_ops/${progressOperationDocumentId(archivedScope, "emulator-progress-season-r1", "emulator-progress-op-archived")}`).get()).exists).toBe(false);
  });

  it("denies direct client writes to the server-owned progress subtree", async () => {
    const context = environment.authenticatedContext("progress-client");
    const target = doc(context.firestore(), "users/progress-client/v2_progress/scope-r1/seasons/season-r1/episodes/episode-1/evidence/client-tuple");
    await assertFails(setDoc(target, { forged: true }));
  });

});
