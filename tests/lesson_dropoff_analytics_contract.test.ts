import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('lesson drop-off analytics contract', () => {
  it('adds numeric checkpoints to lesson answers', () => {
    const firebase = read('app/firebase.ts');
    const lesson = read('app/lesson1.tsx');
    expect(firebase).toContain('logLessonAnswer(lessonId: number, isCorrect: boolean, phraseIndex: number, totalPhrases: number, attemptId: string)');
    expect(firebase).toContain('phrase_index: phraseIndex');
    expect(firebase).toContain('total_phrases: totalPhrases');
    expect(firebase).toContain('lesson_attempt_id: attemptId');
    expect(firebase).toContain('elapsed_ms: elapsedMs');
    expect(firebase).not.toContain('total: totalPhrases');
    expect(lesson).toContain('logLessonAnswer(lessonId, isRight, cellIndex, effectiveTotal, lessonAnalyticsAttemptRef.current!.id)');
    expect(lesson).toContain("markLessonAttemptTerminal(attempt, 'abandon')");
  });

  it('does not send answer or phrase text', () => {
    const firebase = read('app/firebase.ts');
    const answerFunction = firebase.match(/export function logLessonAnswer[\s\S]*?\n\}/)?.[0] ?? '';
    expect(answerFunction).not.toMatch(/answer_text|phrase_text|expected_text|user_answer/);
  });
});
