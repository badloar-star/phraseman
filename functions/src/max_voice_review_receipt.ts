import type { MaxVoiceStudyTarget } from './max_voice_target_language';

export type MaxVoiceReceiptEndReason = 'completed' | 'capped' | 'dropped' | 'background' | 'failed';

export interface MaxVoiceReviewReceiptV1 {
  readonly schemaVersion: 'max-voice-review.v1';
  readonly sessionId: string;
  readonly stableUid: string;
  /** Optional for receipts committed by older production versions. */
  readonly studyTarget?: MaxVoiceStudyTarget;
  readonly completedAtMs: number;
  readonly durationSec: number;
  readonly speechSec?: number;
  readonly endReason: MaxVoiceReceiptEndReason;
  readonly status: 'ready' | 'limited';
  readonly worked: readonly string[];
  readonly correction: {
    readonly said: string;
    readonly target: string;
    readonly explanation: string;
  } | null;
  readonly tomorrowActions: readonly [string] | readonly [string, string] | readonly [string, string, string];
  readonly targetPhrase: string | null;
  readonly nextTopic: string | null;
  readonly goal: {
    readonly id: string;
    readonly masteryBefore: 0 | 1 | 2 | 3;
    readonly masteryAfter: 0 | 1 | 2 | 3;
  } | null;
  readonly phraseEvidence: readonly {
    readonly phraseId: string;
    readonly result: 'pass' | 'retry' | 'uncertain';
  }[];
}

export interface MaxVoiceReviewMemoryProjection {
  readonly facts: readonly string[];
  readonly recurringErrors: readonly string[];
  readonly resolvedErrors: readonly string[];
}

const MAX_TEXT_CHARS = 240;
const UNSUPPORTED_SPEECH_CLAIM = /\b(pronunciation|accent|phoneme|fluency\s*score|audio\s*quality|произнош|акцент|фонем|вимов|вимова|pronunciaci[oó]n|pronúncia|phát âm|pelafalan|telaffuz|wymow)\b/iu;

function text(value: unknown): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.trim()).slice(0, MAX_TEXT_CHARS).join('');
}

function safeText(value: unknown): string {
  const cleaned = text(value);
  return cleaned && !UNSUPPORTED_SPEECH_CLAIM.test(cleaned) ? cleaned : '';
}

function list(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const cleaned = safeText(item);
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= max) break;
  }
  return out;
}

function asActions(value: string[]): MaxVoiceReviewReceiptV1['tomorrowActions'] {
  if (value.length >= 3) return [value[0], value[1], value[2]];
  if (value.length === 2) return [value[0], value[1]];
  return [value[0]];
}

export function sanitizeMaxVoiceMemoryProjection(raw: unknown): MaxVoiceReviewMemoryProjection {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    facts: list(value.facts, 6),
    recurringErrors: list(value.recurringErrors, 5),
    resolvedErrors: list(value.resolvedErrors, 5),
  };
}

export function sanitizeMaxVoiceReviewReceipt(args: {
  sessionId: string;
  stableUid: string;
  completedAtMs: number;
  durationSec: number;
  speechSec?: number;
  endReason: MaxVoiceReceiptEndReason;
  studyTarget?: MaxVoiceStudyTarget;
  projection: unknown;
  fallbackAction: string;
  fallbackTargetPhrase?: string;
  fallbackNextTopic?: string;
  goal?: MaxVoiceReviewReceiptV1['goal'];
  phraseEvidence?: MaxVoiceReviewReceiptV1['phraseEvidence'];
}): MaxVoiceReviewReceiptV1 {
  const projection = args.projection && typeof args.projection === 'object'
    ? args.projection as Record<string, unknown>
    : {};
  const worked = list(projection.worked, 3);
  const correctionRaw = projection.correction && typeof projection.correction === 'object'
    ? projection.correction as Record<string, unknown>
    : null;
  const said = safeText(correctionRaw?.said);
  const target = safeText(correctionRaw?.target);
  const explanation = safeText(correctionRaw?.explanation);
  const correction = said && target && explanation ? { said, target, explanation } : null;
  const targetPhrase = safeText(projection.targetPhrase) || safeText(args.fallbackTargetPhrase) || null;
  const nextTopic = safeText(projection.nextTopic) || safeText(args.fallbackNextTopic) || null;
  const actions = list(projection.tomorrowActions, 3);
  if (actions.length === 0 && targetPhrase) actions.push(targetPhrase);
  if (actions.length === 0 && nextTopic) actions.push(nextTopic);
  if (actions.length === 0) actions.push(safeText(args.fallbackAction) || 'Review one useful phrase.');
  const useful = worked.length > 0 || correction !== null || Boolean(targetPhrase) || Boolean(nextTopic);
  const studyTarget = args.studyTarget === 'fr' || args.studyTarget === 'es' || args.studyTarget === 'en'
    ? args.studyTarget
    : undefined;
  return {
    schemaVersion: 'max-voice-review.v1',
    sessionId: text(args.sessionId),
    stableUid: text(args.stableUid),
    ...(studyTarget ? { studyTarget } : {}),
    completedAtMs: Math.max(0, Math.floor(args.completedAtMs)),
    durationSec: Math.max(0, Math.floor(args.durationSec)),
    ...(typeof args.speechSec === 'number' && Number.isFinite(args.speechSec)
      ? { speechSec: Math.max(0, Math.floor(args.speechSec)) }
      : {}),
    endReason: args.endReason,
    status: useful ? 'ready' : 'limited',
    worked,
    correction,
    tomorrowActions: asActions(actions),
    targetPhrase,
    nextTopic,
    goal: args.goal ?? null,
    phraseEvidence: (args.phraseEvidence ?? []).slice(0, 20),
  };
}

export function isMaxVoiceReviewReceiptV1(value: unknown): value is MaxVoiceReviewReceiptV1 {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.schemaVersion === 'max-voice-review.v1'
    && typeof row.sessionId === 'string'
    && typeof row.stableUid === 'string'
    && (row.studyTarget === undefined || row.studyTarget === 'en' || row.studyTarget === 'fr' || row.studyTarget === 'es')
    && (row.status === 'ready' || row.status === 'limited')
    && Array.isArray(row.worked)
    && Array.isArray(row.tomorrowActions)
    && row.tomorrowActions.length >= 1
    && row.tomorrowActions.length <= 3
    && Array.isArray(row.phraseEvidence);
}
