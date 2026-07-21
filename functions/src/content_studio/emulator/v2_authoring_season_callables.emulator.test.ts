import { readFileSync } from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, type DocumentSnapshot } from "firebase/firestore";
import {
  canonicalJsonV1,
  decisionRegistryObjectPath,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../../modules/learning-v2/policies/decision_registry";
import {
  createSeasonDraft,
  pinApprovedEpisodeRevisions,
} from "../../../../modules/learning-v2/authoring/season_draft";
import {
  episodeRevisionFingerprint,
  episodeRevisionObjectPath,
} from "../episode_revision_resolver";
import { readImmutableCanonicalObject } from "../immutable_object_reader";
import { adminSaveV2SeasonDraft } from "../../admin_content_studio_callables";

const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");

const makeEpisodeBody = (
  ordinal = 1,
  seasonId = "season-callable-1",
  draftId = "season-episode-draft-1",
) => ({
  schemaVersion: "episode-authoring-body.v1",
  draftId,
  episodeId: `season-episode-${ordinal}`,
  revision: 1,
  seasonId,
  ordinal,
  chapterId: `chapter-${Math.ceil(ordinal / 8)}`,
  studyTarget: "en",
  learnerSourceLocale: "ru",
  title: [],
  canDoOutcome: [],
  scenario: {},
  phraseFrames: [],
  semanticSlots: [],
  contentUnits: {},
  activityInstances: [
    {
      schemaVersion: "v2-activity-instance-body.v1",
      activityId: "activity-1",
      revision: 1,
      episodeId: `season-episode-${ordinal}`,
      progressCompatibilityKey: "activity-1",
      family: "visual_discovery",
      templateRef: {
        templateId: "template-1",
        version: 1,
        contentHash: "a".repeat(64),
      },
      estimatedSeconds: 10,
      payload: {},
      payloadHash: hashCanonicalBody({}),
      contentUnitIds: [],
      overrides: {},
      tags: {
        skillIds: [],
        grammar: [],
        vocabulary: [],
        scenario: [],
        modalities: ["reading"],
      },
      localization: {
        studyTarget: "en",
        learnerSourceLocale: "ru",
        requiredLocales: ["en", "ru"],
        fieldSourceHashes: {},
      },
      assets: [],
    },
  ],
  delayedProbeDefinitions: [],
  graph: {
    startNodeId: "node-1",
    capstoneNodeId: "node-1",
    nodes: [
      {
        nodeId: "node-1",
        activityId: "activity-1",
        position: 1,
        visible: true,
        requiredForCore: true,
        voiceEvidenceOptional: true,
        phase: "encounter_build",
        evidenceDeclarations: [],
        gateEligible: false,
        maxStars: 0,
      },
    ],
    edges: [],
  },
  starSlots: [],
  requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
  assessmentNodes: { independentProbeNodeIds: [] },
  capstoneContract: {
    objectiveIds: [],
    requiredSemanticSlotIds: [],
    criticalConstraintIds: [],
    primaryNodeIds: [],
    deterministicAlternateNodeIds: [],
  },
  masteryContract: { requirements: [] },
  learningDesign: {},
  voiceGovernance: { requirementsByTemplate: [] },
  reviewLinks: [],
  minAppVersion: "1.0.0",
});

describe("V2 Season authoring callable with immutable Storage", () => {
  let environment: RulesTestEnvironment;
  let app: admin.app.App;

  beforeAll(async () => {
    if (
      !process.env.FIRESTORE_EMULATOR_HOST ||
      !process.env.STORAGE_EMULATOR_HOST
    )
      throw new Error("Firestore and Storage emulators are required");
    app = admin.initializeApp({
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.appspot.com`,
    });
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, "utf8") },
    });
  });

  afterAll(async () => {
    await environment?.cleanup();
    await app?.delete();
  });

  it("creates a vertical-slice Season after reading Episode bytes from Storage", async () => {
    const body = makeEpisodeBody();
    const serialized = canonicalJsonV1(body);
    const contentHash = hashCanonicalBody(body);
    const revisionFingerprint = episodeRevisionFingerprint(
      body.draftId,
      body.revision,
      contentHash,
    );
    const objectPath = episodeRevisionObjectPath(
      body.draftId,
      body.revision,
      contentHash,
    );
    const file = app.storage().bucket().file(objectPath);
    await file.save(Buffer.from(serialized, "utf8"), {
      metadata: { metadata: { contentHash } },
    });
    const [metadata] = await file.getMetadata();
    const objectGeneration = String(metadata.generation ?? "");
    const byteSize = Buffer.byteLength(serialized, "utf8");
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          "content_episode_revisions/season-episode-draft-1__r1",
        ),
        {
          record: {
            schemaVersion: "episode-authoring-record.v1",
            draftId: body.draftId,
            episodeId: body.episodeId,
            revision: body.revision,
            contentHash,
            revisionFingerprint,
            object: { objectPath, contentHash, objectGeneration, byteSize },
            provenance: {
              createdBy: "admin-season-1",
              createdAt: "2026-07-16T00:00:00.000Z",
            },
            createdAt: "2026-07-16T00:00:00.000Z",
          },
          lifecycle: {
            schemaVersion: "episode-lifecycle.v1",
            draftId: body.draftId,
            episodeId: body.episodeId,
            revision: body.revision,
            revisionFingerprint,
            status: "approved",
            changedBy: "admin-season-1",
            changedAt: "2026-07-16T00:00:00.000Z",
            lifecycleRevision: 1,
          },
        },
      );
    });

    const initial = createSeasonDraft({
      draftId: "season-draft-callable-1",
      seasonId: body.seasonId,
      scope: "vertical_slice",
      decisionRegistryRef: {
        id: "phraseman-v2-product-decisions",
        version: 1,
        contentHash: "a".repeat(64),
      },
    });
    const draft = {
      ...initial,
      body: {
        ...initial.body,
        episodeRevisionRefs: [
          {
            draftId: body.draftId,
            episodeId: body.episodeId,
            revision: body.revision,
            revisionFingerprint,
            contentHash,
            ordinal: body.ordinal,
            chapterId: body.chapterId,
            approvalStatus: "approved" as const,
          },
        ],
      },
    };
    const first = await adminSaveV2SeasonDraft.run({
      data: {
        draftId: draft.body.draftId,
        expectedRevision: 0,
        expectedFingerprint: "",
        draft,
      },
      auth: {
        uid: "admin-season-1",
        token: { admin: true, adminRole: "content_editor" },
      },
    } as never);
    expect(first.ok).toBe(true);
    expect(first.draft.record.revision).toBe(1);
  });

  it("rejects malformed bytes from the real Storage emulator", async () => {
    const objectPath = "content-studio/test-tamper/episode.json";
    const file = app.storage().bucket().file(objectPath);
    const expectedHash = hashCanonicalBody({ stable: true });
    await file.save(Buffer.from(canonicalJsonV1({ stable: true }), "utf8"), {
      metadata: { metadata: { contentHash: expectedHash } },
    });
    const [metadata] = await file.getMetadata();
    const generation = String(metadata.generation ?? "");

    await file.save(Buffer.from([0xff]), {
      metadata: { metadata: { contentHash: expectedHash } },
    });
    const [tamperedMetadata] = await file.getMetadata();
    await expect(
      readImmutableCanonicalObject(file, {
        expectedHash,
        expectedGeneration: generation,
        expectedByteSize: 1,
      }),
    ).rejects.toThrow("immutable_object_generation_invalid");

    await expect(
      readImmutableCanonicalObject(file, {
        expectedHash,
        expectedGeneration: String(tamperedMetadata.generation ?? ""),
        expectedByteSize: 1,
      }),
    ).rejects.toThrow("immutable_object_utf8_invalid");

    const malformedJsonHash = sha256Utf8("{");
    await file.save(Buffer.from("{", "utf8"), {
      metadata: { metadata: { contentHash: malformedJsonHash } },
    });
    const [malformedJsonMetadata] = await file.getMetadata();
    await expect(
      readImmutableCanonicalObject(file, {
        expectedHash: malformedJsonHash,
        expectedGeneration: String(malformedJsonMetadata.generation ?? ""),
        expectedByteSize: 1,
      }),
    ).rejects.toThrow("immutable_object_json_invalid");

    await file.delete();
    await expect(
      readImmutableCanonicalObject(file, {
        expectedHash: malformedJsonHash,
        expectedGeneration: String(malformedJsonMetadata.generation ?? ""),
        expectedByteSize: 1,
      }),
    ).rejects.toBeDefined();
  });

  it("pins the full 32-episode Season, reads DecisionRegistry bytes, and enforces CAS/owner", async () => {
    const seasonId = "season-callable-full-1";
    const seasonDraftId = "season-draft-callable-full-1";
    const refs = [] as Array<{
      draftId: string;
      episodeId: string;
      revision: number;
      revisionFingerprint: string;
      contentHash: string;
      ordinal: number;
      chapterId: string;
      approvalStatus: "approved";
    }>;
    const episodeDocuments = [] as Array<{
      path: string;
      data: Record<string, unknown>;
    }>;
    for (let ordinal = 1; ordinal <= 32; ordinal += 1) {
      const body = makeEpisodeBody(
        ordinal,
        seasonId,
        `season-full-episode-draft-${ordinal}`,
      );
      const serialized = canonicalJsonV1(body);
      const contentHash = hashCanonicalBody(body);
      const revisionFingerprint = episodeRevisionFingerprint(
        body.draftId,
        body.revision,
        contentHash,
      );
      const objectPath = episodeRevisionObjectPath(
        body.draftId,
        body.revision,
        contentHash,
      );
      const file = app.storage().bucket().file(objectPath);
      await file.save(Buffer.from(serialized, "utf8"), {
        metadata: { metadata: { contentHash } },
      });
      const [metadata] = await file.getMetadata();
      const objectGeneration = String(metadata.generation ?? "");
      const byteSize = Buffer.byteLength(serialized, "utf8");
      const envelope = {
        body,
        record: {
          schemaVersion: "episode-authoring-record.v1",
          draftId: body.draftId,
          episodeId: body.episodeId,
          revision: body.revision,
          contentHash,
          revisionFingerprint,
          object: { objectPath, contentHash, objectGeneration, byteSize },
          provenance: {
            createdBy: "admin-full-1",
            createdAt: "2026-07-16T00:00:00.000Z",
          },
          createdAt: "2026-07-16T00:00:00.000Z",
        },
        lifecycle: {
          schemaVersion: "episode-lifecycle.v1",
          draftId: body.draftId,
          episodeId: body.episodeId,
          revision: body.revision,
          revisionFingerprint,
          status: "approved",
          changedBy: "admin-full-1",
          changedAt: "2026-07-16T00:00:00.000Z",
          lifecycleRevision: 1,
        },
      };
      refs.push({
        draftId: body.draftId,
        episodeId: body.episodeId,
        revision: body.revision,
        revisionFingerprint,
        contentHash,
        ordinal,
        chapterId: body.chapterId,
        approvalStatus: "approved",
      });
      episodeDocuments.push({
        path: `content_episode_revisions/${body.draftId}__r1`,
        data: { record: envelope.record, lifecycle: envelope.lifecycle },
      });
    }

    const fixturePath = path.resolve(
      __dirname,
      "../../../../tests/fixtures/learning-v2/content-studio/decision-registry.v1.json",
    );
    const corpus = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      baseline: { body: Record<string, unknown> };
    };
    const registryBody = corpus.baseline.body;
    const registryId = String(registryBody.registryId);
    const registryVersion = Number(registryBody.version);
    const registryHash = hashCanonicalBody(registryBody);
    const registrySerialized = canonicalJsonV1(registryBody);
    const registryPath = decisionRegistryObjectPath(
      registryId,
      registryVersion,
      registryHash,
    );
    const registryFile = app.storage().bucket().file(registryPath);
    await registryFile.save(Buffer.from(registrySerialized, "utf8"), {
      metadata: { metadata: { contentHash: registryHash } },
    });
    const [registryMetadata] = await registryFile.getMetadata();
    const registryGeneration = String(registryMetadata.generation ?? "");
    const registryRecord = {
      schemaVersion: "v2-decision-registry-record.v1",
      ref: {
        id: registryId,
        version: registryVersion,
        contentHash: registryHash,
      },
      object: {
        objectPath: registryPath,
        contentHash: registryHash,
        objectGeneration: registryGeneration,
        byteSize: Buffer.byteLength(registrySerialized, "utf8"),
      },
      createdAt: "2026-07-16T00:00:00.000Z",
    };

    await environment.withSecurityRulesDisabled(async (context) => {
      for (const document of episodeDocuments)
        await setDoc(doc(context.firestore(), document.path), document.data);
      await setDoc(
      doc(
          context.firestore(),
          `content_decision_registries/${registryId}__v${registryVersion}`,
        ),
        registryRecord,
      );
    });

    const initial = createSeasonDraft({
      draftId: seasonDraftId,
      seasonId,
      scope: "full_season",
      decisionRegistryRef: {
        id: registryId,
        version: registryVersion,
        contentHash: registryHash,
      },
    });
    const draft = pinApprovedEpisodeRevisions(initial, refs, {
      version: "v2-gates-1",
    });
    const auth = {
      uid: "admin-full-1",
      token: { admin: true, adminRole: "content_editor" },
    };
    const call = (data: unknown, requestAuth = auth) =>
      adminSaveV2SeasonDraft.run({ data, auth: requestAuth } as never);
    const first = await call({
      draftId: seasonDraftId,
      expectedRevision: 0,
      expectedFingerprint: "",
      draft,
    });
    expect(first.ok).toBe(true);
    expect(first.draft.record.revision).toBe(1);

    let persisted: DocumentSnapshot | undefined;
    await environment.withSecurityRulesDisabled(async (context) => {
      persisted = await getDoc(
        doc(context.firestore(), `content_season_drafts/${seasonDraftId}`),
      );
    });
    expect(persisted?.exists()).toBe(true);
    expect(persisted?.data()?.ownerId).toBe(auth.uid);

    const contenders = await Promise.allSettled([
      call({
        draftId: seasonDraftId,
        expectedRevision: first.draft.record.revision,
        expectedFingerprint: first.draft.record.fingerprint,
        draft: first.draft,
      }),
      call({
        draftId: seasonDraftId,
        expectedRevision: first.draft.record.revision,
        expectedFingerprint: first.draft.record.fingerprint,
        draft: first.draft,
      }),
    ]);
    expect(contenders.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(contenders.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = contenders.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(String(rejected?.reason?.message ?? rejected?.reason)).toContain(
      "authoring_revision_stale",
    );
    const second = contenders.find(
      (result): result is PromiseFulfilledResult<typeof first> =>
        result.status === "fulfilled",
    );
    if (!second) throw new Error("missing concurrent Season winner");
    expect(second.value.draft.record.revision).toBe(2);
    let updatedPersisted: DocumentSnapshot | undefined;
    await environment.withSecurityRulesDisabled(async (context) => {
      updatedPersisted = await getDoc(
        doc(context.firestore(), `content_season_drafts/${seasonDraftId}`),
      );
    });
    expect(updatedPersisted?.exists()).toBe(true);
    expect(updatedPersisted?.data()?.ownerId).toBe(auth.uid);
    expect(
      (updatedPersisted?.data()?.draft as { record?: { revision?: number } })
        ?.record?.revision,
    ).toBe(2);
    const persistedDraft = updatedPersisted?.data()?.draft as {
      record?: {
        fingerprint?: string;
        contentHash?: string;
      };
    };
    expect(persistedDraft.record?.fingerprint).toBe(
      second.value.draft.record.fingerprint,
    );
    expect(persistedDraft.record?.contentHash).toBe(
      second.value.draft.record.contentHash,
    );
    await expect(
      call(
        {
          draftId: seasonDraftId,
          expectedRevision: second.value.draft.record.revision,
          expectedFingerprint: second.value.draft.record.fingerprint,
          draft: second.value.draft,
        },
        {
          uid: "admin-full-other",
          token: { admin: true, adminRole: "content_editor" },
        },
      ),
    ).rejects.toThrow("authoring_owner_forbidden");
    await expect(
      call({
        draftId: seasonDraftId,
        expectedRevision: first.draft.record.revision,
        expectedFingerprint: first.draft.record.fingerprint,
        draft: first.draft,
      }),
    ).rejects.toThrow("authoring_revision_stale");
  });
});
