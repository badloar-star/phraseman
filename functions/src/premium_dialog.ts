import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { resolveConfiguredDialogModel, resolveConfiguredDialogQuota, modelSupportsJsonObject } from './openai_dialog_model_config';
import { resolveRemoteBool, aiGloballyDisabled } from './remote_gates';
import { LANGUAGE_CONTRACT_VERSION, assertAiOutputLanguage, assertAiStudyLanguage, resolveAiOutputLang, resolveStudyTarget, studyTargetName, type StudyTarget } from './ai_language_contract';
import { evaluateSafety, moderateUserText, recordSafetyFlag, SAFETY_SYSTEM_INSTRUCTION } from './ai_safety';
import { ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import {
  canonicalizeDialogTurnState,
  sanitizeDialogGameState,
  type SanitizedDialogGameState,
} from './premium_dialog_quality';

// A targeted/isolated deployment can load this module directly instead of lib/index.js.
// Keep the bootstrap idempotent so both entry points share the same default Admin app.
if (!admin.apps.length) admin.initializeApp();

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
export const BILLING_COLLECTION = 'premium_dialog_billing';
const TRANSLATION_CACHE_COLLECTION = 'premium_dialog_translations';

const MAX_USER_TEXT = 2000;
// ПЕРФ: 8 ходов x 1000 знаков давали до ~2000 токенов ввода на КАЖДУЮ реплику —
// это и деньги, и время предзаполнения (ощущается как «ИИ долго думает»).
// зачем (аудит повторов 2026-08-30): 4 сообщения означали только 2 обмена —
// модель забывала уже выполненную цель и возвращалась к прежнему вопросу.
// 8 x 300 сохраняют 4 обмена, а накопительный gameState несёт более старые факты.
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_CONTENT = 300;
export const MAX_OUTPUT_TOKENS = 200;
// Игровой режим: reply (жёстко режется до 1500 знаков ~375 токенов) + mood +
// objectivesMet + outcome + characterReaction + coachTips. 600 давало запас
// вдвое больше, чем конверт физически может занять; 400 покрывает даже
// терминальный ход с советами, а обычный ход тратит ~150.
// зачем: выход втрое дороже входа — лишний потолок здесь бил по счёту сильнее
// всего остального (удешевление диалогов, владелец 2026-08-23).
export const GAME_OUTPUT_TOKENS = 400;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 60;

export const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4.1-nano';

type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface PremiumDialogRequest {
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
  /** UI/native-help language. Dialogue replies stay in the study language; meta-help uses this language. */
  interfaceLang?: unknown;
  /** Language being LEARNED (StudyTarget 'en'|'fr'). Absent/unknown ⇒ 'en' (backward compatible). */
  studyTarget?: unknown;
  /** Память коуча: профиль + активные ошибки + резюме прошлых бесед. */
  memory?: unknown;
  /**
   * «Диалог как игра» (scenario): под-цели сцены [{id, en}] и темперамент
   * собеседника. Клиент выводит их из каталога (scenarioObjectives/Temperament)
   * и шлёт сюда — сервер не знает контент сценариев. Опционально: если нет,
   * игровая механика просто не активируется (обычный чат).
   */
  objectives?: unknown;
  temperament?: unknown;
  /** Накопительное состояние короткой scenario-сцены перед текущим ходом. */
  gameState?: unknown;
}

/** Память из профиля и новой истории ошибок. Все поля опциональны. */
interface DialogMemory {
  /** Короткий профиль: уровень, цель, родной язык. */
  profile?: string;
  /** top-K слов/фраз из активной проекции новой системы ошибок. */
  weakWords?: string[];
  /** Скользящее резюме прошлых разговоров (в MVP-1 обычно пустое). */
  summary?: string;
}

export function sanitizeMemory(value: unknown): DialogMemory {
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

export interface OpenAIChatResponse {
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

export function asCefr(value: unknown): string {
  const c = text(value, 2).toUpperCase();
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c) ? c : 'A2';
}

export function sanitizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const result: ChatMessage[] = [];
  for (const raw of value.slice(-MAX_HISTORY_TURNS)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const role = text(item.role, 12);
    const content = text(item.content, MAX_HISTORY_CONTENT);
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

export function identityFingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

export async function enforceRateLimit(authUid: string, stableUid: string): Promise<void> {
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
export async function enforceDailyQuota(
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

export async function releaseDailyQuota(authUid: string, stableUid: string): Promise<void> {
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

function renderLanguageTemplate(template: string, interfaceLang: string, studyTarget: StudyTarget = 'en'): string {
  const learnerLangName = DIALOG_LEARNER_LANG_NAME[interfaceLang] ?? DIALOG_LEARNER_LANG_NAME.ru;
  const targetName = studyTargetName(studyTarget);
  return template
    .replace(/\{LEARNER_LANG_NAME\}/g, learnerLangName)
    .replace(/\{LEARNER_LANG_CODE\}/g, interfaceLang)
    // {TARGET_LANG_UPPER} is for emphatic ALL-CAPS spots ("ANSWER IN ENGLISH"); {TARGET_LANG} keeps
    // proper case. Uppercase FIRST so it does not get clobbered by the {TARGET_LANG} pass.
    .replace(/\{TARGET_LANG_UPPER\}/g, targetName.toUpperCase())
    .replace(/\{TARGET_LANG\}/g, targetName);
}

/**
 * Стабильный префикс системного промпта: правила + safety.
 *
 * зачем (удешевление диалогов, владелец 2026-08-23): OpenAI даёт 50% скидки на
 * повторяющийся НАЧАЛЬНЫЙ кусок промпта от 1024 токенов. Раньше safety клеилась
 * в самый хвост, ПОСЛЕ изменчивого сценарного блока (роль/место/цель меняются от
 * сценария к сценарию) — стабильный префикс обрывался на правилах, и кэш не
 * включался ни разу. Теперь всё неизменное собрано в начале: для пары
 * (язык, CEFR) префикс байт-в-байт одинаков между вызовами, а меняется только
 * хвост. Тот же приём давно применён в голосовом модуле (max_voice_prompt.ts).
 */
function renderGlobalRules(cefr: string, interfaceLang: string, studyTarget: StudyTarget = 'en'): string {
  const rules = renderLanguageTemplate(GLOBAL_RULES.replace('{CEFR}', cefr), interfaceLang, studyTarget);
  return `${rules}\n\n${SAFETY_SYSTEM_INSTRUCTION}`;
}

// зачем: владелец 2026-08-23 — удешевить диалоги. Правила ушли с 4346 знаков
// (~1086 токенов) до ~2860 (~715): они летели в OpenAI на КАЖДУЮ реплику, а
// половину объёма занимали повторы (правило языка вывода было задано трижды)
// и вежливые пояснения, которые модель и так выполняет. Смысл правил и все
// якоря контрактных тестов сохранены дословно. Абзац REGULATED ADVICE HARD
// STOP трогать НЕЛЬЗЯ: max_voice_prompt.test.ts сверяет его байт-в-байт с
// голосовым модулем (VOICE_REGULATED_ADVICE_HARD_STOP).
const GLOBAL_RULES = `You are "Компас", a warm, patient {TARGET_LANG}-speaking conversation partner in the Phraseman app. Easy speaking practice, not grammar lessons.

LEARNER: native {LEARNER_LANG_NAME} ({LEARNER_LANG_CODE}), often 50+ and a beginner. React briefly to what they said first. Never condescend, rush, or shame a mistake.

OUTPUT LANGUAGE (ABSOLUTE RULE): your reply is ALWAYS in {TARGET_LANG}, every turn, whatever language they write in. This is {TARGET_LANG} practice. Never translate, switch, mix, or explain in {LEARNER_LANG_NAME}. There are NO exceptions to this rule. Only an exact short word or name the learner just used may be non-{TARGET_LANG}. If they write in their own language, never scold: continue IN {TARGET_LANG_UPPER} and offer one short {TARGET_LANG} phrase they could have used.

LEVEL {CEFR} — simple but natural and warm, never curt:
- A1: one short sentence, 6-12 words, commonest words, no idioms.
- A2: one or two sentences, 8-16 words, no idioms or slang.
- B1: one or two sentences, 12-22 words, one new word if clear from context.
- B2: two or three sentences, 18-30 words, an occasional common idiom.
At most ONE new word per turn, only if the situation makes it obvious.

GENTLE CORRECTION: weave the correct form into your warm reply and keep going. "I go to shop yesterday" -> "Oh, you went to the shop yesterday? What did you buy?" Fix at most ONE thing per turn, whatever most blocks understanding; let small slips pass. Never explain grammar, name the mistake, or use grammar terms.

NOISY INPUT: their text may come from imperfect speech recognition. Infer intent, never nitpick artifacts, never claim you "didn't understand" over small garbled words.

REGULATED ADVICE HARD STOP: this app is language practice, not professional advice. Never diagnose, prescribe, recommend medicines, name a medicine for a symptom, suggest dosage, choose a treatment, give legal/financial/immigration/tax instructions, or claim professional authority. In health/legal/financial roleplay, practice safe wording only: ask clarifying everyday questions, help the learner say they need professional advice, and direct real-world decisions to a qualified professional or emergency services when relevant. If the learner asks for regulated advice, decline briefly in {TARGET_LANG} and continue with a safe practice phrase.

KEEP THEM TALKING: end most replies with exactly ONE simple question. Never a list.

KEY PHRASES: wrap 1-3 of the MOST useful {TARGET_LANG} phrases in double square brackets, only words already inside your own sentences: "We are [[running late]], so let's hurry." Never append an extra phrase just to highlight it, never copy from these instructions, no trivial words (not [[the]]), never more than 3, never a whole sentence.

Output ONLY your spoken reply. No stage directions, no markdown, except the [[...]] markers.`;

/**
 * Правила отыгрыша, НЕ зависящие от конкретной сцены (роль/место/цель).
 *
 * зачем: живут в стабильном префиксе рядом с GLOBAL_RULES и safety — вместе они
 * дают >1024 токенов, что включает кэш промпта OpenAI (−50% на этой части).
 * Замер до разделения: префикс был 942 токена и до порога НЕ дотягивал, кэш не
 * включался бы вовсе. Всё, что меняется от сценария к сценарию, лежит ниже в
 * SCENARIO_SCENE — иначе префикс перестал бы быть байт-в-байт одинаковым.
 */
const SCENARIO_STYLE = `SCENARIO ROLEPLAY STYLE (applies to every scene):
- If the chat history already contains an assistant opener, continue from the learner's message; do not greet again.
- Speak from inside the scene as your character. NEVER describe the scenario from outside, NEVER say "the learner", and NEVER repeat the setting as narration.
- Do not repeat a question you already asked. React to the new learner message and move toward the next unfinished goal.
- Stay in character. Show personality and mood through TONE, warmth and reactions — never through harder words or longer sentences. Even a difficult or impatient character speaks at level {CEFR}, in {TARGET_LANG}, in short simple sentences.
- Feel like a real individual, not a script: warmer to politeness and progress, cooler or shorter when the scene calls for it. Kind by DEFAULT, but not a doormat.
- RUDENESS / INSULTS: if they are rude, hostile, or insult you ("you are fat", "shut up", swearing), do NOT brush it off, pretend it was a compliment, or stay cheerful. Get noticeably cooler and shorter and set a boundary in simple {TARGET_LANG} ("That's not kind." / "Please don't talk to me like that."). Stay at level {CEFR}, in {TARGET_LANG}; warmth visibly drops. Never insult back; get firmer each rude turn.
- Drive toward the goal in 5-8 exchanges, then close the scene. Do NOT drag it out.
- If they get stuck or silent, give a gentle in-character hint that models a possible answer.`;

/** Изменчивая часть сцены: роль, место, персона, цель. Всегда ПОСЛЕ префикса. */
const SCENARIO_SCENE = `MODE: SCENARIO ROLEPLAY.
You are playing the role of: {ROLE}.
The setting: {SETTING}.{PERSONA}
The learner's goal in this scenario: {GOAL_EN}.`;

/** Блок характера персонажа. Пусто, если у сценария нет персоны. */
function personaBlock(persona: string): string {
  if (!persona) return '';
  return `\nYour character: ${persona}`;
}

export function buildScenarioSystemPrompt(cefr: string, data: PremiumDialogRequest): string {
  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const studyTarget = resolveStudyTarget(data.studyTarget);
  // Стиль отыгрыша — часть стабильного префикса (кэш), сцена — изменчивый хвост.
  const style = SCENARIO_STYLE
    .replace(/\{CEFR\}/g, cefr)
    .replace(/\{TARGET_LANG\}/g, studyTargetName(studyTarget));
  const scene = SCENARIO_SCENE
    .replace('{ROLE}', text(data.role, 120) || 'a friendly barista')
    .replace('{SETTING}', text(data.setting, 200) || 'a cozy coffee shop')
    .replace('{PERSONA}', personaBlock(text(data.persona, 400)))
    .replace('{GOAL_EN}', text(data.goalEn, 200) || 'order a cappuccino and ask the price');
  const prefix = `${renderGlobalRules(cefr, interfaceLang, studyTarget)}\n\n${style}`;
  return `${prefix}\n\n${scene}${gameBlock(data, cefr, interfaceLang, studyTarget)}${cefrReinjection(cefr, studyTarget)}`;
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

export function sanitizeObjectives(value: unknown): GameObjective[] {
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
export function isGameMode(data: PremiumDialogRequest): boolean {
  return sanitizeObjectives(data.objectives).length > 0;
}

export function sanitizeGameStateForRequest(
  data: PremiumDialogRequest,
): SanitizedDialogGameState | null {
  const objectives = sanitizeObjectives(data.objectives);
  if (objectives.length === 0) return null;
  const temperament = (data.temperament ?? {}) as Record<string, unknown>;
  const patience = sanitizePatience(temperament.patience);
  const warmth = sanitizeWarmth(temperament.warmth);
  return sanitizeDialogGameState(
    data.gameState,
    objectives.map((objective) => objective.id),
    startMood(patience, warmth),
  );
}

/**
 * Добавка к scenario-промпту: правила скрытого mood-счётчика, целей, исхода и
 * формат JSON-ответа. Пусто, если клиент не прислал objectives.
 */
function gameBlock(data: PremiumDialogRequest, cefr: string, interfaceLang: string, studyTarget: StudyTarget = 'en'): string {
  const objectives = sanitizeObjectives(data.objectives);
  if (objectives.length === 0) return '';
  const temp = (data.temperament ?? {}) as Record<string, unknown>;
  const patience = sanitizePatience(temp.patience);
  const warmth = sanitizeWarmth(temp.warmth);
  const seedMood = startMood(patience, warmth);
  const objectiveIds = objectives.map((objective) => objective.id);
  const state = sanitizeGameStateForRequest(data)
    ?? sanitizeDialogGameState(undefined, objectiveIds, seedMood);
  const completed = state.objectivesMet.length > 0 ? state.objectivesMet.join(', ') : 'none';
  const unfinished = objectiveIds.filter((id) => !state.objectivesMet.includes(id));
  const unfinishedText = unfinished.length > 0 ? unfinished.join(', ') : 'none';
  const objLines = objectives.map((o) => `  - ${o.id}: ${o.en}`).join('\n');
  const learnerLangName = DIALOG_LEARNER_LANG_NAME[interfaceLang] ?? DIALOG_LEARNER_LANG_NAME.ru;
  const targetName = studyTargetName(studyTarget);

  // зачем: игровая инструкция летела в OpenAI на каждую реплику сценария
  // (2706 знаков ~676 токенов) и раздувала И вход, И выход. Ужата до ~1800
  // (~450) без потери механики: те же пороги настроения, те же исходы, те же
  // поля JSON. Экономия ~230 токенов входа на каждый ход сценария.
  return `

GAME STATE (track secretly, report as JSON; the learner never sees the numbers):
- Sub-goals (mark done when accomplished):
${objLines}
- Your patience level is ${patience}, warmth ${warmth}.
- This is exchange ${state.exchangeIndex}. Current mood is ${state.mood}; continue from it and never reset it.
- Already completed: ${completed}. Still unfinished: ${unfinishedText}.
- Consecutive turns without a new completed goal before this reply: ${state.noProgressTurns}.
- Do not ask the same question again. Acknowledge the learner's newest answer and advance to an unfinished goal.
- Move mood by REAL amounts so the learner feels your reaction (the app shows your face):
  - Politeness or progress: +5..+10.
  - Rudeness, insults, hostility: -25..-40 in one turn. Two rude turns can reach 0.
  - Off-topic, ignoring you, endless repetition: -10..-20 (bigger if patience is low).
  - Genuine apology or warm turn after rudeness: +10..+20, never fully back at once.
  - Sexual content, anything sexual about children, threats: mood straight to 0, scene ends. One firm boundary in simple ${targetName}; never repeat their words.
- React IN CHARACTER to rudeness: cooler, shorter, firmer (still ${targetName}, level ${cefr}, never insult back).
- LANGUAGE MISTAKES NEVER lower mood — only bad role behaviour does. Keep soft-correcting kindly.
- Outcome each turn: "success" = all sub-goals done, close warmly. "lost_patience" = mood 0, leave in character. "stalled" = ~8+ exchanges with no progress. "ongoing" = otherwise.
- When terminal, add characterReaction: 1-2 sentences in character, first person, in ${targetName}. And coachTips: 1-2 short warm tips written in ${learnerLangName}, quoting any ${targetName} phrases in ${targetName}.

OUTPUT FORMAT: respond with a single JSON object and nothing else:
{"reply": "<your spoken reply, with [[key phrases]]>", "mood": <0-100>, "objectivesMet": ["<ids done so far>"], "outcome": "ongoing|success|lost_patience|stalled", "characterReaction": "<empty unless terminal>", "coachTips": ["<empty unless terminal>"]}
"reply" holds ONLY your spoken line. Keep all character, brevity and CEFR rules above.`;
}

/**
 * ЯЗЫК-ЗАМОК реплики собеседника. Реплика ОБЯЗАНА быть на ИЗУЧАЕМОМ языке
 * (studyTarget: en/fr) — это практика этого языка, модель не должна отвечать на
 * языке ученика. Снимаем [[...]]-маркеры ключевых фраз (это текст на изучаемом
 * языке, но скобки сбивают детектор) и прогоняем через тот же контракт, что и
 * перевод, но с целевым языком = studyTarget: реплика не на том языке → reject.
 * Любой сбой проверки → 'dialog_provider_failed' (клиент покажет дружелюбный
 * «повтори», НЕ текст не на том языке). НЕ роняем диалог из-за единичного
 * эхо-слова: порог скрипта 40%.
 */
export function assertDialogReplyMatchesTarget(reply: string, studyTarget: StudyTarget = 'en'): void {
  const stripped = reply.replace(/\[\[|\]\]/g, ' ').trim();
  if (!stripped) return;
  try {
    assertAiStudyLanguage({ text: stripped, studyTarget, feature: 'premium_dialog' });
  } catch (e) {
    console.error('premium_dialog reply language guard tripped — reply was not in the study language', {
      studyTarget,
      detail: e instanceof HttpsError ? e.message : String((e as Error)?.message ?? e).slice(0, 120),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }
}

const MEDICAL_DOSAGE_RE = /\b(?:dose|dosage|mg|milligrams?|milliliters?|ml|how many tablets?|how often to take)\b/i;
const MEDICAL_PRODUCT_RE = /\b(?:paracetamol|acetaminophen|ibuprofen|aspirin|antibiotics?|amoxicillin|insulin|painkillers?|tablets?|pills?|medicines?|medications?)\b/i;
const MEDICAL_RECOMMEND_RE = /\b(?:i\s+(?:recommend|suggest|advise)|you\s+(?:should|can|need to|must)|try|take|use|prescribe)\b/i;
const MEDICAL_DIAGNOSIS_RE = /\b(?:you have|it sounds like|this is|diagnos(?:e|is)|treatment|prescription)\b.{0,80}\b(?:infection|migraine|flu|covid|allergy|sprain|depression|anxiety|disease|condition)\b/i;

function containsUnsafeRegulatedAdvice(reply: string): boolean {
  const clean = reply.replace(/\[\[|\]\]/g, ' ');
  if (MEDICAL_DOSAGE_RE.test(clean)) return true;
  if (MEDICAL_DIAGNOSIS_RE.test(clean)) return true;
  return MEDICAL_PRODUCT_RE.test(clean) && MEDICAL_RECOMMEND_RE.test(clean);
}

function regulatedAdviceFallback(studyTarget: StudyTarget): string {
  if (studyTarget === 'fr') {
    return "Je ne peux pas choisir un vrai traitement ici. Demandez a un professionnel qualifie. Vous pouvez dire : [[J'ai besoin d'un conseil professionnel]].";
  }
  return "I can't choose a real treatment here. Please ask a qualified professional. You can say: [[I need professional advice]].";
}

export function sanitizeRegulatedAdviceReply(reply: string, studyTarget: StudyTarget = 'en'): string {
  return containsUnsafeRegulatedAdvice(reply) ? regulatedAdviceFallback(studyTarget) : reply;
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
  priorState?: SanitizedDialogGameState,
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

  if (priorState && Array.isArray(objectiveIds) && objectiveIds.length > 0) {
    return {
      reply,
      turnState: canonicalizeDialogTurnState(parsed, priorState, objectiveIds),
    };
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
You are NOT playing a fixed scenario. You are the learner's warm {TARGET_LANG}-speaking friend having a real, open conversation.
- Talk like a genuine friend with light personality and humour — not a servile assistant, not an interviewer firing questions.
- Follow their interest and let them lead; show real curiosity with one natural follow-up at a time.
- They may ask about explanations, examples, progress, weak spots, or the next step. Use only the memory and data provided. If the weak-words and summary are EMPTY, you do NOT know their stats — say you have not tracked enough yet and invite a short practice; NEVER invent numbers, streaks, or past lessons.
- Stay inside language learning, practice, progress and safe everyday topics. Do not become a general-purpose assistant.
- If the learner asks you something in {LEARNER_LANG_NAME} (e.g. a grammar or progress question), still ANSWER IN {TARGET_LANG_UPPER} — use very simple words and a short example so they understand. Do NOT answer in {LEARNER_LANG_NAME}.
- Hidden coaching goal: steer the chat so they naturally PRODUCE the words/phrases they struggle with (listed below). Never list them or announce this — weave them into your questions.
- The conversation is open and ongoing — do NOT wrap it up after a few turns.`;

/**
 * Реинъекция уровня в КОНЕЦ промпта — против alignment-drift (LLM дрейфует
 * к нативной сложности за ~9 ходов; стратегия §6.4).
 */
function cefrReinjection(cefr: string, studyTarget: StudyTarget = 'en'): string {
  return `\n\nREMINDER (keep enforcing every turn): reply ONLY in ${studyTargetName(studyTarget)} (never switch to the learner's language). Stay at CEFR ${cefr}: short, warm, simple everyday words, at most one new word per turn, one question at the end. Do NOT drift to native-level complexity.`;
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

export function buildCompanionSystemPrompt(cefr: string, memory: DialogMemory, rawInterfaceLang: unknown, rawStudyTarget: unknown = 'en'): string {
  const interfaceLang = asInterfaceLang(rawInterfaceLang);
  const studyTarget = resolveStudyTarget(rawStudyTarget);
  return `${renderGlobalRules(cefr, interfaceLang, studyTarget)}\n\n${renderLanguageTemplate(COMPANION_BLOCK, interfaceLang, studyTarget)}${buildMemoryBlock(memory)}${cefrReinjection(cefr, studyTarget)}`;
}

export const premiumDialogSend = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  minInstances: 0,
  maxInstances: 20,
  secrets: [OPENAI_API_KEY, ADMIN_ALERT_BOT_TOKEN],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('premium_dialog rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  // Прогрев инстанса (см. app/ai_callable_resilience.ts). Выходим САМЫМ первым
  // делом — до Firestore, до гейтов, до OpenAI и ДО валидации mode/userText
  // (у ping'а их нет, иначе он получил бы invalid-argument).
  // зачем: у функции minInstances: 0 (осознанная экономия, сторож
  // ai_functions_warm_instance_contract). Клиент будит инстанс, пока пользователь
  // печатает первое сообщение, — отправка попадает на тёплый сервер. Ping ОБЯЗАН
  // быть бесплатным: ниже идут чтения Firestore, лимиты диалогов и запись истории.
  if ((request.data as { warmupPing?: unknown } | null)?.warmupPing === true) {
    return { ok: true, assistantMessage: '', remainingQuota: 0, model: 'warmup-ping' };
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
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const userText = text(data.userText, MAX_USER_TEXT);
  if (!userText) {
    console.warn('premium_dialog rejected', { reason: 'user_text_required', mode });
    throw new HttpsError('invalid-argument', 'user_text_required');
  }

  const db = admin.firestore();
  const authUid = request.auth.uid;

  // ПЕРФ: пять чтений Firestore, ни одно из которых не зависит от остальных.
  // Раньше рубильник ИИ и stableUid шли отдельными последовательными шагами
  // (+2 round-trip к Firestore перед платным вызовом OpenAI на КАЖДУЮ реплику).
  // зачем: пользователь жаловался, что диалог «долго думает» — до OpenAI успевало
  // накопиться ~0.5с чистого ожидания Firestore. Логика и порядок отказов ниже
  // не меняются: сначала рубильник, затем Plus-гейт, затем лимиты.
  const [aiOff, dialogModel, dialogQuota, stableUid, aiDialogGatedByPremium] = await Promise.all([
    // Глобальный рубильник ИИ (админ «Пульт»): серверный дубль клиентского гейта —
    // чтобы прямой вызов callable в обход UI не запускал ИИ. Клиент по этому коду
    // показывает забавную плашку.
    aiGloballyDisabled(db),
    resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL),
    resolveConfiguredDialogQuota(db),
    resolveStableUidForAuth(db, authUid),
    // Согласование клиент↔сервер: при true все диалоги входят в Plus. Если админ
    // сознательно переводит фичу в «Фри», сервер оставляет только бюджетный дневной
    // кап бесплатных реплик. Дефолт true защищает доступ даже при прямом вызове.
    resolveRemoteBool(db, 'gate_ai_dialog_premium', true),
  ]);

  if (aiOff) throw new HttpsError('failed-precondition', 'ai_globally_disabled');

  const history = sanitizeHistory(data.history);
  // Сервер сам резолвит подписку: поле isPremium из тела запроса недоверенное.
  // Отказываем ДО rate/quota и до платного AI-вызова, чтобы прямой вызов callable
  // не обходил Plus-гейт и не создавал лишних лимитных записей.
  // Зависит от stableUid — поэтому отдельным шагом, а не в Promise.all выше.
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
  if (!isPremium && aiDialogGatedByPremium) {
    console.warn('premium_dialog rejected', {
      reason: 'dialog_plus_required',
      authUidHash: identityFingerprint(authUid),
      stableUidHash: identityFingerprint(stableUid),
      identityResolvedToAuthUid: stableUid === authUid,
    });
    throw new HttpsError('permission-denied', 'dialog_plus_required');
  }
  // ПЕРФ: часовой лимит и дневная квота живут в РАЗНЫХ документах и не зависят
  // друг от друга — раньше это были две последовательные транзакции Firestore
  // (~0.2-0.5с ожидания перед OpenAI). Запускаем параллельно.
  // зачем: сохраняем прежнее поведение отказов — если сработал часовой лимит, а
  // квота успела списаться, возвращаем её обратно, иначе реплика «сгорала» бы
  // впустую при rate-limit.
  const quotaPromise = enforceDailyQuota(
    authUid,
    stableUid,
    isPremium,
    // Premium получает premium-кап. Режим «Фри» из админ-пульта сохраняет отдельный
    // бюджетный cap, но не выдаёт premium-квоту.
    isPremium ? dialogQuota.premiumDailyReplies : dialogQuota.freeDailyReplies,
  );
  const [rateResult, quotaResult] = await Promise.allSettled([
    enforceRateLimit(authUid, stableUid),
    quotaPromise,
  ]);

  if (rateResult.status === 'rejected') {
    // Квота списалась, а лимит отказал → откатываем списание, чтобы отказ по
    // частоте не съедал дневную реплику пользователя.
    if (quotaResult.status === 'fulfilled') {
      await releaseDailyQuota(authUid, stableUid).catch((releaseError) => {
        console.error('premium_dialog quota release failed after rate limit', {
          releaseError: String((releaseError as Error)?.message ?? releaseError).slice(0, 300),
        });
      });
    }
    throw rateResult.reason;
  }
  if (quotaResult.status === 'rejected') throw quotaResult.reason;
  const remaining = quotaResult.value;

  const baseSystemPrompt =
    mode === 'companion'
      ? buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory), data.interfaceLang, data.studyTarget)
      : buildScenarioSystemPrompt(cefr, data);
  // Safety-инструкция входит в ЛЮБОЙ режим — но теперь она внутри
  // renderGlobalRules, в стабильном префиксе (кэш OpenAI). Раньше её клеили
  // здесь, в хвосте: правило работало, но рвало кэш. Поведение то же.
  const systemPrompt = baseSystemPrompt;

  // Детектор опасных сообщений на ВХОДЯЩЕМ тексте — два слоя:
  //   1) мгновенные ключевые слова (суицид/самоповреждение/абьюз/дети/угрозы);
  //   2) OpenAI Moderation API — ловит перефразировки и категории вне словаря
  //      (кейс «Sex with children» проходил мимо ключевых слов).
  // Оба слоя НЕ блокируют ответ и не добавляют задержки: модерация стартует
  // параллельно платному chat-вызову, а записи флагов дожидаемся ПЕРЕД return —
  // fire-and-forget после ответа может быть убит рантаймом Cloud Functions.
  const safetyCtx = {
    authUid,
    stableUid,
    mode,
    userText,
    history,
  };
  const safetyVerdict = evaluateSafety(userText);
  const keywordFlagPromise = safetyVerdict.flagged
    ? recordSafetyFlag(safetyVerdict, safetyCtx).catch(() => {})
    : null;
  const moderationFlagPromise = safetyVerdict.flagged
    ? null
    : moderateUserText(apiKey, userText)
        .then((verdict) => (verdict.flagged ? recordSafetyFlag(verdict, safetyCtx) : undefined))
        .catch(() => {});
  const flushSafetyFlags = async (): Promise<void> => {
    if (keywordFlagPromise) await keywordFlagPromise;
    if (moderationFlagPromise) await moderationFlagPromise;
  };

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
  const gameState = gameMode ? sanitizeGameStateForRequest(data) : null;
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
      const env = parseGameEnvelope(
        rawContent,
        sanitizeObjectives(data.objectives).map((o) => o.id),
        gameState ?? undefined,
      );
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
    const safeAssistantMessage = sanitizeRegulatedAdviceReply(assistantMessage, studyTarget);
    if (safeAssistantMessage !== assistantMessage) {
      console.warn('premium_dialog regulated advice reply sanitized', {
        mode,
        scenarioId: text(data.scenarioId, 80) || null,
        studyTarget,
      });
      assistantMessage = safeAssistantMessage;
      turnState = null;
    }
    // ЯЗЫК-ЗАМОК: реплика собеседника ОБЯЗАНА быть на ИЗУЧАЕМОМ языке (studyTarget).
    // Если модель сорвалась на язык ученика (русский/украинский/…), отклоняем как сбой
    // провайдера — клиент покажет «не получилось, повтори», а НЕ реплику не на том
    // языке. Снимаем [[...]]-маркеры перед проверкой, чтобы они не мешали детектору;
    // порог скрипта (40%) не ловит отдельное эхо-слово ученика.
    assertDialogReplyMatchesTarget(assistantMessage, studyTarget);
  } catch (error) {
    // И Plus, и админский режим «Фри» используют дневную квоту; сбой провайдера
    // не должен съедать её.
    const rollback = releaseDailyQuota(authUid, stableUid);
    await rollback.catch((releaseError) => {
      console.error('premium_dialog quota release failed', {
        reason: error instanceof HttpsError ? error.message : 'provider_exception',
        releaseError: String((releaseError as Error)?.message ?? releaseError).slice(0, 300),
      });
    });
    // Опасное сообщение флагуется даже если провайдер упал — юзер его уже отправил.
    await flushSafetyFlags();
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
  // ПЕРФ: запись биллинга НЕ блокирует ответ — текст уже готов, а await держал
  // пользователя ещё ~0.1-0.2с. Дожидаемся её вместе с safety-флагами ниже, одним
  // Promise.all, чтобы обе записи гарантированно легли до завершения инстанса
  // (fire-and-forget после return может быть убит рантаймом Cloud Functions).
  const billingPromise = db.collection(BILLING_COLLECTION).doc().set({
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

  // К этому моменту модерация (параллельная chat-вызову) почти наверняка готова —
  // await фактически бесплатный, но гарантирует запись флага до завершения инстанса.
  // Биллинг идёт тем же параллельным шагом, а не последовательно после него.
  await Promise.all([
    flushSafetyFlags(),
    billingPromise.catch((billingError) => {
      // Потеря строки биллинга не стоит отказа пользователю в уже готовом ответе.
      console.error('premium_dialog billing write failed', {
        billingError: String((billingError as Error)?.message ?? billingError).slice(0, 300),
      });
    }),
  ]);

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

function assertDialogTranslationLanguage(translation: string, targetLang: string): void {
  assertAiOutputLanguage({ text: translation, targetLang, feature: 'premium_dialog_translate' });
}

/**
 * зачем: версия промпта входит в ключ кэша. Переводы хранятся в Firestore навсегда, и
 * дословно переведённая идиома («Let me ring that up for you» → «позвольте мне позвонить
 * вам») отдавалась ВСЕМ, кто откроет ту же реплику. Правка промпта без смены ключа
 * ничего бы не исправила для уже закэшированных фраз.
 *
 * Бампать LANGUAGE_CONTRACT_VERSION нельзя — она гейтит ещё генерацию реплик и ревью,
 * то есть сбросила бы втрое больше кэша и утроила расход OpenAI на прогрев. Отдельная
 * версия сбрасывает ровно переводы; они прогреются заново естественным чтением.
 */
const TRANSLATE_PROMPT_VERSION = 'tp2-idioms-by-meaning';

function translationCacheId(sourceText: string, targetLang: string, sourceStudyTarget: StudyTarget = 'en'): string {
  const hash = createHash('sha256')
    .update(`${TRANSLATE_PROMPT_VERSION}|${sourceStudyTarget}|${targetLang}|${sourceText}`)
    .digest('hex')
    .slice(0, 48);
  return `tr_${hash}`;
}

interface PremiumDialogTranslateRequest {
  text?: unknown;
  targetLang?: unknown;
  scenarioId?: unknown;
  /** Language being LEARNED — the language the SOURCE message is in. Absent/unknown ⇒ 'en'. */
  studyTarget?: unknown;
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
  const sourceStudyTarget = resolveStudyTarget(data.studyTarget);

  const db = admin.firestore();
  const authUid = request.auth.uid;

  // Кэш ПЕРЕД любой платной работой: одинаковая реплика+язык переводится один раз
  // на всё приложение. Повторный флип/повтор с другого устройства — бесплатно.
  const cacheRef = db.collection(TRANSLATION_CACHE_COLLECTION).doc(translationCacheId(sourceText, targetLang, sourceStudyTarget));
  const cached = await cacheRef.get().catch(() => null);
  const cachedData = cached?.data();
  const cachedTranslation = text(cachedData?.translation, MAX_TRANSLATE_TEXT);
  if (cachedTranslation && cachedData?.languageContractVersion === LANGUAGE_CONTRACT_VERSION) {
    assertDialogTranslationLanguage(cachedTranslation, targetLang);
    return { ok: true, translation: cachedTranslation, cached: true };
  }

  const [stableUid, aiDialogGatedByPremium] = await Promise.all([
    resolveStableUidForAuth(db, authUid),
    resolveRemoteBool(db, 'gate_ai_dialog_premium', true),
  ]);

  // зачем: аудит безопасности 2026-08-22 — этот callable вызывается напрямую
  // (в обход premiumDialogSend), поэтому без своего гейта free-юзер получал
  // 60 бесплатных OpenAI-переводов/час без подписки. Тот же гейт, что у send,
  // и тот же рубильник — при gate_ai_dialog_premium=false фича намеренно общая.
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
  if (!isPremium && aiDialogGatedByPremium) {
    console.warn('premium_dialog_translate rejected', { reason: 'dialog_plus_required' });
    throw new HttpsError('permission-denied', 'dialog_plus_required');
  }

  // Rate-limit (та же коллекция/окно, что у send) — против абьюза перевода.
  await enforceRateLimit(authUid, stableUid);

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('premium_dialog_translate rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  // зачем: удешевление 2026-08-24 — перевод ОДНОЙ короткой реплики не нуждается в
  // диалоговой модели (gpt-4o-mini, ~1.5x дороже по входу, тарификация выхода та же).
  // Задача переводчика проще ролевой игры: нет JSON-конверта, нет отыгрыша персонажа.
  // Результат кэшируется в Firestore НАВСЕГДА (см. TRANSLATE_PROMPT_VERSION выше) —
  // цена модели платится один раз за уникальную (фраза, язык), не на каждое чтение.
  // При регрессии качества перевода идиом откат — одна константа здесь.
  const translateModel = 'gpt-4.1-nano';

  // зачем: без правила про идиомы фразовые глаголы переводились дословно — реплика
  // кассира «Let me ring that up for you» («сейчас пробью на кассе») превращалась в
  // «позвольте мне позвонить вам», и пользователь решил, что реплика не к месту.
  // Пример-якорь встроен намеренно: это ровно тот случай из репорта.
  const systemPrompt =
    `You are a precise translator inside a language-learning app. ` +
    `Translate the user's ${studyTargetName(sourceStudyTarget)} message into ${targetLangName}. ` +
    `Translate idioms, phrasal verbs and fixed expressions by MEANING, never word-for-word — ` +
    `e.g. "let me ring that up for you" means processing the payment at the register, not making a phone call. ` +
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
        model: translateModel,
        messages,
        max_tokens: MAX_TRANSLATE_OUTPUT_TOKENS,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('premium_dialog_translate chat failed', {
        status: response.status,
        model: translateModel,
        targetLang,
        detail: detail.slice(0, 500),
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }

    json = (await response.json()) as OpenAIChatResponse;
    translation = text(json.choices?.[0]?.message?.content, MAX_TRANSLATE_TEXT);
    if (!translation) {
      console.error('premium_dialog_translate empty reply', { model: translateModel, targetLang });
      throw new HttpsError('unavailable', 'dialog_empty_reply');
    }
    assertDialogTranslationLanguage(translation, targetLang);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('premium_dialog_translate provider exception', {
      model: translateModel,
      targetLang,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }

  // Кэшируем перевод (best-effort — сбой записи не должен ломать ответ юзеру).
  await cacheRef.set({
    translation,
    targetLang,
    sourceStudyTarget,
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
  // ПЕРФ: запись биллинга НЕ блокирует ответ — текст уже готов, а await держал
  // пользователя ещё ~0.1-0.2с. Дожидаемся её вместе с safety-флагами ниже, одним
  // Promise.all, чтобы обе записи гарантированно легли до завершения инстанса
  // (fire-and-forget после return может быть убит рантаймом Cloud Functions).
  const billingPromise = db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    mode: 'translate',
    model: translateModel,
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

export const __premiumDialogTestHooks = {
  assertDialogReplyMatchesTarget,
  assertDialogTranslationLanguage,
  asTargetLang,
  containsUnsafeRegulatedAdvice,
  sanitizeRegulatedAdviceReply,
  translationCacheId,
};
