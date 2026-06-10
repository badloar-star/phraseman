// ═══════════════════════════════════════════════════════════════════════════
// weekly_review_client.ts — клиентский слой еженедельного ИИ-разбора.
//
// Отвечает за: кэш последнего разбора (AsyncStorage), локальный гейт частоты
// (календарное окно + минимум данных — чтобы не дёргать платный CF зря),
// вызов CF weeklyReviewGenerate и маппинг ошибок в мягкие состояния для UI.
//
// SERVER остаётся источником правды по окну (его квота неподделываема). Локальный
// гейт — лишь оптимизация и UX: не показываем кнопку «обновить», пока рано.
// Паттерн callable()/ensureAnonUser следует daily_analytics_sync.ts.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { buildWeeklyReviewBriefing, type WeeklyReviewRecommendation } from './weekly_review_briefing';
import { getLast7DaysXp, getLast7DaysTimeMs } from './daily_analytics_sync';
import { loadActivity365Analytics } from './activity_365_analytics';
import { DebugLogger } from './debug-logger';
import { triLang, type Lang } from '../constants/i18n';
import { weeklyReviewStorageKey, type RuntimeStudyTarget } from './target_storage_keys';

const FUNCTIONS_REGION = 'us-central1';
const DAY_MS = 24 * 60 * 60 * 1000;
const PREMIUM_WINDOW_DAYS = 7;
const FREE_WINDOW_DAYS = 14;

export interface WeeklyReview {
  greeting: string;
  paragraphs: string[];
  recommendations: WeeklyReviewRecommendation[];
}

export interface WeeklyReviewStored {
  review: WeeklyReview;
  /** Когда разбор был сгенерирован (мс). */
  generatedAtMs: number;
  /** Когда сервер разрешит следующий (мс). */
  nextAllowedAtMs: number;
  /** За какое окно (дни) собирался. */
  windowDays: number;
  /** Язык, на котором сгенерирован — чтобы не показывать чужой при смене языка. */
  lang: Lang;
}

export type WeeklyReviewState =
  | { kind: 'none'; canGenerate: boolean }
  | { kind: 'cached'; stored: WeeklyReviewStored; canRefresh: boolean; nextAllowedAtMs: number }
  | { kind: 'insufficient_data' }
  | { kind: 'error'; code: WeeklyReviewErrorCode; stored: WeeklyReviewStored | null };

export type WeeklyReviewErrorCode =
  | 'offline'
  | 'not_ready'
  | 'insufficient_data'
  | 'provider_failed'
  | 'unknown';

function callable<TReq, TRes>(name: string) {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
  } catch {
    return null;
  }
}

/** Normalizes a stored/CF review so downstream code can trust its shape. */
function normalizeReview(review: Partial<WeeklyReview> | undefined): WeeklyReview | null {
  if (!review || typeof review.greeting !== 'string' || !review.greeting) return null;
  return {
    greeting: review.greeting,
    paragraphs: Array.isArray(review.paragraphs) ? review.paragraphs.filter((p): p is string => typeof p === 'string') : [],
    recommendations: Array.isArray(review.recommendations)
      ? review.recommendations.filter((r): r is WeeklyReviewRecommendation => !!r && typeof r.microDiagnosisId === 'string' && typeof r.label === 'string')
      : [],
  };
}

async function loadStored(studyTarget?: RuntimeStudyTarget): Promise<WeeklyReviewStored | null> {
  try {
    const raw = await AsyncStorage.getItem(weeklyReviewStorageKey(studyTarget));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WeeklyReviewStored>;
    const review = normalizeReview(parsed?.review);
    if (!review) return null;
    return {
      review,
      generatedAtMs: Number(parsed.generatedAtMs ?? 0),
      nextAllowedAtMs: Number(parsed.nextAllowedAtMs ?? 0),
      windowDays: Number(parsed.windowDays ?? 0),
      lang: (parsed.lang ?? 'ru') as WeeklyReviewStored['lang'],
    };
  } catch {
    return null;
  }
}

async function saveStored(stored: WeeklyReviewStored, studyTarget?: RuntimeStudyTarget): Promise<void> {
  try {
    await AsyncStorage.setItem(weeklyReviewStorageKey(studyTarget), JSON.stringify(stored));
  } catch (err) {
    DebugLogger.error('weekly_review_client:save', err, 'warning');
  }
}

function windowDaysFor(isPremium: boolean): number {
  return isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
}

/**
 * Локальная оценка: можно ли сейчас сгенерировать новый разбор.
 * true, если разбора ещё не было, или прошло окно с прошлого.
 * (Сервер всё равно перепроверит — это лишь чтобы не дёргать CF впустую.)
 */
function canGenerateNow(stored: WeeklyReviewStored | null, nowMs: number): boolean {
  if (!stored) return true;
  return nowMs >= stored.nextAllowedAtMs;
}

/** Текущее состояние для UI без обращения к сети. */
export async function getWeeklyReviewState(
  studyTarget?: RuntimeStudyTarget,
  nowMs: number = Date.now(),
): Promise<WeeklyReviewState> {
  const stored = await loadStored(studyTarget);
  if (!stored) return { kind: 'none', canGenerate: true };
  const canRefresh = canGenerateNow(stored, nowMs);
  return { kind: 'cached', stored, canRefresh, nextAllowedAtMs: stored.nextAllowedAtMs };
}

function mapErrorCode(err: unknown): WeeklyReviewErrorCode {
  const code = String((err as { code?: unknown })?.code ?? '');
  const message = String((err as { message?: unknown })?.message ?? '');
  if (message.includes('weekly_review_not_ready')) return 'not_ready';
  if (message.includes('weekly_review_insufficient_data')) return 'insufficient_data';
  if (message.includes('weekly_review_provider_failed') || message.includes('weekly_review_bad_json') || message.includes('weekly_review_empty')) return 'provider_failed';
  if (code.includes('unavailable') || message.includes('network') || message.includes('offline')) return 'offline';
  return 'unknown';
}

/** Firebase callable errors carry server details under `.details`. */
function errorNextAllowedAtMs(err: unknown): number | null {
  const details = (err as { details?: { nextAllowedAtMs?: unknown } })?.details;
  const ms = Number(details?.nextAllowedAtMs);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

export interface GenerateOptions {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  isPremium: boolean;
  force?: boolean;
  nowMs?: number;
}

/**
 * Генерирует новый разбор через CF (если окно позволяет и данных достаточно).
 * Возвращает обновлённое состояние. При ошибке отдаёт прошлый разбор + код.
 */
export async function generateWeeklyReview(options: GenerateOptions): Promise<WeeklyReviewState> {
  const { lang, isPremium } = options;
  const studyTarget = options.studyTarget;
  const nowMs = options.nowMs ?? Date.now();
  const stored = await loadStored(studyTarget);

  // Локальный гейт: рано — отдаём кэш, CF не трогаем.
  if (!options.force && !canGenerateNow(stored, nowMs)) {
    if (stored) return { kind: 'cached', stored, canRefresh: false, nextAllowedAtMs: stored.nextAllowedAtMs };
    return { kind: 'none', canGenerate: false };
  }

  // Effort-контекст собираем здесь (Firebase-слой) и передаём в чистый builder.
  const [weekXp, weekTimeMs, activity] = await Promise.all([
    getLast7DaysXp().catch(() => 0),
    getLast7DaysTimeMs().catch(() => 0),
    loadActivity365Analytics().catch(() => null),
  ]);
  const effort = {
    currentStreak: activity?.currentStreak ?? 0,
    longestStreak: activity?.longestStreak ?? 0,
    weekXp,
    weekMinutes: Math.round(weekTimeMs / 60000),
  };

  const briefing = await buildWeeklyReviewBriefing({ lang, studyTarget, isPremium, effort });
  if (!briefing) {
    // Данных мало. Сохраняем «окно» чтобы не пытаться каждую секунду.
    return stored
      ? { kind: 'cached', stored, canRefresh: false, nextAllowedAtMs: stored.nextAllowedAtMs }
      : { kind: 'insufficient_data' };
  }

  const fn = callable<{ briefing: typeof briefing; isPremium: boolean }, {
    ok: boolean;
    review: WeeklyReview;
    nextAllowedAtMs: number;
    model: string;
  }>('weeklyReviewGenerate');
  if (!fn) {
    return stored
      ? { kind: 'error', code: 'offline', stored }
      : { kind: 'error', code: 'offline', stored: null };
  }

  try {
    const uid = await ensureAnonUser();
    if (uid) await ensureStableAuthLinkForStableId(uid).catch(() => false);

    const { data } = await fn({ briefing, isPremium });
    const review = data?.ok ? normalizeReview(data.review) : null;
    if (!review) {
      return stored ? { kind: 'error', code: 'provider_failed', stored } : { kind: 'error', code: 'provider_failed', stored: null };
    }

    const nextStored: WeeklyReviewStored = {
      review,
      generatedAtMs: nowMs,
      nextAllowedAtMs: data.nextAllowedAtMs ?? nowMs + windowDaysFor(isPremium) * DAY_MS,
      windowDays: briefing.windowDays,
      lang,
    };
    await saveStored(nextStored, studyTarget);
    return { kind: 'cached', stored: nextStored, canRefresh: false, nextAllowedAtMs: nextStored.nextAllowedAtMs };
  } catch (err) {
    const code = mapErrorCode(err);
    DebugLogger.error('weekly_review_client:generate', err, 'warning');

    // not_ready: server window hasn't elapsed (local gate drifted). Sync the
    // local nextAllowedAtMs so we stop re-hitting the CF on every screen focus,
    // and present it as a normal "next review in N days" — not an error.
    if (code === 'not_ready') {
      const serverNext = errorNextAllowedAtMs(err);
      if (stored) {
        const synced: WeeklyReviewStored = {
          ...stored,
          nextAllowedAtMs: serverNext ?? stored.nextAllowedAtMs,
        };
        await saveStored(synced, studyTarget);
        return { kind: 'cached', stored: synced, canRefresh: false, nextAllowedAtMs: synced.nextAllowedAtMs };
      }
      // No cached review yet but server says "not ready" — nothing to show, and
      // don't keep retrying.
      return { kind: 'none', canGenerate: false };
    }

    return { kind: 'error', code, stored };
  }
}

/** Человеческая подпись «следующий разбор через N дней» для UI. */
export function nextReviewCopy(nextAllowedAtMs: number, lang: Lang, nowMs: number = Date.now()): string {
  const days = Math.max(0, Math.ceil((nextAllowedAtMs - nowMs) / DAY_MS));
  if (days <= 0) {
    return triLang(lang, {
      ru: 'Новый разбор готов', uk: 'Новий розбір готовий', es: 'Nuevo análisis listo',
      'pt-BR': 'Nova análise pronta', vi: 'Bản phân tích mới đã sẵn sàng', id: 'Analisis baru siap',
      tr: 'Yeni analiz hazır', pl: 'Nowa analiza gotowa',
    });
  }
  if (days === 1) {
    return triLang(lang, {
      ru: 'Следующий разбор завтра', uk: 'Наступний розбір завтра', es: 'Próximo análisis mañana',
      'pt-BR': 'Próxima análise amanhã', vi: 'Phân tích tiếp theo vào ngày mai', id: 'Analisis berikutnya besok',
      tr: 'Sonraki analiz yarın', pl: 'Następna analiza jutro',
    });
  }
  return triLang(lang, {
    ru: `Следующий разбор через ${days} дн.`, uk: `Наступний розбір через ${days} дн.`,
    es: `Próximo análisis en ${days} días`, 'pt-BR': `Próxima análise em ${days} dias`,
    vi: `Phân tích tiếp theo sau ${days} ngày`, id: `Analisis berikutnya dalam ${days} hari`,
    tr: `Sonraki analiz ${days} gün sonra`, pl: `Następna analiza za ${days} dni`,
  });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
