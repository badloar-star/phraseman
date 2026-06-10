// ═══════════════════════════════════════════════════════════════════════════
// stats_insights_client.ts — клиентский слой ИИ-микротекстов под блоками статы.
//
// Отвечает за: кэш последних заметок (AsyncStorage), локальный гейт частоты
// (серверное окно), ОДИН вызов CF statsInsightsGenerate и маппинг ошибок в
// мягкие состояния для UI.
//
// Генерация ЛЕНИВАЯ и premium-only: зовём CF только когда экран открыт, premium
// активен и кэш устарел. Не заходит юзер — 0 затрат (никаких кронов). SERVER —
// источник правды по окну; локальный гейт лишь чтобы не дёргать платный CF зря.
// Паттерн зеркалит weekly_review_client.ts.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { DebugLogger } from './debug-logger';
import type { Lang } from '../constants/i18n';
import { statsInsightsStorageKey, type RuntimeStudyTarget } from './target_storage_keys';

const FUNCTIONS_REGION = 'us-central1';
const DAY_MS = 24 * 60 * 60 * 1000;
const PREMIUM_WINDOW_DAYS = 3;
const FREE_WINDOW_DAYS = 7;

/** Ключи блоков — синхронны с CF stats_insights.ts. */
export const STATS_INSIGHT_BLOCKS = ['balance', 'rhythm', 'year', 'percentiles', 'lifetime'] as const;
export type StatsInsightBlock = (typeof STATS_INSIGHT_BLOCKS)[number];
export type StatsInsightsNotes = Record<StatsInsightBlock, string>;

/** Briefing — уже посчитанные числа по блокам (собирает экран статистики). */
export interface StatsInsightsBriefing {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  balance: { score: number; isWarmup: boolean; active7: number; avgMinutes: number };
  rhythm: { active7: number; xp7: number; minutes7: number; bestDay: string };
  year: { activeDays: number; currentStreak: number; longestStreak: number; bestMonth: string; goalPct: number };
  percentiles: { totalXp: number | null; week: number | null; daily7: number | null };
  lifetime: { words: number; phrases: number; quizzes: number; arenaWins: number; daysActive: number };
  weakCategories: Array<{ label: string; pct: number }>;
}

export interface StatsInsightsStored {
  notes: StatsInsightsNotes;
  generatedAtMs: number;
  nextAllowedAtMs: number;
  lang: Lang;
}

export type StatsInsightsState =
  | { kind: 'none' }
  | { kind: 'cached'; notes: StatsInsightsNotes; nextAllowedAtMs: number; lang: Lang }
  | { kind: 'insufficient_data' }
  | { kind: 'error'; code: StatsInsightsErrorCode; notes: StatsInsightsNotes | null };

export type StatsInsightsErrorCode = 'offline' | 'not_ready' | 'insufficient_data' | 'provider_failed' | 'unknown';

function emptyNotes(): StatsInsightsNotes {
  return { balance: '', rhythm: '', year: '', percentiles: '', lifetime: '' };
}

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

/** Приводит произвольный объект заметок к известной форме (5 строковых блоков). */
function normalizeNotes(raw: Partial<StatsInsightsNotes> | undefined): StatsInsightsNotes {
  const notes = emptyNotes();
  if (!raw) return notes;
  for (const key of STATS_INSIGHT_BLOCKS) {
    const v = (raw as Record<string, unknown>)[key];
    notes[key] = typeof v === 'string' ? v : '';
  }
  return notes;
}

function hasAnyNote(notes: StatsInsightsNotes): boolean {
  return STATS_INSIGHT_BLOCKS.some((k) => !!notes[k]);
}

async function loadStored(studyTarget?: RuntimeStudyTarget): Promise<StatsInsightsStored | null> {
  try {
    const raw = await AsyncStorage.getItem(statsInsightsStorageKey(studyTarget));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StatsInsightsStored>;
    const notes = normalizeNotes(parsed?.notes);
    if (!hasAnyNote(notes)) return null;
    return {
      notes,
      generatedAtMs: Number(parsed.generatedAtMs ?? 0),
      nextAllowedAtMs: Number(parsed.nextAllowedAtMs ?? 0),
      lang: (parsed.lang ?? 'ru') as Lang,
    };
  } catch {
    return null;
  }
}

async function saveStored(stored: StatsInsightsStored, studyTarget?: RuntimeStudyTarget): Promise<void> {
  try {
    await AsyncStorage.setItem(statsInsightsStorageKey(studyTarget), JSON.stringify(stored));
  } catch (err) {
    DebugLogger.error('stats_insights_client:save', err, 'warning');
  }
}

function windowDaysFor(isPremium: boolean): number {
  return isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
}

function canGenerateNow(stored: StatsInsightsStored | null, nowMs: number): boolean {
  if (!stored) return true;
  return nowMs >= stored.nextAllowedAtMs;
}

/** Состояние для UI без сети — показать кэш мгновенно. */
export async function getStatsInsightsState(
  studyTarget?: RuntimeStudyTarget,
  nowMs: number = Date.now(),
): Promise<StatsInsightsState> {
  const stored = await loadStored(studyTarget);
  if (!stored) return { kind: 'none' };
  return { kind: 'cached', notes: stored.notes, nextAllowedAtMs: stored.nextAllowedAtMs, lang: stored.lang };
}

function mapErrorCode(err: unknown): StatsInsightsErrorCode {
  const message = String((err as { message?: unknown })?.message ?? '').toLowerCase();
  const code = String((err as { code?: unknown })?.code ?? '').toLowerCase();
  if (message.includes('stats_insights_not_ready')) return 'not_ready';
  if (message.includes('stats_insights_insufficient_data')) return 'insufficient_data';
  if (message.includes('stats_insights_provider_failed') || message.includes('stats_insights_bad_json') || message.includes('stats_insights_empty')) return 'provider_failed';
  if (code.includes('unavailable') || message.includes('network') || message.includes('offline')) return 'offline';
  return 'unknown';
}

function errorNextAllowedAtMs(err: unknown): number | null {
  const details = (err as { details?: { nextAllowedAtMs?: unknown } })?.details;
  const ms = Number(details?.nextAllowedAtMs);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

export interface GenerateStatsInsightsOptions {
  briefing: StatsInsightsBriefing;
  isPremium: boolean;
  force?: boolean;
  nowMs?: number;
}

/**
 * Генерирует заметки через CF (если окно позволяет). Возвращает обновлённое
 * состояние. При ошибке отдаёт прошлые заметки + код.
 *
 * ВАЖНО: зовётся только для premium (на free фичу не показываем). Локальный
 * гейт + серверное окно = ленивая генерация: не заходишь — не тратим.
 */
export async function generateStatsInsights(options: GenerateStatsInsightsOptions): Promise<StatsInsightsState> {
  const { briefing, isPremium } = options;
  const studyTarget = briefing.studyTarget;
  const lang = briefing.lang;
  const nowMs = options.nowMs ?? Date.now();
  const stored = await loadStored(studyTarget);

  // Локальный гейт: рано — отдаём кэш, CF не трогаем.
  if (!options.force && !canGenerateNow(stored, nowMs)) {
    if (stored) return { kind: 'cached', notes: stored.notes, nextAllowedAtMs: stored.nextAllowedAtMs, lang: stored.lang };
    return { kind: 'none' };
  }

  const fn = callable<{ briefing: StatsInsightsBriefing; isPremium: boolean }, {
    ok: boolean;
    notes: StatsInsightsNotes;
    nextAllowedAtMs: number;
    model: string;
  }>('statsInsightsGenerate');
  if (!fn) {
    return stored
      ? { kind: 'error', code: 'offline', notes: stored.notes }
      : { kind: 'error', code: 'offline', notes: null };
  }

  try {
    const uid = await ensureAnonUser();
    if (uid) await ensureStableAuthLinkForStableId(uid).catch(() => false);

    const { data } = await fn({ briefing, isPremium });
    const notes = data?.ok ? normalizeNotes(data.notes) : null;
    if (!notes || !hasAnyNote(notes)) {
      return stored
        ? { kind: 'error', code: 'provider_failed', notes: stored.notes }
        : { kind: 'error', code: 'provider_failed', notes: null };
    }

    const nextStored: StatsInsightsStored = {
      notes,
      generatedAtMs: nowMs,
      nextAllowedAtMs: data.nextAllowedAtMs ?? nowMs + windowDaysFor(isPremium) * DAY_MS,
      lang,
    };
    await saveStored(nextStored, studyTarget);
    return { kind: 'cached', notes, nextAllowedAtMs: nextStored.nextAllowedAtMs, lang };
  } catch (err) {
    const code = mapErrorCode(err);
    DebugLogger.error('stats_insights_client:generate', err, 'warning');

    if (code === 'insufficient_data') {
      return stored
        ? { kind: 'cached', notes: stored.notes, nextAllowedAtMs: stored.nextAllowedAtMs, lang: stored.lang }
        : { kind: 'insufficient_data' };
    }

    // not_ready: серверное окно не истекло (локальный гейт разошёлся). Синкаем
    // локальный nextAllowedAtMs, чтобы не бить CF на каждый фокус экрана.
    if (code === 'not_ready') {
      const serverNext = errorNextAllowedAtMs(err);
      if (stored) {
        const synced: StatsInsightsStored = { ...stored, nextAllowedAtMs: serverNext ?? stored.nextAllowedAtMs };
        await saveStored(synced, studyTarget);
        return { kind: 'cached', notes: synced.notes, nextAllowedAtMs: synced.nextAllowedAtMs, lang: synced.lang };
      }
      return { kind: 'none' };
    }

    return { kind: 'error', code, notes: stored?.notes ?? null };
  }
}
