"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDirectorDigestNarrativePrompt = buildDirectorDigestNarrativePrompt;
exports.parseDirectorDigestNarrative = parseDirectorDigestNarrative;
const PROMPT_VERSION = 4;
const MAX_TEXT_LENGTH = 600;
const MAX_SUMMARY_LENGTH = 1000;
const MAX_MONOLOGUE_LENGTH = 8000;
const METRIC_LABELS = Object.freeze({
    'paywall.shown.v1': 'Показы предложения Plus',
    'paywall.cta_click.v1': 'Нажатия основной кнопки предложения Plus',
    'paywall.trial_started.v1': 'Сигналы начала пробного периода',
    'paywall.purchase_completed.v1': 'Сигналы завершения покупки',
    'paywall.purchase_failed.v1': 'Ошибки покупки',
    'paywall.purchase_cancelled.v1': 'Отмены покупки',
    'paywall.restore_completed.v1': 'Завершённые восстановления покупки',
    'paywall.close.v1': 'Закрытия предложения Plus',
    'store.confirmed_trial_start.v1': 'Подтверждённые начала пробного периода',
    'store.initial_purchase.v1': 'Первичные покупки',
    'store.non_renewing_purchase.v1': 'Разовые покупки',
    'store.renewal.v1': 'Продления Plus',
    'store.refund.v1': 'Возвраты',
    'store.billing_issue.v1': 'Проблемы оплаты',
    'store.expiration.v1': 'Истечения доступа',
    'store.cancellation.v1': 'Отмены продления',
    'store.uncancellation.v1': 'Отмены отключения продления',
    'store.product_change.v1': 'Изменения продукта',
    'store.subscription_extended.v1': 'Продления срока доступа',
    'revenue.gross_usd_micros.v1': 'Валовая сумма, USD micros',
});
const SOURCE_LABELS = Object.freeze({
    paywall: 'Воронка предложения Plus',
    premium_event_time: 'События подписки по времени события',
    premium_created_at: 'События подписки по времени записи',
});
const SYSTEM_PROMPT = [
    'Ты — старший продуктовый и операционный аналитик Phraseman.',
    'На входе только серверные агрегаты за текущий и предыдущий равный UTC-период.',
    'Никогда не называй partial, unavailable или null точным нулём.',
    'Не придумывай пользователей, причины, тексты отзывов, деньги, конверсию или причинные связи.',
    'Корреляция не доказывает причину: любую возможную причину явно называй гипотезой.',
    'Product Manager — главный раздел: до 5 сильнейших сигналов с metricIds только из входа.',
    'Не возвращай fact или comparison: сервер восстановит их из metricIds.',
    'Верни только валидный JSON без Markdown, по-русски.',
    'Схема: {"executiveSummary":string,"productManager":[{"title":string,"metricIds":string[],"whyItMatters":string,"hypothesis":string,"action":string,"successMetric":string,"confidence":"high|medium|low"}],"growthAndRevenue":string[],"qualityAndRisks":string[],"userVoice":string[],"actions":[{"priority":number,"action":string,"reason":string,"successMetric":string}],"sourceWarnings":string[]}.',
].join('\n');
const DIRECTOR_VOICE_PROMPT = [
    'You are the senior Product Manager and operating partner speaking directly to the owner of Phraseman.',
    'The primary output is ownerMonologue: one continuous monologue in natural, confident Russian, as a brilliant human manager explaining the business to the owner.',
    'The ownerMonologue is displayed in one block and read aloud verbatim. It must feel like a thoughtful private briefing, not a dashboard, template, report form, or collection of cards.',
    'Do not use headings, labels, bullet points, numbered lists, or field names inside ownerMonologue. Never say "Факт:", "Сравнение:", "Гипотеза:", "Действие:", "Успех:", or mechanically announce sections.',
    'Create a flowing story: open with what matters most, connect product behavior to business consequences, weave in only decisive statistics, distinguish certainty from possible explanations in ordinary speech, and finish with a clear recommendation and what you will watch next.',
    'Use elegant transitions and varied sentence rhythm. Speak directly, warmly, and intelligently, as a product leader who knows the business and respects the owner’s time.',
    'When the available evidence supports it, make ownerMonologue substantial. When evidence is sparse, be shorter rather than inventing detail or padding the text.',
    'Do not repeat the same fact across executiveSummary, productManager, growthAndRevenue, qualityAndRisks, userVoice, or actions. Each new section must add meaning.',
    'Use numbers only when they change a decision. Never dump the metric table, IDs, source names, timestamps, units, raw event names, JSON, URLs, or internal field names into the narrative.',
    'The structured fields after ownerMonologue are internal evidence for plans and audits. Keep them concise; do not copy their labels or list structure into ownerMonologue.',
    'Separate confirmed facts from interpretation. Never claim causality from correlation. Never invent users, emails, reviews, revenue, competitors, laws, or external research that are not in the input.',
    'If data is partial or unavailable, say so plainly and explain the decision limitation; never turn missing data into zero.',
    'Avoid filler, repetition, jargon, motivational clichés, theatrical exaggeration, and robotic headings. Return only valid JSON in Russian, without Markdown.',
    'Schema: {"ownerMonologue":string,"executiveSummary":string,"productManager":[{"title":string,"metricIds":string[],"whyItMatters":string,"hypothesis":string,"action":string,"successMetric":string,"confidence":"high|medium|low"}],"growthAndRevenue":string[],"qualityAndRisks":string[],"userVoice":string[],"actions":[{"priority":number,"action":string,"reason":string,"successMetric":string}],"sourceWarnings":string[]}.',
].join('\n');
function finiteInteger(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}
function sanitizeText(value, max = MAX_TEXT_LENGTH) {
    if (typeof value !== 'string')
        return '';
    return value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
        .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}
function safeStringArray(value, maxItems = 12) {
    if (!Array.isArray(value))
        return Object.freeze([]);
    return Object.freeze(value
        .map((item) => sanitizeText(item))
        .filter(Boolean)
        .slice(0, maxItems));
}
function normalizedNumberToken(value) {
    return String(value).replace(',', '.');
}
function validatedOwnerMonologue(value, input) {
    if (typeof value !== 'string')
        return '';
    if (/https?:\/\/|www\./i.test(value)
        || /[`<>{}\[\]]/.test(value)
        || /\b(?:paywall|store|revenue)\.[a-z0-9_.-]+\b/i.test(value)
        || /(?:Факт|Сравнение|Гипотеза|Действие|Успех|Fact|Comparison|Hypothesis|Action|Success)\s*:/i.test(value))
        return '';
    const allowedNumbers = new Set([normalizedNumberToken(input.rangeDays)]);
    input.metrics.forEach((metric) => {
        [metric.current, metric.previous, metric.absoluteDelta, metric.percentDelta].forEach((number) => {
            if (typeof number === 'number' && Number.isFinite(number)) {
                allowedNumbers.add(normalizedNumberToken(number));
                allowedNumbers.add(normalizedNumberToken(Math.abs(number)));
            }
        });
    });
    const numberTokens = value.match(/\d+(?:[.,]\d+)?/g) ?? [];
    if (numberTokens.some((token) => !allowedNumbers.has(token.replace(',', '.'))))
        return '';
    return sanitizeText(value, MAX_MONOLOGUE_LENGTH);
}
function metricLabel(metric) {
    return METRIC_LABELS[metric.id] ?? 'Агрегированный показатель';
}
function metricFact(metric) {
    const label = metricLabel(metric);
    if (metric.availability === 'unavailable' || metric.current === null) {
        return `${label}: данные недоступны`;
    }
    return `${label}: ${metric.availability === 'partial' ? 'неполные данные, ' : ''}${metric.current}`;
}
function metricComparison(metric) {
    const label = metricLabel(metric);
    if (metric.availability === 'unavailable'
        || metric.current === null
        || metric.previous === null)
        return `${label}: сравнение недоступно`;
    const partial = metric.availability === 'partial' ? 'неполные данные; ' : '';
    if (metric.direction === 'new') {
        return `${label}: ${partial}новый сигнал, в предыдущем периоде 0`;
    }
    if (metric.absoluteDelta === 0) {
        return `${label}: ${partial}без изменений, было ${metric.previous}`;
    }
    if (metric.absoluteDelta === null)
        return `${label}: сравнение недоступно`;
    const percent = metric.percentDelta === null ? '' : ` (${Math.abs(metric.percentDelta)}%)`;
    return `${label}: ${partial}было ${metric.previous}, ${metric.absoluteDelta > 0 ? 'рост' : 'снижение'} на ${Math.abs(metric.absoluteDelta)}${percent}`;
}
function deterministicSourceWarnings(input) {
    const warnings = input.sourceHealth.flatMap((source) => {
        const label = SOURCE_LABELS[source.source];
        if (source.state === 'error' || source.state === 'unavailable') {
            return [`${label}: данные недоступны.`];
        }
        if (source.state === 'partial' || source.truncated) {
            return [`${label}: данные неполные.`];
        }
        if (source.freshness === 'stale_event_watermark') {
            return [`${label}: последние данные устарели.`];
        }
        return [];
    });
    return Object.freeze([...new Set(warnings)]);
}
function metricWhyItMatters(metric) {
    if (metric.id.startsWith('paywall.')) {
        return 'Показатель описывает агрегированное поведение в воронке Plus и помогает определить шаг для следующей проверки.';
    }
    if (metric.id === 'revenue.gross_usd_micros.v1') {
        return 'Показатель отражает только сохранённую валовую сумму и не заменяет расчёт чистой выручки.';
    }
    return 'Показатель отражает подтверждённые агрегированные события магазина и влияет на оценку доступа и денег.';
}
function metricHypothesis(metric) {
    if (metric.availability === 'partial' || metric.availability === 'unavailable') {
        return 'Гипотеза: пробел связан с неполнотой или задержкой источника; это нужно проверить до продуктового вывода.';
    }
    if (metric.current === null || metric.previous === null) {
        return 'Гипотеза: сравнение ограничено отсутствующим значением одного из периодов; причинный вывод делать нельзя.';
    }
    if (metric.direction === 'up' || metric.direction === 'new') {
        return 'Гипотеза: изменение может быть связано с продуктовым трафиком, конфигурацией предложения или поведением пользователей; агрегаты не доказывают причину.';
    }
    if (metric.direction === 'down') {
        return 'Гипотеза: снижение может быть связано с трафиком, конфигурацией предложения или поведением пользователей; агрегаты не доказывают причину.';
    }
    return 'Гипотеза: стабильность агрегата может скрывать противоположные изменения на соседних шагах; это требует отдельной проверки.';
}
function metricAction(metric) {
    const label = metricLabel(metric);
    if (metric.availability === 'partial'
        || metric.availability === 'unavailable'
        || metric.current === null
        || metric.previous === null) {
        return `Проверить полноту источника и покрытие обоих периодов для показателя «${label}».`;
    }
    if (metric.id.startsWith('paywall.')) {
        return `Сопоставить «${label}» с соседними агрегированными шагами воронки Plus и журналом изменений конфигурации.`;
    }
    return `Сверить «${label}» с соседними агрегированными событиями магазина и журналом изменений интеграции.`;
}
function metricSuccessMetric(metric) {
    if (metric.availability === 'partial'
        || metric.availability === 'unavailable'
        || metric.current === null
        || metric.previous === null) {
        return `${metric.id}: availability=ready и оба периода содержат известные значения.`;
    }
    return `${metric.id}: изменение подтверждено или объяснено повторной агрегированной проверкой.`;
}
function metricConfidence(metric) {
    return metric.availability === 'ready'
        && metric.current !== null
        && metric.previous !== null
        ? 'medium'
        : 'low';
}
function deterministicProductManager(input) {
    const rankedMetrics = input.metrics
        .map((metric, index) => ({
        metric,
        index,
        rank: metric.current !== null
            && metric.previous !== null
            && metric.absoluteDelta !== null
            && metric.absoluteDelta !== 0
            && metric.availability !== 'unavailable'
            ? 0
            : metric.availability === 'partial'
                || metric.availability === 'unavailable'
                || metric.current === null
                || metric.previous === null
                ? 1
                : 2,
    }))
        .sort((left, right) => left.rank - right.rank || left.index - right.index)
        .slice(0, 5);
    return Object.freeze(rankedMetrics.map(({ metric }) => Object.freeze({
        title: metricLabel(metric),
        metricIds: Object.freeze([metric.id]),
        sourceIds: Object.freeze([metric.source]),
        fact: metricFact(metric),
        comparison: metricComparison(metric),
        whyItMatters: metricWhyItMatters(metric),
        hypothesis: metricHypothesis(metric),
        action: metricAction(metric),
        successMetric: metricSuccessMetric(metric),
        confidence: metricConfidence(metric),
    })));
}
function deterministicMetricStatements(metrics, fallback) {
    if (metrics.length === 0)
        return Object.freeze([fallback]);
    return Object.freeze(metrics.slice(0, 5).map((metric) => `${metricFact(metric)}; ${metricComparison(metric)}.`));
}
function safePromptMetric(metric) {
    return Object.freeze({
        id: metric.id,
        label: metricLabel(metric),
        source: metric.source,
        unit: metric.unit,
        availability: metric.availability,
        current: finiteInteger(metric.current),
        previous: finiteInteger(metric.previous),
        absoluteDelta: finiteInteger(metric.absoluteDelta),
        percentDelta: typeof metric.percentDelta === 'number' && Number.isFinite(metric.percentDelta)
            ? metric.percentDelta
            : null,
        direction: metric.direction,
    });
}
function buildDirectorDigestNarrativePrompt(input) {
    const payload = {
        promptVersion: PROMPT_VERSION,
        dataPolicy: 'Только агрегированные показатели; сырые события и персональные данные отсутствуют.',
        generatedAtMs: finiteInteger(input.generatedAtMs),
        rangeDays: input.rangeDays,
        state: input.state,
        period: {
            startMs: finiteInteger(input.period.startMs),
            endExclusiveMs: finiteInteger(input.period.endExclusiveMs),
        },
        previousPeriod: {
            startMs: finiteInteger(input.previousPeriod.startMs),
            endExclusiveMs: finiteInteger(input.previousPeriod.endExclusiveMs),
        },
        metrics: input.metrics.map(safePromptMetric),
        sourceHealth: input.sourceHealth.map((source) => ({
            source: source.source,
            state: source.state,
            truncated: source.truncated === true,
            freshness: source.freshness,
        })),
        deterministicSourceWarnings: deterministicSourceWarnings(input),
        requiredOutput: {
            ownerMonologue: 'one continuous natural Russian monologue without headings, labels, bullets, or repeated facts',
            executiveSummary: 'string',
            productManager: [{
                    title: 'string',
                    metricIds: ['known_metric_id_from_metrics'],
                    whyItMatters: 'string',
                    hypothesis: 'string',
                    action: 'string',
                    successMetric: 'string',
                    confidence: 'high|medium|low',
                }],
            growthAndRevenue: ['string'],
            qualityAndRisks: ['string'],
            userVoice: ['string'],
            actions: [{
                    priority: 1,
                    action: 'string',
                    reason: 'string',
                    successMetric: 'string',
                }],
            sourceWarnings: ['string'],
        },
    };
    return Object.freeze({
        promptVersion: PROMPT_VERSION,
        system: DIRECTOR_VOICE_PROMPT,
        user: JSON.stringify(payload, null, 2),
    });
}
function deterministicNarrative(input) {
    const changed = input.metrics.filter((metric) => (metric.current !== null
        && metric.previous !== null
        && metric.absoluteDelta !== null
        && metric.absoluteDelta !== 0
        && metric.availability !== 'unavailable')).slice(0, 5);
    const known = input.metrics.filter((metric) => (metric.current !== null && metric.availability !== 'unavailable')).slice(0, 5);
    const summaryMetrics = changed.length > 0 ? changed : known;
    const executiveSummary = summaryMetrics.length > 0
        ? summaryMetrics.map((metric) => (metric.previous === null
            ? metricFact(metric)
            : `${metricFact(metric)} (${metricComparison(metric)})`)).join('; ')
        : 'Данных по агрегированным показателям недостаточно для сравнения периодов.';
    const productManager = deterministicProductManager(input);
    const growthAndRevenue = deterministicMetricStatements(input.metrics.filter((metric) => (metric.id.startsWith('store.')
        || metric.id.startsWith('revenue.')
        || metric.id === 'paywall.trial_started.v1'
        || metric.id === 'paywall.purchase_completed.v1')), 'Данных по агрегированным показателям роста и денег недостаточно для вывода.');
    const qualityAndRisks = deterministicMetricStatements(input.metrics.filter((metric) => (metric.id === 'paywall.purchase_failed.v1'
        || metric.id === 'paywall.purchase_cancelled.v1'
        || metric.id === 'store.refund.v1'
        || metric.id === 'store.billing_issue.v1'
        || metric.id === 'store.expiration.v1'
        || metric.id === 'store.cancellation.v1')), 'Данных по агрегированным показателям качества и рисков недостаточно для вывода.');
    const behavioralMetrics = input.metrics.filter((metric) => metric.id.startsWith('paywall.'));
    const userVoice = behavioralMetrics.length > 0
        ? Object.freeze(behavioralMetrics.slice(0, 5).map((metric) => `Агрегированный сигнал поведения: ${metricFact(metric)}; ${metricComparison(metric)}.`))
        : Object.freeze([
            'Данных по агрегированным поведенческим показателям пользователей недостаточно для вывода.',
        ]);
    const actions = Object.freeze(productManager.slice(0, 7).map((insight, index) => Object.freeze({
        priority: index + 1,
        action: insight.action,
        reason: `${insight.fact}; ${insight.comparison}`,
        successMetric: insight.successMetric,
    })));
    const firstInsight = productManager[0];
    const firstHypothesis = firstInsight?.hypothesis
        .replace(/^\s*Гипотеза:\s*/i, '')
        .replace(/^\s*Hypothesis:\s*/i, '');
    const warnings = deterministicSourceWarnings(input);
    const ownerMonologue = [
        `За выбранный период картина складывается так: ${executiveSummary}.`,
        firstInsight
            ? `${firstInsight.whyItMatters} Пока это не доказывает причину, но наиболее разумное рабочее объяснение сейчас такое: ${firstHypothesis || 'нужно проверить связь с соседними шагами пользовательского пути'}.`
            : 'Надёжного продуктового сигнала пока недостаточно, поэтому сейчас важнее сохранить осторожность в выводах, чем создавать видимость определённости.',
        firstInsight
            ? `Я бы начал с одного конкретного шага: ${firstInsight.action} После этого мы сможем считать направление подтверждённым, если ${firstInsight.successMetric.replace(/[.]+$/, '').toLocaleLowerCase('ru')}.`
            : 'Следующий разумный шаг — дождаться достаточного объёма агрегированных данных и повторить сравнение на том же временном окне.',
        warnings.length > 0
            ? `Есть важное ограничение: ${warnings.join(' ')} Поэтому решения, зависящие от этих данных, пока стоит считать предварительными.`
            : 'Источники не показывают критического ограничения полноты, поэтому эту картину можно использовать как рабочую основу для следующего решения.',
    ].join(' ');
    return Object.freeze({
        ownerMonologue: sanitizeText(ownerMonologue, MAX_MONOLOGUE_LENGTH),
        executiveSummary,
        productManager,
        growthAndRevenue,
        qualityAndRisks,
        userVoice,
        actions,
        sourceWarnings: deterministicSourceWarnings(input),
    });
}
function safeTitle(value, metrics) {
    const title = sanitizeText(value, 140);
    if (!title || /[\\/]|(?:tsx?|jsx?|mjs|cjs)$/i.test(title)) {
        return metrics.length > 0 ? metricLabel(metrics[0]) : '';
    }
    return title;
}
function parseDirectorDigestNarrative(raw, input) {
    try {
        const parsed = JSON.parse(raw);
        const metricById = new Map(input.metrics.map((metric) => [metric.id, metric]));
        const productManager = Array.isArray(parsed.productManager)
            ? parsed.productManager.slice(0, 5).flatMap((value) => {
                const row = value && typeof value === 'object'
                    ? value
                    : {};
                const metricIds = Array.isArray(row.metricIds)
                    ? [...new Set(row.metricIds
                            .map((item) => sanitizeText(item, 100))
                            .filter((id) => metricById.has(id)))]
                        .slice(0, 3)
                    : [];
                const metrics = metricIds.map((id) => metricById.get(id));
                const title = safeTitle(row.title, metrics);
                const whyItMatters = sanitizeText(row.whyItMatters);
                const hypothesis = sanitizeText(row.hypothesis);
                const action = sanitizeText(row.action);
                const successMetric = sanitizeText(row.successMetric);
                if (!title
                    || metrics.length === 0
                    || !whyItMatters
                    || !hypothesis
                    || !action
                    || !successMetric)
                    return [];
                const confidence = row.confidence === 'high' || row.confidence === 'medium' || row.confidence === 'low'
                    ? row.confidence
                    : 'low';
                return [Object.freeze({
                        title,
                        metricIds: Object.freeze(metricIds),
                        sourceIds: Object.freeze([...new Set(metrics.map((metric) => metric.source))]),
                        fact: metrics.map(metricFact).join('; '),
                        comparison: metrics.map(metricComparison).join('; '),
                        whyItMatters,
                        hypothesis,
                        action,
                        successMetric,
                        confidence,
                    })];
            })
            : [];
        const actions = Array.isArray(parsed.actions)
            ? parsed.actions.slice(0, 7).flatMap((value, index) => {
                const row = value && typeof value === 'object'
                    ? value
                    : {};
                const action = sanitizeText(row.action);
                const reason = sanitizeText(row.reason);
                const successMetric = sanitizeText(row.successMetric);
                if (!action || !reason || !successMetric)
                    return [];
                const priority = typeof row.priority === 'number' && Number.isFinite(row.priority)
                    ? Math.max(1, Math.min(7, Math.round(row.priority)))
                    : index + 1;
                return [Object.freeze({ priority, action, reason, successMetric })];
            })
            : [];
        const executiveSummary = sanitizeText(parsed.executiveSummary, MAX_SUMMARY_LENGTH);
        const ownerMonologue = validatedOwnerMonologue(parsed.ownerMonologue, input);
        if (!executiveSummary)
            throw new Error('director_digest_missing_summary');
        if (ownerMonologue.length < 160)
            throw new Error('director_digest_missing_owner_monologue');
        if (input.metrics.some((metric) => metric.current !== null)
            && (productManager.length === 0 || actions.length === 0))
            throw new Error('director_digest_missing_supported_analysis');
        const sourceWarnings = Object.freeze([...new Set([
                ...deterministicSourceWarnings(input),
            ])]);
        return Object.freeze({
            state: 'generated',
            narrative: Object.freeze({
                ownerMonologue,
                executiveSummary,
                productManager: Object.freeze(productManager),
                growthAndRevenue: safeStringArray(parsed.growthAndRevenue),
                qualityAndRisks: safeStringArray(parsed.qualityAndRisks),
                userVoice: safeStringArray(parsed.userVoice),
                actions: Object.freeze(actions),
                sourceWarnings,
            }),
        });
    }
    catch {
        return Object.freeze({
            state: 'fallback',
            narrative: deterministicNarrative(input),
        });
    }
}
//# sourceMappingURL=admin_director_digest_narrative.js.map