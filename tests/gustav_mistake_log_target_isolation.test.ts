import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('Gustav mistake-log target isolation', () => {
  it('threads studyTarget through production lesson, review, trainer, vocabulary, coach, diagnostic, and exam mistake writes', () => {
    const lesson = read('app/lesson1.tsx');
    const review = read('app/review.tsx');
    const trainerSmart = read('app/trainer_smart_session.tsx');
    const lessonWords = read('app/lesson_words.tsx');
    const problemCoach = read('app/problem_coach.tsx');
    const activeRecall = read('app/active_recall.ts');
    const finalExam = read('app/exam.tsx');
    const levelExam = read('app/level_exam.tsx');

    expect(lesson).toContain('const stRm = studyTargetRef.current');
    expect(lesson).toContain("logMistake(analyticsPhraseKey || canonKey, lessonId, 'lesson', 'wrong_pick', mistakeMeta, stRm)");
    expect(lesson).toContain('void recordPhraseMistake(');
    expect(lesson).toContain('stRm,');

    expect(review).toContain("logMistake(item.phrase, item.lessonId, 'trainer', 'wrong_pick', tokenMeta, studyTarget)");
    expect(review).toContain('markReviewed(item.phrase, ok, tokenMeta, studyTarget)');

    expect(trainerSmart).toContain('function logSmartTrainerMistake(card: SmartCard, picked: string, studyTarget?: RuntimeStudyTarget)');
    expect(trainerSmart).toContain("logMistake(card.item.key, card.item.lessonId, 'trainer', 'wrong_pick', {");
    expect(trainerSmart).toContain('}, studyTarget);');
    expect(trainerSmart).toContain('if (!correct) logSmartTrainerMistake(current, option, studyTarget)');

    expect(lessonWords).toContain("logMistake(current.word.en, lessonId, 'lesson_words', 'wrong_pick', mistakeMeta, studyTarget)");
    expect(lessonWords).toContain('recordWordMistake(wKey, current.word.ru, current.word.uk, lessonId, current.word.pos, current.word.es, studyTarget)');

    expect(problemCoach).toContain("logMistake(step.sentence, 0, 'coach', 'wrong_pick', {");
    expect(problemCoach).toContain('}, studyTarget);');

    expect(activeRecall).toContain('recordMistakeFromDiagnostic(');
    expect(activeRecall).toContain("await recordMistake(phrase, q.hintRU, 0, q.hintUK, 'diagnostic', undefined, tokenMeta, studyTarget)");
    expect(activeRecall).toContain("'diagnostic',\n    'wrong_pick',\n    tokenMeta,\n    studyTarget,");

    expect(finalExam).toContain("logMistake(phrase, lessonId, 'exam', what, meta, studyTarget)");
    expect(levelExam).toContain("'exam',\n        'wrong_pick',\n        tokenMeta,\n        studyTarget,");
  });
});
