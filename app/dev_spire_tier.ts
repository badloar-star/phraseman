/**
 * DEV-подмена лиги башни Шпиля для ПОКАЗА: `dev_state?spireTier=N` (0..11) / `spireTier=off`.
 *
 * зачем (координатор 13.10, наряды башен): у гостя лиги нет (tier=null → Оникс прежнего вида), а Сверке нужны кадры всех 12 лиг
 * (spire-* по лигам). Подменяется ТОЛЬКО лига, по которой SpireTower выбирает наряд (память процесса): неделя, ступени, комната и
 * облако не трогаются. Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда null, установка отклоняется.
 * Перезапуск приложения сбрасывает. Лог: [DEV-STATE] spireTier override=N.
 */
import { IS_STORE_RELEASE } from './config';

const MAX_TIER = 11;
let override: number | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить лигу (0..11) или снять (null). В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevSpireTierOverride(tier: number | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] spireTier: отклонено — не dev-сборка', { tier }); // guard-ok: ранний выход логируется
    return false;
  }
  if (tier !== null && (!Number.isInteger(tier) || tier < 0 || tier > MAX_TIER)) {
    console.warn(`[DEV-STATE] spireTier: отклонено — лига вне 0..${MAX_TIER}`, { tier }); // guard-ok: ранний выход логируется
    return false;
  }
  override = tier;
  console.log(tier === null ? '[DEV-STATE] spireTier override=off' : `[DEV-STATE] spireTier override=${tier} (только наряд башни, неделя и комната не меняются)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Подменённая лига или null. В стор-сборке всегда null. */
export function getDevSpireTierOverride(): number | null {
  return devAvailable() ? override : null;
}
