// ═══════════════════════════════════════════════════════════════════════════
// rank_change.ts — Сохранение прошлой позиции пользователя в списке
// (клуб, зал славы) и вычисление diff'а после следующего remote refresh.
//
// Используется для:
//   1) Анимированного перемещения строки моего ника по местам.
//   2) Баннера сверху списка с текстом «обогнал {имя}» / «уступил {имя}».
//
// Сохраняем только при успешном remote refresh — НЕ при чтении кеша,
// иначе fallback (1 пользователь) забил бы prev_rank нулями.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrevRank {
  rank: number;        // 1-based
  contextKey: string;  // groupId для клуба, weekId для HoF — diff не считаем при смене контекста
  ts: number;
}

export interface RankDelta {
  delta: number;                      // prev.rank - new.rank (положительный = поднялся)
  passedName: string | null;          // кого обогнал (тот, кто сейчас сразу за мной)
  lostToName: string | null;          // кому уступил (тот, кто сейчас сразу впереди меня)
}

const CLUB_PREV_RANK_KEY = 'club_rank_prev_v1';
const HOF_PREV_RANK_KEY  = 'hof_rank_prev_v1';

export const KEY_CLUB_PREV_RANK = CLUB_PREV_RANK_KEY;
export const KEY_HOF_PREV_RANK  = HOF_PREV_RANK_KEY;

export async function loadPrevRank(storageKey: string): Promise<PrevRank | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrevRank;
    if (
      typeof parsed?.rank !== 'number' ||
      typeof parsed?.contextKey !== 'string'
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function savePrevRank(storageKey: string, value: PrevRank): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(value));
  } catch {}
}

/**
 * Вычислить delta. Имена берём из ТЕКУЩЕГО списка — это эвристика
 * («тот, кто сейчас рядом» ≈ «тот, кого я обогнал/кому уступил»).
 *
 * delta == 0 → ничего не показывать.
 * prev == null или другой контекст (новый groupId/неделя) → не показывать
 *   (нет валидного сравнения).
 */
export function computeRankDelta(
  prev: PrevRank | null,
  newRank: number,
  newContextKey: string,
  /** имена в новом списке, отсортированные по убыванию очков (rank=1 → index 0) */
  sortedNames: string[],
): RankDelta | null {
  if (!prev) return null;
  if (prev.contextKey !== newContextKey) return null;
  const delta = prev.rank - newRank;
  if (delta === 0) return null;

  let passedName: string | null = null;
  let lostToName: string | null = null;

  if (delta > 0) {
    // Поднялся: «обогнал» — сейчас сразу за мной (newRank в 1-based → index newRank в массиве).
    passedName = sortedNames[newRank] ?? null;
  } else {
    // Опустился: «уступил» — сейчас сразу впереди меня (index newRank - 2).
    lostToName = sortedNames[newRank - 2] ?? null;
  }

  return { delta, passedName, lostToName };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
