import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const manifest = Object.freeze({
  planFingerprint: h("plan"),
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
});
const audioEpisodeReceipt = Object.freeze({
  manifestFingerprint: manifest.manifestFingerprint,
  receiptFingerprint: h("audio-episode"),
});
const decoderPageFingerprint = h("decoder-page");
const decoderEpisodeReceipt = Object.freeze({
  manifestFingerprint: manifest.manifestFingerprint,
  audioEpisodeReceiptFingerprint: audioEpisodeReceipt.receiptFingerprint,
  audioObjectCount: 1,
  receiptFingerprint: h("decoder-episode"),
  pages: Object.freeze([
    Object.freeze({
      pageStartIndex: 0,
      pageItemCount: 1,
      nextPageStartIndex: null,
      pageReceiptFingerprint: decoderPageFingerprint,
    }),
  ]),
});

function signalPage(input: {
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly pageDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly blockingSignalItemCount: number;
}) {
  const row = Object.freeze({
    platform: "ios" as const,
    deviceClass: input.deviceClass,
    osVersion: "18.6",
    appBuildFingerprint: h("build"),
    expoAudioVersion: "1.1.1" as const,
  });
  return Object.freeze({
    planFingerprint: manifest.planFingerprint,
    stageId: manifest.stageId,
    episodeId: manifest.episodeId,
    manifestFingerprint: manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint: audioEpisodeReceipt.receiptFingerprint,
    decoderPageReceiptFingerprint: decoderPageFingerprint,
    platform: row.platform,
    deviceClass: row.deviceClass,
    osVersion: row.osVersion,
    appBuildFingerprint: row.appBuildFingerprint,
    expoAudioVersion: row.expoAudioVersion,
    pageStartIndex: 0,
    pageItemCount: 1,
    nextPageStartIndex: null,
    blockingSignalItemCount: input.blockingSignalItemCount,
    rows: Object.freeze([row]),
    orderedRowAggregateFingerprint: h([input.pageDisposition]),
    pageDisposition: input.pageDisposition,
    receiptFingerprint: h(["signal-page", input]),
  });
}

const cleanPage = signalPage({
  deviceClass: "physical_device",
  pageDisposition: "candidate_for_human_listening",
  blockingSignalItemCount: 0,
});
const badPage = signalPage({
  deviceClass: "physical_device",
  pageDisposition: "blocked_signal_quality",
  blockingSignalItemCount: 1,
});
const simulatorPage = signalPage({
  deviceClass: "simulator_or_emulator",
  pageDisposition: "blocked_nonphysical_device",
  blockingSignalItemCount: 1,
});

jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_voice_audio_episode_receipt_v1", () => ({
  isV2VoiceAudioEpisodeReceiptV1: (value: unknown) =>
    value === audioEpisodeReceipt,
}));
jest.mock("./v2_voice_native_decoder_episode_receipt_v1", () => ({
  isV2VoiceNativeDecoderEpisodeReceiptV1: (value: unknown) =>
    value === decoderEpisodeReceipt,
}));
jest.mock("./v2_voice_pcm_signal_page_receipt_v1", () => ({
  V2_VOICE_PCM_SIGNAL_PAGE_MAX_ITEMS_V1: 32,
  isV2VoicePcmSignalPageReceiptV1: (value: unknown) =>
    value === cleanPage || value === badPage || value === simulatorPage,
}));

// Jest hoists the exact private predicates above these imports.
// eslint-disable-next-line import/first
import {
  isV2VoicePcmSignalEpisodeReceiptV1,
  materializeV2VoicePcmSignalEpisodeReceiptV1,
  parseV2VoicePcmSignalEpisodeReceiptV1,
} from "./v2_voice_pcm_signal_episode_receipt_v1";

describe("Learning V2 decoded PCM signal episode receipt", () => {
  it("admits only a complete clean physical-device episode to human listening", () => {
    const result = materializeV2VoicePcmSignalEpisodeReceiptV1({
      manifest: manifest as never,
      audioEpisodeReceipt: audioEpisodeReceipt as never,
      decoderEpisodeReceipt: decoderEpisodeReceipt as never,
      signalPages: [cleanPage as never],
    });
    expect(result.episodeDisposition).toBe("candidate_for_human_listening");
    expect(result.blockingSignalItemCount).toBe(0);
    expect(result.signalMetricAuthority).toBe(
      "deterministic_pcm16_metrics_only",
    );
    expect(result.listeningEvidenceAuthority).toBe("none");
    expect(result.deviceEvidenceAuthority).toBe("none");
    expect(result.releaseEligible).toBe(false);
    expect(isV2VoicePcmSignalEpisodeReceiptV1(result)).toBe(true);
    expect(isV2VoicePcmSignalEpisodeReceiptV1({ ...result })).toBe(false);
    expect(
      parseV2VoicePcmSignalEpisodeReceiptV1({
        raw: canonicalJsonV1(result),
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        decoderEpisodeReceipt: decoderEpisodeReceipt as never,
        signalPages: [cleanPage as never],
      }).receiptFingerprint,
    ).toBe(result.receiptFingerprint);
  });

  it.each([
    [badPage, "blocked_signal_quality"],
    [simulatorPage, "blocked_nonphysical_device"],
  ])("keeps bad or nonphysical pages blocked", (page, disposition) => {
    expect(
      materializeV2VoicePcmSignalEpisodeReceiptV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        decoderEpisodeReceipt: decoderEpisodeReceipt as never,
        signalPages: [page as never],
      }).episodeDisposition,
    ).toBe(disposition);
  });

  it.each([
    { planFingerprint: h("other-plan") },
    { decoderPageReceiptFingerprint: h("other-decoder-page") },
    { pageStartIndex: 1 },
    { pageItemCount: 2 },
    { nextPageStartIndex: 1 },
  ])("rejects cross-scope and page-chain drift", (drift) => {
    const forged = Object.freeze({ ...cleanPage, ...drift });
    expect(() =>
      materializeV2VoicePcmSignalEpisodeReceiptV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        decoderEpisodeReceipt: decoderEpisodeReceipt as never,
        signalPages: [forged as never],
      }),
    ).toThrow("v2_voice_pcm_signal_episode_receipt_invalid");
  });

  it("rejects canonical receipt byte tamper", () => {
    const result = materializeV2VoicePcmSignalEpisodeReceiptV1({
      manifest: manifest as never,
      audioEpisodeReceipt: audioEpisodeReceipt as never,
      decoderEpisodeReceipt: decoderEpisodeReceipt as never,
      signalPages: [cleanPage as never],
    });
    const forged = canonicalJsonV1({ ...result, hidden: true });
    expect(() =>
      parseV2VoicePcmSignalEpisodeReceiptV1({
        raw: forged,
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        decoderEpisodeReceipt: decoderEpisodeReceipt as never,
        signalPages: [cleanPage as never],
      }),
    ).toThrow("v2_voice_pcm_signal_episode_receipt_invalid");
  });
});
