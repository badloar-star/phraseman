"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_OUTBOX_BACKOFF_MS = exports.ARENA_OUTBOX_ENTRY_PREFIX = exports.ARENA_OUTBOX_INDEX_KEY = exports.ARENA_OUTBOX_TTL_MS = exports.ARENA_OUTBOX_MAX = exports.ARENA_OUTBOX_SCHEMA_VERSION = void 0;
exports.arenaOutboxClassify = arenaOutboxClassify;
exports.arenaOutboxNextAttemptAtMs = arenaOutboxNextAttemptAtMs;
exports.arenaOutboxExpired = arenaOutboxExpired;
exports.arenaOutboxDue = arenaOutboxDue;
exports.arenaOutboxAfterFailure = arenaOutboxAfterFailure;
exports.arenaOutboxEvict = arenaOutboxEvict;
exports.arenaOutboxEntryKey = arenaOutboxEntryKey;
exports.arenaOutboxMakeEntry = arenaOutboxMakeEntry;
exports.arenaOutboxHasGated = arenaOutboxHasGated;
/**
 * Очередь отложенной отправки результатов матча.
 *
 * Владелец (D-58): матч доигрывается оффлайн, результат уходит когда сеть
 * вернётся. Значит отчёт обязан пережить и потерю сети, и закрытие приложения,
 * и перезапуск.
 *
 * Хранение — ключ на отчёт плюс отдельный ключ-индекс. Никогда не один JSON-
 * массив: падение посреди записи испортило бы все очереди сразу, а не одну.
 *
 * Ключ идемпотентности — идентификатор матча. Клиентских ключей здесь нет
 * намеренно: они ломаются при восстановлении из резервной копии, а пара
 * «игрок + матч» уже уникальна и переживает всё.
 *
 * MMKV в проекте нет, поэтому запись асинхронная. Это не ослабляет гарантии:
 * снимок сохраняется на каждой границе задания, а потеря самого последнего
 * снимка означает ровно то же, что и холодный старт — незакрытое задание
 * закрывается просрочкой, звёзды за восстановленное время не начисляются.
 */
exports.ARENA_OUTBOX_SCHEMA_VERSION = 'arena-outbox.v2';
exports.ARENA_OUTBOX_MAX = 20;
/** Совпадает со сроком жизни документа матча: позже расчёт всё равно невозможен. */
exports.ARENA_OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
exports.ARENA_OUTBOX_INDEX_KEY = 'arena.outbox.v2.index';
exports.ARENA_OUTBOX_ENTRY_PREFIX = 'arena.outbox.v2.';
/**
 * Задержки повтора для временной ошибки. Дальше — раз в пять минут до
 * истечения срока матча.
 */
exports.ARENA_OUTBOX_BACKOFF_MS = Object.freeze([1000, 4000, 15000, 60000, 300000]);
/**
 * Классификация отказа. От неё зависит, тратится ли попытка.
 *
 * «Мёртв после пяти попыток» — примерно шесть минут: это выбросило бы
 * результат матча, сыгранного в самолёте. Поэтому попытки тратит только
 * настоящий отказ сервера.
 */
function arenaOutboxClassify(error) {
    const raw = typeof error === 'string' ? error : String(error?.message ?? error ?? '');
    const code = String(error?.code ?? '');
    const text = `${code} ${raw}`.toLowerCase();
    if (text.includes('arena_client_update_required'))
        return 'gated';
    if (text.includes('unavailable') || text.includes('network') || text.includes('offline')
        || text.includes('failed to fetch') || text.includes('timeout') || text.includes('econn')) {
        return 'offline';
    }
    if (text.includes('deadline-exceeded') || text.includes('internal') || text.includes('resource-exhausted')
        || text.includes('aborted') || text.includes('app check') || text.includes('appcheck')) {
        return 'transient';
    }
    return 'rejected';
}
function arenaOutboxNextAttemptAtMs(entry, failure, wallNowMs) {
    if (failure === 'offline')
        return wallNowMs;
    if (failure === 'gated')
        return wallNowMs + exports.ARENA_OUTBOX_BACKOFF_MS[exports.ARENA_OUTBOX_BACKOFF_MS.length - 1];
    if (failure === 'rejected')
        return wallNowMs;
    const index = Math.min(entry.attempts, exports.ARENA_OUTBOX_BACKOFF_MS.length - 1);
    const base = exports.ARENA_OUTBOX_BACKOFF_MS[index];
    // Дрожание: без него все клиенты, потерявшие сеть одновременно, вернутся
    // одной волной.
    return wallNowMs + base + Math.floor(Math.random() * Math.min(1000, base));
}
/** Пережил ли отчёт срок, после которого расчёт на сервере уже невозможен. */
function arenaOutboxExpired(entry, wallNowMs) {
    return wallNowMs - entry.enqueuedAtWallMs > exports.ARENA_OUTBOX_TTL_MS;
}
function arenaOutboxDue(entry, wallNowMs) {
    return wallNowMs >= entry.nextAttemptAtWallMs;
}
/**
 * Применяет исход попытки к записи. Возвращает `null`, если запись пора
 * выбросить.
 */
function arenaOutboxAfterFailure(entry, failure, wallNowMs) {
    if (failure === 'rejected')
        return null;
    if (arenaOutboxExpired(entry, wallNowMs))
        return null;
    return {
        ...entry,
        // Попытку тратит только отказ сервера — но он и так снимает запись выше.
        attempts: failure === 'transient' ? entry.attempts + 1 : entry.attempts,
        nextAttemptAtWallMs: arenaOutboxNextAttemptAtMs(entry, failure, wallNowMs),
        lastFailure: failure,
    };
}
/**
 * Какие записи вытеснить при переполнении. Выбрасывается САМАЯ СТАРАЯ: самая
 * новая — это матч, который игрок только что сыграл.
 */
function arenaOutboxEvict(entries, wallNowMs) {
    const alive = entries.filter((entry) => !arenaOutboxExpired(entry, wallNowMs));
    const expired = entries.filter((entry) => arenaOutboxExpired(entry, wallNowMs)).map((entry) => entry.matchId);
    if (alive.length <= exports.ARENA_OUTBOX_MAX)
        return { keep: alive, dropped: expired };
    const sorted = [...alive].sort((a, b) => a.enqueuedAtWallMs - b.enqueuedAtWallMs);
    const overflow = sorted.slice(0, alive.length - exports.ARENA_OUTBOX_MAX);
    const overflowIds = new Set(overflow.map((entry) => entry.matchId));
    return {
        keep: alive.filter((entry) => !overflowIds.has(entry.matchId)),
        dropped: [...expired, ...overflow.map((entry) => entry.matchId)],
    };
}
function arenaOutboxEntryKey(matchId) {
    return `${exports.ARENA_OUTBOX_ENTRY_PREFIX}${matchId}`;
}
function arenaOutboxMakeEntry(report, wallNowMs) {
    return {
        schemaVersion: exports.ARENA_OUTBOX_SCHEMA_VERSION,
        matchId: report.matchId,
        report,
        enqueuedAtWallMs: wallNowMs,
        attempts: 0,
        nextAttemptAtWallMs: wallNowMs,
        lastFailure: null,
    };
}
/** Есть ли отчёт, который ждёт обновления приложения — для видимой подсказки. */
function arenaOutboxHasGated(entries) {
    return entries.some((entry) => entry.lastFailure === 'gated');
}
