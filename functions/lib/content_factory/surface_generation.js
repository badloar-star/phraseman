"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSurfaceGenerationPrompt = buildSurfaceGenerationPrompt;
exports.parseGeneratedSurfaceArtifact = parseGeneratedSurfaceArtifact;
function buildSurfaceGenerationPrompt(input) {
    return [
        'You are the Phraseman surface-content generator.',
        `Generate surface=${input.surface} for studyTarget=${input.studyTarget}, sourceLocale=${input.sourceLocale}, lessonId=${input.lessonId}.`,
        `Preserve the English blueprint topic and phrase meaning: ${JSON.stringify({ topic: input.topic, sourcePhrases: input.sourcePhrases })}`,
        'Return JSON only. Do not include markdown, commentary, theory or invented source citations.',
        `Every front must be written only in studyTarget=${input.studyTarget}; every back must be the exact learner-facing meaning only in sourceLocale=${input.sourceLocale}. Shape: {"lessonId":number,"surface":"flashcard","items":[{"id":string,"front":string,"back":string}]}`,
    ].join('\n');
}
function parseGeneratedSurfaceArtifact(raw) {
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        throw new Error('generated_surface_invalid');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('generated_surface_invalid');
    const artifact = value;
    const surface = artifact.surface;
    if (surface !== 'flashcard' || !Number.isInteger(artifact.lessonId) || Number(artifact.lessonId) < 1 || !Array.isArray(artifact.items) || artifact.items.length === 0)
        throw new Error('generated_surface_invalid');
    const valid = artifact.items.every((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
            return false;
        const row = item;
        if (typeof row.id !== 'string' || !row.id.trim())
            return false;
        return typeof row.front === 'string' && !!row.front.trim() && typeof row.back === 'string' && !!row.back.trim();
    });
    if (!valid)
        throw new Error('generated_surface_invalid');
    return Object.freeze({ lessonId: Number(artifact.lessonId), surface, items: Object.freeze(artifact.items) });
}
//# sourceMappingURL=surface_generation.js.map