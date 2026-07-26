"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitGenerationJob = splitGenerationJob;
exports.summarizeUnitProgress = summarizeUnitProgress;
const SURFACE_MAP = {
    lessons: 'lesson', vocabulary: 'lesson', drills: 'lesson', quizzes: 'quiz', cards: 'flashcard', arena_questions: 'arena',
};
function splitGenerationJob(input) {
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(input.jobId) || !input.studyTarget.trim() || !input.learnerSourceLocale.trim())
        throw new Error('generation_job_identity_invalid');
    const surfaces = [...new Set(input.surfaces.map((surface) => SURFACE_MAP[surface]).filter(Boolean))];
    const units = [];
    for (const surface of surfaces) {
        for (const lessonId of input.lessonIds) {
            if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100)
                throw new Error('generation_lesson_id_invalid');
            units.push({ unitId: `${input.jobId}:${surface}:${lessonId}`, jobId: input.jobId, studyTarget: input.studyTarget, learnerSourceLocale: input.learnerSourceLocale, surface, lessonId, state: 'queued', attempts: 0 });
        }
    }
    return units;
}
function summarizeUnitProgress(units) {
    return {
        total: units.length,
        completed: units.filter((unit) => unit.state === 'succeeded').length,
        failed: units.filter((unit) => unit.state === 'failed').length,
        queued: units.filter((unit) => unit.state === 'queued').length,
        running: units.filter((unit) => unit.state === 'running').length,
    };
}
//# sourceMappingURL=job_service.js.map