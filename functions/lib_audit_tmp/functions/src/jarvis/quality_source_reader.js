"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUALITY_REPORT_COLLECTIONS = void 0;
exports.aggregateQualityRows = aggregateQualityRows;
exports.buildQualityEvidence = buildQualityEvidence;
const decision_1 = require("./decision");
/**
 * Читатель источников департамента «Качество».
 *
 * зачем: план запрещает передавать модели/Telegram полный текст репортов, PII
 * и UID пользователей. adminListReportQueue (admin_reports_center.ts) уже
 * безопасно читает Firestore с where/limit/курсором, но проецирует ПОЛНЫЙ
 * репорт (summary, users.*, context.details) — это годится для админки под
 * ролью, но не для модели. Поэтому здесь агрегируются только счётчики по
 * category/screen — тот же путь чтения, более узкая проекция.
 */
exports.QUALITY_REPORT_COLLECTIONS = ['error_reports', 'user_reports', 'app_errors'];
const UNKNOWN_BUCKET = 'unknown';
function bucketOf(value) {
    return value && value.trim() ? value.trim().toLowerCase().slice(0, 60) : UNKNOWN_BUCKET;
}
function increment(bucket, key) {
    bucket[key] = (bucket[key] ?? 0) + 1;
}
/**
 * Единственное, что может попасть в модель или в Telegram: счётчики.
 * Ни текста жалобы, ни UID, ни устройства — этого поля здесь просто нет.
 */
function aggregateQualityRows(rows) {
    const byCategory = {};
    const byScreen = {};
    for (const row of rows) {
        increment(byCategory, bucketOf(row.category));
        increment(byScreen, bucketOf(row.screen));
    }
    return Object.freeze({
        totalCount: rows.length,
        byCategory: Object.freeze(byCategory),
        byScreen: Object.freeze(byScreen),
    });
}
/**
 * Оборачивает результат выборки в Evidence по ядру Джарвиса. Обрезанная или
 * ошибочная выборка не получает права на число — normalizeEvidence сам это
 * гарантирует, здесь только честно передаётся state/truncated/droppedCount.
 */
function buildQualityEvidence(fetch) {
    const aggregate = aggregateQualityRows(fetch.rows);
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
//# sourceMappingURL=quality_source_reader.js.map