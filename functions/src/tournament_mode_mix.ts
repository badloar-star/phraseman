// ═══════════════════════════════════════════════════════════════════════════
// tournament_mode_mix.ts — распределение типов заданий по раундам.
//
// зачем (владелец 2026-07-27): «возможность устанавливать проценты
// распределения типов заданий по раундам и по турнирам», ползунки связаны —
// двигаешь один, остальные подстраиваются, сумма всегда ровно 100%.
//
// Здесь чистая математика: нормализация долей, пересчёт связанных ползунков,
// раскладка процентов в конкретные слоты раунда. Ни сети, ни Firestore —
// покрывается тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════

import { TOURNAMENT_MODES, type TournamentMode } from './tournament_pool_plan';

/** Доли режимов в раунде: mode → проценты (целые, в сумме 100). */
export type ModeMix = Record<string, number>;

/** Микс на каждый из четырёх раундов. */
export type RoundMixConfig = {
  /** roundNo (1..4) → доли режимов. */
  rounds: Record<number, ModeMix>;
};

export const MIX_TOTAL = 100;
export const ROUND_NUMBERS = [1, 2, 3, 4] as const;

/**
 * Равные доли по всем режимам — состояние «владелец ничего не настраивал».
 *
 * зачем раздавать остаток по одному: 100/8 = 12.5, и если весь остаток (4%)
 * свалить в первый режим, он получит 16% против 12% у прочих — доли перестают
 * быть «равными», и первый в списке режим тихо доминирует в турнирах.
 */
export function defaultModeMix(modes: readonly string[] = TOURNAMENT_MODES): ModeMix {
  const share = Math.floor(MIX_TOTAL / modes.length);
  const mix: ModeMix = {};
  modes.forEach((mode) => { mix[mode] = share; });
  let remainder = MIX_TOTAL - share * modes.length;
  for (let i = 0; remainder > 0 && modes.length > 0; i += 1, remainder -= 1) {
    mix[modes[i % modes.length]] += 1;
  }
  return mix;
}

export function defaultRoundMix(): RoundMixConfig {
  const rounds: Record<number, ModeMix> = {};
  for (const roundNo of ROUND_NUMBERS) rounds[roundNo] = defaultModeMix();
  return { rounds };
}

/**
 * Приведение к валидному миксу: только известные режимы, целые неотрицательные
 * числа, сумма ровно 100.
 *
 * зачем: значения приходят с клиента (ползунки) и из базы (старые записи).
 * Кривая сумма тихо перекосила бы турниры, поэтому нормализуем всегда.
 */
export function normalizeModeMix(
  raw: unknown,
  modes: readonly string[] = TOURNAMENT_MODES,
): ModeMix {
  const source = (raw && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {};

  const cleaned: ModeMix = {};
  let sum = 0;
  for (const mode of modes) {
    const value = Math.max(0, Math.min(MIX_TOTAL, Math.round(Number(source[mode] ?? 0)) || 0));
    cleaned[mode] = value;
    sum += value;
  }

  if (sum === 0) return defaultModeMix(modes);
  if (sum === MIX_TOTAL) return cleaned;

  // Масштабируем к 100 и раздаём остаток самым крупным долям — так порядок
  // приоритетов владельца сохраняется, а сумма становится точной.
  const scaled: ModeMix = {};
  let scaledSum = 0;
  for (const mode of modes) {
    const value = Math.floor((cleaned[mode] * MIX_TOTAL) / sum);
    scaled[mode] = value;
    scaledSum += value;
  }
  let remainder = MIX_TOTAL - scaledSum;
  const byWeight = [...modes].sort((a, b) => cleaned[b] - cleaned[a]);
  let index = 0;
  while (remainder > 0 && byWeight.length > 0) {
    scaled[byWeight[index % byWeight.length]] += 1;
    remainder -= 1;
    index += 1;
  }
  return scaled;
}

export function normalizeRoundMix(raw: unknown): RoundMixConfig {
  const source = (raw && typeof raw === 'object' && !Array.isArray(raw))
    ? (raw as { rounds?: unknown }).rounds
    : null;
  const record = (source && typeof source === 'object' && !Array.isArray(source))
    ? source as Record<string, unknown>
    : {};
  const rounds: Record<number, ModeMix> = {};
  for (const roundNo of ROUND_NUMBERS) {
    rounds[roundNo] = normalizeModeMix(record[String(roundNo)]);
  }
  return { rounds };
}

/**
 * СВЯЗАННЫЕ ПОЛЗУНКИ: владелец двигает один режим — остальные подстраиваются,
 * сумма остаётся ровно 100.
 *
 * зачем именно так: разницу распределяем ПРОПОРЦИОНАЛЬНО текущим весам
 * остальных. Если тянуть поровну, режим с долей 1% ушёл бы в минус первым и
 * настройка «почти всё на сборку фразы» стала бы невозможной.
 */
export function adjustModeMix(
  current: ModeMix,
  changedMode: string,
  nextValue: number,
  modes: readonly string[] = TOURNAMENT_MODES,
): ModeMix {
  const target = Math.max(0, Math.min(MIX_TOTAL, Math.round(nextValue)));
  const others = modes.filter((mode) => mode !== changedMode);
  if (others.length === 0) return { [changedMode]: MIX_TOTAL };

  const rest = MIX_TOTAL - target;
  const othersSum = others.reduce((sum, mode) => sum + Math.max(0, current[mode] ?? 0), 0);

  const next: ModeMix = { [changedMode]: target };
  if (othersSum === 0) {
    // Все остальные были на нуле — раздаём поровну, иначе делить нечего.
    const share = Math.floor(rest / others.length);
    others.forEach((mode) => { next[mode] = share; });
    let remainder = rest - share * others.length;
    for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
      next[others[i % others.length]] += 1;
    }
    return next;
  }

  let assigned = 0;
  others.forEach((mode) => {
    const value = Math.floor(((current[mode] ?? 0) * rest) / othersSum);
    next[mode] = value;
    assigned += value;
  });
  // Остаток от округления — крупнейшим долям, чтобы сумма была ровно 100.
  let remainder = rest - assigned;
  const byWeight = [...others].sort((a, b) => (current[b] ?? 0) - (current[a] ?? 0));
  for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
    next[byWeight[i % byWeight.length]] += 1;
  }
  return next;
}

/**
 * Проценты → конкретные слоты раунда.
 *
 * зачем: раунд это N заданий, а не проценты. 50% при 6 заданиях = 3 слота.
 * Метод наибольших остатков (Хэйра): даёт ровно N слотов и уважает порядок
 * долей — режим с большей долей никогда не получит меньше слотов.
 */
export function mixToSlots(mix: ModeMix, taskCount: number): TournamentMode[] {
  const modes = TOURNAMENT_MODES.filter((mode) => (mix[mode] ?? 0) > 0);
  if (modes.length === 0 || taskCount <= 0) return [];

  const total = modes.reduce((sum, mode) => sum + (mix[mode] ?? 0), 0);
  if (total <= 0) return [];

  const exact = modes.map((mode) => ({
    mode,
    value: ((mix[mode] ?? 0) * taskCount) / total,
  }));
  const slots: TournamentMode[] = [];
  const floors = exact.map((entry) => ({ ...entry, floor: Math.floor(entry.value) }));
  floors.forEach((entry) => {
    for (let i = 0; i < entry.floor; i += 1) slots.push(entry.mode);
  });

  // Остаток мест — режимам с наибольшей дробной частью.
  let remainder = taskCount - slots.length;
  const byFraction = [...floors].sort((a, b) => (b.value - b.floor) - (a.value - a.floor));
  for (let i = 0; remainder > 0 && byFraction.length > 0; i += 1, remainder -= 1) {
    slots.push(byFraction[i % byFraction.length].mode);
  }
  return slots.slice(0, taskCount);
}

/** Микс задан вручную (не равные доли) — показываем это владельцу. */
export function isCustomMix(mix: ModeMix, modes: readonly string[] = TOURNAMENT_MODES): boolean {
  const base = defaultModeMix(modes);
  return modes.some((mode) => (mix[mode] ?? 0) !== base[mode]);
}
