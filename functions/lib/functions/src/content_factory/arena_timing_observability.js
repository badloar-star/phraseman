"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_TIMING_BUCKETS_MS = exports.ARENA_TIMING_MIN_SAMPLE = exports.ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS = exports.ARENA_TIMING_ROLLUP_COLLECTION = exports.ARENA_TIMING_COLLECTION = void 0;
exports.arenaTimingItemHash = arenaTimingItemHash;
exports.arenaTimingDocumentId = arenaTimingDocumentId;
exports.arenaTimingRollupDocumentId = arenaTimingRollupDocumentId;
exports.applyArenaTimingEvent = applyArenaTimingEvent;
exports.summarizeArenaTiming = summarizeArenaTiming;
const node_crypto_1 = require("node:crypto");
exports.ARENA_TIMING_COLLECTION = 'arena_timing_daily';
exports.ARENA_TIMING_ROLLUP_COLLECTION = 'arena_timing_daily_rollups';
exports.ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS = 40000;
exports.ARENA_TIMING_MIN_SAMPLE = 200;
exports.ARENA_TIMING_BUCKETS_MS = Object.freeze([1000, 2000, 3000, 5000, 8000, 12000, 20000, 40000]);
function difficulty(value) { return ['easy', 'medium', 'hard'].includes(String(value)) ? String(value) : 'unknown'; }
function deviceClass(value) { return ['phone', 'tablet', 'web'].includes(String(value)) ? String(value) : 'unknown'; }
function day(nowMs) { return new Date(nowMs).toISOString().slice(0, 10); }
function arenaTimingItemHash(questionId) { return (0, node_crypto_1.createHash)('sha256').update(questionId).digest('hex'); }
function arenaTimingDocumentId(input) { return `${day(input.nowMs)}_${arenaTimingItemHash(input.questionId).slice(0, 32)}_${difficulty(input.difficulty)}_${deviceClass(input.deviceClass)}`; }
function arenaTimingRollupDocumentId(input) { const shard = Number.parseInt(arenaTimingItemHash(input.questionId).slice(0, 2), 16) % 2; return `${day(input.nowMs)}_${difficulty(input.difficulty)}_${deviceClass(input.deviceClass)}_s${shard}`; }
function applyArenaTimingEvent(current, event) {
    if (!event.questionId || !Number.isFinite(event.timeMs))
        throw new Error('arena_timing_event_invalid');
    const prior = current && typeof current === 'object' ? current : {};
    const normalizedTime = Math.max(0, Math.min(exports.ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS, Math.round(event.timeMs)));
    const bucket = exports.ARENA_TIMING_BUCKETS_MS.find((limit) => normalizedTime <= limit) ?? exports.ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS;
    const histogram = { ...(prior.histogram ?? {}) };
    histogram[String(bucket)] = Number(histogram[String(bucket)] ?? 0) + 1;
    const normalizedDeviceClass = deviceClass(event.deviceClass);
    return Object.freeze({ schemaVersion: 'arena-timing-v1', day: day(event.nowMs), itemHash: arenaTimingItemHash(event.questionId), difficulty: difficulty(event.difficulty), deviceClass: normalizedDeviceClass, sampleCount: Number(prior.sampleCount ?? 0) + 1, serverObservedCount: Number(prior.serverObservedCount ?? 0) + (event.timingSource === 'client_bounded' ? 0 : 1), deviceAttributedCount: Number(prior.deviceAttributedCount ?? 0) + (normalizedDeviceClass === 'unknown' ? 0 : 1), correctCount: Number(prior.correctCount ?? 0) + (event.isCorrect ? 1 : 0), wrongCount: Number(prior.wrongCount ?? 0) + (!event.isCorrect && !event.timedOut ? 1 : 0), timeoutCount: Number(prior.timeoutCount ?? 0) + (event.timedOut ? 1 : 0), totalTimeMs: Number(prior.totalTimeMs ?? 0) + normalizedTime, histogram: Object.freeze(histogram), updatedAtMs: event.nowMs });
}
function percentile(histogram, sampleCount, target) {
    if (sampleCount < 1)
        return 0;
    const rank = Math.ceil(sampleCount * target);
    let seen = 0;
    for (const bucket of exports.ARENA_TIMING_BUCKETS_MS) {
        seen += Number(histogram[String(bucket)] ?? 0);
        if (seen >= rank)
            return bucket;
    }
    return exports.ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS;
}
function summarizeGroup(values) { const histogram = {}; let sampleCount = 0; let serverObservedCount = 0; let deviceAttributedCount = 0; let correctCount = 0; let wrongCount = 0; let timeoutCount = 0; let totalTimeMs = 0; for (const value of values) {
    sampleCount += value.sampleCount;
    serverObservedCount += Number(value.serverObservedCount ?? 0);
    deviceAttributedCount += Number(value.deviceAttributedCount ?? 0);
    correctCount += value.correctCount;
    wrongCount += value.wrongCount;
    timeoutCount += value.timeoutCount;
    totalTimeMs += value.totalTimeMs;
    for (const [key, count] of Object.entries(value.histogram))
        histogram[key] = (histogram[key] ?? 0) + Number(count);
} const serverObservedRate = sampleCount ? serverObservedCount / sampleCount : 0; const deviceAttributionRate = sampleCount ? deviceAttributedCount / sampleCount : 0; return Object.freeze({ sampleCount, serverObservedRate, deviceAttributionRate, p50Ms: percentile(histogram, sampleCount, 0.5), p95Ms: percentile(histogram, sampleCount, 0.95), averageMs: sampleCount ? Math.round(totalTimeMs / sampleCount) : 0, timeoutRate: sampleCount ? timeoutCount / sampleCount : 0, wrongAnswerRate: sampleCount ? wrongCount / sampleCount : 0, correctRate: sampleCount ? correctCount / sampleCount : 0, recommendationEligible: sampleCount >= exports.ARENA_TIMING_MIN_SAMPLE && serverObservedRate >= 0.95, minimumSample: exports.ARENA_TIMING_MIN_SAMPLE, histogram: Object.freeze(histogram) }); }
function summarizeArenaTiming(values, isPartial = false) {
    const groups = new Map();
    for (const value of values) {
        const key = `${value.difficulty}:${value.deviceClass}`;
        groups.set(key, [...(groups.get(key) ?? []), value]);
    }
    const summary = summarizeGroup(values);
    const deviceAttributionComplete = summary.deviceAttributionRate === 1;
    return Object.freeze({ schemaVersion: 'arena-timing-summary-v1', authoritativeQuestionTimeoutMs: exports.ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS, automaticRuntimeChangeAllowed: false, isPartial, deviceAttributionComplete, ...summary, recommendationEligible: summary.recommendationEligible && !isPartial, groups: Object.freeze([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => { const group = summarizeGroup(rows); return Object.freeze({ key, difficulty: rows[0].difficulty, deviceClass: rows[0].deviceClass, ...group, deviceRecommendationEligible: rows[0].deviceClass !== 'unknown' && deviceAttributionComplete && group.recommendationEligible && !isPartial }); })) });
}
//# sourceMappingURL=arena_timing_observability.js.map