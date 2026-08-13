import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { accountScopeKey } from './account_scope_key';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import type {
  CompassEvidence,
  CompassReasonCode,
  CompassRecommendation,
} from './compass_recommendation';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const COMPASS_WHY_NOW_SCHEMA_VERSION = 'compass-why-now.v1' as const;

export type CompassAiReasonCode = Extract<
  CompassReasonCode,
  'trainer_due' | 'continue_started_lesson' | 'weekly_weak_area'
>;

export type CompassAiEvidence = Readonly<{
  ref: string;
  value: number;
}>;

export type CompassAiExplanationEnvelope = Readonly<{
  schemaVersion: typeof COMPASS_WHY_NOW_SCHEMA_VERSION;
  recommendationId: string;
  reasonCode: CompassAiReasonCode;
  reasonParams: Readonly<Record<string, number | string>>;
  evidence: readonly CompassAiEvidence[];
  lang: Lang;
  studyTarget: 'en' | 'fr';
}>;

export type CompassAiExplanationResult =
  | Readonly<{ status: 'ready'; whyNow: string; source: 'provider' | 'cache' }>
  | Readonly<{ status: 'unavailable'; reason: 'not_eligible' | 'identity' | 'network' | 'invalid_response' }>;

type CallableResult = Readonly<{
  ok: true;
  schemaVersion: typeof COMPASS_WHY_NOW_SCHEMA_VERSION;
  whyNow: string;
  evidenceRefs: string[];
  expiresAtMs: number;
  cached?: boolean;
}>;

type StoredExplanation = Readonly<{
  schemaVersion: typeof COMPASS_WHY_NOW_SCHEMA_VERSION;
  accountScope: string;
  inputHash: string;
  whyNow: string;
  expiresAtMs: number;
}>;

export type CompassAiExplanationDependencies = Readonly<{
  storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
  captureGeneration: () => AccountGenerationToken;
  accountScope: (token: AccountGenerationToken) => string | null;
  isCurrentGeneration: (token: AccountGenerationToken, stableId: string | null) => boolean;
  requestCallable: (envelope: CompassAiExplanationEnvelope) => Promise<CallableResult>;
  now: () => number;
}>;

const ALLOWED_EVIDENCE: Record<CompassAiReasonCode, ReadonlySet<string>> = {
  trainer_due: new Set(['trainer:dueWords', 'trainer:duePhrases']),
  continue_started_lesson: new Set(['lesson_progress:correctCells']),
  weekly_weak_area: new Set([
    'weekly_review:mistakes.last7.mistakes',
    'weekly_review:mistakes.last30.mistakes',
    'weekly_review:mistakes.last30.repeatedMistakes',
    'weekly_review:evidenceCount',
  ]),
};

const FORBIDDEN_OUTPUT = [
  /\boverdue\b/i, /personal\s+plan/i, /\blesson\b/i, /\berror\b/i, /\bprogress\b/i,
  /просроч/i, /личн\w*\s+план/i, /урок/i, /ошиб/i, /прогресс/i,
  /простроч/i, /особист\w*\s+план/i, /помил/i,
  /atrasad/i, /vencid/i, /plan\s+personal/i, /lecci[oó]n/i, /progreso/i,
  /plano\s+pessoal/i, /li[cç][aã]o/i, /\baula\b/i, /progresso/i,
  /qu[aá]\s+h[aạ]n/i, /k[eế]\s+ho[aạ]ch\s+c[aá]\s+nh[aâ]n/i, /b[aà]i\s+h[oọ]c/i, /ti[eế]n\s+[dđ][oộ]/i,
  /terlambat/i, /kedaluwarsa/i, /rencana\s+pribadi/i, /pelajaran/i, /kesalahan/i, /progres/i,
  /gecik/i, /ki[sş]isel\s+plan/i, /\bders\b/i, /\bhata\b/i, /ilerleme/i,
  /zaleg/i, /przetermin/i, /plan\s+osobist/i, /lekcj/i, /b[łl][aą]d/i, /post[eę]p/i,
];

function count(value: unknown, max: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(max, Math.floor(numeric)));
}

function reasonCode(value: CompassReasonCode): CompassAiReasonCode | null {
  return value === 'trainer_due' || value === 'continue_started_lesson' || value === 'weekly_weak_area'
    ? value
    : null;
}

function recommendationIdFor(code: CompassAiReasonCode, value: unknown): string | null {
  const id = String(value ?? '').trim();
  if (id.length < 1 || id.length > 100) return null;
  if (code === 'trainer_due') return /^trainer:(?:words|phrases)$/.test(id) ? id : null;
  if (code === 'continue_started_lesson') return /^lesson:(?:[1-9]|[12]\d|3[0-2])$/.test(id) ? id : null;
  return /^diagnosis:[a-z0-9_-]{1,80}$/.test(id) ? id : null;
}

function paramsFor(recommendation: CompassRecommendation, code: CompassAiReasonCode): Record<string, number | string> {
  if (code === 'trainer_due') {
    const queue = recommendation.reason.params.queue === 'words' ? 'words' : 'phrases';
    return {
      queue,
      selectedDue: count(recommendation.reason.params.selectedDue, 500) ?? 0,
      totalDue: count(recommendation.reason.params.totalDue, 1_000) ?? 0,
    };
  }
  if (code === 'continue_started_lesson') {
    return {
      correctCells: count(recommendation.reason.params.correctCells, 44) ?? 0,
      totalCells: 45,
    };
  }
  return { evidenceCount: count(recommendation.reason.params.evidenceCount, 8) ?? 0 };
}

function evidenceFor(code: CompassAiReasonCode, evidence: readonly CompassEvidence[]): CompassAiEvidence[] {
  const allowed = ALLOWED_EVIDENCE[code];
  const seen = new Set<string>();
  const result: CompassAiEvidence[] = [];
  for (const item of evidence) {
    const ref = `${item.source}:${item.key}`;
    if (!allowed.has(ref) || seen.has(ref) || typeof item.value !== 'number' || !Number.isFinite(item.value)) continue;
    seen.add(ref);
    result.push({ ref, value: Math.max(0, Math.min(1_000_000, Math.floor(item.value))) });
  }
  return result.slice(0, 4);
}

export function buildCompassAiExplanationEnvelope(
  recommendation: CompassRecommendation,
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): CompassAiExplanationEnvelope | null {
  const code = reasonCode(recommendation.reason.code);
  if (!code) return null;
  const recommendationId = recommendationIdFor(code, recommendation.recommendationId);
  if (!recommendationId) return null;
  const evidence = evidenceFor(code, recommendation.evidence);
  if (evidence.length === 0) return null;
  return {
    schemaVersion: COMPASS_WHY_NOW_SCHEMA_VERSION,
    recommendationId,
    reasonCode: code,
    reasonParams: paramsFor(recommendation, code),
    evidence,
    lang,
    studyTarget: studyTarget === 'fr' ? 'fr' : 'en',
  };
}

function normalizedSentences(value: unknown, allowedNumbers: ReadonlySet<number> = new Set()): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  const usedNumbers = [...text.matchAll(/\d+/gu)].map((match) => Number(match[0]));
  if (!text || text.length > 220 || usedNumbers.some((number) => !allowedNumbers.has(number)) || FORBIDDEN_OUTPUT.some((pattern) => pattern.test(text))) return null;
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]/g);
  if (!sentences || sentences.join('').replace(/\s+/g, '') !== text.replace(/\s+/g, '') || sentences.length > 2) return null;
  if (sentences.some((sentence) => sentence.replace(/[.!?。！？]+$/g, '').trim().split(/\s+/u).filter(Boolean).length > 10)) return null;
  return text;
}

function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function storageKey(scope: string, inputHash: string): string {
  return `compass_why_now_v1:${encodeURIComponent(scope)}:${inputHash}`;
}

function storedFromRaw(raw: string | null, expected: { accountScope: string; inputHash: string; nowMs: number; allowedNumbers?: ReadonlySet<number> }): StoredExplanation | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredExplanation>;
    const whyNow = normalizedSentences(value.whyNow, expected.allowedNumbers);
    if (
      value.schemaVersion !== COMPASS_WHY_NOW_SCHEMA_VERSION
      || value.accountScope !== expected.accountScope
      || value.inputHash !== expected.inputHash
      || !whyNow
      || !Number.isFinite(value.expiresAtMs)
      || Number(value.expiresAtMs) <= expected.nowMs
    ) return null;
    return { ...value, whyNow } as StoredExplanation;
  } catch {
    return null;
  }
}

async function requestCompassWhyNow(envelope: CompassAiExplanationEnvelope): Promise<CallableResult> {
  const [{ getApp }, { getFunctions, httpsCallable }, { ensureAnonUser }, { initFirebaseAppCheckIfAvailable }] = await Promise.all([
    import('@react-native-firebase/app'),
    import('@react-native-firebase/functions'),
    import('./auth_provider'),
    import('./app_check_init'),
  ]);
  await ensureAnonUser();
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  if (!appCheckReady) throw new Error('compass_why_app_check_unavailable');
  const callable = httpsCallable<CompassAiExplanationEnvelope, CallableResult>(
    getFunctions(getApp(), 'us-central1'),
    'compassExplainWhyNow',
    { timeout: 12_000 },
  );
  return (await callable(envelope)).data;
}

const DEFAULT_DEPS: CompassAiExplanationDependencies = {
  storage: AsyncStorage,
  captureGeneration: captureAccountGeneration,
  accountScope: accountScopeKey,
  isCurrentGeneration: isCurrentAccountGeneration,
  requestCallable: requestCompassWhyNow,
  now: Date.now,
};

const inFlight = new Map<string, Promise<CompassAiExplanationResult>>();

export async function loadCompassAiExplanation(
  input: { recommendation: CompassRecommendation; lang: Lang; studyTarget?: RuntimeStudyTarget },
  deps: CompassAiExplanationDependencies = DEFAULT_DEPS,
): Promise<CompassAiExplanationResult> {
  const envelope = buildCompassAiExplanationEnvelope(input.recommendation, input.lang, input.studyTarget);
  if (!envelope) return { status: 'unavailable', reason: 'not_eligible' };
  const token = deps.captureGeneration();
  const scope = deps.accountScope(token);
  if (!scope || !token.stableId) return { status: 'unavailable', reason: 'identity' };
  const inputHash = stableHash(envelope);
  const key = storageKey(scope, inputHash);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const pending = (async (): Promise<CompassAiExplanationResult> => {
    const allowedNumbers = new Set([
      ...envelope.evidence.map((item) => item.value),
      ...Object.values(envelope.reasonParams).filter((value): value is number => typeof value === 'number'),
    ]);
    const raw = await deps.storage.getItem(key).catch(() => null);
    if (!deps.isCurrentGeneration(token, token.stableId)) return { status: 'unavailable', reason: 'identity' };
    const stored = storedFromRaw(raw, { accountScope: scope, inputHash, nowMs: deps.now(), allowedNumbers });
    if (stored) return { status: 'ready', whyNow: stored.whyNow, source: 'cache' };
    let response: CallableResult;
    try {
      response = await deps.requestCallable(envelope);
    } catch {
      return { status: 'unavailable', reason: 'network' };
    }
    if (!deps.isCurrentGeneration(token, token.stableId)) return { status: 'unavailable', reason: 'identity' };
    const value = response as Partial<CallableResult> | null;
    if (!value || typeof value !== 'object') return { status: 'unavailable', reason: 'invalid_response' };
    const whyNow = normalizedSentences(value.whyNow, allowedNumbers);
    const allowedRefs = new Set(envelope.evidence.map((item) => item.ref));
    if (
      value.ok !== true
      || value.schemaVersion !== COMPASS_WHY_NOW_SCHEMA_VERSION
      || !whyNow
      || !Array.isArray(value.evidenceRefs)
      || value.evidenceRefs.length < 1
      || new Set(value.evidenceRefs).size !== value.evidenceRefs.length
      || value.evidenceRefs.some((ref) => !allowedRefs.has(ref))
      || !Number.isFinite(value.expiresAtMs)
      || Number(value.expiresAtMs) <= deps.now()
    ) return { status: 'unavailable', reason: 'invalid_response' };
    const storedValue: StoredExplanation = {
      schemaVersion: COMPASS_WHY_NOW_SCHEMA_VERSION,
      accountScope: scope,
      inputHash,
      whyNow,
      expiresAtMs: Number(value.expiresAtMs),
    };
    await deps.storage.setItem(key, JSON.stringify(storedValue)).catch(() => undefined);
    if (!deps.isCurrentGeneration(token, token.stableId)) return { status: 'unavailable', reason: 'identity' };
    return { status: 'ready', whyNow, source: value.cached ? 'cache' : 'provider' };
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}

export const __compassAiExplanationTestHooks = {
  normalizedSentences,
  stableHash,
  storedFromRaw,
};

export default function __RouteShim() { return null; }
