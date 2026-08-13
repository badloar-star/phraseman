import AsyncStorage from "@react-native-async-storage/async-storage";

const mockRuntimeInput = jest.fn();
const mockRun = jest.fn();
const mockMaterializeEvidence = jest.fn();
const mockEncodeEvidence = jest.fn();
const mockRecordJournal = jest.fn();

jest.mock("../modules/learning-v2/runtime/voice_audio_device_page_v1", () => ({
  createLearningV2VoiceAudioDevicePageRuntimeInputV1: (...args: unknown[]) =>
    mockRuntimeInput(...args),
}));
jest.mock(
  "../modules/learning-v2/runtime/voice_audio_manifest_page_runner_v1",
  () => ({
    runLearningV2VoiceAudioManifestPageV1: (...args: unknown[]) =>
      mockRun(...args),
  }),
);
jest.mock(
  "../modules/learning-v2/runtime/voice_audio_device_page_evidence_materializer_v1",
  () => ({
    materializeLearningV2VoiceAudioDevicePageEvidenceV1: (...args: unknown[]) =>
      mockMaterializeEvidence(...args),
    encodeLearningV2VoiceAudioDevicePageEvidenceV1: (...args: unknown[]) =>
      mockEncodeEvidence(...args),
  }),
);
jest.mock(
  "../modules/learning-v2/runtime/voice_audio_device_page_journal_v1",
  () => ({
    recordLearningV2VoiceAudioDevicePageV1: (...args: unknown[]) =>
      mockRecordJournal(...args),
  }),
);

/* eslint-disable import/first -- physical runtime and journal ports are mocked first */
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import { runLearningV2VoiceAudioDeviceHarnessPageV1 } from "../modules/learning-v2/runtime/voice_audio_device_harness_v1";
import { materializeLearningV2VoiceAudioDevicePageUploadAckV1 } from "../modules/learning-v2/runtime/voice_audio_device_page_upload_ack_v1";
/* eslint-enable import/first */

const h = (value: unknown) => hashCanonicalBody(value);
const page = Object.freeze({
  manifestFingerprint: h("manifest"),
  episodeReceiptFingerprint: h("episode"),
  stableProjectionFingerprint: h("projection"),
  pageStartIndex: 0,
  pageItemCount: 1,
  nextPageStartIndex: null,
  rows: Object.freeze([
    Object.freeze({
      itemIndex: 0,
      generationTargetFingerprint: h("target"),
      entryFingerprint: h("entry"),
    }),
  ]),
});
const device = Object.freeze({
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  expoAudioVersion: "1.1.1" as const,
});
const run = Object.freeze({
  pageStartIndex: 0,
  pageItemCount: 1,
  platform: device.platform,
  deviceClass: device.deviceClass,
  osVersion: device.osVersion,
  appBuildFingerprint: device.appBuildFingerprint,
  pageRunFingerprint: h("run"),
});
const evidence = Object.freeze({ evidenceFingerprint: h("evidence") });
const evidenceRaw = '{"safe":"evidence"}';
const ack = () =>
  materializeLearningV2VoiceAudioDevicePageUploadAckV1({
    manifestFingerprint: page.manifestFingerprint,
    audioEpisodeReceiptFingerprint: page.episodeReceiptFingerprint,
    stableProjectionFingerprint: page.stableProjectionFingerprint,
    evidenceFingerprint: evidence.evidenceFingerprint,
    pageRunFingerprint: run.pageRunFingerprint,
    pageStartIndex: 0,
    pageItemCount: 1,
    nextPageStartIndex: null,
    platform: device.platform,
    deviceClass: device.deviceClass,
    osVersion: device.osVersion,
    appBuildFingerprint: device.appBuildFingerprint,
    decoderPageReceiptFingerprint: h("decoder"),
    pcmPageReceiptFingerprint: h("pcm"),
    pageCommitFingerprint: h("page-commit"),
    pageCommitPin: {
      objectPath: `learning-v2/voice-device-receipts/${h("plan")}/${h("stage")}/${h("manifest")}/page-commit/${h("page-commit")}/${h("page-commit-raw")}.json`,
      contentHash: h("page-commit-raw"),
      objectGeneration: "1",
      byteSize: 1_000,
      contentType: "application/json; charset=utf-8",
    },
  });

describe("Learning V2 recoverable device page harness", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockRuntimeInput.mockReset().mockReturnValue({
      identities: [{}],
      resolveSourceUrl: jest.fn(),
    });
    mockRun.mockReset().mockResolvedValue(run);
    mockMaterializeEvidence.mockReset().mockReturnValue(evidence);
    mockEncodeEvidence.mockReset().mockReturnValue(evidenceRaw);
    mockRecordJournal.mockReset().mockResolvedValue({});
  });

  it("runs, persists pending evidence, uploads, then commits the journal", async () => {
    const upload = jest.fn().mockResolvedValue(ack());
    const result = await runLearningV2VoiceAudioDeviceHarnessPageV1({
      page: page as never,
      device,
      observedAtMs: 10,
      uploadEvidence: upload,
    });
    expect(result).toMatchObject({
      executionPath: "fresh_device_run",
      journalCommitted: true,
      deviceEvidenceAuthority: "none",
      releaseEligible: false,
    });
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(evidenceRaw);
    expect(mockRecordJournal).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it("retries a failed upload after restart without replaying audio", async () => {
    const failingUpload = jest.fn().mockRejectedValue(new Error("offline"));
    await expect(
      runLearningV2VoiceAudioDeviceHarnessPageV1({
        page: page as never,
        device,
        observedAtMs: 10,
        uploadEvidence: failingUpload,
      }),
    ).rejects.toThrow("offline");
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getAllKeys()).toHaveLength(1);

    const result = await runLearningV2VoiceAudioDeviceHarnessPageV1({
      page: page as never,
      device,
      observedAtMs: 20,
      uploadEvidence: async () => ack(),
    });
    expect(result.executionPath).toBe("resumed_pending_upload");
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockMaterializeEvidence).toHaveBeenCalledTimes(1);
    expect(mockRecordJournal).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it("keeps pending evidence when the acknowledgement is for another page", async () => {
    const wrong = {
      ...ack(),
      evidenceFingerprint: h("wrong"),
    };
    await expect(
      runLearningV2VoiceAudioDeviceHarnessPageV1({
        page: page as never,
        device,
        observedAtMs: 10,
        uploadEvidence: async () => wrong as never,
      }),
    ).rejects.toThrow("learning_v2_voice_audio_device_page_upload_ack_invalid");
    expect(mockRecordJournal).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toHaveLength(1);
  });

  it("rejects an acknowledgement with a forged fingerprint or extra field", async () => {
    const forged = {
      ...ack(),
      acknowledgementFingerprint: h("forged"),
      hidden: "unexpected",
    };
    await expect(
      runLearningV2VoiceAudioDeviceHarnessPageV1({
        page: page as never,
        device,
        observedAtMs: 10,
        uploadEvidence: async () => forged as never,
      }),
    ).rejects.toThrow("learning_v2_voice_audio_device_page_upload_ack_invalid");
    expect(mockRecordJournal).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toHaveLength(1);
  });
});
