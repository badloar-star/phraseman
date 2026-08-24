/**
 * ai_safety.ts — детектор опасных сообщений в ИИ-диалоге + safety-инструкция
 * для системного промпта + запись флага в Firestore + мгновенный Telegram-алерт.
 *
 * Юридический смысл: ИИ-собеседник, доступный в т.ч. подросткам, без реакции на
 * темы суицида/самоповреждения — это прямой риск (иски Character.AI, расследование
 * FTC). Минимально необходимый контроль:
 *   1) в промпт — инструкция мягко реагировать и направлять к помощи, не продолжать
 *      обычную «ролёвку» на опасную тему;
 *   2) детектор по ключевым словам (быстро, без доп. расходов и задержек) — флагует
 *      входящее сообщение пользователя;
 *   3) при флаге: запись в коллекцию `safety_flags` (для раздела админки) +
 *      немедленный Telegram-алерт оператору со ссылкой на переписку.
 *
 * Детектор намеренно простой и «с запасом» (лучше лишний флаг оператору, чем
 * пропуск). Второй слой — OpenAI Moderation API (moderateUserText): ловит то,
 * что не покрывается ключевыми словами (секс-контент, дети, угрозы, ненависть).
 * Кейс-мотиватор: реплика «Sex with children» прошла мимо ключевых слов —
 * ни одна категория её не покрывала, админка показывала «Опасных сообщений нет».
 */

import * as admin from 'firebase-admin';
import { sendTelegramAlert, ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import {
  SAFETY_FLAG_AGE_CONTRACT,
  readServerSafetyAgeEvidence,
  safetyFlagAgeBracket,
} from './safety_flag_age_contract';

export const SAFETY_FLAG_WRITER_AGE_CONTRACT = SAFETY_FLAG_AGE_CONTRACT;

export type SafetyCategory =
  | 'self_harm'
  | 'suicide'
  | 'abuse'
  | 'violence'
  | 'sexual_minors'
  | 'sexual'
  | 'hate'
  | 'illicit'
  // Голосовой учитель (max_voice_safety): грубость/травля учителя, признание
  // несовершеннолетия, прочее на усмотрение модели.
  | 'harassment'
  | 'minor'
  | 'other';

export interface SafetyVerdict {
  flagged: boolean;
  category: SafetyCategory | null;
  matched: string | null;
}

/**
 * Инструкция для системного промпта. Добавляется к ЛЮБОМУ режиму (companion/scenario),
 * чтобы ИИ не «отыгрывал» опасную тему, а реагировал по-человечески и направлял к помощи.
 * Никаких диагнозов/терапии — только поддержка + указатель на профессиональную помощь.
 */
export const SAFETY_SYSTEM_INSTRUCTION =
  'SAFETY: You are a friendly language-learning companion, not a therapist, doctor, or crisis service. ' +
  'If the user expresses thoughts of suicide, self-harm, abuse, or being in danger, do NOT continue the lesson, role-play, game, or correction. ' +
  'Respond briefly, with warmth and without judgement, take it seriously, and gently encourage them to reach out to a trusted person or a local helpline or emergency services right now. ' +
  'Never give methods, never minimise, never pretend to be a human counsellor, and never claim to provide professional help. Keep it short and caring. ' +
  'If the user brings up sexual content (ESPECIALLY anything sexual involving children or minors), graphic violence, or threats, do NOT play along, do NOT joke, and do NOT repeat their words: set one short, firm boundary in simple English (e.g. "I will not talk about that.") and either steer back to the scene or end the conversation. ' +
  'In game mode, treat such messages as the worst possible behaviour: drop mood straight to 0 and end the scene.';

/**
 * Многоязычные триггеры (EN/RU/UK/ES — языки приложения). Строчные, проверяются по
 * подстроке в нормализованном тексте. Список консервативный, цель — высокая чувствительность
 * на самоповреждение/суицид (главная регуляторная категория).
 */
const TRIGGERS: ReadonlyArray<{ category: SafetyCategory; phrases: ReadonlyArray<string> }> = [
  {
    category: 'suicide',
    phrases: [
      // EN
      'kill myself', 'killing myself', 'suicide', 'suicidal', 'end my life', 'ending my life',
      'want to die', 'wanna die', "don't want to live", 'do not want to live', 'better off dead',
      'take my own life', 'no reason to live', 'end it all',
      // RU
      'покончить с собой', 'покончу с собой', 'суицид', 'самоубийство', 'убить себя', 'убью себя',
      'не хочу жить', 'хочу умереть', 'хочу сдохнуть', 'свести счёты с жизнью', 'свести счеты с жизнью',
      // UK
      'покінчити з собою', 'покінчу з собою', 'самогубство', 'вбити себе', 'не хочу жити', 'хочу померти',
      // ES
      'suicidarme', 'suicidio', 'matarme', 'quitarme la vida', 'no quiero vivir', 'quiero morir',
    ],
  },
  {
    category: 'self_harm',
    phrases: [
      // EN
      'cut myself', 'cutting myself', 'hurt myself', 'harm myself', 'self harm', 'self-harm',
      'burn myself', 'starve myself',
      // RU
      'режу себя', 'порезать себя', 'причинить себе вред', 'наношу себе', 'self-harm',
      // UK
      'ріжу себе', 'порізати себе', 'завдати собі шкоди',
      // ES
      'hacerme daño', 'cortarme', 'autolesion', 'autolesión', 'lastimarme',
    ],
  },
  {
    category: 'abuse',
    phrases: [
      // EN
      'being abused', 'he hits me', 'she hits me', 'they hit me', 'i am being hurt', 'someone hurts me',
      'raped', 'molested', 'beats me',
      // RU
      'меня бьют', 'меня насилуют', 'надо мной издеваются', 'меня изнасиловали',
      // UK (апострофы убраны намеренно — normalize() тоже их вырезает, поэтому
      // совпадёт и "мене б'ють", и "мене бʼють", и "мене бють")
      'мене бють', 'мене ґвалтують', 'мене зґвалтували',
      // ES
      'me pegan', 'me maltratan', 'me violaron', 'abusan de mí',
    ],
  },
  {
    // Сексуальный контент про детей — мгновенный флаг с максимальным приоритетом
    // (юридически самая тяжёлая категория; кейс «Sex with children»).
    category: 'sexual_minors',
    phrases: [
      // EN
      'sex with child', 'sex with children', 'sex with kids', 'sex with a kid',
      'sex with minors', 'sex with a minor', 'child porn', 'child pornography',
      'pedophile', 'paedophile',
      // RU
      'секс с детьми', 'секс с ребенком', 'секс с ребёнком', 'секс с несовершеннолетн',
      'детское порно', 'педофил',
      // UK
      'секс з дітьми', 'секс з дитиною', 'дитяче порно', 'педофіл',
      // ES
      'sexo con niños', 'sexo con ninos', 'sexo con menores', 'pornografía infantil', 'pornografia infantil',
    ],
  },
  {
    // Прямые угрозы насилия (тип 'violence' существовал, но фраз не было —
    // категория была мертва).
    category: 'violence',
    phrases: [
      // EN (normalize() вырезает апострофы: "i'll kill you" → "ill kill you")
      'i will kill', 'ill kill you', 'i want to kill', 'going to kill you', 'gonna kill you',
      'kill them all', 'shoot everyone', 'shoot up the',
      // RU
      'я тебя убью', 'убью тебя', 'хочу убить', 'всех убью', 'пойду убивать', 'взорву',
      // UK (апострофы вырезаны normalize(): "вб'ю" → "вбю")
      'я тебе вбю', 'вбю тебе', 'хочу вбити', 'всіх вбю',
      // ES
      'te voy a matar', 'voy a matar', 'quiero matar', 'los matare', 'los mataré',
    ],
  },
];

function normalize(text: string): string {
  return String(text || '')
    .toLowerCase()
    // Убираем все виды апострофов (ASCII ', типографский ’, украинский ʼ, гравис `),
    // чтобы "б'ють"/"бʼють"/"бють" нормализовались к одной форме.
    .replace(/['’ʼ`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Быстрый детектор по ключевым словам. Возвращает первую сработавшую категорию.
 * (Точка расширения: при желании здесь же можно дернуть OpenAI Moderation API и
 * объединить вердикты — сигнатура SafetyVerdict не меняется.)
 */
export function evaluateSafety(userText: string): SafetyVerdict {
  const t = normalize(userText);
  if (!t) return { flagged: false, category: null, matched: null };
  for (const group of TRIGGERS) {
    for (const phrase of group.phrases) {
      if (t.includes(phrase)) {
        return { flagged: true, category: group.category, matched: phrase };
      }
    }
  }
  return { flagged: false, category: null, matched: null };
}

// ── Второй слой: OpenAI Moderation API ──────────────────────────────────────
// Ключевые слова принципиально не покрывают перефразировки и «новые» категории
// (секс-контент, дети, ненависть). Moderation API бесплатен и быстр (~0.3-0.5с);
// вызывающий стартует его ПАРАЛЛЕЛЬНО платному chat-вызову — 0 добавленной задержки.

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
const MODERATION_MODEL = 'omni-moderation-latest';
const MODERATION_TIMEOUT_MS = 8000;
const MODERATION_MAX_INPUT = 4000;

/**
 * Маппинг категорий Moderation API → наши SafetyCategory, В ПОРЯДКЕ ТЯЖЕСТИ:
 * первая совпавшая побеждает. Обычный harassment (грубость без угроз) НЕ флагуем —
 * грубость в ролёвке легальна (сцены «спор из-за счёта» и т.п.), иначе админку
 * зальёт шумом.
 */
const MODERATION_CATEGORY_MAP: ReadonlyArray<{ api: string; category: SafetyCategory }> = [
  { api: 'sexual/minors', category: 'sexual_minors' },
  { api: 'self-harm/intent', category: 'suicide' },
  { api: 'self-harm/instructions', category: 'self_harm' },
  { api: 'self-harm', category: 'self_harm' },
  { api: 'violence/graphic', category: 'violence' },
  { api: 'violence', category: 'violence' },
  { api: 'harassment/threatening', category: 'violence' },
  { api: 'hate/threatening', category: 'hate' },
  { api: 'hate', category: 'hate' },
  { api: 'illicit/violent', category: 'illicit' },
  { api: 'illicit', category: 'illicit' },
  { api: 'sexual', category: 'sexual' },
];

interface ModerationApiResponse {
  results?: Array<{ flagged?: boolean; categories?: Record<string, unknown> }>;
}

/**
 * Прогнать текст через OpenAI Moderation API. НИКОГДА не бросает — при любом
 * сбое (сеть/таймаут/квота) возвращает «не флагнуто»: модерация не должна
 * ломать или задерживать ответ пользователю. Сбой логируется.
 */
export async function moderateUserText(apiKey: string, userText: string): Promise<SafetyVerdict> {
  const none: SafetyVerdict = { flagged: false, category: null, matched: null };
  const input = String(userText || '').trim().slice(0, MODERATION_MAX_INPUT);
  if (!apiKey || !input) return none;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(OPENAI_MODERATION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: MODERATION_MODEL, input }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      console.error('[ai_safety] moderation request failed', { status: response.status });
      return none;
    }
    const json = (await response.json()) as ModerationApiResponse;
    const result = json.results?.[0];
    if (!result?.flagged) return none;
    const categories = (result.categories ?? {}) as Record<string, unknown>;
    for (const { api, category } of MODERATION_CATEGORY_MAP) {
      if (categories[api] === true) {
        return { flagged: true, category, matched: `moderation:${api}` };
      }
    }
    // Флагнуто только в категориях, которые мы сознательно не алертим
    // (например, обычный harassment в рамках ролёвки).
    return none;
  } catch (error) {
    console.error('[ai_safety] moderation call failed', {
      error: String((error as Error)?.message ?? error).slice(0, 300),
    });
    return none;
  }
}

interface SafetyFlagContext {
  authUid: string;
  stableUid: string;
  mode: string;
  userText: string;
  history?: ReadonlyArray<{ role: string; content: string }>;
  /**
   * Полный транскрипт разговора (голосовые уроки): владелец 2026-08-16 —
   * «сохранение всех грубых и опасных разговоров». Обрезан вызывающим.
   */
  transcript?: string;
  /** Откуда флаг: 'keywords' | 'moderation' | 'tutor_tool' | … (для оператора). */
  source?: string;
  /** Сессия голосового урока/звонка — дедуп флагов одной сессии между мгновенным репортом и разбором. */
  sessionId?: string;
  /**
   * До какого момента запись хранится (владелец 2026-08-16: «храним пару лет
   * на случай нужды по закону»). Информационное поле для админки/чистки.
   */
  retainUntilMs?: number;
}

interface MaxVoiceSafetySignalContext {
  mode: 'voice_tutor' | 'voice_call';
  source: 'keywords' | 'moderation' | 'tutor_tool';
}

/** Срок хранения записей сейфти-журнала голосовых уроков: 2 года. */
export const SAFETY_FLAG_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function clip(value: unknown, max: number): string {
  const out = String(value ?? '').trim();
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Записать флаг в Firestore `safety_flags` (для админки) и отправить Telegram-алерт.
 * Никогда не бросает — сбой алерта не должен ломать ответ пользователю.
 */
export async function recordSafetyFlag(
  verdict: SafetyVerdict,
  ctx: SafetyFlagContext,
): Promise<void> {
  if (!verdict.flagged || !verdict.category) return;
  const db = admin.firestore();
  const ageEvidence = await readServerSafetyAgeEvidence(db, ctx.stableUid);
  const ageBracket = safetyFlagAgeBracket(ageEvidence);

  // Последние реплики для контекста оператора (обрезаем длину).
  const historyContext = (ctx.history ?? [])
    .slice(-8)
    .map((m) => ({ role: String(m.role || ''), content: clip(m.content, 500) }));

  try {
    await db.collection('safety_flags').doc().set({
      uid: ctx.stableUid,
      authUid: ctx.authUid,
      ageBracket,
      ageEvidence,
      category: verdict.category,
      matched: verdict.matched,
      mode: ctx.mode,
      userText: clip(ctx.userText, 2000),
      historyContext,
      ...(ctx.transcript ? { transcript: clip(ctx.transcript, 12_000) } : {}),
      ...(ctx.source ? { source: ctx.source } : {}),
      ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
      ...(ctx.retainUntilMs ? { retainUntilMs: ctx.retainUntilMs, retentionReason: 'legal_safety' } : {}),
      handled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    });
  } catch (error) {
    console.error('[ai_safety] failed to write safety_flag', error);
  }

  try {
    // Уважаем per-type тоггл из admin_config/alerts: шлём, ЕСЛИ тип не выключен явно
    // (safety = default-on; чтобы заглушить — надо снять галочку «🆘» в админке).
    let safetyTypeEnabled = true;
    try {
      const cfgSnap = await db.doc('admin_config/alerts').get();
      const cfg = cfgSnap.exists ? (cfgSnap.data() || {}) : {};
      if (cfg.types && cfg.types.safetyFlag === false) safetyTypeEnabled = false;
    } catch {
      /* нет конфига — оставляем default-on */
    }
    if (safetyTypeEnabled) {
      const msg =
        `🆘 <b>Safety flag</b> — ${escapeHtml(verdict.category)}\n` +
        `<b>User:</b> ${escapeHtml(ctx.stableUid)}` +
        (ageBracket ? ` (${escapeHtml(ageBracket)})` : '') +
        `\n<b>Mode:</b> ${escapeHtml(ctx.mode)}` +
        (ctx.source ? ` (${escapeHtml(ctx.source)})` : '') +
        `\n<b>Matched:</b> ${escapeHtml(verdict.matched)}\n` +
        `<b>Message:</b> ${escapeHtml(clip(ctx.userText, 400))}`;
      await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value() || process.env.ADMIN_ALERT_BOT_TOKEN || '', msg, null);
    }
  } catch (error) {
    console.error('[ai_safety] failed to send safety alert', error);
  }
}

/**
 * MAX-specific operator signal. The owner-approved MAX privacy boundary forbids
 * conversation content, learner identity and session identifiers in safety
 * alerts or durable storage. This path deliberately does not touch Firestore.
 */
export async function recordMaxVoiceSafetySignal(
  verdict: SafetyVerdict,
  ctx: MaxVoiceSafetySignalContext,
): Promise<boolean> {
  if (!verdict.flagged || !verdict.category) return false;
  try {
    const msg =
      `🆘 <b>MAX safety signal</b>\n` +
      `<b>Category:</b> ${escapeHtml(verdict.category)}\n` +
      `<b>Mode:</b> ${escapeHtml(ctx.mode)}\n` +
      `<b>Source:</b> ${escapeHtml(ctx.source)}\n` +
      'Conversation content and learner identity are not retained.';
    return await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value() || process.env.ADMIN_ALERT_BOT_TOKEN || '', msg, null);
  } catch (error) {
    console.error('[ai_safety] failed to send redacted MAX safety signal', error);
    return false;
  }
}
