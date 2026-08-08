"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQualityDepartment = runQualityDepartment;
const decision_1 = require("./decision");
const quality_source_reader_1 = require("./quality_source_reader");
/**
 * Департамент «Качество» — первый департамент Джарвиса (решение владельца
 * 2026-08-01). Читает error_reports/user_reports/app_errors, решает, есть ли
 * скачок жалоб/крашей, и если да — строит Decision. Департаменты не общаются
 * между собой: департамент только пишет решения, ничего никому не шлёт.
 */
/** Порог скачка: сколько репортов одной категории на одном экране за сутки
 * уже не укладывается в фоновый шум и заслуживает решения владельца. */
const CATEGORY_SCREEN_SPIKE_THRESHOLD = 15;
/**
 * Возвращает самую крупную комбинацию category×screen, но только если она
 * пересекает порог фонового шума. Без порога любое единичное «typo» на
 * «home» рождало бы решение — а это шум, а не сигнал.
 */
function findTopSpike(fetches) {
    let best = null;
    for (const fetch of fetches) {
        const counts = new Map();
        for (const row of fetch.rows) {
            const category = row.category ?? 'unknown';
            const screen = row.screen ?? 'unknown';
            const key = `${category}::${screen}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        for (const [key, count] of counts) {
            if (count < CATEGORY_SCREEN_SPIKE_THRESHOLD)
                continue;
            if (best && count <= best.count)
                continue;
            const [category, screen] = key.split('::');
            best = { category, screen, count };
        }
    }
    return best;
}
function buildFindingText(spike, fetches) {
    if (spike) {
        return `За последние сутки замечено ${spike.count} репортов категории "${spike.category}" на экране "${spike.screen}" — это выше обычного фона.`;
    }
    const total = fetches.reduce((sum, fetch) => sum + (0, quality_source_reader_1.aggregateQualityRows)(fetch.rows).totalCount, 0);
    return total > 0
        ? `За последние сутки поступило ${total} репортов, без явного скачка по одной категории или экрану.`
        : 'За последние сутки новых репортов о качестве не поступало.';
}
function runQualityDepartment(input) {
    const evidence = input.fetches.map((fetch) => (0, quality_source_reader_1.buildQualityEvidence)({
        sourceId: fetch.sourceId,
        state: fetch.state,
        truncated: fetch.truncated,
        droppedCount: fetch.droppedCount,
        rows: fetch.rows,
        observedAtMs: fetch.observedAtMs,
    }));
    const spike = findTopSpike(input.fetches);
    const anyTrustworthy = evidence.some((item) => item.trustworthy);
    // зачем: по расписанию департамент молчит, если нет ни скачка, ни владельческого
    // вопроса — иначе он писал бы решение каждые сутки просто потому, что запустился.
    const shouldDecide = input.trigger === 'owner_request' || Boolean(spike) || !anyTrustworthy;
    if (!shouldDecide)
        return { decisions: [] };
    const finding = buildFindingText(spike, input.fetches);
    const question = input.question ?? (spike
        ? `Растут ли жалобы категории "${spike.category}" на экране "${spike.screen}"?`
        : 'Есть ли аномалии в качестве за последние сутки?');
    const decision = (0, decision_1.buildDecision)({
        department: 'quality',
        mode: 'observe',
        trigger: input.trigger,
        question,
        finding,
        hypothesis: spike
            ? `Вероятная причина — недавнее изменение на экране "${spike.screen}", затрагивающее категорию "${spike.category}".`
            : 'Недостаточно данных для гипотезы.',
        options: spike
            ? [
                { title: 'Откатить последнее изменение на этом экране', cost: 1, risk: 'low' },
                { title: 'Точечно исправить причину без отката', cost: 5, risk: 'medium' },
            ]
            : [
                { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
                { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
            ],
        recommendation: spike ? 'Откатить последнее изменение на этом экране' : 'Продолжить наблюдение без вмешательства',
        risk: spike ? 'Откат может вернуть ранее исправленную проблему' : 'Пропустить начало скачка, если он появится позже',
        cost: spike ? 1 : 0,
        successMetric: spike
            ? `Число репортов категории "${spike.category}" на экране "${spike.screen}" возвращается к фоновому уровню`
            : 'Отсутствие новых скачков в следующем суточном снапшоте',
        rollback: 'Вернуть предыдущую сборку экрана',
        evidence,
        nowMs: input.nowMs,
    });
    return { decisions: [decision] };
}
//# sourceMappingURL=quality_department.js.map