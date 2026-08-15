"use strict";
/**
 * Клиентская проекция единого баланса звёзд.
 *
 * Владелец (D-05/D-06): звезда — одна общая валюта приложения. Пишет её ТОЛЬКО
 * сервер (`functions/src/stars_ledger.ts`), клиент исключительно читает.
 *
 * Функции ниже — байт-в-байт копии серверных проекций. Расхождение здесь
 * означает, что игрок видит одно число, а получает другое, поэтому есть тест
 * на паритет.
 *
 * ВАЖНО: читать `weekEarned`, `prevWeekEarned` и `seasonEarned` напрямую
 * запрещено. Устаревший счётчик выглядит как настоящее число, и именно такое
 * прямое чтение раздавало награды сезонного пропуска по счётчику ПРОШЛОГО
 * сезона. Только через проекции.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STARS_EXPLAINER_RU = exports.STARS_SCHEMA_VERSION = void 0;
exports.normalizeStarsView = normalizeStarsView;
exports.starsSpendable = starsSpendable;
exports.starsEarnedAllTime = starsEarnedAllTime;
exports.starsWeekEarned = starsWeekEarned;
exports.starsSeasonEarned = starsSeasonEarned;
exports.STARS_SCHEMA_VERSION = 'stars.v1';
function int(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}
function normalizeStarsView(raw) {
    const data = (raw ?? {});
    return {
        schemaVersion: typeof data.schemaVersion === 'string' ? data.schemaVersion : exports.STARS_SCHEMA_VERSION,
        balance: int(data.balance),
        earnedTotal: int(data.earnedTotal),
        grantedTotal: int(data.grantedTotal),
        spentTotal: int(data.spentTotal),
        weekKey: typeof data.weekKey === 'string' ? data.weekKey : '',
        weekEarned: int(data.weekEarned),
        prevWeekKey: typeof data.prevWeekKey === 'string' ? data.prevWeekKey : '',
        prevWeekEarned: int(data.prevWeekEarned),
        seasonId: typeof data.seasonId === 'string' ? data.seasonId : '',
        seasonEarned: int(data.seasonEarned),
        seq: int(data.seq),
        updatedAtMs: int(data.updatedAtMs),
    };
}
/** Тратимый баланс. */
function starsSpendable(stars) {
    return Math.max(0, stars?.balance ?? 0);
}
/**
 * D-10: заработано за всё время. Не уменьшается при тратах — именно это число
 * открывает награды.
 */
function starsEarnedAllTime(stars) {
    return Math.max(0, stars?.earnedTotal ?? 0);
}
/** D-11: заработано за указанную неделю. Устаревшая неделя честно даёт ноль. */
function starsWeekEarned(stars, weekKeyNow) {
    if (!stars)
        return 0;
    if (stars.weekKey === weekKeyNow)
        return Math.max(0, stars.weekEarned);
    if (stars.prevWeekKey === weekKeyNow)
        return Math.max(0, stars.prevWeekEarned);
    return 0;
}
/** D-09: заработано за активный сезон. Чужой сезон даёт ноль. */
function starsSeasonEarned(stars, activeSeasonId) {
    if (!stars || stars.seasonId !== activeSeasonId)
        return 0;
    return Math.max(0, stars.seasonEarned);
}
/**
 * D-10 требует, чтобы игрок понимал разницу между тратимым балансом и
 * счётчиком, открывающим награды. Текст короткий намеренно: длинное объяснение
 * в интерфейсе никто не читает.
 */
exports.STARS_EXPLAINER_RU = Object.freeze({
    title: 'Две цифры про звёзды',
    body: 'Сверху — сколько звёзд можно потратить сейчас. Награды открываются по другому счётчику: он считает всё заработанное за всё время и от трат не уменьшается.',
});
