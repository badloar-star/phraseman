import {
  bridgeV2AdminGenerationRequestToCanonicalPlanResultV2,
  bridgeV2AdminGenerationRequestToCanonicalPlanV2,
  v2AdminCanonicalBridgeFingerprintV1,
} from "./v2_admin_canonical_generation_bridge_v1";
import { parseV2AdminGenerationRequest } from "./v2_admin_generation_contract";

const h = (character: string) => character.repeat(64);
const request = parseV2AdminGenerationRequest({
  schemaVersion: "v2-admin-generation-request.v1",
  seasonId: "season-01",
  scope: "vertical_slice",
  episodeIds: ["episode-01"],
  studyTarget: "en",
  sourceLocale: "ru",
  targetLocales: ["uk"],
  templateBindings: [
    {
      episodeId: "episode-01",
      templateRefs: [
        { templateId: "phrase-builder", version: 1, contentHash: h("a") },
      ],
    },
  ],
  idempotencyKey: "job-01",
  languageProfileRef: {
    profileId: "english-general",
    version: 1,
    contentHash: h("b"),
  },
});
const bridge = Object.freeze({
  schemaVersion: "v2-admin-canonical-generation-bridge.v1" as const,
  workspaceId: "workspace-01",
  authoringRevision: 1,
  speechProfileRef: Object.freeze({
    profileId: "speech-en",
    targetLanguage: "en",
    speechLocale: "en-US",
    version: 1,
    contentHash: h("c"),
  }),
  voiceGenerationProfileRef: Object.freeze({
    profileId: "voice-en",
    version: 1,
    contentHash: h("d"),
  }),
  decisionRegistryRef: Object.freeze({
    decisionId: "HYP-V2-007" as const,
    version: 1,
    contentHash: h("e"),
  }),
});

describe("V2 admin → canonical generation bridge", () => {
  test("builds the real branded canonical V2 plan without executing content generation", () => {
    const plan = bridgeV2AdminGenerationRequestToCanonicalPlanV2({
      request,
      bridge,
    });
    expect(plan).toMatchObject({
      schemaVersion: "v2-canonical-season-plan.v2",
      jobId: "job-01",
      workspaceId: "workspace-01",
      targetLanguage: "en",
      episodeIds: ["episode-01"],
      executionAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(
      plan.stages.some((stage) => stage.kind === "v2_activity_instances"),
    ).toBe(true);
    expect(plan.stages.some((stage) => stage.kind === "v2_voice_targets")).toBe(
      true,
    );
    expect(
      v2AdminCanonicalBridgeFingerprintV1({
        requestFingerprint: "request-v1",
        planFingerprint: plan.planFingerprint,
        bridge,
      }),
    ).toMatch(/^[a-f0-9]{64}$/u);
  });

  test("returns the canonical request that the owner later reuses for episode imports", () => {
    const result = bridgeV2AdminGenerationRequestToCanonicalPlanResultV2({
      request,
      bridge,
    });
    expect(result.planRequestRaw).toContain("v2-canonical-plan-request.v2");
    expect(result.plan.planFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.plan.executionAuthority).toBe("none");
    expect(result.plan.releaseAuthority).toBe(false);
  });

  test("requires all exact speech, voice-generation and decision-registry refs", () => {
    expect(() =>
      bridgeV2AdminGenerationRequestToCanonicalPlanV2({
        request,
        bridge: {
          ...bridge,
          speechProfileRef: {
            ...bridge.speechProfileRef,
            contentHash: h("z"),
          },
        },
      }),
    ).toThrow();
    expect(() =>
      bridgeV2AdminGenerationRequestToCanonicalPlanV2({
        request,
        bridge: { ...bridge, workspaceId: "Invalid Workspace" },
      }),
    ).toThrow("v2_admin_canonical_generation_bridge_input_invalid");
  });
});
