/**
 * Сдвиг ранга открытия диалогов «+1, потолок 19» — ТОЛЬКО для новых пользователей на клиенте (владелец 30.10, ответ 27 Codex,
 * решение координатора: «клиентский сдвиг только для новых по локальному признаку; сервер, shared-таблица, Firestore rules, старые
 * пользователи и старые клиенты не меняются; ранг 0 у новых — диалогов нет»).
 *
 * зачем: shared-таблица (shared/dialogue_v2_catalogue_index.ts и зеркало .js) и серверная авторизация остаются как есть — сервер разрешает
 * не меньше, чем клиент показывает новичку. Модуль лёгкий и без импортов (его читают чистые модули доступа). Состояние выставляет
 * hooks/use_rank_access (новый + флаг rank_gates_enabled). Лог: [RANK-GATE] dialogue_shift.
 */
export const DIALOGUE_RANK_SHIFT = 1;
export const DIALOGUE_RANK_SHIFT_CAP = 19;

let shiftActive = false;

export function setDialogueRankShiftActive(active: boolean): void {
  if (active === shiftActive) return;
  shiftActive = active;
  console.log('[RANK-GATE] dialogue_shift', JSON.stringify({ active })); // guard-ok: смена режима раз за запуск
}

export function isDialogueRankShiftActive(): boolean {
  return shiftActive;
}

/** min(19, ранг + 1) при активном сдвиге; иначе без изменений. Не-целое/вне 0..19 возвращается как есть (контракт сам отклонит). */
export function shiftDialogueRankRequired<T>(required: T, active: boolean = shiftActive): T | number {
  if (!active || typeof required !== 'number' || !Number.isSafeInteger(required) || required < 0 || required > DIALOGUE_RANK_SHIFT_CAP) return required;
  return Math.min(DIALOGUE_RANK_SHIFT_CAP, required + DIALOGUE_RANK_SHIFT);
}
