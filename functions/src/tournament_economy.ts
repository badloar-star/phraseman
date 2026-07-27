// ═══════════════════════════════════════════════════════════════════════════
// tournament_economy.ts — экономика турниров на жемчужинах (решение владельца
// 2026-07-26).
//
// зачем: раньше призы были ФИКСИРОВАННЫЕ и брались из воздуха (50/25/10), а
// вход шёл по билетам — отдельная сущность со своим экраном и источниками.
// Владелец заменил это на понятную схему: вход стоит жемчужины, все взносы
// собираются в банк турнира, тройка призёров делит его, часть капает в
// недельный банк. Билеты убираются полностью — одна валюта вместо двух.
//
// Модуль ЧИСТЫЙ: только арифметика, ни Firestore, ни сети. Деньги игроков —
// самое опасное место, поэтому каждая формула считается здесь и покрывается
// тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════

// ── Настройки (значения по умолчанию; админка может переопределить) ─────────

export type TournamentEconomyConfig = {
  /** Сколько жемчужин платит живой игрок за вход. */
  readonly entryGems: number;
  /**
   * Сколько «вносит» бот. Жемчужины бота — из казны игры, реальных денег он
   * не теряет: это способ держать приз достойным при малой явке.
   */
  readonly botEntryGems: number;
  /** Доля банка турнира, уходящая в недельный банк (0..1). */
  readonly weeklyBankRate: number;
  /** Доли призёров турнира, по местам 1-2-3. Сумма обязана быть 1. */
  readonly prizeShares: readonly [number, number, number];
  /** Доли призёров НЕДЕЛЬНОГО банка, по местам 1-2-3. */
  readonly weeklyShares: readonly [number, number, number];
};

export const DEFAULT_TOURNAMENT_ECONOMY: TournamentEconomyConfig = Object.freeze({
  entryGems: 3,
  botEntryGems: 3,
  weeklyBankRate: 0.2,
  prizeShares: Object.freeze([0.6, 0.25, 0.15]) as readonly [number, number, number],
  weeklyShares: Object.freeze([0.6, 0.25, 0.15]) as readonly [number, number, number],
});

/** Потолки — защита от опечатки в админке, которая разорит или обесценит игру. */
const MAX_ENTRY_GEMS = 100;
const MAX_WEEKLY_RATE = 0.5;

/**
 * Приводит настройки из Firestore к безопасным значениям.
 * Любое кривое поле откатывается к умолчанию, а не роняет турнир.
 */
export function normalizeTournamentEconomy(raw: unknown): TournamentEconomyConfig {
  const d = DEFAULT_TOURNAMENT_ECONOMY;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const data = raw as Record<string, unknown>;

  const intInRange = (value: unknown, fallback: number, min: number, max: number): number => {
    const parsed = Math.trunc(Number(value));
    return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
  };

  const shares = (value: unknown, fallback: readonly [number, number, number]): readonly [number, number, number] => {
    if (!Array.isArray(value) || value.length !== 3) return fallback;
    const parsed = value.map((share) => Number(share));
    if (parsed.some((share) => !Number.isFinite(share) || share < 0 || share > 1)) return fallback;
    const sum = parsed[0] + parsed[1] + parsed[2];
    // Допуск на округление; иначе призовой фонд «протекал» бы мимо игроков.
    if (Math.abs(sum - 1) > 0.001) return fallback;
    return [parsed[0], parsed[1], parsed[2]] as const;
  };

  const rate = Number(data.weeklyBankRate);
  return Object.freeze({
    entryGems: intInRange(data.entryGems, d.entryGems, 1, MAX_ENTRY_GEMS),
    botEntryGems: intInRange(data.botEntryGems, d.botEntryGems, 0, MAX_ENTRY_GEMS),
    weeklyBankRate: Number.isFinite(rate) && rate >= 0 && rate <= MAX_WEEKLY_RATE
      ? rate
      : d.weeklyBankRate,
    prizeShares: shares(data.prizeShares, d.prizeShares),
    weeklyShares: shares(data.weeklyShares, d.weeklyShares),
  });
}

// ── Банк турнира ────────────────────────────────────────────────────────────

export type TournamentPot = {
  /** Всё, что собрано со всех участников. */
  readonly total: number;
  /** Уходит в недельный банк. */
  readonly toWeeklyBank: number;
  /** Делится между тройкой призёров. */
  readonly toPrizes: number;
};

/**
 * Банк одного турнира.
 *
 * зачем: боты платят наравне с живыми (решение владельца) — иначе при явке
 * ровно 8 человек приз выглядел бы бедно, и турниры не набирали бы людей.
 */
// guard-ok: модуль СЕРВЕРНЫЙ и чистый — Math.max(0,..) здесь защита от
// отрицательных входных чисел, а не понижение баланса игрока. Балансы меняет
// только транзакция в tournaments.ts, клиент источником истины не является.
export function tournamentPot(
  realPlayers: number,
  botPlayers: number,
  config: TournamentEconomyConfig = DEFAULT_TOURNAMENT_ECONOMY,
): TournamentPot {
  const total = Math.max(0, Math.trunc(realPlayers)) * config.entryGems
    + Math.max(0, Math.trunc(botPlayers)) * config.botEntryGems;
  // Округляем вниз: остаток от округления остаётся в призах игрокам,
  // а не теряется и не создаётся из воздуха.
  const toWeeklyBank = Math.floor(total * config.weeklyBankRate);
  return Object.freeze({ total, toWeeklyBank, toPrizes: total - toWeeklyBank });
}

/**
 * Раздача суммы по долям без потери и без создания жемчужин.
 *
 * зачем: наивное round() по каждой доле даёт расхождение с исходной суммой —
 * игроки получили бы больше или меньше собранного. Здесь остаток от округления
 * отдаётся первому месту, а сумма выплат всегда равна входной ровно.
 */
export function splitByShares(
  amount: number,
  shares: readonly number[],
): readonly number[] {
  const total = Math.max(0, Math.trunc(amount));
  if (total === 0 || shares.length === 0) return shares.map(() => 0);

  const raw = shares.map((share) => Math.floor(total * share));
  const distributed = raw.reduce((sum, value) => sum + value, 0);
  const remainder = total - distributed;
  // Остаток — победителю: он и так забирает больше всех, дробить незачем.
  return raw.map((value, index) => (index === 0 ? value + remainder : value));
}

export type TournamentPayout = {
  readonly place: number;
  readonly gems: number;
};

/**
 * Выплаты призёрам турнира. Если призёров меньше трёх (мало живых игроков),
 * неразыгранные доли НЕ пропадают — они идут в недельный банк.
 */
export function tournamentPayouts(
  pot: TournamentPot,
  winnersCount: number,
  config: TournamentEconomyConfig = DEFAULT_TOURNAMENT_ECONOMY,
  // зачем 2026-07-27 (владелец): «если у одного 70 звёзд и у другого 70 — будут
  // возмущения, почему ему больше; пусть начисляется поровну», и «если все трое
  // одинаковы, то всё, что между ними, распределяется тоже поровну». Передаём
  // очки призёров по порядку мест — по ним склеиваем группы ничьих.
  winnerScores?: readonly number[],
): { readonly payouts: readonly TournamentPayout[]; readonly unclaimedToWeekly: number } {
  const winners = Math.max(0, Math.min(3, Math.trunc(winnersCount)));
  if (winners === 0) {
    return { payouts: Object.freeze([]), unclaimedToWeekly: pot.toPrizes };
  }

  const full = splitByShares(pot.toPrizes, [...config.prizeShares]);
  let payouts = full.slice(0, winners).map((gems, index) => ({ place: index + 1, gems }));

  // Ничьи: игроки с равными очками делят СУММУ своих долей поровну. Остаток от
  // деления отдаём верхнему в группе — жемчужины целые, потерять их нельзя.
  if (winnerScores && winnerScores.length >= winners) {
    const merged: TournamentPayout[] = [];
    for (let i = 0; i < winners;) {
      let j = i;
      while (j + 1 < winners && winnerScores[j + 1] === winnerScores[i]) j += 1;
      const groupSize = j - i + 1;
      if (groupSize === 1) {
        merged.push(payouts[i]);
      } else {
        const groupTotal = payouts.slice(i, j + 1).reduce((sum, p) => sum + p.gems, 0);
        const each = Math.floor(groupTotal / groupSize);
        const remainder = groupTotal - each * groupSize;
        for (let k = i; k <= j; k += 1) {
          merged.push({ place: payouts[k].place, gems: each + (k === i ? remainder : 0) });
        }
      }
      i = j + 1;
    }
    payouts = merged;
  }

  const claimed = payouts.reduce((sum, payout) => sum + payout.gems, 0);

  return {
    payouts: Object.freeze(payouts),
    unclaimedToWeekly: pot.toPrizes - claimed,
  };
}

// ── Недельный банк ──────────────────────────────────────────────────────────

export type WeeklyStanding = {
  readonly uid: string;
  /** Сумма очков за все турниры недели — критерий владельца. */
  readonly points: number;
};

export type WeeklyPayout = {
  readonly uid: string;
  readonly place: number;
  readonly gems: number;
};

/**
 * Раздача недельного банка тройке лучших по СУММЕ ОЧКОВ за неделю.
 *
 * зачем: владелец выбрал очки, а не число побед — так награждается и сила, и
 * регулярность: можно ни разу не выиграть, но стабильно быть в тройке.
 *
 * Ничьи разрешаются по uid, чтобы раздача была детерминированной: повторный
 * запуск крона не поменяет победителей и не выдаст награду дважды.
 */
export function weeklyBankPayouts(
  bankGems: number,
  standings: readonly WeeklyStanding[],
  config: TournamentEconomyConfig = DEFAULT_TOURNAMENT_ECONOMY,
): { readonly payouts: readonly WeeklyPayout[]; readonly carryOver: number } {
  const bank = Math.max(0, Math.trunc(bankGems));
  const eligible = standings
    .filter((entry) => entry.uid && entry.points > 0)
    .slice()
    .sort((a, b) => b.points - a.points || a.uid.localeCompare(b.uid))
    .slice(0, 3);

  if (bank === 0 || eligible.length === 0) {
    // Некому раздать — банк переносится на следующую неделю, а не сгорает.
    return { payouts: Object.freeze([]), carryOver: bank };
  }

  const full = splitByShares(bank, [...config.weeklyShares]);
  const payouts = eligible.map((entry, index) => ({
    uid: entry.uid,
    place: index + 1,
    gems: full[index] ?? 0,
  }));
  const claimed = payouts.reduce((sum, payout) => sum + payout.gems, 0);

  return { payouts: Object.freeze(payouts), carryOver: bank - claimed };
}
