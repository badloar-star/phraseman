import {
  buildLesson1LegacyActivityBindings,
  buildLesson1LegacyV2SourcePayload,
} from "../../../modules/learning-v2/content/legacy_lesson_payload";
import { buildE1DemoProfile } from "../../../modules/learning-v2/content/e1_demo_bank";
import { compileV2RequiredSessions } from "../../../modules/learning-v2/content/session_compiler";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildV2SeasonReleaseRecord,
  v2ManifestHash,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleasePointer,
} from "./v2_release_adapter";
import type { V2CompiledEpisodeArtifact } from "./v2_content_compilation";
import { materializeCompiledRequiredTaskAnswerKeys } from "./v2_content_compilation";
import {
  episodeRevisionFingerprint,
  episodeRevisionObjectPath,
} from "../content_studio/episode_revision_resolver";
import {
  materializeSessionSetFromCompiledArtifact,
  publishRequiredSessionSetFromApprovedRelease,
  publishedRequiredSessionAnswerManifestDocumentId,
  publishedRequiredSessionSetDocumentId,
  requiredSessionSetId,
  type RequiredSessionPublicationDependencies,
} from "./v2_required_session_publication";
import {
  activateRequiredSessionRelease,
  activateStoredRequiredSessionRelease,
  createFirestoreV2SeasonReleaseManifestStore,
  createFirestoreV2SeasonReleasePointerStore,
  v2SeasonReleasePointerId,
  v2SeasonReleasePointerDocumentId,
  v2SeasonReleaseManifestDocumentId,
  type V2SeasonReleasePointerStore,
} from "./v2_required_session_activation";

const buildFixture = () => {
  const source = buildLesson1LegacyV2SourcePayload();
  const compiledSessions = compileV2RequiredSessions({
    episodeId: source.episodeId,
    canDoOutcomeId: "obj-lesson-01-to-be-statements",
    profile: buildE1DemoProfile(),
    items: source.contentItems,
    activityBindings: buildLesson1LegacyActivityBindings(source.contentItems),
  });
  const compiled = {
    ...compiledSessions,
    languageProfileRef: {
      profileId: "profile.e1",
      version: 1,
      contentHash: "8".repeat(64),
    },
    optionalPracticeTemplates: [],
    requiredTaskAnswerKeys: materializeCompiledRequiredTaskAnswerKeys(
      compiledSessions,
      source.contentItems,
    ),
    qualityReport: {
      schemaVersion: "v2-episode-content-quality-report.v1",
      episodeId: source.episodeId,
      ok: true,
      blockingIssues: [],
      warningIssues: [],
      checkedContentItemIds: source.contentItems.map((item) => item.contentItemId),
      checkedSessionIds: compiledSessions.sessions.map((session) => session.sessionId),
      languageProfileRef: null,
    },
  } as V2CompiledEpisodeArtifact;
  const sessionSet = materializeSessionSetFromCompiledArtifact(compiled, 1);
  const sessionSetHash = hashCanonicalBody(sessionSet);
  const compiledHash = hashCanonicalBody(compiled);
  const episodeBody = {
    draftId: "draft-lesson-1",
    episodeId: source.episodeId,
    revision: 1,
    ordinal: 1,
    chapterId: "chapter-1",
    sessionSetRef: { episodeId: source.episodeId, version: 1, contentHash: sessionSetHash },
  };
  const episodeContentHash = hashCanonicalBody(episodeBody);
  const episodeRef = {
    draftId: "draft-lesson-1",
    episodeId: source.episodeId,
    revision: 1,
    revisionFingerprint: episodeRevisionFingerprint("draft-lesson-1", 1, episodeContentHash),
    contentHash: episodeContentHash,
    ordinal: 1,
    chapterId: "chapter-1",
    approvalStatus: "approved" as const,
  };
  const seasonContentHash = "d".repeat(64);
  const manifestBody: V2SeasonReleaseManifestBody = {
    schemaVersion: "v2-season-release-manifest-body.v1",
    releaseId: "release-e1-1",
    courseReleaseId: "english-core-r1",
    seasonId: "season-e1",
    seasonRevision: 1,
    seasonContentHash,
    studyTarget: "en",
    learnerSourceLocale: "ru",
    releaseScope: "vertical_slice",
    decisionRegistryRef: { id: "decision-registry", version: 1, contentHash: "1".repeat(64) },
    supportManifestRefs: [
      { platform: "ios", environment: "lab", minAppVersion: "1.0.0", manifestId: "ios-e1", contentHash: "2".repeat(64) },
      { platform: "android", environment: "lab", minAppVersion: "1.0.0", manifestId: "android-e1", contentHash: "3".repeat(64) },
    ],
    voiceNetworkEgressRefs: [],
    lessonUnits: [{
      episodeId: source.episodeId,
      lessonId: 1,
      object: { path: "learning-v2/e1.json", generation: "g-1", contentHash: compiledHash, byteSize: 1000 },
    }],
  };
  const manifestHash = v2ManifestHash(manifestBody);
  const manifestRecord = buildV2SeasonReleaseRecord(manifestBody, {
    path: "learning-v2/release-e1-1.json",
    generation: "g-release-1",
    contentHash: manifestHash,
    byteSize: 2000,
  }, "2026-08-10T12:00:00.000Z");
  const activePointer: V2SeasonReleasePointer = {
    schemaVersion: "v2-season-release-pointer.v1",
    pointerId: "lab:en:ru:season-e1",
    environment: "lab",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "season-e1",
    activeReleaseId: manifestBody.releaseId,
    activeManifestHash: manifestHash,
    rollout: { revision: 1, state: "internal", percent: 0, cohortSaltVersion: 1, allowlistCohortIds: [], excludeCohortIds: [] },
    expectedCatalogRevision: 1,
    updatedBy: "owner-1",
    updatedAt: "2026-08-10T12:00:00.000Z",
  };
  const season = {
    body: { schemaVersion: "season-authoring-body.v1" as const, episodeRevisionRefs: [episodeRef] },
    record: {
      schemaVersion: "season-authoring-record.v1" as const,
      draftId: "season-draft-e1",
      seasonId: manifestBody.seasonId,
      revision: 1,
      contentHash: seasonContentHash,
      revisionFingerprint: "e".repeat(64),
      object: { objectPath: "season", contentHash: seasonContentHash, objectGeneration: "1", byteSize: 1 },
      provenance: {},
      createdAt: "2026-08-10T12:00:00.000Z",
    },
    lifecycle: {
      schemaVersion: "season-lifecycle.v1" as const,
      draftId: "season-draft-e1",
      seasonId: manifestBody.seasonId,
      revision: 1,
      revisionFingerprint: "e".repeat(64),
      status: "approved" as const,
      changedBy: "owner-1",
      changedAt: "2026-08-10T12:00:00.000Z",
      lifecycleRevision: 1,
    },
  };
  const episode = {
    ...episodeRef,
    body: episodeBody,
    bodyHash: episodeContentHash,
    objectPath: episodeRevisionObjectPath("draft-lesson-1", 1, episodeContentHash),
    objectGeneration: "1",
    record: {
      schemaVersion: "episode-authoring-record.v1" as const,
      draftId: "draft-lesson-1",
      episodeId: source.episodeId,
      revision: 1,
      contentHash: episodeContentHash,
      revisionFingerprint: episodeRef.revisionFingerprint,
      object: {
        objectPath: episodeRevisionObjectPath("draft-lesson-1", 1, episodeContentHash),
        contentHash: episodeContentHash,
        objectGeneration: "1",
        byteSize: 1,
      },
      provenance: { createdBy: "owner-1", createdAt: "2026-08-10T12:00:00.000Z" },
      createdAt: "2026-08-10T12:00:00.000Z",
    },
    lifecycle: {
      schemaVersion: "episode-lifecycle.v1" as const,
      draftId: "draft-lesson-1",
      episodeId: source.episodeId,
      revision: 1,
      revisionFingerprint: episodeRef.revisionFingerprint,
      status: "approved" as const,
      changedBy: "owner-1",
      changedAt: "2026-08-10T12:00:00.000Z",
      lifecycleRevision: 1,
    },
  };
  let existing: unknown;
  let existingAnswerManifest: unknown;
  const putIfAbsent = jest.fn(async (_documentId: string, publication: unknown) => {
    if (existing) return { status: "existing" as const, value: existing };
    existing = publication;
    return { status: "created" as const };
  });
  const putAnswerManifestIfAbsent = jest.fn(async (_documentId: string, manifest: unknown) => {
    if (existingAnswerManifest) {
      return { status: "existing" as const, value: existingAnswerManifest };
    }
    existingAnswerManifest = manifest;
    return { status: "created" as const };
  });
  const dependencies: RequiredSessionPublicationDependencies = {
    resolveSeasonRevision: async () => season,
    episodeResolver: { resolve: async () => episode, validateBody: () => true },
    resolveCompiledLessonUnit: async () => ({ body: compiled, contentHash: compiledHash, generation: "g-1", byteSize: 1000 }),
    publicationStore: { putIfAbsent },
    answerManifestStore: { putIfAbsent: putAnswerManifestIfAbsent },
  };
  return {
    activePointer,
    manifestRecord,
    manifestBody,
    dependencies,
    putIfAbsent,
    putAnswerManifestIfAbsent,
    episode,
    compiled,
    sessionSetHash,
  };
};

const request = (fixture: ReturnType<typeof buildFixture>) => ({
  expectedEnvironment: "lab" as const,
  activePointer: fixture.activePointer,
  manifestRecord: fixture.manifestRecord,
  manifestBody: fixture.manifestBody,
  seasonRevisionId: "season-e1-r1",
  episodeId: "ep-lesson-01",
});

test("publishes only the session-set pinned by the approved release/season/episode chain", async () => {
  const fixture = buildFixture();
  const result = await publishRequiredSessionSetFromApprovedRelease(request(fixture), fixture.dependencies);
  expect(result.status).toBe("published");
  expect(result.documentId).toBe(publishedRequiredSessionSetDocumentId(requiredSessionSetId("ep-lesson-01", 1)));
  expect(result.publication).toMatchObject({
    courseId: "english-core",
    courseReleaseId: "english-core-r1",
    seasonRevisionId: "season-e1-r1",
    sessionSetHash: fixture.sessionSetHash,
  });
  expect(result.publication.sessionSet.sessions).toHaveLength(12);
  expect(result.publication).toMatchObject({
    schemaVersion: "learning-v2-published-required-session-set.v2",
    episodeOrdinal: 1,
  });
  expect(result.answerManifestDocumentId).toBe(
    publishedRequiredSessionAnswerManifestDocumentId(result.publication.sessionSetId),
  );
  expect(result.answerManifest.answerKeys).toHaveLength(
    fixture.compiled.requiredTaskAnswerKeys.length,
  );
  expect(fixture.putIfAbsent).toHaveBeenCalledTimes(1);
  expect(fixture.putAnswerManifestIfAbsent).toHaveBeenCalledTimes(1);
});

test("exact publication retry is idempotent", async () => {
  const fixture = buildFixture();
  await publishRequiredSessionSetFromApprovedRelease(request(fixture), fixture.dependencies);
  await expect(publishRequiredSessionSetFromApprovedRelease(request(fixture), fixture.dependencies))
    .resolves.toMatchObject({ status: "replayed" });
});

test("rejects compiled-unit or Episode session-set substitution before publication", async () => {
  const fixture = buildFixture();
  await expect(publishRequiredSessionSetFromApprovedRelease(request(fixture), {
    ...fixture.dependencies,
    resolveCompiledLessonUnit: async (ref) => ({ body: fixture.compiled, contentHash: "f".repeat(64), generation: ref.generation, byteSize: ref.byteSize }),
  })).rejects.toThrow("required_session_release_unit_mismatch");
  await expect(publishRequiredSessionSetFromApprovedRelease(request(fixture), {
    ...fixture.dependencies,
    episodeResolver: {
      ...fixture.dependencies.episodeResolver,
      resolve: async () => ({
        ...fixture.episode,
        body: {
          ...fixture.episode.body,
          sessionSetRef: { episodeId: "ep-lesson-01", version: 1, contentHash: "f".repeat(64) },
        },
      }),
    },
  })).rejects.toThrow("season_episode_revision_not_approved_or_stale");
  expect(fixture.putIfAbsent).not.toHaveBeenCalled();
});

test("rejects a competing publication at the same deterministic key", async () => {
  const fixture = buildFixture();
  const first = await publishRequiredSessionSetFromApprovedRelease(request(fixture), fixture.dependencies);
  const conflicting = { ...first.publication, publicationFingerprint: "f".repeat(64) };
  await expect(publishRequiredSessionSetFromApprovedRelease(request(fixture), {
    ...fixture.dependencies,
    publicationStore: { putIfAbsent: async () => ({ status: "existing", value: conflicting }) },
  })).rejects.toThrow("published_required_session_set_invalid");
});

const activationInput = (fixture: ReturnType<typeof buildFixture>) => ({
  expectedEnvironment: "lab" as const,
  nextPointer: fixture.activePointer,
  manifestRecord: fixture.manifestRecord,
  manifestBody: fixture.manifestBody,
  seasonRevisionId: "season-e1-r1",
  expectedCurrentRolloutRevision: 0,
  expectedCurrentReleaseId: null,
});
const activationCatalog = (fixture: ReturnType<typeof buildFixture>) => ({
  read: async () => ({
    revision: fixture.activePointer.expectedCatalogRevision,
    activeReleaseId: fixture.manifestBody.courseReleaseId,
  }),
});

test("stages every session publication before the single V2 pointer CAS", async () => {
  const fixture = buildFixture();
  const order: string[] = [];
  let current: unknown;
  const publicationStore = {
    putIfAbsent: jest.fn(async (documentId: string, publication: unknown) => {
      order.push(`publication:${documentId}`);
      return fixture.dependencies.publicationStore.putIfAbsent(documentId, publication as never);
    }),
  };
  const answerManifestStore = {
    putIfAbsent: jest.fn(async (documentId: string, manifest: unknown) => {
      order.push(`answer-manifest:${documentId}`);
      return fixture.dependencies.answerManifestStore.putIfAbsent(
        documentId,
        manifest as never,
      );
    }),
  };
  const pointerStore: V2SeasonReleasePointerStore = {
    read: async () => current,
    compareAndSet: jest.fn(async (_id, _expected, next) => {
      expect(publicationStore.putIfAbsent).toHaveBeenCalledTimes(1);
      expect(answerManifestStore.putIfAbsent).toHaveBeenCalledTimes(1);
      order.push("pointer-cas");
      current = next;
      return "committed";
    }),
  };
  const result = await activateRequiredSessionRelease(activationInput(fixture), {
    ...fixture.dependencies,
    publicationStore,
    answerManifestStore,
    pointerStore,
    courseCatalog: activationCatalog(fixture),
  });
  expect(result).toMatchObject({ status: "activated", publishedEpisodeIds: ["ep-lesson-01"] });
  expect(order[0]).toMatch(/^publication:/);
  expect(order[1]).toMatch(/^answer-manifest:/);
  expect(order.at(-1)).toBe("pointer-cas");
  expect(fixture.activePointer.pointerId).toBe(
    v2SeasonReleasePointerId("lab", "en", "ru", "season-e1"),
  );
});

test("production activation rejects vertical or chapter scope before any publication", async () => {
  const fixture = buildFixture();
  const manifestBody = {
    ...fixture.manifestBody,
    supportManifestRefs: [
      { ...fixture.manifestBody.supportManifestRefs[0], environment: "production" as const },
      { ...fixture.manifestBody.supportManifestRefs[1], environment: "production" as const },
    ] as const,
  };
  const manifestHash = v2ManifestHash(manifestBody);
  const manifestRecord = buildV2SeasonReleaseRecord(manifestBody, {
    path: "learning-v2/production-release.json",
    generation: "g-production",
    contentHash: manifestHash,
    byteSize: 2000,
  }, "2026-08-11T09:00:00.000Z");
  const nextPointer = {
    ...fixture.activePointer,
    pointerId: v2SeasonReleasePointerId("production", "en", "ru", fixture.manifestBody.seasonId),
    environment: "production" as const,
    activeManifestHash: manifestHash,
  };
  const publishSessionSet = jest.fn();
  await expect(activateRequiredSessionRelease({
    expectedEnvironment: "production",
    nextPointer,
    manifestRecord,
    manifestBody,
    seasonRevisionId: "season-e1-r1",
    expectedCurrentRolloutRevision: 0,
    expectedCurrentReleaseId: null,
  }, {
    ...fixture.dependencies,
    publishSessionSet,
    pointerStore: { read: async () => undefined, compareAndSet: jest.fn() },
    courseCatalog: activationCatalog(fixture),
  })).rejects.toThrow("v2_required_session_activation_scope_not_production_ready");
  expect(publishSessionSet).not.toHaveBeenCalled();
});

test("never publishes the pointer after a partial child write failure", async () => {
  const fixture = buildFixture();
  const compareAndSet = jest.fn();
  await expect(activateRequiredSessionRelease(activationInput(fixture), {
    ...fixture.dependencies,
    publicationStore: { putIfAbsent: async () => { throw new Error("storage_unavailable"); } },
    pointerStore: { read: async () => undefined, compareAndSet },
    courseCatalog: activationCatalog(fixture),
  })).rejects.toThrow("storage_unavailable");
  expect(compareAndSet).not.toHaveBeenCalled();
});

test("requires exact durable pointer readback and accepts a lost response only after exact observation", async () => {
  const fakeCommit = buildFixture();
  await expect(activateRequiredSessionRelease(activationInput(fakeCommit), {
    ...fakeCommit.dependencies,
    pointerStore: {
      read: async () => undefined,
      compareAndSet: async () => "committed",
    },
    courseCatalog: activationCatalog(fakeCommit),
  })).rejects.toThrow("v2_required_session_activation_indeterminate");

  const lostResponse = buildFixture();
  let current: unknown;
  await expect(activateRequiredSessionRelease(activationInput(lostResponse), {
    ...lostResponse.dependencies,
    pointerStore: {
      read: async () => current,
      compareAndSet: async (_id, _expected, next) => {
        current = next;
        throw new Error("transport_lost_after_commit");
      },
    },
    courseCatalog: activationCatalog(lostResponse),
  })).resolves.toMatchObject({ status: "activated" });
});

test("rejects stale activation coordinates and malformed release cardinality before staging", async () => {
  const stale = buildFixture();
  const current = {
    ...stale.activePointer,
    activeReleaseId: "release-previous",
    activeManifestHash: "9".repeat(64),
  };
  const publishSessionSet = jest.fn();
  await expect(activateRequiredSessionRelease(activationInput(stale), {
    ...stale.dependencies,
    publishSessionSet,
    pointerStore: { read: async () => current, compareAndSet: async () => "conflict" },
    courseCatalog: activationCatalog(stale),
  })).rejects.toThrow("v2_required_session_activation_conflict");
  expect(publishSessionSet).not.toHaveBeenCalled();

  const malformed = buildFixture();
  const malformedBody = { ...malformed.manifestBody, releaseScope: "chapter_internal" as const };
  const malformedHash = v2ManifestHash(malformedBody);
  const malformedRecord = buildV2SeasonReleaseRecord(malformedBody, {
    ...malformed.manifestRecord.object,
    contentHash: malformedHash,
  }, malformed.manifestRecord.createdAt);
  await expect(activateRequiredSessionRelease({
    ...activationInput(malformed),
    nextPointer: {
      ...malformed.activePointer,
      activeManifestHash: malformedHash,
    },
    manifestRecord: malformedRecord,
    manifestBody: malformedBody,
  }, {
    ...malformed.dependencies,
    publishSessionSet,
    pointerStore: { read: async () => undefined, compareAndSet: async () => "committed" },
    courseCatalog: activationCatalog(malformed),
  })).rejects.toThrow("v2_required_session_activation_unit_set_invalid");
  expect(publishSessionSet).not.toHaveBeenCalled();
});

test("binds activation to the active CourseRelease catalog and rejects hostile or extra fields", async () => {
  const fixture = buildFixture();
  const publishSessionSet = jest.fn();
  await expect(activateRequiredSessionRelease(activationInput(fixture), {
    ...fixture.dependencies,
    publishSessionSet,
    courseCatalog: { read: async () => ({ revision: 2, activeReleaseId: "another-release" }) },
    pointerStore: { read: async () => undefined, compareAndSet: async () => "committed" },
  })).rejects.toThrow("v2_required_session_activation_catalog_mismatch");
  expect(publishSessionSet).not.toHaveBeenCalled();

  await expect(activateRequiredSessionRelease({
    ...activationInput(fixture),
    manifestBody: { ...fixture.manifestBody, unreviewedOverride: true },
  }, {
    ...fixture.dependencies,
    publishSessionSet,
    courseCatalog: activationCatalog(fixture),
    pointerStore: { read: async () => undefined, compareAndSet: async () => "committed" },
  })).rejects.toThrow("v2_required_session_activation_invalid");

  let getterRuns = 0;
  const hostilePointer = { ...fixture.activePointer } as Record<string, unknown>;
  Object.defineProperty(hostilePointer, "studyTarget", {
    enumerable: true,
    get: () => {
      getterRuns += 1;
      return "en";
    },
  });
  await expect(activateRequiredSessionRelease({
    ...activationInput(fixture),
    nextPointer: hostilePointer,
  }, {
    ...fixture.dependencies,
    publishSessionSet,
    courseCatalog: activationCatalog(fixture),
    pointerStore: { read: async () => undefined, compareAndSet: async () => "committed" },
  })).rejects.toThrow("v2_required_session_activation_invalid");
  expect(getterRuns).toBe(0);
  expect(publishSessionSet).not.toHaveBeenCalled();
});

test("Firestore pointer adapter performs exact compare-and-set at the deterministic server-only key", async () => {
  const fixture = buildFixture();
  let value: unknown;
  let documentId = "";
  const ref = {
    get: async () => ({ exists: value !== undefined, data: () => value }),
  };
  const db = {
    collection: (name: string) => {
      expect(name).toBe("content_v2_season_release_pointers");
      return {
        doc: (id: string) => {
          documentId = id;
          return ref;
        },
      };
    },
    runTransaction: async (callback: (transaction: {
      get(target: unknown): Promise<{ exists: boolean; data(): unknown }>;
      set(target: unknown, next: unknown, options: unknown): void;
    }) => Promise<unknown>) => callback({
      get: async () => ({ exists: value !== undefined, data: () => value }),
      set: (_target, next, options) => {
        expect(options).toEqual({ merge: false });
        value = next;
      },
    }),
  };
  const store = createFirestoreV2SeasonReleasePointerStore(db as never);
  await expect(store.compareAndSet(
    fixture.activePointer.pointerId,
    undefined,
    fixture.activePointer,
  )).resolves.toBe("committed");
  await expect(store.read(fixture.activePointer.pointerId)).resolves.toEqual(fixture.activePointer);
  expect(documentId).toBe(v2SeasonReleasePointerDocumentId(fixture.activePointer.pointerId));
  await expect(store.compareAndSet(
    fixture.activePointer.pointerId,
    undefined,
    fixture.activePointer,
  )).resolves.toBe("conflict");
});

test("production activation resolves the exact immutable manifest by releaseId instead of request body", async () => {
  const fixture = buildFixture();
  const encoded = canonicalJsonV1(fixture.manifestBody);
  const record = {
    ...fixture.manifestRecord,
    object: {
      ...fixture.manifestRecord.object,
      byteSize: Buffer.byteLength(encoded, "utf8"),
    },
  };
  let manifestDocumentId = "";
  const db = {
    collection: (name: string) => {
      expect(name).toBe("content_v2_season_release_manifests");
      return {
        doc: (id: string) => {
          manifestDocumentId = id;
          return { get: async () => ({ exists: true, data: () => record }) };
        },
      };
    },
  };
  const bucket = {
    file: (path: string) => {
      expect(path).toBe(record.object.path);
      return {
        getMetadata: async () => [{
          generation: record.object.generation,
          metadata: { contentHash: record.object.contentHash },
        }],
        download: async () => [Buffer.from(encoded, "utf8")],
      };
    },
  };
  const manifestStore = createFirestoreV2SeasonReleaseManifestStore(db as never, bucket as never);
  await expect(manifestStore.resolve(fixture.manifestBody.releaseId)).resolves.toEqual({
    record,
    body: fixture.manifestBody,
  });
  expect(manifestDocumentId).toBe(
    v2SeasonReleaseManifestDocumentId(fixture.manifestBody.releaseId),
  );

  let current: unknown;
  await expect(activateStoredRequiredSessionRelease({
    expectedEnvironment: "lab",
    nextPointer: fixture.activePointer,
    releaseId: fixture.manifestBody.releaseId,
    seasonRevisionId: "season-e1-r1",
    expectedCurrentRolloutRevision: 0,
    expectedCurrentReleaseId: null,
  }, {
    ...fixture.dependencies,
    manifestStore,
    courseCatalog: activationCatalog(fixture),
    pointerStore: {
      read: async () => current,
      compareAndSet: async (_id, _expected, next) => {
        current = next;
        return "committed";
      },
    },
  })).resolves.toMatchObject({ status: "activated" });
});
