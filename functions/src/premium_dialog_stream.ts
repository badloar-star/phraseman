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
import { resolveRemoteBool, aiGloballyDisabled } from './remote_gates';
import { resolveStudyTarget } from './ai_language_contract';
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
  text,
  type ChatMessage,
  type PremiumDialogRequest,
} from './premium_dialog';
import {
  DIALOG_REPEAT_RETRY_INSTRUCTION,
  DialogRepeatedReplyError,
  generateDialogWithRepeatGuard,
} from './premium_dialog_quality';
// Чистый парсер вынесен отдельно, чтобы тест не поднимал весь граф функций.
import { emitAcceptedDialogReply, extractPartialReply } from './premium_dialog_stream_parse';

export { emitAcceptedDialogReply, extractPartialReply };

if (!admin.apps.length) admin.initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * Стриминговая версия диалога.
 *
 * зачем: владелец сообщил, что «ИИ очень долго думает и отвечает». Аудит показал:
 * модель начинает отвечать через ~0.5-0.8с, но callable-функция ждала ПОСЛЕДНИЙ
 * токен и отдавала текст целиком. Provider-поток здесь сохраняет короткий запрос,
 * но кандидат буферизуется до language/safety/repeat-проверок; затем принятый
 * ответ выпускается несколькими SSE-дельтами без отвергнутого черновика.
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

/** Один кадр SSE. */
interface StreamEvent {
  type: 'delta' | 'done' | 'error';
  [key: string]: unknown;
}

function sseWrite(res: { write: (chunk: string) => void }, event: StreamEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Разбор SSE-потока OpenAI. Возвращает накопленный текст и usage.
 * onDelta остаётся provider-boundary callback; пользовательский SSE вызывается
 * только после проверки полного кандидата.
 */
async function readOpenAiStream(
  body: NodeJS.ReadableStream,
  onDelta: (chunk: string) => void,
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
            onDelta(piece);
          }
          if (json.usage) usage = json.usage;
        } catch {
          // Битый кадр не должен рушить весь ответ — пропускаем его.
        }
      }
    }
  }
  return { full, usage };
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

  const data = (req.body ?? {}) as PremiumDialogRequest & { warmupPing?: unknown };

  // Прогрев инстанса — самым первым делом, до Firestore и до валидации полей.
  // зачем: minInstances: 0 (осознанная экономия, сторож
  // ai_functions_warm_instance_contract). Клиент будит инстанс, пока человек
  // читает брифинг и печатает, — отправка попадает на тёплый сервер. Ping обязан
  // быть бесплатным: ниже идут чтения Firestore и списание квоты.
  if (data.warmupPing === true) {
    res.status(200).json({ ok: true, model: 'warmup-ping' });
    return;
  }

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
  } catch {
    res.status(401).json({ error: 'auth_required' });
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
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const userText = text(data.userText, MAX_USER_TEXT);
  if (!userText) {
    res.status(400).json({ error: 'user_text_required' });
    return;
  }

  const db = admin.firestore();

  // Те же пять независимых чтений одним параллельным блоком, что и в callable.
  const [aiOff, dialogModel, dialogQuota, stableUid, gatedByPremium] = await Promise.all([
    aiGloballyDisabled(db),
    resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL),
    resolveConfiguredDialogQuota(db),
    resolveStableUidForAuth(db, authUid),
    resolveRemoteBool(db, 'gate_ai_dialog_premium', true),
  ]);

  if (aiOff) {
    res.status(503).json({ error: 'ai_globally_disabled' });
    return;
  }

  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
  if (!isPremium && gatedByPremium) {
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
  if (rateResult.status === 'rejected') {
    // Квота уже списалась — возвращаем: отказ по частоте не должен её съедать.
    if (quotaResult.status === 'fulfilled') {
      await releaseDailyQuota(authUid, stableUid).catch(() => {});
    }
    res.status(429).json({ error: 'dialog_rate_limited' });
    return;
  }
  if (quotaResult.status === 'rejected') {
    const code = text((quotaResult.reason as { message?: unknown })?.message, 60) || 'dialog_free_limit';
    res.status(429).json({ error: code });
    return;
  }
  const remaining = quotaResult.value;

  const history = sanitizeHistory(data.history);
  const baseSystemPrompt =
    mode === 'companion'
      ? buildCompanionSystemPrompt(cefr, sanitizeMemory(data.memory), data.interfaceLang, data.studyTarget)
      : buildScenarioSystemPrompt(cefr, data);
  // Safety уже внутри baseSystemPrompt (renderGlobalRules, стабильный префикс —
  // кэш OpenAI). Приклеивать её здесь второй раз значило бы и удвоить блок в
  // промпте, и порвать кэш ровно так, как это делалось до удешевления.
  const systemPrompt = baseSystemPrompt;

  // Safety: те же два слоя, что и в callable. Модерация идёт параллельно генерации
  // и не задерживает ни первый токен, ни ответ; флаги дожидаемся перед завершением.
  const safetyCtx = { authUid, stableUid, mode, userText, history };
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

  const gameMode = mode === 'scenario' && isGameMode(data) && modelSupportsJsonObject(dialogModel);
  const gameState = gameMode ? sanitizeGameStateForRequest(data) : null;

  const failStream = async (code: string): Promise<void> => {
    // Сбой провайдера не должен съедать дневную реплику — как и в callable.
    await releaseDailyQuota(authUid, stableUid).catch(() => {});
    await flushSafetyFlags();
    if (res.headersSent) {
      sseWrite(res, { type: 'error', code });
      res.end();
    } else {
      res.status(503).json({ error: code });
    }
  };

  try {
    // Открываем SSE до provider-вызова, но не публикуем его черновики. Тогда при
    // полном отказе anti-repeat клиент получает только системный error-кадр.
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const accepted = await generateDialogWithRepeatGuard(async (attempt) => {
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

      // Provider-чанки полностью буферизуются. Пока кандидат не прошёл общий
      // repeat guard, ни один его символ не попадает в пользовательский SSE.
      const generated = await readOpenAiStream(
        upstream.body as unknown as NodeJS.ReadableStream,
        () => {},
      );
      usage.prompt_tokens += Number(generated.usage.prompt_tokens ?? 0);
      usage.completion_tokens += Number(generated.usage.completion_tokens ?? 0);
      usage.total_tokens += Number(generated.usage.total_tokens ?? 0);

      let reply = '';
      let candidateTurnState: unknown = null;
      if (gameMode) {
        const env = parseGameEnvelope(
          generated.full,
          sanitizeObjectives(data.objectives).map((objective) => objective.id),
          gameState ?? undefined,
        );
        reply = env?.reply ?? '';
        candidateTurnState = env?.turnState ?? null;
      } else {
        reply = text(generated.full, 1800);
      }

      if (!reply) {
        console.error('premium_dialog_stream empty reply', { model: dialogModel, mode });
        throw new Error('dialog_empty_reply');
      }

      const safeMessage = sanitizeRegulatedAdviceReply(reply, studyTarget);
      if (safeMessage !== reply) {
        reply = safeMessage;
        candidateTurnState = null;
      }
      assertDialogReplyMatchesTarget(reply, studyTarget);
      return { reply, turnState: candidateTurnState };
    }, history);

    const assistantMessage = accepted.value.reply;
    const turnState = accepted.value.turnState;
    const quality = {
      ...accepted.quality,
      gameModeAvailable: !isGameMode(data) || gameMode,
    };

    // Только принятый полный ответ выпускается небольшими дельтами. Первый
    // отвергнутый кандидат физически не мог попасть в этот writer.
    emitAcceptedDialogReply(
      assistantMessage,
      (event) => sseWrite(res, event),
    );

    // Финальный кадр: авторитетный текст (клиент ЗАМЕНЯЕТ им накопленный стрим,
    // чтобы постфильтры точно применились) + игровое состояние + остаток квоты.
    sseWrite(res, {
      type: 'done',
      assistantMessage,
      turnState,
      remainingQuota: remaining,
      model: dialogModel,
      quality,
    });
    res.end();

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
      }).catch(() => {}),
    ]);
  } catch (error) {
    console.error('premium_dialog_stream exception', {
      model: dialogModel,
      mode,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    await failStream(
      error instanceof DialogRepeatedReplyError
        ? error.code
        : String((error as Error)?.message ?? '').includes('dialog_empty_reply')
          ? 'dialog_empty_reply'
          : 'dialog_provider_failed',
    );
  }
});
