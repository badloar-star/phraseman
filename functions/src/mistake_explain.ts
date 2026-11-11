import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { reserveCapAndRateTogether, resolveMistakeStableUid, warmMistakeExplainRuntime } from './mistake_explain_speed';
import { resolvePremiumAccess } from './premium_status';
import {
  enforceFreeJobGenLimit,
  refundFreeJobGenLimit,
  type FreeJobGenReservation,
} from './explain/explain_budget';
import { resolveConfiguredDialogModel } from './openai_dialog_model_config';
import { aiGloballyDisabled } from './remote_gates';
import { PAID_AI_FETCH_TIMEOUT_MS, paidAiFetchFailureReason } from './paid_ai_fetch_timeout';
import { resolvePromptLangKey, PROMPT_LANGUAGES } from './explain/explain_prompts';
import {
  mistakeHashFor,
  readCachedMistakeExplanation,
  claimMistakePendingLock,
  claimMistakeEli5PendingLock,
  releaseMistakePendingLock,
  releaseMistakeEli5PendingLock,
  invalidateMistakeCachedVariant,
  writeReadyMistakeExplanationBundle,
  writeEli5MistakeExplanation,
  writeRejectedMistakeExplanation,
  isRetryableRejectedMistake,
  type MistakeExplainVariant,
} from './explain/mistake_explain_cache';
import { assertAiOutputLanguage, resolveAiOutputLang, resolveStudyTarget, studyTargetName, type StudyTarget } from './ai_language_contract';
import { describeGeneratedLanguageDecision } from './ai_language_gate';
import {
  buildStructuredMistakeMessages,
  coerceStoredBreakdown,
  MISTAKE_BREAKDOWN_RESPONSE_FORMAT,
  parseMistakeBreakdown,
  renderBreakdownFullText,
  type MistakeBreakdown,
  type MistakeExplainMessage,
  type MistakeExplanationBundle,
} from './explain/mistake_explain_structured';
import {
  GeneratedOutputRejected,
  generateWithOutputValidationRetry,
  OutputValidationRetryAborted,
  OutputValidationRetriesExhausted,
  type MistakeOpenAiUsage,
} from './explain/mistake_output_retry';
import { reserveDailySpend } from './spend_cap';
import { enforceCallerRateWindow } from './caller_rate_window';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const RATE_COLLECTION = 'mistake_explain_rate_limits';
const BILLING_COLLECTION = 'mistake_explain_billing';

// Free learners get three paid cache misses per UTC day. Warm-cache reads are
// free and unlimited; premium bypasses this miss cap. Firestore is authoritative.
const FREE_DAILY_CAP = 3;
const PENDING_POLL_ATTEMPTS = 4;
const PENDING_POLL_DELAY_MS = 200;

type MistakeFreeCapReservation = FreeJobGenReservation;

// зачем: PM-231 — у Plus не было суточного потолка: 40/ч × gpt-4.1 × до 3 попыток
// ⇒ до ~2900 платных вызовов в сутки с одного аккаунта. Тихий потолок по образцу
// PLUS_DIALOG_DAILY_REPLY_CAP (dialog_quota_contract.ts): считает только cache-miss,
// живой ученик до него не доходит, спам-скрипт упирается.
export const PLUS_MISTAKE_EXPLAIN_DAILY_CAP = 100;

async function reserveFreeDailyGenCap(
  db: admin.firestore.Firestore,
  authUid: string,
  stableUid: string,
): Promise<MistakeFreeCapReservation | null> {
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
  const nowMs = Date.now();
  if (isPremium) {
    try {
      return await enforceFreeJobGenLimit('mistake_plus', authUid, stableUid, PLUS_MISTAKE_EXPLAIN_DAILY_CAP, nowMs);
    } catch (error) {
      console.warn('[AI-LIMIT] mistake_explain plus daily cap refused', {
        reason: error instanceof HttpsError ? error.message : 'limit_check_failed',
        cap: PLUS_MISTAKE_EXPLAIN_DAILY_CAP,
      });
      // Plus не должен видеть «купи за руны» (это смысл explain_free_daily_limit на
      // клиенте) — отдаём существующий нейтральный отказ по частоте.
      if (error instanceof HttpsError && error.code === 'resource-exhausted') {
        throw new HttpsError('resource-exhausted', 'mistake_explain_rate_limited');
      }
      throw error;
    }
  }
  // зачем (Сверка 05.10: daily_limit у телефона с Plus): explain_free_daily_limit бывает только здесь. Печатаем,
  // что сервер НЕ признал Plus и чей лимит считается — так видно расхождение с телефоном (без uid целиком).
  try {
    return await enforceFreeJobGenLimit('mistake', authUid, stableUid, FREE_DAILY_CAP, nowMs);
  } catch (error) {
    console.warn('[AI-LIMIT] mistake_explain free path refused', {
      isPremium: false,
      reason: error instanceof HttpsError ? error.message : 'limit_check_failed',
      cap: FREE_DAILY_CAP,
      stableUidPrefix: stableUid.slice(0, 6),
      authDiffersFromStable: authUid !== stableUid,
    });
    throw error;
  }
}

/** PM-231: запрет немого catch — сбой отката кредита/лока пишет причину. */
function logMistakeCleanupFailure(step: string): (error: unknown) => void {
  return (error: unknown) => {
    console.error('[AI-LIMIT] mistake_explain cleanup failed', {
      step,
      reason: String((error as Error)?.message ?? error).slice(0, 200),
    });
  };
}

async function refundFreeDailyGenCap(reservation: MistakeFreeCapReservation | null): Promise<void> {
  if (!reservation) return;
  await refundFreeJobGenLimit(reservation);
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
// The mistake breakdown is the product's core paid hook: it must teach the ONE governing
// distinction behind each wrong word (e.g. "that" vs "it"), not generic filler. The weak nano
// tier reliably waters this down (it bleeds a baked example's framing onto the wrong axis), so
// this surface runs on the strong tier. Cost stays bounded: answers are short and cached once
// per unique mistake — every later reader of the same mistake is $0.
const MODEL_DEFAULT = 'gpt-4.1';

// Anti-abuse only — NOT an access gate. The breakdown itself is free for everyone
// (cache-warm model): the FIRST learner to make a given mistake pays for generation,
// every later learner reading the same cached breakdown costs $0.
const MAX_PER_WINDOW = 40;
const WINDOW_MS = 60 * 60 * 1000;

const MAX_PROMPT = 400;
const MAX_ANSWER = 600;
const MAX_MEANING = 400;
const MAX_WORD = 80;
const MAX_DIFF_PAIRS = 8;
// Keep the paid hook human-sized: enough for one real nuance plus the corrected sentence,
// tight enough that the model cannot turn a small near-miss into a lecture.
// зачем: 220 обрывало ответ на полуслове — промпт требует ставить исправленную фразу
// ПОСЛЕДНЕЙ, поэтому при длинном разборе именно она и терялась (репорт «Правильное
// предложение: "The[y]» — урок 14). 340 хватает на разбор + фразу, но всё ещё не даёт
// развернуть лекцию. Ретрай ниже добирает редкие случаи, где и этого мало.
const MAX_OUTPUT_TOKENS = 340;
// Один повтор с увеличенным лимитом, когда провайдер обрубил ответ по длине.
// Дороже только на редких длинных разборах: обычный путь по-прежнему один вызов.
const RETRY_OUTPUT_TOKENS = 520;
const BUNDLE_MAX_OUTPUT_TOKENS = 520;
const BUNDLE_RETRY_OUTPUT_TOKENS = 760;
const MAX_PROVIDER_ANSWER = 4_000;
const VALIDATION_MAX_ATTEMPTS = 3;

interface DiffPair {
  expected: string;
  picked: string;
}

interface ExplainMistakeRequest {
  lessonId?: unknown;
  phraseId?: unknown;
  studyTarget?: unknown;
  interfaceLang?: unknown;
  prompt?: unknown;
  userAnswer?: unknown;
  targetAnswer?: unknown;
  phraseMeaning?: unknown;
  selectedWrongWord?: unknown;
  expectedWord?: unknown;
  /** All mismatched word pairs (expected vs picked), not just the first one. */
  diffPairs?: unknown;
  /** 'full' = inline breakdown (default). 'eli5' = explain-like-I'm-five modal text. */
  variant?: unknown;
}

interface ExplainMistakePayload {
  lessonId: number;
  phraseId: string;
  studyTarget: string;
  interfaceLang: string;
  prompt?: string;
  userAnswer: string;
  targetAnswer: string;
  phraseMeaning?: string;
  selectedWrongWord?: string;
  expectedWord?: string;
  diffPairs: DiffPair[];
  variant: MistakeExplainVariant;
}

interface OpenAIChatResponse {
  // зачем: finish_reason не читался вовсе — обрезанный по лимиту ответ молча уходил
  // в кэш mistake_explanations и раздавался ВСЕМ, кто повторит ту же ошибку.
  choices?: { message?: { content?: unknown }; finish_reason?: unknown }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

type OpenAIUsage = MistakeOpenAiUsage;
type GenerateResult = { answer: string; usage: OpenAIUsage };
type CheckedGenerateResult = GenerateResult & { attempts: number; validatorRejects: number };
type CheckedBundleResult = {
  bundle: MistakeExplanationBundle;
  usage: OpenAIUsage;
  attempts: number;
  validatorRejects: number;
};

export interface ExplainMistakeResponse {
  ok: true;
  text: string;
  /** Present on FULL bundle responses so the client can prime both local variants. */
  fullText?: string;
  /** Present on FULL bundle responses so "explain simply" needs no second request. */
  eli5Text?: string;
  /** Поля разбора для новой карточки; старые сборки поле не читают и показывают `text`. */
  breakdown?: MistakeBreakdown;
  /** Kept for client back-compat. No daily cap anymore → always a large sentinel. */
  remainingQuota: number;
  model: string;
  fromCache: boolean;
  variant: MistakeExplainVariant;
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

function sanitizeLang(value: unknown): string {
  return resolveAiOutputLang(text(value, 16) || 'ru', 'mistake_explain');
}

function sanitizeStudyTarget(value: unknown): string {
  // зачем (владелец 11.11): здесь стояло «fr или en» — курсы ES/DE/IT уходили в промпт как английский.
  return resolveStudyTarget(value);
}

function sanitizeVariant(value: unknown): MistakeExplainVariant {
  return text(value, 8) === 'eli5' ? 'eli5' : 'full';
}

function sanitizeDiffPairs(value: unknown): DiffPair[] {
  if (!Array.isArray(value)) return [];
  const pairs: DiffPair[] = [];
  for (const raw of value) {
    if (pairs.length >= MAX_DIFF_PAIRS) break;
    const expected = text((raw as { expected?: unknown })?.expected, MAX_WORD);
    const picked = text((raw as { picked?: unknown })?.picked, MAX_WORD);
    if (expected || picked) pairs.push({ expected, picked });
  }
  return pairs;
}

/**
 * зачем (§142, логи выкладки 04.10): 5×400 и 2×503 прошли без единой строки функции — не видно, какой выход сработал.
 * Каждый немой выход пишет причину; тексты ответов ученика не пишем — только длины и коды.
 */
function explainInvalidInput(reason: string, data: ExplainMistakeRequest): never {
  console.warn('[EXPLAIN-MISTAKE] invalid_input', JSON.stringify({
    reason,
    lessonId: Number.isFinite(Number(data?.lessonId)) ? Number(data.lessonId) : String(typeof data?.lessonId),
    phraseIdChars: String(data?.phraseId ?? '').length,
    userAnswerChars: String(data?.userAnswer ?? '').length,
    targetAnswerChars: String(data?.targetAnswer ?? '').length,
  }));
  throw new HttpsError('invalid-argument', reason);
}

function explainPending(site: string, variant: unknown): never {
  console.warn('[EXPLAIN-MISTAKE] pending', JSON.stringify({ site, variant }));
  throw new HttpsError('unavailable', 'mistake_explanation_pending');
}

function sanitizePayload(data: ExplainMistakeRequest): ExplainMistakePayload {
  const lessonId = Number(data.lessonId);
  const phraseId = text(data.phraseId, 120);
  const userAnswer = text(data.userAnswer, MAX_ANSWER);
  const targetAnswer = text(data.targetAnswer, MAX_ANSWER);

  // зачем (04.10, журнал прода: все 400 = lesson_id_required c lessonId 0): раздел «Мои ошибки» не принадлежит уроку и
  // шлёт синтетический 0 (mistake_practice_session.tsx). Номер идёт только в строку учёта расходов — 0 = «вне урока».
  if (!Number.isInteger(lessonId) || lessonId < 0 || lessonId > 999) {
    explainInvalidInput('lesson_id_required', data);
  }
  if (!phraseId) explainInvalidInput('phrase_id_required', data);
  if (!userAnswer) explainInvalidInput('user_answer_required', data);
  if (!targetAnswer) explainInvalidInput('target_answer_required', data);

  return {
    lessonId,
    phraseId,
    studyTarget: sanitizeStudyTarget(data.studyTarget),
    interfaceLang: sanitizeLang(data.interfaceLang),
    prompt: text(data.prompt, MAX_PROMPT) || undefined,
    userAnswer,
    targetAnswer,
    phraseMeaning: text(data.phraseMeaning, MAX_MEANING) || undefined,
    selectedWrongWord: text(data.selectedWrongWord, MAX_WORD) || undefined,
    expectedWord: text(data.expectedWord, MAX_WORD) || undefined,
    diffPairs: sanitizeDiffPairs(data.diffPairs),
    variant: sanitizeVariant(data.variant),
  };
}

async function enforceRateLimit(db: FirebaseFirestore.Firestore, authUid: string, stableUid: string): Promise<void> {
  // зачем (Ревизор 3.124): общий дневной потолок одним документом '__all__' в пик давал конфликты транзакции, а они теперь
  // отказ — честные «Объяснить ошибку» падали бы «занято». Общий потолок денег держит шардированный spend_cap
  // (reserveDailySpend перед OpenAI), здесь остаются окна на uid и IP.
  const now = Date.now();
  const ref = db.collection(RATE_COLLECTION).doc(docId('mistake-rate', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const windowStartMs = Number(data.windowStartMs ?? 0);
    const count = Number(data.count ?? 0);
    const sameWindow = now - windowStartMs < WINDOW_MS;
    if (sameWindow && count >= MAX_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'mistake_explain_rate_limited');
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
 * Study-language-specific teaching data for the mistake prompts. The general instructions are
 * language-neutral; only the concrete EXAMPLES (which short forms are "not a mistake", which words
 * are safe throwaway illustrations) are language-specific and must never leak the wrong language's
 * examples to a learner of another language. English keeps the exact original wording (so the en
 * prompt is byte-identical). Unknown targets fall back to NO concrete example (general phrasing).
 */
interface TargetMistakeExamples {
  /** Sentence-fragment: short forms that are NOT a mistake, or '' to omit the example entirely. */
  shortForms: string;
  /** eli5 variant of the same, or ''. */
  shortFormsEli5: string;
  /** Two throwaway example words the eli5 prompt forbids bringing in ("cake"/"dishes"), or ''. */
  outsideWordsEli5: string;
}

const TARGET_MISTAKE_EXAMPLES: Record<StudyTarget, TargetMistakeExamples> = {
  en: {
    shortForms:
      'A SHORT FORM IS NOT A MISTAKE: "don\'t"="do not", "they\'re"="they are", "isn\'t"="is not". If ' +
      'the only difference is short-vs-full form, there is NO mistake — never say "use the full form". ',
    shortFormsEli5:
      'A SHORT FORM IS NOT A MISTAKE: "don\'t"="do not", "they\'re"="they are", "isn\'t"="is not". If ' +
      'that is the only difference, there is NO mistake — do not say "use the full form"; never bring ' +
      'in "You\'re" or other outside words.\n',
    outsideWordsEli5: 'no "cake", no "dishes"',
  },
  fr: {
    shortForms:
      'AN ELISION OR CONTRACTION IS NOT A MISTAKE: "j\'ai"="je ai", "l\'ami"="le ami", "d\'accord". If ' +
      'the only difference is the normal elided-vs-full form, there is NO mistake — never say "use the full form". ',
    shortFormsEli5:
      'AN ELISION IS NOT A MISTAKE: "j\'ai"="je ai", "l\'ami"="le ami". If that is the only difference, ' +
      'there is NO mistake — do not say "use the full form"; never bring in other outside words.\n',
    outsideWordsEli5: 'no outside example words',
  },
  // зачем (владелец 11.11, все пять курсов): у каждого языка свои «слитные формы, которые не ошибка»; чужие примеры не подставляем.
  es: {
    shortForms:
      'A STANDARD CONTRACTION IS NOT A MISTAKE: "al"="a el", "del"="de el". If the only difference is the ' +
      'normal contracted-vs-full form, there is NO mistake — never say "use the full form". ',
    shortFormsEli5:
      'A STANDARD CONTRACTION IS NOT A MISTAKE: "al"="a el", "del"="de el". If that is the only difference, ' +
      'there is NO mistake — do not say "use the full form"; never bring in other outside words.\n',
    outsideWordsEli5: 'no outside example words',
  },
  de: {
    shortForms:
      'A STANDARD CONTRACTION IS NOT A MISTAKE: "im"="in dem", "zum"="zu dem", "ins"="in das". If the only ' +
      'difference is the normal contracted-vs-full form, there is NO mistake — never say "use the full form". ',
    shortFormsEli5:
      'A STANDARD CONTRACTION IS NOT A MISTAKE: "im"="in dem", "zum"="zu dem". If that is the only difference, ' +
      'there is NO mistake — do not say "use the full form"; never bring in other outside words.\n',
    outsideWordsEli5: 'no outside example words',
  },
  it: {
    shortForms:
      'AN ELISION OR CONTRACTION IS NOT A MISTAKE: "l\'amico"="lo amico", "del"="di il", "al"="a il". If the ' +
      'only difference is the normal elided-vs-full form, there is NO mistake — never say "use the full form". ',
    shortFormsEli5:
      'AN ELISION IS NOT A MISTAKE: "l\'amico"="lo amico", "del"="di il". If that is the only difference, ' +
      'there is NO mistake — do not say "use the full form"; never bring in other outside words.\n',
    outsideWordsEli5: 'no outside example words',
  },
};

/** Study-language example set; unknown target ⇒ English default (payload.studyTarget is pre-resolved to one of the five course languages). */
function targetMistakeExamples(studyTarget: string): TargetMistakeExamples {
  return TARGET_MISTAKE_EXAMPLES[studyTarget as StudyTarget] ?? TARGET_MISTAKE_EXAMPLES.en;
}

/** Human-readable "wrong → right" list for the prompt, covering EVERY mismatched word. */
function diffPairsLine(pairs: DiffPair[]): string {
  if (pairs.length === 0) return '';
  return pairs
    .map((p) => `"${p.picked || '∅'}" → "${p.expected || '∅'}"`)
    .join(', ');
}

/**
 * зачем (владелец 11.11, аудит разбора): полный разбор больше не абзац между маркерами, а поля по строгой
 * схеме (см. explain/mistake_explain_structured.ts). Здесь — только сбор входа из уже проверенного payload.
 */
function buildFullStructuredMessages(payload: ExplainMistakePayload): MistakeExplainMessage[] {
  const langKey = resolvePromptLangKey(payload.interfaceLang);
  const { name, writeIn } = PROMPT_LANGUAGES[langKey];
  return buildStructuredMistakeMessages({
    targetName: studyTargetName((payload.studyTarget as StudyTarget) ?? 'en'),
    studyTarget: payload.studyTarget,
    interfaceLangKey: langKey,
    interfaceLangName: name,
    writeIn,
    shortFormsNote: targetMistakeExamples(payload.studyTarget).shortForms,
    prompt: payload.prompt,
    phraseMeaning: payload.phraseMeaning,
    userAnswer: payload.userAnswer,
    targetAnswer: payload.targetAnswer,
    diffHint: diffPairsLine(payload.diffPairs),
  });
}

function buildEli5Messages(payload: ExplainMistakePayload): Array<{ role: 'system' | 'user'; content: string }> {
  const allDiffs = diffPairsLine(payload.diffPairs);
  const langKey = resolvePromptLangKey(payload.interfaceLang);
  const { writeIn } = PROMPT_LANGUAGES[langKey];
  const targetName = studyTargetName((payload.studyTarget as StudyTarget) ?? 'en');
  const isEnglish = payload.studyTarget === 'en';
  const ex = targetMistakeExamples(payload.studyTarget);
  return [
    {
      role: 'system',
      content:
        `You are "Компас", a warm, gentle Phraseman tutor explaining ONE tiny ${targetName} word mistake to a ` +
        'beginner, as if kneeling next to a small child you like. Make them FEEL the single tiny ' +
        'difference between the word they typed and the word that belongs here, so next time they choose ' +
        'right themselves.\n\n' +
        'FIRST FIND THE REAL MISTAKE YOURSELF. You get LEARNER_ANSWER and CORRECT_ANSWER as raw text, ' +
        'plus a rough "wrong→right" list. That list is ONLY a hint and is often dirty: false pairs, words ' +
        'not in CORRECT_ANSWER, or many pairs when one matters. Compare the two raw sentences yourself; ' +
        'keep ONLY real differences; throw away any hinted pair you cannot see; trust the sentences, not ' +
        'the hint. The real mistake may be a tiny added/missing letter (a small tail on a word), a ' +
        'missing little word, or one word swapped for another.\n\n' +
        ex.shortFormsEli5 +
        'AN OPTIONAL LITTLE WORD IS NOT A MISTAKE (like the small "that" in "I think (that) you are ' +
        'right").\n' +
        'IF THERE IS NO REAL DIFFERENCE (empty hint, or the sentences mean and say the same): do NOT look ' +
        'for something to fix and do NOT open with "you wrote X but it should be Y". From the very first ' +
        'words, happily say it is already right, then give the sentence.\n' +
        'IF TWO THINGS CHANGED, teach only ONE — the most useful — in the simplest words, fix the other ' +
        'in passing. Never use a grammar word even with two changes.\n\n' +
        'THEN EXPLAIN ONLY THAT REAL DIFFERENCE. Talk only about the exact words that really differ in ' +
        `THIS pair. NEVER bring in any other ${targetName} words as examples — no outside lists, ${ex.outsideWordsEli5}. ` +
        'If a word is not in LEARNER_ANSWER or CORRECT_ANSWER, it must NOT appear. Make it ' +
        'click with a tiny everyday picture built ONLY from the words in this mistake.\n' +
        '- Two simply different/opposite words: say super simply what each means and that the other is ' +
        'needed. Done.\n' +
        '- A small shape change (a tiny letter, or a little word left out): show the small before/after ' +
        'of the very words from this sentence, plain and short — no meaning story.\n\n' +
        'NEVER invent: every reason must be true for THESE exact words. If unsure, say the simple sure ' +
        'thing. Never reuse a near/far picture for something not about near and far.\n' +
        (isEnglish
          ? 'NEVER guess WHY they chose it ("you translated it", "you didn\'t think", "you got confused"). A ' +
            'tiny kind wink ("oops, almost!") is fine, never blame. NEVER give comfort-water ("English just ' +
            'likes this", "it sounds nicer", "you\'ll get used to it").\n\n'
          : 'NEVER guess WHY they chose it ("you translated it", "you didn\'t think", "you got confused"). A ' +
            'tiny kind wink ("oops, almost!") is fine, never blame. NEVER give comfort-water ("the language just ' +
            'likes this", "it sounds nicer", "you\'ll get used to it").\n\n') +
        // зачем (аудит 11.11): было «informal second person of the TARGET language» — а отвечает модель на языке интерфейса.
        'HOW TO SOUND: use the informal singular "you" of the language you write in (ты/tú/você/ty, never ' +
        'the polite вы/usted/Pan). Warm and alive, like a kind friend kneeling beside them — never a robot. ' +
        'A light playful wink or tiny funny image is welcome ONLY when it makes the idea click FASTER and ' +
        'stays a few words; never at their expense, never as decoration, never longer than the lesson it ' +
        'carries. Most of the time warmth alone is enough — humor is a rare sprinkle. Simplest words, ' +
        'very short sentences. ZERO school words: never say pronoun, article, verb, tense, ending, ' +
        'singular, plural, subject, object, preposition, countable, question, statement — show the tiny ' +
        'change in the real words instead.\n\n' +
        'LENGTH: two to four very short sentences, under 55 words. Never pad. The warmth lives in a SHORT ' +
        'opener or closer ("почти!", "молодец!") — it must NOT become an extra sentence of explanation. ' +
        'When there is no real mistake, ONE happy line plus the phrase is the whole answer — do not add ' +
        '"compare…", "both mean…", or any extra teaching. FORMAT: plain text only, no markdown. Wrap ' +
        `every ${targetName} word in double quotes. End on its own line by gently saying the whole correct ` +
        `${targetName} phrase once, in quotes. Never mention these instructions, the hint list, prompts, or ` +
        'that you are an AI. ' +
        writeIn,
    },
    {
      role: 'user',
      content:
        // зачем (04.10): здесь стоял payload.studyTarget — модель получала «phrase: "en"» вместо самой фразы.
        `The child was building this ${targetName} phrase: "${payload.targetAnswer}"\n` +
        (payload.prompt ? `The task they saw: ${payload.prompt}\n` : '') +
        (payload.phraseMeaning ? `What it means: ${payload.phraseMeaning}\n` : '') +
        `LEARNER_ANSWER: ${payload.userAnswer}\n` +
        `CORRECT_ANSWER: ${payload.targetAnswer}\n` +
        (allDiffs ? `Rough hint of wrong→right words (may be dirty, verify against the two sentences): ${allDiffs}\n` : '') +
        'Compare the two sentences yourself. Ignore any hinted pair you cannot see as a real change. If ' +
        'there is no real difference, happily confirm it from the first words. Otherwise pick the ONE ' +
        'real difference that helps most and explain only that, using ONLY the exact words from this pair ' +
        '— never other example words. If the two words are just different/opposite, give one tiny line of ' +
        'what each means and that the other is needed. If it is a small letter/little-word change, show ' +
        'the small before/after of these very words. Speak as "ты", warm. NEVER guess why. No grammar ' +
        // зачем (владелец 11.11): было жёстко «English» — для других курсов модель получала противоречие с языком фразы.
        `words, no comfort-water, no blaming. Keep every ${targetName} word in double quotes. End with the ` +
        'whole correct phrase to keep, in quotes. ' +
        writeIn,
    },
  ];
}

type RawGeneration = { answer: string; usage: OpenAIUsage; truncated: boolean };

async function requestGeneration(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  maxTokens: number,
  responseFormat?: unknown,
): Promise<RawGeneration> {
  let response: Response;
  try {
    // зачем (владелец 18.10: «не больше 20 $ в день в принципе»): общий дневной потолок расходов — резерв до платного вызова.
    await reserveDailySpend({ fn: 'mistakeExplain', kind: 'chat', model, inTokens: 1500, outTokens: 500 });
    response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      // зачем: PM-231 — тайм-аут НА ПОПЫТКУ (3×35с < 120с потолка функции), чтобы
      // сработал обычный путь ошибки: возврат кредита, снятие лока, биллинг попыток.
      signal: AbortSignal.timeout(PAID_AI_FETCH_TIMEOUT_MS.mistakeExplain),
    });
  } catch (error) {
    const reason = paidAiFetchFailureReason(error);
    console.error('[AI-LIMIT] mistake_explain provider fetch failed', {
      reason,
      timeoutMs: PAID_AI_FETCH_TIMEOUT_MS.mistakeExplain,
      error: String((error as Error)?.message ?? error).slice(0, 200),
    });
    throw new HttpsError('unavailable', reason === 'timeout'
      ? 'mistake_explain_provider_timeout'
      : 'mistake_explain_provider_failed');
  }

  if (!response.ok) {
    console.error('mistake_explain chat failed', { status: response.status });
    throw new HttpsError('unavailable', 'mistake_explain_provider_failed');
  }

  const json = (await response.json()) as OpenAIChatResponse;
  const answer = text(json.choices?.[0]?.message?.content, MAX_PROVIDER_ANSWER);
  if (!answer) {
    throw new GeneratedOutputRejected(
      new HttpsError('unavailable', 'mistake_explain_empty_reply'),
      json.usage ?? {},
    );
  }
  return {
    answer,
    usage: json.usage ?? {},
    truncated: json.choices?.[0]?.finish_reason === 'length',
  };
}

async function generate(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  maxTokens: number,
  responseFormat?: unknown,
): Promise<GenerateResult> {
  const generated = await requestGeneration(apiKey, model, messages, maxTokens, responseFormat);
  if (generated.truncated) {
    // A truncated response is paid output, but it is not safe to show/cache. Let the shared
    // validator budget count it as one attempt so the callable never exceeds three calls.
    throw new GeneratedOutputRejected(
      new HttpsError('unavailable', 'mistake_explain_truncated'),
      generated.usage,
    );
  }
  return { answer: generated.answer, usage: generated.usage };
}

function assertMistakeGeneratedText(answer: string, payload: ExplainMistakePayload, section = 'text'): void {
  try {
    assertAiOutputLanguage({
      text: answer,
      targetLang: payload.interfaceLang,
      feature: 'mistake_explain',
    });
  } catch (error) {
    // зачем (§142, 04.10): 6 из 10 вызовов — 503 из-за ложного wrong_language на правильном русском тексте.
    // Печатаем, ЧТО решило отказ: причина гейта, доля чужого алфавита, латинские слова вне кавычек.
    const decision = describeGeneratedLanguageDecision(answer, resolveAiOutputLang(payload.interfaceLang, 'mistake_explain'));
    console.warn('[EXPLAIN-LANG] reject', JSON.stringify({
      section,
      variant: payload.variant,
      interfaceLang: payload.interfaceLang,
      textChars: answer.length,
      ...decision,
    }));
    throw error;
  }
}

function isMistakeGeneratedTextSafe(answer: string, payload: ExplainMistakePayload): boolean {
  try {
    assertMistakeGeneratedText(answer, payload);
    return true;
  } catch (error) {
    console.warn('mistake_explain cached text rejected by language guard', {
      variant: payload.variant,
      studyTarget: payload.studyTarget,
      interfaceLang: payload.interfaceLang,
      detail: String((error as Error)?.message ?? error).slice(0, 160),
    });
    return false;
  }
}

async function generateCheckedMistakeText(
  apiKey: string,
  model: string,
  payload: ExplainMistakePayload,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
): Promise<CheckedGenerateResult> {
  let lastAnswer = '';
  const checked = await generateWithOutputValidationRetry({
    maxAttempts: VALIDATION_MAX_ATTEMPTS,
    generate: (attempt) => generate(
      apiKey,
      model,
      messages,
      attempt === 1 ? MAX_OUTPUT_TOKENS : RETRY_OUTPUT_TOKENS,
    ),
    validate: (answer) => {
      lastAnswer = answer;
      assertMistakeGeneratedText(answer, payload);
      return answer;
    },
    isValidationError: isOutputValidationRejection,
    onValidationReject: (attempt, reason) => {
      // зачем (§126, 04.10): 503 ~21% = три отказа валидатора подряд, а причину лог не печатал.
      console.warn('mistake_explain validator rejected output', {
        variant: payload.variant,
        attempt,
        reason,
        interfaceLang: payload.interfaceLang,
        answerLength: lastAnswer.length,
        answerHead: lastAnswer.slice(0, 80),
      });
    },
  });
  return {
    answer: checked.value,
    usage: checked.usage,
    attempts: checked.attempts,
    validatorRejects: checked.validatorRejects,
  };
}

function validateMistakeBundle(
  answer: string,
  payload: ExplainMistakePayload,
): MistakeExplanationBundle {
  let parsed: ReturnType<typeof parseMistakeBreakdown>;
  try {
    parsed = parseMistakeBreakdown(answer, payload);
  } catch {
    throw new HttpsError('unavailable', 'mistake_explain_invalid_bundle');
  }
  const { breakdown } = parsed;
  if (parsed.droppedFragments) {
    // Модель указала на слово, которого нет в предложениях: подсветку снимаем, текст оставляем.
    // Тексты ответов не пишем — только факт и вердикт.
    console.warn('[EXPLAIN-MISTAKE] fragments_dropped', JSON.stringify({
      verdict: breakdown.verdict,
      interfaceLang: payload.interfaceLang,
      studyTarget: payload.studyTarget,
    }));
  }
  const full = renderBreakdownFullText(breakdown);
  assertMistakeGeneratedText(full, payload, 'full');
  assertMistakeGeneratedText(breakdown.simple, payload, 'eli5');
  if (breakdown.youSaid) assertMistakeGeneratedText(breakdown.youSaid, payload, 'you_said');
  return { full, eli5: breakdown.simple, breakdown };
}

async function generateCheckedMistakeBundle(
  apiKey: string,
  model: string,
  payload: ExplainMistakePayload,
): Promise<CheckedBundleResult> {
  const messages = buildFullStructuredMessages(payload);
  let lastBundleAnswer = '';
  const checked = await generateWithOutputValidationRetry({
    maxAttempts: VALIDATION_MAX_ATTEMPTS,
    generate: (attempt) => generate(
      apiKey,
      model,
      messages,
      attempt === 1 ? BUNDLE_MAX_OUTPUT_TOKENS : BUNDLE_RETRY_OUTPUT_TOKENS,
      MISTAKE_BREAKDOWN_RESPONSE_FORMAT,
    ),
    validate: (answer) => {
      lastBundleAnswer = answer;
      return validateMistakeBundle(answer, payload);
    },
    isValidationError: isOutputValidationRejection,
    onValidationReject: (attempt, reason) => {
      // зачем (§126, 04.10): см. выше — причина отказа обязана быть в журнале.
      console.warn('mistake_explain validator rejected output', {
        variant: 'full_bundle',
        attempt,
        reason,
        interfaceLang: payload.interfaceLang,
        answerLength: lastBundleAnswer.length,
        answerHead: lastBundleAnswer.slice(0, 80),
      });
    },
  });
  return {
    bundle: checked.value,
    usage: checked.usage,
    attempts: checked.attempts,
    validatorRejects: checked.validatorRejects,
  };
}

/** Classify the wrong-language subtype so rejected cache records retain a useful reason. */
function isLanguageRejection(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? '');
  return message.includes('wrong_language');
}

function isOutputValidationRejection(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? '');
  return message.includes('wrong_language')
    || message.includes('mistake_explain_invalid_bundle')
    || message.includes('mistake_explain_truncated')
    || message.includes('mistake_explain_empty_reply');
}

function paidOutputFailure(error: unknown): {
  originalError: unknown;
  usage: MistakeOpenAiUsage;
  exhausted: boolean;
} | null {
  if (error instanceof OutputValidationRetriesExhausted) {
    return { originalError: error.validationError, usage: error.usage, exhausted: true };
  }
  if (error instanceof OutputValidationRetryAborted) {
    return { originalError: error.generationError, usage: error.usage, exhausted: false };
  }
  return null;
}

/** Persist a checked FULL breakdown as the global ready doc (merge:true → idempotent under races). */
async function persistReadyMistakeBundle(
  mistakeHash: string,
  bundle: MistakeExplanationBundle,
  payload: ExplainMistakePayload,
  model: string,
  claimedAtMs: number,
): Promise<boolean> {
  return writeReadyMistakeExplanationBundle(mistakeHash, bundle, {
    lang: payload.interfaceLang,
    targetEn: payload.targetAnswer,
    userAnswer: payload.userAnswer,
    model,
  }, claimedAtMs);
}

async function recordPaidUsageOrHold(
  db: FirebaseFirestore.Firestore,
  params: Parameters<typeof recordBilling>[1],
  variant: 'eli5' | 'full_bundle',
): Promise<void> {
  try {
    await recordBilling(db, params);
  } catch (billingError) {
    console.error('mistake_explain paid-usage billing failed; lease held', {
      variant,
      errorName: String((billingError as Error)?.name ?? 'unknown').slice(0, 80),
    });
    throw new HttpsError('internal', 'mistake_explain_billing_unrecorded');
  }
}

async function recordBilling(
  db: FirebaseFirestore.Firestore,
  params: {
    stableUid: string;
    authUid: string;
    payload: ExplainMistakePayload;
    model: string;
    mistakeHash: string;
    usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  },
): Promise<void> {
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: params.stableUid,
    authUid: params.authUid,
    lessonId: params.payload.lessonId,
    phraseId: params.payload.phraseId,
    mistakeHash: params.mistakeHash,
    variant: params.payload.variant,
    model: params.model,
    promptTokens: Number(params.usage.prompt_tokens ?? 0),
    completionTokens: Number(params.usage.completion_tokens ?? 0),
    totalTokens: Number(params.usage.total_tokens ?? 0),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export const explainMistake = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 120,
  memory: '512MiB',
  minInstances: 0,
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request): Promise<ExplainMistakeResponse> => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  // Прогрев инстанса (см. app/ai_callable_resilience.ts). Выходим САМЫМ первым
  // делом — до Firestore, до гейтов, до OpenAI.
  // зачем: у функции minInstances: 0 (осознанная экономия, сторож
  // ai_functions_warm_instance_contract). Клиент будит инстанс, пока пользователь
  // читает свою ошибку, — реальный разбор попадает на тёплый сервер. Ping НЕ пишет в базу,
  // не списывает дневной кап и не зовёт ИИ: всё это идёт ниже.
  if ((request.data as { warmupPing?: unknown } | null)?.warmupPing === true) {
    // зачем (владелец 11.11: «разбор готовится очень долго» → кнопкой «Да, все четыре правки»; журнал 18:44/18:45 —
    // опознание аккаунта занимает 3,8–4,2 с на каждый разбор): прогрев опознаёт аккаунт заранее и кладёт в память
    // инстанса. Это несколько ЧТЕНИЙ на открытие урока — осознанное решение владельца; записей, капов и ИИ здесь нет
    // (сторож tests/ai_warmup_ping_contract.test.ts).
    await warmMistakeExplainRuntime(admin.firestore(), request.auth.uid);
    return {
      ok: true,
      text: '',
      remainingQuota: 0,
      model: 'warmup-ping',
      fromCache: false,
      variant: 'full',
    };
  }

  const data = (request.data ?? {}) as ExplainMistakeRequest;
  const payload = sanitizePayload(data);

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const langKey = resolvePromptLangKey(payload.interfaceLang);
  const mistakeHash = mistakeHashFor(payload.targetAnswer, payload.userAnswer, langKey, payload.studyTarget);
  // зачем (владелец 11.11: «ускорить серверные проверки»; журнал 17:34 — 6 с до первой проверки и ещё 6 с цепочки):
  // три независимых шага идут ОДНОВРЕМЕННО, а не по очереди — личность, потолок на адрес и чтение кэша.
  // Смысл прежний: отказ любого шага роняет вызов, кэш читается бесплатно. stageMs печатается в конце — видно,
  // какой шаг на самом деле съел время.
  const handlerStartedAtMs = Date.now();
  const stageMs: Record<string, number> = {};
  let identitySource = 'unknown';
  const timed = async <T>(stage: string, work: Promise<T>): Promise<T> => {
    try {
      return await work;
    } finally {
      stageMs[stage] = Date.now() - handlerStartedAtMs;
    }
  };
  const [stableUid, , cached] = await Promise.all([
    // зачем (владелец 11.11): опознание берётся из памяти инстанса, если прогрев или прошлый разбор уже его сделали.
    timed('stableUid', resolveMistakeStableUid(db, authUid).then((identity) => {
      identitySource = identity.source;
      return identity.stableUid;
    })),
    // зачем (Ревизор 18.10, аудит накрутки п.3/п.4): ферма анонимов с одного адреса — потолок вызовов в сутки на IP.
    timed('ipWindow', enforceCallerRateWindow({ scope: 'mistake_explain_ip', authUid, rawRequest: request.rawRequest, maxPerUid: 0, maxPerIp: 30, windowMs: 24 * 60 * 60 * 1000 })),
    // 1. Cache FIRST — the ≥99% path, $0.
    timed('cacheRead', readCachedMistakeExplanation(mistakeHash)),
  ]);
  const logTiming = (result: string): void => {
    console.log('[EXPLAIN-MISTAKE] timing', JSON.stringify({ result, variant: payload.variant, totalMs: Date.now() - handlerStartedAtMs, identitySource, stageDoneAtMs: stageMs }));
  };
  // зачем (владелец 11.11, все языковые курсы): видно, какой язык курса прислал телефон и каким его понял сервер —
  // расхождение (прислали «es», поняли «en») раньше было немым. Тексты ответов не пишем.
  console.log('[EXPLAIN-MISTAKE] request', JSON.stringify({
    studyTargetRaw: text(data.studyTarget, 16),
    studyTarget: payload.studyTarget,
    interfaceLang: payload.interfaceLang,
    variant: payload.variant,
    lessonId: payload.lessonId,
  }));
  const RQ = 999; // Legacy response sentinel; miss-only free cap is enforced server-side.

  const cachedModel = text(cached?.model, 100) || MODEL_DEFAULT;
  const resolveProvider = async (): Promise<{ apiKey: string; model: string }> => {
    // зачем (PM-224): глобальный рубильник ИИ «Пульта» останавливал диалоги и объяснения фраз,
    // но не разбор ошибок. Проверка ТОЛЬКО на промахе кэша (здесь, перед платным вызовом):
    // кэш бесплатен и отдаётся даже при выключенном ИИ. Бросаем внутри try вызывающего —
    // pending-замок снимается штатно, дневной кап ещё не списан.
    if (await aiGloballyDisabled(db)) {
      console.warn('[PM-224] explainMistake blocked', JSON.stringify({ reason: 'ai_globally_disabled', variant: payload.variant }));
      throw new HttpsError('failed-precondition', 'ai_globally_disabled');
    }
    const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
    if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');
    const model = await resolveConfiguredDialogModel(
      db,
      process.env.OPENAI_MISTAKE_EXPLAIN_MODEL || process.env.OPENAI_DIALOG_MODEL || MODEL_DEFAULT,
    );
    return { apiKey, model };
  };

  if (payload.variant === 'eli5') {
    // Cached ELI5 → $0.
    if (cached?.eli5 && isMistakeGeneratedTextSafe(cached.eli5, payload)) {
      return { ok: true, text: cached.eli5, remainingQuota: RQ, model: cachedModel, fromCache: true, variant: 'eli5' };
    }
    if (cached?.eli5) await invalidateMistakeCachedVariant(mistakeHash, 'eli5');
    const eli5ClaimedAtMs = Date.now();
    const claimedEli5 = await claimMistakeEli5PendingLock(mistakeHash, eli5ClaimedAtMs);
    if (!claimedEli5) {
      for (let poll = 0; poll < PENDING_POLL_ATTEMPTS; poll += 1) {
        await new Promise((resolve) => setTimeout(resolve, PENDING_POLL_DELAY_MS));
        const latest = await readCachedMistakeExplanation(mistakeHash);
        if (latest?.eli5 && isMistakeGeneratedTextSafe(latest.eli5, payload)) {
          return {
            ok: true,
            text: latest.eli5,
            remainingQuota: RQ,
            model: text(latest.model, 100) || MODEL_DEFAULT,
            fromCache: true,
            variant: 'eli5',
          };
        }
      }
      explainPending('eli5_1', payload.variant);
    }
    let freeCapReservation: MistakeFreeCapReservation | null = null;
    let gen: CheckedGenerateResult;
    let model = MODEL_DEFAULT;
    let generationStartedAtMs = 0;
    try {
      const provider = await resolveProvider();
      model = provider.model;
      freeCapReservation = await reserveFreeDailyGenCap(db, authUid, stableUid);
      await enforceRateLimit(db, authUid, stableUid);
      generationStartedAtMs = Date.now();
      gen = await generateCheckedMistakeText(provider.apiKey, model, payload, buildEli5Messages(payload));
    } catch (error) {
      let finalError = error;
      const paidFailure = paidOutputFailure(error);
      if (paidFailure) {
        await recordPaidUsageOrHold(db, {
          stableUid,
          authUid,
          payload,
          model,
          mistakeHash,
          usage: paidFailure.usage,
        }, 'eli5');
        finalError = paidFailure.originalError;
      }
      await refundFreeDailyGenCap(freeCapReservation).catch(logMistakeCleanupFailure('refund_daily_credit'));
      await releaseMistakeEli5PendingLock(mistakeHash, eli5ClaimedAtMs).catch(logMistakeCleanupFailure('release_eli5_lock'));
      throw finalError;
    }
    let eli5ResultText = gen.answer;
    // A paid response without durable accounting is held behind its lease. Do not
    // refund/release here: that would allow a blind paid regeneration.
    await recordPaidUsageOrHold(
      db,
      { stableUid, authUid, payload, model, mistakeHash, usage: gen.usage },
      'eli5',
    );
    try {
      const published = await writeEli5MistakeExplanation(mistakeHash, gen.answer, eli5ClaimedAtMs);
      if (!published) {
        const latest = await readCachedMistakeExplanation(mistakeHash);
        if (latest?.eli5 && isMistakeGeneratedTextSafe(latest.eli5, payload)) {
          eli5ResultText = latest.eli5;
        } else {
          explainPending('eli5_2', payload.variant);
        }
      }
    } catch (error) {
      await refundFreeDailyGenCap(freeCapReservation).catch(logMistakeCleanupFailure('refund_daily_credit'));
      await releaseMistakeEli5PendingLock(mistakeHash, eli5ClaimedAtMs).catch(logMistakeCleanupFailure('release_eli5_lock'));
      throw error;
    }
    console.info('mistake_explain generated', {
      variant: 'eli5',
      generationAttempts: gen.attempts,
      validatorRejects: gen.validatorRejects,
      fromCache: false,
      bundleGenerated: false,
      durationMs: Math.max(0, Date.now() - generationStartedAtMs),
    });
    return { ok: true, text: eli5ResultText, remainingQuota: RQ, model, fromCache: false, variant: 'eli5' };
  }

  // FULL breakdown path.
  if (cached?.status === 'ready' && cached.full && isMistakeGeneratedTextSafe(cached.full, payload)) {
    let cachedEli5 = cached.eli5;
    if (cachedEli5 && !isMistakeGeneratedTextSafe(cachedEli5, { ...payload, variant: 'eli5' })) {
      await invalidateMistakeCachedVariant(mistakeHash, 'eli5');
      cachedEli5 = undefined;
    }
    logTiming('cache_hit');
    return {
      ok: true,
      text: cached.full,
      fullText: cached.full,
      eli5Text: cachedEli5,
      breakdown: coerceStoredBreakdown(cached.breakdown),
      remainingQuota: RQ,
      model: cachedModel,
      fromCache: true,
      variant: 'full',
    };
  }
  if (cached?.status === 'ready' && cached.full) {
    await invalidateMistakeCachedVariant(mistakeHash, 'full');
  }
  if (cached?.status === 'rejected' && !isRetryableRejectedMistake(cached, Date.now())) {
    // Serve a live generation rather than a stale rejection for the user in front of us,
    // but don't touch the cache (the lock claim below handles regeneration timing).
  }

  // Claim before charging/generating. A concurrent caller waits briefly for the
  // winner, then returns a retryable pending signal instead of paying twice.
  const fullClaimedAtMs = Date.now();
  // зачем (владелец 11.11): настройки ИИ читаются одновременно с захватом замка — это только чтения, без списаний.
  // Ошибку (например, ИИ выключен рубильником) не теряем: она всплывёт в try ниже, где замок снимается штатно.
  const providerPromise = timed('provider', resolveProvider());
  providerPromise.catch((error: unknown) => {
    // Причина не теряется: тот же промис ждётся в try ниже и бросит там; здесь только метка, чтобы отказ не считался необработанным.
    console.warn('[EXPLAIN-MISTAKE] provider:early_failure', JSON.stringify({ code: String((error as { code?: unknown })?.code ?? 'unknown').slice(0, 60) }));
  });
  const claimed = await timed('claimLock', claimMistakePendingLock(mistakeHash, fullClaimedAtMs));
  if (!claimed) {
    for (let poll = 0; poll < PENDING_POLL_ATTEMPTS; poll += 1) {
      await new Promise((resolve) => setTimeout(resolve, PENDING_POLL_DELAY_MS));
      const latest = await readCachedMistakeExplanation(mistakeHash);
      if (latest?.status === 'ready' && latest.full && isMistakeGeneratedTextSafe(latest.full, payload)) {
        let latestEli5 = latest.eli5;
        if (latestEli5 && !isMistakeGeneratedTextSafe(latestEli5, { ...payload, variant: 'eli5' })) {
          await invalidateMistakeCachedVariant(mistakeHash, 'eli5');
          latestEli5 = undefined;
        }
        return {
          ok: true,
          text: latest.full,
          fullText: latest.full,
          eli5Text: latestEli5,
          breakdown: coerceStoredBreakdown(latest.breakdown),
          remainingQuota: RQ,
          model: text(latest.model, 100) || MODEL_DEFAULT,
          fromCache: true,
          variant: 'full',
        };
      }
    }
    explainPending('full_1', payload.variant);
  }

  let gen: CheckedBundleResult;
  let freeCapReservation: MistakeFreeCapReservation | null = null;
  let model = MODEL_DEFAULT;
  let generationStartedAtMs = 0;
  try {
    const provider = await providerPromise;
    model = provider.model;
    // зачем (владелец 11.11; журнал 18:44/18:45 — кап и окно частоты по очереди занимали 1,7–3,0 с): оба шага идут
    // одновременно. Отказ любого по-прежнему останавливает вызов до платной генерации; если кап уже зарезервирован,
    // а окно частоты отказало, кап возвращается внутри помощника — freeCapReservation остаётся null, двойного возврата нет.
    freeCapReservation = await timed('capAndRate', reserveCapAndRateTogether({
      reserveCap: () => reserveFreeDailyGenCap(db, authUid, stableUid),
      enforceRate: () => enforceRateLimit(db, authUid, stableUid),
      refundCap: (reservation) => refundFreeDailyGenCap(reservation),
    }));
    generationStartedAtMs = Date.now();
    gen = await timed('generation', generateCheckedMistakeBundle(provider.apiKey, model, payload));
  } catch (error) {
    logTiming(`failed:${String((error as { code?: unknown })?.code ?? (error as Error)?.name ?? 'unknown').slice(0, 60)}`);
    let finalError = error;
    const paidFailure = paidOutputFailure(error);
    if (paidFailure) {
      await recordPaidUsageOrHold(db, {
        stableUid,
        authUid,
        payload,
        model,
        mistakeHash,
        usage: paidFailure.usage,
      }, 'full_bundle');
      finalError = paidFailure.originalError;
    }
    // Only deterministic output-validation exhaustion becomes rejected. Provider/network
    // failures remain transient and are handled by the existing client transport retry.
    if (claimed && paidFailure?.exhausted && isOutputValidationRejection(finalError)) {
      await writeRejectedMistakeExplanation(
        mistakeHash,
        isLanguageRejection(finalError) ? 'non_target_language' : 'invalid_output_bundle',
        fullClaimedAtMs,
      ).catch((cacheError) => {
        console.error('mistake_explain rejected-cache write failed', {
          errorName: String((cacheError as Error)?.name ?? 'unknown').slice(0, 80),
        });
      });
    }
    await refundFreeDailyGenCap(freeCapReservation).catch(logMistakeCleanupFailure('refund_daily_credit'));
    await releaseMistakePendingLock(mistakeHash, fullClaimedAtMs).catch(logMistakeCleanupFailure('release_full_lock'));
    throw finalError;
  }

  // Publish the two validated sections together: a reader can never observe a ready full
  // explanation without the ELI5 text generated in the same provider response.
  await recordPaidUsageOrHold(
    db,
    { stableUid, authUid, payload, model, mistakeHash, usage: gen.usage },
    'full_bundle',
  );
  let resultBundle = gen.bundle;
  try {
    const published = await persistReadyMistakeBundle(
      mistakeHash,
      gen.bundle,
      payload,
      model,
      fullClaimedAtMs,
    );
    if (!published) {
      const latest = await readCachedMistakeExplanation(mistakeHash);
      if (
        latest?.status === 'ready'
        && latest.full
        && latest.eli5
        && isMistakeGeneratedTextSafe(latest.full, payload)
        && isMistakeGeneratedTextSafe(latest.eli5, { ...payload, variant: 'eli5' })
      ) {
        resultBundle = { full: latest.full, eli5: latest.eli5, breakdown: coerceStoredBreakdown(latest.breakdown) };
      } else {
        explainPending('full_2', payload.variant);
      }
    }
  } catch (error) {
    await refundFreeDailyGenCap(freeCapReservation).catch(logMistakeCleanupFailure('refund_daily_credit'));
    await releaseMistakePendingLock(mistakeHash, fullClaimedAtMs).catch(logMistakeCleanupFailure('release_full_lock'));
    throw error;
  }
  console.info('mistake_explain generated', {
    variant: 'full_bundle',
    generationAttempts: gen.attempts,
    validatorRejects: gen.validatorRejects,
    fromCache: false,
    bundleGenerated: true,
    durationMs: Math.max(0, Date.now() - generationStartedAtMs),
  });
  logTiming('generated');

  return {
    ok: true,
    text: resultBundle.full,
    fullText: resultBundle.full,
    eli5Text: resultBundle.eli5,
    breakdown: resultBundle.breakdown,
    remainingQuota: RQ,
    model,
    fromCache: false,
    variant: 'full',
  };
});
