// ═══════════════════════════════════════════════════════════════════════════
// spire_local_store.ts — маленькие локальные записи Шпиля (без сети).
//
//   • тур первого входа показан (макет §1: «Показывается один раз»);
//   • номер попытки ступени — какой из трёх наборов пакета дать («Ещё раз» даёт
//     НОВЫЕ 10 заданий, контракт §4: первая попытка + 2 повтора, дальше по кругу).
//     Счётчик растёт при СТАРТЕ ступени (после списания энергии), поэтому выход
//     посреди ступени и перезапуск приложения тоже дают другой набор.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DebugLogger } from '../debug-logger';

const LOG = '[SPIRE]';
const TOUR_KEY = 'spire_tour_seen_v1';
const ATTEMPTS_PREFIX = 'spire_step_attempts_v1';

let tourSeenMemory: boolean | null = null;

/** Синхронно: null — ещё не читали с диска. */
export function peekSpireTourSeen(): boolean | null {
  return tourSeenMemory;
}

export async function spireReadTourSeen(): Promise<boolean> {
  if (tourSeenMemory !== null) return tourSeenMemory;
  try {
    tourSeenMemory = (await AsyncStorage.getItem(TOUR_KEY)) === '1';
  } catch (error) {
    // зачем: не прочитали — считаем показанным, чтобы тур не всплывал каждый заход.
    DebugLogger.warn(LOG, `tour: флаг не прочитался, тур не показываем (${String(error)})`);
    tourSeenMemory = true;
  }
  return tourSeenMemory;
}

export async function spireMarkTourSeen(): Promise<void> {
  tourSeenMemory = true;
  try {
    await AsyncStorage.setItem(TOUR_KEY, '1');
  } catch (error) {
    DebugLogger.warn(LOG, `tour: флаг не сохранился — в этом запуске тур всё равно скрыт (${String(error)})`);
  }
}

type Attempts = Readonly<{ weekKey: string; byStep: Readonly<Record<string, number>> }>;

const attemptsKey = (uid: string, lang: string) => `${ATTEMPTS_PREFIX}:${uid}:${lang}`;
const stepKey = (floor: number, step: number) => `f${floor}s${step}`;

async function readAttempts(uid: string, lang: string, weekKey: string): Promise<Attempts> {
  try {
    const raw = await AsyncStorage.getItem(attemptsKey(uid, lang));
    const parsed = raw ? (JSON.parse(raw) as Attempts) : null;
    if (parsed && parsed.weekKey === weekKey && parsed.byStep && typeof parsed.byStep === 'object') return parsed;
  } catch (error) {
    DebugLogger.warn(LOG, `attempts: не прочитались, начинаем с 0 (${String(error)})`);
  }
  return { weekKey, byStep: {} };
}

/** Номер попытки этой ступени (0 = первая) — без изменения счётчика. */
export async function spirePeekStepAttempt(uid: string, lang: string, weekKey: string, floor: number, step: number): Promise<number> {
  const a = await readAttempts(uid, lang, weekKey);
  return a.byStep[stepKey(floor, step)] ?? 0;
}

/** Попытка началась (энергия списана) — следующий старт той же ступени возьмёт другой набор. */
export async function spireBumpStepAttempt(uid: string, lang: string, weekKey: string, floor: number, step: number): Promise<void> {
  const a = await readAttempts(uid, lang, weekKey);
  const k = stepKey(floor, step);
  const next: Attempts = { weekKey, byStep: { ...a.byStep, [k]: (a.byStep[k] ?? 0) + 1 } };
  try {
    await AsyncStorage.setItem(attemptsKey(uid, lang), JSON.stringify(next));
  } catch (error) {
    DebugLogger.warn(LOG, `attempts: не сохранились — повтор может дать тот же набор (${String(error)})`);
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
