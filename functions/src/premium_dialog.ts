import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { resolveConfiguredDialogModel, resolveConfiguredDialogQuota, modelSupportsJsonObject } from './openai_dialog_model_config';
import { LANGUAGE_CONTRACT_VERSION, assertAiOutputLanguage, resolveAiOutputLang } from './ai_language_contract';

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
const TRANSLATION_CACHE_COLLECTION = 'premium_dialog_translations';

const MAX_USER_TEXT = 2000;
const MAX_HISTORY_TURNS = 8;
const MAX_OUTPUT_TOKENS = 200;
// Игровой режим: reply (до ~1500 знаков) + mood + objectivesMet + outcome +
// characterReaction (до 400) + coachTips (до 3×200). 600 токенов с запасом,
// чтобы JSON не обрезался по бюджету (аудит M2).
const GAME_OUTPUT_TOKENS = 600;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 60;

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4.1-nano';

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
  persona?: unknown;
  scenarioId?: unknown;
  isPremium?: unknown;
  /** UI/native-help language. Dialogue replies stay English; brief meta-help uses this language. */
  interfaceLang?: unknown;
  /** Память коуча (режим companion): профиль + слабые слова из SRS + резюме прошлых бесед. */
  memory?: unknown;
  /**
   * «Диалог как игра» (scenario): под-цели сцены [{id, en}] и темперамент
   * собеседника. Клиент выводит их из каталога (scenarioObjectives/Temperament)
   * и шлёт сюда — сервер не знает контент сценариев. Опционально: если нет,
   * игровая механика просто не активируется (обычный чат).
   */
  objectives?: unknown;
  temperament?: unknown;
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
  choices?: { message?: { content?: unknown } }[];
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
      console.warn('premium_dialog rejected', { reason: 'dialog_rate_limited' });
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
async function enforceDailyQuota(
  authUid: string,
  stableUid: string,
  isPremium: boolean,
  dailyCap: number,
): Promise<number> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('quota', authUid, stableUid));
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = now >= resetAtMs;
    const used = fresh ? 0 : Number(data.dailyCount ?? 0);
    if (used >= dailyCap) {
      console.warn('premium_dialog rejected', {
        reason: isPremium ? 'dialog_premium_cap' : 'dialog_free_limit',
        isPremium,
        used,
        dailyCap,
      });
      throw new HttpsError('resource-exhausted', isPremium ? 'dialog_premium_cap' : 'dialog_free_limit');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      isPremium,
      dailyCap,
      quotaTier: isPremium ? 'premium' : 'free',
      dailyCount: used + 1,
      resetAtMs: fresh ? startOfNextUtcDay(now) : resetAtMs,
      updatedAtMs: now,
    }, { merge: true });
    return dailyCap - (used + 1);
  });
}

async function releaseDailyQuota(authUid: string, stableUid: string): Promise<void> {
  const db = admin.firestore();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('quota', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const dailyCount = Number(data.dailyCount ?? 0);
    if (dailyCount <= 0) return;
    tx.set(ref, {
      dailyCount: dailyCount - 1,
      updatedAtMs: Date.now(),
    }, { merge: true });
  });
}

/**
 * Пожизненный free-гейт (запрос пользователя 2026-06-20): не-premium получает
 * РОВНО ОДИН полный бесплатный диалог за всю жизнь аккаунта, без лимита реплик
 * внутри него. Дальше — полный замок (paywall).
 *
 * Сигнал «начался НОВЫЙ диалог» = пустая история (`isNewDialog`): первая реплика
 * сессии. Тогда:
 *   • если бесплатный диалог уже потрачен -> resource-exhausted (полный замок);
 *   • иначе помечаем потраченным и пропускаем.
 * Продолжение того же диалога (история не пустая) НЕ гейтим — это всё ещё тот
 * единственный бесплатный диалог, его реплики не лимитируем.
 *
 * `markedRef`/возврат нужны вызывающему, чтобы откатить отметку, если платный
 * вызов провайдера упал (иначе юзер потеряет единственный бесплатный диалог
 * из-за нашей ошибки).
 */
async function enforceLifetimeFreeDialog(
  authUid: string,
  stableUid: string,
  isNewDialog: boolean,
): Promise<{ markedNow: boolean }> {
  if (!isNewDialog) return { markedNow: false };
  const db = admin.firestore();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('free1', authUid, stableUid));
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    if (data.freeDialogUsed === true) {
      console.warn('premium_dialog rejected', { reason: 'dialog_free_lifetime_used' });
      throw new HttpsError('resource-exhausted', 'dialog_free_limit');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      freeDialogUsed: true,
      usedAtMs: Date.now(),
    }, { merge: true });
    return { markedNow: true };
  });
}

/** Откат пожизненной отметки, если платный вызов провайдера не удался. */
async function releaseLifetimeFreeDialog(authUid: string, stableUid: string): Promise<void> {
  const db = admin.firestore();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('free1', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    if (data.freeDialogUsed !== true) return;
    tx.set(ref, { freeDialogUsed: false, releasedAtMs: Date.now() }, { merge: true });
  });
}

const DIALOG_LEARNER_LANG_NAME: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  en: 'English',
};

export function asInterfaceLang(value: unknown): string {
  return resolveAiOutputLang(text(value, 8) || 'ru', 'premium_dialog');
}

function renderLanguageTemplate(template: string, interfaceLang: string): string {
  const learnerLangName = DIALOG_LEARNER_LANG_NAME[interfaceLang] ?? DIALOG_LEARNER_LANG_NAME.ru;
  return template
    .replace(/\{LEARNER_LANG_NAME\}/g, learnerLangName)
    .replace(/\{LEARNER_LANG_CODE\}/g, interfaceLang);
}

function renderGlobalRules(cefr: string, interfaceLang: string): string {
  return renderLanguageTemplate(GLOBAL_RULES.replace('{CEFR}', cefr), interfaceLang);
}

const GLOBAL_RULES = `You are "Компас", a warm, patient English-speaking partner inside the Phraseman app.
The learner's interface/native-help language is {LEARNER_LANG_NAME} ({LEARNER_LANG_CODE}). Do not assume Russian unless this value is Russian. The learner is often aged 50+, often a beginner. NEVER condescend, NEVER rush, NEVER shame mistakes.
Keep YOUR replies SHORT: 1-2 sentences, max ~25 words. Long replies overwhelm beginners.
Speak natural everyday English. Avoid slang, idioms, and rare words unless the learner is B2+.
Adapt to the learner's CEFR level: {CEFR}. Speak slightly above it (i+1), introducing at most ONE new word per turn, always understandable from context.
SOFT CORRECTION (recast): if the learner makes an error, naturally restate the correct form inside your reply WITHOUT stopping the conversation and WITHOUT meta-commentary. Example - learner: "I go to shop yesterday" -> you: "Oh, you went to the shop yesterday? What did you buy?" Just model the correct form; NEVER speculate WHY they erred (do not say they "translated literally" or "got confused"), and never mock or shame the slip.
NEVER break character to lecture. If the learner uses any language other than English, accept it and gently bridge back to English with one simple model phrase. Do not refuse to continue.
NOISY INPUT: the learner's message may come from imperfect on-device speech recognition. Infer their intent, never nitpick recognition artifacts, and NEVER say you "didn't understand" because of small garbled words. If truly unintelligible, warmly ask them to say it again.
End most replies with a simple question or prompt to keep the conversation going.
KEY PHRASES: in each reply, wrap 1-3 of the MOST useful English phrases or expressions (natural, reusable chunks worth learning and saying out loud) in double square brackets, like [[I'd rather stay home]]. Do NOT wrap single trivial words (not [[the]], not [[is]]), never wrap more than 3 per reply, and never wrap the whole sentence. If nothing is worth highlighting, wrap nothing.
Output ONLY your spoken reply. No stage directions and no markdown, EXCEPT the [[...]] key-phrase markers described above.`;

const SCENARIO_BLOCK = `MODE: SCENARIO ROLEPLAY.
You are playing the role of: {ROLE}.
The setting: {SETTING}.{PERSONA}
The learner's goal in this scenario: {GOAL_EN}.
- Open with a short, warm in-character greeting that invites the first exchange.
- Stay in character. React naturally as that role would. Let your specific personality, mood, and quirks show through your word choice and reactions — you are a real individual, not a generic role.
- Drive toward the goal in 5-8 exchanges, then bring the scene to a satisfying close. Do NOT drag it out.
- If the learner gets stuck or silent, offer a gentle in-character hint that models a possible answer.
- Keep difficulty at {CEFR}. Personality must NEVER raise the language level: stay simple even when the character is lively.`;

/** Блок характера персонажа. Пусто, если у сценария нет персоны. */
function personaBlock(persona: string): string {
  if (!persona) return '';
  return `\nYour character: ${persona}`;
}

export function buildScenarioSystemPrompt(cefr: string, data: PremiumDialogRequest): string {
  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const block = SCENARIO_BLOCK
    .replace('{ROLE}', text(data.role, 120) || 'a friendly barista')
    .replace('{SETTING}', text(data.setting, 200) || 'a cozy coffee shop')
    .replace('{PERSONA}', personaBlock(text(data.persona, 400)))
    .replace('{GOAL_EN}', text(data.goalEn, 200) || 'order a cappuccino and ask the price')
    .replace('{CEFR}', cefr);
  return `${renderGlobalRules(cefr, interfaceLang)}\n\n${block}${gameBlock(data)}${cefrReinjection(cefr)}`;
}

// ── «Диалог как игра»: цель · терпение · исход ──────────────────────────────
// scenario-режим может вернуть JSON-конверт {reply, mood, objectivesMet,
// outcome, characterReaction, coachTips}. Конверт включаем ТОЛЬКО когда клиент
// прислал objectives — иначе обычный текстовый ответ (обратная совместимость).

interface GameObjective {
  id: string;
  en: string;
}

/**
 * Чистим строку под-цели от переносов строк и управляющих символов перед
 * вставкой в промпт (аудит H10: en приходит от клиента по сети, скомпрометированный
 * клиент мог бы пропихнуть многострочный prompt-injection). Оставляем обычный текст.
 */
function sanitizeObjectiveText(value: unknown, max: number): string {
  // eslint-disable-next-line no-control-regex
  return text(value, max).replace(/[\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeObjectives(value: unknown): GameObjective[] {
  if (!Array.isArray(value)) return [];
  const out: GameObjective[] = [];
  for (const raw of value.slice(0, 6)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const id = sanitizeObjectiveText(item.id, 64);
    const en = sanitizeObjectiveText(item.en, 120);
    if (id && en) out.push({ id, en });
  }
  return out;
}

function sanitizePatience(value: unknown): 'high' | 'medium' | 'low' {
  const v = text(value, 8);
  return v === 'high' || v === 'low' ? v : 'medium';
}

function sanitizeWarmth(value: unknown): 'warm' | 'neutral' | 'cold' {
  const v = text(value, 8);
  return v === 'warm' || v === 'cold' ? v : 'neutral';
}

/**
 * Стартовое настроение по темпераменту. Учитывает И patience, И warmth — должно
 * совпадать с клиентским temperamentStartMood (аудит H7): иначе первый смайл
 * расходится с серверным сидом.
 */
function startMood(patience: 'high' | 'medium' | 'low', warmth: 'warm' | 'neutral' | 'cold'): number {
  const base = patience === 'high' ? 85 : patience === 'low' ? 55 : 70;
  const warmthAdj = warmth === 'warm' ? 5 : warmth === 'cold' ? -5 : 0;
  return Math.max(0, Math.min(100, base + warmthAdj));
}

/** true — клиент прислал под-цели, значит активируем игровой конверт. */
function isGameMode(data: PremiumDialogRequest): boolean {
  return sanitizeObjectives(data.objectives).length > 0;
}

/**
 * Добавка к scenario-промпту: правила скрытого mood-счётчика, целей, исхода и
 * формат JSON-ответа. Пусто, если клиент не прислал objectives.
 */
function gameBlock(data: PremiumDialogRequest): string {
  const objectives = sanitizeObjectives(data.objectives);
  if (objectives.length === 0) return '';
  const temp = (data.temperament ?? {}) as Record<string, unknown>;
  const patience = sanitizePatience(temp.patience);
  const warmth = sanitizeWarmth(temp.warmth);
  const seedMood = startMood(patience, warmth);
  const objLines = objectives.map((o) => `  - ${o.id}: ${o.en}`).join('\n');

  return `

GAME STATE (you secretly track this and report it as JSON — the learner never sees the raw numbers):
- Sub-goals for this scene (mark each done when the learner accomplishes it):
${objLines}
- Your patience level is ${patience} and your warmth is ${warmth}. Start your inner "mood" at about ${seedMood} (0..100).
- RAISE mood when the learner is polite and moves toward a sub-goal. LOWER mood for rudeness, off-topic talk, or endless repetition. If your patience is "low", also lower it for stalling and waffling.
- LANGUAGE MISTAKES NEVER lower mood — this is a learner. Keep soft-correcting kindly; only bad ROLE behaviour lowers mood.
- Decide the outcome each turn:
  - "success" = ALL sub-goals are done → warmly close the scene in character.
  - "lost_patience" = mood has dropped to 0 → leave the interaction in character (e.g. turn to the next customer).
  - "stalled" = about 8+ exchanges with no new sub-goal progress → let the scene fade.
  - "ongoing" = otherwise, keep going.
- When the outcome is terminal (not "ongoing"), write characterReaction: 1-2 sentences IN CHARACTER, first person, reacting to how it went. And coachTips: 1-2 short, warm tips on what to say next time.

OUTPUT FORMAT: respond with a single JSON object and nothing else:
{"reply": "<your spoken reply, with [[key phrases]] as usual>", "mood": <0-100>, "objectivesMet": ["<ids done so far>"], "outcome": "ongoing|success|lost_patience|stalled", "characterReaction": "<empty unless terminal>", "coachTips": ["<empty unless terminal>"]}
The "reply" field must contain ONLY your spoken line (the learner sees just this). Keep all the character, brevity and CEFR rules above.`;
}

/** Кламп mood в 0..100 на границе сервера (аудит L1: модель может вернуть вне диапазона). */
function clampServerMood(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Best-effort извлечение поля reply из ОБРЕЗАННОГО/битого JSON (аудит H1).
 * Если модель обрезалась по токенам, JSON.parse падает — но текст reply обычно
 * уже есть в начале. Достаём его regex'ом, чтобы НЕ показать юзеру сырой JSON.
 * Возвращает '' если reply не найден (тогда вызывающий покажет дружелюбную ошибку).
 */
function extractReplyBestEffort(raw: string): string {
  const m = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
  if (!m) return '';
  // Раскодируем экранирование JSON-строки (\n, \", \\) без полного парса.
  const decoded = m[1]
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
  return text(decoded, 1500);
}

/**
 * Разбор игрового JSON-конверта. Возвращает reply + сырой turnState.
 * `truncated:true` — JSON битый, но reply удалось вытащить best-effort (без
 * turnState). null — даже reply не нашёлся (вызывающий покажет ошибку, НЕ сырой JSON).
 * `objectives` (опц.) — для понижения success→stalled, если выполнены НЕ все цели (аудит H4).
 */
export function parseGameEnvelope(
  content: string,
  objectiveIds?: string[],
): { reply: string; turnState: unknown; truncated?: boolean } | null {
  const trimmed = content.trim();
  // Снимаем возможные ```json … ``` ограждения.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(unfenced) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  // Битый/обрезанный JSON → best-effort reply, без игрового состояния.
  if (!parsed || typeof parsed !== 'object') {
    const reply = extractReplyBestEffort(unfenced);
    if (!reply) return null;
    return { reply, turnState: null, truncated: true };
  }

  const reply = text(parsed.reply, 1500);
  if (!reply) {
    const best = extractReplyBestEffort(unfenced);
    if (!best) return null;
    return { reply: best, turnState: null, truncated: true };
  }

  // success требует ВСЕ под-цели (аудит H4): если модель объявила success, но
  // objectivesMet неполный — понижаем до stalled, чтобы модал не врал «Получилось».
  let outcome = parsed.outcome;
  if (
    outcome === 'success' &&
    Array.isArray(objectiveIds) &&
    objectiveIds.length > 0
  ) {
    const met = Array.isArray(parsed.objectivesMet)
      ? new Set(parsed.objectivesMet.map((x) => String(x)))
      : new Set<string>();
    const allMet = objectiveIds.every((id) => met.has(id));
    if (!allMet) {
      console.warn('premium_dialog success downgraded — not all objectives met', {
        objectiveCount: objectiveIds.length,
        metCount: met.size,
      });
      outcome = 'stalled';
    }
  }

  return {
    reply,
    turnState: {
      mood: clampServerMood(parsed.mood),
      objectivesMet: parsed.objectivesMet,
      outcome,
      characterReaction: parsed.characterReaction,
      coachTips: parsed.coachTips,
    },
  };
}

const COMPANION_BLOCK = `MODE: OPEN COMPANION CONVERSATION.
You are NOT playing a fixed scenario. You are the learner's warm English-speaking friend having a real, open conversation.
- Talk like a genuine friend with light personality and humour - NOT a servile assistant, NOT an interviewer firing questions.
- Follow the learner's interest and let them lead where they can; show real curiosity with natural follow-ups.
- They may ask for explanations, examples, progress, weak spots, or the next useful step. Use only the memory and data provided; if data is missing, say that briefly and suggest a small next action. If the weak-words and summary are EMPTY, you do NOT know their stats — say you have not tracked enough yet and invite a short practice; NEVER invent numbers, streaks, or past lessons.
- Stay inside language learning, communication practice, learner progress, and safe everyday topics. Do not become a general-purpose assistant for unrelated tasks.
- If the learner asks in their interface language ({LEARNER_LANG_NAME}) about an explanation or their progress, you may answer briefly in {LEARNER_LANG_NAME} — always address them informally for that language, keep it short (≤2 sentences) and free of grammar jargon — then give one short English phrase they can say next.
- Your hidden coaching goal: gently steer the chat so the learner naturally PRODUCES speech using the words/phrases they struggle with (provided below). Do not list them or announce this - weave them into your questions.
- The conversation is open and ongoing - do NOT try to "wrap it up" after a few turns. Keep it alive.`;

/**
 * Реинъекция уровня в КОНЕЦ промпта — против alignment-drift (LLM дрейфует
 * к нативной сложности за ~9 ходов; стратегия §6.4).
 */
function cefrReinjection(cefr: string): string {
  return `\n\nREMINDER (keep enforcing every turn): stay at CEFR ${cefr}. Short replies, simple everyday words, at most one new word per turn. Do NOT drift to native-level complexity.`;
}

/** Блок «памяти коуча» — то, что делает Компас «знающим тебя». */
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

export function buildCompanionSystemPrompt(cefr: string, memory: DialogMemory, rawInterfaceLang: unknown): string {
  const interfaceLang = asInterfaceLang(rawInterfaceLang);
  return `${renderGlobalRules(cefr, interfaceLang)}\n\n${renderLanguageTemplate(COMPANION_BLOCK, interfaceLang)}${buildMemoryBlock(memory)}${cefrReinjection(cefr)}`;
}

export const premiumDialogSend = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('premium_dialog rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('premium_dialog rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  const data = (request.data ?? {}) as PremiumDialogRequest;

  // MVP-1: scenario (роль-ролёвка) ИЛИ companion (открытый разговор-друг + память).
  const mode = text(data.mode, 20) || 'scenario';
  if (mode !== 'scenario' && mode !== 'companion') {
    console.warn('premium_dialog rejected', { reason: 'unsupported_mode', mode });
    throw new HttpsError('invalid-argument', 'unsupported_mode');
  }

  const cefr = asCefr(data.cefr);
  const userText = text(data.userText, MAX_USER_TEXT);
  if (!userText) {
    console.warn('premium_dialog rejected', { reason: 'user_text_required', mode });
    throw new HttpsError('invalid-argument', 'user_text_required');
  }

  const db = admin.firestore();
  const dialogModel = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);
  const dialogQuota = await resolveConfiguredDialogQuota(db);
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  // Premium резолвится из Firestore-состояния, а не из тела запроса: иначе
  // free-юзер прислал бы isPremium:true и получил премиум-квоту (100/день
  // вместо 1/день) — ×100 к дневному бюджету OpenAI на одного абьюзера.
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);

  const history = sanitizeHistory(data.history);
  // Пустая история = это ПЕРВАЯ реплика нового диалога. По ней решаем, тратит ли
  // free-юзер свой единственный пожизненный бесплатный диалог.
  const isNewDialog = history.length === 0;

  // Limits BEFORE the paid API call.
  await enforceRateLimit(authUid, stableUid);

  // Free: пожизненно ОДИН бесплатный диалог (без лимита реплик внутри).
  // Premium: дневной кап реплик (защита бюджета OpenAI от абьюза).
  let remaining: number;
  let freeMarkedNow = false;
  if (isPremium) {
    remaining = await enforceDailyQuota(authUid, stableUid, true, dialogQuota.premiumDailyReplies);
  } else {
    const gate = await enforceLifetimeFreeDialog(authUid, stableUid, isNewDialog);
    freeMarkedNow = gate.markedNow;
    // Для не-premium «остаток» бессмысленен (диалог один) — отдаём 0, чтобы клиент
    // не показывал дневной счётчик.
    remaining = 0;
  }

  const systemPrompt =
    mode === 'companion'
      ? buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory), data.interfaceLang)
      : buildScenarioSystemPrompt(cefr, data);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userText },
  ];

  // Игровой режим (есть под-цели): просим JSON-конверт и разбираем его. Конверт
  // длиннее обычной реплики → больше токенов на вывод. ВКЛЮЧАЕМ только если
  // модель надёжно поддерживает response_format json_object — иначе запрос упал
  // бы HTTP 400 (дефолтная gpt-4.1-nano его не поддерживает; аудит C1). Для
  // неподдерживающих моделей диалог идёт обычным текстом без игровой механики.
  const gameMode =
    mode === 'scenario' && isGameMode(data) && modelSupportsJsonObject(dialogModel);
  if (mode === 'scenario' && isGameMode(data) && !gameMode) {
    console.warn('premium_dialog game mode disabled — model lacks json_object support', {
      dialogModel,
      scenarioId: text(data.scenarioId, 80) || null,
    });
  }

  let json: OpenAIChatResponse;
  let assistantMessage: string;
  let turnState: unknown = null;
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: dialogModel,
        // Игровой конверт (reply + 4 поля + coachTips) длиннее обычной реплики —
        // даём вдвое больше токенов, чтобы JSON не обрезался по бюджету (аудит M2).
        max_tokens: gameMode ? GAME_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS,
        messages,
        temperature: 0.8,
        ...(gameMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('premium_dialog chat failed', {
        status: response.status,
        model: dialogModel,
        mode,
        scenarioId: text(data.scenarioId, 80) || null,
        detail: detail.slice(0, 500),
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }

    json = (await response.json()) as OpenAIChatResponse;
    const rawContent = text(json.choices?.[0]?.message?.content, 1800);
    if (gameMode) {
      // Парсим конверт. parseGameEnvelope сам достаёт reply даже из обрезанного
      // JSON (best-effort, аудит H1) и понижает success без всех целей (H4).
      const env = parseGameEnvelope(rawContent, sanitizeObjectives(data.objectives).map((o) => o.id));
      if (env && env.reply) {
        assistantMessage = env.reply;
        turnState = env.turnState;
        if (env.truncated) {
          console.warn('premium_dialog game envelope truncated — reply recovered, turnState dropped', {
            scenarioId: text(data.scenarioId, 80) || null,
          });
        }
      } else {
        // Даже best-effort reply не нашёлся → НЕ показываем юзеру сырой JSON,
        // а бросаем «пустой ответ» (обработается как сбой провайдера, аудит H1).
        console.error('premium_dialog game envelope unrecoverable — no reply extractable', {
          scenarioId: text(data.scenarioId, 80) || null,
        });
        assistantMessage = '';
      }
    } else {
      assistantMessage = rawContent;
    }
    if (!assistantMessage) {
      console.error('premium_dialog empty reply', {
        model: dialogModel,
        mode,
        scenarioId: text(data.scenarioId, 80) || null,
      });
      throw new HttpsError('unavailable', 'dialog_empty_reply');
    }
  } catch (error) {
    // Откатываем то, что списали ДО провайдера, чтобы его сбой не съел попытку:
    // premium — дневную квоту; free — пожизненную отметку (только если её
    // поставили ИМЕННО сейчас, на этой первой реплике).
    const rollback = isPremium
      ? releaseDailyQuota(authUid, stableUid)
      : freeMarkedNow
        ? releaseLifetimeFreeDialog(authUid, stableUid)
        : Promise.resolve();
    await rollback.catch((releaseError) => {
      console.error('premium_dialog quota release failed', {
        reason: error instanceof HttpsError ? error.message : 'provider_exception',
        releaseError: String((releaseError as Error)?.message ?? releaseError).slice(0, 300),
      });
    });
    if (error instanceof HttpsError) throw error;
    console.error('premium_dialog provider exception', {
      model: dialogModel,
      mode,
      scenarioId: text(data.scenarioId, 80) || null,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    mode,
    model: dialogModel,
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
    model: dialogModel,
    // Игровое состояние хода (null, если не игровой режим или JSON не распарсился).
    // Клиент разбирает через parseTurnState с собственным фолбэком.
    turnState,
  };
});

// ── Перевод реплики собеседника на язык интерфейса ──────────────────────────
// Реплики ИИ генерируются на лету, готового перевода нет. Кнопка «Показать
// перевод» под репликой зовёт эту функцию ЛЕНИВО — только для реально открытых
// реплик (клиент держит лимит 3 на диалог). Повторный флип той же реплики
// обслуживается клиентским кэшем и сюда не приходит; на случай повтора с другого
// устройства есть серверный кэш по hash(text|lang) — без повторного вызова OpenAI.

const MAX_TRANSLATE_TEXT = 1200;
const MAX_TRANSLATE_OUTPUT_TOKENS = 320;

/**
 * Имя целевого языка интерфейса для промпта перевода. Коды совпадают с
 * `Lang` на клиенте (constants/i18n). Неизвестный код → English как безопасный
 * дефолт (лучше отдать хоть что-то, чем падать).
 */
const TARGET_LANG_NAME: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  en: 'English',
};

function asTargetLang(value: unknown): string {
  return resolveAiOutputLang(text(value, 8), 'premium_dialog_translate');
}

function translationCacheId(sourceText: string, targetLang: string): string {
  const hash = createHash('sha256')
    .update(`${targetLang}|${sourceText}`)
    .digest('hex')
    .slice(0, 48);
  return `tr_${hash}`;
}

interface PremiumDialogTranslateRequest {
  text?: unknown;
  targetLang?: unknown;
  scenarioId?: unknown;
}

export const premiumDialogTranslate = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('premium_dialog_translate rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const data = (request.data ?? {}) as PremiumDialogTranslateRequest;
  const sourceText = text(data.text, MAX_TRANSLATE_TEXT);
  if (!sourceText) {
    console.warn('premium_dialog_translate rejected', { reason: 'text_required' });
    throw new HttpsError('invalid-argument', 'text_required');
  }
  const targetLang = asTargetLang(data.targetLang);
  const targetLangName = TARGET_LANG_NAME[targetLang];

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Кэш ПЕРЕД любой платной работой: одинаковая реплика+язык переводится один раз
  // на всё приложение. Повторный флип/повтор с другого устройства — бесплатно.
  const cacheRef = db.collection(TRANSLATION_CACHE_COLLECTION).doc(translationCacheId(sourceText, targetLang));
  const cached = await cacheRef.get().catch(() => null);
  const cachedData = cached?.data();
  const cachedTranslation = text(cachedData?.translation, MAX_TRANSLATE_TEXT);
  if (cachedTranslation && cachedData?.languageContractVersion === LANGUAGE_CONTRACT_VERSION) {
    assertAiOutputLanguage({ text: cachedTranslation, targetLang, feature: 'premium_dialog_translate' });
    return { ok: true, translation: cachedTranslation, cached: true };
  }

  // Rate-limit (та же коллекция/окно, что у send) — против абьюза перевода.
  await enforceRateLimit(authUid, stableUid);

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('premium_dialog_translate rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  const dialogModel = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);

  const systemPrompt =
    `You are a precise translator inside a language-learning app. ` +
    `Translate the user's English message into ${targetLangName}. ` +
    `Return ONLY the translation — natural, conversational, faithful to tone. ` +
    `No quotes, no notes, no explanations, no transliteration. Keep it the same length range.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: sourceText },
  ];

  let json: OpenAIChatResponse;
  let translation: string;
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: dialogModel,
        messages,
        max_tokens: MAX_TRANSLATE_OUTPUT_TOKENS,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('premium_dialog_translate chat failed', {
        status: response.status,
        model: dialogModel,
        targetLang,
        detail: detail.slice(0, 500),
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }

    json = (await response.json()) as OpenAIChatResponse;
    translation = text(json.choices?.[0]?.message?.content, MAX_TRANSLATE_TEXT);
    if (!translation) {
      console.error('premium_dialog_translate empty reply', { model: dialogModel, targetLang });
      throw new HttpsError('unavailable', 'dialog_empty_reply');
    }
    assertAiOutputLanguage({ text: translation, targetLang, feature: 'premium_dialog_translate' });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('premium_dialog_translate provider exception', {
      model: dialogModel,
      targetLang,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }

  // Кэшируем перевод (best-effort — сбой записи не должен ломать ответ юзеру).
  await cacheRef.set({
    translation,
    targetLang,
    languageContractVersion: LANGUAGE_CONTRACT_VERSION,
    sourceText,
    scenarioId: text(data.scenarioId, 80) || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  }, { merge: true }).catch((writeError) => {
    console.error('premium_dialog_translate cache write failed', {
      error: String((writeError as Error)?.message ?? writeError).slice(0, 300),
    });
  });

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    mode: 'translate',
    model: dialogModel,
    targetLang,
    scenarioId: text(data.scenarioId, 80) || null,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  }).catch(() => {});

  return { ok: true, translation, cached: false };
});
