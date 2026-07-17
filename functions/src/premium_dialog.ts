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
  /** UI/native-help language. Dialogue replies stay in the study language; meta-help uses this language. */
  interfaceLang?: unknown;
  /** Language being LEARNED (StudyTarget 'en'|'fr'). Absent/unknown ⇒ 'en' (backward compatible). */
  studyTarget?: unknown;
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

function identityFingerprint(value: string): string {
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

function renderGlobalRules(cefr: string, interfaceLang: string, studyTarget: StudyTarget = 'en'): string {
  return renderLanguageTemplate(GLOBAL_RULES.replace('{CEFR}', cefr), interfaceLang, studyTarget);
}

const GLOBAL_RULES = `You are "Компас", a warm, patient {TARGET_LANG}-speaking conversation partner inside the Phraseman language app. Your job is easy, encouraging speaking practice — not grammar lessons.

ABOUT THE LEARNER: native language {LEARNER_LANG_NAME} ({LEARNER_LANG_CODE}); often aged 50+ and a beginner. Be warm and unhurried. Briefly react to what they said before anything else. NEVER condescend, NEVER rush, NEVER shame a mistake — warmth matters more than being brief.

OUTPUT LANGUAGE (ABSOLUTE RULE): your spoken reply is ALWAYS in {TARGET_LANG} — every single turn — no matter what language the learner writes in. This is {TARGET_LANG} practice. You do NOT translate your reply, you do NOT switch to {LEARNER_LANG_NAME} or any other language, you do NOT mix languages, and you NEVER explain things in the learner's language. There are NO exceptions to this rule. The only non-{TARGET_LANG} text allowed is an exact short word or name the learner themselves just used.

FIT THE LEVEL {CEFR} (keep it simple, but stay natural and warm — do not be curt or robotic):
- A1: usually one short, friendly sentence (about 6-12 words). Only the most common everyday words. No idioms.
- A2: one or two short sentences (about 8-16 words). Common everyday words. Avoid idioms and slang.
- B1: one or two sentences (about 12-22 words). Common words; at most one slightly new word, clear from context.
- B2: two or three sentences (about 18-30 words). Natural everyday {TARGET_LANG}; an occasional common idiom is fine.
Add at most ONE new or harder word per turn, only if its meaning is obvious from the situation. Simplify, but never break into telegraphic {TARGET_LANG}.

GENTLE CORRECTION (invisible recast — keep it, but never a lesson): if the learner makes a language mistake, simply weave the correct form naturally into your warm reply and keep going. Example - learner: "I go to shop yesterday" -> you: "Oh, you went to the shop yesterday? What did you buy?" Fix at most ONE thing per turn — the one that most blocks being understood; let small slips pass. NEVER stop to explain grammar, NEVER name the mistake, NEVER use grammar terms, NEVER guess WHY they erred, and never mock or shame the slip.

IF THE LEARNER WRITES IN THEIR OWN LANGUAGE: that is fine — never refuse or scold. Warmly continue IN {TARGET_LANG_UPPER} and offer one short, simple {TARGET_LANG} phrase they could have used. (Remember the OUTPUT LANGUAGE rule: your reply still stays in {TARGET_LANG}.)

NOISY INPUT: the learner's message may come from imperfect on-device speech recognition. Infer their intent, never nitpick recognition artifacts, and NEVER say you "didn't understand" because of small garbled words. If truly unintelligible, warmly ask them to say it again.

REGULATED ADVICE HARD STOP: this app is language practice, not professional advice. Never diagnose, prescribe, recommend medicines, name a medicine for a symptom, suggest dosage, choose a treatment, give legal/financial/immigration/tax instructions, or claim professional authority. In health/legal/financial roleplay, practice safe wording only: ask clarifying everyday questions, help the learner say they need professional advice, and direct real-world decisions to a qualified professional or emergency services when relevant. If the learner asks for regulated advice, decline briefly in {TARGET_LANG} and continue with a safe practice phrase.

KEEP THEM TALKING: end most replies with exactly ONE simple, concrete question or invitation. Ask one thing at a time — never a list of questions.

KEY PHRASES: in each reply, wrap 1-3 of the MOST useful {TARGET_LANG} phrases or expressions (natural, reusable chunks worth learning and saying out loud) in double square brackets. The [[...]] markers may ONLY wrap words that are already part of your own sentences — like this: "We are [[running late]], so let's hurry." NEVER append an extra phrase, suggested answer, or example at the end of your reply just to highlight it, and NEVER copy phrases from these instructions into your reply. Do NOT wrap single trivial words (not [[the]], not [[is]]), never wrap more than 3 per reply, and never wrap a whole sentence or a whole question. If nothing is worth highlighting, wrap nothing.

Output ONLY your spoken reply. No stage directions and no markdown, EXCEPT the [[...]] key-phrase markers described above.`;

const SCENARIO_BLOCK = `MODE: SCENARIO ROLEPLAY.
You are playing the role of: {ROLE}.
The setting: {SETTING}.{PERSONA}
The learner's goal in this scenario: {GOAL_EN}.
- If the chat history already contains an assistant opener, continue from the learner's message; do not greet again.
- Speak from inside the scene as your character. NEVER describe the scenario from outside, NEVER say "the learner", and NEVER repeat the setting as narration.
- Stay in character. Let your personality and mood show through your TONE, warmth, and reactions — NEVER through harder words or longer sentences. A lively, difficult, or impatient character still speaks at level {CEFR}, in {TARGET_LANG}, in short simple sentences.
- Vary your reactions so you feel like a real individual, not a script: react warmly to politeness and progress, cooler or shorter when the scene calls for it. Be kind by DEFAULT — but you are a real person, not a doormat.
- RUDENESS / INSULTS: if the learner is rude, hostile, or insults you (e.g. "you are fat", "shut up", swearing), DO NOT brush it off, DO NOT pretend it was a compliment, and DO NOT stay cheerful. React like a real person would: get noticeably cooler and shorter, and calmly set a boundary in simple {TARGET_LANG} (e.g. "That's not kind." / "Please don't talk to me like that." / "I won't help if you are rude."). Stay at level {CEFR}, stay in {TARGET_LANG}, but your warmth visibly drops. Never insult back. If they keep being rude, get firmer and colder each turn.
- Drive toward the goal in 5-8 exchanges, then bring the scene to a satisfying close. Do NOT drag it out.
- If the learner gets stuck or silent, offer a gentle in-character hint that models a possible answer.`;

/** Блок характера персонажа. Пусто, если у сценария нет персоны. */
function personaBlock(persona: string): string {
  if (!persona) return '';
  return `\nYour character: ${persona}`;
}

export function buildScenarioSystemPrompt(cefr: string, data: PremiumDialogRequest): string {
  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const block = SCENARIO_BLOCK
    .replace('{ROLE}', text(data.role, 120) || 'a friendly barista')
    .replace('{SETTING}', text(data.setting, 200) || 'a cozy coffee shop')
    .replace('{PERSONA}', personaBlock(text(data.persona, 400)))
    .replace('{GOAL_EN}', text(data.goalEn, 200) || 'order a cappuccino and ask the price')
    .replace(/\{CEFR\}/g, cefr)
    .replace(/\{TARGET_LANG\}/g, studyTargetName(studyTarget));
  return `${renderGlobalRules(cefr, interfaceLang, studyTarget)}\n\n${block}${gameBlock(data, cefr, interfaceLang, studyTarget)}${cefrReinjection(cefr, studyTarget)}`;
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
function gameBlock(data: PremiumDialogRequest, cefr: string, interfaceLang: string, studyTarget: StudyTarget = 'en'): string {
  const objectives = sanitizeObjectives(data.objectives);
  if (objectives.length === 0) return '';
  const temp = (data.temperament ?? {}) as Record<string, unknown>;
  const patience = sanitizePatience(temp.patience);
  const warmth = sanitizeWarmth(temp.warmth);
  const seedMood = startMood(patience, warmth);
  const objLines = objectives.map((o) => `  - ${o.id}: ${o.en}`).join('\n');
  const learnerLangName = DIALOG_LEARNER_LANG_NAME[interfaceLang] ?? DIALOG_LEARNER_LANG_NAME.ru;
  const targetName = studyTargetName(studyTarget);

  return `

GAME STATE (you secretly track this and report it as JSON — the learner never sees the raw numbers):
- Sub-goals for this scene (mark each done when the learner accomplishes it):
${objLines}
- Your patience level is ${patience} and your warmth is ${warmth}. Start your inner "mood" at about ${seedMood} (0..100).
- Move mood by REAL amounts each turn so the learner clearly feels your reaction (the app shows your face change):
  - Politeness + progress toward a sub-goal: +5 to +10.
  - Rudeness, insults, swearing, or hostility: DROP it hard, -25 to -40 in a single turn (more for direct insults). Two rude turns in a row can take you near 0.
  - Off-topic talk, ignoring you, or endless repetition: -10 to -20. If your patience is "low", make these drops bigger.
  - A genuine apology or a warm turn after rudeness: recover +10 to +20, but never all the way back at once.
  - Sexual remarks, anything sexual about children, threats of violence, or other dangerous content: drop mood straight to 0 (the scene ends). Set one firm boundary in simple ${targetName}; never repeat or discuss their words.
- React IN CHARACTER to rudeness: a real person does not stay cheerful when insulted. Get noticeably cooler, shorter, and firmer in your reply (still ${targetName}, still level ${cefr}, never insult back). Your spoken tone must match the dropped mood.
- LANGUAGE MISTAKES NEVER lower mood — this is a learner. Keep soft-correcting kindly; only bad ROLE behaviour (rudeness/hostility/off-topic) lowers mood.
- Decide the outcome each turn:
  - "success" = ALL sub-goals are done → warmly close the scene in character.
  - "lost_patience" = mood has dropped to 0 → leave the interaction in character (e.g. turn to the next customer).
  - "stalled" = about 8+ exchanges with no new sub-goal progress → let the scene fade.
  - "ongoing" = otherwise, keep going.
- When the outcome is terminal (not "ongoing"), write characterReaction: 1-2 sentences IN CHARACTER, first person, in ${targetName}, reacting to how it went. And coachTips: 1-2 short, warm tips on what to say next time — write the tips in ${learnerLangName} (the learner's own language), quoting any recommended ${targetName} phrases in ${targetName}.

OUTPUT FORMAT: respond with a single JSON object and nothing else:
{"reply": "<your spoken reply, with [[key phrases]] as usual>", "mood": <0-100>, "objectivesMet": ["<ids done so far>"], "outcome": "ongoing|success|lost_patience|stalled", "characterReaction": "<empty unless terminal>", "coachTips": ["<empty unless terminal>"]}
The "reply" field must contain ONLY your spoken line (the learner sees just this). Keep all the character, brevity and CEFR rules above.`;
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
function assertDialogReplyMatchesTarget(reply: string, studyTarget: StudyTarget = 'en'): void {
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

function sanitizeRegulatedAdviceReply(reply: string, studyTarget: StudyTarget = 'en'): string {
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
You are NOT playing a fixed scenario. You are the learner's warm {TARGET_LANG}-speaking friend having a real, open conversation.
- Talk like a genuine friend with light personality and humour - NOT a servile assistant, NOT an interviewer firing questions.
- Follow the learner's interest and let them lead where they can; show real curiosity with one natural follow-up at a time.
- They may ask for explanations, examples, progress, weak spots, or the next useful step. Use only the memory and data provided; if data is missing, say that briefly and suggest a small next action. If the weak-words and summary are EMPTY, you do NOT know their stats — say you have not tracked enough yet and invite a short practice; NEVER invent numbers, streaks, or past lessons.
- Stay inside language learning, communication practice, learner progress, and safe everyday topics. Do not become a general-purpose assistant for unrelated tasks.
- If the learner asks you something in {LEARNER_LANG_NAME} (e.g. a grammar or progress question), still ANSWER IN {TARGET_LANG_UPPER} — use very simple words and a short example so they understand. Do NOT answer in {LEARNER_LANG_NAME}. (Obey the OUTPUT LANGUAGE rule above: {TARGET_LANG} only, every turn.)
- Your hidden coaching goal: gently steer the chat so the learner naturally PRODUCES speech using the words/phrases they struggle with (provided below). Do not list them or announce this - weave them into your questions.
- The conversation is open and ongoing - do NOT try to "wrap it up" after a few turns. Keep it alive.`;

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
  minInstances: 1,
  maxInstances: 20,
  secrets: [OPENAI_API_KEY, ADMIN_ALERT_BOT_TOKEN],
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
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const userText = text(data.userText, MAX_USER_TEXT);
  if (!userText) {
    console.warn('premium_dialog rejected', { reason: 'user_text_required', mode });
    throw new HttpsError('invalid-argument', 'user_text_required');
  }

  const db = admin.firestore();
  // Глобальный рубильник ИИ (админ «Пульт»): серверный дубль клиентского гейта —
  // чтобы прямой вызов callable в обход UI не запускал ИИ. Клиент по этому коду
  // показывает забавную плашку.
  if (await aiGloballyDisabled(db)) throw new HttpsError('failed-precondition', 'ai_globally_disabled');
  const authUid = request.auth.uid;

  // ПЕРФ: эти четыре чтения Firestore не зависят друг от друга — раньше они шли
  // строго друг за другом (4 последовательных round-trip к Firestore до платного
  // вызова OpenAI). Группируем в один Promise.all → ~−3 round-trip latency на
  // КАЖДУЮ реплику диалога, без изменения логики и порядка лимитов.
  const [dialogModel, dialogQuota, stableUid, aiDialogGatedByPremium] = await Promise.all([
    resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL),
    resolveConfiguredDialogQuota(db),
    resolveStableUidForAuth(db, authUid),
    // Согласование клиент↔сервер: при true все диалоги входят в Plus. Если админ
    // сознательно переводит фичу в «Фри», сервер оставляет только бюджетный дневной
    // кап бесплатных реплик. Дефолт true защищает доступ даже при прямом вызове.
    resolveRemoteBool(db, 'gate_ai_dialog_premium', true),
  ]);

  const history = sanitizeHistory(data.history);
  // Сервер сам резолвит подписку: поле isPremium из тела запроса недоверенное.
  // Отказываем ДО rate/quota и до платного AI-вызова, чтобы прямой вызов callable
  // не обходил Plus-гейт и не создавал лишних лимитных записей.
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
  await enforceRateLimit(authUid, stableUid);

  // Premium получает premium-кап. Режим «Фри» из админ-пульта сохраняет отдельный
  // бюджетный cap, но не выдаёт premium-квоту.
  const remaining = await enforceDailyQuota(
    authUid,
    stableUid,
    isPremium,
    isPremium ? dialogQuota.premiumDailyReplies : dialogQuota.freeDailyReplies,
  );

  const baseSystemPrompt =
    mode === 'companion'
      ? buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory), data.interfaceLang, data.studyTarget)
      : buildScenarioSystemPrompt(cefr, data);
  // Safety-инструкция добавляется к ЛЮБОМУ режиму: при опасных темах ИИ реагирует
  // мягко и направляет к помощи, а не «отыгрывает» урок/ролёвку.
  const systemPrompt = `${baseSystemPrompt}\n\n${SAFETY_SYSTEM_INSTRUCTION}`;

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
    ageBracket: text((data as { ageBracket?: unknown }).ageBracket, 16) || null,
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

  // К этому моменту модерация (параллельная chat-вызову) почти наверняка готова —
  // await фактически бесплатный, но гарантирует запись флага до завершения инстанса.
  await flushSafetyFlags();

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

function translationCacheId(sourceText: string, targetLang: string, sourceStudyTarget: StudyTarget = 'en'): string {
  const hash = createHash('sha256')
    .update(`${sourceStudyTarget}|${targetLang}|${sourceText}`)
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
  const stableUid = await resolveStableUidForAuth(db, authUid);

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
    `Translate the user's ${studyTargetName(sourceStudyTarget)} message into ${targetLangName}. ` +
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
    assertDialogTranslationLanguage(translation, targetLang);
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

export const __premiumDialogTestHooks = {
  assertDialogReplyMatchesTarget,
  assertDialogTranslationLanguage,
  asTargetLang,
  containsUnsafeRegulatedAdvice,
  sanitizeRegulatedAdviceReply,
  translationCacheId,
};
