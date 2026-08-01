/**
 * compassGenerate — тёплый комментарий дня Компаса (дешёвый ИИ-голос).
 *
 * Клон оркестрации explain_choice: cache-first → budget → lock → generate → judge →
 * cache. Кэш 1-на-продукт по подписи дня (тип+темы+уровень) → ≥90% показов из кэша,
 * 0 токенов. Модель — gpt-4.1-nano (admin-тюнинг + kill-switch через job 'compass').
 *
 * SECURITY (инвариант phraseman): identity из request.auth.uid (resolveStableUidForAuth,
 * два арг — не из body). App Check enforced. Кэш пишет только эта CF (Admin SDK).
 *
 * Фича отключаема целиком: клиент зовёт compassGenerate только при compass_ai_voice;
 * при kill-switch job 'compass' CF мгновенно отдаёт «выключено», клиент берёт текст
 * Библии. Удаление Компаса = убрать вызов; CF простаивает безвредно.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { aiGloballyDisabled } from './remote_gates';
import { resolveJobConfig } from './openai_jobs_config';
import { reserveExplainBudget, refundExplainBudgetReservation, type ExplainBudgetReservation } from './explain/explain_budget';
import { resolvePromptLangKey } from './explain/explain_prompts';
import { openAiChat } from './explain/explain_provider';
import { buildCompassPrompt } from './compass/compass_prompts';
import { judgeCompassComment } from './compass/compass_judge';
import { resolveAiOutputLang } from './ai_language_contract';
import {
  compassSignature,
  compassHashFor,
  readCachedCompass,
  claimCompassLock,
  writeReadyCompass,
  writeRejectedCompass,
  isRetryableRejected,
} from './compass/compass_cache';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'us-central1';
const BILLING_COLLECTION = 'compass_billing';
const GEN_MAX_TOKENS = 120; // одна короткая фраза
const GEN_TEMPERATURE = 0.7;

export type CompassStatus = 'ok' | 'rejected' | 'exhausted' | 'pending';

export interface CompassResponse {
  ok: true;
  comment: string;
  status: CompassStatus;
  fromCache: boolean;
}

interface CompassRequestData {
  dayType?: unknown;
  topics?: unknown;
  level?: unknown;
  lang?: unknown;
}

function asText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

const ALLOWED_DAY_TYPES = new Set(['easy', 'deep_dive', 'repair', 'comeback']);

function empty(status: CompassStatus, fromCache: boolean): CompassResponse {
  return { ok: true, comment: '', status, fromCache };
}

export const compassGenerate = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 20,
    secrets: [OPENAI_API_KEY],
  },
  async (request): Promise<CompassResponse> => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

    const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
    if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

    const data = (request.data ?? {}) as CompassRequestData;
    const dayType = asText(data.dayType, 20);
    if (!ALLOWED_DAY_TYPES.has(dayType)) throw new HttpsError('invalid-argument', 'bad_day_type');
    const topics = Array.isArray(data.topics)
      ? data.topics.map((t) => asText(t, 40)).filter(Boolean).slice(0, 6)
      : [];
    const level = Math.max(0, Math.min(10, Math.floor(Number(data.level) || 0)));
    const lang = resolveAiOutputLang(asText(data.lang, 12) || 'ru', 'compass');

    const db = admin.firestore();
    // Глобальный рубильник ИИ (админ «Пульт»): серверный дубль клиентского гейта —
    // чтобы прямой вызов callable в обход UI не запускал ИИ. Клиент по этому коду
    // показывает забавную плашку.
    if (await aiGloballyDisabled(db)) throw new HttpsError('failed-precondition', 'ai_globally_disabled');
    const jobCfg = await resolveJobConfig(db, 'compass');
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUidForAuth(db, authUid);

    const langKey = resolvePromptLangKey(lang);
    const signature = compassSignature({ dayType, topics, level });
    const hash = compassHashFor(signature, langKey);

    // 1) Кэш-first (≥90% путь, $0).
    const cached = await readCachedCompass(hash);
    if (cached?.status === 'ready' && cached.comment) {
      return { ok: true, comment: cached.comment, status: 'ok', fromCache: true };
    }
    if (cached?.status === 'rejected' && !isRetryableRejected(cached, Date.now())) {
      return empty('rejected', true);
    }

    // 2) Kill-switch.
    if (!jobCfg.enabled) return empty('exhausted', false);

    // 2.5) Платную генерацию запускает только premium — cache-hit выше остаётся
    // бесплатным для всех (premium-юзеры прогревают общий кэш). Free получает
    // graceful 'exhausted' — клиент просто не показывает комментарий.
    const isPremium = await resolvePremiumAccess(db, stableUid);
    if (!isPremium) return empty('exhausted', false);

    // 3) Бюджет (промах кэша). Юзер → глобал.
    let budgetReservation: ExplainBudgetReservation | null = null;
    try {
      budgetReservation = await reserveExplainBudget(authUid, stableUid, jobCfg.globalDailyCap);
    } catch (err) {
      if (err instanceof HttpsError && err.code === 'resource-exhausted') return empty('exhausted', false);
      throw err;
    }

    // 4) Лок (анти-дубль).
    const claimed = await claimCompassLock(hash, Date.now());
    if (!claimed) {
      await refundExplainBudgetReservation(budgetReservation, 'lock_not_claimed');
      budgetReservation = null;
      return empty('pending', true);
    }

    // 5) Генерация одной фразы.
    let gen: Awaited<ReturnType<typeof openAiChat>>;
    try {
      gen = await openAiChat({
        apiKey,
        model: jobCfg.model,
        messages: [{ role: 'user', content: buildCompassPrompt({ dayType, topics, lang }) }],
        maxTokens: GEN_MAX_TOKENS,
        temperature: GEN_TEMPERATURE,
      });
    } catch (err) {
      await refundExplainBudgetReservation(budgetReservation, 'provider_failed');
      budgetReservation = null;
      throw err;
    }
    const comment = gen.text.trim();

    // 6) Лёгкая проверка (язык/связность/безопасность). Fail-closed.
    // ВАЖНО: судья Компаса, НЕ фразовый judgeExplanation — тот бракует день-комментарий как
    // off_topic («не про английскую фразу»), из-за чего раньше реджектился весь кэш.
    const verdict = comment
      ? await judgeCompassComment({ text: comment, langKey, apiKey })
      : { ok: false, reason: 'empty' as const, promptTokens: 0, completionTokens: 0 };

    if (verdict.ok) {
      await writeReadyCompass(hash, comment, { lang, model: jobCfg.model });
    } else {
      await writeRejectedCompass(hash, verdict.reason);
    }

    // 7) Биллинг.
    await db.collection(BILLING_COLLECTION).doc().set({
      uid: stableUid,
      authUid,
      hash,
      lang,
      model: jobCfg.model,
      genPromptTokens: gen.promptTokens,
      genCompletionTokens: gen.completionTokens,
      judgePromptTokens: verdict.promptTokens,
      judgeCompletionTokens: verdict.completionTokens,
      verdict: verdict.reason,
      published: verdict.ok,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    });

    return verdict.ok
      ? { ok: true, comment, status: 'ok', fromCache: false }
      : empty('rejected', false);
  },
);
