import { hashCanonicalBody } from "../policies/decision_registry";
import {
  runLearningV2VoiceAudioDeviceHarnessPageV1,
  type LearningV2VoiceAudioDeviceHarnessResultV1,
} from "./voice_audio_device_harness_v1";
import {
  readLearningV2VoiceAudioDeviceJournalV1,
  type LearningV2VoiceAudioDeviceJournalV1,
} from "./voice_audio_device_page_journal_v1";
import {
  parseLearningV2VoiceAudioDeviceEpisodeUploadAckV1,
  type LearningV2VoiceAudioDeviceEpisodeUploadAckV1,
} from "./voice_audio_device_episode_upload_ack_v1";
import { type LearningV2VoiceAudioDevicePageUploadAckV1 } from "./voice_audio_device_page_upload_ack_v1";
import {
  type LearningV2VoiceAudioDevicePageV1,
  type LearningV2VoiceAudioDeviceRuntimeIdentityV1,
} from "./voice_audio_device_page_v1";

export const LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_HARNESS_RESULT_SCHEMA_V1 =
  "learning-v2-voice-audio-device-episode-harness-result.v1" as const;

export interface LearningV2VoiceAudioDeviceEpisodeHarnessResultV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_HARNESS_RESULT_SCHEMA_V1;
  readonly executionPath:
    | "fresh_episode_run"
    | "resumed_episode_run"
    | "replayed_complete_journal";
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly audioObjectCount: number;
  readonly pageCount: number;
  readonly pagesRunThisInvocation: number;
  readonly orderedPageCommitAggregateFingerprint: string;
  readonly decoderEpisodeReceiptFingerprint: string;
  readonly pcmEpisodeReceiptFingerprint: string;
  readonly pcmEpisodeDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly journalRetainedForExactReplay: true;
  readonly progressAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly resultFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;

function fail(): never {
  throw new Error("learning_v2_voice_audio_device_episode_harness_invalid");
}

function exactEpisodeAck(input: {
  readonly ack: LearningV2VoiceAudioDeviceEpisodeUploadAckV1;
  readonly journal: LearningV2VoiceAudioDeviceJournalV1;
  readonly audioObjectCount: number;
}): void {
  const pageCommitAggregate = hashCanonicalBody(
    input.journal.pages.map((page) => page.pageCommitFingerprint),
  );
  if (
    input.journal.nextPageStartIndex !== null ||
    input.journal.completedItemCount !== input.audioObjectCount ||
    input.ack.manifestFingerprint !== input.journal.manifestFingerprint ||
    input.ack.audioEpisodeReceiptFingerprint !==
      input.journal.episodeReceiptFingerprint ||
    input.ack.platform !== input.journal.platform ||
    input.ack.deviceClass !== input.journal.deviceClass ||
    input.ack.osVersion !== input.journal.osVersion ||
    input.ack.appBuildFingerprint !== input.journal.appBuildFingerprint ||
    input.ack.audioObjectCount !== input.audioObjectCount ||
    input.ack.pageCount !== input.journal.pages.length ||
    input.ack.orderedPageCommitAggregateFingerprint !== pageCommitAggregate ||
    input.ack.receiptPersistenceResult !== "generation_pinned_exact_readback" ||
    input.ack.receiptAuthority !== "none_serialized_server_acknowledgement" ||
    input.ack.listeningEvidenceAuthority !== "none" ||
    input.ack.deviceEvidenceAuthority !== "none" ||
    input.ack.publicationAuthority !== "none" ||
    input.ack.runtimeConsumer !== false ||
    input.ack.releaseEligible !== false ||
    input.ack.releaseAuthority !== false
  )
    fail();
}

export async function runLearningV2VoiceAudioDeviceEpisodeHarnessV1(input: {
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly audioObjectCount: number;
  readonly device: LearningV2VoiceAudioDeviceRuntimeIdentityV1;
  readonly observedAtMs: number;
  readonly fetchPage: (
    pageStartIndex: number,
  ) => Promise<LearningV2VoiceAudioDevicePageV1>;
  readonly uploadPageEvidence: (
    evidenceRaw: string,
  ) => Promise<LearningV2VoiceAudioDevicePageUploadAckV1>;
  readonly finalizeEpisode: (
    pageCommitPins: readonly LearningV2VoiceAudioDevicePageUploadAckV1["pageCommitPin"][],
  ) => Promise<LearningV2VoiceAudioDeviceEpisodeUploadAckV1>;
}): Promise<LearningV2VoiceAudioDeviceEpisodeHarnessResultV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    !HASH_RE.test(input.manifestFingerprint) ||
    !HASH_RE.test(input.audioEpisodeReceiptFingerprint) ||
    !Number.isSafeInteger(input.audioObjectCount) ||
    input.audioObjectCount < 1 ||
    !Number.isSafeInteger(input.observedAtMs) ||
    input.observedAtMs < 0 ||
    typeof input.fetchPage !== "function" ||
    typeof input.uploadPageEvidence !== "function" ||
    typeof input.finalizeEpisode !== "function"
  )
    fail();
  const scope = {
    manifestFingerprint: input.manifestFingerprint,
    episodeReceiptFingerprint: input.audioEpisodeReceiptFingerprint,
    platform: input.device.platform,
    deviceClass: input.device.deviceClass,
    osVersion: input.device.osVersion,
    appBuildFingerprint: input.device.appBuildFingerprint,
  };
  let journal = await readLearningV2VoiceAudioDeviceJournalV1(scope);
  const pagesBefore = journal?.pages.length ?? 0;
  let pagesRunThisInvocation = 0;
  let next: number | null = journal ? journal.nextPageStartIndex : 0;
  while (next !== null) {
    if (pagesRunThisInvocation >= 1_404) fail();
    const page = await input.fetchPage(next);
    if (
      page.manifestFingerprint !== input.manifestFingerprint ||
      page.episodeReceiptFingerprint !== input.audioEpisodeReceiptFingerprint ||
      page.pageStartIndex !== next
    )
      fail();
    const result: LearningV2VoiceAudioDeviceHarnessResultV1 =
      await runLearningV2VoiceAudioDeviceHarnessPageV1({
        page,
        device: input.device,
        observedAtMs: input.observedAtMs,
        uploadEvidence: input.uploadPageEvidence,
      });
    pagesRunThisInvocation += 1;
    next = result.nextPageStartIndex;
    journal = await readLearningV2VoiceAudioDeviceJournalV1(scope);
    if (
      !journal ||
      journal.nextPageStartIndex !== next ||
      journal.completedItemCount > input.audioObjectCount
    )
      fail();
  }
  if (
    !journal ||
    journal.completedItemCount !== input.audioObjectCount ||
    journal.pages.length < 1
  )
    fail();
  const ack = parseLearningV2VoiceAudioDeviceEpisodeUploadAckV1(
    await input.finalizeEpisode(
      journal.pages.map((page) => page.pageCommitPin),
    ),
  );
  exactEpisodeAck({ ack, journal, audioObjectCount: input.audioObjectCount });
  const executionPath =
    pagesRunThisInvocation === 0
      ? ("replayed_complete_journal" as const)
      : pagesBefore === 0
        ? ("fresh_episode_run" as const)
        : ("resumed_episode_run" as const);
  const body = {
    schemaVersion:
      LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_HARNESS_RESULT_SCHEMA_V1,
    executionPath,
    manifestFingerprint: input.manifestFingerprint,
    audioEpisodeReceiptFingerprint: input.audioEpisodeReceiptFingerprint,
    audioObjectCount: input.audioObjectCount,
    pageCount: journal.pages.length,
    pagesRunThisInvocation,
    orderedPageCommitAggregateFingerprint:
      ack.orderedPageCommitAggregateFingerprint,
    decoderEpisodeReceiptFingerprint: ack.decoderEpisodeReceiptFingerprint,
    pcmEpisodeReceiptFingerprint: ack.pcmEpisodeReceiptFingerprint,
    pcmEpisodeDisposition: ack.pcmEpisodeDisposition,
    journalRetainedForExactReplay: true as const,
    progressAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  return Object.freeze({ ...body, resultFingerprint: hashCanonicalBody(body) });
}
