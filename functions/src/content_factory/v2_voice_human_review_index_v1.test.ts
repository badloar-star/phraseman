import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  decideV2VoiceHumanReviewIndexV1,
  materializeV2VoiceHumanReviewIndexV1,
  parseV2VoiceHumanReviewIndexV1,
  v2VoiceHumanReviewIndexDocumentPathV1,
} from "./v2_voice_human_review_index_v1";

const h = (value: unknown) => hashCanonicalBody(value);

function value() {
  return materializeV2VoiceHumanReviewIndexV1({
    planFingerprint: h("plan"),
    stageId: "voice-stage-1",
    episodeId: "episode-1",
    manifestFingerprint: h("manifest"),
    audioEpisodeReceiptFingerprint: h("audio"),
    deviceEpisodeReceiptFingerprint: h("device"),
    reviewerRole: "human_listening_specialist",
    reviewerIdentityFingerprint: h("reviewer"),
    reviewerCredentialFingerprint: h("credential"),
    pageStartIndex: 0,
    pageItemCount: 32,
    nextPageStartIndex: 32,
    reviewFingerprint: h("review"),
    reviewPin: {
      objectPath: `learning-v2/voice-human-reviews/${h("plan")}/${h("stage")}/${h("manifest")}/human_listening_specialist/${h("review")}/${h("raw")}.json`,
      contentHash: h("raw"),
      objectGeneration: "7",
      byteSize: 400,
      contentType: "application/json; charset=utf-8",
    },
  });
}

describe("Voice human review durable index", () => {
  it("has one exact direct key and a strict canonical roundtrip", () => {
    const index = value();
    expect(v2VoiceHumanReviewIndexDocumentPathV1(index)).toMatch(
      /^content_v2_voice_human_reviews\/[a-f0-9]{64}$/u,
    );
    expect(parseV2VoiceHumanReviewIndexV1(canonicalJsonV1(index))).toEqual(
      index,
    );
    expect(index).toMatchObject({
      indexAuthority: "firebase_admin_direct_key_create_or_exact_replay",
      publicationAuthority: "none",
      releaseEligible: false,
    });
  });

  it("creates, replays exact bytes and conflicts on a second decision", () => {
    const proposed = value();
    const created = decideV2VoiceHumanReviewIndexV1({
      currentRaw: null,
      proposed,
    });
    expect(created.kind).toBe("create");
    expect(
      decideV2VoiceHumanReviewIndexV1({
        currentRaw: canonicalJsonV1(proposed),
        proposed,
      }).kind,
    ).toBe("exact_replay");
    const changed = materializeV2VoiceHumanReviewIndexV1({
      ...proposed,
      reviewerIdentityFingerprint: h("other-reviewer"),
    });
    expect(
      decideV2VoiceHumanReviewIndexV1({
        currentRaw: canonicalJsonV1(proposed),
        proposed: changed,
      }).kind,
    ).toBe("conflict");
  });

  it("rejects path traversal, unknown authority and coordinated raw drift", () => {
    const index = value();
    expect(() =>
      materializeV2VoiceHumanReviewIndexV1({
        ...index,
        reviewPin: { ...index.reviewPin, objectPath: "../review.json" },
      }),
    ).toThrow("v2_voice_human_review_index_invalid");
    expect(() =>
      parseV2VoiceHumanReviewIndexV1(
        canonicalJsonV1({ ...index, publicationAuthority: "approved" }),
      ),
    ).toThrow("v2_voice_human_review_index_invalid");
    expect(
      decideV2VoiceHumanReviewIndexV1({
        currentRaw: canonicalJsonV1({
          ...index,
          reviewFingerprint: h("tampered"),
          indexFingerprint: index.indexFingerprint,
        }),
        proposed: index,
      }).kind,
    ).toBe("conflict");
  });
});
