import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  encodeLearningV2VoiceAudioDevicePageEvidenceV1,
  materializeLearningV2VoiceAudioDevicePageEvidenceV1,
} from "./voice_audio_device_page_evidence_materializer_v1";
import {
  createLearningV2VoiceAudioDevicePageRuntimeInputV1,
  type LearningV2VoiceAudioDevicePageV1,
  type LearningV2VoiceAudioDeviceRuntimeIdentityV1,
} from "./voice_audio_device_page_v1";
import { recordLearningV2VoiceAudioDevicePageV1 } from "./voice_audio_device_page_journal_v1";
import {
  parseLearningV2VoiceAudioDevicePageUploadAckV1,
  type LearningV2VoiceAudioDevicePageUploadAckV1,
} from "./voice_audio_device_page_upload_ack_v1";
import {
  runLearningV2VoiceAudioManifestPageV1,
  type LearningV2VoiceAudioPageRunV1,
} from "./voice_audio_manifest_page_runner_v1";

export const LEARNING_V2_VOICE_AUDIO_DEVICE_HARNESS_RESULT_SCHEMA_V1 =
  "learning-v2-voice-audio-device-harness-result.v1" as const;
export const LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_SCHEMA_V1 =
  "learning-v2-voice-audio-device-pending-upload.v1" as const;
export const LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_MAX_BYTES_V1 =
  512 * 1024;

export interface LearningV2VoiceAudioDeviceHarnessResultV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_DEVICE_HARNESS_RESULT_SCHEMA_V1;
  readonly executionPath: "fresh_device_run" | "resumed_pending_upload";
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly stableProjectionFingerprint: string;
  readonly evidenceFingerprint: string;
  readonly pageRunFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly decoderPageReceiptFingerprint: string;
  readonly pcmPageReceiptFingerprint: string;
  readonly pageCommitFingerprint: string;
  readonly pageCommitPin: LearningV2VoiceAudioDevicePageUploadAckV1["pageCommitPin"];
  readonly journalCommitted: true;
  readonly transportUrlRetention: "forbidden";
  readonly rawAudioRetention: "forbidden";
  readonly rawPcmRetention: "forbidden";
  readonly progressAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly resultFingerprint: string;
}

interface PendingUploadV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_SCHEMA_V1;
  readonly page: Readonly<{
    manifestFingerprint: string;
    episodeReceiptFingerprint: string;
    stableProjectionFingerprint: string;
    pageStartIndex: number;
    pageItemCount: number;
    nextPageStartIndex: number | null;
    rows: readonly Readonly<{
      itemIndex: number;
      generationTargetFingerprint: string;
      entryFingerprint: string;
    }>[];
  }>;
  readonly run: LearningV2VoiceAudioPageRunV1;
  readonly evidenceRaw: string;
  readonly evidenceFingerprint: string;
  readonly pendingPurpose: "retry_upload_without_replaying_audio";
  readonly transportUrlRetention: "forbidden_in_evidence";
  readonly progressAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly pendingFingerprint: string;
}

const PENDING_PREFIX = "learning_v2_voice_audio_pending_upload_v1";

function fail(): never {
  throw new Error("learning_v2_voice_audio_device_harness_invalid");
}

function pendingKey(input: {
  readonly page: LearningV2VoiceAudioDevicePageV1;
  readonly device: LearningV2VoiceAudioDeviceRuntimeIdentityV1;
}): string {
  return `${PENDING_PREFIX}:${hashCanonicalBody({
    manifestFingerprint: input.page.manifestFingerprint,
    episodeReceiptFingerprint: input.page.episodeReceiptFingerprint,
    stableProjectionFingerprint: input.page.stableProjectionFingerprint,
    platform: input.device.platform,
    deviceClass: input.device.deviceClass,
    osVersion: input.device.osVersion,
    appBuildFingerprint: input.device.appBuildFingerprint,
  })}`;
}

function parsePending(raw: string): PendingUploadV1 {
  if (
    raw.length < 2 ||
    raw.length > LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    canonicalJsonV1(value) !== raw
  )
    fail();
  const candidate = value as PendingUploadV1;
  const { pendingFingerprint, ...body } = candidate;
  if (
    candidate.schemaVersion !==
      LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_SCHEMA_V1 ||
    candidate.pendingPurpose !== "retry_upload_without_replaying_audio" ||
    candidate.transportUrlRetention !== "forbidden_in_evidence" ||
    candidate.progressAuthority !== "none" ||
    candidate.listeningEvidenceAuthority !== "none" ||
    candidate.deviceEvidenceAuthority !== "none" ||
    candidate.publicationAuthority !== "none" ||
    candidate.runtimeConsumer !== false ||
    candidate.releaseEligible !== false ||
    candidate.releaseAuthority !== false ||
    pendingFingerprint !== hashCanonicalBody(body)
  )
    fail();
  return candidate;
}

function exactScope(
  pending: PendingUploadV1,
  page: LearningV2VoiceAudioDevicePageV1,
  device: LearningV2VoiceAudioDeviceRuntimeIdentityV1,
): void {
  if (
    pending.page.manifestFingerprint !== page.manifestFingerprint ||
    pending.page.episodeReceiptFingerprint !== page.episodeReceiptFingerprint ||
    pending.page.stableProjectionFingerprint !==
      page.stableProjectionFingerprint ||
    pending.page.pageStartIndex !== page.pageStartIndex ||
    pending.page.pageItemCount !== page.pageItemCount ||
    pending.page.nextPageStartIndex !== page.nextPageStartIndex ||
    pending.page.rows.length !== page.rows.length ||
    pending.page.rows.some(
      (row, index) =>
        row.itemIndex !== page.rows[index]?.itemIndex ||
        row.generationTargetFingerprint !==
          page.rows[index]?.generationTargetFingerprint ||
        row.entryFingerprint !== page.rows[index]?.entryFingerprint,
    ) ||
    pending.run.platform !== device.platform ||
    pending.run.deviceClass !== device.deviceClass ||
    pending.run.osVersion !== device.osVersion ||
    pending.run.appBuildFingerprint !== device.appBuildFingerprint
  )
    fail();
}

function exactAck(
  pending: PendingUploadV1,
  ack: LearningV2VoiceAudioDevicePageUploadAckV1,
): void {
  if (
    ack.manifestFingerprint !== pending.page.manifestFingerprint ||
    ack.audioEpisodeReceiptFingerprint !==
      pending.page.episodeReceiptFingerprint ||
    ack.stableProjectionFingerprint !==
      pending.page.stableProjectionFingerprint ||
    ack.evidenceFingerprint !== pending.evidenceFingerprint ||
    ack.pageRunFingerprint !== pending.run.pageRunFingerprint ||
    ack.pageStartIndex !== pending.page.pageStartIndex ||
    ack.pageItemCount !== pending.page.pageItemCount ||
    ack.nextPageStartIndex !== pending.page.nextPageStartIndex ||
    ack.platform !== pending.run.platform ||
    ack.deviceClass !== pending.run.deviceClass ||
    ack.osVersion !== pending.run.osVersion ||
    ack.appBuildFingerprint !== pending.run.appBuildFingerprint
  )
    fail();
}

export async function runLearningV2VoiceAudioDeviceHarnessPageV1(input: {
  readonly page: LearningV2VoiceAudioDevicePageV1;
  readonly device: LearningV2VoiceAudioDeviceRuntimeIdentityV1;
  readonly observedAtMs: number;
  readonly uploadEvidence: (
    evidenceRaw: string,
  ) => Promise<LearningV2VoiceAudioDevicePageUploadAckV1>;
}): Promise<LearningV2VoiceAudioDeviceHarnessResultV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "device|observedAtMs|page|uploadEvidence" ||
    typeof input.uploadEvidence !== "function"
  )
    fail();
  const key = pendingKey({ page: input.page, device: input.device });
  const existingRaw = await AsyncStorage.getItem(key);
  let pending: PendingUploadV1;
  let executionPath: LearningV2VoiceAudioDeviceHarnessResultV1["executionPath"];
  if (existingRaw !== null) {
    pending = parsePending(existingRaw);
    exactScope(pending, input.page, input.device);
    executionPath = "resumed_pending_upload";
  } else {
    const runtimeInput = createLearningV2VoiceAudioDevicePageRuntimeInputV1({
      page: input.page,
      device: input.device,
      observedAtMs: input.observedAtMs,
    });
    const run = await runLearningV2VoiceAudioManifestPageV1({
      pageStartIndex: input.page.pageStartIndex,
      identities: runtimeInput.identities,
      resolveSourceUrl: runtimeInput.resolveSourceUrl,
    });
    const evidence = materializeLearningV2VoiceAudioDevicePageEvidenceV1({
      page: input.page,
      run,
    });
    const body = {
      schemaVersion: LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_SCHEMA_V1,
      page: Object.freeze({
        manifestFingerprint: input.page.manifestFingerprint,
        episodeReceiptFingerprint: input.page.episodeReceiptFingerprint,
        stableProjectionFingerprint: input.page.stableProjectionFingerprint,
        pageStartIndex: input.page.pageStartIndex,
        pageItemCount: input.page.pageItemCount,
        nextPageStartIndex: input.page.nextPageStartIndex,
        rows: Object.freeze(
          input.page.rows.map((row) =>
            Object.freeze({
              itemIndex: row.itemIndex,
              generationTargetFingerprint: row.generationTargetFingerprint,
              entryFingerprint: row.entryFingerprint,
            }),
          ),
        ),
      }),
      run,
      evidenceRaw: encodeLearningV2VoiceAudioDevicePageEvidenceV1(evidence),
      evidenceFingerprint: evidence.evidenceFingerprint,
      pendingPurpose: "retry_upload_without_replaying_audio" as const,
      transportUrlRetention: "forbidden_in_evidence" as const,
      progressAuthority: "none" as const,
      listeningEvidenceAuthority: "none" as const,
      deviceEvidenceAuthority: "none" as const,
      publicationAuthority: "none" as const,
      runtimeConsumer: false as const,
      releaseEligible: false as const,
      releaseAuthority: false as const,
    };
    pending = Object.freeze({
      ...body,
      pendingFingerprint: hashCanonicalBody(body),
    });
    const raw = canonicalJsonV1(pending);
    if (
      utf8ByteLengthV1(raw) >
        LEARNING_V2_VOICE_AUDIO_DEVICE_PENDING_UPLOAD_MAX_BYTES_V1 ||
      raw.includes("file://")
    )
      fail();
    await AsyncStorage.setItem(key, raw);
    executionPath = "fresh_device_run";
  }
  const ack = parseLearningV2VoiceAudioDevicePageUploadAckV1(
    await input.uploadEvidence(pending.evidenceRaw),
  );
  exactAck(pending, ack);
  await recordLearningV2VoiceAudioDevicePageV1({
    page: pending.page as never,
    run: pending.run,
    uploadAck: ack,
  });
  await AsyncStorage.removeItem(key);
  const body = {
    schemaVersion: LEARNING_V2_VOICE_AUDIO_DEVICE_HARNESS_RESULT_SCHEMA_V1,
    executionPath,
    manifestFingerprint: pending.page.manifestFingerprint,
    audioEpisodeReceiptFingerprint: pending.page.episodeReceiptFingerprint,
    stableProjectionFingerprint: pending.page.stableProjectionFingerprint,
    evidenceFingerprint: pending.evidenceFingerprint,
    pageRunFingerprint: pending.run.pageRunFingerprint,
    pageStartIndex: pending.page.pageStartIndex,
    pageItemCount: pending.page.pageItemCount,
    nextPageStartIndex: pending.page.nextPageStartIndex,
    decoderPageReceiptFingerprint: ack.decoderPageReceiptFingerprint,
    pcmPageReceiptFingerprint: ack.pcmPageReceiptFingerprint,
    pageCommitFingerprint: ack.pageCommitFingerprint,
    pageCommitPin: ack.pageCommitPin,
    journalCommitted: true as const,
    transportUrlRetention: "forbidden" as const,
    rawAudioRetention: "forbidden" as const,
    rawPcmRetention: "forbidden" as const,
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
