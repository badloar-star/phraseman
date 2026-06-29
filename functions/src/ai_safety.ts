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
 * пропуск). При желании позже можно добавить OpenAI Moderation API как второй,
 * более точный слой — точка вызова та же (см. evaluateSafety).
 */

import * as admin from 'firebase-admin';
import { sendTelegramAlert, ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';

export type SafetyCategory = 'self_harm' | 'suicide' | 'abuse' | 'violence';

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
  'Never give methods, never minimise, never pretend to be a human counsellor, and never claim to provide professional help. Keep it short and caring.';

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

interface SafetyFlagContext {
  authUid: string;
  stableUid: string;
  ageBracket?: string | null;
  mode: string;
  userText: string;
  history?: ReadonlyArray<{ role: string; content: string }>;
}

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

  // Последние реплики для контекста оператора (обрезаем длину).
  const historyContext = (ctx.history ?? [])
    .slice(-8)
    .map((m) => ({ role: String(m.role || ''), content: clip(m.content, 500) }));

  try {
    await db.collection('safety_flags').doc().set({
      uid: ctx.stableUid,
      authUid: ctx.authUid,
      ageBracket: ctx.ageBracket ?? null,
      category: verdict.category,
      matched: verdict.matched,
      mode: ctx.mode,
      userText: clip(ctx.userText, 2000),
      historyContext,
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
        (ctx.ageBracket ? ` (${escapeHtml(ctx.ageBracket)})` : '') +
        `\n<b>Mode:</b> ${escapeHtml(ctx.mode)}\n` +
        `<b>Matched:</b> ${escapeHtml(verdict.matched)}\n` +
        `<b>Message:</b> ${escapeHtml(clip(ctx.userText, 400))}`;
      await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value() || process.env.ADMIN_ALERT_BOT_TOKEN || '', msg, null);
    }
  } catch (error) {
    console.error('[ai_safety] failed to send safety alert', error);
  }
}
