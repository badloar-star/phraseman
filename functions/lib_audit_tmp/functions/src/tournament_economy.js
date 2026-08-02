"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TOURNAMENT_ECONOMY = void 0;
exports.normalizeTournamentEconomy = normalizeTournamentEconomy;
exports.tournamentPot = tournamentPot;
exports.splitByShares = splitByShares;
exports.tournamentPayouts = tournamentPayouts;
exports.weeklyBankPayouts = weeklyBankPayouts;
exports.DEFAULT_TOURNAMENT_ECONOMY = Object.freeze({
    entryGems: 3,
    botEntryGems: 3,
    weeklyBankRate: 0.2,
    prizeShares: Object.freeze([0.6, 0.25, 0.15]),
    weeklyShares: Object.freeze([0.6, 0.25, 0.15]),
});
/** Потолки — защита от опечатки в админке, которая разорит или обесценит игру. */
const MAX_ENTRY_GEMS = 100;
const MAX_WEEKLY_RATE = 0.5;
/**
 * Приводит настройки из Firestore к безопасным значениям.
 * Любое кривое поле откатывается к умолчанию, а не роняет турнир.
 */
function normalizeTournamentEconomy(raw) {
    const d = exports.DEFAULT_TOURNAMENT_ECONOMY;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return d;
    const data = raw;
    const intInRange = (value, fallback, min, max) => {
        const parsed = Math.trunc(Number(value));
        return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
    };
    const shares = (value, fallback) => {
        if (!Array.isArray(value) || value.length !== 3)
            return fallback;
        const parsed = value.map((share) => Number(share));
        if (parsed.some((share) => !Number.isFinite(share) || share < 0 || share > 1))
            return fallback;
        const sum = parsed[0] + parsed[1] + parsed[2];
        // Допуск на округление; иначе призовой фонд «протекал» бы мимо игроков.
        if (Math.abs(sum - 1) > 0.001)
            return fallback;
        return [parsed[0], parsed[1], parsed[2]];
    };
    const rate = Number(data.weeklyBankRate);
    return Object.freeze({
        // зачем 2026-07-27 (владелец: «убрал требование на жемчужины»): нижняя
        // граница была 1, поэтому entryGems: 0 из админки молча откатывался на
        // умолчание 3 и вход всё равно требовал жемчужины. Ноль = бесплатный вход,
        // это законная настройка владельца, а не ошибка конфигурации.
        entryGems: intInRange(data.entryGems, d.entryGems, 0, MAX_ENTRY_GEMS),
        botEntryGems: intInRange(data.botEntryGems, d.botEntryGems, 0, MAX_ENTRY_GEMS),
        weeklyBankRate: Number.isFinite(rate) && rate >= 0 && rate <= MAX_WEEKLY_RATE
            ? rate
            : d.weeklyBankRate,
        prizeShares: shares(data.prizeShares, d.prizeShares),
        weeklyShares: shares(data.weeklyShares, d.weeklyShares),
    });
}
/**
 * Банк одного турнира.
 *
 * зачем: боты платят наравне с живыми (решение владельца) — иначе при явке
 * ровно 8 человек приз выглядел бы бедно, и турниры не набирали бы людей.
 */
// guard-ok: модуль СЕРВЕРНЫЙ и чистый — Math.max(0,..) здесь защита от
// отрицательных входных чисел, а не понижение баланса игрока. Балансы меняет
// только транзакция в tournaments.ts, клиент источником истины не является.
function tournamentPot(realPlayers, botPlayers, config = exports.DEFAULT_TOURNAMENT_ECONOMY) {
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
function splitByShares(amount, shares) {
    const total = Math.max(0, Math.trunc(amount));
    if (total === 0 || shares.length === 0)
        return shares.map(() => 0);
    const raw = shares.map((share) => Math.floor(total * share));
    const distributed = raw.reduce((sum, value) => sum + value, 0);
    const remainder = total - distributed;
    // Остаток — победителю: он и так забирает больше всех, дробить незачем.
    return raw.map((value, index) => (index === 0 ? value + remainder : value));
}
/**
 * Выплаты призёрам турнира. Если призёров меньше трёх (мало живых игроков),
 * неразыгранные доли НЕ пропадают — они идут в недельный банк.
 */
function tournamentPayouts(pot, winnersCount, config = exports.DEFAULT_TOURNAMENT_ECONOMY, 
// зачем 2026-07-27 (владелец): «если у одного 70 звёзд и у другого 70 — будут
// возмущения, почему ему больше; пусть начисляется поровну», и «если все трое
// одинаковы, то всё, что между ними, распределяется тоже поровну». Передаём
// очки призёров по порядку мест — по ним склеиваем группы ничьих.
winnerScores) {
    const winners = Math.max(0, Math.min(3, Math.trunc(winnersCount)));
    if (winners === 0) {
        return { payouts: Object.freeze([]), unclaimedToWeekly: pot.toPrizes };
    }
    const full = splitByShares(pot.toPrizes, [...config.prizeShares]);
    let payouts = full.slice(0, winners).map((gems, index) => ({ place: index + 1, gems }));
    // Ничьи: игроки с равными очками делят СУММУ своих долей поровну. Остаток от
    // деления отдаём верхнему в группе — жемчужины целые, потерять их нельзя.
    if (winnerScores && winnerScores.length >= winners) {
        const merged = [];
        for (let i = 0; i < winners;) {
            let j = i;
            while (j + 1 < winners && winnerScores[j + 1] === winnerScores[i])
                j += 1;
            const groupSize = j - i + 1;
            if (groupSize === 1) {
                merged.push(payouts[i]);
            }
            else {
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
/**
 * Раздача недельного банка тройке лучших по СУММЕ ОЧКОВ за неделю.
 *
 * зачем: владелец выбрал очки, а не число побед — так награждается и сила, и
 * регулярность: можно ни разу не выиграть, но стабильно быть в тройке.
 *
 * При ничьей доли занятых мест объединяются и делятся поровну. uid задаёт
 * только детерминированный порядок и получателя неделимой лишней жемчужины.
 */
function weeklyBankPayouts(bankGems, standings, config = exports.DEFAULT_TOURNAMENT_ECONOMY) {
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
    let payouts = eligible.map((entry, index) => ({
        uid: entry.uid,
        place: index + 1,
        gems: full[index] ?? 0,
    }));
    // Ничьи недели используют тот же принцип, что ничьи комнаты: доли занятых
    // мест складываются и делятся между игроками группы. uid задаёт только
    // устойчивый порядок для неизбежного остатка в одну жемчужину.
    const merged = [];
    for (let i = 0; i < payouts.length;) {
        let j = i;
        while (j + 1 < payouts.length && eligible[j + 1].points === eligible[i].points)
            j += 1;
        const groupSize = j - i + 1;
        const groupTotal = payouts.slice(i, j + 1).reduce((sum, payout) => sum + payout.gems, 0);
        const each = Math.floor(groupTotal / groupSize);
        const remainder = groupTotal - each * groupSize;
        for (let k = i; k <= j; k += 1) {
            merged.push({
                ...payouts[k],
                gems: each + (k === i ? remainder : 0),
            });
        }
        i = j + 1;
    }
    payouts = merged;
    const claimed = payouts.reduce((sum, payout) => sum + payout.gems, 0);
    return { payouts: Object.freeze(payouts), carryOver: bank - claimed };
}
//# sourceMappingURL=tournament_economy.js.map