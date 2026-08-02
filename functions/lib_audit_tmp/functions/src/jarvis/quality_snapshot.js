"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQualitySnapshot = buildQualitySnapshot;
const quality_department_1 = require("./quality_department");
const COLLECTIONS = ['error_reports', 'user_reports', 'app_errors'];
function failClosedFetch(sourceId, observedAtMs) {
    return Object.freeze({
        sourceId,
        state: 'error',
        truncated: false,
        droppedCount: 0,
        rows: Object.freeze([]),
        observedAtMs,
    });
}
async function buildQualitySnapshot(input) {
    const fetches = await Promise.all(COLLECTIONS.map(async (sourceId) => {
        try {
            return await input.fetchers[sourceId]();
        }
        catch {
            // Один упавший источник не должен убить весь снапшот — департамент
            // сам решит, хватает ли ему доказательств от оставшихся.
            return failClosedFetch(sourceId, input.nowMs);
        }
    }));
    const { decisions } = (0, quality_department_1.runQualityDepartment)({
        fetches,
        trigger: input.trigger,
        question: input.question,
        nowMs: input.nowMs,
    });
    return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
//# sourceMappingURL=quality_snapshot.js.map