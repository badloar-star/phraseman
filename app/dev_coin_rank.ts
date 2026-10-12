/**
 * DEV-подмена ранга монеты для ПОКАЗА: `dev_state?coinRank=N` (0..19) / `coinRank=off`.
 *
 * зачем (координатор 12.10): у анонимного гостя ранг 0, а все диалоги каталога требуют ранг 1…6 («Откроется на ранге N») — Сверка не может войти ни в
 * один диалог и снять кадры внутри них. Подменяется ТОЛЬКО значение, которое возвращает хук useMyCoinRank (память процесса). Монеты, ранг в
 * хранилище и в облаке НЕ пишутся — ранг синхронизируемый (та же причина, по которой cards=* работают только на госте).
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда null, а установка отклоняется. Перезапуск приложения сбрасывает.
 * Лог: [DEV-STATE] coinRank override=N.
 */
import { IS_STORE_RELEASE } from './config';

const MAX_RANK = 19;
let override: number | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить (0..19) или снять (null). В стор-сборке — отказ с логом, значение не меняется. Возвращает true, если применено. */
export function setDevCoinRankOverride(rank: number | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] coinRank: отклонено — не dev-сборка', { rank }); // guard-ok: ранний выход логируется
    return false;
  }
  if (rank !== null && (!Number.isInteger(rank) || rank < 0 || rank > MAX_RANK)) {
    console.warn(`[DEV-STATE] coinRank: отклонено — ранг вне 0..${MAX_RANK}`, { rank }); // guard-ok: ранний выход логируется
    return false;
  }
  override = rank;
  console.log(rank === null ? '[DEV-STATE] coinRank override=off' : `[DEV-STATE] coinRank override=${rank} (только показ, монеты и ранг не пишутся)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Подменённый ранг или null. В стор-сборке всегда null. */
export function getDevCoinRankOverride(): number | null {
  return devAvailable() ? override : null;
}
