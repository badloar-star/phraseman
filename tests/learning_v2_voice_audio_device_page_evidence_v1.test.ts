const mockResolve = jest.fn();

jest.mock(
  "../modules/learning-v2/runtime/voice_audio_manifest_page_runner_v1",
  () => ({
    resolveLearningV2VoiceAudioPageRunMaterialV1: (...args: unknown[]) =>
      mockResolve(...args),
  }),
);

/* eslint-disable import/first -- page-run private resolver is mocked first */
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import { parseLearningV2VoiceAudioDevicePageEvidenceV1 } from "../modules/learning-v2/runtime/voice_audio_device_page_evidence_v1";
import {
  encodeLearningV2VoiceAudioDevicePageEvidenceV1,
  materializeLearningV2VoiceAudioDevicePageEvidenceV1,
} from "../modules/learning-v2/runtime/voice_audio_device_page_evidence_materializer_v1";
/* eslint-enable import/first */

const h = (value: unknown) => hashCanonicalBody(value);
const row = Object.freeze({
  itemIndex: 0,
  generationTargetFingerprint: h("target"),
  entryFingerprint: h("entry"),
  objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${h("audio")}.mp3`,
  contentHash: h("audio"),
  objectGeneration: "7",
  byteSize: 10_000,
});
const decoder = Object.freeze({
  ...row,
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  expoAudioVersion: "1.1.1" as const,
  nativeDecoderFamily: "avplayer" as const,
  loadedDurationMs: 900,
  firstPlayingPositionMs: 0,
  maximumObservedPositionMs: 850,
  finalPositionMs: 900,
  statusCount: 7,
  statusSequenceFingerprint: h("statuses"),
  didJustFinishObserved: true as const,
  interruptionCount: 0 as const,
  errorCode: null,
});
const pcmBody = {
  ...row,
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  expoAudioVersion: "1.1.1" as const,
  decoderStatusSequenceFingerprint: decoder.statusSequenceFingerprint,
  schemaVersion: "learning-v2-pcm-signal-observer.v1" as const,
  signalPolicyRef: { policyId: "policy", version: 1, contentHash: h("policy") },
  sampleRateHz: 16_000,
  channelCount: 1 as const,
  pcmEncoding: "signed_16_bit" as const,
  sampleCount: 3_200,
  frameCount: 3_200,
  durationMs: 200,
  peakAbsoluteSample: 6_000,
  rmsAbsoluteSample: 6_000,
  activeSampleBasisPoints: 10_000,
  clippedSampleBasisPoints: 0,
  zeroSampleBasisPoints: 0,
  leadingSilenceMs: 0,
  trailingSilenceMs: 0,
  signalClass: "clean_signal_candidate" as const,
  pcmSourceBindingAuthority:
    "unverified_serialized_native_system_decode_report" as const,
  signalMetricAuthority: "deterministic_pcm16_metrics_only" as const,
  noiseEvidenceAuthority: "none" as const,
  speechCorrectnessAuthority: "none" as const,
  listeningEvidenceAuthority: "none" as const,
  deviceEvidenceAuthority: "none" as const,
  humanApprovalAuthority: "none" as const,
  publicationAuthority: "none" as const,
  runtimeConsumer: false as const,
  releaseEligible: false as const,
  releaseAuthority: false as const,
};
const pcm = Object.freeze({
  ...pcmBody,
  observationFingerprint: h(pcmBody),
});
const page = Object.freeze({
  manifestFingerprint: h("manifest"),
  episodeReceiptFingerprint: h("episode"),
  pageReceiptFingerprint: h("page"),
  stableProjectionFingerprint: h("projection"),
  pageStartIndex: 0,
  pageItemCount: 1,
  nextPageStartIndex: null,
  rows: Object.freeze([row]),
});
const run = Object.freeze({
  pageStartIndex: 0,
  pageItemCount: 1,
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  rows: Object.freeze([
    Object.freeze({
      itemIndex: 0,
      generationTargetFingerprint: row.generationTargetFingerprint,
      entryFingerprint: row.entryFingerprint,
    }),
  ]),
  pageRunFingerprint: h("run"),
});

describe("Learning V2 private device page evidence", () => {
  beforeEach(() => {
    mockResolve.mockReset();
    mockResolve.mockReturnValue({
      run,
      nativeDecoderObservations: [decoder],
      pcmSignalObservations: [pcm],
    });
  });

  it("serializes only bounded decoder/PCM metrics with every authority closed", () => {
    const evidence = materializeLearningV2VoiceAudioDevicePageEvidenceV1({
      page: page as never,
      run: run as never,
    });
    const raw = encodeLearningV2VoiceAudioDevicePageEvidenceV1(evidence);
    expect(parseLearningV2VoiceAudioDevicePageEvidenceV1(raw)).toEqual(
      evidence,
    );
    expect(evidence).toMatchObject({
      uploadPurpose: "private_qa_receipt_assembly_only",
      rawAudioRetention: "forbidden",
      rawPcmRetention: "forbidden",
      learnerDataRetention: "forbidden",
      decoderEvidenceAuthority: "unverified_serialized_device_observation",
      deviceEvidenceAuthority: "none",
      releaseEligible: false,
    });
    expect(raw).not.toMatch(
      /https?:|file:\/\/|signedReadUrl|audioBytes|pcmBytes/u,
    );
    expect(() =>
      encodeLearningV2VoiceAudioDevicePageEvidenceV1({ ...evidence }),
    ).toThrow("learning_v2_voice_audio_device_page_evidence_invalid");
  });

  it("rejects in-process object drift while leaving source validation to the server", () => {
    expect(() =>
      materializeLearningV2VoiceAudioDevicePageEvidenceV1({
        page: page as never,
        run: {
          ...run,
          rows: [{ ...run.rows[0], entryFingerprint: h("wrong") }],
        } as never,
      }),
    ).toThrow("learning_v2_voice_audio_device_page_evidence_invalid");

    const evidence = materializeLearningV2VoiceAudioDevicePageEvidenceV1({
      page: page as never,
      run: run as never,
    });
    const decoded = JSON.parse(
      encodeLearningV2VoiceAudioDevicePageEvidenceV1(evidence),
    );
    decoded.nativeDecoderObservations[0].contentHash = h("other-audio");
    decoded.orderedNativeObservationAggregateFingerprint = h(
      decoded.nativeDecoderObservations.map((value: unknown) => h(value)),
    );
    const { evidenceFingerprint: _old, ...body } = decoded;
    decoded.evidenceFingerprint = h(body);
    expect(() =>
      parseLearningV2VoiceAudioDevicePageEvidenceV1(canonicalJsonV1(decoded)),
    ).not.toThrow();
    // The upload parser proves canonical integrity only. The server receipt
    // materializer must reject this source-object substitution.
  });

  it("rejects noncanonical and hostile-depth bytes before reconstruction", () => {
    expect(() =>
      parseLearningV2VoiceAudioDevicePageEvidenceV1('{"b":1,"a":2}'),
    ).toThrow("learning_v2_voice_audio_device_page_evidence_invalid");
    expect(() =>
      parseLearningV2VoiceAudioDevicePageEvidenceV1(
        `${"[".repeat(1_000)}0${"]".repeat(1_000)}`,
      ),
    ).toThrow("learning_v2_voice_audio_device_page_evidence_invalid");
  });
});
