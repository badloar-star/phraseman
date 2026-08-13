import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import {
  createFirebaseAdminV2ConfirmedOwnerEpisodeIntroAdapterV1,
  getV2FirebaseConfirmedOwnerEpisodeIntroSummaryV1,
  isV2FirebaseConfirmedOwnerEpisodeIntroHandleV1,
  resolveV2FirebaseConfirmedOwnerEpisodeIntroMaterialV1,
} from "./v2_firebase_confirmed_owner_episode_intro_v1";
import { materializeV2OwnerAuthoredEpisodeDraftV2 } from "./v2_owner_authored_episode_input_v2";
import { materializeV2OwnerEpisodeConfirmationV1 } from "./v2_owner_episode_confirmation_v1";
import { V2_OWNER_EPISODE_STAGE_COLLECTION_V1 } from "./v2_owner_episode_stage_repository_v1";

const objects = new Map<
  string,
  Readonly<{
    raw: string;
    generation: string;
    contentHash: string;
    contentType: string;
  }>
>();
let stageRaw = "";

const storage = Object.freeze({
  async readMetadataExact(objectPath: string) {
    const found = objects.get(objectPath);
    return found
      ? Object.freeze({
          generation: found.generation,
          contentHash: found.contentHash,
          byteSize: new TextEncoder().encode(found.raw).byteLength,
          contentType: found.contentType,
        })
      : null;
  },
  async downloadGenerationExact(input: {
    objectPath: string;
    ifGenerationMatch: string;
  }) {
    const found = objects.get(input.objectPath);
    return found && found.generation === input.ifGenerationMatch
      ? Object.freeze({
          kind: "downloaded" as const,
          bytes: new TextEncoder().encode(found.raw),
        })
      : Object.freeze({ kind: "missing" as const });
  },
});

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({
    storage,
    readCanonicalDocumentExact: async (input: { documentPath: string }) => {
      if (
        !input.documentPath.startsWith(
          `${V2_OWNER_EPISODE_STAGE_COLLECTION_V1}/`,
        )
      )
        throw new Error("unexpected_document");
      return Object.freeze({
        documentPath: input.documentPath,
        canonicalRaw: stageRaw,
        readTime: Object.freeze({ seconds: "1", nanoseconds: 0 }),
        updateTime: Object.freeze({ seconds: "1", nanoseconds: 0 }),
      });
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const editor = require(
  path.join(
    __dirname,
    "..",
    "..",
    "..",
    "admin",
    "learning_v2_owner_episode_editor.js",
  ),
);
const hash = (character: string) => character.repeat(64);

function put(objectPath: string, raw: string, generation: string) {
  const value = Object.freeze({
    raw,
    generation,
    contentHash: sha256Utf8(raw),
    contentType: "application/json; charset=utf-8",
  });
  objects.set(objectPath, value);
  return Object.freeze({
    objectPath,
    contentHash: value.contentHash,
    objectGeneration: generation,
    byteSize: new TextEncoder().encode(raw).byteLength,
    contentType: value.contentType,
  });
}

function fixture() {
  objects.clear();
  const planRequest = {
    schemaVersion: "v2-canonical-plan-request.v2" as const,
    workspaceId: "owner-workspace",
    jobId: "owner-job",
    authoringRevision: 1,
    seasonId: "season-1",
    scope: "vertical_slice" as const,
    episodeIds: ["episode-1"],
    languageProfileRef: {
      profileId: "english",
      targetLanguage: "en",
      version: 1,
      contentHash: hash("a"),
    },
    speechProfileRef: {
      profileId: "speech",
      targetLanguage: "en",
      speechLocale: "en-US",
      version: 1,
      contentHash: hash("b"),
    },
    voiceGenerationProfileRef: {
      profileId: "voice",
      version: 1,
      contentHash: hash("c"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007" as const,
      version: 1,
      contentHash: hash("d"),
    },
    templateBindings: [
      {
        episodeId: "episode-1",
        templateRefs: [
          {
            templateId: "phrase-builder",
            version: 1,
            contentHash: hash("e"),
          },
        ],
      },
    ],
  };
  const planRaw = canonicalJsonV1(planRequest);
  const plan = buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(planRaw),
  );
  const stage = plan.stages.find(
    (candidate) => candidate.kind === "v2_activity_instances",
  )!;
  const reference = editor.createNeutralTestFixture({
    episodeId: "episode-1",
    targetLanguage: "en",
  });
  const material = materializeV2OwnerAuthoredEpisodeDraftV2(
    {
      contentClass: "production_candidate",
      ownerInputId: "episode-1-owner-input",
      claimedAuthorId: "owner.reference",
      stageId: stage.stageId,
      sessionSources: reference.sessionSources,
      sessionIntros: reference.sessionIntros.map(
        (intro: Record<string, unknown>) =>
          Object.freeze({ ...intro, contentClass: "production_candidate" }),
      ),
    },
    plan,
  );
  const reviewFingerprint = hashCanonicalBody("review");
  const confirmation = materializeV2OwnerEpisodeConfirmationV1({
    planFingerprint: plan.planFingerprint,
    courseContractFingerprint: plan.courseContract.courseContractFingerprint,
    stageId: stage.stageId,
    episodeId: "episode-1",
    ownerInputFingerprint: material.summary.inputFingerprint,
    activityAssemblyFingerprint: material.summary.activityAssemblyFingerprint,
    stageReviewFingerprint: reviewFingerprint,
    ownerIdentityFingerprint: hashCanonicalBody("owner"),
    confirmedAtIso: "2026-08-13T10:00:00.000Z",
    reason: "Owner reviewed every intro and all 144 tasks.",
    contentClass: "production_candidate",
  });
  const planPin = put("learning-v2/test/plan.json", planRaw, "10");
  const inputPin = put("learning-v2/test/input.json", material.raw, "11");
  const confirmationPin = put(
    "learning-v2/test/confirmation.json",
    canonicalJsonV1(confirmation),
    "12",
  );
  stageRaw = canonicalJsonV1({
    schemaVersion: "v2-owner-authored-episode-stage.v2",
    stageId: stage.stageId,
    state: "owner_confirmed",
    kind: "v2_activity_instances",
    contentClass: "production_candidate",
    ownerInputSchemaVersion: "v2-owner-authored-episode-input.v2",
    introCount: 12,
    introQuestionCount: 36,
    introAggregateFingerprint: material.summary.introAggregateFingerprint,
    humanApprovalAuthority: "single_owner_exact_confirmation_only",
    planFingerprint: plan.planFingerprint,
    courseContractFingerprint: plan.courseContract.courseContractFingerprint,
    scopeId: "episode-1",
    planRequestObjectPath: planPin.objectPath,
    planRequestObjectGeneration: planPin.objectGeneration,
    planRequestRawHash: planPin.contentHash,
    planRequestByteSize: planPin.byteSize,
    objectPath: inputPin.objectPath,
    objectGeneration: inputPin.objectGeneration,
    contentHash: inputPin.contentHash,
    byteSize: inputPin.byteSize,
    ownerInputFingerprint: material.summary.inputFingerprint,
    activityAssemblyFingerprint: material.summary.activityAssemblyFingerprint,
    ownerConfirmationPin: confirmationPin,
    ownerConfirmationFingerprint: confirmation.confirmationFingerprint,
  });
  return { plan, stage, material, inputPin };
}

describe("Learning V2 confirmed owner intro private adapter", () => {
  it("mints an opaque handle only after exact stage, plan, owner input and confirmation readback", async () => {
    const { plan, stage, material } = fixture();
    const handle =
      await createFirebaseAdminV2ConfirmedOwnerEpisodeIntroAdapterV1().load({
        plan,
        stageId: stage.stageId,
      });
    expect(isV2FirebaseConfirmedOwnerEpisodeIntroHandleV1(handle)).toBe(true);
    expect(
      getV2FirebaseConfirmedOwnerEpisodeIntroSummaryV1(handle),
    ).toMatchObject({
      ownerInputFingerprint: material.summary.inputFingerprint,
      sessionCount: 12,
      questionCount: 36,
      ownerConfirmationAuthority:
        "single_owner_exact_confirmation_readback_only",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    const resolved =
      resolveV2FirebaseConfirmedOwnerEpisodeIntroMaterialV1(handle);
    expect(resolved.projections).toHaveLength(12);
    expect(resolved.projectionRaws).toHaveLength(12);
    expect(resolved.projectionRaws.join("")).not.toContain("correctResponse");
    expect(isV2FirebaseConfirmedOwnerEpisodeIntroHandleV1({ ...handle })).toBe(
      false,
    );
    expect(() =>
      getV2FirebaseConfirmedOwnerEpisodeIntroSummaryV1({ ...handle } as never),
    ).toThrow("v2_firebase_confirmed_owner_episode_intro_invalid");
  });

  it("fails closed on generation-pinned owner input tampering", async () => {
    const { plan, stage, inputPin } = fixture();
    const stored = objects.get(inputPin.objectPath)!;
    objects.set(
      inputPin.objectPath,
      Object.freeze({ ...stored, raw: `${stored.raw} ` }),
    );
    await expect(
      createFirebaseAdminV2ConfirmedOwnerEpisodeIntroAdapterV1().load({
        plan,
        stageId: stage.stageId,
      }),
    ).rejects.toThrow("v2_firebase_confirmed_owner_episode_intro_invalid");
  });
});
