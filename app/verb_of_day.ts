// ═══════════════════════════════════════════════════════════════════════════
// verb_of_day.ts — «Глагол дня»: дневной мини-челлендж по неправильным глаголам
//
// Автономная фича: каждый день один неправильный глагол выбирается детерминированно
// (по дате), пользователь отрабатывает его 3 формы. За выполнение — стрик «по
// глаголам» (отдельный от общего дневного стрика).
//
// Источник правды по выбору — те же данные неправильных глаголов + SRS:
// приоритет отдаётся глаголам «на повторение сегодня», затем новым, затем любым.
//
// Модуль НЕ зависит от Компаса. Compass может ПОТРЕБИТЬ getVerbOfDaySnapshot()
// как источник через signal_bus, но если Компас выключен — фича работает сама.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { verbOfDayKey, type RuntimeStudyTarget } from './target_storage_keys';
import {
  IRREGULAR_VERBS_BY_LESSON,
  type IrregularVerb,
} from './irregular_verbs_data';
import { loadVerbSrs, summarizeVerbSrs, type VerbSrsMap } from './irregular_verbs_srs';

/** UTC YYYY-MM-DD — общий формат с дневными задачами/стриком. */
export function verbOfDayDateKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export interface VerbOfDayState {
  /** Дата (YYYY-MM-DD) последнего выполненного «глагола дня». */
  lastDoneDate: string;
  /** Текущая серия дней подряд. */
  streak: number;
  /** Лучшая серия. */
  bestStreak: number;
  /** base глагола, засчитанного в последний выполненный день (анти-двойной зачёт). */
  lastDoneBase?: string;
}

const EMPTY_STATE: VerbOfDayState = { lastDoneDate: '', streak: 0, bestStreak: 0 };

// ── Все глаголы (плоско, без дублей) ───────────────────────────────────────────

function allVerbsFlat(): IrregularVerb[] {
  const seen = new Set<string>();
  const out: IrregularVerb[] = [];
  for (const verbs of Object.values(IRREGULAR_VERBS_BY_LESSON)) {
    for (const v of verbs) {
      const key = v.base.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

/** Детерминированный хэш строки (FNV-1a) — для стабильного выбора по дате. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Выбирает «глагол дня» детерминированно по дате.
 * Приоритет: due (на повторение/новые сегодня) → иначе любой из урока.
 * Один и тот же день → один и тот же глагол (стабильно между перезапусками).
 */
export function pickVerbOfDay(
  srsMap: VerbSrsMap,
  dateKey: string,
  verbs: IrregularVerb[] = allVerbsFlat(),
): IrregularVerb | null {
  if (verbs.length === 0) return null;
  const summary = summarizeVerbSrs(verbs.map(v => v.base), srsMap);
  const dueSet = new Set(summary.dueBases.map(b => b.toLowerCase()));
  const pool = verbs.filter(v => dueSet.has(v.base.toLowerCase()));
  const chosen = pool.length > 0 ? pool : verbs;
  const idx = hashString(dateKey) % chosen.length;
  return chosen[idx] ?? null;
}

// ── Storage ──────────────────────────────────────────────────────────────────

export async function loadVerbOfDayState(studyTarget?: RuntimeStudyTarget): Promise<VerbOfDayState> {
  try {
    const raw = await AsyncStorage.getItem(verbOfDayKey(studyTarget));
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    return {
      lastDoneDate: typeof parsed?.lastDoneDate === 'string' ? parsed.lastDoneDate : '',
      streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
      bestStreak: Number.isFinite(parsed?.bestStreak) ? parsed.bestStreak : 0,
      lastDoneBase: typeof parsed?.lastDoneBase === 'string' ? parsed.lastDoneBase : undefined,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function saveVerbOfDayState(state: VerbOfDayState, studyTarget?: RuntimeStudyTarget): Promise<void> {
  try {
    await AsyncStorage.setItem(verbOfDayKey(studyTarget), JSON.stringify(state));
  } catch {
    /* запись не критична */
  }
}

function isYesterday(prevDate: string, todayDate: string): boolean {
  if (!prevDate) return false;
  const prev = new Date(prevDate + 'T00:00:00Z').getTime();
  const today = new Date(todayDate + 'T00:00:00Z').getTime();
  return today - prev === 24 * 60 * 60 * 1000;
}

/** «Глагол дня» уже выполнен сегодня? */
export function isVerbOfDayDone(state: VerbOfDayState, now = Date.now()): boolean {
  return state.lastDoneDate === verbOfDayDateKey(now);
}

/**
 * Отметить «глагол дня» выполненным. Идемпотентно в рамках дня.
 * Серия: +1 если вчера тоже был день; сброс к 1 если разрыв.
 */
export async function markVerbOfDayDone(
  base: string,
  studyTarget?: RuntimeStudyTarget,
  now = Date.now(),
): Promise<VerbOfDayState> {
  const today = verbOfDayDateKey(now);
  const state = await loadVerbOfDayState(studyTarget);
  if (state.lastDoneDate === today) return state; // уже засчитан сегодня

  const streak = isYesterday(state.lastDoneDate, today) ? state.streak + 1 : 1;
  const next: VerbOfDayState = {
    lastDoneDate: today,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lastDoneBase: base.toLowerCase(),
  };
  await saveVerbOfDayState(next, studyTarget);
  return next;
}

// ── Снимок для UI / Компаса ────────────────────────────────────────────────────

export interface VerbOfDaySnapshot {
  /** Глагол дня (null если в таргете нет неправильных глаголов). */
  verb: IrregularVerb | null;
  /** Выполнен ли уже сегодня. */
  done: boolean;
  /** Текущая серия дней. */
  streak: number;
  /** Лучшая серия. */
  bestStreak: number;
  /** Дата выбора (YYYY-MM-DD). */
  dateKey: string;
}

/**
 * Полный снимок «глагола дня» — единая точка для домашнего экрана и Компаса.
 * Compass-friendly: чистое чтение, без сайд-эффектов.
 */
export async function getVerbOfDaySnapshot(
  studyTarget?: RuntimeStudyTarget,
  now = Date.now(),
): Promise<VerbOfDaySnapshot> {
  const dateKey = verbOfDayDateKey(now);
  const [srsMap, state] = await Promise.all([
    loadVerbSrs(studyTarget),
    loadVerbOfDayState(studyTarget),
  ]);
  const verb = pickVerbOfDay(srsMap, dateKey);
  return {
    verb,
    done: state.lastDoneDate === dateKey,
    streak: state.streak,
    bestStreak: state.bestStreak,
    dateKey,
  };
}

/** DEV/диагностика — сброс «глагола дня». */
export async function clearVerbOfDay(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.removeItem(verbOfDayKey(studyTarget));
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
