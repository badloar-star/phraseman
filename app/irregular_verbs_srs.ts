// ═══════════════════════════════════════════════════════════════════════════
// irregular_verbs_srs.ts — интервальное повторение для раздела неправильных глаголов
//
// Раньше: глагол получал count=3 за один безошибочный проход и НИКОГДА не
// возвращался («выучен навсегда»). Угаданный из 4 кнопок исчезал бесследно.
//
// Теперь: у каждого глагола есть streak + nextDue. Выучил чисто → показываем
// снова через 1→3→7→14→30 дней (кривая забывания). Угадал/ошибся → короткий
// интервал. После полной лесенки → mastered.
//
// Хранилище — один JSON под irregularVerbsSrsKey(studyTarget), карта base→state.
// Старый ключ count (irregularVerbsGlobalKey) сохраняем для обратной
// совместимости и для процентов в меню урока.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { irregularVerbsSrsKey, type RuntimeStudyTarget } from './target_storage_keys';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Лесенка интервалов в днях. Индекс = streak. */
export const SRS_INTERVALS = [1, 3, 7, 14, 30] as const;

/** После этого числа чистых правильных подряд глагол освоен (mastered). */
export const SRS_GRADUATE_AT = SRS_INTERVALS.length; // 5

/** Сколько «правильных подряд» эквивалентно старому count=3 (выучен в один проход). */
const LEGACY_LEARNED_STREAK = 3;

export interface VerbSrsState {
  /** Кол-во чистых правильных проходов подряд. */
  streak: number;
  /** Unix ms — когда глагол снова появится для повторения. */
  nextDue: number;
  /** Unix ms — первая встреча. */
  firstSeen: number;
  /** Unix ms — последний проход. */
  lastSeen: number;
  /** Был ли проход с ошибкой/угадыванием (для коротких интервалов). */
  shaky?: boolean;
  /** Освоен (прошёл всю лесенку). */
  mastered?: boolean;
}

export type VerbSrsMap = Record<string, VerbSrsState>;

function todayEnd(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function tomorrowStart(now = Date.now()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function intervalForStreak(streak: number): number {
  return SRS_INTERVALS[Math.min(streak, SRS_INTERVALS.length - 1)] ?? 30;
}

function dueDateForStreak(streak: number, now = Date.now()): number {
  return now + intervalForStreak(streak) * MS_PER_DAY;
}

// ── Storage ──────────────────────────────────────────────────────────────────

export async function loadVerbSrs(studyTarget?: RuntimeStudyTarget): Promise<VerbSrsMap> {
  try {
    const raw = await AsyncStorage.getItem(irregularVerbsSrsKey(studyTarget));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as VerbSrsMap) : {};
  } catch {
    return {};
  }
}

async function saveVerbSrs(map: VerbSrsMap, studyTarget?: RuntimeStudyTarget): Promise<void> {
  try {
    await AsyncStorage.setItem(irregularVerbsSrsKey(studyTarget), JSON.stringify(map));
  } catch {
    /* запись в кэш не критична — пропускаем */
  }
}

// ── Запись результата прохода ──────────────────────────────────────────────────

export interface VerbPassInput {
  /** Глагол ответил без единой ошибки за проход. */
  clean: boolean;
  /** Хотя бы одну форму отвечали угадыванием/со 2-й попытки (короткий интервал). */
  shaky?: boolean;
}

/**
 * Регистрирует один проход по глаголу (3 формы).
 * clean=true → продвижение по лесенке; иначе → сброс streak и показ завтра.
 * Возвращает обновлённое состояние (для UI «следующее повторение через N дней»).
 */
export async function recordVerbPass(
  base: string,
  input: VerbPassInput,
  studyTarget?: RuntimeStudyTarget,
  now = Date.now(),
): Promise<VerbSrsState> {
  const map = await loadVerbSrs(studyTarget);
  const key = base.trim().toLowerCase();
  const prev: VerbSrsState = map[key] ?? {
    streak: 0,
    nextDue: 0,
    firstSeen: now,
    lastSeen: now,
  };

  let next: VerbSrsState;
  if (input.clean) {
    const streak = prev.streak + 1;
    // Угадал из 4 кнопок → не даём длинный интервал: держим на коротком конце лесенки.
    const effectiveStreak = input.shaky ? Math.min(streak, 1) : streak;
    const mastered = effectiveStreak >= SRS_GRADUATE_AT;
    next = {
      streak,
      nextDue: mastered ? 0 : dueDateForStreak(effectiveStreak, now),
      firstSeen: prev.firstSeen,
      lastSeen: now,
      shaky: input.shaky,
      mastered,
    };
  } else {
    next = {
      streak: 0,
      nextDue: tomorrowStart(now),
      firstSeen: prev.firstSeen,
      lastSeen: now,
      shaky: true,
      mastered: false,
    };
  }

  const updated = { ...map, [key]: next };
  await saveVerbSrs(updated, studyTarget);
  return next;
}

// ── Запросы для очереди ────────────────────────────────────────────────────────

/** Глагол ждёт повторения сегодня? (mastered и будущие — нет). */
export function isVerbDue(state: VerbSrsState | undefined, now = Date.now()): boolean {
  if (!state) return true; // ни разу не виделся — учить
  if (state.mastered) return false;
  if (state.nextDue <= 0) return true;
  return state.nextDue <= todayEnd(now);
}

/** Глагол ни разу не виделся (для режима «новые»). */
export function isVerbNew(state: VerbSrsState | undefined): boolean {
  return !state || (state.streak === 0 && !state.lastSeen);
}

/**
 * Сколько дней до следующего повторения (для подписи). 0 = сегодня/сейчас.
 */
export function daysUntilDue(state: VerbSrsState | undefined, now = Date.now()): number {
  if (!state || state.nextDue <= 0) return 0;
  return Math.max(0, Math.ceil((state.nextDue - now) / MS_PER_DAY));
}

export interface VerbSrsSummary {
  /** Глаголы, которые надо повторить/выучить сегодня. */
  dueBases: string[];
  /** Уже освоенные (mastered). */
  masteredCount: number;
  /** В работе (виделись, но не освоены). */
  learningCount: number;
  /** Ещё не начатые. */
  newCount: number;
}

/**
 * Сводка по набору глаголов урока: что повторять сегодня, что освоено.
 * @param bases — список base глаголов урока (или порции).
 */
export function summarizeVerbSrs(bases: string[], map: VerbSrsMap, now = Date.now()): VerbSrsSummary {
  const dueBases: string[] = [];
  let masteredCount = 0;
  let learningCount = 0;
  let newCount = 0;
  for (const base of bases) {
    const state = map[base.trim().toLowerCase()];
    if (!state) {
      newCount += 1;
      dueBases.push(base);
      continue;
    }
    if (state.mastered) {
      masteredCount += 1;
      continue;
    }
    learningCount += 1;
    if (isVerbDue(state, now)) dueBases.push(base);
  }
  return { dueBases, masteredCount, learningCount, newCount };
}

// ── Миграция со старого count-формата ──────────────────────────────────────────

/**
 * Одноразовый посев SRS из старого формата count (count>=3 → выучен).
 * Чтобы у существующих пользователей выученные глаголы не обнулились,
 * а получили mastered=false со средним интервалом (вернутся в повторение мягко).
 * Вызывать при открытии раздела, если SRS-карта пуста, а count-карта — нет.
 */
export async function seedSrsFromLegacyCounts(
  legacyCounts: Record<string, number>,
  studyTarget?: RuntimeStudyTarget,
  now = Date.now(),
): Promise<VerbSrsMap> {
  const existing = await loadVerbSrs(studyTarget);
  if (Object.keys(existing).length > 0) return existing; // уже мигрировано
  const seeded: VerbSrsMap = {};
  for (const [base, count] of Object.entries(legacyCounts)) {
    if (count >= LEGACY_LEARNED_STREAK) {
      // Считался выученным — даём средний streak и due «через неделю»,
      // чтобы вернуть в повторение, а не похоронить навсегда.
      seeded[base.toLowerCase()] = {
        streak: 2,
        nextDue: now + SRS_INTERVALS[2] * MS_PER_DAY,
        firstSeen: now,
        lastSeen: now,
        mastered: false,
      };
    }
  }
  if (Object.keys(seeded).length > 0) await saveVerbSrs(seeded, studyTarget);
  return seeded;
}

/** DEV/диагностика — сбросить весь SRS раздела. */
export async function clearVerbSrs(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.removeItem(irregularVerbsSrsKey(studyTarget));
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
