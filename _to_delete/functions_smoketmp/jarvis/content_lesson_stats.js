"use strict";
/**
 * Скользящий агрегат среднего балла по уроку — ядро департамента «Контент».
 *
 * зачем: честной агрегации по урокам в Firestore не было (результаты хранятся
 * внутри каждого пользователя отдельно — прочитать «средний балл урока N по
 * всем» означало бы дорогой collectionGroup-скан). Владелец 2026-08-02 решил
 * завести дешёвый агрегат: пишется в той же транзакции, что уже начисляет XP
 * за lesson_complete (progress_events.ts), одна дополнительная запись
 * документа на событие — не лишнее чтение.
 *
 * Сигнал: средний балл (score) среди последних попыток ниже порога —
 * владелец 2026-08-02 выбрал именно score, не pass/fail, — он уже есть в
 * каждом событии lesson_complete, не нужно вводить отдельное понятие.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_LESSON_SCORE = exports.MIN_LESSON_SCORE = exports.LESSON_STATS_WINDOW = void 0;
exports.applyLessonScoreSample = applyLessonScoreSample;
/** Скользящее окно последних попыток для среднего — не всё время, иначе
 * старая проблема урока маскирует недавнее исправление навсегда. */
exports.LESSON_STATS_WINDOW = 50;
exports.MIN_LESSON_SCORE = 0;
exports.MAX_LESSON_SCORE = 5;
function assertValidScore(score) {
    if (!Number.isFinite(score) || score < exports.MIN_LESSON_SCORE || score > exports.MAX_LESSON_SCORE) {
        throw new Error(`Jarvis content lesson stats: score must be a finite number in [${exports.MIN_LESSON_SCORE}, ${exports.MAX_LESSON_SCORE}]`);
    }
}
function average(scores) {
    return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}
function applyLessonScoreSample(previous, score) {
    assertValidScore(score);
    const priorRecent = previous?.recentScores ?? [];
    const recentScores = Object.freeze([...priorRecent, score].slice(-exports.LESSON_STATS_WINDOW));
    return Object.freeze({
        sampleCount: (previous?.sampleCount ?? 0) + 1,
        recentScores,
        averageScore: Math.round(average(recentScores) * 100) / 100,
    });
}
