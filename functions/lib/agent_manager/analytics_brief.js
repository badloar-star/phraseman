"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAnalyticsDecisionBrief = buildAnalyticsDecisionBrief;
const contracts_1 = require("./contracts");
function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : 0; }
/** Builds an aggregate-only recommendation. It never receives or returns source rows. */
function buildAnalyticsDecisionBrief(input) {
    const partial = input.sourceCoverage.filter((source) => source.status !== 'ok' || source.truncated).length;
    const sentences = [
        `За период: репортов ${count(input.reports.total)}, открытых ${count(input.reports.open)}, критических ошибок ${count(input.appErrors.critical)} из ${count(input.appErrors.total)}.`,
        `Платежные сигналы: новых оплат ${count(input.revenue.newPaying)}, возвратов ${count(input.revenue.refunds)}, завершений воронки ${count(input.revenue.paywallPurchases)}.`,
        partial ? `Данные неполные: ${partial} источник(а) требуют проверки перед решением.` : 'Источники доступны без отмеченных ограничений.',
        'Это аналитическая рекомендация для ручной проверки; никаких изменений, отправок или публикаций не выполнено.',
    ];
    return (0, contracts_1.parseManagerTaskResult)({ summary: sentences.join(' '), outcome: 'needs_review' });
}
//# sourceMappingURL=analytics_brief.js.map