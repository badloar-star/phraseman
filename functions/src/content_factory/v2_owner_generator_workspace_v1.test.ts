import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import { readV2OwnerGeneratorWorkspaceV1 } from "./v2_owner_generator_workspace_v1";

const hash = (character: string) => character.repeat(64);
const auth = Object.freeze({
  uid: "owner-uid",
  token: Object.freeze({ admin: true, adminRole: "owner" }),
});
const authenticated = Object.freeze({
  actorUid: "owner-uid",
  role: "owner" as const,
  ownerIdentityFingerprint: hash("9"),
  authenticationAuthority:
    "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
  identityPolicyFingerprint: hash("8"),
});

function fixture() {
  const request = {
    schemaVersion: "v2-canonical-plan-request.v2" as const,
    workspaceId: "owner-workspace",
    jobId: "owner-job",
    authoringRevision: 1,
    seasonId: "owner-season",
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
          { templateId: "phrase-builder", version: 1, contentHash: hash("e") },
        ],
      },
    ],
  };
  const raw = canonicalJsonV1(request);
  const plan = buildV2CanonicalSeasonPlanV2(parseV2CanonicalPlanRequestV2(raw));
  const stage = plan.stages.find(
    (candidate) => candidate.kind === "v2_activity_instances",
  )!;
  return { raw, plan, stage };
}

describe("Learning V2 root-owner generator workspace", () => {
  it("returns the canonical owner slot without asking the UI to derive stage identity", async () => {
    const { raw, plan, stage } = fixture();
    const result = await readV2OwnerGeneratorWorkspaceV1(
      { auth, data: { jobId: "owner-job" } },
      {
        authenticateOwner: () => authenticated,
        async readJob() {
          return Object.freeze({
            canonicalPlanRequestRaw: raw,
            canonicalPlanFingerprint: plan.planFingerprint,
          });
        },
        async readStages() {
          return new Map([
            [
              stage.stageId,
              Object.freeze({
                state: "queued",
                executionMode: "owner_authored_manual_import_only",
              }),
            ],
          ]);
        },
      },
    );
    expect(result).toMatchObject({
      jobId: "owner-job",
      expectedEpisodeCount: 1,
      ownerContentBoundary: "owner_creates_all_real_episode_content",
      automaticContentGenerationAuthority: "none",
      releaseAuthority: false,
      episodes: [
        {
          episodeId: "episode-1",
          stageId: stage.stageId,
          state: "reserved",
          canImport: true,
          canPreview: false,
          canConfirm: false,
        },
      ],
    });
    expect(result.planRequestRaw).toBe(raw);
  });

  it("exposes preview and confirmation actions only for the exact stored state", async () => {
    const { raw, plan, stage } = fixture();
    const run = (state: string) =>
      readV2OwnerGeneratorWorkspaceV1(
        { auth, data: { jobId: "owner-job" } },
        {
          authenticateOwner: () => authenticated,
          async readJob() {
            return Object.freeze({
              canonicalPlanRequestRaw: raw,
              canonicalPlanFingerprint: plan.planFingerprint,
            });
          },
          async readStages() {
            return new Map([[stage.stageId, Object.freeze({ state })]]);
          },
        },
      );
    await expect(run("needs_review")).resolves.toMatchObject({
      episodes: [
        { state: "ready_for_preview", canPreview: true, canConfirm: true },
      ],
    });
    await expect(run("owner_confirmed")).resolves.toMatchObject({
      episodes: [
        { state: "owner_confirmed", canPreview: true, canConfirm: false },
      ],
    });
  });

  it("fails closed for a non-root owner or a plan fingerprint mismatch", async () => {
    const { raw } = fixture();
    const dependencies = {
      authenticateOwner() {
        throw new Error("configured_owner_required");
      },
      async readJob() {
        return Object.freeze({
          canonicalPlanRequestRaw: raw,
          canonicalPlanFingerprint: hash("f"),
        });
      },
      async readStages() {
        return new Map();
      },
    };
    await expect(
      readV2OwnerGeneratorWorkspaceV1(
        { auth, data: { jobId: "owner-job" } },
        dependencies,
      ),
    ).rejects.toThrow("configured_owner_required");
    await expect(
      readV2OwnerGeneratorWorkspaceV1(
        { auth, data: { jobId: "owner-job" } },
        { ...dependencies, authenticateOwner: () => authenticated },
      ),
    ).rejects.toThrow("v2_owner_generator_workspace_job_mismatch");
  });
});
