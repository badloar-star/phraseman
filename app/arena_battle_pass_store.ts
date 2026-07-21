// Боевой пропуск арены: локальное хранилище очков.
// Восстановлено 2026-07-21: модуль импортировался из arena_results.tsx, но отсутствовал в репозитории.
// TODO: когда появится серверный боевой пропуск — заменить накопление в AsyncStorage на callable.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'arena_bp_points_v1';

interface BpState {
  total: number;
  updatedAtMs: number;
}

async function readState(): Promise<BpState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { total: 0, updatedAtMs: 0 };
    const parsed = JSON.parse(raw) as Partial<BpState>;
    return {
      total: typeof parsed.total === 'number' && parsed.total >= 0 ? parsed.total : 0,
      updatedAtMs: typeof parsed.updatedAtMs === 'number' ? parsed.updatedAtMs : 0,
    };
  } catch {
    return { total: 0, updatedAtMs: 0 };
  }
}

/** Начислить очки боевого пропуска. Идемпотентности нет — вызывать один раз за матч. */
export async function addBattlePassPoints(points: number): Promise<number> {
  if (!Number.isFinite(points) || points <= 0) return (await readState()).total;
  const state = await readState();
  const next: BpState = { total: state.total + Math.round(points), updatedAtMs: Date.now() };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Хранилище недоступно — очки этого матча потеряются, приложению не мешает.
  }
  return next.total;
}

/** Текущая сумма очков (для будущего экрана пропуска). */
export async function getBattlePassPoints(): Promise<number> {
  return (await readState()).total;
}
