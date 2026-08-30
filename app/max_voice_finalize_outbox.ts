import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  MaxVoiceFinalizeDraftV1,
  MaxVoiceFinalizeEnvelopeV1,
  MaxVoiceFinalizeRequestV1,
} from './max_voice_finalize_types';

export const MAX_VOICE_FINALIZE_OUTBOX_TTL_MS = 24 * 60 * 60 * 1_000;
export const MAX_VOICE_FINALIZE_MAX_HISTORY_TURNS = 80;
export const MAX_VOICE_FINALIZE_MAX_TURN_CHARS = 1_000;
export const MAX_VOICE_FINALIZE_MAX_HOMEWORK_ITEMS = 6;
export const MAX_VOICE_FINALIZE_MAX_PAYLOAD_BYTES = 128 * 1024;

const OUTBOX_KEY_PREFIX = 'max_voice_finalize_outbox_v1';
const locks = new Map<string, Promise<void>>();

function storageKey(accountKey: string): string {
  if (!accountKey || Array.from(accountKey).length > 256) {
    throw new Error('max_finalize_account_invalid');
  }
  return `${OUTBOX_KEY_PREFIX}:${encodeURIComponent(accountKey)}`;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function assertFiniteNonNegative(value: unknown, code: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(code);
}

function assertText(value: unknown, code: string, maxChars?: number): asserts value is string {
  if (typeof value !== 'string') throw new Error(code);
  if (maxChars !== undefined && Array.from(value).length > maxChars) throw new Error(code);
}

function assertRequest(request: unknown): asserts request is MaxVoiceFinalizeRequestV1 {
  if (!request || typeof request !== 'object') throw new Error('max_finalize_request_invalid');
  const value = request as Record<string, unknown>;
  if (!Array.isArray(value.history)) throw new Error('max_finalize_history_invalid');
  if (value.history.length > MAX_VOICE_FINALIZE_MAX_HISTORY_TURNS) {
    throw new Error('max_finalize_history_too_large');
  }
  for (const turn of value.history) {
    if (!turn || typeof turn !== 'object') throw new Error('max_finalize_turn_invalid');
    const row = turn as Record<string, unknown>;
    if (row.role !== 'user' && row.role !== 'assistant') throw new Error('max_finalize_turn_invalid');
    assertText(row.text, 'max_finalize_turn_invalid');
    if (Array.from(row.text).length > MAX_VOICE_FINALIZE_MAX_TURN_CHARS) {
      throw new Error('max_finalize_turn_too_large');
    }
  }
  assertFiniteNonNegative(value.durationSec, 'max_finalize_duration_invalid');
  assertFiniteNonNegative(value.speechSec, 'max_finalize_speech_invalid');
  if (!['scenario', 'companion', 'trial', 'tutor'].includes(String(value.format))) {
    throw new Error('max_finalize_format_invalid');
  }
  if (!['A1', 'A2', 'B1', 'B2'].includes(String(value.cefr))) {
    throw new Error('max_finalize_cefr_invalid');
  }
  if (!['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'en'].includes(String(value.interfaceLang))) {
    throw new Error('max_finalize_interface_lang_invalid');
  }
  if (value.studyTarget !== undefined && !['en', 'fr', 'es'].includes(String(value.studyTarget))) {
    throw new Error('max_finalize_study_target_invalid');
  }
  if (!['completed', 'capped', 'dropped', 'background', 'failed'].includes(String(value.endReason))) {
    throw new Error('max_finalize_end_reason_invalid');
  }
  if (value.scenarioId !== undefined) assertText(value.scenarioId, 'max_finalize_scenario_invalid', 256);
  if (value.goalId !== undefined) assertText(value.goalId, 'max_finalize_goal_invalid', 256);
  if (value.sceneOutcome !== undefined && !['done', 'partial', 'skipped'].includes(String(value.sceneOutcome))) {
    throw new Error('max_finalize_scene_outcome_invalid');
  }
  if (value.goalProgress !== undefined) {
    if (!value.goalProgress || typeof value.goalProgress !== 'object') {
      throw new Error('max_finalize_goal_progress_invalid');
    }
    const progress = value.goalProgress as Record<string, unknown>;
    assertText(progress.goalId, 'max_finalize_goal_progress_invalid', 256);
    if (!Number.isInteger(progress.mastery) || Number(progress.mastery) < 0 || Number(progress.mastery) > 3) {
      throw new Error('max_finalize_goal_progress_invalid');
    }
    if (progress.evidence !== undefined && !['scene', 'novel_context'].includes(String(progress.evidence))) {
      throw new Error('max_finalize_goal_progress_invalid');
    }
    if (progress.sceneId !== undefined) assertText(progress.sceneId, 'max_finalize_goal_progress_invalid', 256);
  }
  if (!Array.isArray(value.phraseResults) || value.phraseResults.length > 80) {
    throw new Error('max_finalize_phrase_results_invalid');
  }
  for (const result of value.phraseResults) {
    if (!result || typeof result !== 'object') throw new Error('max_finalize_phrase_result_invalid');
    const row = result as Record<string, unknown>;
    assertText(row.text, 'max_finalize_phrase_result_invalid', MAX_VOICE_FINALIZE_MAX_TURN_CHARS);
    if (!['pass', 'needs_work', 'uncertain', 'invalid'].includes(String(row.result))) {
      throw new Error('max_finalize_phrase_result_invalid');
    }
  }
  if (!value.tutorEvidence || typeof value.tutorEvidence !== 'object') {
    throw new Error('max_finalize_tutor_evidence_invalid');
  }
  const evidence = value.tutorEvidence as Record<string, unknown>;
  if (!Array.isArray(evidence.homeworkItems)) throw new Error('max_finalize_homework_invalid');
  if (evidence.homeworkItems.length > MAX_VOICE_FINALIZE_MAX_HOMEWORK_ITEMS) {
    throw new Error('max_finalize_homework_too_large');
  }
  for (const item of evidence.homeworkItems) {
    if (!item || typeof item !== 'object') throw new Error('max_finalize_homework_invalid');
    const row = item as Record<string, unknown>;
    assertText(row.text, 'max_finalize_homework_invalid', MAX_VOICE_FINALIZE_MAX_TURN_CHARS);
    assertText(row.meaning, 'max_finalize_homework_invalid', MAX_VOICE_FINALIZE_MAX_TURN_CHARS);
  }
  if (evidence.endedByTutor !== undefined && typeof evidence.endedByTutor !== 'boolean') {
    throw new Error('max_finalize_tutor_evidence_invalid');
  }
  if (evidence.nextTopic !== undefined) assertText(evidence.nextTopic, 'max_finalize_next_topic_invalid', 1_000);
  if (evidence.preferredName !== undefined) assertText(evidence.preferredName, 'max_finalize_tutor_evidence_invalid', 60);
  if (evidence.learningGoal !== undefined) assertText(evidence.learningGoal, 'max_finalize_tutor_evidence_invalid', 160);
  if (evidence.languagePreference !== undefined) {
    assertText(evidence.languagePreference, 'max_finalize_language_preference_invalid', 1_000);
  }
  if (!Array.isArray(evidence.safetyFlags) || evidence.safetyFlags.length > 20) {
    throw new Error('max_finalize_safety_flags_invalid');
  }
  for (const flag of evidence.safetyFlags) {
    if (!flag || typeof flag !== 'object') throw new Error('max_finalize_safety_flag_invalid');
    const row = flag as Record<string, unknown>;
    assertText(row.kind, 'max_finalize_safety_flag_invalid', 160);
    assertText(row.note, 'max_finalize_safety_flag_invalid', 1_000);
  }
}

function assertDraft(draft: unknown): asserts draft is MaxVoiceFinalizeDraftV1 {
  if (!draft || typeof draft !== 'object') throw new Error('max_finalize_envelope_invalid');
  const value = draft as Record<string, unknown>;
  if (value.version !== 1) throw new Error('max_finalize_version_invalid');
  assertText(value.sessionId, 'max_finalize_session_invalid', 256);
  if (!value.sessionId || value.sessionId === '__proto__' || value.sessionId === 'constructor') {
    throw new Error('max_finalize_session_invalid');
  }
  assertRequest(value.request);
}

function parseEnvelope(raw: unknown, accountKey: string): MaxVoiceFinalizeEnvelopeV1 | null {
  try {
    assertDraft(raw);
    const value = raw as unknown as MaxVoiceFinalizeEnvelopeV1;
    if (value.accountKey !== accountKey) return null;
    assertFiniteNonNegative(value.createdAtMs, 'max_finalize_created_invalid');
    assertFiniteNonNegative(value.expiresAtMs, 'max_finalize_expiry_invalid');
    assertFiniteNonNegative(value.attempts, 'max_finalize_attempts_invalid');
    assertFiniteNonNegative(value.nextAttemptAtMs, 'max_finalize_attempt_invalid');
    if (!Number.isInteger(value.attempts)) return null;
    if (value.expiresAtMs !== value.createdAtMs + MAX_VOICE_FINALIZE_OUTBOX_TTL_MS) return null;
    if (utf8ByteLength(JSON.stringify(value)) > MAX_VOICE_FINALIZE_MAX_PAYLOAD_BYTES) return null;
    return value;
  } catch {
    return null;
  }
}

async function withStorageLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.catch(() => undefined).then(() => barrier);
  locks.set(key, queued);
  await previous.catch(() => undefined);
  try {
    return await work();
  } finally {
    release();
    if (locks.get(key) === queued) locks.delete(key);
  }
}

function parseMap(raw: string | null, accountKey: string, nowMs: number): Record<string, MaxVoiceFinalizeEnvelopeV1> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const valid: Record<string, MaxVoiceFinalizeEnvelopeV1> = {};
    for (const candidate of Object.values(parsed as Record<string, unknown>)) {
      const envelope = parseEnvelope(candidate, accountKey);
      if (envelope && envelope.expiresAtMs > nowMs) valid[envelope.sessionId] = envelope;
    }
    return valid;
  } catch {
    return {};
  }
}

export async function putMaxFinalizeEnvelope(
  accountKey: string,
  draft: MaxVoiceFinalizeDraftV1,
  nowMs = Date.now(),
): Promise<MaxVoiceFinalizeEnvelopeV1> {
  const key = storageKey(accountKey);
  assertFiniteNonNegative(nowMs, 'max_finalize_created_invalid');
  assertDraft(draft);
  const envelope: MaxVoiceFinalizeEnvelopeV1 = {
    ...draft,
    accountKey,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + MAX_VOICE_FINALIZE_OUTBOX_TTL_MS,
    attempts: 0,
    nextAttemptAtMs: nowMs,
  };
  if (utf8ByteLength(JSON.stringify(envelope)) > MAX_VOICE_FINALIZE_MAX_PAYLOAD_BYTES) {
    throw new Error('max_finalize_payload_too_large');
  }
  await withStorageLock(key, async () => {
    const pending = parseMap(await AsyncStorage.getItem(key), accountKey, nowMs);
    pending[envelope.sessionId] = envelope;
    await AsyncStorage.setItem(key, JSON.stringify(pending));
  });
  return envelope;
}

export async function listPendingMaxFinalize(
  accountKey: string,
  nowMs = Date.now(),
): Promise<MaxVoiceFinalizeEnvelopeV1[]> {
  const key = storageKey(accountKey);
  return withStorageLock(key, async () => {
    const raw = await AsyncStorage.getItem(key);
    const pending = parseMap(raw, accountKey, nowMs);
    const encoded = JSON.stringify(pending);
    if (encoded === '{}') {
      if (raw !== null) await AsyncStorage.removeItem(key);
    } else if (encoded !== raw) {
      await AsyncStorage.setItem(key, encoded);
    }
    return Object.values(pending).sort((a, b) => a.createdAtMs - b.createdAtMs);
  });
}

export async function clearMaxFinalizeOutbox(accountKey: string): Promise<void> {
  const key = storageKey(accountKey);
  await withStorageLock(key, () => AsyncStorage.removeItem(key));
}

export async function removeMaxFinalizeEnvelope(accountKey: string, sessionId: string): Promise<void> {
  const key = storageKey(accountKey);
  await withStorageLock(key, async () => {
    const pending = parseMap(await AsyncStorage.getItem(key), accountKey, Date.now());
    delete pending[sessionId];
    if (Object.keys(pending).length === 0) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(pending));
  });
}

export async function recordMaxFinalizeAttempt(
  accountKey: string,
  sessionId: string,
  nextAttemptAtMs: number,
  nowMs = Date.now(),
): Promise<MaxVoiceFinalizeEnvelopeV1 | null> {
  const key = storageKey(accountKey);
  assertFiniteNonNegative(nextAttemptAtMs, 'max_finalize_attempt_invalid');
  return withStorageLock(key, async () => {
    const pending = parseMap(await AsyncStorage.getItem(key), accountKey, nowMs);
    const current = pending[sessionId];
    if (!current) return null;
    const next: MaxVoiceFinalizeEnvelopeV1 = {
      ...current,
      attempts: current.attempts + 1,
      nextAttemptAtMs,
    };
    pending[sessionId] = next;
    await AsyncStorage.setItem(key, JSON.stringify(pending));
    return next;
  });
}
