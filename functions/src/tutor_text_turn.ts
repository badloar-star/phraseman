/**
 * tutorTextTurn — один ход текстового урока с Максом.
 *
 * зачем (владелец 2026-09-14): «весь каркас Макса перенести в особый диалог с
 * тутором — он реально учит, использует весь обучающий каркас MAX, но в дешёвом
 * режиме без реального соединения». Голосовой раздел запломбирован (решение
 * владельца 2026-09-04, 59% звонков заканчивались на нуле секунд при цене
 * Realtime-минуты), поэтому текстовый урок — это НЕ его возврат, а отдельная
 * дешёвая фича на тех же предметных модулях.
 *
 * Что переиспользуется у MAX: каталог целей can-do, память ученика между
 * уроками, правила безопасности. Что НЕ переиспользуется: WebRTC, минты,
 * минуты, watchdog, реконнекты — вся дорогая инфраструктура голоса.
 *
 * Имена намеренно БЕЗ префикса maxVoice*: grep по «maxVoice» не должен путать
 * эту функцию с законсервированным разделом. Живёт в основной кодбазе
 * functions/src, а не в functions-max (там пломба).
 *
 * НЕ в deploy:safe whitelist — деплой прицельно:
 *   firebase deploy --only functions:tutorTextTurn
 */

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { resolveConfiguredDialogModel, modelSupportsJsonObject } from './openai_dialog_model_config';
import { resolveRemoteBools } from './remote_gates';
import { resolveStudyTarget, studyTargetName } from './ai_language_contract';
import { evaluateSafety, moderateUserText, recordSafetyFlag } from './ai_safety';
import { ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import {
  BILLING_COLLECTION,
  OPENAI_CHAT_URL,
  asCefr,
  asInterfaceLang,
  enforceDailyQuota,
  enforceRateLimit,
  releaseDailyQuota,
  sanitizeHistory,
  text,
  type ChatMessage,
  type OpenAIChatResponse,
} from './premium_dialog';
import { buildTutorTextPrompt } from './tutor_text_prompt';
// зачем тот же sanitizeCoach, что и в диалогах (владелец 2026-09-15: «у Макса
// точно так же должно быть как в диалогах»): подсказки обязаны разбираться
// одинаково, иначе кнопки на его репликах вели бы себя иначе, чем на репликах
// собеседника.
import { sanitizeCoach, type DialogCoachEnvelope } from './premium_dialog';
import {
  canDoGoalById,
  pickNextGoal,
  type CanDoGoal,
} from './max_voice_can_do_goals';
import {
  readTutorMemory,
  applyTutorMemoryUpdate,
  type TutorMemoryUpdate,
} from './max_voice_tutor_memory';

if (!admin.apps.length) admin.initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'us-central1';
const MAX_USER_TEXT = 2000;

/**
 * Бюджет вывода. Конверт урока — реплика + инструменты (доска, отметка фразы,
 * шаг мастерства, домашка). Реплика Макса короткая (2-4 предложения), но
 * инструменты и объяснение на родном языке добавляют объём; кириллица дороже
 * латиницы примерно вдвое. 700 покрывает финальный ход с домашкой.
 */
// зачем 900, а не 700 (2026-09-15): в конверт добавились подсказки (note,
// translation, suggestions) — те же, что в диалогах. На старом потолке
// финальный ход с домашкой обрезался бы, а вместе с ним терялся lessonComplete,
// то есть урок не закрывался бы вовсе. Тот же урок уже был выучен в диалогах.
const TUTOR_OUTPUT_TOKENS = 900;

/** Сколько реплик урока держим в контексте: дальше память важнее стенограммы. */
const TUTOR_HISTORY_TURNS = 12;

export interface TutorTextTurnRequest {
  userText?: unknown;
  history?: unknown;
  cefr?: unknown;
  interfaceLang?: unknown;
  studyTarget?: unknown;
  /** Цель урока из каталога can-do; пусто — сервер выберет следующую сам. */
  goalId?: unknown;
  /** Сколько реплик Макса уже было (бюджет урока вместо секунд звонка). */
  turnIndex?: unknown;
  /**
   * Стабильный id урока (один на всю сессию, клиент задаёт при входе).
   * По нему память отличает повторный ход от нового урока — без него счётчик
   * пройденных уроков рос бы на каждую реплику.
   */
  lessonId?: unknown;
  /** Прогрев инстанса. */
  warmupPing?: unknown;
}

/**
 * Инструменты Макса в текстовом уроке. Это те же действия, что у голосового
 * тутора (доска, отметка фразы, шаг мастерства, домашка), но приезжают они
 * полями JSON-конверта, а не function-call по data-каналу Realtime: одна
 * генерация вместо двух, и парсинг такой же, как у обычного диалога.
 */
export interface TutorTextTools {
  /** Фраза на доску: её видно над чатом и можно отправить в карточки. */
  board: { text: string; meaning: string } | null;
  /** Оценка попытки ученика произнести целевую фразу. */
  phraseResult: { text: string; ok: boolean } | null;
  /** Шаг мастерства текущей цели (0..3); null — без изменений. */
  goalMastery: number | null;
  /** Домашка на следующий раз: 1-3 фразы. */
  homework: string[];
  /** Тема следующего урока. */
  nextTopic: string;
  /** Урок завершён по мнению Макса. */
  lessonComplete: boolean;
}

const EMPTY_TOOLS: TutorTextTools = {
  board: null,
  phraseResult: null,
  goalMastery: null,
  homework: [],
  nextTopic: '',
  lessonComplete: false,
};

/** Разбирает инструменты из конверта. Никогда не бросает: мусор → пустые поля. */
export function sanitizeTutorTools(parsed: Record<string, unknown>): TutorTextTools {
  const rawBoard = parsed.board && typeof parsed.board === 'object'
    ? (parsed.board as Record<string, unknown>)
    : null;
  const boardText = rawBoard ? text(rawBoard.text, 160).replace(/\[\[|\]\]/g, '') : '';

  const rawPhrase = parsed.phraseResult && typeof parsed.phraseResult === 'object'
    ? (parsed.phraseResult as Record<string, unknown>)
    : null;
  const phraseText = rawPhrase ? text(rawPhrase.text, 160).replace(/\[\[|\]\]/g, '') : '';

  const masteryRaw = Number(parsed.goalMastery);
  const goalMastery = Number.isFinite(masteryRaw)
    ? Math.max(0, Math.min(3, Math.round(masteryRaw)))
    : null;

  const homework = Array.isArray(parsed.homework)
    ? parsed.homework
        .map((item) => text(item, 160).replace(/\[\[|\]\]/g, ''))
        .filter((item) => item.length > 0)
        .slice(0, 3)
    : [];

  return {
    board: boardText ? { text: boardText, meaning: rawBoard ? text(rawBoard.meaning, 200) : '' } : null,
    phraseResult: phraseText ? { text: phraseText, ok: rawPhrase?.ok === true } : null,
    goalMastery,
    homework,
    nextTopic: text(parsed.nextTopic, 140),
    lessonComplete: parsed.lessonComplete === true,
  };
}

/**
 * Разбор конверта урока: реплика + инструменты. Как и в обычном диалоге,
 * реплика идёт ПЕРВЫМ полем и спасается даже из обрезанного JSON — иначе
 * человек увидел бы сырой JSON вместо слов учителя.
 */
export function parseTutorEnvelope(
  content: string,
): { reply: string; tools: TutorTextTools; coach: DialogCoachEnvelope | null; truncated?: boolean } | null {
  const unfenced = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(unfenced) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') {
    const match = unfenced.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
    if (!match) return null;
    const recovered = text(
      match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
      1200,
    );
    if (!recovered) return null;
    // Обрезанный конверт: реплику спасли, подсказки потеряны — кнопки просто
    // будут приглушены, урок не ломается.
    return { reply: recovered, tools: EMPTY_TOOLS, coach: null, truncated: true };
  }

  const reply = text(parsed.reply, 1200);
  if (!reply) return null;
  return { reply, tools: sanitizeTutorTools(parsed), coach: sanitizeCoach(parsed) };
}

/** Формат ответа, который просим у модели. Реплика первой — см. parseTutorEnvelope. */
function outputFormatBlock(targetName: string, learnerLangName: string): string {
  return `
OUTPUT FORMAT: respond with a single JSON object and nothing else, keys in exactly this order:
{"reply": "<your message to the learner, with [[target phrases]]>", "note": "", "translation": "", "suggestions": [], "board": {"text": "<the phrase to put on the board, or empty>", "meaning": "<its meaning in ${learnerLangName}>"}, "phraseResult": {"text": "<the phrase the learner just tried>", "ok": true}, "goalMastery": null, "homework": [], "nextTopic": "", "lessonComplete": false}

Field rules:
- "reply" holds ONLY what you say to the learner. Everything else is for the app.
- "note": 1-2 short sentences in ${learnerLangName} explaining WHY your line is worded this way — the rule or habit behind it. The app shows it in a "why" sheet; you never say it aloud.
- "translation": a faithful, natural ${learnerLangName} translation of your "reply".
- "suggestions": 2-3 short ${targetName} answers the learner could send next, fitting what you just said.
- "board": set it when you introduce a new target phrase the learner should see and keep; otherwise null. The app shows it above the chat and can save it to flashcards.
- "phraseResult": set it ONLY when the learner just tried to produce the target phrase. "ok" is true when they got it close enough to be understood.
- "goalMastery": 0-3, how well they can now do today's goal. Raise it only on real evidence: they produced the phrase themselves, correctly, in a situation you set. Never award 3 before they used it at least twice.
- "homework": on the closing message only — 1-3 ${targetName} phrases to practice before next time.
- "nextTopic": on the closing message only — what you will teach next time, in ${learnerLangName}.
- "lessonComplete": true only on your closing message.`;
}

export const tutorTextTurn = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  minInstances: 0,
  maxInstances: 20,
  secrets: [OPENAI_API_KEY, ADMIN_ALERT_BOT_TOKEN],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('[TUTOR-TEXT] rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const data = (request.data ?? {}) as TutorTextTurnRequest;

  // Прогрев инстанса: выходим ДО Firestore и OpenAI — ping обязан быть
  // бесплатным (сторож ai_warmup_ping_contract).
  if (data.warmupPing === true) {
    return { ok: true, reply: '', tools: EMPTY_TOOLS, model: 'warmup-ping' };
  }

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('[TUTOR-TEXT] rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  const cefr = asCefr(data.cefr);
  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const turnIndex = Math.max(0, Math.min(40, Math.round(Number(data.turnIndex) || 0)));
  // Первый ход урока идёт БЕЗ реплики ученика: Макс говорит первым (прямое
  // требование владельца — «никогда не молчит и всегда говорит первый»).
  const userText = text(data.userText, MAX_USER_TEXT);
  const isOpeningTurn = turnIndex === 0 && !userText;
  if (!userText && !isOpeningTurn) {
    console.warn('[TUTOR-TEXT] rejected', { reason: 'user_text_required', turnIndex });
    throw new HttpsError('invalid-argument', 'user_text_required');
  }

  const db = admin.firestore();
  const authUid = request.auth.uid;

  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Один параллельный блок: гейты, модель, память, подписка. Память урока —
  // ОДНО чтение на ход; на дешёвом пути это единственный поход в Firestore
  // сверх лимитов.
  const [gates, tutorModel, memory, isPremium] = await Promise.all([
    resolveRemoteBools(db, { ai_global_disable: false, gate_ai_text_tutor: false }),
    resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL),
    readTutorMemory(db, authUid, stableUid),
    resolvePremiumAccess(db, stableUid, Date.now(), authUid),
  ]);

  if (gates.ai_global_disable) {
    console.warn('[TUTOR-TEXT] rejected', { reason: 'ai_globally_disabled' });
    throw new HttpsError('failed-precondition', 'ai_globally_disabled');
  }
  // Флаг раздела — kill-switch: по умолчанию ВКЛЮЧЁН, «Пульт» может выключить
  // живьём. Дефолт FALSE держался ровно один день и оказался вредным: раздел
  // был пуст у всех, включая владельца, потому что записи в remote_config ещё
  // нет, а клиент и сервер оба читали «выключено». Новая фича, закрытая от
  // самого автора, — это не осторожность, а поломка.
  if (!gates.gate_ai_text_tutor) {
    console.warn('[TUTOR-TEXT] rejected', { reason: 'tutor_text_disabled' });
    throw new HttpsError('failed-precondition', 'tutor_text_disabled');
  }

  // Урок тратит те же дневные реплики, что и обычный диалог: отдельной валюты
  // не заводим, иначе человек не поймёт, где кончается один лимит и начинается
  // другой. Часовой лимит — своё окно 'tt', чтобы урок не съедал лимит диалогов.
  await enforceRateLimit(authUid, stableUid, 'dlg');
  const remaining = await enforceDailyQuota(authUid, stableUid, isPremium, isPremium ? 200 : 10);

  // Цель урока: явная из запроса или следующая незакрытая из каталога.
  const requestedGoalId = text(data.goalId, 40);
  const goal: CanDoGoal | null = requestedGoalId
    ? canDoGoalById(requestedGoalId) ?? null
    : pickNextGoal(memory.goalMastery, cefr);

  const history = sanitizeHistory(data.history).slice(-TUTOR_HISTORY_TURNS);
  const systemPrompt =
    buildTutorTextPrompt({
      cefr,
      interfaceLang,
      studyTarget,
      goal,
      mastery: memory.goalMastery,
      memory,
      turnIndex,
      learnerName: memory.preferredName ?? '',
      nowMs: Date.now(),
    }) + outputFormatBlock(studyTargetName(studyTarget), interfaceLang);

  // Safety на входящем тексте — те же два слоя, что в диалоге. Не блокируют
  // ответ: модерация идёт параллельно, флаги дожидаются перед return.
  const safetyCtx = { authUid, stableUid, mode: 'tutor_text', userText, history };
  const verdict = userText ? evaluateSafety(userText) : { flagged: false as const, categories: [] as string[] };
  const keywordFlag = verdict.flagged
    ? recordSafetyFlag(verdict as Parameters<typeof recordSafetyFlag>[0], safetyCtx).catch((e) => {
        console.warn('[TUTOR-TEXT] safety flag write failed', {
          reason: String((e as Error)?.message ?? e).slice(0, 120),
        });
      })
    : null;
  const moderationFlag = verdict.flagged || !userText
    ? null
    : moderateUserText(apiKey, userText)
        .then((m) => (m.flagged ? recordSafetyFlag(m, safetyCtx) : undefined))
        .catch((e) => {
          console.warn('[TUTOR-TEXT] moderation failed', {
            reason: String((e as Error)?.message ?? e).slice(0, 120),
          });
        });
  const flushSafety = async (): Promise<void> => {
    if (keywordFlag) await keywordFlag;
    if (moderationFlag) await moderationFlag;
  };

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    ...(userText
      ? [{ role: 'user' as const, content: userText }]
      : // Открывающий ход: реплики ученика нет, поэтому явная инструкция —
        // иначе модель ждала бы ввода и вернула пустоту.
        [{ role: 'user' as const, content: '[The learner just opened the lesson. Start it yourself.]' }]),
  ];

  const startedAtMs = Date.now();
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let reply = '';
  let tools: TutorTextTools = EMPTY_TOOLS;
  let coach: DialogCoachEnvelope | null = null;

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: tutorModel,
        max_tokens: TUTOR_OUTPUT_TOKENS,
        messages,
        temperature: 0.7,
        ...(modelSupportsJsonObject(tutorModel) ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[TUTOR-TEXT] chat failed', {
        status: response.status,
        model: tutorModel,
        detail: detail.slice(0, 400),
      });
      throw new HttpsError('unavailable', 'tutor_provider_failed');
    }

    const json = (await response.json()) as OpenAIChatResponse;
    usage.prompt_tokens = Number(json.usage?.prompt_tokens ?? 0);
    usage.completion_tokens = Number(json.usage?.completion_tokens ?? 0);
    usage.total_tokens = Number(json.usage?.total_tokens ?? 0);

    const envelope = parseTutorEnvelope(text(json.choices?.[0]?.message?.content, 4000));
    if (!envelope) {
      console.error('[TUTOR-TEXT] envelope unrecoverable', { model: tutorModel, turnIndex });
      throw new HttpsError('unavailable', 'tutor_provider_failed');
    }
    reply = envelope.reply;
    tools = envelope.tools;
    coach = envelope.coach;
    if (envelope.truncated) {
      console.warn('[TUTOR-TEXT] envelope truncated — reply recovered, tools dropped', { turnIndex });
    }
  } catch (error) {
    // Сбой провайдера не должен съедать дневную реплику.
    await releaseDailyQuota(authUid, stableUid).catch((e) => {
      console.warn('[TUTOR-TEXT] quota release failed', {
        reason: String((e as Error)?.message ?? e).slice(0, 120),
      });
    });
    await flushSafety();
    if (error instanceof HttpsError) throw error;
    console.error('[TUTOR-TEXT] provider exception', {
      model: tutorModel,
      error: String((error as Error)?.message ?? error).slice(0, 400),
    });
    throw new HttpsError('unavailable', 'tutor_provider_failed');
  }

  console.log('[TUTOR-TEXT] turn ok', {
    turnIndex,
    goalId: goal?.id ?? null,
    opening: isOpeningTurn,
    replyChars: reply.length,
    board: tools.board != null,
    phraseResult: tools.phraseResult != null,
    goalMastery: tools.goalMastery,
    homework: tools.homework.length,
    lessonComplete: tools.lessonComplete,
    completionTokens: usage.completion_tokens,
    ms: Date.now() - startedAtMs,
  });

  /**
   * зачем: без этой записи Макс забывал урок начисто — память только читалась.
   * Человек видел бы «первый урок» вечно: ни домашки, ни темы, ни мастерства
   * цели, ни очереди повторения. Пишем ОДИН раз, на закрывающем ходу, чтобы
   * один урок стоил одной записи, а не одной на каждую реплику.
   *
   * sessionId обязателен: по нему merge отличает повторный ход от нового урока
   * (иначе счётчик «сколько уроков было» врал бы кратно числу реплик).
   */
  if (tools.lessonComplete) {
    const lessonSessionId = text(data.lessonId, 64) || `tt_${stableUid}_${Math.floor(startedAtMs / 1000)}`;
    const memoryUpdate: TutorMemoryUpdate = {
      nowMs: Date.now(),
      sessionId: lessonSessionId,
      cefr,
      homework: tools.homework,
      nextTopic: tools.nextTopic,
      goalId: goal?.id ?? '',
      goalProgress:
        goal && tools.goalMastery != null
          ? { goalId: goal.id, mastery: tools.goalMastery, evidence: 'lesson' }
          : null,
      phraseResults: tools.phraseResult
        ? [{ text: tools.phraseResult.text, result: tools.phraseResult.ok ? 'pass' : 'needs_work' }]
        : [],
      // Домашку без доказанной практики не сохраняем: обещание «повторите это»
      // без единой удачной попытки на уроке — пустой долг.
      enforceHomeworkEvidence: true,
    };
    await applyTutorMemoryUpdate(db, authUid, stableUid, memoryUpdate).then((next) => {
      console.log('[TUTOR-TEXT] memory saved', {
        lessonSessionId,
        goalId: goal?.id ?? null,
        masteryAfter: goal ? next.goalMastery[goal.id] ?? 0 : null,
        homework: next.homework.length,
        nextTopic: next.nextTopic.length > 0,
        phraseQueue: next.phraseQueue.length,
      });
    });
  }

  await Promise.all([
    flushSafety(),
    db.collection(BILLING_COLLECTION).doc().set({
      uid: stableUid,
      authUid,
      mode: 'tutor_text',
      model: tutorModel,
      cefr,
      goalId: goal?.id ?? null,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      isPremium,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    }).catch((e) => {
      console.warn('[TUTOR-TEXT] billing write failed', {
        reason: String((e as Error)?.message ?? e).slice(0, 120),
      });
    }),
  ]);

  return {
    ok: true,
    reply,
    tools,
    // Подсказки для кнопок на реплике Макса: те же поля, что у диалогов.
    coach,
    goal: goal
      ? {
          id: goal.id,
          level: goal.level,
          title: goal.title,
          mastery: memory.goalMastery[goal.id] ?? 0,
        }
      : null,
    remainingQuota: remaining,
    model: tutorModel,
  };
});
