import AsyncStorage from '@react-native-async-storage/async-storage';
import { triLang, type Lang } from '../constants/i18n';
import { accountScopeKey } from './account_scope_key';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { getRemoteBool } from './remote_flags';
import {
  weeklyReviewStorageKey,
  weeklyReviewV2StorageKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import {
  buildWeeklyReviewBriefing,
  type WeeklyReviewBriefingBuildResult,
} from './weekly_review_briefing';
import {
  WEEKLY_REVIEW_SCHEMA_VERSION,
  type WeeklyReviewBriefingV2,
  type WeeklyReviewSnapshot,
  type WeeklyReviewV2,
} from './weekly_review_types';
import {
  latencyBucket,
  signalBucket,
  trackWeeklyReviewEvent,
} from './weekly_review_analytics';

export type WeeklyReviewErrorCode =
  | 'offline'
  | 'not_ready'
  | 'app_check_unavailable'
  | 'provider_failed'
  | 'unknown';

export type WeeklyReviewState =
  | { status: 'hydrating'; snapshot: WeeklyReviewSnapshot }
  | { status: 'insufficient'; snapshot: WeeklyReviewSnapshot }
  | { status: 'free_eligible'; snapshot: WeeklyReviewSnapshot }
  | { status: 'plus_ready_to_generate'; snapshot: WeeklyReviewSnapshot; fallback?: WeeklyReviewV2 }
  | { status: 'generating'; snapshot: WeeklyReviewSnapshot; review?: WeeklyReviewV2 }
  | { status: 'fresh' | 'cached' | 'cooldown'; snapshot: WeeklyReviewSnapshot; review: WeeklyReviewV2; nextAllowedAtMs: number }
  | { status: 'offline' | 'error'; snapshot: WeeklyReviewSnapshot; review?: WeeklyReviewV2; errorCode: WeeklyReviewErrorCode };

export interface WeeklyReviewStoredV2 {
  schemaVersion: typeof WEEKLY_REVIEW_SCHEMA_VERSION;
  accountScope: string;
  entitlement: 'plus';
  lang: Lang;
  studyTarget: 'en' | 'fr';
  review: WeeklyReviewV2;
  generatedAtMs: number;
  nextAllowedAtMs: number;
}

export interface WeeklyReviewCallableResult {
  ok: true;
  review: WeeklyReviewV2;
  nextAllowedAtMs: number;
  model: string;
  idempotentReplay?: boolean;
}

export interface GenerateOptions {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  isPremium: boolean;
  aiV2Enabled?: boolean;
  allowGenerate?: boolean;
  nowMs?: number;
}

export interface WeeklyReviewClientDependencies {
  storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
  buildBriefing: (options: GenerateOptions) => Promise<WeeklyReviewBriefingBuildResult>;
  captureGeneration: () => AccountGenerationToken;
  accountScope: (token: AccountGenerationToken) => string | null;
  isCurrentGeneration: (token: AccountGenerationToken, stableId: string | null) => boolean;
  requestCallable: (briefing: WeeklyReviewBriefingV2) => Promise<WeeklyReviewCallableResult>;
  now: () => number;
  aiEnabled: () => boolean;
}

const DEFAULT_DEPS: WeeklyReviewClientDependencies = {
  storage: AsyncStorage,
  buildBriefing: (options) => buildWeeklyReviewBriefing(options),
  captureGeneration: captureAccountGeneration,
  accountScope: accountScopeKey,
  isCurrentGeneration: isCurrentAccountGeneration,
  requestCallable: requestWeeklyReviewV2,
  now: Date.now,
  aiEnabled: () => getRemoteBool('weekly_review_ai_v2_enabled'),
};

const weeklyReviewInFlight = new Map<string, Promise<WeeklyReviewCallableResult>>();

function normalizeReview(raw: unknown): WeeklyReviewV2 | null {
  if (!raw || typeof raw !== 'object') return null;
  const review = raw as Partial<WeeklyReviewV2>;
  if (
    review.schemaVersion !== WEEKLY_REVIEW_SCHEMA_VERSION
    || typeof review.headline !== 'string'
    || typeof review.summary !== 'string'
    || !Array.isArray(review.patterns)
    || !Array.isArray(review.improvements)
    || !Array.isArray(review.priorities)
    || !Array.isArray(review.plan)
    || typeof review.coverageNote !== 'string'
    || !['low', 'medium', 'high'].includes(String(review.confidence))
  ) return null;
  return review as WeeklyReviewV2;
}

function normalizeCallableResult(raw: unknown): WeeklyReviewCallableResult {
  if (!raw || typeof raw !== 'object') throw new Error('weekly_review_invalid_callable_result');
  const data = raw as Partial<WeeklyReviewCallableResult>;
  const review = normalizeReview(data.review);
  const nextAllowedAtMs = Number(data.nextAllowedAtMs ?? 0);
  if (data.ok !== true || !review || !Number.isFinite(nextAllowedAtMs) || nextAllowedAtMs <= 0) {
    throw new Error('weekly_review_invalid_callable_result');
  }
  return {
    ok: true,
    review,
    nextAllowedAtMs,
    model: String(data.model ?? ''),
    ...(data.idempotentReplay ? { idempotentReplay: true } : {}),
  };
}

function localCopy(lang: Lang, ru: string, uk: string, es: string, fallback: string): string {
  return triLang(lang, { ru, uk, es, 'pt-BR': fallback, vi: fallback, id: fallback, tr: fallback, pl: fallback });
}

/** Evidence-backed Plus fallback. It is never returned to Free users. */
export function buildLocalWeeklyReview(briefing: WeeklyReviewBriefingV2): WeeklyReviewV2 {
  const weak = briefing.mistakes.weakCategories[0];
  const evidenceRef = Object.keys(briefing.evidenceRegistry)[0] ?? 'coverage.ready';
  const recommendation = briefing.recommendations[0];
  return {
    schemaVersion: WEEKLY_REVIEW_SCHEMA_VERSION,
    headline: localCopy(briefing.lang as Lang, 'Сигнал уже виден', 'Сигнал уже видно', 'La señal ya está clara', 'Your learning signal is ready'),
    summary: weak
      ? localCopy(briefing.lang as Lang, `Главный фокус сейчас — ${weak.label}.`, `Головний фокус зараз — ${weak.label}.`, `El foco principal ahora es ${weak.label}.`, `The current focus is ${weak.label}.`)
      : localCopy(briefing.lang as Lang, 'Данных достаточно для следующего точного шага.', 'Даних достатньо для наступного точного кроку.', 'Hay datos suficientes para el siguiente paso.', 'There is enough data for one focused next step.'),
    patterns: weak ? [{
      title: weak.label,
      explanation: localCopy(briefing.lang as Lang, 'Эта зона чаще появляется в собранных сигналах.', 'Ця зона частіше з’являється у зібраних сигналах.', 'Esta zona aparece con más frecuencia.', 'This area appears more often in the collected signals.'),
      evidenceRefs: [evidenceRef],
    }] : [],
    improvements: [],
    priorities: weak ? [{
      title: weak.label,
      reason: localCopy(briefing.lang as Lang, 'Короткое повторение даст самый понятный следующий шаг.', 'Коротке повторення дасть найзрозуміліший наступний крок.', 'Un repaso corto ofrece el siguiente paso más claro.', 'A short review gives the clearest next step.'),
      evidenceRefs: [evidenceRef],
    }] : [],
    plan: recommendation ? [{
      order: 1,
      actionKind: recommendation.actionKind,
      recommendationId: recommendation.recommendationId,
      evidenceRefs: [evidenceRef],
      expectedOutcome: recommendation.label,
    }] : [],
    confidence: briefing.coverage.failed === 0 ? 'medium' : 'low',
    coverageNote: localCopy(briefing.lang as Lang, 'Это краткий локальный снимок до нового AI-разбора.', 'Це короткий локальний знімок до нового AI-розбору.', 'Es una vista local breve antes del nuevo análisis con IA.', 'This is a brief local snapshot before the next AI review.'),
  };
}

function storedFromRaw(raw: string | null, expected: { accountScope: string; lang: Lang; studyTarget: 'en' | 'fr' }): WeeklyReviewStoredV2 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<WeeklyReviewStoredV2>;
    const review = normalizeReview(value.review);
    if (
      value.schemaVersion !== WEEKLY_REVIEW_SCHEMA_VERSION
      || value.entitlement !== 'plus'
      || value.accountScope !== expected.accountScope
      || value.lang !== expected.lang
      || value.studyTarget !== expected.studyTarget
      || !review
    ) return null;
    return {
      schemaVersion: WEEKLY_REVIEW_SCHEMA_VERSION,
      accountScope: expected.accountScope,
      entitlement: 'plus',
      lang: expected.lang,
      studyTarget: expected.studyTarget,
      review,
      generatedAtMs: Number(value.generatedAtMs ?? 0),
      nextAllowedAtMs: Number(value.nextAllowedAtMs ?? 0),
    };
  } catch {
    return null;
  }
}

function errorCode(error: unknown): WeeklyReviewErrorCode {
  const message = String((error as { message?: unknown })?.message ?? error);
  if (/not[_-]ready/i.test(message)) return 'not_ready';
  if (/app[_-]check/i.test(message)) return 'app_check_unavailable';
  if (/network|offline|unavailable/i.test(message)) return 'offline';
  if (/provider/i.test(message)) return 'provider_failed';
  return 'unknown';
}

async function requestDeduped(
  key: string,
  briefing: WeeklyReviewBriefingV2,
  request: WeeklyReviewClientDependencies['requestCallable'],
  analytics?: {
    signalCount: number;
    studyTarget: 'en' | 'fr';
    now: () => number;
  },
): Promise<WeeklyReviewCallableResult> {
  const existing = weeklyReviewInFlight.get(key);
  if (existing) return existing;
  const startedAt = analytics?.now() ?? Date.now();
  if (analytics) {
    trackWeeklyReviewEvent('weekly_review_generate_started', {
      tier: 'plus',
      study_target: analytics.studyTarget,
      signal_bucket: signalBucket(analytics.signalCount),
      schema_version: WEEKLY_REVIEW_SCHEMA_VERSION,
    });
  }
  const pending = request(briefing)
    .then((result) => {
      if (analytics) {
        trackWeeklyReviewEvent('weekly_review_generate_succeeded', {
          tier: 'plus',
          study_target: analytics.studyTarget,
          signal_bucket: signalBucket(analytics.signalCount),
          result_source: result.idempotentReplay ? 'replay' : 'provider',
          latency_bucket: latencyBucket(Math.max(0, analytics.now() - startedAt)),
          schema_version: WEEKLY_REVIEW_SCHEMA_VERSION,
        });
      }
      return result;
    })
    .catch((error: unknown) => {
      if (analytics) {
        trackWeeklyReviewEvent('weekly_review_generate_failed', {
          tier: 'plus',
          study_target: analytics.studyTarget,
          signal_bucket: signalBucket(analytics.signalCount),
          error_code: errorCode(error),
          latency_bucket: latencyBucket(Math.max(0, analytics.now() - startedAt)),
          schema_version: WEEKLY_REVIEW_SCHEMA_VERSION,
        });
      }
      throw error;
    })
    .finally(() => weeklyReviewInFlight.delete(key));
  weeklyReviewInFlight.set(key, pending);
  return pending;
}

export async function generateWeeklyReview(
  options: GenerateOptions,
  deps: WeeklyReviewClientDependencies = DEFAULT_DEPS,
): Promise<WeeklyReviewState> {
  const nowMs = options.nowMs ?? deps.now();
  const briefingResult = await deps.buildBriefing(options);
  const snapshot = briefingResult.snapshot;
  if (briefingResult.status === 'insufficient') return { status: 'insufficient', snapshot };
  if (briefingResult.status !== 'ready') return { status: 'error', snapshot, errorCode: 'unknown' };

  if (!options.isPremium) return { status: 'free_eligible', snapshot };

  const token = deps.captureGeneration();
  const accountScope = deps.accountScope(token);
  if (!accountScope || !token.stableId) return { status: 'hydrating', snapshot };
  const studyTarget = briefingResult.briefing.studyTarget;
  const storageScope = encodeURIComponent(accountScope);
  const key = weeklyReviewV2StorageKey(storageScope, options.lang, options.studyTarget);
  const raw = await deps.storage.getItem(key);
  if (!deps.isCurrentGeneration(token, token.stableId)) return { status: 'hydrating', snapshot };
  const stored = storedFromRaw(raw, { accountScope, lang: options.lang, studyTarget });

  if (stored && nowMs < stored.nextAllowedAtMs) {
    return { status: 'cooldown', snapshot, review: stored.review, nextAllowedAtMs: stored.nextAllowedAtMs };
  }

  const fallback = stored?.review ?? buildLocalWeeklyReview(briefingResult.briefing);
  const aiV2Enabled = options.aiV2Enabled ?? deps.aiEnabled();
  if (options.allowGenerate === false) {
    if (aiV2Enabled) return { status: 'plus_ready_to_generate', snapshot, fallback };
    if (stored) return { status: 'cached', snapshot, review: stored.review, nextAllowedAtMs: stored.nextAllowedAtMs };
    return { status: 'plus_ready_to_generate', snapshot, fallback };
  }
  if (!aiV2Enabled) {
    if (stored) return { status: 'cached', snapshot, review: stored.review, nextAllowedAtMs: stored.nextAllowedAtMs };
    return { status: 'plus_ready_to_generate', snapshot, fallback };
  }

  try {
    const result = await requestDeduped(key, briefingResult.briefing, deps.requestCallable, {
      signalCount: snapshot.signalCount,
      studyTarget,
      now: deps.now,
    });
    if (!deps.isCurrentGeneration(token, token.stableId)) return { status: 'hydrating', snapshot };
    const envelope: WeeklyReviewStoredV2 = {
      schemaVersion: WEEKLY_REVIEW_SCHEMA_VERSION,
      accountScope,
      entitlement: 'plus',
      lang: options.lang,
      studyTarget,
      review: result.review,
      generatedAtMs: nowMs,
      nextAllowedAtMs: result.nextAllowedAtMs,
    };
    await deps.storage.setItem(key, JSON.stringify(envelope));
    if (!deps.isCurrentGeneration(token, token.stableId)) return { status: 'hydrating', snapshot };
    await deps.storage.removeItem(weeklyReviewStorageKey(options.studyTarget)).catch(() => undefined);
    return {
      status: result.idempotentReplay ? 'cached' : 'fresh',
      snapshot,
      review: result.review,
      nextAllowedAtMs: result.nextAllowedAtMs,
    };
  } catch (error) {
    const code = errorCode(error);
    if (code === 'not_ready' && stored) {
      return { status: 'cooldown', snapshot, review: stored.review, nextAllowedAtMs: stored.nextAllowedAtMs };
    }
    return {
      status: code === 'offline' ? 'offline' : 'error',
      snapshot,
      review: stored?.review ?? fallback,
      errorCode: code,
    };
  }
}

export async function getWeeklyReviewState(
  options: GenerateOptions,
  deps: WeeklyReviewClientDependencies = DEFAULT_DEPS,
): Promise<WeeklyReviewState> {
  return generateWeeklyReview({ ...options, allowGenerate: false }, deps);
}

async function requestWeeklyReviewV2(
  briefing: WeeklyReviewBriefingV2,
): Promise<WeeklyReviewCallableResult> {
  const [{ getApp }, { getFunctions, httpsCallable }, { ensureAnonUser }, { initFirebaseAppCheckIfAvailable }] = await Promise.all([
    import('@react-native-firebase/app'),
    import('@react-native-firebase/functions'),
    import('./auth_provider'),
    import('./app_check_init'),
  ]);
  await ensureAnonUser();
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  if (!appCheckReady) throw new Error('weekly_review_app_check_unavailable');
  const callable = httpsCallable<
    { briefing: WeeklyReviewBriefingV2 },
    WeeklyReviewCallableResult
  >(getFunctions(getApp(), 'us-central1'), 'weeklyReviewGenerate', { timeout: 30_000 });
  const result = await callable({ briefing });
  return normalizeCallableResult(result.data);
}

export const __weeklyReviewClientTestHooks = {
  normalizeReview,
  normalizeCallableResult,
  storedFromRaw,
  requestDeduped,
};

export default function __RouteShim() { return null; }
