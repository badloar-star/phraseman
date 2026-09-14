// ════════════════════════════════════════════════════════════════════════════
// shard_survey.ts — опросы за осколки: submit / getActive / admin-write.
//
// Callable-обёртки поверх чистого ядра shard_survey_core.ts. Транзакции и
// firebase-admin только здесь. Модель повторяет vip_survey.ts (валидация +
// runTransaction + отдельная коллекция ответов). Награда хранится как immutable
// external economy fact; личный баланс сервер не читает и не пишет.
// ════════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { appendExternalEconomyEvent } from './external_economy_events';
import {
  parseSurveyConfig,
  validateAnswers,
  matchesAudience,
  passesCooldown,
  incrementStats,
  validateSurveyConfigForWrite,
  resolveLocalized,
  evaluateSubmitRateLimit,
  shardSurveyRotationOccurrenceAt,
  shardSurveyResponseDocId,
  shardSurveyRewardClaimId,
  isShardSurveyRotationConfigForOccurrence,
  type ShardSurveyOccurrence,
  type ShardSurveyConfig,
  type SurveyStats,
  type TargetingContext,
} from './shard_survey_core';

const USERS = 'users';
const SURVEYS = 'shard_surveys';
const RESPONSES = 'shard_survey_responses';
const STATS = 'shard_survey_stats';
const REWARD_CLAIMS_COLLECTION = 'reward_claims';
const RATE_COLLECTION = 'shard_survey_rate_limits';
const DAY_MS = 24 * 60 * 60 * 1000;
// Анти-спам: не больше N сабмитов опросов в сутки на пользователя (спека §2.2).
// Легальный поток — единицы опросов в день; 20 покрывает ретраи с запасом.
const SUBMIT_MAX_PER_DAY = 20;
// зачем: решение владельца 2026-07-26 — за опрос ровно 1 жемчужина, ФИКСИРОВАННО.
// config.rewardShards (1..20 из админки) сознательно НЕ используется для выплаты:
// владелец не хочет, чтобы редактор опроса мог случайно выдать 20 монет. Поле
// оставлено в конфиге/валидации ради обратной совместимости уже сохранённых
// документов shard_surveys. Клиентский дубль: SHARD_REWARDS.survey_completed.
const SURVEY_SHARD_AMOUNT = 1;

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

/** free/premium из progress — та же логика доступа, что vip_survey использует для гейта. */
function isPremiumFromProgress(progress: Record<string, unknown>, nowMs: number): boolean {
  const plan = text(progress.premium_plan, 40).toLowerCase();
  const override = text(progress.admin_premium_override, 20).toLowerCase();
  const expiryMs = Math.trunc(Number(progress.premium_expiry ?? 0)) || 0;
  const active = text(progress.premium_active, 20).toLowerCase();
  const storePlan = plan === 'monthly' || plan === 'yearly' || plan === 'annual';
  const openOrFuture = expiryMs <= 0 || expiryMs > nowMs;
  if (override === 'false' && !storePlan) return false;
  if (override === 'true') return openOrFuture;
  if (plan === 'admin_grant') return openOrFuture;
  return (storePlan || active === 'true') && openOrFuture;
}

function lessonsCompletedFromProgress(progress: Record<string, unknown>): number {
  const direct = Math.trunc(Number(progress.lessons_completed ?? 0));
  if (Number.isFinite(direct) && direct > 0) return direct;
  const completed = progress.completed_lessons;
  if (Array.isArray(completed)) return completed.length;
  if (completed && typeof completed === 'object') return Object.keys(completed).length;
  return 0;
}

async function loadSurveyConfig(
  db: admin.firestore.Firestore,
  surveyId: string,
): Promise<ShardSurveyConfig | null> {
  const snap = await db.collection(SURVEYS).doc(surveyId).get();
  if (!snap.exists) return null;
  return parseSurveyConfig(snap.data());
}

function presentSurvey(
  config: ShardSurveyConfig,
  lang: string,
  occurrence?: ShardSurveyOccurrence,
): Record<string, unknown> {
  return {
    // Для старых клиентов surveyId одновременно служит локальным economy
    // eventId. В rotation-режиме выдаём occurrence id, чтобы возврат того же
    // preset через 63 дня законно применил новую жемчужину и без mobile deploy.
    surveyId: occurrence ? occurrence.occurrenceId : config.surveyId,
    canonicalSurveyId: config.surveyId,
    ...(occurrence ? {
      occurrenceId: occurrence.occurrenceId,
      occurrenceDay: occurrence.dayKey,
    } : {}),
    title: resolveLocalized(config.title, lang),
    subtitle: resolveLocalized(config.subtitle, lang),
    rewardShards: config.rewardShards,
    accentColor: config.accentColor,
    finalTitle: resolveLocalized(config.finalScreen.title, lang),
    finalSubtitle: resolveLocalized(config.finalScreen.subtitle, lang),
    questions: config.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: resolveLocalized(q.text, lang),
      options: q.options.map((o) => ({
        id: o.id,
        label: resolveLocalized(o.label, lang),
        action: o.action
          ? { ...o.action, cta: resolveLocalized(o.action.cta, lang) }
          : undefined,
      })),
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// getActiveShardSurvey — вернуть первый подходящий активный опрос для юзера.
// ────────────────────────────────────────────────────────────────────────────
export const getActiveShardSurvey = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);
  const platform = text(request.data?.platform, 32) || 'unknown';
  const nowMs = Date.now();
  const occurrence = shardSurveyRotationOccurrenceAt(nowMs);

  const [rotationConfigSnap, userSnap] = await Promise.all([
    db.collection(SURVEYS).doc(occurrence.surveyId).get(),
    db.collection(USERS).doc(stableUid).get(),
  ]);

  const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
  const ctx: TargetingContext = {
    isPremium: isPremiumFromProgress(progress, nowMs),
    lessonsCompleted: lessonsCompletedFromProgress(progress),
    platform,
  };
  const lastSurveyAtMs = Math.trunc(Number(progress.shard_survey_last_at_ms ?? 0)) || 0;
  const completion = lastSurveyAtMs > 0 ? { completedAtMs: lastSurveyAtMs } : null;
  const lang = text(request.data?.lang, 10) || 'ru';

  // Канонический режим: один и тот же глобальный occurrence на весь UTC-день.
  // Ответ из прошлого 63-дневного цикла не конфликтует, потому что dayKey входит
  // в response id. До атомарной публикации rotation metadata остаётся безопасный
  // legacy fallback, поэтому деплой функции не создаёт окно без опроса.
  const rotationConfig = rotationConfigSnap.exists
    ? parseSurveyConfig(rotationConfigSnap.data())
    : null;
  if (rotationConfig && isShardSurveyRotationConfigForOccurrence(rotationConfig, occurrence)) {
    if (!matchesAudience(rotationConfig.audience, ctx)) return { survey: null, completion };
    const responseSnap = await db.collection(RESPONSES)
      .doc(shardSurveyResponseDocId(occurrence.occurrenceId, stableUid))
      .get();
    return {
      survey: responseSnap.exists ? null : presentSurvey(rotationConfig, lang, occurrence),
      // Старый Home считает любой completion причиной не показывать карточку.
      // Историческая метка допустима только когда текущего offer уже нет.
      completion: responseSnap.exists ? completion : null,
    };
  }

  const surveysSnap = await db.collection(SURVEYS).where('enabled', '==', true).get();

  // Собираем валидные активные конфиги, сортируем по updatedAtMs (свежие раньше).
  // Сначала отсеиваем в памяти (аудитория + cooldown) — без I/O, затем берём топ-N
  // кандидатов и ОДНИМ батч-чтением (getAll) проверяем «уже пройден?», а не N
  // последовательных get() в цикле (аудит 2026-07-05: избегаем O(N) чтений).
  const MAX_CANDIDATES = 10;
  const candidates = surveysSnap.docs
    .map((d) => parseSurveyConfig(d.data()))
    .filter((c): c is ShardSurveyConfig => c != null && c.enabled)
    .filter((c) => matchesAudience(c.audience, ctx))
    .filter((c) => passesCooldown(lastSurveyAtMs, c.minDaysBetweenSurveys, nowMs))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .slice(0, MAX_CANDIDATES);

  if (candidates.length > 0) {
    const refs = candidates.map((c) =>
      db.collection(RESPONSES).doc(shardSurveyResponseDocId(c.surveyId, stableUid)),
    );
    const snaps = await db.getAll(...refs);
    const answered = new Set(
      snaps.filter((s) => s.exists).map((s) => s.id),
    );

    const config = candidates.find(
      (c) => !answered.has(shardSurveyResponseDocId(c.surveyId, stableUid)),
    );
    if (config) {
      return {
        completion,
        survey: presentSurvey(config, lang),
      };
    }
  }

  return { survey: null, completion };
});

// ────────────────────────────────────────────────────────────────────────────
// submitShardSurvey — принять ответы, начислить осколки один раз.
// ────────────────────────────────────────────────────────────────────────────
export const submitShardSurvey = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const requestedSurveyId = text(request.data?.surveyId, 160);
  const nowMs = Date.now();
  const occurrence = shardSurveyRotationOccurrenceAt(nowMs);
  const rotationConfig = await loadSurveyConfig(db, occurrence.surveyId);
  const rotationActive = rotationConfig != null
    && isShardSurveyRotationConfigForOccurrence(rotationConfig, occurrence);
  const config = rotationActive
    ? (requestedSurveyId === occurrence.occurrenceId ? rotationConfig : null)
    : await loadSurveyConfig(db, requestedSurveyId);
  if (!config || (rotationActive ? requestedSurveyId !== occurrence.occurrenceId : !config.enabled)) {
    throw new HttpsError('invalid-argument', 'unknown_survey');
  }
  const canonicalSurveyId = config.surveyId;

  const validated = validateAnswers(config.questions, request.data?.answers);
  if (!validated.ok) throw new HttpsError('invalid-argument', validated.error);

  const platform = text(request.data?.platform, 32) || 'unknown';
  const appVersion = text(request.data?.appVersion, 40) || 'unknown';
  const nowIso = new Date(nowMs).toISOString();
  const occurrenceId = rotationActive ? occurrence.occurrenceId : canonicalSurveyId;
  const occurrenceDay = rotationActive ? occurrence.dayKey : null;

  const responseRef = db.collection(RESPONSES).doc(shardSurveyResponseDocId(occurrenceId, stableUid));
  const userRef = db.collection(USERS).doc(stableUid);
  const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(shardSurveyRewardClaimId(occurrenceId));
  const statsRef = db.collection(STATS).doc(canonicalSurveyId);
  const rateRef = db.collection(RATE_COLLECTION).doc(stableUid);

  const result = await db.runTransaction(async (tx) => {
    const [responseSnap, claimSnap, statsSnap, rateSnap] = await Promise.all([
      tx.get(responseRef),
      tx.get(claimRef),
      tx.get(statsRef),
      tx.get(rateRef),
    ]);

    const responseBase = {
      surveyId: canonicalSurveyId,
      submittedSurveyId: requestedSurveyId,
      occurrenceId,
      occurrenceDay,
      uid: stableUid,
      authUid: request.auth!.uid,
      answers: validated.answers,
      answerQuestionIds: config.questions.map((q) => q.id),
      platform,
      appVersion,
      rewardShards: config.rewardShards,
    };

    // Идемпотентный replay не расходует rate-limit и никогда не считает/платит
    // повторно. Сохранённый ответ тоже не перезаписываем: иначе aggregate будет
    // отражать первый вариант, а raw response — новый. responseSnap — fail-closed
    // защита от исторически неполной пары.
    if (claimSnap.exists || responseSnap.exists) {
      return { ok: true, alreadyGranted: true, reward: 0, eventId: occurrenceId };
    }

    // Rate-limit применяется только к новому засчитываемому occurrence.
    const rateDecision = evaluateSubmitRateLimit(
      rateSnap.data() as { windowStartMs?: number; count?: number } | undefined,
      SUBMIT_MAX_PER_DAY, DAY_MS, nowMs,
    );
    if (rateDecision.limited) {
      throw new HttpsError('resource-exhausted', 'rate_limited');
    }
    tx.set(rateRef, {
      uid: stableUid,
      windowStartMs: rateDecision.nextWindowStartMs,
      count: rateDecision.nextCount,
      updatedAtMs: nowMs,
    }, { merge: true });

    // Фиксированная выплата (см. SURVEY_SHARD_AMOUNT): config.rewardShards
    // намеренно игнорируется. Повторная отправка сюда не доходит — выше стоит
    // проверка claimSnap.exists в этой же транзакции.
    const reward = SURVEY_SHARD_AMOUNT;
    // Маркер идемпотентности для повторной безопасной отправки.
    tx.set(claimRef, {
      source: 'survey_completed',
      surveyId: canonicalSurveyId,
      occurrenceId,
      occurrenceDay,
      amount: reward,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    appendExternalEconomyEvent(tx, userRef, {
      source: 'shard_survey',
      eventId: occurrenceId,
      ownerStableId: stableUid,
      delta: reward,
      reason: 'survey_completed',
      kind: 'survey_reward',
      subjectId: canonicalSurveyId,
      payload: { surveyId: canonicalSurveyId, occurrenceId, occurrenceDay },
      createdAtMs: nowMs,
    });

    // Только метка последнего опроса (для cooldown в getActive).
    tx.set(userRef, {
      progress: { shard_survey_last_at_ms: nowMs },
    }, { merge: true });

    tx.set(responseRef, {
      ...responseBase,
      submittedAt: nowIso,
      submittedAtMs: nowMs,
      rewardGranted: true,
    }, { merge: true });

    // Агрегат для сводки в админке.
    const nextStats: SurveyStats = incrementStats(
      statsSnap.data() as Partial<SurveyStats> | undefined,
      validated.answers,
      nowMs,
    );
    tx.set(statsRef, { surveyId: canonicalSurveyId, ...nextStats }, { merge: true });

    return { ok: true, alreadyGranted: false, reward, eventId: occurrenceId };
  });

  return result;
});

// ────────────────────────────────────────────────────────────────────────────
// adminWriteShardSurvey — создать/обновить конфиг опроса из админки.
// Доступ: request.auth.token.admin === true (custom claim, как прочие
  // admin-callable проекта — см. admin_grant.ts).
// ────────────────────────────────────────────────────────────────────────────
export const adminWriteShardSurvey = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'admin_required');
  }
  const db = admin.firestore();

  const errors = validateSurveyConfigForWrite(request.data?.survey);
  if (errors.length > 0) {
    throw new HttpsError('invalid-argument', `invalid_config:${errors.join(',')}`);
  }

  // Прогоняем через parseSurveyConfig для нормализации формы хранения.
  const parsed = parseSurveyConfig(request.data?.survey);
  if (!parsed) throw new HttpsError('invalid-argument', 'invalid_config:parse_failed');

  const nowMs = Date.now();
  const ref = db.collection(SURVEYS).doc(parsed.surveyId);
  const existing = await ref.get();
  const createdAtMs = existing.exists
    ? Math.trunc(Number(existing.data()?.createdAtMs ?? 0)) || nowMs
    : nowMs;

  // rotation — server-owned publication metadata. Намеренно не принимаем его
  // из админского payload; merge сохраняет существующий order/anchor/version.
  await ref.set({
    surveyId: parsed.surveyId,
    enabled: parsed.enabled,
    title: parsed.title,
    subtitle: parsed.subtitle,
    rewardShards: parsed.rewardShards,
    minDaysBetweenSurveys: parsed.minDaysBetweenSurveys,
    audience: parsed.audience,
    questions: parsed.questions,
    accentColor: parsed.accentColor,
    finalScreen: parsed.finalScreen,
    createdAtMs,
    updatedAtMs: nowMs,
    updatedBy: authUid,
  }, { merge: true });

  return { ok: true, surveyId: parsed.surveyId };
});

// ────────────────────────────────────────────────────────────────────────────
// adminDeleteShardSurvey — удалить конфиг опроса (из админ-экрана).
// Доступ: admin claim. Удаляет только конфиг; ответы/статы остаются (история).
// ────────────────────────────────────────────────────────────────────────────
export const adminDeleteShardSurvey = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'admin_required');
  }
  const surveyId = text(request.data?.surveyId, 80);
  if (!surveyId) throw new HttpsError('invalid-argument', 'survey_id_required');
  const db = admin.firestore();
  await db.collection(SURVEYS).doc(surveyId).delete();
  return { ok: true, surveyId };
});
