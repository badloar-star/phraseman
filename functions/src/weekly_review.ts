import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';
import { assertAiJsonTextFieldsLanguage, studyTargetName, type StudyTarget } from './ai_language_contract';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * AI mistake review — turns the learner's ALREADY-COMPUTED mistake analytics into
 * a warm, plain-language summary. The AI does NOT see the raw log and does NOT
 * pick lessons: the client sends a finished briefing (weak/strong categories,
 * recovered categories, weak lessons, top phrases, and a gate-filtered list of
 * available micro-lessons). The model only describes those numbers and may
 * recommend ONLY from the provided lesson list.
 *
 * Pattern follows premium_dialog.ts (key via secret/env, auth.uid as identity,
 * quota in a Firestore transaction BEFORE the paid API call).
 *
 * NOT in deploy:safe whitelist on purpose (spends OpenAI). Deploy point-to-point:
 *   firebase deploy --only functions:weeklyReviewGenerate
 */

const REGION = 'us-central1';
const RATE_COLLECTION = 'weekly_review_rate_limits';
const QUOTA_COLLECTION = 'weekly_review_quotas';
const BILLING_COLLECTION = 'weekly_review_billing';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 10;

// Premium regenerates daily; free — once a week. Server is the
// source of truth — the client gate is bypassable.
const PREMIUM_WINDOW_DAYS = 1;
const FREE_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const MAX_OUTPUT_TOKENS = 700;
const MAX_PARAGRAPHS = 4;
const MAX_RECOMMENDATIONS = 4;

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4o-mini';

type SupportedLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
const SUPPORTED_LANGS: SupportedLang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

// ── Briefing shape (structurally mirrors app/weekly_review_briefing.ts) ──────

interface BriefingRecommendation {
  microDiagnosisId: string;
  label: string;
}

interface BriefingWeakCategory {
  category: string;
  label: string;
  pct: number;
  priorityScore: number;
  topWords: string[];
}

interface WeeklyReviewBriefing {
  lang: SupportedLang;
  studyTarget: 'en' | 'fr';
  windowDays: number;
  totalMistakes: number;
  weakCategories: BriefingWeakCategory[];
  strongCategories: Array<{ category: string; label: string }>;
  recoveredCategories: Array<{ category: string; label: string; recoveryScore: number }>;
  weakLessons: Array<{ lessonId: number; title: string; pct: number }>;
  topMistakePhrases: Array<{ phrase: string; count: number }>;
  recommendedLessons: BriefingRecommendation[];
  effort: {
    currentStreak: number;
    longestStreak: number;
    weekXp: number;
    weekMinutes: number;
  };
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

function asLang(value: unknown): SupportedLang {
  const v = text(value, 5) as SupportedLang;
  return SUPPORTED_LANGS.includes(v) ? v : 'ru';
}

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

function briefingHashForReplay(briefing: WeeklyReviewBriefing): string {
  return createHash('sha256').update(JSON.stringify(briefing)).digest('hex');
}

/**
 * Sanitizes the untrusted client briefing into a known-good shape. Crucially,
 * recommendation ids are kept verbatim (they're opaque ids the client already
 * gate-filtered), but everything is length-capped and array-bounded so a hostile
 * client cannot blow up the prompt.
 */
function sanitizeBriefing(raw: unknown): WeeklyReviewBriefing {
  const data = (raw ?? {}) as Record<string, unknown>;
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

  const weakCategories: BriefingWeakCategory[] = arr(data.weakCategories).slice(0, 5).map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return {
      category: text(c.category, 40),
      label: text(c.label, 80),
      pct: clampInt(c.pct, 0, 100),
      priorityScore: clampInt(c.priorityScore, 0, 100),
      topWords: arr(c.topWords).slice(0, 5).map((w) => text(w, 40)).filter(Boolean),
    };
  }).filter((c) => c.category && c.label);

  const labelPairs = (v: unknown, max: number) => arr(v).slice(0, max).map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return { category: text(c.category, 40), label: text(c.label, 80) };
  }).filter((c) => c.category && c.label);

  const recoveredCategories = arr(data.recoveredCategories).slice(0, 3).map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return {
      category: text(c.category, 40),
      label: text(c.label, 80),
      recoveryScore: clampInt(c.recoveryScore, 0, 100),
    };
  }).filter((c) => c.category && c.label);

  const weakLessons = arr(data.weakLessons).slice(0, 3).map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return { lessonId: clampInt(c.lessonId, 0, 100000), title: text(c.title, 120), pct: clampInt(c.pct, 0, 100) };
  }).filter((l) => l.title);

  const topMistakePhrases = arr(data.topMistakePhrases).slice(0, 3).map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return { phrase: text(c.phrase, 200), count: clampInt(c.count, 0, 100000) };
  }).filter((p) => p.phrase);

  const recommendedLessons = arr(data.recommendedLessons).slice(0, MAX_RECOMMENDATIONS).map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return { microDiagnosisId: text(c.microDiagnosisId, 80), label: text(c.label, 120) };
  }).filter((r) => r.microDiagnosisId && r.label);

  const effortRaw = (data.effort ?? {}) as Record<string, unknown>;

  return {
    lang: asLang(data.lang),
    studyTarget: data.studyTarget === 'fr' ? 'fr' : 'en',
    windowDays: clampInt(data.windowDays, 1, 365),
    totalMistakes: clampInt(data.totalMistakes, 0, 1000000),
    weakCategories,
    strongCategories: labelPairs(data.strongCategories, 2),
    recoveredCategories,
    weakLessons,
    topMistakePhrases,
    recommendedLessons,
    effort: {
      currentStreak: clampInt(effortRaw.currentStreak, 0, 100000),
      longestStreak: clampInt(effortRaw.longestStreak, 0, 100000),
      weekXp: clampInt(effortRaw.weekXp, 0, 100000000),
      weekMinutes: clampInt(effortRaw.weekMinutes, 0, 1000000),
    },
  };
}

function startOfNextWindow(nowMs: number, windowDays: number): number {
  return nowMs + windowDays * DAY_MS;
}

async function enforceRateLimit(authUid: string, stableUid: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(RATE_COLLECTION).doc(docId('wkr', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const windowStartMs = Number(data.windowStartMs ?? 0);
    const count = Number(data.count ?? 0);
    const sameWindow = now - windowStartMs < WINDOW_MS;
    if (sameWindow && count >= MAX_PER_HOUR) {
      throw new HttpsError('resource-exhausted', 'weekly_review_rate_limited');
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
 * Window quota — everyone can regenerate once per day.
 * SERVER is the source of truth (client gate is bypassable).
 *
 * Split into a READ-ONLY check (before the paid call) and a COMMIT (after a
 * successful generation). This avoids burning the daily window when OpenAI
 * fails — otherwise one provider hiccup would lock the user out for a week.
 * Throws 'weekly_review_not_ready' with nextAllowedAtMs in details if too soon.
 */
type WeeklyReviewReplayDecision =
  | { kind: 'open' }
  | { kind: 'not_ready'; nextAllowedAtMs: number }
  | { kind: 'replay'; review: WeeklyReviewResult; nextAllowedAtMs: number; model: string };

function readStoredWeeklyReview(raw: unknown, lang?: SupportedLang): WeeklyReviewResult | null {
  const data = (raw ?? {}) as Record<string, unknown>;
  const greeting = text(data.greeting, 200);
  const paragraphs = (Array.isArray(data.paragraphs) ? data.paragraphs : [])
    .slice(0, MAX_PARAGRAPHS)
    .map((p) => text(p, 800))
    .filter(Boolean);
  if (!greeting || paragraphs.length === 0) return null;

  const recommendations = (Array.isArray(data.recommendations) ? data.recommendations : [])
    .slice(0, MAX_RECOMMENDATIONS)
    .map((item) => {
      const c = (item ?? {}) as Record<string, unknown>;
      return { microDiagnosisId: text(c.microDiagnosisId, 80), label: text(c.label, 120) };
    })
    .filter((r) => r.microDiagnosisId && r.label);

  const review = { greeting, paragraphs, recommendations };
  if (lang) {
    try {
      assertAiJsonTextFieldsLanguage({
        texts: [greeting, ...paragraphs],
        targetLang: lang,
        feature: 'weekly_review',
      });
    } catch (error) {
      console.warn('weekly_review cached replay rejected by language guard', {
        lang,
        detail: String((error as Error)?.message ?? error).slice(0, 160),
      });
      return null;
    }
  }
  return review;
}

function decideWeeklyReviewReplay(
  quotaData: Record<string, unknown>,
  expectedBriefingHash: string,
  nowMs: number,
  lang?: SupportedLang,
): WeeklyReviewReplayDecision {
  const nextAllowedAtMs = Number(quotaData.nextAllowedAtMs ?? 0);
  if (!Number.isFinite(nextAllowedAtMs) || nowMs >= nextAllowedAtMs) {
    return { kind: 'open' };
  }

  if (text(quotaData.lastBriefingHash, 128) === expectedBriefingHash) {
    const review = readStoredWeeklyReview(quotaData.lastReview, lang);
    if (review) {
      return {
        kind: 'replay',
        review,
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
): Promise<Extract<WeeklyReviewReplayDecision, { kind: 'replay' }> | null> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('wkrq', authUid, stableUid));
  const snap = await ref.get();
  const decision = decideWeeklyReviewReplay(snap.data() ?? {}, expectedBriefingHash, now, lang);
  if (decision.kind === 'open') return null;
  if (decision.kind === 'replay') return decision;
  if (decision.kind === 'not_ready') {
    throw new HttpsError('resource-exhausted', 'weekly_review_not_ready', {
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
  review: WeeklyReviewResult,
  model: string,
): Promise<number> {
  const db = admin.firestore();
  const now = Date.now();
  const windowDays = isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('wkrq', authUid, stableUid));
  // Transaction guards against a concurrent second request slipping past the
  // read-only check before this commit lands.
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const existingNext = Number(data.nextAllowedAtMs ?? 0);
    if (now < existingNext) {
      // A concurrent call already committed the window — honor it.
      return existingNext;
    }
    const newNext = startOfNextWindow(now, windowDays);
    tx.set(ref, {
      authUid,
      stableUid,
      isPremium,
      lastGeneratedAtMs: now,
      lastBriefingHash: briefingHash,
      lastReview: review,
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

function buildSystemPrompt(lang: SupportedLang, studyTarget: StudyTarget = 'en'): string {
  const langName = LANG_NAMES[lang];
  const targetName = studyTargetName(studyTarget);
  return `You are "Компас", a warm, encouraging ${targetName} tutor inside the Phraseman app.
You are writing the learner's mistake review for their ${targetName} practice.

ABSOLUTE RULES:
- Write ENTIRELY in ${langName}. Every word of greeting and paragraphs must be in ${langName}.
- You will receive a JSON briefing of ALREADY-COMPUTED statistics. Describe ONLY what is in it.
- NEVER invent numbers, categories, lessons, words, or facts that are not in the briefing.
- NEVER recommend a grammar topic or lesson that is not in "recommendedLessons". If that list is empty, give general encouragement instead and recommend nothing.
- Do NOT draw causal links between effort stats (streak, time, XP) and language knowledge. Use effort only for warm acknowledgement.
- NEVER speculate WHY the learner slipped — do NOT say they confused things, translated literally, rushed, did not think, or misunderstood. You only see counts, not reasons. State the fact (which category, which example phrases) and the path forward — nothing about their motive.
- WORD CHOICE in the output: never use the ${langName} word for "mistake/error/wrong" (in Russian: NOT «ошибка»/«ошибся»/«неправильно»). Frame slips gently as «почти» / a near-miss / «давай закрепим». Say the ${langName} word for "session/round" instead of "lesson", "your results" instead of "statistics", "phrase" instead of "word" where natural.
- No grammar jargon (no "auxiliary verb", "definite article", "perfect tense", «вспомогательный глагол», «определённый артикль»). Name weak spots in plain everyday words a 50+ beginner instantly understands.
- Frame everything as gain — what the learner is building or can unlock next, never as loss ("you will forget", "you will lose progress"). No fake urgency.
- Be specific and kind. Mention concrete weak categories and the example words from topWords. Celebrate strong/recovered categories by name.
- Address the learner informally, as "ты" — use the informal second person of ${langName} (ты/tú/du/tu, NEVER the polite "вы"/usted/Sie/vous form). Talk like a friend who is on their side.
- Keep sentences short: aim for ~10 words each, one idea per sentence. The greeting is 5-6 words max. Avoid filler words (the ${langName} equivalents of «просто», «также», «кстати», «в принципе», «на самом деле»).
- Tone: a warm, friendly coach with a LIGHT touch of humor where it fits naturally — one small wink, never forced, never at the learner's expense. Short, clear sentences. The learner is often a beginner and 50+. Never condescend, never shame mistakes.

OUTPUT FORMAT — respond with STRICT JSON only, no markdown, matching exactly:
{
  "greeting": "one short warm opening line in ${langName}",
  "paragraphs": ["2 to ${MAX_PARAGRAPHS} short paragraphs in ${langName}: what went well, where the weak spots are (name categories + example words), what changed/improved, gentle next step"],
  "recommendations": [{"microDiagnosisId": "<copy id verbatim from recommendedLessons>", "label": "<copy label verbatim>"}]
}
"recommendations" MUST be a subset of the briefing's "recommendedLessons" (same ids). Include at most ${MAX_RECOMMENDATIONS}. If recommendedLessons is empty, return an empty array.`;
}

interface WeeklyReviewResult {
  greeting: string;
  paragraphs: string[];
  recommendations: BriefingRecommendation[];
}

/**
 * Parses the model's JSON and re-validates recommendations against the briefing
 * so the AI can NEVER surface a lesson the client did not authorize, even if it
 * hallucinates one. This is the server-side guarantee behind the gate.
 */
function parseAndGuardResult(rawContent: string, briefing: WeeklyReviewBriefing): WeeklyReviewResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    throw new HttpsError('unavailable', 'weekly_review_bad_json');
  }

  const greeting = text(parsed.greeting, 200);
  const paragraphsRaw = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
  const paragraphs = paragraphsRaw
    .slice(0, MAX_PARAGRAPHS)
    .map((p) => text(p, 800))
    .filter(Boolean);

  if (!greeting || paragraphs.length === 0) {
    throw new HttpsError('unavailable', 'weekly_review_empty');
  }
  assertAiJsonTextFieldsLanguage({
    texts: [greeting, ...paragraphs],
    targetLang: briefing.lang,
    feature: 'weekly_review',
  });

  // Allowlist of authorized ids from the briefing.
  const allowed = new Map(briefing.recommendedLessons.map((r) => [r.microDiagnosisId, r.label]));
  const recsRaw = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const recommendations: BriefingRecommendation[] = [];
  const seen = new Set<string>();
  for (const item of recsRaw) {
    const c = (item ?? {}) as Record<string, unknown>;
    const id = text(c.microDiagnosisId, 80);
    if (allowed.has(id) && !seen.has(id)) {
      seen.add(id);
      // Use the briefing's label, NOT the model's — guarantees consistency.
      recommendations.push({ microDiagnosisId: id, label: allowed.get(id)! });
    }
    if (recommendations.length >= MAX_RECOMMENDATIONS) break;
  }

  return { greeting, paragraphs, recommendations };
}

// ── Callable ──────────────────────────────────────────────────────────────────

export const weeklyReviewGenerate = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 10,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
  const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as Record<string, unknown>;
  // НЕ доверяем data.isPremium из тела — премиум резолвится на сервере ниже
  // (после resolveStableUidForAuth) из users/{stableUid}.progress.
  const briefing = sanitizeBriefing(data.briefing);

  if (briefing.totalMistakes < 5 || briefing.weakCategories.length === 0) {
    throw new HttpsError('failed-precondition', 'weekly_review_insufficient_data');
  }

  const db = admin.firestore();
  // Админ-конфиг (модель/выключатель). Fallback = текущие дефолты.
  const jobCfg = await resolveJobConfig(db, 'weekly');
  assertJobEnabled(jobCfg, 'weekly'); // kill-switch: enabled=false → resource-exhausted
  const authUid = request.auth.uid;
  // uid from auth identity — NEVER from request body (security invariant).
  const stableUid = await resolveStableUidForAuth(db, authUid);
  // Premium резолвится из Firestore-состояния, а не из тела запроса: иначе
  // free-юзер прислал бы isPremium:true и получил укороченное (премиум) окно.
  const isPremium = await resolvePremiumAccess(db, stableUid);

  // Replay/window check BEFORE rate limits and the paid API call. Same briefing
  // retries get the cached server result; different briefing remains gated.
  const briefingHash = briefingHashForReplay(briefing);
  const replay = await readReplayOrAssertWindowOpen(authUid, stableUid, briefingHash, briefing.lang);
  if (replay) {
    return {
      ok: true,
      review: replay.review,
      nextAllowedAtMs: replay.nextAllowedAtMs,
      model: replay.model,
      idempotentReplay: true,
    };
  }

  // Limits BEFORE the paid API call. Window is committed after a successful
  // generation so a provider failure does not lock the user out for a week.
  await enforceRateLimit(authUid, stableUid);

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(briefing.lang, briefing.studyTarget) },
    { role: 'user' as const, content: JSON.stringify(briefing) },
  ];

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
    console.error('weekly_review chat failed', response.status, detail.slice(0, 500));
    throw new HttpsError('unavailable', 'weekly_review_provider_failed');
  }

  const json = (await response.json()) as OpenAIChatResponse;
  const content = text(json.choices?.[0]?.message?.content, 4000);
  if (!content) throw new HttpsError('unavailable', 'weekly_review_empty_reply');

  const result = parseAndGuardResult(content, briefing);

  // Generation succeeded — NOW commit the window (so failures above never burn it).
  const nextAllowedAtMs = await commitWindow(authUid, stableUid, isPremium, briefingHash, result, jobCfg.model);

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    model: jobCfg.model,
    lang: briefing.lang,
    studyTarget: briefing.studyTarget,
    windowDays: briefing.windowDays,
    totalMistakes: briefing.totalMistakes,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    isPremium,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  return {
    ok: true,
    review: result,
    nextAllowedAtMs,
    model: jobCfg.model,
  };
});

// Pure functions exposed for unit tests (convention: see account_delete.ts).
export const __weeklyReviewTestHooks = {
  sanitizeBriefing,
  parseAndGuardResult,
  buildSystemPrompt,
  briefingHashForReplay,
  decideWeeklyReviewReplay,
  readStoredWeeklyReview,
};
export type { WeeklyReviewBriefing, WeeklyReviewResult };
