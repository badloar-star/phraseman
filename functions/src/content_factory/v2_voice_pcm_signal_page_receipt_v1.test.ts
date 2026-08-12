import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import { observeLearningV2DecodedPcmSignalV1 } from "../../../modules/learning-v2/runtime/voice_pcm_signal_observer_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const entry = Object.freeze({
  generationTargetFingerprint: h("generation"),
  entryFingerprint: h("entry"),
  objectPath: `learning-v2/voice-audio/${h("audio")}.mp3`,
  contentHash: h("audio"),
  objectGeneration: "11",
  byteSize: 12_000,
});
const manifest = Object.freeze({
  planFingerprint: h("plan"),
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
});
const audioEpisodeReceipt = Object.freeze({
  receiptFingerprint: h("audio-episode"),
});

function decoderPage(deviceClass: "physical_device" | "simulator_or_emulator") {
  return Object.freeze({
    manifestFingerprint: manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint: audioEpisodeReceipt.receiptFingerprint,
    receiptFingerprint: h(["decoder-page", deviceClass]),
    platform: "ios" as const,
    deviceClass,
    pageStartIndex: 0,
    nextPageStartIndex: null,
    rows: Object.freeze([
      Object.freeze({
        itemIndex: 0,
        ...entry,
        platform: "ios" as const,
        deviceClass,
        osVersion: "18.6",
        appBuildFingerprint: h("build"),
        expoAudioVersion: "1.1.1" as const,
        statusSequenceFingerprint: h("decoder-statuses"),
      }),
    ]),
  });
}

jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_voice_audio_episode_receipt_v1", () => ({
  isV2VoiceAudioEpisodeReceiptV1: (value: unknown) =>
    value === audioEpisodeReceipt,
}));
jest.mock("./v2_voice_native_decoder_page_receipt_v1", () => ({
  isV2VoiceNativeDecoderPageReceiptV1: (value: unknown) =>
    value === physicalDecoderPage || value === simulatorDecoderPage,
}));

const physicalDecoderPage = decoderPage("physical_device");
const simulatorDecoderPage = decoderPage("simulator_or_emulator");

// Jest hoists the exact private predicates above these imports.
// eslint-disable-next-line import/first
import {
  isV2VoicePcmSignalPageReceiptV1,
  materializeV2VoicePcmSignalPageReceiptV1,
  parseV2VoicePcmSignalPageReceiptV1,
} from "./v2_voice_pcm_signal_page_receipt_v1";

function observation(
  decoder: ReturnType<typeof decoderPage>,
  samples: Int16Array,
) {
  const row = decoder.rows[0];
  return observeLearningV2DecodedPcmSignalV1({
    identity: {
      itemIndex: row.itemIndex,
      generationTargetFingerprint: row.generationTargetFingerprint,
      entryFingerprint: row.entryFingerprint,
      objectPath: row.objectPath,
      contentHash: row.contentHash,
      objectGeneration: row.objectGeneration,
      byteSize: row.byteSize,
      platform: row.platform,
      deviceClass: row.deviceClass,
      osVersion: row.osVersion,
      appBuildFingerprint: row.appBuildFingerprint,
      expoAudioVersion: row.expoAudioVersion,
      decoderStatusSequenceFingerprint: row.statusSequenceFingerprint,
    },
    sampleRateHz: 16_000,
    channelCount: 1,
    chunks: [samples],
  });
}

describe("Learning V2 decoded PCM signal page receipt", () => {
  it("admits a complete clean physical-device page only to human listening", () => {
    const samples = new Int16Array(3_200).fill(6_000);
    const result = materializeV2VoicePcmSignalPageReceiptV1({
      manifest: manifest as never,
      audioEpisodeReceipt: audioEpisodeReceipt as never,
      decoderPage: physicalDecoderPage as never,
      observations: [observation(physicalDecoderPage, samples)],
    });
    expect(result.pageDisposition).toBe("candidate_for_human_listening");
    expect(result.blockingSignalItemCount).toBe(0);
    expect(result.pcmSourceBindingAuthority).toBe(
      "unverified_serialized_device_observation",
    );
    expect(result.signalMetricAuthority).toBe(
      "deterministic_pcm16_metrics_only",
    );
    expect(result.noiseEvidenceAuthority).toBe("none");
    expect(result.speechCorrectnessAuthority).toBe("none");
    expect(result.listeningEvidenceAuthority).toBe("none");
    expect(result.deviceEvidenceAuthority).toBe("none");
    expect(result.releaseEligible).toBe(false);
    expect(isV2VoicePcmSignalPageReceiptV1(result)).toBe(true);
    expect(isV2VoicePcmSignalPageReceiptV1({ ...result })).toBe(false);
    expect(
      parseV2VoicePcmSignalPageReceiptV1({
        raw: canonicalJsonV1(result),
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        decoderPage: physicalDecoderPage as never,
        observations: [observation(physicalDecoderPage, samples)],
      }).receiptFingerprint,
    ).toBe(result.receiptFingerprint);
  });

  it.each([
    {
      samples: new Int16Array(3_200),
      signalClass: "digital_silence",
    },
    {
      samples: new Int16Array(3_200).fill(100),
      signalClass: "near_silence",
    },
    {
      samples: new Int16Array(3_200).fill(32_767),
      signalClass: "clipping_detected",
    },
  ])(
    "blocks $signalClass instead of minting listening evidence",
    ({ samples, signalClass }) => {
      const result = materializeV2VoicePcmSignalPageReceiptV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        decoderPage: physicalDecoderPage as never,
        observations: [observation(physicalDecoderPage, samples)],
      });
      expect(result.rows[0].signalClass).toBe(signalClass);
      expect(result.pageDisposition).toBe("blocked_signal_quality");
      expect(result.blockingSignalItemCount).toBe(1);
      expect(result.listeningEvidenceAuthority).toBe("none");
    },
  );

  it("keeps a clean simulator observation non-release and blocked", () => {
    const result = materializeV2VoicePcmSignalPageReceiptV1({
      manifest: manifest as never,
      audioEpisodeReceipt: audioEpisodeReceipt as never,
      decoderPage: simulatorDecoderPage as never,
      observations: [
        observation(simulatorDecoderPage, new Int16Array(3_200).fill(6_000)),
      ],
    });
    expect(result.pageDisposition).toBe("blocked_nonphysical_device");
    expect(result.rows[0].observationClass).toBe(
      "simulator_unverified_pcm_signal_observation_non_release",
    );
  });

  it.each([
    { decoderStatusSequenceFingerprint: h("other-decoder") },
    { contentHash: h("other-audio") },
    { sampleCount: 3_199 },
    { signalClass: "clean_signal_candidate" },
    { observationFingerprint: h("forged") },
    { hidden: true },
  ])("rejects pin, decoder, metric, class and shape forgeries", (drift) => {
    const silence = observation(physicalDecoderPage, new Int16Array(3_200));
    expect(() =>
      materializeV2VoicePcmSignalPageReceiptV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        decoderPage: physicalDecoderPage as never,
        observations: [{ ...silence, ...drift } as never],
      }),
    ).toThrow("v2_voice_pcm_signal_page_receipt_invalid");
  });
});
