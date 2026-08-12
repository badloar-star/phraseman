import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from '../../../modules/learning-v2/content/generator_course_contract';
import {
  validateLearningV2GeneratedSessionShardV1,
  type LearningV2GeneratedSessionShardV1,
} from '../../../modules/learning-v2/content/generator_session_shard';
import {
  parseLearningV2LocalizedCourseShardCheckpoint,
  parseLearningV2LocalizedSessionShardReceipt,
  type LearningV2LocalizedCourseShardCheckpointExpected,
} from './learning_v2_course_shard_checkpoint';

const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const MAX_SHARD_BYTES = 512 * 1024;
const SESSIONS_PER_EPISODE = 12;

export type LearningV2CourseWavePreviewRequest = Readonly<{
  stageId: string;
  episodeOrdinal: number;
  sessionOrdinal: number;
}>;

export type LearningV2CourseWavePreviewSessionSummary = Readonly<{
  taskOrdinal: number;
  episodeOrdinal: number;
  sessionOrdinal: number;
  sessionId: string;
  zone: LearningV2GeneratedSessionShardV1['zone'];
  support: LearningV2GeneratedSessionShardV1['support'];
  canDoOutcomeId: string;
  titleByLocale: LearningV2Localized<string>;
  learningGoalByLocale: LearningV2Localized<string>;
  cardFamilies: readonly string[];
  targetTexts: readonly string[];
}>;

export type LearningV2CourseWavePreview = Readonly<{
  schemaVersion: 'learning-v2-course-wave-preview.v1';
  stageId: string;
  waveId: 'e1' | 'chapter_1' | 'season';
  checkpointFingerprint: string;
  completedTaskCount: number;
  firstEpisodeOrdinal: 1;
  lastEpisodeOrdinal: number;
  episodeOrdinal: number;
  selectedSessionOrdinal: number;
  sessions: readonly LearningV2CourseWavePreviewSessionSummary[];
  selectedSession: LearningV2GeneratedSessionShardV1;
}>;

export interface LearningV2CourseWavePreviewFileLike {
  getMetadata(): Promise<unknown>;
  download(options?: Record<string, unknown>): Promise<[Buffer]>;
}

export interface LearningV2CourseWavePreviewBucketLike {
  file(path: string): LearningV2CourseWavePreviewFileLike;
}

export function parseLearningV2CourseWavePreviewRequest(data: unknown): LearningV2CourseWavePreviewRequest {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.getPrototypeOf(data) !== Object.prototype) {
    throw new HttpsError('invalid-argument', 'learning_v2_course_wave_preview_invalid');
  }
  const input = data as Record<string, unknown>;
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 3 || keys.some((key) => typeof key !== 'string' || !['stageId', 'episodeOrdinal', 'sessionOrdinal'].includes(key))) {
    throw new HttpsError('invalid-argument', 'learning_v2_course_wave_preview_invalid');
  }
  for (const key of ['stageId', 'episodeOrdinal', 'sessionOrdinal']) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new HttpsError('invalid-argument', 'learning_v2_course_wave_preview_invalid');
  }
  const stageId = input.stageId;
  const episodeOrdinal = input.episodeOrdinal;
  const sessionOrdinal = input.sessionOrdinal;
  if (typeof stageId !== 'string' || !STAGE_ID_RE.test(stageId) || !Number.isSafeInteger(episodeOrdinal) || Number(episodeOrdinal) < 1 || Number(episodeOrdinal) > 32 ||
      !Number.isSafeInteger(sessionOrdinal) || Number(sessionOrdinal) < 1 || Number(sessionOrdinal) > SESSIONS_PER_EPISODE) {
    throw new HttpsError('invalid-argument', 'learning_v2_course_wave_preview_invalid');
  }
  return Object.freeze({ stageId, episodeOrdinal: Number(episodeOrdinal), sessionOrdinal: Number(sessionOrdinal) });
}

export function learningV2CourseWaveLastEpisode(waveId: 'e1' | 'chapter_1' | 'season'): number {
  if (waveId === 'e1') return 1;
  if (waveId === 'chapter_1') return 8;
  return 32;
}

function metadataRecord(value: unknown): Readonly<Record<string, unknown>> {
  const metadata = Array.isArray(value) ? value[0] : value;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('learning_v2_course_wave_preview_metadata_invalid');
  return metadata as Record<string, unknown>;
}

function metadataContentHash(metadata: Readonly<Record<string, unknown>>): string {
  const custom = metadata.metadata;
  return custom && typeof custom === 'object' && !Array.isArray(custom)
    ? String((custom as Record<string, unknown>).contentHash ?? '').trim()
    : '';
}

async function loadVerifiedShard(input: Readonly<{
  bucket: LearningV2CourseWavePreviewBucketLike;
  receipt: ReturnType<typeof parseLearningV2LocalizedSessionShardReceipt>;
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  targetLanguage: string;
}>): Promise<LearningV2GeneratedSessionShardV1> {
  const file = input.bucket.file(input.receipt.object.objectPath);
  const metadata = metadataRecord(await file.getMetadata());
  if (String(metadata.generation ?? '') !== input.receipt.object.objectGeneration ||
      metadataContentHash(metadata) !== input.receipt.object.contentHash) {
    throw new Error('learning_v2_course_wave_preview_object_identity_mismatch');
  }
  const [bytes] = await file.download({ validation: false });
  if (!Buffer.isBuffer(bytes) || bytes.byteLength < 1 || bytes.byteLength > MAX_SHARD_BYTES || bytes.byteLength !== input.receipt.object.byteSize ||
      createHash('sha256').update(bytes).digest('hex') !== input.receipt.object.contentHash) {
    throw new Error('learning_v2_course_wave_preview_object_bytes_mismatch');
  }
  let decoded: unknown;
  try { decoded = JSON.parse(bytes.toString('utf8')) as unknown; } catch { throw new Error('learning_v2_course_wave_preview_object_json_invalid'); }
  return validateLearningV2GeneratedSessionShardV1(decoded, {
    packageId: input.expected.plan.packageId,
    targetLanguage: input.targetLanguage,
    episodeOrdinal: input.receipt.episodeOrdinal,
    requiredSessionOrdinal: input.receipt.sessionOrdinal,
    generationInputFingerprint: input.receipt.generationInputFingerprint,
  });
}

function summarizeSession(shard: LearningV2GeneratedSessionShardV1, taskOrdinal: number): LearningV2CourseWavePreviewSessionSummary {
  return Object.freeze({
    taskOrdinal,
    episodeOrdinal: shard.episodeOrdinal,
    sessionOrdinal: shard.requiredSessionOrdinal,
    sessionId: shard.sessionId,
    zone: shard.zone,
    support: shard.support,
    canDoOutcomeId: shard.canDoOutcomeId,
    titleByLocale: shard.intro.titleByLocale,
    learningGoalByLocale: shard.intro.learningGoalByLocale,
    cardFamilies: Object.freeze(shard.cards.map((card) => card.family)),
    targetTexts: Object.freeze(shard.cards.map((card) => card.contentItem.target.text)),
  });
}

export async function loadLearningV2CourseWavePreview(input: Readonly<{
  stageId: string;
  targetLanguage: string;
  waveId: 'e1' | 'chapter_1' | 'season';
  episodeOrdinal: number;
  selectedSessionOrdinal: number;
  checkpoint: unknown;
  expected: LearningV2LocalizedCourseShardCheckpointExpected;
  receipts: readonly unknown[];
  bucket: LearningV2CourseWavePreviewBucketLike;
}>): Promise<LearningV2CourseWavePreview> {
  const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(input.checkpoint, input.expected);
  const lastEpisodeOrdinal = learningV2CourseWaveLastEpisode(input.waveId);
  if (input.stageId !== input.expected.stageId || input.episodeOrdinal < 1 || input.episodeOrdinal > lastEpisodeOrdinal ||
      input.selectedSessionOrdinal < 1 || input.selectedSessionOrdinal > SESSIONS_PER_EPISODE || input.receipts.length !== SESSIONS_PER_EPISODE ||
      checkpoint.completedTaskCount < lastEpisodeOrdinal * SESSIONS_PER_EPISODE ||
      !checkpoint.waveApprovals.every((approval) => approval.completedTaskCount <= checkpoint.completedTaskCount)) {
    throw new Error('learning_v2_course_wave_preview_scope_invalid');
  }
  const sessions: LearningV2CourseWavePreviewSessionSummary[] = [];
  let selectedSession: LearningV2GeneratedSessionShardV1 | null = null;
  for (let offset = 0; offset < SESSIONS_PER_EPISODE; offset += 1) {
    const taskOrdinal = (input.episodeOrdinal - 1) * SESSIONS_PER_EPISODE + offset + 1;
    const receipt = parseLearningV2LocalizedSessionShardReceipt(input.receipts[offset], input.expected);
    if (receipt.taskOrdinal !== taskOrdinal) throw new Error('learning_v2_course_wave_preview_receipt_order_invalid');
    const shard = await loadVerifiedShard({ bucket: input.bucket, receipt, expected: input.expected, targetLanguage: input.targetLanguage });
    sessions.push(summarizeSession(shard, taskOrdinal));
    if (receipt.sessionOrdinal === input.selectedSessionOrdinal) selectedSession = shard;
  }
  if (!selectedSession) throw new Error('learning_v2_course_wave_preview_selected_session_missing');
  // Locale tuples are fixed by the shard validator. Touch the authority here so
  // a future preview refactor cannot silently narrow the owner review to one UI locale.
  if (LEARNING_V2_INTERFACE_LOCALES.some((locale) => !selectedSession!.intro.titleByLocale[locale])) {
    throw new Error('learning_v2_course_wave_preview_locales_incomplete');
  }
  return Object.freeze({
    schemaVersion: 'learning-v2-course-wave-preview.v1' as const,
    stageId: input.stageId,
    waveId: input.waveId,
    checkpointFingerprint: checkpoint.checkpointFingerprint,
    completedTaskCount: checkpoint.completedTaskCount,
    firstEpisodeOrdinal: 1 as const,
    lastEpisodeOrdinal,
    episodeOrdinal: input.episodeOrdinal,
    selectedSessionOrdinal: input.selectedSessionOrdinal,
    sessions: Object.freeze(sessions),
    selectedSession,
  });
}
