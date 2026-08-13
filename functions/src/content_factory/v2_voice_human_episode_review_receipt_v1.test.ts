const manifest = Object.freeze({
  planFingerprint: "a".repeat(64),
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: "b".repeat(64),
  audioObjectCount: 2,
});

const deviceReceipt = Object.freeze({
  planFingerprint: manifest.planFingerprint,
  stageId: manifest.stageId,
  episodeId: manifest.episodeId,
  manifestFingerprint: manifest.manifestFingerprint,
  audioEpisodeReceiptFingerprint: "c".repeat(64),
  receiptFingerprint: "d".repeat(64),
  audioObjectCount: manifest.audioObjectCount,
  episodeDisposition: "candidate_for_human_listening" as const,
  pages: Object.freeze([
    Object.freeze({
      pageStartIndex: 0,
      pageItemCount: 1,
      nextPageStartIndex: 1,
    }),
    Object.freeze({
      pageStartIndex: 1,
      pageItemCount: 1,
      nextPageStartIndex: null,
    }),
  ]),
});

const brandedReviews = new WeakSet<object>();

jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_voice_pcm_signal_episode_receipt_v1", () => ({
  isV2VoicePcmSignalEpisodeReceiptV1: (value: unknown) =>
    value === deviceReceipt,
}));
jest.mock("./v2_voice_human_review_contract_v1", () => ({
  isV2VoiceHumanReviewV1: (value: unknown) =>
    typeof value === "object" && value !== null && brandedReviews.has(value),
}));

/* eslint-disable import/first -- predicates must be mocked before import */
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2VoiceHumanEpisodeReviewReceiptV1,
  materializeV2VoiceHumanEpisodeReviewReceiptV1,
  parseV2VoiceHumanEpisodeReviewReceiptV1,
} from "./v2_voice_human_episode_review_receipt_v1";
/* eslint-enable import/first */

function review(input: {
  role: "human_listening_specialist" | "target_language_linguist";
  reviewer: string;
  page: 0 | 1;
  decision?: "approved" | "changes_requested";
}) {
  const page = deviceReceipt.pages[input.page]!;
  const decision = input.decision ?? "approved";
  const value = Object.freeze({
    reviewerRole: input.role,
    planFingerprint: manifest.planFingerprint,
    stageId: manifest.stageId,
    episodeId: manifest.episodeId,
    manifestFingerprint: manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      deviceReceipt.audioEpisodeReceiptFingerprint,
    deviceEpisodeReceiptFingerprint: deviceReceipt.receiptFingerprint,
    reviewerIdentityFingerprint: hashCanonicalBody(input.reviewer),
    pageStartIndex: page.pageStartIndex,
    pageItemCount: page.pageItemCount,
    nextPageStartIndex: page.nextPageStartIndex,
    items: Object.freeze([
      Object.freeze({
        decision,
      }),
    ]),
    pageDecision: decision,
    reviewFingerprint: hashCanonicalBody({
      role: input.role,
      reviewer: input.reviewer,
      page: input.page,
      decision,
    }),
  });
  brandedReviews.add(value);
  return value;
}

function completeInput() {
  return {
    manifest: manifest as never,
    deviceEpisodeReceipt: deviceReceipt as never,
    listeningReviews: [
      review({
        role: "human_listening_specialist",
        reviewer: "listener",
        page: 0,
      }),
      review({
        role: "human_listening_specialist",
        reviewer: "listener",
        page: 1,
      }),
    ] as never,
    linguistReviews: [
      review({
        role: "target_language_linguist",
        reviewer: "linguist",
        page: 0,
      }),
      review({
        role: "target_language_linguist",
        reviewer: "linguist",
        page: 1,
      }),
    ] as never,
  };
}

describe("Voice human episode review receipt", () => {
  it("requires two distinct complete reviewers and stays authority-free", () => {
    const receipt =
      materializeV2VoiceHumanEpisodeReviewReceiptV1(completeInput());
    expect(isV2VoiceHumanEpisodeReviewReceiptV1(receipt)).toBe(true);
    expect(isV2VoiceHumanEpisodeReviewReceiptV1({ ...receipt })).toBe(false);
    expect(receipt).toMatchObject({
      audioObjectCount: 2,
      expectedPageCount: 2,
      makerCheckerState: "distinct_reviewers",
      episodeDecision: "approved",
      reviewAuthority: "none_structural_two_role_receipt",
      publicationAuthority: "none",
      releaseEligible: false,
    });
    expect(receipt.roles.map((role) => role.reviewedItemCount)).toEqual([2, 2]);
    expect(
      parseV2VoiceHumanEpisodeReviewReceiptV1({
        raw: canonicalJsonV1(receipt),
        ...completeInput(),
      }).receiptFingerprint,
    ).toBe(receipt.receiptFingerprint);
  });

  it("rejects the same reviewer, a missing page, and a cloned review", () => {
    const sameReviewer = completeInput();
    sameReviewer.linguistReviews = [
      review({
        role: "target_language_linguist",
        reviewer: "listener",
        page: 0,
      }),
      review({
        role: "target_language_linguist",
        reviewer: "listener",
        page: 1,
      }),
    ] as never;
    expect(() =>
      materializeV2VoiceHumanEpisodeReviewReceiptV1(sameReviewer),
    ).toThrow("v2_voice_human_episode_review_receipt_invalid");

    const missing = completeInput();
    missing.listeningReviews = [
      (completeInput().listeningReviews as readonly unknown[])[0]!,
    ] as never;
    expect(() =>
      materializeV2VoiceHumanEpisodeReviewReceiptV1(missing),
    ).toThrow("v2_voice_human_episode_review_receipt_invalid");

    const cloned = completeInput();
    cloned.listeningReviews = [
      {
        ...(cloned.listeningReviews as readonly Record<string, unknown>[])[0]!,
      },
      (cloned.listeningReviews as readonly unknown[])[1]!,
    ] as never;
    expect(() => materializeV2VoiceHumanEpisodeReviewReceiptV1(cloned)).toThrow(
      "v2_voice_human_episode_review_receipt_invalid",
    );
  });

  it("propagates changes requested and rejects coordinated stored drift", () => {
    const input = completeInput();
    input.linguistReviews = [
      review({
        role: "target_language_linguist",
        reviewer: "linguist",
        page: 0,
        decision: "changes_requested",
      }),
      review({
        role: "target_language_linguist",
        reviewer: "linguist",
        page: 1,
      }),
    ] as never;
    const receipt = materializeV2VoiceHumanEpisodeReviewReceiptV1(input);
    expect(receipt.episodeDecision).toBe("changes_requested");
    const tampered = canonicalJsonV1({
      ...receipt,
      episodeDecision: "approved",
      receiptFingerprint: receipt.receiptFingerprint,
    });
    expect(() =>
      parseV2VoiceHumanEpisodeReviewReceiptV1({ raw: tampered, ...input }),
    ).toThrow("v2_voice_human_episode_review_receipt_invalid");
  });
});
