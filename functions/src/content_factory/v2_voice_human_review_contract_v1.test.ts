const manifest = Object.freeze({
  planFingerprint: "a".repeat(64),
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: "b".repeat(64),
  audioObjectCount: 1,
  sessionManifests: Object.freeze([
    Object.freeze({
      entries: Object.freeze([
        Object.freeze({
          generationTargetFingerprint: "c".repeat(64),
          entryFingerprint: "d".repeat(64),
          contentHash: "e".repeat(64),
          objectGeneration: "7",
        }),
      ]),
    }),
  ]),
});
const audioReceipt = Object.freeze({
  manifestFingerprint: manifest.manifestFingerprint,
  receiptFingerprint: "f".repeat(64),
});
const deviceReceipt = Object.freeze({
  manifestFingerprint: manifest.manifestFingerprint,
  audioEpisodeReceiptFingerprint: audioReceipt.receiptFingerprint,
  receiptFingerprint: "1".repeat(64),
  episodeDisposition: "candidate_for_human_listening" as const,
  pages: Object.freeze([
    Object.freeze({
      pageStartIndex: 0,
      pageItemCount: 1,
      nextPageStartIndex: null,
      pageDisposition: "candidate_for_human_listening" as const,
    }),
  ]),
});

jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_voice_audio_episode_receipt_v1", () => ({
  isV2VoiceAudioEpisodeReceiptV1: (value: unknown) => value === audioReceipt,
}));
jest.mock("./v2_voice_pcm_signal_episode_receipt_v1", () => ({
  isV2VoicePcmSignalEpisodeReceiptV1: (value: unknown) =>
    value === deviceReceipt,
}));

/* eslint-disable import/first -- branded receipt predicates are mocked first */
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2VoiceHumanReviewV1,
  materializeV2VoiceHumanReviewV1,
  parseV2VoiceHumanReviewV1,
} from "./v2_voice_human_review_contract_v1";
/* eslint-enable import/first */

const h = (value: unknown) => hashCanonicalBody(value);

function input() {
  return {
    manifest: manifest as never,
    audioEpisodeReceipt: audioReceipt as never,
    deviceEpisodeReceipt: deviceReceipt as never,
    reviewerRole: "human_listening_specialist" as const,
    reviewerIdentityFingerprint: h("reviewer"),
    reviewerCredentialFingerprint: h("credential"),
    reviewOperationId: "review-operation-1",
    reviewedAtMs: 10,
    pageStartIndex: 0,
    nextPageStartIndex: null,
    decisions: [
      {
        itemIndex: 0,
        decision: "approved" as const,
        issueCodes: [] as string[],
      },
    ],
  };
}

describe("Voice human review structural claim", () => {
  it("derives exact audio identity but mints no approval authority", () => {
    const value = materializeV2VoiceHumanReviewV1(input());
    expect(isV2VoiceHumanReviewV1(value)).toBe(true);
    expect(isV2VoiceHumanReviewV1({ ...value })).toBe(false);
    expect(value).toMatchObject({
      pageDecision: "approved",
      identitySource: "caller_supplied_unverified_review_claim",
      reviewAuthority: "none",
      repositoryOriginAuthority: "none",
      publicationAuthority: "none",
      releaseEligible: false,
      items: [
        {
          generationTargetFingerprint:
            manifest.sessionManifests[0]!.entries[0]!
              .generationTargetFingerprint,
          objectContentHash:
            manifest.sessionManifests[0]!.entries[0]!.contentHash,
        },
      ],
    });
    expect(JSON.stringify(value)).not.toMatch(/spoken|prompt|translation|url/i);
    expect(
      parseV2VoiceHumanReviewV1({
        raw: canonicalJsonV1(value),
        manifest: manifest as never,
        audioEpisodeReceipt: audioReceipt as never,
        deviceEpisodeReceipt: deviceReceipt as never,
      }).reviewFingerprint,
    ).toBe(value.reviewFingerprint);
  });

  it("requires issue codes for changes and rejects an unordered page", () => {
    expect(() =>
      materializeV2VoiceHumanReviewV1({
        ...input(),
        decisions: [
          {
            itemIndex: 0,
            decision: "changes_requested",
            issueCodes: [],
          },
        ],
      }),
    ).toThrow("v2_voice_human_review_invalid");
    expect(() =>
      materializeV2VoiceHumanReviewV1({
        ...input(),
        decisions: [{ ...input().decisions[0]!, itemIndex: 1 }],
      }),
    ).toThrow("v2_voice_human_review_invalid");
  });

  it("rejects unknown decision keys, a clone receipt, and unsafe identity", () => {
    expect(() =>
      materializeV2VoiceHumanReviewV1({
        ...input(),
        decisions: [
          {
            ...input().decisions[0]!,
            publicationAuthority: "approved",
          } as never,
        ],
      }),
    ).toThrow("v2_voice_human_review_invalid");
    expect(() =>
      materializeV2VoiceHumanReviewV1({
        ...input(),
        deviceEpisodeReceipt: { ...deviceReceipt } as never,
      }),
    ).toThrow("v2_voice_human_review_invalid");
    expect(() =>
      materializeV2VoiceHumanReviewV1({
        ...input(),
        reviewerCredentialFingerprint: "not-a-hash",
      }),
    ).toThrow("v2_voice_human_review_invalid");
  });
});
