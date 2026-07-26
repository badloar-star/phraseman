"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_LEGACY_CREDITS_PER_TRANSACTION = exports.REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID = exports.REFERRAL_SPIN_LEDGER_VERSION = exports.REFERRAL_SPIN_LEDGER = void 0;
exports.shouldMigrateLegacyAggregate = shouldMigrateLegacyAggregate;
exports.referralCreditId = referralCreditId;
exports.legacyCreditId = legacyCreditId;
exports.buildAvailableCredit = buildAvailableCredit;
exports.buildLegacyCreditRows = buildLegacyCreditRows;
exports.reconcileLedgerRows = reconcileLedgerRows;
exports.reconcileLedgerRowsForClaim = reconcileLedgerRowsForClaim;
exports.ledgerRowFromData = ledgerRowFromData;
const node_crypto_1 = require("node:crypto");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
exports.REFERRAL_SPIN_LEDGER = 'referral_spin_credit_ledger';
exports.REFERRAL_SPIN_LEDGER_VERSION = 1;
exports.REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID = '_migration_v1';
/** Leaves transaction capacity for user, attribution, reward, receipt, and expiry writes. */
exports.MAX_LEGACY_CREDITS_PER_TRANSACTION = 350;
/**
 * Legacy aggregate migration is authorized only by durable server-owned
 * subcollection state. The client-writable user progress map is deliberately
 * absent from this decision so downgrading its compatibility version cannot
 * mint the same historical balance again.
 */
function shouldMigrateLegacyAggregate(input) {
    return !input.migrationMarkerExists && !input.anyLedgerDocumentExists;
}
function referralCreditId(attributionId) {
    const digest = (0, node_crypto_1.createHash)('sha256').update(String(attributionId)).digest('hex').slice(0, 40);
    return `referral_${digest}`;
}
function legacyCreditId(index) {
    return `legacy_${String(index + 1).padStart(6, '0')}`;
}
function buildAvailableCredit(input) {
    const earnedAtMs = Math.max(0, Math.floor(input.earnedAtMs));
    return {
        id: input.id,
        ownerStableId: input.ownerStableId,
        source: input.source,
        ...(input.attributionId ? { attributionId: input.attributionId } : {}),
        earnedAtMs,
        expiresAtMs: (0, referral_roulette_policy_1.creditExpiryMs)(earnedAtMs),
        status: 'available',
    };
}
function buildLegacyCreditRows(ownerStableId, aggregateCredits) {
    const count = Math.max(0, Math.floor(Number(aggregateCredits) || 0));
    if (count > exports.MAX_LEGACY_CREDITS_PER_TRANSACTION) {
        throw new Error('LEGACY_CREDIT_MIGRATION_TOO_LARGE');
    }
    return Array.from({ length: count }, (_, index) => buildAvailableCredit({
        id: legacyCreditId(index),
        ownerStableId,
        source: 'legacy_aggregate',
        earnedAtMs: referral_roulette_policy_1.REFERRAL_LEDGER_ROLLOUT_AT_MS,
    }));
}
function reconcileLedgerRows(rows, nowMs, policy) {
    const ordered = [...rows].sort((a, b) => a.earnedAtMs - b.earnedAtMs || a.id.localeCompare(b.id));
    const expiredIds = ordered
        .filter((row) => row.status === 'available' && row.expiresAtMs < nowMs)
        .map((row) => row.id);
    const valid = ordered.filter((row) => (row.status === 'available'
        && row.expiresAtMs >= nowMs
        && (0, referral_roulette_policy_1.canConsumeCreditSource)(policy.softEnabled, row.source)));
    return {
        expiredIds,
        oldestValid: valid[0],
        availableCount: valid.length,
        earliestExpiryMs: valid.reduce((earliest, row) => earliest === 0 ? row.expiresAtMs : Math.min(earliest, row.expiresAtMs), 0),
    };
}
/**
 * Claim reconciliation is computed from the durable ledger first, then the
 * credits created by this same transaction are added to the post-claim count.
 * This prevents an expired aggregate-cache value from surviving an award.
 */
function reconcileLedgerRowsForClaim(rows, nowMs, policy, awardedCount) {
    const reconciled = reconcileLedgerRows(rows, nowMs, policy);
    return {
        expiredIds: reconciled.expiredIds,
        availableCountAfterClaim: reconciled.availableCount + Math.max(0, Math.floor(awardedCount)),
        earliestExpiryMs: reconciled.earliestExpiryMs,
    };
}
function ledgerRowFromData(id, data) {
    if (!data)
        return null;
    const source = data.source;
    const status = data.status;
    if (source !== 'referral' && source !== 'legacy_aggregate' && source !== 'dev_grant')
        return null;
    if (status !== 'available' && status !== 'consumed' && status !== 'expired')
        return null;
    const earnedAtMs = Math.max(0, Math.floor(Number(data.earnedAtMs) || 0));
    const expiresAtMs = Math.max(0, Math.floor(Number(data.expiresAtMs) || 0));
    return {
        id,
        ownerStableId: String(data.ownerStableId ?? ''),
        source,
        ...(data.attributionId ? { attributionId: String(data.attributionId) } : {}),
        earnedAtMs,
        expiresAtMs,
        status,
        ...(data.consumedAtMs ? { consumedAtMs: Math.floor(Number(data.consumedAtMs)) } : {}),
        ...(data.spinRequestId ? { spinRequestId: String(data.spinRequestId) } : {}),
        ...(data.expiredAtMs ? { expiredAtMs: Math.floor(Number(data.expiredAtMs)) } : {}),
    };
}
//# sourceMappingURL=referral_spin_ledger.js.map