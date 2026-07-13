import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash, randomUUID } from 'crypto';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';
import { assertAiJsonTextFieldsLanguage } from './ai_language_contract';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * Stats insights — per-block AI micro-notes for the stats/Пульс screen.
 *
 * ONE call returns a short, warm note for EACH stats card (balance, rhythm,
 * year, percentiles, lifetime). The client shows each note under its card.
 * This avoids N calls per screen open: one generation → 5 personalized lines,
 * cached client-side, gated by a SERVER window so it regenerates at most once
 * every few days.
 *
 * Generation is LAZY and premium-only: the client only calls this when the
 * stats screen is opened, premium is active, and the cached note is stale.
 * A user who does not open the screen costs nothing — there is no cron, no
 * background fan-out. This is the cheapest possible model.
 *
 * The AI does NOT see raw logs. The client sends ALREADY-COMPUTED numbers
 * (a briefing). The model only describes those numbers; it never invents
 * facts and never recommends a lesson it was not handed.
 *
 * Pattern mirrors weekly_review.ts (key via secret/env, auth.uid as identity,
 * read-only window check before the paid call, commit after success).
 *
 * NOT in deploy:safe whitelist on purpose (spends OpenAI). Deploy point-to-point:
 *   firebase deploy --only functions:statsInsightsGenerate
 */

const REGION = 'us-central1';
const RATE_COLLECTION = 'stats_insights_rate_limits';
const QUOTA_COLLECTION = 'stats_insights_quotas';
const BILLING_COLLECTION = 'stats_insights_billing';
const GLOBAL_BUDGET_COLLECTION = 'stats_insights_global_budget';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 6;

// One generation per window. Premium regenerates every 3 days. Free never calls
// (premium-only feature) but a window is kept defensively. SERVER is source of
// truth — the client gate is bypassable.
const PREMIUM_WINDOW_DAYS = 3;
const FREE_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// Product-wide daily breaker — protects the wallet from a spike. The feature
// touches every premium user, so a global cap is worth keeping.
const GLOBAL_DAILY_CAP = 5000;

const MAX_OUTPUT_TOKENS = 600;
// Notes are 1-2 short sentences (Bible: ≤10 words/sentence). 400 allowed wordy paragraphs;
// 160 keeps them tight for the 50+ audience without cutting a normal two-sentence note.
const MAX_NOTE_CHARS = 160;

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4o-mini';

type SupportedLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
const SUPPORTED_LANGS: SupportedLang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

// The five stats cards we write notes for. Keep in sync with the client.
const BLOCK_KEYS = ['balance', 'rhythm', 'year', 'percentiles', 'lifetime'] as const;
type BlockKey = (typeof BLOCK_KEYS)[number];
const VERIFIED_BLOCK_KEYS = ['week', 'longTerm', 'comparison', 'lifetime'] as const;
type VerifiedBlockKey = (typeof VERIFIED_BLOCK_KEYS)[number];
const VERIFIED_SCHEMA_VERSION = 2;
const LEGACY_SCHEMA_VERSION = 1;
const GENERATION_LEASE_MS = 2 * 60 * 1000;

interface VerifiedObservation {
  id: string;
  block: VerifiedBlockKey;
  priority: number;
  facts: Array<string | number>;
  allowedClaim: string;
  allowedAction: string | null;
}

interface VerifiedAnalysis {
  fingerprint: string;
  generatedFromCompleteSnapshot: true;
  blocks: Record<VerifiedBlockKey, VerifiedObservation>;
}
interface VerifiedRequest {
  analysis: VerifiedAnalysis;
  lang: SupportedLang;
  studyTarget: 'en' | 'fr';
}

type VerifiedNotes = Record<VerifiedBlockKey, string>;
type VerifiedObservationIds = Record<VerifiedBlockKey, string>;
interface VerifiedResult { notes: VerifiedNotes; observationIds: VerifiedObservationIds }

// ── Briefing shape (mirrors app/stats_insights_briefing.ts) ──────────────────

interface StatsInsightsBriefing {
  lang: SupportedLang;
  studyTarget: 'en' | 'fr';
  balance: {
    score: number;          // 0..100 (0 in warmup)
    isWarmup: boolean;
    active7: number;        // active days in last 7
    avgMinutes: number;     // avg minutes per active day
  };
  rhythm: {
    active7: number;
    xp7: number;
    minutes7: number;
    bestDay: string;        // localized short weekday or ''
  };
  year: {
    activeDays: number;     // active days in last 365
    currentStreak: number;
    longestStreak: number;
    bestMonth: string;      // localized month name or ''
    goalPct: number;        // 0..100 toward yearly goal
  };
  percentiles: {
    totalXp: number | null;       // % of users beaten, or null if hidden
    week: number | null;
    daily7: number | null;
  };
  lifetime: {
    words: number;
    phrases: number;
    quizzes: number;
    arenaWins: number;
    daysActive: number;
  };
  // Optional weak-spot hint from mistake analytics — lets the AI name a topic
  // to pull up. Empty when there is not enough data.
  weakCategories: Array<{ label: string; pct: number }>;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function clampPercentOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function asLang(value: unknown): SupportedLang {
  const v = text(value, 5) as SupportedLang;
  return SUPPORTED_LANGS.includes(v) ? v : 'ru';
}

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

function briefingHashForReplay(briefing: StatsInsightsBriefing): string {
  return createHash('sha256').update(JSON.stringify(briefing)).digest('hex');
}

function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Sanitizes the untrusted client briefing into a known-good, length-bounded
 * shape so a hostile client cannot blow up the prompt.
 */
function sanitizeBriefing(raw: unknown): StatsInsightsBriefing {
  const data = (raw ?? {}) as Record<string, unknown>;
  const obj = (v: unknown): Record<string, unknown> => (v ?? {}) as Record<string, unknown>;
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

  const b = obj(data.balance);
  const r = obj(data.rhythm);
  const y = obj(data.year);
  const p = obj(data.percentiles);
  const l = obj(data.lifetime);

  const weakCategories = arr(data.weakCategories).slice(0, 3).map((item) => {
    const c = obj(item);
    return { label: text(c.label, 80), pct: clampInt(c.pct, 0, 100) };
  }).filter((c) => c.label);

  return {
    lang: asLang(data.lang),
    studyTarget: data.studyTarget === 'fr' ? 'fr' : 'en',
    balance: {
      score: clampInt(b.score, 0, 100),
      isWarmup: b.isWarmup === true,
      active7: clampInt(b.active7, 0, 7),
      avgMinutes: clampInt(b.avgMinutes, 0, 100000),
    },
    rhythm: {
      active7: clampInt(r.active7, 0, 7),
      xp7: clampInt(r.xp7, 0, 100000000),
      minutes7: clampInt(r.minutes7, 0, 1000000),
      bestDay: text(r.bestDay, 24),
    },
    year: {
      activeDays: clampInt(y.activeDays, 0, 366),
      currentStreak: clampInt(y.currentStreak, 0, 100000),
      longestStreak: clampInt(y.longestStreak, 0, 100000),
      bestMonth: text(y.bestMonth, 24),
      goalPct: clampInt(y.goalPct, 0, 100),
    },
    percentiles: {
      totalXp: clampPercentOrNull(p.totalXp),
      week: clampPercentOrNull(p.week),
      daily7: clampPercentOrNull(p.daily7),
    },
    lifetime: {
      words: clampInt(l.words, 0, 100000000),
      phrases: clampInt(l.phrases, 0, 100000000),
      quizzes: clampInt(l.quizzes, 0, 100000000),
      arenaWins: clampInt(l.arenaWins, 0, 100000000),
      daysActive: clampInt(l.daysActive, 0, 100000),
    },
    weakCategories,
  };
}

function invalidAnalysis(): never {
  throw new HttpsError('failed-precondition', 'stats_insights_invalid_analysis');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === [...expected].sort()[index]);
}

function requiredBoundedString(value: unknown, max: number): string {
  if (typeof value !== 'string') invalidAnalysis();
  const clean = value.trim();
  if (!clean || clean.length > max) invalidAnalysis();
  return clean;
}

function sanitizeVerifiedAnalysis(raw: unknown): VerifiedAnalysis {
  if (!isPlainRecord(raw) || !hasExactKeys(raw, ['fingerprint', 'generatedFromCompleteSnapshot', 'blocks'])) invalidAnalysis();
  if (raw.generatedFromCompleteSnapshot !== true || !isPlainRecord(raw.blocks) || !hasExactKeys(raw.blocks, VERIFIED_BLOCK_KEYS)) invalidAnalysis();
  const blocks = {} as Record<VerifiedBlockKey, VerifiedObservation>;
  const observationIds = new Set<string>();
  const normalizedClaims = new Set<string>();
  for (const key of VERIFIED_BLOCK_KEYS) {
    const value = raw.blocks[key];
    if (!isPlainRecord(value) || !hasExactKeys(value, ['id', 'block', 'priority', 'facts', 'allowedClaim', 'allowedAction', 'fallback'])) invalidAnalysis();
    if (value.block !== key || !Number.isSafeInteger(value.priority) || Number(value.priority) < -10000 || Number(value.priority) > 10000) invalidAnalysis();
    if (!Array.isArray(value.facts) || value.facts.length > 12) invalidAnalysis();
    const facts = value.facts.map((fact) => {
      if (typeof fact === 'number') {
        if (!Number.isFinite(fact) || Math.abs(fact) > 1_000_000_000) invalidAnalysis();
        return fact;
      }
      return requiredBoundedString(fact, 160);
    });
    let allowedAction: string | null = null;
    if (value.allowedAction !== null) allowedAction = requiredBoundedString(value.allowedAction, 500);
    const id = requiredBoundedString(value.id, 128);
    const allowedClaim = requiredBoundedString(value.allowedClaim, 1000);
    const normalizedClaim = allowedClaim.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (!id.startsWith(`${key}.`) || observationIds.has(id) || !normalizedClaim || normalizedClaims.has(normalizedClaim)) invalidAnalysis();
    observationIds.add(id);
    normalizedClaims.add(normalizedClaim);
    blocks[key] = {
      id,
      block: key,
      priority: Number(value.priority),
      facts,
      allowedClaim,
      allowedAction,
    };
  }
  return {
    fingerprint: requiredBoundedString(raw.fingerprint, 128),
    generatedFromCompleteSnapshot: true,
    blocks,
  };
}

function sanitizeVerifiedRequest(raw: unknown): VerifiedRequest {
  if (!isPlainRecord(raw) || !hasExactKeys(raw, ['analysis', 'lang', 'studyTarget'])) invalidAnalysis();
  if (typeof raw.lang !== 'string' || !SUPPORTED_LANGS.includes(raw.lang as SupportedLang)) invalidAnalysis();
  if (raw.studyTarget !== 'en' && raw.studyTarget !== 'fr') invalidAnalysis();
  return {
    analysis: sanitizeVerifiedAnalysis(raw.analysis),
    lang: raw.lang as SupportedLang,
    studyTarget: raw.studyTarget,
  };
}

function verifiedAnalysisHashForReplay(analysis: VerifiedAnalysis): string {
  return createHash('sha256').update(JSON.stringify(analysis)).digest('hex');
}

/**
 * The screen has barely any signal until there is at least a little activity.
 * Below this threshold we refuse to spend an API call — the static warmup copy
 * already covers the empty state.
 */
function hasEnoughSignal(b: StatsInsightsBriefing): boolean {
  return b.lifetime.daysActive >= 2 || b.rhythm.active7 >= 2 || b.lifetime.words >= 3;
}

function startOfNextWindow(nowMs: number, windowDays: number): number {
  return nowMs + windowDays * DAY_MS;
}

async function enforceRateLimit(authUid: string, stableUid: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(RATE_COLLECTION).doc(docId('sir', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const windowStartMs = Number(data.windowStartMs ?? 0);
    const count = Number(data.count ?? 0);
    const sameWindow = now - windowStartMs < WINDOW_MS;
    if (sameWindow && count >= MAX_PER_HOUR) {
      throw new HttpsError('resource-exhausted', 'stats_insights_rate_limited');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      windowStartMs: sameWindow ? windowStartMs : now,
      count: sameWindow ? count + 1 : 1,
      updatedAtMs: now,
    }, { merge: true });
  });
}

/**
 * Product-wide daily generation breaker. Throws once the day's count would
 * exceed GLOBAL_DAILY_CAP. Mirrors explain/explain_budget.ts.
 */
async function enforceGlobalBudget(cap: number = GLOBAL_DAILY_CAP, nowMs: number = Date.now()): Promise<void> {
  // cap=0 → глобального дневного капа нет (админ может снять ограничение).
  if (cap <= 0) return;
  const db = admin.firestore();
  const ref = db.collection(GLOBAL_BUDGET_COLLECTION).doc(utcDayKey(nowMs));
  await db.runTransaction(async (tx) => {
    const genCount = Number((await tx.get(ref)).data()?.genCount ?? 0);
    if (genCount >= cap) {
      throw new HttpsError('resource-exhausted', 'stats_insights_global_budget_exceeded');
    }
    tx.set(ref, { genCount: genCount + 1, updatedAtMs: nowMs }, { merge: true });
  });
}

async function refundGlobalBudget(cap: number = GLOBAL_DAILY_CAP, nowMs: number = Date.now()): Promise<void> {
  if (cap <= 0) return;
  const db = admin.firestore();
  const ref = db.collection(GLOBAL_BUDGET_COLLECTION).doc(utcDayKey(nowMs));
  await db.runTransaction(async (tx) => {
    const genCount = Number((await tx.get(ref)).data()?.genCount ?? 0);
    tx.set(ref, { genCount: Math.max(0, genCount - 1), updatedAtMs: nowMs }, { merge: true });
  });
}

/**
 * Window quota. Split into a READ-ONLY check (before the paid call) and a
 * COMMIT (after success) so a provider failure never burns the user's window.
 */
type StatsInsightsReplayDecision =
  | { kind: 'open' }
  | { kind: 'not_ready'; nextAllowedAtMs: number }
  | { kind: 'replay'; notes: StatsInsightsNotes; nextAllowedAtMs: number; model: string };

function readStoredStatsInsightsNotes(raw: unknown, lang?: SupportedLang): StatsInsightsNotes | null {
  const data = (raw ?? {}) as Record<string, unknown>;
  const notes = {} as StatsInsightsNotes;
  let nonEmpty = 0;
  for (const key of BLOCK_KEYS) {
    const note = guardLearnerFacingNote(key, text(data[key], MAX_NOTE_CHARS));
    notes[key] = note;
    if (note) nonEmpty += 1;
  }
  if (nonEmpty === 0) return null;
  if (lang) {
    try {
      assertAiJsonTextFieldsLanguage({
        texts: Object.values(notes).filter(Boolean),
        targetLang: lang,
        feature: 'stats_insights',
      });
    } catch (error) {
      console.warn('stats_insights cached replay rejected by language guard', {
        lang,
        detail: String((error as Error)?.message ?? error).slice(0, 160),
      });
      return null;
    }
  }
  return notes;
}

function decideStatsInsightsReplay(
  quotaData: Record<string, unknown>,
  expectedBriefingHash: string,
  nowMs: number,
  lang?: SupportedLang,
): StatsInsightsReplayDecision {
  const nextAllowedAtMs = Number(quotaData.nextAllowedAtMs ?? 0);
  if (!Number.isFinite(nextAllowedAtMs) || nowMs >= nextAllowedAtMs) {
    return { kind: 'open' };
  }

  if (text(quotaData.lastBriefingHash, 128) === expectedBriefingHash) {
    const notes = readStoredStatsInsightsNotes(quotaData.lastNotes, lang);
    if (notes) {
      return {
        kind: 'replay',
        notes,
        nextAllowedAtMs,
        model: text(quotaData.lastModel, 80) || MODEL_DEFAULT,
      };
    }
    if (lang) return { kind: 'open' };
  }

  return { kind: 'not_ready', nextAllowedAtMs };
}

async function readReplayOrAssertWindowOpen(
  authUid: string,
  stableUid: string,
  expectedBriefingHash: string,
  lang: SupportedLang,
): Promise<Extract<StatsInsightsReplayDecision, { kind: 'replay' }> | null> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('sirq', authUid, stableUid));
  const snap = await ref.get();
  const decision = decideStatsInsightsReplay(snap.data() ?? {}, expectedBriefingHash, now, lang);
  if (decision.kind === 'open') return null;
  if (decision.kind === 'replay') return decision;
  if (decision.kind === 'not_ready') {
    throw new HttpsError('resource-exhausted', 'stats_insights_not_ready', {
      nextAllowedAtMs: decision.nextAllowedAtMs,
    });
  }
  return null;
}

async function commitWindow(
  authUid: string,
  stableUid: string,
  isPremium: boolean,
  briefingHash: string,
  notes: StatsInsightsNotes,
  model: string,
): Promise<number> {
  const db = admin.firestore();
  const now = Date.now();
  const windowDays = isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('sirq', authUid, stableUid));
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const existingNext = Number(data.nextAllowedAtMs ?? 0);
    if (now < existingNext) {
      return existingNext;
    }
    const newNext = startOfNextWindow(now, windowDays);
    tx.set(ref, {
      authUid,
      stableUid,
      isPremium,
      lastGeneratedAtMs: now,
      lastBriefingHash: briefingHash,
      lastNotes: notes,
      lastModel: model,
      nextAllowedAtMs: newNext,
      updatedAtMs: now,
    }, { merge: true });
    return newNext;
  });
}

// ── Prompt ─────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<SupportedLang, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
};

function buildSystemPrompt(lang: SupportedLang): string {
  const langName = LANG_NAMES[lang];
  return `You are "Компас", a warm, encouraging language tutor inside the Phraseman app.
You write SHORT personal notes that appear under each card of the learner's stats screen.

ABSOLUTE RULES:
- Write ENTIRELY in ${langName}. Every word must be in ${langName}.
- You receive a JSON briefing of ALREADY-COMPUTED numbers. Describe ONLY what is in it.
- NEVER invent numbers, streaks, words, categories, or facts not present in the briefing.
- Each note is 1–2 short sentences, each sentence ≤10 words, plain words. Be specific: refer to the actual numbers for that block.
- Never expose internal product metrics or labels to the learner: do not mention numeric ratings, points, scoring labels, or the internal block name as a learner-visible rating. Speak in plain human words, not jargon — avoid "percentile", "XP", "daily7"; say e.g. the ${langName} for "you are ahead of most".
- Do NOT claim that effort (streak, time, XP) causes language knowledge. Use effort only for warm acknowledgement.
- Always frame as what the learner HAS or can gain, never as loss. Loss-framing (e.g. the ${langName} for "don't lose your streak") is allowed ONLY in the "year" note AND only when currentStreak >= 7. For shorter streaks use pure encouragement. Never create false urgency (the ${langName} for "hurry, today only").
- WORD CHOICE: never say the ${langName} word for "statistics" to the learner — say "your results" (in Russian: «твои результаты», NOT «статистика»). Prefer "phrase" over "word"; "series" for streak, never "lesson". Avoid filler words (the ${langName} equivalents of «просто», «также», «кстати», «в принципе», «на самом деле»).
- Address the learner informally, as "ты" — use the informal second person of ${langName} (ты/tú/du/tu, NEVER the polite "вы"/usted/Sie/vous form). Talk like a friend who is on their side.
- Tone: a warm, friendly coach with a LIGHT touch of humor where it fits naturally — one small wink, never forced, never at the learner's expense. Plain, kind, concrete. Learners are often beginners and 50+. Never condescend, never shame.
- If a block has almost no data (zeros / warmup), write a gentle one-line nudge instead of pretending there is progress.

THE FIVE BLOCKS (write a note for each):
- "balance": learner-facing practice consistency card. Use active7 days and avgMinutes per active day. If isWarmup is true, say there is not enough practice yet for a fair pattern. Do NOT mention the score, points, or the internal word "balance".
- "rhythm": this week — active7/7 days, xp7 XP, minutes7 minutes, best day. Comment on the weekly pattern.
- "year": activeDays active days this year, currentStreak / longestStreak, bestMonth, goalPct% toward the yearly goal. Comment on the long-term picture.
- "percentiles": how the learner ranks vs others (totalXp%, week%, daily7% — each may be null/absent). If all null, give a neutral encouraging line about focusing on their own pace. Otherwise highlight the best ranking.
- "lifetime": all-time totals — words, phrases, quizzes, arenaWins, daysActive. Celebrate the biggest non-zero number; if mostly zero, encourage a first milestone.

If weakCategories is non-empty, you MAY weave ONE concrete "what to pull up" suggestion (the category label) into the "balance" or "rhythm" note. Never suggest a topic that is not in weakCategories.

OUTPUT FORMAT — respond with STRICT JSON only, no markdown, matching exactly:
{
  "balance": "1-2 sentences in ${langName}",
  "rhythm": "1-2 sentences in ${langName}",
  "year": "1-2 sentences in ${langName}",
  "percentiles": "1-2 sentences in ${langName}",
  "lifetime": "1-2 sentences in ${langName}"
}
Every value must be a non-empty string in ${langName}.`;
}

type GenerationSchemaVersion = 1 | 2;
type GenerationDecision =
  | { kind: 'reserve'; leaseToken: string; leaseExpiresAtMs: number }
  | { kind: 'in_progress' }
  | { kind: 'not_ready'; nextAllowedAtMs: number }
  | { kind: 'replay'; result: StatsInsightsNotes | VerifiedResult; nextAllowedAtMs: number; model: string };

function readStoredVerifiedResult(raw: unknown): VerifiedResult | null {
  if (!isPlainRecord(raw) || !isPlainRecord(raw.notes) || !isPlainRecord(raw.observationIds)) return null;
  const notes = {} as VerifiedNotes;
  const observationIds = {} as VerifiedObservationIds;
  for (const key of VERIFIED_BLOCK_KEYS) {
    const note = text(raw.notes[key], MAX_NOTE_CHARS);
    const id = text(raw.observationIds[key], 128);
    if (!note || !id) return null;
    notes[key] = note;
    observationIds[key] = id;
  }
  return { notes, observationIds };
}

function decideStatsInsightsGeneration(
  quotaData: Record<string, unknown>,
  requestHash: string,
  nowMs: number,
  schemaVersion: GenerationSchemaVersion,
  leaseToken: string,
  lang?: SupportedLang,
): GenerationDecision {
  const nextAllowedAtMs = Number(quotaData.nextAllowedAtMs ?? 0);
  if (Number.isFinite(nextAllowedAtMs) && nowMs < nextAllowedAtMs) {
    const storedSchema = Number(quotaData.responseSchemaVersion ?? LEGACY_SCHEMA_VERSION);
    const storedHash = text(quotaData.lastRequestHash ?? quotaData.lastBriefingHash, 128);
    if (storedSchema === schemaVersion && storedHash === requestHash) {
      const result = schemaVersion === VERIFIED_SCHEMA_VERSION
        ? readStoredVerifiedResult(quotaData.lastResult)
        : readStoredStatsInsightsNotes(quotaData.lastResult ?? quotaData.lastNotes, lang);
      if (result) return {
        kind: 'replay', result, nextAllowedAtMs,
        model: text(quotaData.lastModel, 80) || MODEL_DEFAULT,
      };
    }
    return { kind: 'not_ready', nextAllowedAtMs };
  }
  const activeLeaseToken = text(quotaData.generationLeaseToken, 128);
  const leaseExpiresAtMs = Number(quotaData.generationLeaseExpiresAtMs ?? 0);
  if (activeLeaseToken && Number.isFinite(leaseExpiresAtMs) && leaseExpiresAtMs > nowMs) return { kind: 'in_progress' };
  return { kind: 'reserve', leaseToken, leaseExpiresAtMs: nowMs + GENERATION_LEASE_MS };
}

function buildLeaseCommitMutation(
  quotaData: Record<string, unknown>,
  leaseToken: string,
  success: Record<string, unknown>,
): Record<string, unknown> | null {
  if (quotaData.generationLeaseToken !== leaseToken) return null;
  return { ...success, generationLeaseToken: null, generationLeaseHash: null, generationLeaseExpiresAtMs: 0 };
}

function buildLeaseReleaseMutation(quotaData: Record<string, unknown>, leaseToken: string): Record<string, unknown> | null {
  if (quotaData.generationLeaseToken !== leaseToken) return null;
  return { generationLeaseToken: null, generationLeaseHash: null, generationLeaseExpiresAtMs: 0 };
}

async function reserveGenerationLease(
  authUid: string,
  stableUid: string,
  requestHash: string,
  schemaVersion: GenerationSchemaVersion,
  lang?: SupportedLang,
): Promise<{ ref: FirebaseFirestore.DocumentReference; leaseToken?: string; replay?: Extract<GenerationDecision, { kind: 'replay' }> }> {
  const db = admin.firestore();
  const now = Date.now();
  const leaseToken = randomUUID();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('sirq', authUid, stableUid));
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const decision = decideStatsInsightsGeneration(data, requestHash, now, schemaVersion, leaseToken, lang);
    if (decision.kind === 'replay') return { ref, replay: decision };
    if (decision.kind === 'not_ready') throw new HttpsError('resource-exhausted', 'stats_insights_not_ready', { nextAllowedAtMs: decision.nextAllowedAtMs });
    if (decision.kind === 'in_progress') throw new HttpsError('unavailable', 'stats_insights_in_progress');
    tx.set(ref, {
      authUid, stableUid,
      generationLeaseToken: decision.leaseToken,
      generationLeaseHash: requestHash,
      generationLeaseSchemaVersion: schemaVersion,
      generationLeaseExpiresAtMs: decision.leaseExpiresAtMs,
      updatedAtMs: now,
    }, { merge: true });
    return { ref, leaseToken: decision.leaseToken };
  });
}

async function releaseGenerationLease(ref: FirebaseFirestore.DocumentReference, leaseToken: string): Promise<void> {
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const mutation = buildLeaseReleaseMutation(data, leaseToken);
    if (mutation) tx.set(ref, { ...mutation, updatedAtMs: Date.now() }, { merge: true });
  });
}

async function commitGenerationLease(
  ref: FirebaseFirestore.DocumentReference,
  leaseToken: string,
  success: Record<string, unknown>,
): Promise<number> {
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const mutation = buildLeaseCommitMutation(data, leaseToken, success);
    if (!mutation) throw new HttpsError('aborted', 'stats_insights_lease_lost');
    tx.set(ref, { ...mutation, updatedAtMs: Date.now() }, { merge: true });
    return Number(mutation.nextAllowedAtMs);
  });
}

function buildVerifiedSystemPrompt(lang: SupportedLang, analysis: VerifiedAnalysis): string {
  const langName = LANG_NAMES[lang];
  const observations = VERIFIED_BLOCK_KEYS.map((key) => ({
    block: key,
    observationId: analysis.blocks[key].id,
    facts: analysis.blocks[key].facts,
    allowedClaim: analysis.blocks[key].allowedClaim,
    allowedAction: analysis.blocks[key].allowedAction,
  }));
  return `You are a careful editor for learner-facing statistics notes.
Write entirely in ${langName}, using an informal but respectful second person.
For each block, only rephrase its supplied allowedClaim. Treat it as the complete truth.
Do not infer from unavailable or below-floor data: rely solely on allowedClaim.
Make no new calculations and add no facts or numbers. Every number must come from that block's facts.
You may include at most one supplied allowedAction. Never invent an action.
Do not repeat the same fact or advice across blocks. Keep each text non-empty and concise.
Return strict JSON only, with no markdown and exactly this shape:
{"week":{"observationId":"...","text":"..."},"longTerm":{"observationId":"...","text":"..."},"comparison":{"observationId":"...","text":"..."},"lifetime":{"observationId":"...","text":"..."}}
Use each exact observationId supplied below.
VERIFIED OBSERVATIONS:
${JSON.stringify(observations)}`;
}

type StatsInsightsNotes = Record<BlockKey, string>;

interface StatsInsightsResult {
  notes: StatsInsightsNotes;
}

/**
 * Parses the model JSON into the five known block notes, length-capped. Missing
 * keys become '' (the client simply hides an empty note). Throws only if the
 * output is not JSON or every note is empty.
 */
function parseAndGuardResult(rawContent: string, lang?: SupportedLang): StatsInsightsResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    throw new HttpsError('unavailable', 'stats_insights_bad_json');
  }

  const notes = {} as StatsInsightsNotes;
  let nonEmpty = 0;
  for (const key of BLOCK_KEYS) {
    const note = guardLearnerFacingNote(key, text(parsed[key], MAX_NOTE_CHARS));
    notes[key] = note;
    if (note) nonEmpty += 1;
  }

  if (nonEmpty === 0) {
    throw new HttpsError('unavailable', 'stats_insights_empty');
  }
  if (lang) {
    assertAiJsonTextFieldsLanguage({
      texts: Object.values(notes).filter(Boolean),
      targetLang: lang,
      feature: 'stats_insights',
    });
  }

  return { notes };
}

function normalizedNumbers(value: string): number[] {
  return (value.match(/[-+]?\d+(?:[.,]\d+)?\s*%?/g) ?? [])
    .map((token) => Number(token.replace(/\s*%$/, '').replace(',', '.')))
    .filter(Number.isFinite);
}

function verifiedTextUsesOnlyAllowedNumbers(note: string, facts: Array<string | number>): boolean {
  const allowed = facts.flatMap((fact) => normalizedNumbers(String(fact)));
  return normalizedNumbers(note).every((number) => allowed.some((candidate) => Math.abs(candidate - number) < 1e-9));
}

function normalizeDuplicateText(value: string): string[] {
  return value.toLocaleLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
}

function hasDuplicateVerifiedNotes(notes: VerifiedNotes): boolean {
  const values = VERIFIED_BLOCK_KEYS.map((key) => normalizeDuplicateText(notes[key]));
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const a = new Set(values[left]);
      const b = new Set(values[right]);
      if (!a.size || !b.size) continue;
      const overlap = [...a].filter((token) => b.has(token)).length;
      if (overlap / Math.max(a.size, b.size) >= 0.8) return true;
    }
  }
  return false;
}

function parseAndGuardVerifiedResult(rawContent: string, analysis: VerifiedAnalysis, lang: SupportedLang): VerifiedResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new HttpsError('unavailable', 'stats_insights_bad_json');
  }
  if (!isPlainRecord(parsed) || !hasExactKeys(parsed, VERIFIED_BLOCK_KEYS)) {
    throw new HttpsError('unavailable', 'stats_insights_bad_shape');
  }
  const notes = {} as VerifiedNotes;
  const observationIds = {} as VerifiedObservationIds;
  for (const key of VERIFIED_BLOCK_KEYS) {
    const entry = parsed[key];
    if (!isPlainRecord(entry) || !hasExactKeys(entry, ['observationId', 'text'])) {
      throw new HttpsError('unavailable', 'stats_insights_bad_shape');
    }
    if (entry.observationId !== analysis.blocks[key].id) {
      throw new HttpsError('unavailable', 'stats_insights_observation_mismatch');
    }
    if (typeof entry.text !== 'string') throw new HttpsError('unavailable', 'stats_insights_empty');
    const note = entry.text.trim();
    if (!note || note.length > MAX_NOTE_CHARS) throw new HttpsError('unavailable', 'stats_insights_empty');
    if (!verifiedTextUsesOnlyAllowedNumbers(note, analysis.blocks[key].facts)) {
      throw new HttpsError('unavailable', 'stats_insights_unverified_number');
    }
    notes[key] = note;
    observationIds[key] = analysis.blocks[key].id;
  }
  assertAiJsonTextFieldsLanguage({ texts: Object.values(notes), targetLang: lang, feature: 'stats_insights' });
  if (hasDuplicateVerifiedNotes(notes)) throw new HttpsError('unavailable', 'stats_insights_duplicate');
  return { notes, observationIds };
}

function guardLearnerFacingNote(key: BlockKey, note: string): string {
  if (!note) return '';
  const lower = note.toLocaleLowerCase();
  const hasInternalBalancePhrase =
    /\d+\s*(?:\/\s*100\s*)?(?:балл|балла|баллов|points?|pts?|score)/i.test(note) ||
    /\b(?:score|points?|pts?)\s*\d+\b/i.test(note) ||
    /(?:балл|балла|баллов|points?|pts?|score).{0,24}(?:баланс|balance)/i.test(note) ||
    /(?:баланс|balance).{0,24}(?:балл|балла|баллов|points?|pts?|score)/i.test(note) ||
    lower.includes('practice balance score') ||
    lower.includes('balance score');
  if (key === 'balance' && hasInternalBalancePhrase) return '';
  return note;
}

function assertPremiumStatsInsightsAccess(isPremium: boolean): void {
  if (!isPremium) throw new HttpsError('permission-denied', 'stats_insights_premium_required');
}

// ── Callable ──────────────────────────────────────────────────────────────────

export const statsInsightsGenerate = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 10,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
  const data = (request.data ?? {}) as Record<string, unknown>;
  // НЕ доверяем data.isPremium из тела — премиум резолвится на сервере ниже
  // (после resolveStableUidForAuth) из users/{stableUid}.progress.
  const isVerified = data.analysis !== undefined;
  const verifiedRequest = isVerified ? sanitizeVerifiedRequest(data) : null;
  const verifiedAnalysis = verifiedRequest?.analysis ?? null;
  const briefing = isVerified ? null : sanitizeBriefing(data.briefing);
  const lang = verifiedRequest?.lang ?? briefing!.lang;
  const studyTarget = verifiedRequest?.studyTarget ?? briefing!.studyTarget;

  if (briefing && !hasEnoughSignal(briefing)) {
    throw new HttpsError('failed-precondition', 'stats_insights_insufficient_data');
  }

  const db = admin.firestore();
  // Админ-конфиг (модель/глобальный кап/выключатель). Fallback = текущие дефолты.
  const jobCfg = await resolveJobConfig(db, 'stats');
  assertJobEnabled(jobCfg, 'stats'); // kill-switch: enabled=false → resource-exhausted
  const authUid = request.auth.uid;
  // uid from auth identity — NEVER from request body (security invariant).
  const stableUid = await resolveStableUidForAuth(db, authUid);
  // Premium резолвится из Firestore-состояния, а не из тела запроса: иначе
  // free-юзер прислал бы isPremium:true и получил укороченное (премиум) окно.
  const isPremium = await resolvePremiumAccess(db, stableUid);
  assertPremiumStatsInsightsAccess(isPremium);

  // Replay/window check BEFORE rate, global budget, and the paid API call.
  // Same briefing retries get the cached server result; different briefing
  // remains gated until the window opens.
  const schemaVersion: GenerationSchemaVersion = isVerified ? VERIFIED_SCHEMA_VERSION : LEGACY_SCHEMA_VERSION;
  const requestHash = verifiedRequest
    ? createHash('sha256').update(JSON.stringify(verifiedRequest)).digest('hex')
    : briefingHashForReplay(briefing!);
  const reservation = await reserveGenerationLease(authUid, stableUid, requestHash, schemaVersion, lang);
  if (reservation.replay) {
    if (isVerified) return { ok: true, ...(reservation.replay.result as VerifiedResult), nextAllowedAtMs: reservation.replay.nextAllowedAtMs, model: reservation.replay.model, idempotentReplay: true };
    return { ok: true, notes: reservation.replay.result as StatsInsightsNotes, nextAllowedAtMs: reservation.replay.nextAllowedAtMs, model: reservation.replay.model, idempotentReplay: true };
  }

  // Limits BEFORE the paid call. Window is committed after a successful
  // generation so a provider failure does not lock the user out for the whole
  // window.
  const leaseToken = reservation.leaseToken!;
  let budgetReservedAtMs: number | null = null;
  let providerCharged = false;
  let result: StatsInsightsResult | VerifiedResult;
  let json: OpenAIChatResponse;
  try {
    await enforceRateLimit(authUid, stableUid);
    const budgetAttemptAtMs = Date.now();
    await enforceGlobalBudget(jobCfg.globalDailyCap, budgetAttemptAtMs);
    budgetReservedAtMs = budgetAttemptAtMs;
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');
    const messages = verifiedAnalysis
      ? [{ role: 'system' as const, content: buildVerifiedSystemPrompt(lang, verifiedAnalysis) }, { role: 'user' as const, content: JSON.stringify(verifiedAnalysis) }]
      : [{ role: 'system' as const, content: buildSystemPrompt(lang) }, { role: 'user' as const, content: JSON.stringify(briefing) }];
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: jobCfg.model,
        messages,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('stats_insights chat failed', response.status, detail.slice(0, 500));
      throw new HttpsError('unavailable', 'stats_insights_provider_failed');
    }
    providerCharged = true;
    json = (await response.json()) as OpenAIChatResponse;
    const content = text(json.choices?.[0]?.message?.content, 4000);
    if (!content) throw new HttpsError('unavailable', 'stats_insights_empty_reply');
    result = verifiedAnalysis ? parseAndGuardVerifiedResult(content, verifiedAnalysis, lang) : parseAndGuardResult(content, lang);
  } catch (error) {
    await releaseGenerationLease(reservation.ref, leaseToken)
      .catch((releaseError) => console.error('stats_insights lease release failed', releaseError));
    if (budgetReservedAtMs !== null && !providerCharged) {
      await refundGlobalBudget(jobCfg.globalDailyCap, budgetReservedAtMs)
        .catch((refundErr) => console.error('stats_insights global budget refund failed', refundErr));
    }
    throw error;
  }

  const now = Date.now();
  const nextAllowedAtMs = startOfNextWindow(now, PREMIUM_WINDOW_DAYS);
  const success = verifiedAnalysis
    ? { responseSchemaVersion: VERIFIED_SCHEMA_VERSION, lastRequestHash: requestHash, lastResult: result, lastModel: jobCfg.model, lastGeneratedAtMs: now, nextAllowedAtMs, isPremium: true }
    : { responseSchemaVersion: LEGACY_SCHEMA_VERSION, lastRequestHash: requestHash, lastBriefingHash: requestHash, lastResult: result.notes, lastNotes: result.notes, lastModel: jobCfg.model, lastGeneratedAtMs: now, nextAllowedAtMs, isPremium: true };
  try {
    await commitGenerationLease(reservation.ref, leaseToken, success);
  } catch (error) {
    await releaseGenerationLease(reservation.ref, leaseToken)
      .catch((releaseError) => console.error('stats_insights lease release after commit failure failed', releaseError));
    throw error;
  }

  // Generation succeeded — NOW commit the window (so failures above never burn it).
  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    model: jobCfg.model,
    lang,
    studyTarget,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    isPremium,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  return verifiedAnalysis
    ? { ok: true, ...(result as VerifiedResult), nextAllowedAtMs, model: jobCfg.model }
    : { ok: true, notes: result.notes, nextAllowedAtMs, model: jobCfg.model };
});

// Pure functions exposed for unit tests (convention: see weekly_review.ts).
export const __statsInsightsTestHooks = {
  sanitizeBriefing,
  parseAndGuardResult,
  buildSystemPrompt,
  hasEnoughSignal,
  briefingHashForReplay,
  decideStatsInsightsReplay,
  readStoredStatsInsightsNotes,
  sanitizeVerifiedAnalysis,
  sanitizeVerifiedRequest,
  buildVerifiedSystemPrompt,
  parseAndGuardVerifiedResult,
  verifiedTextUsesOnlyAllowedNumbers,
  hasDuplicateVerifiedNotes,
  decideStatsInsightsGeneration,
  buildLeaseCommitMutation,
  buildLeaseReleaseMutation,
  assertPremiumStatsInsightsAccess,
};
export type { StatsInsightsBriefing, StatsInsightsResult, StatsInsightsNotes, BlockKey, VerifiedAnalysis, VerifiedResult };
