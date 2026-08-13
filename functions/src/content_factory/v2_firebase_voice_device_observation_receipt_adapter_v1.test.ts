import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
});
const audioReceipt = Object.freeze({
  receiptFingerprint: h("audio-episode"),
});
const audioHandle = Object.freeze({});
const decoderPage = Object.freeze({
  receiptFingerprint: h("decoder-page"),
  pageStartIndex: 0,
  pageItemCount: 1,
  nextPageStartIndex: null,
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  rows: Object.freeze([
    Object.freeze({ osVersion: "18.6", appBuildFingerprint: h("build") }),
  ]),
});
const pcmPage = Object.freeze({
  receiptFingerprint: h("pcm-page"),
  pageDisposition: "candidate_for_human_listening" as const,
});
const decoderEpisode = Object.freeze({
  receiptFingerprint: h("decoder-episode"),
});
const pcmEpisode = Object.freeze({
  receiptFingerprint: h("pcm-episode"),
  episodeDisposition: "candidate_for_human_listening" as const,
});
const ingest = Object.freeze({
  evidence: Object.freeze({
    stableProjectionFingerprint: h("projection"),
    evidenceFingerprint: h("evidence"),
    pageRunFingerprint: h("run"),
    pcmSignalObservations: Object.freeze([{}]),
  }),
  decoderPageReceipt: decoderPage,
  pcmPageReceipt: pcmPage,
  ingestFingerprint: h("ingest"),
});
const episodeIngest = Object.freeze({
  decoderEpisodeReceipt: decoderEpisode,
  pcmEpisodeReceipt: pcmEpisode,
});
const store = new Map<
  string,
  { bytes: Uint8Array; generation: string; contentHash: string }
>();
let writes = 0;

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
      input.handle !== audioHandle ||
      input.plan !== plan ||
      input.stageId !== manifest.stageId ||
      input.manifest !== manifest
    )
      throw new Error("bad audio handle");
    return { plan, manifest, receipt: audioReceipt };
  },
}));
jest.mock("./v2_voice_device_observation_ingest_v1", () => ({
  ingestV2VoiceDeviceObservationPageV1: () => ingest,
  assembleV2VoiceDeviceObservationEpisodeV1: (input: { pages: unknown[] }) => {
    if (input.pages[0] !== ingest) throw new Error("bad ingest");
    return episodeIngest;
  },
}));
jest.mock("./v2_voice_native_decoder_page_receipt_v1", () => ({
  V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1: 128 * 1024,
  parseV2VoiceNativeDecoderPageReceiptV1: () => decoderPage,
}));
jest.mock("./v2_voice_pcm_signal_page_receipt_v1", () => ({
  V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1: 160 * 1024,
  parseV2VoicePcmSignalPageReceiptV1: () => pcmPage,
}));
jest.mock("./v2_voice_native_decoder_episode_receipt_v1", () => ({
  V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1: 512 * 1024,
  materializeV2VoiceNativeDecoderEpisodeReceiptV1: () => decoderEpisode,
  parseV2VoiceNativeDecoderEpisodeReceiptV1: () => decoderEpisode,
}));
jest.mock("./v2_voice_pcm_signal_episode_receipt_v1", () => ({
  V2_VOICE_PCM_SIGNAL_EPISODE_MAX_BYTES_V1: 640 * 1024,
  materializeV2VoicePcmSignalEpisodeReceiptV1: () => pcmEpisode,
  parseV2VoicePcmSignalEpisodeReceiptV1: () => pcmEpisode,
}));
jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({
    storage: {
      readMetadataExact: async (path: string) => {
        const value = store.get(path);
        return value
          ? {
              generation: value.generation,
              byteSize: value.bytes.byteLength,
              contentType: "application/json; charset=utf-8",
              contentHash: value.contentHash,
            }
          : null;
      },
      downloadGenerationExact: async ({
        objectPath,
        ifGenerationMatch,
      }: {
        objectPath: string;
        ifGenerationMatch: string;
      }) => {
        const value = store.get(objectPath);
        return !value || value.generation !== ifGenerationMatch
          ? { kind: "not_found" }
          : { kind: "downloaded", bytes: value.bytes };
      },
    },
  }),
}));
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1:
    "application/json; charset=utf-8",
  persistV2ImmutableRepositoryObjectV1: async (input: {
    objectPath: string;
    bytes: Uint8Array;
    contentHash: string;
  }) => {
    const existing = store.get(input.objectPath);
    if (!existing) {
      writes += 1;
      store.set(input.objectPath, {
        bytes: input.bytes,
        generation: String(writes),
        contentHash: input.contentHash,
      });
    }
    const value = store.get(input.objectPath)!;
    return {
      kind: existing ? "exact_replay" : "created",
      pin: {
        objectPath: input.objectPath,
        contentHash: input.contentHash,
        objectGeneration: value.generation,
        byteSize: input.bytes.byteLength,
        contentType: "application/json; charset=utf-8",
      },
    };
  },
}));

/* eslint-disable import/first -- all private server ports are mocked first */
import {
  createFirebaseAdminV2VoiceDeviceObservationReceiptAdapterV1,
  createLearningV2VoiceDevicePageUploadAckV1,
  getV2FirebaseVoiceDeviceEpisodeReceiptSummaryV1,
  resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1,
  getV2FirebaseVoiceDevicePageReceiptSummaryV1,
  isV2FirebaseVoiceDeviceEpisodeReceiptHandleV1,
  isV2FirebaseVoiceDevicePageReceiptHandleV1,
} from "./v2_firebase_voice_device_observation_receipt_adapter_v1";
/* eslint-enable import/first */

describe("Firebase Voice device observation receipt adapter", () => {
  beforeEach(() => {
    store.clear();
    writes = 0;
  });

  it("persists and cold-reads page plus episode receipts without authority escalation", async () => {
    const adapter =
      createFirebaseAdminV2VoiceDeviceObservationReceiptAdapterV1();
    const pageHandle = await adapter.persistPage({
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
      audioEpisodeReceiptHandle: audioHandle as never,
      evidenceRaw: "{}",
    });
    expect(isV2FirebaseVoiceDevicePageReceiptHandleV1(pageHandle)).toBe(true);
    expect(isV2FirebaseVoiceDevicePageReceiptHandleV1({})).toBe(false);
    expect(
      getV2FirebaseVoiceDevicePageReceiptSummaryV1(pageHandle),
    ).toMatchObject({
      pageStartIndex: 0,
      pcmPageDisposition: "candidate_for_human_listening",
      persistenceAuthority: "firebase_admin_generation_pinned_receipt_readback",
      listeningEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      releaseEligible: false,
    });
    expect(
      createLearningV2VoiceDevicePageUploadAckV1({ pageHandle }),
    ).toMatchObject({
      manifestFingerprint: manifest.manifestFingerprint,
      audioEpisodeReceiptFingerprint: audioReceipt.receiptFingerprint,
      pageStartIndex: 0,
      receiptAuthority: "none_serialized_server_acknowledgement",
      releaseEligible: false,
    });

    const pageSummary =
      getV2FirebaseVoiceDevicePageReceiptSummaryV1(pageHandle);
    const coldAdapter =
      createFirebaseAdminV2VoiceDeviceObservationReceiptAdapterV1();
    const episodeHandle = await coldAdapter.persistEpisodeFromPageCommits({
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
      audioEpisodeReceiptHandle: audioHandle as never,
      pageCommitPins: [pageSummary.pageCommitPin],
    });
    expect(isV2FirebaseVoiceDeviceEpisodeReceiptHandleV1(episodeHandle)).toBe(
      true,
    );
    expect(
      getV2FirebaseVoiceDeviceEpisodeReceiptSummaryV1(episodeHandle),
    ).toMatchObject({
      pageCount: 1,
      audioObjectCount: 1,
      pcmEpisodeDisposition: "candidate_for_human_listening",
      listeningEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      releaseEligible: false,
    });
    expect(
      resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1({
        handle: episodeHandle,
        plan: plan as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
      }).pageCommitPins,
    ).toEqual([pageSummary.pageCommitPin]);
    expect(writes).toBe(5);
  });

  it("rejects a cold page-commit pin whose generation no longer matches", async () => {
    const adapter =
      createFirebaseAdminV2VoiceDeviceObservationReceiptAdapterV1();
    const pageHandle = await adapter.persistPage({
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
      audioEpisodeReceiptHandle: audioHandle as never,
      evidenceRaw: "{}",
    });
    const summary = getV2FirebaseVoiceDevicePageReceiptSummaryV1(pageHandle);
    await expect(
      createFirebaseAdminV2VoiceDeviceObservationReceiptAdapterV1().persistEpisodeFromPageCommits(
        {
          plan: plan as never,
          stageId: manifest.stageId,
          manifest: manifest as never,
          audioEpisodeReceiptHandle: audioHandle as never,
          pageCommitPins: [
            { ...summary.pageCommitPin, objectGeneration: "999" },
          ],
        },
      ),
    ).rejects.toThrow("v2_firebase_voice_device_observation_receipt_invalid");
    expect(writes).toBe(3);
  });

  it("replays the same immutable receipts without new writes and rejects cloned page handles", async () => {
    const adapter =
      createFirebaseAdminV2VoiceDeviceObservationReceiptAdapterV1();
    const first = await adapter.persistPage({
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
      audioEpisodeReceiptHandle: audioHandle as never,
      evidenceRaw: "{}",
    });
    expect(writes).toBe(3);
    await adapter.persistPage({
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
      audioEpisodeReceiptHandle: audioHandle as never,
      evidenceRaw: "{}",
    });
    expect(writes).toBe(3);
    await expect(
      adapter.persistEpisode({
        plan: plan as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
        audioEpisodeReceiptHandle: audioHandle as never,
        pageHandles: [{ ...first } as never],
      }),
    ).rejects.toThrow("v2_firebase_voice_device_observation_receipt_invalid");
  });
});
