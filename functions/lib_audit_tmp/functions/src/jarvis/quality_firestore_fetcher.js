"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUALITY_LOOKBACK_MS = exports.MAX_QUALITY_ROWS_PER_SOURCE = void 0;
exports.fetchQualitySource = fetchQualitySource;
/**
 * Тонкая обёртка над Firestore для департамента «Качество».
 *
 * зачем: тот же паттерн запроса, что в admin_reports_center.ts
 * (where createdAtMs >= sinceMs, orderBy desc, limit) — так снапшот
 * departments читает окно за сутки один раз, курсор для инкремента
 * появится в§ следующем шаге, когда будет видно реальное окно данных.
 * Проекция здесь уже безопасная: category/screen/createdAtMs, ничего
 * похожего на PII или текст жалобы сюда не попадает вообще.
 */
exports.MAX_QUALITY_ROWS_PER_SOURCE = 100;
exports.QUALITY_LOOKBACK_MS = 24 * 60 * 60 * 1000;
function text(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function toRow(data) {
    return Object.freeze({
        category: text(data.category),
        screen: text(data.screen),
        createdAtMs: typeof data.createdAtMs === 'number' && Number.isFinite(data.createdAtMs) ? data.createdAtMs : 0,
    });
}
async function fetchQualitySource(input) {
    const sinceMs = input.nowMs - exports.QUALITY_LOOKBACK_MS;
    const observedAtMs = input.nowMs;
    try {
        const snapshot = await input.collection
            .where('createdAtMs', '>=', sinceMs)
            .orderBy('createdAtMs', 'desc')
            .limit(exports.MAX_QUALITY_ROWS_PER_SOURCE + 1)
            .get();
        const docs = snapshot.docs;
        const truncated = docs.length > exports.MAX_QUALITY_ROWS_PER_SOURCE;
        const kept = truncated ? docs.slice(0, exports.MAX_QUALITY_ROWS_PER_SOURCE) : docs;
        return Object.freeze({
            sourceId: input.sourceId,
            state: kept.length === 0 ? 'empty' : 'ready',
            truncated,
            droppedCount: truncated ? docs.length - exports.MAX_QUALITY_ROWS_PER_SOURCE : 0,
            rows: Object.freeze(kept.map((snap) => toRow(snap.data()))),
            observedAtMs,
        });
    }
    catch {
        // Firestore недоступен или запрос упал — департамент не должен падать
        // целиком, а честно объявить этот источник ошибочным.
        return Object.freeze({
            sourceId: input.sourceId,
            state: 'error',
            truncated: false,
            droppedCount: 0,
            rows: Object.freeze([]),
            observedAtMs,
        });
    }
}
//# sourceMappingURL=quality_firestore_fetcher.js.map