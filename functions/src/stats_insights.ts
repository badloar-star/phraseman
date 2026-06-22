import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash } from 'crypto';
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

/**
 * Window quota. Split into a READ-ONLY check (before the paid call) and a
 * COMMIT (after success) so a provider failure never burns the user's window.
 */
async function assertWindowOpen(authUid: string, stableUid: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('sirq', authUid, stableUid));
  const snap = await ref.get();
  const nextAllowedAtMs = Number(snap.data()?.nextAllowedAtMs ?? 0);
  if (now < nextAllowedAtMs) {
    throw new HttpsError('resource-exhausted', 'stats_insights_not_ready', { nextAllowedAtMs });
  }
}

async function commitWindow(authUid: string, stableUid: string, isPremium: boolean): Promise<number> {
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
  const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as Record<string, unknown>;
  // НЕ доверяем data.isPremium из тела — премиум резолвится на сервере ниже
  // (после resolveStableUidForAuth) из users/{stableUid}.progress.
  const briefing = sanitizeBriefing(data.briefing);

  if (!hasEnoughSignal(briefing)) {
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

  // Limits BEFORE the paid call. Window is only CHECKED here (read-only) — it is
  // committed after a successful generation so a provider failure does not lock
  // the user out for the whole window.
  await enforceRateLimit(authUid, stableUid);
  await assertWindowOpen(authUid, stableUid);
  await enforceGlobalBudget(jobCfg.globalDailyCap);

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(briefing.lang) },
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
    console.error('stats_insights chat failed', response.status, detail.slice(0, 500));
    throw new HttpsError('unavailable', 'stats_insights_provider_failed');
  }

  const json = (await response.json()) as OpenAIChatResponse;
  const content = text(json.choices?.[0]?.message?.content, 4000);
  if (!content) throw new HttpsError('unavailable', 'stats_insights_empty_reply');

  const result = parseAndGuardResult(content, briefing.lang);

  // Generation succeeded — NOW commit the window (so failures above never burn it).
  const nextAllowedAtMs = await commitWindow(authUid, stableUid, isPremium);

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    model: jobCfg.model,
    lang: briefing.lang,
    studyTarget: briefing.studyTarget,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    isPremium,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  return {
    ok: true,
    notes: result.notes,
    nextAllowedAtMs,
    model: jobCfg.model,
  };
});

// Pure functions exposed for unit tests (convention: see weekly_review.ts).
export const __statsInsightsTestHooks = {
  sanitizeBriefing,
  parseAndGuardResult,
  buildSystemPrompt,
  hasEnoughSignal,
};
export type { StatsInsightsBriefing, StatsInsightsResult, StatsInsightsNotes, BlockKey };
