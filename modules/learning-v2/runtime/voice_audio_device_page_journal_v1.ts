import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { type LearningV2VoiceAudioDevicePageV1 } from "./voice_audio_device_page_v1";
import { type LearningV2VoiceAudioDevicePageUploadAckV1 } from "./voice_audio_device_page_upload_ack_v1";
import { type LearningV2VoiceAudioPageRunV1 } from "./voice_audio_manifest_page_runner_v1";

export const LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_SCHEMA_V1 =
  "learning-v2-voice-audio-device-journal.v1" as const;
export const LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_MAX_PAGES_V1 = 1_404;
export const LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_MAX_BYTES_V1 = 512 * 1024;

export interface LearningV2VoiceAudioDeviceJournalPageV1 {
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly stableProjectionFingerprint: string;
  readonly pageRunFingerprint: string;
  readonly pageCommitFingerprint: string;
  readonly pageCommitPin: LearningV2VoiceAudioDevicePageUploadAckV1["pageCommitPin"];
  readonly pageFingerprint: string;
}

export interface LearningV2VoiceAudioDeviceJournalV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_SCHEMA_V1;
  readonly manifestFingerprint: string;
  readonly episodeReceiptFingerprint: string;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly completedItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly pages: readonly LearningV2VoiceAudioDeviceJournalPageV1[];
  readonly orderedPageAggregateFingerprint: string;
  readonly persistenceScope: "local_device_qa_resume_only";
  readonly transportUrlRetention: "forbidden";
  readonly progressAuthority: "none";
  readonly repositoryOriginAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly journalFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;
const JOURNAL_KEY_PREFIX = "learning_v2_voice_audio_device_journal_v1";

function fail(): never {
  throw new Error("learning_v2_voice_audio_device_journal_invalid");
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  return Object.keys(value).sort().join("|") === [...expected].sort().join("|");
}

function journalKey(input: {
  readonly manifestFingerprint: string;
  readonly episodeReceiptFingerprint: string;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
}): string {
  return `${JOURNAL_KEY_PREFIX}:${hashCanonicalBody(input)}`;
}

function parseJournal(raw: string): LearningV2VoiceAudioDeviceJournalV1 {
  if (
    raw.length < 2 ||
    raw.length > LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded) ||
    Object.getPrototypeOf(decoded) !== Object.prototype ||
    canonicalJsonV1(decoded) !== raw
  )
    fail();
  const value = decoded as Record<string, unknown>;
  if (
    !exactKeys(value, [
      "appBuildFingerprint",
      "completedItemCount",
      "deviceClass",
      "deviceEvidenceAuthority",
      "episodeReceiptFingerprint",
      "journalFingerprint",
      "listeningEvidenceAuthority",
      "manifestFingerprint",
      "nextPageStartIndex",
      "orderedPageAggregateFingerprint",
      "osVersion",
      "pages",
      "persistenceScope",
      "platform",
      "progressAuthority",
      "publicationAuthority",
      "releaseAuthority",
      "releaseEligible",
      "repositoryOriginAuthority",
      "runtimeConsumer",
      "schemaVersion",
      "transportUrlRetention",
    ]) ||
    value.schemaVersion !== LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_SCHEMA_V1 ||
    !HASH_RE.test(String(value.manifestFingerprint)) ||
    !HASH_RE.test(String(value.episodeReceiptFingerprint)) ||
    !["ios", "android"].includes(String(value.platform)) ||
    !["physical_device", "simulator_or_emulator"].includes(
      String(value.deviceClass),
    ) ||
    !TOKEN_RE.test(String(value.osVersion)) ||
    !HASH_RE.test(String(value.appBuildFingerprint)) ||
    !Number.isSafeInteger(value.completedItemCount) ||
    Number(value.completedItemCount) < 1 ||
    !Array.isArray(value.pages) ||
    value.pages.length < 1 ||
    value.pages.length > LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_MAX_PAGES_V1 ||
    value.persistenceScope !== "local_device_qa_resume_only" ||
    value.transportUrlRetention !== "forbidden" ||
    value.progressAuthority !== "none" ||
    value.repositoryOriginAuthority !== "none" ||
    value.listeningEvidenceAuthority !== "none" ||
    value.deviceEvidenceAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.runtimeConsumer !== false ||
    value.releaseEligible !== false ||
    value.releaseAuthority !== false
  )
    fail();
  let expectedStart = 0;
  const pages = Object.freeze(
    value.pages.map((candidate) => {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate) ||
        Object.getPrototypeOf(candidate) !== Object.prototype
      )
        fail();
      const page = candidate as Record<string, unknown>;
      if (
        !exactKeys(page, [
          "nextPageStartIndex",
          "pageCommitFingerprint",
          "pageCommitPin",
          "pageFingerprint",
          "pageItemCount",
          "pageRunFingerprint",
          "pageStartIndex",
          "stableProjectionFingerprint",
        ]) ||
        page.pageStartIndex !== expectedStart ||
        !Number.isSafeInteger(page.pageItemCount) ||
        Number(page.pageItemCount) < 1 ||
        Number(page.pageItemCount) > 32 ||
        !HASH_RE.test(String(page.stableProjectionFingerprint)) ||
        !HASH_RE.test(String(page.pageRunFingerprint)) ||
        !HASH_RE.test(String(page.pageCommitFingerprint)) ||
        !page.pageCommitPin ||
        typeof page.pageCommitPin !== "object" ||
        Array.isArray(page.pageCommitPin) ||
        Object.getPrototypeOf(page.pageCommitPin) !== Object.prototype ||
        !exactKeys(page.pageCommitPin as Record<string, unknown>, [
          "byteSize",
          "contentHash",
          "contentType",
          "objectGeneration",
          "objectPath",
        ]) ||
        !HASH_RE.test(String(page.pageFingerprint))
      )
        fail();
      const pageCommitPin = page.pageCommitPin as Record<string, unknown>;
      if (
        !String(pageCommitPin.objectPath).includes(
          `/page-commit/${String(page.pageCommitFingerprint)}/`,
        ) ||
        !HASH_RE.test(String(pageCommitPin.contentHash)) ||
        !String(pageCommitPin.objectPath).endsWith(
          `/${String(pageCommitPin.contentHash)}.json`,
        ) ||
        !/^[1-9][0-9]{0,30}$/u.test(String(pageCommitPin.objectGeneration)) ||
        !Number.isSafeInteger(pageCommitPin.byteSize) ||
        Number(pageCommitPin.byteSize) < 1 ||
        Number(pageCommitPin.byteSize) > 32 * 1024 ||
        pageCommitPin.contentType !== "application/json; charset=utf-8"
      )
        fail();
      const body = {
        pageStartIndex: Number(page.pageStartIndex),
        pageItemCount: Number(page.pageItemCount),
        nextPageStartIndex:
          page.nextPageStartIndex === null
            ? null
            : Number(page.nextPageStartIndex),
        stableProjectionFingerprint: String(page.stableProjectionFingerprint),
        pageRunFingerprint: String(page.pageRunFingerprint),
        pageCommitFingerprint: String(page.pageCommitFingerprint),
        pageCommitPin:
          page.pageCommitPin as LearningV2VoiceAudioDevicePageUploadAckV1["pageCommitPin"],
      };
      if (
        (body.nextPageStartIndex !== null &&
          (!Number.isSafeInteger(body.nextPageStartIndex) ||
            body.nextPageStartIndex !==
              body.pageStartIndex + body.pageItemCount)) ||
        page.pageFingerprint !== hashCanonicalBody(body)
      )
        fail();
      expectedStart += body.pageItemCount;
      return Object.freeze({
        ...body,
        pageFingerprint: String(page.pageFingerprint),
      });
    }),
  );
  if (
    value.completedItemCount !== expectedStart ||
    value.nextPageStartIndex !== pages.at(-1)!.nextPageStartIndex ||
    value.orderedPageAggregateFingerprint !==
      hashCanonicalBody(pages.map((page) => page.pageFingerprint))
  )
    fail();
  const body = { ...value };
  delete body.journalFingerprint;
  if (value.journalFingerprint !== hashCanonicalBody(body)) fail();
  return Object.freeze({
    ...(value as unknown as LearningV2VoiceAudioDeviceJournalV1),
    pages,
  });
}

function exactRunBinding(
  page: LearningV2VoiceAudioDevicePageV1,
  run: LearningV2VoiceAudioPageRunV1,
): void {
  if (
    page.pageStartIndex !== run.pageStartIndex ||
    page.pageItemCount !== run.pageItemCount ||
    page.rows.length !== run.rows.length ||
    page.rows.some(
      (row, index) =>
        row.itemIndex !== run.rows[index]?.itemIndex ||
        row.generationTargetFingerprint !==
          run.rows[index]?.generationTargetFingerprint ||
        row.entryFingerprint !== run.rows[index]?.entryFingerprint,
    ) ||
    !HASH_RE.test(run.pageRunFingerprint)
  )
    fail();
}

function exactUploadAckBinding(
  page: LearningV2VoiceAudioDevicePageV1,
  run: LearningV2VoiceAudioPageRunV1,
  uploadAck: LearningV2VoiceAudioDevicePageUploadAckV1,
): void {
  if (
    uploadAck.manifestFingerprint !== page.manifestFingerprint ||
    uploadAck.audioEpisodeReceiptFingerprint !==
      page.episodeReceiptFingerprint ||
    uploadAck.stableProjectionFingerprint !==
      page.stableProjectionFingerprint ||
    uploadAck.pageRunFingerprint !== run.pageRunFingerprint ||
    uploadAck.pageStartIndex !== page.pageStartIndex ||
    uploadAck.pageItemCount !== page.pageItemCount ||
    uploadAck.nextPageStartIndex !== page.nextPageStartIndex ||
    uploadAck.receiptPersistenceResult !== "generation_pinned_exact_readback" ||
    uploadAck.receiptAuthority !== "none_serialized_server_acknowledgement" ||
    uploadAck.listeningEvidenceAuthority !== "none" ||
    uploadAck.deviceEvidenceAuthority !== "none" ||
    uploadAck.publicationAuthority !== "none" ||
    uploadAck.runtimeConsumer !== false ||
    uploadAck.releaseEligible !== false ||
    uploadAck.releaseAuthority !== false
  )
    fail();
}

export async function readLearningV2VoiceAudioDeviceJournalV1(input: {
  readonly manifestFingerprint: string;
  readonly episodeReceiptFingerprint: string;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
}): Promise<LearningV2VoiceAudioDeviceJournalV1 | null> {
  const key = journalKey(input);
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  const value = parseJournal(raw);
  if (
    value.manifestFingerprint !== input.manifestFingerprint ||
    value.episodeReceiptFingerprint !== input.episodeReceiptFingerprint ||
    value.platform !== input.platform ||
    value.deviceClass !== input.deviceClass ||
    value.osVersion !== input.osVersion ||
    value.appBuildFingerprint !== input.appBuildFingerprint
  )
    fail();
  return value;
}

export async function recordLearningV2VoiceAudioDevicePageV1(input: {
  readonly page: LearningV2VoiceAudioDevicePageV1;
  readonly run: LearningV2VoiceAudioPageRunV1;
  readonly uploadAck: LearningV2VoiceAudioDevicePageUploadAckV1;
}): Promise<LearningV2VoiceAudioDeviceJournalV1> {
  exactRunBinding(input.page, input.run);
  exactUploadAckBinding(input.page, input.run, input.uploadAck);
  const scope = {
    manifestFingerprint: input.page.manifestFingerprint,
    episodeReceiptFingerprint: input.page.episodeReceiptFingerprint,
    platform: input.run.platform,
    deviceClass: input.run.deviceClass,
    osVersion: input.run.osVersion,
    appBuildFingerprint: input.run.appBuildFingerprint,
  };
  const key = journalKey(scope);
  const existingRaw = await AsyncStorage.getItem(key);
  const existing = existingRaw === null ? null : parseJournal(existingRaw);
  if (
    (existing === null && input.page.pageStartIndex !== 0) ||
    (existing !== null &&
      existing.nextPageStartIndex !== input.page.pageStartIndex)
  )
    fail();
  const pageBody = {
    pageStartIndex: input.page.pageStartIndex,
    pageItemCount: input.page.pageItemCount,
    nextPageStartIndex: input.page.nextPageStartIndex,
    stableProjectionFingerprint: input.page.stableProjectionFingerprint,
    pageRunFingerprint: input.run.pageRunFingerprint,
    pageCommitFingerprint: input.uploadAck.pageCommitFingerprint,
    pageCommitPin: input.uploadAck.pageCommitPin,
  };
  const pages = Object.freeze([
    ...(existing?.pages ?? []),
    Object.freeze({
      ...pageBody,
      pageFingerprint: hashCanonicalBody(pageBody),
    }),
  ]);
  if (pages.length > LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_MAX_PAGES_V1)
    fail();
  const body = {
    schemaVersion: LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_SCHEMA_V1,
    ...scope,
    completedItemCount: input.page.pageStartIndex + input.page.pageItemCount,
    nextPageStartIndex: input.page.nextPageStartIndex,
    pages,
    orderedPageAggregateFingerprint: hashCanonicalBody(
      pages.map((page) => page.pageFingerprint),
    ),
    persistenceScope: "local_device_qa_resume_only" as const,
    transportUrlRetention: "forbidden" as const,
    progressAuthority: "none" as const,
    repositoryOriginAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const value = Object.freeze({
    ...body,
    journalFingerprint: hashCanonicalBody(body),
  });
  const raw = canonicalJsonV1(value);
  if (
    utf8ByteLengthV1(raw) > LEARNING_V2_VOICE_AUDIO_DEVICE_JOURNAL_MAX_BYTES_V1
  )
    fail();
  await AsyncStorage.setItem(key, raw);
  return value;
}
