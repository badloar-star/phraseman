"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRecordLessonScore = shouldRecordLessonScore;
exports.extractLessonScoreSample = extractLessonScoreSample;
exports.lessonStatsDocId = lessonStatsDocId;
const content_lesson_stats_1 = require("./content_lesson_stats");
function isFiniteScore(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= content_lesson_stats_1.MIN_LESSON_SCORE && value <= content_lesson_stats_1.MAX_LESSON_SCORE;
}
function isPositiveLessonId(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function shouldRecordLessonScore(event) {
    if (event.type !== 'lesson_complete')
        return false;
    if (!isPositiveLessonId(event.payload.lessonId))
        return false;
    if (!isFiniteScore(event.payload.score ?? event.payload.bestScore))
        return false;
    return true;
}
function extractLessonScoreSample(event) {
    const lessonId = event.payload.lessonId;
    const score = (event.payload.score ?? event.payload.bestScore);
    const target = event.payload.studyTarget === 'fr' ? 'fr' : 'en';
    return Object.freeze({ lessonId, target, score });
}
function lessonStatsDocId(lessonId, target) {
    return `${target}_lesson${lessonId}`;
}
