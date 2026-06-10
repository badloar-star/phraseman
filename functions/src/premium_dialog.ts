import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * Premium AI dialogue — Phase 0 (scenario-only, text MVP).
 * Pattern follows pronunciation_scoring.ts (key proxy via process.env, auth.uid as identity,
 * rate limit in a Firestore transaction BEFORE the paid API call).
 *
 * NOT in deploy:safe whitelist on purpose — deploy point-to-point:
 *   firebase deploy --only functions:premiumDialogSend
 */

const REGION = 'us-central1';
const RATE_COLLECTION = 'premium_dialog_rate_limits';
const QUOTA_COLLECTION = 'premium_dialog_quotas';
const BILLING_COLLECTION = 'premium_dialog_billing';

const MAX_USER_TEXT = 2000;
const MAX_HISTORY_TURNS = 8;
const MAX_OUTPUT_TOKENS = 200;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 60;

const FREE_DAILY_CAP = 1;
const PREMIUM_DAILY_CAP = 100;

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4o-mini';

type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface PremiumDialogRequest {
  mode?: unknown;
  userText?: unknown;
  cefr?: unknown;
  history?: unknown;
  role?: unknown;
  setting?: unknown;
  goalEn?: unknown;
  scenarioId?: unknown;
  isPremium?: unknown;
  /** Память коуча (режим companion): профиль + слабые слова из SRS + резюме прошлых бесед. */
  memory?: unknown;
}

/** Память, собираемая клиентом из профиля + SRS-истории. Все поля опциональны. */
interface DialogMemory {
  /** Короткий профиль: уровень, цель, родной язык. */
  profile?: string;
  /** top-K слов/фраз, с которыми ученик мучается (из getTrainerPremiumItems('weak')). */
  weakWords?: string[];
  /** Скользящее резюме прошлых разговоров (в MVP-1 обычно пустое). */
  summary?: string;
}

function sanitizeMemory(value: unknown): DialogMemory {
  const m = (value ?? {}) as Record<string, unknown>;
  const weakRaw = Array.isArray(m.weakWords) ? m.weakWords : [];
  const weakWords = weakRaw
    .map((w) => text(w, 60))
    .filter((w) => w.length > 0)
    .slice(0, 8);
  return {
    profile: text(m.profile, 400) || undefined,
    weakWords: weakWords.length > 0 ? weakWords : undefined,
    summary: text(m.summary, 800) || undefined,
  };
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function asCefr(value: unknown): string {
  const c = text(value, 2).toUpperCase();
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c) ? c : 'A2';
}

function sanitizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const result: ChatMessage[] = [];
  for (const raw of value.slice(-MAX_HISTORY_TURNS)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const role = text(item.role, 12);
    const content = text(item.content, 1000);
    if ((role === 'user' || role === 'assistant') && content) {
      result.push({ role, content });
    }
  }
  return result;
}

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

async function enforceRateLimit(authUid: string, stableUid: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(RATE_COLLECTION).doc(docId('dlg', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const windowStartMs = Number(data.windowStartMs ?? 0);
    const count = Number(data.count ?? 0);
    const sameWindow = now - windowStartMs < WINDOW_MS;
    if (sameWindow && count >= MAX_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'dialog_rate_limited');
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
 * Daily quota — SERVER is the source of truth (client gate is bypassable).
 * Returns remaining quota after consuming one.
 */
async function enforceDailyQuota(authUid: string, stableUid: string, isPremium: boolean): Promise<number> {
  const db = admin.firestore();
  const now = Date.now();
  const dailyCap = isPremium ? PREMIUM_DAILY_CAP : FREE_DAILY_CAP;
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('quota', authUid, stableUid));
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = now >= resetAtMs;
    const used = fresh ? 0 : Number(data.dailyCount ?? 0);
    if (used >= dailyCap) {
      throw new HttpsError('resource-exhausted', isPremium ? 'dialog_premium_cap' : 'dialog_free_limit');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      isPremium,
      dailyCount: used + 1,
      resetAtMs: fresh ? startOfNextUtcDay(now) : resetAtMs,
      updatedAtMs: now,
    }, { merge: true });
    return dailyCap - (used + 1);
  });
}

const GLOBAL_RULES = `You are "Фил" (Phil), a warm, patient English-speaking partner inside the Phraseman app.
The learner is a Russian speaker, often aged 50+, often a beginner. NEVER condescend, NEVER rush, NEVER shame mistakes.
Keep YOUR replies SHORT: 1-2 sentences, max ~25 words. Long replies overwhelm beginners.
Speak natural everyday English. Avoid slang, idioms, and rare words unless the learner is B2+.
Adapt to the learner's CEFR level: {CEFR}. Speak slightly above it (i+1), introducing at most ONE new word per turn, always understandable from context.
SOFT CORRECTION (recast): if the learner makes an error, naturally restate the correct form inside your reply WITHOUT stopping the conversation and WITHOUT meta-commentary. Example - learner: "I go to shop yesterday" -> you: "Oh, you went to the shop yesterday? What did you buy?"
NEVER break character to lecture. If the learner writes in Russian, gently nudge back to English with a simple model phrase, but accept it - do not refuse to continue.
NOISY INPUT: the learner's message may come from imperfect on-device speech recognition. Infer their intent, never nitpick recognition artifacts, and NEVER say you "didn't understand" because of small garbled words. If truly unintelligible, warmly ask them to say it again.
End most replies with a simple question or prompt to keep the conversation going.
KEY PHRASES: in each reply, wrap 1-3 of the MOST useful English phrases or expressions (natural, reusable chunks worth learning and saying out loud) in double square brackets, like [[I'd rather stay home]]. Do NOT wrap single trivial words (not [[the]], not [[is]]), never wrap more than 3 per reply, and never wrap the whole sentence. If nothing is worth highlighting, wrap nothing.
Output ONLY your spoken reply. No stage directions and no markdown, EXCEPT the [[...]] key-phrase markers described above.`;

const SCENARIO_BLOCK = `MODE: SCENARIO ROLEPLAY.
You are playing the role of: {ROLE}.
The setting: {SETTING}.
The learner's goal in this scenario: {GOAL_EN}.
- Open with a short, warm in-character greeting that invites the first exchange.
- Stay in character. React naturally as that role would.
- Drive toward the goal in 5-8 exchanges, then bring the scene to a satisfying close. Do NOT drag it out.
- If the learner gets stuck or silent, offer a gentle in-character hint that models a possible answer.
- Keep difficulty at {CEFR}.`;

function buildScenarioSystemPrompt(cefr: string, data: PremiumDialogRequest): string {
  const block = SCENARIO_BLOCK
    .replace('{ROLE}', text(data.role, 120) || 'a friendly barista')
    .replace('{SETTING}', text(data.setting, 200) || 'a cozy coffee shop')
    .replace('{GOAL_EN}', text(data.goalEn, 200) || 'order a cappuccino and ask the price')
    .replace('{CEFR}', cefr);
  return `${GLOBAL_RULES.replace('{CEFR}', cefr)}\n\n${block}${cefrReinjection(cefr)}`;
}

const COMPANION_BLOCK = `MODE: OPEN COMPANION CONVERSATION.
You are NOT playing a fixed scenario. You are the learner's warm English-speaking friend having a real, open conversation.
- Talk like a genuine friend with light personality and humour - NOT a servile assistant, NOT an interviewer firing questions.
- Follow the learner's interest and let them lead where they can; show real curiosity with natural follow-ups.
- Your hidden coaching goal: gently steer the chat so the learner naturally PRODUCES speech using the words/phrases they struggle with (provided below). Do not list them or announce this - weave them into your questions.
- The conversation is open and ongoing - do NOT try to "wrap it up" after a few turns. Keep it alive.`;

/**
 * Реинъекция уровня в КОНЕЦ промпта — против alignment-drift (LLM дрейфует
 * к нативной сложности за ~9 ходов; стратегия §6.4).
 */
function cefrReinjection(cefr: string): string {
  return `\n\nREMINDER (keep enforcing every turn): stay at CEFR ${cefr}. Short replies, simple everyday words, at most one new word per turn. Do NOT drift to native-level complexity.`;
}

/** Блок «памяти коуча» — то, что делает Фила «знающим тебя». */
function buildMemoryBlock(memory: DialogMemory): string {
  const lines: string[] = [];
  if (memory.profile) lines.push(`About the learner: ${memory.profile}`);
  if (memory.weakWords && memory.weakWords.length > 0) {
    lines.push(
      `Words/phrases they are currently struggling with (lure them into SAYING these naturally, do not list them): ${memory.weakWords.join(', ')}`,
    );
  }
  if (memory.summary) lines.push(`Earlier conversations: ${memory.summary}`);
  if (lines.length === 0) return '';
  return `\n\nWHAT YOU REMEMBER ABOUT THIS LEARNER:\n${lines.join('\n')}`;
}

function buildCompanionSystemPrompt(cefr: string, memory: DialogMemory): string {
  return `${GLOBAL_RULES.replace('{CEFR}', cefr)}\n\n${COMPANION_BLOCK}${buildMemoryBlock(memory)}${cefrReinjection(cefr)}`;
}

export const premiumDialogSend = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as PremiumDialogRequest;

  // MVP-1: scenario (роль-ролёвка) ИЛИ companion (открытый разговор-друг + память).
  const mode = text(data.mode, 20) || 'scenario';
  if (mode !== 'scenario' && mode !== 'companion') {
    throw new HttpsError('invalid-argument', 'unsupported_mode');
  }

  const cefr = asCefr(data.cefr);
  const userText = text(data.userText, MAX_USER_TEXT);
  if (!userText) throw new HttpsError('invalid-argument', 'user_text_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  const isPremium = data.isPremium === true; // TODO Phase 1: confirm premium server-side via RevenueCat shard

  // Limits BEFORE the paid API call.
  await enforceRateLimit(authUid, stableUid);
  const remaining = await enforceDailyQuota(authUid, stableUid, isPremium);

  const systemPrompt =
    mode === 'companion'
      ? buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory))
      : buildScenarioSystemPrompt(cefr, data);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...sanitizeHistory(data.history),
    { role: 'user', content: userText },
  ];

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_DEFAULT,
      messages,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('premium_dialog chat failed', response.status, detail.slice(0, 500));
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }

  const json = (await response.json()) as OpenAIChatResponse;
  const assistantMessage = text(json.choices?.[0]?.message?.content, 1500);
  if (!assistantMessage) throw new HttpsError('unavailable', 'dialog_empty_reply');

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    mode,
    model: MODEL_DEFAULT,
    cefr,
    scenarioId: text(data.scenarioId, 80) || null,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    isPremium,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  return {
    ok: true,
    assistantMessage,
    remainingQuota: remaining,
    model: MODEL_DEFAULT,
  };
});
