import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { VIP_SURVEY_ID, VIP_SURVEY_REWARD_DAYS } from './vip_survey_contract';

const USERS = 'users';
const VIP_SURVEY_RESPONSES = 'vip_survey_responses';
const DAY_MS = 24 * 60 * 60 * 1000;

type ReviewIntent = 'yes' | 'no' | 'not_now';

type SurveyQuestion = {
  id: string;
  options: string[];
  textOnly?: boolean;
};

type SurveyAnswer = {
  optionId: string;
  comment?: string;
};

const SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: 'most_useful', options: ['lessons', 'flashcards', 'nothing_yet'] },
  { id: 'linger_screen', options: ['lessons', 'flashcards', 'mistake_practice'] },
  { id: 'less_interesting', options: ['too_easy', 'too_hard', 'unclear_mistakes', 'too_much_text', 'no_progress', 'never'] },
  { id: 'first_time_confusing', options: ['what_next', 'lessons', 'flashcards', 'mistakes', 'all_clear'] },
  { id: 'expected_missing', options: ['more_explanations', 'more_examples', 'more_topics', 'more_practice', 'more_stats', 'learning_plan', 'found_all'] },
  { id: 'overloaded_screen', options: ['home', 'lessons', 'flashcards', 'leagues', 'profile', 'none'] },
  { id: 'one_thing_week', options: [], textOnly: true },
  { id: 'feature_request', options: [], textOnly: true },
  { id: 'friend_recommendation', options: [], textOnly: true },
];

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanMessageId(value: unknown): string {
  return cleanText(value, 160).replace(/[^A-Za-z0-9._-]/g, '_');
}

function normalizeReviewIntent(value: unknown): ReviewIntent {
  const raw = cleanText(value, 20);
  return raw === 'yes' || raw === 'no' || raw === 'not_now' ? raw : 'not_now';
}

function normalizeAnswers(value: unknown): Record<string, SurveyAnswer> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'answers_required');
  }
  const raw = value as Record<string, unknown>;
  const out: Record<string, SurveyAnswer> = {};

  for (const question of SURVEY_QUESTIONS) {
    const row = raw[question.id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new HttpsError('invalid-argument', `answer_required:${question.id}`);
    }
    const data = row as Record<string, unknown>;
    const comment = cleanText(data.comment, 500);
    if (question.textOnly) {
      if (!comment) {
        throw new HttpsError('invalid-argument', `comment_required:${question.id}`);
      }
      out[question.id] = { optionId: 'comment', comment };
      continue;
    }
    const optionId = cleanText(data.optionId, 40);
    if (!question.options.includes(optionId)) {
      throw new HttpsError('invalid-argument', `invalid_option:${question.id}`);
    }
    out[question.id] = comment ? { optionId, comment } : { optionId };
  }

  return out;
}

function parseMs(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function cleanPlan(value: unknown): string {
  return cleanText(value, 80).toLowerCase();
}

function isTruthyProgressFlag(value: unknown): boolean {
  const v = cleanText(value, 20).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFalsyProgressFlag(value: unknown): boolean {
  const v = cleanText(value, 20).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}

function isOpenEndedOrFuture(untilMs: number, nowMs: number): boolean {
  return untilMs <= 0 || untilMs > nowMs;
}

function isRealPremiumProgressActive(progress: Record<string, unknown>, nowMs: number): boolean {
  const plan = cleanPlan(progress.premium_plan);
  const override = cleanText(progress.admin_premium_override, 20).toLowerCase();
  const expiryMs = parseMs(progress.premium_expiry);
  const storePlan = plan === 'monthly' || plan === 'yearly' || plan === 'annual';
  if (override === 'true' || plan === 'admin_grant') return false;
  if (override === 'false' && !storePlan) return false;
  return (storePlan || isTruthyProgressFlag(progress.premium_active)) && isOpenEndedOrFuture(expiryMs, nowMs);
}

function isVipProgressActive(progress: Record<string, unknown>, nowMs: number): boolean {
  const vipPlan = cleanPlan(progress.vip_plan);
  const vipUntilMs = parseMs(progress.vip_until ?? progress.vip_expiry);
  const vipFromMs = parseMs(progress.vip_from);
  const vipRevoked = isFalsyProgressFlag(progress.vip_admin_override) || isFalsyProgressFlag(progress.vip_active);
  const vipShape =
    !!vipPlan ||
    isTruthyProgressFlag(progress.vip_active) ||
    parseMs(progress.vip_until ?? progress.vip_expiry) > 0 ||
    parseMs(progress.vip_admin_grant_at ?? progress.vip_grant_at) > 0;
  if (vipShape) {
    return !vipRevoked && (vipFromMs <= 0 || vipFromMs <= nowMs) && isOpenEndedOrFuture(vipUntilMs, nowMs);
  }

  const legacyPlan = cleanPlan(progress.premium_plan);
  const legacyOverride = cleanText(progress.admin_premium_override, 20).toLowerCase();
  const legacyExpiryMs = parseMs(progress.premium_expiry);
  if (legacyOverride === 'false') return false;
  return (legacyOverride === 'true' || legacyPlan === 'admin_grant') && isOpenEndedOrFuture(legacyExpiryMs, nowMs);
}

function hasPremiumOrVipAccess(progress: Record<string, unknown>, nowMs: number): boolean {
  return isRealPremiumProgressActive(progress, nowMs) || isVipProgressActive(progress, nowMs);
}

export const submitVipSurvey = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const surveyId = cleanText(request.data?.surveyId, 80);
  if (surveyId !== VIP_SURVEY_ID) throw new HttpsError('invalid-argument', 'unknown_survey');

  const answers = normalizeAnswers(request.data?.answers);
  const reviewIntent = normalizeReviewIntent(request.data?.reviewIntent);
  const messageId = cleanMessageId(request.data?.messageId);
  const storeOpened = request.data?.storeOpened === true;
  const platform = cleanText(request.data?.platform, 32) || 'unknown';
  const authUid = request.auth.uid;
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const responseRef = db.collection(VIP_SURVEY_RESPONSES).doc(stableUid);
  const userRef = db.collection(USERS).doc(stableUid);

  return db.runTransaction(async (tx) => {
    const [responseSnap, userSnap] = await Promise.all([
      tx.get(responseRef),
      tx.get(userRef),
    ]);
    const existingResponse = responseSnap.data() ?? {};
    const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
    if (hasPremiumOrVipAccess(progress, nowMs)) {
      throw new HttpsError('failed-precondition', 'vip_survey_free_tier_required');
    }
    const existingVipGranted = existingResponse.vipGranted === true;
    const existingVipFrom = parseMs(existingResponse.vipFrom ?? existingResponse.vipGrantAt ?? progress.vip_from);
    const existingVipUntil = parseMs(existingResponse.vipUntil ?? progress.vip_until ?? progress.vip_expiry);
    const existingGrantAt = parseMs(existingResponse.vipGrantAt ?? progress.vip_admin_grant_at ?? existingVipFrom);

    const responseBase = {
      uid: stableUid,
      authUid,
      messageId,
      surveyId: VIP_SURVEY_ID,
      answers,
      answerQuestionIds: SURVEY_QUESTIONS.map((question) => question.id),
      reviewIntent,
      storeOpened,
      platform,
      rewardDays: VIP_SURVEY_REWARD_DAYS,
      updatedAt: nowIso,
      updatedAtMs: nowMs,
    };

    if (existingVipGranted) {
      tx.set(responseRef, {
        ...responseBase,
        resubmittedAt: nowIso,
        resubmittedAtMs: nowMs,
        vipGranted: true,
      }, { merge: true });
      return {
        ok: true,
        alreadyGranted: true,
        uid: stableUid,
        grantAt: String(existingGrantAt || nowMs),
        vipFrom: String(existingVipFrom || existingGrantAt || nowMs),
        vipUntil: String(existingVipUntil || 0),
        vipPlan: String(existingResponse.vipPlan || progress.vip_plan || 'survey_vip'),
        rewardDays: VIP_SURVEY_REWARD_DAYS,
      };
    }

    const vipFrom = nowMs;
    const vipUntil = nowMs + VIP_SURVEY_REWARD_DAYS * DAY_MS;
    const vipPlan = 'survey_vip';
    tx.set(userRef, {
      progress: {
        vip_active: 'true',
        vip_plan: vipPlan,
        vip_from: String(vipFrom),
        vip_until: String(vipUntil),
        vip_admin_override: 'true',
        vip_admin_grant_at: String(nowMs),
        vip_survey_claimed_at: String(nowMs),
        vip_survey_message_id: messageId,
      },
      updatedAt: nowMs,
    }, { merge: true });
    tx.set(responseRef, {
      ...responseBase,
      submittedAt: nowIso,
      submittedAtMs: nowMs,
      vipGranted: true,
      vipGrantAt: nowMs,
      vipFrom,
      vipUntil,
      vipPlan,
      source: 'vip_survey',
    }, { merge: true });

    return {
      ok: true,
      alreadyGranted: false,
      uid: stableUid,
      grantAt: String(nowMs),
      vipFrom: String(vipFrom),
      vipUntil: String(vipUntil),
      vipPlan,
      rewardDays: VIP_SURVEY_REWARD_DAYS,
    };
  });
});

export const recordVipSurveyReviewClick = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const surveyId = cleanText(request.data?.surveyId, 80);
  if (surveyId !== VIP_SURVEY_ID) throw new HttpsError('invalid-argument', 'unknown_survey');

  const authUid = request.auth.uid;
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId);
  const responseRef = db.collection(VIP_SURVEY_RESPONSES).doc(stableUid);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const messageId = cleanMessageId(request.data?.messageId);
  const storeOpened = request.data?.storeOpened === true;
  const platform = cleanText(request.data?.platform, 32) || 'unknown';

  return db.runTransaction(async (tx) => {
    const responseSnap = await tx.get(responseRef);
    if (!responseSnap.exists) throw new HttpsError('failed-precondition', 'survey_response_required');
    const existing = responseSnap.data() || {};
    tx.set(responseRef, {
      reviewIntent: 'yes',
      storeOpened: existing.storeOpened === true || storeOpened,
      reviewPromptClickedAt: existing.reviewPromptClickedAt || nowIso,
      reviewPromptClickedAtMs: existing.reviewPromptClickedAtMs || nowMs,
      reviewPromptLastAt: nowIso,
      reviewPromptLastAtMs: nowMs,
      reviewPromptPlatform: platform,
      reviewPromptMessageId: messageId || existing.messageId || '',
      updatedAt: nowIso,
      updatedAtMs: nowMs,
    }, { merge: true });
    return {
      ok: true,
      uid: stableUid,
      storeOpened: existing.storeOpened === true || storeOpened,
    };
  });
});
