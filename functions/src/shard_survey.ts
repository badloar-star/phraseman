// ════════════════════════════════════════════════════════════════════════════
// shard_survey.ts — опросы за осколки: submit / getActive / admin-write.
//
// Callable-обёртки поверх чистого ядра shard_survey_core.ts. Транзакции и
// firebase-admin только здесь. Модель повторяет vip_survey.ts (валидация +
// runTransaction + отдельная коллекция ответов) и daily_tasks_shards.ts
// (серверная выдача осколков полем `shards` в users/{uid} через Admin SDK,
// идемпотентность через reward_claims).
// ════════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  parseSurveyConfig,
  validateAnswers,
  matchesAudience,
  passesCooldown,
  incrementStats,
  validateSurveyConfigForWrite,
  resolveLocalized,
  evaluateSubmitRateLimit,
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

function readShardBalance(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function responseDocId(surveyId: string, stableUid: string): string {
  return `${surveyId}__${stableUid}`;
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

// ────────────────────────────────────────────────────────────────────────────
// getActiveShardSurvey — вернуть первый подходящий активный опрос для юзера.
// ────────────────────────────────────────────────────────────────────────────
export const getActiveShardSurvey = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);
  const platform = text(request.data?.platform, 32) || 'unknown';
  const nowMs = Date.now();

  const [surveysSnap, userSnap] = await Promise.all([
    db.collection(SURVEYS).where('enabled', '==', true).get(),
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
      db.collection(RESPONSES).doc(responseDocId(c.surveyId, stableUid)),
    );
    const snaps = await db.getAll(...refs);
    const answered = new Set(
      snaps.filter((s) => s.exists).map((s) => s.id),
    );

    const config = candidates.find(
      (c) => !answered.has(responseDocId(c.surveyId, stableUid)),
    );
    if (config) {
      const lang = text(request.data?.lang, 10) || 'ru';
      return {
        completion,
        survey: {
          surveyId: config.surveyId,
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
            options: q.options.map((o) => ({ id: o.id, label: resolveLocalized(o.label, lang) })),
          })),
        },
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

  const surveyId = text(request.data?.surveyId, 80);
  const config = await loadSurveyConfig(db, surveyId);
  if (!config || !config.enabled) throw new HttpsError('invalid-argument', 'unknown_survey');

  const validated = validateAnswers(config.questions, request.data?.answers);
  if (!validated.ok) throw new HttpsError('invalid-argument', validated.error);

  const platform = text(request.data?.platform, 32) || 'unknown';
  const appVersion = text(request.data?.appVersion, 40) || 'unknown';
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const responseRef = db.collection(RESPONSES).doc(responseDocId(surveyId, stableUid));
  const userRef = db.collection(USERS).doc(stableUid);
  const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`survey_${surveyId}`);
  const statsRef = db.collection(STATS).doc(surveyId);
  const rateRef = db.collection(RATE_COLLECTION).doc(stableUid);

  const result = await db.runTransaction(async (tx) => {
    const [responseSnap, userSnap, claimSnap, statsSnap, rateSnap] = await Promise.all([
      tx.get(responseRef),
      tx.get(userRef),
      tx.get(claimRef),
      tx.get(statsRef),
      tx.get(rateRef),
    ]);

    // Rate-limit: не больше SUBMIT_MAX_PER_DAY сабмитов в сутки на пользователя.
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

    const responseBase = {
      surveyId,
      uid: stableUid,
      authUid: request.auth!.uid,
      answers: validated.answers,
      answerQuestionIds: config.questions.map((q) => q.id),
      platform,
      appVersion,
      rewardShards: config.rewardShards,
    };

    // Уже награждён → ответы можно пересохранить, осколки НЕ повторяем.
    if (claimSnap.exists) {
      tx.set(responseRef, {
        ...responseBase,
        rewardGranted: true,
        resubmittedAt: nowIso,
        resubmittedAtMs: nowMs,
      }, { merge: true });
      const balance = readShardBalance(userSnap.data()?.shards);
      return { ok: true, alreadyGranted: true, reward: 0, balanceAfter: balance, shardsUpdatedAtMs: null as number | null };
    }

    const currentBalance = readShardBalance(userSnap.data()?.shards);
    // Фиксированная выплата (см. SURVEY_SHARD_AMOUNT): config.rewardShards
    // намеренно игнорируется. Повторная отправка сюда не доходит — выше стоит
    // проверка claimSnap.exists в этой же транзакции.
    const reward = SURVEY_SHARD_AMOUNT;
    const newBalance = currentBalance + reward;
    const shardsUpdatedAtMs = nowMs;

    // Маркер идемпотентности (как daily_tasks_shards).
    tx.set(claimRef, {
      source: 'survey_completed',
      surveyId,
      amount: reward,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Осколки + метка последнего опроса (для cooldown в getActive).
    tx.set(userRef, {
      shards: newBalance,
      shards_updated_at_ms: shardsUpdatedAtMs,
      shards_updated_op: 'earn',
      shards_updated_reason: 'survey_completed',
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
    tx.set(statsRef, { surveyId, ...nextStats }, { merge: true });

    return { ok: true, alreadyGranted: false, reward, balanceAfter: newBalance, shardsUpdatedAtMs };
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
