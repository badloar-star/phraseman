"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeFactorySurfaces = canonicalizeFactorySurfaces;
exports.countLegacyGenerationUnits = countLegacyGenerationUnits;
exports.generationPlanFingerprint = generationPlanFingerprint;
const SURFACE_MAP = Object.freeze({
    lessons: 'lesson',
    vocabulary: 'lesson',
    drills: 'lesson',
    cards: 'flashcard',
});
function canonicalizeFactorySurfaces(surfaces) {
    const canonical = surfaces
        .map((surface) => SURFACE_MAP[surface])
        .filter((surface) => surface !== undefined);
    return Object.freeze([...new Set(canonical)]);
}
function countLegacyGenerationUnits(lessonIds, surfaces) {
    return lessonIds.length * canonicalizeFactorySurfaces(surfaces).length;
}
function generationPlanFingerprint(lessonIds, surfaces) {
    const normalizedLessonIds = [...new Set(lessonIds)].sort((left, right) => left - right);
    const normalizedSurfaces = [...canonicalizeFactorySurfaces(surfaces)].sort();
    return `legacy-v1:${normalizedLessonIds.join(',')}:${normalizedSurfaces.join(',')}`;
}
//# sourceMappingURL=generation_plan.js.map