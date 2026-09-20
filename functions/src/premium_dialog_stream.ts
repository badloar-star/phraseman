import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import {
  resolveConfiguredDialogModel,
  resolveConfiguredDialogQuota,
  modelSupportsJsonObject,
} from './openai_dialog_model_config';
import { resolveRemoteBools } from './remote_gates';
import {
  dialogueContractHttpError,
  resolveDialogueTargetBeforeWarmup,
  type ActivatedDialogueStudyTarget,
} from './dialogue_ai_language_contract';
// SAFETY_SYSTEM_INSTRUCTION здесь больше не нужен: он входит в системный промпт
// внутри renderGlobalRules (стабильный префикс, кэш OpenAI). Импортировать его
// сюда снова — верный признак, что кто-то опять клеит safety в хвост.
import {
  evaluateSafety,
  moderateUserText,
  recordSafetyFlag,
} from './ai_safety';
import { ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import {
  BILLING_COLLECTION,
  GAME_OUTPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
  OPENAI_CHAT_URL,
  asCefr,
  assertDialogReplyMatchesTarget,
  buildCompanionSystemPrompt,
  buildScenarioSystemPrompt,
  enforceDailyQuota,
  enforceRateLimit,
  isGameMode,
  parseGameEnvelope,
  releaseDailyQuota,
  sanitizeGameStateForRequest,
  sanitizeHistory,
  sanitizeMemory,
  sanitizeObjectives,
  sanitizeRegulatedAdviceReply,
  sanitizeDialogGeneratedRegulatedFields,
  assertDialogGeneratedTargetFields,
  scenarioPromptDataForModel,
  text,
  type ChatMessage,
  type DialogCoachEnvelope,
  type PremiumDialogRequest,
} from './premium_dialog';
import {
  DIALOG_REPEAT_RETRY_INSTRUCTION,
  DialogRepeatedReplyError,
  generateDialogWithRepeatGuard,
} from './premium_dialog_quality';
// Чистый парсер вынесен отдельно, чтобы тест не поднимал весь граф функций.
import { createLiveReplyPublisher, extractPartialReply, publishAcceptedDialogReply, type LiveDialogEvent } from './premium_dialog_stream_parse';
import {
  createStageTimer,
  resolveDialogGatesCached,
  resolveDialogIdentityCached,
} from './premium_dialog_fastpath';

export { createLiveReplyPublisher, extractPartialReply };

if (!admin.apps.length) admin.initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * Стриминговая версия диалога.
 *
 * зачем: владелец сообщил, что «ИИ очень долго думает и отвечает». Первый аудит
 * показал, что callable ждал последний токен; вторая итерация (2026-09-14,
 * «ускорь на 100%, чтобы отвечали немедленно») — что и «стрим» держал ВЕСЬ ответ
 * у себя до анти-повтор проверки и лишь потом резал его на дельты. Теперь:
 *
 *   1. для English каждый кусочек ответа модели уходит клиенту СРАЗУ
 *      (createLiveReplyPublisher, монотонный хвост; в игровом режиме — поле
 *      reply из недописанного JSON); остальные target-языки буферизуются;
 *   2. если анти-повтор отверг первый черновик — клиенту уходит кадр `reset`,
 *      и он стирает напечатанное перед второй попыткой;
 *   3. языковой гард и фильтр регулируемых советов применяются к ПОЛНОМУ тексту
 *      перед `done`; не-English получает первую дельту только после этих guard'ов,
 *      а `done` несёт авторитетный текст, которым клиент заменяет черновик;
 *   4. личность и подписка кэшируются на инстанс (premium_dialog_fastpath) —
 *      перед моделью больше нет 7–8 последовательных походов в Firestore.
 *
 * Почему onRequest, а не onCall: callable-протокол Firebase не умеет стримить —
 * он отдаёт один JSON после завершения. Поэтому здесь ручная проверка ID-токена
 * (ровно то же, что callable делает внутри) и ручной CORS.
 *
 * Старый premiumDialogSend НЕ удалён: он остаётся фолбэком, если стриминг упал
 * или недоступен. Все проверки, лимиты и постфильтры переиспользуются ИМПОРТОМ,
 * а не копией — иначе две ветки разъехались бы по правилам безопасности.
 */

const REGION = 'us-central1';
const MAX_USER_TEXT = 2000;

/**
 * English keeps the low-latency live path. Every other target is fail-closed:
 * provider text stays buffered until the complete accepted reply passes the
 * regulated-advice and target-language guards.
 */
export function canPublishUncheckedProviderDelta(studyTarget: string): boolean {
  return studyTarget === 'en';
}

/** Один кадр SSE. */
type StreamEvent =
  | LiveDialogEvent
  | { type: 'started' | 'done' | 'error'; [key: string]: unknown };

function sseWrite(res: { write: (chunk: string) => void }, event: StreamEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Разбор SSE-потока OpenAI. Возвращает накопленный текст и usage.
 * onDelta зовётся на каждый кусочек; вызывающая сторона решает, можно ли
 * публиковать его сразу или нужно дождаться проверки полного ответа.
 */
async function readOpenAiStream(
  body: NodeJS.ReadableStream,
  onDelta: (chunk: string, accumulated: string) => void,
): Promise<{ full: string; usage: Record<string, number> }> {
  let buffer = '';
  let full = '';
  let usage: Record<string, number> = {};

  for await (const raw of body) {
    buffer += typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
    // Кадры SSE разделены пустой строкой; последний неполный кусок оставляем в буфере.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: unknown } }[];
            usage?: Record<string, number> | null;
          };
          const piece = json.choices?.[0]?.delta?.content;
          if (typeof piece === 'string' && piece) {
            full += piece;
            onDelta(piece, full);
          }
          if (json.usage) usage = json.usage;
        } catch (e) {
          // Битый кадр не должен рушить весь ответ — пропускаем его, но пишем причину.
          console.warn('[DIALOG-LAT] stream: skipped malformed provider frame', {
            reason: String((e as Error)?.message ?? e).slice(0, 120),
          });
        }
      }
    }
  }
  return { full, usage };
}

/** Код отказа личности (deletion pending / mismatch) → HTTP-код и текст для клиента. */
function identityFailure(error: unknown): { status: number; code: string } {
  const code = text((error as { message?: unknown })?.message, 60) || 'auth_required';
  const status = code === 'account_deletion_pending' || code === 'stable_id_mismatch' ? 403 : 401;
  return { status, code };
}

export const premiumDialogStream = onRequest({
  region: REGION,
  timeoutSeconds: 60,
  memory: '512MiB',
  minInstances: 0,
  maxInstances: 20,
  cors: true,
  secrets: [OPENAI_API_KEY, ADMIN_ALERT_BOT_TOKEN],
}, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const timer = createStageTimer();
  const data = (req.body ?? {}) as PremiumDialogRequest & { warmupPing?: unknown };

  // Ручная проверка ID-токена: callable делает это внутри, здесь — сами.
  const authHeader = String(req.headers.authorization ?? '');
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    res.status(401).json({ error: 'auth_required' });
    return;
  }
  let authUid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    authUid = decoded.uid;
  } catch (e) {
    console.warn('[DIALOG-LAT] stream: id token rejected', {
      reason: String((e as Error)?.message ?? e).slice(0, 120),
    });
    res.status(401).json({ error: 'auth_required' });
    return;
  }
  timer.mark('authMs');

  // Bind the authenticated request to the exact reviewed pack before warmup,
  // Firestore quota/access reads, or provider work. Unknown contract errors are
  // collapsed rather than exposing internal details.
  let requestedTarget: ActivatedDialogueStudyTarget;
  try {
    requestedTarget = resolveDialogueTargetBeforeWarmup(data);
  } catch (error) {
    const failure = dialogueContractHttpError(error);
    res.status(failure.status).json({ error: failure.error });
    return;
  }

  // Прогрев инстанса идёт сразу после проверки bearer Firebase Auth, но всё ещё
  // до Firestore, проверки доступа/полей, квоты и OpenAI. Клиент уже передаёт
  // свежий ID token, поэтому анонимный трафик больше не может бесплатно будить
  // функцию, а легальный ping сохраняет нулевое число Firestore/provider вызовов.
  if (data.warmupPing === true) {
    res.status(200).json({ ok: true, model: 'warmup-ping' });
    return;
  }

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    res.status(503).json({ error: 'openai_key_missing' });
    return;
  }

  const mode = text(data.mode, 20) || 'scenario';
  if (mode !== 'scenario' && mode !== 'companion') {
    res.status(400).json({ error: 'unsupported_mode' });
    return;
  }
  const cefr = asCefr(data.cefr);
  const studyTarget = requestedTarget;
  const userText = text(data.userText, MAX_USER_TEXT);
  if (!userText) {
    res.status(400).json({ error: 'user_text_required' });
    return;
  }

  const db = admin.firestore();

  // Всё, что не зависит друг от друга, — одним параллельным блоком. Личность и
  // подписка идут ОДНОЙ цепочкой внутри кэша (подписка зависит от stableUid):
  // на тёплом инстансе повторная реплика того же человека не ходит в Firestore
  // за ними вообще.
  let gates: Awaited<ReturnType<typeof resolveDialogGatesCached>>;
  let dialogModel: Awaited<ReturnType<typeof resolveConfiguredDialogModel>>;
  let dialogQuota: Awaited<ReturnType<typeof resolveConfiguredDialogQuota>>;
  let identity: Awaited<ReturnType<typeof resolveDialogIdentityCached>>;
  try {
    [gates, dialogModel, dialogQuota, identity] = await Promise.all([
      resolveDialogGatesCached(async () => {
        const bools = await resolveRemoteBools(db, {
          ai_global_disable: false,
          gate_ai_dialog_premium: true,
        });
        return { aiOff: bools.ai_global_disable, gatedByPremium: bools.gate_ai_dialog_premium };
      }),
      resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL),
      resolveConfiguredDialogQuota(db),
      resolveDialogIdentityCached(authUid, async () => {
        const stableUid = await resolveStableUidForAuth(db, authUid);
        const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
        return { stableUid, isPremium };
      }),
    ]);
  } catch (e) {
    // Раньше отказ личности (удаление аккаунта в grace, mismatch) улетал как
    // необработанный 500 — клиент видел «сбой провайдера». Теперь явный код.
    const failure = identityFailure(e);
    console.warn('[DIALOG-LAT] stream: precheck rejected', {
      code: failure.code,
      status: failure.status,
      elapsedMs: timer.elapsedMs(),
    });
    res.status(failure.status).json({ error: failure.code });
    return;
  }
  timer.mark('prechecksMs');
  const { stableUid, isPremium } = identity;

  if (gates.aiOff) {
    res.status(503).json({ error: 'ai_globally_disabled' });
    return;
  }

  // Тот же смысл гейта, что в premium_dialog.ts: cap бесплатных реплик, полный
  // отказ только при freeDailyReplies=0 (админ-выключатель).
  if (!isPremium && gates.gatedByPremium && dialogQuota.freeDailyReplies <= 0) {
    res.status(403).json({ error: 'dialog_plus_required' });
    return;
  }

  // Часовой лимит и дневная квота живут в РАЗНЫХ документах — идут параллельно.
  const [rateResult, quotaResult] = await Promise.allSettled([
    enforceRateLimit(authUid, stableUid),
    enforceDailyQuota(
      authUid,
      stableUid,
      isPremium,
      isPremium ? dialogQuota.premiumDailyReplies : dialogQuota.freeDailyReplies,
    ),
  ]);
  timer.mark('limitsMs');
  if (rateResult.status === 'rejected') {
    // Квота уже списалась — возвращаем: отказ по частоте не должен её съедать.
    if (quotaResult.status === 'fulfilled') {
      await releaseDailyQuota(authUid, stableUid, quotaResult.value.resetAtMs).catch((e) => {
        console.warn('[DIALOG-LAT] stream: releaseDailyQuota after rate-limit failed', {
          reason: String((e as Error)?.message ?? e).slice(0, 120),
        });
      });
    }
    res.status(429).json({ error: 'dialog_rate_limited' });
    return;
  }
  if (quotaResult.status === 'rejected') {
    const code = text((quotaResult.reason as { message?: unknown })?.message, 60) || 'dialog_free_limit';
    const details = (quotaResult.reason as { details?: unknown })?.details;
    res.status(429).json({
      error: code,
      ...(details && typeof details === 'object' && !Array.isArray(details)
        ? details as Record<string, unknown>
        : {}),
    });
    return;
  }
  const quotaObservation = quotaResult.value;
  const remaining = quotaObservation.remainingQuota;

  const history = sanitizeHistory(data.history);
  const gameMode = mode === 'scenario' && isGameMode(data) && modelSupportsJsonObject(dialogModel);
  const promptData = mode === 'scenario'
    ? scenarioPromptDataForModel(data, dialogModel)
    : data;
  const baseSystemPrompt =
    mode === 'companion'
      ? buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory), data.interfaceLang, requestedTarget)
      : buildScenarioSystemPrompt(cefr, promptData);
  // Safety уже внутри baseSystemPrompt (renderGlobalRules, стабильный префикс —
  // кэш OpenAI). Приклеивать её здесь второй раз значило бы и удвоить блок в
  // промпте, и порвать кэш ровно так, как это делалось до удешевления.
  const systemPrompt = baseSystemPrompt;

  // Safety: те же два слоя, что и в callable. Модерация идёт параллельно генерации
  // и не задерживает ни первый токен, ни ответ; флаги дожидаемся перед завершением.
  const safetyCtx = { authUid, stableUid, mode, userText, history };
  const safetyVerdict = evaluateSafety(userText);
  const keywordFlagPromise = safetyVerdict.flagged
    ? recordSafetyFlag(safetyVerdict, safetyCtx).catch((e) => {
        console.warn('[DIALOG-LAT] stream: recordSafetyFlag(keyword) failed', {
          reason: String((e as Error)?.message ?? e).slice(0, 120),
        });
      })
    : null;
  const moderationFlagPromise = safetyVerdict.flagged
    ? null
    : moderateUserText(apiKey, userText)
        .then((verdict) => (verdict.flagged ? recordSafetyFlag(verdict, safetyCtx) : undefined))
        .catch((e) => {
          console.warn('[DIALOG-LAT] stream: moderation failed', {
            reason: String((e as Error)?.message ?? e).slice(0, 120),
          });
        });
  const flushSafetyFlags = async (): Promise<void> => {
    if (keywordFlagPromise) await keywordFlagPromise;
    if (moderationFlagPromise) await moderationFlagPromise;
  };

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userText },
  ];

  const gameState = gameMode ? sanitizeGameStateForRequest(data) : null;

  const latencyBase = {
    mode,
    model: dialogModel,
    gameMode,
    historyTurns: history.length,
    promptChars: systemPrompt.length,
    identityFromCache: identity.fromCache,
    gatesFromCache: gates.fromCache,
  };

  const failStream = async (code: string): Promise<void> => {
    // Сбой провайдера не должен съедать дневную реплику — как и в callable.
    await releaseDailyQuota(authUid, stableUid, quotaObservation.resetAtMs).catch((e) => {
      console.warn('[DIALOG-LAT] stream: releaseDailyQuota after failure failed', {
        reason: String((e as Error)?.message ?? e).slice(0, 120),
      });
    });
    await flushSafetyFlags();
    if (res.headersSent) {
      sseWrite(res, { type: 'error', code });
      res.end();
    } else {
      res.status(503).json({ error: code });
    }
  };

  // English keeps the live low-latency publisher. Other targets use the same
  // publisher only for bookkeeping/reset and emit text after full validation.
  const publisher = createLiveReplyPublisher(gameMode, (event) => sseWrite(res, event));
  const canPublishUncheckedDeltas = canPublishUncheckedProviderDelta(studyTarget);
  let regenerated = false;

  try {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    // Quota уже списана: любой последующий сетевой обрыв имеет неопределённый
    // исход и НЕ должен запускать callable fallback на клиенте.
    sseWrite(res, { type: 'started' });

    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const accepted = await generateDialogWithRepeatGuard(async (attempt) => {
      if (attempt > 0) {
        // Анти-повтор отверг первый черновик: клиент уже видел его — стираем.
        regenerated = true;
        publisher.reset();
      }
      const attemptMessages: ChatMessage[] = attempt === 0
        ? messages
        : [
            messages[0],
            { role: 'system', content: DIALOG_REPEAT_RETRY_INSTRUCTION },
            ...messages.slice(1),
          ];
      const upstream = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: dialogModel,
          max_tokens: gameMode ? GAME_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS,
          messages: attemptMessages,
          temperature: 0.8,
          stream: true,
          stream_options: { include_usage: true },
          ...(gameMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      timer.mark(attempt === 0 ? 'providerHeadersMs' : 'retryProviderHeadersMs');

      if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => '');
        console.error('premium_dialog_stream chat failed', {
          status: upstream.status,
          model: dialogModel,
          mode,
          detail: detail.slice(0, 500),
        });
        throw new Error('dialog_provider_failed');
      }

      // English provider chunks remain live. A future non-English contour is
      // buffered until the complete accepted reply passes both post-filters.
      const generated = await readOpenAiStream(
        upstream.body as unknown as NodeJS.ReadableStream,
        (_piece, accumulated) => {
          timer.mark(attempt === 0 ? 'firstTokenMs' : 'retryFirstTokenMs');
          if (!canPublishUncheckedDeltas) return;
          publisher.push(accumulated);
          if (publisher.publishedLength() > 0) {
            timer.mark(attempt === 0 ? 'firstPublishedMs' : 'retryFirstPublishedMs');
          }
        },
      );
      timer.mark(attempt === 0 ? 'generatedMs' : 'retryGeneratedMs');
      usage.prompt_tokens += Number(generated.usage.prompt_tokens ?? 0);
      usage.completion_tokens += Number(generated.usage.completion_tokens ?? 0);
      usage.total_tokens += Number(generated.usage.total_tokens ?? 0);

      let reply = '';
      let candidateTurnState: unknown = null;
      let candidateCoach: DialogCoachEnvelope | null = null;
      if (gameMode) {
        const env = parseGameEnvelope(
          generated.full,
          sanitizeObjectives(data.objectives).map((objective) => objective.id),
          gameState ?? undefined,
        );
        reply = env?.reply ?? '';
        candidateTurnState = env?.turnState ?? null;
        candidateCoach = env?.coach ?? null;
      } else {
        reply = text(generated.full, 1800);
      }

      if (!reply) {
        console.error('premium_dialog_stream empty reply', { model: dialogModel, mode });
        throw new Error('dialog_empty_reply');
      }

      // Постфильтры по ПОЛНОМУ тексту — как и раньше. Их результат уезжает в
      // авторитетном кадре `done`, которым клиент заменяет напечатанный черновик.
      const safeMessage = sanitizeRegulatedAdviceReply(reply, studyTarget);
      if (safeMessage !== reply) {
        reply = safeMessage;
        candidateTurnState = null;
        // Поля тренера описывали отброшенную реплику — уходят вместе с ней.
        candidateCoach = null;
      } else {
        const sanitizedFields = sanitizeDialogGeneratedRegulatedFields({
          turnState: candidateTurnState,
          coach: candidateCoach,
        });
        candidateTurnState = sanitizedFields.turnState;
        candidateCoach = sanitizedFields.coach;
      }
      assertDialogGeneratedTargetFields({
        reply,
        turnState: candidateTurnState,
        coach: candidateCoach,
      }, studyTarget);
      return { reply, turnState: candidateTurnState, coach: candidateCoach };
    }, history);

    const assistantMessage = accepted.value.reply;
    if (!canPublishUncheckedDeltas) {
      publishAcceptedDialogReply(
        assistantMessage,
        (reply) => assertDialogReplyMatchesTarget(reply, studyTarget),
        (event) => sseWrite(res, event),
      );
      timer.mark('firstPublishedMs');
    }
    const turnState = accepted.value.turnState;
    const coach = accepted.value.coach ?? null;
    const quality = {
      ...accepted.quality,
      gameModeAvailable: !isGameMode(data) || gameMode,
    };

    // Финальный кадр: авторитетный текст (клиент ЗАМЕНЯЕТ им накопленный стрим,
    // чтобы постфильтры точно применились) + игровое состояние + остаток квоты.
    sseWrite(res, {
      type: 'done',
      assistantMessage,
      turnState,
      // Поля тренера (почему так / перевод / ответы / поправка) из того же вызова.
      coach,
      remainingQuota: remaining,
      resetAtMs: quotaObservation.resetAtMs,
      quotaVersion: quotaObservation.quotaVersion,
      model: dialogModel,
      quality,
    });
    res.end();
    timer.mark('doneMs');

    console.log('[DIALOG-LAT] stream ok', {
      ...latencyBase,
      regenerated,
      coachFields: coach ? Object.keys(coach).filter((k) => {
        const v = (coach as unknown as Record<string, unknown>)[k];
        return Array.isArray(v) ? v.length > 0 : Boolean(v);
      }) : [],
      publishedChars: publisher.publishedLength(),
      replyChars: assistantMessage.length,
      completionTokens: usage.completion_tokens,
      ...timer.summary(),
    });

    // Биллинг и safety-флаги — уже после того, как человек увидел ответ.
    await Promise.all([
      flushSafetyFlags(),
      db.collection(BILLING_COLLECTION).doc().set({
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
        streamed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
      }).catch((e) => {
        console.warn('[DIALOG-LAT] stream: billing write failed', {
          reason: String((e as Error)?.message ?? e).slice(0, 120),
        });
      }),
    ]);
  } catch (error) {
    const code = error instanceof DialogRepeatedReplyError
      ? error.code
      : String((error as Error)?.message ?? '').includes('dialog_empty_reply')
        ? 'dialog_empty_reply'
        : 'dialog_provider_failed';
    console.error('premium_dialog_stream exception', {
      model: dialogModel,
      mode,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    console.log('[DIALOG-LAT] stream failed', {
      ...latencyBase,
      code,
      regenerated,
      publishedChars: publisher.publishedLength(),
      ...timer.summary(),
    });
    await failStream(code);
  }
});
