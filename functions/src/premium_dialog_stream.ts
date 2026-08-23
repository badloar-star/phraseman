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
import {
  evaluateSafety,
  moderateUserText,
  recordSafetyFlag,
  SAFETY_SYSTEM_INSTRUCTION,
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
  sanitizeHistory,
  sanitizeMemory,
  sanitizeObjectives,
  sanitizeRegulatedAdviceReply,
  text,
  type ChatMessage,
  type PremiumDialogRequest,
} from './premium_dialog';
// Чистый парсер вынесен отдельно, чтобы тест не поднимал весь граф функций.
import { extractPartialReply } from './premium_dialog_stream_parse';

export { extractPartialReply };

if (!admin.apps.length) admin.initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * Стриминговая версия диалога.
 *
 * зачем: владелец сообщил, что «ИИ очень долго думает и отвечает». Аудит показал:
 * модель начинает отвечать через ~0.5-0.8с, но callable-функция ждала ПОСЛЕДНИЙ
 * токен и отдавала текст целиком — человек ждал 3-6 секунд молча. Здесь ответ
 * уходит на клиент по мере генерации (SSE), поэтому первое слово видно почти сразу.
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
 * onDelta зовётся на каждый новый кусочек — им мы кормим клиента.
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
  const systemPrompt = `${baseSystemPrompt}\n\n${SAFETY_SYSTEM_INSTRUCTION}`;

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
    const upstream = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: dialogModel,
        max_tokens: gameMode ? GAME_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS,
        messages,
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
      await failStream('dialog_provider_failed');
      return;
    }

    // Заголовки SSE. X-Accel-Buffering отключает буферизацию прокси — без него
    // кадры копились бы и стриминг превратился обратно в «ждём весь ответ».
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let accumulated = '';
    let sentChars = 0;
    const pushVisible = (visible: string): void => {
      if (visible.length <= sentChars) return;
      sseWrite(res, { type: 'delta', text: visible.slice(sentChars) });
      sentChars = visible.length;
    };

    const { full, usage } = await readOpenAiStream(
      upstream.body as unknown as NodeJS.ReadableStream,
      (piece) => {
        if (gameMode) {
          // В игровом режиме показываем ТОЛЬКО содержимое reply, а не сырой JSON.
          accumulated += piece;
          pushVisible(extractPartialReply(accumulated));
        } else {
          sseWrite(res, { type: 'delta', text: piece });
          sentChars += piece.length;
        }
      },
    );

    let assistantMessage = '';
    let turnState: unknown = null;
    if (gameMode) {
      const env = parseGameEnvelope(full, sanitizeObjectives(data.objectives).map((o) => o.id));
      assistantMessage = env?.reply ?? '';
      turnState = env?.turnState ?? null;
    } else {
      assistantMessage = text(full, 1800);
    }

    if (!assistantMessage) {
      console.error('premium_dialog_stream empty reply', { model: dialogModel, mode });
      await failStream('dialog_empty_reply');
      return;
    }

    // Те же два постфильтра, что и в callable: регулируемые советы и языковой замок.
    const safeMessage = sanitizeRegulatedAdviceReply(assistantMessage, studyTarget);
    if (safeMessage !== assistantMessage) {
      assistantMessage = safeMessage;
      turnState = null;
    }
    try {
      assertDialogReplyMatchesTarget(assistantMessage, studyTarget);
    } catch {
      console.warn('premium_dialog_stream reply language mismatch', { model: dialogModel, mode });
      await failStream('dialog_provider_failed');
      return;
    }

    // Финальный кадр: авторитетный текст (клиент ЗАМЕНЯЕТ им накопленный стрим,
    // чтобы постфильтры точно применились) + игровое состояние + остаток квоты.
    sseWrite(res, {
      type: 'done',
      assistantMessage,
      turnState,
      remainingQuota: remaining,
      model: dialogModel,
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
    await failStream('dialog_provider_failed');
  }
});
