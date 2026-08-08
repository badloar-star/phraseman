"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONEY_REPORT_COLLECTIONS = void 0;
exports.aggregateMoneyRows = aggregateMoneyRows;
exports.buildMoneyEvidence = buildMoneyEvidence;
const decision_1 = require("./decision");
/**
 * Читатель источников департамента «Деньги».
 *
 * зачем: та же защита, что у «Качества» — план запрещает передавать модели
 * PII и лишние поля. eventType/periodType-классификация скопирована 1:1
 * с admin_daily_digest.ts:406-414 (уже проверенный боевой контракт), чтобы
 * не изобретать вторую версию правды о том, что считается "новым платящим".
 * productId и любые другие поля сюда не попадают — только счётчики.
 */
exports.MONEY_REPORT_COLLECTIONS = ['revenuecat_premium_events', 'paywall_funnel'];
function upper(value) {
    return (value ?? '').toUpperCase();
}
/**
 * Копия классификации admin_daily_digest.ts:406-414. Единственная версия
 * правды о том, что считается новым платящим/продлением/возвратом/пробным.
 */
function aggregateMoneyRows(rows) {
    let newPaying = 0;
    let renewals = 0;
    let refunds = 0;
    let trials = 0;
    for (const row of rows) {
        const event = upper(row.eventType);
        const period = upper(row.periodType);
        if (event === 'NON_RENEWING_PURCHASE' || (event === 'INITIAL_PURCHASE' && period !== 'TRIAL'))
            newPaying += 1;
        else if (event === 'RENEWAL')
            renewals += 1;
        else if (event === 'REFUND')
            refunds += 1;
        else if (event === 'INITIAL_PURCHASE' && period === 'TRIAL')
            trials += 1;
    }
    return Object.freeze({ totalCount: rows.length, newPaying, renewals, refunds, trials });
}
function buildMoneyEvidence(fetch) {
    const aggregate = aggregateMoneyRows(fetch.rows);
    return (0, decision_1.normalizeEvidence)({
        sourceId: fetch.sourceId,
        state: fetch.state,
        count: aggregate.totalCount,
        truncated: fetch.truncated,
        droppedCount: fetch.droppedCount,
        observedAtMs: fetch.observedAtMs,
        digest: JSON.stringify(aggregate),
    });
}
//# sourceMappingURL=money_source_reader.js.map