// ════════════════════════════════════════════════════════════════════════════
// plus_splash_state.ts — локальный счётчик заставки Plus (№35): последний показ и отказы подряд.
//
// зачем (владелец 21.10, Firebase-экономия): состояние заставки живёт ТОЛЬКО на устройстве, одним ключом AsyncStorage,
// без чтений и записей в базу. Это настройка устройства, а не аккаунта: смена аккаунта её не стирает (предложение
// не должно возвращаться на каждую смену профиля). Неразобранное хранилище = «никогда не показывали», причина в журнале [PLUS-SPLASH].
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PLUS_SPLASH_STATE_KEY = 'plus_splash_state_v1';
/** Ключи, из которых политика берёт факты об установке и окончании Plus (пишет не этот модуль). */
export const PLUS_SPLASH_INSTALL_DATE_KEY = 'install_date';
export const PLUS_SPLASH_PLUS_EXPIRY_KEY = 'premium_rc_expiry_ms';

const LOG = '[PLUS-SPLASH]';

export type PlusSplashState = Readonly<{ v: 1; lastShownAtMs: number | null; refusalsInRow: number }>;

export const EMPTY_PLUS_SPLASH_STATE: PlusSplashState = Object.freeze({ v: 1, lastShownAtMs: null, refusalsInRow: 0 });

/** Разбор сохранённой строки; мусор → пустое состояние (с причиной в журнал). */
export function parsePlusSplashState(raw: string | null): PlusSplashState {
  if (!raw) return EMPTY_PLUS_SPLASH_STATE;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} state: битый JSON → считаем «не показывали»`, error instanceof Error ? error.message : String(error)); // guard-ok: причина
    return EMPTY_PLUS_SPLASH_STATE;
  }
  if (!parsed || typeof parsed !== 'object') {
    console.warn(`${LOG} state: не объект → считаем «не показывали»`, typeof parsed); // guard-ok: причина
    return EMPTY_PLUS_SPLASH_STATE;
  }
  const o = parsed as Record<string, unknown>;
  const last = typeof o.lastShownAtMs === 'number' && Number.isFinite(o.lastShownAtMs) && o.lastShownAtMs > 0 ? o.lastShownAtMs : null;
  const refusals = typeof o.refusalsInRow === 'number' && Number.isFinite(o.refusalsInRow) && o.refusalsInRow > 0 ? Math.min(Math.floor(o.refusalsInRow), 99) : 0;
  return { v: 1, lastShownAtMs: last, refusalsInRow: refusals };
}

export async function readPlusSplashState(): Promise<PlusSplashState> {
  try {
    const state = parsePlusSplashState(await AsyncStorage.getItem(PLUS_SPLASH_STATE_KEY));
    console.warn(`${LOG} state: прочитано`, JSON.stringify(state)); // guard-ok: значение, на котором строится решение
    return state;
  } catch (error) {
    console.warn(`${LOG} state: чтение упало → считаем «не показывали»`, error instanceof Error ? error.message : String(error)); // guard-ok: причина
    return EMPTY_PLUS_SPLASH_STATE;
  }
}

async function write(next: PlusSplashState, why: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PLUS_SPLASH_STATE_KEY, JSON.stringify(next));
    console.warn(`${LOG} state: записано (${why})`, JSON.stringify(next)); // guard-ok: итог записи
  } catch (error) {
    console.warn(`${LOG} state: запись упала (${why})`, error instanceof Error ? error.message : String(error)); // guard-ok: причина
  }
}

/** Заставку показали: метка времени сразу, чтобы повторный запуск не показал её снова; серия отказов не меняется. */
export async function recordPlusSplashShown(nowMs: number, prev: PlusSplashState): Promise<PlusSplashState> {
  const next: PlusSplashState = { v: 1, lastShownAtMs: nowMs, refusalsInRow: prev.refusalsInRow };
  await write(next, 'показана');
  return next;
}

/** «Не сейчас» или крестик: серия отказов растёт (после трёх — режим раз в 30 дней). */
export async function recordPlusSplashRefusal(prev: PlusSplashState): Promise<PlusSplashState> {
  const next: PlusSplashState = { v: 1, lastShownAtMs: prev.lastShownAtMs, refusalsInRow: Math.min(prev.refusalsInRow + 1, 99) };
  await write(next, 'отказ');
  return next;
}

/** Человек пошёл в пейвол: серия отказов обнуляется. */
export async function recordPlusSplashAccepted(prev: PlusSplashState): Promise<PlusSplashState> {
  const next: PlusSplashState = { v: 1, lastShownAtMs: prev.lastShownAtMs, refusalsInRow: 0 };
  await write(next, 'переход в пейвол');
  return next;
}

/** Числовое значение ключа хранилища (install_date, premium_rc_expiry_ms) или null; причина — в журнал. */
export async function readStoredMs(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null || raw === '') return null;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    console.warn(`${LOG} state: ключ ${key} не число и не дата`, raw.slice(0, 40)); // guard-ok: причина
    return null;
  } catch (error) {
    console.warn(`${LOG} state: чтение ${key} упало`, error instanceof Error ? error.message : String(error)); // guard-ok: причина
    return null;
  }
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __PlusSplashStateRouteShim() { return null; }
