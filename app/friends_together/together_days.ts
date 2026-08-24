/**
 * «Вместе» — ядро дней дружбы. ЧИСТЫЕ функции, без побочных эффектов, без
 * AsyncStorage/сети/времени внутри (кроме дефолтного `Date.now()`-подобного
 * параметра, который всегда можно передать явно из теста).
 *
 * Формат `ActiveDays`: { anchor: 'YYYY-MM-DD', bits: '1101…' }.
 * bits[0] — сам день anchor, bits[i] — день (anchor − i дней). Окно ограничено
 * MAX_WINDOW_DAYS, чтобы строка не росла бесконечно (спецификация §4: cap 120 bits).
 *
 * Источник: docs/plans/2026-08-16-friends-together-implementation.ru.md §1, §2.1, §4.
 */
import { addLocalDays } from '../local_date';

export const MAX_WINDOW_DAYS = 120;

export type ActiveDays = Readonly<{
  anchor: string;
  bits: string;
}>;

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDayKey(key: unknown): key is string {
  return typeof key === 'string' && DAY_KEY_RE.test(key);
}

/** Разница в календарных днях (a − b), через тот же UTC-мс путь, что addLocalDays. */
function dayDiff(a: string, b: string): number | null {
  if (!isValidDayKey(a) || !isValidDayKey(b)) return null;
  const msA = Date.parse(`${a}T00:00:00.000Z`);
  const msB = Date.parse(`${b}T00:00:00.000Z`);
  if (!Number.isFinite(msA) || !Number.isFinite(msB)) return null;
  return Math.round((msA - msB) / 86_400_000);
}

/** Пустое состояние — используется как безопасный дефолт при отсутствии данных. */
export function emptyActiveDays(): ActiveDays {
  return { anchor: '', bits: '' };
}

/** Раскодировать в множество дат (Set<'YYYY-MM-DD'>), удобное для пересечений/OR. */
export function decodeActiveDays(state: ActiveDays | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!state || !isValidDayKey(state.anchor) || typeof state.bits !== 'string') return out;
  const bits = state.bits.slice(0, MAX_WINDOW_DAYS);
  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i] === '1') {
      out.add(addLocalDays(state.anchor, -i));
    }
  }
  return out;
}

/** Закодировать множество дат в ActiveDays относительно anchor (новейшая дата в set либо переданный anchor). */
export function encodeActiveDays(dates: Iterable<string>, anchorOverride?: string): ActiveDays {
  const valid = [...dates].filter(isValidDayKey);
  const anchor = isValidDayKey(anchorOverride)
    ? anchorOverride
    : valid.reduce((max, d) => (max === '' || d > max ? d : max), '');
  if (!anchor) return { anchor: '', bits: '' };

  const set = new Set(valid);
  let bits = '';
  for (let i = 0; i < MAX_WINDOW_DAYS; i += 1) {
    const dayKey = addLocalDays(anchor, -i);
    // Дата новее anchor не помещается в схему (index 0 = anchor); отбрасываем молча —
    // вызывающий обязан использовать markActiveDay для продвижения anchor вперёд.
    bits += set.has(dayKey) ? '1' : '0';
  }
  // Убираем хвостовые нули, чтобы строка не раздувалась зря.
  bits = bits.replace(/0+$/, '');
  return { anchor, bits };
}

/**
 * Отметить активный день. Если dayKey новее anchor — сдвигает anchor вперёд
 * (окно "едет" вместе с пользователем). Если dayKey старше окна — игнорируется
 * (данные за пределами MAX_WINDOW_DAYS не хранятся, это не баг, а осознанный cap).
 */
export function markActiveDay(state: ActiveDays | null | undefined, dayKey: string): ActiveDays {
  if (!isValidDayKey(dayKey)) return state && isValidDayKey(state.anchor) ? state : { anchor: '', bits: '' };
  const current = state && isValidDayKey(state.anchor) ? state : null;
  if (!current) {
    return { anchor: dayKey, bits: '1' };
  }

  const diff = dayDiff(dayKey, current.anchor); // dayKey − anchor
  if (diff === null) return current;

  if (diff === 0) {
    // Уже сегодняшний день отмечен — идемпотентно, бит 0 уже должен быть '1'.
    if (current.bits[0] === '1') return current;
    return { anchor: current.anchor, bits: `1${current.bits.slice(1)}` };
  }

  if (diff > 0) {
    // dayKey новее anchor — сдвигаем anchor вперёд на diff дней, старые биты уезжают
    // на index += diff. Если сдвиг выталкивает данные за MAX_WINDOW_DAYS — они молча
    // отбрасываются (окно cap).
    const shiftedBits = '1' + '0'.repeat(Math.max(0, diff - 1)) + current.bits;
    const trimmed = shiftedBits.slice(0, MAX_WINDOW_DAYS).replace(/0+$/, '');
    return { anchor: dayKey, bits: trimmed || '1' };
  }

  // diff < 0: dayKey старше anchor — попадает внутрь текущего окна, если индекс < MAX_WINDOW_DAYS.
  const index = -diff;
  if (index >= MAX_WINDOW_DAYS) return current; // за пределами окна — игнорируем
  const bits = current.bits.length > index
    ? current.bits
    : current.bits.padEnd(index + 1, '0');
  if (bits[index] === '1') return { anchor: current.anchor, bits };
  const nextBits = `${bits.slice(0, index)}1${bits.slice(index + 1)}`;
  return { anchor: current.anchor, bits: nextBits };
}

/** OR-мерж двух состояний (используется и локально между устройствами, и для пар друзей). */
export function mergeActiveDays(a: ActiveDays | null | undefined, b: ActiveDays | null | undefined): ActiveDays {
  const setA = decodeActiveDays(a);
  const setB = decodeActiveDays(b);
  const merged = new Set<string>([...setA, ...setB]);
  if (merged.size === 0) return { anchor: '', bits: '' };
  const anchorA = a && isValidDayKey(a.anchor) ? a.anchor : '';
  const anchorB = b && isValidDayKey(b.anchor) ? b.anchor : '';
  const anchor = anchorA && anchorB ? (anchorA > anchorB ? anchorA : anchorB) : (anchorA || anchorB);
  return encodeActiveDays(merged, anchor);
}

/** Есть ли общий день у двух состояний на конкретную дату. */
export function hasCommonDay(a: ActiveDays | null | undefined, b: ActiveDays | null | undefined, dayKey: string): boolean {
  if (!isValidDayKey(dayKey)) return false;
  const setA = decodeActiveDays(a);
  if (!setA.has(dayKey)) return false;
  const setB = decodeActiveDays(b);
  return setB.has(dayKey);
}

/**
 * Количество "дней вместе" — размер пересечения множеств дат + bonusDays
 * (реферальный бонус, пишется сервером в friend_pairs.bonusDays).
 */
export function daysTogether(a: ActiveDays | null | undefined, b: ActiveDays | null | undefined, bonusDays = 0): number {
  const setA = decodeActiveDays(a);
  const setB = decodeActiveDays(b);
  let common = 0;
  for (const d of setA) if (setB.has(d)) common += 1;
  const bonus = Number.isFinite(bonusDays) ? Math.max(0, Math.floor(bonusDays)) : 0;
  return common + bonus;
}

// ── Уровни дружбы ─────────────────────────────────────────────────────────
export const LEVEL_THRESHOLDS: readonly number[] = [0, 3, 10, 30, 100];
export const LEVEL_NAMES: readonly string[] = ['', 'Знакомые', 'Приятели', 'Друзья', 'Близкие', 'Лучшие'];
/** Бонус к опыту в общий день (в процентах), по уровню (индекс = level). */
export const BONUS_PERCENT_BY_LEVEL: readonly number[] = [0, 0, 5, 5, 10, 15];
/** Звёзды за взятие вехи уровня (индекс = level). */
export const STAR_REWARD_BY_LEVEL: readonly number[] = [0, 0, 5, 10, 20, 50];

/** Уровень дружбы 1..5 по числу дней вместе. */
export function levelForDays(days: number, thresholds: readonly number[] = LEVEL_THRESHOLDS): number {
  const d = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  let level = 1;
  for (let i = 1; i < thresholds.length; i += 1) {
    if (d >= thresholds[i]) level = i + 1;
  }
  return level;
}

/** Порог дней для СЛЕДУЮЩЕГО уровня; null — уже максимум (level 5, дальше некуда). */
export function nextThreshold(level: number, thresholds: readonly number[] = LEVEL_THRESHOLDS): number | null {
  const idx = Math.max(1, Math.min(thresholds.length, Math.floor(level)));
  if (idx >= thresholds.length) return null;
  return thresholds[idx];
}

/** Бонус к XP (%) за уровень дружбы; уровень 1 (Знакомые) бонуса не даёт. */
export function bonusPercentForLevel(level: number): number {
  const idx = Math.max(0, Math.min(BONUS_PERCENT_BY_LEVEL.length - 1, Math.floor(level)));
  return BONUS_PERCENT_BY_LEVEL[idx] ?? 0;
}

/** Звёзды за клейм вехи уровня. */
export function starRewardForLevel(level: number): number {
  const idx = Math.max(0, Math.min(STAR_REWARD_BY_LEVEL.length - 1, Math.floor(level)));
  return STAR_REWARD_BY_LEVEL[idx] ?? 0;
}

/** Сумма всех ещё не забранных звёзд при скачке через несколько уровней. */
export function starRewardForLevelRange(claimedLevel: number, targetLevel: number): number {
  const from = Math.max(1, Math.min(LEVEL_THRESHOLDS.length, Math.floor(claimedLevel) || 1));
  const to = Math.max(1, Math.min(LEVEL_THRESHOLDS.length, Math.floor(targetLevel) || 1));
  if (to <= from) return 0;
  let total = 0;
  for (let level = from + 1; level <= to; level += 1) total += starRewardForLevel(level);
  return total;
}

/** L3 «Друзья»+: целочисленная цена подарка на 25% ниже. */
export function friendGiftCostForLevel(baseCost: number, level: number): number {
  const cost = Number.isFinite(baseCost) ? Math.max(1, Math.floor(baseCost)) : 1;
  return level >= 3 ? Math.max(1, Math.floor(cost * 0.75)) : cost;
}

/* expo-router: не показываем как маршрут при авто-обнаружении файлов в app/ */
export default function __RouteShim() {
  return null;
}
