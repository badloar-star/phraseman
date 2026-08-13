import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import { learningV2VoiceAudioDeviceStableProjectionFingerprintV1 } from "../../../modules/learning-v2/runtime/voice_audio_device_page_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const entry = Object.freeze({
  generationTargetFingerprint: h("target"),
  entryFingerprint: h("entry"),
  objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${h("audio")}.mp3`,
  contentHash: h("audio"),
  objectGeneration: "9",
  byteSize: 10_000,
});
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
  sessionManifests: Object.freeze([
    Object.freeze({ entries: Object.freeze([entry]) }),
  ]),
});
const audioEpisodeReceipt = Object.freeze({
  receiptFingerprint: h("audio-episode"),
  manifestFingerprint: manifest.manifestFingerprint,
  audioObjectCount: 1,
  pages: Object.freeze([
    Object.freeze({
      pageStartIndex: 0,
      pageItemCount: 1,
      nextPageStartIndex: null,
      pageReceiptFingerprint: h("audio-page"),
      pageAudioReadbackAggregateFingerprint: h("audio-readback"),
    }),
  ]),
});
const episodeHandle = Object.freeze({});
const decoderPage = Object.freeze({ receiptFingerprint: h("decoder-page") });
const pcmPage = Object.freeze({ receiptFingerprint: h("pcm-page") });
const decoderEpisode = Object.freeze({
  receiptFingerprint: h("decoder-episode"),
});
const pcmEpisode = Object.freeze({ receiptFingerprint: h("pcm-episode") });

const mockDecoderPage = jest.fn((_input?: unknown) => decoderPage);
const mockPcmPage = jest.fn((_input?: unknown) => pcmPage);
const mockDecoderEpisode = jest.fn((_input?: unknown) => decoderEpisode);
const mockPcmEpisode = jest.fn((_input?: unknown) => pcmEpisode);

jest.mock("./v2_canonical_generation_plan_v2", () => ({
  isV2CanonicalSeasonPlanV2: (value: unknown) => value === plan,
}));
jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_firebase_voice_audio_episode_receipt_adapter_v1", () => ({
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
    manifest: unknown;
  }) => {
    if (
      input.handle !== episodeHandle ||
      input.plan !== plan ||
      input.stageId !== manifest.stageId ||
      input.manifest !== manifest
    )
      throw new Error("invalid handle");
    return { plan, manifest, receipt: audioEpisodeReceipt };
  },
}));
jest.mock("./v2_voice_native_decoder_page_receipt_v1", () => ({
  materializeV2VoiceNativeDecoderPageReceiptV1: (input: unknown) =>
    mockDecoderPage(input),
}));
jest.mock("./v2_voice_pcm_signal_page_receipt_v1", () => ({
  materializeV2VoicePcmSignalPageReceiptV1: (input: unknown) =>
    mockPcmPage(input),
}));
jest.mock("./v2_voice_native_decoder_episode_receipt_v1", () => ({
  materializeV2VoiceNativeDecoderEpisodeReceiptV1: (input: unknown) =>
    mockDecoderEpisode(input),
}));
jest.mock("./v2_voice_pcm_signal_episode_receipt_v1", () => ({
  materializeV2VoicePcmSignalEpisodeReceiptV1: (input: unknown) =>
    mockPcmEpisode(input),
}));

/* eslint-disable import/first -- private brands and receipt builders are mocked first */
import {
  assembleV2VoiceDeviceObservationEpisodeV1,
  ingestV2VoiceDeviceObservationPageV1,
  isV2VoiceDeviceObservationEpisodeIngestV1,
  isV2VoiceDeviceObservationPageIngestV1,
} from "./v2_voice_device_observation_ingest_v1";
/* eslint-enable import/first */

function evidenceRaw(drift: Record<string, unknown> = {}) {
  const stableProjectionFingerprint =
    learningV2VoiceAudioDeviceStableProjectionFingerprintV1({
      manifestFingerprint: manifest.manifestFingerprint,
      episodeReceiptFingerprint: audioEpisodeReceipt.receiptFingerprint,
      pageReceiptFingerprint:
        audioEpisodeReceipt.pages[0]!.pageReceiptFingerprint,
      pageAudioReadbackAggregateFingerprint:
        audioEpisodeReceipt.pages[0]!.pageAudioReadbackAggregateFingerprint,
      audioObjectCount: 1,
      pageStartIndex: 0,
      nextPageStartIndex: null,
      rows: [
        {
          itemIndex: 0,
          generationTargetFingerprint: entry.generationTargetFingerprint,
          entryFingerprint: entry.entryFingerprint,
          objectPath: entry.objectPath,
          contentHash: entry.contentHash,
          objectGeneration: entry.objectGeneration,
          byteSize: entry.byteSize,
        },
      ],
    });
  const nativeDecoderObservations = [
    {
      itemIndex: 0,
      generationTargetFingerprint: entry.generationTargetFingerprint,
      entryFingerprint: entry.entryFingerprint,
    },
  ];
  const pcmSignalObservations = [
    { observationFingerprint: h("pcm-observation") },
  ];
  const body = {
    schemaVersion: "learning-v2-voice-audio-device-page-evidence.v1",
    manifestFingerprint: manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint: audioEpisodeReceipt.receiptFingerprint,
    audioPageReceiptFingerprint:
      audioEpisodeReceipt.pages[0]!.pageReceiptFingerprint,
    stableProjectionFingerprint,
    pageRunFingerprint: h("run"),
    pageStartIndex: 0,
    pageItemCount: 1,
    nextPageStartIndex: null,
    platform: "ios",
    deviceClass: "physical_device",
    osVersion: "18.6",
    appBuildFingerprint: h("build"),
    nativeDecoderObservations,
    pcmSignalObservations,
    orderedNativeObservationAggregateFingerprint: h(
      nativeDecoderObservations.map((value) => h(value)),
    ),
    orderedPcmObservationAggregateFingerprint: h(
      pcmSignalObservations.map((value) => value.observationFingerprint),
    ),
    uploadPurpose: "private_qa_receipt_assembly_only",
    transportUrlRetention: "forbidden",
    rawAudioRetention: "forbidden",
    rawPcmRetention: "forbidden",
    learnerDataRetention: "forbidden",
    repositoryOriginAuthority: "none",
    decoderEvidenceAuthority: "unverified_serialized_device_observation",
    signalMetricAuthority: "deterministic_pcm16_metrics_only",
    listeningEvidenceAuthority: "none",
    deviceEvidenceAuthority: "none",
    humanApprovalAuthority: "none",
    publicationAuthority: "none",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
    ...drift,
  };
  return canonicalJsonV1({
    ...body,
    evidenceFingerprint: h(body),
  });
}

describe("Learning V2 device observation server ingest", () => {
  beforeEach(() => {
    mockDecoderPage.mockClear();
    mockPcmPage.mockClear();
    mockDecoderEpisode.mockClear();
    mockPcmEpisode.mockClear();
  });

  it("binds a canonical private upload to the exact authenticated audio episode", () => {
    const page = ingestV2VoiceDeviceObservationPageV1({
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
      audioEpisodeReceiptHandle: episodeHandle as never,
      evidenceRaw: evidenceRaw(),
    });
    expect(isV2VoiceDeviceObservationPageIngestV1(page)).toBe(true);
    expect(isV2VoiceDeviceObservationPageIngestV1({ ...page })).toBe(false);
    expect(page).toMatchObject({
      ingestAuthority: "structural_serialized_observation_checks_only",
      artifactStorageAuthority: "none",
      deviceEvidenceAuthority: "none",
      releaseEligible: false,
    });
    expect(mockDecoderPage).toHaveBeenCalledTimes(1);
    expect(mockPcmPage).toHaveBeenCalledTimes(1);

    const episode = assembleV2VoiceDeviceObservationEpisodeV1({
      manifest: manifest as never,
      audioEpisodeReceipt: audioEpisodeReceipt as never,
      pages: [page],
    });
    expect(isV2VoiceDeviceObservationEpisodeIngestV1(episode)).toBe(true);
    expect(episode.pageCount).toBe(1);
    expect(episode.deviceEvidenceAuthority).toBe("none");
    expect(mockDecoderEpisode).toHaveBeenCalledTimes(1);
    expect(mockPcmEpisode).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-page projection and cloned ingest handles", () => {
    expect(() =>
      ingestV2VoiceDeviceObservationPageV1({
        plan: plan as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
        audioEpisodeReceiptHandle: episodeHandle as never,
        evidenceRaw: evidenceRaw({ stableProjectionFingerprint: h("wrong") }),
      }),
    ).toThrow("v2_voice_device_observation_ingest_invalid");

    const page = ingestV2VoiceDeviceObservationPageV1({
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
      audioEpisodeReceiptHandle: episodeHandle as never,
      evidenceRaw: evidenceRaw(),
    });
    expect(() =>
      assembleV2VoiceDeviceObservationEpisodeV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        pages: [{ ...page } as never],
      }),
    ).toThrow("v2_voice_device_observation_ingest_invalid");
  });
});
