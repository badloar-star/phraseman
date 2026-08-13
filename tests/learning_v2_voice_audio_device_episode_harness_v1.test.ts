const mockReadJournal = jest.fn();
const mockRunPage = jest.fn();

jest.mock(
  "../modules/learning-v2/runtime/voice_audio_device_page_journal_v1",
  () => ({
    readLearningV2VoiceAudioDeviceJournalV1: (...args: unknown[]) =>
      mockReadJournal(...args),
  }),
);
jest.mock(
  "../modules/learning-v2/runtime/voice_audio_device_harness_v1",
  () => ({
    runLearningV2VoiceAudioDeviceHarnessPageV1: (...args: unknown[]) =>
      mockRunPage(...args),
  }),
);

/* eslint-disable import/first -- device runtime ports are mocked first */
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import { runLearningV2VoiceAudioDeviceEpisodeHarnessV1 } from "../modules/learning-v2/runtime/voice_audio_device_episode_harness_v1";
import { materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1 } from "../modules/learning-v2/runtime/voice_audio_device_episode_upload_ack_v1";
/* eslint-enable import/first */

const h = (value: unknown) => hashCanonicalBody(value);
const manifestFingerprint = h("manifest");
const audioEpisodeReceiptFingerprint = h("audio-receipt");
const device = Object.freeze({
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  expoAudioVersion: "1.1.1" as const,
});

function pageCommit(start: number) {
  const fingerprint = h(["commit", start]);
  const contentHash = h(["commit-raw", start]);
  return {
    pageStartIndex: start,
    pageItemCount: 32,
    nextPageStartIndex: start === 0 ? 32 : null,
    stableProjectionFingerprint: h(["projection", start]),
    pageRunFingerprint: h(["run", start]),
    pageCommitFingerprint: fingerprint,
    pageCommitPin: {
      objectPath: `learning-v2/voice-device-receipts/${h("plan")}/${h("stage")}/${manifestFingerprint}/page-commit/${fingerprint}/${contentHash}.json`,
      contentHash,
      objectGeneration: "1",
      byteSize: 1_000,
      contentType: "application/json; charset=utf-8" as const,
    },
    pageFingerprint: h(["page", start]),
  };
}

function journal(pages: ReturnType<typeof pageCommit>[], next: number | null) {
  return {
    manifestFingerprint,
    episodeReceiptFingerprint: audioEpisodeReceiptFingerprint,
    ...device,
    completedItemCount: pages.reduce(
      (total, page) => total + page.pageItemCount,
      0,
    ),
    nextPageStartIndex: next,
    pages,
  };
}

function episodeAck(pages: ReturnType<typeof pageCommit>[]) {
  return materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1({
    manifestFingerprint,
    audioEpisodeReceiptFingerprint,
    platform: device.platform,
    deviceClass: device.deviceClass,
    osVersion: device.osVersion,
    appBuildFingerprint: device.appBuildFingerprint,
    audioObjectCount: 64,
    pageCount: pages.length,
    orderedPageCommitAggregateFingerprint: hashCanonicalBody(
      pages.map((page) => page.pageCommitFingerprint),
    ),
    decoderEpisodeReceiptFingerprint: h("decoder-episode"),
    pcmEpisodeReceiptFingerprint: h("pcm-episode"),
    pcmEpisodeDisposition: "candidate_for_human_listening",
  });
}

const baseInput = {
  manifestFingerprint,
  audioEpisodeReceiptFingerprint,
  audioObjectCount: 64,
  device,
  observedAtMs: 10,
  fetchPage: jest.fn(),
  uploadPageEvidence: jest.fn(),
};

describe("Learning V2 voice device episode harness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resumes from the journal and finalizes with every durable page commit pin", async () => {
    const first = pageCommit(0);
    const second = pageCommit(32);
    mockReadJournal
      .mockResolvedValueOnce(journal([first], 32))
      .mockResolvedValueOnce(journal([first, second], null));
    baseInput.fetchPage.mockResolvedValue({
      manifestFingerprint,
      episodeReceiptFingerprint: audioEpisodeReceiptFingerprint,
      pageStartIndex: 32,
    });
    mockRunPage.mockResolvedValue({ nextPageStartIndex: null });
    const finalizeEpisode = jest
      .fn()
      .mockResolvedValue(episodeAck([first, second]));

    const result = await runLearningV2VoiceAudioDeviceEpisodeHarnessV1({
      ...baseInput,
      finalizeEpisode,
    } as never);

    expect(result).toMatchObject({
      executionPath: "resumed_episode_run",
      pageCount: 2,
      pagesRunThisInvocation: 1,
      releaseEligible: false,
    });
    expect(baseInput.fetchPage).toHaveBeenCalledWith(32);
    expect(finalizeEpisode).toHaveBeenCalledWith([
      first.pageCommitPin,
      second.pageCommitPin,
    ]);
  });

  it("cold-replays a complete journal without replaying audio", async () => {
    const pages = [pageCommit(0), pageCommit(32)];
    mockReadJournal.mockResolvedValue(journal(pages, null));
    const finalizeEpisode = jest.fn().mockResolvedValue(episodeAck(pages));
    const result = await runLearningV2VoiceAudioDeviceEpisodeHarnessV1({
      ...baseInput,
      finalizeEpisode,
    } as never);
    expect(result.executionPath).toBe("replayed_complete_journal");
    expect(result.pagesRunThisInvocation).toBe(0);
    expect(mockRunPage).not.toHaveBeenCalled();
    expect(baseInput.fetchPage).not.toHaveBeenCalled();
  });

  it("rejects a server episode acknowledgement for another page set", async () => {
    const pages = [pageCommit(0), pageCommit(32)];
    mockReadJournal.mockResolvedValue(journal(pages, null));
    const wrong = {
      ...episodeAck(pages),
      orderedPageCommitAggregateFingerprint: h("wrong"),
    };
    await expect(
      runLearningV2VoiceAudioDeviceEpisodeHarnessV1({
        ...baseInput,
        finalizeEpisode: async () => wrong as never,
      } as never),
    ).rejects.toThrow(
      "learning_v2_voice_audio_device_episode_upload_ack_invalid",
    );
  });

  it("rejects a forged or extended episode acknowledgement", async () => {
    const pages = [pageCommit(0), pageCommit(32)];
    mockReadJournal.mockResolvedValue(journal(pages, null));
    const forged = {
      ...episodeAck(pages),
      acknowledgementFingerprint: h("forged"),
      hidden: "unexpected",
    };
    await expect(
      runLearningV2VoiceAudioDeviceEpisodeHarnessV1({
        ...baseInput,
        finalizeEpisode: async () => forged as never,
      } as never),
    ).rejects.toThrow(
      "learning_v2_voice_audio_device_episode_upload_ack_invalid",
    );
  });
});
