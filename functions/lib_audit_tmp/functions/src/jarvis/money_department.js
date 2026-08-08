"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMoneyDepartment = runMoneyDepartment;
const decision_1 = require("./decision");
const money_source_reader_1 = require("./money_source_reader");
/**
 * Департамент «Деньги» — второй департамент Джарвиса (решение владельца
 * 2026-08-02). Читает revenuecat_premium_events/paywall_funnel, решает,
 * есть ли скачок возвратов, и если да — строит Decision.
 * Департаменты не общаются между собой: только пишут Decision в журнал.
 */
/** Минимум новых платящих в знаменателе — иначе один возврат на двух
 * покупателей даёт 50% и это не сигнал, а шум маленькой выборки. */
const MIN_NEW_PAYING_FOR_SIGNAL = 5;
/** Порог доли возвратов относительно новых платящих за сутки. */
const REFUND_RATE_SPIKE_THRESHOLD = 0.3;
function findRefundSpike(fetches) {
    const revenuecat = fetches.find((fetch) => fetch.sourceId === 'revenuecat_premium_events');
    if (!revenuecat)
        return null;
    const aggregate = (0, money_source_reader_1.aggregateMoneyRows)(revenuecat.rows);
    if (aggregate.newPaying < MIN_NEW_PAYING_FOR_SIGNAL)
        return null;
    const rate = aggregate.refunds / aggregate.newPaying;
    if (rate < REFUND_RATE_SPIKE_THRESHOLD)
        return null;
    return { refunds: aggregate.refunds, newPaying: aggregate.newPaying, rate };
}
function buildFindingText(spike, fetches) {
    if (spike) {
        const pct = Math.round(spike.rate * 100);
        return `За последние сутки ${spike.refunds} возвратов на ${spike.newPaying} новых платящих (${pct}%) — заметно выше обычного.`;
    }
    const revenuecat = fetches.find((fetch) => fetch.sourceId === 'revenuecat_premium_events');
    const aggregate = revenuecat ? (0, money_source_reader_1.aggregateMoneyRows)(revenuecat.rows) : null;
    return aggregate
        ? `За последние сутки ${aggregate.newPaying} новых платящих, ${aggregate.refunds} возвратов — без явного скачка.`
        : 'Недостаточно данных о новых платящих за последние сутки.';
}
function runMoneyDepartment(input) {
    const evidence = input.fetches.map((fetch) => (0, money_source_reader_1.buildMoneyEvidence)({
        sourceId: fetch.sourceId,
        state: fetch.state,
        truncated: fetch.truncated,
        droppedCount: fetch.droppedCount,
        rows: fetch.rows,
        observedAtMs: fetch.observedAtMs,
    }));
    const spike = findRefundSpike(input.fetches);
    const anyTrustworthy = evidence.some((item) => item.trustworthy);
    const shouldDecide = input.trigger === 'owner_request' || Boolean(spike) || !anyTrustworthy;
    if (!shouldDecide)
        return { decisions: [] };
    const finding = buildFindingText(spike, input.fetches);
    const question = input.question ?? (spike ? 'Растут ли возвраты относительно новых платящих?' : 'Есть ли аномалии в деньгах за последние сутки?');
    const decision = (0, decision_1.buildDecision)({
        department: 'money',
        mode: 'observe',
        trigger: input.trigger,
        question,
        finding,
        hypothesis: spike
            ? 'Вероятная причина — проблема с ценой, качеством подписки или недавним изменением paywall.'
            : 'Недостаточно данных для гипотезы.',
        options: spike
            ? [
                { title: 'Проверить недавние изменения paywall/цены', cost: 0, risk: 'low' },
                { title: 'Связаться с частью пользователей, оформивших возврат', cost: 2, risk: 'medium' },
            ]
            : [
                { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
                { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
            ],
        recommendation: spike ? 'Проверить недавние изменения paywall/цены' : 'Продолжить наблюдение без вмешательства',
        risk: spike ? 'Возврат вложений на выяснение причины, если скачок окажется шумом' : 'Пропустить начало скачка, если он появится позже',
        cost: spike ? 0 : 0,
        successMetric: spike ? 'Доля возвратов возвращается ниже порога в следующем суточном снапшоте' : 'Отсутствие новых скачков в следующем суточном снапшоте',
        rollback: 'Вернуть предыдущую цену/конфигурацию paywall',
        evidence,
        nowMs: input.nowMs,
    });
    return { decisions: [decision] };
}
//# sourceMappingURL=money_department.js.map