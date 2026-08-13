import * as admin from 'firebase-admin';
import { createHash, randomUUID } from 'crypto';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { assertAiJsonTextFieldsLanguage } from './ai_language_contract';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { openAiChat } from './explain/explain_provider';
import { assertJobEnabled, resolveJobConfig } from './openai_jobs_config';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'us-central1';
const SCHEMA_VERSION = 'compass-why-now.v1' as const;
const CACHE_COLLECTION = 'compass_why_cache';
const RATE_COLLECTION = 'compass_why_rate_limits';
const BUDGET_COLLECTION = 'compass_why_daily_budget';
const BILLING_COLLECTION = 'compass_why_billing';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LEASE_TTL_MS = 60 * 1000;
const MAX_PER_HOUR = 12;
const MAX_OUTPUT_TOKENS = 120;

type SupportedLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type ReasonCode = 'trainer_due' | 'continue_started_lesson' | 'weekly_weak_area';
type Evidence = Readonly<{ ref: string; value: number }>;

export type CompassWhyEnvelope = Readonly<{
  schemaVersion: typeof SCHEMA_VERSION;
  recommendationId: string;
  reasonCode: ReasonCode;
  reasonParams: Readonly<Record<string, number | string>>;
  evidence: readonly Evidence[];
  lang: SupportedLang;
  studyTarget: 'en' | 'fr';
}>;

type CompassWhyResult = Readonly<{
  schemaVersion: typeof SCHEMA_VERSION;
  whyNow: string;
  evidenceRefs: readonly string[];
}>;

const SUPPORTED_LANGS = new Set<SupportedLang>(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
const ALLOWED_REFS: Record<ReasonCode, ReadonlySet<string>> = {
  trainer_due: new Set(['trainer:dueWords', 'trainer:duePhrases']),
  continue_started_lesson: new Set(['lesson_progress:correctCells']),
  weekly_weak_area: new Set([
    'weekly_review:mistakes.last7.mistakes',
    'weekly_review:mistakes.last30.mistakes',
    'weekly_review:mistakes.last30.repeatedMistakes',
    'weekly_review:evidenceCount',
  ]),
};

// Product Bible boundary. These concepts are forbidden in every supported UI
// language: the explanation describes only the selected next action and benefit.
const FORBIDDEN_OUTPUT = [
  /\boverdue\b/iu, /personal\s+plan/iu, /\blesson\b/iu, /\berror\b/iu, /\bprogress\b/iu,
  /просроч/iu, /личн\w*\s+план/iu, /урок/iu, /ошиб/iu, /прогресс/iu,
  /простроч/iu, /особист\w*\s+план/iu, /помил/iu,
  /atrasad/iu, /vencid/iu, /plan\s+personal/iu, /lecci[oó]n/iu, /progreso/iu,
  /plano\s+pessoal/iu, /li[cç][aã]o/iu, /\baula\b/iu, /progresso/iu,
  /qu[aá]\s+h[aạ]n/iu, /k[eế]\s+ho[aạ]ch\s+c[aá]\s+nh[aâ]n/iu, /b[aà]i\s+h[oọ]c/iu, /ti[eế]n\s+[dđ][oộ]/iu,
  /terlambat/iu, /kedaluwarsa/iu, /rencana\s+pribadi/iu, /pelajaran/iu, /kesalahan/iu, /progres/iu,
  /gecik/iu, /ki[sş]isel\s+plan/iu, /\bders\b/iu, /\bhata\b/iu, /ilerleme/iu,
  /zaleg/iu, /przetermin/iu, /plan\s+osobist/iu, /lekcj/iu, /b[łl][aą]d/iu, /post[eę]p/iu,
  /\b(?:ai|model|algorithm|confidence|data)\b/iu,
];

const PRINCIPLES: Record<ReasonCode, string> = {
  trainer_due: 'Use spaced retrieval carefully: a short recall check can strengthen later access. Evidence basis: Cepeda et al. 2006, DOI 10.1037/0033-2909.132.3.354; Roediger and Karpicke 2006, DOI 10.1111/j.1467-9280.2006.01693.x. Never imply a deadline.',
  continue_started_lesson: 'Use distributed practice carefully: returning to an already started context can continue practice without claiming a guaranteed outcome. Evidence basis: Cepeda et al. 2006, DOI 10.1037/0033-2909.132.3.354.',
  weekly_weak_area: 'Use retrieval with feedback carefully: repeated aggregate attempts justify focused practice, and feedback can strengthen retrieval benefits. Evidence basis: Roediger and Butler 2011, DOI 10.1016/j.tics.2010.09.003. Never label attempts as errors.',
};

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function boundedInt(value: unknown, max: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(max, Math.floor(numeric)));
}

function requireReason(value: unknown): ReasonCode {
  if (value === 'trainer_due' || value === 'continue_started_lesson' || value === 'weekly_weak_area') return value;
  throw new HttpsError('invalid-argument', 'compass_why_reason_not_allowed');
}

function sanitizeRecommendationId(reasonCode: ReasonCode, value: unknown): string {
  const id = String(value ?? '').trim();
  const allowed = reasonCode === 'trainer_due'
    ? /^trainer:(?:words|phrases)$/.test(id)
    : reasonCode === 'continue_started_lesson'
      ? /^lesson:(?:[1-9]|[12]\d|3[0-2])$/.test(id)
      : /^diagnosis:[a-z0-9_-]{1,80}$/.test(id);
  if (!allowed) throw new HttpsError('invalid-argument', 'compass_why_recommendation_invalid');
  return id;
}

function sanitizeReasonParams(reasonCode: ReasonCode, value: unknown): Record<string, number | string> {
  const raw = object(value);
  if (reasonCode === 'trainer_due') {
    return {
      queue: raw.queue === 'words' ? 'words' : 'phrases',
      selectedDue: boundedInt(raw.selectedDue, 500) ?? 0,
      totalDue: boundedInt(raw.totalDue, 1_000) ?? 0,
    };
  }
  if (reasonCode === 'continue_started_lesson') {
    return { correctCells: boundedInt(raw.correctCells, 44) ?? 0, totalCells: 45 };
  }
  return { evidenceCount: boundedInt(raw.evidenceCount, 8) ?? 0 };
}

export function sanitizeCompassWhyEnvelope(value: unknown): CompassWhyEnvelope {
  const raw = object(value);
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new HttpsError('invalid-argument', 'compass_why_schema_invalid');
  if (!SUPPORTED_LANGS.has(raw.lang as SupportedLang)) throw new HttpsError('invalid-argument', 'compass_why_lang_invalid');
  if (raw.studyTarget !== 'en' && raw.studyTarget !== 'fr') throw new HttpsError('invalid-argument', 'compass_why_target_invalid');
  const reasonCode = requireReason(raw.reasonCode);
  const allowedRefs = ALLOWED_REFS[reasonCode];
  const seen = new Set<string>();
  const evidence: Evidence[] = [];
  for (const entry of Array.isArray(raw.evidence) ? raw.evidence.slice(0, 8) : []) {
    const item = object(entry);
    const ref = String(item.ref ?? '').trim();
    const numeric = boundedInt(item.value, 1_000_000);
    if (!allowedRefs.has(ref) || seen.has(ref) || numeric == null) continue;
    seen.add(ref);
    evidence.push({ ref, value: numeric });
  }
  if (evidence.length < 1 || evidence.length > 4) throw new HttpsError('invalid-argument', 'compass_why_evidence_invalid');
  return {
    schemaVersion: SCHEMA_VERSION,
    recommendationId: sanitizeRecommendationId(reasonCode, raw.recommendationId),
    reasonCode,
    reasonParams: sanitizeReasonParams(reasonCode, raw.reasonParams),
    evidence,
    lang: raw.lang as SupportedLang,
    studyTarget: raw.studyTarget,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildCompassWhyPrompts(envelope: CompassWhyEnvelope): { system: string; user: string } {
  const system = [
    'You write one grounded “why now” explanation for the Phraseman Compass.',
    `Write only in UI language ${envelope.lang}.`,
    'Return strict JSON: {"schemaVersion":"compass-why-now.v1","whyNow":"...","evidenceRefs":["..."]}.',
    'Write one or two sentences. Every sentence has at most ten whitespace-separated words.',
    'Use a warm expert-coach voice, concrete gain framing, and no fake urgency.',
    'Use only supplied aggregates. Do not infer causes, ability, emotions, identity, or goals.',
    'Never mention AI, models, algorithms, confidence, data, technical codes, sources, or missing state.',
    'Never mention overdue, personal plans, lessons, errors, or progress, including translations.',
    'The first sentence observes the grounded opportunity. The second may state a modest benefit.',
    'A number is optional. If used, it must exactly match a supplied aggregate; never calculate or invent one.',
    'evidenceRefs must be a non-empty subset of the supplied refs.',
  ].join('\n');
  const user = canonicalJson({
    reasonCode: envelope.reasonCode,
    approvedPrinciple: PRINCIPLES[envelope.reasonCode],
    aggregates: envelope.evidence,
    reasonParams: envelope.reasonParams,
    studyTarget: envelope.studyTarget,
  });
  return { system, user };
}

function sentenceWordCount(sentence: string): number {
  return sentence.replace(/[.!?。！？]+$/gu, '').trim().split(/\s+/u).filter(Boolean).length;
}

export function parseCompassWhyResult(raw: unknown, envelope: CompassWhyEnvelope): CompassWhyResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = object(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch {
    throw new HttpsError('unavailable', 'compass_why_invalid_json');
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) throw new HttpsError('unavailable', 'compass_why_invalid_schema');
  const whyNow = String(parsed.whyNow ?? '').replace(/\s+/gu, ' ').trim();
  const sentences = whyNow.match(/[^.!?。！？]+[.!?。！？]/gu);
  const allowedNumbers = new Set([
    ...envelope.evidence.map((item) => item.value),
    ...Object.values(envelope.reasonParams).filter((value): value is number => typeof value === 'number'),
  ]);
  const usedNumbers = [...whyNow.matchAll(/\d+/gu)].map((match) => Number(match[0]));
  if (
    !whyNow || whyNow.length > 220
    || usedNumbers.some((value) => !allowedNumbers.has(value))
    || !sentences || sentences.length < 1 || sentences.length > 2
    || sentences.join('').replace(/\s+/gu, '') !== whyNow.replace(/\s+/gu, '')
    || sentences.some((sentence) => sentenceWordCount(sentence) > 10)
    || FORBIDDEN_OUTPUT.some((pattern) => pattern.test(whyNow))
  ) throw new HttpsError('unavailable', 'compass_why_bible_rejected');

  const allowedRefs = new Set(envelope.evidence.map((item) => item.ref));
  const evidenceRefs = Array.isArray(parsed.evidenceRefs)
    ? parsed.evidenceRefs.map((item) => String(item ?? '').trim())
    : [];
  if (
    evidenceRefs.length < 1 || evidenceRefs.length > envelope.evidence.length
    || new Set(evidenceRefs).size !== evidenceRefs.length
    || evidenceRefs.some((ref) => !allowedRefs.has(ref))
  ) throw new HttpsError('unavailable', 'compass_why_refs_rejected');
  assertAiJsonTextFieldsLanguage({ texts: [whyNow], targetLang: envelope.lang, feature: 'compass' });
  return { schemaVersion: SCHEMA_VERSION, whyNow, evidenceRefs };
}

function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

async function enforceRateLimit(db: FirebaseFirestore.Firestore, stableUidHash: string, nowMs: number): Promise<void> {
  const windowMs = 60 * 60 * 1000;
  const ref = db.collection(RATE_COLLECTION).doc(stableUidHash);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const previousStart = Number(snap.data()?.windowStartMs ?? 0);
    const inCurrentWindow = Number.isFinite(previousStart) && previousStart > 0 && nowMs - previousStart < windowMs;
    const windowStartMs = inCurrentWindow ? previousStart : nowMs;
    const count = inCurrentWindow ? (boundedInt(snap.data()?.count, 1_000_000) ?? 0) : 0;
    if (count >= MAX_PER_HOUR) throw new HttpsError('resource-exhausted', 'compass_why_rate_limited');
    tx.set(ref, { count: count + 1, stableUidHash, windowStartMs, updatedAtMs: nowMs }, { merge: true });
  });
}

type BudgetReservation = Readonly<{
  ref: FirebaseFirestore.DocumentReference;
  leaseId: string;
}>;

function activeBudgetReservations(value: unknown, nowMs: number): Record<string, number> {
  const active: Record<string, number> = {};
  for (const [leaseId, timestamp] of Object.entries(object(value))) {
    const reservedAtMs = Number(timestamp);
    if (/^[a-f0-9-]{20,80}$/i.test(leaseId) && Number.isFinite(reservedAtMs) && nowMs - reservedAtMs < LEASE_TTL_MS * 2) {
      active[leaseId] = reservedAtMs;
    }
  }
  return active;
}

async function reserveBudget(
  db: FirebaseFirestore.Firestore,
  cap: number,
  leaseId: string,
  nowMs: number,
): Promise<BudgetReservation> {
  if (!Number.isFinite(cap) || cap < 1) throw new HttpsError('resource-exhausted', 'compass_why_budget_disabled');
  const ref = db.collection(BUDGET_COLLECTION).doc(utcDay(nowMs));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = boundedInt(snap.data()?.used, 10_000_000) ?? 0;
    const reservations = activeBudgetReservations(snap.data()?.reservations, nowMs);
    if (used + Object.keys(reservations).length >= cap) throw new HttpsError('resource-exhausted', 'compass_why_budget_exhausted');
    reservations[leaseId] = nowMs;
    tx.set(ref, { used, reserved: Object.keys(reservations).length, reservations, cap, updatedAtMs: nowMs }, { merge: true });
  });
  return { ref, leaseId };
}

async function settleBudget(
  db: FirebaseFirestore.Firestore,
  reservation: BudgetReservation,
  outcome: 'used' | 'refunded',
  nowMs: number,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reservation.ref);
    const used = boundedInt(snap.data()?.used, 10_000_000) ?? 0;
    const reservations = activeBudgetReservations(snap.data()?.reservations, nowMs);
    const existed = Object.prototype.hasOwnProperty.call(reservations, reservation.leaseId);
    delete reservations[reservation.leaseId];
    tx.set(reservation.ref, {
      used: used + (outcome === 'used' && existed ? 1 : 0),
      reserved: Object.keys(reservations).length,
      reservations,
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

type Lease = Readonly<{ ref: FirebaseFirestore.DocumentReference; leaseId: string }>;

async function readCacheOrAcquireLease(
  db: FirebaseFirestore.Firestore,
  accountHash: string,
  inputHash: string,
  nowMs: number,
): Promise<{ cached: CompassWhyResult; expiresAtMs: number } | Lease> {
  const ref = db.collection(CACHE_COLLECTION).doc(sha(`${accountHash}:${inputHash}`));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    if (data.status === 'ready' && data.inputHash === inputHash && Number(data.expiresAtMs) > nowMs) {
      return {
        cached: {
          schemaVersion: SCHEMA_VERSION,
          whyNow: String(data.whyNow ?? ''),
          evidenceRefs: Array.isArray(data.evidenceRefs) ? data.evidenceRefs.map(String) : [],
        },
        expiresAtMs: Number(data.expiresAtMs),
      };
    }
    if (data.status === 'generating' && Number(data.leaseExpiresAtMs) > nowMs) {
      throw new HttpsError('unavailable', 'compass_why_generation_in_progress');
    }
    const leaseId = randomUUID();
    tx.set(ref, {
      schemaVersion: SCHEMA_VERSION,
      status: 'generating',
      accountHash,
      inputHash,
      leaseId,
      leaseExpiresAtMs: nowMs + LEASE_TTL_MS,
      updatedAtMs: nowMs,
    });
    return { ref, leaseId };
  });
}

async function releaseLease(db: FirebaseFirestore.Firestore, lease: Lease): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(lease.ref);
    if (snap.data()?.leaseId === lease.leaseId && snap.data()?.status === 'generating') tx.delete(lease.ref);
  });
}

type ProviderUsage = Readonly<{
  promptTokens: number;
  completionTokens: number;
}>;

async function finalizePaidResponse(
  db: FirebaseFirestore.Firestore,
  lease: Lease,
  reservation: BudgetReservation,
  inputHash: string,
  result: CompassWhyResult,
  model: string,
  accountHash: string,
  envelope: CompassWhyEnvelope,
  usage: ProviderUsage,
  nowMs: number,
): Promise<number> {
  const expiresAtMs = nowMs + CACHE_TTL_MS;
  await db.runTransaction(async (tx) => {
    const [cacheSnap, budgetSnap] = await Promise.all([
      tx.get(lease.ref),
      tx.get(reservation.ref),
    ]);
    if (cacheSnap.data()?.leaseId !== lease.leaseId || cacheSnap.data()?.status !== 'generating') {
      throw new HttpsError('aborted', 'compass_why_lease_lost');
    }
    const reservations = activeBudgetReservations(budgetSnap.data()?.reservations, nowMs);
    if (!Object.prototype.hasOwnProperty.call(reservations, reservation.leaseId)) {
      throw new HttpsError('aborted', 'compass_why_budget_reservation_lost');
    }
    delete reservations[reservation.leaseId];
    const used = boundedInt(budgetSnap.data()?.used, 10_000_000) ?? 0;
    tx.set(reservation.ref, {
      used: used + 1,
      reserved: Object.keys(reservations).length,
      reservations,
      updatedAtMs: nowMs,
    }, { merge: true });
    tx.set(lease.ref, {
      schemaVersion: SCHEMA_VERSION,
      status: 'ready',
      inputHash,
      whyNow: result.whyNow,
      evidenceRefs: result.evidenceRefs,
      model,
      createdAtMs: nowMs,
      expiresAtMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    const promptTokens = boundedInt(usage.promptTokens, 10_000_000) ?? 0;
    const completionTokens = boundedInt(usage.completionTokens, 10_000_000) ?? 0;
    tx.set(db.collection(BILLING_COLLECTION).doc(lease.leaseId), {
      schemaVersion: SCHEMA_VERSION,
      accountHash,
      inputHash,
      reasonCode: envelope.reasonCode,
      lang: envelope.lang,
      studyTarget: envelope.studyTarget,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      outcome: 'ready',
      createdAtMs: nowMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  return expiresAtMs;
}

async function recordPaidFailure(
  db: FirebaseFirestore.Firestore,
  lease: Lease,
  reservation: BudgetReservation,
  inputHash: string,
  accountHash: string,
  envelope: CompassWhyEnvelope,
  model: string,
  usage: ProviderUsage,
  nowMs: number,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const [cacheSnap, budgetSnap] = await Promise.all([
      tx.get(lease.ref),
      tx.get(reservation.ref),
    ]);
    if (cacheSnap.data()?.leaseId !== lease.leaseId || cacheSnap.data()?.status !== 'generating') return;
    const reservations = activeBudgetReservations(budgetSnap.data()?.reservations, nowMs);
    if (!Object.prototype.hasOwnProperty.call(reservations, reservation.leaseId)) return;
    delete reservations[reservation.leaseId];
    const used = boundedInt(budgetSnap.data()?.used, 10_000_000) ?? 0;
    tx.set(reservation.ref, {
      used: used + 1,
      reserved: Object.keys(reservations).length,
      reservations,
      updatedAtMs: nowMs,
    }, { merge: true });
    tx.delete(lease.ref);
    const promptTokens = boundedInt(usage.promptTokens, 10_000_000) ?? 0;
    const completionTokens = boundedInt(usage.completionTokens, 10_000_000) ?? 0;
    tx.set(db.collection(BILLING_COLLECTION).doc(lease.leaseId), {
      schemaVersion: SCHEMA_VERSION,
      accountHash,
      inputHash,
      reasonCode: envelope.reasonCode,
      lang: envelope.lang,
      studyTarget: envelope.studyTarget,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      outcome: 'provider_output_rejected',
      createdAtMs: nowMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

export const compassExplainWhyNow = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const envelope = sanitizeCompassWhyEnvelope(request.data);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid);
  const accountHash = sha(stableUid).slice(0, 48);
  const inputHash = sha(canonicalJson(envelope));
  const nowMs = Date.now();
  const cacheOrLease = await readCacheOrAcquireLease(db, accountHash, inputHash, nowMs);
  if ('cached' in cacheOrLease) {
    const validated = parseCompassWhyResult(cacheOrLease.cached, envelope);
    return { ok: true, ...validated, expiresAtMs: cacheOrLease.expiresAtMs, cached: true };
  }

  const lease = cacheOrLease;
  let budgetReservation: BudgetReservation | null = null;
  let paidResponse = false;
  let paidUsage: ProviderUsage | null = null;
  let paidModel = '';
  try {
    await enforceRateLimit(db, accountHash, nowMs);
    const job = await resolveJobConfig(db, 'compass');
    assertJobEnabled(job, 'compass');
    budgetReservation = await reserveBudget(db, job.globalDailyCap, lease.leaseId, nowMs);
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');
    const prompts = buildCompassWhyPrompts(envelope);
    const response = await openAiChat({
      apiKey,
      model: job.model,
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
      maxTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.35,
      responseFormat: { type: 'json_object' },
      maxAttempts: 1,
    });
    paidResponse = true;
    paidModel = job.model;
    paidUsage = { promptTokens: response.promptTokens, completionTokens: response.completionTokens };
    const result = parseCompassWhyResult(response.text, envelope);
    const expiresAtMs = await finalizePaidResponse(
      db,
      lease,
      budgetReservation,
      inputHash,
      result,
      job.model,
      accountHash,
      envelope,
      { promptTokens: response.promptTokens, completionTokens: response.completionTokens },
      Date.now(),
    );
    budgetReservation = null;
    return { ok: true, ...result, expiresAtMs, cached: false };
  } catch (error) {
    if (budgetReservation) {
      if (paidResponse && paidUsage) {
        await recordPaidFailure(db, lease, budgetReservation, inputHash, accountHash, envelope, paidModel, paidUsage, Date.now()).catch(() => undefined);
      } else {
        await settleBudget(db, budgetReservation, 'refunded', Date.now()).catch(() => undefined);
      }
    }
    await releaseLease(db, lease).catch(() => undefined);
    if (error instanceof HttpsError) throw error;
    console.error('compass why-now failed', error);
    throw new HttpsError('unavailable', 'compass_why_unavailable');
  }
});

export const __compassWhyTestHooks = {
  activeBudgetReservations,
  canonicalJson,
  sentenceWordCount,
  forbiddenOutput: FORBIDDEN_OUTPUT,
};
