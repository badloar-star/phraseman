"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_MERGE_STARS_SOURCE_KIND = exports.ACCOUNT_MERGE_STARS_MAX_CHUNKS = void 0;
exports.planAccountMergeStarsChunks = planAccountMergeStarsChunks;
exports.accountMergeStarsOpId = accountMergeStarsOpId;
exports.prepareAccountMergeStarsTransfer = prepareAccountMergeStarsTransfer;
exports.commitAccountMergeStarsTransfer = commitAccountMergeStarsTransfer;
const arena_v2_core_1 = require("./arena_v2_core");
const progress_events_1 = require("./progress_events");
const stars_ledger_1 = require("./stars_ledger");
/**
 * 8T (координатор 03.10): перенос монет проигравшего победителю при серверном
 * слиянии аккаунтов (functions/src/auth_merge.ts).
 *
 * зачем: слияние скрывало проигравшего (`identityHidden`), а `users/{loser}.stars`
 * оставалось на нём — монеты застревали на аккаунте, в который человек больше
 * никогда не попадёт. Перенос идёт В ТОЙ ЖЕ транзакции, что и скрытие:
 * - журнал разрешает один prepare на uid за попытку, а у нас два разных uid;
 * - prepare только читает и ставится до первой записи транзакции слияния;
 * - атомарность: нет окна «скрыт, а монеты ещё на нём» и нет «дебет без кредита».
 *
 * Семантика: проигравший — `account_merge_out` (spend), победитель —
 * `account_merge_in` (grant). earnedTotal/неделя/сезон победителя НЕ растут:
 * перенесённое не заработано заново и не двигает очки.
 *
 * Слияние НИКОГДА не падает из-за монет: любая неувязка журнала (несогласованный
 * баланс, чужая расписка под нашим opId) → перенос пропускается ЦЕЛИКОМ, монеты
 * остаются на проигравшем (не теряются), причина — в логе и в outbox.
 */
const LOG = '[ACCOUNT-MERGE-STARS]';
/**
 * Потолок частей в одной транзакции: 100 × 5000 = 500 000 монет, 200 расписок.
 * Вместе с линиями премиума (до 64 + удаления) держит транзакцию слияния под
 * лимитом Firestore в 500 записей. Остаток выше потолка остаётся на проигравшем
 * и пишется в outbox (`starsTransfer.remainder`) для ручного разбора.
 */
exports.ACCOUNT_MERGE_STARS_MAX_CHUNKS = 100;
exports.ACCOUNT_MERGE_STARS_SOURCE_KIND = 'account_merge';
const short = (uid) => uid.slice(0, 8);
function planAccountMergeStarsChunks(balance, maxChunks = exports.ACCOUNT_MERGE_STARS_MAX_CHUNKS) {
    let left = Number.isSafeInteger(balance) && balance > 0 ? balance : 0;
    const chunks = [];
    while (left > 0 && chunks.length < maxChunks) {
        const part = Math.min(stars_ledger_1.STAR_OP_MAX_ABS_DELTA, left);
        chunks.push(part);
        left -= part;
    }
    return { chunks, remainder: left };
}
/** Один и тот же opId у дебета и кредита: они живут в разных книгах users/{uid}/star_operations. */
function accountMergeStarsOpId(outboxId, index) {
    return `${exports.ACCOUNT_MERGE_STARS_SOURCE_KIND}:${outboxId}.${index}`;
}
function ledgerCtx(nowMs, authUid) {
    // Тот же производитель недели и сезона, что у practice_rune_grant: иначе
    // ленивый перенос недели/сезона в журнале обнулил бы счётчики победителя.
    return {
        nowMs,
        activeSeasonId: (0, arena_v2_core_1.arenaSeasonWindow)(nowMs).seasonId,
        weekKeyNow: (0, progress_events_1.getWeekKey)(new Date(nowMs).toISOString().slice(0, 10)),
        authUid,
        deviceId: null,
    };
}
function buildOps(input, chunks, side) {
    const counterpart = side === 'out' ? input.winnerStableId : input.loserStableId;
    return chunks.map((amount, index) => ({
        opId: accountMergeStarsOpId(input.outboxId, index),
        delta: side === 'out' ? -amount : amount,
        reason: side === 'out' ? 'account_merge_out' : 'account_merge_in',
        sourceKind: exports.ACCOUNT_MERGE_STARS_SOURCE_KIND,
        sourceId: input.outboxId,
        ruleVersion: 1,
        earnedAtMs: input.nowMs,
        meta: { chunk: index, chunks: chunks.length, counterpart: short(counterpart) },
    }));
}
function errorMessage(error) {
    return String(error?.message ?? error).slice(0, 120);
}
function skipped(reason, amount, chunks, remainder, nowMs) {
    return Object.freeze({
        record: Object.freeze({ status: 'skipped', reason, amount, chunks, remainder, atMs: nowMs }),
        loser: null,
        winner: null,
    });
}
/** Пары дебет/кредит обязаны совпасть по статусу частей — иначе это не перенос, а утечка. */
function outcomesPaired(loser, winner) {
    if (loser.length !== winner.length)
        return false;
    return loser.every((outcome, index) => {
        const other = winner[index];
        return Boolean(other)
            && outcome.status !== 'rejected'
            && other?.status === outcome.status
            && Math.abs(outcome.appliedDelta) === Math.abs(other.appliedDelta);
    });
}
/**
 * ФАЗА 1 — только чтения (расписки по opId на обеих сторонах). Вызывать до
 * первой записи транзакции слияния, ровно один раз за попытку транзакции.
 */
async function prepareAccountMergeStarsTransfer(tx, db, input) {
    const loserStars = (0, stars_ledger_1.normalizeStars)(input.loserSnap.data()?.stars);
    const plan = planAccountMergeStarsChunks(loserStars.balance);
    const amount = plan.chunks.reduce((total, part) => total + part, 0);
    const tag = `winner=${short(input.winnerStableId)} loser=${short(input.loserStableId)}`;
    console.log(`${LOG} start ${tag} loserBalance=${loserStars.balance} winnerBalance=${(0, stars_ledger_1.normalizeStars)(input.winnerSnap.data()?.stars).balance} chunks=${plan.chunks.length} remainder=${plan.remainder}`);
    if (plan.chunks.length === 0) {
        console.log(`${LOG} skip ${tag} reason=nothing_to_transfer loserBalance=${loserStars.balance}`);
        return Object.freeze({
            record: Object.freeze({
                status: 'nothing_to_transfer', amount: 0, chunks: 0, remainder: 0, atMs: input.nowMs,
            }),
            loser: null,
            winner: null,
        });
    }
    if (plan.remainder > 0) {
        console.error(`${LOG} over_cap ${tag} transferNow=${amount} remainder=${plan.remainder} maxChunks=${exports.ACCOUNT_MERGE_STARS_MAX_CHUNKS}`);
    }
    const ctx = ledgerCtx(input.nowMs, input.authUid);
    // Каждая сторона — отдельный try: несогласованный журнал (assertInvariant) не
    // должен ронять слияние. До commit ничего не записано, так что пропуск безопасен.
    let loser;
    try {
        loser = await (0, stars_ledger_1.prepareStarOperations)(tx, db, input.loserStableId, input.loserSnap, buildOps(input, plan.chunks, 'out'), ctx);
    }
    catch (error) {
        console.error(`${LOG} skip ${tag} reason=loser_prepare_failed message=${errorMessage(error)}`);
        return skipped('loser_prepare_failed', amount, plan.chunks.length, plan.remainder, input.nowMs);
    }
    let winner;
    try {
        winner = await (0, stars_ledger_1.prepareStarOperations)(tx, db, input.winnerStableId, input.winnerSnap, buildOps(input, plan.chunks, 'in'), ctx);
    }
    catch (error) {
        console.error(`${LOG} skip ${tag} reason=winner_prepare_failed message=${errorMessage(error)}`);
        return skipped('winner_prepare_failed', amount, plan.chunks.length, plan.remainder, input.nowMs);
    }
    const describe = (outcomes) => outcomes
        .map((o) => `${o.status}${o.errorCode ? `:${o.errorCode}` : ''}`).join(',');
    // зачем (I-1, координатор 03.10): повтор слияния той же пары с другим now даёт op_conflict на ВСЕХ
    // частях обеих сторон (earnedAtMs в расписке другой) — это повтор, ничего не пишется, монеты целы.
    // Не тревожный error, а warn с причиной; любая иная неувязка остаётся error.
    const allConflict = (outcomes) => outcomes.length > 0
        && outcomes.every((o) => o.status === 'rejected' && o.errorCode === 'op_conflict');
    if (allConflict(loser.outcomes) && allConflict(winner.outcomes)) {
        console.warn(`${LOG} skip ${tag} reason=outcome_mismatch replay_op_conflict (повтор, безопасно) chunks=${plan.chunks.length}`);
        return skipped('outcome_mismatch', amount, plan.chunks.length, plan.remainder, input.nowMs);
    }
    if (!outcomesPaired(loser.outcomes, winner.outcomes)) {
        console.error(`${LOG} skip ${tag} reason=outcome_mismatch loser=[${describe(loser.outcomes)}] winner=[${describe(winner.outcomes)}]`);
        return skipped('outcome_mismatch', amount, plan.chunks.length, plan.remainder, input.nowMs);
    }
    if (loser.outcomes.every((o) => o.status === 'already_applied')) {
        console.warn(`${LOG} skip ${tag} reason=already_applied chunks=${plan.chunks.length}`);
        return Object.freeze({
            record: Object.freeze({
                status: 'already_applied', amount, chunks: plan.chunks.length, remainder: plan.remainder, atMs: input.nowMs,
            }),
            loser: null,
            winner: null,
        });
    }
    console.log(`${LOG} prepared ${tag} amount=${amount} loserAfter=${loser.after.balance} winnerAfter=${winner.after.balance} outcomes=[${describe(winner.outcomes)}]`);
    return Object.freeze({
        record: Object.freeze({
            status: 'transferred', amount, chunks: plan.chunks.length, remainder: plan.remainder, atMs: input.nowMs,
        }),
        loser,
        winner,
    });
}
/**
 * ФАЗА 2 — только записи. Пишет `stars` и расписки обеих сторон; остальные поля
 * документов слияние пишет своими записями после этой.
 */
function commitAccountMergeStarsTransfer(tx, prepared) {
    if (!prepared.loser || !prepared.winner)
        return prepared.record;
    (0, stars_ledger_1.commitStarOperations)(tx, prepared.loser);
    (0, stars_ledger_1.commitStarOperations)(tx, prepared.winner);
    console.log(`${LOG} committed loser=${short(prepared.loser.stableUid)} winner=${short(prepared.winner.stableUid)} amount=${prepared.record.amount} chunks=${prepared.record.chunks}`);
    return prepared.record;
}
//# sourceMappingURL=auth_merge_stars_transfer.js.map